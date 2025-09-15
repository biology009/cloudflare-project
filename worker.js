function randomToken(len = 12) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export default {
  async fetch(request, env, ctx) {
    try {
      const urlObj = new URL(request.url);
      const path = urlObj.pathname;

      // ------------------------------
      // 1. Store URL → KV
      // ------------------------------
      if (request.method === "POST" && path === "/store") {
        try {
          const body = await request.json();
          console.log("📩 Incoming JSON:", body);

          const originalUrl = body.url;
          if (!originalUrl) {
            return new Response(
              JSON.stringify({ error: "Missing 'url' in request" }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          const token = randomToken();
          await env.SHORT_URLS.put(token, JSON.stringify({ url: originalUrl }));

          const verifyUrl = `${urlObj.origin}/verify/${token}`;

          console.log("➡️ Original URL:", originalUrl);
          console.log("🔑 Generated Token:", token);
          console.log("🔗 Verify URL:", verifyUrl);
          console.log("💾 Stored in KV:", { token, url: originalUrl });

          return new Response(
            JSON.stringify({ token, verify_url: verifyUrl }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        } catch (err) {
          console.error("❌ Error in /store:", err);
          return new Response(
            JSON.stringify({ error: "Invalid request body" }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }
      }

      // ------------------------------
      // 2. Serve CAPTCHA page
      // ------------------------------
      if (path.startsWith("/verify/")) {
        const token = path.split("/")[2];
        if (!token) return new Response("Missing token", { status: 400 });

        const stored = await env.SHORT_URLS.get(token, { type: "json" });
        console.log("🔍 KV lookup:", token, "→", stored);

        if (!stored || !stored.url) {
          return new Response("Invalid or expired token", { status: 404 });
        }

        const images = ["assets/puzzle1.jpg", "assets/puzzle2.jpg", "assets/puzzle3.jpg", "assets/puzzle4.jpg"];
        const chosen = images[Math.floor(Math.random() * images.length)];
        const cutX = Math.floor(Math.random() * 200) + 30;
        const cutY = Math.floor(Math.random() * 100) + 30;
        const size = 50;

        await env.SHORT_URLS.put(
          `captcha:${token}`,
          JSON.stringify({ cutX, cutY, size, image: chosen }),
          { expirationTtl: 1800 }
        );

        const html = await env.ASSETS.fetch(new Request(`${urlObj.origin}/index.html`));

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
      // 3. Verify captcha (AJAX)
      // ------------------------------
      if (path === "/verify-submit" && request.method === "POST") {
        const { token, userX } = await request.json();
        console.log("📩 /verify-submit body:", { token, userX });

        const captchaData = await env.SHORT_URLS.get(`captcha:${token}`, { type: "json" });
        console.log("🔍 Captcha data:", captchaData);

        if (!captchaData) return new Response("Captcha expired", { status: 400 });

        const ok = Math.abs(userX - captchaData.cutX) <= 3;
        if (ok) {
          const stored = await env.SHORT_URLS.get(token, { type: "json" });
          console.log("🔍 Stored data on success:", stored);

          if (stored && stored.url) {
            await env.SHORT_URLS.delete(`captcha:${token}`);
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

      // ------------------------------
      // 4. Static assets
      // ------------------------------
      return env.ASSETS.fetch(request);

    } catch (err) {
      console.error("🔥 Top-level error:", err);
      return new Response("Internal server error", { status: 500 });
    }
  },
};
