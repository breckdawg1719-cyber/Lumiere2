import "@/App.css";
import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import Maintenance from "@/pages/Maintenance";

import Landing from "@/pages/Landing";
import Auth from "@/pages/Auth";
import AuthCallback from "@/pages/AuthCallback";
import Onboarding from "@/pages/Onboarding";
import AppLayout from "@/components/AppLayout";
import Dashboard from "@/pages/Dashboard";
import Categories from "@/pages/Categories";
import Expenses from "@/pages/Expenses";
import Guests from "@/pages/Guests";
import Vendors from "@/pages/Vendors";
import Checklist from "@/pages/Checklist";
import Settings from "@/pages/Settings";

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAF7]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 rounded-full border-2 border-[#C5A880] border-t-transparent animate-spin" />
        <p className="label-overline">Loading</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children, allowWhileOnboarding = false }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  // If user hasn't been through onboarding yet, force them to /onboarding
  if (user.onboarded === false && !allowWhileOnboarding && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }
  return children;
}

function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRouter() {
  const location = useLocation();
  // Synchronous detection (NOT in useEffect) - handles OAuth race condition
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route
        path="/login"
        element={
          <PublicOnly>
            <Auth mode="login" />
          </PublicOnly>
        }
      />
      <Route
        path="/signup"
        element={
          <PublicOnly>
            <Auth mode="signup" />
          </PublicOnly>
        }
      />
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute allowWhileOnboarding>
            <Onboarding />
          </ProtectedRoute>
        }
      />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/guests" element={<Guests />} />
        <Route path="/vendors" element={<Vendors />} />
        <Route path="/checklist" element={<Checklist />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  const [maintenance, setMaintenance] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const backendUrl = process.env.REACT_APP_BACKEND_URL;
    fetch(`${backendUrl}/api/status`)
      .then((res) => res.json())
      .then((data) => setMaintenance(!!data.maintenance))
      .catch(() => setMaintenance(false)) // if status check fails, don't block the app
      .finally(() => setChecked(true));
  }, []);

  // Show nothing until we've checked — avoids a flash of the app before redirecting
  if (!checked) return null;

  if (maintenance) {
    return <Maintenance />;
  }

  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <AppRouter />
          <Toaster position="bottom-right" richColors closeButton />
          <Analytics />
          <SpeedInsights />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
