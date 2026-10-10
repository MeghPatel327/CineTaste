"use client";

import { useState, useEffect } from "react";
import {
  Shield,
  Plus,
  Check,
  RefreshCw,
  Sparkles,
  ExternalLink,
  Database,
  Trash2,
  Edit2,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Globe,
  AlertCircle,
  X,
} from "lucide-react";
import { GlobalWatchProvider } from "@/types/media";

export function AdminView() {
  const [providers, setProviders] = useState<GlobalWatchProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Form states for creating / editing
  const [editingProvider, setEditingProvider] = useState<GlobalWatchProvider | null>(null);
  const [formName, setFormName] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formOrder, setFormOrder] = useState<number>(1);
  const [formActive, setFormActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | string | null>(null);

  // AI Recommendation Test states
  const [aiTestResult, setAiTestResult] = useState<any>(null);
  const [isTestingAi, setIsTestingAi] = useState(false);

  const fetchProviders = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/watch-providers");
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setProviders(data.data);
      }
    } catch (err: any) {
      setStatusMessage(`Failed to load providers: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const handleStartEdit = (p: GlobalWatchProvider) => {
    setEditingProvider(p);
    setFormName(p.providerName);
    setFormUrl(p.baseUrl);
    setFormOrder(p.displayOrder);
    setFormActive(p.isActive);
  };

  const handleCancelEdit = () => {
    setEditingProvider(null);
    setFormName("");
    setFormUrl("");
    setFormOrder(providers.length + 1);
    setFormActive(true);
  };

  const handleSaveProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage(null);

    try {
      if (editingProvider) {
        // Update existing provider
        const res = await fetch("/api/admin/watch-providers", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingProvider.id,
            providerName: formName,
            baseUrl: formUrl,
            displayOrder: formOrder,
            isActive: formActive,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setStatusMessage(`✓ Provider "${formName}" updated successfully.`);
          handleCancelEdit();
          fetchProviders();
        } else {
          setStatusMessage(`Error: ${data.error}`);
        }
      } else {
        // Create new provider
        const res = await fetch("/api/admin/watch-providers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            providerName: formName,
            baseUrl: formUrl,
            displayOrder: formOrder || providers.length + 1,
            isActive: formActive,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setStatusMessage(`✓ Provider "${formName}" registered successfully.`);
          handleCancelEdit();
          fetchProviders();
        } else {
          setStatusMessage(`Error: ${data.error}`);
        }
      }
    } catch (err: any) {
      setStatusMessage(`Network error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (p: GlobalWatchProvider) => {
    try {
      const res = await fetch("/api/admin/watch-providers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: p.id,
          isActive: !p.isActive,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setProviders((prev) =>
          prev.map((item) => (item.id === p.id ? { ...item, isActive: !item.isActive } : item))
        );
      }
    } catch {}
  };

  const handleMoveOrder = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= providers.length) return;

    const current = providers[index];
    const adjacent = providers[targetIndex];

    const newCurrentOrder = adjacent.displayOrder;
    const newAdjacentOrder = current.displayOrder;

    // Optimistic UI update
    const nextList = [...providers];
    nextList[index] = { ...current, displayOrder: newCurrentOrder };
    nextList[targetIndex] = { ...adjacent, displayOrder: newAdjacentOrder };
    nextList.sort((a, b) => a.displayOrder - b.displayOrder);
    setProviders(nextList);

    try {
      await Promise.all([
        fetch("/api/admin/watch-providers", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: current.id, displayOrder: newCurrentOrder }),
        }),
        fetch("/api/admin/watch-providers", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: adjacent.id, displayOrder: newAdjacentOrder }),
        }),
      ]);
    } catch {
      fetchProviders();
    }
  };

  const handleDeleteProvider = async (id: number | string) => {
    try {
      const res = await fetch(`/api/admin/watch-providers?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage("✓ Provider deleted successfully.");
        setDeleteConfirmId(null);
        fetchProviders();
      } else {
        setStatusMessage(`Error: ${data.error}`);
      }
    } catch (err: any) {
      setStatusMessage(`Delete error: ${err.message}`);
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
    <div className="space-y-8 px-6 md:px-12 py-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold font-['Plus_Jakarta_Sans'] text-white tracking-tight flex items-center gap-3">
          <Shield className="w-7 h-7 text-emerald-400" />
          Curator Admin Console
        </h1>
        <p className="text-sm text-zinc-400">
          Global watch provider directory configuration and Gemini recommendation engine testing.
        </p>
      </div>

      {statusMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-mono text-xs flex items-center justify-between">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage(null)} className="text-zinc-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          GLOBAL WATCH PROVIDERS MANAGER
         ══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form to Add / Edit Provider */}
        <div className="lg:col-span-1 p-6 rounded-2xl glass-panel-elevated bg-[#0F1117]/85 border border-white/10 space-y-5">
          <div className="flex items-center gap-2.5">
            <Globe className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white font-['Plus_Jakarta_Sans']">
              {editingProvider ? "Edit Provider" : "Add Global Provider"}
            </h2>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Configure external search/watch templates. Use <code className="text-emerald-300 font-mono">{"{q}"}</code> as the placeholder for titles (e.g. <span className="font-mono text-zinc-300">https://site.com/search?q={"{"}q{"}"}</span>). Direct links without placeholders are also supported.
          </p>

          <form onSubmit={handleSaveProvider} className="space-y-4 text-xs">
            <div>
              <label className="block text-zinc-400 font-semibold mb-1">Provider Display Name</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. 4KHDHub (DL), HydraHD, Bingr"
                className="w-full px-3 py-2.5 rounded-xl bg-[#151821] border border-white/10 text-white font-medium focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-zinc-400 font-semibold mb-1">Search URL Template</label>
              <input
                type="text"
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                placeholder="https://example.com/search?q={q}"
                className="w-full px-3 py-2.5 rounded-xl bg-[#151821] border border-white/10 text-white font-medium focus:outline-none focus:border-emerald-500 font-mono text-[11px]"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Display Order</label>
                <input
                  type="number"
                  min="1"
                  value={formOrder}
                  onChange={(e) => setFormOrder(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#151821] border border-white/10 text-white font-medium focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="flex flex-col justify-end">
                <label className="flex items-center gap-2 cursor-pointer py-2">
                  <input
                    type="checkbox"
                    checked={formActive}
                    onChange={(e) => setFormActive(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400 accent-emerald-500"
                  />
                  <span className="text-zinc-300 font-semibold text-xs">Enabled</span>
                </label>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 py-3 rounded-xl font-['Plus_Jakarta_Sans'] font-bold text-xs bg-emerald-500 text-black hover:bg-emerald-400 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_8px_20px_rgba(16,185,129,0.3)] disabled:opacity-50"
              >
                {editingProvider ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {isSaving ? "Saving to Database..." : editingProvider ? "Update Provider" : "Add Provider"}
              </button>

              {editingProvider && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-4 py-3 rounded-xl font-['Plus_Jakarta_Sans'] font-semibold text-xs bg-white/10 hover:bg-white/15 text-zinc-300 transition-all cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Existing Providers Table & Controls */}
        <div className="lg:col-span-2 p-6 rounded-2xl glass-panel-elevated bg-[#0F1117]/85 border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-bold text-white font-['Plus_Jakarta_Sans']">
                Configured Global Providers ({providers.length})
              </h2>
            </div>
            <button
              onClick={fetchProviders}
              className="p-1.5 rounded-lg glass-panel text-zinc-400 hover:text-white transition-all"
              title="Refresh provider list"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>

          <p className="text-xs text-zinc-400">
            Ordered list of watch and search mirrors shown globally in every movie and series details modal.
          </p>

          {isLoading ? (
            <div className="py-12 text-center text-xs text-zinc-400 animate-pulse">
              Loading global providers from Baserow...
            </div>
          ) : providers.length === 0 ? (
            <div className="py-12 text-center text-xs text-zinc-500">
              No global watch providers configured.
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
              {providers.map((p, idx) => (
                <div
                  key={p.id || p.providerId}
                  className={`p-3 rounded-xl glass-panel border transition-all flex items-center justify-between gap-3 ${
                    p.isActive
                      ? "bg-white/[0.03] border-white/10 hover:border-emerald-500/30"
                      : "bg-white/[0.01] border-white/5 opacity-60"
                  }`}
                >
                  {/* Order & Reordering arrows */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="w-6 text-center font-mono text-xs font-bold text-zinc-400">
                      {p.displayOrder}
                    </span>
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => handleMoveOrder(idx, "up")}
                        disabled={idx === 0}
                        className="p-0.5 rounded text-zinc-400 hover:text-white disabled:opacity-20 transition-colors"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleMoveOrder(idx, "down")}
                        disabled={idx === providers.length - 1}
                        className="p-0.5 rounded text-zinc-400 hover:text-white disabled:opacity-20 transition-colors"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Name and URL Template */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-white truncate">
                        {p.providerName}
                      </span>
                      {p.isActive ? (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Active
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-zinc-800 text-zinc-400">
                          Disabled
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-zinc-400 font-mono truncate block mt-0.5">
                      {p.baseUrl}
                    </span>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Toggle Active button */}
                    <button
                      onClick={() => handleToggleActive(p)}
                      className={`p-2 rounded-lg border transition-all ${
                        p.isActive
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                          : "bg-white/5 border-white/10 text-zinc-400 hover:text-white"
                      }`}
                      title={p.isActive ? "Disable provider" : "Enable provider"}
                    >
                      {p.isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>

                    {/* Edit button */}
                    <button
                      onClick={() => handleStartEdit(p)}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white transition-all"
                      title="Edit provider"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete button / Confirmation */}
                    {deleteConfirmId === p.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDeleteProvider(p.id!)}
                          className="px-2 py-1 rounded bg-red-600 text-white text-[10px] font-bold hover:bg-red-500"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="p-1 rounded text-zinc-400 hover:text-white"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(p.id!)}
                        className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 transition-all"
                        title="Delete provider"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          AI RECOMMENDATION ENGINE TESTER
         ══════════════════════════════════════════════════════════════ */}
      <div className="p-6 rounded-2xl glass-panel-elevated bg-[#0F1117]/85 border border-white/10 space-y-5">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-5 h-5 text-emerald-400" />
          <h2 className="text-lg font-bold text-white font-['Plus_Jakarta_Sans']">
            Test Gemini Web2API Recommendation Engine
          </h2>
        </div>
        <p className="text-xs text-zinc-400">
          Executes a live recommendation cycle using your configured Gemini Web2API endpoint (or deterministic algorithmic fallback if offline).
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
  );
}
