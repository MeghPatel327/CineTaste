"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Library,
  Compass,
  Shield,
  User,
  Menu,
  X,
  ListTodo,
  ChevronLeft,
  ChevronRight,
  Info,
} from "lucide-react";
import { useState, useEffect } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { useAppStore } from "@/lib/appStore";

interface SidebarProps {
  isAdmin: boolean;
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/movies", label: "Library", icon: Library },
  { href: "/recommendations", label: "Up Next", icon: ListTodo },
  { href: "/discover", label: "Discover", icon: Compass },
];

export function Sidebar({ isAdmin }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { state, dispatch } = useAppStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isCollapsed = state.sidebarCollapsed;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleCollapse = () => {
    const next = !isCollapsed;
    dispatch({ type: "SET_SIDEBAR_COLLAPSED", payload: next });
    localStorage.setItem("ct_sidebar_collapsed", String(next));
  };

  // Prefetch all app routes once on mount so navigation feels instant
  useEffect(() => {
    const routes = ["/dashboard", "/movies", "/discover", "/recommendations", "/profile", "/about"];
    if (isAdmin) routes.push("/admin");
    routes.forEach(r => router.prefetch(r));
  }, [isAdmin, router]);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    if (href === "/movies") return pathname === "/movies" || pathname.startsWith("/movies/edit");
    return pathname.startsWith(href);
  };

  const sidebarContent = (isDesktop: boolean) => (
    <div className="flex flex-col h-full relative">
      {/* Brand & Toggle */}
      <div className="p-5 pb-6 border-b border-sidebar-border flex items-center justify-between relative h-[88px]">
        <Link
          href="/dashboard"
          className="flex items-center group pl-1 relative w-full h-full"
          onClick={() => setMobileOpen(false)}
        >
          {isDesktop ? (
            <>
              {/* Collapsed Logo */}
              <img
                src="/branding/circle_logo.png"
                alt="CineTaste"
                className={cn(
                  "absolute left-1/2 -translate-x-1/2 w-8 h-8 transition-all duration-300",
                  isCollapsed ? "opacity-100 scale-100" : "opacity-0 scale-75 pointer-events-none"
                )}
              />
              {/* Expanded Logo */}
              <div className={cn(
                "absolute left-1 transition-all duration-300",
                isCollapsed ? "opacity-0 scale-95 pointer-events-none" : "opacity-100 scale-100"
              )}>
                <BrandLogo variant="full" className="w-36" />
              </div>
            </>
          ) : (
            <BrandLogo variant="full" className="w-36 absolute left-1" />
          )}
        </Link>
        {isDesktop && (
          <button
            onClick={toggleCollapse}
            className={cn(
              "absolute top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-sidebar border border-sidebar-border shadow-sm text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-all z-20",
              isCollapsed ? "-right-3" : "right-2"
            )}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className={cn("flex-1 p-3 space-y-1", isDesktop ? "overflow-visible" : "overflow-y-auto")}>
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <div key={item.href} className="relative group/navitem flex justify-center">
              <Link
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "sidebar-nav-item flex items-center rounded-lg text-sm font-medium transition-all duration-300 overflow-hidden",
                  isDesktop && isCollapsed ? "w-11 h-11 justify-center" : "w-full px-3 py-2.5 gap-3",
                  active
                    ? "sidebar-nav-item-active bg-sidebar-accent text-primary shadow-sm"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/60"
                )}
              >
                <item.icon
                  className={cn(
                    "w-[18px] h-[18px] shrink-0 transition-colors duration-200",
                    active ? "text-primary" : "text-muted-foreground"
                  )}
                />
                <span className={cn(
                  "whitespace-nowrap transition-all duration-300",
                  isDesktop && isCollapsed ? "opacity-0 w-0" : "opacity-100 w-auto"
                )}>
                  {item.label}
                </span>
              </Link>
              {isDesktop && isCollapsed && (
                <div className="absolute left-[4.5rem] top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-card border border-border text-foreground text-xs font-semibold rounded-md opacity-0 group-hover/navitem:opacity-100 pointer-events-none transition-all duration-200 translate-x-2 group-hover/navitem:translate-x-0 shadow-xl z-50 whitespace-nowrap">
                  {item.label}
                </div>
              )}
            </div>
          );
        })}

        {isAdmin && (
          <>
            <div className="my-3 border-t border-sidebar-border" />
            <div className="relative group/navitem flex justify-center">
              <Link
                href="/admin"
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "sidebar-nav-item flex items-center rounded-lg text-sm font-medium transition-all duration-300 overflow-hidden",
                  isDesktop && isCollapsed ? "w-11 h-11 justify-center" : "w-full px-3 py-2.5 gap-3",
                  isActive("/admin")
                    ? "sidebar-nav-item-active bg-sidebar-accent text-primary shadow-sm"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/60"
                )}
              >
                <Shield
                  className={cn(
                    "w-[18px] h-[18px] shrink-0 transition-colors duration-200",
                    isActive("/admin") ? "text-primary" : "text-muted-foreground"
                  )}
                />
                <span className={cn(
                  "whitespace-nowrap transition-all duration-300",
                  isDesktop && isCollapsed ? "opacity-0 w-0" : "opacity-100 w-auto"
                )}>
                  Admin
                </span>
              </Link>
              {isDesktop && isCollapsed && (
                <div className="absolute left-[4.5rem] top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-card border border-border text-foreground text-xs font-semibold rounded-md opacity-0 group-hover/navitem:opacity-100 pointer-events-none transition-all duration-200 translate-x-2 group-hover/navitem:translate-x-0 shadow-xl z-50 whitespace-nowrap">
                  Admin
                </div>
              )}
            </div>
          </>
        )}
      </nav>

      {/* Bottom actions */}
      <div className="p-3 border-t border-sidebar-border space-y-1">
        <div className="relative group/navitem flex justify-center">
          <Link
            href="/profile"
            onClick={() => setMobileOpen(false)}
            className={cn(
              "sidebar-nav-item flex items-center rounded-lg text-sm font-medium transition-all duration-300 overflow-hidden",
              isDesktop && isCollapsed ? "w-11 h-11 justify-center" : "w-full px-3 py-2.5 gap-3",
              isActive("/profile")
                ? "sidebar-nav-item-active bg-sidebar-accent text-primary shadow-sm"
                : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/60"
            )}
          >
            <User className="w-[18px] h-[18px] shrink-0 transition-colors duration-200" />
            <span className={cn(
              "whitespace-nowrap transition-all duration-300",
              isDesktop && isCollapsed ? "opacity-0 w-0" : "opacity-100 w-auto"
            )}>
              Profile
            </span>
          </Link>
          {isDesktop && isCollapsed && (
            <div className="absolute left-[4.5rem] top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-card border border-border text-foreground text-xs font-semibold rounded-md opacity-0 group-hover/navitem:opacity-100 pointer-events-none transition-all duration-200 translate-x-2 group-hover/navitem:translate-x-0 shadow-xl z-50 whitespace-nowrap">
              Profile
            </div>
          )}
        </div>
        
        <div className="relative group/navitem flex justify-center mt-1">
          <Link
            href="/about"
            onClick={() => setMobileOpen(false)}
            className={cn(
              "sidebar-nav-item flex items-center rounded-lg text-sm font-medium transition-all duration-300 overflow-hidden",
              isDesktop && isCollapsed ? "w-11 h-11 justify-center" : "w-full px-3 py-2.5 gap-3",
              isActive("/about")
                ? "sidebar-nav-item-active bg-sidebar-accent text-primary shadow-sm"
                : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/60"
            )}
          >
            <Info className="w-[18px] h-[18px] shrink-0 transition-colors duration-200" />
            <span className={cn(
              "whitespace-nowrap transition-all duration-300",
              isDesktop && isCollapsed ? "opacity-0 w-0" : "opacity-100 w-auto"
            )}>
              About
            </span>
          </Link>
          {isDesktop && isCollapsed && (
            <div className="absolute left-[4.5rem] top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-card border border-border text-foreground text-xs font-semibold rounded-md opacity-0 group-hover/navitem:opacity-100 pointer-events-none transition-all duration-200 translate-x-2 group-hover/navitem:translate-x-0 shadow-xl z-50 whitespace-nowrap">
              About
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 md:hidden bg-card border border-border p-2 rounded-lg shadow-lg hover:bg-secondary transition-colors"
        aria-label="Open navigation"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-64 bg-sidebar border-r border-sidebar-border transform transition-transform duration-300 md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 p-1 text-muted-foreground hover:text-foreground"
          aria-label="Close navigation"
        >
          <X className="w-5 h-5" />
        </button>
        {sidebarContent(false)}
      </aside>

      {/* Desktop sidebar */}
      <aside className={cn(
        "hidden md:flex md:flex-col md:shrink-0 h-screen sticky top-0 bg-sidebar border-r border-sidebar-border transition-[width] duration-300 ease-in-out",
        mounted && isCollapsed ? "md:w-20" : "md:w-64"
      )}>
        {sidebarContent(true)}
      </aside>
    </>
  );
}
