function randomToken(len = 12) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export default {
  async fetch(request, env, ctx) {
    try {
      const urlObj = new URL(request.url);
      const path = urlObj.pathname;

      // Add CORS headers for cross-origin flexibility
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      };

      // Handle preflight requests  
      if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
      }

      // 1. Store URL → KV
      if (request.method === "POST" && path === "/store") {
        try {
          const body = await request.json();

          const originalUrl = body.url;
          if (!originalUrl) {
            return new Response(
              JSON.stringify({ error: "Missing 'url' in request" }),
              { 
                status: 400, 
                headers: { 
                  "Content-Type": "application/json",
                  ...corsHeaders
                } 
              }
            );
          }

          const token = randomToken();
          await env.SHORT_URLS.put(token, JSON.stringify({ url: originalUrl }));

          const verifyUrl = `${urlObj.origin}/verify/${token}`;

          return new Response(
            JSON.stringify({ token, verify_url: verifyUrl }),
            { 
              status: 200, 
              headers: { 
                "Content-Type": "application/json",
                ...corsHeaders
              } 
            }
          );
        } catch (err) {
          return new Response(
            JSON.stringify({ error: "Invalid request body" }),
            { 
              status: 400, 
              headers: { 
                "Content-Type": "application/json",
                ...corsHeaders
              } 
            }
          );
        }
      }

      // 2. Serve CAPTCHA page
      if (path.startsWith("/verify/")) {
        const token = path.split("/")[2];
        if (!token) return new Response("Missing token", { 
          status: 400,
          headers: corsHeaders
        });

        const stored = await env.SHORT_URLS.get(token, { type: "json" });
        if (!stored || !stored.url) {
          return new Response("Invalid or expired token", { 
            status: 404,
            headers: corsHeaders
          });
        }

        const images = [
          "/assets/puzzle1.jpg", 
          "/assets/puzzle2.jpg", 
          "/assets/puzzle3.jpg", 
          "/assets/puzzle4.jpg"
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

        // Fetch index.html
        let html = await env.ASSETS.fetch(new Request('/index.html', request));
        if (!html || !html.ok) {
          html = await env.ASSETS.fetch(new Request('index.html', request));
        }
        if (!html || !html.ok) {
          return new Response("CAPTCHA page not found", { 
            status: 404,
            headers: corsHeaders
          });
        }

        // FIX: Use absolute URL for the image
        const absoluteImageUrl = `${urlObj.origin}${chosen}`;
        const configScript = `
          <script id="captcha-config">
            const captchaConfig = {
              token: "${token}",
              image: "${absoluteImageUrl}",
              cutX: ${cutX},
              cutY: ${cutY},
              size: ${size}
            };
          </script>
        `;

        // Inject config into <head>
        return new HTMLRewriter()
          .on('head', {
            element(element) {
              element.append(configScript, { html: true });
            }
          })
          .transform(html);
      }

      // 3. Verify captcha (AJAX)
      if (path === "/verify-submit" && request.method === "POST") {
        try {
          const { token, userX } = await request.json();

          const captchaData = await env.SHORT_URLS.get(`captcha:${token}`, { type: "json" });
          if (!captchaData) {
            return new Response(
              JSON.stringify({ success: false, msg: "Captcha expired" }),
              { 
                status: 400, 
                headers: { 
                  "Content-Type": "application/json",
                  ...corsHeaders
                } 
              }
            );
          }

          const ok = Math.abs(userX - captchaData.cutX) <= 3;
          if (ok) {
            const stored = await env.SHORT_URLS.get(token, { type: "json" });
            if (stored && stored.url) {
              await env.SHORT_URLS.delete(`captcha:${token}`);
              return new Response(
                JSON.stringify({ success: true, redirect: stored.url }),
                { 
                  headers: { 
                    "Content-Type": "application/json",
                    ...corsHeaders
                  } 
                }
              );
            }
          }

          return new Response(
            JSON.stringify({ success: false, msg: "Try again" }),
            { 
              headers: { 
                "Content-Type": "application/json",
                ...corsHeaders
              } 
            }
          );
        } catch (error) {
          return new Response(
            JSON.stringify({ success: false, msg: "Server error" }),
            { 
              status: 500, 
              headers: { 
                "Content-Type": "application/json",
                ...corsHeaders
              } 
            }
          );
        }
      }

      // 4. Serve static assets for all other requests
      return env.ASSETS.fetch(request);

    } catch (err) {
      console.error("Worker error:", err);
      return new Response("Internal server error", { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'text/plain'
        }
      });
    }
  },
};
