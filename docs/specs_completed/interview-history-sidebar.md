# Interview History Sidebar & Local Persistence

## Context
- Original issue: interview transcripts/evaluations disappeared after a session; no persistence or revisit UI.
- Local-first usage: users fork and run locally, so storage must be zero-config.
- Future goal: keep the architecture swappable so a hosted, multi-user backend can be layered on later.

## Goals
- Persist each completed interview’s transcript, evaluation summary, and metadata locally via SQLite.
- Expose prior interviews via a left-hand sidebar (ChatGPT-style list).
- Provide a primary “New Interview” action that returns to the live flow.
- Allow users to browse saved transcripts + evaluations in a read-only detail view.
- Order the list newest-first and keep it in sync when new interviews finish.
- Maintain portability in case we migrate to a hosted database later.

## Non-Goals
- Multi-user auth/accounts.
- Editing transcripts or evaluations (read-only v1).
- Syncing/backups beyond local SQLite.

## User Stories
- As a candidate, I can revisit past interviews and read my transcript/evaluation.
- As a candidate, I can start a new interview from the sidebar without losing history.
- As a developer, I have a thin data layer that can be swapped out later.
- As a future deployer, I know the migration path to hosted storage.

## Data Model & Persistence
- **Interview table**
  - `id` (UUID)
  - `title` (nullable, auto-derived from questions)
  - `created_at`, `updated_at` (ISO strings)
  - `metadata` (JSON: persona, difficulty, question info, savedAt)
  - `transcript` (JSON array of `{ role, content }` turns)
  - `evaluation` (JSON: `summary`, `strengths[]`, `improvements[]`, `rawSummary` fallback)
  - `evaluation_summary` (string for quick list snippets)
- **Storage stack**
  - SQLite file at `data/interviews.db` (WAL mode) managed by `better-sqlite3`.
  - Repository module `server/interviewStore.js` handles schema creation, insert/update, list, get, delete.
  - Database ignored by git.
- **Access pattern**
  - App startup fetches `/interview/history` (summaries sorted by `created_at DESC`).
  - `/interview/history/:id` loads the full payload lazily when a list item is selected.
  - When a session ends (either naturally or via manual stop with existing conversation), the client requests the evaluation, saves the record, and merges it into state sorted by recency.

## UI & UX Overview
- **Layout shell**
  - Persistent sidebar with:
    - Primary button “New Interview”.
    - Scrollable list of past interviews (newest first, highlights active item).
    - Empty/loading/error states handled inline.
  - Main workspace switches between two modes:
    - **Live mode**: existing interview flow (question selection, difficulty pills, visualization/transcript toggle, summary section).
    - **History mode**: read-only transcript and evaluation panels.
- **Interaction details**
  - Selecting an interview highlights it and loads details.
  - Titles auto-generate from the first question (or timestamp fallback).
  - Snippets show the evaluation summary when available.
  - “Return to live mode” button appears while viewing history.

## Technical Approach
- Client state extended with history list, selected interview ID, detail loading/error states.
- Fetch helpers: `/interview/history`, `/interview/history/:id`, `/interview/save`.
- `fetchSummary` persists to SQLite immediately after receiving the evaluation JSON.
- Runtime base URL helper resolves to `VITE_API_BASE_URL` or defaults (`http://localhost:4000` for localhost, `/api` otherwise).
- Sidebar list sorted via `sortInterviewsByDate()` on load and on each mutation.
- SQLite schema bootstrap runs on server startup.

## Local Workflow Notes
- Run Express server (`cd server && npm start`) for persistence.
- `vercel.json` rewrites `/api/:path*` → `http://localhost:4000/:path*` so `vercel dev` works seamlessly.
- Vite dev server can also be used with `VITE_API_BASE_URL=http://localhost:4000`.
- Database files live in `data/` (gitignored).

## Future Hosted Deployment Considerations
- SQLite remains fine for single-user/local setups; at larger scale consider Postgres/MySQL or distributed SQLite (LiteFS, Litestream).
- Repository abstraction allows swapping drivers with minimal changes.
- Serverless deployment should expose equivalent `/api/interview/*` routes backed by managed storage.

## Open Questions
- Do we need interview rename/delete capabilities?
- Should we add metadata filters (persona, difficulty, success metric)?
- How to handle extremely long transcripts (pagination/virtualized rendering)?
- Export/share options (JSON, Markdown) for saved interviews?

## Rollout Plan (completed)
1. Create SQLite schema + repository module.
2. Expose new REST endpoints in Express.
3. Refactor client layout to include sidebar + read-only history mode.
4. Wire save/list/detail UI and error states.
5. Ensure newest-first sorting and update documentation.


