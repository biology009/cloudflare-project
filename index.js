import { getAssetFromKV } from "@cloudflare/kv-asset-handler";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname } = url;

    console.log(`[Request] ${request.method} ${pathname}`);

    if (request.method === "POST" && pathname === "/store-url") {
      console.log("[Route] /store-url");
      return handleStoreUrl(request, env);
    }

    if (request.method === "GET" && pathname.startsWith("/verify/")) {
      console.log(`[Route] /verify/:token`);
      const token = pathname.split("/")[2];
      return handleVerifyPage(token, env);
    }

    if (request.method === "POST" && pathname === "/verify-puzzle") {
      console.log("[Route] /verify-puzzle");
      return handleVerifyPuzzle(request, env);
    }

    if (request.method === "GET" && pathname === "/get-gap") {
      console.log("[Route] /get-gap");
      const token = url.searchParams.get("token");
      return handleGetGap(token, env);
    }

    console.log("[Route] Serving static asset");
    try {
      return await getAssetFromKV({ request, waitUntil: ctx.waitUntil.bind(ctx) }, { env });
    } catch (e) {
      console.error("Static asset not found:", e.message);
      return new Response("Not found", { status: 404 });
    }
  }
};

// POST /store-url
async function handleStoreUrl(request, env) {
  try {
    const body = await request.json();
    const { short_url, token } = body;

    console.log(`[store-url] short_url: ${short_url}, token: ${token}`);

    if (!short_url || !token) {
      console.warn("[store-url] Missing short_url or token");
      return jsonResponse({ error: "Missing data" }, 400);
    }

    const images = [
      "img/IMG_20250903_161740_099.jpg",
      "img/IMG_20250903_161801_401.jpg",
      "img/IMG_20250903_161810_656.jpg",
      "img/IMG_20250903_161810_740.jpg"
    ];
    const randomImage = images[Math.floor(Math.random() * images.length)];
    const gap_x = Math.floor(Math.random() * (250 - 50) + 50);

    console.log(`[store-url] Selected image: ${randomImage}, gap_x: ${gap_x}`);

    const tokenData = { short_url, image: randomImage, gap_x, attempts: 0 };
    await env.TOKENS_KV.put(token, JSON.stringify(tokenData), { expirationTtl: parseInt(env.TOKEN_TTL) });

    console.log(`[store-url] Data stored for token: ${token}`);

    return jsonResponse({ verify_url: `${request.url.replace("/store-url", "")}/verify/${token}` });
  } catch (err) {
    console.error("[store-url] Error:", err.message);
    return jsonResponse({ error: err.message }, 500);
  }
}

// GET /verify/:token
async function handleVerifyPage(token, env) {
  console.log(`[verify] Loading page for token: ${token}`);

  const tokenData = await env.TOKENS_KV.get(token, { type: "json" });
  if (!tokenData) {
    console.warn(`[verify] Token not found or expired: ${token}`);
    return new Response("<h1>URL expired or invalid.</h1>", { headers: { "content-type": "text/html" } });
  }

  console.log(`[verify] Token data found: ${JSON.stringify(tokenData)}`);

  const htmlAsset = await env.__STATIC_CONTENT.get("html/verify.html", "text");
  let html = htmlAsset.replace("{{TOKEN}}", token).replace("{{IMAGE}}", tokenData.image);

  return new Response(html, { headers: { "content-type": "text/html" } });
}

// GET /get-gap
async function handleGetGap(token, env) {
  console.log(`[get-gap] Token: ${token}`);

  const tokenData = await env.TOKENS_KV.get(token, { type: "json" });
  if (!tokenData) {
    console.warn(`[get-gap] Token expired: ${token}`);
    return jsonResponse({ error: "expired" }, 404);
  }

  console.log(`[get-gap] gap_x: ${tokenData.gap_x}`);
  return jsonResponse({ gap_x: tokenData.gap_x });
}

// POST /verify-puzzle
async function handleVerifyPuzzle(request, env) {
  const { token, slider_x } = await request.json();
  console.log(`[verify-puzzle] Token: ${token}, slider_x: ${slider_x}`);

  if (!token || slider_x === undefined) {
    console.warn("[verify-puzzle] Missing data");
    return jsonResponse({ error: "Missing data" }, 400);
  }

  const tokenData = await env.TOKENS_KV.get(token, { type: "json" });
  if (!tokenData) {
    console.warn(`[verify-puzzle] Token expired: ${token}`);
    return jsonResponse({ status: "expired" });
  }

  if (tokenData.attempts >= 3) {
    console.warn(`[verify-puzzle] Max attempts reached for token: ${token}`);
    await env.TOKENS_KV.delete(token);
    return jsonResponse({ status: "max_attempts" });
  }

  const tolerance = parseInt(env.TOLERANCE);
  if (Math.abs(slider_x - tokenData.gap_x) <= tolerance) {
    const delay = Math.floor(Math.random() * 10) + 1;
    console.log(`[verify-puzzle] Success! Redirect in ${delay} sec. URL: ${tokenData.short_url}`);
    await env.TOKENS_KV.delete(token);
    return jsonResponse({ status: "ok", redirect: tokenData.short_url, delay });
  } else {
    tokenData.attempts++;
    console.warn(`[verify-puzzle] Wrong position. Attempts left: ${3 - tokenData.attempts}`);
    if (tokenData.attempts >= 3) {
      console.warn(`[verify-puzzle] Deleting token after max attempts`);
      await env.TOKENS_KV.delete(token);
      return jsonResponse({ status: "max_attempts" });
    } else {
      await env.TOKENS_KV.put(token, JSON.stringify(tokenData), { expirationTtl: parseInt(env.TOKEN_TTL) });
      return jsonResponse({ status: "wrong", attempts_left: 3 - tokenData.attempts });
    }
  }
}

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });
}
