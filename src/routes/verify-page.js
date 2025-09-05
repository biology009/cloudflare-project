import { logInfo, logError } from '../utils/logger.js';

export default async function handleVerifyPage(request, env) {
  try {
    const token = request.params.token;
    const tokenData = await env.TOKENS_KV.get(token, { type: 'json' });

    if (!tokenData) {
      logError(`Invalid token: ${token}`);
      return new Response('<h1>URL expired or invalid.</h1>', {
        headers: { 'content-type': 'text/html' }
      });
    }

    const htmlAsset = await env.ASSETS.fetch(new Request('/verify.html'));
    let html = await htmlAsset.text();

    html = html.replace('{{TOKEN}}', token).replace('{{IMAGE}}', tokenData.image);

    logInfo(`Verify page served for token: ${token}`);

    return new Response(html, { headers: { 'content-type': 'text/html' } });
  } catch (err) {
    logError(`Error in verify-page: ${err.message}`);
    return new Response('<h1>Internal Server Error</h1>', { status: 500 });
  }
}
