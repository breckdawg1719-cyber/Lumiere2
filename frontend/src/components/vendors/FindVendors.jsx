/**
 * FindVendors.jsx
 * Full vendor search with Yelp data (photos, ratings, distance),
 * mile range slider, online/local toggle for invitations,
 * AdSense monetization.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Search, MapPin, Star, ExternalLink, Phone,
  Camera, Music, Flower2, Shirt, Mail, Cake,
  Car, Scissors, Heart, CalendarCheck, UtensilsCrossed,
  Building2, Loader2, AlertCircle, Sparkles, Globe,
  Wifi, Store, SlidersHorizontal
} from "lucide-react";

// ── AdSense ───────────────────────────────────────────────────────────────────
const ADSENSE_PUBLISHER_ID = "ca-pub-1357852677461391";
const ADSENSE_AD_SLOT_1    = "4742755430"; // vendors-top
const ADSENSE_AD_SLOT_2    = "3126421430"; // vendors-mid
const ADSENSE_AD_SLOT_3    = "1813339760"; // vendors-bottom

// ── Categories (planner removed) ─────────────────────────────────────────────
const CATEGORIES = [
  { key: "venue",        label: "Venue",         icon: Building2,      color: "#9CB4A6" },
  { key: "catering",     label: "Catering",       icon: UtensilsCrossed, color: "#C5A880" },
  { key: "photographer", label: "Photographer",   icon: Camera,          color: "#E2C2B3" },
  { key: "florist",      label: "Florist",        icon: Flower2,         color: "#E8CBA5" },
  { key: "music",        label: "Music & DJ",     icon: Music,           color: "#D48A8A" },
  { key: "cake",         label: "Wedding Cake",   icon: Cake,            color: "#E2C2B3" },
  { key: "attire",       label: "Attire",         icon: Shirt,           color: "#B6C4B6" },
  { key: "hair_makeup",  label: "Hair & Makeup",  icon: Scissors,        color: "#E8CBA5" },
  { key: "invitations",  label: "Invitations",    icon: Mail,            color: "#C5A880" },
  { key: "transport",    label: "Transport",      icon: Car,             color: "#9CB4A6" },
  { key: "officiant",    label: "Officiant",      icon: Heart,           color: "#D48A8A" },
];

const RADIUS_OPTIONS = [5, 10, 15, 25, 50];

// ── AdSense unit ──────────────────────────────────────────────────────────────
function AdSenseUnit({ slot }) {
  const adRef = useRef(null);
  useEffect(() => {
    try { if (window.adsbygoogle) window.adsbygoogle.push({}); } catch (e) {}
  }, []);
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #EAE5DF", background: "#FAFAFA" }}>
      <p className="text-center text-xs py-1 uppercase tracking-[0.15em]" style={{ color: "#C0BAB4", borderBottom: "1px solid #EAE5DF" }}>
        Advertisement
      </p>
      <ins ref={adRef} className="adsbygoogle" style={{ display: "block" }}
        data-ad-client={ADSENSE_PUBLISHER_ID} data-ad-slot={slot}
        data-ad-format="auto" data-full-width-responsive="true" />
    </div>
  );
}

// ── Star rating ───────────────────────────────────────────────────────────────
function StarRating({ rating, count }) {
  if (!rating) return null;
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex">
        {[1,2,3,4,5].map(i => (
          <Star key={i} size={12}
            fill={i <= Math.round(rating) ? "#C5A880" : "none"}
            stroke="#C5A880" strokeWidth={1.5} />
        ))}
      </div>
      <span className="text-xs font-semibold" style={{ color: "#2C2C2C" }}>{Number(rating).toFixed(1)}</span>
      {count && <span className="text-xs" style={{ color: "#76726B" }}>({Number(count).toLocaleString()})</span>}
    </div>
  );
}

// ── Vendor card (local) ───────────────────────────────────────────────────────
function VendorCard({ vendor, category }) {
  const Icon = category?.icon || Building2;
  const color = category?.color || "#C5A880";
  const [imgErr, setImgErr] = useState(false);

  return (
    <div
      className="rounded-2xl bg-white overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
      style={{ border: "1px solid #EAE5DF", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}
      data-testid="vendor-card"
    >
      {/* Photo */}
      <div className="relative h-44 overflow-hidden" style={{ background: `${color}18` }}>
        {vendor.image_url && !imgErr ? (
          <img
            src={vendor.image_url}
            alt={vendor.name}
            className="w-full h-full object-cover"
            onError={() => setImgErr(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Icon size={52} strokeWidth={0.8} style={{ color, opacity: 0.5 }} />
          </div>
        )}
        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          {vendor.is_closed && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-white/90"
              style={{ color: "#D48A8A" }}>Temporarily Closed</span>
          )}
          {vendor.source === "demo" && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-white/90"
              style={{ color: "#76726B" }}>Sample Result</span>
          )}
        </div>
        {vendor.price_level && (
          <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-xs font-semibold bg-white/90"
            style={{ color: "#9CB4A6" }}>
            {vendor.price_level}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="text-base font-semibold mb-1.5 leading-tight"
          style={{ fontFamily: "'Playfair Display', serif", color: "#2C2C2C" }}>
          {vendor.name}
        </h3>

        <StarRating rating={vendor.rating} count={vendor.reviews} />

        {/* Category tags */}
        {vendor.categories?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {vendor.categories.slice(0, 3).map((c, i) => (
              <span key={i} className="px-2 py-0.5 rounded-full text-xs"
                style={{ background: "#F5F0EB", color: "#76726B" }}>
                {c}
              </span>
            ))}
          </div>
        )}

        {/* Address + distance */}
        <div className="mt-2.5 space-y-1">
          {vendor.address && (
            <p className="text-xs flex items-start gap-1.5" style={{ color: "#76726B" }}>
              <MapPin size={12} strokeWidth={1.5} className="flex-shrink-0 mt-0.5" />
              <span className="line-clamp-1">{vendor.address}</span>
            </p>
          )}
          {vendor.distance && (
            <p className="text-xs font-medium" style={{ color: "#C5A880" }}>
              📍 {vendor.distance}
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mt-4 flex-wrap">
          {vendor.website && (
            <a href={vendor.website} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full font-medium text-white transition-all"
              style={{ background: "#C5A880" }}>
              Visit <ExternalLink size={10} strokeWidth={1.5} />
            </a>
          )}
          {vendor.phone && (
            <a href={`tel:${vendor.phone}`}
              className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full transition-all"
              style={{ border: "1px solid #EAE5DF", color: "#76726B" }}>
              <Phone size={10} strokeWidth={1.5} /> {vendor.phone}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Online invitation card ────────────────────────────────────────────────────
function OnlineVendorCard({ vendor }) {
  return (
    <div
      className="rounded-2xl bg-white overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
      style={{ border: "1px solid #EAE5DF", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}
    >
      {/* Header */}
      <div className="h-32 flex items-center justify-center relative"
        style={{ background: "linear-gradient(135deg, #FBF5EC 0%, #F5F0EB 100%)" }}>
        <Globe size={48} strokeWidth={0.8} style={{ color: "#C5A880", opacity: 0.6 }} />
        {vendor.price_level && (
          <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-xs font-semibold bg-white/90"
            style={{ color: "#9CB4A6" }}>
            {vendor.price_level}
          </div>
        )}
      </div>

      <div className="p-5">
        <h3 className="text-base font-semibold mb-1.5"
          style={{ fontFamily: "'Playfair Display', serif", color: "#2C2C2C" }}>
          {vendor.name}
        </h3>

        <StarRating rating={vendor.rating} count={vendor.reviews} />

        <p className="text-xs mt-2 leading-relaxed line-clamp-2" style={{ color: "#76726B" }}>
          {vendor.description}
        </p>

        {/* Tags */}
        {vendor.categories?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2.5">
            {vendor.categories.map((c, i) => (
              <span key={i} className="px-2 py-0.5 rounded-full text-xs"
                style={{ background: "#F5F0EB", color: "#76726B" }}>
                {c}
              </span>
            ))}
          </div>
        )}

        <p className="text-xs mt-2" style={{ color: "#9CB4A6" }}>
          <Wifi size={10} className="inline mr-1" strokeWidth={1.5} />
          {vendor.address}
        </p>

        <div className="mt-4">
          <a href={vendor.website} target="_blank" rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-1.5 text-xs px-4 py-2 rounded-full font-medium text-white transition-all"
            style={{ background: "#C5A880" }}>
            Visit Website <ExternalLink size={10} strokeWidth={1.5} />
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Sponsored card ────────────────────────────────────────────────────────────
function SponsoredCard({ vendor }) {
  return (
    <div className="p-5 rounded-2xl col-span-full transition-all duration-300 hover:-translate-y-0.5"
      style={{ background: "linear-gradient(135deg,#FFFDF9 0%,#FBF5EC 100%)", border: "1px solid #E8CBA5", boxShadow: "0 4px 24px rgba(197,168,128,0.12)" }}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mb-2"
            style={{ background: "#FBF5EC", color: "#B0936A", border: "1px solid #E8CBA5" }}>
            <Sparkles size={9} strokeWidth={1.5} /> Sponsored
          </span>
          <h3 className="text-lg font-semibold mb-1"
            style={{ fontFamily: "'Playfair Display', serif", color: "#2C2C2C" }}>
            {vendor.name}
          </h3>
          {vendor.description && <p className="text-sm mb-3" style={{ color: "#76726B" }}>{vendor.description}</p>}
          <div className="flex gap-2 flex-wrap">
            {vendor.website && (
              <a href={vendor.website} target="_blank" rel="noopener noreferrer sponsored"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium text-white"
                style={{ background: "#C5A880" }}>
                Get a Free Quote <ExternalLink size={12} strokeWidth={1.5} />
              </a>
            )}
            {vendor.phone && (
              <a href={`tel:${vendor.phone}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm"
                style={{ border: "1px solid #C5A880", color: "#C5A880" }}>
                <Phone size={12} strokeWidth={1.5} /> {vendor.phone}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Category grid ─────────────────────────────────────────────────────────────
function CategoryGrid({ selected, onSelect }) {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-11 gap-2">
      {CATEGORIES.map(({ key, label, icon: Icon, color }) => {
        const isActive = selected === key;
        return (
          <button key={key} data-testid={`category-${key}`} onClick={() => onSelect(key)}
            className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl transition-all duration-200 hover:-translate-y-0.5"
            style={{
              background: isActive ? "#FBF5EC" : "#FFFFFF",
              border: isActive ? `1.5px solid ${color}` : "1px solid #EAE5DF",
              boxShadow: isActive ? `0 4px 12px ${color}30` : "none",
            }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: isActive ? color + "22" : "#F5F0EB" }}>
              <Icon size={16} strokeWidth={1.5} style={{ color: isActive ? color : "#76726B" }} />
            </div>
            <span className="text-xs text-center leading-tight"
              style={{ color: isActive ? "#2C2C2C" : "#76726B", fontWeight: isActive ? 600 : 400, fontFamily: "'Outfit', sans-serif" }}>
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
  const [category, setCategory]       = useState(null);
  const [location, setLocation]       = useState(weddingLocation);
  const [radius, setRadius]           = useState(25);
  const [online, setOnline]           = useState(false);
  const [results, setResults]         = useState(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  const selectedCategory = CATEGORIES.find(c => c.key === category);
  const isInvitations = category === "invitations";

  const search = useCallback(async (cat, loc, r, onl) => {
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
        body: JSON.stringify({
          category: cat,
          location: loc.trim(),
          radius_miles: r,
          online: onl,
          limit: 20,
        }),
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
    const newOnline = key !== "invitations" ? false : online;
    if (location.trim()) search(key, location, radius, newOnline);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (category && location.trim()) search(category, location, radius, online);
  };

  const handleToggleOnline = (val) => {
    setOnline(val);
    if (category && location.trim()) search(category, location, radius, val);
  };

  const organic = results?.organic || [];
  const sponsored = results?.sponsored || [];
  const isOnlineResults = organic.length > 0 && organic[0]?.online;

  return (
    <div className="min-h-screen" style={{ background: "#FAFAFA", fontFamily: "'Outfit', sans-serif" }}>
      <div className="max-w-6xl mx-auto px-6 lg:px-8 py-12">

        {/* Header */}
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.2em] mb-2" style={{ color: "#C5A880" }}>Wedding Planning</p>
          <h1 className="text-4xl sm:text-5xl font-serif tracking-tight mb-2"
            style={{ fontFamily: "'Playfair Display', serif", color: "#2C2C2C" }}>
            Find Your Vendors
          </h1>
          <p className="text-sm max-w-xl" style={{ color: "#76726B", lineHeight: 1.7 }}>
            Discover trusted local professionals for every part of your big day.
          </p>
        </div>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="flex gap-3 mb-6" data-testid="vendor-search-form">
          <div className="relative flex-1">
            <MapPin size={15} strokeWidth={1.5} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "#C5A880" }} />
            <input type="text" value={location} onChange={e => setLocation(e.target.value)}
              placeholder="Enter your wedding city…"
              data-testid="location-input"
              className="w-full pl-10 pr-4 h-11 rounded-xl text-sm outline-none transition-all bg-white"
              style={{ border: "1px solid #EAE5DF", color: "#2C2C2C" }}
              onFocus={e => e.target.style.borderColor = "#C5A880"}
              onBlur={e => e.target.style.borderColor = "#EAE5DF"} />
          </div>
          <button type="button" onClick={() => setShowFilters(f => !f)}
            className="px-4 h-11 rounded-xl text-sm flex items-center gap-1.5 transition-all"
            style={{
              border: showFilters ? "1.5px solid #C5A880" : "1px solid #EAE5DF",
              color: showFilters ? "#C5A880" : "#76726B",
              background: showFilters ? "#FBF5EC" : "#FFFFFF",
            }}>
            <SlidersHorizontal size={14} strokeWidth={1.5} /> Filters
          </button>
          <button type="submit" disabled={!category || !location.trim() || loading}
            data-testid="vendor-search-submit"
            className="px-5 h-11 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-40 flex items-center gap-2"
            style={{ background: "#C5A880" }}>
            <Search size={14} strokeWidth={1.5} />
            Search
          </button>
        </form>

        {/* Filters panel */}
        {showFilters && (
          <div className="mb-6 p-5 rounded-2xl bg-white" style={{ border: "1px solid #EAE5DF" }}>
            <div className="flex flex-wrap gap-6 items-start">
              {/* Radius */}
              <div>
                <p className="text-xs uppercase tracking-[0.15em] mb-3" style={{ color: "#76726B" }}>
                  Search Radius
                </p>
                <div className="flex gap-2">
                  {RADIUS_OPTIONS.map(r => (
                    <button key={r} onClick={() => { setRadius(r); if (category && location.trim()) search(category, location, r, online); }}
                      className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                      style={{
                        background: radius === r ? "#C5A880" : "#F5F0EB",
                        color: radius === r ? "#FFFFFF" : "#76726B",
                        border: radius === r ? "1.5px solid #C5A880" : "1px solid #EAE5DF",
                      }}>
                      {r} mi
                    </button>
                  ))}
                </div>
              </div>

              {/* Online/local toggle — invitations only */}
              {isInvitations && (
                <div>
                  <p className="text-xs uppercase tracking-[0.15em] mb-3" style={{ color: "#76726B" }}>
                    Invitation Type
                  </p>
                  <div className="flex rounded-xl overflow-hidden" style={{ border: "1px solid #EAE5DF" }}>
                    <button onClick={() => handleToggleOnline(false)}
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium transition-all"
                      style={{ background: !online ? "#C5A880" : "#FFFFFF", color: !online ? "#FFFFFF" : "#76726B" }}>
                      <Store size={12} strokeWidth={1.5} /> Local Print Shops
                    </button>
                    <button onClick={() => handleToggleOnline(true)}
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium transition-all"
                      style={{ background: online ? "#C5A880" : "#FFFFFF", color: online ? "#FFFFFF" : "#76726B" }}>
                      <Wifi size={12} strokeWidth={1.5} /> Design Online
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Category grid */}
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.2em] mb-3" style={{ color: "#76726B" }}>
            What are you looking for?
          </p>
          <CategoryGrid selected={category} onSelect={handleCategorySelect} />
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 size={28} className="animate-spin" style={{ color: "#C5A880" }} />
            <p className="text-sm" style={{ color: "#76726B" }}>
              Finding {selectedCategory?.label} {online && isInvitations ? "online services" : `vendors within ${radius} miles of ${location}`}…
            </p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: "#FDF0F0", border: "1px solid #D48A8A" }}>
            <AlertCircle size={16} strokeWidth={1.5} style={{ color: "#D48A8A" }} />
            <p className="text-sm" style={{ color: "#2C2C2C" }}>{error}</p>
          </div>
        )}

        {/* Results */}
        {results && !loading && (
          <div className="space-y-6">

            {/* AdSense slot 1 */}
            <AdSenseUnit slot={ADSENSE_AD_SLOT_1} />

            {/* Sponsored */}
            {sponsored.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-[0.2em] mb-3" style={{ color: "#76726B" }}>Featured</p>
                <div className="grid grid-cols-1 gap-4">
                  {sponsored.map((v, i) => <SponsoredCard key={i} vendor={v} />)}
                </div>
              </div>
            )}

            {/* Results header */}
            {organic.length > 0 && (
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.2em]" style={{ color: "#76726B" }}>
                  {isOnlineResults
                    ? `${organic.length} online services`
                    : `${organic.length} results within ${radius} miles`}
                </p>
                {results.live && !isOnlineResults && (
                  <span className="text-xs px-2.5 py-1 rounded-full"
                    style={{ background: "#F0F7F4", color: "#9CB4A6", border: "1px solid #9CB4A680" }}>
                    ✓ Live results
                  </span>
                )}
                {!results.live && !isOnlineResults && (
                  <span className="text-xs px-2.5 py-1 rounded-full"
                    style={{ background: "#FBF5EC", color: "#C5A880", border: "1px solid #E8CBA5" }}>
                    Add Yelp API key for real results
                  </span>
                )}
              </div>
            )}

            {/* Cards grid */}
            {organic.length > 0 && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {organic.slice(0, 6).map((v, i) => (
                    isOnlineResults
                      ? <OnlineVendorCard key={i} vendor={v} />
                      : <VendorCard key={i} vendor={v} category={selectedCategory} />
                  ))}
                </div>

                {organic.length > 6 && (
                  <>
                    <AdSenseUnit slot={ADSENSE_AD_SLOT_2} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {organic.slice(6).map((v, i) => (
                        isOnlineResults
                          ? <OnlineVendorCard key={i} vendor={v} />
                          : <VendorCard key={i} vendor={v} category={selectedCategory} />
                      ))}
                    </div>
                  </>
                )}
              </>
            )}

            {/* No results */}
            {organic.length === 0 && sponsored.length === 0 && (
              <div className="text-center py-16">
                <Search size={32} strokeWidth={1} style={{ color: "#EAE5DF", margin: "0 auto 12px" }} />
                <p className="font-serif text-lg mb-1" style={{ fontFamily: "'Playfair Display', serif", color: "#2C2C2C" }}>
                  No results found
                </p>
                <p className="text-sm" style={{ color: "#76726B" }}>
                  Try increasing the search radius or use a nearby city.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!results && !loading && !error && (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "#F5F0EB" }}>
              <Heart size={28} strokeWidth={1.5} style={{ color: "#C5A880" }} />
            </div>
            <p className="font-serif text-xl mb-2"
              style={{ fontFamily: "'Playfair Display', serif", color: "#2C2C2C" }}>
              Select a category to get started
            </p>
            <p className="text-sm" style={{ color: "#76726B" }}>
              Enter your wedding city and pick a category above.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
