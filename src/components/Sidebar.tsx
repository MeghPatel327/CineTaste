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
} from "lucide-react";
import { useState, useEffect } from "react";
import { BrandLogo } from "@/components/BrandLogo";

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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("ct_sidebar_collapsed");
    if (saved === "true") setIsCollapsed(true);
    setMounted(true);
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem("ct_sidebar_collapsed", String(next));
      return next;
    });
  };

  // Prefetch all app routes once on mount so navigation feels instant
  useEffect(() => {
    const routes = ["/dashboard", "/movies", "/discover", "/recommendations", "/profile"];
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
      <div className={cn(
        "p-5 pb-6 border-b border-sidebar-border flex items-center",
        isDesktop && isCollapsed ? "justify-center px-0" : "justify-between"
      )}>
        <Link
          href="/dashboard"
          className={cn("flex items-center group", !isDesktop || !isCollapsed ? "pl-2" : "")}
          onClick={() => setMobileOpen(false)}
        >
          {isDesktop && isCollapsed ? (
            <img src="/circle_logo.png" alt="CineTaste" className="w-8 h-8" />
          ) : (
            <BrandLogo variant="full" className="w-36" />
          )}
        </Link>
        {isDesktop && (
          <button
            onClick={toggleCollapse}
            className={cn(
              "p-1.5 rounded-md hover:bg-sidebar-accent/60 text-muted-foreground hover:text-foreground transition-colors hidden md:block",
              isCollapsed ? "absolute -right-3 top-6 bg-sidebar border border-sidebar-border shadow-sm z-10 rounded-full p-1" : ""
            )}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto overflow-x-hidden">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              title={isDesktop && isCollapsed ? item.label : undefined}
              className={cn(
                "sidebar-nav-item flex items-center rounded-lg text-sm font-medium transition-all duration-300",
                isDesktop && isCollapsed ? "justify-center py-3 px-0" : "gap-3 px-3 py-2.5",
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
              {(!isDesktop || !isCollapsed) && (
                <span className="whitespace-nowrap">{item.label}</span>
              )}
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <div className="my-3 border-t border-sidebar-border" />
            <Link
              href="/admin"
              onClick={() => setMobileOpen(false)}
              title={isDesktop && isCollapsed ? "Admin" : undefined}
              className={cn(
                "sidebar-nav-item flex items-center rounded-lg text-sm font-medium transition-all duration-300",
                isDesktop && isCollapsed ? "justify-center py-3 px-0" : "gap-3 px-3 py-2.5",
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
              {(!isDesktop || !isCollapsed) && (
                <span className="whitespace-nowrap">Admin</span>
              )}
            </Link>
          </>
        )}
      </nav>

      {/* Bottom actions */}
      <div className="p-3 border-t border-sidebar-border space-y-1">
        <Link
          href="/profile"
          onClick={() => setMobileOpen(false)}
          title={isDesktop && isCollapsed ? "Profile" : undefined}
          className={cn(
            "sidebar-nav-item flex items-center rounded-lg text-sm font-medium w-full transition-all duration-300",
            isDesktop && isCollapsed ? "justify-center py-3 px-0" : "gap-3 px-3 py-2.5",
            isActive("/profile")
              ? "sidebar-nav-item-active bg-sidebar-accent text-primary shadow-sm"
              : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/60"
          )}
        >
          <User className="w-[18px] h-[18px] shrink-0 transition-colors duration-200" />
          {(!isDesktop || !isCollapsed) && (
            <span className="whitespace-nowrap">Profile</span>
          )}
        </Link>
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
