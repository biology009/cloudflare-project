import { generateCaptcha, validateCaptcha } from './captcha.js';
import { jsonResponse } from './utils.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/captcha") {
      return generateCaptcha(env);
    }

    if (url.pathname === "/validate" && request.method === "POST") {
      const body = await request.json();
      return validateCaptcha(body, env);
    }

    if (url.pathname === "/store-url" && request.method === "POST") {
      const { originalUrl } = await request.json();
      const redirectId = crypto.randomUUID();
      await env.REDIRECTS.put(redirectId, originalUrl, { expirationTtl: 900 });
      return jsonResponse({
        verifyUrl: `${url.origin}/verify/${redirectId}`
      });
    }

    if (url.pathname.startsWith("/verify/")) {
      return new Response(await env.ASSETS.fetch("captcha.html"));
    }

    return new Response("Not Found", { status: 404 });
  }
};
