#!/usr/bin/env bash
# Assembles src/ into game.html (the page body) and a standalone index.html that any static host can serve.
# The link preview picture must be given by its full address: if the site moves, change breakfast-ball.pages.dev below.
# The preview and icons themselves are made by tools/make_art.js.
set -euo pipefail
cd "$(dirname "$0")"
{
cat src/00-head.html
printf "\n<script>\n(()=>{'use strict';\n"
# real course data, produced by tools/import_course.py (map data © OpenStreetMap contributors, ODbL)
printf 'const MAPS={'; for f in data/*.json; do case "$f" in *.extra.json|*.design.json) continue;; esac; printf '%s:' "$(basename "$f" .json)"; cat "$f"; printf ','; done; printf '};\n'
cat src/10-core.js src/20-course.js src/30-render.js src/35-birds.js src/40-game.js
# the clubhouse server, carried in the page for solo play (the hosted site runs the same file behind /api)
printf "const LocalServer=(()=>{\n"; sed 's/^export //' server/core.js; printf "return{handle,MemStore,SIZE,RATING}})();\n"
cat src/45-social.js src/47-match.js src/50-ui.js
printf "})();\n</script>\n"
} | sed "s/__BUILD_TS__/$(date +%s)000/" > game.html
{
cat <<'HEAD'
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<meta name="theme-color" content="#0b2a21">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Breakfast Ball">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="description" content="Three holes a day on a real course. Same holes for everyone. Fewest strokes wins the group chat.">
<meta property="og:type" content="website">
<meta property="og:title" content="Breakfast Ball">
<meta property="og:description" content="Three holes a day on a real course. Same holes for everyone. Fewest strokes wins the group chat.">
<meta property="og:url" content="https://breakfast-ball.pages.dev/">
<meta property="og:image" content="https://breakfast-ball.pages.dev/og.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/png" sizes="32x32" href="icon-32.png">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<link rel="manifest" href="manifest.webmanifest">
<style>:root{padding:env(safe-area-inset-top,0px) 0 env(safe-area-inset-bottom,0px)}body{margin:0}[hidden]{display:none!important}</style>
</head>
<body>
HEAD
cat game.html
printf '</body>\n</html>\n'
} > index.html
