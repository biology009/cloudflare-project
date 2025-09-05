import { jsonResponse } from '../utils/response.js';
import { logInfo, logError } from '../utils/logger.js';

export default async function handleGetGap(request, env) {
  try {
    const token = new URL(request.url).searchParams.get('token');
    const tokenData = await env.TOKENS_KV.get(token, { type: 'json' });

    if (!tokenData) {
      logError(`Gap fetch failed for expired token: ${token}`);
      return jsonResponse({ error: 'expired' }, 404);
    }

    logInfo(`Gap returned for token: ${token}`);
    return jsonResponse({ gap_x: tokenData.gap_x });
  } catch (err) {
    logError(`Error in get-gap: ${err.message}`);
    return jsonResponse({ error: err.message }, 500);
  }
}
