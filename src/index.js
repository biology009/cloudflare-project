import { handleCaptchaRequest, handleValidateRequest } from './captcha.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/captcha') {
      return handleCaptchaRequest(request, env);
    }
    if (url.pathname === '/validate') {
      return handleValidateRequest(request, env);
    }
    if (url.pathname.startsWith('/html/captcha')) {
      return new Response(await env.ASSETS.fetch('src/html/captcha.html'), {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    return new Response('Not found', { status: 404 });
  }
};
