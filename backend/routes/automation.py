from __future__ import annotations

from fastapi import APIRouter, Depends

from backend.database.db_handler import load_automations, load_transactions
from backend.database.models import AutomationConfig, AutomationRequest
from backend.patterns.detector import detect_recurring_patterns
from backend.routes.dependencies import get_current_user
from backend.services.automation_service import save_automation_config

router = APIRouter(prefix="/automation", tags=["automation"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[AutomationConfig])
def list_automations() -> list[AutomationConfig]:
    return load_automations()


@router.post("", response_model=dict[str, AutomationConfig | None])
def create_automation(payload: AutomationRequest) -> dict[str, AutomationConfig | None]:
    detected_patterns = detect_recurring_patterns(load_transactions())
    matching_pattern = next(
        (
            pattern
            for pattern in detected_patterns
            if pattern.recipient.lower() == payload.recipient.lower()
            and int(pattern.amount) == int(payload.amount)
        ),
        None,
    )

    automation = save_automation_config(payload, matching_pattern)
    return {"status": "scheduled", "automation": automation}
