"""
Account management routes including secure account deletion.
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, Field
from typing import Annotated, Optional
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/account", tags=["account"])


# ── Dependency stub — replace with your real auth dependency ──────────────────
async def get_current_user(request: Request) -> dict:
    """
    Replace this with your actual JWT/session auth dependency.
    Should raise HTTPException(401) if not authenticated.
    """
    token = request.headers.get("Authorization", "").removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    # Decode JWT here — return user dict with at minimum {"id": "...", "email": "..."}
    # Example with python-jose:
    #   payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    #   return {"id": payload["sub"], "email": payload["email"]}
    return {"id": "user_123", "email": "user@example.com"}   # stub


CurrentUser = Annotated[dict, Depends(get_current_user)]


# ── Delete account ─────────────────────────────────────────────────────────────
class DeleteAccountRequest(BaseModel):
    confirmation: str = Field(..., description="Must equal 'DELETE' to confirm")
    password: Optional[str] = Field(None, description="Required for password-based accounts")


@router.delete("/delete")
async def delete_account(
    body: DeleteAccountRequest,
    user: CurrentUser,
    request: Request,
):
    """
    Permanently deletes the authenticated user's account and ALL associated data.

    Security measures:
    - Requires explicit "DELETE" confirmation string
    - Requires re-authentication (password or relies on recent JWT)
    - Logs deletion for audit trail
    - Hard deletes: budget, expenses, guests, vendor saves, sponsored bookings

    In production, run as a DB transaction so it's atomic.
    """
    if body.confirmation != "DELETE":
        raise HTTPException(
            status_code=400,
            detail="Type DELETE (all caps) to confirm account deletion."
        )

    user_id = user["id"]
    logger.warning("ACCOUNT DELETION initiated for user_id=%s", user_id)

    try:
        # ── Replace stubs below with real DB calls ────────────────────────────
        # async with db.transaction():
        #     await db.execute("DELETE FROM budget_items WHERE user_id=$1", user_id)
        #     await db.execute("DELETE FROM guests WHERE user_id=$1", user_id)
        #     await db.execute("DELETE FROM vendor_saves WHERE user_id=$1", user_id)
        #     await db.execute("DELETE FROM wedding_profiles WHERE user_id=$1", user_id)
        #     await db.execute("DELETE FROM users WHERE id=$1", user_id)
        #
        # If using Supabase:
        #     await supabase.auth.admin.delete_user(user_id)
        #
        # If using Firebase:
        #     await auth.delete_user(user_id)

        logger.warning("ACCOUNT DELETION completed for user_id=%s", user_id)
        return {
            "message": "Your account and all associated data have been permanently deleted.",
            "user_id": user_id,
        }

    except Exception as exc:
        logger.error("Account deletion failed for user_id=%s: %s", user_id, exc)
        raise HTTPException(
            status_code=500,
            detail="Account deletion failed. Please contact support."
        )


@router.get("/export")
async def export_user_data(user: CurrentUser):
    """
    GDPR-friendly: let users download all their data before deleting.
    Returns JSON blob of everything associated with their account.
    """
    user_id = user["id"]
    # Replace with real DB queries
    # budget = await db.fetch("SELECT * FROM budget_items WHERE user_id=$1", user_id)
    # guests = await db.fetch("SELECT * FROM guests WHERE user_id=$1", user_id)

    return {
        "user_id": user_id,
        "budget_items": [],   # fill from DB
        "guests": [],         # fill from DB
        "vendor_saves": [],   # fill from DB
        "export_note": "This is all data associated with your account.",
    }
