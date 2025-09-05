import { jsonResponse } from '../utils/response';
import { logInfo } from '../utils/logger';

export default async function verifyPuzzle(request, env) {
  const { token, slider_x } = await request.json();

  if (!token || slider_x === undefined) {
    return jsonResponse({ error: 'Missing token or slider_x' }, 400);
  }

  const tokenData = await env.TOKENS_KV.get(token, { type: 'json' });
  if (!tokenData) return jsonResponse({ status: 'expired' });

  if (tokenData.attempts >= 3) {
    await env.TOKENS_KV.delete(token);
    return jsonResponse({ status: 'max_attempts' });
  }

  const tolerance = parseInt(env.TOLERANCE || '5');
  if (Math.abs(slider_x - tokenData.gap_x) <= tolerance) {
    const delay = Math.floor(Math.random() * 10) + 1;
    await env.TOKENS_KV.delete(token);

    logInfo('[verify-puzzle] Success', { token, redirect: tokenData.short_url });

    return jsonResponse({ status: 'ok', redirect: tokenData.short_url, delay });
  } else {
    tokenData.attempts += 1;
    if (tokenData.attempts >= 3) {
      await env.TOKENS_KV.delete(token);
      return jsonResponse({ status: 'max_attempts' });
    } else {
      await env.TOKENS_KV.put(token, JSON.stringify(tokenData), {
        expirationTtl: parseInt(env.TOKEN_TTL || '1800')
      });
      return jsonResponse({ status: 'wrong', attempts_left: 3 - tokenData.attempts });
    }
  }
}
