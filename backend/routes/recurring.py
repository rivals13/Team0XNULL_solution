from __future__ import annotations

from typing import Any

from fastapi import APIRouter

from backend.services.recurring_payments import (
    ignore_notification,
    load_notifications,
    notify_frontend,
    run_detection_cycle,
    save_transaction,
    schedule_payment,
)

router = APIRouter(prefix="/recurring", tags=["recurring"])


@router.post("/transactions")
def create_transaction(transaction: dict[str, Any]) -> dict[str, Any]:
    return save_transaction(transaction)


@router.post("/detect")
def detect_and_notify() -> dict[str, list[dict[str, Any]]]:
    recurring_candidates = run_detection_cycle()
    return {"recurring": recurring_candidates, "notifications": load_notifications()}


@router.get("/notifications")
def read_notifications() -> dict[str, list[dict[str, Any]]]:
    return {"notifications": load_notifications()}


@router.post("/notifications/{payment_id}/ignore")
def ignore(payment_id: str) -> dict[str, Any]:
    return ignore_notification(payment_id)


@router.post("/notifications/{payment_id}/schedule")
def schedule(payment_id: str) -> dict[str, Any]:
    scheduled_item = schedule_payment(payment_id)
    return {"message": scheduled_item.get("ui_message", "Your transaction has been scheduled."), "scheduled": scheduled_item}