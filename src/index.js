import { handleCaptchaRequest, handleValidateRequest, handleStoreUrl } from './captcha.js';
import { getHtml } from './utils.js';

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);

    // Store URL for verification
    if (url.pathname === '/store-url' && req.method === 'POST') {
      return handleStoreUrl(req, env);
    }

    // Serve captcha page
    if (url.pathname.startsWith('/verify/')) {
      return getHtml('captcha.html');
    }

    // Captcha JSON (background + piece)
    if (url.pathname === '/captcha') {
      return handleCaptchaRequest(req, env);
    }

    // Validate slider position
    if (url.pathname === '/validate') {
      return handleValidateRequest(req, env);
    }

    return new Response('Not Found', { status: 404 });
  }
};
