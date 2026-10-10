# CineTaste — Obsidian Cinema Glass Discovery

A luxury cinematic movie and series recommendation experience with dark glassmorphism, personalized taste rails, verified watch options, and atmospheric theater aesthetics.

---

## 1. Overview & Architecture

CineTaste is a **pure recommendation and film curation platform** — it does not stream, host, proxy, or embed video content. Instead, it provides:

- **Cinematic Discovery**: Featured spotlights with dynamic TMDB backdrops, circular carousels, genre pills, and taste affinity reasoning.
- **Configurable External Watch Options**: Discovers verified official and community watch links stored in **Baserow** without hardcoding URLs.
- **Persistent Personal Cinema Records**: Library statuses (*Watching*, *Completed*, *Plan to Watch*, *Dropped*), Queue bookmarks, star ratings (1–10), and viewing analytics.
- **Dual-Environment Gemini AI Engine**: OpenAI-compatible Gemini Web2API integration supporting both local reverse proxies and external production endpoints, backed by deterministic algorithmic fallbacks.
- **Obsidian Cinema Glass UI**: Built with Next.js App Router, Tailwind CSS v4, Lucide React, and Plus Jakarta Sans/Inter typography.

---

## 2. Prerequisites & Installation

- **Node.js**: v18.17+ or v20+ (Node 22 recommended)
- **Package Manager**: `npm`
- **Operating System**: Windows / macOS / Linux

### Install Dependencies
```bash
npm install
```

---

## 3. Environment Configuration

CineTaste includes two environment files:
- `.env` — Local configuration file (ignored by Git, never committed).
- `.env.example` — Tracked template documenting every required configuration key.

### Configuration Reference

| Variable | Description | Default / Example |
|---|---|---|
| `NODE_ENV` | Application environment | `development` or `production` |
| `NEXT_PUBLIC_APP_URL` | Public application URL | `http://localhost:3000` |
| `APP_DEV_MODE_MOCK` | Fallback mode when external credentials are unset | `true` (dev) / `false` (prod) |
| `SESSION_SECRET` | 32+ character secret for HMAC-SHA256 sessions | *Secure 32-char hex string* |
| `ADMIN_SECRET_KEY` | Admin bootstrap key | *Secure passphrase* |
| `BASEROW_API_URL` | Baserow API root | `https://api.baserow.io` |
| `BASEROW_API_TOKEN` | Baserow database API token | *Database Token from Baserow* |
| `BASEROW_DATABASE_ID` | Baserow database ID | e.g. `12345` |
| `BASEROW_TABLE_USERS` | Table ID for Users | e.g. `101` |
| `BASEROW_TABLE_MEDIA` | Table ID for Media Metadata | e.g. `102` |
| `BASEROW_TABLE_USER_MEDIA` | Table ID for Library & Queue | e.g. `103` |
| `BASEROW_TABLE_WATCH_PROVIDERS` | Table ID for Watch Providers | e.g. `104` |
| `BASEROW_TABLE_MEDIA_WATCH_LINKS` | Table ID for Per-Title Watch Links | e.g. `105` |
| `BASEROW_TABLE_RECOMMENDATIONS` | Table ID for Cached Recommendations | e.g. `106` |
| `BASEROW_TABLE_TASTE_PROFILES` | Table ID for Taste DNA Profiles | e.g. `107` |
| `BASEROW_TABLE_FEEDBACK` | Table ID for Recommendation Feedback | e.g. `108` |
| `TMDB_API_KEY` | The Movie Database (TMDB) API Key | *Your TMDB API Key* |
| `TMDB_BASE_URL` | TMDB API Base URL | `https://api.themoviedb.org/3` |
| `TMDB_IMAGE_BASE_URL` | TMDB Image CDN URL | `https://image.tmdb.org/t/p` |
| `AI_ENVIRONMENT` | Active AI provider mode | `local` or `production` |
| `GEMINI_LOCAL_BASE_URL` | Local Gemini Web2API endpoint | `http://localhost:8000/v1` |
| `GEMINI_LOCAL_MODEL` | Local model name | `gemini-2.5-flash` |
| `GEMINI_LOCAL_TIMEOUT_MS` | Local request timeout | `15000` |
| `GEMINI_PROD_BASE_URL` | Production Gemini Web2API endpoint | `https://api.your-provider.com/v1` |
| `GEMINI_PROD_MODEL` | Production model name | `gemini-2.5-flash` |
| `GEMINI_PROD_API_KEY` | Production API key (if required) | *Bearer token* |
| `GEMINI_PROD_TIMEOUT_MS` | Production request timeout | `20000` |

---

## 4. Baserow Database Setup via Kuma AI

CineTaste V2 includes a ready-to-paste automation prompt: [`baserow_prompt.txt`](./baserow_prompt.txt).

1. Open **Kuma AI** in your Baserow environment.
2. Copy the entire contents of [`baserow_prompt.txt`](./baserow_prompt.txt).
3. Paste into Kuma AI.
4. Kuma AI will create:
   - Dedicated database: **CineTaste V2 Database**
   - 8 configured tables: Users, Media, UserMedia, WatchProviders, MediaWatchLinks, Recommendations, TasteProfiles, Feedback.
5. Copy the returned Table IDs into your `.env` file matching the variables listed in `.env.example`.

---

## 5. Local & Production Gemini Web2API Differences

| Feature | Local Development (`AI_ENVIRONMENT=local`) | Production (`AI_ENVIRONMENT=production`) |
|---|---|---|
| **Base URL** | `http://localhost:8000/v1` (Local proxy) | Public HTTPS OpenAI-compatible endpoint |
| **Reachability** | Local workstation only | Must be publicly reachable from Vercel Serverless |
| **Authentication** | Optional local header | Required Bearer API Token |
| **Fallback** | Instant Algorithmic Fallback if offline | Instant Algorithmic Fallback if offline |

---

## 6. Running the Application Locally

```bash
# Run Next.js development server
npm run dev

# Open in browser:
# http://localhost:3000
```

The application starts immediately in development mode (`APP_DEV_MODE_MOCK=true`), using bundled seed masterpieces, mock watch options, and memory persistence so you can test all UI tabs, carousels, and search before connecting Baserow credentials.

---

## 7. Build Verification & Tests

```bash
# TypeScript type check
npx tsc --noEmit

# Production bundle build
npm run build
```

---

## 8. Vercel Deployment Guide

1. Push your repository to GitHub / GitLab (ensure `.env` is ignored, `.env.example` tracked).
2. Import the project into the **Vercel Dashboard**.
3. In **Settings > Environment Variables**, add:
   - `SESSION_SECRET`
   - `ADMIN_SECRET_KEY`
   - `BASEROW_API_URL`, `BASEROW_API_TOKEN`, `BASEROW_DATABASE_ID`
   - All `BASEROW_TABLE_*` IDs
   - `TMDB_API_KEY`
   - `AI_ENVIRONMENT=production`
   - `GEMINI_PROD_BASE_URL`, `GEMINI_PROD_MODEL`, `GEMINI_PROD_API_KEY`
   - `APP_DEV_MODE_MOCK=false`
4. Click **Deploy**.
