# Baserow Database Schema Specification

CineTaste utilizes **Baserow** as its headless relational datastore. All table schemas, columns, constraints, and field types are documented below.

The automated setup script is located at [scripts/setup-baserow.mjs](file:///d:/My_Codes/Project/CineTaste/scripts/setup-baserow.mjs) and can be executed with `npm run setup-db`.

---

## Tables Overview

| Table Name | Environment Variable | Purpose |
|---|---|---|
| `users` | `BASEROW_USERS_TABLE_ID` | User authentication, password hashes, and admin roles |
| `movies` | `BASEROW_MOVIES_TABLE_ID` | User library entries, statuses, ratings, reviews, queue ranks |
| `pirate_sites` | `BASEROW_PIRATES_TABLE_ID` | External streaming search link templates |
| `recommendation_profile` | `BASEROW_RECOMMENDATION_PROFILE_TABLE_ID` | Persisted Taste DNA attributes & library hash |
| `recommendation_sets` | `BASEROW_RECOMMENDATION_SETS_TABLE_ID` | Persisted 300-title recommendation sets |

---

## 1. `users` Table

Stores authenticated user accounts.

| Field Name | Type | Notes / Constraints |
|---|---|---|
| `username` | `text` | Unique username identifier |
| `password_hash` | `text` | Bcrypt salt-hashed password string |
| `role` | `select` | Single select: `user` (default) or `admin` |
| `blocked` | `boolean` | Account lock flag |
| `created_at` | `date` | ISO 8601 with time |
| `last_login` | `date` | ISO 8601 with time |

---

## 2. `movies` Table

Stores individual library entries for each user.

| Field Name | Type | Notes / Constraints |
|---|---|---|
| `username` | `text` | Foreign key reference to `users.username` |
| `movie_name` | `text` | Canonical media title |
| `type` | `text` | `"movie"` or `"series"` |
| `status` | `text` | Plain text field supporting 5 statuses: `"pending"`, `"watching"`, `"on_hold"`, `"completed"`, `"dropped"` |
| `rating` | `number` | User rating from `0` to `10` (1 decimal place) |
| `personal_review`| `long_text`| Optional markdown or text review notes |
| `watch_order_rank`| `number` | Integer queue sequence (`1..N`) for `pending` status; `null` for others |
| `watch_link` | `url` | Optional streaming URL or personal file URI |
| `tmdb_id` | `number` | Canonical TMDB identifier |
| `genres` | `long_text`| JSON string array or comma-separated genre names |
| `release_year` | `number` | Four-digit release year |
| `runtime` | `number` | Runtime in minutes |
| `language` | `text` | ISO 639-1 language code (e.g. `en`, `ja`, `ko`) |
| `poster_url` | `url` | TMDB poster image URL |
| `overview` | `long_text`| Plot synopsis |
| `created_at` | `date` | ISO 8601 timestamp |
| `updated_at` | `date` | ISO 8601 timestamp |

> [!NOTE]
> `status` is intentionally stored as a plain `text` field rather than a rigid single-select enum in Baserow. This allows adding new statuses (`watching`, `on_hold`) natively without destructive database migrations. Validation is strictly handled application-side via Zod schemas in `movieService.ts`.

---

## 3. `pirate_sites` Table

Stores external search URL templates populated on detail modals.

| Field Name | Type | Notes |
|---|---|---|
| `name` | `text` | Display label (e.g., "1337x", "YTS", "Braflix") |
| `search_url` | `url` | Template containing `{query}` or `{q}` token |
| `enabled` | `boolean` | Display toggle |

---

## 4. `recommendation_profile` Table

Caches synthesized Taste DNA preferences and library state hashes.

| Field Name | Type | Description |
|---|---|---|
| `username` | `text` | Target user reference |
| `favorite_genres` | `long_text`| JSON map of `{ [genre]: netScore }` |
| `disliked_genres` | `long_text`| JSON map of `{ [genre]: penaltyScore }` |
| `favorite_actors` | `long_text`| JSON map of top rated actors |
| `favorite_directors` | `long_text`| JSON map of top rated directors |
| `favorite_production_companies` | `long_text` | JSON map of production studios |
| `favorite_industries` | `long_text` | JSON map of film industries (Hollywood, Anime, etc.) |
| `favorite_eras` | `long_text` | JSON map of preferred decades |
| `language_preferences` | `long_text` | Preferred audio languages |
| `library_hash` | `text` | SHA-256 fingerprint of library state at generation |
| `generated_at` | `text` | ISO timestamp |
| `engine_version` | `text` | Engine version string (currently `"4.0"`) |

---

## 5. `recommendation_sets` Table

Caches the generated 300-title recommendation pool.

| Field Name | Type | Description |
|---|---|---|
| `username` | `text` | Target user reference |
| `recommendations` | `long_text`| Compressed JSON payload of 300 `RecommendationItem` objects |
| `status` | `text` | `"fresh"`, `"stale"`, or `"expired"` |
| `taste_hash` | `text` | Cryptographic hash matching `recommendation_profile` |
| `created_at` | `text` | ISO creation timestamp |
| `expires_at` | `text` | Expiration timestamp based on freshness hours |
| `generation_model` | `text` | Model used (e.g. `gemini-3.7-flash`) |
| `item_count` | `number` | Count of recommendations stored (typically 300) |
