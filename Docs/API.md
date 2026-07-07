# API

## Auth
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET /api/auth/session

## Movies
GET /api/movies
POST /api/movies
PATCH /api/movies/:id
DELETE /api/movies/:id

## Dashboard
GET /api/dashboard

## Recommendations
GET /api/recommendations

## Admin
GET /api/admin/users
PATCH /api/admin/users/:username/block
PATCH /api/admin/users/:username/role

## Pirate Sites
GET /api/admin/pirate-sites
POST /api/admin/pirate-sites
PATCH /api/admin/pirate-sites/:id
DELETE /api/admin/pirate-sites/:id
