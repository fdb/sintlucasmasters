// Sign-in form on /auth/login. Kept as a file (not inline) so the
// Content-Security-Policy can forbid inline scripts.
document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const email = form.email.value;
  const button = form.querySelector("button");

  button.disabled = true;
  button.textContent = "Sending...";

  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();

    if (res.ok) {
      form.style.display = "none";
      if (data.status === "account_not_found") {
        document.getElementById("missing-email").textContent = email;
        document.getElementById("not-found-message").style.display = "block";
      } else {
        document.getElementById("sent-email").textContent = email;
        document.getElementById("success-message").style.display = "block";
      }
    } else {
      alert(data.error || "Failed to send email");
      button.disabled = false;
      button.textContent = "Send sign-in link";
    }
  } catch (err) {
    alert("Network error. Please try again.");
    button.disabled = false;
    button.textContent = "Send sign-in link";
  }
});

document.getElementById("try-again-link").addEventListener("click", (e) => {
  e.preventDefault();
  document.getElementById("success-message").style.display = "none";
  const form = document.getElementById("login-form");
  form.style.display = "";
  const button = form.querySelector("button");
  button.disabled = false;
  button.textContent = "Send sign-in link";
});

document.getElementById("not-found-try-again-link").addEventListener("click", (e) => {
  e.preventDefault();
  document.getElementById("not-found-message").style.display = "none";
  const form = document.getElementById("login-form");
  form.style.display = "";
  const button = form.querySelector("button");
  button.disabled = false;
  button.textContent = "Send sign-in link";
});
