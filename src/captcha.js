import { generateHMAC, jsonResponse } from './utils.js';

export async function generateCaptcha(env) {
  const images = ["img1.jpg", "img2.jpg", "img3.jpg"];
  const selected = images[Math.floor(Math.random() * images.length)];
  const challengeId = crypto.randomUUID();
  const correctPosition = Math.floor(Math.random() * 100);

  await env.CHALLENGES.put(challengeId, correctPosition.toString(), { expirationTtl: 300 });

  return jsonResponse({
    challengeId,
    image: `/images/${selected}`,
    hint: "Slide the puzzle to the correct spot."
  });
}

export async function validateCaptcha(body, env) {
  const { challengeId, position } = body;

  const correctPosition = await env.CHALLENGES.get(challengeId);
  if (!correctPosition) return jsonResponse({ success: false, message: "Expired or invalid challenge" });

  const diff = Math.abs(parseInt(position) - parseInt(correctPosition));
  if (diff <= 5) {
    const token = crypto.randomUUID();
    const hmac = generateHMAC(token);
    await env.TOKENS.put(hmac, token, { expirationTtl: 900 });

    return jsonResponse({ success: true, token: hmac });
  }

  return jsonResponse({ success: false, message: "Verification failed" });
}
