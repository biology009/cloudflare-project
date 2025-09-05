import { jsonResponse } from '../utils/response';
import { logInfo } from '../utils/logger';

export default async function getGap(request, env) {
  const token = new URL(request.url).searchParams.get('token');
  const tokenData = await env.TOKENS_KV.get(token, { type: 'json' });

  if (!tokenData) return jsonResponse({ error: 'expired' }, 404);

  logInfo('[get-gap] Gap retrieved', { token, gap_x: tokenData.gap_x });

  return jsonResponse({ gap_x: tokenData.gap_x });
}
