"""
Free vendor search using OpenStreetMap Overpass API.
No API key needed. No billing. Completely free forever.
"""

import httpx
import asyncio
import logging
from typing import List, Optional

logger = logging.getLogger("wedding")

# ── Category → OSM tags ───────────────────────────────────────────────────────
CATEGORY_OSM_TAGS = {
    "catering":     [('amenity', 'restaurant'), ('catering', 'yes'), ('shop', 'catering')],
    "photographer": [('shop', 'photography'), ('craft', 'photographer')],
    "venue":        [('amenity', 'events_venue'), ('amenity', 'banquet_hall'), ('leisure', 'wedding_venue'), ('amenity', 'community_centre')],
    "florist":      [('shop', 'florist')],
    "music":        [('amenity', 'music_venue'), ('shop', 'musical_instrument'), ('craft', 'musician')],
    "attire":       [('shop', 'bridal'), ('shop', 'clothes'), ('shop', 'wedding')],
    "invitations":  [('shop', 'stationery'), ('craft', 'printing'), ('shop', 'printing')],
    "cake":         [('shop', 'bakery'), ('shop', 'pastry'), ('craft', 'bakery')],
    "transport":    [('amenity', 'taxi'), ('shop', 'car_rental'), ('amenity', 'car_rental')],
    "hair_makeup":  [('shop', 'hairdresser'), ('shop', 'beauty'), ('amenity', 'beauty_salon')],
    "officiant":    [('amenity', 'place_of_worship'), ('office', 'notary')],
    "planner":      [('office', 'event_planner'), ('amenity', 'events_venue')],
}

DEMO_VENDORS = {
    "catering": [
        {"name": "Harvest Table Catering", "address": "Local area", "phone": None, "website": None, "rating": 4.8, "reviews": 124, "image_url": None},
        {"name": "Golden Fork Events", "address": "Local area", "phone": None, "website": None, "rating": 4.6, "reviews": 89, "image_url": None},
        {"name": "The Dining Room Co.", "address": "Local area", "phone": None, "website": None, "rating": 4.7, "reviews": 203, "image_url": None},
    ],
    "photographer": [
        {"name": "Luminous Light Photography", "address": "Local area", "phone": None, "website": None, "rating": 4.9, "reviews": 312, "image_url": None},
        {"name": "Golden Hour Studio", "address": "Local area", "phone": None, "website": None, "rating": 4.8, "reviews": 178, "image_url": None},
        {"name": "Storied Frames", "address": "Local area", "phone": None, "website": None, "rating": 4.7, "reviews": 95, "image_url": None},
    ],
    "venue": [
        {"name": "The Stonehouse Estate", "address": "Local area", "phone": None, "website": None, "rating": 4.9, "reviews": 445, "image_url": None},
        {"name": "Willow Glen Manor", "address": "Local area", "phone": None, "website": None, "rating": 4.7, "reviews": 231, "image_url": None},
        {"name": "Vintage Mill Barn", "address": "Local area", "phone": None, "website": None, "rating": 4.8, "reviews": 167, "image_url": None},
    ],
    "florist": [
        {"name": "Petal & Stem Studio", "address": "Local area", "phone": None, "website": None, "rating": 4.8, "reviews": 156, "image_url": None},
        {"name": "Botanic Bloom Co.", "address": "Local area", "phone": None, "website": None, "rating": 4.6, "reviews": 89, "image_url": None},
    ],
    "music": [
        {"name": "Lumen Strings Trio", "address": "Local area", "phone": None, "website": None, "rating": 4.9, "reviews": 78, "image_url": None},
        {"name": "The Velvet Lounge Band", "address": "Local area", "phone": None, "website": None, "rating": 4.7, "reviews": 134, "image_url": None},
    ],
    "attire": [
        {"name": "Aria Bridal Boutique", "address": "Local area", "phone": None, "website": None, "rating": 4.8, "reviews": 267, "image_url": None},
        {"name": "The Veil Collection", "address": "Local area", "phone": None, "website": None, "rating": 4.6, "reviews": 189, "image_url": None},
    ],
    "cake": [
        {"name": "Sweet Petal Bakery", "address": "Local area", "phone": None, "website": None, "rating": 4.9, "reviews": 312, "image_url": None},
        {"name": "Honey & Flour Patisserie", "address": "Local area", "phone": None, "website": None, "rating": 4.8, "reviews": 145, "image_url": None},
    ],
    "hair_makeup": [
        {"name": "Halo Bridal Beauty", "address": "Local area", "phone": None, "website": None, "rating": 4.9, "reviews": 223, "image_url": None},
        {"name": "The Mirror Room Studio", "address": "Local area", "phone": None, "website": None, "rating": 4.7, "reviews": 167, "image_url": None},
    ],
    "transport": [
        {"name": "Silver Lane Limos", "address": "Local area", "phone": None, "website": None, "rating": 4.7, "reviews": 89, "image_url": None},
        {"name": "Vintage Wheels Co.", "address": "Local area", "phone": None, "website": None, "rating": 4.8, "reviews": 56, "image_url": None},
    ],
    "invitations": [
        {"name": "Paper & Wax Studio", "address": "Local area", "phone": None, "website": None, "rating": 4.8, "reviews": 134, "image_url": None},
        {"name": "Letterpress Lane", "address": "Local area", "phone": None, "website": None, "rating": 4.7, "reviews": 78, "image_url": None},
    ],
    "officiant": [
        {"name": "Heartfelt Ceremonies", "address": "Local area", "phone": None, "website": None, "rating": 4.9, "reviews": 189, "image_url": None},
        {"name": "Sacred Vows Co.", "address": "Local area", "phone": None, "website": None, "rating": 4.8, "reviews": 112, "image_url": None},
    ],
    "planner": [
        {"name": "Day Of Dreams Planning", "address": "Local area", "phone": None, "website": None, "rating": 4.9, "reviews": 256, "image_url": None},
        {"name": "The Wedding Studio", "address": "Local area", "phone": None, "website": None, "rating": 4.8, "reviews": 178, "image_url": None},
    ],
}


async def geocode_location(location: str) -> Optional[tuple]:
    """Convert a city/address string to lat/lon using free Nominatim API."""
    url = "https://nominatim.openstreetmap.org/search"
    params = {"q": location, "format": "json", "limit": 1}
    headers = {"User-Agent": "LumiereWeddingApp/1.0 (contact@planwithlumiere.com)"}
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(url, params=params, headers=headers)
            data = r.json()
            if data:
                return float(data[0]["lat"]), float(data[0]["lon"])
    except Exception as e:
        logger.warning("Geocode failed: %s", e)
    return None


async def search_overpass(lat: float, lon: float, tags: list, radius_m: int = 10000) -> list:
    """Search OSM Overpass API for businesses near a location."""
    # Build Overpass QL query
    tag_queries = []
    for k, v in tags:
        tag_queries.append(f'node["{k}"="{v}"](around:{radius_m},{lat},{lon});')
        tag_queries.append(f'way["{k}"="{v}"](around:{radius_m},{lat},{lon});')

    query = f"""
    [out:json][timeout:15];
    (
      {''.join(tag_queries)}
    );
    out body center 10;
    """

    url = "https://overpass-api.de/api/interpreter"
    headers = {"User-Agent": "LumiereWeddingApp/1.0"}

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            r = await client.post(url, data={"data": query}, headers=headers)
            data = r.json()
    except Exception as e:
        logger.warning("Overpass API error: %s", e)
        return []

    results = []
    for el in data.get("elements", [])[:10]:
        tags_data = el.get("tags", {})
        name = tags_data.get("name")
        if not name:
            continue

        # Get address
        addr_parts = []
        if tags_data.get("addr:housenumber"):
            addr_parts.append(tags_data["addr:housenumber"])
        if tags_data.get("addr:street"):
            addr_parts.append(tags_data["addr:street"])
        if tags_data.get("addr:city"):
            addr_parts.append(tags_data["addr:city"])
        address = ", ".join(addr_parts) if addr_parts else None

        results.append({
            "name": name,
            "address": address,
            "phone": tags_data.get("phone") or tags_data.get("contact:phone"),
            "website": tags_data.get("website") or tags_data.get("contact:website"),
            "rating": None,     # OSM doesn't have ratings
            "reviews": None,
            "image_url": None,
            "sponsored": False,
            "source": "openstreetmap",
        })

    return results


async def search_vendors_free(category: str, location: str) -> list:
    """
    Main vendor search function using free APIs.
    Falls back to curated demo results if OSM returns nothing.
    """
    tags = CATEGORY_OSM_TAGS.get(category, [])
    if not tags:
        return DEMO_VENDORS.get(category, [])

    # Geocode the location
    coords = await geocode_location(location)
    if not coords:
        logger.info("Could not geocode '%s', returning demo results", location)
        demos = DEMO_VENDORS.get(category, [])
        for d in demos:
            d["address"] = f"Near {location}"
        return demos

    lat, lon = coords
    results = await search_overpass(lat, lon, tags)

    if not results:
        # Fall back to demo results with the real location
        logger.info("No OSM results for %s in %s, using demo data", category, location)
        demos = [dict(d) for d in DEMO_VENDORS.get(category, [])]
        for d in demos:
            d["address"] = f"Near {location}"
            d["source"] = "demo"
        return demos

    return results
