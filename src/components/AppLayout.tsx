import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, ArrowDownUp, Users, Menu, X, FileText, FileSignature, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const links = [
  { to: '/', label: 'Tableau de bord', icon: LayoutDashboard },
  { to: '/products', label: 'Produits', icon: Package },
  { to: '/stock', label: 'Mouvement Stock', icon: ArrowDownUp },
  { to: '/clients', label: 'Clients', icon: Users },
  { to: '/fiches-materiel', label: 'Fiches Matériel', icon: FileSignature },
  { to: '/bons-livraison', label: 'Bons de Livraison', icon: FileText },
  { to: '/settings', label: 'Paramètres', icon: Settings },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="SOBRATECH" className="h-10 w-10 rounded-lg object-cover" />
            <div>
              <h1 className="text-lg font-bold tracking-tight text-sidebar-foreground">SOBRATECH</h1>
              <p className="text-[10px] text-sidebar-foreground/60">Gestion de stock</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {links.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-primary'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                )
              }
            >
              <link.icon className="h-5 w-5" />
              {link.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Mobile header */}
      <div className="flex-1 flex flex-col">
        <header className="md:hidden flex items-center justify-between p-4 border-b bg-card">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="SOBRATECH" className="h-8 w-8 rounded-lg object-cover" />
            <h1 className="text-lg font-bold">SOBRATECH</h1>
          </div>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2">
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </header>

        {/* Mobile nav */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.nav
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden bg-card border-b overflow-hidden"
            >
              <div className="p-4 space-y-1">
                {links.map(link => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all',
                        isActive ? 'bg-accent/10 text-accent' : 'text-muted-foreground hover:bg-muted'
                      )
                    }
                  >
                    <link.icon className="h-5 w-5" />
                    {link.label}
                  </NavLink>
                ))}
              </div>
            </motion.nav>
          )}
        </AnimatePresence>

        <main className="flex-1 p-4 md:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
