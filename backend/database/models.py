from datetime import date as Date

from pydantic import BaseModel, Field, field_validator


class TransactionBase(BaseModel):
    transaction_id: str = Field(min_length=1, max_length=32)
    amount: float = Field(gt=0)
    recipient: str = Field(min_length=1, max_length=120)
    date: Date
    category: str = Field(min_length=1, max_length=80)

    @field_validator("transaction_id", "recipient", "category", mode="before")
    @classmethod
    def normalize_text(cls, value: str) -> str:
        return str(value).strip()


class TransactionCreate(TransactionBase):
    note: str | None = Field(default=None, max_length=280)


class TransactionUpdate(BaseModel):
    amount: float | None = Field(default=None, gt=0)
    recipient: str | None = Field(default=None, min_length=1, max_length=120)
    date: Date | None = None
    category: str | None = Field(default=None, min_length=1, max_length=80)
    note: str | None = Field(default=None, max_length=280)


class Transaction(TransactionCreate):
    pass


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginResponse(BaseModel):
    status: str = "success"
    message: str
    access_token: str
    token_type: str = "bearer"


class TransactionCreateResponse(BaseModel):
    status: str = "success"
    message: str
    data: Transaction


class AutomationRequest(BaseModel):
    recipient: str = Field(min_length=1, max_length=120)
    amount: float = Field(gt=0)
    category: str = Field(min_length=1, max_length=80)
    frequency: str = Field(default="monthly", min_length=1, max_length=40)
    schedule_day: int = Field(default=1, ge=1, le=32)
    reminder_days: int = Field(default=3, ge=0, le=30)
    start_date: Date | None = None
    source: str | None = None


class AutomationConfig(AutomationRequest):
    automation_id: str
    status: str = "scheduled"


class PatternInsight(BaseModel):
    pattern_id: str
    recipient: str
    amount: float
    category: str
    payment_count: int
    average_interval_days: float
    next_due_date: str
    confidence: float
    message: str
    automation_ready: bool = True
