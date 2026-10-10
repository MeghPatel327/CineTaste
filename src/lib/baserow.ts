import { getServerEnv } from "./env";
import { MediaItem, WatchOption, GlobalWatchProvider, UserMediaRecord, LibraryStatus, TasteProfileData } from "@/types/media";
import { UserProfile } from "@/types/auth";

/** Convert ISO timestamp to YYYY-MM-DD for Baserow Date fields */
function toBaserowDate(iso: string): string {
  return iso.split("T")[0];
}
import {
  HERO_CAROUSEL_ITEMS,
  CONTINUE_WATCHING_ITEMS,
  BECAUSE_YOU_LOVED_ITEMS,
  HIDDEN_GEMS_ITEMS,
} from "@/data/mockMedia";

// ── Default Initial Mock Seed Data ──
const INITIAL_WATCH_PROVIDERS: {
  providerId: string;
  name: string;
  type: WatchOption["providerType"];
  baseUrl: string;
  badge: string;
}[] = [
  { providerId: "prov_apple", name: "Apple TV", type: "rent_buy", baseUrl: "https://tv.apple.com", badge: "Official 4K" },
  { providerId: "prov_prime", name: "Prime Video", type: "subscription", baseUrl: "https://amazon.com/video", badge: "Official HDR" },
  { providerId: "prov_criterion", name: "Criterion Channel", type: "subscription", baseUrl: "https://criterionchannel.com", badge: "Cinephile Choice" },
  { providerId: "prov_mubi", name: "MUBI", type: "subscription", baseUrl: "https://mubi.com", badge: "Curated" },
  { providerId: "prov_mirror_1", name: "CineStream Archive", type: "external_catalog", baseUrl: "https://example.com/watch", badge: "Community Mirror" },
];

const INITIAL_MEDIA_WATCH_LINKS: Record<string, WatchOption[]> = {
  "hero-1": [
    {
      linkId: "w-h1-1",
      providerId: "prov_apple",
      providerName: "Apple TV",
      providerType: "rent_buy",
      directUrl: "https://tv.apple.com/us/movie/dune-part-two",
      qualityLabel: "4K UHD",
      languageAudio: "Dolby Atmos / English",
      badgeLabel: "Official 4K",
      isVerified: true,
    },
    {
      linkId: "w-h1-2",
      providerId: "prov_prime",
      providerName: "Prime Video",
      providerType: "rent_buy",
      directUrl: "https://www.amazon.com/gp/video/detail/dune-two",
      qualityLabel: "4K UHD",
      languageAudio: "English 5.1",
      badgeLabel: "Official HDR",
      isVerified: true,
    },
    {
      linkId: "w-h1-3",
      providerId: "prov_mirror_1",
      providerName: "CineStream Archive",
      providerType: "external_catalog",
      directUrl: "https://example.com/catalog/dune-part-two-remux",
      qualityLabel: "4K UHD",
      languageAudio: "Original Audio",
      badgeLabel: "Community Mirror",
      isVerified: true,
    },
  ],
  "hero-2": [
    {
      linkId: "w-h2-1",
      providerId: "prov_apple",
      providerName: "Apple TV",
      providerType: "rent_buy",
      directUrl: "https://tv.apple.com/us/movie/blade-runner-2049",
      qualityLabel: "4K UHD",
      languageAudio: "Dolby Atmos",
      badgeLabel: "Official 4K",
      isVerified: true,
    },
    {
      linkId: "w-h2-2",
      providerId: "prov_criterion",
      providerName: "Criterion Channel",
      providerType: "subscription",
      directUrl: "https://www.criterionchannel.com",
      qualityLabel: "1080p FHD",
      badgeLabel: "Cinephile Choice",
      isVerified: true,
    },
  ],
  "hero-3": [
    {
      linkId: "w-h3-1",
      providerId: "prov_prime",
      providerName: "Prime Video",
      providerType: "subscription",
      directUrl: "https://amazon.com/video/interstellar",
      qualityLabel: "4K UHD",
      badgeLabel: "Official HDR",
      isVerified: true,
    },
  ],
};

// ── In-Memory Store for Graceful Dev/Fallback Mode ──
const inMemoryStore = {
  users: new Map<string, { profile: UserProfile; passwordHash: string }>(),
  userMedia: new Map<string, UserMediaRecord>(), // key: `${userId}:${tmdbId}`
  watchLinks: new Map<string, WatchOption[]>(Object.entries(INITIAL_MEDIA_WATCH_LINKS)),
  tasteProfiles: new Map<string, TasteProfileData>(),
  feedback: [] as { userId: string; tmdbId: string; action: string; date: string }[],
};

// Seed default verified users for offline fallback
const SEED_MEGH_USER: UserProfile = {
  id: "usr_megh_admin",
  email: "megh@cinetaste.local",
  username: "Megh",
  role: "admin",
  preferredGenres: ["Sci-Fi", "Mystery", "Drama"],
  createdAt: "2026-10-10T00:00:00Z",
};

const SEED_PARTH_USER: UserProfile = {
  id: "usr_parth_user",
  email: "parth@cinetaste.local",
  username: "Parth",
  role: "user",
  preferredGenres: ["Action", "Sci-Fi", "Thriller"],
  createdAt: "2026-10-10T00:00:00Z",
};

inMemoryStore.users.set(SEED_MEGH_USER.username.toLowerCase(), {
  profile: SEED_MEGH_USER,
  passwordHash: "46249314085b535b979799bcd8fd7e40:bfb56be3ca6a048d8f4ff171a926467a7fd0d742deeb48bfc1512bd9f67c4abe321f20fae841fef26fee040bac4c2caedb85242303fe464506f3ed53c1475440",
});

inMemoryStore.users.set(SEED_PARTH_USER.username.toLowerCase(), {
  profile: SEED_PARTH_USER,
  passwordHash: "475764a8182a483c470e882bdd9cfad5:195dd3ab1b014514ff3c8b81a384c1dce5e16dd32be9a79c16b9486ae5d5c4813316162aa32b5853e3854cb61d298d39e94a1efaaa66cd04f5e52f606a210eb1",
});

// Seed some initial user media items
inMemoryStore.userMedia.set(`${SEED_MEGH_USER.id}:hero-1`, {
  tmdbId: "hero-1",
  libraryStatus: "watching",
  isInQueue: true,
  isFavorite: true,
  userRating: 9.5,
  watchProgress: 68,
  isExcluded: false,
  updatedAt: new Date().toISOString(),
});
inMemoryStore.userMedia.set(`${SEED_MEGH_USER.id}:hero-2`, {
  tmdbId: "hero-2",
  libraryStatus: "completed",
  isInQueue: true,
  isFavorite: true,
  userRating: 10,
  watchProgress: 100,
  isExcluded: false,
  updatedAt: new Date().toISOString(),
});

/**
 * Universal Baserow fetcher with automatic fallback & error handling
 */
async function baserowRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
  const config = getServerEnv();
  if (!config.baserow.isConfigured) {
    return { success: false, error: "Baserow is not configured. Running in memory mode." };
  }

  const url = `${config.baserow.apiUrl}${endpoint}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Token ${config.baserow.apiToken}`,
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `Baserow HTTP ${res.status}: ${errText}` };
    }

    const json = (await res.json()) as T;
    return { success: true, data: json };
  } catch (err: any) {
    return { success: false, error: `Baserow Network Error: ${err.message}` };
  }
}

// ────────────────────────────────────────────────────────────
// USER REPOSITORY
// ────────────────────────────────────────────────────────────

export async function findUserByUsername(
  username: string
): Promise<{ profile: UserProfile; passwordHash: string } | null> {
  const config = getServerEnv();
  const trimmed = username.trim();
  if (!trimmed) return null;

  if (config.baserow.isConfigured && config.baserow.tables.users) {
    const res = await baserowRequest<{ results: any[] }>(
      `/api/database/rows/table/${config.baserow.tables.users}/?user_field_names=true&filter__username__equal=${encodeURIComponent(
        trimmed
      )}`
    );

    if (!res.success) {
      throw new Error(`Baserow user lookup failed: ${res.error}`);
    }

    if (res.data && Array.isArray(res.data.results)) {
      const row = res.data.results.find(
        (r: any) => String(r.username).toLowerCase() === trimmed.toLowerCase()
      );
      if (row) {
        return {
          profile: {
            id: String(row.user_id || row.id),
            email: row.email ? String(row.email) : undefined,
            username: String(row.username),
            role: row.role?.value === "admin" || row.role === "admin" ? "admin" : "user",
            avatarUrl: row.avatar_url || undefined,
            preferredGenres: Array.isArray(row.preferred_genres)
              ? row.preferred_genres.map((g: any) => g.value || g)
              : [],
            createdAt: row.created_at || new Date().toISOString(),
          },
          passwordHash: String(row.password_hash || ""),
        };
      }
    }
    return null;
  }

  throw new Error("Baserow is not configured. User authentication unavailable.");
}

export async function findUserById(id: string): Promise<UserProfile | null> {
  const config = getServerEnv();
  if (config.baserow.isConfigured && config.baserow.tables.users) {
    const res = await baserowRequest<{ results: any[] }>(
      `/api/database/rows/table/${config.baserow.tables.users}/?user_field_names=true&filter__user_id__equal=${encodeURIComponent(id)}`
    );
    if (res.success && res.data && Array.isArray(res.data.results)) {
      const row = res.data.results.find((r: any) => String(r.user_id || r.id) === id);
      if (row) {
        return {
          id: String(row.user_id || row.id),
          email: row.email ? String(row.email) : undefined,
          username: String(row.username),
          role: row.role?.value === "admin" || row.role === "admin" ? "admin" : "user",
          avatarUrl: row.avatar_url || undefined,
          preferredGenres: Array.isArray(row.preferred_genres)
            ? row.preferred_genres.map((g: any) => g.value || g)
            : [],
          createdAt: row.created_at || new Date().toISOString(),
        };
      }
    }
  }
  return null;
}

export async function createUser(
  user: { username: string; role?: "user"; preferredGenres?: string[] },
  passwordHash: string
): Promise<{ success: boolean; data?: UserProfile; error?: string }> {
  const config = getServerEnv();
  const id = `usr_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();
  const createdDate = now.split("T")[0];

  const trimmedUsername = user.username.trim();
  const payload = {
    user_id: id,
    username: trimmedUsername,
    email: `${trimmedUsername.toLowerCase()}@cinetaste.local`,
    password_hash: passwordHash,
    role: "user", // Enforce regular user role strictly
    avatar_url: "",
    preferred_genres: user.preferredGenres || ["Sci-Fi", "Mystery"],
    is_active: true,
    created_at: createdDate,
    updated_at: createdDate,
  };

  if (!config.baserow.isConfigured || !config.baserow.tables.users) {
    return { success: false, error: "Baserow is not configured. User registration unavailable." };
  }

  const result = await baserowRequest<any>(
    `/api/database/rows/table/${config.baserow.tables.users}/?user_field_names=true`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );

  if (!result.success) {
    return { success: false, error: result.error || "Failed to create user in Baserow." };
  }

  const createdRow = result.data;
  const profile: UserProfile = {
    id: String(createdRow?.user_id || id),
    username: String(createdRow?.username || payload.username),
    email: createdRow?.email ? String(createdRow.email) : payload.email,
    role: "user",
    avatarUrl: undefined,
    preferredGenres: Array.isArray(createdRow?.preferred_genres)
      ? createdRow.preferred_genres.map((g: any) => g.value || g)
      : payload.preferred_genres,
    createdAt: createdDate,
  };

  return { success: true, data: profile };
}

// ────────────────────────────────────────────────────────────
// USER MEDIA & LIBRARY REPOSITORY
// ────────────────────────────────────────────────────────────

export async function getUserMediaRecords(userId: string): Promise<UserMediaRecord[]> {
  const config = getServerEnv();
  if (config.baserow.isConfigured && config.baserow.tables.userMedia) {
    const res = await baserowRequest<{ results: any[] }>(
      `/api/database/rows/table/${config.baserow.tables.userMedia}/?user_field_names=true&filter__user_id__equal=${encodeURIComponent(
        userId
      )}`
    );
    if (res.success && res.data) {
      return res.data.results.map((r: any) => ({
        tmdbId: String(r.tmdb_id),
        libraryStatus: (r.library_status?.value || r.library_status || "none") as LibraryStatus,
        isInQueue: Boolean(r.is_in_queue),
        isFavorite: Boolean(r.is_favorite),
        userRating: r.user_rating !== null ? Number(r.user_rating) : undefined,
        watchProgress: r.watch_progress !== null ? Number(r.watch_progress) : undefined,
        isExcluded: Boolean(r.is_excluded),
        notes: r.notes || undefined,
        updatedAt: r.updated_at || new Date().toISOString(),
      }));
    }
  }

  // Fallback to in-memory store
  const results: UserMediaRecord[] = [];
  const prefix = `${userId}:`;
  for (const [key, val] of inMemoryStore.userMedia.entries()) {
    if (key.startsWith(prefix)) {
      results.push(val);
    }
  }
  return results;
}

export async function upsertUserMediaRecord(
  userId: string,
  tmdbId: string,
  updates: Partial<Omit<UserMediaRecord, "tmdbId">>
): Promise<UserMediaRecord> {
  const key = `${userId}:${tmdbId}`;
  const existing = inMemoryStore.userMedia.get(key) || {
    tmdbId,
    libraryStatus: "none" as LibraryStatus,
    isInQueue: false,
    isFavorite: false,
    isExcluded: false,
    updatedAt: new Date().toISOString(),
  };

  const updated: UserMediaRecord = {
    ...existing,
    ...updates,
    tmdbId,
    updatedAt: new Date().toISOString(),
  };

  inMemoryStore.userMedia.set(key, updated);

  const config = getServerEnv();
  if (config.baserow.isConfigured && config.baserow.tables.userMedia) {
    // Check if row already exists
    const searchRes = await baserowRequest<{ results: any[] }>(
      `/api/database/rows/table/${config.baserow.tables.userMedia}/?user_field_names=true&filter__record_id__equal=${encodeURIComponent(
        key
      )}`
    );

    const rowPayload = {
      record_id: key,
      user_id: userId,
      tmdb_id: tmdbId,
      // Single select: plain string
      library_status: updated.libraryStatus,
      is_in_queue: updated.isInQueue,
      is_favorite: updated.isFavorite,
      user_rating: updated.userRating ?? null,
      watch_progress: updated.watchProgress ?? null,
      is_excluded: updated.isExcluded,
      notes: updated.notes || "",
      // Date field: YYYY-MM-DD only
      updated_at: toBaserowDate(updated.updatedAt),
    };

    if (searchRes.success && searchRes.data && searchRes.data.results.length > 0) {
      const rowId = searchRes.data.results[0].id;
      await baserowRequest(`/api/database/rows/table/${config.baserow.tables.userMedia}/${rowId}/?user_field_names=true`, {
        method: "PATCH",
        body: JSON.stringify(rowPayload),
      });
    } else {
      await baserowRequest(`/api/database/rows/table/${config.baserow.tables.userMedia}/?user_field_names=true`, {
        method: "POST",
        body: JSON.stringify(rowPayload),
      });
    }
  }

  return updated;
}

// ────────────────────────────────────────────────────────────
// WATCH OPTIONS REPOSITORY
// ────────────────────────────────────────────────────────────

// ────────────────────────────────────────────────────────────
// GLOBAL WATCH PROVIDERS REPOSITORY (Admin-Managed)
// ────────────────────────────────────────────────────────────

export const SEEDED_GLOBAL_PROVIDERS: GlobalWatchProvider[] = [
  { providerId: "prov_4khdhub_dl", providerName: "4KHDHub (DL)", providerType: "external_catalog", baseUrl: "https://4khdhub.one/?s={q}", isActive: true, displayOrder: 1 },
  { providerId: "prov_hdhub4u_dl", providerName: "HDHub4u (DL)", providerType: "external_catalog", baseUrl: "https://new2.hdhub4u.cl/search.html?q={q}", isActive: true, displayOrder: 2 },
  { providerId: "prov_hydrahd", providerName: "HydraHD", providerType: "external_catalog", baseUrl: "https://hydrahd.ru/index.php?menu=search&query={q}", isActive: true, displayOrder: 3 },
  { providerId: "prov_donkey", providerName: "Donkey", providerType: "external_catalog", baseUrl: "https://donkey.to/media/search?query={q}", isActive: true, displayOrder: 4 },
  { providerId: "prov_katmoviehd", providerName: "KatMovieHD", providerType: "external_catalog", baseUrl: "https://katmoviehd.pk/?s={q}", isActive: true, displayOrder: 5 },
  { providerId: "prov_mkvcinemas", providerName: "MkvCinemas", providerType: "external_catalog", baseUrl: "https://mkvcinemas.id/?s={q}", isActive: true, displayOrder: 6 },
  { providerId: "prov_cinehd", providerName: "CineHD", providerType: "external_catalog", baseUrl: "https://cinehd.app/search?q={q}", isActive: true, displayOrder: 7 },
  { providerId: "prov_ddlbase_dl", providerName: "DDLBASE (DL)", providerType: "external_catalog", baseUrl: "https://ddlbase.com/search/{q}", isActive: true, displayOrder: 8 },
  { providerId: "prov_pahe_dl", providerName: "Pahe (DL)", providerType: "external_catalog", baseUrl: "https://pahe.ink/?s={q}", isActive: true, displayOrder: 9 },
  { providerId: "prov_xgmovies_dl", providerName: "XGMovies (DL)", providerType: "external_catalog", baseUrl: "https://top.xdmovies.wtf/search.html?q={q}", isActive: true, displayOrder: 10 },
  { providerId: "prov_showbox", providerName: "ShowBox", providerType: "external_catalog", baseUrl: "https://www.showbox.media/search?keyword={q}", isActive: true, displayOrder: 11 },
  { providerId: "prov_movieparadise_dl", providerName: "MovieParadise (DL)", providerType: "external_catalog", baseUrl: "https://movieparadise.org/?s={q}", isActive: true, displayOrder: 12 },
  { providerId: "prov_hindmovie", providerName: "HindMovie", providerType: "external_catalog", baseUrl: "https://hindmovie.icu/?s={q}", isActive: true, displayOrder: 13 },
  { providerId: "prov_olamovies_dl", providerName: "OlaMovies (DL)", providerType: "external_catalog", baseUrl: "https://v3.olamovies.mov/?s={q}", isActive: true, displayOrder: 14 },
  { providerId: "prov_vyla_dl", providerName: "vyla (DL)", providerType: "external_catalog", baseUrl: "https://vyla.cc/search/{q}", isActive: true, displayOrder: 15 },
  { providerId: "prov_worldfree4u", providerName: "Worldfree4u", providerType: "external_catalog", baseUrl: "https://worldfree4u.video/?s={q}", isActive: true, displayOrder: 16 },
  { providerId: "prov_popcornflix", providerName: "POPCORNFLIX", providerType: "external_catalog", baseUrl: "https://popcornflix.com/search/{q}", isActive: true, displayOrder: 17 },
  { providerId: "prov_mp4moviez", providerName: "Mp4Moviez", providerType: "external_catalog", baseUrl: "https://mp4moviez.rip/search/{q}", isActive: true, displayOrder: 18 },
  { providerId: "prov_bingr", providerName: "Bingr", providerType: "external_catalog", baseUrl: "https://bingr.one/", isActive: true, displayOrder: 19 },
];

export async function getGlobalWatchProviders(): Promise<GlobalWatchProvider[]> {
  const config = getServerEnv();

  if (config.baserow.isConfigured && config.baserow.tables.watchProviders) {
    const res = await baserowRequest<{ results: any[] }>(
      `/api/database/rows/table/${config.baserow.tables.watchProviders}/?user_field_names=true&size=100`
    );
    if (res.success && res.data && res.data.results.length > 0) {
      return res.data.results
        .map((r: any) => ({
          id: r.id,
          providerId: String(r.provider_id || ""),
          providerName: String(r.provider_name || ""),
          providerType: (r.provider_type?.value || r.provider_type || "external_catalog") as GlobalWatchProvider["providerType"],
          baseUrl: String(r.base_url || ""),
          iconUrl: r.icon_url || undefined,
          badgeLabel: r.badge_label || undefined,
          isActive: Boolean(r.is_active),
          displayOrder: Number(r.display_order ?? 99),
        }))
        .sort((a, b) => a.displayOrder - b.displayOrder);
    }
  }

  return [...SEEDED_GLOBAL_PROVIDERS].sort((a, b) => a.displayOrder - b.displayOrder);
}

export async function createGlobalWatchProvider(data: {
  providerName: string;
  baseUrl: string;
  displayOrder?: number;
  isActive?: boolean;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  const config = getServerEnv();
  const slug = data.providerName.toLowerCase().replace(/[^a-z0-9]/g, "_");
  const providerId = `prov_${slug}_${Date.now().toString(36)}`;
  const order = data.displayOrder ?? 99;

  if (config.baserow.isConfigured && config.baserow.tables.watchProviders) {
    const res = await baserowRequest(
      `/api/database/rows/table/${config.baserow.tables.watchProviders}/?user_field_names=true`,
      {
        method: "POST",
        body: JSON.stringify({
          provider_id: providerId,
          provider_name: data.providerName,
          provider_type: "external_catalog",
          base_url: data.baseUrl,
          is_active: data.isActive !== false,
          display_order: order,
        }),
      }
    );
    return res;
  }

  return { success: true };
}

export async function updateGlobalWatchProvider(
  rowId: number | string,
  updates: Partial<{ providerName: string; baseUrl: string; displayOrder: number; isActive: boolean }>
): Promise<{ success: boolean; data?: any; error?: string }> {
  const config = getServerEnv();
  if (config.baserow.isConfigured && config.baserow.tables.watchProviders) {
    const payload: Record<string, any> = {};
    if (updates.providerName !== undefined) payload.provider_name = updates.providerName;
    if (updates.baseUrl !== undefined) payload.base_url = updates.baseUrl;
    if (updates.displayOrder !== undefined) payload.display_order = updates.displayOrder;
    if (updates.isActive !== undefined) payload.is_active = updates.isActive;

    const res = await baserowRequest(
      `/api/database/rows/table/${config.baserow.tables.watchProviders}/${rowId}/?user_field_names=true`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      }
    );
    return res;
  }

  return { success: true };
}

export async function deleteGlobalWatchProvider(rowId: number | string): Promise<{ success: boolean; error?: string }> {
  const config = getServerEnv();
  if (config.baserow.isConfigured && config.baserow.tables.watchProviders) {
    const res = await baserowRequest(
      `/api/database/rows/table/${config.baserow.tables.watchProviders}/${rowId}/`,
      {
        method: "DELETE",
      }
    );
    return res;
  }

  return { success: true };
}

/**
 * Resolves a URL template safely for a given title.
 * Substitutes {q} and {query} with encodeURIComponent(title).
 * If no placeholder, treats as a direct link without double-encoding or appending.
 */
export function buildProviderUrl(template: string, title: string): string {
  if (!template) return "#";
  const cleanTitle = title.trim();
  const encoded = encodeURIComponent(cleanTitle);

  if (template.includes("{q}")) {
    return template.replace(/\{q\}/g, encoded);
  }
  if (template.includes("{query}")) {
    return template.replace(/\{query\}/g, encoded);
  }
  return template;
}

// ────────────────────────────────────────────────────────────
// WATCH OPTIONS REPOSITORY
// ────────────────────────────────────────────────────────────

export async function getWatchOptionsForMedia(tmdbId: string, title?: string): Promise<WatchOption[]> {
  // 1. Fetch globally configured enabled providers
  const globalProviders = await getGlobalWatchProviders();
  const enabledProviders = globalProviders.filter((p) => p.isActive);

  // Determine media title for template substitution
  let mediaTitle = title;
  if (!mediaTitle) {
    const bundled = getAllBundledMedia().find((m) => m.id === tmdbId || m.tmdbId === tmdbId);
    mediaTitle = bundled ? bundled.title : tmdbId.replace(/^(movie-|tv-|hero-|cw-|byl-|gem-)/, "");
  }

  if (enabledProviders.length > 0) {
    return enabledProviders.map((p) => ({
      linkId: `glink_${p.providerId}_${tmdbId}`,
      providerId: p.providerId,
      providerName: p.providerName,
      providerType: p.providerType,
      directUrl: buildProviderUrl(p.baseUrl, mediaTitle || tmdbId),
      qualityLabel: p.providerName.includes("(DL)") ? "4K UHD" : undefined,
      badgeLabel: "External Search",
      iconUrl: p.iconUrl,
      isVerified: false,
    }));
  }

  // Fallback to seeded providers
  return SEEDED_GLOBAL_PROVIDERS.filter((p) => p.isActive).map((p) => ({
    linkId: `glink_${p.providerId}_${tmdbId}`,
    providerId: p.providerId,
    providerName: p.providerName,
    providerType: p.providerType,
    directUrl: buildProviderUrl(p.baseUrl, mediaTitle || tmdbId),
    qualityLabel: p.providerName.includes("(DL)") ? "4K UHD" : undefined,
    badgeLabel: "External Search",
    iconUrl: p.iconUrl,
    isVerified: false,
  }));
}

export async function addWatchOptionForMedia(
  tmdbId: string,
  option: Omit<WatchOption, "linkId">
): Promise<WatchOption> {
  const linkId = `link_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
  const completeOption: WatchOption = { ...option, linkId };

  const existing = inMemoryStore.watchLinks.get(tmdbId) || [];
  inMemoryStore.watchLinks.set(tmdbId, [completeOption, ...existing]);

  const config = getServerEnv();
  if (config.baserow.isConfigured && config.baserow.tables.mediaWatchLinks) {
    await baserowRequest(`/api/database/rows/table/${config.baserow.tables.mediaWatchLinks}/?user_field_names=true`, {
      method: "POST",
      body: JSON.stringify({
        link_id: linkId,
        tmdb_id: tmdbId,
        provider_id: option.providerId,
        provider_name: option.providerName,
        direct_url: option.directUrl,
        // Single select: plain string
        quality_label: option.qualityLabel || "1080p FHD",
        language_audio: option.languageAudio || "",
        badge_label: option.badgeLabel || "",
        is_verified: option.isVerified,
        created_at: toBaserowDate(new Date().toISOString()),
      }),
    });
  }

  return completeOption;
}

// ────────────────────────────────────────────────────────────
// ALL MEDIA CATALOG (Catalog Aggregator)
// ────────────────────────────────────────────────────────────

export function getAllBundledMedia(): MediaItem[] {
  const map = new Map<string, MediaItem>();
  [
    ...HERO_CAROUSEL_ITEMS,
    ...CONTINUE_WATCHING_ITEMS,
    ...BECAUSE_YOU_LOVED_ITEMS,
    ...HIDDEN_GEMS_ITEMS,
  ].forEach((item) => {
    map.set(item.id, item);
  });
  return Array.from(map.values());
}
