document.getElementById("verifyBtn").addEventListener("click", async () => {
  grecaptcha.ready(async () => {
    const token = await grecaptcha.execute("6Lc2LtkrAAAAAJbXj3HbkYzYT55rwX9TgwdGTI4r", { action: "submit" });

    // Send token + current URL token param to backend for verification
    const urlParams = new URLSearchParams(window.location.search);
    const storedToken = urlParams.get("token");

    try {
      const res = await fetch(`/verify/${storedToken}?g-recaptcha-response=${token}`);
      const data = await res.json();

      if (data && data.url) {
        window.location.href = data.url;
      } else {
        alert("Token expired or invalid.");
      }
    } catch {
      alert("Verification failed.");
    }
  });
});
