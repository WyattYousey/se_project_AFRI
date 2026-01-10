# Deployment & security notes for Gemini API usage

Goal: minimal secure server-side deployment for this sample app (works well for portfolio demos).

## Why server-side keys?

- Gemini API keys (`x-goog-api-key`) must be kept secret. Embedding long-lived keys in a website (VITE\_\*, window, or committed .env files) is insecure and should not be used in production.

## What I added for you

- A minimal serverless entry point: `api/analyze.js` (suitable for Vercel). It delegates to `src/api/analyze.js` which contains the GenAI integration and validation.
- `src/api/analyze.js` already reads the key from `process.env.GENAI_API_KEY` and performs payload checks and structured-output configuration.
- Client-side direct Gemini usage is now restricted to development only (`import.meta.env.DEV`) and will be ignored in production builds.

## How to set your API key (GENAI_API_KEY)

- Vercel: Project → Settings → Environment Variables → Add `GENAI_API_KEY` (Value: your key). Set the variable for the Environment(s) you want (Preview/Production).
- Netlify: Site settings → Build & deploy → Environment → Add `GENAI_API_KEY`.
- Cloud Functions / Cloud Run: Set `GENAI_API_KEY` in your runtime environment variables.

Important: never commit the key to source control (git). Use the hosting provider's environment variable UI.

## Restricting & rotating keys (recommended)

- In Google AI Studio that created the key, add HTTP referrer restrictions (for web origins) or IP restrictions, if your hosting provider supports them.
- Set low quotas, create alerting for usage spikes, and rotate keys periodically.

## Optional: protect the serverless endpoint

- The `src/api/analyze.js` includes payload size checks and JSON validation, but it does not include strong rate-limiting by default.
- For a public demo, consider one of the following protections:
  - An API gateway / WAF for IP-based rate-limiting (recommended for robust protection).
  - Add a simple per-request anti-abuse mechanism (CAPTCHA + server-side approval flow).
  - Configure server-side rate-limiting using environment variables `ANALYZE_RATE_WINDOW_MS` (time window in ms) and `ANALYZE_RATE_MAX` (max requests per IP per window). This repository includes a best-effort in-memory per-IP limiter for small demos; for production use a distributed store (e.g., Redis) or API gateway to reliably enforce limits.

## Local development

- If you want to prototype without a backend, you can set a local Vite env variable `VITE_GEMINI_API_KEY` in `.env.local` (do NOT commit it). The app allows direct client calls only when running in development mode.

## Quick Vercel deploy checklist

- Add `GENAI_API_KEY` in Vercel environment variables.
- Push your branch; Vercel will build and expose `/api/analyze` automatically.
- Test by running the web app and clicking "Run Inspection"; the client will call `/api/analyze` which will call Gemini server-side using the stored `GENAI_API_KEY`.
