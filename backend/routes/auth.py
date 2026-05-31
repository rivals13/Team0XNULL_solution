from fastapi import APIRouter, HTTPException, status

from backend.database.models import LoginRequest, LoginResponse, TokenResponse
from backend.services.auth_service import create_access_token, verify_demo_credentials

router = APIRouter(tags=["auth"])


def _authenticate(payload: LoginRequest) -> str:
    if not verify_demo_credentials(payload.username, payload.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")

    return create_access_token(payload.username)


@router.post("/auth/login", response_model=TokenResponse)
def login(payload: LoginRequest) -> TokenResponse:
    return TokenResponse(access_token=_authenticate(payload))


@router.post("/login", response_model=LoginResponse)
def login_for_ui(payload: LoginRequest) -> LoginResponse:
    token = _authenticate(payload)
    return LoginResponse(message="Login successful", access_token=token)
