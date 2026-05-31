from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.database.db_handler import load_transactions
from backend.routes.auth import router as auth_router
from backend.routes.automation import router as automation_router
from backend.routes.patterns import router as patterns_router
from backend.routes.recurring import router as recurring_router
from backend.routes.transactions import router as transactions_router


app = FastAPI(
    title="PaySmart Automation API",
    version="1.0.0",
    description="JSON-backed transaction history, recurring pattern detection, and automation orchestration.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(transactions_router)
app.include_router(patterns_router)
app.include_router(automation_router)
app.include_router(recurring_router)


@app.on_event("startup")
def bootstrap_data_store() -> None:
    load_transactions()


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}
