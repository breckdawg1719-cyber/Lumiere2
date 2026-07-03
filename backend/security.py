"""
Production security middleware and configuration.
Add this to your main FastAPI app startup.
"""

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import os
import logging

logger = logging.getLogger(__name__)


def configure_security(app: FastAPI) -> FastAPI:
    """
    Call this in main.py after creating your FastAPI() instance.
    Applies all production security hardening.
    """

    # ── 1. CORS — only allow your frontend domain ──────────────────────────────
    allowed_origins = os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:3000"          # dev fallback
    ).split(",")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,  # e.g. ["https://yourdomain.com"]
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
        max_age=600,
    )

    # ── 2. Trusted hosts — prevents Host-header injection ──────────────────────
    trusted_hosts = os.getenv("TRUSTED_HOSTS", "localhost,127.0.0.1").split(",")
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=trusted_hosts)

    # ── 3. Rate limiting ────────────────────────────────────────────────────────
    limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # ── 4. Security response headers ───────────────────────────────────────────
    @app.middleware("http")
    async def security_headers(request: Request, call_next):
        response: Response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        if os.getenv("ENVIRONMENT") == "production":
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains; preload"
            )
        # Remove server fingerprint
        response.headers.pop("Server", None)
        return response

    # ── 5. Request ID for tracing ──────────────────────────────────────────────
    @app.middleware("http")
    async def request_id_middleware(request: Request, call_next):
        import uuid
        req_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        response = await call_next(request)
        response.headers["X-Request-ID"] = req_id
        return response

    return app


# ── Environment variable checklist for deployment ──────────────────────────────
REQUIRED_ENV_VARS = [
    "SECRET_KEY",               # JWT signing secret (min 32 chars, random)
    "GOOGLE_PLACES_API_KEY",    # Restricted to your domain in Google Cloud Console
    "DATABASE_URL",             # Postgres connection string
    "ALLOWED_ORIGINS",          # e.g. https://yourdomain.com
    "TRUSTED_HOSTS",            # e.g. yourdomain.com
    "ENVIRONMENT",              # "production" | "development"
]

def check_env_vars():
    """Call at startup to fail fast if config is missing."""
    missing = [v for v in REQUIRED_ENV_VARS if not os.getenv(v)]
    if missing and os.getenv("ENVIRONMENT") == "production":
        raise RuntimeError(
            f"Missing required environment variables: {', '.join(missing)}\n"
            "Set these in your hosting platform's secret manager, NOT in .env committed to git."
        )
    elif missing:
        logger.warning("Missing env vars (OK in dev): %s", ", ".join(missing))
