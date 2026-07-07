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
    <div className="flex flex-col items-center justify-center p-8 text-center bg-card rounded-lg border border-border ct-shadow-sm min-h-[300px]">
      <div className="mb-4 opacity-80">
        {icon || <BrandLogo variant="compact" className="w-14 h-14" />}
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground mb-6 max-w-md leading-relaxed">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
}
