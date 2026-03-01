# QuickTest — Deployment Guide
## GitHub + Supabase + Railway (all free)

---

## What's in this folder

```
quicktest/
├── public/               ← The app (frontend)
│   ├── index.html        ← Everything the user sees
│   ├── manifest.json     ← Makes it installable on phones
│   ├── sw.js             ← Offline support
│   ├── icon-192.png      ← App icon
│   └── icon-512.png      ← App icon (large)
├── src/
│   ├── server.js         ← Main server
│   ├── middleware/
│   │   └── auth.js       ← Login security
│   └── routes/
│       ├── auth.js       ← Teacher signup / login
│       ├── tests.js      ← Tests
│       ├── submissions.js ← Student answers + grading
│       └── decks.js      ← Flashcard decks
├── db/
│   ├── supabase.js       ← Database connection
│   └── schema.sql        ← Run this once to create your tables
├── .env.example          ← Copy this to .env and fill in your keys
├── .gitignore            ← Keeps secrets out of GitHub
├── package.json          ← Dependencies
└── README.md             ← This file
```

---

## Step 1 — Create your free Supabase database

1. Go to **supabase.com** → click **Start your project** → sign up free
2. Click **New project** → give it a name (e.g. `quicktest`) → set a database password → choose a region → click **Create new project**
3. Wait about 1 minute for it to set up
4. In the left sidebar click **SQL Editor**
5. Click **New query**
6. Open the file `db/schema.sql` from this folder, copy all of it, paste it into the editor, click **Run**
7. You should see: "Success. No rows returned" — your tables are ready

**Now grab your credentials:**
- In the left sidebar go to **Settings → API**
- Copy the **Project URL** — looks like `https://abcdefgh.supabase.co`
- Under **Project API keys**, copy the **service_role** secret key
  > Use service_role NOT anon. Keep this key private — never share it.

---

## Step 2 — Put your code on GitHub

1. Go to **github.com** → sign up free if needed
2. Click **+** (top right) → **New repository**
3. Name it `quicktest` → click **Create repository**
4. On the next page click **uploading an existing file**
5. Drag and drop ALL files and folders from this folder into the upload area
   > Upload: public/ src/ db/ package.json .gitignore .env.example README.md
   > Do NOT upload a .env file — it contains secrets
6. Click **Commit changes**

---

## Step 3 — Deploy on Railway

1. Go to **railway.app** → click **Login with GitHub**
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your `quicktest` repo → click **Deploy Now**
4. Click the **Variables** tab and add these 4 variables:

   | Variable                    | Value                              |
   |-----------------------------|------------------------------------|
   | SUPABASE_URL                | Your Project URL from Step 1       |
   | SUPABASE_SERVICE_ROLE_KEY   | Your service_role key from Step 1  |
   | JWT_SECRET                  | Any long string e.g. myapp-secret-key-2024 |
   | NODE_ENV                    | production                         |

5. Railway redeploys automatically
6. Click **Settings → Networking → Generate Domain**
7. Your live URL appears — share it with anyone!

---

## Installing on a phone

**iPhone:** Safari → Share button → "Add to Home Screen" → Add

**Android:** Chrome → 3-dot menu → "Add to Home Screen" → Add

---

## Troubleshooting

**"Invalid or inactive test code" error**
→ Teacher needs to Activate the test first (Draft → Active on the test card)

**App won't connect / server error**
→ Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are correct in Railway variables

**Railway deploy fails**
→ Check deploy logs in Railway for the specific error
