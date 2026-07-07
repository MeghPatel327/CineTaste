# CineTaste Development Prompt

## Before You Start

You are continuing development of **CineTaste**.

Before writing any code, read **every document inside the `Docs/` folder**.

The documentation is the source of truth.

### Follow these rules

- Do not change the architecture unless absolutely necessary.
- Do not break existing functionality.
- Keep the project compiling after your changes.
- Write production-quality TypeScript.
- Use reusable components and services.
- Never hardcode secrets.
- Do not leave TODOs or placeholder implementations.
- Follow SOLID where practical.

# Objective
Implement the complete authentication module.

## Scope
- Registration
- Login
- Logout
- Session management
- HTTP-only cookies
- bcrypt password hashing
- Middleware
- Protected routes
- User repository using Baserow
- Validation and error handling

## Out of Scope
- Movie APIs
- Admin

## Acceptance Criteria
Users can securely register, login and logout.
