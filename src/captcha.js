import { generatePuzzle, challenges } from './utils.js';

// Store short_url in KV with token
export async function handleStoreUrl(req, env) {
  const { short_url } = await req.json();

  if (!short_url) {
    return new Response(JSON.stringify({ error: 'Missing short_url' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const token = crypto.randomUUID();
  await env.REDIRECTS.put(token, short_url, { expirationTtl: parseInt(env.TOKEN_TTL || '1800') });

  return new Response(JSON.stringify({
    verify_url: `${new URL(req.url).origin}/verify/${token}`
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

// Captcha request: return puzzle data
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

  const puzzle = await generatePuzzle(req.url);
  challenges.set(puzzle.challengeId, { x: puzzle.correctX, token });

  return new Response(JSON.stringify(puzzle), {
    headers: { 'Content-Type': 'application/json' }
  });
}

// Validate slider position
export async function handleValidateRequest(req, env) {
  const { challengeId, position } = await req.json();

  const challenge = challenges.get(challengeId);
  if (!challenge) {
    return new Response(JSON.stringify({ success: false, message: 'Challenge expired' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const correctX = challenge.x;
  const diff = Math.abs(position.x - correctX);

  if (diff <= 5) {
    const token = challenge.token;
    const redirectUrl = await env.REDIRECTS.get(token);
    challenges.delete(challengeId);

    return new Response(JSON.stringify({ success: true, url: redirectUrl }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({ success: false, message: 'Incorrect position' }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
