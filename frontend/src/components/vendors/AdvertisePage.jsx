/**
 * AdvertisePage.jsx
 * Page for wedding vendors to sign up for sponsored placements.
 * This is your monetization funnel — vendors fill this out and you follow up.
 */

import { useState } from "react";
import { Sparkles, CheckCircle2, Loader2, ChevronDown } from "lucide-react";

const CATEGORIES = [
  { key: "catering",     label: "Catering" },
  { key: "photographer", label: "Photography" },
  { key: "venue",        label: "Venue" },
  { key: "florist",      label: "Florist" },
  { key: "music",        label: "Music & DJ" },
  { key: "attire",       label: "Bridal Attire" },
  { key: "invitations",  label: "Invitations" },
  { key: "cake",         label: "Wedding Cake" },
  { key: "transport",    label: "Transportation" },
  { key: "hair_makeup",  label: "Hair & Makeup" },
  { key: "officiant",    label: "Officiant" },
  { key: "planner",      label: "Wedding Planner" },
];

const PERKS = [
  "Appear at the top of local vendor searches",
  "Reach couples actively budgeting their wedding",
  "Featured badge increases click-through rate",
  "Custom CTA button linking to your site or quote form",
  "Cancel anytime — no long contracts",
];

function Input({ label, type = "text", value, onChange, placeholder, name, testId }) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label
        className="block text-xs uppercase tracking-[0.15em] mb-2"
        style={{ color: "#76726B" }}
      >
        {label}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        data-testid={testId}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="w-full h-12 px-4 rounded-xl text-sm outline-none transition-all bg-white"
        style={{
          border: `1px solid ${focused ? "#C5A880" : "#EAE5DF"}`,
          boxShadow: focused ? "0 0 0 3px rgba(197,168,128,0.12)" : "none",
          color: "#2C2C2C",
        }}
      />
    </div>
  );
}

export default function AdvertisePage() {
  const [form, setForm] = useState({
    business_name: "",
    contact_email: "",
    category: "",
    service_area: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = e => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.business_name || !form.contact_email || !form.category || !form.service_area) {
      setError("Please fill in all required fields.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/vendors/advertise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Submission failed. Please try again.");
      }
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-16 px-6" style={{ background: "#FAFAFA" }}>
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="text-center mb-14">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ background: "#FBF5EC", border: "1px solid #E8CBA5" }}
          >
            <Sparkles size={20} strokeWidth={1.5} style={{ color: "#C5A880" }} />
          </div>
          <h1
            className="text-4xl sm:text-5xl font-serif tracking-tight mb-4"
            style={{ fontFamily: "'Playfair Display', serif", color: "#2C2C2C" }}
          >
            Reach More Couples
          </h1>
          <p className="text-base max-w-lg mx-auto" style={{ color: "#76726B", lineHeight: 1.7 }}>
            Get your business in front of couples actively planning their wedding,
            right when they're searching for exactly what you offer.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-10 items-start">

          {/* Perks */}
          <div>
            <p
              className="text-xs uppercase tracking-[0.2em] mb-6"
              style={{ color: "#76726B" }}
            >
              What you get
            </p>
            <div className="space-y-4">
              {PERKS.map((perk, i) => (
                <div key={i} className="flex items-start gap-3">
                  <CheckCircle2
                    size={18}
                    strokeWidth={1.5}
                    style={{ color: "#9CB4A6", flexShrink: 0, marginTop: 2 }}
                  />
                  <p className="text-sm" style={{ color: "#2C2C2C", lineHeight: 1.6 }}>{perk}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Form */}
          {submitted ? (
            <div
              className="p-8 rounded-2xl text-center"
              style={{ background: "#FFFFFF", border: "1px solid #EAE5DF" }}
              data-testid="advertise-success"
            >
              <CheckCircle2
                size={36}
                strokeWidth={1.5}
                style={{ color: "#9CB4A6", margin: "0 auto 16px" }}
              />
              <h3
                className="text-2xl font-serif mb-2"
                style={{ fontFamily: "'Playfair Display', serif", color: "#2C2C2C" }}
              >
                We'll be in touch!
              </h3>
              <p className="text-sm" style={{ color: "#76726B" }}>
                Thanks for your interest. We'll reach out within 24 hours with pricing and
                next steps to get you featured.
              </p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              data-testid="advertise-form"
              className="p-8 rounded-2xl space-y-5 bg-white"
              style={{ border: "1px solid #EAE5DF", boxShadow: "0 4px 24px rgba(0,0,0,0.02)" }}
            >
              <Input
                label="Business Name *"
                name="business_name"
                value={form.business_name}
                onChange={handleChange}
                placeholder="e.g. Bliss Catering Co."
                testId="advertise-business-name"
              />
              <Input
                label="Contact Email *"
                type="email"
                name="contact_email"
                value={form.contact_email}
                onChange={handleChange}
                placeholder="hello@yourbusiness.com"
                testId="advertise-email"
              />

              {/* Category select */}
              <div>
                <label
                  className="block text-xs uppercase tracking-[0.15em] mb-2"
                  style={{ color: "#76726B" }}
                >
                  Category *
                </label>
                <div className="relative">
                  <select
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                    data-testid="advertise-category"
                    className="w-full h-12 px-4 pr-10 rounded-xl text-sm outline-none appearance-none bg-white"
                    style={{
                      border: "1px solid #EAE5DF",
                      color: form.category ? "#2C2C2C" : "#76726B",
                    }}
                  >
                    <option value="">Select a category…</option>
                    {CATEGORIES.map(c => (
                      <option key={c.key} value={c.key}>{c.label}</option>
                    ))}
                  </select>
                  <ChevronDown
                    size={15}
                    strokeWidth={1.5}
                    className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: "#76726B" }}
                  />
                </div>
              </div>

              <Input
                label="Service Area *"
                name="service_area"
                value={form.service_area}
                onChange={handleChange}
                placeholder="e.g. Austin, TX or Nationwide"
                testId="advertise-service-area"
              />

              {/* Message */}
              <div>
                <label
                  className="block text-xs uppercase tracking-[0.15em] mb-2"
                  style={{ color: "#76726B" }}
                >
                  Tell us about your business (optional)
                </label>
                <textarea
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  placeholder="A brief description of your services, pricing range, etc."
                  data-testid="advertise-message"
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none bg-white"
                  style={{ border: "1px solid #EAE5DF", color: "#2C2C2C" }}
                />
              </div>

              {error && (
                <p className="text-xs" style={{ color: "#D48A8A" }}>{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                data-testid="advertise-submit"
                className="w-full py-3 rounded-full text-sm font-medium text-white transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: "#C5A880" }}
                onMouseOver={e => !e.currentTarget.disabled && (e.currentTarget.style.background = "#B0936A")}
                onMouseOut={e => e.currentTarget.style.background = "#C5A880"}
              >
                {loading && <Loader2 size={15} className="animate-spin" />}
                {loading ? "Sending…" : "Request Sponsorship Info"}
              </button>

              <p className="text-xs text-center" style={{ color: "#76726B" }}>
                No payment needed now — we'll follow up with pricing details.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
