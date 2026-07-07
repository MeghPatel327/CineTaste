import { Loader2 } from "lucide-react";

export function LoadingState({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 min-h-[300px]">
      <Loader2 size={32} className="animate-spin text-primary mb-4" />
      <p className="text-muted-foreground animate-pulse">{message}</p>
    </div>
  );
}
