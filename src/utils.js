export async function generateHMAC(data, env) {
  const secretKey = env.SECRET_KEY; // Loaded from Cloudflare Environment Variable
  const enc = new TextEncoder().encode(data + secretKey);
  const hashBuffer = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
