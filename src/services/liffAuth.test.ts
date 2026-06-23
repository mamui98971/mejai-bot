import { afterEach, describe, expect, it, vi } from 'vitest';
import { env } from '../config/env';
import { verifyLiffIdToken } from './liffAuth';

describe('verifyLiffIdToken', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns the authenticated LINE subject only when LINE accepts the token', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      sub: 'U123', aud: env.LINE_CHANNEL_ID,
    }), { status: 200 })));

    await expect(verifyLiffIdToken('valid-token')).resolves.toBe('U123');
  });

  it('rejects an invalid token response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 401 })));
    await expect(verifyLiffIdToken('forged-token')).rejects.toThrow('LINE ID token validation failed');
  });

  it('rejects a token for a different LINE channel', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      sub: 'U123', aud: 'wrong-channel',
    }), { status: 200 })));
    await expect(verifyLiffIdToken('wrong-audience')).rejects.toThrow('LINE ID token claims are invalid');
  });
});
