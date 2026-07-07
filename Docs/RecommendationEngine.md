# Recommendation Engine (Detailed Design)

## Objective
Recommend movies that best match the user's personal taste using deterministic scoring.

## Pipeline
1. Collect watched titles.
2. Ignore unrated items.
3. Build Taste Profile.
4. Fetch candidate titles.
5. Calculate weighted score.
6. Rank descending.
7. Return explanation.

## Taste Dimensions
- Genres (multiple supported)
- Directors
- Actors
- Runtime
- Release year
- Language
- Movie vs Series

## Example Formula
Final Score =
0.40 * Genre +
0.20 * Director +
0.15 * Actors +
0.10 * Runtime +
0.10 * Release Year +
0.05 * Language

Weights should be configurable.

## Cold Start
- No ratings → show popular movies.
- <10 ratings → mostly genre-based.
- >25 ratings → enable all dimensions.

## Explainability
Every recommendation includes:
- Matching genres
- Matching director
- Matching actors
- Confidence score
