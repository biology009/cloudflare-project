import { jsonResponse } from '../utils/response';
import { logInfo, logWarn } from '../utils/logger';

export default async function storeUrl(request, env) {
  try {
    const body = await request.json();
    const { short_url } = body;

    if (!short_url) {
      logWarn('[store-url] Missing short_url', body);
      return jsonResponse({ error: 'Missing short_url' }, 400);
    }

    // Generate token
    const token = crypto.randomUUID();

    const images = [
      'img/IMG_20250903_161740_099.jpg',
      'img/IMG_20250903_161801_401.jpg',
      'img/IMG_20250903_161810_656.jpg',
      'img/IMG_20250903_161810_740.jpg'
    ];
    const randomImage = images[Math.floor(Math.random() * images.length)];
    const gap_x = Math.floor(Math.random() * (250 - 50) + 50);

    const tokenData = {
      short_url,
      image: randomImage,
      gap_x,
      attempts: 0
    };

    await env.TOKENS_KV.put(token, JSON.stringify(tokenData), {
      expirationTtl: parseInt(env.TOKEN_TTL || '1800')
    });

    logInfo('[store-url] Token generated', { token, short_url });

    return jsonResponse({
      verify_url: `${request.url.replace('/store-url', '')}/verify/${token}`
    });
  } catch (err) {
    logWarn('[store-url] Error', { error: err.message });
    return jsonResponse({ error: err.message }, 500);
  }
}
