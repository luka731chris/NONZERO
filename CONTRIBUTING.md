# Contributing to NONZERO

## Fastest product update

For product planning changes, edit `BACKLOG.json` and run:

```bash
npm run roadmap
npm test
```

Commit both `BACKLOG.json` and the regenerated `ROADMAP.md` when working locally. If only `BACKLOG.json` is committed, the roadmap GitHub Action will regenerate and commit `ROADMAP.md` automatically.

## App changes

The current app is intentionally simple: `index.html` is the runnable baseline. Preserve local data compatibility unless a migration is explicitly designed. When changing behavior:

1. Update `index.html`.
2. Update `BACKLOG.json` for completed/changed scope.
3. Run `npm run roadmap`.
4. Run `npm test`.
5. Add a concise entry to `CHANGELOG.md`.

## Generated files

Do not hand-edit `ROADMAP.md`.
