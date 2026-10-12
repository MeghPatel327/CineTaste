"use client";

import { useEffect, ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { useAppStore } from "@/lib/appStore";

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

  useEffect(() => {
    if (!state.userFetched) {
      getUser();
    }
  }, [state.userFetched, getUser]);

  const isAdmin = state.user?.role === "admin";

  return (
    <div className="flex min-h-screen bg-background text-foreground selection:bg-emerald-500/20 selection:text-emerald-300">
      <Sidebar isAdmin={isAdmin} />
      <main className="flex-1 min-w-0 overflow-x-hidden pb-20 md:pb-0">
        {children}
      </main>
    </div>
  );
}
