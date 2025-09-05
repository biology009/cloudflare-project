import { jsonResponse } from '../utils/response.js';
import { logInfo, logWarn } from '../utils/logger.js';

export default async function handleGetGap(request, env) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');

  if (!token) {
    logWarn('[get-gap] Missing token');
    return jsonResponse({ error: 'Missing token' }, 400);
  }

  const tokenData = await env.TOKENS_KV.get(token, { type: 'json' });
  if (!tokenData) {
    logWarn(`[get-gap] Token expired: ${token}`);
    return jsonResponse({ error: 'expired' }, 404);
  }

  logInfo(`[get-gap] Returning gap_x for token: ${token}`);
  return jsonResponse({ gap_x: tokenData.gap_x });
}
