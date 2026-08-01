import { baserowCreate, baserowGetAll, baserowUpdate } from "@/lib/baserow";
import { env } from "@/lib/env";

export interface RecommendationProfileRow {
  id?: number;
  username: string; // Primary Key
  recommendation_profile: string; // Long Text (JSON)
  dashboard_cache: string; // Long Text (JSON)
  recommendation_confidence: number;
  library_hash: string;
  engine_version: string;
  generation_status: "Ready" | "Updating" | "Failed";
  last_error: string;
  generated_at: string;
  updated_at: string;
}

export const PROFILE_TABLE_ID = "1109767";

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
      updated_at: now,
    });
  } else {
    return baserowCreate<RecommendationProfileRow>(PROFILE_TABLE_ID, {
      ...data,
      generated_at: data.generated_at || now,
      updated_at: now,
    });
  }
}
