# Deployment & Monetization Setup

## Step 1 — Google AdSense (auto-filled ads)

### Sign up
1. Go to https://adsense.google.com and sign up with your Google account
2. Add your website URL and wait for approval (usually 1–3 days)
3. Once approved, go to **Ads → By ad unit → Display ads** and create 2 ad units
4. Copy the **Publisher ID** (looks like `ca-pub-1234567890123456`)
5. Copy each **Ad Slot ID** (10-digit number per unit)

### Add to your app
Paste this into your `index.html` `<head>` — replace with your real publisher ID:
```html
<script
  async
  src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1515317647829975"
  crossorigin="anonymous"
></script>
```

Then in `FindVendors.jsx`, update these 3 lines at the top:
```js
const ADSENSE_PUBLISHER_ID = "ca-pub-XXXXXXXXXXXXXXXX"; // ← your pub ID
const ADSENSE_AD_SLOT_1    = "1234567890";              // ← slot 1
const ADSENSE_AD_SLOT_2    = "0987654321";              // ← slot 2
```

AdSense automatically fills the slots with relevant wedding ads and pays you per click.
Typical wedding niche: $0.50–$3.00 per click.

---

## Step 2 — WeddingWire & The Knot Affiliate Links

### Sign up (free, takes ~1 week to approve)
1. Go to https://www.shareasale.com and create a free publisher account
2. Search for merchant **"WeddingWire"** (merchant ID: 38479) → click **Join Program**
3. Search for merchant **"The Knot"** (merchant ID: 47461) → click **Join Program**
4. Once approved, your affiliate ID appears in your ShareASale dashboard

The links in `FindVendors.jsx` are already built — you just need to uncomment the
tracking parameter once you have your ID. In the `weddingWireUrl` function:
```js
// Uncomment this line and add your ShareASale affiliate ID:
sscid: "YOUR_SHAREASALE_AFFILIATE_ID",
```

WeddingWire pays per lead (couple clicks through and views a vendor) — typically $0.10–$2.00
per qualified click depending on category.

---

## Step 3 — Supabase (your database)

### Sign up
1. Go to https://supabase.com → **Start for free**
2. Create a new project, choose a region close to your users
3. Copy your **Project URL** and **anon key** from Settings → API

### Run this SQL in Supabase's SQL editor to create your tables:
```sql
-- Users table (if not using Supabase Auth directly)
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  created_at timestamptz default now()
);

-- Wedding profiles
create table if not exists wedding_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  partner1_name text,
  partner2_name text,
  wedding_date date,
  wedding_city text,
  total_budget numeric(12,2) default 0,
  created_at timestamptz default now()
);

-- Budget items
create table if not exists budget_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  category text not null,
  name text not null,
  estimated_cost numeric(12,2) default 0,
  actual_cost numeric(12,2),
  paid boolean default false,
  notes text,
  created_at timestamptz default now()
);

-- Guest list
create table if not exists guests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  name text not null,
  email text,
  rsvp_status text default 'pending' check (rsvp_status in ('pending','attending','declined')),
  plus_one boolean default false,
  meal_choice text,
  created_at timestamptz default now()
);

-- Vendor saves (couples saving vendors they like)
create table if not exists vendor_saves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  place_id text not null,
  vendor_name text not null,
  category text not null,
  maps_url text,
  notes text,
  created_at timestamptz default now()
);

-- Row Level Security — users can only see their own data
alter table wedding_profiles enable row level security;
alter table budget_items enable row level security;
alter table guests enable row level security;
alter table vendor_saves enable row level security;

create policy "own data only" on wedding_profiles for all using (auth.uid() = user_id);
create policy "own data only" on budget_items for all using (auth.uid() = user_id);
create policy "own data only" on guests for all using (auth.uid() = user_id);
create policy "own data only" on vendor_saves for all using (auth.uid() = user_id);
```

### Add to your backend `.env` (never commit this file):
```
SUPABASE_URL=https://xxxxxxxxxxx.supabase.co
SUPABASE_KEY=eyJhbGci...   # anon/service key
GOOGLE_PLACES_API_KEY=AIza...
SECRET_KEY=<run: openssl rand -hex 32>
ENVIRONMENT=production
ALLOWED_ORIGINS=https://yourdomain.com
TRUSTED_HOSTS=yourdomain.com
```

---

## Step 4 — Wire the new routes into your FastAPI main.py

```python
from routes.vendors import router as vendors_router
from routes.account import router as account_router
from security import configure_security, check_env_vars

app = FastAPI()
configure_security(app)
check_env_vars()

app.include_router(vendors_router)
app.include_router(account_router)
```

## Step 5 — Add tabs to your React router

```jsx
import FindVendors from "./components/vendors/FindVendors";

// In your router:
<Route path="/vendors" element={<FindVendors weddingLocation={user?.weddingCity} />} />
```

## Step 6 — Add Delete Account to Settings page

```jsx
import DeleteAccountModal from "./components/vendors/DeleteAccountModal";

const [showDelete, setShowDelete] = useState(false);

// In your settings UI:
<button onClick={() => setShowDelete(true)}>Delete Account</button>
<DeleteAccountModal isOpen={showDelete} onClose={() => setShowDelete(false)} />
```

## Step 7 — Install new backend dependency

```bash
pip install httpx slowapi supabase
```

---

## Revenue Estimate (rough)

| Source | Per action | At 1,000 monthly users |
|---|---|---|
| AdSense (2 slots) | ~$1.00 per 100 views | ~$20–$60/mo |
| WeddingWire affiliate | ~$0.50 per click | ~$50–$150/mo |
| The Knot affiliate | ~$0.50 per click | ~$30–$100/mo |

Revenue grows directly with traffic. Both affiliate programs also offer **cost-per-lead**
bonuses when a couple actually contacts a vendor through the link.
