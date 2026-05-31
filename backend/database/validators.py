from __future__ import annotations

from typing import Any

from .models import TransactionCreate, TransactionUpdate


def validate_transaction_payload(payload: dict[str, Any]) -> TransactionCreate:
    return TransactionCreate.model_validate(payload)


def validate_transaction_update(payload: dict[str, Any]) -> TransactionUpdate:
    return TransactionUpdate.model_validate(payload)


def normalize_transaction_record(payload: dict[str, Any]) -> dict[str, Any]:
    transaction = TransactionCreate.model_validate(payload)
    return transaction.model_dump(mode="json")
