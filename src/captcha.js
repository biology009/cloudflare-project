import { generatePuzzle, challenges } from './utils.js';

export async function handleCaptchaRequest(req, env) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');

  if (!token) {
    return new Response(JSON.stringify({ error: 'Missing token' }), { status: 400 });
  }

  const redirectUrl = await env.REDIRECTS.get(token);
  if (!redirectUrl) {
    return new Response(JSON.stringify({ error: 'Invalid or expired token' }), { status: 404 });
  }

  const { bgBase64, pieceBase64, position, originalWidth, challengeId } = await generatePuzzle();

  challenges.set(challengeId, { position, redirectUrl });

  return new Response(JSON.stringify({
    challengeId,
    image: bgBase64,
    piece: pieceBase64,
    positionX: position.x,
    originalWidth
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function handleValidateRequest(req, env) {
  const { challengeId, position } = await req.json();
  const challenge = challenges.get(challengeId);

  if (!challenge) {
    return new Response(JSON.stringify({ success: false, message: 'Challenge expired' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const correct = challenge.position;
  const redirectUrl = challenge.redirectUrl;

  const diff = Math.abs(position.x - correct.x);
  if (diff <= 5) {
    challenges.delete(challengeId);
    return new Response(JSON.stringify({ success: true, url: redirectUrl }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({ success: false, message: 'Incorrect position' }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
