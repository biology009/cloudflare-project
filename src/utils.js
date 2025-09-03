const SECRET_KEY = "super-secret-key";

export function generateHMAC(data) {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(data + SECRET_KEY))
    .then(hash => Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join(''));
}

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
