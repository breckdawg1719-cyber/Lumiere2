"""
Vendor search using Yelp Fusion API (free 500 calls/day).
Returns real photos, ratings, reviews, distance, phone, website.
Falls back to curated demo data if no Yelp key set.
"""

import httpx
import os
import logging

logger = logging.getLogger("wedding")
YELP_API_KEY = os.environ.get("YELP_API_KEY", "").strip()


# ── Curated fallback photos per category (Unsplash, free to use) ─────────────
CATEGORY_PHOTOS = {
    "catering": [
        "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300&fit=crop&q=80",
        "https://images.unsplash.com/photo-1555244162-803834f70033?w=400&h=300&fit=crop&q=80",
    ],
    "photographer": [
        "https://images.unsplash.com/photo-1537633552985-df8429e8048b?w=400&h=300&fit=crop&q=80",
        "https://images.unsplash.com/photo-1519741497674-611481863552?w=400&h=300&fit=crop&q=80",
    ],
    "venue": [
        "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=400&h=300&fit=crop&q=80",
        "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=400&h=300&fit=crop&q=80",
    ],
    "florist": [
        "https://images.unsplash.com/photo-1487530811015-780f6d7fc72f?w=400&h=300&fit=crop&q=80",
        "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&q=80",
    ],
    "music": [
        "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=300&fit=crop&q=80",
        "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=300&fit=crop&q=80",
    ],
    "attire": [
        "https://images.unsplash.com/photo-1519741497674-611481863552?w=400&h=300&fit=crop&q=80",
        "https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?w=400&h=300&fit=crop&q=80",
    ],
    "cake": [
        "https://images.unsplash.com/photo-1535141192574-5d4897c12636?w=400&h=300&fit=crop&q=80",
        "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&h=300&fit=crop&q=80",
    ],
    "transport": [
        "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=300&fit=crop&q=80",
        "https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?w=400&h=300&fit=crop&q=80",
    ],
    "hair_makeup": [
        "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&h=300&fit=crop&q=80",
        "https://images.unsplash.com/photo-1560869713-7d0a29430803?w=400&h=300&fit=crop&q=80",
    ],
    "officiant": [
        "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=400&h=300&fit=crop&q=80",
        "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=400&h=300&fit=crop&q=80",
    ],
    "invitations": [
        "https://images.unsplash.com/photo-1578574577315-3fbeb0cecdc2?w=400&h=300&fit=crop&q=80",
        "https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=400&h=300&fit=crop&q=80",
    ],
}

import random

def get_fallback_photo(category: str, index: int = 0) -> str:
    photos = CATEGORY_PHOTOS.get(category, [])
    if not photos:
        return None
    return photos[index % len(photos)]

# ── Category config ───────────────────────────────────────────────────────────
CATEGORY_CONFIG = {
    "catering": {
        "term": "wedding catering",
        "yelp_categories": "caterers",
    },
    "photographer": {
        "term": "wedding photographer",
        "yelp_categories": "photographers",
    },
    "venue": {
        "term": "wedding venue reception hall",
        "yelp_categories": "venues,eventspace,weddings",
    },
    "florist": {
        "term": "wedding florist flowers",
        "yelp_categories": "florists",
    },
    "music": {
        "term": "wedding DJ band music",
        "yelp_categories": "djservices,musicians,entertainment",
    },
    "attire": {
        "term": "bridal shop wedding dress",
        "yelp_categories": "bridal",
    },
    "cake": {
        "term": "wedding cake custom specialty cakes",
        "yelp_categories": "cakes,custom_cakes",
    },
    "transport": {
        "term": "wedding limousine luxury car service",
        "yelp_categories": "limos",
    },
    "hair_makeup": {
        "term": "bridal hair makeup beauty",
        "yelp_categories": "hair,makeupartists,beautysvc",
    },
    "officiant": {
        "term": "wedding officiant ceremony",
        "yelp_categories": "ceremonialservices",
    },
    "invitations": {
        "term": "wedding invitations stationery custom printing",
        "yelp_categories": "printingservices,stationery",
    },
}

# ── Online invitation services ────────────────────────────────────────────────
ONLINE_INVITATION_SERVICES = [
    {
        "name": "Zola",
        "description": "Beautifully designed wedding invitations with free digital options and premium print sets. RSVP tracking included.",
        "website": "https://www.zola.com/wedding-planning/invitations",
        "image_url": None,
        "rating": 4.9,
        "reviews": 15000,
        "phone": None,
        "address": "Online — Ships Nationwide",
        "distance": None,
        "price_level": "$$",
        "categories": ["Print & Digital", "Free Designs", "RSVP Tracking"],
        "is_closed": False,
        "sponsored": False,
        "source": "curated",
        "online": True,
    },
    {
        "name": "Minted",
        "description": "Award-winning independent artists create unique wedding stationery suites. Premium printing with matching day-of paper goods.",
        "website": "https://www.minted.com/wedding-invitations",
        "image_url": None,
        "rating": 4.8,
        "reviews": 8900,
        "phone": None,
        "address": "Online — Ships Nationwide",
        "distance": None,
        "price_level": "$$$",
        "categories": ["Artist Designs", "Full Suites", "Premium Print"],
        "is_closed": False,
        "sponsored": False,
        "source": "curated",
        "online": True,
    },
    {
        "name": "Papier",
        "description": "Elegant, design-led wedding invitations and stationery. Personalizable templates with luxury print quality shipped fast.",
        "website": "https://www.papier.com/us/wedding-stationery",
        "image_url": None,
        "rating": 4.8,
        "reviews": 5200,
        "phone": None,
        "address": "Online — Ships Nationwide",
        "distance": None,
        "price_level": "$$$",
        "categories": ["Luxury Print", "Designer Templates", "Fast Shipping"],
        "is_closed": False,
        "sponsored": False,
        "source": "curated",
        "online": True,
    },
    {
        "name": "Greenvelope",
        "description": "Premium digital wedding invitations with real-time RSVP tracking and guest management. Eco-friendly and budget-friendly.",
        "website": "https://www.greenvelope.com",
        "image_url": None,
        "rating": 4.7,
        "reviews": 4100,
        "phone": None,
        "address": "Online — Digital Only",
        "distance": None,
        "price_level": "$",
        "categories": ["Digital Only", "RSVP Tracking", "Eco-Friendly"],
        "is_closed": False,
        "sponsored": False,
        "source": "curated",
        "online": True,
    },
    {
        "name": "Artifact Uprising",
        "description": "Heirloom-quality print invitations made with sustainably sourced materials. Known for exceptional craftsmanship and texture.",
        "website": "https://www.artifactuprising.com/collections/wedding-invitations",
        "image_url": None,
        "rating": 4.9,
        "reviews": 3200,
        "phone": None,
        "address": "Online — Ships Nationwide",
        "distance": None,
        "price_level": "$$$$",
        "categories": ["Heirloom Quality", "Sustainable", "Premium Materials"],
        "is_closed": False,
        "sponsored": False,
        "source": "curated",
        "online": True,
    },
    {
        "name": "Canva",
        "description": "Free wedding invitation designer with hundreds of templates. Print at home, download instantly, or order professional prints.",
        "website": "https://www.canva.com/wedding-invitations",
        "image_url": None,
        "rating": 4.7,
        "reviews": 25000,
        "phone": None,
        "address": "Online — Free Option Available",
        "distance": None,
        "price_level": "$",
        "categories": ["Free Option", "DIY Design", "Instant Download"],
        "is_closed": False,
        "sponsored": False,
        "source": "curated",
        "online": True,
    },
    {
        "name": "Basic Invite",
        "description": "Nearly 1,000 customizable wedding invitation designs. Free samples, unlimited color options, and envelopes included.",
        "website": "https://www.basicinvite.com/wedding-invitations.html",
        "image_url": None,
        "rating": 4.8,
        "reviews": 6700,
        "phone": None,
        "address": "Online — Ships Nationwide",
        "distance": None,
        "price_level": "$$",
        "categories": ["Free Samples", "Envelopes Included", "1000+ Designs"],
        "is_closed": False,
        "sponsored": False,
        "source": "curated",
        "online": True,
    },
    {
        "name": "Paperless Post",
        "description": "Beautiful digital and print invitations. Send online invitations instantly or order print versions mailed to guests.",
        "website": "https://www.paperlesspost.com/wedding-invitations",
        "image_url": None,
        "rating": 4.6,
        "reviews": 9800,
        "phone": None,
        "address": "Online — Digital & Print",
        "distance": None,
        "price_level": "$$",
        "categories": ["Digital & Print", "Guest Mailing", "RSVP Tracking"],
        "is_closed": False,
        "sponsored": False,
        "source": "curated",
        "online": True,
    },
]

# ── Demo fallback data ────────────────────────────────────────────────────────
DEMO_VENDORS = {
    "catering": [
        {"name": "Harvest Table Catering Co.", "rating": 4.8, "reviews": 124, "price_level": "$$$"},
        {"name": "Golden Fork Events", "rating": 4.7, "reviews": 89, "price_level": "$$"},
        {"name": "The Dining Room Co.", "rating": 4.9, "reviews": 203, "price_level": "$$$"},
        {"name": "Bloom & Vine Catering", "rating": 4.6, "reviews": 67, "price_level": "$$"},
        {"name": "Olive Branch Kitchens", "rating": 4.8, "reviews": 156, "price_level": "$$$"},
    ],
    "photographer": [
        {"name": "Luminous Light Photography", "rating": 4.9, "reviews": 312, "price_level": "$$$"},
        {"name": "Golden Hour Studio", "rating": 4.8, "reviews": 178, "price_level": "$$$"},
        {"name": "Storied Frames Photography", "rating": 4.9, "reviews": 95, "price_level": "$$$$"},
        {"name": "Soft Light Portraits", "rating": 4.7, "reviews": 144, "price_level": "$$"},
        {"name": "The Memory Collective", "rating": 4.8, "reviews": 89, "price_level": "$$$"},
    ],
    "venue": [
        {"name": "The Stonehouse Estate", "rating": 4.9, "reviews": 445, "price_level": "$$$$"},
        {"name": "Willow Glen Manor", "rating": 4.7, "reviews": 231, "price_level": "$$$"},
        {"name": "Vintage Mill Barn", "rating": 4.8, "reviews": 167, "price_level": "$$$"},
        {"name": "The Garden at Rosecliff", "rating": 4.9, "reviews": 312, "price_level": "$$$$"},
        {"name": "Linden Hall Estate", "rating": 4.6, "reviews": 189, "price_level": "$$$"},
    ],
    "florist": [
        {"name": "Petal & Stem Studio", "rating": 4.9, "reviews": 156, "price_level": "$$$"},
        {"name": "Botanic Bloom Co.", "rating": 4.7, "reviews": 89, "price_level": "$$"},
        {"name": "The Daisy Atelier", "rating": 4.8, "reviews": 134, "price_level": "$$$"},
        {"name": "Wildflower & Co.", "rating": 4.6, "reviews": 78, "price_level": "$$"},
        {"name": "Rose & Thistle Florals", "rating": 4.9, "reviews": 201, "price_level": "$$$"},
    ],
    "music": [
        {"name": "Lumen Strings Trio", "rating": 4.9, "reviews": 78, "price_level": "$$$"},
        {"name": "The Velvet Lounge Band", "rating": 4.8, "reviews": 134, "price_level": "$$$$"},
        {"name": "DJ Atlas Entertainment", "rating": 4.9, "reviews": 267, "price_level": "$$"},
        {"name": "Ceremony & Sound Co.", "rating": 4.7, "reviews": 89, "price_level": "$$$"},
        {"name": "The Wedding Playlist", "rating": 4.8, "reviews": 156, "price_level": "$$"},
    ],
    "attire": [
        {"name": "Aria Bridal Boutique", "rating": 4.8, "reviews": 267, "price_level": "$$$"},
        {"name": "The Veil Collection", "rating": 4.7, "reviews": 189, "price_level": "$$"},
        {"name": "White Dress Bridal", "rating": 4.9, "reviews": 312, "price_level": "$$$"},
        {"name": "Beloved Bridal Studio", "rating": 4.6, "reviews": 145, "price_level": "$$"},
        {"name": "The Fitting Room", "rating": 4.8, "reviews": 98, "price_level": "$$$"},
    ],
    "cake": [
        {"name": "Sweet Petal Bakery", "rating": 4.9, "reviews": 312, "price_level": "$$$"},
        {"name": "Honey & Flour Patisserie", "rating": 4.8, "reviews": 145, "price_level": "$$"},
        {"name": "The Tiered Co.", "rating": 4.9, "reviews": 234, "price_level": "$$$"},
        {"name": "Sugar & Lace Cakes", "rating": 4.7, "reviews": 178, "price_level": "$$"},
        {"name": "Fondant Dreams Bakery", "rating": 4.8, "reviews": 89, "price_level": "$$$"},
    ],
    "hair_makeup": [
        {"name": "Halo Bridal Beauty", "rating": 4.9, "reviews": 223, "price_level": "$$$"},
        {"name": "The Mirror Room Studio", "rating": 4.8, "reviews": 167, "price_level": "$$"},
        {"name": "Glow Bridal Beauty", "rating": 4.9, "reviews": 312, "price_level": "$$$"},
        {"name": "Luminous Beauty Co.", "rating": 4.7, "reviews": 145, "price_level": "$$"},
        {"name": "The Bridal Chair", "rating": 4.8, "reviews": 89, "price_level": "$$$"},
    ],
    "transport": [
        {"name": "Silver Lane Limos", "rating": 4.8, "reviews": 89, "price_level": "$$$"},
        {"name": "Vintage Wheels Co.", "rating": 4.9, "reviews": 56, "price_level": "$$$$"},
        {"name": "Grand Arrival Transport", "rating": 4.7, "reviews": 134, "price_level": "$$$"},
        {"name": "Classic Car Weddings", "rating": 4.8, "reviews": 78, "price_level": "$$$$"},
    ],
    "officiant": [
        {"name": "Heartfelt Ceremonies", "rating": 4.9, "reviews": 189, "price_level": "$$"},
        {"name": "Sacred Vows Co.", "rating": 4.9, "reviews": 112, "price_level": "$$"},
        {"name": "The Ceremony Studio", "rating": 4.8, "reviews": 234, "price_level": "$$"},
        {"name": "Words & Wonder Officiants", "rating": 4.7, "reviews": 89, "price_level": "$"},
        {"name": "Love & Law Ceremonies", "rating": 4.9, "reviews": 156, "price_level": "$$"},
    ],
    "invitations": [
        {"name": "Paper & Wax Studio", "rating": 4.8, "reviews": 134, "price_level": "$$$"},
        {"name": "Letterpress Lane", "rating": 4.7, "reviews": 78, "price_level": "$$$$"},
        {"name": "The Print & Post Co.", "rating": 4.6, "reviews": 56, "price_level": "$$"},
    ],
}


def _make_demo(category: str, location: str) -> list:
    demos = [dict(d) for d in DEMO_VENDORS.get(category, [])]
    for i, d in enumerate(demos):
        d.update({
            "address": f"Near {location}",
            "distance": None,
            "phone": None,
            "website": None,
            "image_url": get_fallback_photo(category, i),
            "categories": [],
            "is_closed": False,
            "sponsored": False,
            "source": "demo",
            "online": False,
        })
    return demos


async def search_yelp(term: str, location: str, yelp_categories: str,
                       radius_miles: int = 25, limit: int = 20,
                       category: str = "") -> list:
    """Search Yelp Fusion API."""
    if not YELP_API_KEY:
        return []

    radius_meters = min(int(radius_miles * 1609.34), 40000)

    headers = {"Authorization": f"Bearer {YELP_API_KEY}"}
    params = {
        "term": term,
        "location": location,
        "categories": yelp_categories,
        "radius": radius_meters,
        "limit": min(limit, 50),
        "sort_by": "rating",
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.get(
                "https://api.yelp.com/v3/businesses/search",
                params=params,
                headers=headers,
            )
    except httpx.HTTPError as e:
        logger.warning("Yelp HTTP error: %s", e)
        return []

    if r.status_code != 200:
        logger.warning("Yelp API %s: %s", r.status_code, r.text[:200])
        return []

    results = []
    for b in r.json().get("businesses", []):
        loc = b.get("location", {})
        addr_parts = [loc.get("address1", ""), loc.get("city", ""), loc.get("state", "")]
        address = ", ".join(p for p in addr_parts if p)

        dist_m = b.get("distance")
        distance_str = f"{dist_m / 1609.34:.1f} mi away" if dist_m else None

        img = b.get("image_url") or get_fallback_photo(category, len(results))
        results.append({
            "name": b.get("name"),
            "address": address or None,
            "distance": distance_str,
            "phone": b.get("display_phone") or b.get("phone"),
            "website": b.get("url"),
            "rating": b.get("rating"),
            "reviews": b.get("review_count"),
            "image_url": img,
            "price_level": b.get("price"),
            "categories": [c.get("title") for c in b.get("categories", [])],
            "is_closed": b.get("is_closed", False),
            "sponsored": False,
            "source": "yelp",
            "online": False,
        })

    return results


async def search_vendors(category: str, location: str,
                          radius_miles: int = 25, online: bool = False,
                          limit: int = 20) -> list:
    """Main entry point for vendor search."""

    # Online invitations — return curated list
    if category == "invitations" and online:
        return ONLINE_INVITATION_SERVICES

    config = CATEGORY_CONFIG.get(category)
    if not config:
        return []

    # Try Yelp first
    if YELP_API_KEY:
        results = await search_yelp(
            term=config["term"],
            location=location,
            yelp_categories=config["yelp_categories"],
            radius_miles=radius_miles,
            limit=limit,
            category=category,
        )
        if results:
            return results
        logger.info("Yelp returned no results for %s in %s, using demo", category, location)

    return _make_demo(category, location)
