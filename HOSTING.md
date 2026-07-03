# Lumière — Hosting & Deployment Guide

## Recommended Stack (all free tiers available)

| Layer | Service | Cost |
|---|---|---|
| Frontend | Vercel | Free |
| Backend | Railway or Render | Free tier |
| Database | MongoDB Atlas | Free 512MB |
| Email | Resend | Free 3,000/mo |

---

## Step 1 — MongoDB Atlas (Database)

1. Go to https://cloud.mongodb.com → Create free account
2. Create a **free M0 cluster** (512MB, enough to start)
3. Under **Database Access** → Add a database user with a strong password
4. Under **Network Access** → Add IP `0.0.0.0/0` (allows your hosting provider)
5. Click **Connect** → **Drivers** → copy the connection string
6. Replace `<password>` with your DB user password
7. Your `MONGO_URL` looks like:
   `mongodb+srv://lumiere:YOURPASSWORD@cluster0.abc123.mongodb.net/?retryWrites=true&w=majority`
8. Set `DB_NAME=lumiere_prod`

---

## Step 2 — Resend (Email verification)

1. Go to https://resend.com → Sign up free
2. Add your domain under **Domains** and verify DNS records (takes ~10 min)
3. Go to **API Keys** → Create key → copy it
4. Set `RESEND_API_KEY=re_xxxx` and `FROM_EMAIL=noreply@yourdomain.com`
5. Set `EMAIL_VERIFICATION_ENABLED=true` in your backend env vars

If you don't have a domain yet, set `EMAIL_VERIFICATION_ENABLED=false` for now
and enable it once you're live. Registration still works — just no email step.

---

## Step 3 — Deploy Backend (Railway — recommended)

1. Go to https://railway.app → Sign up with GitHub
2. Click **New Project** → **Deploy from GitHub repo** → select `Lumiere`
3. Set **Root Directory** to `backend`
4. Set **Start Command** to:
   `uvicorn server:app --host 0.0.0.0 --port $PORT`
5. Go to **Variables** tab and add all values from `.env.example`:
   ```
   ENVIRONMENT=production
   MONGO_URL=mongodb+srv://...
   DB_NAME=lumiere_prod
   FRONTEND_URL=https://your-vercel-url.vercel.app
   GOOGLE_CLIENT_ID=...
   GOOGLE_PLACES_API_KEY=...
   ADMIN_API_KEY=<run: openssl rand -hex 32>
   EMAIL_VERIFICATION_ENABLED=true
   RESEND_API_KEY=re_...
   FROM_EMAIL=noreply@yourdomain.com
   ```
6. Railway will give you a URL like `https://lumiere-backend.up.railway.app`
   → copy this, you'll need it for the frontend

### Alternative: Render
1. Go to https://render.com → New → Web Service → Connect GitHub
2. Root directory: `backend`
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn server:app --host 0.0.0.0 --port $PORT`
5. Add all env vars under **Environment**

---

## Step 4 — Deploy Frontend (Vercel)

1. Go to https://vercel.com → Sign up with GitHub
2. Click **Add New Project** → Import `Lumiere`
3. Set **Root Directory** to `frontend`
4. Under **Environment Variables** add:
   ```
   VITE_API_URL=https://your-railway-url.up.railway.app
   ```
   (or `REACT_APP_API_URL` depending on your frontend setup)
5. Click **Deploy**
6. Copy your Vercel URL (e.g. `https://lumiere.vercel.app`)

Then go back to Railway → update `FRONTEND_URL` to your Vercel URL.

---

## Step 5 — Google OAuth (for "Sign in with Google")

1. Go to https://console.cloud.google.com
2. Create a project → Enable **Google Identity** API
3. Go to **Credentials** → Create **OAuth 2.0 Client ID** → Web application
4. Add Authorized origins:
   - `https://yourdomain.com`
   - `https://your-vercel-url.vercel.app`
5. Add Authorized redirect URIs:
   - `https://yourdomain.com/auth/callback`
   - `https://your-vercel-url.vercel.app/auth/callback`
6. Copy the **Client ID** → set as `GOOGLE_CLIENT_ID`

---

## Step 6 — Google Places API (Vendor Search)

1. In Google Cloud Console → **APIs & Services** → Enable **Places API (New)**
2. Go to **Credentials** → Create **API Key**
3. Click **Restrict Key**:
   - Application restrictions → **HTTP referrers** → add your domain
   - API restrictions → **Places API** only
4. Set a **monthly budget cap** under Billing → Budgets & Alerts ($10–$20 to start)
5. Copy key → set as `GOOGLE_PLACES_API_KEY`

---

## Step 7 — Custom Domain (optional)

### On Vercel:
1. Go to your project → **Settings** → **Domains**
2. Add your domain (e.g. `lumiere.wedding` or `app.lumiere.wedding`)
3. Update your domain registrar's DNS with the records Vercel provides

### On Railway:
1. Go to your service → **Settings** → **Domains**
2. Add `api.yourdomain.com`
3. Update DNS with the CNAME Railway provides
4. Update `FRONTEND_URL` and `VITE_API_URL` with the custom domains

---

## Security Checklist Before Going Live

- [ ] `ENVIRONMENT=production` is set in backend
- [ ] `ADMIN_API_KEY` is a random 64-char hex string (not a word or phrase)
- [ ] `MONGO_URL` uses a dedicated DB user (not root)
- [ ] Google Places API key is restricted to your domain
- [ ] `.env` is in `.gitignore` (it is — already set up)
- [ ] MongoDB Network Access is set (0.0.0.0/0 or Railway/Render IP range)
- [ ] `EMAIL_VERIFICATION_ENABLED=true` once Resend domain is verified
- [ ] API docs hidden in prod (already done — `/docs` returns 404 in production)

---

## Email Verification — Should You Enable It?

**Yes, enable it.** Here's why it matters for your app:

- Prevents fake accounts from cluttering your DB
- Required for AdSense approval (Google checks for quality user base)
- Protects couples' data (ensures they own the email before accessing budget)
- Deters bots from abusing the vendor search (which calls Google Places API = costs money)

**How it works in Lumière:**
1. User registers → gets a 6-digit code emailed to them (expires 15 min)
2. They enter the code → session created → they're in
3. Google users skip this step (Google already verified their email)

**To enable:** Set `EMAIL_VERIFICATION_ENABLED=true` and add your `RESEND_API_KEY`.
Cost: Free for first 3,000 emails/month on Resend.
