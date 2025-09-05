import { Router } from 'itty-router';
import handleStoreUrl from './routes/store-url.js';
import handleVerifyPage from './routes/verify-page.js';
import handleVerifyPuzzle from './routes/verify-puzzle.js';
import handleGetGap from './routes/get-gap.js';

const router = Router();

router.post('/store-url', handleStoreUrl);
router.get('/verify/:token', handleVerifyPage);
router.post('/verify-puzzle', handleVerifyPuzzle);
router.get('/get-gap', handleGetGap);

router.all('*', () => new Response('Not Found', { status: 404 }));

export default router;
