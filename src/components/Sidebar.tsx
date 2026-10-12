"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Home,
  Film,
  Tv,
  Sparkles,
  ListTodo,
  Library,
  Shield,
  User,
  Info,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { useState, useEffect } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { useAppStore } from "@/lib/appStore";

interface SidebarProps {
  isAdmin: boolean;
}

const mainNavItems = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/movies", label: "Movies", icon: Film },
  { href: "/series", label: "Series", icon: Tv },
  { href: "/anime", label: "Anime", icon: Sparkles },
  { href: "/recommendations", label: "Queue", icon: ListTodo },
  { href: "/library", label: "Library", icon: Library },
];

const bottomNavItems = [
  { href: "/profile", label: "Profile", icon: User },
  { href: "/about", label: "About", icon: Info },
];

export function Sidebar({ isAdmin }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { state, dispatch } = useAppStore();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const isCollapsed = state.sidebarCollapsed;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleCollapse = () => {
    const next = !isCollapsed;
    dispatch({ type: "SET_SIDEBAR_COLLAPSED", payload: next });
    try {
      localStorage.setItem("ct_sidebar_collapsed", String(next));
    } catch {}
  };

  // Prefetch core routes
  useEffect(() => {
    const routes = [
      "/dashboard",
      "/movies",
      "/series",
      "/anime",
      "/recommendations",
      "/library",
      "/profile",
      "/about",
    ];
    if (isAdmin) routes.push("/admin");
    routes.forEach((r) => router.prefetch(r));
  }, [isAdmin, router]);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    if (href === "/movies") return pathname === "/movies";
    if (href === "/series") return pathname === "/series";
    if (href === "/anime") return pathname === "/anime";
    if (href === "/recommendations") return pathname === "/recommendations";
    if (href === "/library")
      return pathname === "/library" || pathname.startsWith("/movies/edit");
    if (href === "/profile") return pathname === "/profile";
    if (href === "/about") return pathname === "/about";
    if (href === "/admin") return pathname.startsWith("/admin");
    return pathname === href;
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch {
      router.push("/login");
    }
  };

  // ── Desktop Sidebar Content ──
  const desktopNav = (
    <div className="flex flex-col h-full select-none">
      {/* Brand & Toggle Header */}
      <div className="p-4 border-b border-white/[0.06] flex items-center justify-between relative h-20">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 group relative w-full h-full overflow-hidden"
        >
          {/* Collapsed Circle Logo */}
          <div
            className={cn(
              "absolute left-1/2 -translate-x-1/2 transition-all duration-300",
              isCollapsed ? "opacity-100 scale-100" : "opacity-0 scale-75 pointer-events-none"
            )}
          >
            <BrandLogo variant="compact" className="w-8 h-8" />
          </div>

          {/* Expanded Full Logo */}
          <div
            className={cn(
              "absolute left-2 transition-all duration-300",
              isCollapsed ? "opacity-0 scale-95 pointer-events-none" : "opacity-100 scale-100"
            )}
          >
            <BrandLogo variant="full" className="w-36" />
          </div>
        </Link>

        {/* Collapse toggle */}
        <button
          onClick={toggleCollapse}
          className={cn(
            "absolute top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-[#121619] border border-white/[0.1] text-[#A1AAA6] hover:text-[#F5F7F6] hover:border-emerald-500/40 hover:bg-emerald-500/10 transition-all z-20 shadow-lg",
            isCollapsed ? "-right-3" : "right-3"
          )}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Main Navigation Links */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-visible">
        {mainNavItems.map((item) => {
          const active = isActive(item.href);
          return (
            <div key={item.href} className="relative group/nav flex justify-center">
              <Link
                href={item.href}
                className={cn(
                  "flex items-center rounded-xl text-sm font-medium transition-all duration-200 overflow-hidden",
                  isCollapsed ? "w-11 h-11 justify-center" : "w-full px-3.5 py-2.5 gap-3",
                  active
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.12)]"
                    : "text-[#A1AAA6] hover:text-[#F5F7F6] hover:bg-white/[0.04] border border-transparent"
                )}
              >
                <item.icon
                  className={cn(
                    "w-[18px] h-[18px] shrink-0 transition-colors duration-200",
                    active ? "text-emerald-400" : "text-[#A1AAA6] group-hover/nav:text-[#F5F7F6]"
                  )}
                />
                <span
                  className={cn(
                    "whitespace-nowrap transition-all duration-200",
                    isCollapsed ? "opacity-0 w-0" : "opacity-100 w-auto"
                  )}
                >
                  {item.label}
                </span>
              </Link>

              {/* Tooltip on collapsed */}
              {isCollapsed && (
                <div className="absolute left-[4.5rem] top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-[#121619] border border-white/[0.1] text-[#F5F7F6] text-xs font-semibold rounded-md opacity-0 group-hover/nav:opacity-100 pointer-events-none transition-all duration-200 translate-x-1 group-hover/nav:translate-x-0 shadow-2xl z-50 whitespace-nowrap">
                  {item.label}
                </div>
              )}
            </div>
          );
        })}

        {/* Admin Link (Authorized only) */}
        {isAdmin && (
          <>
            <div className="my-3 border-t border-white/[0.06]" />
            <div className="relative group/nav flex justify-center">
              <Link
                href="/admin"
                className={cn(
                  "flex items-center rounded-xl text-sm font-medium transition-all duration-200 overflow-hidden",
                  isCollapsed ? "w-11 h-11 justify-center" : "w-full px-3.5 py-2.5 gap-3",
                  isActive("/admin")
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.12)]"
                    : "text-[#A1AAA6] hover:text-[#F5F7F6] hover:bg-white/[0.04] border border-transparent"
                )}
              >
                <Shield
                  className={cn(
                    "w-[18px] h-[18px] shrink-0 transition-colors duration-200",
                    isActive("/admin") ? "text-emerald-400" : "text-[#A1AAA6] group-hover/nav:text-[#F5F7F6]"
                  )}
                />
                <span
                  className={cn(
                    "whitespace-nowrap transition-all duration-200",
                    isCollapsed ? "opacity-0 w-0" : "opacity-100 w-auto"
                  )}
                >
                  Admin
                </span>
              </Link>
              {isCollapsed && (
                <div className="absolute left-[4.5rem] top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-[#121619] border border-white/[0.1] text-[#F5F7F6] text-xs font-semibold rounded-md opacity-0 group-hover/nav:opacity-100 pointer-events-none transition-all duration-200 translate-x-1 group-hover/nav:translate-x-0 shadow-2xl z-50 whitespace-nowrap">
                  Admin
                </div>
              )}
            </div>
          </>
        )}
      </nav>

      {/* Bottom Area: Profile, About, Sign Out */}
      <div className="p-3 border-t border-white/[0.06] space-y-1.5">
        {bottomNavItems.map((item) => {
          const active = isActive(item.href);
          return (
            <div key={item.href} className="relative group/nav flex justify-center">
              <Link
                href={item.href}
                className={cn(
                  "flex items-center rounded-xl text-sm font-medium transition-all duration-200 overflow-hidden",
                  isCollapsed ? "w-11 h-11 justify-center" : "w-full px-3.5 py-2.5 gap-3",
                  active
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                    : "text-[#A1AAA6] hover:text-[#F5F7F6] hover:bg-white/[0.04] border border-transparent"
                )}
              >
                <item.icon
                  className={cn(
                    "w-[18px] h-[18px] shrink-0 transition-colors duration-200",
                    active ? "text-emerald-400" : "text-[#A1AAA6] group-hover/nav:text-[#F5F7F6]"
                  )}
                />
                <span
                  className={cn(
                    "whitespace-nowrap transition-all duration-200",
                    isCollapsed ? "opacity-0 w-0" : "opacity-100 w-auto"
                  )}
                >
                  {item.label}
                </span>
              </Link>

              {isCollapsed && (
                <div className="absolute left-[4.5rem] top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-[#121619] border border-white/[0.1] text-[#F5F7F6] text-xs font-semibold rounded-md opacity-0 group-hover/nav:opacity-100 pointer-events-none transition-all duration-200 translate-x-1 group-hover/nav:translate-x-0 shadow-2xl z-50 whitespace-nowrap">
                  {item.label}
                </div>
              )}
            </div>
          );
        })}

        <div className="relative group/nav flex justify-center pt-1">
          <button
            onClick={handleLogout}
            className={cn(
              "flex items-center rounded-xl text-sm font-medium transition-all duration-200 overflow-hidden text-rose-400 hover:bg-rose-500/10 border border-transparent",
              isCollapsed ? "w-11 h-11 justify-center" : "w-full px-3.5 py-2.5 gap-3"
            )}
          >
            <LogOut className="w-[18px] h-[18px] shrink-0" />
            <span
              className={cn(
                "whitespace-nowrap transition-all duration-200",
                isCollapsed ? "opacity-0 w-0" : "opacity-100 w-auto"
              )}
            >
              Sign Out
            </span>
          </button>
          {isCollapsed && (
            <div className="absolute left-[4.5rem] top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-[#121619] border border-white/[0.1] text-[#F5F7F6] text-xs font-semibold rounded-md opacity-0 group-hover/nav:opacity-100 pointer-events-none transition-all duration-200 translate-x-1 group-hover/nav:translate-x-0 shadow-2xl z-50 whitespace-nowrap">
              Sign Out
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Mobile Top Header (Fixed Glass Bar) ── */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-[#08090C]/85 backdrop-blur-md border-b border-white/[0.07] z-40 px-4 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center">
          <BrandLogo variant="full" className="w-28" />
        </Link>
        <button
          onClick={() => setMobileDrawerOpen(true)}
          className="p-2 text-[#A1AAA6] hover:text-[#F5F7F6] rounded-lg hover:bg-white/[0.06] transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* ── Mobile Bottom Navigation Bar (6 Primary Items Cinema Dock) ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#0D1013]/90 backdrop-blur-xl border-t border-white/[0.08] z-40 px-1 flex items-center justify-around shadow-[0_-8px_30px_rgba(0,0,0,0.5)]">
        {mainNavItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-medium transition-colors",
                active ? "text-emerald-400" : "text-[#A1AAA6] hover:text-[#F5F7F6]"
              )}
            >
              <item.icon className={cn("w-4.5 h-4.5 mb-0.5", active ? "text-emerald-400" : "text-[#A1AAA6]")} />
              <span className="truncate max-w-[50px]">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* ── Mobile Slide-out Drawer ── */}
      {mobileDrawerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm md:hidden animate-fade-in"
          onClick={() => setMobileDrawerOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 right-0 z-50 h-full w-72 bg-[#0D1013] border-l border-white/[0.08] shadow-2xl transform transition-transform duration-300 md:hidden flex flex-col p-5",
          mobileDrawerOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.07]">
          <BrandLogo variant="full" className="w-32" />
          <button
            onClick={() => setMobileDrawerOpen(false)}
            className="p-1.5 text-[#A1AAA6] hover:text-[#F5F7F6] rounded-lg hover:bg-white/[0.06]"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 py-4 space-y-1.5 overflow-y-auto">
          {mainNavItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileDrawerOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors",
                  active
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                    : "text-[#A1AAA6] hover:text-[#F5F7F6] hover:bg-white/[0.04]"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <div className="my-3 border-t border-white/[0.07]" />

          {bottomNavItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileDrawerOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors",
                  active
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                    : "text-[#A1AAA6] hover:text-[#F5F7F6] hover:bg-white/[0.04]"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {isAdmin && (
            <>
              <div className="my-3 border-t border-white/[0.07]" />
              <Link
                href="/admin"
                onClick={() => setMobileDrawerOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors",
                  isActive("/admin")
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                    : "text-[#A1AAA6] hover:text-[#F5F7F6] hover:bg-white/[0.04]"
                )}
              >
                <Shield className="w-5 h-5" />
                <span>Admin Console</span>
              </Link>
            </>
          )}
        </div>

        <div className="pt-4 border-t border-white/[0.07]">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ── Desktop Sidebar ── */}
      <aside
        className={cn(
          "hidden md:flex md:flex-col md:shrink-0 h-screen sticky top-0 bg-[#0D1013]/90 backdrop-blur-xl border-r border-white/[0.07] transition-[width] duration-300 ease-in-out z-30",
          mounted && isCollapsed ? "md:w-20" : "md:w-64"
        )}
      >
        {desktopNav}
      </aside>
    </>
  );
}
