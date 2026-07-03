import asyncio
"""
Vendor search route with sponsored listings support.
Uses Google Places API for real local results.
"""

from fastapi import APIRouter, HTTPException, Query, Depends, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, validator
from typing import Optional, List
import httpx
import os
import logging
from slowapi import Limiter
from slowapi.util import get_remote_address

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/vendors", tags=["vendors"])
limiter = Limiter(key_func=get_remote_address)

# ── Category → Google Places keyword map ──────────────────────────────────────
CATEGORY_MAP = {
    "catering":     "wedding catering service",
    "photographer": "wedding photographer",
    "venue":        "wedding venue",
    "florist":      "wedding florist flowers",
    "music":        "wedding band DJ music",
    "attire":       "bridal shop wedding dress",
    "invitations":  "wedding stationery invitations",
    "cake":         "wedding cake bakery",
    "transport":    "wedding car limousine hire",
    "hair_makeup":  "wedding hair makeup artist",
    "officiant":    "wedding officiant celebrant",
    "planner":      "wedding planner coordinator",
}

VALID_CATEGORIES = list(CATEGORY_MAP.keys())


# ── Pydantic models ────────────────────────────────────────────────────────────
class SponsoredVendor(BaseModel):
    """Stored in DB — vendor pays to appear here."""
    id: str
    name: str
    category: str
    location: str                  # city or region they serve
    description: str
    website: str
    phone: Optional[str] = None
    logo_url: Optional[str] = None
    badge: str = "Sponsored"       # always shown so users know
    cta: str = "Get a Free Quote"


class VendorResult(BaseModel):
    place_id: str
    name: str
    rating: Optional[float] = None
    user_ratings_total: Optional[int] = None
    vicinity: str
    phone: Optional[str] = None
    website: Optional[str] = None
    maps_url: str
    is_sponsored: bool = False
    photo_url: Optional[str] = None
    price_level: Optional[int] = None   # 0-4 from Google


class VendorSearchResponse(BaseModel):
    sponsored: List[SponsoredVendor]
    results: List[VendorResult]
    category: str
    location_used: str
    total_organic: int


# ── Helpers ────────────────────────────────────────────────────────────────────
def _google_photo_url(photo_ref: str, api_key: str, max_width: int = 400) -> str:
    return (
        f"https://maps.googleapis.com/maps/api/place/photo"
        f"?maxwidth={max_width}&photo_reference={photo_ref}&key={api_key}"
    )


async def _fetch_organic_results(
    keyword: str, location: str, api_key: str, radius_meters: int = 50000
) -> List[VendorResult]:
    """
    Call Google Places Text Search, return up to 10 results.
    Keeps API key server-side only — never exposed to frontend.
    """
    url = "https://maps.googleapis.com/maps/api/place/textsearch/json"
    params = {
        "query": f"{keyword} near {location}",
        "key": api_key,
        "radius": radius_meters,
        "type": "establishment",
    }

    async with httpx.AsyncClient(timeout=8.0) as client:
        resp = await client.get(url, params=params)
        resp.raise_for_status()
        data = resp.json()

    if data.get("status") not in ("OK", "ZERO_RESULTS"):
        logger.warning("Google Places error: %s", data.get("status"))
        return []

    results = []
    for place in data.get("results", [])[:10]:
        photo_ref = (place.get("photos") or [{}])[0].get("photo_reference")
        photo_url = _google_photo_url(photo_ref, api_key) if photo_ref else None

        place_id = place["place_id"]
        maps_url = f"https://www.google.com/maps/place/?q=place_id:{place_id}"

        results.append(VendorResult(
            place_id=place_id,
            name=place["name"],
            rating=place.get("rating"),
            user_ratings_total=place.get("user_ratings_total"),
            vicinity=place.get("formatted_address", place.get("vicinity", "")),
            maps_url=maps_url,
            photo_url=photo_url,
            price_level=place.get("price_level"),
            is_sponsored=False,
        ))

    return results


async def _get_sponsored(category: str, location: str) -> List[SponsoredVendor]:
    """
    Fetch paid sponsored vendors from your DB for this category + location.
    Replace the mock list below with a real DB call (SQLAlchemy / Supabase etc).

    Monetization flow:
      - Vendor signs up at /advertise
      - Pays monthly fee → stored with is_active=True in sponsored_vendors table
      - This function queries: SELECT * FROM sponsored_vendors
          WHERE category=? AND is_active=True
          AND (location ILIKE '%city%' OR location='nationwide')
        LIMIT 2
    """
    # ── MOCK DATA — replace with DB query ────────────────────────────────────
    mock_db = [
        SponsoredVendor(
            id="sp_001",
            name="Bliss Catering Co.",
            category="catering",
            location="nationwide",
            description="Award-winning wedding catering with farm-to-table menus. "
                        "Serving couples across the country for over 15 years.",
            website="https://example-catering.com",
            phone="(800) 555-0101",
            logo_url=None,
        ),
    ]
    return [v for v in mock_db if v.category == category][:2]


# ── Route ──────────────────────────────────────────────────────────────────────
@router.get("/search", response_model=VendorSearchResponse)
@limiter.limit("30/minute")
async def search_vendors(
    request: Request,
    category: str = Query(..., description="Vendor category key"),
    location: str = Query(..., min_length=2, max_length=120),
):
    """
    Search for wedding vendors near a location.
    Returns sponsored (paid) results first, then organic Google Places results.

    Security:
    - Rate limited (30 req/min per IP)
    - API key never leaves server
    - Category validated against whitelist
    - Location sanitised by Pydantic min/max length
    """
    # Whitelist category
    category = category.lower().strip()
    if category not in CATEGORY_MAP:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid category. Choose from: {', '.join(VALID_CATEGORIES)}"
        )

    api_key = os.getenv("GOOGLE_PLACES_API_KEY", "")
    if not api_key:
        # Graceful degradation — return sponsored only if key not set
        logger.error("GOOGLE_PLACES_API_KEY not set")
        sponsored = await _get_sponsored(category, location)
        return VendorSearchResponse(
            sponsored=sponsored,
            results=[],
            category=category,
            location_used=location,
            total_organic=0,
        )

    keyword = CATEGORY_MAP[category]

    try:
        sponsored, organic = await asyncio.gather(
            _get_sponsored(category, location),
            _fetch_organic_results(keyword, location, api_key),
        )
    except httpx.HTTPStatusError as exc:
        logger.error("Places API HTTP error: %s", exc)
        raise HTTPException(status_code=502, detail="Vendor search temporarily unavailable.")
    except Exception as exc:
        logger.error("Vendor search error: %s", exc)
        raise HTTPException(status_code=500, detail="Internal error during vendor search.")

    return VendorSearchResponse(
        sponsored=sponsored,
        results=organic,
        category=category,
        location_used=location,
        total_organic=len(organic),
    )


@router.get("/categories")
async def list_categories():
    """Return all supported vendor categories — used to populate the UI grid."""
    return {
        "categories": [
            {"key": k, "label": k.replace("_", " ").title()}
            for k in VALID_CATEGORIES
        ]
    }


# ── Advertise / Sponsor enquiry endpoint ──────────────────────────────────────
class SponsorInquiry(BaseModel):
    business_name: str = Field(..., min_length=2, max_length=120)
    contact_email: str = Field(..., pattern=r"^[\w.+-]+@[\w-]+\.[a-z]{2,}$")
    category: str
    service_area: str = Field(..., min_length=2, max_length=120)
    message: Optional[str] = Field(None, max_length=1000)

    @validator("category")
    def validate_category(cls, v):
        if v not in VALID_CATEGORIES:
            raise ValueError("Invalid category")
        return v


@router.post("/advertise")
@limiter.limit("5/hour")
async def sponsor_inquiry(request: Request, body: SponsorInquiry):
    """
    Vendor submits interest in a sponsored listing.
    In production: save to DB + send notification email to you.
    """
    # TODO: insert into sponsor_inquiries table + send email via SendGrid/Resend
    logger.info(
        "Sponsor inquiry from %s (%s) for category=%s",
        body.business_name, body.contact_email, body.category
    )
    return {"message": "Thank you! We'll be in touch within 24 hours."}
