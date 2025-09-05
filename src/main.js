import router from './router.js';

export default {
  fetch: (request, env, ctx) => router.handle(request, env, ctx)
};
