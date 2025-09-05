const { token, image } = window.VERIFY_DATA;

const slider = document.getElementById('slider');
const pieceCanvas = document.getElementById('piece');
const ctx = pieceCanvas.getContext('2d');
const img = new Image();
img.src = `/${image}`;

img.onload = () => {
  fetch(`/get-gap?token=${token}`)
    .then(res => res.json())
    .then(data => {
      if (data.gap_x === undefined) {
        document.getElementById('msg').innerText = 'Session expired!';
        return;
      }
      const gapX = data.gap_x;
      ctx.drawImage(img, gapX, 0, 50, 50, 0, 0, 50, 50);
    });

  document.getElementById('main-img').src = img.src;
};

slider.addEventListener('input', () => {
  pieceCanvas.style.left = slider.value + 'px';
});

document.getElementById('verify-btn').addEventListener('click', async () => {
  const res = await fetch('/verify-puzzle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, slider_x: parseInt(slider.value) })
  });

  const data = await res.json();
  const msg = document.getElementById('msg');

  if (data.status === 'ok') {
    msg.innerText = '✅ Success! Redirecting...';
    document.getElementById('verify-btn').disabled = true;
    setTimeout(() => {
      window.location.href = data.redirect;
    }, data.delay * 1000);
  } else if (data.status === 'wrong') {
    msg.innerText = `❌ Wrong! Attempts left: ${data.attempts_left}`;
  } else if (data.status === 'max_attempts') {
    msg.innerText = '🚫 Maximum attempts reached!';
    document.getElementById('verify-btn').disabled = true;
    slider.disabled = true;
  } else {
    msg.innerText = '⏳ URL expired!';
    document.getElementById('verify-btn').disabled = true;
    slider.disabled = true;
  }
});
