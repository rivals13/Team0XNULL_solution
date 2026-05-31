from __future__ import annotations

from collections import Counter
from datetime import date
from itertools import pairwise
from statistics import mean, pstdev
from typing import Iterable

from backend.database.models import Transaction


def _round_amount(amount: float) -> float:
    return round(float(amount), 2)


def group_transactions(transactions: Iterable[Transaction]) -> list[dict[str, object]]:
    grouped: dict[tuple[str, float, str], list[Transaction]] = {}
    for transaction in transactions:
        key = (transaction.recipient.strip().lower(), _round_amount(transaction.amount), transaction.category.strip().lower())
        grouped.setdefault(key, []).append(transaction)

    patterns: list[dict[str, object]] = []
    for (_recipient_key, amount, _category), items in grouped.items():
        sorted_items = sorted(items, key=lambda item: item.date)
        intervals = [(later.date - earlier.date).days for earlier, later in pairwise(sorted_items)]
        month_signatures = {(item.date.year, item.date.month) for item in sorted_items}
        interval_average = mean(intervals) if intervals else 0.0
        interval_spread = pstdev(intervals) if len(intervals) > 1 else 0.0
        recency_days = (date.today() - sorted_items[-1].date).days
        dominant_recipient = Counter(item.recipient for item in sorted_items).most_common(1)[0][0]
        dominant_category = Counter(item.category for item in sorted_items).most_common(1)[0][0]

        patterns.append(
            {
                "recipient": dominant_recipient,
                "amount": amount,
                "category": dominant_category,
                "payment_count": len(sorted_items),
                "average_interval_days": float(interval_average),
                "interval_spread_days": float(interval_spread),
                "unique_months": len(month_signatures),
                "recency_days": recency_days,
                "transactions": sorted_items,
            }
        )

    patterns.sort(key=lambda item: (item["payment_count"], item["average_interval_days"]), reverse=True)
    return patterns
