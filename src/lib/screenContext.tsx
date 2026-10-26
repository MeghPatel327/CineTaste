"use client";

import React, { createContext, useContext, useState, useMemo, useCallback } from "react";
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
}

interface ScreenContextValue {
  screenContext: ScreenContextData;
  setScreenDetails: (details: Partial<Omit<ScreenContextData, "pathname">>) => void;
  setCurrentMovie: (movie: CurrentMovieContext | null) => void;
}

const ScreenContext = createContext<ScreenContextValue | null>(null);

export function ScreenContextProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const [details, setDetails] = useState<Partial<Omit<ScreenContextData, "pathname">>>({});

  const setScreenDetails = useCallback((newDetails: Partial<Omit<ScreenContextData, "pathname">>) => {
    setDetails((prev) => ({
      ...prev,
      ...newDetails,
    }));
  }, []);

  const setCurrentMovie = useCallback((movie: CurrentMovieContext | null) => {
    setDetails((prev) => ({
      ...prev,
      currentMovie: movie,
    }));
  }, []);

  const screenContext = useMemo<ScreenContextData>(() => ({
    pathname,
    category: details.category || (pathname.includes("/movies") ? "movies" : pathname.includes("/series") ? "series" : pathname.includes("/anime") ? "anime" : null),
    searchQuery: details.searchQuery || "",
    appliedFilters: details.appliedFilters,
    currentMovie: details.currentMovie || null,
  }), [pathname, details]);

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
