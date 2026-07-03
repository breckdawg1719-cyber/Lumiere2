/**
 * DeleteAccountModal.jsx
 * Secure account deletion with two-step confirmation.
 * Drop into your Settings page.
 */

import { useState } from "react";
import { AlertTriangle, X, Download, Loader2 } from "lucide-react";

export default function DeleteAccountModal({ isOpen, onClose }) {
  const [step, setStep] = useState(1);           // 1 = warning, 2 = confirm input
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  if (!isOpen) return null;

  const canDelete = confirmText === "DELETE";

  const handleExport = async () => {
    try {
      const res = await fetch("/api/account/export", {
        headers: { Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}` },
      });
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "my-wedding-data.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // non-blocking
    }
  };

  const handleDelete = async () => {
    if (!canDelete) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/account/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}`,
        },
        body: JSON.stringify({ confirmation: "DELETE" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Deletion failed. Contact support.");
      }
      setDone(true);
      localStorage.removeItem("auth_token");
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
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg transition-colors"
          style={{ color: "#76726B" }}
          onMouseOver={e => e.currentTarget.style.background = "#F5F0EB"}
          onMouseOut={e => e.currentTarget.style.background = "transparent"}
        >
          <X size={18} strokeWidth={1.5} />
        </button>

        {done ? (
          <div className="text-center py-4">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: "#F5F0EB" }}
            >
              <AlertTriangle size={24} strokeWidth={1.5} style={{ color: "#D48A8A" }} />
            </div>
            <h2
              className="text-2xl font-serif mb-2"
              style={{ fontFamily: "'Playfair Display', serif", color: "#2C2C2C" }}
            >
              Account Deleted
            </h2>
            <p className="text-sm" style={{ color: "#76726B" }}>
              Your account and all data have been permanently removed. Redirecting you now…
            </p>
          </div>
        ) : step === 1 ? (
          <>
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
              style={{ background: "#FDF0F0", border: "1px solid #D48A8A22" }}
            >
              <AlertTriangle size={22} strokeWidth={1.5} style={{ color: "#D48A8A" }} />
            </div>

            <h2
              className="text-2xl font-serif mb-2"
              style={{ fontFamily: "'Playfair Display', serif", color: "#2C2C2C" }}
            >
              Delete Account
            </h2>
            <p className="text-sm mb-6" style={{ color: "#76726B", lineHeight: 1.7 }}>
              This will permanently delete your account and all associated data — your budget,
              guest list, vendor saves, and wedding profile. This cannot be undone.
            </p>

            <button
              onClick={handleExport}
              data-testid="export-data-btn"
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm mb-3 transition-all duration-300"
              style={{
                border: "1px solid #EAE5DF",
                color: "#76726B",
                background: "#FAFAFA",
              }}
            >
              <Download size={15} strokeWidth={1.5} />
              Download my data first
            </button>

            <button
              onClick={() => setStep(2)}
              data-testid="proceed-to-delete-btn"
              className="w-full py-3 rounded-xl text-sm font-medium text-white transition-all duration-300"
              style={{ background: "#D48A8A" }}
            >
              Continue to Delete
            </button>
          </>
        ) : (
          <>
            <h2
              className="text-2xl font-serif mb-2"
              style={{ fontFamily: "'Playfair Display', serif", color: "#2C2C2C" }}
            >
              Confirm Deletion
            </h2>
            <p className="text-sm mb-6" style={{ color: "#76726B" }}>
              Type <strong style={{ color: "#D48A8A", fontFamily: "monospace" }}>DELETE</strong> in
              the field below to permanently remove your account.
            </p>

            <input
              type="text"
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder="Type DELETE to confirm"
              data-testid="delete-confirm-input"
              className="w-full h-12 px-4 rounded-xl text-sm outline-none mb-4 transition-all"
              style={{
                border: `1px solid ${canDelete ? "#D48A8A" : "#EAE5DF"}`,
                background: "#FFFFFF",
                color: "#2C2C2C",
                fontFamily: "monospace",
                letterSpacing: "0.05em",
              }}
              autoFocus
            />

            {error && (
              <p className="text-xs mb-3" style={{ color: "#D48A8A" }}>{error}</p>
            )}

            <button
              onClick={handleDelete}
              disabled={!canDelete || loading}
              data-testid="confirm-delete-btn"
              className="w-full py-3 rounded-xl text-sm font-medium text-white transition-all duration-300 disabled:opacity-40 flex items-center justify-center gap-2"
              style={{ background: "#D48A8A" }}
            >
              {loading && <Loader2 size={15} className="animate-spin" />}
              {loading ? "Deleting…" : "Permanently Delete My Account"}
            </button>

            <button
              onClick={() => setStep(1)}
              className="w-full mt-2 py-2 rounded-xl text-sm transition-all duration-300"
              style={{ color: "#76726B" }}
            >
              Go back
            </button>
          </>
        )}
      </div>
    </div>
  );
}
