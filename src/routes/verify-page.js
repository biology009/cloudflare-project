import { logInfo } from '../utils/logger';

export default async function verifyPage(request, env) {
  const token = request.params.token;
  const tokenData = await env.TOKENS_KV.get(token, { type: 'json' });

  if (!tokenData) {
    return new Response('<h1>URL expired or invalid.</h1>', {
      headers: { 'Content-Type': 'text/html' }
    });
  }

  const htmlAsset = await env.ASSETS.fetch(new Request('/verify.html'));
  let html = await htmlAsset.text();

  html = html.replace('{{TOKEN}}', token).replace('{{IMAGE}}', tokenData.image);

  logInfo('[verify-page] Page rendered', { token });

  return new Response(html, { headers: { 'Content-Type': 'text/html' } });
}
