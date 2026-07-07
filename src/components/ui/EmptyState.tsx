import { ReactNode } from "react";
import { BrandLogo } from "@/components/BrandLogo";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-card rounded-xl border border-border min-h-[320px] gap-5">
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
