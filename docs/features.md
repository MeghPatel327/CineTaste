# Feature Guide & Modules

This document details the functional systems, user interfaces, and business logic across CineTaste.

---

## 1. Media Hubs & Strict Category Isolation

CineTaste maintains dedicated destinations for each cinematic medium:
- **Movies Hub** (`/movies`)
- **TV Series Hub** (`/series`)
- **Anime Hub** (`/anime`)

### Category Isolation & Anime Classification
To prevent media crossover:
- Movies Hub displays only explicit live-action feature films (`media_type === "movie"` and non-anime).
- TV Series Hub displays only non-anime multi-episode television series (`media_type === "tv"` and non-anime).
- Anime Hub displays both TV anime and anime feature films identified by [src/features/movies/animeClassifier.ts](file:///d:/My_Codes/Project/CineTaste/src/features/movies/animeClassifier.ts).

The `animeClassifier` inspects:
1. `genre_ids`: TMDB genre `16` (Animation).
2. `original_language`: `ja` (Japanese).
3. `origin_country`: `JP` (Japan).
4. `keywords`: Anime-specific production keywords.
5. Title & overview keyword patterns.

### Multi-Filter Discovery Engine
- **Multi-Genre Strict AND Matching**: Users can select multiple genres (e.g., *Sci-Fi* + *Thriller*); titles must match **all** selected genres.
- **Era Filtering**: Filter titles by decade (*2020s*, *2010s*, *2000s*, *1990s*, *1980s*, *Classic*).
- **Format Toggle**: On the Anime hub, users can toggle between *All Formats*, *TV Series*, or *Anime Movies*.
- **Dynamic Infinite Discovery**: When filters narrow down the catalog below 50 titles, the browse engine automatically triggers TMDB discovery to fetch matching candidates seamlessly.

---

## 2. Library & Watch Queue Management (`/library`)

Located at [src/app/library/page.tsx](file:///d:/My_Codes/Project/CineTaste/src/app/library/page.tsx).

### Five Tracked Statuses

| Status | Badge Color | Definition & Behavior |
|---|---|---|
| **`pending`** | Amber | Up Next Watchlist queue. Holds an integer `watch_order_rank` (`1..N`). |
| **`watching`** | Cyan | Currently watching an active series or feature. Excluded from queue sequence; supports live rating and personal notes. |
| **`on_hold`** | Purple | Started but temporarily paused (e.g. waiting for new season/episodes). Supports rating and personal notes. |
| **`completed`** | Emerald | Finished watching. Stores 1–10 rating and optional long-form personal review. Feeds Taste DNA. |
| **`dropped`** | Rose | Discontinued due to negative preference. Net score penalties feed Taste DNA dislikes. |

### Watch Queue Reordering
- Pending titles maintain a strict, gap-free continuous ranking (`1, 2, 3...`).
- When an item moves from `pending` to another status (e.g. `completed` or `watching`), `handleStatusChange` in [src/features/movies/queueService.ts](file:///d:/My_Codes/Project/CineTaste/src/features/movies/queueService.ts) clears its rank and shifts all lower-ranked items up by 1.
- When an item enters `pending`, it is automatically assigned the next available rank (`max(rank) + 1`).

---

## 3. Media Details Modal

Located at [src/components/MovieDetailsModal.tsx](file:///d:/My_Codes/Project/CineTaste/src/components/MovieDetailsModal.tsx).

- **Standardized Action Labels**: Clean, non-redundant labels across all media types:
  - Add action: `Add to Library`
  - Edit action: `Edit` (previously `Edit Movie`)
  - Form submit: `Save to Library` or `Update`
  - Delete action: `Remove`
- **Embedded YouTube Trailer**: Automatically resolves and displays official high-definition trailers from TMDB video feeds.
- **Top Cast & Crew**: Horizontally scrolling cast list with profile images, character names, director, writers, and production studios.
- **Similar Titles**: Clean recommendations with library titles strictly filtered out.
- **External Stream Search**: Direct one-click search links into configured external streaming services (`pirate_sites` table).

---

## 4. CineTaste AI Chatbot

Located at [src/components/CineTasteChatbot.tsx](file:///d:/My_Codes/Project/CineTaste/src/components/CineTasteChatbot.tsx) and [src/features/chat/chatService.ts](file:///d:/My_Codes/Project/CineTaste/src/features/chat/chatService.ts).

### Comprehensive Knowledge Injection
The system prompt injects unabridged real-time data on every conversation turn:
- **Full Library Manifests**: Every title in Completed, Currently Watching, On Hold, Up Next Queue, and Dropped.
- **Computed Taste DNA**: Summary paragraph, strong likes, dislikes, storytelling patterns, and preferred eras.
- **Genre Rating Analytics**: Exact average rating, title count, and high/low rating distribution per genre.
- **10/10 Perfect Scores**: Exact list of user's all-time favorite masterpieces.
- **Live Screen Awareness**: Informs the assistant of the user's active page, selected category, active search text, applied filters, and currently visible titles.

### Strict Anti-Recommendation Rule
The chatbot is bound by an absolute prompt instruction:
> *NEVER recommend, pitch, or suggest any movie, series, or anime that already appears in ANY of the user's library manifests (whether completed, watching, on hold, pending, or dropped).*

---

## 5. Dashboard & Analytics (`/dashboard`)

Located at [src/app/dashboard/page.tsx](file:///d:/My_Codes/Project/CineTaste/src/app/dashboard/page.tsx).

- **Key Metrics**: Total titles, completed count, currently watching, on hold, dropped count, completion rate percentage, and average rating.
- **Hero Spotlight**: Dynamic banner spotlighting the top candidate from hybrid recommendations or the user's #1 Up Next queue item.
- **Interactive Top Genres Chart**: Recharts visualization illustrating viewing distribution across top 7 genres.
- **Curated Insights**: Highlights favorite genre, top director, favorite cinema era, and preferred film industry.

---

## 6. Admin Panel & System Health (`/admin`)

Located at [src/app/admin/page.tsx](file:///d:/My_Codes/Project/CineTaste/src/app/admin/page.tsx).

- **Gemini Health Diagnostics**: Real-time diagnostic card executing a live Gemini ping to measure response latency (ms), model status, and quota health.
- **User Account Management**: Full table of registered users with role toggling (`user` ↔ `admin`) and account blocking.
- **Administrative Password Reset**: Secure password override for account recovery.
- **Streaming Site Template Manager**: Add, edit, or disable streaming search templates (`{query}` token substitution).
