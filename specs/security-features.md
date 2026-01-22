# Security Features

This document tracks security mitigations implemented in the Sint Lucas Masters application.

## Authentication

- [x] **Magic links (passwordless)** - Users authenticate via email-based magic links instead of passwords. Tokens are single-use, expire after 15 minutes, and are stored hashed in the database.
- [x] **No password storage** - Since we use magic links, there are no passwords to store or hash. This eliminates entire classes of vulnerabilities (password reuse, weak passwords, credential stuffing).
- [x] **Email enumeration prevention** - Login endpoint returns the same response whether or not an email is registered. Unregistered emails are logged server-side but no email is sent.
- [x] **Pre-registration required** - Only users who exist in the `users` table can receive magic link emails. New accounts must be created by an admin.

## Session Management

- [x] **JWT tokens** - Sessions use signed JWT tokens with HMAC-SHA256, including expiration claims.
- [x] **HttpOnly cookies** - Auth tokens are stored in HttpOnly cookies, preventing JavaScript access (XSS mitigation).
- [x] **Secure cookies** - Cookies are marked Secure in production, ensuring transmission only over HTTPS.
- [x] **SameSite cookies** - Cookies use SameSite=Lax, providing baseline CSRF protection.
- [x] **Token expiration** - JWTs expire after 7 days, limiting the window for token theft.

## Authorization

- [x] **Role-based access control** - Three roles: `student`, `editor`, `admin` with different permission levels.
- [x] **Middleware enforcement** - Admin routes protected by `requireAdmin` middleware checking role.
- [ ] **Per-resource authorization** - Students can only edit their own projects (not yet implemented).

## Input Validation

- [x] **Parameterized queries** - All database queries use parameterized statements via D1, preventing SQL injection.
- [x] **Email validation** - Basic email format validation on login.
- [ ] **Input sanitization** - Comprehensive input sanitization for user-provided content.
- [ ] **Content Security Policy** - CSP headers to prevent XSS.

## Infrastructure

- [x] **HTTPS only** - Production site served exclusively over HTTPS via Cloudflare.
- [x] **Edge deployment** - Application runs on Cloudflare Workers with built-in DDoS protection.
- [ ] **Rate limiting** - Limit login attempts to prevent brute force (not yet implemented).
- [ ] **Audit logging** - Log security-relevant events for monitoring (partially implemented via console.warn).

## Future Considerations

- [ ] **PKBDF2/Argon2 password hashing** - Not needed currently (passwordless), but would be required if password auth is added.
- [ ] **Two-factor authentication** - Additional security layer for admin accounts.
- [ ] **Session revocation** - Ability to invalidate all sessions for a user.
- [ ] **IP-based restrictions** - Limit admin access to specific IP ranges.
