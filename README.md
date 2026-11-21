# CineTaste

**A personal movie, TV series & anime companion powered by intelligent taste learning and Gemini AI.**

CineTaste is a smart watchlist manager and hybrid recommendation platform. It tracks your movies, series, and anime across 5 granular viewing statuses, mathematically models your personal taste preferences with verifiable mutual exclusivity, and delivers balanced, personalized recommendations through a cinema-inspired interface.

---

## Documentation Index

Comprehensive technical documentation is organized in the [`/docs/`](file:///d:/My_Codes/Project/CineTaste/docs/) directory:

- 🏛️ **[System Architecture](file:///d:/My_Codes/Project/CineTaste/docs/architecture.md)** — Next.js 16 App Router, AppStore TTL caching, ScreenContext AI sync, and serverless route design.
- 🎯 **[Hybrid Recommendation Engine](file:///d:/My_Codes/Project/CineTaste/docs/recommendation-engine.md)** — Dual-engine v4.0 pipeline (300 balanced titles across Movies, Series, Anime), scoring formula, diversity caps, and multi-tier library exclusion.
- 🧬 **[Taste DNA & Preference Profiling](file:///d:/My_Codes/Project/CineTaste/docs/taste-dna.md)** — Mathematical genre net scoring (-2.0 to +2.0), single-title standout heuristics, storytelling style identification, and mutual exclusivity ($A \cap B = \emptyset$).
- 🗄️ **[Database Schema Specification](file:///d:/My_Codes/Project/CineTaste/docs/database-schema.md)** — Baserow tables, plain-text status field specification, columns, and automated setup script.
- 🎬 **[Feature Guide & Modules](file:///d:/My_Codes/Project/CineTaste/docs/features.md)** — Media Hubs with category isolation, 5-status library, Up Next continuous queue, detail modal, and CineTaste Chatbot.
- 🔌 **[API Route Reference](file:///d:/My_Codes/Project/CineTaste/docs/api-reference.md)** — Comprehensive specification of all REST endpoints (`/api/auth/*`, `/api/movies/*`, `/api/browse`, `/api/recommendations/*`, `/api/chat`, `/api/admin/*`).

---

## Core Features Overview

### 1. CineTaste AI Companion
- **Complete Library Awareness** — Injects unabridged real-time manifests of all user titles across Completed, Watching, On Hold, Queue, and Dropped.
- **Screen Context Synchronization** — Tracks the user's active page, selected category, active search text, applied filters, and currently visible titles.
- **Strict Anti-Recommendation Guard** — Bound by a hard prompt rule forbidding suggestions of any title already present in the user's library.
- **Floating Cinema UI** — Markdown rendering, suggestion chips, and responsive layout.

### 2. Dual-Engine Hybrid Recommendations (v4.0)
- **300-Title Balanced Distribution** — Equal 1/3 partitioning across Movies (~100), TV Series (~100), and Anime (~100).
- **Gemini AI Synthesis + TMDB Discovery** — Combines deep thematic, tone-aware AI candidate generation with high-confidence TMDB catalog discover feeds.
- **Deterministic Multi-Factor Scoring (0–99)** — Weighted across genre overlap (45%), keywords (20%), director (10%), industry (8%), cast (5%), runtime/era (8%), and TMDB quality (4%).
- **Multi-Layer Library Exclusion** — Canonical TMDB ID matching, exact lowercase title matching, and normalized alphanumeric string comparisons ensure zero library duplication.

### 3. Taste DNA Profiling
- **Evidence-Backed Net Scoring** — Ratings contribute signed weights (`10` = +2.0, `1` = -2.0, `dropped` = -2.0).
- **Absolute Mutual Exclusivity** — Strong Affinities and Dislikes are guaranteed disjoint. Conflicted genres are classified as *Mixed*.
- **Narrative Synthesis** — Coherent, non-contradictory paragraph describing specific storytelling style preferences and viewing tendencies.

### 4. Dedicated Media Hubs & Category Isolation
- **Distinct Hubs** — Dedicated routes for **Movies** (`/movies`), **TV Series** (`/series`), and **Anime** (`/anime`).
- **Anime Classifier** — Multi-heuristic classification separating Japanese animation from Western television and live-action films.
- **Multi-Genre Strict AND Matching** — Filter by multiple genres simultaneously with real-time tag counts.
- **Era & Decade Filtering** — Instantly filter by *2020s*, *2010s*, *2000s*, *1990s*, *1980s*, or *Classic*.

### 5. Library & Continuous Queue Management
- **Five Granular Statuses** — `Completed`, `Watching` (active series/movies), `On Hold` (paused/seasonal), `Pending` (Up Next queue), and `Dropped`.
- **Gap-Free Watch Queue** — Drag-and-drop continuous sequence ranking (`1, 2, 3...`) with automatic rank reassignment and queue compression upon status transitions.
- **Media Details Modal** — Cast and crew lists, embedded YouTube trailers, custom watch links, and external streaming templates (`pirate_sites`).

### 6. Dashboard & Admin Controls
- **Viewing Analytics** — Total tracked items, completion rate, average rating, and top genre distribution via Recharts.
- **Gemini Health Diagnostics** — Live admin card executing real-time latency (ms) and quota pings.
- **User Management** — Account moderation, role toggling, and administrative password resets.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [Next.js 16](https://nextjs.org) (App Router, Turbopack, Serverless Route Handlers) |
| **UI Library** | [React 19](https://react.dev) |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com) (Modern CSS theme variables) |
| **Database** | [Baserow](https://baserow.io) (Headless REST relational database) |
| **AI / LLM** | [Google Gemini](https://ai.google.dev/) (Candidate synthesis & conversational companion) |
| **Movie Metadata** | [TMDB API v3](https://developer.themoviedb.org/reference/intro/getting-started) |
| **Charts** | [Recharts](https://recharts.org) |
| **Toasts** | [Sonner](https://sonner.emilkowal.ski) |
| **Icons** | [Lucide React](https://lucide.dev) |
| **Auth & Security** | `jose` (JWT HTTP-only cookies) + `bcryptjs` (password hashing) |
| **Validation** | [Zod](https://zod.dev) |
| **Language** | TypeScript |

---

## Quick Start

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/MeghPatel327/CineTaste.git
cd CineTaste
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory (refer to [.env.example](file:///d:/My_Codes/Project/CineTaste/.env.example)):

```env
# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Auth
AUTH_SECRET=your_random_32_character_secret_here

# Baserow Core
BASEROW_API_URL=https://api.baserow.io
BASEROW_DATABASE_ID=your_database_id
BASEROW_API_TOKEN=your_baserow_api_token

# Baserow Table IDs (Populated automatically via setup script or manually)
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

### 3. Initialize Baserow Database

To provision all required tables and fields automatically:

```bash
npm run setup-db
```

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
| `build` | `npm run build` | Compiles production bundle with Turbopack |
| `start` | `npm run start` | Starts production server |
| `test` | `npm run test` | Runs unit test suite (Taste DNA mutual exclusivity & library exclusion) |
| `lint` | `npm run lint` | Runs ESLint check across source code |
| `setup-db` | `npm run setup-db` | Automatically creates tables and fields in Baserow |

---

## License

This project is licensed under the [MIT License](LICENSE).
