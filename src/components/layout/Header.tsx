import { Bell, Search, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";

interface HeaderProps {
  title?: string;
}

export default function Header({ title }: HeaderProps) {
  const [dark, setDark] = useState(() => {
    return localStorage.getItem("theme") === "dark";
  });

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [dark]);

  const now = new Date();
  const dateStr = now.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 flex-shrink-0">
      {/* Left */}
      <div>
        <p className="text-xs text-muted-foreground capitalize">{dateStr}</p>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        {/* Quick Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Recherche rapide..."
            className="pl-9 w-52 h-9 text-sm bg-muted/50 border-transparent focus:border-primary"
          />
        </div>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full"></span>
        </Button>

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => setDark(!dark)}
          title={dark ? "Mode clair" : "Mode sombre"}
        >
          {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>

        {/* User avatar */}
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold ml-1">
          AD
        </div>
      </div>
    </header>
  );
}

