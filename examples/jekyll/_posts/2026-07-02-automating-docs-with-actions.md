---
title: Automating docs with GitHub Actions
topic: engineering
tags: [actions, ci, jekyll]
redirect_from:
  - /old-docs-post/
---

Front matter drives everything above: the layout comes from the `defaults`
block in `_config.yml`, and `redirect_from` makes `jekyll-redirect-from`
generate a meta-refresh stub at `/old-docs-post/` pointing here.

<!--more-->

The built-in Jekyll build is convenient but capped by the plugin allowlist. The
moment you need a plugin outside it, switch to a GitHub Actions workflow: build
the site yourself and publish the output with `actions/deploy-pages`. The
tradeoff is that you start consuming Actions minutes.

## What changes

- Any Ruby gem, not just the allowlisted ones.
- Any generator at all — Astro, Hugo, Eleventy, Vite.
- Full control over the build environment and its version pins.
