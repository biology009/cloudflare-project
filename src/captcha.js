import { generatePuzzle, challenges, incrementAttempt, cleanupOldChallenges } from './utils.js';
import { MAX_ATTEMPTS, POSITION_TOLERANCE, REDIRECT_DELAY_MIN, REDIRECT_DELAY_MAX } from './constants.js';

/**
 * Handle CAPTCHA generation request
 * @param {Request} req - The incoming request
 * @param {Env} env - Cloudflare Worker environment
 * @returns {Promise<Response>} JSON response with puzzle data
 */
export async function handleCaptchaRequest(req, env) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    // Validate token parameter
    if (!token) {
      return new Response(JSON.stringify({ 
        error: 'Missing token parameter',
        code: 'TOKEN_REQUIRED'
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if token exists in KV storage
    const shortUrl = await env.REDIRECTS.get(token);
    if (!shortUrl) {
      return new Response(JSON.stringify({ 
        error: 'Invalid or expired token',
        code: 'TOKEN_INVALID'
      }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Generate the puzzle
    const puzzleData = await generatePuzzle();
    if (!puzzleData) {
      return new Response(JSON.stringify({ 
        error: 'Failed to generate puzzle',
        code: 'PUZZLE_GENERATION_FAILED'
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { bgBase64, pieceBase64, position, originalWidth, challengeId } = puzzleData;

    // Store the challenge information with attempt tracking
    challenges.set(challengeId, {
      position,
      token,
      timestamp: Date.now(),
      attempts: 0,
      maxAttempts: MAX_ATTEMPTS,
      shortUrl // Store shortUrl for validation
    });

    // Run cleanup of old challenges
    cleanupOldChallenges();

    // Return puzzle data to client
    return new Response(JSON.stringify({
      success: true,
      challengeId,
      image: bgBase64,
      piece: pieceBase64,
      positionX: position.x,
      positionY: position.y,
      originalWidth,
      maxAttempts: MAX_ATTEMPTS
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      }
    });

  } catch (error) {
    console.error('Error in handleCaptchaRequest:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Handle puzzle validation request
 * @param {Request} req - The incoming request
 * @param {Env} env - Cloudflare Worker environment
 * @returns {Promise<Response>} JSON response with validation result
 */
export async function handleValidateRequest(req, env) {
  try {
    // Parse request body
    let requestData;
    try {
      requestData = await req.json();
    } catch (parseError) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Invalid JSON payload',
        code: 'INVALID_JSON'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { challengeId, position } = requestData;

    // Validate required parameters
    if (!challengeId || !position || typeof position.x !== 'number') {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Missing challengeId or position data',
        code: 'MISSING_PARAMETERS'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if challenge exists
    const challenge = challenges.get(challengeId);
    if (!challenge) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Challenge expired or not found. Please refresh the page.',
        code: 'CHALLENGE_EXPIRED'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if maximum attempts reached
    if (challenge.attempts >= challenge.maxAttempts) {
      // Delete the token from KV to make it unusable
      await env.REDIRECTS.delete(challenge.token);
      
      // Remove the challenge from memory
      challenges.delete(challengeId);
      
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Maximum attempts reached. URL is now invalid.',
        code: 'MAX_ATTEMPTS_REACHED'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Increment attempt counter
    challenge.attempts++;
    challenges.set(challengeId, challenge);

    const correctPosition = challenge.position;
    const currentX = position.x;

    // Check if the position is close enough to the correct position
    const diff = Math.abs(currentX - correctPosition.x);
    const isCorrect = diff <= POSITION_TOLERANCE;

    if (isCorrect) {
      // Verification successful
      const shortUrl = challenge.shortUrl;
      
      // Generate random delay between 1-10 seconds
      const delay = Math.floor(Math.random() * (REDIRECT_DELAY_MAX - REDIRECT_DELAY_MIN + 1)) + REDIRECT_DELAY_MIN;
      
      // Delete the challenge and token from storage
      challenges.delete(challengeId);
      await env.REDIRECTS.delete(challenge.token);
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Verification successful!',
        url: shortUrl,
        delay: delay,
        code: 'VERIFICATION_SUCCESS'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      // Verification failed
      const attemptsLeft = challenge.maxAttempts - challenge.attempts;
      
      // Check if this was the last attempt
      if (attemptsLeft <= 0) {
        // Delete the token from KV to make it unusable
        await env.REDIRECTS.delete(challenge.token);
        
        // Remove the challenge from memory
        challenges.delete(challengeId);
        
        return new Response(JSON.stringify({ 
          success: false, 
          message: 'Maximum attempts reached. URL is now invalid.',
          code: 'MAX_ATTEMPTS_REACHED'
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      return new Response(JSON.stringify({ 
        success: false, 
        message: `Incorrect position. ${attemptsLeft} attempt(s) left.`,
        attemptsLeft: attemptsLeft,
        code: 'VERIFICATION_FAILED'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('Error in handleValidateRequest:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      message: 'Internal server error. Please try again.',
      code: 'INTERNAL_ERROR'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Clean up old challenges (to be called periodically)
 * @param {number} maxAge - Maximum age in milliseconds (default: 30 minutes)
 */
export function cleanChallenges(maxAge = 30 * 60 * 1000) {
  const now = Date.now();
  let deletedCount = 0;
  
  for (const [challengeId, challenge] of challenges.entries()) {
    if (now - challenge.timestamp > maxAge) {
      challenges.delete(challengeId);
      deletedCount++;
    }
  }
  
  if (deletedCount > 0) {
    console.log(`Cleaned up ${deletedCount} old challenges`);
  }
  
  return deletedCount;
}

// Run cleanup every hour
setInterval(() => {
  cleanChallenges();
}, 60 * 60 * 1000);

// Export cleanup function for external use
export { cleanChallenges as cleanupChallenges };
