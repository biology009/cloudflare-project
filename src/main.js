import { Router } from 'itty-router';
import { logInfo } from './utils/logger';
import storeUrl from './routes/store-url';
import verifyPage from './routes/verify-page';
import getGap from './routes/get-gap';
import verifyPuzzle from './routes/verify-puzzle';

const router = Router();

// Routes
router.post('/store-url', storeUrl);
router.get('/verify/:token', verifyPage);
router.get('/get-gap', getGap);
router.post('/verify-puzzle', verifyPuzzle);

// Default: serve static assets
router.all('*', async (request, env) => {
  logInfo('Static asset request', { url: request.url });
  return env.ASSETS.fetch(request);
});

export default {
  async fetch(request, env, ctx) {
    logInfo('Incoming request', { method: request.method, url: request.url });
    return router.handle(request, env, ctx);
  }
};
