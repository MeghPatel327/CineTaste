import { baserowCreate, baserowGetAll, baserowUpdate } from "@/lib/baserow";
import { env } from "@/lib/env";

// ─────────────────────────────────────────────────────────────────────────────
// Row interface — matches the Baserow table schema
// ─────────────────────────────────────────────────────────────────────────────
export interface RecommendationSetRow {
  id?: number;
  username: string;
  recommendations: string; // JSON: RecommendationItem[]
  status: "active" | "stale" | "generating";
  taste_hash: string;      // fingerprint of inputs used to generate
  created_at: string;      // ISO timestamp
  expires_at: string;      // ISO timestamp
  generation_model: string;
  item_count: number;
}

export interface RecommendationItem {
  tmdb_id: number;
  title: string;
  poster_url: string | null;
  media_type: "movie" | "tv";
  genres: string[];
  release_year: number;
  vote_average: number;
  overview: string;
  backdrop_url: string | null;
  score: number;            // 0-99 match score
  reasons: string[];        // explanation strings
  gemini_reason: string;    // original Gemini explanation
}

const TABLE_ID = () => env.BASEROW_RECOMMENDATION_SETS_TABLE_ID;

/**
 * Get the active recommendation set for a user.
 * Returns null if none exists.
 */
export async function getActiveRecommendationSet(
  username: string,
): Promise<RecommendationSetRow | null> {
  if (!TABLE_ID()) return null;

  const results = await baserowGetAll<RecommendationSetRow>(TABLE_ID(), {
    search: username,
  });

  // Find the active one for this user
  const active = results
    .filter((r) => r.username === username)
    .sort((a, b) => {
      // Prefer "active" over "stale", then most recent
      if (a.status === "active" && b.status !== "active") return -1;
      if (b.status === "active" && a.status !== "active") return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  return active[0] || null;
}

/**
 * Create a new recommendation set.
 */
export async function createRecommendationSet(
  data: Omit<RecommendationSetRow, "id">,
): Promise<RecommendationSetRow> {
  return baserowCreate<RecommendationSetRow>(TABLE_ID(), data);
}

/**
 * Update an existing recommendation set.
 */
export async function updateRecommendationSet(
  id: number,
  data: Partial<Omit<RecommendationSetRow, "id">>,
): Promise<RecommendationSetRow> {
  return baserowUpdate<RecommendationSetRow>(TABLE_ID(), id, data);
}

/**
 * Mark all active sets for a user as stale.
 */
export async function markUserSetsStale(username: string): Promise<void> {
  if (!TABLE_ID()) return;

  const results = await baserowGetAll<RecommendationSetRow>(TABLE_ID(), {
    search: username,
  });

  const activeSets = results.filter(
    (r) => r.username === username && r.status === "active",
  );

  await Promise.all(
    activeSets.map((s) =>
      updateRecommendationSet(s.id!, { status: "stale" }),
    ),
  );
}

/**
 * Check if a recommendation set is still fresh (not expired and matching taste).
 */
export function isSetFresh(
  set: RecommendationSetRow,
  currentTasteHash: string,
): boolean {
  if (set.status !== "active") return false;
  if (set.taste_hash !== currentTasteHash) return false;

  const now = Date.now();
  const expiresAt = new Date(set.expires_at).getTime();
  if (isNaN(expiresAt) || now > expiresAt) return false;

  return true;
}

/**
 * Parse the recommendations JSON from a set row.
 */
export function parseRecommendations(
  set: RecommendationSetRow,
): RecommendationItem[] {
  try {
    return JSON.parse(set.recommendations || "[]");
  } catch {
    return [];
  }
}
