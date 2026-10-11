"""
CineTaste 2.0 — 50-title mixed movie + TV series recommendation and TMDB resolution test

Flow:
1. Gemini recommends movies and TV series for a taste profile.
2. TMDB searches the movie or TV database for candidates for each title.
3. Gemini selects the correct candidate from TMDB results.
4. Python validates that every selected ID was actually returned by TMDB.
5. Results are printed as JSON.

Requirements:
    pip install openai requests

Your gemini-web2api server must be running at:
    http://localhost:8081/v1
"""

import json
import os
import re
import time
from typing import Any

import requests
from openai import OpenAI
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


# -------------------- CONFIGURATION --------------------

# Test key supplied by you. Replace it later, and preferably load from an
# environment variable before deploying:
TMDB_API_KEY = os.getenv(
    "TMDB_API_KEY",
    "bda6b75240dae44ed7f48c8725d50c20"
)

GEMINI_BASE_URL = "http://localhost:8081/v1"
GEMINI_API_KEY = os.getenv("GEMINI_WEB2API_KEY", "dummy")
GEMINI_MODEL = "gemini-3.7-flash"

TMDB_BASE_URL = "https://api.themoviedb.org/3"
TMDB_LANGUAGE = "en-US"
MAX_CANDIDATES_PER_TITLE = 5
MOVIE_COUNT = 25
TV_COUNT = 25
MAX_RECOMMENDATION_ATTEMPTS = 5
RESOLVER_BATCH_SIZE = 10
REQUEST_TIMEOUT = (10, 35)

# OpenAI-compatible Gemini Web2API client
ai_client = OpenAI(
    base_url=GEMINI_BASE_URL,
    api_key=GEMINI_API_KEY,
    timeout=90.0,
    max_retries=2,
)

# HTTP session with retries for temporary TMDB network errors / rate limits
tmdb_session = requests.Session()
retry_config = Retry(
    total=4,
    connect=4,
    read=2,
    backoff_factor=0.8,
    status_forcelist=[429, 500, 502, 503, 504],
    allowed_methods=["GET"],
    respect_retry_after_header=True,
)
tmdb_session.mount("https://", HTTPAdapter(max_retries=retry_config))


# -------------------- GEMINI HELPERS --------------------

def extract_json(text: str) -> Any:
    """Parse JSON, tolerating a surrounding Markdown code fence."""
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\s*```$", "", text)

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Try to extract the first JSON object or array from surrounding text.
        starts = [i for i in (text.find("{"), text.find("[")) if i >= 0]
        if not starts:
            raise ValueError(f"Gemini did not return JSON. Response: {text[:500]}")
        start = min(starts)
        end = max(text.rfind("}"), text.rfind("]"))
        if end < start:
            raise ValueError(f"Could not find complete JSON. Response: {text[:500]}")
        return json.loads(text[start:end + 1])


def ask_gemini_json(system_prompt: str, user_prompt: str) -> Any:
    """Ask Gemini for JSON using the local OpenAI-compatible proxy."""
    response = ai_client.chat.completions.create(
        model=GEMINI_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.2,
    )

    content = response.choices[0].message.content
    if not content:
        raise ValueError("Gemini returned an empty response.")
    return extract_json(content)


# -------------------- STEP 1: RECOMMEND TITLES --------------------

def recommend_titles(taste_profile: str) -> list[dict]:
    """Return the configured movie/TV mix, retrying missing types."""
    system_prompt = """
You are CineTaste, a personalized movie and TV-series recommendation engine.
Recommend real movies and TV series based on the user's preferences.
Do not provide TMDB IDs or invent metadata. Avoid repeating titles.
Use media_type="movie" for films and media_type="tv" for TV series.
Return only valid JSON in this exact shape:
{
  "recommendations": [
    {"title": "Arrival", "year": 2016, "media_type": "movie", "reason": "A thoughtful science-fiction story."},
    {"title": "Dark", "year": 2017, "media_type": "tv", "reason": "A complex mystery with layered timelines."}
  ]
}
The year must be an integer or null. media_type must be "movie" or "tv".
Respect exclusions and avoid titles explicitly listed as favorites-to-exclude.
Do not return more items of a type than requested. Return only JSON.
"""

    collected: list[dict] = []
    seen_titles: set[str] = set()

    for attempt in range(1, MAX_RECOMMENDATION_ATTEMPTS + 1):
        movie_slots = MOVIE_COUNT - sum(x["media_type"] == "movie" for x in collected)
        tv_slots = TV_COUNT - sum(x["media_type"] == "tv" for x in collected)
        if movie_slots <= 0 and tv_slots <= 0:
            break

        user_prompt = f"""
User taste profile and constraints:
{taste_profile}

Still needed in this response:
- Exactly {max(0, movie_slots)} movie recommendations (media_type="movie")
- Exactly {max(0, tv_slots)} TV-series recommendations (media_type="tv")

Return only the missing items. Do not repeat any title already selected:
{json.dumps([x["title"] for x in collected], ensure_ascii=False)}
Prioritize underrated/less-obvious gems when they genuinely fit the user's taste.
Return only the JSON object.
"""
        data = ask_gemini_json(system_prompt, user_prompt)
        recommendations = data.get("recommendations", [])
        if not isinstance(recommendations, list):
            raise ValueError("Gemini's 'recommendations' field was not a list.")

        # Prioritize the media type currently most under-filled, but accept either
        # type when Gemini supplies a valid missing slot.
        for item in recommendations:
            if not isinstance(item, dict):
                continue
            title = str(item.get("title", "")).strip()
            if not title:
                continue

            media_type = str(item.get("media_type", "")).strip().lower()
            if media_type not in ("movie", "tv"):
                continue

            title_key = title.casefold()
            if title_key in seen_titles:
                continue

            year = item.get("year")
            if isinstance(year, str) and year.isdigit():
                year = int(year)
            if not isinstance(year, int):
                year = None

            current_count = sum(x["media_type"] == media_type for x in collected)
            type_limit = MOVIE_COUNT if media_type == "movie" else TV_COUNT
            if current_count >= type_limit:
                continue

            seen_titles.add(title_key)
            collected.append({
                "title": title,
                "year": year,
                "media_type": media_type,
                "reason": str(item.get("reason", "")).strip(),
            })

        if len(collected) < MOVIE_COUNT + TV_COUNT and attempt < MAX_RECOMMENDATION_ATTEMPTS:
            print(
                f"[Gemini] Recommendation mix incomplete; retrying "
                f"(movies {sum(x['media_type']=='movie' for x in collected)}/{MOVIE_COUNT}, "
                f"TV {sum(x['media_type']=='tv' for x in collected)}/{TV_COUNT})."
            )

    movie_results = [x for x in collected if x["media_type"] == "movie"][:MOVIE_COUNT]
    tv_results = [x for x in collected if x["media_type"] == "tv"][:TV_COUNT]
    final_results = movie_results + tv_results

    if len(movie_results) != MOVIE_COUNT or len(tv_results) != TV_COUNT:
        raise RuntimeError(
            f"Gemini did not provide the required {MOVIE_COUNT} movies + {TV_COUNT} TV series after "
            f"{MAX_RECOMMENDATION_ATTEMPTS} attempts (got {len(movie_results)} movies, "
            f"{len(tv_results)} TV series). Try again or make the taste profile less restrictive."
        )

    return final_results


# -------------------- STEP 2: TMDB SEARCH --------------------

def search_tmdb_candidates(
    title: str,
    year: int | None,
    media_type: str = "movie",
) -> list[dict]:
    """Search TMDB movie or TV databases and return compact candidate records."""
    if media_type not in ("movie", "tv"):
        raise ValueError("media_type must be 'movie' or 'tv'")

    endpoint = "search/movie" if media_type == "movie" else "search/tv"
    params = {
        "api_key": TMDB_API_KEY,
        "query": title,
        "include_adult": "false",
        "language": TMDB_LANGUAGE,
        "page": 1,
    }
    if year:
        params["year" if media_type == "movie" else "first_air_date_year"] = year

    response = tmdb_session.get(
        f"{TMDB_BASE_URL}/{endpoint}",
        params=params,
        timeout=REQUEST_TIMEOUT,
    )
    response.raise_for_status()
    payload = response.json()

    candidates = []
    for item in payload.get("results", [])[:MAX_CANDIDATES_PER_TITLE]:
        if media_type == "movie":
            release_date = item.get("release_date") or ""
            display_title = item.get("title") or ""
            original_title = item.get("original_title") or ""
        else:
            release_date = item.get("first_air_date") or ""
            display_title = item.get("name") or ""
            original_title = item.get("original_name") or ""

        candidates.append({
            "media_type": media_type,
            "tmdb_id": item.get("id"),
            "title": display_title,
            "original_title": original_title,
            "release_date": release_date,
            "year": int(release_date[:4]) if len(release_date) >= 4 and release_date[:4].isdigit() else None,
            "overview": (item.get("overview") or "")[:700],
            "original_language": item.get("original_language") or "",
            "poster_path": item.get("poster_path"),
        })

    return candidates


def retrieve_candidates(recommendations: list[dict]) -> list[dict]:
    """Search TMDB for each recommendation and retain its candidate list."""
    items = []

    for index, recommendation in enumerate(recommendations, start=1):
        title = recommendation["title"]
        year = recommendation["year"]
        media_type = recommendation.get("media_type", "movie")
        type_label = "TV series" if media_type == "tv" else "movie"
        print(
            f"[TMDB] Searching {index}/{len(recommendations)}: "
            f"{title} ({year or 'year unknown'}, {type_label})"
        )

        try:
            candidates = search_tmdb_candidates(title, year, media_type)
            items.append({
                **recommendation,
                "candidates": candidates,
            })
            if not candidates:
                print("      No candidates found.")
        except requests.RequestException as exc:
            print(f"      TMDB request failed for {title}: {exc}")
            items.append({
                **recommendation,
                "candidates": [],
                "search_error": str(exc),
            })

        time.sleep(0.15)

    return items


# -------------------- STEP 3: GEMINI MATCH RESOLUTION --------------------

def resolve_tmdb_matches(recommendations_with_candidates: list[dict]) -> list[dict]:
    """
    Resolve TMDB matches in small batches to avoid oversized prompts on large runs.
    Candidate IDs are untrusted input; Python validates every selected ID.
    """
    if len(recommendations_with_candidates) > RESOLVER_BATCH_SIZE:
        combined = []
        total = len(recommendations_with_candidates)
        for start in range(0, total, RESOLVER_BATCH_SIZE):
            chunk = recommendations_with_candidates[start:start + RESOLVER_BATCH_SIZE]
            print(
                f"[Gemini resolver] Batch {start // RESOLVER_BATCH_SIZE + 1}/"
                f"{(total + RESOLVER_BATCH_SIZE - 1) // RESOLVER_BATCH_SIZE} "
                f"({len(chunk)} titles)"
            )
            combined.extend(resolve_tmdb_matches(chunk))
        return combined

    resolvable = [
        item for item in recommendations_with_candidates
        if item.get("candidates")
    ]

    if not resolvable:
        return [
            {
                **item,
                "matched": False,
                "tmdb_id": None,
                "match_reason": "TMDB returned no candidates.",
            }
            for item in recommendations_with_candidates
        ]

    # Send all candidate groups in one request to reduce calls.
    batch = []
    for idx, item in enumerate(resolvable, start=1):
        batch.append({
            "recommendation_key": idx,
            "intended_title": item["title"],
            "intended_year": item["year"],
            "media_type": item.get("media_type", "movie"),
            "recommendation_reason": item["reason"],
            "tmdb_candidates": item["candidates"],
        })

    system_prompt = """
You are CineTaste's TMDB media identity resolver.
For each recommendation, choose the candidate that represents the intended movie
or TV series. Use media type, title, original title, release/first-air year, and
overview. The recommendation reason may help identify the intended work, but do
not choose a merely thematically similar title. A candidate's ID is not evidence
of identity by itself.

IMPORTANT:
- Select ONLY a tmdb_id included in that recommendation's candidate list.
- If no candidate clearly matches, set matched=false and tmdb_id=null.
- Do not invent or alter IDs.
- Do not confuse movies with TV series, remakes, short films, documentaries, or titles with similar names.
- For TV series, compare first-air year; for movies, compare release year.
- If the year differs substantially, reject unless there is a clear, justified match.
- Confidence is a rough 0-1 estimate, not a probability guarantee.
Return only valid JSON:
{
  "matches": [
    {
      "recommendation_key": 1,
      "matched": true,
      "tmdb_id": 123,
      "confidence": 0.95,
      "reason": "Title, year, and plot summary match."
    }
  ]
}
"""

    user_prompt = (
        "Resolve these movie and TV-series recommendations using only the candidates provided:\n"
        + json.dumps(batch, ensure_ascii=False)
    )

    try:
        data = ask_gemini_json(system_prompt, user_prompt)
        raw_matches = data.get("matches", [])
    except Exception as exc:
        print(f"[Gemini resolver] Batch matching failed: {exc}")
        raw_matches = []

    match_by_key = {}
    for match in raw_matches if isinstance(raw_matches, list) else []:
        if isinstance(match, dict):
            try:
                match_by_key[int(match.get("recommendation_key"))] = match
            except (TypeError, ValueError):
                pass

    output = []
    resolvable_key = 0

    for item in recommendations_with_candidates:
        candidates = item.get("candidates", [])

        if not candidates:
            output.append({
                **item,
                "matched": False,
                "tmdb_id": None,
                "match_confidence": 0.0,
                "match_reason": "TMDB returned no candidates.",
            })
            continue

        resolvable_key += 1
        match = match_by_key.get(resolvable_key, {})
        selected_id = match.get("tmdb_id")
        candidate_ids = {candidate.get("tmdb_id") for candidate in candidates}

        # Validate that the model chose a candidate returned by TMDB.
        matched = (
            match.get("matched") is True
            and isinstance(selected_id, int)
            and selected_id in candidate_ids
        )

        selected_candidate = None
        if matched:
            selected_candidate = next(
                candidate for candidate in candidates
                if candidate.get("tmdb_id") == selected_id
            )

            # Conservative year validation in Python as an additional guard.
            intended_year = item.get("year")
            candidate_year = selected_candidate.get("year")
            if selected_candidate.get("media_type") != item.get("media_type", "movie"):
                matched = False
                selected_candidate = None
            elif intended_year and candidate_year and abs(intended_year - candidate_year) > 1:
                matched = False
                selected_candidate = None

        confidence = match.get("confidence", 0.0)
        try:
            confidence = max(0.0, min(1.0, float(confidence)))
        except (TypeError, ValueError):
            confidence = 0.0

        output.append({
            "title": item["title"],
            "year": item["year"],
            "media_type": item.get("media_type", "movie"),
            "recommendation_reason": item["reason"],
            "matched": matched,
            "tmdb_id": selected_candidate["tmdb_id"] if matched else None,
            "matched_title": selected_candidate["title"] if matched else None,
            "matched_release_date": selected_candidate["release_date"] if matched else None,
            "poster_path": selected_candidate["poster_path"] if matched else None,
            "match_confidence": confidence if matched else 0.0,
            "match_reason": str(match.get("reason", "")),
            "candidates": candidates,
        })

    return output


# -------------------- STEP 4: VALIDATE + DISPLAY --------------------

def run_cinetaste_workflow(taste_profile: str) -> list[dict]:
    """Run the complete Gemini -> TMDB -> Gemini workflow."""
    print("\n[1/4] Asking Gemini for recommendations...")
    recommendations = recommend_titles(taste_profile)

    if not recommendations:
        print("Gemini returned no valid recommendations.")
        return []

    print(f"Gemini recommended {len(recommendations)} titles ({MOVIE_COUNT} movies + {TV_COUNT} TV series):")
    for movie in recommendations:
        label = "TV" if movie.get("media_type") == "tv" else "Movie"
        print(f"  - {movie['title']} ({movie['year'] or 'year unknown'}) [{label}]")

    print("\n[2/4] Searching TMDB candidates...")
    with_candidates = retrieve_candidates(recommendations)

    print("\n[3/4] Asking Gemini to resolve TMDB matches...")
    resolved = resolve_tmdb_matches(with_candidates)

    print("\n[4/4] Results")
    for item in resolved:
        if item["matched"]:
            print(
                f"[MATCH] [{item.get('media_type', 'movie').upper()}] "
                f"{item['title']} ({item['year']}) -> "
                f"TMDB ID {item['tmdb_id']} | "
                f"{item['matched_title']} ({item['matched_release_date']})"
            )
            print(f"        Reason: {item['match_reason']}")
        else:
            print(
                f"[UNRESOLVED] [{item.get('media_type', 'movie').upper()}] "
                f"{item['title']} ({item['year'] or 'year unknown'})"
            )
            print(f"             {item.get('match_reason', 'No reliable match selected.')}")

    output_file = "cinetaste_recommendations.json"
    with open(output_file, "w", encoding="utf-8") as file:
        json.dump(resolved, file, indent=2, ensure_ascii=False)

    print(f"\nFull results saved to: {os.path.abspath(output_file)}")
    return resolved


if __name__ == "__main__":
    print("=" * 58)
    print("        CineTaste 2.0 — AI Movies + Series + TMDB")
    print("=" * 58)

    profile = input(
        "\nDescribe your movie taste (or press Enter for the sample):\n> "
    ).strip()

    if not profile:
        profile = (
            "I love Inception, Interstellar, Shutter Island, and The Prestige. "
            "I prefer mind-bending concepts, complex storytelling, plot twists, "
            "suspense, intelligent characters, and intense action. I dislike "
            "unnecessarily slow pacing, predictable plots, forced romance, and "
            "comedy that undermines a serious story."
        )

    try:
        run_cinetaste_workflow(profile)
    except KeyboardInterrupt:
        print("\nStopped by user.")
    except Exception as exc:
        print(f"\nWorkflow failed: {type(exc).__name__}: {exc}")
        print(
            "Check that your Gemini Web2API server is running, the configured "
            "model name is supported, and your TMDB API key is valid."
        )
