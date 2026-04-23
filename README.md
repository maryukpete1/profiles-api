# Backend Wizards Stage 1 – Profile API

A Node.js/Express REST API that enriches a name with demographic data from three external APIs and persists the result. Built with SQLite for local data persistence.

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: SQLite (via `better-sqlite3`)
- **HTTP Client**: Axios
- **IDs**: UUID v7 (custom implementation, no extra dependency)

## Setup

```bash
# Install dependencies
npm install

# Start the server
npm start
```

The server starts on **port 3000** by default. Set the `PORT` environment variable to change it.

## Endpoints

### `POST /api/profiles`

Creates a profile by enriching a name with gender, age, and nationality data from Genderize, Agify, and Nationalize.

**Body**: `{ "name": "ella" }`

**Idempotency**: If the name has already been stored, the existing record is returned with `"message": "Profile already exists"` — no duplicate record is created.

**502 handling**: If any upstream API returns null, empty, or zero data, the request is rejected with a 502 and a descriptive message.

---

### `GET /api/profiles`

Returns all profiles. Supports optional case-insensitive filters:

| Param | Example |
|-------|---------|
| `gender` | `?gender=male` |
| `country_id` | `?country_id=NG` |
| `age_group` | `?age_group=adult` |

---

### `GET /api/profiles/:id`

Returns a single profile by UUID. Returns `404` if not found.

---

### `DELETE /api/profiles/:id`

Deletes a profile by UUID. Returns `204 No Content` on success.

## Error Responses

All errors follow the structure:

```json
{ "status": "error", "message": "..." }
```

| Status | Meaning |
|--------|---------|
| 400 | Missing or empty `name` |
| 404 | Profile not found |
| 502 | Upstream API (Genderize / Agify / Nationalize) returned invalid data |

## Age Group Classification

| Age Range | Group |
|-----------|-------|
| 0–12 | child |
| 13–19 | teenager |
| 20–59 | adult |
| 60+ | senior |

## How to Deploy

Any platform works: **Railway**, **Vercel**, **Heroku**, **AWS**, **PXXL App**, etc. (Render is not accepted per assignment instructions.)

### Railway (Recommended — Free + Easy)

1. Push this repo to GitHub.
2. Go to [railway.app](https://railway.app), create a new project, and select "Deploy from GitHub Repo".
3. Set the `PORT` environment variable if needed (Railway usually injects it automatically).
4. Done — copy your live URL for submission.

## Pushing to GitHub

```bash
# Step 1: Initialize git (run from the project folder)
git init

# Step 2: Add all files
git add .

# Step 3: Commit
git commit -m "feat: Backend Wizards Stage 1 - Profile API"

# Step 4: Create a repo on GitHub (github.com → New Repository)
# Then connect it:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Step 5: Push
git branch -M main
git push -u origin main
```

After pushing, open a pull request or just share the repo link and live API URL when submitting via `/submit`.
