import { handleCaptchaRequest, handleValidateRequest } from './captcha.js';
import { getHtml, generateUUID, cleanChallenges } from './utils.js';
import { TOKEN_TTL, CLEANUP_INTERVAL } from './constants.js';

/**
 * Main Cloudflare Worker entry point
 */
export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    try {
      // Handle preflight OPTIONS requests
      if (method === 'OPTIONS') {
        return handleOptions();
      }

      // Store URL endpoint (called from Telegram bot)
      if (path === '/store-url' && method === 'POST') {
        return handleStoreUrl(req, env);
      }

      // Verify endpoint with token expiry check
      if (path.startsWith('/verify/')) {
        return handleVerifyRequest(path, env);
      }

      // Captcha generation endpoint
      if (path === '/captcha' && method === 'GET') {
        return handleCaptchaRequest(req, env);
      }

      // Validation endpoint
      if (path === '/validate' && method === 'POST') {
        return handleValidateRequest(req, env);
      }

      // Serve static assets (images, CSS)
      if (path.startsWith('/assets/')) {
        return serveStaticAsset(path, env);
      }

      // Health check endpoint
      if (path === '/health' && method === 'GET') {
        return new Response(JSON.stringify({ 
          status: 'ok', 
          timestamp: new Date().toISOString(),
          challenges: Array.from(env.challenges?.keys() || []).length
        }), { 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          } 
        });
      }

      // Default 404 response
      return new Response('Not Found', { 
        status: 404,
        headers: { 
          'Content-Type': 'text/plain',
          'Access-Control-Allow-Origin': '*'
        } 
      });

    } catch (error) {
      console.error('Unhandled error in worker:', error);
      return new Response('Internal Server Error', { 
        status: 500,
        headers: { 
          'Content-Type': 'text/plain',
          'Access-Control-Allow-Origin': '*'
        } 
      });
    }
  },

  /**
   * Scheduled event for cleanup (runs periodically)
   */
  async scheduled(event, env, ctx) {
    ctx.waitUntil(cleanChallenges());
    console.log('Ran scheduled cleanup');
  }
};

/**
 * Handle CORS preflight requests
 */
function handleOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    }
  });
}

/**
 * Handle store-url endpoint for storing short URLs
 */
async function handleStoreUrl(req, env) {
  try {
    const { short_url } = await req.json();

    if (!short_url) {
      return new Response(JSON.stringify({ 
        error: 'Missing short_url parameter',
        code: 'SHORT_URL_REQUIRED'
      }), { 
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Generate unique token
    const token = generateUUID();

    // Store the mapping: token → short_url
    await env.REDIRECTS.put(token, short_url, { 
      expirationTtl: TOKEN_TTL 
    });

    // Construct verification URL
    const verifyUrl = `${new URL(req.url).origin}/verify/${token}`;

    return new Response(JSON.stringify({ 
      success: true, 
      token: token,
      verify_url: verifyUrl
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store'
      }
    });

  } catch (error) {
    console.error('Error in handleStoreUrl:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Invalid JSON payload',
      code: 'INVALID_JSON'
    }), { 
      status: 400,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

/**
 * Handle verify endpoint with token validation
 */
async function handleVerifyRequest(path, env) {
  const token = path.split('/').pop();
  
  // Validate token format
  if (!token || !isValidUUID(token)) {
    return showExpiryPage('Invalid token format');
  }

  // Check if token exists and is not expired
  const shortUrl = await env.REDIRECTS.get(token);
  if (!shortUrl) {
    return showExpiryPage('URL Expired!');
  }

  // Token is valid - serve captcha page
  return getHtml('captcha.html');
}

/**
 * Serve static assets (images, CSS, etc.)
 */
async function serveStaticAsset(path, env) {
  try {
    // Remove leading slash from path
    const assetPath = path.substring(1);
    
    // Try to get asset from KV namespace (if using KV for assets)
    let asset;
    try {
      asset = await env.ASSETS.get(assetPath);
    } catch (e) {
      // Fallback to fetching from external source if needed
      console.log('Asset not found in KV, trying external fetch:', assetPath);
    }

    if (!asset) {
      return new Response('Asset not found', { 
        status: 404,
        headers: { 
          'Content-Type': 'text/plain',
          'Access-Control-Allow-Origin': '*'
        } 
      });
    }

    // Determine content type based on file extension
    const contentType = getContentType(assetPath);
    
    return new Response(asset.body, {
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
      }
    });

  } catch (error) {
    console.error('Error serving static asset:', error);
    return new Response('Error loading asset', { 
      status: 500,
      headers: { 
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*'
      } 
    });
  }
}

/**
 * Display expiry page with big font message
 */
function showExpiryPage(message) {
  const expiryHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>URL Expired</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          display: flex; 
          justify-content: center; 
          align-items: center; 
          height: 100vh; 
          margin: 0; 
          background-color: #f5f5f5; 
        }
        .expiry-message { 
          text-align: center; 
          font-size: 32px; 
          font-weight: bold; 
          color: #d32f2f; 
          padding: 20px;
          background: white;
          border-radius: 10px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
      </style>
    </head>
    <body>
      <div class="expiry-message">${message}</div>
    </body>
    </html>
  `;
  
  return new Response(expiryHtml, {
    headers: { 
      'Content-Type': 'text/html',
      'Cache-Control': 'no-store'
    }
  });
}

/**
 * Validate UUID format
 */
function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Get content type based on file extension
 */
function getContentType(filename) {
  const extension = filename.split('.').pop().toLowerCase();
  const contentTypes = {
    'html': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript',
    'json': 'application/json',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'ico': 'image/x-icon',
    'txt': 'text/plain'
  };
  
  return contentTypes[extension] || 'application/octet-stream';
}

// Run cleanup periodically
setInterval(() => {
  cleanChallenges();
  console.log('Periodic cleanup completed');
}, CLEANUP_INTERVAL);
