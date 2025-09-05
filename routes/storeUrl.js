import { jsonResponse } from '../utils/response.js';
import { logInfo, logWarn, logError } from '../utils/logger.js';
import { generateToken } from '../utils/token.js';

export default async function handleStoreUrl(request, env) {
  try {
    const body = await request.json();
    const { short_url } = body;

    if (!short_url) {
      logWarn('[store-url] Missing short_url');
      return jsonResponse({ error: 'Missing short_url' }, 400);
    }

    const token = generateToken();
    const images = [
      "img/IMG_20250903_161740_099.jpg",
      "img/IMG_20250903_161801_401.jpg",
      "img/IMG_20250903_161810_656.jpg",
      "img/IMG_20250903_161810_740.jpg"
    ];
    const randomImage = images[Math.floor(Math.random() * images.length)];
    const gap_x = Math.floor(Math.random() * (250 - 50) + 50);

    const tokenData = { short_url, image: randomImage, gap_x, attempts: 0 };

    await env.TOKENS_KV.put(token, JSON.stringify(tokenData), {
      expirationTtl: parseInt(env.TOKEN_TTL || '1800')
    });

    logInfo(`[store-url] Stored token: ${token} for short_url: ${short_url}`);

    return jsonResponse({
      verify_url: `${request.url.replace('/store-url', '')}/verify/${token}`,
      token
    });
  } catch (err) {
    logError(`[store-url] Error: ${err.message}`);
    return jsonResponse({ error: err.message }, 500);
  }
}
