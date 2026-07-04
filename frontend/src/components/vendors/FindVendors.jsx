/**
 * FindVendors.jsx — Updated with:
 *  - Google AdSense slots (2 units at top of results)
 *  - WeddingWire affiliate links on every result card
 *  - Supabase-ready (no backend sponsor table needed)
 *
 * SETUP:
 *  1. Replace YOUR_ADSENSE_PUBLISHER_ID with your ca-pub-XXXXXXXXXXXXXXXX
 *  2. Replace YOUR_WEDDINGWIRE_AFFILIATE_ID with your ShareASale/WeddingWire ID
 *  3. AdSense script added in your index.html <head> (see DEPLOYMENT.md)
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search, MapPin, Star, ExternalLink, Phone, ChevronRight,
  Sparkles, Camera, Music, Flower2, Shirt, Mail, Cake,
  Car, Scissors, Heart, CalendarCheck, UtensilsCrossed,
  Building2, Loader2, AlertCircle, Link2
} from "lucide-react";

// ── CONFIG — replace these ────────────────────────────────────────────────────
const ADSENSE_PUBLISHER_ID = "ca-pub-1515317647829975"; // your AdSense pub ID
const ADSENSE_AD_SLOT_1    = "2699319094";              // ad slot 1 ID
const ADSENSE_AD_SLOT_2    = "3269752044";              // ad slot 2 ID

// WeddingWire affiliate: sign up at https://www.shareasale.com (search WeddingWire)
// Then build links like: https://www.weddingwire.com/search?q=CATEGORY&location=CITY&aid=YOUR_ID
const WEDDINGWIRE_AFFILIATE_ID = "YOUR_AFFILIATE_ID";

// The Knot affiliate (same ShareASale network, merchant ID 47461)
const THEKNOT_AFFILIATE_ID = "YOUR_AFFILIATE_ID";

// ── Category definitions ──────────────────────────────────────────────────────
const CATEGORIES = [
  { key: "catering",     label: "Catering",      icon: UtensilsCrossed, color: "#C5A880", ww: "catering" },
  { key: "photographer", label: "Photographer",   icon: Camera,          color: "#E2C2B3", ww: "photographers" },
  { key: "venue",        label: "Venue",          icon: Building2,       color: "#9CB4A6", ww: "wedding-venues" },
  { key: "florist",      label: "Florist",        icon: Flower2,         color: "#E8CBA5", ww: "florists" },
  { key: "music",        label: "Music & DJ",     icon: Music,           color: "#D48A8A", ww: "djs" },
  { key: "attire",       label: "Attire",         icon: Shirt,           color: "#B6C4B6", ww: "bridal-salons" },
  { key: "invitations",  label: "Invitations",    icon: Mail,            color: "#C5A880", ww: "invitations" },
  { key: "cake",         label: "Wedding Cake",   icon: Cake,            color: "#E2C2B3", ww: "cakes" },
  { key: "transport",    label: "Transport",      icon: Car,             color: "#9CB4A6", ww: "transportation" },
  { key: "hair_makeup",  label: "Hair & Makeup",  icon: Scissors,        color: "#E8CBA5", ww: "beauty" },
  { key: "officiant",    label: "Officiant",      icon: Heart,           color: "#D48A8A", ww: "officiants" },
  { key: "planner",      label: "Planner",        icon: CalendarCheck,   color: "#B6C4B6", ww: "wedding-planners" },
];

const PRICE_LABELS = ["Free", "$", "$$", "$$$", "$$$$"];

// ── Build affiliate URLs ──────────────────────────────────────────────────────
function weddingWireUrl(categoryWW, location) {
  const base = "https://www.weddingwire.com/search";
  const params = new URLSearchParams({
    q: categoryWW,
    location: location,
    // affiliate tracking — add your ShareASale params here once approved:
    // sscid: WEDDINGWIRE_AFFILIATE_ID,
  });
  return `${base}?${params}`;
}

function theKnotUrl(categoryWW, location) {
  // The Knot uses a different URL structure per category
  const city = encodeURIComponent(location.toLowerCase().replace(/\s+/g, "-"));
  return `https://www.theknot.com/marketplace/${categoryWW}-${city}`;
}

// ── Google AdSense unit ───────────────────────────────────────────────────────
function AdSenseUnit({ slot, label = "Advertisement" }) {
  const adRef = useRef(null);

  useEffect(() => {
    // Push ad after component mounts — standard AdSense pattern
    try {
      if (window.adsbygoogle && adRef.current) {
        window.adsbygoogle.push({});
      }
    } catch (e) {
      // AdSense not loaded yet (dev mode) — silently ignore
    }
  }, []);

  return (
    <div
      data-testid="adsense-unit"
      className="rounded-2xl overflow-hidden"
      style={{ border: "1px solid #EAE5DF", background: "#FAFAFA" }}
    >
      <p
        className="text-center text-xs py-1.5 uppercase tracking-[0.15em]"
        style={{ color: "#B0B0B0", borderBottom: "1px solid #EAE5DF" }}
      >
        {label}
      </p>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: "block", minHeight: 90 }}
        data-ad-client={ADSENSE_PUBLISHER_ID}
        data-ad-slot={slot}
        data-ad-format="fluid"
        data-ad-layout-key="-fb+5w+4e-db+86"
      />
    </div>
  );
}

// ── Affiliate banner card ─────────────────────────────────────────────────────
function AffiliateBanner({ category, location }) {
  if (!category || !location) return null;
  const wwUrl = weddingWireUrl(category.ww, location);
  const tkUrl = theKnotUrl(category.ww, location);

  return (
    <div
      data-testid="affiliate-banner"
      className="p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4"
      style={{
        background: "linear-gradient(135deg, #FBF5EC 0%, #FDF8F4 100%)",
        border: "1px solid #E8CBA5",
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "#FBF5EC", border: "1px solid #E8CBA5" }}
        >
          <Link2 size={16} strokeWidth={1.5} style={{ color: "#C5A880" }} />
        </div>
        <p className="text-sm" style={{ color: "#76726B" }}>
          See all <span style={{ color: "#2C2C2C", fontWeight: 500 }}>{category.label}</span> vendors
          with reviews on the top wedding directories:
        </p>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <a
          href={wwUrl}
          target="_blank"
          rel="noopener noreferrer sponsored"
          data-testid="weddingwire-affiliate-link"
          className="px-4 py-2 rounded-full text-xs font-medium text-white transition-all duration-300"
          style={{ background: "#6E2594" }}
          onMouseOver={e => e.currentTarget.style.opacity = "0.85"}
          onMouseOut={e => e.currentTarget.style.opacity = "1"}
        >
          WeddingWire
        </a>
        <a
          href={tkUrl}
          target="_blank"
          rel="noopener noreferrer sponsored"
          data-testid="theknot-affiliate-link"
          className="px-4 py-2 rounded-full text-xs font-medium text-white transition-all duration-300"
          style={{ background: "#2D6A4F" }}
          onMouseOver={e => e.currentTarget.style.opacity = "0.85"}
          onMouseOut={e => e.currentTarget.style.opacity = "1"}
        >
          The Knot
        </a>
      </div>
    </div>
  );
}

// ── Star rating ───────────────────────────────────────────────────────────────
function StarRating({ rating, count }) {
  if (!rating) return null;
  return (
    <span className="flex items-center gap-1 text-sm" style={{ color: "#76726B" }}>
      <Star size={13} fill="#C5A880" stroke="#C5A880" strokeWidth={1.5} />
      <span className="font-medium" style={{ color: "#2C2C2C" }}>{rating.toFixed(1)}</span>
      {count && <span>({count.toLocaleString()})</span>}
    </span>
  );
}

// ── Organic result card ───────────────────────────────────────────────────────
function VendorCard({ vendor, category, location }) {
  const wwUrl = weddingWireUrl(category?.ww || "vendors", location);

  return (
    <div
      data-testid="organic-vendor-card"
      className="p-6 rounded-2xl bg-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
      style={{ border: "1px solid #EAE5DF", boxShadow: "0 4px 24px rgba(0,0,0,0.02)" }}
    >
      <div className="flex gap-4">
        {vendor.photo_url ? (
          <img
            src={vendor.photo_url}
            alt={vendor.name}
            className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
            style={{ border: "1px solid #EAE5DF" }}
          />
        ) : (
          <div
            className="w-20 h-20 rounded-xl flex-shrink-0 flex items-center justify-center"
            style={{ background: "#F5F0EB" }}
          >
            <Building2 size={24} strokeWidth={1.5} style={{ color: "#C5A880" }} />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3
              className="text-base font-semibold truncate"
              style={{ fontFamily: "'Playfair Display', serif", color: "#2C2C2C" }}
            >
              {vendor.name}
            </h3>
            {vendor.price_level != null && (
              <span className="text-xs flex-shrink-0" style={{ color: "#9CB4A6", fontWeight: 600 }}>
                {PRICE_LABELS[vendor.price_level]}
              </span>
            )}
          </div>

          <StarRating rating={vendor.rating} count={vendor.user_ratings_total} />

          <p className="text-sm mt-1 truncate" style={{ color: "#76726B" }}>
            <MapPin size={12} strokeWidth={1.5} className="inline mr-1" />
            {vendor.vicinity}
          </p>

          <div className="flex gap-2 mt-3 flex-wrap">
            <a
              href={vendor.maps_url}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="vendor-maps-link"
              className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full transition-all duration-300"
              style={{ background: "#F5F0EB", color: "#C5A880", border: "1px solid #EAE5DF" }}
            >
              <MapPin size={11} strokeWidth={1.5} />
              View on Maps
            </a>
            {vendor.website && (
              <a
                href={vendor.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full transition-all duration-300"
                style={{ background: "transparent", color: "#76726B", border: "1px solid #EAE5DF" }}
              >
                Website <ExternalLink size={10} strokeWidth={1.5} />
              </a>
            )}
            {/* Affiliate link on every card */}
            <a
              href={wwUrl}
              target="_blank"
              rel="noopener noreferrer sponsored"
              data-testid="vendor-card-affiliate-link"
              className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full transition-all duration-300"
              style={{ background: "transparent", color: "#6E2594", border: "1px solid #D4B8E0" }}
            >
              See reviews on WeddingWire
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Category grid ─────────────────────────────────────────────────────────────
function CategoryGrid({ selected, onSelect }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
      {CATEGORIES.map(({ key, label, icon: Icon, color }) => {
        const isActive = selected === key;
        return (
          <button
            key={key}
            data-testid={`category-${key}`}
            onClick={() => onSelect(key)}
            className="flex flex-col items-center gap-2 p-3 rounded-2xl transition-all duration-300 hover:-translate-y-0.5"
            style={{
              background: isActive ? "#FBF5EC" : "#FFFFFF",
              border: isActive ? `1.5px solid ${color}` : "1px solid #EAE5DF",
              boxShadow: isActive ? `0 4px 16px ${color}30` : "0 2px 8px rgba(0,0,0,0.02)",
            }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: isActive ? color + "22" : "#F5F0EB" }}
            >
              <Icon size={18} strokeWidth={1.5} style={{ color: isActive ? color : "#76726B" }} />
            </div>
            <span
              className="text-xs text-center leading-tight"
              style={{
                color: isActive ? "#2C2C2C" : "#76726B",
                fontWeight: isActive ? 600 : 400,
                fontFamily: "'Outfit', sans-serif",
              }}
            >
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function FindVendors({ weddingLocation = "" }) {
  const [category, setCategory]   = useState(null);
  const [location, setLocation]   = useState(weddingLocation);
  const [results, setResults]     = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);

  const selectedCategory = CATEGORIES.find(c => c.key === category);

  const search = useCallback(async (cat, loc) => {
    if (!cat || !loc.trim()) return;
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL;
      const res = await fetch(`${backendUrl}/api/help/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("lumiere_token") || ""}`,
        },
        body: JSON.stringify({ category: cat, location: loc.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Search failed. Please try again.");
      }
      setResults(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCategorySelect = (key) => {
    setCategory(key);
    if (location.trim()) search(key, location);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (category && location.trim()) search(category, location);
  };

  return (
    <div className="min-h-screen" style={{ background: "#FAFAFA", fontFamily: "'Outfit', sans-serif" }}>
      <div className="max-w-5xl mx-auto px-6 lg:px-8 py-12">

        {/* Header */}
        <div className="mb-10">
          <p className="text-xs uppercase tracking-[0.2em] mb-3" style={{ color: "#C5A880" }}>
            Wedding Planning
          </p>
          <h1
            className="text-4xl sm:text-5xl font-serif tracking-tight mb-3"
            style={{ fontFamily: "'Playfair Display', serif", color: "#2C2C2C" }}
          >
            Find Your Vendors
          </h1>
          <p className="text-base max-w-xl" style={{ color: "#76726B", lineHeight: 1.7 }}>
            Discover trusted local professionals for every part of your big day —
            searched near your wedding location.
          </p>
        </div>

        {/* Location + search */}
        <form onSubmit={handleSearch} className="flex gap-3 mb-8" data-testid="vendor-search-form">
          <div className="relative flex-1">
            <MapPin size={16} strokeWidth={1.5} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "#C5A880" }} />
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="Enter your wedding city or venue location…"
              data-testid="location-input"
              className="w-full pl-10 pr-4 h-12 rounded-xl text-sm outline-none transition-all"
              style={{ border: "1px solid #EAE5DF", background: "#FFFFFF", color: "#2C2C2C" }}
              onFocus={e => e.target.style.borderColor = "#C5A880"}
              onBlur={e => e.target.style.borderColor = "#EAE5DF"}
            />
          </div>
          <button
            type="submit"
            data-testid="vendor-search-submit"
            disabled={!category || !location.trim() || loading}
            className="px-6 h-12 rounded-xl text-sm font-medium text-white transition-all duration-300 disabled:opacity-40 flex items-center gap-2"
            style={{ background: "#C5A880" }}
            onMouseOver={e => !e.currentTarget.disabled && (e.currentTarget.style.background = "#B0936A")}
            onMouseOut={e => e.currentTarget.style.background = "#C5A880"}
          >
            <Search size={15} strokeWidth={1.5} />
            Search
          </button>
        </form>

        {/* Categories */}
        <div className="mb-10">
          <p className="text-xs uppercase tracking-[0.2em] mb-4" style={{ color: "#76726B" }}>
            What are you looking for?
          </p>
          <CategoryGrid selected={category} onSelect={handleCategorySelect} />
        </div>

        {/* Loading */}
        {loading && (
          <div data-testid="vendor-search-loading" className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 size={32} className="animate-spin" style={{ color: "#C5A880" }} />
            <p style={{ color: "#76726B" }}>Finding {selectedCategory?.label} vendors near {location}…</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div
            data-testid="vendor-search-error"
            className="flex items-center gap-3 p-4 rounded-xl"
            style={{ background: "#FDF0F0", border: "1px solid #D48A8A" }}
          >
            <AlertCircle size={18} strokeWidth={1.5} style={{ color: "#D48A8A" }} />
            <p className="text-sm" style={{ color: "#2C2C2C" }}>{error}</p>
          </div>
        )}

        {/* Results */}
        {results && !loading && (
          <div data-testid="vendor-results" className="space-y-6">

            {/* ── AdSense slot 1 ── */}
            <AdSenseUnit slot={ADSENSE_AD_SLOT_1} label="Advertisement" />

            {/* ── Affiliate banner ── */}
            <AffiliateBanner category={selectedCategory} location={location} />

            {/* ── AdSense slot 2 (after first few results) ── */}
            {results.organic.length > 3 && (
              <>
                <div className="space-y-4">
                  {results.organic.slice(0, 3).map(v => (
                    <VendorCard key={v.place_id} vendor={v} category={selectedCategory} location={location} />
                  ))}
                </div>
                <AdSenseUnit slot={ADSENSE_AD_SLOT_2} label="Advertisement" />
                <div className="space-y-4">
                  {results.organic.slice(3).map(v => (
                    <VendorCard key={v.place_id} vendor={v} category={selectedCategory} location={location} />
                  ))}
                </div>
              </>
            )}

            {results.organic.length <= 3 && (
              <div className="space-y-4">
                {results.organic.map(v => (
                  <VendorCard key={v.place_id} vendor={v} category={selectedCategory} location={location} />
                ))}
              </div>
            )}

            {/* No results */}
            {results.organic.length === 0 && (
              <div className="text-center py-12" data-testid="vendor-no-results">
                <Search size={32} strokeWidth={1} style={{ color: "#EAE5DF", margin: "0 auto 16px" }} />
                <p className="font-serif text-lg mb-2" style={{ fontFamily: "Playfair Display", color: "#2C2C2C" }}>
                  No local results — try the directories below
                </p>
                <AffiliateBanner category={selectedCategory} location={location} />
              </div>
            )}

            {/* Bottom affiliate CTA */}
            <div
              className="p-6 rounded-2xl text-center mt-4"
              style={{ background: "linear-gradient(135deg, #FBF5EC 0%, #FAFAFA 100%)", border: "1px solid #EAE5DF" }}
            >
              <p className="font-serif text-lg mb-1" style={{ fontFamily: "'Playfair Display', serif", color: "#2C2C2C" }}>
                Want more options with verified reviews?
              </p>
              <p className="text-sm mb-4" style={{ color: "#76726B" }}>
                Browse thousands of rated vendors on WeddingWire and The Knot.
              </p>
              <div className="flex justify-center gap-3">
                <a
                  href={weddingWireUrl(selectedCategory?.ww || "vendors", location)}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="px-6 py-2.5 rounded-full text-sm font-medium text-white"
                  style={{ background: "#6E2594" }}
                >
                  Browse WeddingWire
                </a>
                <a
                  href={theKnotUrl(selectedCategory?.ww || "vendors", location)}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="px-6 py-2.5 rounded-full text-sm font-medium text-white"
                  style={{ background: "#2D6A4F" }}
                >
                  Browse The Knot
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!results && !loading && !error && (
          <div className="text-center py-16" data-testid="vendor-empty-state">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "#F5F0EB" }}>
              <Heart size={28} strokeWidth={1.5} style={{ color: "#C5A880" }} />
            </div>
            <p className="font-serif text-xl mb-2" style={{ fontFamily: "'Playfair Display', serif", color: "#2C2C2C" }}>
              Select a category to get started
            </p>
            <p className="text-sm" style={{ color: "#76726B" }}>
              Choose what you're looking for above, and we'll find the best options near your venue.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
