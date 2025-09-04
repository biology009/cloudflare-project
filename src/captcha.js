import { jsonResponse } from './utils.js';

export async function generateCaptcha(env) {
  const images = [
    '/img/IMG_20250903_161740_099.jpg',
    '/img/IMG_20250903_161801_401.jpg',
    '/img/IMG_20250903_161810_656.jpg',
    '/img/IMG_20250903_161810_740.jpg'
  ];

  const selected = images[Math.floor(Math.random() * images.length)];
  const challengeId = crypto.randomUUID();
  const correctPosition = Math.floor(Math.random() * 100);

  // Store the answer for 5 minutes
  await env.CHALLENGES.put(challengeId, String(correctPosition), { expirationTtl: 300 });

  return jsonResponse({
    challengeId,
    image: selected,
    hint: 'Slide the puzzle to the correct spot.'
  });
}

export async function validateCaptcha(body, env) {
  const { challengeId, position, redirectId } = body || {};

  if (!challengeId || typeof position === 'undefined' || !redirectId) {
    return jsonResponse({ success: false, message: 'Missing parameters' }, 400);
  }

  const correctPosition = await env.CHALLENGES.get(challengeId);
  if (!correctPosition) {
    return jsonResponse({ success: false, message: 'Challenge expired' }, 400);
  }

  const diff = Math.abs(parseInt(position, 10) - parseInt(correctPosition, 10));
  if (diff <= 5) {
    const redirectUrl = await env.REDIRECTS.get(redirectId);
    if (!redirectUrl) {
      return jsonResponse({ success: false, message: 'Redirect expired' }, 400);
    }
    return jsonResponse({ success: true, url: redirectUrl });
  }

  return jsonResponse({ success: false, message: 'Verification failed' });
}

