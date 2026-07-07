"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";
import {
  Film,
  LayoutDashboard,
  Library,
  PlusCircle,
  Sparkles,
  Shield,
  User,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

interface SidebarProps {
  isAdmin: boolean;
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/movies", label: "Library", icon: Library },
  { href: "/movies/add", label: "Add Movie", icon: PlusCircle },
  { href: "/recommendations", label: "For You", icon: Sparkles },
];

export function Sidebar({ isAdmin }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    if (href === "/movies") return pathname === "/movies" || pathname.startsWith("/movies/edit");
    return pathname.startsWith(href);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="p-5 pb-6 border-b border-sidebar-border">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 group"
          onClick={() => setMobileOpen(false)}
        >
          <div className="bg-primary/15 p-2 rounded-xl group-hover:bg-primary/25 transition-colors">
            <Film className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">CineTaste</h1>
            <p className="text-[11px] text-muted-foreground leading-none">Movie Companion</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                active
                  ? "bg-sidebar-accent text-primary shadow-sm"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/60"
              )}
            >
              <item.icon
                className={cn(
                  "w-[18px] h-[18px] shrink-0 transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              />
              <span>{item.label}</span>
              {active && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
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
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive("/admin")
                  ? "bg-sidebar-accent text-primary shadow-sm"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/60"
              )}
            >
              <Shield
                className={cn(
                  "w-[18px] h-[18px] shrink-0 transition-colors",
                  isActive("/admin") ? "text-primary" : "text-muted-foreground"
                )}
              />
              <span>Admin</span>
              {isActive("/admin") && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              )}
            </Link>
          </>
        )}
      </nav>

      {/* Bottom actions */}
      <div className="p-3 border-t border-sidebar-border space-y-1">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 transition-all duration-200 w-full"
        >
          {theme === "dark" ? (
            <Sun className="w-[18px] h-[18px] text-yellow-500" />
          ) : (
            <Moon className="w-[18px] h-[18px] text-primary" />
          )}
          <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
        </button>

        {/* Profile Link */}
        <Link
          href="/profile"
          onClick={() => setMobileOpen(false)}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 w-full",
            isActive("/profile")
              ? "bg-sidebar-accent text-primary shadow-sm"
              : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/60"
          )}
        >
          <User className="w-[18px] h-[18px] shrink-0" />
          <span>Profile</span>
          {isActive("/profile") && (
            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
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
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-64 md:shrink-0 h-screen sticky top-0 bg-sidebar border-r border-sidebar-border">
        {sidebarContent}
      </aside>
    </>
  );
}
