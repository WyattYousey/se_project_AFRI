// Minimal serverless entrypoint for Vercel / other hosts that serve /api/*
// It delegates to the implementation in `src/api/analyze.js` so dev and prod paths share logic.

import handler from "../src/api/analyze.js";

export default function analyze(req, res) {
  // The implementation already handles method checks and errors.
  return handler(req, res);
}
