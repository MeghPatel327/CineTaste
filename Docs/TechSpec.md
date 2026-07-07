
# TechSpec.md

# Technical Requirements

## Stack
- Frontend: Next.js (App Router), React, TypeScript
- Backend: Next.js API Routes
- Database: Baserow
- Hosting: Vercel
- Auth: Custom username/password (bcrypt or Argon2 + secure HTTP-only session cookies)
- Movie Metadata: TMDB API
- Charts: Recharts

## Principles
- Feature-based architecture
- Service layer between API and database
- Shared validation
- Strict TypeScript
- Environment variables for secrets
- Minimal dependencies
- Modular components

## Modules
- Authentication
- Dashboard
- Movie Management
- TMDB Service
- Recommendation Engine
- Admin
- Pirate Site Service

## Performance
- Lazy load pages
- Cache TMDB responses
- Paginated movie list
- Optimistic UI where appropriate

## Security
- Password hashing
- Rate-limit login
- Input validation
- Session expiration
- Server-side authorization
