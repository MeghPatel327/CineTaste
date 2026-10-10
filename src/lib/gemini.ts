import { getServerEnv } from "./env";

export interface UserTasteContext {
  userId: string;
  watchedTitles: { title: string; rating?: number; genres: string[] }[];
  favoriteGenres: string[];
  excludedTitles: string[];
  preferredTones?: string[];
}

export interface RecommendedCandidate {
  title: string;
  tmdbId?: string;
  reason: string;
  similarityScore: number;
}

export interface RecommendationProvider {
  name: string;
  generateRecommendations(context: UserTasteContext): Promise<RecommendedCandidate[]>;
}

/**
 * OpenAI-compatible provider for Gemini Web2API (supports both local and production URLs)
 */
export class GeminiWeb2APIProvider implements RecommendationProvider {
  name = "GeminiWeb2APIProvider";

  async generateRecommendations(context: UserTasteContext): Promise<RecommendedCandidate[]> {
    const config = getServerEnv();
    const endpoint = `${config.ai.baseUrl}/chat/completions`;

    const prompt = `You are CineTaste's intelligent film curator.
User Profile:
- Favorite Genres: ${context.favoriteGenres.join(", ") || "Sci-Fi, Neo-Noir, Mystery"}
- Titles Watched & Ratings: ${context.watchedTitles.map((t) => `${t.title} (${t.rating ? `${t.rating}/10` : "watched"})`).join(", ") || "None yet (New User)"}
- Excluded Titles: ${context.excludedTitles.join(", ") || "None"}

Generate 5 personalized, distinct, high-quality movie or series recommendations.
Do NOT recommend any title in the Watched or Excluded lists.
Include high aesthetic films (cinematography, soundtrack, compelling narrative).
Format your response STRICTLY as a JSON array of objects with keys:
"title" (exact English movie/series title),
"reason" (one compelling sentence explaining why this matches their taste DNA),
"similarityScore" (number between 0.70 and 0.99).
Do NOT wrap in markdown backticks or commentary. Only raw JSON.`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (config.ai.apiKey) {
      headers["Authorization"] = `Bearer ${config.ai.apiKey}`;
    }

    const payload = {
      model: config.ai.model,
      messages: [
        { role: "system", content: "You are a professional film curator. Output strict JSON only." },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 800,
    };

    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(config.ai.timeoutMs),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini Web2API error HTTP ${res.status}: ${errText}`);
    }

    const json = await res.json();
    const content = json.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new Error("Empty response from Gemini Web2API");
    }

    // Clean JSON response if wrapped in markdown code fence
    const cleaned = content.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
    const parsed = JSON.parse(cleaned);

    if (!Array.isArray(parsed)) {
      throw new Error("Invalid response format: expected array");
    }

    return parsed.map((item: any) => ({
      title: String(item.title || ""),
      reason: String(item.reason || "High affinity with your curated taste DNA"),
      similarityScore: Number(item.similarityScore || 0.85),
    }));
  }
}

/**
 * Deterministic Content-Based Algorithmic Fallback Provider
 * Ensures 100% resilience when Gemini Web2API endpoint is offline or unavailable.
 */
export class AlgorithmicFallbackProvider implements RecommendationProvider {
  name = "AlgorithmicFallbackProvider";

  async generateRecommendations(context: UserTasteContext): Promise<RecommendedCandidate[]> {
    const excludedSet = new Set(
      [...context.watchedTitles.map((w) => w.title.toLowerCase()), ...context.excludedTitles.map((e) => e.toLowerCase())]
    );

    const candidates = [
      {
        title: "Children of Men",
        reason: "Directorial precision and tense atmosphere aligned with your dystopian preferences",
        similarityScore: 0.94,
        genres: ["Sci-Fi", "Thriller"],
      },
      {
        title: "Ex Machina",
        reason: "Philosophical exploration of consciousness and synthetic intelligence",
        similarityScore: 0.91,
        genres: ["Sci-Fi", "Drama"],
      },
      {
        title: "Coherence",
        reason: "98% taste match in cerebral quantum puzzle narrative and intimate tension",
        similarityScore: 0.89,
        genres: ["Mystery", "Sci-Fi"],
      },
      {
        title: "Dark City",
        reason: "Seminal neo-noir cyberpunk classic with immersive architectural worldbuilding",
        similarityScore: 0.88,
        genres: ["Mystery", "Sci-Fi"],
      },
      {
        title: "Annihilation",
        reason: "Surreal extraterrestrial anomaly and hypnotic auditory soundscape",
        similarityScore: 0.86,
        genres: ["Sci-Fi", "Horror"],
      },
      {
        title: "Solaris",
        reason: "Contemplative space station mystery exploring memories and grief",
        similarityScore: 0.85,
        genres: ["Sci-Fi", "Mystery"],
      },
      {
        title: "The Vast of Night",
        reason: "Pioneering camera sequence long-takes and retro audio radio mystery",
        similarityScore: 0.84,
        genres: ["Drama", "Mystery"],
      },
      {
        title: "Primer",
        reason: "The quintessential rigorous indie hard-sci-fi time loop construct",
        similarityScore: 0.82,
        genres: ["Sci-Fi", "Drama"],
      },
    ];

    const filtered = candidates.filter((c) => !excludedSet.has(c.title.toLowerCase()));

    // Genre scoring boost
    const userGenreSet = new Set(context.favoriteGenres.map((g) => g.toLowerCase()));
    filtered.sort((a, b) => {
      const aMatches = a.genres.filter((g) => userGenreSet.has(g.toLowerCase())).length;
      const bMatches = b.genres.filter((g) => userGenreSet.has(g.toLowerCase())).length;
      return bMatches - aMatches || b.similarityScore - a.similarityScore;
    });

    return filtered.slice(0, 5);
  }
}
