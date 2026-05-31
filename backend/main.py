from __future__ import annotations

import json
from pathlib import Path

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from backend.api import router as api_router
from backend.api.middleware import configure_middleware
from backend.routes.auth import router as auth_router
from backend.routes.automation import router as automation_router
from backend.routes.patterns import router as patterns_router
from backend.routes.recurring import router as recurring_router
from backend.routes.transactions import router as transactions_router
from backend.services.priority_workflow import run_detection_cycle


app = FastAPI(
    title="PaySmart Automation API",
    version="1.0.0",
    description="JSON-backed transaction history, recurring pattern detection, and automation orchestration.",
)

configure_middleware(app)

app.include_router(auth_router)
app.include_router(api_router)
app.include_router(transactions_router)
app.include_router(patterns_router)
app.include_router(automation_router)
app.include_router(recurring_router)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=400,
        content={
            "detail": "Invalid request payload",
            "errors": exc.errors(),
        },
    )


@app.on_event("startup")
def bootstrap_data_store() -> None:
    notifications_path = Path(__file__).resolve().parent / "data" / "notification_database.json"
    schedules_path = Path(__file__).resolve().parent / "data" / "schedule_database.json"
    legacy_path = Path(__file__).resolve().parent / "data" / "transaction_database.json"
    if legacy_path.exists():
        legacy_path.unlink()

    def has_records(path: Path) -> bool:
        if not path.exists():
            return False

        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return False

        if isinstance(payload, dict):
            records = payload.get("records")
            return isinstance(records, list) and len(records) > 0

        return isinstance(payload, list) and len(payload) > 0

    if has_records(notifications_path):
        return

    run_detection_cycle()


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/")
def root() -> dict[str, str]:
    return {
        "message": "PaySmart Automation API is running.",
        "docs": "/docs",
        "health": "/health",
    }
