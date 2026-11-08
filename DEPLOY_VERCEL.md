# Deploy FindMyStuff to GitHub and Vercel

This is a React/Vite application. `index.html` is the HTML entry point, but it
must be deployed with the rest of the repository because the application code,
styles, Supabase client, and build configuration live in other files.

## Push to GitHub

Create an empty GitHub repository, then run these commands from the project
directory:

```bash
git remote add origin https://github.com/YOUR_USERNAME/findmystuff.git
git branch -M main
git push -u origin main
```

Do not commit `.env` files, Supabase service-role keys, Turnstile secret keys,
or database passwords.

## Import into Vercel

1. In Vercel, choose **Add New → Project**.
2. Import the GitHub repository.
3. Vercel should detect **Vite** automatically.
4. Keep the build command as `pnpm run build`.
5. Keep the output directory as `dist`.
6. Add `VITE_TURNSTILE_SITE_KEY` in **Settings → Environment Variables**.
7. Deploy.

## Update external security settings

After Vercel provides the production URL:

1. Add its hostname to the Cloudflare Turnstile widget.
2. Add the exact Vercel origin to the Supabase Edge Function
   `ALLOWED_ORIGINS` secret.
3. Add the production URL to Supabase Authentication redirect URLs.
4. Apply the migration and deploy the Edge Function as described in
   `SECURITY.md`.

Vercel deploys only the frontend. Supabase Authentication, Storage, migration,
and Edge Function must remain deployed in Supabase.
