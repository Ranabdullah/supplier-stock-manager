# Make this app your own

## 1. Copy to your GitHub account

Use **Fork** on GitHub, or **Code → Download ZIP**, extract and create an empty repository. In the extracted folder:

```sh
git init
git add .
git commit -m "Initial supplier stock workspace"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
git push -u origin main
```

Replace both placeholders. To transfer an existing repository, use **Settings → General → Danger Zone → Transfer ownership**; the recipient accepts. This transfers code, not Cloudflare projects, credentials or records. Do not upload the parent product/archive folders.

## 2. Local PC setup

Install Node.js 22.13+ (Node 24 recommended). Open a terminal in the project folder:

```sh
npm ci
npm start
```

Open `http://127.0.0.1:8102`. Set your own convenience screen password and follow the in-app guide. The ⓘ button reopens it. The example button adds fictional records only when requested. New workspaces are empty.

Windows users can double-click `Start-Local.cmd`. On first run it installs dependencies and builds if `dist` is missing. To use an existing build without internet:

```sh
node local-server.cjs
```

Keep the terminal open. Reuse the same browser and address: localhost and 127.0.0.1 have different storage. The local launcher listens only on this PC; it is not a phone server.

## 3. Reports and local backups

Open **Backup & data** to change the business name printed on reports, export/import JSON, print reports or erase workspace data. Replacements and erasure download the current records first; confirm the download completed before discarding other copies.

Use ⓘ → **Data & backups** to enable optional folder saving. It writes readable JSON into `Local Data/backup.json` and keeps ten prior versions. On a fresh browser, an existing folder copy is never silently replaced. Choose Restore, or explicitly enable saving to replace it. Copy backups to another drive. A running local launcher is required for folder backups.

PDF/Excel files are reports; use JSON for full-fidelity restore. PDF and OCR imports produce drafts to review. English OCR models are bundled locally; other languages need their own models and configuration. This is not a full accounting/tax system or retail sales inventory.

## 4. Your private Cloudflare Worker and database

For PC/phone access use the same HTTPS app URL. Cloud backup is manual: sign in, Save, and Restore on the other device. It is not a real-time shared workspace. Use a separate deployment per business.

```sh
npm ci
npm run build
npx wrangler login
npx wrangler whoami
npx wrangler d1 create supplier-stock-manager-data
```

Copy `wrangler.jsonc` to `wrangler.own.jsonc`. Change `name` to a unique Worker name and replace the all-zero `database_id` with your newly printed database ID. Keep the binding `DB`; set `database_name` to the name you created. There is no developer account ID to reuse.

```sh
npx wrangler d1 migrations apply supplier-stock-manager-data --remote --config wrangler.own.jsonc
npx wrangler secret put JWT_SECRET --config wrangler.own.jsonc
```

When prompted for JWT_SECRET, use a fresh random value. Generate it in a separate terminal:

```sh
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Paste it into Wrangler's secret prompt, not a source file. Keep it privately in your password manager. Changing it signs out sessions. Then deploy:

```sh
npx wrangler deploy --config wrangler.own.jsonc
```

Open the printed workers.dev URL; `/api/health` should report a connected D1 database. At this HTTPS address, create your cloud account in **Cloud backup**, using an email identifier and a master password of at least 12 characters. The email is not verified Google sign-in; there is no master-password recovery. The screen password and cloud master password are separate.

The Worker accepts requests from its own app origin only. To move local records, export JSON on the PC, open your deployed HTTPS app and import the file there; then create/save your cloud backup. Do not send cloud credentials to a different URL from the local app.

On the second device, open the same HTTPS URL and sign in. Sign-in does not overwrite that device's workspace. Choose **Restore cloud backup** after exporting any local changes. A conflicting Save is rejected; sign in again to review the current cloud copy before replacing it. Cloud account deletion removes the cloud copy, not local records or downloaded backups.

Cloudflare free tiers have request, CPU, D1 and asset limits; check your dashboard's current limits and billing before sharing with others. This setup does not configure Supabase or Firebase.

## 5. Public demo without a database

The demo is deliberately separate from private deployments:

```sh
npm ci
npm run build:demo
npx wrangler login
npx wrangler deploy --config wrangler.demo.jsonc
```

Change the Worker name in the demo config if needed. It serves static files only. The demo opens with fictional records, which reset on reload. If you want the separate hosted account experience, build with node scripts/build.cjs --hosted and deploy using your own configured Worker and D1. Edit the demo and account URLs in index.html and buyer-cloud.js to match your deployments. Run `npm run build` again before deploying a private own-cloud edition.

Cloudflare Git builds can run `npm ci && npm run build` and deploy `npx wrangler deploy --config wrangler.own.jsonc`. Configure your own DB and secrets. Commit your own config only after checking it contains no secrets. For a static demo, use `npm run build:demo` and the demo config instead.

## 6. Customise, verify and update

Main UI and business calculations: `index.html`. Mobile styles: `buyer-phone.css`. Cloud panel: `buyer-cloud.js`. Optional examples: `buyer-examples.js`. Import validation: `data-schema.js`. Build: `scripts/build.cjs`. Worker and schema: `cloudflare/`.

```sh
npm ci
npm run build
npm test
npm run test:browser
npm run test:cloud-browser
npm audit
```

Local browser tests use installed Chrome. On CI/Linux install Playwright Chromium with `npx playwright install --with-deps chromium` and set `CI=true`. Tests use fictional records and temporary stores. After editing, rebuild and redeploy. Rebuild the local app too; the launcher serves `dist`, not source files directly.

Keep independent encrypted exports and provider backups and practise restoring them. Changing the app URL creates a new browser storage origin; export before moving. Never publish `Local Data`, database exports, passwords, `.env`, `.dev.vars`, `.wrangler` or private owner archives.

## Troubleshooting

- Blank local app: run `npm ci` then `npm run build`; check another process is not using port 8102.
- Cloud database unavailable: verify the D1 ID, `DB` binding, applied migrations and JWT_SECRET.
- Demo cloud login disabled: deploy your own Worker/D1; the public demo intentionally has no cloud backend.
- Saved data looks older: export the visible workspace, preserve backup files and restore deliberately; never merge by record count.
- OCR import is inaccurate: use a clear image, review each draft row or enter it manually.
- Folder backup paused: restore/review the saved folder version before enabling writes again. Downloads and folder backups are readable; store them privately.
