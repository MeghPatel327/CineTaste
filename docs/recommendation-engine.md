# Recommendation Engine & Pipeline

CineTaste features a hybrid dual-engine recommendation platform (Engine Version 4.0) that generates at least **300 diverse, highly personalized titles** balanced evenly across **Movies (~100)**, **TV Series (~100)**, and **Anime (~100)**.

---

## Engine Architecture

```
User Library (Rated Titles >= 7, Personal Reviews, Watch Order, Dropped Titles)
                                 │
                                 ▼
                     Taste Profile Synthesis
        (Genre Affinities, Preferred Eras, Directors, Keywords)
                                 │
         ┌───────────────────────┴───────────────────────┐
         ▼                                               ▼
1. Gemini AI Synthesis                          2. TMDB Discovery & Supplement
(Deep thematic tone, obscure gems,               (Top-rated, curated genre seeds,
 narrative stylistic parallels)                  director filmography matches)
         │                                               │
         └───────────────────────┬───────────────────────┘
                                 ▼
         3. Strict Category Mutual Exclusivity
            - Movies: Non-anime, media_type = 'movie'
            - Series: Non-anime, media_type = 'tv'
            - Anime:  animeClassifier heuristics = true
                                 ▼
         4. Multi-Layer Library Exclusion Guard
            - Canonical TMDB ID matching
            - Lowercase exact title matching
            - Alphanumeric normalized title matching
                                 ▼
         5. Multi-Factor Scoring (0–99 Scale)
                                 ▼
         6. Diversity Filtering & Balancing
            (Round-robin Movie / Series / Anime interleave)
                                 ▼
         7. Persistence & Caching
            (Baserow recommendation_sets table + Memory Cache)
```

---

## Pipeline Stages

### 1. Taste Profile & Library Hash
Before generating candidates, the engine computes a cryptographic SHA-256 `tasteHash` based on:
- User's completed title IDs and ratings.
- Dropped title IDs.
- User's Taste DNA profile attributes (favorite genres, eras, directors).

If a persisted recommendation set exists in Baserow and matches the current `tasteHash` within the freshness window (configurable via `RECOMMENDATION_FRESHNESS_HOURS`, default 72 hours), it is served instantly without re-invoking Gemini.

### 2. Candidate Generation (3 Parallel Categories)
The engine executes three parallel generation tasks targeting at least 100 resolved candidates per category:
- **`movies`**: Live-action feature films.
- **`series`**: Western and global live-action television series.
- **`anime`**: Japanese animation films and series identified by `animeClassifier`.

#### Gemini AI Synthesis
- Passes the user's top-rated completed movies/series, high-rated genres, and favorite directors/eras to Gemini.
- Uses negative prompt constraints: explicit list of all currently tracked library titles that Gemini must NOT recommend.
- Instructs Gemini to return structured JSON candidates containing title, release year, media type, and personalized cinematic rationale (`gemini_reason`).
- Resolves candidates against TMDB API in parallel with concurrency throttling (`concurrency: 5`) to obtain canonical IDs, backdrop/poster URLs, and verified genre tags.

#### TMDB Discovery Supplement
If Gemini returns fewer than 100 candidates for any category, the pipeline supplements from TMDB discover endpoints using:
- User's top-rated genres as `with_genres` seeds.
- Japanese language flag (`with_original_language=ja`) for anime.
- Excludes all titles present in library or already resolved.

---

## Strict Library Content Exclusion

CineTaste enforces an absolute rule: **No movie, series, or anime already present in the user's library (regardless of status: completed, watching, on hold, pending, or dropped) may appear as a recommendation.**

Exclusion is applied at 4 distinct layers:
1. **Pre-Generation**: All library titles are passed in Gemini prompts under an explicit `Already in library (DO NOT recommend these)` block.
2. **Post-Resolution (`generateCategoryPool`)**: Resolved candidates are rejected if they match:
   - Canonical TMDB ID (`libraryIds.has(item.tmdb_id)`)
   - Exact lowercase trimmed title (`libraryNames.has(title.toLowerCase().trim())`)
   - Alphanumeric normalized title (`libraryNormalized.has(title.toLowerCase().replace(/[^a-z0-9]/g, ""))`)
3. **Serving Layer (`revalidateItems`)**: Whenever recommendation sets are read from memory cache or Baserow table rows, `revalidateItems` filters the array against the user's live library before applying pagination offsets.
4. **Catalogue Discovery (`browseService.ts`)**: Initial catalogue formations, curated fallbacks, TMDB discovery streams, and spotlight banner candidates are strictly filtered with `isLibraryItem`.

---

## Scoring Formula (0–99 Scale)

Candidates are ranked using a multi-factor weighted heuristic:

| Factor | Weight | Evaluation Criteria |
|---|---|---|
| **Genre Match** | 45% | Overlap with user's positive Taste DNA net scores |
| **Keyword Affinity** | 20% | Thematic keywords matching user's top-rated titles |
| **Director Affinity** | 10% | Filmography overlap with favorite directors |
| **Film Industry** | 8% | Hollywood, Bollywood, East Asian, European match |
| **Cast Affinity** | 5% | Recurring high-rated actors in cast list |
| **Runtime & Era** | 8% | Decade matching user's preferred viewing eras |
| **TMDB Quality** | 4% | Global vote average baseline (ensures quality floor) |

Scores are clamped between 65 and 96 for discovery comfort, matching user affinity percentages shown in the UI.

---

## Diversity Rules

To prevent recommendation feeds from becoming repetitive:
- **Director Cap**: Maximum 3 titles from the same director in a 100-title category pool.
- **Decade Diversity**: At least 3 different decades represented across every 20-title slice.
- **Round-Robin Interleaving**: Category pools are interleaved (1 Movie, 1 Series, 1 Anime) so that multi-category views never present single-type clusters.
