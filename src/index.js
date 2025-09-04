import { generateCaptcha, validateCaptcha } from './captcha.js';
import { jsonResponse } from './utils.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Serve static assets directly
    if (path.startsWith('/img/') || path.startsWith('/html/')) {
      return env.ASSETS.fetch(request);
    }

    // Create a captcha challenge (JSON)
    if (path === '/captcha') {
      return generateCaptcha(env);
    }

    // Validate captcha (JSON)
    if (path === '/validate' && request.method === 'POST') {
      try {
        const body = await request.json();
        return validateCaptcha(body, env);
      } catch {
        return jsonResponse({ success: false, message: 'Invalid JSON' }, 400);
      }
    }

    // Store short URL and return verification link
    if (path === '/store-url' && request.method === 'POST') {
      try {
        const { short_url } = await request.json();
        if (!short_url) {
          return jsonResponse({ error: 'short_url is required' }, 400);
        }

        const token = crypto.randomUUID();
        await env.REDIRECTS.put(token, short_url, { expirationTtl: 900 }); // 15 min

        return jsonResponse({
          verify_url: `${url.origin}/verify/${token}`
        });
      } catch {
        return jsonResponse({ error: 'Internal server error' }, 500);
      }
    }

    // Serve verification page after token check
    if (path.startsWith('/verify/')) {
      const token = path.split('/').pop();
      if (!token) {
        return new Response('Invalid token', { status: 400 });
      }

      const redirectUrl = await env.REDIRECTS.get(token);
      if (!redirectUrl) {
        return new Response('Token expired or invalid', { status: 404 });
      }

      // Serve /html/captcha.html explicitly
      const assetReq = new Request(new URL('/html/captcha.html', url).toString(), request);
      return env.ASSETS.fetch(assetReq);
    }

    return new Response('Not Found', { status: 404 });
  }
};
