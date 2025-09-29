function randomToken(len = 12) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export default {
  async fetch(request, env, ctx) {
    const urlObj = new URL(request.url);
    const path = urlObj.pathname;

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (path.startsWith("/store")) {
      return handleStore(request, env, corsHeaders, urlObj);
    }

    if (path.startsWith("/verify/")) {
      const token = path.split("/verify/")[1];
      const stored = await env.SHORT_URLS.get(token);

      if (!stored) {
        return new Response(JSON.stringify({ error: "Token expired" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const { url } = JSON.parse(stored);
      return new Response(JSON.stringify({ url }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response("Not found", { status: 404 });
  },
};

async function handleStore(request, env, corsHeaders, urlObj) {
  try {
    const body = await request.json();
    const originalUrl = body.url;

    if (!originalUrl) {
      return new Response(JSON.stringify({ error: "Missing 'url'" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const token = randomToken();
    await env.SHORT_URLS.put(token, JSON.stringify({ url: originalUrl }));
    const verifyUrl = `${urlObj.origin}/verify/${token}`;

    return new Response(JSON.stringify({ original_url: originalUrl, verify_url: verifyUrl }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
}
