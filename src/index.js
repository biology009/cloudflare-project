import { generateCaptcha, validateCaptcha } from './captcha.js';
import { jsonResponse } from './utils.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Generate captcha
    if (url.pathname === "/captcha") {
      return generateCaptcha(env);
    }

    // Validate captcha
    if (url.pathname === "/validate" && request.method === "POST") {
      const body = await request.json();
      return validateCaptcha(body, env);
    }

    // Store shortened URL and return verification link
    if (url.pathname === "/store-url" && request.method === "POST") {
      const body = await request.json();
      const shortUrl = body.short_url;

      if (!shortUrl) return jsonResponse({ error: "Missing short_url" }, 400);

      const id = crypto.randomUUID();
      await env.REDIRECTS.put(id, shortUrl, { expirationTtl: 900 });

      const verifyUrl = `${url.origin}/verify/${id}`;
      return jsonResponse({ verify_url: verifyUrl });
    }

    // Serve verification page
    if (url.pathname.startsWith("/verify/")) {
      const id = url.pathname.split("/").pop();
      const shortUrl = await env.REDIRECTS.get(id);
      if (!shortUrl) return new Response("Invalid or expired link", { status: 404 });

      // Serve captcha page but inject the ID dynamically
      const html = await env.ASSETS.fetch("https://your-worker-url/captcha.html");
      let content = await html.text();
      content = content.replace("{{CHALLENGE_ID}}", id);
      return new Response(content, { headers: { "Content-Type": "text/html" } });
    }

    return new Response("Not Found", { status: 404 });
  }
};
