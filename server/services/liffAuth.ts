import { env } from '../config/env';

interface LineIdTokenClaims {
  sub?: string;
  aud?: string;
  exp?: number;
}

/**
 * LINE validates the token signature and audience on its verification endpoint.
 * The channel ID is the OAuth client ID (`aud`) for a LIFF ID token.
 */
export async function verifyLiffIdToken(idToken: string): Promise<string> {
  const liffId = env.LINE_LIFF_ID || process.env.VITE_LINE_LIFF_ID || '';
  const loginChannelId = liffId ? liffId.split('-')[0] : env.LINE_CHANNEL_ID;

  const response = await fetch('https://api.line.me/oauth2/v2.1/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      id_token: idToken,
      client_id: loginChannelId,
    }),
  });

  if (!response.ok) {
    throw new Error('LINE ID token validation failed');
  }

  const claims = await response.json() as LineIdTokenClaims;
  if (!claims.sub || claims.aud !== loginChannelId) {
    throw new Error('LINE ID token claims are invalid');
  }

  return claims.sub;
}
