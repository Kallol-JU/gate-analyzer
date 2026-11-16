# GATE CBT client

React 18 + Vite 6 + Tailwind CSS v4 + React Router 6.

## Setup and run

```bash
cd client
npm install
npm run dev        # http://localhost:5173
npm run build      # production build into dist/
npm run preview    # serve the production build locally
```

Start the server too (see `../server/README.md`). Sign-up and login need it, and the "API connected" indicator reflects it.
Production (Vercel): set `VITE_API_BASE_URL` to the backend URL including `/api/v1`, and set the server's `CLIENT_ORIGIN` to the exact Vercel URL. Cookies are `SameSite=None; Secure` there, so both sites must use HTTPS.
In development Vite proxies `/api` to `http://localhost:5000`, so no CORS setup is needed.

## Tailwind CSS v4 notes

`package.json` pins Tailwind 4, which is configured differently from v3:

- There is **no** `tailwind.config.js` or `postcss.config.js`.
- Tailwind runs as a Vite plugin (`@tailwindcss/vite`, see `vite.config.js`).
- `src/styles/index.css` starts with `@import "tailwindcss";` and declares all design tokens in an `@theme { ... }` block.
- Every `--color-*` token becomes a utility: `--color-primary-600` gives `bg-primary-600`, `text-primary-600`, and so on.
- Renamed utilities to remember: `shadow-sm` is now `shadow-xs`, `rounded-sm` is `rounded-xs`, `outline-none` is `outline-hidden`.
- Borders default to `currentColor` in v4. A base rule in `index.css` restores a soft grey so `border` alone works.

## What is real and what is a prototype

| Part | Status |
|---|---|
| Design tokens, UI components (`components/ui`), layouts, router | Real, kept long term |
| Landing page, login and register pages | Real. Login and register call the API; the session is an HttpOnly cookie restored on refresh |
| Auth (`store/authStore.js`, `routes/guards.jsx`) | Real: `ProtectedRoute`, `GuestRoute`, user name in the header |
| API status indicator (`hooks/useHealthCheck.js`) | Real: calls `GET /api/v1/health` |
| Exam (`pages/exam/ExamPage.jsx`, `features/exam`) | Real: `engine/examStore.js` handles autosave queue, offline recovery and the server-synced timer |
| Dashboard components (`features/dashboard`) | Real, props-driven, reused in Phase 6 |
| **`src/prototype/`** | **Throwaway.** Sample dashboard statistics only. Shown with a "Prototype · Sample Data" label (the dashboard greeting uses your real name) |

Everything under `src/prototype/` is invented. When a real feature replaces a prototype, delete the matching folder.

## Routes (Phase 1)

| Path | Page | Notes |
|---|---|---|
| `/` | Landing | |
| `/login`, `/register` | Auth pages | Real. Logged-in users are redirected away |
| `/dashboard` | Student dashboard | **Requires login.** Statistics are prototype data |
| `/tests`, `/tests/:id` | Test lists, instructions, start | Real |
| `/exam/:attemptId` | Live exam | Real, requires login |
| `/results/:attemptId`, `/history` | Result review, attempt history | Real |
| `/dev/components` | Component gallery | Development builds only |

## Structure

```
src/
  main.jsx, App.jsx
  api/                 axios instance, health call
  components/ui/       Button, Input, Card, Modal, Tabs, Table, Toast, ...
  components/common/   MathText (KaTeX), ApiStatusBadge, PrototypeBanner, error screens
  features/exam/       exam UI components + palette status logic
  features/dashboard/  stat strip, charts, tables
  features/landing/    hero illustration
  hooks/               useHealthCheck
  layouts/             PublicLayout, AuthLayout, DashboardLayout, ExamLayout
  pages/               route-level pages (thin)
  prototype/           SAMPLE DATA AND LOCAL-ONLY STATE (delete when real features land)
  routes/              router
  store/               uiStore (toasts)
  styles/              index.css (design tokens)
  utils/               cn, formatTime, constants, errorMessage
```

## Fonts

Hanken Grotesk and Source Serif 4 load from Google Fonts (`index.html`). Offline, the system font fallbacks in `index.css` are used.
