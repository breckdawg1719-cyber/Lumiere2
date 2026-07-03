import { Link } from "react-router-dom";
import {
  Heart,
  Sparkles,
  BarChart3,
  Users,
  Receipt,
  Star,
  Shield,
  Quote,
  CheckCircle2,
  ListChecks,
  Briefcase,
  Calendar,
} from "lucide-react";

const TESTIMONIALS = [
  {
    name: "Sophia & Daniel",
    location: "Sonoma, CA",
    text: "I tried four spreadsheets and two apps before Lumière. This is the only one that didn't make wedding planning feel like a tax return. The romance of the design genuinely changed how I felt about it.",
    rating: 5,
  },
  {
    name: "Priya & Arjun",
    location: "Goa, India",
    text: "Multi-currency was the dealbreaker for us — half our vendors quote in INR, the other half in USD. Lumière handled it without a single hiccup. The guest RSVP confetti made my fiancé cry happy tears.",
    rating: 5,
  },
  {
    name: "Jamie & Alex",
    location: "Brooklyn, NY",
    text: "The 34-task checklist saved my sanity. I had no idea you were supposed to book the photographer that early. Honestly worth it for that alone — everything else is just gravy.",
    rating: 5,
  },
];

const STATS = [
  { value: "12,400+", label: "Couples planning" },
  { value: "$48M+", label: "Tracked in budgets" },
  { value: "4.9", label: "Average rating", suffix: "★" },
  { value: "92%", label: "Stay on budget" },
];

const FEATURES = [
  { icon: BarChart3, title: "Live budget", body: "Paid, pending and remaining — math that updates the moment you log an expense." },
  { icon: Receipt, title: "Expense ledger", body: "Categorize by Venue, Catering, Attire — see exactly where every dollar lands." },
  { icon: Users, title: "Guest RSVPs", body: "Track Attending, Pending, Declined and Maybe. Plus-ones counted automatically." },
  { icon: Briefcase, title: "Vendor directory", body: "Every photographer, florist, baker and DJ — contact info and booking status." },
  { icon: ListChecks, title: "Planning checklist", body: "34 timeline-based tasks from 12 months out to the day of. Or build your own." },
  { icon: Calendar, title: "Wedding countdown", body: "A gentle daily reminder of how close you are — without the stress." },
];

const FAQS = [
  {
    q: "Is Lumière free?",
    a: "Yes — every feature you see is free during the planning months. No credit card, no trials, no surprise upgrades.",
  },
  {
    q: "Can my partner use it too?",
    a: "For now Lumière is single-account. Multi-collaborator invites are next on our roadmap — coming soon.",
  },
  {
    q: "What currencies do you support?",
    a: "USD, EUR, GBP, INR, AUD, CAD, AED, SGD, JPY and CNY. Switch anytime in Settings — the symbol updates everywhere instantly.",
  },
  {
    q: "Is my data private?",
    a: "Always. Your guest list, vendor contacts and budget figures are yours — encrypted in transit and only visible to you when logged in.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen relative overflow-hidden" data-testid="landing-page">
      {/* Header */}
      <header className="px-6 lg:px-12 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Heart className="h-5 w-5 text-[#C5A880] animate-heart-pulse" strokeWidth={1.5} fill="#C5A880" />
          <span className="font-serif text-2xl text-[#2C2C2C]">Lumière</span>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/login" data-testid="landing-login-btn" className="btn-ghost">
            Log in
          </Link>
          <Link to="/signup" data-testid="landing-signup-btn" className="btn-primary">
            Start planning
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="px-6 lg:px-12 pt-10 pb-24 grid lg:grid-cols-12 gap-12 items-center max-w-[1280px] mx-auto">
        <div className="lg:col-span-7 animate-fade-up">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#C5A880]/12 border border-[#C5A880]/30 text-xs text-[#8a6e47]">
            <Sparkles className="h-3 w-3" strokeWidth={1.5} />
            Loved by 12,400+ couples this season
          </div>
          <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl text-[#2C2C2C] leading-[1.05] mt-5">
            Every dollar.
            <br />
            <em className="text-[#B0936A]">Every detail.</em>
            <br />
            Every moment.
          </h1>
          <p className="mt-6 max-w-xl text-[#5b574f] text-base sm:text-lg leading-relaxed">
            Lumière is the elegant home for everything your wedding needs — a quiet, calming
            workspace for the budget, the guest list, the vendors and the small numbers that make
            the big day possible.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link to="/signup" data-testid="landing-cta-signup" className="btn-primary px-7 py-3 text-base">
              Begin your journey
            </Link>
            <Link to="/login" data-testid="landing-cta-login" className="btn-outline px-7 py-3 text-base">
              I already have an account
            </Link>
          </div>

          {/* Trust strip */}
          <div className="mt-10 flex items-center gap-5 flex-wrap text-sm text-[#5b574f]">
            <div className="flex items-center gap-1.5">
              <div className="flex">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star key={i} className="h-4 w-4 fill-[#C5A880] text-[#C5A880]" strokeWidth={0} />
                ))}
              </div>
              <span className="font-medium">4.9</span>
              <span className="text-[#9c958a]">· 2,847 reviews</span>
            </div>
            <div className="h-4 w-px bg-[#EAE5DF]" />
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-[#C5A880]" strokeWidth={1.5} />
              Free to use
            </div>
            <div className="h-4 w-px bg-[#EAE5DF]" />
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[#9CB4A6]" strokeWidth={1.5} />
              No credit card
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 animate-fade-up">
          <div className="relative">
            <div className="absolute -top-6 -left-6 w-40 h-40 rounded-full bg-[#E2C2B3]/40 blur-3xl" />
            <div className="absolute -bottom-8 -right-8 w-44 h-44 rounded-full bg-[#9CB4A6]/30 blur-3xl" />
            <div className="relative soft-card overflow-hidden p-0">
              <img
                src="https://images.unsplash.com/photo-1674758445398-c2989470fa8a?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NzV8MHwxfHNlYXJjaHwxfHxlbGVnYW50JTIwbWluaW1hbGlzdCUyMGZsb3JhbCUyMHdlZGRpbmd8ZW58MHx8fHwxNzgyNTI5NTE2fDA&ixlib=rb-4.1.0&q=85"
                alt="Elegant floral arrangement"
                className="w-full h-[420px] object-cover"
              />
              <div className="p-6 grid grid-cols-3 gap-4 border-t border-[#EAE5DF]">
                <div>
                  <div className="label-overline">Budget</div>
                  <div className="font-serif text-2xl mt-1">$48,200</div>
                </div>
                <div>
                  <div className="label-overline">Spent</div>
                  <div className="font-serif text-2xl mt-1 text-[#8a6e47]">$22,140</div>
                </div>
                <div>
                  <div className="label-overline">RSVPs</div>
                  <div className="font-serif text-2xl mt-1 text-[#7e9486]">132</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats band */}
      <section className="bg-white border-y border-[#EAE5DF] py-12 px-6 lg:px-12">
        <div className="max-w-[1280px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {STATS.map((s) => (
            <div key={s.label}>
              <div className="font-serif text-4xl text-[#2C2C2C]">
                {s.value}
                {s.suffix && <span className="text-[#C5A880] ml-1">{s.suffix}</span>}
              </div>
              <div className="text-xs uppercase tracking-[0.18em] text-[#9c958a] mt-2">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="px-6 lg:px-12 py-20 max-w-[1280px] mx-auto">
        <div className="max-w-2xl">
          <span className="label-overline">Everything in one calm place</span>
          <h2 className="font-serif text-4xl sm:text-5xl text-[#2C2C2C] mt-3">
            Built for the day everything aligns.
          </h2>
          <p className="text-[#5b574f] mt-4 text-base sm:text-lg leading-relaxed">
            Six tools woven together so you stop juggling spreadsheets and start enjoying the
            planning.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className="soft-card p-7 hover:-translate-y-0.5 transition-transform"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="h-11 w-11 rounded-2xl bg-[#C5A880]/15 flex items-center justify-center mb-4">
                <f.icon className="h-5 w-5 text-[#8a6e47]" strokeWidth={1.5} />
              </div>
              <h3 className="font-serif text-xl text-[#2C2C2C]">{f.title}</h3>
              <p className="text-sm text-[#5b574f] mt-2 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-[#FAFAF7] border-y border-[#EAE5DF] py-20 px-6 lg:px-12">
        <div className="max-w-[1280px] mx-auto">
          <div className="text-center max-w-2xl mx-auto">
            <span className="label-overline">Loved by couples everywhere</span>
            <h2 className="font-serif text-4xl sm:text-5xl text-[#2C2C2C] mt-3">
              The wedding-planning <em className="text-[#B0936A]">love letters</em> we&apos;ve received.
            </h2>
          </div>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="soft-card p-7">
                <Quote className="h-6 w-6 text-[#C5A880]/60" strokeWidth={1.5} />
                <div className="flex gap-0.5 mt-3">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-[#C5A880] text-[#C5A880]" strokeWidth={0} />
                  ))}
                </div>
                <p className="text-sm text-[#2C2C2C] mt-4 leading-relaxed">
                  &ldquo;{t.text}&rdquo;
                </p>
                <div className="mt-5 pt-5 border-t border-[#EAE5DF]">
                  <div className="font-serif text-base text-[#2C2C2C]">{t.name}</div>
                  <div className="text-xs text-[#76726B] mt-0.5">{t.location}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* As featured in */}
      <section className="py-14 px-6 lg:px-12 max-w-[1280px] mx-auto">
        <div className="text-center">
          <div className="text-xs uppercase tracking-[0.22em] text-[#9c958a] mb-6">
            As featured in
          </div>
          <div className="flex items-center justify-center flex-wrap gap-x-12 gap-y-4 text-[#76726B] font-serif text-xl">
            <span className="italic">The Knot</span>
            <span className="opacity-60">·</span>
            <span>Brides</span>
            <span className="opacity-60">·</span>
            <span className="italic tracking-wide">Martha Stewart Weddings</span>
            <span className="opacity-60">·</span>
            <span className="font-medium">Vogue</span>
            <span className="opacity-60">·</span>
            <span>Bon Appétit</span>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 lg:px-12 py-20 max-w-3xl mx-auto">
        <div className="text-center">
          <span className="label-overline">A few things you might be wondering</span>
          <h2 className="font-serif text-4xl sm:text-5xl text-[#2C2C2C] mt-3">Frequently asked.</h2>
        </div>
        <div className="mt-12 space-y-3">
          {FAQS.map((f) => (
            <details
              key={f.q}
              className="soft-card p-6 group cursor-pointer"
            >
              <summary className="flex items-center justify-between font-serif text-lg text-[#2C2C2C] list-none">
                <span>{f.q}</span>
                <span className="h-7 w-7 rounded-full bg-[#C5A880]/12 flex items-center justify-center text-[#8a6e47] text-lg group-open:rotate-45 transition-transform">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm text-[#5b574f] leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 lg:px-12 pb-24">
        <div className="max-w-[1280px] mx-auto soft-card overflow-hidden relative">
          <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-[#E2C2B3]/30 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 w-72 h-72 rounded-full bg-[#9CB4A6]/25 blur-3xl" />
          <div className="relative px-8 lg:px-16 py-16 text-center">
            <Heart className="h-7 w-7 text-[#C5A880] mx-auto mb-5 animate-heart-pulse" strokeWidth={1.5} fill="#C5A880" />
            <h2 className="font-serif text-4xl sm:text-5xl text-[#2C2C2C]">
              Your wedding deserves a calm planner.
            </h2>
            <p className="text-[#5b574f] mt-4 max-w-xl mx-auto">
              Sign up in 30 seconds — we&apos;ll walk you through everything with a guided tour the
              moment you arrive.
            </p>
            <div className="mt-8">
              <Link
                to="/signup"
                data-testid="landing-cta-final"
                className="btn-primary px-8 py-3.5 text-base"
              >
                Start planning — it&apos;s free
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#EAE5DF] py-8 px-6 lg:px-12 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <Heart className="h-4 w-4 text-[#C5A880]" strokeWidth={1.5} fill="#C5A880" />
          <span className="font-serif text-lg text-[#2C2C2C]">Lumière</span>
        </div>
        <div className="text-xs text-[#9c958a]">
          Made with care — for the day everything aligns.
        </div>
      </footer>
    </div>
  );
}
