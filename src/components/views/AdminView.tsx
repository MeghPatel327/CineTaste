"use client";

import { useState, useEffect } from "react";
import { Shield, Plus, Check, RefreshCw, Sparkles, ExternalLink, Database } from "lucide-react";

export function AdminView() {
  const [tmdbId, setTmdbId] = useState("hero-1");
  const [providerName, setProviderName] = useState("Apple TV");
  const [directUrl, setDirectUrl] = useState("https://tv.apple.com");
  const [qualityLabel, setQualityLabel] = useState("4K UHD");
  const [badgeLabel, setBadgeLabel] = useState("Official 4K");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // AI Recommendation Test
  const [aiTestResult, setAiTestResult] = useState<any>(null);
  const [isTestingAi, setIsTestingAi] = useState(false);

  const bundledTitles = [
    { id: "hero-1", title: "Dune: Part Two" },
    { id: "hero-2", title: "Blade Runner 2049" },
    { id: "hero-3", title: "Interstellar" },
    { id: "hero-4", title: "Oppenheimer" },
    { id: "hero-5", title: "Arrival" },
    { id: "hero-6", title: "Severance" },
    { id: "hero-7", title: "The Batman" },
    { id: "hero-8", title: "Arcane" },
    { id: "gem-1", title: "Coherence" },
    { id: "gem-2", title: "Dark City" },
  ];

  const handleAddWatchLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/admin/watch-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tmdbId,
          providerName,
          directUrl,
          qualityLabel,
          badgeLabel,
          languageAudio: "English / Atmos",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage("✓ Watch link registered and synced to Baserow!");
        setDirectUrl("");
      } else {
        setStatusMessage(`Error: ${data.error}`);
      }
    } catch (err: any) {
      setStatusMessage(`Network error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTestAi = async () => {
    setIsTestingAi(true);
    setAiTestResult(null);

    try {
      const res = await fetch("/api/recommendations", { method: "POST" });
      const data = await res.json();
      setAiTestResult(data);
    } catch (err: any) {
      setAiTestResult({ error: err.message });
    } finally {
      setIsTestingAi(false);
    }
  };

  return (
    <div className="space-y-8 px-6 md:px-12 py-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold font-['Plus_Jakarta_Sans'] text-white tracking-tight flex items-center gap-3">
          <Shield className="w-7 h-7 text-emerald-400" />
          Curator Admin Console
        </h1>
        <p className="text-sm text-zinc-400">
          Server-authorized management for Baserow watch link directories and Gemini Web2API recommendation testing.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Watch Link Manager */}
        <div className="p-6 rounded-2xl glass-panel-elevated bg-[#0F1117]/85 border border-white/10 space-y-5">
          <div className="flex items-center gap-2.5">
            <Database className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white font-['Plus_Jakarta_Sans']">
              Add External Watch Link
            </h2>
          </div>
          <p className="text-xs text-zinc-400">
            Configure verified external streaming, rent/buy, or community links. URLs are persisted to Baserow, never hardcoded.
          </p>

          <form onSubmit={handleAddWatchLink} className="space-y-4 text-xs">
            <div>
              <label className="block text-zinc-400 font-semibold mb-1">Target Media Title</label>
              <select
                value={tmdbId}
                onChange={(e) => setTmdbId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#151821] border border-white/10 text-white font-medium focus:outline-none focus:border-emerald-500"
              >
                {bundledTitles.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} ({t.id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-zinc-400 font-semibold mb-1">Provider Name</label>
              <input
                type="text"
                value={providerName}
                onChange={(e) => setProviderName(e.target.value)}
                placeholder="e.g. Apple TV, Criterion, CineStream"
                className="w-full px-3 py-2.5 rounded-xl bg-[#151821] border border-white/10 text-white font-medium focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-zinc-400 font-semibold mb-1">Destination Webpage URL</label>
              <input
                type="url"
                value={directUrl}
                onChange={(e) => setDirectUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2.5 rounded-xl bg-[#151821] border border-white/10 text-white font-medium focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Quality Badge</label>
                <select
                  value={qualityLabel}
                  onChange={(e) => setQualityLabel(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#151821] border border-white/10 text-white font-medium focus:outline-none focus:border-emerald-500"
                >
                  <option value="4K UHD">4K UHD</option>
                  <option value="1080p FHD">1080p FHD</option>
                  <option value="720p HD">720p HD</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Category Label</label>
                <input
                  type="text"
                  value={badgeLabel}
                  onChange={(e) => setBadgeLabel(e.target.value)}
                  placeholder="e.g. Official 4K, Community"
                  className="w-full px-3 py-2.5 rounded-xl bg-[#151821] border border-white/10 text-white font-medium focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl font-['Plus_Jakarta_Sans'] font-bold text-xs bg-emerald-500 text-black hover:bg-emerald-400 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_8px_20px_rgba(16,185,129,0.3)] disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              {isSubmitting ? "Syncing to Baserow..." : "Save Watch Link to Database"}
            </button>

            {statusMessage && (
              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 text-emerald-300 font-mono text-[11px]">
                {statusMessage}
              </div>
            )}
          </form>
        </div>

        {/* AI Recommendation Engine Tester */}
        <div className="p-6 rounded-2xl glass-panel-elevated bg-[#0F1117]/85 border border-white/10 space-y-5">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white font-['Plus_Jakarta_Sans']">
              Test Gemini Web2API Engine
            </h2>
          </div>
          <p className="text-xs text-zinc-400">
            Executes a live recommendation cycle using your configured Gemini Web2API endpoint (or algorithmic fallback if offline).
          </p>

          <button
            onClick={handleTestAi}
            disabled={isTestingAi}
            className="px-5 py-3 rounded-xl font-['Plus_Jakarta_Sans'] font-bold text-xs bg-white/10 hover:bg-white/15 text-white border border-white/15 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isTestingAi ? "animate-spin" : ""}`} />
            {isTestingAi ? "Generating Recommendations..." : "Trigger Recommendation Generation"}
          </button>

          {aiTestResult && (
            <div className="p-4 rounded-xl bg-black/60 border border-white/10 space-y-2 text-xs font-mono max-h-80 overflow-y-auto custom-scrollbar">
              <div className="text-emerald-400 font-bold">
                Engine: {aiTestResult.meta?.engine || "Unknown"}
              </div>
              {aiTestResult.success && Array.isArray(aiTestResult.data) ? (
                <div className="space-y-2">
                  {aiTestResult.data.map((item: any, idx: number) => (
                    <div key={idx} className="p-2 rounded bg-white/[0.03] border border-white/5 space-y-0.5">
                      <div className="text-white font-bold">{item.title} ({item.releaseYear})</div>
                      <div className="text-zinc-400 text-[11px]">{item.recommendationReason}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <pre className="text-zinc-300 text-[11px] whitespace-pre-wrap">
                  {JSON.stringify(aiTestResult, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
