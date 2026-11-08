# FindMyStuff security deployment checklist

The application enforces authorization and validation in the Edge Function.
The controls below must also be enabled in the hosted Supabase project before
production traffic is allowed.

## Required before production

1. Apply `supabase/migrations/20261108170000_secure_findmystuff_data.sql`.
2. Deploy `supabase/functions/server/index.tsx`.
3. Set the Edge Function secret `ALLOWED_ORIGINS` to a comma-separated list of
   exact production origins, including `https://` and excluding trailing
   slashes. Localhost and Figma-hosted previews are handled separately.
4. In Supabase Authentication:
   - Require email confirmation.
   - Enable Cloudflare Turnstile and enter the Turnstile **Secret Key**.
   - Enable leaked-password protection.
   - Set the minimum password length to 12 characters.
   - Keep anonymous sign-ins disabled.
   - Tighten sign-up, token refresh, and verification-email rate limits.
5. Add only trusted staff as moderators by assigning
   `app_metadata.role = "admin"` through a service-role-only admin process.
   Never allow users to write `app_metadata`.
6. Require MFA for every moderator account.
7. Enable database backups or point-in-time recovery and configure alerts for
   repeated authentication failures and Edge Function error spikes.

## Operational rules

- Never expose `SUPABASE_SERVICE_ROLE_KEY` or the Turnstile Secret Key to the
  browser, source control, logs, or chat.
- Rotate credentials immediately if a secret may have leaked.
- Review `audit:` records and Supabase authentication logs regularly.
- Keep dependencies and the Supabase Edge runtime updated.
- Test authorization with two ordinary accounts and one moderator account
  after every backend deployment.
