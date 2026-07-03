import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard,
  ListChecks,
  Receipt,
  Users,
  Briefcase,
  Settings,
  LogOut,
  Heart,
  Menu,
  X,
  HelpCircle,
  CheckSquare,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import TutorialTour, { hasSeenTutorial } from "@/components/TutorialTour";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, testId: "nav-dashboard" },
  { to: "/categories", label: "Categories", icon: ListChecks, testId: "nav-categories" },
  { to: "/expenses", label: "Expenses", icon: Receipt, testId: "nav-expenses" },
  { to: "/guests", label: "Guests", icon: Users, testId: "nav-guests" },
  { to: "/vendors", label: "Vendors", icon: Briefcase, testId: "nav-vendors" },
  { to: "/checklist", label: "Checklist", icon: CheckSquare, testId: "nav-checklist" },
  { to: "/settings", label: "Settings", icon: Settings, testId: "nav-settings" },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [openSidebar, setOpenSidebar] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  // Auto-open the tutorial on first ever login OR right after onboarding completes
  useEffect(() => {
    let justOnboarded = false;
    try {
      justOnboarded = sessionStorage.getItem("lumiere_launch_tour") === "1";
      if (justOnboarded) sessionStorage.removeItem("lumiere_launch_tour");
    } catch (e) {
      // ignore
    }
    if (justOnboarded || !hasSeenTutorial()) {
      const t = setTimeout(() => setShowTutorial(true), 600);
      return () => clearTimeout(t);
    }
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const initials = (user?.name || user?.email || "U")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen flex" data-testid="app-layout">
      {/* Sidebar - desktop */}
      <aside className="hidden lg:flex w-64 flex-col bg-white/70 backdrop-blur-xl border-r border-[#EAE5DF] sticky top-0 h-screen">
        <div className="px-7 py-7 flex items-center gap-2.5">
          <Heart className="h-5 w-5 text-[#C5A880] animate-heart-pulse" strokeWidth={1.5} fill="#C5A880" />
          <span className="font-serif text-xl text-[#2C2C2C]">Lumière</span>
        </div>
        <nav className="flex-1 px-3 py-2 flex flex-col gap-1" data-testid="sidebar-nav">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              data-testid={n.testId}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-colors ${
                  isActive
                    ? "bg-[#C5A880]/12 text-[#8a6e47] font-medium"
                    : "text-[#5b574f] hover:bg-[#EAE5DF]/50"
                }`
              }
            >
              <n.icon className="h-4 w-4" strokeWidth={1.5} />
              <span>{n.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="px-4 py-5 border-t border-[#EAE5DF]">
          <div className="text-[10px] uppercase tracking-[0.2em] text-[#9c958a]">
            For the special day
          </div>
          <p className="font-serif text-sm text-[#2C2C2C] mt-1">
            Plan, track and celebrate.
          </p>
        </div>
      </aside>

      {/* Mobile sidebar */}
      {openSidebar && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setOpenSidebar(false)}
          />
          <aside className="relative w-72 bg-white border-r border-[#EAE5DF] flex flex-col">
            <div className="px-6 py-6 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Heart className="h-5 w-5 text-[#C5A880]" strokeWidth={1.5} fill="#C5A880" />
                <span className="font-serif text-xl">Lumière</span>
              </div>
              <button
                data-testid="sidebar-close-btn"
                onClick={() => setOpenSidebar(false)}
                className="text-[#76726B]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-2 flex flex-col gap-1">
              {NAV.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  onClick={() => setOpenSidebar(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-colors ${
                      isActive
                        ? "bg-[#C5A880]/12 text-[#8a6e47] font-medium"
                        : "text-[#5b574f] hover:bg-[#EAE5DF]/50"
                    }`
                  }
                >
                  <n.icon className="h-4 w-4" strokeWidth={1.5} />
                  <span>{n.label}</span>
                </NavLink>
              ))}
            </nav>
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 min-w-0">
        <header className="sticky top-0 z-30 bg-white/75 backdrop-blur-xl border-b border-[#EAE5DF]">
          <div className="px-5 lg:px-10 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                data-testid="sidebar-open-btn"
                className="lg:hidden text-[#76726B]"
                onClick={() => setOpenSidebar(true)}
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="lg:hidden flex items-center gap-2">
                <Heart className="h-4 w-4 text-[#C5A880]" strokeWidth={1.5} fill="#C5A880" />
                <span className="font-serif text-lg">Lumière</span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowTutorial(true)}
                data-testid="open-tutorial-btn"
                title="Replay the welcome tour"
                className="p-2 rounded-full hover:bg-[#EAE5DF]/50 text-[#76726B] transition-colors"
              >
                <HelpCircle className="h-5 w-5" strokeWidth={1.5} />
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    data-testid="user-menu-trigger"
                    className="flex items-center gap-3 px-2 py-1.5 rounded-full hover:bg-[#EAE5DF]/50 transition-colors"
                  >
                    <Avatar className="h-9 w-9 ring-1 ring-[#EAE5DF]">
                      {user?.picture && <AvatarImage src={user.picture} alt={user.name} />}
                      <AvatarFallback className="bg-[#C5A880]/15 text-[#8a6e47] text-xs">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden sm:block text-left">
                      <div className="text-sm font-medium text-[#2C2C2C] leading-tight">
                        {user?.name}
                      </div>
                      <div className="text-[11px] text-[#76726B]">{user?.email}</div>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>My account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    data-testid="menu-tutorial"
                    onClick={() => setShowTutorial(true)}
                  >
                    <HelpCircle className="h-4 w-4 mr-2" strokeWidth={1.5} /> Replay tour
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    data-testid="menu-settings"
                    onClick={() => navigate("/settings")}
                  >
                    <Settings className="h-4 w-4 mr-2" strokeWidth={1.5} /> Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem data-testid="menu-logout" onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-2" strokeWidth={1.5} /> Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="px-5 lg:px-10 py-8 lg:py-12 max-w-[1280px] mx-auto animate-fade-up">
          <Outlet />
        </main>
      </div>

      <TutorialTour open={showTutorial} onOpenChange={setShowTutorial} onClose={() => setShowTutorial(false)} />
    </div>
  );
}
