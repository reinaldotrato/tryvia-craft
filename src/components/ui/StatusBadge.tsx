import { cn } from "@/lib/utils";

type StatusType = "active" | "inactive" | "paused" | "draft" | "error" | "success" | "warning" | "info" | "waiting" | "transferred" | "closed";

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  className?: string;
  pulse?: boolean;
}

const statusConfig: Record<StatusType, { bg: string; text: string; dot: string }> = {
  active: {
    bg: "bg-success/20",
    text: "text-success",
    dot: "bg-success",
  },
  inactive: {
    bg: "bg-muted/30",
    text: "text-muted-foreground",
    dot: "bg-muted-foreground",
  },
  paused: {
    bg: "bg-warning/20",
    text: "text-warning",
    dot: "bg-warning",
  },
  draft: {
    bg: "bg-muted/30",
    text: "text-muted-foreground",
    dot: "bg-muted-foreground",
  },
  error: {
    bg: "bg-error/20",
    text: "text-error",
    dot: "bg-error",
  },
  success: {
    bg: "bg-success/20",
    text: "text-success",
    dot: "bg-success",
  },
  waiting: {
    bg: "bg-warning/20",
    text: "text-warning",
    dot: "bg-warning",
  },
  transferred: {
    bg: "bg-info/20",
    text: "text-info",
    dot: "bg-info",
  },
  closed: {
    bg: "bg-muted/30",
    text: "text-muted-foreground",
    dot: "bg-muted-foreground",
  },
  warning: {
    bg: "bg-warning/20",
    text: "text-warning",
    dot: "bg-warning",
  },
  info: {
    bg: "bg-info/20",
    text: "text-info",
    dot: "bg-info",
  },
};

const defaultLabels: Record<StatusType, string> = {
  active: "Ativo",
  inactive: "Desconectado",
  paused: "Pausado",
  draft: "Rascunho",
  error: "Erro",
  success: "Sucesso",
  warning: "Atenção",
  info: "Info",
  waiting: "Aguardando",
  transferred: "Transferido",
  closed: "Fechado",
};

export function StatusBadge({ status, label, className, pulse = false }: StatusBadgeProps) {
  const config = statusConfig[status];
  const displayLabel = label || defaultLabels[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider",
        config.bg,
        config.text,
        className
      )}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full",
          config.dot,
          pulse && "animate-pulse"
        )}
      />
      {displayLabel}
    </span>
  );
}
