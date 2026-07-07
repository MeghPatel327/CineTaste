# Architecture

## High-Level Architecture

Client (Next.js)
    |
Next.js API Routes
    |
Service Layer
    |-- Auth Service
    |-- Movie Service
    |-- TMDB Service
    |-- Recommendation Engine
    |-- Admin Service
    |
Baserow

## Principles
- Feature-based modules
- Thin API routes
- Business logic only in services
- Deterministic recommendation engine
- TMDB isolated behind Movie Service
