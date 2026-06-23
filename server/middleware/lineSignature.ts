// ============================================================
// PROJECT MEJAI — LINE Webhook Signature Verification
// Rejects forged webhook calls. Non-negotiable security layer.
// ============================================================

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { env } from '../config/env';

/**
 * Middleware: Validates LINE webhook signature.
 * Must be applied BEFORE any JSON body parser on the webhook route,
 * since it needs the raw body buffer for HMAC computation.
 */
export function lineSignatureMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const signature = req.headers['x-line-signature'] as string;

  if (!signature) {
    res.status(403).json({ error: 'Missing LINE signature' });
    return;
  }

  const body = (req as any).rawBody;
  if (!body) {
    res.status(400).json({ error: 'Missing raw body for signature verification' });
    return;
  }

  const expectedSignature = crypto
    .createHmac('SHA256', env.LINE_CHANNEL_SECRET)
    .update(body)
    .digest('base64');

  if (signature !== expectedSignature) {
    console.warn('⚠️ Invalid LINE webhook signature — possible forgery attempt');
    res.status(403).json({ error: 'Invalid signature' });
    return;
  }

  next();
}
