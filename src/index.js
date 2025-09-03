import { generateCaptcha, validateCaptcha } from './captcha.js';
import { jsonResponse } from './utils.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/captcha") {
      return generateCaptcha(env);
    }

    if (url.pathname === "/validate" && request.method === "POST") {
      const body = await request.json();
      return validateCaptcha(body, env);
    }

    return new Response("Not Found", { status: 404 });
  }
};
    return new Response("Not Found", { status: 404 });
  }
};
