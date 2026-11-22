#!/usr/bin/env bash
# Wraps game.html (the page body) into a standalone index.html that any static host can serve.
set -euo pipefail
cd "$(dirname "$0")"
{
cat <<'HEAD'
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<meta name="theme-color" content="#1c5236">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta property="og:title" content="Flick Links">
<meta property="og:description" content="Three holes a day. Same course for everyone. Fewest strokes wins the group chat.">
<style>:root{padding:env(safe-area-inset-top,0px) 0 env(safe-area-inset-bottom,0px)}body{margin:0}[hidden]{display:none!important}</style>
</head>
<body>
HEAD
cat game.html
printf '</body>\n</html>\n'
} > index.html
