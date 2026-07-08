"use client";

/**
 * Global client-side store.
 * Lives at the root layout level — never unmounts.
 * All pages read from here instead of re-fetching on every mount.
 */

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useRef,
  ReactNode,
} from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AppUser {
  username: string;
  role: "admin" | "user";
}

export interface CachedEntry<T> {
  data: T;
  fetchedAt: number; // Date.now()
}

interface AppState {
  user: AppUser | null;
  userFetched: boolean;

  library: CachedEntry<any[]> | null;
  discoverData: CachedEntry<any> | null;
  profile: CachedEntry<any> | null;
  pirateSites: CachedEntry<any[]> | null;

  // TMDB detail cache: key = `${type}_${tmdbId}`
  tmdbDetails: Record<string, any>;
  // TMDB search cache: key = query string
  tmdbSearch: Record<string, any[]>;
}

type Action =
  | { type: "SET_USER"; payload: AppUser | null }
  | { type: "SET_USER_FETCHED" }
  | { type: "SET_LIBRARY"; payload: any[] }
  | { type: "UPDATE_LIBRARY_ITEM"; payload: { id: number; updates: any } }
  | { type: "REMOVE_LIBRARY_ITEM"; payload: number }
  | { type: "SET_DISCOVER"; payload: any }
  | { type: "SET_PROFILE"; payload: any }
  | { type: "SET_PIRATE_SITES"; payload: any[] }
  | { type: "SET_TMDB_DETAIL"; key: string; payload: any }
  | { type: "SET_TMDB_SEARCH"; key: string; payload: any[] };

// ─── Reducer ──────────────────────────────────────────────────────────────────

const initialState: AppState = {
  user: null,
  userFetched: false,
  library: null,
  discoverData: null,
  profile: null,
  pirateSites: null,
  tmdbDetails: {},
  tmdbSearch: {},
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SET_USER":
      return { ...state, user: action.payload, userFetched: true };
    case "SET_USER_FETCHED":
      return { ...state, userFetched: true };
    case "SET_LIBRARY":
      return { ...state, library: { data: action.payload, fetchedAt: Date.now() } };
    case "UPDATE_LIBRARY_ITEM":
      if (!state.library) return state;
      return {
        ...state,
        library: {
          ...state.library,
          data: state.library.data.map(m =>
            m.id === action.payload.id ? { ...m, ...action.payload.updates } : m
          ),
        },
      };
    case "REMOVE_LIBRARY_ITEM":
      if (!state.library) return state;
      return {
        ...state,
        library: {
          ...state.library,
          data: state.library.data.filter(m => m.id !== action.payload),
        },
      };
    case "SET_DISCOVER":
      return { ...state, discoverData: { data: action.payload, fetchedAt: Date.now() } };
    case "SET_PROFILE":
      return { ...state, profile: { data: action.payload, fetchedAt: Date.now() } };
    case "SET_PIRATE_SITES":
      return { ...state, pirateSites: { data: action.payload, fetchedAt: Date.now() } };
    case "SET_TMDB_DETAIL":
      return { ...state, tmdbDetails: { ...state.tmdbDetails, [action.key]: action.payload } };
    case "SET_TMDB_SEARCH":
      return { ...state, tmdbSearch: { ...state.tmdbSearch, [action.key]: action.payload } };
    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface AppStoreContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  // Convenience helpers
  getUser: () => Promise<AppUser | null>;
  getLibrary: (force?: boolean) => Promise<any[]>;
  getPirateSites: () => Promise<any[]>;
  invalidateLibrary: () => void;
  invalidateDiscover: () => void;
}

const AppStoreContext = createContext<AppStoreContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

// Cache TTL in ms
const LIBRARY_TTL   = 60_000;    // 1 min
const DISCOVER_TTL  = 5 * 60_000; // 5 min
const PROFILE_TTL   = 5 * 60_000;
const SITES_TTL     = 10 * 60_000;

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Inflight request dedup refs
  const userInflight   = useRef<Promise<AppUser | null> | null>(null);
  const libraryInflight = useRef<Promise<any[]> | null>(null);
  const sitesInflight   = useRef<Promise<any[]> | null>(null);

  const getUser = useCallback(async (): Promise<AppUser | null> => {
    if (state.userFetched) return state.user;
    if (userInflight.current) return userInflight.current;

    userInflight.current = fetch("/api/auth/session")
      .then(res => res.ok ? res.json() : null)
      .then(json => {
        const user = json?.data ? { username: json.data.username, role: json.data.role } : null;
        dispatch({ type: "SET_USER", payload: user });
        userInflight.current = null;
        return user;
      })
      .catch(() => {
        dispatch({ type: "SET_USER_FETCHED" });
        userInflight.current = null;
        return null;
      });

    return userInflight.current;
  }, [state.userFetched, state.user]);

  const getLibrary = useCallback(async (force = false): Promise<any[]> => {
    const cached = state.library;
    const fresh = cached && Date.now() - cached.fetchedAt < LIBRARY_TTL;
    if (!force && fresh) return cached.data;

    if (libraryInflight.current) return libraryInflight.current;

    libraryInflight.current = fetch("/api/movies")
      .then(res => res.ok ? res.json() : { data: [] })
      .then(json => {
        const data = json.data ?? [];
        dispatch({ type: "SET_LIBRARY", payload: data });
        libraryInflight.current = null;
        return data;
      })
      .catch(() => {
        libraryInflight.current = null;
        return cached?.data ?? [];
      });

    return libraryInflight.current;
  }, [state.library]);

  const getPirateSites = useCallback(async (): Promise<any[]> => {
    const cached = state.pirateSites;
    if (cached && Date.now() - cached.fetchedAt < SITES_TTL) return cached.data;

    if (sitesInflight.current) return sitesInflight.current;

    sitesInflight.current = fetch("/api/pirate-sites")
      .then(res => res.ok ? res.json() : { data: [] })
      .then(json => {
        const data = json.data ?? [];
        dispatch({ type: "SET_PIRATE_SITES", payload: data });
        sitesInflight.current = null;
        return data;
      })
      .catch(() => {
        sitesInflight.current = null;
        return cached?.data ?? [];
      });

    return sitesInflight.current;
  }, [state.pirateSites]);

  const invalidateLibrary = useCallback(() => {
    dispatch({ type: "SET_LIBRARY", payload: state.library?.data ?? [] });
    // Force next getLibrary to re-fetch by setting fetchedAt to 0
    if (state.library) {
      // Trick: set fetchedAt very old
      dispatch({ type: "SET_LIBRARY", payload: [] });
    }
  }, [state.library]);

  const invalidateDiscover = useCallback(() => {
    dispatch({ type: "SET_DISCOVER", payload: null });
  }, []);

  return (
    <AppStoreContext.Provider
      value={{ state, dispatch, getUser, getLibrary, getPirateSites, invalidateLibrary, invalidateDiscover }}
    >
      {children}
    </AppStoreContext.Provider>
  );
}

export function useAppStore() {
  const ctx = useContext(AppStoreContext);
  if (!ctx) throw new Error("useAppStore must be used inside AppStoreProvider");
  return ctx;
}
