import { useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { Heart, Sparkles, ChevronRight, MousePointerClick, Search } from "lucide-react";

const STORAGE_KEY = "lumiere_tutorial_seen_v4";

const STEPS = [
  {
    type: "modal",
    icon: Heart,
    color: "#C5A880",
    overline: "Welcome to Lumière",
    title: "Let me show you around.",
    body:
      "A quick guided tour of everything — your budget, guest list, checklist, and how to find local wedding vendors. Skip anytime — replay from the ? icon anytime.",
    primaryLabel: "Start the tour",
  },
  {
    type: "spotlight",
    target: '[data-testid="nav-settings"]',
    overline: "Step 1 · Foundations",
    title: "Click Settings",
    body:
      "Start here — set your total budget, currency, partner names, and wedding date. Everything on the dashboard flows from these numbers.",
    placement: "right",
    clickHint: true,
  },
  {
    type: "spotlight",
    target: '[data-testid="settings-budget"]',
    overline: "Settings",
    title: "Your total budget",
    body:
      "Enter the amount you're planning to spend overall. Every stat on the dashboard flows from this number.",
    placement: "bottom",
    requiredPath: "/settings",
  },
  {
    type: "spotlight",
    target: '[data-testid="settings-currency"]',
    overline: "Settings",
    title: "Pick your currency",
    body:
      "USD, EUR, GBP, INR, AED and more. The symbol updates everywhere — dashboard, expenses, categories.",
    placement: "bottom",
    requiredPath: "/settings",
  },
  {
    type: "spotlight",
    target: '[data-testid="settings-save"]',
    overline: "Settings",
    title: "Save your changes",
    body: "When you're happy, hit Save. Everything updates instantly across the app.",
    placement: "left",
    requiredPath: "/settings",
  },
  {
    type: "spotlight",
    target: '[data-testid="nav-expenses"]',
    overline: "Step 2 · The ledger",
    title: "Now click Expenses",
    body:
      "Every payment — past or upcoming — goes here. Log what's paid and what's still pending.",
    placement: "right",
    clickHint: true,
  },
  {
    type: "spotlight",
    target: '[data-testid="add-expense-btn"]',
    overline: "Expenses",
    title: "Adding expenses",
    body:
      "Click this to log a payment. You can mark it Already Paid (counts toward Spent) or Not Yet Paid (Pending). We'll skip it for now.",
    placement: "left",
    requiredPath: "/expenses",
  },
  {
    type: "spotlight",
    target: '[data-testid="nav-guests"]',
    overline: "Step 3 · Your circle",
    title: "Now Guests",
    body:
      "Manage your guest list and track RSVPs as replies come in. Mark someone Attending and a little confetti happens.",
    placement: "right",
    clickHint: true,
  },
  {
    type: "spotlight",
    target: '[data-testid="add-guest-btn"]',
    overline: "Guests",
    title: "Adding guests",
    body:
      "This button opens the guest form. Add their name, contact info, and RSVP status. Plus-ones are tracked separately.",
    placement: "left",
    requiredPath: "/guests",
  },
  {
    type: "spotlight",
    target: '[data-testid="nav-vendors"]',
    overline: "Step 4 · Find Vendors",
    title: "Click Vendors",
    body:
      "This is where it gets exciting. Save vendors you're considering AND search for new ones near your wedding location.",
    placement: "right",
    clickHint: true,
  },
  {
    type: "spotlight",
    target: '[data-testid="vendors-tab-find"]',
    overline: "Vendors · Find Tab",
    title: "Find Vendors tab",
    body:
      "Switch to Find Vendors to search for photographers, florists, caterers, DJs, officiants and more — right near your venue. Results include real photos, ratings, and contact info.",
    placement: "bottom",
    requiredPath: "/vendors",
  },
  {
    type: "spotlight",
    target: '[data-testid="nav-checklist"]',
    overline: "Step 5 · The plan",
    title: "Click Checklist",
    body:
      "34 wedding planning tasks organized from 12 months out to the day of. Tick them off as you go.",
    placement: "right",
    clickHint: true,
  },
  {
    type: "spotlight",
    target: '[data-testid="checklist-progress"]',
    overline: "Checklist",
    title: "Watch the progress climb",
    body:
      "Tick off tasks and the bar fills. You can add your own custom tasks anytime with the + Add task button.",
    placement: "bottom",
    requiredPath: "/checklist",
  },
  {
    type: "spotlight",
    target: '[data-testid="open-tutorial-btn"]',
    overline: "Anytime",
    title: "Replay this tour",
    body:
      "Click the question mark up here whenever you'd like to take this tour again — no judgement.",
    placement: "bottom",
  },
  {
    type: "modal",
    icon: Sparkles,
    color: "#D48A8A",
    overline: "All set",
    title: "Now go plan something beautiful.",
    body:
      "Everything you've seen is editable and saves automatically. Start with Settings → add your budget → then find your vendors. Cheers to the big day!",
    primaryLabel: "Let me at it",
    navigateTo: "/dashboard",
  },
];

const POLL_MAX_MS = 6000;
const PAD = 8;
const TOOLTIP_WIDTH = 340;
const TOOLTIP_MARGIN = 16;

export default function TutorialTour({ open, onClose }) {
  const [idx, setIdx] = useState(0);
  const [rect, setRect] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const step = STEPS[idx];
  const isLast = idx === STEPS.length - 1;
  const totalSpotlightSteps = STEPS.filter((s) => s.type === "spotlight").length;
  const currentSpotlightIdx =
    step?.type === "spotlight"
      ? STEPS.slice(0, idx + 1).filter((s) => s.type === "spotlight").length
      : null;

  useEffect(() => {
    if (open) setIdx(0);
  }, [open]);

  useEffect(() => {
    if (!open || !step) return;
    if (step.navigateTo && location.pathname !== step.navigateTo) {
      navigate(step.navigateTo);
    }
  }, [open, idx, step, location.pathname, navigate]);

  const finish = useCallback(() => {
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch (e) {}
    setRect(null);
    onClose();
  }, [onClose]);

  const advance = useCallback(() => {
    if (isLast) finish();
    else setIdx((i) => i + 1);
  }, [isLast, finish]);

  useEffect(() => {
    if (!open || !step || step.type !== "spotlight") { setRect(null); return; }
    if (step.requiredPath && location.pathname !== step.requiredPath) { setRect(null); return; }

    let cancelled = false;
    let timeoutId = null;
    const startedAt = Date.now();

    const findAndPosition = () => {
      if (cancelled) return;
      const el = document.querySelector(step.target);
      if (el) {
        try { el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" }); } catch (e) {}
        timeoutId = setTimeout(() => {
          if (cancelled) return;
          const r = el.getBoundingClientRect();
          setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
        }, 220);
      } else if (Date.now() - startedAt < POLL_MAX_MS) {
        timeoutId = setTimeout(findAndPosition, 80);
      } else {
        advance();
      }
    };

    findAndPosition();
    return () => { cancelled = true; if (timeoutId) clearTimeout(timeoutId); };
  }, [open, idx, location.pathname, step, advance]);

  useEffect(() => {
    if (!open || !step || step.type !== "spotlight") return;
    const update = () => {
      const el = document.querySelector(step.target);
      if (el) {
        const r = el.getBoundingClientRect();
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      }
    };
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, idx, step]);

  useEffect(() => {
    if (!open || !step || step.type !== "spotlight" || !step.clickHint || !rect) return;
    const el = document.querySelector(step.target);
    if (!el) return;
    const handler = () => { setTimeout(() => setIdx((i) => i + 1), 100); };
    el.addEventListener("click", handler, { once: true });
    return () => el.removeEventListener("click", handler);
  }, [open, idx, step, rect]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === "Escape") e.preventDefault(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  if (!open || !step) return null;

  // Modal step
  if (step.type === "modal") {
    return createPortal(
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 animate-fade-up">
        <div className="bg-white rounded-2xl border border-[#EAE5DF] max-w-md w-full overflow-hidden shadow-2xl" data-testid="tutorial-modal">
          <div className="px-8 pt-8 pb-6" style={{ background: `linear-gradient(135deg, ${step.color}18 0%, ${step.color}05 100%)` }}>
            <div className="h-14 w-14 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: `${step.color}26` }}>
              <step.icon className="h-6 w-6" strokeWidth={1.5} style={{ color: step.color }} />
            </div>
            <div className="label-overline" style={{ color: step.color }}>{step.overline}</div>
            <h2 className="font-serif text-2xl text-[#2C2C2C] mt-1.5 leading-snug">{step.title}</h2>
          </div>
          <div className="px-8 pb-6 pt-2">
            <p className="text-sm text-[#5b574f] leading-relaxed">{step.body}</p>
          </div>
          <div className="px-8 pb-7 pt-2 flex items-center justify-end gap-3">
            <button onClick={advance} data-testid={isLast ? "tutorial-done-btn" : "tutorial-next-btn"} className="btn-primary">
              {step.primaryLabel || (isLast ? "Done" : "Next")}
              {!isLast && <ChevronRight className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  // Spotlight waiting
  if (!rect) {
    return createPortal(
      <div className="fixed inset-0 z-[60] flex items-end justify-end p-6 pointer-events-none">
        <div className="bg-white rounded-full border border-[#EAE5DF] shadow-md px-4 py-2 text-xs text-[#76726B] flex items-center gap-2">
          <div className="h-3 w-3 rounded-full border-2 border-[#C5A880] border-t-transparent animate-spin" />
          Finding the right spot…
        </div>
      </div>,
      document.body
    );
  }

  // Compute tooltip position
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;

  const backdrops = [
    { top: 0, left: 0, right: 0, height: Math.max(0, rect.top - PAD) },
    { top: rect.top + rect.height + PAD, left: 0, right: 0, bottom: 0 },
    { top: Math.max(0, rect.top - PAD), height: rect.height + 2 * PAD, left: 0, width: Math.max(0, rect.left - PAD) },
    { top: Math.max(0, rect.top - PAD), height: rect.height + 2 * PAD, left: rect.left + rect.width + PAD, right: 0 },
  ];

  const computePlacement = (p) => {
    if (p === "right") {
      const left = rect.left + rect.width + TOOLTIP_MARGIN;
      if (left + TOOLTIP_WIDTH > viewportW - 16) return null;
      return { top: Math.max(16, Math.min(rect.top + rect.height / 2, viewportH - 80)), left, transform: "translateY(-50%)" };
    }
    if (p === "left") {
      const left = rect.left - TOOLTIP_MARGIN - TOOLTIP_WIDTH;
      if (left < 16) return null;
      return { top: Math.max(16, Math.min(rect.top + rect.height / 2, viewportH - 80)), left, transform: "translateY(-50%)" };
    }
    if (p === "bottom") {
      const top = rect.top + rect.height + TOOLTIP_MARGIN;
      if (top + 200 > viewportH) return null;
      return { top, left: Math.min(Math.max(16, rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2), viewportW - TOOLTIP_WIDTH - 16), transform: "" };
    }
    if (p === "top") {
      const top = rect.top - TOOLTIP_MARGIN;
      if (top - 200 < 0) return null;
      return { top, left: Math.min(Math.max(16, rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2), viewportW - TOOLTIP_WIDTH - 16), transform: "translateY(-100%)" };
    }
    return null;
  };

  let placement = step.placement || "right";
  const fallbackOrder = ["right", "left", "bottom", "top"];
  const tryOrder = [placement, ...fallbackOrder.filter((p) => p !== placement)];
  let resolved = null;
  for (const p of tryOrder) { resolved = computePlacement(p); if (resolved) { placement = p; break; } }
  if (!resolved) resolved = { top: viewportH / 2, left: viewportW / 2 - TOOLTIP_WIDTH / 2, transform: "translateY(-50%)" };

  return createPortal(
    <div data-testid="tutorial-spotlight">
      {backdrops.map((s, i) => (
        <div key={i} className="fixed bg-black/55 z-[60] transition-all duration-300" style={s} />
      ))}
      <div
        className="fixed z-[61] pointer-events-none rounded-2xl transition-all duration-300"
        style={{
          top: rect.top - PAD, left: rect.left - PAD,
          width: rect.width + 2 * PAD, height: rect.height + 2 * PAD,
          boxShadow: "0 0 0 2px #C5A880, 0 0 0 8px rgba(197,168,128,0.22), 0 0 40px rgba(197,168,128,0.35)",
        }}
      />
      {!step.clickHint && (
        <div
          className="fixed z-[61] cursor-not-allowed"
          style={{ top: rect.top - PAD, left: rect.left - PAD, width: rect.width + 2 * PAD, height: rect.height + 2 * PAD, borderRadius: 16 }}
          onClick={(e) => e.stopPropagation()}
          data-testid="tutorial-target-blocker"
        />
      )}
      <div
        className="fixed z-[62] bg-white rounded-2xl border border-[#EAE5DF] shadow-2xl p-5 animate-fade-up"
        style={{ top: resolved.top, left: resolved.left, width: TOOLTIP_WIDTH, transform: resolved.transform }}
        data-testid="tutorial-tooltip"
      >
        <div className="label-overline text-[#C5A880] mb-1">{step.overline}</div>
        <h3 className="font-serif text-lg text-[#2C2C2C] leading-tight">{step.title}</h3>
        <p className="text-sm text-[#5b574f] mt-2 leading-relaxed">{step.body}</p>
        {step.clickHint && (
          <div className="mt-3 flex items-center gap-2 text-xs text-[#8a6e47] bg-[#C5A880]/10 rounded-lg px-3 py-2 border border-[#C5A880]/30">
            <MousePointerClick className="h-3.5 w-3.5 animate-pulse flex-shrink-0" strokeWidth={1.5} />
            <span>Click the highlighted area to continue.</span>
          </div>
        )}
        <div className="mt-4 pt-3 border-t border-[#EAE5DF] flex items-center justify-between gap-2">
          <div className="text-[10px] uppercase tracking-[0.18em] text-[#9c958a]">
            {currentSpotlightIdx} of {totalSpotlightSteps}
          </div>
          {!step.clickHint && (
            <button onClick={advance} data-testid="tutorial-next-btn" className="btn-primary text-sm py-2 px-5">
              Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

export function hasSeenTutorial() {
  try { return localStorage.getItem(STORAGE_KEY) === "1"; } catch (e) { return false; }
}

export function resetTutorial() {
  try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
}
