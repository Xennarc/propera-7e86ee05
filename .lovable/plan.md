

## Root Cause

GitHub Actions Security Checks fail at the **`npm ci`** step in both jobs (~11–14s — exactly the time `npm ci` takes to resolve and abort).

Reproduced locally:
```
npm error ERESOLVE could not resolve
npm error peer react@"^16.8 || ^17 || ^18" from next-themes@0.3.0
npm error Conflicting peer dependency: react@18.3.1
npm error   (root project uses react@^19.2.3)
```

The project upgraded to **React 19**, but `next-themes@0.3.0` only declares peers up to React 18. `npm ci` is strict about peer conflicts and exits non-zero, killing both CI jobs before tests/lint ever run. Locally everything works because `node_modules` is already populated, hiding the conflict.

## Fix

Add `--legacy-peer-deps` to both `npm ci` calls in `.github/workflows/security-checks.yml`. This matches how the existing install was produced (the lockfile already contains the resolved tree) and is the standard fix for React 19 peer-dep lag in older libs like `next-themes`.

### Change (1 file)

`.github/workflows/security-checks.yml`
- Line 25: `npm ci` → `npm ci --legacy-peer-deps`
- Line 51: `npm ci` → `npm ci --legacy-peer-deps`

### Why not other approaches
- **Upgrading `next-themes`** — broader change, risks theme regressions; not requested.
- **Adding `.npmrc` with `legacy-peer-deps=true`** — affects all dev installs project-wide; more invasive than needed.
- **`npm install --force`** — discouraged; bypasses lockfile integrity.

The workflow flag is the smallest, safest fix that gets CI green again.

