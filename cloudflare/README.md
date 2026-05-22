# Cloudflare Worker Proxy

This Worker replaces Firebase Functions for Digimon API proxying.

## What it does
- Proxies `/digimon-api/*` to `https://digimoncard.io/api-public/*`
- Proxies `/reddit-api/*` to `https://www.reddit.com/*`
- If Reddit blocks JSON requests, automatically falls back to subreddit RSS via `api.rss2json.com` and returns a Reddit-like JSON shape
- Adds permissive CORS headers for browser access
- Exposes `/health` for quick checks

## Deploy (Cloudflare Dashboard)
1. Go to Workers & Pages in Cloudflare.
2. Create a new Worker.
3. Replace the default code with the contents of `cloudflare/worker.js`.
4. Deploy.
5. Copy the Worker URL, for example:
   - `https://digisomething-proxy.<subdomain>.workers.dev`

## Wire frontend to the Worker
1. Create `.env.production` from `.env.production.example`.
2. Set `VITE_API_PROXY_BASE` to your Worker URL.
3. Build and deploy hosting:
   - `npm run deploy:prod`

## Verify
- `https://<worker-url>/health` should return `{ "ok": true }`
- `https://<worker-url>/digimon-api/search.php?series=Digimon%20Card%20Game&sort=name` should return JSON
- `https://<worker-url>/reddit-api/r/DigimonCardGame2020/search.json?q=flair:News&sort=new&restrict_sr=1&limit=3` should return JSON
