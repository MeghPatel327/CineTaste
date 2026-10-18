"use client";

import { useEffect, ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { useAppStore } from "@/lib/appStore";
import { startBackgroundCataloguePrefetch } from "@/features/movies/browseClientCache";
import type { BrowseCategory } from "@/features/movies/browseService";

interface AppShellProps {
  children: ReactNode;
}

/**
 * Obsidian Cinema Glass Persistent App Shell.
 * Provides unified dark aesthetic, responsive sidebar on desktop,
 * and an intentional mobile cinema navigation experience.
 */
export function AppShell({ children }: AppShellProps) {
  const { state, getUser } = useAppStore();
  const pathname = usePathname();

  useEffect(() => {
    if (!state.userFetched) {
      getUser();
    }
  }, [state.userFetched, getUser]);

  // Non-blocking background catalogue prefetch as soon as user enters the site
  useEffect(() => {
    let currentCategory: BrowseCategory | undefined;
    if (pathname === "/movies") currentCategory = "movies";
    else if (pathname === "/series") currentCategory = "series";
    else if (pathname === "/anime") currentCategory = "anime";

    startBackgroundCataloguePrefetch(currentCategory);
  }, [pathname]);

  const isAdmin = state.user?.role === "admin";

  return (
    <div className="flex min-h-screen bg-background text-foreground selection:bg-emerald-500/20 selection:text-emerald-300">
      <Sidebar isAdmin={isAdmin} />
      <main className="flex-1 min-w-0 overflow-x-hidden pt-14 md:pt-0 pb-20 md:pb-0">
        {children}
      </main>
    </div>
  );
}
