# Putting Breakfast Ball on its own web address

The game is one static page plus a small clubhouse server under `/api`.
Cloudflare Pages runs both for free and redeploys on every push.

## One-time setup (about ten minutes)

1. Create a free account at cloudflare.com.
2. In the dashboard go to **Workers & Pages → Create → Pages → Connect to Git** and pick this repository.
   - Production branch: the branch the game lives on (`claude/flick-links-golf` at the time of writing)
   - Framework preset: None
   - Root directory: `flick-links`
   - Build command: leave empty
   - Build output directory: `.`
3. Go to **Storage & Databases → D1 → Create database**. Name it `flick-links`.
4. Open the Pages project, then **Settings → Bindings → Add → D1 database**.
   Variable name `DB`, database `flick-links`. Save, then redeploy once from the **Deployments** tab.

The game is then at `https://<project>.pages.dev`. Clubhouses, invites and passkeys switch on by themselves:
the page asks `/api/ping`, and if the server answers it uses it. If not, it falls back to a solo clubhouse
kept on the device.

## Trying the hosted setup on your own machine

Cloudflare's tool runs the same thing locally, page, server and a D1 database:

```
cd flick-links && npx wrangler pages dev . --d1 DB=flick-links
```

The whole clubhouse flow (two players, an invite, daily cards, a passkey and signing back in with it) has been run
against that and passes.

## What lives where

- `server/core.js` is the whole server. It needs only web-standard `Request`, `Response` and `crypto`,
  plus a key-value store, so it also runs on other hosts with a different store adapter.
- `functions/api/[[path]].js` connects it to Cloudflare and the D1 database.
- `tools/dev-server.mjs` runs the same server in memory for local testing: `node tools/dev-server.mjs`.
- `server/core.test.mjs` checks the server with several simulated players: `node server/core.test.mjs`.

## How players are identified

A player gets a random sign-in token the first time they post a score. It is kept in an HttpOnly cookie,
so page scripts cannot read it, and the server stores only its hash. There is no way to sign in by name.
A player can add a passkey (Face ID or fingerprint) to sign in on another phone. No phone numbers or
email addresses are collected.
