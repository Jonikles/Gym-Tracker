/**
 * Strava proxy — runs on Netlify at /.netlify/functions/strava
 *
 * Keeps the Strava client secret off the device and relays the few API calls
 * the app makes. Configure in Netlify → Site configuration → Environment variables:
 *   STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET
 *
 * Sign-in handoff: Strava's sign-in can finish in a different browser context
 * than the installed app (e.g. the Strava app opens the callback in Safari,
 * whose storage an iOS home-screen app doesn't share). So the callback page
 * "exchange"s the code here, the tokens are parked in Netlify Blobs under the
 * app's random `state`, and the app "claim"s them once (then they're deleted).
 */
import { getStore } from '@netlify/blobs';

const STRAVA_OAUTH = 'https://www.strava.com/oauth';
const STRAVA_API = 'https://www.strava.com/api/v3';
const HANDOFF_TTL_MS = 15 * 60 * 1000;

// The only API paths the app may call through this proxy (all read-only)
const ALLOWED_API_PATHS = [/^\/athlete\/activities$/, /^\/activities\/\d+$/];

interface StravaTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete?: { id: number; firstname?: string; lastname?: string };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

function credentials() {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

function normalizeTokens(t: StravaTokenResponse) {
  return {
    accessToken: t.access_token,
    refreshToken: t.refresh_token,
    expiresAt: t.expires_at,
    athlete: t.athlete
      ? { id: t.athlete.id, name: [t.athlete.firstname, t.athlete.lastname].filter(Boolean).join(' ') }
      : undefined,
  };
}

async function tokenRequest(params: Record<string, string>): Promise<Response> {
  const creds = credentials();
  if (!creds) return json({ error: 'Strava is not configured on the server' }, 500);
  const res = await fetch(`${STRAVA_OAUTH}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: creds.clientId, client_secret: creds.clientSecret, ...params }),
  });
  if (!res.ok) return json({ error: 'Strava rejected the request', status: res.status }, res.status === 400 ? 400 : 502);
  return json(normalizeTokens((await res.json()) as StravaTokenResponse));
}

const isState = (s: unknown): s is string => typeof s === 'string' && /^[A-Za-z0-9-]{16,64}$/.test(s);

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  switch (body.action) {
    case 'config': {
      const creds = credentials();
      return creds ? json({ clientId: creds.clientId }) : json({ error: 'Strava is not configured on the server' }, 500);
    }

    case 'exchange': {
      if (typeof body.code !== 'string') return json({ error: 'Missing code' }, 400);
      const res = await tokenRequest({ code: body.code, grant_type: 'authorization_code' });
      if (res.ok && isState(body.state)) {
        const tokens = await res.clone().json();
        await getStore('strava-handoff').setJSON(body.state, { tokens, createdAt: Date.now() });
      }
      return res;
    }

    case 'claim': {
      if (!isState(body.state)) return json({ error: 'Invalid state' }, 400);
      const store = getStore('strava-handoff');
      const entry = (await store.get(body.state, { type: 'json' })) as
        | { tokens: unknown; createdAt: number }
        | null;
      if (!entry) return json({ error: 'Not found' }, 404);
      await store.delete(body.state);
      if (Date.now() - entry.createdAt > HANDOFF_TTL_MS) return json({ error: 'Expired' }, 410);
      return json(entry.tokens);
    }

    case 'refresh': {
      if (typeof body.refreshToken !== 'string') return json({ error: 'Missing refresh token' }, 400);
      return tokenRequest({ refresh_token: body.refreshToken, grant_type: 'refresh_token' });
    }

    case 'deauthorize': {
      if (typeof body.accessToken !== 'string') return json({ error: 'Missing token' }, 400);
      await fetch(`${STRAVA_OAUTH}/deauthorize`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${body.accessToken}` },
      });
      return json({ ok: true });
    }

    case 'api': {
      const { accessToken, path, query } = body;
      if (typeof accessToken !== 'string' || typeof path !== 'string') return json({ error: 'Bad request' }, 400);
      if (!ALLOWED_API_PATHS.some((re) => re.test(path))) return json({ error: 'Path not allowed' }, 403);
      const url = new URL(STRAVA_API + path);
      if (query && typeof query === 'object') {
        for (const [k, v] of Object.entries(query)) url.searchParams.set(k, String(v));
      }
      const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
      return new Response(await res.text(), {
        status: res.status,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      });
    }

    default:
      return json({ error: 'Unknown action' }, 400);
  }
};
