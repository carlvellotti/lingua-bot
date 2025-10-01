# Interview Prep Wizard & Session Handoff

## Context
- Current app shows prep controls alongside the live AI interviewer, which crowds the layout and mixes distinct phases.
- We now have a Magic Patterns-explored prep experience (categories, JD upload, resume) that should run before the interview appears.
- The backend already persists interviews and exposes an OpenAI key, but lacks endpoints for user-defined categories or JD-driven question generation.

## Goals
- Deliver a dedicated pre-interview wizard where users curate the question stack before seeing the AI interviewer UI.
- Support curated PM categories plus user-created categories/questions that persist per user.
- Allow JD upload to generate supplemental questions via `gpt-5-mini`, returning selectable options grouped by category.
- Let users optionally attach a resume for the current session (no long-term storage yet).
- After prep, swap the screen to the interview experience while displaying a read-only question stack for reference.

## Non-Goals (v1)
- Multi-user auth or sharing category libraries between users.
- Persisting uploaded resumes beyond the active session.
- Advanced JD parsing quality controls (manual editing, versioning) beyond basic AI generation.
- Post-interview analytics or template library (future work).

## User Journey
1. **Prep landing** (default state) shows tabs for `Categories` and `Upload JD`, plus a review panel once questions are selected.
2. User selects curated categories, optionally creates custom categories/questions (which persist), and/or uploads a JD to generate more prompts.
3. User optionally uploads a resume, reviews the question stack (with counts and estimated duration), and picks persona/difficulty.
4. Pressing `Start Interview` locks the prep inputs, records the session payload, and transitions the UI to live interview mode.
5. Live interview displays the interviewer UI on top and a collapsible “Question Stack” panel below; stack remains read-only but visible for reference.
6. When interview ends, existing history/persistence features capture transcript/evaluation; resume file is discarded.

## UX Outline
- **Prep Wizard**
  - `Categories` tab: dropdown of seed PM categories (product sense, execution, metrics, strategy, etc.) + user custom categories. Within a category, bulk-select or pick specific prompts. “Create Category” form captures name + questions, auto-saves for future sessions.
  - `Upload JD` tab: file drop zone → upload spinner → AI-generated question list grouped by themes. Select-all/clear toggles; accepted questions join the stack tagged as `JD`.
  - `Review` panel: displays selected questions with source labels, reordering, remove controls, total count, estimated interview length, persona & difficulty selectors.
  - `Resume Upload`: optional; shows file metadata and removal option.
- **Transition**: `Start Interview` button triggers a short confirm state (loading animation optional) then flips to interview mode.
- **Interview Mode**
  - Top region: existing AI interviewer visualization/controls.
  - Bottom region: question stack list (grouped by category, read-only) with sticky header summarizing persona/difficulty and actual resume filename if attached.
  - Optional “Return to Prep” action (guarded warning) if we allow edits pre-first-question; otherwise disabled once session begins.

## Data & Persistence
- **Seed categories**: served from config (`server/config/categories.json` or inline module). Each entry holds `id`, `title`, `description`, `defaultQuestions`, `difficultyRange`, `tags`.
- **Custom categories**: new SQLite table `user_question_categories` with columns:
  - `id` (UUID), `user_id`, `title`, `questions` (JSON array), `created_at`, `updated_at`.
  - CRUD endpoints: `GET/POST/PATCH/DELETE /interview/preferences/categories`.
- **Prep session state**: client keeps `selectedQuestions[]` with metadata (`id`, `text`, `source`, `categoryId`, `estimatedDuration`). Derived totals power the review summary.
- **JD processing artifacts**: server returns generated questions in response body; not persisted unless user adds them to a custom category manually.
- **Resume storage**: uploaded file stored temporarily (filesystem or memory) with a session token; deleted when interview completes or prep resets.

## API Extensions
- `POST /interview/preferences/categories` → create custom category (with questions).
- `GET /interview/preferences/categories` → list user custom categories.
- `PATCH /interview/preferences/categories/:id` → update title/questions.
- `DELETE /interview/preferences/categories/:id` → remove custom category.
- `POST /interview/jd` → accepts JD file (multipart). Backend extracts text, calls `gpt-5-mini`, returns `{categories: [{title, questions: [{id, text, rationale}]}], promptSummary}`.
- `POST /interview/start-session` → accepts payload `{questionStack, persona, difficulty, resumeRef?, jdSummary?}`; seeds the realtime session and responds with interviewer session credentials.

## Technical Notes
- **JD prompt**: include JD synopsis + knobs like desired number of questions/categories. Constrain `gpt-5-mini` output to JSON; validate and fall back gracefully.
- **Resume**: keep file in temp dir keyed by UUID; include reference in `/interview/start-session` payload and pass the extracted plain text (lightly sanitized, minimal truncation). Avoid summarizing; embed the resume excerpt verbatim (capped ~6 KB) in the interviewer system prompt with guidance to reference specifics without repeating sensitive data.
- **Resume upload constraints**: server accepts PDF, DOC/DOCX, or plain-text files up to 5 MB. Reject anything else with a clear error message.
- **Screen swap**: implement as a mode flag inside main component. Prep UI unmounts after start to free resources; question stack state remains for interview display.
- **Error handling**: show toast/banner if JD generation fails (allow retry) or custom category save errors.
- **Testing considerations**: unit tests for new API handlers, integration test for end-to-end prep flow, mock OpenAI responses.
- **Backend implementation**: extend the existing Express app in `server/index.js`; defer syncing the Vercel `api/` directory until later.
- **Category persistence**: while auth is out of scope, persist custom categories with `user_id = 'local'` so the schema is forward-compatible.
- **OpenAI usage**: implement the baseline retry/logging flow for `gpt-5-mini` JD generation per this spec; no additional rate limiting required yet.
- **Frontend state**: adopt Jotai atoms for prep wizard state and use Radix Tabs for the category/JD navigation.

## Open Questions
- Should we allow saving JD-generated questions into a new custom category with one click?
- Do we need rate limits/throttling on JD uploads?
- How do we surface question stack edits mid-interview (if at all)?
- Should the resume preview include extracted text for verification?

## Implementation Phases
1. Backend: add custom category persistence + JD processing endpoint (file parsing + OpenAI call) + start-session payload.
2. Frontend: refactor main layout to prep/interview modes; wire category CRUD; integrate JD upload flow; display read-only stack during interview.
3. Polish: persona/difficulty summary chips, animations, error states, cleanup hooks.
4. QA & docs: add spec references, update README with new flow, regression test interview history.


## Current Status & Notes (Sept 28 2025)
- **Backend Phase 1 complete**: Express server (`server/index.js`) now exposes custom-category CRUD, resume upload/delete, JD upload (via `openai.responses.parse` structured output), and `/interview/start-session` returning realtime credentials. Resume uploads enforce 5 MB and PDF/DOC/DOCX/TXT. JD endpoint currently expects text files but handles PDF/DOC/DOCX extraction. All new handlers share the same Express app; the Vercel API directory remains unsynchronized.
- **Database**: `better-sqlite3` store includes the new `user_question_categories` table keyed to placeholder `user_id = 'local'`. No migrations pending.
- **Frontend state scaffolding**: Added Jotai atoms (`atoms/prepState.js`), API helpers (`services/api.js`), and prep components (`components/prep/*`) covering resume upload, custom category creation dialog, and JD upload tabs. `main.jsx` now wraps the app in a Jotai provider with devtools.
- **Frontend refactor in progress**: `App.jsx` still mixes the legacy checkbox/difficulty UI with new prep atoms—lint errors reference undefined handlers like `handleQuestionToggle` and missing helpers (`buildInterviewerPrompt`). `PrepWizard.jsx` exists but is mid-refactor: it loads config/custom categories, wires Radix Tabs, and kicks off `/interview/start-session`, yet it currently fails the parser (stray `return`) and duplicates logic destined for atoms. No runtime-ready prep wizard yet.
- **Tests/build**: ESLint fails (~30 errors) due to unused imports, undefined functions, and hook dependency issues while the refactor is incomplete. No automated tests have been updated to cover the new endpoints.
- **Next steps**: finish the frontend refactor—repair `PrepWizard.jsx`, simplify `App.jsx` to hand off to the wizard/interview modes, implement `buildInterviewerPrompt`, and ensure lint/tests pass. Once the wizard drives a full prep-to-interview flow, polish and QA tasks can resume.

## Current Implementation Notes (Sept 29 2025)
- Prep flow has been refactored into a dedicated `PrepWizard` component that controls question selection, persona/difficulty, custom categories, and the interview hand-off. `App.jsx` now renders the wizard while `prepMode === 'prep'` and mounts the legacy interview/history UI (renamed `InterviewExperience`) for live sessions.
- Shared interview state (`interviewSession`, question stack, persona/resume references) is populated by the wizard and consumed by the interview view via the existing Jotai atoms. The “Start Interview” button successfully transitions the UI by updating `prepModeAtom` to `interview`.
- Visual design for the wizard has been implemented with new styles in `index.css`, covering tabs, question cards, summary panel, and CTA footer.
- JD ingestion has transitioned from a file-upload UX to a paste-in text area. The client now submits JSON, and the server endpoint accepts either JSON or multipart uploads.
- Known gaps:
  - JD generation currently returns **400** for the paste flow; server/client wiring still requires validation and error-handling work before it is fully functional.
  - Resume upload remains wired to the existing endpoints but is disabled in the UI while the prep/interview fusion work is ongoing.
- Layout still switches entirely between the wizard and interview views; next iteration should embed the prep experience within the persistent sidebar frame so the question stack is always visible.


