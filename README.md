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
Browser (React)  ──WebSocket──▶  Backend (Fastify)  ──▶  OpenAI Realtime + Chat APIs
     │                                │
     └── Audio capture only           └── API keys in env vars only
         after user clicks Start
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
   OPENAI_API_KEY=sk-...
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

- API keys stored in `backend/.env` only (never in frontend)
- `.env` is gitignored
- Short-lived JWT session tokens (default 15 min) for WebSocket connections
- Rate limiting on all API routes
- History requires separate auth token
- No audio storage by default
- Transcripts saved only when history is enabled
- Input validation on all endpoints
- Fixed system prompts — users cannot inject overrides

## Production

- Set `NODE_ENV=production`
- Use HTTPS (required for microphone in most browsers)
- Store secrets in a secret manager
- Set `FRONTEND_URL` to your production domain
- Build: `npm run build`
- Start: `npm start`

## Models (configurable via env)

| Variable | Default | Purpose |
|----------|---------|---------|
| `OPENAI_REALTIME_MODEL` | `gpt-realtime` | Realtime session |
| `OPENAI_TRANSCRIPTION_MODEL` | `gpt-4o-mini-transcribe` | Live transcription |
| `OPENAI_CLAIM_MODEL` | `gpt-4o-mini` | Quick claim detection |
| `OPENAI_FACTCHECK_MODEL` | `gpt-5.5` | Deep fact-check reasoning |
