const SECRET_KEY = "super-secret-key";

export async function generateHMAC(data) {
  const keyData = new TextEncoder().encode(data + SECRET_KEY);
  const hashBuffer = await crypto.subtle.digest("SHA-256", keyData);
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
