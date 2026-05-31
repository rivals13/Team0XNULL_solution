from __future__ import annotations

from datetime import timedelta

from backend.database.models import PatternInsight, Transaction
from .trainer import train_pattern_model
from .utils import group_transactions


def _estimate_next_due_date(transaction_date, average_interval_days: float) -> str:
    interval_days = int(round(average_interval_days)) if average_interval_days else 30
    return (transaction_date + timedelta(days=max(interval_days, 1))).isoformat()


def detect_recurring_patterns(transactions: list[Transaction]) -> list[PatternInsight]:
    grouped_patterns = group_transactions(transactions)
    if not grouped_patterns:
        return []

    training_result = train_pattern_model(transactions)
    model = training_result.model

    insights: list[PatternInsight] = []
    for index, pattern in enumerate(grouped_patterns, start=1):
        features = [[
            float(pattern["payment_count"]),
            float(pattern["amount"]),
            float(pattern["average_interval_days"]),
            float(pattern["interval_spread_days"]),
            float(pattern["unique_months"]),
            float(pattern["recency_days"]),
        ]]

        prediction = int(model.predict(features)[0])
        probability = 0.95 if prediction else 0.32

        if prediction:
            latest_transaction = pattern["transactions"][-1]
            next_due_date = _estimate_next_due_date(latest_transaction.date, float(pattern["average_interval_days"]))
            amount_value = float(pattern["amount"])
            amount_text = int(amount_value) if amount_value.is_integer() else amount_value
            insights.append(
                PatternInsight(
                    pattern_id=f"PATTERN-{index:03d}",
                    recipient=str(pattern["recipient"]),
                    amount=amount_value,
                    category=str(pattern["category"]),
                    payment_count=int(pattern["payment_count"]),
                    average_interval_days=round(float(pattern["average_interval_days"]), 2),
                    next_due_date=next_due_date,
                    confidence=round(probability, 2),
                    message=f"Detected recurring payment to {pattern['recipient']}: {amount_text} x{pattern['payment_count']}. Would you like to automate this?",
                )
            )

    insights.sort(key=lambda insight: (insight.payment_count, insight.confidence), reverse=True)
    return insights
