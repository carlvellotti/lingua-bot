# Interview Assistant Prototype

This project provides a minimal full-stack prototype for a GPT-powered interview practice assistant with realtime voice. It includes:

- **Express backend** (`server/`) that exposes interview metadata, brokers summary generation, and mints ephemeral client secrets for the Realtime API.
- **React frontend** (`client/`) that connects to the Realtime API over WebRTC, plays the interviewer’s audio, shows live transcripts, and displays post-interview coaching feedback.

## Getting started

1. **Install dependencies**
   ```bash
   cd server && npm install
   cd ../client && npm install
   ```

2. **Configure OpenAI**
   - Copy `.env.example` to `.env` at the repo root.
   - Add your `OPENAI_API_KEY` value (project key recommended).
   - Optional: override `REALTIME_MODEL`, `REALTIME_VOICE`, or `REALTIME_TRANSCRIBE_MODEL` if you need different realtime defaults.

3. **Run the backend**
   ```bash
   cd server
   npm start
   ```
   The API listens on `http://localhost:4000` by default.

4. **Run the frontend**
   ```bash
   cd client
   npm run dev
   ```
   Vite serves the React app at the port it prints (typically `5173`).

5. **Try the flow**
   - Pick the questions you want to practice from the multi-select list (the preview updates as you choose).
   - Choose an interview style (Easy, Medium, Hard). Each persona adjusts tone, follow-up aggressiveness, voice, and silence tolerance.
   - Click **Start Voice Interview** and grant microphone access when prompted. The interviewer will follow the questions you picked, ask persona-appropriate follow-ups, and close by saying `INTERVIEW_COMPLETE`.
   - Live transcripts appear as you and the interviewer speak. After the close, the backend summarizes the interview into structured coaching feedback.

## Environment configuration

The frontend defaults to calling `http://localhost:4000`. To point it elsewhere, create a `.env` file inside `client/` with:
```bash
VITE_API_BASE_URL="https://your-server-url"
```

## Next steps

- Capture recording metrics (latency, dropouts) and surface connection quality inside the UI.
- Persist transcripts/interview metadata for later review or personalization.
- Allow admins to edit question lists, evaluation focus areas, and persona definitions from the UI.
- Introduce authentication plus candidate history so returning users can track progress.
