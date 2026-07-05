/**
 * DeleteAccountModal.jsx
 * Secure account deletion with two-step confirmation.
 * Type DELETE to confirm — no data export option.
 */

import { useState } from "react";
import { AlertTriangle, X, Loader2 } from "lucide-react";

export default function DeleteAccountModal({ isOpen, onClose }) {
  const [step, setStep] = useState(1);
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  if (!isOpen) return null;

  const canDelete = confirmText === "DELETE";

  const handleDelete = async () => {
    if (!canDelete) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/auth/account`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("lumiere_token") || ""}`,
          },
          body: JSON.stringify({ confirmation: "DELETE" }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Deletion failed. Contact support.");
      }
      setDone(true);
      localStorage.removeItem("lumiere_token");
      setTimeout(() => { window.location.href = "/"; }, 3000);
    } catch (err) {
      setError(err.message);
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
      <div
        className="relative w-full max-w-md rounded-2xl p-8 bg-white"
        style={{ border: "1px solid #EAE5DF", boxShadow: "0 24px 64px rgba(0,0,0,0.12)" }}
      >
        <button onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-[#F5F0EB] text-[#76726B] transition-colors">
          <X className="h-4 w-4" strokeWidth={1.5} />
        </button>

        {done ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: "#FDF0F0" }}>
              <AlertTriangle className="h-6 w-6" strokeWidth={1.5} style={{ color: "#D48A8A" }} />
            </div>
            <h2 className="font-serif text-2xl mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
              Account Deleted
            </h2>
            <p className="text-sm" style={{ color: "#76726B" }}>
              Your account and all data have been permanently removed. Redirecting…
            </p>
          </div>
        ) : step === 1 ? (
          <>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
              style={{ background: "#FDF0F0" }}>
              <AlertTriangle className="h-5 w-5" strokeWidth={1.5} style={{ color: "#D48A8A" }} />
            </div>
            <h2 className="font-serif text-2xl mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
              Delete Account
            </h2>
            <p className="text-sm mb-6 leading-relaxed" style={{ color: "#76726B" }}>
              This will permanently delete your account and all associated data — your budget,
              guest list, vendors, and wedding profile. <strong>This cannot be undone.</strong>
            </p>
            <button onClick={() => setStep(2)} data-testid="proceed-to-delete-btn"
              className="w-full py-3 rounded-xl text-sm font-medium text-white transition-all"
              style={{ background: "#D48A8A" }}>
              Continue to Delete
            </button>
            <button onClick={onClose}
              className="w-full mt-2 py-2 rounded-xl text-sm transition-all hover:bg-[#FAFAFA]"
              style={{ color: "#76726B" }}>
              Cancel
            </button>
          </>
        ) : (
          <>
            <h2 className="font-serif text-2xl mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
              Confirm Deletion
            </h2>
            <p className="text-sm mb-5" style={{ color: "#76726B" }}>
              Type <strong className="font-mono" style={{ color: "#D48A8A" }}>DELETE</strong> (all caps)
              to permanently remove your account.
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder="Type DELETE to confirm"
              data-testid="delete-confirm-input"
              autoFocus
              className="w-full h-12 px-4 rounded-xl text-sm outline-none mb-4 font-mono tracking-wider transition-all"
              style={{ border: `1.5px solid ${canDelete ? "#D48A8A" : "#EAE5DF"}`, background: "#FAFAFA" }}
            />
            {error && <p className="text-xs mb-3" style={{ color: "#D48A8A" }}>{error}</p>}
            <button onClick={handleDelete} disabled={!canDelete || loading}
              data-testid="confirm-delete-btn"
              className="w-full py-3 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-40 flex items-center justify-center gap-2"
              style={{ background: "#D48A8A" }}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Deleting…" : "Permanently Delete My Account"}
            </button>
            <button onClick={() => setStep(1)}
              className="w-full mt-2 py-2 rounded-xl text-sm transition-all hover:bg-[#FAFAFA]"
              style={{ color: "#76726B" }}>
              Go back
            </button>
          </>
        )}
      </div>
    </div>
  );
}
