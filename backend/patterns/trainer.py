from __future__ import annotations

from dataclasses import dataclass

import importlib
import importlib.util

def _safe_find_spec(module_name: str):
    try:
        return importlib.util.find_spec(module_name)
    except ModuleNotFoundError:
        return None


# Dynamically import scikit-learn classifiers if available. This avoids hard
# import errors in environments where `scikit-learn` is not installed; the
# module falls back to `MajorityVoteClassifier` when classifiers are missing.
_sklearn_dummy_spec = _safe_find_spec("sklearn.dummy")
_sklearn_ensemble_spec = _safe_find_spec("sklearn.ensemble")

if _sklearn_dummy_spec and _sklearn_ensemble_spec:
    try:
        sklearn_dummy = importlib.import_module("sklearn.dummy")
        sklearn_ensemble = importlib.import_module("sklearn.ensemble")
        DummyClassifier = getattr(sklearn_dummy, "DummyClassifier")
        RandomForestClassifier = getattr(sklearn_ensemble, "RandomForestClassifier")
    except Exception:
        DummyClassifier = None
        RandomForestClassifier = None
else:
    DummyClassifier = None
    RandomForestClassifier = None

from backend.database.models import Transaction
from .utils import group_transactions


@dataclass
class TrainingResult:
    model: object
    feature_rows: list[list[float]]
    labels: list[int]


class MajorityVoteClassifier:
    def __init__(self) -> None:
        self.label = 0

    def fit(self, feature_rows: list[list[float]], labels: list[int]) -> "MajorityVoteClassifier":
        if labels:
            positive_count = sum(labels)
            self.label = 1 if positive_count >= len(labels) / 2 else 0
        return self

    def predict(self, feature_rows: list[list[float]]) -> list[int]:
        return [self.label for _ in feature_rows]


def _is_recurring_pattern(pattern: dict[str, object]) -> int:
    payment_count = int(pattern["payment_count"])
    average_interval_days = float(pattern["average_interval_days"])
    interval_spread_days = float(pattern["interval_spread_days"])
    unique_months = int(pattern["unique_months"])

    recurring_signals = [
        payment_count >= 3,
        unique_months >= 2,
        average_interval_days == 0 or 20 <= average_interval_days <= 40,
        interval_spread_days <= 7,
    ]

    return int(sum(recurring_signals) >= 3)


def _build_feature_row(pattern: dict[str, object]) -> list[float]:
    return [
        float(pattern["payment_count"]),
        float(pattern["amount"]),
        float(pattern["average_interval_days"]),
        float(pattern["interval_spread_days"]),
        float(pattern["unique_months"]),
        float(pattern["recency_days"]),
    ]


def train_pattern_model(transactions: list[Transaction]) -> TrainingResult:
    grouped_patterns = group_transactions(transactions)
    if not grouped_patterns:
        fallback_model = MajorityVoteClassifier().fit([[0.0]], [0])
        return TrainingResult(model=fallback_model, feature_rows=[], labels=[])

    feature_rows = [_build_feature_row(pattern) for pattern in grouped_patterns]
    labels = [_is_recurring_pattern(pattern) for pattern in grouped_patterns]

    if DummyClassifier is None or RandomForestClassifier is None:
        model = MajorityVoteClassifier().fit(feature_rows, labels)
        return TrainingResult(model=model, feature_rows=feature_rows, labels=labels)

    if len(set(labels)) < 2:
        model = DummyClassifier(strategy="most_frequent")
        model.fit(feature_rows, labels)
        return TrainingResult(model=model, feature_rows=feature_rows, labels=labels)

    model = RandomForestClassifier(n_estimators=64, random_state=42)
    model.fit(feature_rows, labels)
    return TrainingResult(model=model, feature_rows=feature_rows, labels=labels)
