"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { HeaderNav } from "./HeaderNav";

interface AppShellProps {
  children?: React.ReactNode;
  currentTab: string;
  onTabChange: (tab: string) => void;
  onSearch?: (query: string) => void;
  activeGenre?: string;
  onGenreChange?: (genre: string) => void;
  currentUser?: { username: string; email: string; role: string } | null;
}

export function AppShell({
  children,
  currentTab,
  onTabChange,
  onSearch,
  activeGenre = "All",
  onGenreChange,
  currentUser,
}: AppShellProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#08090C] text-[#F9FAFB] flex flex-col md:flex-row">
      {/* Slim Glass Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={onTabChange}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* Main Content Stage with Dynamic Left Padding */}
      <div
        className={`flex-1 min-w-0 flex flex-col transition-all duration-300 ${
          isSidebarCollapsed ? "md:pl-20" : "md:pl-64"
        }`}
      >
        {/* Sticky High-Stacking Header Navigation */}
        <HeaderNav
          onSearch={onSearch}
          activeGenre={activeGenre}
          onGenreChange={onGenreChange}
          onToggleMobileMenu={() => setIsMobileOpen(true)}
          currentUser={currentUser}
          onOpenProfile={() => onTabChange("profile")}
        />

        {/* Main Stage Content */}
        <main className="flex-1 pb-16">{children}</main>
      </div>
    </div>
  );
}
