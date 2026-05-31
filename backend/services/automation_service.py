from __future__ import annotations

from datetime import date
from uuid import uuid4

from backend.database.db_handler import append_automation, load_automations
from backend.database.models import AutomationConfig, AutomationRequest, PatternInsight


def build_automation_config(request: AutomationRequest, pattern: PatternInsight | None = None) -> AutomationConfig:
    source_recipient = pattern.recipient if pattern else request.recipient
    source_amount = pattern.amount if pattern else request.amount
    source_category = pattern.category if pattern else request.category
    source_start_date = pattern.next_due_date if pattern else None

    return AutomationConfig(
        automation_id=f"AUTO-{uuid4().hex[:10].upper()}",
        recipient=source_recipient,
        amount=source_amount,
        category=source_category,
        frequency=request.frequency,
        schedule_day=request.schedule_day,
        reminder_days=request.reminder_days,
        start_date=request.start_date or (date.fromisoformat(source_start_date) if source_start_date else None),
        source=pattern.pattern_id if pattern else request.source,
    )


def save_automation_config(request: AutomationRequest, pattern: PatternInsight | None = None) -> AutomationConfig:
    automation = build_automation_config(request, pattern)
    append_automation(automation)
    return automation


def list_automation_configs() -> list[AutomationConfig]:
    return load_automations()
