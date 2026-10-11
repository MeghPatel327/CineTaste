# CineTaste Setup & Run Guide

Welcome to CineTaste! This guide will walk you through the complete process of setting up your development environment, configuring your databases and API keys, and running the application.

---

## 1. Prerequisites

Before you begin, ensure you have the following installed and set up:
- **Node.js** (v18.17.0 or higher recommended)
- **npm** (comes with Node.js)
- **A Baserow account** (for your database). You can use the hosted [Baserow.io](https://baserow.io/) or self-host.
- **A TMDB account** (for fetching movie metadata). Get an API key from [The Movie Database](https://www.themoviedb.org/).

---

## 2. Environment Configuration

1. Locate the `.env` or `.env.local` file in the root of the project (if it doesn't exist, create it by copying `.env.example`).
2. Fill in the following variables:

```env
# URL for the app (used in development)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Baserow Configuration
BASEROW_API_URL=https://api.baserow.io
BASEROW_DATABASE_ID=your_database_id_here
BASEROW_API_TOKEN=your_baserow_api_token_here

# TMDB Configuration
TMDB_API_KEY=your_tmdb_v3_api_key_here

# Authentication Secret (Used for encrypting JWT sessions)
# Generate a strong random string for production!
AUTH_SECRET=my_development_secret_key_change_me
```

---

## 3. Database Setup (Baserow)

CineTaste relies on Baserow for data storage. You need to create a database (which will give you the `BASEROW_DATABASE_ID`) and three specific tables.

### Table 1: `users`
Create a table named `users` with the following fields:
- `username` (Single line text)
- `password_hash` (Single line text)
- `role` (Single select: `user`, `admin`)
- `blocked` (Boolean)
- `created_at` (Date & time)
- `last_login` (Date & time)

### Table 2: `movies`
Create a table named `movies` with the following fields:
- `username` (Single line text)
- `movie_name` (Single line text)
- `type` (Single line text)
- `status` (Single line text)
- `rating` (Number)
- `watch_order_rank` (Number)
- `watch_link` (URL)
- `tmdb_id` (Number)
- `genres` (Long text - stores JSON string)
- `release_year` (Number)
- `runtime` (Number)
- `language` (Single line text)
- `poster_url` (URL)
- `overview` (Long text)

### Table 3: `pirate_sites`
Create a table named `pirate_sites` with the following fields:
- `name` (Single line text)
- `search_url` (URL)
- `enabled` (Boolean)

**Obtaining your Baserow API Token:**
1. In Baserow, go to your account Settings -> Database Tokens.
2. Create a new token, assign it to your CineTaste database workspace, and grant it Create/Read/Update/Delete permissions.
3. Paste this token into your `.env` file under `BASEROW_API_TOKEN`.

---

## 4. Installation & Running the App

### Install Dependencies
Open a terminal in the root folder of the project (`d:\My_Codes\Project\CineTaste`) and run:
```bash
npm install
```

### Start the Development Server
To run the app in development mode with Hot Module Replacement (HMR):
```bash
npm run dev
```
The application will be available at [http://localhost:3000](http://localhost:3000).

### Build for Production
To test the production build locally:
```bash
npm run build
npm start
```

---

## 5. First-Time Usage
1. Open the app at `http://localhost:3000`.
2. Register a new account. By default, the first account registered will be a standard `user`.
3. To grant yourself Admin access, you will need to manually open your Baserow `users` table and change your user's `role` to `admin`.
4. Log back in to access the `/admin` dashboard, where you can manage other users and configure pirate site search templates.
