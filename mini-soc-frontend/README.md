# MiniSOC Frontend

Security log monitoring dashboard (React + Vite + Tailwind CSS). Uses **mock data** only; no backend yet.

## Requirements
- Node.js 18 or newer (check with `node -v`)
- npm (comes with Node)

## Run it
```bash
cd mini-soc-frontend
npm install
npm run dev
```
Open http://localhost:5173 and sign in with any valid email and a password of 6+ characters.

## Build for production
```bash
npm run build
npm run preview
```

## Where things live
- `src/data/`      mock logs, alerts, analytics, uploads (replace later)
- `src/services/`  `api.js` (all Axios calls) and `auth.js` (demo login)
- `src/context/`   `SocDataContext.jsx` loads data once and shares it
- `src/components/` Sidebar, Navbar, Layout, StatCard, DataTable, badges
- `src/pages/`     one file per page

## Connecting the backend later
1. Copy `.env.example` to `.env` and set `VITE_API_URL`.
2. In `src/services/api.js` change `USE_MOCK` to `false`.
3. Make sure the backend returns the same field names as the mock data
   (`id, timestamp, sourceIp, destinationIp, username, eventType, status, severity, description, rawLog`).
