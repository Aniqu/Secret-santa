# Slaptasis Kalėdų Senelis

Secret Santa app (Lithuanian UI). Svelte 5 + Vite frontend, Hono (Node) server, data in `data/data.json`.

## Run

```bash
npm install
npm run build      # builds the frontend into dist/
npm start          # serves the app + API on http://localhost:3000
```

Development with hot reload: `npm run dev` (Vite on :5173, API on :3000). Tests: `npm test`.

Environment variables: `PORT` (default 3000), `ADMIN_PASSWORD` (default `admin2024` – change it), `DATA_DIR` (default `./data`).

PM2: `pm2 start ecosystem.config.cjs` after building.

## How it works

- `/` – organiser panel (password). Add participants; each gets two personal links.
- `/?id=<code>&stage=1` – participant writes a letter to Santa (wish). Can be sent only once.
- `/?id=<code>&stage=2` – participant breaks the wax seal and sees who they give a gift to, plus that person's wish.

The recipient is drawn when a participant first opens their letter and never changes. The draw always
leaves a valid solution for everyone else: nobody draws themselves and nobody receives two gifts.

The previous version is kept in `_archive/v1/`.
