# QuickTest — Full Setup & Deployment Guide

## What You Have
A complete full-stack web app:
- **Frontend** — React SPA (in `public/`)
- **Backend** — Node.js + Express API (in `src/`)
- **Database** — Supabase (free hosted Postgres, persists forever)

---

## Step 1 — Create Your Free Supabase Database (5 minutes)

1. Go to **supabase.com** and sign up (free)
2. Click **"New Project"**, give it a name like `quicktest`, set a database password, pick a region close to you
3. Wait ~2 minutes for it to provision
4. Go to **SQL Editor** (left sidebar) → click **"New query"**
5. Open the file `db/schema.sql` from this folder, copy everything, paste it in, click **"Run"**
6. You should see "Success. No rows returned" — your tables are created

**Get your credentials:**
- Go to **Settings → API** in your Supabase project
- Copy **Project URL** → this is your `SUPABASE_URL`
- Copy **service_role secret** (under "Project API keys") → this is your `SUPABASE_SERVICE_ROLE_KEY`
  ⚠️ Use the `service_role` key (not `anon`), and keep it secret — never commit it to GitHub

---

## Step 2 — Deploy to Railway (5 minutes, free)

1. Push this entire folder to a new **GitHub repository**
   - Go to github.com → New repository → name it `quicktest`
   - Upload all files (or use `git init && git add . && git commit -m "init" && git push`)

2. Go to **railway.app** → sign up with GitHub → **New Project → Deploy from GitHub repo**

3. Select your `quicktest` repo

4. Railway detects Node.js automatically. Click **Deploy**

5. Go to your project → **Variables tab** → Add these environment variables:
   ```
   SUPABASE_URL          = https://xxxx.supabase.co        (from Step 1)
   SUPABASE_SERVICE_ROLE_KEY = eyJhbGci...                 (from Step 1)
   JWT_SECRET            = (any long random string, e.g. run: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")
   NODE_ENV              = production
   ```

6. Go to **Settings → Networking → Generate Domain**
   You'll get a URL like: `https://quicktest-production.up.railway.app`

7. **Share that URL with anyone** — it's your live app! 🎉

---

## Running Locally (optional)

```bash
# 1. Install dependencies
npm install

# 2. Create your .env file
cp .env.example .env
# Edit .env and fill in your SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and JWT_SECRET

# 3. Start the server
npm start
# or for auto-reload during development:
npm run dev

# 4. Open http://localhost:3001
```

---

## Installing as a Phone/Desktop App (PWA)

Once your app is live on Railway:

**iPhone (Safari):** Open your URL → tap Share → "Add to Home Screen"  
**Android (Chrome):** Open your URL → tap menu → "Add to Home Screen" / "Install App"  
**Desktop (Chrome):** Click the ⊕ install icon in the address bar

---

## Project Structure

```
quicktest/
├── public/              ← Frontend (served statically)
│   ├── index.html       ← Complete React app
│   ├── manifest.json    ← PWA config
│   ├── sw.js            ← Service worker (offline support)
│   └── icon-*.png       ← App icons
├── src/
│   ├── server.js        ← Express app entry point
│   ├── middleware/
│   │   └── auth.js      ← JWT verification
│   └── routes/
│       ├── auth.js      ← Register / Login / Me
│       ├── tests.js     ← Test CRUD + student code lookup
│       ├── submissions.js ← Student submit + teacher grading
│       └── decks.js     ← Flashcard deck CRUD + student code lookup
├── db/
│   ├── supabase.js      ← Supabase client
│   └── schema.sql       ← Run once in Supabase SQL Editor
├── .env.example         ← Template for your .env file
├── .gitignore
└── package.json
```

---

## API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/register | — | Create teacher account |
| POST | /api/auth/login | — | Login, returns JWT |
| GET | /api/auth/me | Teacher | Get current teacher |
| GET | /api/tests | Teacher | List teacher's tests |
| POST | /api/tests | Teacher | Create test |
| PUT | /api/tests/:id | Teacher | Update test |
| DELETE | /api/tests/:id | Teacher | Delete test |
| GET | /api/tests/by-code/:code | — | Student lookup by code |
| POST | /api/submissions | — | Student submit test |
| GET | /api/submissions/check | — | Check if already submitted |
| GET | /api/submissions/test/:id | Teacher | Get all submissions |
| PATCH | /api/submissions/:id/grade | Teacher | Manually grade question |
| PATCH | /api/submissions/:id/retake | Teacher | Allow retake |
| GET | /api/decks | Teacher | List flashcard decks |
| POST | /api/decks | Teacher | Create deck |
| PUT | /api/decks/:id | Teacher | Update deck |
| DELETE | /api/decks/:id | Teacher | Delete deck |
| GET | /api/decks/by-code/:code | — | Student lookup by code |

---

## Important Security Notes

- Never commit your `.env` file to GitHub — it's in `.gitignore`
- Use a strong random `JWT_SECRET` in production
- The `SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security — keep it server-side only
- Railway encrypts all environment variables at rest
