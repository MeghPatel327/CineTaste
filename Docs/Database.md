# Database Design

## Philosophy
- Keep user-owned data separate from metadata.
- Every movie belongs to exactly one user.
- Metadata originates from TMDB.
- Recommendation engine reads metadata but never mutates it.

## Tables

### users
| Field | Type | Notes |
|---|---|---|
| username | string | Primary Key |
| password_hash | string | bcrypt/argon2 |
| role | enum | user/admin |
| blocked | boolean | Default false |
| created_at | datetime | |
| last_login | datetime | |

### movies
Unique Constraint:
(username, movie_name)

Fields:
- id
- username (FK)
- movie_name
- type
- status
- rating
- watch_order_rank
- watch_link
- tmdb_id
- release_year
- genres[]
- runtime
- language
- poster_url
- overview
- created_at
- updated_at

### pirate_sites
- id
- name
- search_url
- enabled
