
# Schema.md

# users

- username (PK)
- password_hash
- role
- blocked
- created_at
- last_login

# movies

- id
- username (FK -> users.username)
- movie_name
- type
- status
- rating
- watch_order_rank
- watch_link
- tmdb_id
- genres
- release_year
- runtime
- language
- poster_url
- overview
- created_at
- updated_at

Unique:
(username, movie_name)

# pirate_sites

- id
- name
- search_url
- enabled
