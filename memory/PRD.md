# Wedding Budget Tracker — Lumière

## Original Problem Statement
"build me a Wedding budget tracker app"

## User Choices
- Web-based application
- Authentication: JWT email/password + Emergent Google login
- All core features (overview, categories, expenses, guests, vendors, charts)
- Multi-currency (user selectable from 10 currencies)
- Romantic/elegant design (champagne, dusty rose, sage, ivory)
- No AI features

## Architecture
- Backend: FastAPI + MongoDB (motor), session cookies (httpOnly, secure, SameSite=None)
- Frontend: React (CRA + craco), Tailwind, shadcn/ui, recharts, framer fade transitions
- Auth: unified `user_sessions` collection — both password and Google flows issue a single `session_token` cookie

## User Personas
- Couples planning a wedding who want a calm, beautiful place to track budget, vendors, and guests
- May share account between partners (later: collaborative multi-user)

## Implemented (Feb 2026)
- Landing page with hero, image, CTAs
- Auth: register/login/logout with email+password; Google OAuth via Emergent (session_id exchange)
- Wedding profile: partner names, wedding date, venue, currency (USD/EUR/GBP/INR/AUD/CAD/AED/SGD/JPY/CNY), total budget
- Categories: full CRUD, planned amounts, color accents, auto-seeded 8 defaults
- Expenses: full CRUD, vendor/amount/status (paid/pending)/category/due_date, filter, search
- Guests: full CRUD, RSVP (pending/attending/declined/maybe), plus-one, groups, sides
- Vendors: full CRUD, status (considering/shortlisted/booked/rejected), contact details
- Dashboard: 4 stat cards, budget allocation bar, pie chart (spending by category), bar chart (planned vs spent vs pending), guests overview, countdown to wedding date
- Settings: edit profile & budget & currency
- Multi-tenant isolation enforced (user_id filtering on every query)

## Testing Status
- Backend: 13/13 pytest tests passing (100%)
- Frontend: 100% of tested flows pass (Playwright)
- See `/app/test_reports/iteration_1.json`

## P1 Backlog
- More thematic Lucide icons per category (Gem/CakeSlice/Flower2/etc.)
- Eucalyptus SVG section dividers
- Custom favicon featuring the Lumière heart mark
- Patch: ResizeObserver overlay suppression ✅ DONE
- Patch: Toast repositioned to bottom-right ✅ DONE

## P2 Backlog
- Forgot password / reset flow
- CSV export of expenses & guest list
- Print-friendly RSVP card view
- Multi-collaborator (invite partner via email)
- Vendor file/contract uploads (object storage)
- AI budget split suggestions based on total + region
