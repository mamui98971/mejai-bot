// ============================================================
// PROJECT MEJAI — Vercel Serverless Entry Point
// Re-exports Express app for Vercel's serverless runtime.
// ============================================================

import app from '../src/index';

// Disable Vercel's default body parser to allow Express 
// to capture the raw body for LINE signature verification.
export const config = {
  api: {
    bodyParser: false,
  },
};

export default app;
