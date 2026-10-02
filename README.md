# Grocery Store

Online ordering for nearby housing societies and local areas: scheduled
delivery slots, pay at the door (cash or UPI). The full plan is in
[grocerystoreplan.txt](grocerystoreplan.txt); the screen designs are in [mockups/](mockups/).

```
backend/
  database/         SQL: 001_schema.sql (tables), 002_sample_data.sql (Noida sample)
  src/
    routes/         thin: read the request, call a service, send the result
    services/       business rules; throw ServiceError for user-facing problems
    dbHelper/       every SQL query lives here (and only here)
    filters/        dynamic "where" conditions used by dbHelper (products, stock)
    validators/     form checks (address, product, pack sizes)
    storage/        product photo upload to Supabase Storage
    utils/          CSV reader, distance between two points
  test/             npm test
frontend/
  public/           product-upload-template.csv for bulk upload
  src/assets/       logo, app icons, category and login images (PNG)
  src/pages/        shop pages; admin/ for the admin panel
```

## One-time setup

Use Node 24: run `nvm use` in this folder (it reads `.nvmrc`).

### 1. Supabase project

1. Create a project at [supabase.com](https://supabase.com). Pick the
   **Mumbai (ap-south-1)** region.
2. **SQL Editor:** paste and run `backend/database/001_schema.sql`.
3. Edit `backend/database/002_sample_data.sql`: store location, UPI ID,
   WhatsApp number, your real societies and areas. Then run it.
4. Make yourself the owner (use the Google account you will sign in with):
   ```sql
   insert into staff (email, name, role) values ('you@gmail.com', 'Your Name', 'owner');
   ```

### 2. Google sign-in

1. [Google Cloud Console](https://console.cloud.google.com) → APIs & Services →
   Credentials → **Create OAuth client ID** → Web application.
   Authorized redirect URI: `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`
2. Supabase → Authentication → Sign In / Providers → **Google**: paste the
   client ID and secret, enable it.
3. Supabase → Authentication → URL Configuration: Site URL
   `http://localhost:5173`, and add `http://localhost:5173/**` to Redirect URLs.
   Add your real website address here when you go live.

### 3. Email and password sign-in

The login page also offers email + password (create account, forgot
password). The Email provider is on by default in Supabase.

Supabase's built-in mailer only sends to your own team's addresses and only
a few emails an hour, so customers won't get sign-up or reset links. Add a
free mail service: Supabase → Authentication → Emails → **SMTP Settings**
(for example Brevo, 300 emails a day free). Keep **Confirm email** turned on.

Staff (owner, packer, riders) must sign in with **Google**. Password
accounts are never linked to a staff row.

### 4. Settings files

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Fill both in; each line says where to find the value in Supabase. For
`DATABASE_CA_CERTIFICATE_PATH`, download the certificate from Supabase →
Project Settings → Database → SSL configuration, and save it in `backend/`.

The publishable key goes in both files. The **secret** key never goes in
the frontend.

**Product photos** need `SUPABASE_SECRET_KEY` in `backend/.env` (Supabase →
Project Settings → API Keys → Secret keys). On start-up the server creates
the public `product-images` bucket by itself. Without the key everything
else works; photo upload just says it is not set up.

## Run it

```bash
cd backend && npm install && npm run dev      # API on http://localhost:3000
cd frontend && npm install && npm run dev     # app on http://localhost:5173
```

Open http://localhost:5173 on your computer. To try it on a phone on the
same Wi-Fi, run `npm run dev -- --host` in `frontend/`. The location button
needs HTTPS on real devices, so test GPS on the deployed site or with
`localhost`.

## Tests

The API tests use a throwaway local Postgres database:

```bash
createdb grocery_store_test
cp backend/.env.test.example backend/.env.test
cd backend && npm test
```

## Security notes

- Only the Express server reads and writes the tables. Row level security
  is on with no policies, so Supabase's public Data API exposes nothing.
- Staff are matched to their Google login by **confirmed** email the first
  time they sign in, then by login id only.
- Behind nginx or another reverse proxy, set `TRUST_PROXY=1` in
  `backend/.env` so request limits see each visitor's real IP.
