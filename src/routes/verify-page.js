import { logInfo, logError } from "../utils/logger.js";

export async function verifyPageHandler(request, env) {
  try {
    const { token } = request.params;
    if (!token) return new Response("Invalid token", { status: 400 });

    const data = await env.TOKENS_KV.get(token);
    if (!data) return new Response("Invalid or expired token", { status: 404 });

    const parsed = JSON.parse(data);
    const html = await fetch(new URL("../html/verify.html", import.meta.url)).then(res => res.text());

    const page = html
      .replace("{{IMAGE}}", parsed.image)
      .replace("{{TOKEN}}", token);

    logInfo("verify-page", `Loaded page for token ${token}`);
    return new Response(page, {
      headers: { "Content-Type": "text/html" }
    });
  } catch (err) {
    logError("verify-page", err.message);
    return new Response("Server error", { status: 500 });
  }
}
