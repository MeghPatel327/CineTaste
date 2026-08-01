import { baserowCreate, baserowGetAll, baserowUpdate } from "@/lib/baserow";
import { env } from "@/lib/env";

// ─────────────────────────────────────────────────────────────────────────────
// Row interface — matches the Baserow table schema exactly
// ─────────────────────────────────────────────────────────────────────────────
export interface RecommendationProfileRow {
  id?: number;
  username: string;
  favorite_genres: string;              // JSON: Record<string, number>
  disliked_genres: string;              // JSON: Record<string, number>
  favorite_actors: string;              // JSON: Record<string, number>
  favorite_directors: string;           // JSON: Record<string, number>
  favorite_production_companies: string;// JSON: Record<string, number>
  favorite_industries: string;          // JSON: Record<string, number>
  favorite_eras: string;                // JSON: Record<string, number>
  language_preferences: string;         // JSON: Record<string, number>
  library_hash: string;
  generated_at: string;
  engine_version: string;
}

export const PROFILE_TABLE_ID = env.BASEROW_RECOMMENDATION_PROFILE_TABLE_ID;

export async function getRecommendationProfile(username: string): Promise<RecommendationProfileRow | null> {
  const results = await baserowGetAll<RecommendationProfileRow>(PROFILE_TABLE_ID, {
    search: username,
  });
  const profile = results.find(r => r.username === username);
  return profile || null;
}

export async function saveRecommendationProfile(
  data: Partial<Omit<RecommendationProfileRow, "id">> & { username: string }
): Promise<RecommendationProfileRow> {
  const existing = await getRecommendationProfile(data.username);
  const now = new Date().toISOString();

  if (existing && existing.id) {
    return baserowUpdate<RecommendationProfileRow>(PROFILE_TABLE_ID, existing.id, {
      ...data,
    });
  } else {
    return baserowCreate<RecommendationProfileRow>(PROFILE_TABLE_ID, {
      ...data,
      generated_at: data.generated_at || now,
    });
  }
}
