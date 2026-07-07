"use client";

import { useEffect, useState, ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { PageEnter } from "./PageEnter";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetchSession();
  }, []);

  const fetchSession = async () => {
    try {
      const res = await fetch("/api/auth/session");
      if (res.ok) {
        const json = await res.json();
        if (json.data?.role === "admin") setIsAdmin(true);
      }
    } catch {
      // Silently fail — sidebar still works, just no admin link
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar isAdmin={isAdmin} />
      <main className="flex-1 min-w-0 overflow-x-hidden">
        <PageEnter>{children}</PageEnter>
      </main>
    </div>
  );
}
