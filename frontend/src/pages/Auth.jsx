import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Heart, Mail, Lock, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { GoogleLogin } from "@react-oauth/google";

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || "";

export default function Auth({ mode = "login" }) {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const isSignup = mode === "signup";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const path = isSignup ? "/auth/register" : "/auth/login";
      const body = isSignup ? { email, password, name } : { email, password };
      const { data } = await api.post(path, body);
      // data contains user info + token
      setUser(data, data.token || data.session_token);
      toast.success(isSignup ? "Welcome aboard" : "Welcome back");
      if (isSignup || data?.onboarded === false) {
        navigate("/onboarding", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    } catch (e) {
      const msg = formatApiError(e.response?.data?.detail) || e.message;
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const { data } = await api.post("/auth/google/id-token", {
        id_token: credentialResponse.credential,
      });
      setUser(data, data.token || data.session_token);
      toast.success("Signed in with Google");
      if (data?.onboarded === false) {
        navigate("/onboarding", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    } catch (e) {
      const msg = formatApiError(e.response?.data?.detail) || e.message;
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2" data-testid="auth-page">
      {/* Left image */}
      <div className="relative hidden lg:block">
        <img
          src="https://images.unsplash.com/photo-1674758445398-c2989470fa8a?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NzV8MHwxfHNlYXJjaHwxfHxlbGVnYW50JTIwbWluaW1hbGlzdCUyMGZsb3JhbCUyMHdlZGRpbmd8ZW58MHx8fHwxNzgyNTI5NTE2fDA&ixlib=rb-4.1.0&q=85"
          alt="Elegant floral wedding background"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-[#2C2C2C]/35 via-transparent to-transparent" />
        <div className="absolute bottom-10 left-10 right-10 text-white">
          <Link to="/" className="flex items-center gap-2 mb-6 opacity-90">
            <Heart className="h-5 w-5" strokeWidth={1.5} fill="white" />
            <span className="font-serif text-2xl">Lumière</span>
          </Link>
          <h2 className="font-serif text-4xl leading-tight">
            A budget worthy of the moment.
          </h2>
          <p className="mt-3 text-white/85 max-w-md">
            Track every detail of your wedding with grace — from the venue to the
            very last bouquet.
          </p>
        </div>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center px-6 sm:px-12 py-12">
        <div className="w-full max-w-md animate-fade-up">
          <Link to="/" className="lg:hidden flex items-center gap-2 mb-8">
            <Heart className="h-5 w-5 text-[#C5A880]" strokeWidth={1.5} fill="#C5A880" />
            <span className="font-serif text-2xl text-[#2C2C2C]">Lumière</span>
          </Link>

          <span className="label-overline">
            {isSignup ? "Begin Your Journey" : "Welcome Back"}
          </span>
          <h1 className="font-serif text-4xl text-[#2C2C2C] mt-3">
            {isSignup ? "Create your account" : "Sign in to continue"}
          </h1>
          <p className="text-[#5b574f] mt-2">
            {isSignup
              ? "A calm, beautiful place to plan everything."
              : "Pick up exactly where you left off."}
          </p>

          <div className="mt-8">
            {GOOGLE_CLIENT_ID ? (
              <div className="flex justify-center" data-testid="google-login-wrap">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => toast.error("Google sign-in was cancelled or failed")}
                  text={isSignup ? "signup_with" : "signin_with"}
                  shape="pill"
                  theme="outline"
                  size="large"
                  width="360"
                />
              </div>
            ) : (
              <div
                data-testid="google-login-placeholder"
                className="w-full text-center text-xs text-[#76726B] bg-[#FAFAF7] border border-dashed border-[#EAE5DF] rounded-full px-4 py-3"
              >
                Google sign-in will appear here once a Client ID is configured.
              </div>
            )}
          </div>

          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-[#EAE5DF]" />
            <span className="text-xs uppercase tracking-[0.22em] text-[#9c958a]">or</span>
            <div className="flex-1 h-px bg-[#EAE5DF]" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" data-testid="auth-form">
            {isSignup && (
              <div className="space-y-1.5">
                <label className="label-overline">Your name</label>
                <div className="relative">
                  <UserIcon className="h-4 w-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#9c958a]" />
                  <input
                    data-testid="auth-name-input"
                    required
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex & Jamie"
                    className="w-full h-12 rounded-xl border border-[#EAE5DF] bg-white pl-11 pr-4 text-sm focus:border-[#C5A880] focus:ring-2 focus:ring-[#C5A880]/15 outline-none transition"
                  />
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <label className="label-overline">Email</label>
              <div className="relative">
                <Mail className="h-4 w-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#9c958a]" />
                <input
                  data-testid="auth-email-input"
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="hello@yourwedding.com"
                  className="w-full h-12 rounded-xl border border-[#EAE5DF] bg-white pl-11 pr-4 text-sm focus:border-[#C5A880] focus:ring-2 focus:ring-[#C5A880]/15 outline-none transition"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="label-overline">Password</label>
              <div className="relative">
                <Lock className="h-4 w-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#9c958a]" />
                <input
                  data-testid="auth-password-input"
                  required
                  type="password"
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-12 rounded-xl border border-[#EAE5DF] bg-white pl-11 pr-4 text-sm focus:border-[#C5A880] focus:ring-2 focus:ring-[#C5A880]/15 outline-none transition"
                />
              </div>
            </div>

            {error && (
              <div
                data-testid="auth-error"
                className="text-sm text-[#a55656] bg-[#D48A8A]/10 border border-[#D48A8A]/30 rounded-xl px-4 py-2.5"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              data-testid="auth-submit-btn"
              disabled={busy}
              className="btn-primary w-full h-12 mt-2"
            >
              {busy ? "Please wait…" : isSignup ? "Create account" : "Sign in"}
            </button>
          </form>

          <p className="text-sm text-[#5b574f] mt-6 text-center">
            {isSignup ? (
              <>
                Already booked?{" "}
                <Link to="/login" data-testid="switch-to-login" className="text-[#8a6e47] underline-offset-4 hover:underline">
                  Sign in
                </Link>
              </>
            ) : (
              <>
                New here?{" "}
                <Link to="/signup" data-testid="switch-to-signup" className="text-[#8a6e47] underline-offset-4 hover:underline">
                  Create an account
                </Link>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
