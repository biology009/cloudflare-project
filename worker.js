function randomToken(len = 8) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let token = "";
  for (let i = 0; i < len; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // ----------------------------
    // 1. Store URL → return JSON
    // ----------------------------
    if (path === "/store" && request.method === "POST") {
      try {
        const { url: longUrl } = await request.json();
        if (!longUrl) {
          return new Response(JSON.stringify({ error: "Missing url" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const token = randomToken(12);

        await env.SHORT_URLS.put(
          token,
          JSON.stringify({ url: longUrl }),
          { expirationTtl: 1800 } // 30 minutes
        );

        return new Response(
          JSON.stringify({
            token,
            shortUrl: `${url.origin}/verify/${token}`,
          }),
          { headers: { "Content-Type": "application/json" } }
        );
      } catch (err) {
        return new Response(
          JSON.stringify({ error: "Invalid request" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // ------------------------------------
    // 2. Serve CAPTCHA page with injection
    // ------------------------------------
    if (path.startsWith("/verify/")) {
      const token = path.split("/")[2];
      if (!token) return new Response("Invalid token", { status: 400 });

      // Lookup stored URL
      const stored = await env.SHORT_URLS.get(token, { type: "json" });
      if (!stored) return new Response("Token expired or invalid", { status: 400 });

      // Choose random background image
      const images = [
        "assets/puzzle1.jpg",
        "assets/puzzle2.jpg",
        "assets/puzzle3.jpg",
        "assets/puzzle4.jpg"
      ];
      const chosen = images[Math.floor(Math.random() * images.length)];

      // Random cutout (piece size 50x50)
      const cutX = Math.floor(Math.random() * 200) + 30;
      const cutY = Math.floor(Math.random() * 100) + 30;
      const size = 50;

      // Store captcha data for validation
      await env.SHORT_URLS.put(
        `captcha:${token}`,
        JSON.stringify({ cutX, cutY, size, image: chosen }),
        { expirationTtl: 1800 }
      );

      // Load HTML and inject captcha config
      const html = await env.ASSETS.fetch(new Request(`${url.origin}/index.html`));

      return new HTMLRewriter()
        .on("script#captcha-config", {
          element(el) {
            el.setInnerContent(
              `const captchaConfig = {
                 token: "${token}",
                 image: "${chosen}",
                 cutX: ${cutX},
                 cutY: ${cutY},
                 size: ${size}
               };`,
              { html: true }
            );
          },
        })
        .transform(html);
    }

    // ------------------------------
    // 3. Verification API (AJAX)
    // ------------------------------
    if (path === "/verify-submit" && request.method === "POST") {
      try {
        const { token, userX } = await request.json();

        const captchaData = await env.SHORT_URLS.get(`captcha:${token}`, { type: "json" });
        if (!captchaData) {
          return new Response(JSON.stringify({ success: false, msg: "Expired" }), {
            headers: { "Content-Type": "application/json" },
          });
        }

        const { cutX } = captchaData;
        const ok = Math.abs(userX - cutX) <= 3;

        if (ok) {
          const stored = await env.SHORT_URLS.get(token, { type: "json" });
          if (stored && stored.url) {
            await env.SHORT_URLS.delete(`captcha:${token}`); // cleanup
            return new Response(
              JSON.stringify({ success: true, redirect: stored.url }),
              { headers: { "Content-Type": "application/json" } }
            );
          }
        }

        return new Response(JSON.stringify({ success: false, msg: "Try again" }), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (err) {
        return new Response(
          JSON.stringify({ success: false, msg: "Invalid request" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // ------------------------------
    // 4. Default → static assets
    // ------------------------------
    return env.ASSETS.fetch(request);
  },
};
