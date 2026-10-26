import { geminiChat } from "@/lib/gemini";
import { getUserMovies, type MovieRow } from "@/features/movies/movieRepository";
import { getRecommendationProfile } from "@/features/recommendations/recommendationProfileRepository";
import type { ScreenContextData } from "@/lib/screenContext";
import { logger } from "@/lib/logger";

export interface ChatMessageInput {
  role: "user" | "assistant";
  content: string;
}

export interface ChatServiceOptions {
  username: string;
  messages: ChatMessageInput[];
  screenContext?: ScreenContextData;
}

/**
 * CineTaste AI Chat Service:
 * Retrieves user library data, ratings, personal reviews, watchlist,
 * constructs screen-aware context, and engages Gemini with online browsing capabilities.
 */
export async function runCineTasteChat({
  username,
  messages,
  screenContext,
}: ChatServiceOptions): Promise<string> {
  const startMs = Date.now();

  // 1. Fetch user library & taste profile from Baserow
  let userMovies: MovieRow[] = [];
  let userProfile: any = null;

  try {
    const [m, p] = await Promise.all([
      getUserMovies(username),
      getRecommendationProfile(username),
    ]);
    userMovies = m || [];
    userProfile = p || null;
  } catch (err: any) {
    logger.warn({
      module: "chatService",
      action: "FETCH_USER_DATA_FAILED",
      error: err?.message,
    });
  }

  // 2. Synthesize user taste profile & library
  const completed = userMovies.filter((m) => m.status === "completed" && m.rating > 0);
  const pending = userMovies.filter((m) => m.status === "pending");
  const dropped = userMovies.filter((m) => m.status === "dropped");

  // Loved titles (8-10) with personal reviews
  const lovedTitles = completed
    .filter((m) => m.rating >= 8)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 15)
    .map((m) => {
      const review = m.personal_review?.trim();
      return `- "${m.movie_name}" (${m.release_year || "N/A"}) — Rated ${m.rating}/10${review ? ` | Review: "${review}"` : ""}`;
    });

  // Disliked titles (<=4) with personal reviews
  const dislikedTitles = completed
    .filter((m) => m.rating <= 4 && m.rating > 0)
    .slice(0, 10)
    .map((m) => {
      const review = m.personal_review?.trim();
      return `- "${m.movie_name}" — Rated ${m.rating}/10${review ? ` | Review: "${review}"` : ""}`;
    });

  // Current watchlist (first 12)
  const watchlistTitles = pending.slice(0, 12).map((m) => {
    return `- "${m.movie_name}" (${m.release_year || "N/A"})${m.watch_order_rank ? ` [Rank #${m.watch_order_rank}]` : ""}`;
  });

  // Parse favorite genres from profile if present
  let favGenresList = "";
  if (userProfile?.favorite_genres) {
    try {
      const fg = JSON.parse(userProfile.favorite_genres);
      const topFg = Object.entries(fg)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 6)
        .map(([g]) => g);
      if (topFg.length) favGenresList = topFg.join(", ");
    } catch {
      // skip
    }
  }

  // 3. Synthesize screen context
  const screenSummaryLines: string[] = [];
  if (screenContext) {
    screenSummaryLines.push(`- Current Page: ${screenContext.pathname || "/"}`);
    if (screenContext.category) {
      screenSummaryLines.push(`- Active Destination Category: ${screenContext.category.toUpperCase()}`);
    }
    if (screenContext.searchQuery) {
      screenSummaryLines.push(`- Active Search Query: "${screenContext.searchQuery}"`);
    }
    if (screenContext.appliedFilters) {
      const { genres, era, subType, sort } = screenContext.appliedFilters;
      if (genres?.length) screenSummaryLines.push(`- Applied Genres: ${genres.join(", ")}`);
      if (era) screenSummaryLines.push(`- Applied Era: ${era}`);
      if (subType && subType !== "all") screenSummaryLines.push(`- Anime Type: ${subType}`);
      if (sort && sort !== "recommended") screenSummaryLines.push(`- Sort Order: ${sort}`);
    }
    if (screenContext.currentMovie) {
      const cur = screenContext.currentMovie;
      screenSummaryLines.push(
        `- CURRENTLY VIEWING TITLE DETAILS ON SCREEN: "${cur.title}" (${cur.year || "N/A"})` +
        `${cur.genres?.length ? ` | Genres: ${cur.genres.join(", ")}` : ""}` +
        `${cur.rating ? ` | User Rating: ${cur.rating}/10` : ""}` +
        `${cur.personalReview ? ` | User Review: "${cur.personalReview}"` : ""}` +
        `${cur.overview ? ` | Overview: ${cur.overview.slice(0, 200)}...` : ""}`
      );
    }
  }

  // 4. Build comprehensive, cinephile system prompt
  const systemPrompt = `You are CineTaste AI — an articulate, passionate, and delightfully cinephilic AI companion built directly into CineTaste.

USER IDENTITY:
- Username: @${username}
- Library Counts: ${completed.length} completed & rated, ${pending.length} in watchlist, ${dropped.length} dropped.
${favGenresList ? `- Top Favorite Genres: ${favGenresList}` : ""}

USER'S LOVED TITLES & PERSONAL REVIEWS (Rated 8-10):
${lovedTitles.length ? lovedTitles.join("\n") : "- None logged yet"}

USER'S DISLIKED TITLES (Rated 4 or below):
${dislikedTitles.length ? dislikedTitles.join("\n") : "- None logged yet"}

USER'S CURRENT WATCHLIST / UP-NEXT QUEUE:
${watchlistTitles.length ? watchlistTitles.join("\n") : "- Empty watchlist"}

USER'S CURRENT SCREEN STATE:
${screenSummaryLines.length ? screenSummaryLines.join("\n") : "- Browsing CineTaste"}

CORE CAPABILITIES & BEHAVIOR:
1. Online Browsing & Real-Time Knowledge: You have real-time access to the web. When asked about upcoming releases, release dates, current box office, streaming platforms, festival winners, recent director/actor news, or real-world film information, provide fresh, accurate information.
2. Personalized Taste Connection: When suggesting movies or series, explicitly tie your reasoning back to what the user loved or wrote in their personal reviews, as well as their watchlist.
3. Screen Awareness: When the user asks "What should I watch on this screen?", "Tell me about this show", or references what's visible, directly refer to the active screen, category, filters, or the title they are currently viewing in their modal.
4. Tone & Style: Engaging, cinephile, intelligent, concise. Avoid robotic cliches. Use clean Markdown formatting with **bold titles**, bullet points, and short readable paragraphs.
5. Privacy & Safety: Do not reveal backend database IDs, system tokens, or internal API structures.`;

  // 5. Capped message history (last 16 messages to stay fast and within prompt budget)
  const recentMessages = (messages || []).slice(-16).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  try {
    const reply = await geminiChat({
      messages: [
        { role: "system", content: systemPrompt },
        ...recentMessages,
      ],
      temperature: 0.7,
      maxTokens: 1024,
      timeoutMs: 35_000,
    });

    logger.info({
      module: "chatService",
      action: "CINETASTE_CHAT_SUCCESS",
      username,
      durationMs: Date.now() - startMs,
      historyLength: recentMessages.length,
    });

    return reply;
  } catch (err: any) {
    logger.error({
      module: "chatService",
      action: "CINETASTE_CHAT_ERROR",
      username,
      error: err?.message,
    });
    throw err;
  }
}
