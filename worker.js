export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // ---- Serve CAPTCHA page ----
    if (path.startsWith("/verify/")) {
      const token = path.split("/")[2];
      if (!token) return new Response("Invalid token", { status: 400 });

      // Lookup original URL
      const stored = await env.SHORT_URLS.get(token, { type: "json" });
      if (!stored) return new Response("Token expired or invalid", { status: 400 });

      // Choose random image
      const images = ["assets/puzzle1.jpg", "assets/puzzle2.jpg", "assets/puzzle3.jpg", "assets/puzzle4.jpg"];
      const chosen = images[Math.floor(Math.random() * images.length)];

      // Random cutout (50x50 piece)
      const cutX = Math.floor(Math.random() * 200) + 30;
      const cutY = Math.floor(Math.random() * 100) + 30;
      const size = 50;

      // Store captcha data in KV (expires in 30 mins)
      await env.SHORT_URLS.put(
        `captcha:${token}`,
        JSON.stringify({ cutX, cutY, size, image: chosen }),
        { expirationTtl: 1800 }
      );

      // Serve HTML with injected config
      const html = await env.ASSETS.fetch("https://your-worker-url/index.html");
      return new HTMLRewriter()
        .on("script", {
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

    // ---- Verification API ----
    if (path === "/verify-submit" && request.method === "POST") {
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
    }

    // ---- Default: static files ----
    return env.ASSETS.fetch(request);
  },
};
