// Authentication routes

import { Hono } from "hono";
import { setCookie, deleteCookie } from "hono/cookie";
import type { Bindings, User } from "../types";
import { generateMagicToken, storeMagicToken, checkMagicToken, verifyMagicToken } from "../lib/tokens";
import { sendMagicLink } from "../lib/email";
import { signToken } from "../lib/jwt";
import { authMiddleware, AUTH_COOKIE_NAME } from "../middleware/auth";
import { AdminLayout } from "../components/AdminLayout";

// API routes for auth (JSON responses)
export const authApiRoutes = new Hono<{ Bindings: Bindings }>();

// POST /api/auth/login - Send magic link email
authApiRoutes.post("/login", async (c) => {
  const body = await c.req.json<{ email: string }>();
  const email = body.email?.toLowerCase().trim();

  if (!email || !email.includes("@")) {
    return c.json({ error: "Valid email is required" }, 400);
  }

  // Check if user exists in database
  const existingUser = await c.env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();

  if (!existingUser) {
    // Log warning but return same response to prevent email enumeration
    console.warn("Login attempt for unregistered email:", email);
    return c.json({ success: true, message: "Check your email for a login link" });
  }

  const token = generateMagicToken();
  await storeMagicToken(c.env.DB, email, token);

  const sesConfig = {
    accessKeyId: c.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: c.env.AWS_SECRET_ACCESS_KEY,
    region: c.env.AWS_REGION,
  };

  const result = await sendMagicLink(sesConfig, email, token, c.env.APP_BASE_URL, c.env.SES_CONFIGURATION_SET);

  if (!result.success) {
    console.error("Failed to send magic link:", {
      error: result.error,
      errorCode: result.errorCode,
      to: email,
    });
    return c.json({ error: "Failed to send email" }, 500);
  }

  return c.json({ success: true, message: "Check your email for a login link" });
});

// GET /api/auth/me - Return current user info
authApiRoutes.use("/me", authMiddleware);
authApiRoutes.get("/me", async (c) => {
  const user = c.get("user");

  if (!user) {
    return c.json({ authenticated: false }, 401);
  }

  // Fetch full user details from database
  const dbUser = await c.env.DB.prepare("SELECT id, email, name, role FROM users WHERE id = ?")
    .bind(user.userId)
    .first<User>();

  if (!dbUser) {
    return c.json({ authenticated: false }, 401);
  }

  return c.json({
    authenticated: true,
    user: {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role,
    },
  });
});

// POST /api/auth/logout - Clear session cookie
authApiRoutes.post("/logout", (c) => {
  deleteCookie(c, AUTH_COOKIE_NAME, {
    path: "/",
    secure: c.env.APP_BASE_URL.startsWith("https"),
    httpOnly: true,
    sameSite: "Lax",
  });

  return c.json({ success: true });
});

// Page routes for auth (HTML responses)
export const authPageRoutes = new Hono<{ Bindings: Bindings }>();

// GET /auth/login - Login page
authPageRoutes.get("/login", (c) => {
  const error = c.req.query("error");

  return c.html(
    <AdminLayout title="Sign in">
      <div class="auth-container">
        <h1>Sign in</h1>
        <p>Enter your email address to receive a sign-in link.</p>

        {error && <p class="error-message">{getErrorMessage(error)}</p>}

        <form id="login-form" class="auth-form">
          <label for="email">Email address</label>
          <input type="email" id="email" name="email" required autocomplete="email" placeholder="you@example.com" />
          <button type="submit">Send sign-in link</button>
        </form>

        <div id="success-message" class="email-sent-card" style="display: none;">
          <div class="email-sent-icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M22 17a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9.5C2 7 4 5 6.5 5H18c2.2 0 4 1.8 4 4v8Z" />
              <polyline points="15,9 18,9 18,11" />
              <path d="M6.5 5C9 5 11 7 11 9.5V17a2 2 0 0 1-2 2" />
              <line x1="6" x2="7" y1="10" y2="10" />
            </svg>
          </div>
          <p class="email-sent-title">To continue, click the link sent to</p>
          <p class="email-sent-address" id="sent-email"></p>
          <p class="email-sent-retry">
            Not seeing the email in your inbox?
            <br />
            <a href="#" id="try-again-link">
              Try sending again
            </a>
          </p>
        </div>

        <script
          dangerouslySetInnerHTML={{
            __html: `
					document.getElementById('login-form').addEventListener('submit', async (e) => {
						e.preventDefault();
						const form = e.target;
						const email = form.email.value;
						const button = form.querySelector('button');

						button.disabled = true;
						button.textContent = 'Sending...';

						try {
							const res = await fetch('/api/auth/login', {
								method: 'POST',
								headers: { 'Content-Type': 'application/json' },
								body: JSON.stringify({ email })
							});

							const data = await res.json();

							if (res.ok) {
								form.style.display = 'none';
								document.getElementById('sent-email').textContent = email;
								document.getElementById('success-message').style.display = 'block';
							} else {
								alert(data.error || 'Failed to send email');
								button.disabled = false;
								button.textContent = 'Send sign-in link';
							}
						} catch (err) {
							alert('Network error. Please try again.');
							button.disabled = false;
							button.textContent = 'Send sign-in link';
						}
					});

					document.getElementById('try-again-link').addEventListener('click', (e) => {
						e.preventDefault();
						document.getElementById('success-message').style.display = 'none';
						const form = document.getElementById('login-form');
						form.style.display = '';
						const button = form.querySelector('button');
						button.disabled = false;
						button.textContent = 'Send sign-in link';
					});
				`,
          }}
        />
      </div>
    </AdminLayout>
  );
});

// GET /auth/verify - Show confirmation page (doesn't consume token)
// This prevents email security scanners from consuming the token
authPageRoutes.get("/verify", async (c) => {
  const token = c.req.query("token");

  if (!token) {
    return c.redirect("/auth/login?error=missing_token");
  }

  // Check token validity without consuming it
  const result = await checkMagicToken(c.env.DB, token);

  if (!result.valid || !result.email) {
    return c.redirect(`/auth/login?error=${result.error || "invalid_token"}`);
  }

  // Show confirmation page with button
  return c.html(
    <AdminLayout title="Confirm sign in">
      <div class="auth-container">
        <h1>Confirm sign in</h1>
        <p>Click the button below to sign in as {result.email}</p>

        <form method="post" action={`/auth/verify?token=${encodeURIComponent(token)}`} class="auth-form">
          <button type="submit">Sign in</button>
        </form>

        <p class="auth-note">If you didn't request this link, you can safely ignore this page.</p>
      </div>
    </AdminLayout>
  );
});

// POST /auth/verify - Actually verify and consume the token
authPageRoutes.post("/verify", async (c) => {
  const token = c.req.query("token");

  if (!token) {
    return c.redirect("/auth/login?error=missing_token");
  }

  // Now actually consume the token
  const result = await verifyMagicToken(c.env.DB, token);

  if (!result.valid || !result.email) {
    return c.redirect(`/auth/login?error=${result.error || "invalid_token"}`);
  }

  // Find user (must already exist in database)
  const user = await c.env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(result.email).first<User>();

  if (!user) {
    // User not registered - should not happen since we only send tokens to registered users
    console.warn("Token verification for unregistered email:", result.email);
    return c.redirect("/auth/login?error=not_registered");
  }

  // Update last login
  await c.env.DB.prepare(`UPDATE users SET last_login_at = datetime('now') WHERE id = ?`).bind(user.id).run();

  // Create JWT
  const jwt = await signToken(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
    },
    c.env.JWT_SECRET
  );

  // Set cookie
  const isSecure = c.env.APP_BASE_URL.startsWith("https");
  setCookie(c, AUTH_COOKIE_NAME, jwt, {
    path: "/",
    secure: isSecure,
    httpOnly: true,
    sameSite: "Lax",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });

  // Redirect based on role
  if (user.role === "admin" || user.role === "editor") {
    return c.redirect("/admin");
  }
  return c.redirect("/student");
});

// GET /auth/logout - Logout and redirect
authPageRoutes.get("/logout", (c) => {
  deleteCookie(c, AUTH_COOKIE_NAME, {
    path: "/",
    secure: c.env.APP_BASE_URL.startsWith("https"),
    httpOnly: true,
    sameSite: "Lax",
  });

  return c.redirect("/");
});

function getErrorMessage(error: string): string {
  switch (error) {
    case "missing_token":
      return "Invalid login link. Please request a new one.";
    case "not_found":
      return "Login link not found. Please request a new one.";
    case "expired":
      return "Login link has expired. Please request a new one.";
    case "already_used":
      return "Login link has already been used. Please request a new one.";
    case "not_registered":
      return "This account is not registered. Please contact an administrator.";
    default:
      return "Something went wrong. Please try again.";
  }
}
