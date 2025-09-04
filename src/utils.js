const PUZZLE_IMAGES = [
  "/img/IMG_20250903_161740_099.jpg",
  "/img/IMG_20250903_161801_401.jpg",
  "/img/IMG_20250903_161810_656.jpg",
  "/img/IMG_20250903_161810_740.jpg"
];

export const challenges = new Map();

export async function getHtml(fileName) {
  const html = await fetch(`https://raw.githubusercontent.com/your-repo-path/src/html/${fileName}`);
  return new Response(await html.text(), {
    headers: { 'Content-Type': 'text/html' }
  });
}

export async function generatePuzzle(requestUrl) {
  const randomIndex = Math.floor(Math.random() * PUZZLE_IMAGES.length);
  const imagePath = PUZZLE_IMAGES[randomIndex];

  const pieceWidth = 50;
  const pieceHeight = 50;
  const maxX = 250;  // 300px container minus piece width
  const correctX = Math.floor(Math.random() * maxX);
  const y = 50;

  const origin = new URL(requestUrl).origin;
  const originalUrl = `${origin}${imagePath}`;

  const pieceUrl = `${origin}/cdn-cgi/image/crop=${pieceWidth}x${pieceHeight},x=${correctX},y=${y}${imagePath}`;

  const challengeId = crypto.randomUUID();

  return {
    challengeId,
    bgUrl: originalUrl,
    pieceUrl,
    pieceWidth,
    pieceHeight,
    correctX
  };
}
