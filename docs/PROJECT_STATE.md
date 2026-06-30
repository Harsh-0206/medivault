# MediVault — PROJECT_STATE

Turn-by-turn status snapshot. Updated within a session as work progresses.

---

**Session:** 2026-06-30 — Branch: harsh
**Version in progress:** v1.0 — Security & Broken Routes

---

## Current Status

**Step in progress:** v1.0 complete — ready to start v1.1

### Completed this session:
- [x] Step 5 — Rate limiting wired to `/auth/login` and `/auth/refresh`
- [x] Step 6 — `/patient/search` uses direct `db` import
- [x] Step 7 — `RequireAuth` redirects fixed (`/doctor`, `/admin`)
- [x] Step 8 — Admin controller, routes, and UI API alignment
- [x] Step 9 — `AuthContext` wired into `main.jsx`; components use `useAuth()`

### Previously completed:
- [x] Step 1 — TLS verification restored
- [x] Step 2 — DB credential logging removed
- [x] Step 3 — `config/env.js` secrets abstraction
- [x] Step 4 — Argon2-only hashing with bcrypt rehash-on-login migration

### Next version (v1.1 — Folder Restructure & Clean Code):
- Step 1 — Create `apps/` monorepo folder structure

### Open questions / blockers:
- No `.env` in workspace — live endpoint tests (rate limit, admin flow, search) need local DB + env before manual verification

---
