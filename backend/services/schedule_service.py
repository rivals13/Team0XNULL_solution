from __future__ import annotations

from datetime import date, timedelta

from backend.database.models import AutomationConfig, PatternInsight


def next_execution_date(automation: AutomationConfig, pattern: PatternInsight | None = None) -> str | None:
    if automation.start_date:
        return automation.start_date.isoformat()

    if pattern:
        return pattern.next_due_date

    return (date.today() + timedelta(days=max(automation.schedule_day, 1))).isoformat()
