export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname } = url;

    // ROUTES
    if (request.method === "POST" && pathname === "/store-url") {
      return handleStoreUrl(request, env);
    }

    if (request.method === "GET" && pathname.startsWith("/verify/")) {
      const token = pathname.split("/")[2];
      return handleVerifyPage(token, env);
    }

    if (request.method === "POST" && pathname === "/verify-puzzle") {
      return handleVerifyPuzzle(request, env);
    }

    if (request.method === "GET" && pathname === "/get-gap") {
      const token = url.searchParams.get("token");
      return handleGetGap(token, env);
    }

    // Serve static assets (CSS, JS, images)
    return env.ASSETS.fetch(request);
  }
};

// POST /store-url
async function handleStoreUrl(request, env) {
  try {
    const body = await request.json();
    const { short_url, token } = body;

    if (!short_url || !token) {
      return jsonResponse({ error: "Missing short_url or token" }, 400);
    }

    const images = [
      "img/IMG_20250903_161740_099.jpg",
      "img/IMG_20250903_161801_401.jpg",
      "img/IMG_20250903_161810_656.jpg",
      "img/IMG_20250903_161810_740.jpg"
    ];
    const randomImage = images[Math.floor(Math.random() * images.length)];

    const gap_x = Math.floor(Math.random() * (250 - 50) + 50); // 50-250 px

    const tokenData = {
      short_url,
      image: randomImage,
      gap_x,
      attempts: 0
    };

    await env.TOKENS_KV.put(token, JSON.stringify(tokenData), {
      expirationTtl: parseInt(env.TOKEN_TTL || "1800") // 30 min
    });

    return jsonResponse({
      verify_url: `${request.url.replace("/store-url", "")}/verify/${token}`
    });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

// GET /verify/:token
async function handleVerifyPage(token, env) {
  const tokenData = await env.TOKENS_KV.get(token, { type: "json" });
  if (!tokenData) {
    return new Response(`<h1>URL expired or invalid.</h1>`, {
      headers: { "content-type": "text/html" }
    });
  }

  const htmlAsset = await env.ASSETS.fetch(new Request("/html/verify.html"));
  let html = await htmlAsset.text();

  html = html.replace("{{TOKEN}}", token).replace("{{IMAGE}}", tokenData.image);

  return new Response(html, { headers: { "content-type": "text/html" } });
}

// GET /get-gap?token=
async function handleGetGap(token, env) {
  const tokenData = await env.TOKENS_KV.get(token, { type: "json" });
  if (!tokenData) return jsonResponse({ error: "expired" }, 404);

  return jsonResponse({ gap_x: tokenData.gap_x });
}

// POST /verify-puzzle
async function handleVerifyPuzzle(request, env) {
  const { token, slider_x } = await request.json();
  if (!token || slider_x === undefined) {
    return jsonResponse({ error: "Missing token or slider_x" }, 400);
  }

  const tokenData = await env.TOKENS_KV.get(token, { type: "json" });
  if (!tokenData) {
    return jsonResponse({ status: "expired" });
  }

  if (tokenData.attempts >= 3) {
    await env.TOKENS_KV.delete(token);
    return jsonResponse({ status: "max_attempts" });
  }

  const tolerance = parseInt(env.TOLERANCE || "5");
  if (Math.abs(slider_x - tokenData.gap_x) <= tolerance) {
    const delay = Math.floor(Math.random() * 10) + 1;
    await env.TOKENS_KV.delete(token);
    return jsonResponse({ status: "ok", redirect: tokenData.short_url, delay });
  } else {
    tokenData.attempts += 1;
    if (tokenData.attempts >= 3) {
      await env.TOKENS_KV.delete(token);
      return jsonResponse({ status: "max_attempts" });
    } else {
      await env.TOKENS_KV.put(token, JSON.stringify(tokenData), {
        expirationTtl: parseInt(env.TOKEN_TTL || "1800")
      });
      return jsonResponse({
        status: "wrong",
        attempts_left: 3 - tokenData.attempts
      });
    }
  }
}

// Utility
function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
