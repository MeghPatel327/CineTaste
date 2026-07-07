# CineTaste

> **A Personal Movie & Series Companion That Learns Your Taste**

---

# 1. Vision

CineTaste is a personal movie and series management platform that focuses entirely on the individual user.

Unlike IMDb, Letterboxd, Trakt or similar websites, CineTaste is **not** a social platform.

The objective is not to read reviews from strangers.

The objective is to answer one question:

> **Will I enjoy this movie?**

The application gradually understands a user's taste by analyzing the movies and series they have watched and rated.

Recommendations are generated using deterministic algorithms instead of AI, making every recommendation explainable and transparent.

---

# 2. Product Goals

- Keep track of watched and pending movies/series.
- Maintain a prioritized watch order.
- Learn user preferences from ratings.
- Recommend movies matching the user's taste.
- Stay lightweight and fast.
- Require minimal external services.
- Be production-quality rather than just a learning project.

---

# 3. Non Goals

Version 1 will NOT include:

- Public profiles
- Public reviews
- Comments
- Likes
- Followers
- Social feed
- Chat
- AI chatbot
- Email verification
- Password reset
- OAuth Login
- Push notifications

---

# 4. Core Philosophy

## Personal
Everything belongs to the logged-in user.

## Explainable
Every recommendation should explain **why** it was recommended.

## Deterministic
Minimal or zero AI. All recommendation logic should be reproducible.

## Fast
Lightweight, responsive and optimized.

## Professional
Production-ready architecture, modular code and scalable design.

---

# 5. User Roles

## User

Can:

- Register/Login
- Add/Edit/Delete/View their own movies
- Manage watch order
- Rate movies
- View recommendations
- Search, filter and sort their library

## Admin

Can:

- View user statistics
- View registered users
- Block/Delete users
- Promote/Demote roles
- Manage pirate site search templates

Cannot:

- Modify a user's movie library

---

# 6. Authentication

- Custom authentication system
- Username + Password
- Password stored as bcrypt/Argon2 hash
- Session-based authentication
- No Firebase Auth
- No OAuth
- No Email in V1

---

# 7. Technology Stack

Frontend
- Next.js
- React
- TypeScript

Backend
- Next.js API Routes

Database
- Baserow

Hosting
- Vercel

Movie Metadata
- TMDB API

Charts
- Recharts / Chart.js

---

# 8. Database

## users

- username (unique)
- password_hash
- role
- blocked
- created_at
- last_login

## movies

- id
- username
- movie_name
- type
- status
- rating
- watch_order_rank
- watch_link
- tmdb_id
- release_year
- genres
- runtime
- language
- poster_url
- overview
- created_at
- updated_at

Constraint:

(username + movie_name) must be unique.

## pirate_sites

- id
- name
- search_url
- enabled

Example:

https://example.com/search?q={query}

---

# 9. Dashboard

Display:

- Total Movies
- Watched
- Pending
- Completion %
- Average Rating
- Next 5 Watch Order
- Favorite Genres
- Recommendation Preview

---

# 10. Add Movie Flow

1. User types movie name.
2. TMDB search is performed.
3. User selects the correct title.
4. Metadata is auto-filled:
   - Poster
   - Genres
   - Release Year
   - Runtime
   - Language
   - Overview
   - Movie/Series
   - TMDB ID
5. User enters:
   - Rating
   - Watch Order
   - Watch Link
6. Save to database.

---

# 11. Recommendation Engine

The core feature of CineTaste.

No AI.

The engine builds a personal taste profile using:

- Genres
- Directors
- Actors
- Runtime
- Release Year
- Language
- Movie vs Series preference

Each unseen movie receives a weighted score.

Highest scoring movies become recommendations.

Every recommendation must include an explanation.

---

# 12. Movie List

Features:

- Search
- Filters
- Sorting
- Pagination (optional)

Filters:

- Movie / Series
- Pending / Completed
- Genre
- Release Year
- Rating Range

Sort:

- Watch Order
- Rating
- Name
- Release Year
- Recently Added

---

# 13. Watch Order

Pending movies maintain a ranking.

The UI includes:

- Move Up
- Move Down

Ranks are swapped automatically.

---

# 14. Pirate Sites

If no personal watch link exists:

Generate search links using administrator-defined search templates.

No scraping.

No hosted content.

Only generated search links.

---

# 15. UI Principles

- Dark theme first
- Clean interface
- Poster-focused
- Responsive
- Fast
- Minimal animations

---

# 16. Architecture

Modules:

- Authentication
- User
- Movie Management
- TMDB Service
- Recommendation Engine
- Admin
- Shared Components

Recommendation Engine

↓

Movie Service

↓

TMDB Service

↓

TMDB API

---

# 17. Development Philosophy

- 100% vibe coding
- IDE Agent implements features
- ChatGPT acts as software architect
- Modular prompts
- Production-quality code
- Minimal technical debt

---

# 18. Long-Term Vision

CineTaste should evolve into a personal entertainment companion that understands the user's taste over time.

Possible future features:

- Email support
- Password reset
- Prediction accuracy
- Hidden gems
- Advanced analytics
- Streaming platform integration
- Calendar
- Watch streaks
- Public profiles (optional)

---

# Guiding Principle

> Recommend movies based on the user's taste — not the internet's.
