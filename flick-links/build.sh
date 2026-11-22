#!/usr/bin/env bash
# Assembles src/ into game.html (the page body) and a standalone index.html that any static host can serve.
set -euo pipefail
cd "$(dirname "$0")"
{
cat src/00-head.html
printf "\n<script>\n(()=>{'use strict';\n"
cat src/10-core.js src/20-course.js src/30-render.js src/40-game.js
# the clubhouse server, carried in the page for solo play (the hosted site runs the same file behind /api)
printf "const LocalServer=(()=>{\n"; sed 's/^export //' server/core.js; printf "return{handle,MemStore}})();\n"
cat src/45-social.js src/50-ui.js
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
<meta property="og:title" content="Flick Links">
<meta property="og:description" content="Three holes a day on the front nine. Same holes for everyone. Fewest strokes wins the group chat.">
<style>:root{padding:env(safe-area-inset-top,0px) 0 env(safe-area-inset-bottom,0px)}body{margin:0}[hidden]{display:none!important}</style>
</head>
<body>
HEAD
cat game.html
printf '</body>\n</html>\n'
} > index.html
