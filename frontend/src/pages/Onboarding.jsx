import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, CURRENCIES, formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComp } from "@/components/ui/calendar";
import {
  Heart,
  Users,
  Calendar as CalendarIcon,
  Wallet,
  ListChecks,
  Sparkles,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { toast } from "sonner";

const STEPS_META = [
  { icon: Heart, overline: "Welcome", title: "Let's set the stage." },
  { icon: Users, overline: "About the couple", title: "Who's getting married?" },
  { icon: CalendarIcon, overline: "The big day", title: "When and where?" },
  { icon: Wallet, overline: "The budget", title: "How much are you working with?" },
  { icon: ListChecks, overline: "Your checklist", title: "Want a head start?" },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, fetchMe } = useAuth();

  const [stepIdx, setStepIdx] = useState(0);
  const [partner1, setPartner1] = useState(user?.name || "");
  const [partner2, setPartner2] = useState("");
  const [date, setDate] = useState(undefined);
  const [venue, setVenue] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [budget, setBudget] = useState("");
  const [seedChecklist, setSeedChecklist] = useState(true);
  const [busy, setBusy] = useState(false);

  const meta = STEPS_META[stepIdx];
  const Icon = meta.icon;
  const isLast = stepIdx === STEPS_META.length - 1;
  const isFirst = stepIdx === 0;
  const canNext =
    stepIdx === 0
      ? true
      : stepIdx === 1
      ? partner1.trim().length > 0
      : stepIdx === 2
      ? true // optional
      : stepIdx === 3
      ? Number(budget) >= 0
      : true;

  const submit = async () => {
    setBusy(true);
    try {
      await api.post("/auth/onboard", {
        partner1_name: partner1.trim() || null,
        partner2_name: partner2.trim() || null,
        wedding_date: date ? date.toISOString().slice(0, 10) : null,
        venue_location: venue.trim() || null,
        currency,
        total_budget: Number(budget) || 0,
        seed_checklist: !!seedChecklist,
      });
      await fetchMe(); // refresh user context with onboarded=true
      try {
        sessionStorage.setItem("lumiere_launch_tour", "1");
      } catch (e) {
        // ignore
      }
      navigate("/dashboard", { replace: true });
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10" data-testid="onboarding-page">
      <div className="w-full max-w-xl">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5">
            <Heart className="h-5 w-5 text-[#C5A880] animate-heart-pulse" strokeWidth={1.5} fill="#C5A880" />
            <span className="font-serif text-2xl text-[#2C2C2C]">Lumière</span>
          </div>
        </div>

        {/* Card */}
        <div className="soft-card overflow-hidden animate-fade-up">
          {/* Header band */}
          <div
            className="px-8 pt-8 pb-6"
            style={{
              background: `linear-gradient(135deg, rgba(197, 168, 128, 0.12), rgba(226, 194, 179, 0.06))`,
            }}
          >
            <div className="h-14 w-14 rounded-2xl bg-[#C5A880]/20 flex items-center justify-center mb-4">
              <Icon className="h-6 w-6 text-[#8a6e47]" strokeWidth={1.5} />
            </div>
            <div className="label-overline text-[#C5A880]">{meta.overline}</div>
            <h2 className="font-serif text-2xl text-[#2C2C2C] mt-1.5 leading-snug">
              {meta.title}
            </h2>
          </div>

          {/* Body */}
          <div className="px-8 py-7 min-h-[260px]">
            {stepIdx === 0 && (
              <div className="space-y-3 text-sm text-[#5b574f] leading-relaxed">
                <p>
                  Welcome to Lumière. A few quick questions and we&apos;ll have your wedding home
                  ready to go — names, the date, your budget, and whether you&apos;d like a head start
                  with our planning checklist.
                </p>
                <p className="text-[#76726B]">It takes about 30 seconds. Promise.</p>
              </div>
            )}

            {stepIdx === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-[#76726B] mb-1.5 block">Your name *</label>
                  <input
                    required
                    value={partner1}
                    onChange={(e) => setPartner1(e.target.value)}
                    placeholder="Sophie"
                    data-testid="onb-partner1"
                    className="w-full h-12 rounded-xl border border-[#EAE5DF] px-4 text-sm focus:border-[#C5A880] focus:ring-2 focus:ring-[#C5A880]/15 outline-none transition"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#76726B] mb-1.5 block">Your partner&apos;s name</label>
                  <input
                    value={partner2}
                    onChange={(e) => setPartner2(e.target.value)}
                    placeholder="Daniel"
                    data-testid="onb-partner2"
                    className="w-full h-12 rounded-xl border border-[#EAE5DF] px-4 text-sm focus:border-[#C5A880] focus:ring-2 focus:ring-[#C5A880]/15 outline-none transition"
                  />
                  <p className="text-[11px] text-[#76726B] mt-1.5">
                    We&apos;ll show this on your dashboard. You can change it anytime.
                  </p>
                </div>
              </div>
            )}

            {stepIdx === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-[#76726B] mb-1.5 block">Wedding date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        data-testid="onb-date-trigger"
                        className="w-full h-12 rounded-xl border border-[#EAE5DF] px-4 text-sm flex items-center gap-2 text-[#2C2C2C] hover:bg-[#FAFAF7]"
                      >
                        <CalendarIcon className="h-4 w-4 text-[#76726B]" strokeWidth={1.5} />
                        {date ? date.toLocaleDateString() : "Choose a date (optional)"}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 rounded-2xl" align="start">
                      <CalendarComp mode="single" selected={date} onSelect={setDate} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <label className="text-xs text-[#76726B] mb-1.5 block">Venue or location</label>
                  <input
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    placeholder="Hidden Cove Estate, Sonoma"
                    data-testid="onb-venue"
                    className="w-full h-12 rounded-xl border border-[#EAE5DF] px-4 text-sm focus:border-[#C5A880] focus:ring-2 focus:ring-[#C5A880]/15 outline-none transition"
                  />
                  <p className="text-[11px] text-[#76726B] mt-1.5">Both are optional — skip if not sure yet.</p>
                </div>
              </div>
            )}

            {stepIdx === 3 && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-[#76726B] mb-1.5 block">Currency</label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger
                      data-testid="onb-currency"
                      className="h-12 rounded-xl border-[#EAE5DF]"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      {CURRENCIES.map((c) => (
                        <SelectItem value={c.code} key={c.code}>
                          {c.symbol} · {c.code} — {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-[#76726B] mb-1.5 block">Total budget</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="50000"
                    data-testid="onb-budget"
                    className="w-full h-12 rounded-xl border border-[#EAE5DF] px-4 text-sm focus:border-[#C5A880] focus:ring-2 focus:ring-[#C5A880]/15 outline-none transition"
                  />
                  <p className="text-[11px] text-[#76726B] mt-1.5">
                    Your dashboard math flows from this. Start with a rough guess — refine later.
                  </p>
                </div>
              </div>
            )}

            {stepIdx === 4 && (
              <div className="space-y-3">
                <p className="text-sm text-[#5b574f] mb-2">
                  We&apos;ve put together a 34-task wedding planning checklist, organized from a year
                  out to the day of. Want us to add it to your account?
                </p>
                <button
                  type="button"
                  onClick={() => setSeedChecklist(true)}
                  data-testid="onb-checklist-premade"
                  className={`w-full text-left px-5 py-4 rounded-xl border-2 transition-all ${
                    seedChecklist
                      ? "border-[#9CB4A6] bg-[#9CB4A6]/12"
                      : "border-[#EAE5DF] hover:border-[#9CB4A6]/40"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Sparkles
                      className={`h-5 w-5 mt-0.5 ${
                        seedChecklist ? "text-[#5e7c6b]" : "text-[#9c958a]"
                      }`}
                      strokeWidth={1.5}
                    />
                    <div>
                      <div className="font-medium text-[#2C2C2C]">Use our checklist</div>
                      <div className="text-xs text-[#76726B] mt-0.5">
                        34 tasks across 7 timeline phases. You can edit or remove any of them.
                      </div>
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setSeedChecklist(false)}
                  data-testid="onb-checklist-blank"
                  className={`w-full text-left px-5 py-4 rounded-xl border-2 transition-all ${
                    !seedChecklist
                      ? "border-[#C5A880] bg-[#C5A880]/12"
                      : "border-[#EAE5DF] hover:border-[#C5A880]/40"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <ListChecks
                      className={`h-5 w-5 mt-0.5 ${
                        !seedChecklist ? "text-[#8a6e47]" : "text-[#9c958a]"
                      }`}
                      strokeWidth={1.5}
                    />
                    <div>
                      <div className="font-medium text-[#2C2C2C]">Start blank</div>
                      <div className="text-xs text-[#76726B] mt-0.5">
                        I&apos;ll add my own tasks. You can always import the defaults later.
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Footer with progress dots and buttons */}
          <div className="px-8 pb-7 pt-2 flex flex-col gap-4">
            <div className="flex items-center justify-center gap-1.5">
              {STEPS_META.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === stepIdx ? "w-6 bg-[#C5A880]" : "w-1.5 bg-[#EAE5DF]"
                  }`}
                />
              ))}
            </div>
            <div className="flex items-center justify-between gap-3">
              {!isFirst ? (
                <button
                  type="button"
                  onClick={() => setStepIdx((s) => Math.max(0, s - 1))}
                  data-testid="onb-back"
                  className="btn-ghost"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </button>
              ) : (
                <span />
              )}
              {isLast ? (
                <button
                  type="button"
                  onClick={submit}
                  disabled={busy}
                  data-testid="onb-finish"
                  className="btn-primary"
                >
                  {busy ? "Setting up…" : "Take me in"}
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => canNext && setStepIdx((s) => s + 1)}
                  disabled={!canNext}
                  data-testid="onb-next"
                  className="btn-primary"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
