# 7Fitment Frontend

Vite + React + Tailwind CSS v4 app for the public landing page, `/enlaces`, and the protected analytics dashboard.

## Local Development

```bash
npm install
npm run dev
```

Default dev URL: `http://localhost:5173`.

## Environment

```bash
VITE_API_URL=http://localhost:8000
VITE_API_PROXY_TARGET=http://localhost:8000
VITE_DEFAULT_CAMPAIGN_ID=7fitment
```

## Production

`npm run build` emits static files to `dist/`. Docker serves them with Nginx on port `3000`, preserving SPA routes such as `/enlaces` and `/dashboard`.
