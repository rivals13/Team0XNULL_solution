from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Query, status

from backend.services.priority_workflow import (
    build_priority_notifications,
    build_utility_priority_notifications,
    dismiss_notification,
    ignore_scheduled_payment,
    load_notifications,
    load_schedules,
    run_detection_cycle,
    save_transaction,
    schedule_notification,
    summarize_priority_rules,
    update_schedule,
)

router = APIRouter(prefix="/recurring", tags=["recurring"])


def _save_schedule(notification_id: str, scheduled_date: str | None = None, scheduled_amount: float | None = None) -> dict[str, Any]:
    try:
        scheduled_item = schedule_notification(notification_id, scheduled_date=scheduled_date, scheduled_amount=scheduled_amount)
    except (TypeError, ValueError):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to save schedule")
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    return {
        "status": "success",
        "saved": True,
        "id": scheduled_item.get("schedule_id"),
        "message": scheduled_item.get("ui_message", "Your transaction has been scheduled."),
        "scheduled": scheduled_item,
    }


@router.post("/transactions")
def create_transaction(transaction: dict[str, Any]) -> dict[str, Any]:
    try:
        return save_transaction(transaction)
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/detect")
def detect_and_notify(top_k: int | None = Query(default=None, ge=1)) -> dict[str, Any]:
    priority_list = run_detection_cycle(top_k=top_k)
    return {"priority_list": priority_list, "notifications": load_notifications(), "schedules": load_schedules()}


@router.get("/priority-list")
def read_priority_list(top_k: int | None = Query(default=None, ge=1)) -> dict[str, list[dict[str, Any]]]:
    return {"priority_list": build_priority_notifications(top_k=top_k, persist=False)}


@router.get("/utility-priority-list")
def read_utility_priority_list(top_k: int | None = Query(default=None, ge=1)) -> dict[str, list[dict[str, Any]]]:
    return {"priority_list": build_utility_priority_notifications(top_k=top_k, persist=False)}


@router.get("/rules")
def read_priority_rules() -> dict[str, Any]:
    return summarize_priority_rules()


@router.get("/notifications")
def read_notifications() -> dict[str, list[dict[str, Any]]]:
    return {"notifications": load_notifications()}


@router.get("/schedules")
def read_schedules() -> dict[str, list[dict[str, Any]]]:
    return {"schedules": load_schedules()}


@router.post("/notifications/{payment_id}/ignore")
def ignore(payment_id: str) -> dict[str, Any]:
    return dismiss_notification(payment_id)


@router.post("/notifications/{payment_id}/schedule")
def schedule(payment_id: str, scheduled_date: str | None = Query(default=None), scheduled_amount: float | None = Query(default=None)) -> dict[str, Any]:
    return _save_schedule(payment_id, scheduled_date=scheduled_date, scheduled_amount=scheduled_amount)


@router.post("/schedules")
def create_schedule(payload: dict[str, Any]) -> dict[str, Any]:
    notification_id = str(payload.get("notification_id") or payload.get("payment_id") or "").strip()
    if not notification_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to save schedule")

    scheduled_date = payload.get("scheduled_date")
    scheduled_amount = payload.get("scheduled_amount")
    if scheduled_amount is not None:
        try:
            scheduled_amount = float(scheduled_amount)
        except (TypeError, ValueError) as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to save schedule") from exc

    return _save_schedule(notification_id, scheduled_date=scheduled_date, scheduled_amount=scheduled_amount)


@router.patch("/schedules/{schedule_id}")
def edit_schedule(schedule_id: str, scheduled_date: str | None = Query(default=None), scheduled_amount: float | None = Query(default=None)) -> dict[str, Any]:
    return {"schedule": update_schedule(schedule_id, scheduled_date=scheduled_date, scheduled_amount=scheduled_amount)}


@router.post("/schedules/{schedule_id}/ignore")
@router.post("/schedules/{schedule_id}/dismiss")
def ignore_schedule(schedule_id: str) -> dict[str, Any]:
    archived_notification = ignore_scheduled_payment(schedule_id)
    return {"message": archived_notification.get("ui_message", "Scheduled payment returned to notifications."), "notification": archived_notification}