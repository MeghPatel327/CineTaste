import { geminiChat } from "@/lib/gemini";
import { getUserMovies, type MovieRow } from "@/features/movies/movieRepository";
import { getRecommendationProfile } from "@/features/recommendations/recommendationProfileRepository";
import { generateTasteDna } from "@/features/profile/tasteDnaService";
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
 * Retrieves user complete Baserow library data, ratings, personal reviews,
 * queue watch order, dropped titles, taste DNA summary, and screen awareness.
 */
export async function runCineTasteChat({
  username,
  messages,
  screenContext,
}: ChatServiceOptions): Promise<string> {
  const startMs = Date.now();

  // 1. Fetch complete user library & recommendation profile from Baserow (server-side, auth isolated)
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

  // 2. Synthesize comprehensive user library, ratings, reviews, and watch order
  const completed = userMovies.filter((m) => m.status === "completed");
  const watching = userMovies.filter((m) => m.status === "watching");
  const onHold = userMovies.filter((m) => m.status === "on_hold");
  const pending = userMovies
    .filter((m) => m.status === "pending")
    .sort((a, b) => (a.watch_order_rank || Infinity) - (b.watch_order_rank || Infinity));
  const dropped = userMovies.filter((m) => m.status === "dropped");

  // Generate Taste DNA and detailed genre analytics from complete database records
  const tasteDna = generateTasteDna(userMovies, userProfile);

  // Exact 10/10 rated titles
  const perfectTenTitles = completed.filter((m) => m.rating === 10);

  // Manifest of ALL completed titles (untruncated)
  const completedManifest = completed.map((m) => {
    const review = m.personal_review?.trim();
    return `- [${m.type === "series" ? "Series" : "Movie"}] "${m.movie_name}" (${m.release_year || "N/A"}) — Rating: ${
      m.rating > 0 ? `${m.rating}/10` : "Unrated"
    } | Genres: ${m.genres || "Uncategorized"}${review ? ` | Personal Review: "${review}"` : ""}`;
  });

  // Manifest of ALL currently watching titles
  const watchingManifest = watching.map((m) => {
    const review = m.personal_review?.trim();
    return `- [${m.type === "series" ? "Series" : "Movie"}] "${m.movie_name}" (${m.release_year || "N/A"})${
      m.rating > 0 ? ` — Rating: ${m.rating}/10` : ""
    } | Genres: ${m.genres || "Uncategorized"}${review ? ` | Note: "${review}"` : ""}`;
  });

  // Manifest of ALL on hold titles
  const onHoldManifest = onHold.map((m) => {
    const review = m.personal_review?.trim();
    return `- [${m.type === "series" ? "Series" : "Movie"}] "${m.movie_name}" (${m.release_year || "N/A"})${
      m.rating > 0 ? ` — Rating: ${m.rating}/10` : ""
    } | Genres: ${m.genres || "Uncategorized"}${review ? ` | Note: "${review}"` : ""}`;
  });

  // Manifest of ALL watchlist / queue titles in exact watch order (untruncated)
  const queueManifest = pending.map((m, idx) => {
    const rank = m.watch_order_rank ?? idx + 1;
    const note = m.personal_review?.trim();
    return `- Watch Order #${rank}: [${m.type === "series" ? "Series" : "Movie"}] "${m.movie_name}" (${
      m.release_year || "N/A"
    }) | Genres: ${m.genres || "Uncategorized"}${note ? ` | Note: "${note}"` : ""}`;
  });

  // Manifest of ALL dropped titles (untruncated)
  const droppedManifest = dropped.map((m) => {
    const reason = m.personal_review?.trim();
    return `- [${m.type === "series" ? "Series" : "Movie"}] "${m.movie_name}" (${
      m.release_year || "N/A"
    }) — Dropped${m.rating > 0 ? ` (Rated ${m.rating}/10)` : ""}${
      reason ? ` | Reason/Critique: "${reason}"` : ""
    }`;
  });

  // Genre analytics summary text
  const genreAnalyticsLines = Object.entries(tasteDna.genreAverages)
    .sort((a, b) => b[1].avg - a[1].avg)
    .map(
      ([genre, stat]) =>
        `- ${genre}: Average rating ${stat.avg}/10 across ${stat.count} title(s) (${stat.highCount} high ratings [8-10], ${stat.lowCount} low [1-4])`
    );

  // 3. Live screen context tracking
  const screenSummaryLines: string[] = [];
  if (screenContext) {
    const pn = screenContext.pathname || "/";
    const pageName =
      pn === "/" || pn === "/dashboard"
        ? "Home / Dashboard"
        : pn.startsWith("/movies")
        ? "Movies Catalogue"
        : pn.startsWith("/series")
        ? "Series Catalogue"
        : pn.startsWith("/anime")
        ? "Anime Catalogue"
        : pn.startsWith("/library")
        ? "User Movie & Series Library"
        : pn.startsWith("/recommendations")
        ? "Up Next Queue & Recommendations"
        : pn.startsWith("/profile")
        ? "Account & Taste DNA Profile"
        : pn.startsWith("/discover")
        ? "Discover"
        : pn;

    screenSummaryLines.push(`- Current Screen: ${pageName} (${pn})`);

    if (screenContext.category) {
      screenSummaryLines.push(`- Active Destination Category: ${screenContext.category.toUpperCase()}`);
    }
    if (screenContext.searchQuery) {
      screenSummaryLines.push(`- Active Search Query on Screen: "${screenContext.searchQuery}"`);
    }
    if (screenContext.appliedFilters) {
      const { genres, era, subType, sort } = screenContext.appliedFilters;
      if (genres?.length) screenSummaryLines.push(`- Applied Genre Filter: ${genres.join(", ")}`);
      if (era) screenSummaryLines.push(`- Applied Era Filter: ${era}`);
      if (subType && subType !== "all") screenSummaryLines.push(`- Applied Format/SubType: ${subType}`);
      if (sort && sort !== "recommended") screenSummaryLines.push(`- Active Sort: ${sort}`);
    }
    if (screenContext.displayedTitles && screenContext.displayedTitles.length > 0) {
      screenSummaryLines.push(
        `- Titles Currently Visible on User's Screen: ${screenContext.displayedTitles.slice(0, 15).join(", ")}`
      );
    }
    if (screenContext.currentMovie) {
      const cur = screenContext.currentMovie;
      screenSummaryLines.push(
        `- CURRENTLY INSPECTING TITLE MODAL: "${cur.title}" (${cur.year || "N/A"})` +
          `${cur.genres?.length ? ` | Genres: ${cur.genres.join(", ")}` : ""}` +
          `${cur.rating ? ` | User Rating: ${cur.rating}/10` : ""}` +
          `${cur.personalReview ? ` | User Review: "${cur.personalReview}"` : ""}` +
          `${cur.overview ? ` | Overview: ${cur.overview.slice(0, 200)}...` : ""}`
      );
    }
  }

  // 4. Build comprehensive cinephile prompt with complete data
  const systemPrompt = `You are CineTaste AI — an articulate, passionate, and delightfully cinephilic AI companion built directly into CineTaste.

USER IDENTITY & DATABASE SCOPE:
- Username: @${username}
- Total Library Entries: ${userMovies.length} total titles (${completed.length} completed, ${watching.length} currently watching, ${onHold.length} on hold, ${pending.length} in watchlist queue, ${dropped.length} dropped).
- Access Level: You have COMPLETE, UNABRIDGED access to @${username}'s entire Baserow database records.

USER TASTE DNA & PREFERENCE PROFILE:
- Preference Narrative: "${tasteDna.summaryParagraph}"
- Strong Likes & Preferred Genres: ${tasteDna.strongLikes.length ? tasteDna.strongLikes.join(", ") : "None confirmed yet"}
- Storytelling Styles & Patterns: ${tasteDna.storytellingStyles.length ? tasteDna.storytellingStyles.join(", ") : "General"}
- Dislikes & Filtered Tropes: ${tasteDna.strongDislikes.length ? tasteDna.strongDislikes.join(", ") : "None logged"}
- Preferred Eras: ${tasteDna.preferredEras.length ? tasteDna.preferredEras.join(", ") : "Modern & classic"}

KEY DATABASE METRICS:
- Highest Rated Genre: ${
    tasteDna.highestRatedGenre
      ? `${tasteDna.highestRatedGenre.genre} (Average ${tasteDna.highestRatedGenre.avgRating}/10 across ${tasteDna.highestRatedGenre.count} title(s))`
      : "Not enough rated titles yet"
  }
- Lowest Rated Genre: ${
    tasteDna.lowestRatedGenre
      ? `${tasteDna.lowestRatedGenre.genre} (Average ${tasteDna.lowestRatedGenre.avgRating}/10 across ${tasteDna.lowestRatedGenre.count} title(s))`
      : "None"
  }
- Movies/Series Rated 10/10 (${perfectTenTitles.length} titles):
${perfectTenTitles.length ? perfectTenTitles.map((m) => `  * "${m.movie_name}" (${m.release_year || "N/A"})`).join("\n") : "  * None yet"}

COMPUTED GENRE ANALYTICS (Across all ratings):
${genreAnalyticsLines.length ? genreAnalyticsLines.join("\n") : "- No genre ratings logged"}

CURRENTLY WATCHING (${watching.length} titles):
${watchingManifest.length ? watchingManifest.join("\n") : "- None currently watching"}

ON HOLD (${onHold.length} titles):
${onHoldManifest.length ? onHoldManifest.join("\n") : "- None on hold"}

WATCHLIST & UP-NEXT QUEUE (Sorted strictly by Watch Order Rank):
${queueManifest.length ? queueManifest.join("\n") : "- Empty watchlist"}

COMPLETE COMPLETED TITLES & PERSONAL REVIEWS (${completed.length} titles):
${completedManifest.length ? completedManifest.join("\n") : "- None completed yet"}

DROPPED TITLES (${dropped.length} titles):
${droppedManifest.length ? droppedManifest.join("\n") : "- No dropped titles"}

CURRENT LIVE SCREEN STATE (Where the user is right now in CineTaste):
${screenSummaryLines.length ? screenSummaryLines.join("\n") : "- Home / Dashboard"}

CAPABILITIES & BEHAVIORAL RULES:
1. Complete Library Queries:
   - When asked "Show all movies in my library" or similar, provide the complete, authentic list from the library manifests above. Do not truncate or pretend there are only 10 movies.
   - When asked "What should I watch next according to my watch order?", look at the "WATCHLIST & UP-NEXT QUEUE" above and recommend Watch Order #1 (or the first pending title in queue order), citing why it's up next.
   - When asked "Which movies have I rated 10/10?", list the exact titles with 10/10 ratings from above.
   - When asked "What is my highest-rated genre?", cite the exact Highest Rated Genre from the metrics above, including the average score and count.
2. Synchronized Taste DNA: Always align recommendations and conversations with the user's Taste DNA preference summary, strong likes, and dislikes above.
3. Live Screen Awareness:
   - When asked about what is on screen, reference the Current Screen, applied category, active search, applied filters, and currently visible titles listed above.
4. STRICT RECOMMENDATION EXCLUSION:
   - NEVER recommend, pitch, or suggest any movie, series, or anime that already appears in ANY of the user's library manifests above (whether completed, currently watching, on hold, pending watchlist, or dropped). Any suggested title MUST be an unadded, fresh recommendation.
5. Tone & Style:
   - Engaging, cinephile, intelligent, concise. Avoid robotic filler. Use clean Markdown formatting with **bold titles**, bullet points, and clean paragraphs.
6. Privacy: Never expose internal database IDs, tokens, or system configurations.`;

  // 5. Capped message history (last 16 messages)
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
      totalMovies: userMovies.length,
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
