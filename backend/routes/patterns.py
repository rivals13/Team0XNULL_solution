from __future__ import annotations

from fastapi import APIRouter, Depends

from backend.database.db_handler import load_transactions
from backend.database.models import PatternInsight
from backend.patterns.detector import detect_recurring_patterns
from backend.routes.dependencies import get_current_user

router = APIRouter(prefix="/patterns", tags=["patterns"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=dict[str, list[PatternInsight]])
def read_patterns() -> dict[str, list[PatternInsight]]:
    patterns = detect_recurring_patterns(load_transactions())
    return {"patterns": patterns}
