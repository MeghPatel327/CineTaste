import { ReactNode } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
}

export function EmptyState({ title, description, icon, action, compact = false }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center gap-5",
        compact ? "py-8 px-4" : "p-12 bg-card rounded-xl border border-border min-h-[320px]"
      )}
    >
      <div className="text-muted-foreground/60">
        {icon ?? <BrandLogo variant="compact" className="w-14 h-14 opacity-40" />}
      </div>
      <div className="space-y-2">
        <h3 className="text-xl font-semibold">{title}</h3>
        <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">{description}</p>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
