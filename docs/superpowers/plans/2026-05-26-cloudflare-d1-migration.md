# Cloudflare D1 Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the couple-study cabin from browser-direct CloudBase access to Cloudflare Pages Functions backed by Cloudflare D1.

**Architecture:** Keep the React UI and its existing repository-shaped calls. Replace the CloudBase client internals with a small fetch-based API client. Add Pages Functions under `functions/api` to validate requests and read/write D1 through a `DB` binding.

**Tech Stack:** React, Vite, Vitest, Cloudflare Pages Functions, Cloudflare D1, Wrangler.

---

### Task 1: API Contract Tests

**Files:**
- Create: `src/cabinApiRepository.test.js`
- Create: `functions/api/[[path]].test.js`

- [ ] Write tests for the frontend API repository so `getTodayData`, `addTask`, `updateTask`, `deleteTask`, `addEncouragement`, `saveDailySummary`, and `saveDailyStatus` call the expected endpoints.
- [ ] Write tests for the Pages Function router so state loading, task creation, task updates, deletions, and upserts work against a fake D1 database.
- [ ] Run targeted tests and confirm they fail before implementation.

### Task 2: Frontend API Client

**Files:**
- Create: `src/cabinApiRepository.js`
- Modify: `src/cloudbaseClient.js`

- [ ] Implement a fetch wrapper that sends JSON, handles HTTP errors, and returns response payloads.
- [ ] Expose the same repository methods the app already uses.
- [ ] Keep `getCabinClient()` returning `{ repository }` so `src/App.jsx` does not need a broad rewrite.

### Task 3: Cloudflare Pages Function

**Files:**
- Create: `functions/api/[[path]].js`

- [ ] Implement `onRequest(context)` as a small router.
- [ ] Validate `roomCode`, `owner`, `date`, task ids, and text fields before writing.
- [ ] Use D1 prepared statements for all reads and writes.
- [ ] Return records with `_id` fields so the existing UI keeps working.

### Task 4: Cloudflare Configuration And Docs

**Files:**
- Create: `schema.sql`
- Create: `wrangler.toml`
- Modify: `package.json`
- Modify: `.env.example`
- Modify: `vite.config.js`
- Replace: `README.md`

- [ ] Add D1 table schema and indexes.
- [ ] Add Wrangler scripts for local D1 and deployment.
- [ ] Remove the CloudBase dependency and manual chunk.
- [ ] Document Cloudflare account setup, D1 creation, local migration, Pages deployment, and the China-network caveat.

### Task 5: Verification

**Files:**
- All changed files

- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Report exact results and any remaining manual Cloudflare dashboard steps.
