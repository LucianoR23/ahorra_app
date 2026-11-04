# Changelog — v2 (`next` branch)

Entries reference item IDs from `AHORRA_V2_PLAN.md` (workspace repo).

## Unreleased

### 0.15c — Toolchain refresh
- Docker base `node:24.22.2-alpine3.24` (was alpine3.23). Image builds; note `NEXT_PUBLIC_APP_URL` is required at build time (empty value breaks `metadataBase`, tracked for 0.13).

### 0.15a — Hygiene, no behavior change
- Stop tracking generated `public/sw.js` and per-machine `.claude/settings.local.json` (both git-ignored).
- Pin Node 24 LTS: `.nvmrc`, `engines.node >=24`, Docker base `node:24.22.2-alpine3.23` (was floating `node:22-alpine`); `@types/node` ^24.
- Move `shadcn` (CLI) to devDependencies.
- Document `NEXT_PUBLIC_GOOGLE_CLIENT_ID` in `.env.example`, Dockerfile build args and `DEPLOY.md`.
- README: correct Node/pnpm prerequisites, dev port 3005, API folder name, SWR key description.
- Lint green: derive the reduced-motion text in `lemy-logo.tsx` instead of `setState` in an effect; drop an unused prop and redundant `eslint-disable` comments.
- Add `docs/design/screen-inventory.md` (current-UI audit, reference for 1.10).
