from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import uuid
import logging
import secrets
import asyncio
import bcrypt
import httpx
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware
from starlette.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, validator
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests


# ------------------------------------------------------------------
# Config / Globals
# ------------------------------------------------------------------
ENVIRONMENT = os.environ.get("ENVIRONMENT", "development")
IS_PROD = ENVIRONMENT == "production"

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

EMERGENT_AUTH_BASE = os.environ.get("EMERGENT_AUTH_BASE", "https://demobackend.emergentagent.com")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "").strip()
GOOGLE_PLACES_API_KEY = os.environ.get("GOOGLE_PLACES_API_KEY", "").strip()
ADMIN_API_KEY = os.environ.get("ADMIN_API_KEY", "").strip()

SESSION_TTL_DAYS = 7
SESSION_COOKIE_NAME = "session_token"

# Email verification config
EMAIL_VERIFICATION_ENABLED = os.environ.get("EMAIL_VERIFICATION_ENABLED", "false").lower() == "true"
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "").strip()
FROM_EMAIL = os.environ.get("FROM_EMAIL", "noreply@lumiere.wedding")
APP_NAME = "Lumière"

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("wedding")

# ------------------------------------------------------------------
# Rate limiter
# ------------------------------------------------------------------
limiter = Limiter(key_func=get_remote_address)


# ------------------------------------------------------------------
# Password helpers
# ------------------------------------------------------------------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


# ------------------------------------------------------------------
# Session cookie
# ------------------------------------------------------------------
def set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=IS_PROD,           # True in prod (HTTPS only), False in dev
        samesite="lax" if not IS_PROD else "none",
        max_age=SESSION_TTL_DAYS * 24 * 60 * 60,
        path="/",
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(SESSION_COOKIE_NAME, path="/")


# ------------------------------------------------------------------
# Session management
# ------------------------------------------------------------------
async def create_session_for_user(user_id: str, source: str = "password") -> str:
    token = secrets.token_hex(32)   # 256-bit cryptographically random token
    expires_at = now_utc() + timedelta(days=SESSION_TTL_DAYS)
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": token,
        "source": source,
        "expires_at": expires_at.isoformat(),
        "created_at": now_utc().isoformat(),
    })
    return token


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")

    expires_at = session["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < now_utc():
        await db.user_sessions.delete_one({"session_token": token})
        raise HTTPException(status_code=401, detail="Session expired")

    user = await db.users.find_one(
        {"user_id": session["user_id"]}, {"_id": 0, "password_hash": 0}
    )
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


async def is_onboarded(user: dict) -> bool:
    if user.get("onboarded") is True:
        return True
    profile = await db.wedding_profiles.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if profile and (
        (profile.get("total_budget") or 0) > 0
        or profile.get("partner2_name")
        or profile.get("wedding_date")
    ):
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"onboarded": True}})
        return True
    return False


# ------------------------------------------------------------------
# Email verification helpers
# ------------------------------------------------------------------
def generate_verification_code() -> str:
    """6-digit numeric code."""
    return str(secrets.randbelow(900000) + 100000)


async def send_verification_email(email: str, code: str, name: str) -> bool:
    """Send a verification code email via Resend. Returns True on success."""
    if not RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not set — skipping verification email (code: %s)", code)
        return True  # In dev, skip sending but don't block registration

    html = f"""
    <div style="font-family: 'Georgia', serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; background: #FAFAFA;">
      <h2 style="font-size: 28px; color: #2C2C2C; margin-bottom: 8px;">Welcome to {APP_NAME}</h2>
      <p style="color: #76726B; font-size: 15px; line-height: 1.6;">Hi {name}, please verify your email address to get started.</p>
      <div style="text-align: center; margin: 32px 0;">
        <div style="display: inline-block; background: #FBF5EC; border: 1px solid #E8CBA5; border-radius: 16px; padding: 24px 40px;">
          <p style="font-size: 13px; color: #76726B; letter-spacing: 0.15em; text-transform: uppercase; margin: 0 0 8px;">Your verification code</p>
          <p style="font-size: 40px; font-weight: bold; color: #C5A880; letter-spacing: 0.3em; margin: 0;">{code}</p>
        </div>
      </div>
      <p style="color: #76726B; font-size: 13px; text-align: center;">This code expires in 15 minutes. If you didn't create an account, you can ignore this email.</p>
    </div>
    """

    try:
        async with httpx.AsyncClient(timeout=10.0) as http:
            r = await http.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
                json={"from": FROM_EMAIL, "to": [email], "subject": f"Your {APP_NAME} verification code", "html": html},
            )
        if r.status_code not in (200, 201):
            logger.error("Resend error %s: %s", r.status_code, r.text[:200])
            return False
        return True
    except Exception as e:
        logger.error("Email send failed: %s", e)
        return False


# ------------------------------------------------------------------
# Models
# ------------------------------------------------------------------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=200)
    name: str = Field(min_length=1, max_length=120)

    @validator("password")
    def password_strength(cls, v):
        if not any(c.isdigit() for c in v) and not any(c in "!@#$%^&*()_+-=[]{}|;':\",./<>?" for c in v):
            raise ValueError("Password must contain at least one number or special character")
        return v

    @validator("name")
    def name_no_html(cls, v):
        # Strip any HTML tags from name
        import re
        clean = re.sub(r"<[^>]+>", "", v).strip()
        if not clean:
            raise ValueError("Name cannot be empty")
        return clean


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class VerifyEmailIn(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")


class ResendVerificationIn(BaseModel):
    email: EmailStr


class UserOut(BaseModel):
    user_id: str
    email: EmailStr
    name: str
    picture: Optional[str] = None
    created_at: datetime
    onboarded: bool = False
    email_verified: bool = True   # Google users always verified


class OnboardIn(BaseModel):
    partner1_name: Optional[str] = None
    partner2_name: Optional[str] = None
    wedding_date: Optional[str] = None
    venue_location: Optional[str] = None
    currency: Optional[str] = "USD"
    total_budget: Optional[float] = 0.0
    seed_checklist: bool = True


class WeddingProfileIn(BaseModel):
    partner1_name: Optional[str] = None
    partner2_name: Optional[str] = None
    wedding_date: Optional[str] = None
    venue_location: Optional[str] = None
    currency: Optional[str] = None
    total_budget: Optional[float] = None


class CategoryIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    icon: Optional[str] = None
    color: Optional[str] = None
    planned_amount: float = Field(ge=0, default=0.0)


class CategoryOut(CategoryIn):
    id: str
    user_id: str
    created_at: datetime


class ExpenseIn(BaseModel):
    category_id: Optional[str] = None
    vendor: str = Field(min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=500)
    amount: float = Field(ge=0, le=10_000_000)
    status: Literal["paid", "pending"] = "pending"
    due_date: Optional[str] = None
    paid_date: Optional[str] = None


class ExpenseOut(ExpenseIn):
    id: str
    user_id: str
    created_at: datetime


class GuestIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=30)
    side: Optional[Literal["partner1", "partner2", "both"]] = "both"
    group: Optional[str] = Field(None, max_length=100)
    rsvp: Literal["pending", "attending", "declined", "maybe"] = "pending"
    plus_one: bool = False
    notes: Optional[str] = Field(None, max_length=500)


class GuestOut(GuestIn):
    id: str
    user_id: str
    created_at: datetime


class VendorIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    category: Optional[str] = Field(None, max_length=100)
    contact_name: Optional[str] = Field(None, max_length=150)
    phone: Optional[str] = Field(None, max_length=30)
    email: Optional[EmailStr] = None
    website: Optional[str] = Field(None, max_length=500)
    notes: Optional[str] = Field(None, max_length=1000)
    status: Literal["shortlisted", "booked", "considering", "rejected"] = "considering"


class VendorOut(VendorIn):
    id: str
    user_id: str
    created_at: datetime


class TaskIn(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    description: Optional[str] = Field(None, max_length=1000)
    phase: str = Field(min_length=1, max_length=100)
    completed: bool = False
    order: int = 0


class TaskOut(TaskIn):
    id: str
    user_id: str
    created_at: datetime


class EmergentSessionIn(BaseModel):
    session_id: str


class GoogleIdTokenIn(BaseModel):
    id_token: str


class DeleteAccountIn(BaseModel):
    confirm: str   # Must equal user's email


# ------------------------------------------------------------------
# App
# ------------------------------------------------------------------
app = FastAPI(
    title="Lumière Wedding Budget API",
    docs_url=None if IS_PROD else "/docs",      # Hide docs in production
    redoc_url=None if IS_PROD else "/redoc",
    openapi_url=None if IS_PROD else "/openapi.json",
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

api = APIRouter(prefix="/api")


# ------------------------------------------------------------------
# Security headers middleware
# ------------------------------------------------------------------
@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    if IS_PROD:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
    if "server" in response.headers:
    del response.headers["server"]
    return response


# ------------------------------------------------------------------
# Auth: Register
# ------------------------------------------------------------------
@api.post("/auth/register", response_model=UserOut)
@limiter.limit("5/minute")
async def register(payload: RegisterIn, response: Response, request: Request):
    email = payload.email.lower().strip()
    if await db.users.find_one({"email": email}):
        # Use same message to avoid user enumeration
        raise HTTPException(status_code=400, detail="Email already registered")

    user_id = f"user_{uuid.uuid4().hex[:16]}"
    email_verified = not EMAIL_VERIFICATION_ENABLED  # If verification off, auto-verify

    doc = {
        "user_id": user_id,
        "email": email,
        "name": payload.name.strip(),
        "picture": None,
        "auth_provider": "password",
        "password_hash": hash_password(payload.password),
        "email_verified": email_verified,
        "created_at": now_utc().isoformat(),
    }
    await db.users.insert_one(doc)

    # Send verification email if enabled
    if EMAIL_VERIFICATION_ENABLED:
        code = generate_verification_code()
        await db.email_verifications.insert_one({
            "email": email,
            "code": code,
            "expires_at": (now_utc() + timedelta(minutes=15)).isoformat(),
            "created_at": now_utc().isoformat(),
        })
        await send_verification_email(email, code, payload.name.strip())
        # Don't create a session yet — require verification first
        return UserOut(
            user_id=user_id, email=email, name=payload.name.strip(),
            picture=None, created_at=datetime.fromisoformat(doc["created_at"]),
            onboarded=False, email_verified=False,
        )

    token = await create_session_for_user(user_id, "password")
    set_session_cookie(response, token)
    return UserOut(
        user_id=user_id, email=email, name=payload.name.strip(),
        picture=None, created_at=datetime.fromisoformat(doc["created_at"]),
        onboarded=False, email_verified=True,
    )


# ------------------------------------------------------------------
# Auth: Verify email
# ------------------------------------------------------------------
@api.post("/auth/verify-email", response_model=UserOut)
@limiter.limit("10/minute")
async def verify_email(payload: VerifyEmailIn, response: Response, request: Request):
    email = payload.email.lower().strip()
    record = await db.email_verifications.find_one(
        {"email": email, "code": payload.code}, {"_id": 0}
    )
    if not record:
        raise HTTPException(status_code=400, detail="Invalid or expired code")

    expires_at = datetime.fromisoformat(record["expires_at"])
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < now_utc():
        await db.email_verifications.delete_one({"email": email})
        raise HTTPException(status_code=400, detail="Code expired. Please request a new one.")

    # Mark verified
    await db.users.update_one({"email": email}, {"$set": {"email_verified": True}})
    await db.email_verifications.delete_many({"email": email})

    user = await db.users.find_one({"email": email}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    token = await create_session_for_user(user["user_id"], "password")
    set_session_cookie(response, token)

    created_at = user["created_at"]
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)

    return UserOut(
        user_id=user["user_id"], email=user["email"], name=user["name"],
        picture=user.get("picture"), created_at=created_at, onboarded=False, email_verified=True,
    )


# ------------------------------------------------------------------
# Auth: Resend verification
# ------------------------------------------------------------------
@api.post("/auth/resend-verification")
@limiter.limit("3/minute")
async def resend_verification(payload: ResendVerificationIn, request: Request):
    email = payload.email.lower().strip()
    user = await db.users.find_one({"email": email}, {"_id": 0, "password_hash": 0})
    # Always return 200 to avoid user enumeration
    if not user or user.get("email_verified"):
        return {"message": "If that email exists and is unverified, a new code has been sent."}

    await db.email_verifications.delete_many({"email": email})
    code = generate_verification_code()
    await db.email_verifications.insert_one({
        "email": email, "code": code,
        "expires_at": (now_utc() + timedelta(minutes=15)).isoformat(),
        "created_at": now_utc().isoformat(),
    })
    await send_verification_email(email, user["name"], code)
    return {"message": "If that email exists and is unverified, a new code has been sent."}


# ------------------------------------------------------------------
# Auth: Login
# ------------------------------------------------------------------
@api.post("/auth/login", response_model=UserOut)
@limiter.limit("10/minute")
async def login(payload: LoginIn, response: Response, request: Request):
    email = payload.email.lower().strip()
    user = await db.users.find_one({"email": email})

    # Use constant-time comparison for both cases to prevent timing attacks
    dummy_hash = "$2b$12$notarealhashXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
    stored_hash = user["password_hash"] if (user and user.get("password_hash")) else dummy_hash
    password_ok = verify_password(payload.password, stored_hash)

    if not user or not user.get("password_hash") or not password_ok:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if EMAIL_VERIFICATION_ENABLED and not user.get("email_verified", True):
        raise HTTPException(status_code=403, detail="Please verify your email before logging in.")

    token = await create_session_for_user(user["user_id"], "password")
    set_session_cookie(response, token)

    created_at = user["created_at"]
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)
    onboarded = await is_onboarded(user)
    return UserOut(
        user_id=user["user_id"], email=user["email"], name=user["name"],
        picture=user.get("picture"), created_at=created_at, onboarded=onboarded,
        email_verified=user.get("email_verified", True),
    )


# ------------------------------------------------------------------
# Auth: Google (Emergent session)
# ------------------------------------------------------------------
@api.post("/auth/google/session", response_model=UserOut)
@limiter.limit("20/minute")
async def google_session(payload: EmergentSessionIn, response: Response, request: Request):
    async with httpx.AsyncClient(timeout=20.0) as http:
        try:
            r = await http.get(
                f"{EMERGENT_AUTH_BASE}/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": payload.session_id},
            )
        except httpx.HTTPError as e:
            raise HTTPException(status_code=502, detail=f"Auth provider error: {e}")
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid Emergent session")
    data = r.json()
    email = (data.get("email") or "").lower().strip()
    if not email:
        raise HTTPException(status_code=400, detail="No email returned from provider")
    name = data.get("name") or email.split("@")[0]
    picture = data.get("picture")

    user = await db.users.find_one({"email": email})
    if not user:
        user_id = f"user_{uuid.uuid4().hex[:16]}"
        user_doc = {
            "user_id": user_id, "email": email, "name": name, "picture": picture,
            "auth_provider": "google", "password_hash": None,
            "email_verified": True,   # Google verifies email
            "created_at": now_utc().isoformat(),
        }
        await db.users.insert_one(user_doc)
        created_at_iso = user_doc["created_at"]
    else:
        user_id = user["user_id"]
        await db.users.update_one({"user_id": user_id}, {"$set": {"name": name, "picture": picture}})
        created_at_iso = user["created_at"]

    emergent_token = data.get("session_token") or secrets.token_hex(32)
    expires_at = now_utc() + timedelta(days=SESSION_TTL_DAYS)
    await db.user_sessions.update_one(
        {"session_token": emergent_token},
        {"$set": {"user_id": user_id, "session_token": emergent_token, "source": "google",
                  "expires_at": expires_at.isoformat(), "created_at": now_utc().isoformat()}},
        upsert=True,
    )
    set_session_cookie(response, emergent_token)
    created_at = datetime.fromisoformat(created_at_iso) if isinstance(created_at_iso, str) else created_at_iso
    return UserOut(user_id=user_id, email=email, name=name, picture=picture, created_at=created_at, email_verified=True)


# ------------------------------------------------------------------
# Auth: Google ID token
# ------------------------------------------------------------------
@api.post("/auth/google/id-token", response_model=UserOut)
@limiter.limit("20/minute")
async def google_id_token_login(payload: GoogleIdTokenIn, response: Response, request: Request):
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=503, detail="Google sign-in is not configured on the server")
    try:
        info = google_id_token.verify_oauth2_token(
            payload.id_token, google_requests.Request(), GOOGLE_CLIENT_ID
        )
    except ValueError as e:
        raise HTTPException(status_code=401, detail=f"Invalid Google token: {e}")

    email = (info.get("email") or "").lower().strip()
    if not email:
        raise HTTPException(status_code=400, detail="Google token has no email")
    if info.get("email_verified") is False:
        raise HTTPException(status_code=401, detail="Google email is not verified")

    name = info.get("name") or email.split("@")[0]
    picture = info.get("picture")

    user = await db.users.find_one({"email": email})
    if not user:
        user_id = f"user_{uuid.uuid4().hex[:16]}"
        user_doc = {
            "user_id": user_id, "email": email, "name": name, "picture": picture,
            "auth_provider": "google", "password_hash": None,
            "email_verified": True,
            "created_at": now_utc().isoformat(),
        }
        await db.users.insert_one(user_doc)
        created_at_iso = user_doc["created_at"]
    else:
        user_id = user["user_id"]
        await db.users.update_one({"user_id": user_id}, {"$set": {"name": name, "picture": picture}})
        created_at_iso = user["created_at"]

    token = await create_session_for_user(user_id, "google")
    set_session_cookie(response, token)
    created_at = datetime.fromisoformat(created_at_iso) if isinstance(created_at_iso, str) else created_at_iso
    refreshed = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    onboarded = await is_onboarded(refreshed or {"user_id": user_id})
    return UserOut(user_id=user_id, email=email, name=name, picture=picture,
                   created_at=created_at, onboarded=onboarded, email_verified=True)


@api.get("/auth/me", response_model=UserOut)
async def me(user: dict = Depends(get_current_user)):
    created_at = user["created_at"]
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)
    onboarded = await is_onboarded(user)
    return UserOut(user_id=user["user_id"], email=user["email"], name=user["name"],
                   picture=user.get("picture"), created_at=created_at, onboarded=onboarded,
                   email_verified=user.get("email_verified", True))


@api.post("/auth/onboard", response_model=UserOut)
async def complete_onboarding(payload: OnboardIn, user: dict = Depends(get_current_user)):
    profile_update = {k: v for k, v in payload.model_dump(exclude={"seed_checklist"}).items() if v is not None}
    if profile_update:
        await db.wedding_profiles.update_one({"user_id": user["user_id"]}, {"$set": profile_update}, upsert=True)
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"onboarded": True}})
    if payload.seed_checklist:
        await seed_tasks_if_needed(user["user_id"])
    created_at = user["created_at"]
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)
    return UserOut(user_id=user["user_id"], email=user["email"], name=user["name"],
                   picture=user.get("picture"), created_at=created_at, onboarded=True,
                   email_verified=user.get("email_verified", True))


@api.post("/auth/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    clear_session_cookie(response)
    return {"ok": True}


@api.delete("/auth/account")
@limiter.limit("3/hour")
async def delete_account(payload: DeleteAccountIn, request: Request, response: Response,
                         user: dict = Depends(get_current_user)):
    """Permanently delete account. Requires typing email as confirmation."""
    if payload.confirm.strip().lower() != user["email"].lower():
        raise HTTPException(status_code=400, detail="Email confirmation does not match")
    uid = user["user_id"]
    # Atomic-ish deletion across all collections
    await asyncio.gather(
        db.categories.delete_many({"user_id": uid}),
        db.expenses.delete_many({"user_id": uid}),
        db.guests.delete_many({"user_id": uid}),
        db.vendors.delete_many({"user_id": uid}),
        db.tasks.delete_many({"user_id": uid}),
        db.wedding_profiles.delete_many({"user_id": uid}),
        db.user_sessions.delete_many({"user_id": uid}),
        db.email_verifications.delete_many({"email": user["email"]}),
    )
    await db.users.delete_one({"user_id": uid})
    clear_session_cookie(response)
    logger.warning("Account permanently deleted: user_id=%s email=%s", uid, user["email"])
    return {"ok": True}


# ------------------------------------------------------------------
# Wedding profile
# ------------------------------------------------------------------
DEFAULT_CATEGORIES = [
    {"name": "Venue", "icon": "MapPin", "color": "#C5A880", "planned_amount": 0},
    {"name": "Catering", "icon": "Utensils", "color": "#E2C2B3", "planned_amount": 0},
    {"name": "Attire", "icon": "Shirt", "color": "#D48A8A", "planned_amount": 0},
    {"name": "Photography", "icon": "Camera", "color": "#9CB4A6", "planned_amount": 0},
    {"name": "Flowers & Decor", "icon": "Flower", "color": "#E8CBA5", "planned_amount": 0},
    {"name": "Music & Entertainment", "icon": "Music", "color": "#B6C4B6", "planned_amount": 0},
    {"name": "Invitations", "icon": "Mail", "color": "#C5A880", "planned_amount": 0},
    {"name": "Rings", "icon": "Heart", "color": "#D48A8A", "planned_amount": 0},
]


@api.get("/profile")
async def get_profile(user: dict = Depends(get_current_user)):
    profile = await db.wedding_profiles.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not profile:
        profile = {"user_id": user["user_id"], "partner1_name": user["name"], "partner2_name": "",
                   "wedding_date": None, "venue_location": "", "currency": "USD",
                   "total_budget": 0.0, "created_at": now_utc().isoformat()}
        await db.wedding_profiles.insert_one(profile.copy())
        for c in DEFAULT_CATEGORIES:
            await db.categories.insert_one({"id": uuid.uuid4().hex, "user_id": user["user_id"],
                                             "name": c["name"], "icon": c["icon"], "color": c["color"],
                                             "planned_amount": c["planned_amount"], "created_at": now_utc().isoformat()})
    profile.pop("_id", None)
    return profile


@api.put("/profile")
async def update_profile(payload: WeddingProfileIn, user: dict = Depends(get_current_user)):
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    if update:
        await db.wedding_profiles.update_one({"user_id": user["user_id"]}, {"$set": update}, upsert=True)
    profile = await db.wedding_profiles.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return profile or {}


# ------------------------------------------------------------------
# Categories
# ------------------------------------------------------------------
@api.get("/categories", response_model=List[CategoryOut])
async def list_categories(user: dict = Depends(get_current_user)):
    cats = await db.categories.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(500)
    for c in cats:
        if isinstance(c.get("created_at"), str):
            c["created_at"] = datetime.fromisoformat(c["created_at"])
    return cats


@api.post("/categories", response_model=CategoryOut)
async def create_category(payload: CategoryIn, user: dict = Depends(get_current_user)):
    doc = {"id": uuid.uuid4().hex, "user_id": user["user_id"], **payload.model_dump(), "created_at": now_utc().isoformat()}
    await db.categories.insert_one(doc.copy())
    doc["created_at"] = datetime.fromisoformat(doc["created_at"])
    return doc


@api.put("/categories/{cat_id}", response_model=CategoryOut)
async def update_category(cat_id: str, payload: CategoryIn, user: dict = Depends(get_current_user)):
    res = await db.categories.update_one({"id": cat_id, "user_id": user["user_id"]}, {"$set": payload.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    doc = await db.categories.find_one({"id": cat_id}, {"_id": 0})
    if isinstance(doc.get("created_at"), str):
        doc["created_at"] = datetime.fromisoformat(doc["created_at"])
    return doc


@api.delete("/categories/{cat_id}")
async def delete_category(cat_id: str, user: dict = Depends(get_current_user)):
    res = await db.categories.delete_one({"id": cat_id, "user_id": user["user_id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    await db.expenses.update_many({"user_id": user["user_id"], "category_id": cat_id}, {"$set": {"category_id": None}})
    return {"ok": True}


# ------------------------------------------------------------------
# Expenses
# ------------------------------------------------------------------
@api.get("/expenses", response_model=List[ExpenseOut])
async def list_expenses(user: dict = Depends(get_current_user)):
    items = await db.expenses.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(2000)
    for x in items:
        if isinstance(x.get("created_at"), str):
            x["created_at"] = datetime.fromisoformat(x["created_at"])
    return items


@api.post("/expenses", response_model=ExpenseOut)
async def create_expense(payload: ExpenseIn, user: dict = Depends(get_current_user)):
    doc = {"id": uuid.uuid4().hex, "user_id": user["user_id"], **payload.model_dump(), "created_at": now_utc().isoformat()}
    await db.expenses.insert_one(doc.copy())
    doc["created_at"] = datetime.fromisoformat(doc["created_at"])
    return doc


@api.put("/expenses/{exp_id}", response_model=ExpenseOut)
async def update_expense(exp_id: str, payload: ExpenseIn, user: dict = Depends(get_current_user)):
    res = await db.expenses.update_one({"id": exp_id, "user_id": user["user_id"]}, {"$set": payload.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Expense not found")
    doc = await db.expenses.find_one({"id": exp_id}, {"_id": 0})
    if isinstance(doc.get("created_at"), str):
        doc["created_at"] = datetime.fromisoformat(doc["created_at"])
    return doc


@api.delete("/expenses/{exp_id}")
async def delete_expense(exp_id: str, user: dict = Depends(get_current_user)):
    res = await db.expenses.delete_one({"id": exp_id, "user_id": user["user_id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Expense not found")
    return {"ok": True}


# ------------------------------------------------------------------
# Guests
# ------------------------------------------------------------------
@api.get("/guests", response_model=List[GuestOut])
async def list_guests(user: dict = Depends(get_current_user)):
    items = await db.guests.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(5000)
    for x in items:
        if isinstance(x.get("created_at"), str):
            x["created_at"] = datetime.fromisoformat(x["created_at"])
    return items


@api.post("/guests", response_model=GuestOut)
async def create_guest(payload: GuestIn, user: dict = Depends(get_current_user)):
    doc = {"id": uuid.uuid4().hex, "user_id": user["user_id"], **payload.model_dump(), "created_at": now_utc().isoformat()}
    await db.guests.insert_one(doc.copy())
    doc["created_at"] = datetime.fromisoformat(doc["created_at"])
    return doc


@api.put("/guests/{guest_id}", response_model=GuestOut)
async def update_guest(guest_id: str, payload: GuestIn, user: dict = Depends(get_current_user)):
    res = await db.guests.update_one({"id": guest_id, "user_id": user["user_id"]}, {"$set": payload.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Guest not found")
    doc = await db.guests.find_one({"id": guest_id}, {"_id": 0})
    if isinstance(doc.get("created_at"), str):
        doc["created_at"] = datetime.fromisoformat(doc["created_at"])
    return doc


@api.delete("/guests/{guest_id}")
async def delete_guest(guest_id: str, user: dict = Depends(get_current_user)):
    res = await db.guests.delete_one({"id": guest_id, "user_id": user["user_id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Guest not found")
    return {"ok": True}


# ------------------------------------------------------------------
# Vendors
# ------------------------------------------------------------------
@api.get("/vendors", response_model=List[VendorOut])
async def list_vendors(user: dict = Depends(get_current_user)):
    items = await db.vendors.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(2000)
    for x in items:
        if isinstance(x.get("created_at"), str):
            x["created_at"] = datetime.fromisoformat(x["created_at"])
    return items


@api.post("/vendors", response_model=VendorOut)
async def create_vendor(payload: VendorIn, user: dict = Depends(get_current_user)):
    doc = {"id": uuid.uuid4().hex, "user_id": user["user_id"], **payload.model_dump(), "created_at": now_utc().isoformat()}
    await db.vendors.insert_one(doc.copy())
    doc["created_at"] = datetime.fromisoformat(doc["created_at"])
    return doc


@api.put("/vendors/{vendor_id}", response_model=VendorOut)
async def update_vendor(vendor_id: str, payload: VendorIn, user: dict = Depends(get_current_user)):
    res = await db.vendors.update_one({"id": vendor_id, "user_id": user["user_id"]}, {"$set": payload.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Vendor not found")
    doc = await db.vendors.find_one({"id": vendor_id}, {"_id": 0})
    if isinstance(doc.get("created_at"), str):
        doc["created_at"] = datetime.fromisoformat(doc["created_at"])
    return doc


@api.delete("/vendors/{vendor_id}")
async def delete_vendor(vendor_id: str, user: dict = Depends(get_current_user)):
    res = await db.vendors.delete_one({"id": vendor_id, "user_id": user["user_id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return {"ok": True}


# ------------------------------------------------------------------
# Tasks / Checklist
# ------------------------------------------------------------------
DEFAULT_TASKS = [
    ("12+ months out", "Set your overall budget", "Decide together what you're comfortable spending and align expectations."),
    ("12+ months out", "Choose a wedding date", "Or a short list of possible dates so you can shop venues."),
    ("12+ months out", "Book your venue", "Often the single biggest expense — lock it in first."),
    ("12+ months out", "Estimate your guest count", "A rough number drives the venue, catering and budget."),
    ("12+ months out", "Create an inspiration board", "Pinterest, Are.na, or screenshots in one place."),
    ("9–11 months out", "Book your photographer", "Top photographers book 9–12 months ahead."),
    ("9–11 months out", "Hire a wedding planner (optional)", "Or a day-of coordinator at minimum."),
    ("9–11 months out", "Send save-the-dates", "Especially for destination or holiday weddings."),
    ("9–11 months out", "Start dress / suit shopping", "Alterations take 2–3 months — give yourself buffer."),
    ("9–11 months out", "Plan your honeymoon", "Book flights early for shoulder season savings."),
    ("6–8 months out", "Book the caterer", "Or confirm what the venue includes."),
    ("6–8 months out", "Book music: DJ or band", "Then ceremony musicians."),
    ("6–8 months out", "Reserve a hotel room block", "Negotiate a guest rate for out-of-town friends."),
    ("6–8 months out", "Choose your officiant", "Friend? Religious? Civil? Confirm legal requirements."),
    ("6–8 months out", "Order invitations", "Allow 8–10 weeks for design + printing."),
    ("3–5 months out", "Send invitations", "Aim for guests to receive them 8 weeks before the date."),
    ("3–5 months out", "Book florist and finalize florals", "Schedule a mock-up if budget allows."),
    ("3–5 months out", "Book hair & makeup trial", "Bring inspiration photos."),
    ("3–5 months out", "Have menu tasting with caterer", "Final menu, dietary notes, kids' menu."),
    ("3–5 months out", "Buy wedding bands", "Plan for resizing time."),
    ("1–2 months out", "Follow up on RSVPs", "Send a friendly nudge to anyone missing."),
    ("1–2 months out", "Final dress / suit fitting", "Bring the actual shoes."),
    ("1–2 months out", "Write your vows", "Don't leave this for the night before."),
    ("1–2 months out", "Build the seating chart", "Once RSVPs are in."),
    ("1–2 months out", "Confirm every vendor", "Times, deliveries, payments outstanding."),
    ("1–2 months out", "Apply for a marriage license", "Check expiration rules in your state/country."),
    ("Week of", "Host the rehearsal dinner", "Or pre-wedding welcome get-together."),
    ("Week of", "Pick up wedding attire", "Try everything one last time."),
    ("Week of", "Pack an overnight bag", "Charger, comfy shoes, snacks, vows."),
    ("Week of", "Confirm the day-of timeline", "Share with the wedding party + vendors."),
    ("Week of", "Prepare vendor tip envelopes", "Pre-labeled, ready for your planner to distribute."),
    ("Day of", "Eat a real breakfast", "You'll need the energy."),
    ("Day of", "Take a quiet moment together", "Before the day takes over."),
    ("Day of", "Soak it in — you only get this one", ""),
]


async def seed_tasks_if_needed(user_id: str) -> None:
    existing = await db.tasks.find_one({"user_id": user_id})
    if existing:
        return
    now = now_utc().isoformat()
    docs = [{"id": uuid.uuid4().hex, "user_id": user_id, "title": title, "description": desc or None,
              "phase": phase, "completed": False, "order": i, "created_at": now}
             for i, (phase, title, desc) in enumerate(DEFAULT_TASKS)]
    if docs:
        await db.tasks.insert_many(docs)


@api.get("/tasks", response_model=List[TaskOut])
async def list_tasks(user: dict = Depends(get_current_user)):
    items = await db.tasks.find({"user_id": user["user_id"]}, {"_id": 0}).sort("order", 1).to_list(500)
    for x in items:
        if isinstance(x.get("created_at"), str):
            x["created_at"] = datetime.fromisoformat(x["created_at"])
    return items


@api.post("/tasks/seed-defaults", response_model=List[TaskOut])
async def seed_default_tasks(user: dict = Depends(get_current_user)):
    await seed_tasks_if_needed(user["user_id"])
    items = await db.tasks.find({"user_id": user["user_id"]}, {"_id": 0}).sort("order", 1).to_list(500)
    for x in items:
        if isinstance(x.get("created_at"), str):
            x["created_at"] = datetime.fromisoformat(x["created_at"])
    return items


@api.post("/tasks", response_model=TaskOut)
async def create_task(payload: TaskIn, user: dict = Depends(get_current_user)):
    doc = {"id": uuid.uuid4().hex, "user_id": user["user_id"], **payload.model_dump(), "created_at": now_utc().isoformat()}
    await db.tasks.insert_one(doc.copy())
    doc["created_at"] = datetime.fromisoformat(doc["created_at"])
    return doc


@api.put("/tasks/{task_id}", response_model=TaskOut)
async def update_task(task_id: str, payload: TaskIn, user: dict = Depends(get_current_user)):
    res = await db.tasks.update_one({"id": task_id, "user_id": user["user_id"]}, {"$set": payload.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    doc = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if isinstance(doc.get("created_at"), str):
        doc["created_at"] = datetime.fromisoformat(doc["created_at"])
    return doc


@api.delete("/tasks/{task_id}")
async def delete_task(task_id: str, user: dict = Depends(get_current_user)):
    res = await db.tasks.delete_one({"id": task_id, "user_id": user["user_id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"ok": True}


# ------------------------------------------------------------------
# Help Me Plan (Vendor Search)
# ------------------------------------------------------------------
HELP_CATEGORIES = [
    {"key": "venue",        "label": "Venue",            "query": "wedding venue",                   "icon": "MapPin"},
    {"key": "catering",     "label": "Catering",         "query": "wedding catering",                "icon": "Utensils"},
    {"key": "photography",  "label": "Photography",      "query": "wedding photographer",            "icon": "Camera"},
    {"key": "flowers",      "label": "Flowers & Decor",  "query": "wedding florist",                 "icon": "Flower2"},
    {"key": "music",        "label": "Music & DJ",       "query": "wedding band DJ",                 "icon": "Music"},
    {"key": "attire",       "label": "Attire",           "query": "bridal shop suit tailor",         "icon": "Shirt"},
    {"key": "invitations",  "label": "Invitations",      "query": "wedding invitation designer stationery", "icon": "Mail"},
    {"key": "cake",         "label": "Cake & Desserts",  "query": "wedding cake bakery",             "icon": "CakeSlice"},
    {"key": "hair_makeup",  "label": "Hair & Makeup",    "query": "bridal hair makeup artist",       "icon": "Sparkles"},
    {"key": "transport",    "label": "Transportation",   "query": "wedding limo car service",        "icon": "Car"},
]
ALLOWED_CATEGORY_KEYS = {c["key"] for c in HELP_CATEGORIES}


class HelpSearchIn(BaseModel):
    category: str = Field(min_length=1, max_length=64)
    location: str = Field(min_length=1, max_length=200)


class SponsoredListingIn(BaseModel):
    category: str
    name: str = Field(min_length=1, max_length=200)
    tagline: Optional[str] = Field(None, max_length=300)
    description: Optional[str] = Field(None, max_length=1000)
    website: Optional[str] = Field(None, max_length=500)
    phone: Optional[str] = Field(None, max_length=30)
    email: Optional[EmailStr] = None
    image_url: Optional[str] = Field(None, max_length=500)
    location_keywords: List[str] = Field(default_factory=list)
    priority: int = 0
    active: bool = True


class SponsoredListingOut(SponsoredListingIn):
    id: str
    created_at: datetime


def _match_location(keywords: List[str], location: str) -> bool:
    if not keywords:
        return True
    loc = (location or "").lower()
    return any(kw and kw.lower() in loc for kw in keywords)


def _sponsored_to_result(s: dict) -> dict:
    return {
        "name": s["name"], "rating": None, "reviews": None,
        "address": (s.get("location_keywords") or [None])[0],
        "phone": s.get("phone"), "website": s.get("website"),
        "description": s.get("tagline") or s.get("description"),
        "image_url": s.get("image_url"), "sponsored": True, "source": "sponsored",
    }


async def _fetch_google_places(query: str, location: str) -> list:
    if not GOOGLE_PLACES_API_KEY:
        return []
    body = {"textQuery": f"{query} near {location}", "maxResultCount": 8}
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
        "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.websiteUri,places.nationalPhoneNumber",
    }
    async with httpx.AsyncClient(timeout=15.0) as http:
        try:
            r = await http.post("https://places.googleapis.com/v1/places:searchText", json=body, headers=headers)
        except httpx.HTTPError as e:
            logger.warning("Places API error: %s", e)
            return []
    if r.status_code != 200:
        logger.warning("Places API returned %s", r.status_code)
        return []
    places = r.json().get("places", []) or []
    return [{
        "name": (p.get("displayName") or {}).get("text") or "Unnamed",
        "rating": p.get("rating"), "reviews": p.get("userRatingCount"),
        "address": p.get("formattedAddress"), "phone": p.get("nationalPhoneNumber"),
        "website": p.get("websiteUri"), "description": None, "image_url": None,
        "sponsored": False, "source": "google_places",
    } for p in places]


def _demo_results(category: str, location: str) -> list:
    label = next((c["label"] for c in HELP_CATEGORIES if c["key"] == category), category.title())
    samples = {
        "venue": ["The Stonehouse Estate", "Vintage Mill Barn", "Willow Glen Manor"],
        "catering": ["Vineyard Table Catering", "Bloom & Vine Co.", "Olive Branch Kitchens"],
        "photography": ["Luminous Light Photo", "Storied Frames", "Golden Hour Studio"],
        "flowers": ["Petal & Stem Studio", "Botanic Bloom Co.", "The Daisy Atelier"],
        "music": ["Lumen Strings Trio", "DJ Atlas", "The Velvet Lounge Band"],
        "attire": ["Aria Bridal", "Indochino Tailors", "The Veil Boutique"],
        "invitations": ["Paper & Wax", "Letterpress Lane", "Inkwell Studio"],
        "cake": ["Sweet Petal Bakery", "Honey & Flour", "The Tiered Co."],
        "hair_makeup": ["Halo Bridal Beauty", "Glow Studio", "The Mirror Room"],
        "transport": ["Silver Lane Limos", "Vintage Wheels Co.", "Coast Car Service"],
    }
    names = samples.get(category, [f"{label} Studio", f"{label} Co.", f"{label} House"])
    return [{"name": n, "rating": round(4.4 + (i * 0.12) % 0.6, 1), "reviews": 60 + (i * 47) % 240,
             "address": f"Near {location}", "phone": None, "website": None,
             "description": f"Sample result — add Google Places API key for live data.",
             "image_url": None, "sponsored": False, "source": "demo"} for i, n in enumerate(names)]


@api.get("/help/categories")
async def help_categories(user: dict = Depends(get_current_user)):
    return HELP_CATEGORIES


@api.post("/help/search")
@limiter.limit("30/minute")
async def help_search(payload: HelpSearchIn, user: dict = Depends(get_current_user), request: Request = None):
    if payload.category not in ALLOWED_CATEGORY_KEYS:
        raise HTTPException(status_code=400, detail="Unknown category")
    location = payload.location.strip()
    sponsored_docs = await db.sponsored_listings.find({"category": payload.category, "active": True}, {"_id": 0}).to_list(50)
    sponsored = [_sponsored_to_result(s) for s in sponsored_docs if _match_location(s.get("location_keywords", []), location)]
    sponsored = sorted(sponsored, key=lambda x: x.get("priority", 0), reverse=True)[:3]
    category_meta = next(c for c in HELP_CATEGORIES if c["key"] == payload.category)
    if GOOGLE_PLACES_API_KEY:
        organic = await _fetch_google_places(category_meta["query"], location)
        live = True
    else:
        organic = _demo_results(payload.category, location)
        live = False
    return {"category": payload.category, "location": location, "live": live, "sponsored": sponsored, "organic": organic}


def _check_admin(request: Request):
    if not ADMIN_API_KEY:
        raise HTTPException(status_code=503, detail="Admin API not configured")
    if not secrets.compare_digest(request.headers.get("X-Admin-Key", ""), ADMIN_API_KEY):
        raise HTTPException(status_code=403, detail="Admin key invalid")


@api.post("/admin/sponsored", response_model=SponsoredListingOut)
async def admin_create_sponsored(payload: SponsoredListingIn, request: Request):
    _check_admin(request)
    if payload.category not in ALLOWED_CATEGORY_KEYS:
        raise HTTPException(status_code=400, detail="Unknown category")
    doc = {"id": uuid.uuid4().hex, **payload.model_dump(), "created_at": now_utc().isoformat()}
    await db.sponsored_listings.insert_one(doc.copy())
    doc["created_at"] = datetime.fromisoformat(doc["created_at"])
    return doc


@api.get("/admin/sponsored", response_model=List[SponsoredListingOut])
async def admin_list_sponsored(request: Request):
    _check_admin(request)
    items = await db.sponsored_listings.find({}, {"_id": 0}).to_list(500)
    for x in items:
        if isinstance(x.get("created_at"), str):
            x["created_at"] = datetime.fromisoformat(x["created_at"])
    return items


@api.delete("/admin/sponsored/{listing_id}")
async def admin_delete_sponsored(listing_id: str, request: Request):
    _check_admin(request)
    res = await db.sponsored_listings.delete_one({"id": listing_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"ok": True}


# ------------------------------------------------------------------
# Stats
# ------------------------------------------------------------------
@api.get("/stats")
async def get_stats(user: dict = Depends(get_current_user)):
    profile = await db.wedding_profiles.find_one({"user_id": user["user_id"]}, {"_id": 0}) or {}
    categories = await db.categories.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(500)
    expenses = await db.expenses.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(5000)
    guests = await db.guests.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(5000)

    by_category = {c["id"]: {"id": c["id"], "name": c["name"], "color": c.get("color"),
                               "planned": float(c.get("planned_amount") or 0), "spent": 0.0, "pending": 0.0}
                   for c in categories}
    by_category["__uncat__"] = {"id": "__uncat__", "name": "Uncategorized", "color": "#B8B5AE",
                                  "planned": 0.0, "spent": 0.0, "pending": 0.0}

    total_spent = total_pending = 0.0
    for e in expenses:
        cid = e.get("category_id") or "__uncat__"
        if cid not in by_category:
            cid = "__uncat__"
        amt = float(e.get("amount") or 0)
        if e.get("status") == "paid":
            by_category[cid]["spent"] += amt
            total_spent += amt
        else:
            by_category[cid]["pending"] += amt
            total_pending += amt

    total_planned = sum(float(c.get("planned_amount") or 0) for c in categories)
    total_budget = float(profile.get("total_budget") or 0)
    rsvp_counts = {"pending": 0, "attending": 0, "declined": 0, "maybe": 0}
    plus_ones = 0
    for g in guests:
        rsvp_counts[g.get("rsvp", "pending")] = rsvp_counts.get(g.get("rsvp", "pending"), 0) + 1
        if g.get("plus_one"):
            plus_ones += 1

    return {"currency": profile.get("currency", "USD"), "total_budget": total_budget,
            "total_planned": total_planned, "total_spent": total_spent, "total_pending": total_pending,
            "remaining": total_budget - total_spent - total_pending, "expense_count": len(expenses),
            "category_count": len(categories), "by_category": list(by_category.values()),
            "guests": {"total": len(guests), "rsvp": rsvp_counts, "plus_ones": plus_ones,
                       "estimated_attending": rsvp_counts["attending"] + plus_ones}}


# ------------------------------------------------------------------
# App setup
# ------------------------------------------------------------------
app.include_router(api)

# CORS — locked to your frontend URL only
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL] + (["http://localhost:3000"] if not IS_PROD else []),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Admin-Key"],
)


@app.on_event("startup")
async def startup():
    # Indexes for performance + uniqueness enforcement
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.user_sessions.create_index("session_token", unique=True)
    await db.user_sessions.create_index("user_id")
    await db.user_sessions.create_index("expires_at", expireAfterSeconds=0)  # TTL index auto-deletes expired sessions
    await db.categories.create_index("user_id")
    await db.expenses.create_index("user_id")
    await db.guests.create_index("user_id")
    await db.vendors.create_index("user_id")
    await db.tasks.create_index("user_id")
    await db.sponsored_listings.create_index("category")
    await db.email_verifications.create_index("email")
    await db.email_verifications.create_index("expires_at", expireAfterSeconds=0)  # auto-cleanup expired codes
    logger.info("Lumière API ready | env=%s | email_verification=%s", ENVIRONMENT, EMAIL_VERIFICATION_ENABLED)


@app.on_event("shutdown")
async def shutdown():
    client.close()
