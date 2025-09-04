export const challenges = new Map();

export async function getHtml(fileName) {
  const html = await fetch(`https://raw.githubusercontent.com/your-repo-path/html/${fileName}`);
  return new Response(await html.text(), {
    headers: { 'Content-Type': 'text/html' }
  });
}

export async function generatePuzzle() {
  const originalWidth = 300;
  const originalHeight = 150;

  const imgUrl = '/img/sample.jpg'; // Change if needed
  const bgBase64 = await fetchAsBase64(imgUrl);
  const pieceBase64 = await fetchAsBase64(imgUrl); // Placeholder, real cut needed

  const position = { x: Math.floor(Math.random() * (originalWidth - 50)), y: 50 };
  const challengeId = crypto.randomUUID();

  return { bgBase64, pieceBase64, position, originalWidth, challengeId };
}

async function fetchAsBase64(url) {
  const res = await fetch(url);
  const blob = await res.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(blob)));
  return `data:image/jpeg;base64,${base64}`;
}
