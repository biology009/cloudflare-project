import { Router } from 'itty-router';
import { logInfo } from './utils/logger.js';
import handleStoreUrl from './routes/storeUrl.js';
import handleVerifyPage from './routes/verifyPage.js';
import handleGetGap from './routes/getGap.js';
import handleVerifyPuzzle from './routes/verifyPuzzle.js';

const router = Router();

router.post('/store-url', handleStoreUrl);
router.get('/verify/:token', handleVerifyPage);
router.get('/get-gap', handleGetGap);
router.post('/verify-puzzle', handleVerifyPuzzle);

router.all('*', async (request, env) => {
  logInfo('Serving static asset');
  return env.ASSETS.fetch(request);
});

export default {
  async fetch(request, env, ctx) {
    logInfo(`[Request] ${request.method} ${request.url}`);
    return router.handle(request, env, ctx);
  }
};
