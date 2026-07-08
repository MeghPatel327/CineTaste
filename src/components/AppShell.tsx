"use client";

import { useEffect, ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { useAppStore } from "@/lib/appStore";

interface AppShellProps {
  children: ReactNode;
}

/**
 * Persistent App Shell.
 * The session is fetched ONCE globally via AppStore — never re-fetched on navigation.
 * The Sidebar never unmounts because AppShell is a shared layout wrapper.
 */
export function AppShell({ children }: AppShellProps) {
  const { state, getUser } = useAppStore();

  // Fetch session once if not already fetched
  useEffect(() => {
    if (!state.userFetched) {
      getUser();
    }
  }, [state.userFetched, getUser]);

  const isAdmin = state.user?.role === "admin";

  return (
    <div className="flex min-h-screen">
      <Sidebar isAdmin={isAdmin} />
      <main className="flex-1 min-w-0 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
