"use client";

import {
  Film,
  Compass,
  Bookmark,
  Layers,
  Shield,
  User,
  Info,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  X,
} from "lucide-react";

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  isAdmin?: boolean;
}

export function Sidebar({
  currentTab,
  onTabChange,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  isAdmin = false,
}: SidebarProps) {
  const mainNav = [
    { id: "home", label: "Home", icon: Compass },
    { id: "library", label: "Library", icon: Layers },
    { id: "queue", label: "Queue", icon: Bookmark },
  ];

  const bottomNav = [
    ...(isAdmin ? [{ id: "admin", label: "Admin", icon: Shield }] : []),
    { id: "profile", label: "Profile", icon: User },
    { id: "about", label: "About", icon: Info },
  ];

  const handleSelect = (id: string) => {
    onTabChange(id);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-md md:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 h-screen z-50 transition-all duration-300 ease-out flex flex-col justify-between
          glass-panel border-r border-white/5 bg-[#0F1117]/90 backdrop-blur-2xl
          ${isMobileOpen ? "translate-x-0 w-64" : "-translate-x-full md:translate-x-0"}
          ${isCollapsed ? "md:w-20" : "md:w-64"}`}
      >
        {/* Top Header & Brand */}
        <div>
          <div className="flex items-center justify-between px-5 py-6 border-b border-white/5">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-white/[0.04] border border-white/10 shrink-0 overflow-hidden shadow-[0_0_16px_rgba(16,185,129,0.2)]">
                <img
                  src="/images/circle_logo.png"
                  alt="CineTaste"
                  className="w-full h-full object-contain p-1"
                />
              </div>
              {(!isCollapsed || isMobileOpen) && (
                <div className="flex flex-col tracking-tight">
                  <span className="font-bold text-lg text-white font-['Plus_Jakarta_Sans'] leading-none flex items-center gap-1.5">
                    CineTaste
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]" />
                  </span>
                  <span className="text-[11px] text-zinc-400 tracking-wider font-medium mt-1">
                    Cinema Curation
                  </span>
                </div>
              )}
            </div>

            {/* Mobile close button */}
            <button
              onClick={onCloseMobile}
              className="md:hidden p-1.5 rounded-lg text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Desktop collapse toggle */}
            <button
              onClick={onToggleCollapse}
              className="hidden md:flex items-center justify-center w-7 h-7 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all"
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Primary Navigation */}
          <nav className="p-3 space-y-1.5 mt-3">
            {mainNav.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item.id)}
                  className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative
                    ${
                      isActive
                        ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.18)]"
                        : "text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04] border border-transparent"
                    }
                    ${isCollapsed && !isMobileOpen ? "justify-center" : "justify-start"}`}
                >
                  {isActive && (
                    <div className="absolute left-0 top-2 bottom-2 w-1 bg-emerald-400 rounded-r-full shadow-[0_0_10px_#10b981]" />
                  )}
                  <Icon
                    className={`w-5 h-5 shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                      isActive ? "text-emerald-400" : "text-zinc-400 group-hover:text-zinc-200"
                    }`}
                  />
                  {(!isCollapsed || isMobileOpen) && (
                    <span className="tracking-wide font-['Plus_Jakarta_Sans'] font-semibold">
                      {item.label}
                    </span>
                  )}
                  {isCollapsed && !isMobileOpen && (
                    <div className="absolute left-20 ml-2 px-2.5 py-1 rounded-md bg-[#151821] border border-white/10 text-white text-xs font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 shadow-xl z-50">
                      {item.label}
                    </div>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Navigation & Taste Pill */}
        <div className="p-3 border-t border-white/5 space-y-1.5">
          {bottomNav.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 group relative
                  ${
                    isActive
                      ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] border border-transparent"
                  }
                  ${isCollapsed && !isMobileOpen ? "justify-center" : "justify-start"}`}
              >
                <Icon className="w-4 h-4 shrink-0 transition-colors" />
                {(!isCollapsed || isMobileOpen) && (
                  <span className="font-['Plus_Jakarta_Sans'] font-medium">{item.label}</span>
                )}
                {isCollapsed && !isMobileOpen && (
                  <div className="absolute left-20 ml-2 px-2 py-1 rounded-md bg-[#151821] border border-white/10 text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 shadow-xl z-50">
                    {item.label}
                  </div>
                )}
              </button>
            );
          })}

          {/* Taste DNA Pill */}
          {(!isCollapsed || isMobileOpen) && (
            <div className="mt-4 p-3 rounded-xl bg-gradient-to-r from-emerald-950/40 to-zinc-900/60 border border-emerald-500/20 flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 animate-pulse" />
              <div className="text-[11px] leading-tight text-zinc-300">
                <span className="font-bold text-white block">Taste Profile</span>
                Deterministic Cinema Match
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
