# CineTaste

**A personal movie & series companion that learns your taste.**

CineTaste is a smart watchlist manager and recommendation engine. It tracks your movies and series, learns what you love from your ratings, and recommends what to watch next — all through a polished, cinema-inspired interface.

---

## Features

### Smart Recommendations
- **Multi-factor scoring** — weighted across genre, keywords, director, cast, film industry, runtime preference, and release decade
- **Personalized candidate pool** — fetches similar and recommended titles for all your positively-rated content from TMDB, plus trending, popular, and now-playing feeds
- **Diversity filtering** — prevents the same director or decade from dominating your feed
- **Cold start** — shows trending and popular titles until you have enough ratings
- **Session-stable** — recommendations only regenerate when you rate, add, edit, or delete a title

### Library Management
- **Status tracking** — Pending, Completed, Dropped
- **Watch order** — drag-and-drop reordering for your pending list
- **Ratings** — 1–10 scale with optional notes
- **Watch links** — save streaming URLs or local file paths per title
- **Rich metadata** — genres, runtime, release year, poster, all pulled from TMDB

### Discovery
- **TMDB integration** — search millions of movies and series
- **Curated sections** — personalized Top Picks, genre-specific rows, trending, hidden gems
- **Infinite scroll** — batched loading with scroll-position preservation across navigation
- **Smart filtering** — never shows titles already in your library

### Dashboard
- **Stats overview** — total titles, completed, pending, dropped
- **Next to watch** — first item from your pending watch order
- **Genre breakdown** — pie chart of your top 7 genres
- **Animated counters** — numbers count up on first load

### Admin Panel
- **User management** — view all accounts, promote/demote roles, block accounts
- **Password reset** — admins can reset any user's password directly
- **Pirate site templates** — manage configurable external search link templates

### UI / UX
- **Dynamic ambient shadows** — each card glows with the dominant color extracted from its poster
- **Shimmer skeletons** — loading states on all pages, no blank screens
- **Persistent app shell** — sidebar never unmounts, navigation feels instant
- **Route prefetching** — all routes preloaded after login
- **Scroll preservation** — returns to exact scroll position after navigating away and back
- **Dark neutral theme** — `#111` background, Spotify/Steam-inspired palette

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) — App Router, React Server Components |
| UI | [React 19](https://react.dev) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com) — all config via `@theme` in CSS |
| Database | [Baserow](https://baserow.io) — no-code tables, accessed via REST API |
| Auth | `jose` (JWT, HTTP-only cookies) + `bcryptjs` (password hashing) |
| Movie Data | [TMDB API](https://www.themoviedb.org/documentation/api) |
| Charts | [Recharts](https://recharts.org) |
| Toasts | [Sonner](https://sonner.emilkowal.ski) |
| Icons | [Lucide React](https://lucide.dev) |
| Validation | [Zod](https://zod.dev) |
| Language | TypeScript |

---

## Prerequisites

- **Node.js** 18 or higher
- **npm** (comes with Node)
- **Baserow account** — free tier works at [baserow.io](https://baserow.io)
- **TMDB API key** — free at [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api)

---

## Setup

### 1. Clone the repo

```bash
git clone https://github.com/yourusername/CineTaste.git
cd CineTaste
npm install
```

### 2. Set up Baserow

1. Create a free account at [baserow.io](https://baserow.io) and create a new database.
2. Create three tables with the schemas below.
3. Go to **Settings → API Tokens**, create a token with `read`, `create`, `update`, `delete` access on all three tables.
4. Note your **database ID** (in the URL: `https://baserow.io/database/12345/...`) and each **table ID** (in the URL when you open a table).

**`users` table**

| Field | Type | Notes |
|---|---|---|
| `username` | Text | Primary login identifier |
| `password_hash` | Text | bcrypt hash — never stored in plaintext |
| `role` | Text | `"user"` or `"admin"` |
| `blocked` | Boolean | Blocks login when `true` |
| `created_at` | Date | Set on registration |
| `last_login` | Date | Updated on each login |

**`movies` table**

| Field | Type | Notes |
|---|---|---|
| `username` | Text | Matches `users.username` |
| `tmdb_id` | Number | TMDB movie or series ID |
| `movie_name` | Text | Title |
| `type` | Text | `"movie"` or `"series"` |
| `genres` | Text | JSON array, e.g. `["Action","Drama"]` |
| `language` | Text | Original language code, e.g. `"en"` |
| `release_year` | Number | 4-digit year |
| `runtime` | Number | Minutes |
| `poster_url` | Text | TMDB image URL |
| `status` | Text | `"pending"`, `"completed"`, or `"dropped"` |
| `rating` | Number | 0–10 |
| `notes` | Text | Optional personal notes |
| `watch_link` | Text | Optional streaming URL or file path |
| `watch_order_rank` | Number | Position in your pending watch queue |
| `added_at` | Date | Timestamp |

**`pirate_sites` table**

| Field | Type | Notes |
|---|---|---|
| `name` | Text | Display name, e.g. `"YTS"` |
| `search_url` | Text | Template with `{query}` placeholder |
| `enabled` | Boolean | Only enabled sites appear in modals |

### 3. Get a TMDB API key

1. Create a free account at [themoviedb.org](https://www.themoviedb.org)
2. Go to **Settings → API** and request an API key (v3 auth)

### 4. Create `.env.local`

Create a `.env.local` file in the project root:

```env
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Baserow
BASEROW_API_URL=https://api.baserow.io
BASEROW_DATABASE_ID=your_database_id
BASEROW_API_TOKEN=your_api_token
BASEROW_USERS_TABLE_ID=your_users_table_id
BASEROW_MOVIES_TABLE_ID=your_movies_table_id
BASEROW_PIRATES_TABLE_ID=your_pirate_sites_table_id

# TMDB
TMDB_API_KEY=your_tmdb_api_key

# Auth — generate a random 32+ character secret
AUTH_SECRET=your_random_secret_here
```

Generate a secure `AUTH_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 5. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 6. Create your account

Navigate to `/register`. The **first registered user is automatically made admin**.

---

## Scripts

```bash
npm run dev        # Development server (localhost:3000)
npm run build      # Production build
npm run start      # Production server
npm run lint       # ESLint
npm run setup-db   # Optional: automated Baserow table setup script
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | No | App base URL (default: `http://localhost:3000`) |
| `BASEROW_API_URL` | Yes | Baserow instance URL |
| `BASEROW_DATABASE_ID` | Yes | Your Baserow database ID |
| `BASEROW_API_TOKEN` | Yes | API token with table permissions |
| `BASEROW_USERS_TABLE_ID` | Yes | Users table ID |
| `BASEROW_MOVIES_TABLE_ID` | Yes | Movies table ID |
| `BASEROW_PIRATES_TABLE_ID` | Yes | Pirate sites table ID |
| `TMDB_API_KEY` | Yes | TMDB API key (v3) |
| `AUTH_SECRET` | Yes | JWT signing secret (min 32 chars) |

---

## Project Structure

```
src/
├── app/                        # Next.js App Router
│   ├── page.tsx                # Root redirect (→ login or dashboard)
│   ├── layout.tsx              # Root layout (providers)
│   ├── globals.css             # Tailwind v4 theme, keyframes, utilities
│   ├── login/                  # Login page
│   ├── register/               # Registration page
│   ├── dashboard/              # Stats, next-to-watch, genre chart
│   ├── movies/                 # Library (filter, sort, watch order)
│   │   ├── add/                # Add movie form
│   │   └── edit/[id]/          # Edit movie form
│   ├── discover/               # TMDB search + recommendation feed
│   ├── recommendations/        # Full recommendations page
│   ├── profile/                # Password change, account settings
│   ├── admin/                  # Admin panel
│   └── api/                    # API routes
│       ├── auth/               # login, register, logout, session, change-password
│       ├── movies/             # CRUD library, TMDB proxy
│       ├── recommendations/    # Recommendation engine endpoint
│       ├── discover/           # Curated discover feed
│       ├── dashboard/          # Stats aggregation
│       ├── profile/            # Profile data
│       ├── pirate-sites/       # Public pirate site list
│       ├── tmdb/               # TMDB search and detail proxies
│       └── admin/              # User management, password reset
├── components/
│   ├── AppShell.tsx            # Persistent layout wrapper with Sidebar
│   ├── Sidebar.tsx             # Navigation (prefetches all routes on mount)
│   ├── MovieCard.tsx           # Discover/search card with ambient shadow
│   ├── HorizontalRow.tsx       # Horizontal scroll row with preloading
│   ├── MovieDetailsModal.tsx   # Full detail modal (cast, crew, trailer, similar)
│   ├── RatingModal.tsx         # Rating and notes input
│   ├── BrandLogo.tsx           # Logo component
│   ├── ThemeProvider.tsx       # Dark/light theme context
│   └── ui/                     # Button, Input, Modal, Skeleton, EmptyState, etc.
├── features/
│   ├── auth/                   # userRepository, authService
│   ├── movies/                 # movieRepository, movieService
│   ├── recommendations/        # recommendationEngine (multi-factor scoring)
│   ├── dashboard/              # dashboardService (stats + genre aggregation)
│   └── admin/                  # adminRepository, adminService
├── lib/
│   ├── appStore.tsx            # Global React context (session, library, cache)
│   ├── env.ts                  # Environment variable access
│   ├── session.ts              # JWT encode/decode via jose
│   ├── baserow.ts              # Baserow REST client helpers
│   ├── apiResponse.ts          # Standardized API response shapes
│   ├── ApiError.ts             # Typed error class
│   └── utils.ts                # cn(), getFilmIndustry()
├── hooks/
│   └── useCountUp.ts           # Animated counter for dashboard stats
└── middleware.ts               # Route protection (auth + role enforcement)
```

---

## Recommendation Algorithm

### Input
All titles you have marked **Completed** with a rating > 0.

### Taste profile
Built from every rated title. Each signal is weighted by how much you liked the title:

| Rating | Weight |
|---|---|
| 10 | +2.0 |
| 9 | +1.5 |
| 8 | +1.0 |
| 7 | +0.5 |
| 6 | 0.0 |
| 5 | −0.25 |
| 4 | −0.5 |
| 3 | −1.0 |
| 2 | −1.5 |
| 1 | −2.0 |

Signals collected per title:
- **Genres** — from your local library metadata
- **Keywords** — from TMDB's keyword list for that title
- **Director** — from TMDB credits (job: "Director")
- **Top 5 cast** — from TMDB credits
- **Film industry** — derived from original language / production country (Hollywood, Bollywood, Korean, etc.)
- **Runtime** — builds a preferred average runtime from positively-rated titles
- **Release decade** — e.g. "1990s", "2010s"

### Candidate pool
For every positively-rated title, fetches from TMDB:
- `/movie/{id}/similar` and `/movie/{id}/recommendations`
- `/tv/{id}/similar` and `/tv/{id}/recommendations`

Plus global feeds: trending (day/week), popular movies, top-rated movies, popular TV, top-rated TV, now playing, on the air, airing today.

All candidates are deduplicated. Anything already in your library (any status) is excluded.

### Scoring weights

| Signal | Weight |
|---|---|
| Genre match | 45% |
| Keyword match | 20% |
| Director match | 10% |
| Film industry match | 8% |
| Cast match | 5% |
| Runtime preference | 4% |
| Decade preference | 4% |
| TMDB vote average | 4% |

### Post-processing
1. Composite scores are normalized to a 0–99 range
2. Candidates scoring below 10 are dropped
3. Diversity filter: max 3 titles per director, max 6 titles per decade
4. Results sorted descending by final score

### Cache invalidation
The taste profile is cached per user and invalidated when you:
- Add a title to your library
- Rate or edit a completed title
- Delete a title
- Manually refresh the discover page

### Cold start
With no ratings, the engine falls back to TMDB trending and popular lists ranked by vote average.

---

## Security

- **Passwords** — bcrypt hashed (cost 10), never stored in plaintext, never returned by any API
- **Sessions** — signed JWT stored in an HTTP-only cookie (`cinetaste_session`), 7-day expiry
- **Route protection** — middleware enforces authentication on all protected routes (`/dashboard`, `/movies`, `/discover`, `/profile`, `/admin`)
- **Admin enforcement** — role check on every `/api/admin/*` route server-side
- **Input validation** — Zod schemas on all API endpoints
- **CORS-safe color extraction** — canvas color extraction uses a cache-busted URL (`?_c=1`) on a separate `Image` object to avoid cross-origin canvas poisoning

---

## Performance

- **Persistent app shell** — Sidebar renders once per session, never remounts on navigation
- **Route prefetching** — all routes preloaded by Sidebar on mount via `router.prefetch()`
- **Global store** — session, full library, and pirate sites cached in React Context; no redundant fetches on navigation
- **Module-level cache** — dashboard stats and discover data survive route changes within a session
- **TMDB detail cache** — `Map<string, any>` keyed by `${type}_${id}`, prevents duplicate TMDB calls
- **GPU-only animations** — all animations use only `transform`, `opacity`, and `filter` — no layout-triggering properties
- **Scroll restoration** — `sessionStorage` + `requestAnimationFrame` for pixel-accurate position restore
- **Shimmer skeletons** — `background-position` animation (composited layer), zero layout shift

---

## Troubleshooting

**Login shows "Unauthorized" immediately**
- Check that `AUTH_SECRET` is set and at least 32 characters
- Verify the `cinetaste_session` cookie is present in browser DevTools → Application → Cookies

**Recommendations are empty**
- Rate at least 3–5 titles as Completed with scores of 7 or higher to build a taste profile
- Check the Network tab for the `/api/recommendations` response

**TMDB images not loading**
- Verify `TMDB_API_KEY` is valid and active in your TMDB account settings
- TMDB's image CDN (`image.tmdb.org`) may be region-restricted — try a VPN

**Baserow "Unauthorized" errors**
- Your API token may have expired — generate a new one in Baserow **Settings → API Tokens**
- Double-check your table IDs by opening each table and reading the ID from the URL

**Ambient shadows are all the same color**
- The browser blocked canvas cross-origin access — this is expected in some configurations and falls back to a neutral shadow silently
- Check the browser console for `SecurityError: Failed to execute 'getImageData'`

**Admin panel shows no users**
- Confirm you are logged in with a user whose `role` field is `"admin"` in the users table
- Check the `/api/admin/users` response in the Network tab

---

## Browser Support

Chrome / Edge 90+, Firefox 88+, Safari 14+, iOS Safari 14+, Chrome Android 90+

Canvas-based ambient shadow color extraction requires `getImageData()` support. On browsers that block cross-origin canvas reads, the feature degrades gracefully to a neutral shadow.

---

## License

MIT

---

## Acknowledgments

- [TMDB](https://www.themoviedb.org) — movie and series metadata
- [Baserow](https://baserow.io) — no-code database backend
- [Lucide](https://lucide.dev) — icon library
- [Recharts](https://recharts.org) — genre pie chart
- [Sonner](https://sonner.emilkowal.ski) — toast notifications

---

Built with Next.js 16, React 19, Tailwind CSS v4, and TypeScript.
