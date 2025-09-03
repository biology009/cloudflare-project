import { generateCaptcha, validateCaptcha } from './captcha.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/captcha") {
      return generateCaptcha(env);
    }

    if (url.pathname === "/validate" && request.method === "POST") {
      const body = await request.json();
      return validateCaptcha(body, env);
    }

    return new Response("Not Found", { status: 404 });
  }
};
