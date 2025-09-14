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
    const { pathname } = new URL(request.url);

    if (request.method === "POST" && pathname === "/store") {
      try {
        const body = await request.json();
        const url = body.url;

        if (!url) {
          return new Response(
            JSON.stringify({ error: "Missing 'url' in request" }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }

        // Generate random token
        const token = crypto.randomUUID();

        // Store mapping in KV
        await env.URL_KV.put(token, url);

        // Build verify URL
        const verifyUrl = `${new URL(request.url).origin}/verify/${token}`;

        // 🔥 Log everything for debugging
        console.log("📌 Storing new URL in KV");
        console.log("➡️ Original URL:", url);
        console.log("🔑 Generated Token:", token);
        console.log("🔗 Verify URL:", verifyUrl);

        return new Response(
          JSON.stringify({ token, verify_url: verifyUrl }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      } catch (err) {
        console.error("❌ Error in /store:", err.message);
        return new Response(
          JSON.stringify({ error: "Invalid request body" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    if (request.method === "GET" && pathname.startsWith("/verify/")) {
      const token = pathname.split("/verify/")[1];
      if (!token) {
        return new Response("Token missing", { status: 400 });
      }

      const originalUrl = await env.URL_KV.get(token);

      if (!url) {
        return new Response("Invalid or expired token", { status: 404 });
      }

      // 🔥 Log verification hit
      console.log("✅ Token verified:", token, "➡️ Redirecting to:", url);

      return Response.redirect(url, 302);
    }

    return new Response("Not found", { status: 404 });
  },
};


      // ------------------------------------
      // 2. Serve CAPTCHA page with injection
      // ------------------------------------
      if (path.startsWith("/verify/")) {
        try {
          const token = path.split("/")[2];
          if (!token) throw new Error("Missing token in URL");

          const stored = await env.SHORT_URLS.get(token, { type: "json" });
          if (!stored) throw new Error("Token expired or invalid");

          const images = [
            "assets/puzzle1.jpg",
            "assets/puzzle2.jpg",
            "assets/puzzle3.jpg",
            "assets/puzzle4.jpg"
          ];
          const chosen = images[Math.floor(Math.random() * images.length)];

          const cutX = Math.floor(Math.random() * 200) + 30;
          const cutY = Math.floor(Math.random() * 100) + 30;
          const size = 50;

          await env.SHORT_URLS.put(
            `captcha:${token}`,
            JSON.stringify({ cutX, cutY, size, image: chosen }),
            { expirationTtl: 1800 }
          );

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
        } catch (err) {
          console.error("Error in /verify:", err);
          return new Response("Captcha setup failed", { status: 500 });
        }
      }

      // ------------------------------
      // 3. Verification API (AJAX)
      // ------------------------------
      if (path === "/verify-submit" && request.method === "POST") {
        try {
          const { token, userX } = await request.json();
          if (!token || typeof userX !== "number") {
            throw new Error("Invalid request body");
          }

          const captchaData = await env.SHORT_URLS.get(`captcha:${token}`, { type: "json" });
          if (!captchaData) throw new Error("Captcha expired or not found");

          const { cutX } = captchaData;
          const ok = Math.abs(userX - cutX) <= 3;

          if (ok) {
            const stored = await env.SHORT_URLS.get(token, { type: "json" });
            if (stored && stored.url) {
              await env.SHORT_URLS.delete(`captcha:${token}`);
              return new Response(
                JSON.stringify({ success: true, redirect: stored.url }),
                { headers: { "Content-Type": "application/json" } }
              );
            }
            throw new Error("Stored URL not found for token");
          }

          return new Response(JSON.stringify({ success: false, msg: "Try again" }), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          console.error("Error in /verify-submit:", err);
          return new Response(
            JSON.stringify({ success: false, msg: "Verification failed" }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }
      }

      // ------------------------------
      // 4. Default → static assets
      // ------------------------------
      return env.ASSETS.fetch(request);

    } catch (err) {
      console.error("Top-level error:", err);
      return new Response("Internal server error", { status: 500 });
    }
  },
};
