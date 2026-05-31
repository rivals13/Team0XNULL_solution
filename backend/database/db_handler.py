from __future__ import annotations

import json
from pathlib import Path
from threading import RLock
from typing import Any

from .models import AutomationConfig, Transaction


BASE_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BASE_DIR / "data"
TRANSACTIONS_FILE = DATA_DIR / "transactions.json"
AUTOMATIONS_FILE = DATA_DIR / "automation_rules.json"
LOCK = RLock()

SEED_TRANSACTIONS = [
    {
        "transaction_id": "TXN001",
        "amount": 150000,
        "recipient": "LBEF College Fee",
        "date": "2025-01-30",
        "category": "Education",
        "note": "January college fee payment",
    },
    {
        "transaction_id": "TXN002",
        "amount": 1000,
        "recipient": "NEA WiFi Bill",
        "date": "2025-01-30",
        "category": "Utilities",
        "note": "January WiFi bill payment",
    },
    {
        "transaction_id": "TXN003",
        "amount": 50000,
        "recipient": "Nabil Bank Loan",
        "date": "2025-02-05",
        "category": "Financial",
        "note": "Loan repayment installment",
    },
    {
        "transaction_id": "TXN004",
        "amount": 150000,
        "recipient": "LBEF College Fee",
        "date": "2025-03-30",
        "category": "Education",
        "note": "March college fee payment",
    },
    {
        "transaction_id": "TXN004",
        "amount": 1000,
        "recipient": "NEA WiFi Bill",
        "date": "2025-03-30",
        "category": "Utilities",
        "note": "March WiFi bill payment",
    },
    {
        "transaction_id": "TXN005",
        "amount": 50000,
        "recipient": "Nabil Bank Loan",
        "date": "2025-04-05",
        "category": "Financial",
        "note": "Loan repayment installment",
    },
    {
        "transaction_id": "TXN006",
        "amount": 150000,
        "recipient": "LBEF College Fee",
        "date": "2025-05-30",
        "category": "Education",
        "note": "May college fee payment",
    },
    {
        "transaction_id": "TXN007",
        "amount": 1000,
        "recipient": "NEA WiFi Bill",
        "date": "2025-05-30",
        "category": "Utilities",
        "note": "May WiFi bill payment",
    },
    {
        "transaction_id": "TXN008",
        "amount": 50000,
        "recipient": "Nabil Bank Loan",
        "date": "2025-06-05",
        "category": "Financial",
        "note": "Loan repayment installment",
    },
    {
        "transaction_id": "TXN009",
        "amount": 150000,
        "recipient": "LBEF College Fee",
        "date": "2025-07-30",
        "category": "Education",
        "note": "July college fee payment",
    },
    {
        "transaction_id": "TXN010",
        "amount": 1000,
        "recipient": "NEA WiFi Bill",
        "date": "2025-07-30",
        "category": "Utilities",
        "note": "July WiFi bill payment",
    },
    {
        "transaction_id": "TXN011",
        "amount": 50000,
        "recipient": "Nabil Bank Loan",
        "date": "2025-08-05",
        "category": "Financial",
        "note": "Loan repayment installment",
    },
    {
        "transaction_id": "TXN012",
        "amount": 150000,
        "recipient": "LBEF College Fee",
        "date": "2025-09-30",
        "category": "Education",
        "note": "September college fee payment",
    },
    {
        "transaction_id": "TXN013",
        "amount": 1000,
        "recipient": "NEA WiFi Bill",
        "date": "2025-09-30",
        "category": "Utilities",
        "note": "September WiFi bill payment",
    },
    {
        "transaction_id": "TXN014",
        "amount": 50000,
        "recipient": "Nabil Bank Loan",
        "date": "2025-10-05",
        "category": "Financial",
        "note": "Loan repayment installment",
    },
    {
        "transaction_id": "TXN015",
        "amount": 50000,
        "recipient": "Nabil Bank Loan",
        "date": "2025-12-05",
        "category": "Financial",
        "note": "Loan repayment installment",
    },
]


def _ensure_file(path: Path, default_value: list[dict[str, Any]]) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        path.write_text(json.dumps(default_value, indent=2), encoding="utf-8")


def _read_json(path: Path) -> list[dict[str, Any]]:
    _ensure_file(path, SEED_TRANSACTIONS if path == TRANSACTIONS_FILE else [])
    raw_value = path.read_text(encoding="utf-8")
    if not raw_value.strip():
        return []

    return json.loads(raw_value)


def _write_json(path: Path, payload: list[dict[str, Any]]) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")


def load_transactions() -> list[Transaction]:
    with LOCK:
        return [Transaction.model_validate(item) for item in _read_json(TRANSACTIONS_FILE)]


def save_transactions(transactions: list[Transaction]) -> list[Transaction]:
    with LOCK:
        serialized = [transaction.model_dump(mode="json") for transaction in transactions]
        _write_json(TRANSACTIONS_FILE, serialized)
        return [Transaction.model_validate(item) for item in serialized]


def get_transaction(transaction_id: str) -> Transaction | None:
    with LOCK:
        for transaction in load_transactions():
            if transaction.transaction_id == transaction_id:
                return transaction
    return None


def upsert_transaction(transaction: Transaction) -> Transaction:
    with LOCK:
        transactions = load_transactions()
        updated_transactions = [item for item in transactions if item.transaction_id != transaction.transaction_id]
        updated_transactions.append(transaction)
        save_transactions(updated_transactions)
        return transaction


def delete_transaction(transaction_id: str) -> bool:
    with LOCK:
        transactions = load_transactions()
        remaining_transactions = [item for item in transactions if item.transaction_id != transaction_id]
        if len(remaining_transactions) == len(transactions):
            return False

        save_transactions(remaining_transactions)
        return True


def load_automations() -> list[AutomationConfig]:
    with LOCK:
        _ensure_file(AUTOMATIONS_FILE, [])
        raw_value = AUTOMATIONS_FILE.read_text(encoding="utf-8")
        if not raw_value.strip():
            return []
        return [AutomationConfig.model_validate(item) for item in json.loads(raw_value)]


def save_automations(automations: list[AutomationConfig]) -> list[AutomationConfig]:
    with LOCK:
        serialized = [automation.model_dump(mode="json") for automation in automations]
        _write_json(AUTOMATIONS_FILE, serialized)
        return [AutomationConfig.model_validate(item) for item in serialized]


def append_automation(automation: AutomationConfig) -> AutomationConfig:
    with LOCK:
        automations = load_automations()
        automations.append(automation)
        save_automations(automations)
        return automation
