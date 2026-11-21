# System Architecture

CineTaste is built on Next.js 16 (App Router), React 19, Tailwind CSS v4, and TypeScript, backed by Baserow as a headless relational data store, Google Gemini for cognitive taste synthesis and conversational assistance, and TMDB for global cinematic metadata.

---

## High-Level Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CineTaste Client Layer                          │
│                                                                        │
│   ┌──────────────────┐   ┌───────────────────┐   ┌─────────────────┐   │
│   │   Global Shell   │   │     AppStore      │   │  ScreenContext  │   │
│   │   (AppShell)     │   │ (State & TTL SWR) │   │ (AI Chat Sync)  │   │
│   └────────┬─────────┘   └─────────┬─────────┘   └────────┬────────┘   │
│            │                       │                      │            │
│            ▼                       ▼                      ▼            │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ Routes: /dashboard | /movies | /series | /anime | /library     │   │
│   │         /discover  | /profile | /admin   | /login  | /register │   │
│   └────────────────────────────────┬───────────────────────────────┘   │
└────────────────────────────────────┼───────────────────────────────────┘
                                     │ HTTPS (JSON API)
┌────────────────────────────────────▼───────────────────────────────────┐
│                    Next.js Serverless Route Handlers                   │
│                                                                        │
│   ┌───────────────┐ ┌────────────────┐ ┌───────────────┐ ┌──────────┐ │
│   │  Auth & JWT   │ │ Movies & Queue │ │ Browse Engine │ │ Chat AI  │ │
│   │  (jose + bc)  │ │ (movieService) │ │(browseService)│ │ (Gemini) │ │
│   └───────┬───────┘ └───────┬────────┘ └───────┬───────┘ └────┬─────┘ │
│           │                 │                  │              │       │
│           │         ┌───────▼──────────────────▼──────┐       │       │
│           │         │ Hybrid Recommendation Pipeline  │       │       │
│           │         │    (v4.0 Taste DNA + Heuristics)│       │       │
│           │         └───────┬─────────────────────────┘       │       │
└───────────┼─────────────────┼─────────────────────────────────┼───────┘
            │                 │                                 │
     ┌──────▼──────┐   ┌──────▼──────┐                   ┌──────▼──────┐
     │   Baserow   │   │  TMDB API   │                   │   Google    │
     │ Relational  │   │ v3 Metadata │                   │   Gemini    │
     │  Database   │   │  & Posters  │                   │   Models    │
     └─────────────┘   └─────────────┘                   └─────────────┘
```

---

## Core Layers

### 1. Client State & Cache Management (`AppStore`)
- Located at [src/lib/appStore.tsx](file:///d:/My_Codes/Project/CineTaste/src/lib/appStore.tsx).
- Root-level persistent React Context provider using `useReducer`.
- Manages authenticated user session, library cache, discover feed, dashboard stats, TMDB query memoization, and pirate site link templates.
- **TTL Cache**:
  - Library: 60 seconds
  - Dashboard: 60 seconds
  - Discover / Recommendations: 5 minutes
  - Profile: 5 minutes
- **In-flight Deduplication**: Multiple components calling `getLibrary()` or `getDashboard()` share the same pending promise, preventing duplicate network requests.

### 2. Live AI Screen Context (`ScreenContext`)
- Located at [src/lib/screenContext.tsx](file:///d:/My_Codes/Project/CineTaste/src/lib/screenContext.tsx).
- Synchronizes current active route, category (movies/series/anime), search queries, applied multi-filters (genres, era, sorting), visible titles, and inspected title modal.
- Includes `areDetailsEqual` deep comparison guard to prevent infinite re-render cycles and avoid starving Next.js route transitions.

### 3. Application Shell & Navigation (`AppShell`)
- Located at [src/components/AppShell.tsx](file:///d:/My_Codes/Project/CineTaste/src/components/AppShell.tsx) and [src/components/Sidebar.tsx](file:///d:/My_Codes/Project/CineTaste/src/components/Sidebar.tsx).
- Persistent sidebar layout supporting desktop docked view and mobile sheet navigation.
- Floating `CineTasteChatbot` mounted persistently to maintain active conversation history during navigation.
- Prefetches destination routes (`/movies`, `/series`, `/anime`, `/library`, `/dashboard`, `/profile`) on idle.

### 4. Domain Feature Modules (`src/features/`)
Architected using Domain-Driven Design (DDD) principles:
- **`movies/`**:
  - `movieRepository.ts`: Direct Baserow table operations for user library rows.
  - `movieService.ts`: CRUD business logic with Zod validation and duplicate prevention.
  - `queueService.ts`: Continuous rank ordering (1..N) and renumbering for pending queue items.
  - `browseService.ts`: Destination hubs with multi-genre strict AND matching, era filtering, TMDB discovery pagination, and library title exclusion.
  - `animeClassifier.ts`: Multi-heuristic classifier separating Anime from Western series and live-action films.
- **`recommendations/`**:
  - `recommendationService.ts`: 300-title balanced recommendation pipeline (~100 movies, ~100 series, ~100 anime), cache invalidation, and library exclusion.
  - `geminiCandidateGenerator.ts`: LLM prompt orchestration generating deep thematic cinematic candidates.
  - `profileGenerator.ts`: Taste DNA profile generator persisting taste attributes to Baserow.
- **`profile/`**:
  - `tasteDnaService.ts`: Mathematical genre affinity, net scoring weights, storytelling styles, and mutual exclusivity enforcement.
- **`chat/`**:
  - `chatService.ts`: Full-library manifest injection, live screen state integration, Taste DNA summary, and strict anti-recommendation rules.
- **`admin/`**:
  - `adminService.ts`: Account moderation, role toggling, password resets, and live Gemini API latency/health diagnostics.
- **`auth/`**:
  - `authService.ts`: Registration (auto-admin for first user), bcrypt hashing, and login authentication.

### 5. Backend Database & Services
- **Baserow**: Headless database acting as source of truth for users, library records, recommendation profiles, cached recommendation sets, and external stream links.
- **TMDB API v3**: Global canonical metadata, cast/crew credits, trailers, runtimes, release years, and poster/backdrop artwork.
- **Google Gemini**: Dual role powering candidate generation in recommendation pipeline and the CineTaste AI companion.

---

## Security Architecture

- **Session Security**: Stateless signed JWT cookies (`cinetaste_session`) using `jose` with HS256 encryption and `httpOnly`, `sameSite=lax`, `secure` flags.
- **Password Security**: Standard `bcryptjs` hashing with 10 salt rounds; plaintext passwords never leave memory or enter database records.
- **Edge Middleware**: [src/middleware.ts](file:///d:/My_Codes/Project/CineTaste/src/middleware.ts) enforces route protection, verifying valid sessions on protected routes (`/dashboard`, `/library`, `/movies`, `/series`, `/anime`, `/profile`, `/admin`) and checking role permissions for `/admin`.
- **Input Validation**: All POST/PATCH request bodies validated against strict Zod schemas before processing.
