# Deployment to Vercel: Tech Spec and Checklist

This document tracks the plan and tasks to deploy the interview bot (frontend + API) on Vercel.

## Architecture

- Frontend deployed as a Vercel project with root `client/` (Vite + React)
- Backend converted from Express (`server/index.js`) to Vercel Serverless Functions under `api/`
- Realtime WebRTC flow remains browser ↔ OpenAI direct using a `clientSecret` fetched from our API route `POST /api/realtime/session`

## Routes mapping (Express → Vercel API Routes)

- GET `/api/health`
- GET `/api/questions`
- POST `/api/interview/start`
- POST `/api/interview/respond`
- POST `/api/interview/summary`
- POST `/api/realtime/session` (creates OpenAI Realtime client secret)

## Environment variables

- Required (Server/API):
  - `OPENAI_API_KEY`
- Optional (Server/API):
  - `REALTIME_MODEL` (default `gpt-4o-realtime-preview-2024-12-17`)
  - `REALTIME_VOICE` (default `alloy`)
  - `REALTIME_TRANSCRIBE_MODEL` (default `gpt-4o-mini-transcribe`)
- Frontend (Vite):
  - `VITE_API_BASE_URL` → set to `/api` for same-project routing on Vercel

## Build settings

- Frontend project (Vercel):
  - Framework: Vite
  - Build Command: `cd client && npm run build`
  - Output Directory: `client/dist`
  - Root `vercel.json` configured to build from `client/` and serve API from `api/`

## CORS & networking

- Use same-origin calls from the frontend to `/api/...` to avoid CORS.
- If the frontend and API are split across projects/domains, add permissive CORS in API routes.

## Realtime specifics

- `POST /api/realtime/session` builds a Realtime session body (model, instructions, transcription, turn detection, voice) and calls OpenAI `POST /v1/realtime/client_secrets` with the server API key. It returns `{ clientSecret, expiresAt, model, baseUrl, instructions, persona, questions }`.
- Browser performs SDP exchange with `baseUrl` using the returned `clientSecret`.

## Rollout plan

1. Create Vercel project, root `client/`. Configure frontend build.
2. Add API routes under `api/` to mirror Express endpoints.
3. Set environment variables in Vercel (server + frontend).
4. Deploy preview → verify `GET /api/health` and `GET /api/questions`.
5. Smoke test Realtime flow end-to-end.
6. Promote to production.

## Checklist

- [ ] Frontend project created on Vercel with root `client/`
- [x] Vite build settings configured on Vercel
- [x] API routes scaffolded in `api/`
- [ ] `OPENAI_API_KEY` set (preview + production)
- [ ] Optional model/voice vars set (as needed)
- [ ] `VITE_API_BASE_URL` set to `/api`
- [ ] Health endpoint returns ok on Vercel
- [ ] Questions endpoint returns data on Vercel
- [ ] Realtime session token creation works on Vercel
- [ ] End-to-end interview completes and summary returns JSON

## Notes

- Node runtime must be 18+ for global `fetch` and the OpenAI SDK. Prefer Node runtime for the Realtime token route.

## Local development with Vercel Dev

1. Install CLI and dependencies:
   - `npm i -g vercel`
   - `npm install && (cd client && npm install)`
2. Environment variables:
   - At repo root: create `.env` with `OPENAI_API_KEY=...`
   - In `client/.env.local`: `VITE_API_BASE_URL="http://localhost:3000/api"`
3. Link and run:
   - `vercel login`
   - `vercel link`
   - `vercel dev`
   - Open Vite at the printed localhost port (devCommand runs `cd client && npm run dev`), API at `http://localhost:3000/api/*`.

