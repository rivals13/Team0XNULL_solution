from __future__ import annotations
import hashlib
import json
import logging
import os
import re
import tempfile
from datetime import date, datetime, timedelta
from pathlib import Path
from threading import RLock
from typing import Any
from urllib.error import URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BASE_DIR / "data"
TRANSACTIONS_FILE = DATA_DIR / "transactions.json"
NOTIFICATIONS_FILE = DATA_DIR / "notification_database.json"
SCHEDULES_FILE = DATA_DIR / "schedule_database.json"

MIN_OCCURRENCES = 5
DEFAULT_LOOKBACK_DAYS = 365
DEFAULT_TOPUP_WINDOW_DAYS = 7
DEFAULT_UTILITY_WINDOW_START_DAYS = 10
DEFAULT_UTILITY_WINDOW_END_DAYS = 7
REMINDER_OFFSETS_DAYS = (10, 4, 1)
LOCK = RLock()
PROTECTED_NOTIFICATION_IDS_FIELD = "protected_notification_ids"


def _normalize_merchant_name(*values: Any) -> str:
    for value in values:
        if value is None:
            continue
        text = " ".join(str(value).split()).strip()
        if text:
            return text
    return "Unknown merchant"

UTILITY_KEYWORDS = (
    "electricity",
    "water",
    "internet",
    "telecom",
    "postpaid",
    "utility",
    "bill",
    "rent",
    "insurance",
    "loan",
)
TOPUP_KEYWORDS = (
    "topup",
    "top-up",
    "recharge",
    "prepaid",
    "mobile_recharge",
    "mobile recharge",
)


def _ensure_json_file(path: Path, default_value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        path.write_text(json.dumps(default_value, indent=2, ensure_ascii=False), encoding="utf-8")


def _read_text(path: Path, default_value: Any) -> str:
    _ensure_json_file(path, default_value)
    return path.read_text(encoding="utf-8")


def _atomic_write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", delete=False, dir=str(path.parent), encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2, ensure_ascii=False)
        handle.flush()
        os.fsync(handle.fileno())
        temp_name = handle.name
    os.replace(temp_name, path)


def _load_json_or_empty(path: Path, default_value: Any) -> Any:
    raw_text = _read_text(path, default_value).strip()
    if not raw_text:
        return default_value
    try:
        return json.loads(raw_text)
    except json.JSONDecodeError:
        return default_value


def _extract_balanced_json_array(raw_text: str, key: str) -> list[dict[str, Any]]:
    marker = f'"{key}"'
    marker_index = raw_text.find(marker)
    if marker_index == -1:
        return []

    array_start = raw_text.find("[", marker_index)
    if array_start == -1:
        return []

    depth = 0
    in_string = False
    escape = False
    for index in range(array_start, len(raw_text)):
        character = raw_text[index]
        if in_string:
            if escape:
                escape = False
            elif character == "\\":
                escape = True
            elif character == '"':
                in_string = False
            continue

        if character == '"':
            in_string = True
        elif character == "[":
            depth += 1
        elif character == "]":
            depth -= 1
            if depth == 0:
                array_text = raw_text[array_start : index + 1]
                parsed_value = json.loads(array_text)
                return parsed_value if isinstance(parsed_value, list) else []

    return []


def _extract_metadata(raw_text: str) -> dict[str, Any]:
    metadata: dict[str, Any] = {}
    patterns = {
        "user_id": r'"user_id"\s*:\s*(\d+)',
        "wallet": r'"wallet"\s*:\s*"([^"]+)"',
        "currency": r'"currency"\s*:\s*"([^"]+)"',
        "year": r'"year"\s*:\s*(\d+)',
    }
    for field_name, pattern in patterns.items():
        match = re.search(pattern, raw_text)
        if not match:
            continue
        raw_value = match.group(1)
        metadata[field_name] = int(raw_value) if field_name in {"user_id", "year"} else raw_value
    return metadata


def _load_transaction_payload() -> tuple[dict[str, Any], list[dict[str, Any]]]:
    raw_text = _read_text(TRANSACTIONS_FILE, {"database": "transactions", "transactions": []})
    parsed_payload: Any
    try:
        parsed_payload = json.loads(raw_text)
    except json.JSONDecodeError:
        parsed_payload = None

    if isinstance(parsed_payload, dict):
        transactions = parsed_payload.get("transactions")
        if isinstance(transactions, list):
            return parsed_payload, transactions
        records = parsed_payload.get("records")
        if isinstance(records, list):
            payload = dict(parsed_payload)
            payload["transactions"] = records
            return payload, records

    if isinstance(parsed_payload, list):
        payload = {"database": "transactions", "transactions": parsed_payload}
        return payload, parsed_payload

    transactions = _extract_balanced_json_array(raw_text, "transactions")
    metadata = _extract_metadata(raw_text)
    payload = {"database": "transactions", **metadata, "transactions": transactions}
    return payload, transactions


def _ensure_transaction_record(transaction: dict[str, Any], fallback_payload: dict[str, Any]) -> dict[str, Any]:
    transaction_id = str(transaction.get("txn_id") or transaction.get("transaction_id") or transaction.get("id") or "").strip()
    provider = str(transaction.get("merchant") or transaction.get("service_provider") or transaction.get("recipient") or "").strip()
    category = str(transaction.get("category") or "").strip().lower()
    amount = float(transaction.get("amount", 0) or 0)
    date_value = str(transaction.get("date") or "").strip()
    time_value = str(transaction.get("time") or "").strip()

    if not transaction_id:
        transaction_id = f"TXN-{hashlib.sha1(f'{provider}|{category}|{date_value}|{time_value}'.encode('utf-8')).hexdigest()[:12].upper()}"
    if not provider:
        provider = "Unknown Provider"
    if not category:
        category = "unknown"
    if amount <= 0:
        raise ValueError("transaction amount must be positive")
    if not date_value:
        raise ValueError("transaction date is required")

    normalized = dict(transaction)
    normalized["txn_id"] = transaction_id
    normalized["merchant"] = provider
    normalized["category"] = category
    normalized["amount"] = round(amount, 2)
    normalized["date"] = date_value
    if time_value:
        normalized["time"] = time_value
    normalized.setdefault("status", "success")
    normalized.setdefault("recurring", bool(transaction.get("recurring", False)))
    if "wallet" not in normalized and fallback_payload.get("wallet"):
        normalized["wallet"] = fallback_payload["wallet"]
    if "currency" not in normalized and fallback_payload.get("currency"):
        normalized["currency"] = fallback_payload["currency"]
    return normalized


def save_transaction(transaction: dict[str, Any]) -> dict[str, Any]:
    with LOCK:
        payload, transactions = _load_transaction_payload()
        normalized_transaction = _ensure_transaction_record(transaction, payload)
        updated_transactions = [item for item in transactions if str(item.get("txn_id") or item.get("transaction_id") or item.get("id")) != normalized_transaction["txn_id"]]
        updated_transactions.append(normalized_transaction)
        payload["transactions"] = updated_transactions
        _atomic_write_json(TRANSACTIONS_FILE, payload)
    logger.info("Saved utility/top-up transaction %s", normalized_transaction["txn_id"])
    return normalized_transaction


def load_transactions_history() -> list[dict[str, Any]]:
    _, transactions = _load_transaction_payload()
    normalized_transactions = []
    for transaction in transactions:
        try:
            normalized_transactions.append(_ensure_transaction_record(transaction, {}))
        except Exception:
            continue
    return normalized_transactions


def _parse_transaction_date(transaction: dict[str, Any]) -> datetime:
    raw_date = str(transaction.get("date") or "").strip()
    raw_time = str(transaction.get("time") or "00:00:00").strip() or "00:00:00"
    if not raw_date:
        raise ValueError("transaction date is missing")
    try:
        return datetime.fromisoformat(f"{raw_date}T{raw_time}")
    except ValueError:
        return datetime.fromisoformat(raw_date)


def _payment_family(transaction: dict[str, Any]) -> str:
    category = str(transaction.get("category") or "").strip().lower()
    merchant = str(transaction.get("merchant") or transaction.get("service_provider") or "").strip().lower()
    source = f"{category} {merchant}"
    if any(keyword in source for keyword in TOPUP_KEYWORDS):
        return "topup"
    if any(keyword in source for keyword in UTILITY_KEYWORDS):
        return "utilities"
    return "other"


def _estimate_interval_days(sorted_dates: list[datetime]) -> float:
    if len(sorted_dates) < 2:
        return 30.0
    intervals = [(later - earlier).days for earlier, later in zip(sorted_dates, sorted_dates[1:])]
    if not intervals:
        return 30.0
    return sum(intervals) / len(intervals)


def _estimate_due_date(last_transaction_date: datetime, average_interval_days: float) -> date:
    interval_days = int(round(average_interval_days)) if average_interval_days else 30
    return (last_transaction_date.date() + timedelta(days=max(interval_days, 1)))


def _priority_score_components(payment_family: str, occurrence_count: int, average_interval_days: float, interval_spread_days: float) -> tuple[float, float, float, float]:
    late_fee_risk = 1.0 if payment_family == "utilities" else 0.82 if payment_family == "topup" else 0.4
    frequency_score = min(occurrence_count / 10.0, 1.0)
    if average_interval_days <= 0:
        user_behavior_score = 0.0
    else:
        stability = max(0.0, 1.0 - min(interval_spread_days / max(average_interval_days, 1.0), 1.0))
        user_behavior_score = stability
    priority_score = round((0.5 * late_fee_risk) + (0.3 * frequency_score) + (0.2 * user_behavior_score), 2)
    return late_fee_risk, frequency_score, user_behavior_score, priority_score


def _sort_date_value(date_text: str) -> float:
    try:
        return datetime.fromisoformat(date_text).timestamp()
    except ValueError:
        return 0.0


def _window_for_family(payment_family: str, due_date: date) -> tuple[date, date]:
    if payment_family == "topup":
        window_start = due_date - timedelta(days=DEFAULT_TOPUP_WINDOW_DAYS)
        return window_start, window_start
    window_start = due_date - timedelta(days=DEFAULT_UTILITY_WINDOW_START_DAYS)
    window_end = due_date - timedelta(days=DEFAULT_UTILITY_WINDOW_END_DAYS)
    return window_start, window_end


def _merchant_due_reference(
    provider: str,
    category: str,
    average_amount: float,
    latest_amount: float,
    due_date: date,
    reference_date: datetime,
) -> dict[str, Any]:
    base_url = os.getenv("MERCHANT_API_BASE_URL", "").strip()
    if base_url:
        params = urlencode(
            {
                "provider": provider,
                "category": category,
                "average_amount": f"{average_amount:.2f}",
                "latest_amount": f"{latest_amount:.2f}",
                "due_date": due_date.isoformat(),
            }
        )
        request_url = f"{base_url}?{params}"
        try:
            request = Request(request_url, headers={"Accept": "application/json"})
            with urlopen(request, timeout=5) as response:
                response_payload = json.loads(response.read().decode("utf-8"))
            due_amount = float(response_payload.get("due_amount", average_amount))
            due_date_value = str(response_payload.get("due_date") or due_date.isoformat())
            return {
                "source": "merchant_api",
                "request_url": request_url,
                "due_amount": round(due_amount, 2),
                "due_date": due_date_value,
                "response": response_payload,
                "captured_at": reference_date.replace(microsecond=0).isoformat() + "Z",
            }
        except (URLError, TimeoutError, ValueError, json.JSONDecodeError, OSError) as exc:
            logger.warning("Merchant API lookup failed for %s: %s", provider, exc)

    return {
        "source": "history_reference",
        "request_url": None,
        "due_amount": round(average_amount, 2),
        "due_date": due_date.isoformat(),
        "response": {
            "provider": provider,
            "category": category,
            "average_amount": round(average_amount, 2),
            "latest_amount": round(latest_amount, 2),
        },
        "captured_at": reference_date.replace(microsecond=0).isoformat() + "Z",
    }


def _collection_template(database_name: str, description: str) -> dict[str, Any]:
    return {"database": database_name, "description": description, "records": []}


def _normalize_id_list(values: Any) -> list[str]:
    if not isinstance(values, list):
        return []

    normalized_ids = []
    for value in values:
        identifier = str(value).strip()
        if identifier:
            normalized_ids.append(identifier)
    return normalized_ids


def _merge_records_by_id(
    existing_records: list[dict[str, Any]],
    incoming_records: list[dict[str, Any]],
    identifier_field: str,
    protected_ids: list[str] | None = None,
) -> list[dict[str, Any]]:
    protected_lookup = {str(value).strip() for value in (protected_ids or []) if str(value).strip()}
    merged_records: dict[str, dict[str, Any]] = {}
    record_order: list[str] = []
    anonymous_index = 0

    def remember(record: dict[str, Any], allow_replace: bool = True) -> None:
        nonlocal anonymous_index
        record_id = str(record.get(identifier_field) or "").strip()
        if not record_id:
            anonymous_key = f"__anonymous__{anonymous_index}"
            anonymous_index += 1
            record_order.append(anonymous_key)
            merged_records[anonymous_key] = record
            return

        if record_id in protected_lookup and record_id in merged_records:
            return

        if record_id not in merged_records:
            record_order.append(record_id)
        elif not allow_replace:
            return

        merged_records[record_id] = record

    for record in existing_records:
        remember(record)

    for record in incoming_records:
        record_id = str(record.get(identifier_field) or "").strip()
        if record_id and record_id in protected_lookup:
            continue
        remember(record)

    return [merged_records[record_id] for record_id in record_order]


def _read_collection(path: Path, template: dict[str, Any]) -> dict[str, Any]:
    payload = _load_json_or_empty(path, template)
    if isinstance(payload, dict):
        records = payload.get("records")
        if isinstance(records, list):
            merged_payload = dict(template)
            merged_payload.update(payload)
            merged_payload["records"] = records
            return merged_payload
        if isinstance(payload.get("transactions"), list):
            merged_payload = dict(template)
            merged_payload.update(payload)
            merged_payload["records"] = payload["transactions"]
            return merged_payload
    if isinstance(payload, list):
        return {**template, "records": payload}
    return dict(template)


def _write_collection(path: Path, template: dict[str, Any], records: list[dict[str, Any]]) -> None:
    payload = dict(template)
    payload["records"] = records
    try:
        _atomic_write_json(path, payload)
    except Exception as exc:
        logger.warning("Failed to persist %s: %s", path.name, exc)
        raise


def _read_notifications_payload() -> dict[str, Any]:
    return _read_collection(
        NOTIFICATIONS_FILE,
        _collection_template(
            "notifications",
            "Stores detected recurring utility and top-up payment priorities for user review.",
        ),
    )


def _write_notifications_payload(records: list[dict[str, Any]], protected_ids: list[str] | None = None) -> None:
    payload = _read_notifications_payload()
    payload["records"] = records
    normalized_protected_ids = _normalize_id_list(protected_ids if protected_ids is not None else payload.get(PROTECTED_NOTIFICATION_IDS_FIELD, []))
    if normalized_protected_ids:
        payload[PROTECTED_NOTIFICATION_IDS_FIELD] = normalized_protected_ids
    elif PROTECTED_NOTIFICATION_IDS_FIELD in payload:
        payload.pop(PROTECTED_NOTIFICATION_IDS_FIELD, None)

    try:
        _atomic_write_json(NOTIFICATIONS_FILE, payload)
    except Exception as exc:
        logger.warning("Failed to persist notification database: %s", exc)
        raise


def _write_schedules_payload(records: list[dict[str, Any]]) -> None:
    try:
        _write_collection(
            SCHEDULES_FILE,
            _collection_template(
                "schedules",
                "Stores user-confirmed payment schedules for recurring utility and top-up payments.",
            ),
            records,
        )
    except Exception as exc:
        logger.warning("Failed to persist schedule database: %s", exc)
        raise


def _group_transactions(transactions: list[dict[str, Any]]) -> list[dict[str, Any]]:
    grouped: dict[tuple[str, str], list[dict[str, Any]]] = {}
    for transaction in transactions:
        provider = _normalize_merchant_name(transaction.get("merchant"), transaction.get("service_provider"), transaction.get("recipient"))
        family = _payment_family(transaction)
        if not provider or family == "other":
            continue
        grouped.setdefault((provider.lower(), family), []).append(transaction)

    groups: list[dict[str, Any]] = []
    for (provider_key, family), items in grouped.items():
        ordered_items = sorted(items, key=_parse_transaction_date)
        dates = [_parse_transaction_date(item) for item in ordered_items]
        amounts = [float(item.get("amount", 0) or 0) for item in ordered_items]
        if not amounts:
            continue

        average_amount = sum(amounts) / len(amounts)
        latest_transaction = ordered_items[-1]
        latest_date = dates[-1]
        first_date = dates[0]
        average_interval_days = _estimate_interval_days(dates)
        interval_values = [(later - earlier).days for earlier, later in zip(dates, dates[1:])]
        interval_spread_days = float((sum((value - average_interval_days) ** 2 for value in interval_values) / len(interval_values)) ** 0.5) if interval_values else 0.0
        due_date = _estimate_due_date(latest_date, average_interval_days)
        due_reference = _merchant_due_reference(
            provider=_normalize_merchant_name(latest_transaction.get("merchant"), latest_transaction.get("service_provider"), provider_key),
            category=str(latest_transaction.get("category") or family),
            average_amount=average_amount,
            latest_amount=float(latest_transaction.get("amount", 0) or 0),
            due_date=due_date,
            reference_date=latest_date,
        )
        notification_start, notification_end = _window_for_family(family, due_date)
        reminders = {
            f"{offset}_days_before": (due_date - timedelta(days=offset)).isoformat()
            for offset in REMINDER_OFFSETS_DAYS
        }
        late_fee_risk, frequency_score, user_behavior_score, priority_score = _priority_score_components(
            family,
            len(ordered_items),
            average_interval_days,
            interval_spread_days,
        )

        groups.append(
            {
                "notification_id": "NOTIF-"
                + hashlib.sha1(
                    f"{provider_key}|{family}|{first_date.isoformat()}|{latest_date.isoformat()}".encode("utf-8")
                ).hexdigest()[:10].upper(),
                "service_provider": _normalize_merchant_name(latest_transaction.get("merchant"), latest_transaction.get("service_provider"), provider_key),
                "category": str(latest_transaction.get("category") or family),
                "payment_family": family,
                "wallet": latest_transaction.get("wallet") or None,
                "currency": latest_transaction.get("currency") or None,
                "occurrences_in_year": len(ordered_items),
                "average_amount": round(average_amount, 2),
                "latest_amount": round(float(latest_transaction.get("amount", 0) or 0), 2),
                "due_amount": float(due_reference["due_amount"]),
                "first_transaction_date": first_date.date().isoformat(),
                "latest_transaction_date": latest_date.date().isoformat(),
                "due_date": due_date.isoformat(),
                "notification_window": {
                    "start": notification_start.isoformat(),
                    "end": notification_end.isoformat(),
                },
                "reminders": reminders,
                "transaction_ids": [str(item.get("txn_id") or item.get("transaction_id") or item.get("id") or "") for item in ordered_items],
                "merchant_reference": due_reference,
                "frequency_tier": "recurring" if len(ordered_items) >= MIN_OCCURRENCES else "one_off",
                "status": "pending",
                "detected_on": date.today().isoformat(),
                "priority_score": priority_score,
                "priority": {
                    "payment_count": len(ordered_items),
                    "average_amount": round(average_amount, 2),
                    "latest_transaction_date": latest_date.date().isoformat(),
                    "priority_score": priority_score,
                    "late_fee_risk": late_fee_risk,
                    "frequency_score": frequency_score,
                    "user_behavior_score": user_behavior_score,
                    "sort_rule": "amount -> frequency -> recency -> alphabetical",
                },
            }
        )

    groups.sort(
        key=lambda item: (
            -float(item.get("priority_score", 0) or 0),
            -float(item["average_amount"]),
            -int(item["occurrences_in_year"]),
            -_sort_date_value(str(item["latest_transaction_date"])),
            str(item["service_provider"]).lower(),
        ),
    )

    for index, item in enumerate(groups, start=1):
        item["priority_rank"] = index

    return groups


def _reindex_priority_ranks(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    ranked_records = [dict(item) for item in records]
    for index, item in enumerate(ranked_records, start=1):
        item["priority_rank"] = index
    return ranked_records


def build_priority_notifications(top_k: int | None = None, persist: bool = True) -> list[dict[str, Any]]:
    transactions = load_transactions_history()
    grouped_notifications = _group_transactions(transactions)
    recurring_notifications = [item for item in grouped_notifications if item["occurrences_in_year"] >= MIN_OCCURRENCES]

    if top_k is not None and top_k > 0:
        recurring_notifications = recurring_notifications[:top_k]

    recurring_notifications = _reindex_priority_ranks(recurring_notifications)

    if persist:
        with LOCK:
            _write_collection(
                NOTIFICATIONS_FILE,
                _collection_template(
                    "notifications",
                    "Stores detected recurring utility and top-up payment priorities for user review.",
                ),
                recurring_notifications,
            )

    return recurring_notifications


def build_utility_priority_notifications(top_k: int | None = None, persist: bool = True) -> list[dict[str, Any]]:
    utility_notifications = [
        item
        for item in build_priority_notifications(top_k=None, persist=False)
        if str(item.get("payment_family") or "").strip().lower() == "utilities"
        and str(item.get("category") or "").strip().lower() == "utilities"
        and int(item.get("occurrences_in_year", 0) or 0) >= MIN_OCCURRENCES
    ]

    if top_k is not None and top_k > 0:
        utility_notifications = utility_notifications[:top_k]

    utility_notifications = _reindex_priority_ranks(utility_notifications)

    if persist:
        with LOCK:
            _write_collection(
                NOTIFICATIONS_FILE,
                _collection_template(
                    "notifications",
                    "Stores detected recurring utility payment priorities for user review.",
                ),
                utility_notifications,
            )

    return utility_notifications


def run_detection_cycle(top_k: int | None = None) -> list[dict[str, Any]]:
    return build_priority_notifications(top_k=top_k, persist=True)


def load_notifications() -> list[dict[str, Any]]:
    payload = _read_collection(
        NOTIFICATIONS_FILE,
        _collection_template(
            "notifications",
            "Stores detected recurring utility and top-up payment priorities for user review.",
        ),
    )
    records = payload.get("records", [])
    if not isinstance(records, list):
        return []
    sorted_records = sorted(
        records,
        key=lambda item: (
            -float(item.get("average_amount", 0) or 0),
            -int(item.get("occurrences_in_year", 0) or 0),
            -_sort_date_value(str(item.get("latest_transaction_date", ""))),
            str(item.get("service_provider", "")).lower(),
        ),
    )
    normalized_records: list[dict[str, Any]] = []
    for record in sorted_records:
        if not isinstance(record, dict):
            continue
        normalized_record = dict(record)
        normalized_record["service_provider"] = _normalize_merchant_name(
            normalized_record.get("service_provider"),
            normalized_record.get("merchant"),
            normalized_record.get("recipient"),
        )
        normalized_records.append(normalized_record)
    return _reindex_priority_ranks(normalized_records)


def load_schedules() -> list[dict[str, Any]]:
    payload = _read_collection(
        SCHEDULES_FILE,
        _collection_template(
            "schedules",
            "Stores user-confirmed payment schedules for recurring utility and top-up payments.",
        ),
    )
    records = payload.get("records", [])
    if not isinstance(records, list):
        return []

    normalized_records: list[dict[str, Any]] = []
    for record in records:
        if not isinstance(record, dict):
            continue
        normalized_record = dict(record)
        normalized_record["service_provider"] = _normalize_merchant_name(
            normalized_record.get("service_provider"),
            normalized_record.get("merchant"),
            normalized_record.get("recipient"),
        )
        normalized_records.append(normalized_record)
    return normalized_records


def _write_notifications(records: list[dict[str, Any]]) -> None:
    with LOCK:
        _write_collection(
            NOTIFICATIONS_FILE,
            _collection_template(
                "notifications",
                "Stores detected recurring utility and top-up payment priorities for user review.",
            ),
            records,
        )


def _write_schedules(records: list[dict[str, Any]]) -> None:
    with LOCK:
        _write_collection(
            SCHEDULES_FILE,
            _collection_template(
                "schedules",
                "Stores user-confirmed payment schedules for recurring utility and top-up payments.",
            ),
            records,
        )


def dismiss_notification(notification_id: str) -> dict[str, Any]:
    notifications = load_notifications()
    for notification in notifications:
        if str(notification.get("notification_id")) == str(notification_id):
            notification["status"] = "dismissed"
            notification["dismissed_at"] = datetime.utcnow().replace(microsecond=0).isoformat() + "Z"
            _write_notifications(notifications)
            return notification
    raise KeyError(f"Notification {notification_id} not found")


def _notification_from_schedule(schedule: dict[str, Any]) -> dict[str, Any]:
    current_timestamp = datetime.utcnow().replace(microsecond=0).isoformat() + "Z"
    service_provider = _normalize_merchant_name(
        schedule.get("service_provider"),
        schedule.get("merchant"),
        schedule.get("recipient"),
    )
    notification_id = str(schedule.get("notification_id") or schedule.get("schedule_id") or "").strip()
    if not notification_id:
        notification_id = f"NOTIF-{hashlib.sha1(f'{service_provider}|{current_timestamp}'.encode('utf-8')).hexdigest()[:10].upper()}"

    scheduled_amount = float(schedule.get("scheduled_amount") or schedule.get("due_amount") or schedule.get("average_amount") or 0)
    scheduled_date = str(schedule.get("scheduled_date") or schedule.get("due_date") or current_timestamp[:10]).strip()
    latest_date = str(schedule.get("latest_transaction_date") or schedule.get("last_modified") or scheduled_date).strip()

    return {
        "notification_id": notification_id,
        "service_provider": service_provider,
        "category": schedule.get("category"),
        "payment_family": schedule.get("payment_family") or str(schedule.get("frequency") or "recurring"),
        "wallet": schedule.get("wallet"),
        "currency": schedule.get("currency"),
        "occurrences_in_year": int(schedule.get("occurrences_in_year") or schedule.get("transaction_count") or 1),
        "average_amount": round(scheduled_amount, 2),
        "latest_amount": round(scheduled_amount, 2),
        "due_amount": round(scheduled_amount, 2),
        "first_transaction_date": str(schedule.get("first_transaction_date") or schedule.get("created_on") or scheduled_date),
        "latest_transaction_date": latest_date,
        "due_date": scheduled_date,
        "notification_window": schedule.get("notification_window") or {},
        "reminders": schedule.get("reminders") or {},
        "transaction_ids": list(schedule.get("transaction_ids") or []),
        "merchant_reference": {
            "source": "schedule_reference",
            "request_url": None,
            "due_amount": round(scheduled_amount, 2),
            "due_date": scheduled_date,
            "response": {
                "schedule_id": schedule.get("schedule_id"),
                "notification_id": notification_id,
                "service_provider": service_provider,
            },
            "captured_at": current_timestamp,
        },
        "frequency_tier": str(schedule.get("frequency") or "recurring"),
        "status": "pending",
        "detected_on": current_timestamp[:10],
        "priority_score": float(schedule.get("priority_score") or 0.5),
        "priority": schedule.get("priority") or {},
        "priority_rank": int(schedule.get("priority_rank") or 0),
        "schedule_id": schedule.get("schedule_id"),
        "scheduled_at": schedule.get("created_on"),
        "ui_message": "Scheduled payment will be reminded again.",
        "requeued_at": current_timestamp,
        "source": "schedule",
    }


def ignore_scheduled_payment(schedule_id: str) -> dict[str, Any]:
    notifications = load_notifications()
    schedules = load_schedules()
    current_timestamp = datetime.utcnow().replace(microsecond=0).isoformat() + "Z"

    for index, schedule in enumerate(schedules):
        if str(schedule.get("schedule_id")) != str(schedule_id):
            continue

        archived_notification = _notification_from_schedule(schedule)
        archived_notification["status"] = "pending"
        archived_notification["ignored_at"] = current_timestamp
        archived_notification["ui_message"] = "Scheduled payment has been moved back to notifications."

        updated_notifications = [
            item for item in notifications
            if str(item.get("notification_id")) != str(archived_notification["notification_id"])
        ]
        updated_notifications.append(archived_notification)

        remaining_schedules = [item for item in schedules if str(item.get("schedule_id")) != str(schedule_id)]

        _write_notifications(updated_notifications)
        _write_schedules(remaining_schedules)

        logger.info("Returned scheduled payment %s to notifications", schedule_id)
        return archived_notification

    raise KeyError(f"Schedule {schedule_id} not found")


def _scheduled_template(notification: dict[str, Any], scheduled_date: str | None, scheduled_amount: float | None) -> dict[str, Any]:
    current_timestamp = datetime.utcnow().replace(microsecond=0).isoformat() + "Z"
    schedule_digest = hashlib.sha1(
        f"{notification.get('notification_id')}|{current_timestamp}".encode("utf-8")
    ).hexdigest()[:10].upper()
    return {
        "schedule_id": f"SCHED-{schedule_digest}",
        "notification_id": notification.get("notification_id"),
        "service_provider": _normalize_merchant_name(notification.get("service_provider"), notification.get("merchant"), notification.get("recipient")),
        "category": notification.get("category"),
        "payment_family": notification.get("payment_family"),
        "scheduled_amount": round(
            float(
                scheduled_amount
                if scheduled_amount is not None
                else notification.get("due_amount", notification.get("average_amount", 0))
            ),
            2,
        ),
        "scheduled_date": scheduled_date or str(notification.get("due_date") or notification.get("latest_transaction_date") or date.today().isoformat()),
        "created_on": current_timestamp,
        "last_modified": current_timestamp,
        "status": "upcoming",
        "notes": "Editable payment schedule generated from recurring payment priority detection.",
        "ui_message": "Your transaction has been scheduled.",
        "reminders": notification.get("reminders", {}),
    }


def schedule_notification(notification_id: str, scheduled_date: str | None = None, scheduled_amount: float | None = None) -> dict[str, Any]:
    notifications = load_notifications()
    schedules = load_schedules()

    matching_index = next((index for index, item in enumerate(notifications) if str(item.get("notification_id")) == str(notification_id)), None)
    if matching_index is None:
        existing_schedule = next((item for item in schedules if str(item.get("notification_id")) == str(notification_id)), None)
        if existing_schedule is not None:
            return existing_schedule
        raise KeyError(f"Notification {notification_id} not found")

    notification = dict(notifications[matching_index])
    notification["status"] = "scheduled"
    scheduled_entry = _scheduled_template(notification, scheduled_date, scheduled_amount)

    notifications[matching_index]["status"] = "scheduled"
    notifications[matching_index]["scheduled_at"] = scheduled_entry["created_on"]
    schedules = [item for item in schedules if str(item.get("notification_id")) != str(notification_id)]
    schedules.append(scheduled_entry)
    _write_notifications(notifications)
    _write_schedules(schedules)
    return scheduled_entry


def update_schedule(schedule_id: str, scheduled_date: str | None = None, scheduled_amount: float | None = None) -> dict[str, Any]:
    schedules = load_schedules()
    for schedule in schedules:
        if str(schedule.get("schedule_id")) != str(schedule_id):
            continue
        if scheduled_date is not None:
            schedule["scheduled_date"] = scheduled_date
        if scheduled_amount is not None:
            schedule["scheduled_amount"] = round(float(scheduled_amount), 2)
        schedule["last_modified"] = datetime.utcnow().replace(microsecond=0).isoformat() + "Z"
        _write_schedules(schedules)
        return schedule
    raise KeyError(f"Schedule {schedule_id} not found")


def save_transaction_history_entry(transaction: dict[str, Any]) -> dict[str, Any]:
    return save_transaction(transaction)


def summarize_priority_rules() -> dict[str, Any]:
    return {
        "min_occurrences": MIN_OCCURRENCES,
        "utility_window_days": {
            "start_before_due": DEFAULT_UTILITY_WINDOW_START_DAYS,
            "end_before_due": DEFAULT_UTILITY_WINDOW_END_DAYS,
        },
        "topup_window_days": DEFAULT_TOPUP_WINDOW_DAYS,
        "reminders": list(REMINDER_OFFSETS_DAYS),
        "sort_order": ["average_amount", "occurrences_in_year", "latest_transaction_date", "service_provider"],
    }
