# Security Operations

## Production configuration

Set these values in the deployment secret manager, not in source control:

- `NODE_ENV=production`
- `JWT_SECRET`: a randomly generated secret of at least 32 bytes.
- `ENCRYPTION_KEY`: a separate, randomly generated secret of at least 32 bytes.
- `CORS_ORIGINS`: comma-separated exact HTTPS origins for the deployed frontend.
- `BACKUP_DIR`: a mounted backup volume outside the application directory, with restricted access and off-host replication.
- `GOOGLE_CLIENT_ID`: the Google OAuth Web client ID used by the backend verifier.
- `VITE_GOOGLE_CLIENT_ID`: the same Google OAuth Web client ID, available when building the frontend.

The backend refuses to start in production if these controls are missing. Terminate HTTPS at a trusted reverse proxy, forward the original protocol correctly, and expose the backend only through that proxy. The backend rejects non-HTTPS requests in production and sets secure, HttpOnly, SameSite=Lax session cookies.

## Encryption-key migration

Older encrypted fields may have been encrypted with the prior key derivation. Do not set a new `ENCRYPTION_KEY` on a live database until existing encrypted customer fields and payment references have been decrypted using the old key and re-encrypted with the new key. Keep the old key in a restricted secret manager until the migration and a restore test are verified. Never put either key in logs or commit them.

New database backups are AES-GCM encrypted. They contain sensitive account, customer, payment, OTP-hash, and audit data, so keep the backup volume private and replicate it separately from Supabase. Restore is an administrative operation; test it against a disposable database before relying on it for recovery.

## Controls and remaining deployment checks

- Passwords use bcrypt; staff/admin sign in with email and password without an OTP challenge. Customer sign-up and password-reset OTPs are hashed, expire, and have bounded attempts.
- The development seed script requires unique `SEED_ADMIN_PASSWORD` and `SEED_STAFF_PASSWORD` values of at least 12 characters. Keep them in the ignored backend `.env` file; never commit them or use the development seed accounts in production.
- Session JWTs are kept in HttpOnly cookies; browser state stores only the user profile and CSRF token. Sessions expire after 15 minutes and explicit logout clears the cookie.
- State-changing API requests require a session-bound CSRF token. Public login, OTP, and password-reset endpoints are intentionally exempt because they do not use an authenticated session.
- Management APIs enforce server-side roles. Customer self-service endpoints only accept customer sessions. Google sign-in remains unavailable until both frontend and backend are configured with the matching OAuth client ID.
- Customer Google sign-in uses Google Identity Services and verifies the signed ID token, audience, and verified email on the backend before creating a customer session. In Google Cloud, add `http://localhost:5173` and the deployed frontend origin as authorized JavaScript origins, then configure the same Web client ID as `GOOGLE_CLIENT_ID` and `VITE_GOOGLE_CLIENT_ID`. The client ID is public; never put a Google client secret in the frontend.
- Customer phone/address data and payment references are encrypted at rest; transaction references are encrypted in transaction logs. Protect `ENCRYPTION_KEY` separately from the database and rotate it only with a migration.
- Backups fail on an incomplete table export, paginate exports, and report restore errors instead of silently succeeding.

Production owners must still provision DNS/TLS at the reverse proxy, deploy exact CORS origins, set the required secrets and external backup mount, configure Supabase network/key access, and periodically perform a restore drill. The local development server uses HTTP and is not an HTTPS deployment.
