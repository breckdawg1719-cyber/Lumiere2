import { useState, useCallback, useRef, useEffect } from "react";
import {
  Search, MapPin, Star, ExternalLink, Phone,
  Camera, Music, Flower2, Shirt, Mail, Cake,
  Car, Scissors, Heart, CalendarCheck, UtensilsCrossed,
  Building2, Loader2, AlertCircle, Sparkles
} from "lucide-react";

// ── AdSense config ────────────────────────────────────────────────────────────
const ADSENSE_PUBLISHER_ID = "ca-pub-1515317647829975";
const ADSENSE_AD_SLOT_1    = "2699319094";
const ADSENSE_AD_SLOT_2    = "3269752044";

// ── Categories ────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { key: "catering",     label: "Catering",      icon: UtensilsCrossed, color: "#C5A880" },
  { key: "photographer", label: "Photographer",   icon: Camera,          color: "#E2C2B3" },
  { key: "venue",        label: "Venue",          icon: Building2,       color: "#9CB4A6" },
  { key: "florist",      label: "Florist",        icon: Flower2,         color: "#E8CBA5" },
  { key: "music",        label: "Music & DJ",     icon: Music,           color: "#D48A8A" },
  { key: "attire",       label: "Attire",         icon: Shirt,           color: "#B6C4B6" },
  { key: "invitations",  label: "Invitations",    icon: Mail,            color: "#C5A880" },
  { key: "cake",         label: "Wedding Cake",   icon: Cake,            color: "#E2C2B3" },
  { key: "transport",    label: "Transport",      icon: Car,             color: "#9CB4A6" },
  { key: "hair_makeup",  label: "Hair & Makeup",  icon: Scissors,        color: "#E8CBA5" },
  { key: "officiant",    label: "Officiant",      icon: Heart,           color: "#D48A8A" },
  { key: "planner",      label: "Planner",        icon: CalendarCheck,   color: "#B6C4B6" },
];

const PRICE_LABELS = ["Free", "$", "$$", "$$$", "$$$$"];

// ── AdSense unit ──────────────────────────────────────────────────────────────
function AdSenseUnit({ slot, label = "Advertisement" }) {
  const adRef = useRef(null);
  useEffect(() => {
    try {
      if (window.adsbygoogle && adRef.current) {
        window.adsbygoogle.push({});
      }
    } catch (e) {}
  }, []);

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #EAE5DF", background: "#FAFAFA" }}>
      <p className="text-center text-xs py-1.5 uppercase tracking-[0.15em]" style={{ color: "#B0B0B0", borderBottom: "1px solid #EAE5DF" }}>
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

// ── Star rating ───────────────────────────────────────────────────────────────
function StarRating({ rating, count }) {
  if (!rating) return null;
  return (
    <span className="flex items-center gap-1 text-sm" style={{ color: "#76726B" }}>
      <Star size={13} fill="#C5A880" stroke="#C5A880" strokeWidth={1.5} />
      <span className="font-medium" style={{ color: "#2C2C2C" }}>{Number(rating).toFixed(1)}</span>
      {count && <span>({Number(count).toLocaleString()} reviews)</span>}
    </span>
  );
}

// ── Vendor card ───────────────────────────────────────────────────────────────
function VendorCard({ vendor, categoryColor }) {
  const Icon = Building2;

  return (
    <div
      data-testid="vendor-card"
      className="p-6 rounded-2xl bg-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
      style={{ border: "1px solid #EAE5DF", boxShadow: "0 4px 24px rgba(0,0,0,0.02)" }}
    >
      <div className="flex gap-4">
        {/* Photo or placeholder */}
        {vendor.image_url ? (
          <img
            src={vendor.image_url}
            alt={vendor.name}
            className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
            style={{ border: "1px solid #EAE5DF" }}
            onError={e => { e.target.style.display = "none"; }}
          />
        ) : (
          <div
            className="w-20 h-20 rounded-xl flex-shrink-0 flex items-center justify-center"
            style={{ background: "#F5F0EB" }}
          >
            <Icon size={24} strokeWidth={1.5} style={{ color: categoryColor || "#C5A880" }} />
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
              <span className="text-xs flex-shrink-0 font-semibold" style={{ color: "#9CB4A6" }}>
                {PRICE_LABELS[vendor.price_level] || ""}
              </span>
            )}
          </div>

          <StarRating rating={vendor.rating} count={vendor.reviews} />

          {vendor.address && (
            <p className="text-sm mt-1 truncate" style={{ color: "#76726B" }}>
              <MapPin size={12} strokeWidth={1.5} className="inline mr-1" />
              {vendor.address}
            </p>
          )}

          {vendor.description && (
            <p className="text-xs mt-1.5 line-clamp-2" style={{ color: "#76726B" }}>
              {vendor.description}
            </p>
          )}

          <div className="flex gap-2 mt-3 flex-wrap">
            {vendor.website && (
              <a
                href={vendor.website.startsWith("http") ? vendor.website : `https://${vendor.website}`}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="vendor-website-link"
                className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full transition-all duration-300"
                style={{ background: "#F5F0EB", color: "#C5A880", border: "1px solid #EAE5DF" }}
              >
                Visit Website <ExternalLink size={10} strokeWidth={1.5} />
              </a>
            )}
            {vendor.phone && (
              <a
                href={`tel:${vendor.phone}`}
                className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full transition-all duration-300"
                style={{ background: "transparent", color: "#76726B", border: "1px solid #EAE5DF" }}
              >
                <Phone size={10} strokeWidth={1.5} /> {vendor.phone}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sponsored card ────────────────────────────────────────────────────────────
function SponsoredCard({ vendor }) {
  return (
    <div
      data-testid="sponsored-vendor-card"
      className="relative p-6 rounded-2xl transition-all duration-300 hover:-translate-y-0.5"
      style={{
        background: "linear-gradient(135deg, #FFFDF9 0%, #FBF5EC 100%)",
        border: "1px solid #E8CBA5",
        boxShadow: "0 4px 24px rgba(197,168,128,0.12)",
      }}
    >
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ background: "#FBF5EC", color: "#B0936A", border: "1px solid #E8CBA5" }}
            >
              <Sparkles size={10} strokeWidth={1.5} /> Sponsored
            </span>
          </div>
          <h3
            className="text-lg font-semibold mb-1"
            style={{ fontFamily: "'Playfair Display', serif", color: "#2C2C2C" }}
          >
            {vendor.name}
          </h3>
          {vendor.description && (
            <p className="text-sm leading-relaxed mb-3" style={{ color: "#76726B" }}>
              {vendor.description}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            {vendor.website && (
              <a
                href={vendor.website}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium text-white transition-all duration-300"
                style={{ background: "#C5A880" }}
              >
                Get a Free Quote <ExternalLink size={13} strokeWidth={1.5} />
              </a>
            )}
            {vendor.phone && (
              <a
                href={`tel:${vendor.phone}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm transition-all duration-300"
                style={{ border: "1px solid #C5A880", color: "#C5A880" }}
              >
                <Phone size={13} strokeWidth={1.5} /> {vendor.phone}
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

  const organic = results?.organic || [];
  const sponsored = results?.sponsored || [];

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
            Discover trusted local professionals for every part of your big day.
          </p>
        </div>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="flex gap-3 mb-8" data-testid="vendor-search-form">
          <div className="relative flex-1">
            <MapPin size={16} strokeWidth={1.5} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "#C5A880" }} />
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="Enter your wedding city or venue location…"
              data-testid="location-input"
              className="w-full pl-10 pr-4 h-12 rounded-xl text-sm outline-none transition-all bg-white"
              style={{ border: "1px solid #EAE5DF", color: "#2C2C2C" }}
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
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 size={32} className="animate-spin" style={{ color: "#C5A880" }} />
            <p style={{ color: "#76726B" }}>
              Finding {selectedCategory?.label} vendors near {location}…
            </p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: "#FDF0F0", border: "1px solid #D48A8A" }}>
            <AlertCircle size={18} strokeWidth={1.5} style={{ color: "#D48A8A" }} />
            <p className="text-sm" style={{ color: "#2C2C2C" }}>{error}</p>
          </div>
        )}

        {/* Results */}
        {results && !loading && (
          <div className="space-y-6">

            {/* AdSense slot 1 */}
            <AdSenseUnit slot={ADSENSE_AD_SLOT_1} />

            {/* Sponsored results */}
            {sponsored.length > 0 && (
              <div className="space-y-4">
                <p className="text-xs uppercase tracking-[0.2em]" style={{ color: "#76726B" }}>Featured</p>
                {sponsored.map((v, i) => <SponsoredCard key={i} vendor={v} />)}
              </div>
            )}

            {/* Divider */}
            {sponsored.length > 0 && organic.length > 0 && (
              <div className="flex items-center gap-4">
                <div className="flex-1 h-px" style={{ background: "#EAE5DF" }} />
                <span className="text-xs uppercase tracking-[0.15em]" style={{ color: "#76726B" }}>
                  {organic.length} local results
                </span>
                <div className="flex-1 h-px" style={{ background: "#EAE5DF" }} />
              </div>
            )}

            {/* Organic results — first 3 */}
            {organic.length > 0 && (
              <>
                <div className="space-y-4">
                  {organic.slice(0, 3).map((v, i) => (
                    <VendorCard key={i} vendor={v} categoryColor={selectedCategory?.color} />
                  ))}
                </div>

                {/* AdSense slot 2 between results */}
                {organic.length > 3 && <AdSenseUnit slot={ADSENSE_AD_SLOT_2} />}

                {/* Remaining results */}
                {organic.length > 3 && (
                  <div className="space-y-4">
                    {organic.slice(3).map((v, i) => (
                      <VendorCard key={i} vendor={v} categoryColor={selectedCategory?.color} />
                    ))}
                  </div>
                )}
              </>
            )}

            {/* No results */}
            {organic.length === 0 && sponsored.length === 0 && (
              <div className="text-center py-16">
                <Search size={32} strokeWidth={1} style={{ color: "#EAE5DF", margin: "0 auto 16px" }} />
                <p className="font-serif text-lg mb-2" style={{ fontFamily: "'Playfair Display', serif", color: "#2C2C2C" }}>
                  No results found nearby
                </p>
                <p className="text-sm" style={{ color: "#76726B" }}>
                  Try a nearby city or broaden your search area.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!results && !loading && !error && (
          <div className="text-center py-16">
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
