import { handleCaptchaRequest, handleValidateRequest } from './captcha.js';
import { getHtml } from './utils.js';

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);

    if (url.pathname === '/store-url' && req.method === 'POST') {
      const { token, redirectUrl } = await req.json();
      if (!token || !redirectUrl) {
        return new Response(JSON.stringify({ error: 'Missing token or redirectUrl' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      await env.REDIRECTS.put(token, redirectUrl, { expirationTtl: parseInt(env.TOKEN_TTL || '600') });
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (url.pathname.startsWith('/verify/')) {
      return getHtml('captcha.html');
    }

    if (url.pathname === '/captcha') {
      return handleCaptchaRequest(req, env);
    }

    if (url.pathname === '/validate') {
      return handleValidateRequest(req, env);
    }

    return new Response('Not found', { status: 404 });
  }
};
