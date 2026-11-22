"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Gamepad2, RefreshCw } from "lucide-react";

export default function GamesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error for diagnostics
    console.error("Games section error boundary caught:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center bg-[#080511] text-[#F5F7F6]">
      <div className="p-6 rounded-2xl bg-[#130E24] border border-purple-500/30 shadow-2xl max-w-md w-full space-y-4">
        <div className="w-12 h-12 rounded-xl bg-purple-950/60 border border-purple-500/40 flex items-center justify-center mx-auto text-purple-400">
          <Gamepad2 className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-white">Games Section Encountered an Issue</h2>
          <p className="text-xs text-purple-300/70">
            {error?.message || "An unexpected error occurred while loading gaming data."}
          </p>
        </div>
        <div className="pt-2 flex items-center justify-center gap-3">
          <Button
            onClick={() => reset()}
            className="bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs gap-2 px-5 py-2.5 rounded-xl shadow-lg shadow-purple-600/30"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="border-purple-500/30 text-purple-300 hover:bg-purple-950/40 text-xs px-4 py-2.5 rounded-xl"
          >
            <span>Reload Page</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
