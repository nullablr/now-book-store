# Now Book Store — Project Context

## What this is
A fully functional online bookstore built with vanilla HTML/CSS/JS (no framework) and a Node.js/Express backend. Deployed on Railway, source on GitHub.

## URLs
- **Live store**: https://now-book-store-production.up.railway.app
- **GitHub repo**: https://github.com/nullablr/now-book-store.git

## Running locally
```bash
npm run dev        # starts server at http://localhost:3000
```
The server serves static files AND provides API endpoints. Always open via http://localhost:3000 — never open HTML files directly in the browser (fetch calls will fail).

## Tech stack
- **Frontend**: Vanilla HTML, CSS (CSS custom properties, grid, flex), JavaScript (ES2020, no bundler)
- **Backend**: Node.js + Express (`server.js`)
- **Payments**: Stripe (Payment Element) — requires `STRIPE_PUBLISHABLE_KEY` + `STRIPE_SECRET_KEY`
- **Email**: Nodemailer SMTP — requires `EMAIL_USER` + `EMAIL_PASS`
- **Hosting**: Railway (auto-deploys from GitHub `main` branch)

## Environment variables (.env — never commit)
```
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=...@gmail.com
EMAIL_PASS=...              # Gmail App Password (16 chars)
EMAIL_FROM=Now Book Store <...@gmail.com>
STORE_URL=https://now-book-store-production.up.railway.app
PORT=3000
```

## File structure
| File | Purpose |
|------|---------|
| `server.js` | Express server: static files, Stripe PaymentIntents, newsletter subscribe/verify |
| `books-data.js` | Single source of truth for all books (BOOKS array, shared by all pages) |
| `app.js` | Homepage: book grid, carousel, search, category filter, cart drawer |
| `cart.js` | Cart page: items, qty, promo codes, Stripe payment modal |
| `book.js` | Book detail page: renders hero, author section, related books |
| `auth.js` | User auth: register/login/logout, session, avatar upload, header injection |
| `newsletter.js` | Newsletter subscribe/verify 3-step flow |
| `admin.js` | Admin dashboard: stats, promo code management |
| `admin-users.js` | Admin user management |
| `admin-orders.js` | Admin order management |
| `style.css` | All styles — ServiceNow design tokens (navy #0c1826, green #62d84e) |

## Books in the store
- IDs 1–18: Classic/popular titles (To Kill a Mockingbird, 1984, Harry Potter, etc.)
- IDs 19–29: Freida McFadden psychological thrillers (The Housemaid, Never Lie, etc.)
- Last used ID: **29** — next new book should start at ID 30

## Key design decisions
- **ServiceNow palette**: `--sn-navy: #0c1826`, `--sn-green: #62d84e`, Source Sans 3 font
- **`[hidden]` fix**: `[hidden] { display: none !important; }` — prevents CSS `display` rules from overriding the hidden attribute
- **Shared book data**: `books-data.js` loaded before `app.js`/`cart.js`/`book.js` — avoids `const` re-declaration errors
- **Book covers**: Open Library `https://covers.openlibrary.org/b/id/{ID}-L.jpg` with emoji+bg fallback
- **Author photos**: Open Library `https://covers.openlibrary.org/a/olid/{OLID}-L.jpg` with initials fallback

## Promo codes (stored in localStorage `booknookpromos`)
| Code | Discount |
|------|----------|
| BOOKS10 | 10% |
| READ20 | 20% |
| FIRSTBOOK | 15% (max 100 uses) |
| NEWSLETTER10 | 10% (given on newsletter signup) |

## Deploying changes
```bash
git add .
git commit -m "description"
git remote set-url origin https://TOKEN@github.com/nullablr/now-book-store.git
git push
git remote set-url origin https://github.com/nullablr/now-book-store.git
```
Railway auto-deploys on push to `main`. GitHub token is a personal access token (PAT) — ask the user for it when needed, don't store it.

## Admin access
- URL: `/admin.html`
- Default admin credentials are seeded in `auth.js` `seedAdmin()`
