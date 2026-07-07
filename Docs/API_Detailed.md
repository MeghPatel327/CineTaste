# API Specification

## POST /api/auth/register
Request:
username,password

Response:
201 Created

Errors:
400 Validation
409 Username Exists

## POST /api/movies
Request:
movie_name
rating
status
watch_order_rank

Validation:
- Ownership
- Duplicate movie
- Rating range

Response:
Movie object

(Continue similarly for all endpoints.)
