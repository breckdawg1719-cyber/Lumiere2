# Lumière Security Audit Report

## Summary

**Audit Date:** July 2026  
**Result:** 8 vulnerabilities found and fixed. App is production-ready.

---

## Vulnerabilities Found & Fixed

### 🔴 CRITICAL

**1. No rate limiting on login/register endpoints**
- Risk: Brute-force attacks on passwords; credential stuffing
- Fixed: slowapi rate limiter added — login: 10/min, register: 5/min, delete: 3/hr

**2. Weak session token generation**
- Old code used `uuid.uuid4().hex + uuid.uuid4().hex` (only 122 bits of entropy)
- Fixed: Changed to `secrets.token_hex(32)` — 256-bit cryptographically secure random

**3. Admin key comparison vulnerable to timing attack**
- Old: `token != ADMIN_API_KEY` (string comparison leaks timing info)
- Fixed: `secrets.compare_digest(token, ADMIN_API_KEY)` (constant-time comparison)

**4. CORS allowed all methods and headers**
- Old: `allow_methods=["*"], allow_headers=["*"]`
- Fixed: Locked to specific methods and headers only

### 🟠 HIGH

**5. No password strength requirements**
- Old: Only `min_length=6` — "aaaaaa" was valid
- Fixed: min_length=8, must contain a number or special character
- Added HTML-tag stripping on name field to prevent XSS via stored data

**6. Login timing attack (user enumeration)**
- Old: Returned immediately when user not found — attacker could tell valid emails by response time
- Fixed: Always runs bcrypt.checkpw even when user doesn't exist (dummy hash)

**7. Expired sessions not cleaned up**
- Old: Sessions stayed in DB forever; expired ones still checked on every request
- Fixed: MongoDB TTL index on `expires_at` auto-deletes expired sessions; also delete on logout

**8. API docs exposed in production**
- Old: `/docs` and `/openapi.json` were public — exposed full API surface to attackers
- Fixed: `docs_url=None` and `redoc_url=None` when `ENVIRONMENT=production`

---

### 🟡 MEDIUM (already good — noted for reference)

- ✅ bcrypt used for passwords (not MD5/SHA1)
- ✅ Passwords never returned in API responses (password_hash excluded from all queries)
- ✅ All data queries filter by `user_id` — users can never access each other's data
- ✅ Google ID tokens verified server-side (not trusted from client)
- ✅ EmailStr Pydantic type validates email format on all inputs
- ✅ HTTPOnly + Secure session cookies (can't be stolen by JS)
- ✅ `.env` in `.gitignore` — secrets not committed to git
- ✅ MongoDB uses parameterized queries via Motor (no raw string injection)

---

## New Security Features Added

### Security Headers (every response)
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
Strict-Transport-Security: max-age=31536000 (production only)
Server: [removed — don't leak server fingerprint]
```

### Email Verification (optional, recommended)
- 6-digit code, expires in 15 minutes
- Auto-cleaned from DB via MongoDB TTL index
- Google users bypass (already verified by Google)
- Prevents fake signups and bot abuse of Places API

### Input validation tightened
- All string fields have `max_length` limits
- Amount fields have `ge=0, le=10_000_000` bounds
- Name field strips HTML tags

---

## Remaining Recommendations (post-launch)

1. **Set up MongoDB Atlas alerts** — enable slow query alerts and unusual access patterns
2. **Enable Vercel Analytics** — monitor traffic spikes that could indicate abuse
3. **Add a /health endpoint** for uptime monitoring (Uptime Robot, Better Uptime — free)
4. **Rotate ADMIN_API_KEY** every 90 days
5. **Review Google Places API usage** monthly — set a billing budget cap
