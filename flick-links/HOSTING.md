# Putting Breakfast Ball on its own web address

The game is one static page plus a small clubhouse server under `/api`.
Cloudflare Pages runs both for free and redeploys on every push.

## One-time setup (about ten minutes)

1. Create a free account at cloudflare.com.
2. In the dashboard go to **Workers & Pages → Create**. The screen opens on Workers; use the link
   **"Need to use the legacy Pages workflow? Continue to Pages"**, then **Import an existing Git repository**, and pick this repository.
   When GitHub asks, choose **Only select repositories** and pick this one.
   - Production branch: the branch the game lives on (`claude/flick-links-golf` at the time of writing)
   - Framework preset: None
   - Root directory: `flick-links`
   - Build command: leave empty
   - Build output directory: `.`
3. Go to **Storage & databases → D1 SQLite Database → Create database**. Name it `flick-links`.
4. Open the Pages project, then **Settings → Bindings → Add → D1 database**.
   Variable name `DB`, database `flick-links`, for Production and Preview. Save, then in the **Deployments** tab use the
   three-dot menu on the latest row under **All deployments** and choose **Retry deployment**.

The game is then at `https://<project>.pages.dev`. (It is live at https://breakfast-ball.pages.dev, set up this way in November 2026.) Clubhouses, invites and passkeys switch on by themselves:
the page asks `/api/ping`, and if the server answers it uses it. If not, it falls back to a solo clubhouse
kept on the device.

## Trying the hosted setup on your own machine

Cloudflare's tool runs the same thing locally, page, server and a D1 database:

```
cd flick-links && npx wrangler pages dev . --d1 DB=flick-links
```

The whole clubhouse flow (two players, an invite, daily cards, a passkey and signing back in with it) has been run
against that and passes.

## The link preview and the home-screen icon

`og.jpg` is the picture a group chat shows for the link; `apple-touch-icon.png`, the `icon-*.png` files and
`manifest.webmanifest` are what a phone uses when someone adds the game to their home screen. They are made from the
game itself by `node tools/make_art.js`. The preview's address is written into `build.sh` and has to be the site's real
address, so change it there if the site moves. Chat apps cache previews: a link already sent keeps its old picture.

## What lives where

- `server/core.js` is the whole server. It needs only web-standard `Request`, `Response` and `crypto`,
  plus a key-value store, so it also runs on other hosts with a different store adapter.
- `functions/api/[[path]].js` connects it to Cloudflare and the D1 database.
- `tools/dev-server.mjs` runs the same server in memory for local testing: `node tools/dev-server.mjs`.
- `server/core.test.mjs` checks the server with several simulated players: `node server/core.test.mjs`.

## Matches (head to head)

A member can challenge another to 3, 9 or 18 holes of any course, from the clubhouse's Matches tab. Both get the same pins and
wind (the match's id seeds them). Fewest strokes wins; the record against each opponent is read off the finished matches.

- **Own time**: each plays the round when they like. A hole's score goes up as it is finished (`/match/score`).
- **Shot for shot**: every shot goes up as the ball stops (`/match/shot`) and the server says whose turn is next: the honour on
  the tee, then whoever is further from the hole. There is no open connection between phones, so a phone waiting on the other
  player asks `/match` every two seconds and plays their shot back when it arrives. Either player can leave and come back; the
  server holds where both balls lie. When the turn comes round the phone says so, with the shot the other player is on.
- **Calling it off** (`/match/end`) takes both players once a match is under way: one asks, the other agrees or plays on.
  Before it is taken up, the challenger simply withdraws it. A match called off counts for nobody.

Matches are stored as `x:<id>`, with `xi:<player>` listing each player's. They go into the record of play (kind `match`) but
not the handicap. The page code is `src/47-match.js`; the rules are in `server/core.js` and tested in `server/core.test.mjs`.

## How players are identified

A player gets a random sign-in token the first time they post a score. It is kept in an HttpOnly cookie,
so page scripts cannot read it, and the server stores only its hash. There is no way to sign in by name.
A player can add a passkey (Face ID or fingerprint) to sign in on another phone. No phone numbers or
email addresses are collected.
