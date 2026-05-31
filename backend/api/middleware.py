from __future__ import annotations

from typing import Iterable

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


def configure_middleware(app: FastAPI, origins: Iterable[str] | None = None) -> None:
    """Configure cross-origin middleware on an existing FastAPI app.

    This avoids creating another FastAPI instance in the middleware module and
    centralizes allowed origins for the frontend dev servers.
    """
    default_origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ]

    allow_list = list(origins) if origins is not None else default_origins

    app.add_middleware(
        CORSMiddleware,
        allow_origins=allow_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    