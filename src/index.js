import { generateCaptcha, validateCaptcha } from './captcha.js';
import { jsonResponse } from './utils.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      });
    }

    if (url.pathname === "/captcha") {
      const res = await generateCaptcha(env);
      res.headers.set("Access-Control-Allow-Origin", "*");
      return res;
    }

    if (url.pathname === "/validate" && request.method === "POST") {
      const body = await request.json();
      const res = await validateCaptcha(body, env);
      res.headers.set("Access-Control-Allow-Origin", "*");
      return res;
    }

    // Serve HTML as default page
    if (url.pathname === "/" || url.pathname === "/captcha.html") {
      return env.ASSETS.fetch(request); // Requires Wrangler site bucket config
    }

    return new Response("Not Found", { status: 404 });
  }
};
