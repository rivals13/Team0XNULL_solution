from __future__ import annotations

import hashlib
import json
import logging
import os
import tempfile
from datetime import date, datetime, timedelta
from pathlib import Path
from threading import RLock
from typing import Any

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parents[1]
DEFAULT_CONFIG_PATH = BASE_DIR / "config.json"
DEFAULT_CONFIG = {
    "eligible_categories": ["utilities", "education", "financial"],
    "min_occurrences": 5,
    "lookback_days": 365,
    "paths": {
        "transactions": "data/transaction_database.json",
        "notifications": "data/notification_database.json",
        "schedules": "data/schedule_database.json",
    },
}
LOCK = RLock()


def _resolve_path(raw_path: str | Path) -> Path:
    resolved_path = Path(raw_path)
    if not resolved_path.is_absolute():
        resolved_path = BASE_DIR / resolved_path
    return resolved_path


def _ensure_json_file(path: Path, default_value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        path.write_text(json.dumps(default_value, indent=2, ensure_ascii=False), encoding="utf-8")


def _atomic_write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", delete=False, dir=str(path.parent), encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2, ensure_ascii=False)
        handle.flush()
        os.fsync(handle.fileno())
        temp_name = handle.name
    os.replace(temp_name, path)


def _read_json(path: Path, default_value: Any) -> Any:
    _ensure_json_file(path, default_value)
    raw_text = path.read_text(encoding="utf-8").strip()
    if not raw_text:
        return default_value
    return json.loads(raw_text)


def load_config(config_path: str | Path = DEFAULT_CONFIG_PATH) -> dict[str, Any]:
    path = _resolve_path(config_path)
    if not path.exists():
        _atomic_write_json(path, DEFAULT_CONFIG)

    config = _read_json(path, DEFAULT_CONFIG)
    if not isinstance(config, dict):
        return dict(DEFAULT_CONFIG)

    eligible_categories = config.get("eligible_categories", DEFAULT_CONFIG["eligible_categories"])
    if not isinstance(eligible_categories, list):
        eligible_categories = DEFAULT_CONFIG["eligible_categories"]

    normalized_categories = [str(category).strip().lower() for category in eligible_categories if str(category).strip()]
    config["eligible_categories"] = normalized_categories or DEFAULT_CONFIG["eligible_categories"]
    config.setdefault("min_occurrences", DEFAULT_CONFIG["min_occurrences"])
    config.setdefault("lookback_days", DEFAULT_CONFIG["lookback_days"])
    config.setdefault("paths", DEFAULT_CONFIG["paths"])
    return config


def _database_paths(config: dict[str, Any]) -> dict[str, Path]:
    path_config = config.get("paths", DEFAULT_CONFIG["paths"])
    if not isinstance(path_config, dict):
        path_config = DEFAULT_CONFIG["paths"]

    return {
        "transactions": _resolve_path(path_config.get("transactions", DEFAULT_CONFIG["paths"]["transactions"])),
        "notifications": _resolve_path(path_config.get("notifications", DEFAULT_CONFIG["paths"]["notifications"])),
        "schedules": _resolve_path(path_config.get("schedules", DEFAULT_CONFIG["paths"]["schedules"])),
    }


def _load_transaction_records() -> list[dict[str, Any]]:
    config = load_config()
    database_paths = _database_paths(config)
    records = _read_json(database_paths["transactions"], [])
    return records if isinstance(records, list) else []


def _upsert_record(records: list[dict[str, Any]], record: dict[str, Any]) -> list[dict[str, Any]]:
    updated_records = [item for item in records if str(item.get("id")) != record["id"]]
    updated_records.append(record)
    return updated_records


def _normalize_transaction(transaction: dict[str, Any]) -> dict[str, Any]:
    required_fields = {"id", "service_provider", "category", "amount", "date", "type"}
    missing_fields = required_fields - set(transaction)
    if missing_fields:
        raise ValueError(f"Missing required fields: {sorted(missing_fields)}")

    transaction_id = str(transaction["id"]).strip()
    service_provider = str(transaction["service_provider"]).strip()
    category = str(transaction["category"]).strip().lower()
    transaction_type = str(transaction["type"]).strip().lower()

    if not transaction_id:
        raise ValueError("id cannot be empty")
    if not service_provider:
        raise ValueError("service_provider cannot be empty")
    if not category:
        raise ValueError("category cannot be empty")
    if transaction_type not in {"recurring", "non_recurring"}:
        raise ValueError("type must be 'recurring' or 'non_recurring'")

    amount = float(transaction["amount"])
    if not np.isfinite(amount) or amount <= 0:
        raise ValueError("amount must be a positive finite number")

    try:
        transaction_date = date.fromisoformat(str(transaction["date"]))
    except ValueError as exc:
        raise ValueError("date must use ISO format YYYY-MM-DD") from exc

    return {
        "id": transaction_id,
        "service_provider": service_provider,
        "category": category,
        "amount": round(amount, 2),
        "date": transaction_date.isoformat(),
        "type": transaction_type,
    }


def save_transaction(transaction: dict[str, Any]) -> dict[str, Any]:
    config = load_config()
    database_paths = _database_paths(config)
    normalized_transaction = _normalize_transaction(transaction)

    with LOCK:
        transactions = _read_json(database_paths["transactions"], [])
        if not isinstance(transactions, list):
            transactions = []

        updated_transactions = _upsert_record(transactions, normalized_transaction)
        _atomic_write_json(database_paths["transactions"], updated_transactions)

    logger.info("Saved transaction %s", normalized_transaction["id"])
    return normalized_transaction


def load_transactions_dataframe() -> pd.DataFrame:
    records = _load_transaction_records()
    if not records:
        return pd.DataFrame(columns=["id", "service_provider", "category", "amount", "date", "type"])

    frame = pd.DataFrame(records)
    if "id" not in frame.columns and "transaction_id" in frame.columns:
        frame = frame.rename(columns={"transaction_id": "id"})

    expected_columns = ["id", "service_provider", "category", "amount", "date", "type"]
    for column in expected_columns:
        if column not in frame.columns:
            frame[column] = pd.NA

    frame = frame[expected_columns].copy()
    frame["category"] = frame["category"].astype(str).str.strip().str.lower()
    frame["service_provider"] = frame["service_provider"].astype(str).str.strip()
    frame["amount"] = pd.to_numeric(frame["amount"], errors="coerce")
    frame["date"] = pd.to_datetime(frame["date"], errors="coerce")

    frame = frame.dropna(subset=["id", "service_provider", "category", "amount", "date"])
    frame = frame[np.isfinite(frame["amount"].to_numpy(dtype=float))]
    return frame.reset_index(drop=True)


def _candidate_id(service_provider: str, category: str, amount: float, first_date: str, last_date: str) -> str:
    raw_value = f"{service_provider}|{category}|{amount:.2f}|{first_date}|{last_date}"
    digest = hashlib.sha1(raw_value.encode("utf-8")).hexdigest()[:14].upper()
    return f"REC-{digest}"


def detect_recurring_payments(
    transactions: pd.DataFrame,
    min_occurrences: int = 5,
    lookback_days: int = 365,
) -> list[dict[str, Any]]:
    config = load_config()
    eligible_categories = {str(category).strip().lower() for category in config.get("eligible_categories", [])}

    if transactions is None or transactions.empty:
        return []

    frame = transactions.copy()
    if "id" not in frame.columns and "transaction_id" in frame.columns:
        frame = frame.rename(columns={"transaction_id": "id"})

    required_columns = {"id", "service_provider", "category", "amount", "date"}
    missing_columns = required_columns - set(frame.columns)
    if missing_columns:
        raise ValueError(f"transactions DataFrame missing columns: {sorted(missing_columns)}")

    frame["service_provider"] = frame["service_provider"].astype(str).str.strip()
    frame["category"] = frame["category"].astype(str).str.strip().str.lower()
    frame["amount"] = pd.to_numeric(frame["amount"], errors="coerce")
    frame["date"] = pd.to_datetime(frame["date"], errors="coerce")
    frame = frame.dropna(subset=["id", "service_provider", "category", "amount", "date"])
    frame = frame[np.isfinite(frame["amount"].to_numpy(dtype=float))]

    if frame.empty:
        return []

    filtered_frame = frame[frame["category"].isin(eligible_categories)]
    if filtered_frame.empty:
        return []

    recurring_candidates: list[dict[str, Any]] = []
    grouped_frame = filtered_frame.groupby(["service_provider", "category", filtered_frame["amount"].round(2)])

    for (service_provider, category, amount_value), group_frame in grouped_frame:
        ordered_group = group_frame.sort_values("date").reset_index(drop=True)
        if len(ordered_group) < min_occurrences:
            continue

        timestamps = ordered_group["date"].to_list()
        window_start = 0
        for window_end in range(len(timestamps)):
            while timestamps[window_end] - timestamps[window_start] > timedelta(days=lookback_days):
                window_start += 1

            window_size = window_end - window_start + 1
            if window_size < min_occurrences:
                continue

            window = ordered_group.iloc[window_start : window_end + 1].copy()
            interval_values = np.diff(window["date"].astype("int64").to_numpy()) / 86_400_000_000_000
            average_interval_days = float(np.mean(interval_values)) if interval_values.size else 0.0
            interval_spread_days = float(np.std(interval_values)) if interval_values.size else 0.0
            first_date = window["date"].min().date().isoformat()
            last_date = window["date"].max().date().isoformat()

            recurring_candidates.append(
                {
                    "id": _candidate_id(str(service_provider), str(category), float(amount_value), first_date, last_date),
                    "service_provider": str(service_provider),
                    "category": str(category),
                    "amount": float(round(float(amount_value), 2)),
                    "first_date": first_date,
                    "last_date": last_date,
                    "transaction_count": int(window_size),
                    "lookback_days": int(lookback_days),
                    "average_interval_days": round(average_interval_days, 2),
                    "interval_spread_days": round(interval_spread_days, 2),
                    "transaction_ids": window["id"].astype(str).tolist(),
                    "status": "pending",
                }
            )
            break

    recurring_candidates.sort(key=lambda item: (item["transaction_count"], item["amount"]), reverse=True)
    return recurring_candidates


def notify_frontend(recurring_list: list[dict[str, Any]]) -> list[dict[str, Any]]:
    config = load_config()
    database_paths = _database_paths(config)

    with LOCK:
        notifications = _read_json(database_paths["notifications"], [])
        if not isinstance(notifications, list):
            notifications = []

        notification_index = {str(item.get("id")): item for item in notifications if item.get("id")}
        notification_timestamp = datetime.utcnow().replace(microsecond=0).isoformat() + "Z"

        for candidate in recurring_list:
            if not candidate.get("id"):
                continue

            candidate_id = str(candidate["id"])
            existing_item = notification_index.get(candidate_id, {})
            if str(existing_item.get("status", "pending")).lower() == "ignored":
                continue

            merged_item = {**existing_item, **candidate}
            merged_item["id"] = candidate_id
            merged_item["status"] = "pending"
            merged_item["notified_at"] = notification_timestamp
            merged_item["frontend_message"] = "Recurring payment candidate detected."
            notification_index[candidate_id] = merged_item

        updated_notifications = list(notification_index.values())
        _atomic_write_json(database_paths["notifications"], updated_notifications)

    logger.info("Stored %d recurring candidates for frontend notification", len(recurring_list))
    return recurring_list


def load_notifications() -> list[dict[str, Any]]:
    config = load_config()
    database_paths = _database_paths(config)
    notifications = _read_json(database_paths["notifications"], [])
    return notifications if isinstance(notifications, list) else []


def ignore_notification(payment_id: str) -> dict[str, Any]:
    config = load_config()
    database_paths = _database_paths(config)

    with LOCK:
        notifications = _read_json(database_paths["notifications"], [])
        if not isinstance(notifications, list):
            notifications = []

        for notification in notifications:
            if str(notification.get("id")) == str(payment_id):
                notification["status"] = "ignored"
                notification["ignored_at"] = datetime.utcnow().replace(microsecond=0).isoformat() + "Z"
                _atomic_write_json(database_paths["notifications"], notifications)
                logger.info("Ignored recurring notification %s", payment_id)
                return notification

    raise KeyError(f"Notification {payment_id} not found")


def schedule_payment(payment_id: str) -> dict[str, Any]:
    config = load_config()
    database_paths = _database_paths(config)

    with LOCK:
        notifications = _read_json(database_paths["notifications"], [])
        schedules = _read_json(database_paths["schedules"], [])

        if not isinstance(notifications, list):
            notifications = []
        if not isinstance(schedules, list):
            schedules = []

        matched_index = next((index for index, item in enumerate(notifications) if str(item.get("id")) == str(payment_id)), None)
        if matched_index is None:
            existing_schedule = next((item for item in schedules if str(item.get("id")) == str(payment_id)), None)
            if existing_schedule is not None:
                return existing_schedule
            raise KeyError(f"Payment id {payment_id} not found in notification database")

        scheduled_item = dict(notifications.pop(matched_index))
        scheduled_timestamp = datetime.utcnow().replace(microsecond=0).isoformat() + "Z"
        scheduled_item["status"] = "scheduled"
        scheduled_item["scheduled_at"] = scheduled_timestamp
        scheduled_item["ui_message"] = "Your transaction has been scheduled."

        schedules = [item for item in schedules if str(item.get("id")) != str(payment_id)]
        schedules.append(scheduled_item)

        _atomic_write_json(database_paths["notifications"], notifications)
        _atomic_write_json(database_paths["schedules"], schedules)

    logger.info("Scheduled recurring payment %s", payment_id)
    return scheduled_item


def run_detection_cycle(min_occurrences: int | None = None, lookback_days: int | None = None) -> list[dict[str, Any]]:
    config = load_config()
    transactions = load_transactions_dataframe()
    recurring_candidates = detect_recurring_payments(
        transactions,
        min_occurrences=min_occurrences or int(config.get("min_occurrences", 5)),
        lookback_days=lookback_days or int(config.get("lookback_days", 365)),
    )
    notify_frontend(recurring_candidates)
    return recurring_candidates