// Token generator + store handler all here
function randomToken(len = 12) {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length: len }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

export async function handleStore(request, env, corsHeaders, urlObj) {
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
            ...corsHeaders,
          },
        }
      );
    }

    const token = randomToken();
    await env.SHORT_URLS.put(token, JSON.stringify({ url: originalUrl }));

    const verifyUrl = `${urlObj.origin}/verify/${token}`;

    // ✅ Only show stored original URL + verify URL
    return new Response(
      JSON.stringify({ original_url: originalUrl, verify_url: verifyUrl }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid request body" }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }
}
