document.getElementById("verify-btn").addEventListener("click", async () => {
  const sliderValue = parseInt(document.getElementById("slider").value);
  const message = document.getElementById("message");

  const res = await fetch("/verify-puzzle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, slider_x: sliderValue })
  });

  const data = await res.json();

  if (data.status === "ok") {
    message.innerText = `Success! Redirecting in ${data.delay} sec...`;
    setTimeout(() => window.location.href = data.redirect, data.delay * 1000);
  } else if (data.status === "wrong") {
    message.innerText = `Wrong position! Attempts left: ${data.attempts_left}`;
  } else if (data.status === "max_attempts") {
    message.innerText = "Maximum attempts reached. URL expired.";
  } else if (data.status === "expired") {
    message.innerText = "URL expired.";
  }
});
