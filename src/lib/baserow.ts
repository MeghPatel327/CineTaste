import { getServerEnv } from "./env";
import { MediaItem, WatchOption, UserMediaRecord, LibraryStatus, TasteProfileData } from "@/types/media";
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

// Seed default demo user
const DEFAULT_DEMO_USER: UserProfile = {
  id: "usr_cinetaste_demo",
  email: "cinephile@cinetaste.local",
  username: "Deckard_Blade",
  role: "admin",
  preferredGenres: ["Sci-Fi", "Neo-Noir", "Mystery"],
  createdAt: new Date().toISOString(),
};
inMemoryStore.users.set(DEFAULT_DEMO_USER.email, {
  profile: DEFAULT_DEMO_USER,
  // pbkdf2 hash for password "cinetaste2026"
  passwordHash: "7b4f8a12c49e:8a2d103f6f194cb0f4625b16ef429e71b2d357069634e569acdf104d41fa63bc8a74e5bd9c4a12",
});

// Seed some initial user media items
inMemoryStore.userMedia.set(`${DEFAULT_DEMO_USER.id}:hero-1`, {
  tmdbId: "hero-1",
  libraryStatus: "watching",
  isInQueue: true,
  isFavorite: true,
  userRating: 9.5,
  watchProgress: 68,
  isExcluded: false,
  updatedAt: new Date().toISOString(),
});
inMemoryStore.userMedia.set(`${DEFAULT_DEMO_USER.id}:hero-2`, {
  tmdbId: "hero-2",
  libraryStatus: "completed",
  isInQueue: true,
  isFavorite: true,
  userRating: 10,
  watchProgress: 100,
  isExcluded: false,
  updatedAt: new Date().toISOString(),
});
inMemoryStore.userMedia.set(`${DEFAULT_DEMO_USER.id}:hero-3`, {
  tmdbId: "hero-3",
  libraryStatus: "completed",
  isInQueue: false,
  isFavorite: true,
  userRating: 9.0,
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

export async function findUserByEmail(email: string): Promise<{ profile: UserProfile; passwordHash: string } | null> {
  const config = getServerEnv();
  const normalizedEmail = email.toLowerCase().trim();

  if (config.baserow.isConfigured && config.baserow.tables.users) {
    const res = await baserowRequest<{ results: any[] }>(
      `/api/database/rows/table/${config.baserow.tables.users}/?user_field_names=true&filter__field_email__equal=${encodeURIComponent(
        normalizedEmail
      )}`
    );
    if (res.success && res.data && res.data.results.length > 0) {
      const row = res.data.results[0];
      return {
        profile: {
          id: String(row.user_id || row.id),
          email: String(row.email),
          username: String(row.username),
          role: row.role?.value === "admin" || row.role === "admin" ? "admin" : "user",
          avatarUrl: row.avatar_url || undefined,
          preferredGenres: Array.isArray(row.preferred_genres) ? row.preferred_genres.map((g: any) => g.value || g) : [],
          createdAt: row.created_at || new Date().toISOString(),
        },
        passwordHash: String(row.password_hash || ""),
      };
    }
  }

  // Memory fallback
  return inMemoryStore.users.get(normalizedEmail) || null;
}

export async function findUserById(id: string): Promise<UserProfile | null> {
  const config = getServerEnv();
  if (config.baserow.isConfigured && config.baserow.tables.users) {
    const res = await baserowRequest<{ results: any[] }>(
      `/api/database/rows/table/${config.baserow.tables.users}/?user_field_names=true&filter__field_user_id__equal=${encodeURIComponent(id)}`
    );
    if (res.success && res.data && res.data.results.length > 0) {
      const row = res.data.results[0];
      return {
        id: String(row.user_id || row.id),
        email: String(row.email),
        username: String(row.username),
        role: row.role?.value === "admin" || row.role === "admin" ? "admin" : "user",
        avatarUrl: row.avatar_url || undefined,
        preferredGenres: Array.isArray(row.preferred_genres) ? row.preferred_genres.map((g: any) => g.value || g) : [],
        createdAt: row.created_at || new Date().toISOString(),
      };
    }
  }

  for (const entry of inMemoryStore.users.values()) {
    if (entry.profile.id === id) return entry.profile;
  }
  return null;
}

export async function createUser(
  user: Omit<UserProfile, "id" | "createdAt">,
  passwordHash: string
): Promise<UserProfile> {
  const config = getServerEnv();
  const id = `usr_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
  const fullProfile: UserProfile = {
    ...user,
    id,
    createdAt: new Date().toISOString(),
  };

  if (config.baserow.isConfigured && config.baserow.tables.users) {
    const result = await baserowRequest(`/api/database/rows/table/${config.baserow.tables.users}/?user_field_names=true`, {
      method: "POST",
      body: JSON.stringify({
        user_id: id,
        email: fullProfile.email,
        username: fullProfile.username,
        password_hash: passwordHash,
        // Single select: plain string
        role: fullProfile.role,
        avatar_url: fullProfile.avatarUrl || "",
        // Multiple select: array of plain strings
        preferred_genres: fullProfile.preferredGenres,
        is_active: true,
        // Date fields: YYYY-MM-DD only
        created_at: toBaserowDate(fullProfile.createdAt),
        updated_at: toBaserowDate(fullProfile.createdAt),
      }),
    });
    if (!result.success) {
      console.warn(`[Baserow] createUser write failed: ${result.error}`);
    }
  }

  inMemoryStore.users.set(fullProfile.email.toLowerCase(), { profile: fullProfile, passwordHash });
  return fullProfile;
}

// ────────────────────────────────────────────────────────────
// USER MEDIA & LIBRARY REPOSITORY
// ────────────────────────────────────────────────────────────

export async function getUserMediaRecords(userId: string): Promise<UserMediaRecord[]> {
  const config = getServerEnv();
  if (config.baserow.isConfigured && config.baserow.tables.userMedia) {
    const res = await baserowRequest<{ results: any[] }>(
      `/api/database/rows/table/${config.baserow.tables.userMedia}/?user_field_names=true&filter__field_user_id__equal=${encodeURIComponent(
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
      `/api/database/rows/table/${config.baserow.tables.userMedia}/?user_field_names=true&filter__field_record_id__equal=${encodeURIComponent(
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

export async function getWatchOptionsForMedia(tmdbId: string): Promise<WatchOption[]> {
  const config = getServerEnv();

  if (config.baserow.isConfigured && config.baserow.tables.mediaWatchLinks) {
    const res = await baserowRequest<{ results: any[] }>(
      `/api/database/rows/table/${config.baserow.tables.mediaWatchLinks}/?user_field_names=true&filter__field_tmdb_id__equal=${encodeURIComponent(
        tmdbId
      )}`
    );
    if (res.success && res.data && res.data.results.length > 0) {
      return res.data.results.map((r: any) => ({
        linkId: String(r.link_id || r.id),
        providerId: String(r.provider_id || ""),
        providerName: String(r.provider_name || "External Mirror"),
        providerType: (r.provider_type?.value || "external_catalog") as WatchOption["providerType"],
        directUrl: String(r.direct_url),
        qualityLabel: r.quality_label?.value || r.quality_label || undefined,
        languageAudio: r.language_audio || undefined,
        badgeLabel: r.badge_label || undefined,
        iconUrl: r.icon_url || undefined,
        isVerified: Boolean(r.is_verified ?? true),
      }));
    }
  }

  // Memory fallback
  const direct = inMemoryStore.watchLinks.get(tmdbId);
  if (direct) return direct;

  // Generate generic verified watch links dynamically for titles that lack specific links
  return [
    {
      linkId: `gen-opt-1-${tmdbId}`,
      providerId: "prov_apple",
      providerName: "Apple TV",
      providerType: "rent_buy",
      directUrl: `https://tv.apple.com/search?term=${encodeURIComponent(tmdbId)}`,
      qualityLabel: "4K UHD",
      badgeLabel: "Official 4K",
      isVerified: true,
    },
    {
      linkId: `gen-opt-2-${tmdbId}`,
      providerId: "prov_prime",
      providerName: "Prime Video",
      providerType: "rent_buy",
      directUrl: `https://www.amazon.com/s?k=${encodeURIComponent(tmdbId)}&i=instant-video`,
      qualityLabel: "4K UHD",
      badgeLabel: "Official Store",
      isVerified: true,
    },
    {
      linkId: `gen-opt-3-${tmdbId}`,
      providerId: "prov_mirror_1",
      providerName: "CineStream Archive",
      providerType: "external_catalog",
      directUrl: `https://example.com/search/${encodeURIComponent(tmdbId)}`,
      qualityLabel: "1080p FHD",
      badgeLabel: "Community Mirror",
      isVerified: true,
    },
  ];
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
