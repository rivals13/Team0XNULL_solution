from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Response, status

from backend.database.db_handler import delete_transaction, get_transaction, load_transactions, upsert_transaction
from backend.database.models import LoginRequest, LoginResponse, Transaction, TransactionCreate, TransactionCreateResponse, TransactionUpdate
from backend.routes.dependencies import get_current_user
from backend.services.auth_service import create_access_token, verify_demo_credentials
from backend.services.priority_workflow import build_priority_notifications, build_utility_priority_notifications, load_notifications, load_schedules

public_router = APIRouter(prefix="/api", tags=["api"])
private_router = APIRouter(prefix="/api", tags=["api"], dependencies=[Depends(get_current_user)])


def _authenticate(payload: LoginRequest) -> str:
    if not verify_demo_credentials(payload.username, payload.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")

    return create_access_token(payload.username)


@public_router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest) -> LoginResponse:
    token = _authenticate(payload)
    return LoginResponse(message="Login successful", access_token=token)


@private_router.get("/transactions-history", response_model=list[Transaction])
def read_transaction_history() -> list[Transaction]:
    return load_transactions()


@private_router.post("/transactions-history", response_model=TransactionCreateResponse)
def create_transaction_history(payload: TransactionCreate) -> TransactionCreateResponse:
    transaction = Transaction.model_validate(payload.model_dump())
    saved = upsert_transaction(transaction)
    return TransactionCreateResponse(message="Transaction stored successfully", data=saved)


@private_router.get("/transactions-history/{transaction_id}", response_model=Transaction)
def read_transaction_history_item(transaction_id: str) -> Transaction:
    transaction = get_transaction(transaction_id)
    if transaction is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")
    return transaction


@private_router.put("/transactions-history/{transaction_id}", response_model=Transaction)
def update_transaction_history(transaction_id: str, payload: TransactionUpdate) -> Transaction:
    existing_transaction = get_transaction(transaction_id)
    if existing_transaction is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")

    updated_payload = existing_transaction.model_dump()
    for key, value in payload.model_dump(exclude_unset=True).items():
        updated_payload[key] = value

    updated_transaction = Transaction.model_validate(updated_payload)
    return upsert_transaction(updated_transaction)


@private_router.delete("/transactions-history/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
def delete_transaction_history(transaction_id: str) -> Response:
    if not delete_transaction(transaction_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")

    return Response(status_code=status.HTTP_204_NO_CONTENT)


@public_router.get("/utility-priority-list")
def read_utility_priority_list(top_k: int | None = None) -> dict[str, list[dict[str, Any]]]:
    return {"priority_list": build_utility_priority_notifications(top_k=top_k, persist=False)}


@private_router.get("/recurring/priority-list")
def read_priority_list(top_k: int | None = None) -> dict[str, list[dict[str, Any]]]:
    return {"priority_list": build_priority_notifications(top_k=top_k, persist=False)}


@public_router.get("/notifications")
def read_notifications() -> dict[str, list[dict[str, Any]]]:
    return {"notifications": load_notifications()}


@public_router.get("/schedules")
def read_schedules() -> dict[str, list[dict[str, Any]]]:
    return {"schedules": load_schedules()}


router = APIRouter()
router.include_router(public_router)
router.include_router(private_router)
