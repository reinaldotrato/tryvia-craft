import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: "purple" | "pink" | "cyan" | "green";
  className?: string;
  delay?: number;
}

const colorConfig = {
  purple: {
    iconBg: "bg-purple/20",
    iconColor: "text-purple",
    glow: "group-hover:shadow-[0_0_30px_hsla(262,83%,58%,0.2)]",
  },
  pink: {
    iconBg: "bg-pink/20",
    iconColor: "text-pink",
    glow: "group-hover:shadow-[0_0_30px_hsla(330,81%,60%,0.2)]",
  },
  cyan: {
    iconBg: "bg-cyan/20",
    iconColor: "text-cyan",
    glow: "group-hover:shadow-[0_0_30px_hsla(189,94%,43%,0.2)]",
  },
  green: {
    iconBg: "bg-success/20",
    iconColor: "text-success",
    glow: "group-hover:shadow-[0_0_30px_hsla(160,84%,39%,0.2)]",
  },
};

export function KpiCard({
  title,
  value,
  icon: Icon,
  trend,
  color = "purple",
  className,
  delay = 0,
}: KpiCardProps) {
  const config = colorConfig[color];

  return (
    <motion.div
      className={cn(
        "group glass-card p-6 transition-all duration-300",
        config.glow,
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold text-foreground">{value}</p>
          {trend && (
            <div className="flex items-center gap-1">
              <span
                className={cn(
                  "text-xs font-semibold",
                  trend.isPositive ? "text-success" : "text-error"
                )}
              >
                {trend.isPositive ? "+" : "-"}{Math.abs(trend.value)}%
              </span>
              <span className="text-xs text-muted-foreground">vs período anterior</span>
            </div>
          )}
        </div>
        <div
          className={cn(
            "p-3 rounded-xl transition-transform duration-300 group-hover:scale-110",
            config.iconBg
          )}
        >
          <Icon className={cn("w-6 h-6", config.iconColor)} />
        </div>
      </div>
    </motion.div>
  );
}
