import { cn } from "@/lib/utils";
import { motion, HTMLMotionProps } from "framer-motion";
import { forwardRef } from "react";

interface GlassCardProps extends HTMLMotionProps<"div"> {
  glow?: "purple" | "pink" | "cyan" | "none";
  hover?: boolean;
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  function GlassCard({ children, className, glow = "none", hover = true, ...props }, ref) {
    const glowClasses = {
      purple: "hover:shadow-[0_0_40px_hsla(262,83%,58%,0.2)]",
      pink: "hover:shadow-[0_0_40px_hsla(330,81%,60%,0.2)]",
      cyan: "hover:shadow-[0_0_40px_hsla(189,94%,43%,0.2)]",
      none: "",
    };

    return (
      <motion.div
        ref={ref}
        className={cn(
          "bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl",
          "transition-all duration-300",
          hover && "hover:bg-white/[0.08] hover:border-purple/50",
          glowClasses[glow],
          className
        )}
        initial={{ opacity: 0, y: 0 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
