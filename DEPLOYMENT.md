# AFRI Deployment Guide - Netlify

Deploy AFRI to Netlify with proper rate limiting for Gemini free tier (20/day, 5/min, 250K tokens/min).

---

## Quick Start

### 1. Get Your API Key

Go to [Google AI Studio](https://aistudio.google.com/apikey) and create a new Gemini API key.

### 2. Connect to Netlify

1. Log in to [Netlify Dashboard](https://netlify.com)
2. Click **"Add new project"** → **"Import an existing project"**
3. Select **GitHub** and authorize Netlify
4. Choose your `se_project_AFRI` repository
5. Click **Deploy**

Netlify will auto-detect your build settings from `vite.config.js` and `netlify.toml`.

### 3. Set Environment Variables

1. In Netlify Dashboard, go to **Site settings** → **Build & deploy** → **Environment**
2. Click **Add a variable**
3. Add: `GENAI_API_KEY` = `[your Gemini API key from step 1]`
4. Trigger redeploy

### 4. Enable Netlify KV (Optional but Recommended)

For distributed rate limiting across function invocations:

1. Go to **Integrations & services**
2. Search for **Netlify KV** and install
3. The rate limiter will automatically use KV for persistent state

Without KV, rate limiting still works but only within single function invocations.

### 5. Test Your Deployment

1. Visit your Netlify URL (e.g., `https://your-site.netlify.app`)
2. Upload two test images
3. Click "Run Inspection"
4. Check browser console (F12) for: `[analyze] Rate limit OK...`

---

## What's Included

### Rate Limiting

- **20 requests/day** - Global per-IP
- **5 requests/minute** - Per-IP window
- **250K tokens/minute** - Per-IP token tracking
- Falls back to in-memory if KV unavailable

When limits exceeded, users see:

- HTTP 429 response with `Retry-After` header
- Console warning: `⚠️ RATE LIMIT: Too many requests...`
- Friendly UI error message

### Security

- Server-side API key handling (`GENAI_API_KEY` env var only)
- Payload validation (5MB per image, format checks)
- Security headers (CSP, X-Frame-Options, X-Content-Type-Options)
- Structured error responses (no sensitive details in production)

### Serverless Setup

- `netlify.toml` - Build config, routing, headers
- `netlify/functions/analyze.js` - Function wrapper
- `src/api/analyze.js` - API implementation

---

## Architecture

```
User Browser
    ↓
Netlify Static (React App)
    ↓
POST /api/analyze
    ↓
Netlify Function (netlify/functions/analyze.js)
    ↓
Analysis Logic (src/api/analyze.js)
    ├─ Rate Limiter (src/api/rateLimiter.js) → Netlify KV
    ├─ Payload Validation
    └─ Gemini API Call
    ↓
JSON Response
    ↓
User Browser
```

---

## Troubleshooting

### API key not configured

**Error:** `Server misconfiguration: missing API key`

**Fix:** Verify `GENAI_API_KEY` is set in Netlify → Site settings → Environment

### Rate limit immediately triggered

**Cause:** Testing from same IP repeatedly

**Fix:** Wait 60 seconds for 1-minute window to reset. Daily limit resets at UTC midnight.

### Images too large

**Error:** HTTP 413 - Payload too large

**Fix:** Compress images to <5MB each. 800x1024px is plenty.

### Function times out

**Cause:** Gemini API slow to respond

**Fix:** Reduce image complexity. Netlify default timeout 26s (sufficient). Gemini takes 5-10s typically.

---

## Build & Deploy

```bash
# Build locally (test before deploying)
npm run build

# Deploy to Netlify (automatic if using GitHub integration)
git push origin main
```

Netlify will:

1. Run `npm run build`
2. Deploy `dist/` folder
3. Deploy functions from `netlify/`
4. Apply security headers from `netlify.toml`

---

## API Endpoint

After deployment:

```
POST https://your-netlify-domain.app/api/analyze
```

---

**Ready to deploy!** 🚀
