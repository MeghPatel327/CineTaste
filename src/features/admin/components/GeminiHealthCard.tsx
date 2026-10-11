"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  RefreshCw,
  Clock,
  Zap,
  Server,
  Cpu,
  Database,
  Film,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import type { GeminiHealthResult, SystemServicesHealth, HealthStatus } from "../geminiHealthService";

const POLLING_INTERVAL_MS = 60_000; // 60s periodic poll while tab active

function getStatusBadge(status: HealthStatus) {
  switch (status) {
    case "operational":
      return {
        label: "Operational",
        icon: CheckCircle2,
        badgeClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
        dotClass: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]",
      };
    case "degraded":
      return {
        label: "Degraded",
        icon: AlertTriangle,
        badgeClass: "bg-amber-500/15 text-amber-400 border-amber-500/30",
        dotClass: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]",
      };
    case "offline":
      return {
        label: "Offline",
        icon: XCircle,
        badgeClass: "bg-rose-500/15 text-rose-400 border-rose-500/30",
        dotClass: "bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.6)]",
      };
    default:
      return {
        label: "Unknown",
        icon: HelpCircle,
        badgeClass: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
        dotClass: "bg-zinc-400",
      };
  }
}

function formatTimestamp(iso: string | null): string {
  if (!iso) return "Never";
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return iso;
  }
}

export function GeminiHealthCard() {
  const [health, setHealth] = useState<SystemServicesHealth | null>(null);
  const [checking, setChecking] = useState(false);
  const isCheckingRef = useRef(false);

  const fetchHealth = useCallback(async (force = false, notify = false) => {
    if (isCheckingRef.current) return;
    isCheckingRef.current = true;
    setChecking(true);

    try {
      const res = await fetch(`/api/admin/health/gemini?full=true${force ? "&force=true" : ""}`, {
        method: "GET",
        headers: { "Cache-Control": "no-cache" },
      });

      if (res.ok) {
        const json = await res.json();
        const data: SystemServicesHealth = json.data;
        setHealth(data);
        if (notify) {
          if (data.gemini.status === "operational") {
            toast.success(`Gemini verified: Operational (${data.gemini.latencyMs ?? 0}ms)`);
          } else if (data.gemini.status === "degraded") {
            toast.warning(`Gemini status: Degraded (${data.gemini.errorMessage || "high latency"})`);
          } else {
            toast.error(`Gemini status: Offline (${data.gemini.errorMessage || "unreachable"})`);
          }
        }
      } else {
        if (notify) toast.error(`Health check failed (HTTP ${res.status})`);
      }
    } catch {
      if (notify) toast.error("Network error executing health check");
    } finally {
      setChecking(false);
      isCheckingRef.current = false;
    }
  }, []);

  // Initial load + periodic polling with tab visibility detection
  useEffect(() => {
    fetchHealth(false, false);

    const intervalId = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        fetchHealth(false, false);
      }
    }, POLLING_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchHealth(false, false);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchHealth]);

  const gemini = health?.gemini;
  const status = gemini?.status ?? "unknown";
  const { label, icon: StatusIcon, badgeClass, dotClass } = getStatusBadge(status);

  return (
    <div className="ct-accent-border p-5 bg-card/90 backdrop-blur-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base tracking-tight">Gemini AI Service Health</h3>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeClass}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${dotClass} animate-pulse`} />
                <StatusIcon className="w-3.5 h-3.5" />
                {label}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live status for AI recommendation generation candidate service
            </p>
          </div>
        </div>

        <Button
          size="sm"
          variant="outline"
          disabled={checking}
          onClick={() => fetchHealth(true, true)}
          className="self-start sm:self-auto gap-1.5 text-xs font-medium"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${checking ? "animate-spin" : ""}`} />
          {checking ? "Checking..." : "Check Now"}
        </Button>
      </div>

      {/* Main Details Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
        {/* Model */}
        <div className="bg-secondary/40 rounded-lg p-3 border border-border/60">
          <div className="text-[11px] text-muted-foreground uppercase font-semibold tracking-wider flex items-center gap-1.5 mb-1">
            <Cpu className="w-3 h-3 text-muted-foreground" />
            Configured Model
          </div>
          <div className="font-mono text-xs font-semibold truncate" title={gemini?.model || "gemini-3.7-flash"}>
            {gemini?.model || "gemini-3.7-flash"}
          </div>
        </div>

        {/* Latency */}
        <div className="bg-secondary/40 rounded-lg p-3 border border-border/60">
          <div className="text-[11px] text-muted-foreground uppercase font-semibold tracking-wider flex items-center gap-1.5 mb-1">
            <Zap className="w-3 h-3 text-muted-foreground" />
            Response Latency
          </div>
          <div className="font-mono text-xs font-semibold">
            {gemini?.latencyMs !== null && gemini?.latencyMs !== undefined ? `${gemini.latencyMs} ms` : "—"}
          </div>
        </div>

        {/* Last Checked */}
        <div className="bg-secondary/40 rounded-lg p-3 border border-border/60">
          <div className="text-[11px] text-muted-foreground uppercase font-semibold tracking-wider flex items-center gap-1.5 mb-1">
            <Clock className="w-3 h-3 text-muted-foreground" />
            Last Checked
          </div>
          <div className="text-xs font-medium">
            {formatTimestamp(gemini?.lastCheckedAt || null)}
          </div>
        </div>

        {/* Last Successful */}
        <div className="bg-secondary/40 rounded-lg p-3 border border-border/60">
          <div className="text-[11px] text-muted-foreground uppercase font-semibold tracking-wider flex items-center gap-1.5 mb-1">
            <CheckCircle2 className="w-3 h-3 text-muted-foreground" />
            Last Success
          </div>
          <div className="text-xs font-medium">
            {formatTimestamp(gemini?.lastSuccessfulAt || null)}
          </div>
        </div>
      </div>

      {/* Error or Alert Banner if not operational */}
      {gemini && status !== "operational" && status !== "unknown" && (
        <div
          className={`rounded-lg p-3 border text-xs flex items-start gap-2.5 ${
            status === "degraded"
              ? "bg-amber-500/10 border-amber-500/20 text-amber-200"
              : "bg-rose-500/10 border-rose-500/20 text-rose-200"
          }`}
        >
          <StatusIcon className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="font-semibold capitalize">
              {gemini.errorCategory ? gemini.errorCategory.replace(/_/g, " ") : "Service Notice"}
            </div>
            <div className="text-muted-foreground font-mono text-[11px]">
              {gemini.errorMessage || "No detailed message provided by health probe"}
            </div>
          </div>
        </div>
      )}

      {/* Auxiliary Systems Footer */}
      {health && (health.tmdb || health.baserow) && (
        <div className="border-t border-border/50 pt-3 flex flex-wrap items-center justify-between text-xs text-muted-foreground gap-3">
          <div className="flex items-center gap-4">
            <span className="font-medium text-[11px] uppercase tracking-wider text-muted-foreground/80">
              Related Subsystems:
            </span>
            {health.tmdb && (
              <div className="flex items-center gap-1.5">
                <Film className="w-3.5 h-3.5" />
                <span>TMDB API:</span>
                <span
                  className={`font-semibold capitalize ${
                    health.tmdb.status === "operational"
                      ? "text-emerald-400"
                      : health.tmdb.status === "degraded"
                      ? "text-amber-400"
                      : "text-rose-400"
                  }`}
                >
                  {health.tmdb.status}
                </span>
                {health.tmdb.latencyMs !== null && (
                  <span className="font-mono text-[10px] text-muted-foreground/70">
                    ({health.tmdb.latencyMs}ms)
                  </span>
                )}
              </div>
            )}
            {health.baserow && (
              <div className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5" />
                <span>Baserow DB:</span>
                <span
                  className={`font-semibold capitalize ${
                    health.baserow.status === "operational"
                      ? "text-emerald-400"
                      : health.baserow.status === "degraded"
                      ? "text-amber-400"
                      : "text-rose-400"
                  }`}
                >
                  {health.baserow.status}
                </span>
                {health.baserow.latencyMs !== null && (
                  <span className="font-mono text-[10px] text-muted-foreground/70">
                    ({health.baserow.latencyMs}ms)
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="font-mono text-[11px] text-muted-foreground/60 truncate max-w-xs" title={gemini?.baseUrl}>
            Endpoint: {gemini?.baseUrl}
          </div>
        </div>
      )}
    </div>
  );
}
