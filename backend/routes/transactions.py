from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response, status

from backend.database.db_handler import delete_transaction, get_transaction, load_transactions, upsert_transaction
from backend.database.models import Transaction, TransactionCreate, TransactionUpdate
from backend.routes.dependencies import get_current_user

router = APIRouter(prefix="/transactions", tags=["transactions"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[Transaction])
def list_all_transactions() -> list[Transaction]:
    return load_transactions()


@router.get("/{transaction_id}", response_model=Transaction)
def read_transaction(transaction_id: str) -> Transaction:
    transaction = get_transaction(transaction_id)
    if transaction is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")
    return transaction


@router.post("", response_model=Transaction, status_code=status.HTTP_201_CREATED)
def create_transaction(payload: TransactionCreate) -> Transaction:
    transaction = Transaction.model_validate(payload.model_dump())
    return upsert_transaction(transaction)


@router.put("/{transaction_id}", response_model=Transaction)
def update_transaction(transaction_id: str, payload: TransactionUpdate) -> Transaction:
    existing_transaction = get_transaction(transaction_id)
    if existing_transaction is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")

    updated_payload = existing_transaction.model_dump()
    for key, value in payload.model_dump(exclude_unset=True).items():
        updated_payload[key] = value

    updated_transaction = Transaction.model_validate(updated_payload)
    return upsert_transaction(updated_transaction)


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
def remove_transaction(transaction_id: str) -> Response:
    if not delete_transaction(transaction_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")

    return Response(status_code=status.HTTP_204_NO_CONTENT)
