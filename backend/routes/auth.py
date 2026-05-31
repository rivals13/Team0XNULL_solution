from fastapi import APIRouter, HTTPException, status

from backend.database.models import LoginRequest, TokenResponse
from backend.services.auth_service import create_access_token, verify_demo_credentials

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest) -> TokenResponse:
    if not verify_demo_credentials(payload.username, payload.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")

    return TokenResponse(access_token=create_access_token(payload.username))
