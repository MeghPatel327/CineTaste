# CineTaste

**A personal  movie, TV series & anime companion powered by intelligent taste learning and Gemini AI.**

CineTaste is a smart watchlist manager and hybrid recommendation platform. It tracks your movies, series, and anime, learns what you love from your ratings and personal reviews, and delivers personalized recommendations through a cinema-inspired interface.

---

## Features

### CineTaste AI Chatbot
- **Context-Aware Assistant** — knows your entire library, ratings, personal reviews, and current watch queue
- **Screen Context Awareness** — senses which page you are on (Movies, Series, Anime, Discover, Queue) and adapts conversation accordingly
- **Live Search & Trivia** — answers questions, discusses plotlines, and fetches streaming availability and trivia
- **Floating UI** — toggleable, non-intrusive chat window with markdown rendering, suggestion chips, and responsive layout

### Smart Hybrid Recommendations
- **Dual-Engine Architecture**:
  - **Deterministic Multi-Factor Scoring** — weighted across genre (45%), keywords (20%), director (10%), film industry (8%), cast (5%), runtime (4%), release decade (4%), and TMDB rating (4%)
  - **Gemini AI Candidate Generation** — analyzes deep taste profiles to discover non-obvious cinematic gems and thematic matches
- **Taste Profile Hashing** — generates cryptographic hashes of your library state; rebuilds recommendations automatically when taste profile shifts or freshness expires
- **Diversity Filtering** — caps titles per director and release decade to prevent feed monotony
- **Cold Start Fallback** — dynamically serves top-rated, trending, and curated titles until sufficient ratings are recorded

### Media Hubs & Strict Category Isolation
- **Dedicated Hubs** — distinct routes for **Movies** (`/movies`), **TV Series** (`/series`), and **Anime** (`/anime`)
- **Strict Category Isolation** — series never bleed into movies, anime movies/series stay properly classified
- **Anime Classifier** — automated heuristics detecting Japanese animation by original language, production country, keywords, and genre tags
- **Multi-Genre Filter Pipeline** — filter by multiple genres simultaneously with real-time tag counts

### Library & Queue Management
- **Status Tracking** — Completed, Pending, and Dropped
- **Smart Watch Queue** — prioritized watch queue with draggable reordering and one-click item migration
- **Ratings & Personal Reviews** — 1–10 rating scale paired with long-form personal review notes
- **Direct Watch Links** — store custom streaming URLs or local file paths per title
- **TMDB Enrichment** — auto-fetches genres, runtimes, cast, crew, release dates, and high-res posters

### Discovery & Curated Catalogues
- **Unified Search** — fast search across movies, series, and anime with TMDB autocomplete
- **Sticky Filter Panel** — smooth scroll-transitioning search and genre filters with floating and docked visual modes
- **Curated Catalogues & Fallbacks** — pre-curated sets ensuring rich discovery feeds even during API rate limits or network issues
- **Client-Side SWR Caching** — sub-second navigation between categories without re-fetching

### Dashboard & Analytics
- **Viewing Statistics** — total tracked items, completed count, pending queue, and drop rate
- **Next to Watch Card** — instant access to the top item in your watch queue
- **Genre Breakdown** — interactive pie chart showing your top 7 genres
- **Animated Metrics** — smooth count-up animations on load

### Admin Panel & System Health
- **Gemini Health Diagnostics** — live card testing Gemini API connectivity, response latency, and quota
- **User Administration** — view all registered accounts, toggle admin privileges, or block accounts
- **Password Reset** — administrative password override
- **Pirate Site Templates** — manage external search URL templates with customizable search queries

### UI / UX Design
- **Ambient Poster Glow** — cards extract poster palette colors using CORS-safe canvas sampling for ambient shadows
- **Persistent App Shell** — persistent sidebar and audio/chat layers that never remount across page transitions
- **Route Prefetching** — preloads common routes on initial mount for near-instant navigation
- **Scroll Position Restoration** — remembers exact scroll offsets when navigating back from details
- **Theme** — cinema dark palette (`#0B0B0F`, `#111116`) styled with Tailwind CSS v4

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [Next.js 16](https://nextjs.org) (App Router, Server Components) |
| **UI Library** | [React 19](https://react.dev) |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com) (Modern CSS theme tokens) |
| **Database** | [Baserow](https://baserow.io) (REST API-driven relational tables) |
| **AI / LLM** | [Google Gemini](https://ai.google.dev/) (Taste candidate synthesis, AI Chatbot) |
| **Movie Metadata** | [TMDB API v3](https://developer.themoviedb.org/reference/intro/getting-started) |
| **Charts** | [Recharts](https://recharts.org) |
| **Toasts** | [Sonner](https://sonner.emilkowal.ski) |
| **Icons** | [Lucide React](https://lucide.dev) |
| **Auth & Security** | `jose` (JWT HTTP-only cookies) + `bcryptjs` (password hashing) |
| **Validation** | [Zod](https://zod.dev) |
| **Language** | TypeScript |

---

## Prerequisites

- **Node.js** 18.x or 20.x+
- **npm** or **pnpm**
- **Baserow Account** — free cloud tier or self-hosted ([baserow.io](https://baserow.io))
- **TMDB API Key** — free developer key ([themoviedb.org/settings/api](https://www.themoviedb.org/settings/api))
- **Gemini API Key** — Google AI Studio key ([aistudio.google.com](https://aistudio.google.com/))

---

## Setup & Installation

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/MeghPatel327/CineTaste.git
cd CineTaste
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```env
# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Auth
AUTH_SECRET=your_random_32_character_secret_here

# Baserow Core
BASEROW_API_URL=https://api.baserow.io
BASEROW_DATABASE_ID=your_database_id
BASEROW_API_TOKEN=your_baserow_api_token

# Baserow Table IDs (Populated manually or via setup script)
BASEROW_USERS_TABLE_ID=your_users_table_id
BASEROW_MOVIES_TABLE_ID=your_movies_table_id
BASEROW_PIRATES_TABLE_ID=your_pirate_sites_table_id
BASEROW_RECOMMENDATION_PROFILE_TABLE_ID=your_rec_profile_table_id
BASEROW_RECOMMENDATION_SETS_TABLE_ID=your_rec_sets_table_id

# TMDB API
TMDB_API_KEY=your_tmdb_api_key

# Gemini AI
GEMINI_API_KEY=your_gemini_api_key
GEMINI_API_BASE_URL=https://gemini-web2api-clone.vercel.app/v1
GEMINI_MODEL=gemini-3.7-flash

# Recommendation Tuning
RECOMMENDATION_FRESHNESS_HOURS=72
```

> **Tip:** Generate a secure `AUTH_SECRET` in PowerShell or Bash:
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

### 3. Initialize Baserow Database

You can automatically provision all five required tables and update your `.env` file by providing `BASEROW_API_TOKEN` and `BASEROW_DATABASE_ID`, then running:

```bash
npm run setup-db
```

#### Table Schema Reference

<details>
<summary>Click to view manual Baserow table schemas</summary>

1. **`users`**
   - `username` (Text)
   - `password_hash` (Text)
   - `role` (Select: `user`, `admin`)
   - `blocked` (Boolean)
   - `created_at` (Date, ISO)
   - `last_login` (Date, ISO)

2. **`movies`**
   - `username` (Text)
   - `movie_name` (Text)
   - `type` (Text: `"movie"` | `"series"`)
   - `status` (Text: `"pending"` | `"completed"` | `"dropped"`)
   - `rating` (Number, 1 decimal)
   - `personal_review` (Long Text)
   - `watch_order_rank` (Number, integer)
   - `watch_link` (URL)
   - `tmdb_id` (Number, integer)
   - `genres` (Long Text, JSON array)
   - `release_year` (Number, integer)
   - `runtime` (Number, integer)
   - `language` (Text)
   - `poster_url` (URL)
   - `overview` (Long Text)

3. **`pirate_sites`**
   - `name` (Text)
   - `search_url` (URL with `{query}` token)
   - `enabled` (Boolean)

4. **`recommendation_profile`**
   - `username` (Text)
   - `favorite_genres` (Long Text)
   - `disliked_genres` (Long Text)
   - `favorite_actors` (Long Text)
   - `favorite_directors` (Long Text)
   - `favorite_production_companies` (Long Text)
   - `favorite_industries` (Long Text)
   - `favorite_eras` (Long Text)
   - `language_preferences` (Long Text)
   - `library_hash` (Text)
   - `generated_at` (Text)
   - `engine_version` (Text)

5. **`recommendation_sets`**
   - `username` (Text)
   - `recommendations` (Long Text, JSON)
   - `status` (Text)
   - `taste_hash` (Text)
   - `created_at` (Text)
   - `expires_at` (Text)
   - `generation_model` (Text)
   - `item_count` (Number, integer)

</details>

### 4. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000). The first registered account automatically receives the **admin** role.

---

## Available Scripts

| Script | Command | Purpose |
|---|---|---|
| `dev` | `npm run dev` | Starts local Next.js development server at port 3000 |
| `build` | `npm run build` | Compiles production bundle |
| `start` | `npm run start` | Starts production server |
| `lint` | `npm run lint` | Runs ESLint check across source code |
| `setup-db` | `npm run setup-db` | Automatically creates tables and fields in Baserow |

---

## Project Structure

```
src/
├── app/                              # Next.js App Router
│   ├── page.tsx                      # Root landing / redirect
│   ├── layout.tsx                    # Root layout with theme & screen providers
│   ├── globals.css                   # Tailwind v4 theme, keyframes, scrollbars
│   ├── login/                        # Authentication: Login
│   ├── register/                     # Authentication: Register (auto-admin for #1)
│   ├── dashboard/                    # Overview metrics, charts, next to watch
│   ├── movies/                       # Dedicated Movies hub
│   │   ├── add/                      # Add to library form
│   │   └── edit/[id]/                # Edit library item form
│   ├── series/                       # Dedicated TV Series hub
│   ├── anime/                        # Dedicated Anime hub
│   ├── library/                      # Unified library & watch queue manager
│   ├── discover/                     # TMDB search, curated rows, recommendations
│   ├── recommendations/              # In-depth recommendation feed
│   ├── profile/                      # User settings & password change
│   ├── about/                        # About CineTaste, developer info & stats
│   ├── admin/                        # Admin panel & Gemini health monitoring
│   └── api/                          # Next.js Serverless API routes
│       ├── admin/                    # Users, password reset, Gemini health check
│       ├── auth/                     # Session, login, register, password change
│       ├── browse/                   # Category-specific browse feed proxy
│       ├── chat/                     # CineTaste AI chatbot endpoint (Gemini)
│       ├── dashboard/                # Aggregated user statistics
│       ├── discover/                 # Curated discover feed
│       ├── movies/                   # Library CRUD & TMDB sync
│       ├── pirate-sites/             # Streaming link templates
│       ├── queue/                    # Watch queue order & migration
│       ├── recommendations/          # Hybrid recommendations & profile rebuild
│       ├── search/                   # Unified multi-category search
│       └── tmdb/                     # TMDB proxy endpoints (search, details)
├── components/                       # Shared React components
│   ├── AppShell.tsx                  # Persistent sidebar & app wrapper
│   ├── Sidebar.tsx                   # Main navigation with route prefetching
│   ├── CineTasteChatbot.tsx          # Screen-aware AI assistant dialog
│   ├── CategoryBrowseView.tsx        # Common browse UI for movies, series, anime
│   ├── MovieCard.tsx                 # Media card with ambient color glow
│   ├── MovieDetailsModal.tsx         # Deep details modal (cast, trailers, similar)
│   ├── RatingModal.tsx               # Rating (1-10) and personal review modal
│   ├── HorizontalRow.tsx             # Preloading horizontal slider
│   ├── BrandLogo.tsx                 # Vector logo component
│   ├── ThemeProvider.tsx             # Light / Dark theme context
│   └── ui/                           # Button, Input, Modal, Skeleton, EmptyState
├── features/                         # Domain-driven feature modules
│   ├── admin/                        # Admin services & Gemini health diagnostics
│   ├── auth/                         # Authentication & user repository
│   ├── chat/                         # Chatbot orchestration & prompt engineering
│   ├── dashboard/                    # Analytics calculation services
│   ├── movies/                       # Repositories, anime classifier, browse cache
│   └── recommendations/              # Multi-factor heuristics + Gemini candidate engine
├── hooks/                            # Custom React hooks (useCountUp)
├── lib/                              # Core utilities & libraries
│   ├── env.ts                        # Type-safe environment access
│   ├── gemini.ts                     # Gemini AI API client wrapper
│   ├── screenContext.tsx             # Active screen context provider for AI chat
│   ├── baserow.ts                    # Baserow HTTP client helpers
│   ├── session.ts                    # JWT creation & verification with jose
│   ├── logger.ts                     # Structured server logger
│   └── utils.ts                      # cn(), getFilmIndustry(), formatting
└── middleware.ts                     # Route protection & role verification
```

---

## Recommendation Engine Architecture

```
User Library (Ratings >= 7, Personal Reviews)
                 │
                 ├──► 1. Taste Profile Builder (genres, keywords, directors, eras)
                 │
        ┌────────┴──────────────────────────┐
        ▼                                   ▼
2. TMDB Similar / Top Picks         3. Gemini AI Candidate Generator
(Deterministic candidates)          (Deep thematic & tone matching)
        │                                   │
        └────────┬──────────────────────────┘
                 ▼
       4. Candidate Deduplication & Library Exclusion
                 ▼
       5. Multi-Factor Scoring (0–99 points)
          - Genre overlap (45%)
          - Keyword match (20%)
          - Director match (10%)
          - Industry match (8%)
          - Cast affinity (5%)
          - Runtime & Decade (8%)
          - TMDB Quality score (4%)
                 ▼
       6. Diversity Filter (max 3/director, 6/decade)
                 ▼
       7. Baserow Cache & Taste Hash Storage (TTL: 72 hrs)
```

---

## Security & Reliability

- **Bcrypt Password Hashing** — salt rounds = 10, hashes never exposed in API responses
- **Signed HTTP-Only JWTs** — tamper-proof session cookies (`cinetaste_session`) with 7-day expiration
- **Strict Role Enforcement** — verified in Next.js middleware and validated server-side on all admin endpoints
- **Zod Schema Validation** — all incoming requests validated before database mutations
- **Cross-Origin Image Safety** — canvas palette extraction uses isolated, cache-busted `Image` instances to prevent canvas contamination

---

## Browser Support

- Chrome / Edge 90+
- Firefox 88+
- Safari 14+ / iOS Safari 14+
- Chrome Android 90+

*Graceful degradation: browsers disabling canvas image data extraction cleanly fall back to dark neutral ambient glows.*

---

## License

This project is licensed under the [MIT License](LICENSE).

---

## Acknowledgments

- [The Movie Database (TMDB)](https://www.themoviedb.org) — metadata, credits, and imagery
- [Google Gemini](https://ai.google.dev/) — candidate generation and conversational intelligence
- [Baserow](https://baserow.io) — open source relational database infrastructure
- [Lucide Icons](https://lucide.dev) — UI iconography
- [Recharts](https://recharts.org) — interactive data visualizations
