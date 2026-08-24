# NONZERO v0.8.2 — Clean Branch Deployment

This package is intentionally configured for **GitHub Pages → Deploy from a branch → main → /(root)**.

## Upload rule
Upload the **contents of this ZIP directly to the repository root**. `index.html` must be visible at the top level of the `main` branch.

## GitHub Pages setting
- Source: Deploy from a branch
- Branch: main
- Folder: /(root)

There is deliberately **no custom GitHub Pages workflow** and **no service worker** in this release. This removes both workflow-source conflicts and stale PWA app-shell caching.

## Verification
After GitHub Pages republishes, open:

`https://luka731chris.github.io/NONZERO/index.html?v=082`

The page must display this banner at the top:

`NONZERO v0.8.2 • CLEAN BRANCH BUILD • FULL RECOVERED APP`

If that exact banner is not visible, GitHub Pages is not serving the current root `index.html` from `main`.
