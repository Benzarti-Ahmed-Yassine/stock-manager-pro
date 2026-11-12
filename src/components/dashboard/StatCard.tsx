import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color?: "blue" | "green" | "yellow" | "red" | "purple" | "cyan";
  trend?: { value: number; label: string };
}

const colorMap = {
  blue:   { bg: "bg-blue-50 dark:bg-blue-950/30",   icon: "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400",   text: "text-blue-600" },
  green:  { bg: "bg-green-50 dark:bg-green-950/30", icon: "bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400", text: "text-green-600" },
  yellow: { bg: "bg-yellow-50 dark:bg-yellow-950/30", icon: "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-600 dark:text-yellow-400", text: "text-yellow-600" },
  red:    { bg: "bg-red-50 dark:bg-red-950/30",     icon: "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400",       text: "text-red-600" },
  purple: { bg: "bg-purple-50 dark:bg-purple-950/30", icon: "bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400", text: "text-purple-600" },
  cyan:   { bg: "bg-cyan-50 dark:bg-cyan-950/30",   icon: "bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600 dark:text-cyan-400",   text: "text-cyan-600" },
};

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = "blue",
  trend,
}: StatCardProps) {
  const c = colorMap[color];
  return (
    <div className={cn("stat-card", c.bg)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold mt-1 text-foreground">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <span
                className={cn(
                  "text-xs font-medium",
                  trend.value >= 0 ? "text-green-600" : "text-red-500"
                )}
              >
                {trend.value >= 0 ? "+" : ""}
                {trend.value}%
              </span>
              <span className="text-xs text-muted-foreground">{trend.label}</span>
            </div>
          )}
        </div>
        <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center", c.icon)}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

