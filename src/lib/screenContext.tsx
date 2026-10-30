"use client";

import React, { createContext, useContext, useState, useMemo, useCallback, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export interface CurrentMovieContext {
  title: string;
  year?: number;
  genres?: string[];
  overview?: string;
  rating?: number;
  personalReview?: string;
  status?: string;
}

export interface ScreenFiltersContext {
  genres?: string[];
  era?: string;
  subType?: string;
  sort?: string;
}

export interface ScreenContextData {
  pathname: string;
  category?: "movies" | "series" | "anime" | null;
  searchQuery?: string;
  appliedFilters?: ScreenFiltersContext;
  currentMovie?: CurrentMovieContext | null;
  displayedTitles?: string[];
}

interface ScreenContextValue {
  screenContext: ScreenContextData;
  setScreenDetails: (details: Partial<Omit<ScreenContextData, "pathname">>) => void;
  setCurrentMovie: (movie: CurrentMovieContext | null) => void;
}

const ScreenContext = createContext<ScreenContextValue | null>(null);

function areDetailsEqual(
  a: Partial<Omit<ScreenContextData, "pathname">>,
  b: Partial<Omit<ScreenContextData, "pathname">>
): boolean {
  if (a.category !== b.category) return false;
  if ((a.searchQuery || "") !== (b.searchQuery || "")) return false;
  if (JSON.stringify(a.appliedFilters || null) !== JSON.stringify(b.appliedFilters || null)) return false;
  if (JSON.stringify(a.currentMovie || null) !== JSON.stringify(b.currentMovie || null)) return false;
  const aTitles = a.displayedTitles || [];
  const bTitles = b.displayedTitles || [];
  if (aTitles.length !== bTitles.length) return false;
  for (let i = 0; i < aTitles.length; i++) {
    if (aTitles[i] !== bTitles[i]) return false;
  }
  return true;
}

export function ScreenContextProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const [details, setDetails] = useState<Partial<Omit<ScreenContextData, "pathname">>>({});
  const lastPathnameRef = useRef(pathname);

  // Derive route category strictly from pathname
  const routeCategory: "movies" | "series" | "anime" | null = useMemo(() => {
    if (pathname.startsWith("/movies")) return "movies";
    if (pathname.startsWith("/series")) return "series";
    if (pathname.startsWith("/anime")) return "anime";
    return null;
  }, [pathname]);

  // Immediately clear page-specific context when navigating between different routes
  useEffect(() => {
    if (lastPathnameRef.current !== pathname) {
      lastPathnameRef.current = pathname;
      setDetails({});
    }
  }, [pathname]);

  const setScreenDetails = useCallback((newDetails: Partial<Omit<ScreenContextData, "pathname">>) => {
    setDetails((prev) => {
      const merged = { ...prev, ...newDetails };
      if (areDetailsEqual(prev, merged)) {
        return prev;
      }
      return merged;
    });
  }, []);

  const setCurrentMovie = useCallback((movie: CurrentMovieContext | null) => {
    setDetails((prev) => {
      if (JSON.stringify(prev.currentMovie || null) === JSON.stringify(movie || null)) {
        return prev;
      }
      return {
        ...prev,
        currentMovie: movie,
      };
    });
  }, []);

  const screenContext = useMemo<ScreenContextData>(() => ({
    pathname,
    category: routeCategory,
    searchQuery: details.searchQuery || "",
    appliedFilters: details.appliedFilters,
    currentMovie: details.currentMovie || null,
    displayedTitles: details.displayedTitles || [],
  }), [pathname, routeCategory, details]);

  return (
    <ScreenContext.Provider value={{ screenContext, setScreenDetails, setCurrentMovie }}>
      {children}
    </ScreenContext.Provider>
  );
}

export function useScreenContext() {
  const ctx = useContext(ScreenContext);
  if (!ctx) {
    return {
      screenContext: { pathname: "/" },
      setScreenDetails: () => {},
      setCurrentMovie: () => {},
    };
  }
  return ctx;
}
