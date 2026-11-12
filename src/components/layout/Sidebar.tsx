import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Wrench,
  ShoppingCart,
  Receipt,
  Users,
  Truck,
  ChevronLeft,
  ChevronRight,
  Monitor,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { to: "/stock", label: "Inventaire / Stock", icon: Package },
  { to: "/reparations", label: "SAV / Réparations", icon: Wrench },
  { to: "/commandes", label: "Commandes", icon: ShoppingCart },
  { to: "/ventes", label: "Ventes / Caisse", icon: Receipt },
  { to: "/clients", label: "Clients", icon: Users },
  { to: "/fournisseurs", label: "Fournisseurs", icon: Truck },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out",
        collapsed ? "w-16" : "w-64"
      )}
      style={{ backgroundColor: "hsl(var(--sidebar-background))" }}
    >
      {/* Logo / Brand */}
      <div
        className="flex items-center gap-3 px-4 py-5 border-b"
        style={{ borderColor: "hsl(var(--sidebar-border))" }}
      >
        <div className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center overflow-hidden shadow-md bg-slate-900 border border-blue-500/30">
          <img src="./logo.png" alt="Logo" className="w-8 h-8 object-contain" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="font-bold text-white text-sm leading-tight">Boutique Informatique</p>
            <p className="text-xs font-semibold text-amber-400">
              & Atelier SAV
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {!collapsed && (
          <p
            className="px-3 mb-2 text-xs font-semibold uppercase tracking-widest"
            style={{ color: "hsl(var(--sidebar-foreground))", opacity: 0.4 }}
          >
            Menu principal
          </p>
        )}
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                "hover:opacity-100",
                isActive
                  ? "text-white"
                  : "opacity-70 hover:opacity-100",
                collapsed && "justify-center"
              )
            }
            style={({ isActive }) =>
              isActive
                ? {
                    backgroundColor: "hsl(var(--sidebar-accent))",
                    color: "hsl(var(--sidebar-accent-foreground))",
                    boxShadow: "0 0 0 1px hsl(var(--sidebar-primary) / 0.3)",
                  }
                : { color: "hsl(var(--sidebar-foreground))" }
            }
            title={collapsed ? label : undefined}
          >
            <Icon
              className="w-5 h-5 flex-shrink-0"
              style={
                location.pathname === to
                  ? { color: "hsl(var(--sidebar-primary))" }
                  : {}
              }
            />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Bottom area */}
      <div
        className="border-t p-2"
        style={{ borderColor: "hsl(var(--sidebar-border))" }}
      >
        {!collapsed && (
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg mb-1 opacity-70"
            style={{ color: "hsl(var(--sidebar-foreground))" }}
          >
            <Settings className="w-4 h-4" />
            <span className="text-xs">Paramètres</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center p-2 rounded-lg transition-all hover:opacity-100 opacity-50"
          style={{
            color: "hsl(var(--sidebar-foreground))",
            backgroundColor: "hsl(var(--sidebar-accent) / 0.5)",
          }}
          title={collapsed ? "Agrandir" : "Réduire"}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4 mr-1" />
              <span className="text-xs">Réduire</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

