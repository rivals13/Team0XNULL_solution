from __future__ import annotations

from datetime import datetime, timedelta, timezone

from jose import jwt


SECRET_KEY = "paysmart-demo-secret-key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 120
DEMO_USER = {
    "username": "demo",
    "password": "demo123",
}


def verify_demo_credentials(username: str, password: str) -> bool:
    return username == DEMO_USER["username"] and password == DEMO_USER["password"]


def create_access_token(subject: str) -> str:
    expire_at = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": subject, "exp": expire_at}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
