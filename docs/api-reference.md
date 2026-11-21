# API Route Reference

All API routes are served under Next.js serverless route handlers (`/api/*`). Responses follow standard JSON envelopes via [src/lib/apiResponse.ts](file:///d:/My_Codes/Project/CineTaste/src/lib/apiResponse.ts):

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message string"
}
```

Error responses:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Detailed error explanation"
  }
}
```

---

## Authentication (`/api/auth`)

| Endpoint | Method | Description | Auth Required |
|---|---|---|---|
| `/api/auth/register` | `POST` | Create new user account. First registered user automatically becomes `admin`. | No |
| `/api/auth/login` | `POST` | Authenticate with username and password. Sets HTTP-only `cinetaste_session` JWT cookie. | No |
| `/api/auth/logout` | `POST` | Clears `cinetaste_session` cookie. | Yes |
| `/api/auth/session` | `GET` | Returns current authenticated user profile (`username`, `role`). | Yes |
| `/api/auth/change-password` | `POST` | Update password for current authenticated user. Body: `{ currentPassword, newPassword }`. | Yes |

---

## Movies & Library (`/api/movies`)

| Endpoint | Method | Description |
|---|---|---|
| `/api/movies` | `GET` | Returns all library titles for the authenticated user. |
| `/api/movies` | `POST` | Add a title to library. Validates body against `addMovieSchema`. Handles auto-ranking for `pending` status. |
| `/api/movies/[id]` | `GET` | Fetch specific library title details by Baserow row ID. |
| `/api/movies/[id]` | `PATCH` | Update status, rating, review, watch link, or queue rank. Handles automatic queue shifts on status changes. |
| `/api/movies/[id]` | `DELETE` | Removes title from library and shifts remaining pending items to close rank gaps. |
| `/api/movies/tmdb/[id]` | `GET` | Fetches enriched TMDB details (cast, crew, trailer, similar titles). Filters library titles from `similar_movies`. Query param: `?type=movie|series|tv`. |

### Add Movie Payload Schema
```json
{
  "movie_name": "Inception",
  "type": "movie",
  "status": "pending",
  "rating": 0,
  "personal_review": "",
  "watch_link": null,
  "tmdb_id": 27205,
  "genres": "[\"Action\",\"Science Fiction\",\"Adventure\"]",
  "release_year": 2010,
  "runtime": 148,
  "language": "en",
  "poster_url": "https://image.tmdb.org/t/p/w500/...",
  "overview": "Cobb, a skilled thief who steals secrets..."
}
```

---

## Browse & Catalogues (`/api/browse`)

| Endpoint | Method | Description |
|---|---|---|
| `/api/browse` | `GET` | Category discovery engine with strict isolation, multi-genre AND matching, and era filtering. |

### Query Parameters
- `category` (*required*): `"movies"` | `"series"` | `"anime"`
- `page`: Page index (default: `1`)
- `limit`: Batch size (default: `50`)
- `genres`: Comma-separated genre names (e.g. `Action,Sci-Fi`)
- `era`: Decade filter (`2020s`, `2010s`, `2000s`, `1990s`, `1980s`, `Classic`)
- `subType`: For anime: `"all"`, `"movie"`, or `"tv"`
- `sort`: `"recommended"`, `"popularity"`, `"rating"`, `"year"`, `"year-asc"`, `"title"`, `"title-desc"`
- `query`: Text search string

---

## Recommendations (`/api/recommendations`)

| Endpoint | Method | Description |
|---|---|---|
| `/api/recommendations` | `GET` | Returns personalized hybrid recommendations with library titles strictly excluded. Query: `?offset=0&limit=12&refresh=false`. |
| `/api/recommendations/rebuild` | `POST` | Invalidates cached recommendation sets in Baserow and triggers fresh 300-title pipeline. |

---

## CineTaste AI Companion (`/api/chat`)

| Endpoint | Method | Description |
|---|---|---|
| `/api/chat` | `POST` | Conversational endpoint injecting complete user library manifests, Taste DNA analytics, and live screen context. |

### Request Body
```json
{
  "messages": [
    { "role": "user", "content": "What movie should I watch next from my queue?" }
  ],
  "screenContext": {
    "pathname": "/movies",
    "category": "movies",
    "searchQuery": "",
    "appliedFilters": { "sort": "recommended" },
    "displayedTitles": ["Interstellar", "Blade Runner 2049"]
  }
}
```

---

## Dashboard & Analytics (`/api/dashboard`)

| Endpoint | Method | Description |
|---|---|---|
| `/api/dashboard` | `GET` | Returns aggregated metrics: total items, watched, currently watching, on hold, dropped, pending count, next 5 queue items, and top genre distribution. |

---

## Profile & Taste DNA (`/api/profile`)

| Endpoint | Method | Description |
|---|---|---|
| `/api/profile` | `GET` | Returns account metadata, status breakdowns, favorite industry, top genre breakdown, and computed Taste DNA summary narrative and chips. |

---

## Up Next Queue (`/api/queue`)

| Endpoint | Method | Description |
|---|---|---|
| `/api/queue` | `GET` | Returns all pending titles sorted strictly by `watch_order_rank`. |
| `/api/queue/[movieId]` | `PATCH` | Move title up or down in queue, atomically swapping ranks with neighboring item. Body: `{ direction: "up" | "down" }`. |
| `/api/queue/migrate` | `POST` | Repairs queue sequence, removing gaps and ensuring ranks are sequential `1..N`. |

---

## Admin Controls (`/api/admin`)

*All admin endpoints require an active session with role `admin`.*

| Endpoint | Method | Description |
|---|---|---|
| `/api/admin/health/gemini` | `GET` | Performs real-time ping to configured Gemini endpoint; reports latency (ms), model identifier, and quota status. |
| `/api/admin/users` | `GET` | Lists all registered accounts. |
| `/api/admin/users/[id]` | `PATCH` | Updates user attributes (`role: "user" | "admin"`, `blocked: boolean`). |
| `/api/admin/users/[id]/reset-password` | `POST` | Administrative password override. Body: `{ newPassword: "..." }`. |
| `/api/admin/pirate-sites` | `GET` | List streaming search templates. |
| `/api/admin/pirate-sites` | `POST` | Create streaming template. Body: `{ name, search_url, enabled }`. |
| `/api/admin/pirate-sites/[id]` | `PATCH` | Update streaming template. |
| `/api/admin/pirate-sites/[id]` | `DELETE` | Remove streaming template. |
