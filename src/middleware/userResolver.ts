// ============================================================
// PROJECT MEJAI — User Resolution Middleware
// Looks up or creates user from LINE event, attaches to request.
// ============================================================

import { Request, Response, NextFunction } from 'express';
import { findOrCreateUser } from '../services/supabase';
import { MejaiContext } from '../types';
import { TIER_CONFIGS } from '../config/constants';
import { SubscriptionTier } from '../types';

// Extend Express Request to carry our context
declare global {
  namespace Express {
    interface Request {
      mejaiContext?: MejaiContext;
    }
  }
}

/**
 * Middleware: Resolves LINE user → DB user + relationship.
 * Attaches MejaiContext to req for downstream handlers.
 */
export async function userResolverMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const events = req.body?.events;
    if (!events || events.length === 0) {
      res.status(200).json({ message: 'No events' });
      return;
    }

    // Process first event's user (LINE batches events but usually sends 1)
    const event = events[0];
    const lineUserId = event?.source?.userId;

    if (!lineUserId) {
      res.status(200).json({ message: 'No user ID in event' });
      return;
    }

    const { user, relationship } = await findOrCreateUser(
      lineUserId,
      event?.source?.displayName
    );

    const tierConfig = TIER_CONFIGS[user.subscription_tier as SubscriptionTier];

    req.mejaiContext = {
      user,
      relationship,
      tier_config: tierConfig,
      server_timestamp: new Date().toISOString(),
    };

    next();
  } catch (error) {
    console.error('❌ User resolution failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
