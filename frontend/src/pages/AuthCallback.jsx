import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api, formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
export default function AuthCallback() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const run = async () => {
      const hash = window.location.hash || "";
      const params = new URLSearchParams(hash.replace(/^#/, ""));
      const sessionId = params.get("session_id");
      if (!sessionId) {
        navigate("/login", { replace: true });
        return;
      }
      try {
        const { data } = await api.post("/auth/google/session", { session_id: sessionId });
        setUser(data);
        toast.success("Signed in with Google");
        // Clean URL hash and redirect appropriately
        window.history.replaceState(null, "", "/");
        if (data?.onboarded === false) {
          navigate("/onboarding", { replace: true, state: { user: data } });
        } else {
          navigate("/dashboard", { replace: true, state: { user: data } });
        }
      } catch (e) {
        const msg = formatApiError(e.response?.data?.detail) || e.message;
        toast.error(msg);
        navigate("/login", { replace: true });
      }
    };
    run();
  }, [navigate, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAF7]">
      <div className="flex flex-col items-center gap-3" data-testid="auth-callback">
        <div className="h-10 w-10 rounded-full border-2 border-[#C5A880] border-t-transparent animate-spin" />
        <p className="label-overline">Finalizing sign-in</p>
      </div>
    </div>
  );
}
