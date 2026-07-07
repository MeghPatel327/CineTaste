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
} from "lucide-react";
import { useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";

interface SidebarProps {
  isAdmin: boolean;
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/movies", label: "Library", icon: Library },
  { href: "/discover", label: "Discover", icon: Compass },
];

export function Sidebar({ isAdmin }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    if (href === "/movies") return pathname === "/movies" || pathname.startsWith("/movies/edit");
    return pathname.startsWith(href);
  };

  const navLinkClass = (href: string) =>
    cn(
      "sidebar-nav-item flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium",
      isActive(href)
        ? "sidebar-nav-item-active bg-sidebar-accent text-primary ct-shadow-sm"
        : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/60"
    );

  const iconClass = (href: string) =>
    cn(
      "w-[18px] h-[18px] shrink-0 transition-colors duration-200 ease-out",
      isActive(href) ? "text-primary brightness-110" : "text-muted-foreground"
    );

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="p-5 pb-6 border-b border-sidebar-border">
        <Link
          href="/dashboard"
          className="flex items-center group pl-2 logo-fade-in"
          onClick={() => setMobileOpen(false)}
        >
          <BrandLogo variant="full" className="w-36" />
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={navLinkClass(item.href)}
          >
            <item.icon className={iconClass(item.href)} />
            <span>{item.label}</span>
          </Link>
        ))}

        {isAdmin && (
          <>
            <div className="my-3 border-t border-sidebar-border" />
            <Link
              href="/admin"
              onClick={() => setMobileOpen(false)}
              className={navLinkClass("/admin")}
            >
              <Shield className={iconClass("/admin")} />
              <span>Admin</span>
            </Link>
          </>
        )}
      </nav>

      <div className="p-3 pt-4 border-t-2 border-sidebar-border/80 space-y-1 mt-auto">
        <Link
          href="/profile"
          onClick={() => setMobileOpen(false)}
          className={cn(navLinkClass("/profile"), "w-full")}
        >
          <User className={iconClass("/profile")} />
          <span>Profile</span>
        </Link>
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 md:hidden bg-card border border-border p-2 rounded-lg ct-shadow-md hover:bg-secondary transition-colors duration-200 ease-out"
        aria-label="Open navigation"
      >
        <Menu className="w-5 h-5" />
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-64 bg-sidebar border-r border-sidebar-border transform transition-transform duration-250 ease-out md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 p-1 text-muted-foreground hover:text-foreground transition-colors duration-200"
          aria-label="Close navigation"
        >
          <X className="w-5 h-5" />
        </button>
        {sidebarContent}
      </aside>

      <aside className="hidden md:flex md:flex-col md:w-64 md:shrink-0 h-screen sticky top-0 bg-sidebar border-r border-sidebar-border">
        {sidebarContent}
      </aside>
    </>
  );
}
