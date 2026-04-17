
## Update All Dependencies to Latest Versions

### Scope
Bulk-update every entry in `package.json` (dependencies + devDependencies) to its latest published version, then verify the build still compiles.

### Approach
1. Run `npx npm-check-updates -u` to rewrite `package.json` with latest semver tags for all packages.
2. Run `npm install --legacy-peer-deps` to refresh `package-lock.json` (needed because React 19 + `next-themes` still has a peer-dep mismatch — same flag already used in CI).
3. Run `npx tsc --noEmit` and `npm run build` to confirm nothing breaks at the type or bundler level.
4. If a major bump introduces a breaking change that fails the build, pin that single package back to its previous major and report it.

### Risks (worth flagging upfront)
Major-version jumps across ~80 packages will likely surface breakages. Highest-risk candidates:
- **Tailwind 3 → 4** — config format changed; very likely to break styling.
- **React Router 6 → 7** — route API changes.
- **Vite 5 → 7**, **Vitest 1 → 3** — config + plugin compat.
- **Zod 3 → 4**, **React Query 5.x** internal changes.
- **Radix UI** primitives — minor API drift.
- **`react-day-picker`**, **`cmdk`**, **`sonner`** — frequent breaking releases.

I will fix straightforward type errors inline. For larger framework migrations (e.g. Tailwind 4), I'll pin back to the latest non-breaking major and call it out in the final summary rather than silently rewriting your config.

### Files touched
- `package.json` — version bumps
- `package-lock.json` — regenerated
- Minimal source edits only if a type/import break is trivially fixable

### Out of scope
- Tailwind v4 migration (config rewrite)
- React Router v7 migration
- Any framework-level refactor

If any of those are desired, ask separately and I'll plan them individually.
