export function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

export function htmlResponse(html, status = 200) {
  return new Response(html, {
    status,
    headers: { 'Content-Type': 'text/html' }
  });
}
