import { useEffect, useState } from "react";
import { api, CURRENCIES, formatApiError } from "@/lib/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComp } from "@/components/ui/calendar";
import { Calendar as CalendarIcon, AlertTriangle, X, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

// ── Delete Account Modal ───────────────────────────────────────────────────────
function DeleteAccountModal({ isOpen, onClose }) {
  const [step, setStep] = useState(1);
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  if (!isOpen) return null;

  const canDelete = confirmText === "DELETE";

  const handleExport = async () => {
    try {
      const { data } = await api.get("/account/export");
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "my-lumiere-data.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Could not export data. Please try again.");
    }
  };

  const handleDelete = async () => {
    if (!canDelete) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/auth/account`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("lumiere_token") || ""}`,
        },
        body: JSON.stringify({ confirmation: "DELETE" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Deletion failed.");
      }
      setDone(true);
      setTimeout(() => { window.location.href = "/"; }, 3000);
    } catch (e) {
      setError(formatApiError(e.response?.data?.detail) || "Deletion failed. Contact support.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)" }}
      data-testid="delete-account-modal"
    >
      <div className="relative w-full max-w-md rounded-2xl p-8 bg-white" style={{ border: "1px solid #EAE5DF", boxShadow: "0 24px 64px rgba(0,0,0,0.12)" }}>
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-[#F5F0EB] text-[#76726B]">
          <X className="h-4 w-4" strokeWidth={1.5} />
        </button>

        {done ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "#FDF0F0" }}>
              <AlertTriangle className="h-6 w-6" strokeWidth={1.5} style={{ color: "#D48A8A" }} />
            </div>
            <h2 className="font-serif text-2xl mb-2">Account Deleted</h2>
            <p className="text-sm text-[#76726B]">Your account and all data have been permanently removed. Redirecting…</p>
          </div>
        ) : step === 1 ? (
          <>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5" style={{ background: "#FDF0F0" }}>
              <AlertTriangle className="h-5 w-5" strokeWidth={1.5} style={{ color: "#D48A8A" }} />
            </div>
            <h2 className="font-serif text-2xl mb-2">Delete Account</h2>
            <p className="text-sm text-[#76726B] mb-6 leading-relaxed">
              This will permanently delete your account and all associated data — your budget, guest list, vendors, and wedding profile. This cannot be undone.
            </p>
            <button onClick={handleExport} data-testid="export-data-btn"
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm mb-3 border border-[#EAE5DF] text-[#76726B] hover:bg-[#FAFAFA] transition">
              <Download className="h-4 w-4" strokeWidth={1.5} />
              Download my data first
            </button>
            <button onClick={() => setStep(2)} data-testid="proceed-to-delete-btn"
              className="w-full py-3 rounded-xl text-sm font-medium text-white transition"
              style={{ background: "#D48A8A" }}>
              Continue to Delete
            </button>
          </>
        ) : (
          <>
            <h2 className="font-serif text-2xl mb-2">Confirm Deletion</h2>
            <p className="text-sm text-[#76726B] mb-6">
              Type <strong className="font-mono" style={{ color: "#D48A8A" }}>DELETE</strong> to permanently remove your account.
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder="Type DELETE to confirm"
              data-testid="delete-confirm-input"
              autoFocus
              className="w-full h-12 px-4 rounded-xl text-sm outline-none mb-4 font-mono tracking-wider transition"
              style={{ border: `1px solid ${canDelete ? "#D48A8A" : "#EAE5DF"}` }}
            />
            {error && <p className="text-xs mb-3" style={{ color: "#D48A8A" }}>{error}</p>}
            <button onClick={handleDelete} disabled={!canDelete || loading} data-testid="confirm-delete-btn"
              className="w-full py-3 rounded-xl text-sm font-medium text-white transition disabled:opacity-40 flex items-center justify-center gap-2"
              style={{ background: "#D48A8A" }}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Deleting…" : "Permanently Delete My Account"}
            </button>
            <button onClick={() => setStep(1)} className="w-full mt-2 py-2 rounded-xl text-sm text-[#76726B] hover:bg-[#FAFAFA] transition">
              Go back
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main Settings page ─────────────────────────────────────────────────────────
export default function Settings() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await api.get("/profile");
      setProfile(data);
      setLoading(false);
    })();
  }, []);

  const update = (key, value) => setProfile((p) => ({ ...p, [key]: value }));

  const save = async () => {
    setBusy(true);
    try {
      await api.put("/profile", {
        partner1_name: profile.partner1_name || "",
        partner2_name: profile.partner2_name || "",
        wedding_date: profile.wedding_date || null,
        venue_location: profile.venue_location || "",
        currency: profile.currency || "USD",
        total_budget: Number(profile.total_budget) || 0,
      });
      toast.success("Saved");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading || !profile) {
    return (
      <div className="py-20 flex justify-center">
        <div className="h-10 w-10 rounded-full border-2 border-[#C5A880] border-t-transparent animate-spin" />
      </div>
    );
  }

  const wd = profile.wedding_date ? new Date(profile.wedding_date) : undefined;

  return (
    <div className="space-y-8 max-w-3xl" data-testid="settings-page">
      <div>
        <span className="label-overline">Your wedding</span>
        <h1 className="font-serif text-4xl mt-2">Settings</h1>
        <p className="text-[#5b574f] mt-1">The details that shape your dashboard.</p>
      </div>

      <div className="soft-card p-6 lg:p-8 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label-overline">Partner 1 name</label>
            <input value={profile.partner1_name || ""} onChange={(e) => update("partner1_name", e.target.value)}
              data-testid="settings-partner1"
              className="mt-1.5 w-full h-11 rounded-xl border border-[#EAE5DF] px-4 text-sm focus:border-[#C5A880] focus:ring-2 focus:ring-[#C5A880]/15 outline-none" />
          </div>
          <div>
            <label className="label-overline">Partner 2 name</label>
            <input value={profile.partner2_name || ""} onChange={(e) => update("partner2_name", e.target.value)}
              data-testid="settings-partner2"
              className="mt-1.5 w-full h-11 rounded-xl border border-[#EAE5DF] px-4 text-sm focus:border-[#C5A880] focus:ring-2 focus:ring-[#C5A880]/15 outline-none" />
          </div>
          <div>
            <label className="label-overline">Wedding date</label>
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" data-testid="settings-date-trigger"
                  className="mt-1.5 w-full h-11 rounded-xl border border-[#EAE5DF] px-4 text-sm flex items-center gap-2 text-[#2C2C2C] hover:bg-[#FAFAF7]">
                  <CalendarIcon className="h-4 w-4 text-[#76726B]" strokeWidth={1.5} />
                  {wd ? wd.toLocaleDateString() : "Choose a date"}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 rounded-2xl" align="start">
                <CalendarComp mode="single" selected={wd}
                  onSelect={(d) => update("wedding_date", d ? d.toISOString().slice(0, 10) : null)}
                  initialFocus />
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <label className="label-overline">Venue / Location</label>
            <input value={profile.venue_location || ""} onChange={(e) => update("venue_location", e.target.value)}
              data-testid="settings-venue"
              className="mt-1.5 w-full h-11 rounded-xl border border-[#EAE5DF] px-4 text-sm focus:border-[#C5A880] focus:ring-2 focus:ring-[#C5A880]/15 outline-none" />
          </div>
          <div>
            <label className="label-overline">Currency</label>
            <Select value={profile.currency || "USD"} onValueChange={(v) => update("currency", v)}>
              <SelectTrigger data-testid="settings-currency" className="mt-1.5 h-11 rounded-xl border-[#EAE5DF]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {CURRENCIES.map((c) => (
                  <SelectItem value={c.code} key={c.code}>{c.symbol} · {c.code} — {c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="label-overline">Total budget</label>
            <input type="number" min={0} step="0.01" value={profile.total_budget || 0}
              onChange={(e) => update("total_budget", e.target.value)}
              data-testid="settings-budget"
              className="mt-1.5 w-full h-11 rounded-xl border border-[#EAE5DF] px-4 text-sm focus:border-[#C5A880] focus:ring-2 focus:ring-[#C5A880]/15 outline-none" />
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <button onClick={save} disabled={busy} className="btn-primary" data-testid="settings-save">
            {busy ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>

      {/* Account info */}
      <div className="soft-card p-6 text-sm text-[#5b574f]">
        <span className="label-overline">Account</span>
        <p className="mt-2">
          Signed in as <span className="text-[#2C2C2C] font-medium">{user?.email}</span>
        </p>
      </div>

      {/* Danger zone */}
      <div className="soft-card p-6" style={{ border: "1px solid #F0DADA" }}>
        <span className="label-overline" style={{ color: "#D48A8A" }}>Danger zone</span>
        <p className="text-sm text-[#76726B] mt-2 mb-4">
          Permanently delete your account and all associated data. This cannot be undone.
        </p>
        <button
          onClick={() => setShowDelete(true)}
          data-testid="open-delete-account-btn"
          className="px-5 py-2.5 rounded-full text-sm font-medium transition"
          style={{ border: "1px solid #D48A8A", color: "#D48A8A", background: "transparent" }}
          onMouseOver={e => e.currentTarget.style.background = "#FDF0F0"}
          onMouseOut={e => e.currentTarget.style.background = "transparent"}
        >
          Delete my account
        </button>
      </div>

      <DeleteAccountModal isOpen={showDelete} onClose={() => setShowDelete(false)} />
    </div>
  );
}
