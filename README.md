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

**Order alerts** (web push, free) need `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`
and `VAPID_SUBJECT` in `backend/.env`. Make the keys once with
`npx web-push generate-vapid-keys` and keep the same keys forever: new keys
silently break every alert people have already turned on. Staff turn alerts
on from the admin sidebar, riders from My deliveries, customers from Profile
or the order-placed page. On iPhone, alerts work only after Share → Add to
Home Screen (iOS 16.4 or newer).

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
- Staff are matched to their **Google-only** login by email the first time
  they sign in, then by login id only. Password logins never get staff access.
- The server sends push alerts only to the browsers' own push services
  (Google, Mozilla, Apple, Microsoft), never to an address a user typed.
- Behind nginx or another reverse proxy, set `TRUST_PROXY=1` in
  `backend/.env` so request limits see each visitor's real IP.

## Deploy

### 1. API on your VPS (Docker + GitHub Actions + nginx)

Every push to `master` that changes `backend/` runs
`.github/workflows/deploy-backend.yml`: tests → Docker image to
`ghcr.io/amarjeetkumar123/grocery-store-backend` → SSH to the VPS → the
container is replaced and must report healthy, or the run fails. Same setup
as car-loans-and-sales. You can also start it by hand: GitHub → Actions →
Deploy Backend → Run workflow.

**One-time setup**

1. GitHub → this repository → Settings → Secrets and variables → Actions:
   add `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `VPS_PORT` (the same values
   as car-loans-and-sales).
2. A free name for the API, needed for HTTPS (the Netlify site is HTTPS and
   browsers block calls from it to a plain `http://IP`): sign in at
   [duckdns.org](https://www.duckdns.org), create e.g. `grocerystore`, and
   set its IP to the VPS IP. You get `grocerystore.duckdns.org`.
3. On the VPS, the settings file the container reads:

   ```bash
   mkdir -p /root/envs && nano /root/envs/grocerystore.backend.prod.env
   ```

   Same lines as `backend/.env`, with these production values (no quotes
   around values in this file):

   ```
   ALLOWED_ORIGINS=https://your-site.netlify.app
   TRUST_PROXY=1
   PORT=3000
   DATABASE_CA_CERTIFICATE_PATH=./supabase-ca.crt
   ```

   Keep the **same** `VAPID_*` keys as on your computer.
4. nginx and HTTPS on the VPS (put your DuckDNS name in the file first):

   ```bash
   sudo cp deploy/nginx-grocery-store-api.conf /etc/nginx/sites-available/grocery-store-api
   sudo ln -s /etc/nginx/sites-available/grocery-store-api /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   sudo certbot --nginx -d grocerystore.duckdns.org
   ```

   (Copy the file from the repository, or paste it with `nano`.)
5. Push to `master` (or run the workflow), then open
   `https://grocerystore.duckdns.org/api/health`: `{"status":"ok"}`.

On the VPS: `docker logs -f grocery-store-backend` shows the API's log. To go
back to an earlier version, run the same `docker run` line from the workflow
with an older image tag (each run's commit id is a tag).

### 2. App on Netlify

Netlify → Add new site → Import from Git → this repository. `netlify.toml`
already sets the folder, build command and Node version. Add environment
variables (Site configuration → Environment variables):

- `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (same as local)
- `VITE_API_URL=https://grocerystore.duckdns.org` (your API name, no slash at the end)

Netlify then deploys the app by itself on every push. Put the site's
address in the API's `ALLOWED_ORIGINS` (in `/root/envs/grocerystore.backend.prod.env`)
and run the backend workflow once more so the container reads it.

### 3. Supabase for the live site

Authentication → URL Configuration: set **Site URL** to the live address and
add `https://your-site.netlify.app/**` to Redirect URLs (keep the localhost
ones for development).

### Before real customers

- Admin → Store settings: your real UPI ID (every QR code uses it), WhatsApp
  number and the shop's location (stand in the shop, tap "Use my current location").
- Admin → Zones & slots: your real societies, towers, areas and slots.
- Admin → Staff: packer and riders by Google email.
- Delete the test logins (`test@test.com`, `rider@test.com`) in Supabase →
  Authentication → Users, and switch "Test Rider" off in Staff.
- On an Android phone and an iPhone: open the site, Add to Home Screen, turn
  on alerts, place a test order and follow it to Delivered.

