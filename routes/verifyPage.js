import { htmlResponse, jsonResponse } from '../utils/response.js';
import { logInfo, logWarn } from '../utils/logger.js';

export default async function handleVerifyPage(request, env) {
  const token = request.params.token;
  logInfo(`[verify-page] Token: ${token}`);

  const tokenData = await env.TOKENS_KV.get(token, { type: 'json' });
  if (!tokenData) {
    logWarn(`[verify-page] Invalid or expired token: ${token}`);
    return htmlResponse('<h1>URL expired or invalid.</h1>');
  }

  const htmlAsset = await env.ASSETS.fetch(new Request('/html/verify.html'));
  let html = await htmlAsset.text();

  html = html.replace('{{TOKEN}}', token).replace('{{IMAGE}}', tokenData.image);

  return htmlResponse(html);
}
