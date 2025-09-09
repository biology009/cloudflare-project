import { TOKEN_TTL } from './constants.js';

// In-memory store for active challenges
export const challenges = new Map();

/**
 * Generate a UUID v4 string
 * @returns {string} UUID v4 string
 */
export function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Generate a puzzle with background and piece
 * @returns {Promise<Object>} Puzzle data object
 */
export async function generatePuzzle() {
  try {
    // Select a random puzzle image from available assets
    const imageNumber = Math.floor(Math.random() * 3) + 1; // 1-3
    const imagePath = `/assets/images/puzzle${imageNumber}.jpg`;
    
    // In a real implementation, you would:
    // 1. Load the image
    // 2. Create a canvas to manipulate it
    // 3. Extract a puzzle piece from a random position
    // 4. Create a modified background with the piece missing
    
    // For this example, we'll use placeholder base64 images
    // In production, you would generate these dynamically
    
    const originalWidth = 400;
    const originalHeight = 250;
    
    // Generate random position for the puzzle piece
    const position = {
      x: Math.floor(Math.random() * (originalWidth - 80)) + 20, // 20-340
      y: Math.floor(Math.random() * (originalHeight - 80)) + 20  // 20-170
    };
    
    // Generate unique challenge ID
    const challengeId = generateUUID();
    
    // Placeholder base64 images (replace with actual image processing)
    const bgBase64 = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjI1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkZGRkIiAvPgogIDxyZWN0IHg9IjIwIiB5PSIyMCIgd2lkdGg9IjM2MCIgaGVpZ2h0PSIyMTAiIGZpbGw9IiNmNWY1ZjUiIHN0cm9rZT0iI2NjYyIgc3Ryb2tlLXdpZHRoPSIxIi8+CiAgPHRleHQgeD0iMjAwIiB5PSIxMjUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIyMCIgZmlsbD0iIzY2NiIgdGV4dC1hbmNob3I9Im1pZGRsZSI+UHV6emxlIEJhY2tncm91bmQ8L3RleHQ+Cjwvc3ZnPg==";
    
    const pieceBase64 = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iIzQ0Q0ZGIiBzdHJva2U9IiMzMzliZmYiIHN0cm9rZS13aWR0aD0iMiIvPgogIDx0ZXh0IHg9IjMwIiB5PSIzMCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+UElFQ0U8L3RleHQ+Cjwvc3ZnPg==";

    return {
      bgBase64,
      pieceBase64,
      position,
      originalWidth,
      challengeId
    };
    
  } catch (error) {
    console.error('Error generating puzzle:', error);
    throw new Error('Failed to generate puzzle');
  }
}

/**
 * Increment attempt counter for a challenge
 * @param {string} challengeId - The challenge ID
 * @returns {number} New attempt count
 */
export function incrementAttempt(challengeId) {
  const challenge = challenges.get(challengeId);
  if (!challenge) {
    throw new Error('Challenge not found');
  }
  
  challenge.attempts += 1;
  challenges.set(challengeId, challenge);
  
  return challenge.attempts;
}

/**
 * Clean up old challenges from memory
 * @param {number} maxAge - Maximum age in milliseconds (default: 30 minutes)
 * @returns {number} Number of challenges cleaned up
 */
export function cleanupOldChallenges(maxAge = 30 * 60 * 1000) {
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

/**
 * Get HTML content for serving
 * @param {string} fileName - The HTML file name
 * @returns {Promise<Response>} HTML response
 */
export async function getHtml(fileName) {
  try {
    // In a real implementation, you would read from file system or KV
    // For this example, we'll return the HTML content directly
    
    if (fileName === 'captcha.html') {
      const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Puzzle Verification</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 20px;
  }
  
  .container {
    background: white;
    border-radius: 16px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    padding: 30px;
    max-width: 500px;
    width: 100%;
    text-align: center;
  }
  
  h1 {
    color: #333;
    margin-bottom: 10px;
    font-size: 28px;
  }
  
  .instructions {
    color: #666;
    margin-bottom: 25px;
    font-size: 16px;
    line-height: 1.5;
  }
  
  .puzzle-container {
    position: relative;
    width: 100%;
    height: 250px;
    margin: 20px 0;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    overflow: hidden;
    background: #f8f9fa;
  }
  
  .bg {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  .piece {
    position: absolute;
    top: 0;
    left: 0;
    cursor: grab;
    border: 2px solid #fff;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    border-radius: 4px;
    transition: transform 0.1s ease;
  }
  
  .piece:active {
    cursor: grabbing;
    transform: scale(1.05);
  }
  
  .slider-container {
    width: 100%;
    margin: 20px 0;
    padding: 0 10px;
  }
  
  .slider {
    width: 100%;
    height: 8px;
    -webkit-appearance: none;
    appearance: none;
    background: #e0e0e0;
    border-radius: 4px;
    outline: none;
  }
  
  .slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #667eea;
    cursor: pointer;
    border: 2px solid white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }
  
  .slider::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #667eea;
    cursor: pointer;
    border: 2px solid white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }
  
  .attempts-container {
    margin: 15px 0;
    font-size: 14px;
    color: #666;
    font-weight: 500;
  }
  
  .btn {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 16px;
    font-weight: 600;
    transition: all 0.3s ease;
    margin: 10px 0;
    min-width: 120px;
  }
  
  .btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  }
  
  .btn:disabled {
    background: #ccc;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
  
  .btn-secondary {
    background: #6c757d;
  }
  
  .btn-secondary:hover {
    box-shadow: 0 4px 12px rgba(108, 117, 125, 0.4);
  }
  
  #status {
    margin-top: 15px;
    padding: 12px;
    border-radius: 8px;
    font-weight: 500;
    transition: all 0.3s ease;
  }
  
  .status-success {
    background: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
  }
  
  .status-error {
    background: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
  }
  
  .status-info {
    background: #d1ecf1;
    color: #0c5460;
    border: 1px solid #bee5eb;
  }
  
  .loading {
    display: inline-block;
    width: 20px;
    height: 20px;
    border: 3px solid rgba(255,255,255,.3);
    border-radius: 50%;
    border-top-color: #fff;
    animation: spin 1s ease-in-out infinite;
    margin-right: 10px;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .expiry-message { 
    text-align: center; 
    font-size: 32px; 
    font-weight: bold; 
    color: #d32f2f; 
    padding: 40px;
    background: white;
    border-radius: 16px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
  }
  
  @media (max-width: 600px) {
    .container {
      padding: 20px;
      margin: 10px;
    }
    
    h1 {
      font-size: 24px;
    }
    
    .instructions {
      font-size: 14px;
    }
    
    .puzzle-container {
      height: 200px;
    }
  }
</style>
</head>
<body>
<div class="container">
  <h1>Complete the Puzzle</h1>
  <p class="instructions">Slide the puzzle piece to the correct position to verify your identity</p>
  
  <div class="puzzle-container">
    <img id="bg" class="bg" alt="Puzzle Background"/>
    <img id="piece" class="piece" alt="Puzzle Piece"/>
  </div>
  
  <div class="slider-container">
    <input type="range" id="slider" class="slider" min="0" max="350" value="0"/>
  </div>
  
  <div class="attempts-container">
    <span id="attempts">Attempts: 0/3</span>
  </div>
  
  <button id="verify-btn" class="btn">Verify</button>
  <button id="refresh-btn" class="btn btn-secondary">Refresh Puzzle</button>
  
  <div id="status"></div>
</div>

<script>
const token = location.pathname.split('/').pop();
let challengeId, positionX, originalWidth, maxAttempts, currentAttempts = 0;

// DOM elements
const bgElement = document.getElementById('bg');
const pieceElement = document.getElementById('piece');
const sliderElement = document.getElementById('slider');
const verifyBtn = document.getElementById('verify-btn');
const refreshBtn = document.getElementById('refresh-btn');
const statusElement = document.getElementById('status');
const attemptsElement = document.getElementById('attempts');

// Initialize the puzzle
async function loadCaptcha() {
  try {
    showStatus('Loading puzzle...', 'info');
    setLoadingState(true);
    
    const res = await fetch(\`/captcha?token=\${token}\`);
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Failed to load captcha');
    }
    
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Invalid response from server');
    }
    
    // Set puzzle data
    bgElement.src = data.image;
    pieceElement.src = data.piece;
    pieceElement.style.top = data.positionY + 'px';
    pieceElement.style.left = '0px';
    
    challengeId = data.challengeId;
    positionX = data.positionX;
    originalWidth = data.originalWidth;
    maxAttempts = data.maxAttempts;
    currentAttempts = 0;
    
    // Set slider range based on image width
    sliderElement.max = originalWidth - 60;
    sliderElement.value = 0;
    
    // Update attempts display
    updateAttemptsDisplay(0);
    
    showStatus('Slide the piece to the correct position', 'info');
    setLoadingState(false);
    
  } catch (error) {
    console.error('Error loading captcha:', error);
    showStatus(error.message || 'Error loading puzzle. Please try again.', 'error');
    setLoadingState(false);
  }
}

// Update attempts display
function updateAttemptsDisplay(attempts) {
  currentAttempts = attempts;
  attemptsElement.textContent = \`Attempts: \${attempts}/\${maxAttempts}\`;
}

// Show status message
function showStatus(message, type = 'info') {
  statusElement.textContent = message;
  statusElement.className = '';
  statusElement.classList.add(\`status-\${type}\`);
}

// Set loading state
function setLoadingState(loading) {
  if (loading) {
    verifyBtn.disabled = true;
    refreshBtn.disabled = true;
    sliderElement.disabled = true;
    verifyBtn.innerHTML = '<span class="loading"></span> Verifying...';
  } else {
    verifyBtn.disabled = false;
    refreshBtn.disabled = false;
    sliderElement.disabled = false;
    verifyBtn.textContent = 'Verify';
  }
}

// Handle slider movement
sliderElement.addEventListener('input', (e) => {
  pieceElement.style.left = e.target.value + 'px';
});

// Handle verification
verifyBtn.addEventListener('click', async () => {
  const currentX = parseInt(sliderElement.value);
  
  try {
    setLoadingState(true);
    showStatus('Verifying...', 'info');
    
    const res = await fetch('/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengeId, position: { x: currentX } })
    });
    
    const result = await res.json();
    
    if (result.success) {
      // Verification successful
      showStatus(\`Verified successfully! Redirecting in \${result.delay} seconds...\`, 'success');
      
      // Disable interactions
      verifyBtn.disabled = true;
      refreshBtn.disabled = true;
      sliderElement.disabled = true;
      
      // Redirect after delay
      setTimeout(() => {
        window.location.href = result.url;
      }, result.delay * 1000);
      
    } else {
      // Verification failed
      currentAttempts++;
      updateAttemptsDisplay(currentAttempts);
      
      showStatus(result.message, 'error');
      
      // Check if max attempts reached
      if (result.code === 'MAX_ATTEMPTS_REACHED') {
        verifyBtn.disabled = true;
        refreshBtn.disabled = true;
        sliderElement.disabled = true;
      }
    }
    
  } catch (error) {
    console.error('Verification error:', error);
    showStatus('Verification error. Please try again.', 'error');
  } finally {
    setLoadingState(false);
  }
});

// Handle puzzle refresh
refreshBtn.addEventListener('click', () => {
  loadCaptcha();
});

// Load the captcha when page loads
document.addEventListener('DOMContentLoaded', loadCaptcha);

// Handle page visibility change
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    // Page became visible again, refresh if needed
    if (!challengeId) {
      loadCaptcha();
    }
  }
});
</script>
</body>
</html>`;
      
      return new Response(htmlContent, {
        headers: { 
          'Content-Type': 'text/html',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
    }
    
    throw new Error('HTML file not found');
    
  } catch (error) {
    console.error('Error getting HTML:', error);
    return new Response('Error loading page', { 
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

/**
 * Validate if a challenge exists and is not expired
 * @param {string} challengeId - The challenge ID
 * @returns {boolean} True if challenge is valid
 */
export function isValidChallenge(challengeId) {
  const challenge = challenges.get(challengeId);
  if (!challenge) return false;
  
  // Check if challenge is expired (30 minutes)
  const now = Date.now();
  return now - challenge.timestamp <= 30 * 60 * 1000;
}

/**
 * Get challenge data by ID
 * @param {string} challengeId - The challenge ID
 * @returns {Object|null} Challenge data or null if not found
 */
export function getChallenge(challengeId) {
  return challenges.get(challengeId) || null;
}

/**
 * Delete a challenge from memory
 * @param {string} challengeId - The challenge ID
 * @returns {boolean} True if challenge was deleted
 */
export function deleteChallenge(challengeId) {
  return challenges.delete(challengeId);
}

/**
 * Get all active challenges (for debugging/admin purposes)
 * @returns {Array} Array of active challenges
 */
export function getAllChallenges() {
  return Array.from(challenges.entries()).map(([id, challenge]) => ({
    id,
    ...challenge,
    age: Date.now() - challenge.timestamp
  }));
}

/**
 * Convert ArrayBuffer to base64 string
 * @param {ArrayBuffer} buffer - The buffer to convert
 * @returns {string} Base64 encoded string
 */
export function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert base64 string to ArrayBuffer
 * @param {string} base64 - The base64 string to convert
 * @returns {ArrayBuffer} ArrayBuffer
 */
export function base64ToArrayBuffer(base64) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Run cleanup every 30 minutes
setInterval(() => {
  cleanupOldChallenges();
}, 30 * 60 * 1000);

// Export cleanup function for external use
export { cleanupOldChallenges as cleanupChallenges };
