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
  const response = await fetch('https://api.line.me/oauth2/v2.1/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      id_token: idToken,
      client_id: env.LINE_CHANNEL_ID,
    }),
  });

  if (!response.ok) {
    throw new Error('LINE ID token validation failed');
  }

  const claims = await response.json() as LineIdTokenClaims;
  if (!claims.sub || claims.aud !== env.LINE_CHANNEL_ID) {
    throw new Error('LINE ID token claims are invalid');
  }

  return claims.sub;
}
