# Live Fact Check

Real-time AI fact-checking assistant that listens to microphone or system audio, transcribes speech live, detects factual claims, and provides truth-confidence estimates.

## Features

- **Audio sources**: Microphone voice or system/tab audio (browser-dependent)
- **Explicit consent**: Nothing records until you choose a source and click **Start**
- **Live transcription** via OpenAI Realtime API
- **Automatic claim detection** (mini model) and **fact-check reasoning** (GPT-5.5)
- **Confidence estimates** with verdicts: True, Mostly true, Unclear, Mostly false, False, Not enough evidence
- **Secure backend**: API keys never exposed to the frontend; short-lived session tokens for WebSocket streaming
- **Optional claim history** with authentication and delete support

## Architecture

```
Browser (React)  ──same origin──▶  Fastify (API + /ws + static UI)  ──▶  OpenAI APIs
```

## Prerequisites

- Node.js 20+
- OpenAI API key with Realtime API access

## Setup

1. **Install dependencies**

   ```bash
   npm install
   cd backend && npm install
   cd ../frontend && npm install
   ```

2. **Configure environment**

   Copy `backend/.env.example` to `backend/.env` and set your values:

   ```env
   JWT_SECRET=your-long-random-secret-at-least-32-chars
   HISTORY_AUTH_SECRET=another-random-secret
   ```

3. **Run development servers**

   From the project root:

   ```bash
   npm run dev
   ```

   - Frontend: http://localhost:5173
   - Backend: http://localhost:3001

## Usage

1. Choose **Microphone** or **System Audio**
2. Optionally enable **Save history**
3. Click **Start Listening** — browser will request permission
4. Speak or play audio; watch the live transcript and fact-check results
5. Use **Pause**, **Resume**, or **Stop** at any time

### System audio

System audio uses the browser's `getDisplayMedia` API. Select a tab and enable **Share tab audio**. Video tracks are immediately discarded — only audio is captured.

## Security

- OpenAI API key entered in the browser UI (localStorage) or optional server fallback in env
- `.env` is gitignored
- Short-lived JWT session tokens (default 15 min) for WebSocket connections
- WebSocket auth handshake — token not passed in URL
- Rate limiting on API routes and audio chunks
- History requires separate auth token
- No audio storage by default
- Input validation on all endpoints

## Production

Single-service deployment: one Node process serves the React app, REST API, and WebSocket on the same origin.

### Build and run locally

```bash
npm run build
NODE_ENV=production JWT_SECRET=your-32-char-secret HISTORY_AUTH_SECRET=your-history-secret FRONTEND_URL=https://localhost npm start
```

Open the URL shown in the logs (default port `3001`). For local HTTPS testing, use a tunnel (e.g. ngrok) — browsers require HTTPS for microphone access.

### Deploy to Render

1. Push this repo to GitHub
2. In [Render](https://render.com), create a **Blueprint** from `render.yaml`, or a **Web Service** with:
   - **Build command:** `npm install && npm run build`
   - **Start command:** `npm start`
   - **Health check path:** `/api/health`
3. Set environment variables in the Render dashboard:
   - `NODE_ENV` = `production`
   - `HOST` = `0.0.0.0` (auto-set when using `render.yaml`)
   - `JWT_SECRET` — long random string (32+ chars)
   - `HISTORY_AUTH_SECRET` — long random string (16+ chars)
   - `FRONTEND_URL` — optional; defaults to Render's `RENDER_EXTERNAL_URL`
   - Do **not** set `HOST=127.0.0.1` on Render
4. Users enter their OpenAI API key in the browser UI (stored in localStorage)

> **Note:** Render's free tier spins down when idle. Live WebSocket sessions may disconnect on cold starts — use a paid instance for always-on use.

### Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | prod | Set to `production` |
| `JWT_SECRET` | yes | Session token signing key (32+ chars) |
| `HISTORY_AUTH_SECRET` | yes | History auth token key (16+ chars) |
| `FRONTEND_URL` | prod* | Public HTTPS URL (*auto from `RENDER_EXTERNAL_URL` on Render) |
| `PORT` | no | Set automatically by Render |
| `STATIC_ROOT` | no | Override path to frontend `dist` folder |
| `OPENAI_API_KEY` | no | Optional server fallback; users can supply key in UI |

## Models (configurable via env)

| Variable | Default | Purpose |
|----------|---------|---------|
| `OPENAI_REALTIME_MODEL` | `gpt-realtime` | Realtime session |
| `OPENAI_TRANSCRIPTION_MODEL` | `gpt-4o-mini-transcribe` | Live transcription |
| `OPENAI_CLAIM_MODEL` | `gpt-4o-mini` | Quick claim detection |
| `OPENAI_FACTCHECK_MODEL` | `gpt-5.5` | Deep fact-check reasoning |
