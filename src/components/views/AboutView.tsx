"use client";

import { Film, Sparkles, Database, Cpu, Compass, Layers, ShieldCheck } from "lucide-react";

export function AboutView() {
  return (
    <div className="space-y-8 px-6 md:px-12 py-8 max-w-4xl mx-auto">
      {/* Brand Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pb-4 border-b border-white/5">
        <div className="w-28 h-28 rounded-2xl bg-white/[0.03] border border-white/10 p-3 flex items-center justify-center shrink-0 shadow-[0_0_24px_rgba(16,185,129,0.25)]">
          <img
            src="/images/logo_full.png"
            alt="CineTaste"
            className="w-full h-full object-contain"
          />
        </div>
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
            <Sparkles className="w-3.5 h-3.5" />
            Cinema Curation Platform
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold font-['Plus_Jakarta_Sans'] text-white tracking-tight">
            CineTaste
          </h1>
          <p className="text-sm md:text-base text-zinc-400 leading-relaxed font-['Inter']">
            A luxury cinematic recommendation experience designed for cinephiles. Pure film curation with zero streaming clutter.
          </p>
        </div>
      </div>

      {/* Philosophy Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl glass-panel bg-[#0F1117]/80 border border-white/5 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Compass className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white font-['Plus_Jakarta_Sans']">
            Pure Recommendation Experience
          </h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            CineTaste does not stream or host video. It respects filmmaker artistry and recommends masterpieces based on real viewing history, connecting users directly with verified external watch links.
          </p>
        </div>

        <div className="p-6 rounded-2xl glass-panel bg-[#0F1117]/80 border border-white/5 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Cpu className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white font-['Plus_Jakarta_Sans']">
            Dual-Environment Gemini AI
          </h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Powered by Gemini Web2API (OpenAI-compatible) with seamless support for both local development proxies and production endpoints. Backed by deterministic algorithmic fallback for guaranteed 100% uptime.
          </p>
        </div>

        <div className="p-6 rounded-2xl glass-panel bg-[#0F1117]/80 border border-white/5 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Database className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white font-['Plus_Jakarta_Sans']">
            Baserow Database Architecture
          </h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            All user profiles, library statuses, private cinema queues, watch provider directories, and per-title watch links persist directly into Baserow tables. Provisioned via Kuma AI using <code className="text-emerald-300">baserow_prompt.txt</code>.
          </p>
        </div>

        <div className="p-6 rounded-2xl glass-panel bg-[#0F1117]/80 border border-white/5 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white font-['Plus_Jakarta_Sans']">
            Dark Glassmorphic Theater Aesthetic
          </h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Deep obsidian canvas (#08090C), translucent charcoal glassmorphism, 24px backdrop blur, emerald luminescence, and Plus Jakarta Sans typography engineered for theater immersion.
          </p>
        </div>
      </div>
    </div>
  );
}
