import { generateHMAC, jsonResponse } from './utils.js';

export async function generateCaptcha(env) {
  const images = [
    "IMG_20250903_161740_099.jpg",
    "IMG_20250903_161801_401.jpg",
    "IMG_20250903_161810_656.jpg",
    "IMG_20250903_161810_740.jpg"
  ];
  const selected = images[Math.floor(Math.random() * images.length)];
  const challengeId = crypto.randomUUID();
  const correctPosition = Math.floor(Math.random() * 100);

  await env.CHALLENGES.put(challengeId, correctPosition.toString(), { expirationTtl: 300 });

  return jsonResponse({
    challengeId,
    image: `/img/${selected}`,
    hint: "Slide the puzzle to the correct spot."
  });
}

export async function validateCaptcha(body, env) {
  const { challengeId, position, redirectId } = body;
  const correctPosition = await env.CHALLENGES.get(challengeId);
  if (!correctPosition) return jsonResponse({ success: false, message: "Expired or invalid challenge" });

  const diff = Math.abs(parseInt(position) - parseInt(correctPosition));
  if (diff <= 5) {
    const redirectUrl = await env.REDIRECTS.get(redirectId);
    if (!redirectUrl) return jsonResponse({ success: false, message: "Redirect expired" });

    return jsonResponse({ success: true, url: redirectUrl });
  }

  return jsonResponse({ success: false, message: "Verification failed" });
}
