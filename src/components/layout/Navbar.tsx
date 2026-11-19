import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Wrench,
  ShoppingCart,
  Receipt,
  Users,
  Building2,
  Wallet,
  Bell,
  Settings,
  Sun,
  Moon,
  Search,
  Menu,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { reminderStorage } from "@/lib/storage";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { to: "/reparations", label: "SAV / Réparations", icon: Wrench },
  { to: "/stock", label: "Stock & Pièces", icon: Package },
  { to: "/ventes", label: "Ventes / Caisse", icon: Receipt },
  { to: "/finances", label: "Finances", icon: Wallet },
  { to: "/commandes", label: "Commandes", icon: ShoppingCart },
  { to: "/clients", label: "Clients", icon: Users },
  { to: "/revendeurs", label: "Revendeurs", icon: Building2 },
  { to: "/rappels", label: "Rappels", icon: Bell },
];

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem("theme") === "dark");
  const [dueCount, setDueCount] = useState(0);

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [dark]);

  useEffect(() => {
    const updateCount = () => {
      const due = reminderStorage.getDue();
      setDueCount(due.length);
    };
    updateCount();
    const interval = setInterval(updateCount, 15000);
    return () => clearInterval(interval);
  }, []);

  const now = new Date();
  const dateStr = now.toLocaleDateString("fr-TN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return (
    <header className="sticky top-0 z-50 w-full bg-slate-900 border-b border-slate-800 text-white shadow-md">
      {/* Main Top Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        {/* Left: Brand & Logo */}
        <div className="flex items-center gap-3">
          <NavLink to="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center overflow-hidden bg-slate-800 border border-blue-500/40 shadow">
              <img
                src="./logo.png"
                alt="Logo"
                className="w-7 h-7 object-contain"
                onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-white tracking-tight leading-none group-hover:text-blue-400 transition-colors">
                  Boutique Informatique & SAV
                </span>
                <span className="text-[10px] bg-red-600/90 text-white px-1.5 py-0.2 rounded font-semibold" title="Tunisie">
                  TN 🇹🇳
                </span>
              </div>
              <p className="text-[11px] font-medium text-amber-400 mt-0.5 leading-none">
                Atelier Réparation & Vente
              </p>
            </div>
          </NavLink>
        </div>

        {/* Center: Desktop Navigation Bar */}
        <nav className="hidden xl:flex items-center gap-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
            const isActive = location.pathname === to;
            return (
              <NavLink
                key={to}
                to={to}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all relative",
                  isActive
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/80"
                )}
              >
                <Icon className={cn("w-3.5 h-3.5", isActive ? "text-white" : "text-slate-400")} />
                <span>{label}</span>
                {to === "/rappels" && dueCount > 0 && (
                  <span className="ml-1 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                    {dueCount}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {/* Notifications bell */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/rappels")}
            className="relative h-9 w-9 text-slate-300 hover:text-white hover:bg-slate-800"
            title="Rappels d'appels clients"
          >
            <Bell className="w-4 h-4" />
            {dueCount > 0 && (
              <span className="absolute 1 top-1 right-1 min-w-[16px] h-4 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-pulse">
                {dueCount}
              </span>
            )}
          </Button>

          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDark(!dark)}
            className="h-9 w-9 text-slate-300 hover:text-white hover:bg-slate-800"
            title={dark ? "Mode clair" : "Mode sombre"}
          >
            {dark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </Button>

          {/* Settings */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/parametres")}
            className={cn(
              "h-9 w-9 text-slate-300 hover:text-white hover:bg-slate-800",
              location.pathname === "/parametres" && "bg-slate-800 text-white"
            )}
            title="Paramètres & Sauvegardes"
          >
            <Settings className="w-4 h-4" />
          </Button>

          {/* Mobile menu trigger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Sub-bar for medium screens (when xl breakpoint isn't reached) */}
      <div className="hidden md:flex xl:hidden border-t border-slate-800/80 bg-slate-900/90 px-4 py-2 overflow-x-auto gap-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
          const isActive = location.pathname === to;
          return (
            <NavLink
              key={to}
              to={to}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors",
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:text-white hover:bg-slate-800"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
              {to === "/rappels" && dueCount > 0 && (
                <span className="ml-1 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                  {dueCount}
                </span>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-900 px-4 py-3 space-y-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
            const isActive = location.pathname === to;
            return (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors",
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:text-white hover:bg-slate-800"
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
                {to === "/rappels" && dueCount > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">
                    {dueCount}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>
      )}
    </header>
  );
}
