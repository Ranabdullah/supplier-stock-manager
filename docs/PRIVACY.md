# Storage and privacy

- Default workspace: localStorage and IndexedDB in this browser and origin. Records remain readable to someone with access to this browser or computer. A local screen password is not encryption or server authorisation.
- Local folder: optional readable JSON in `Local Data/backup.json`, plus ten previous versions. The loopback server checks Host, Origin, a per-run token and backup versions before writes. It listens only on 127.0.0.1.
- Exported JSON, Excel and PDF: readable downloads. Store them privately and keep a separate backup outside the browser/computer.
- Optional own cloud: email identifier, salted derived-verifier hash, encrypted backup and version metadata in your Cloudflare D1. AES-GCM/PBKDF2 encryption happens in the browser. There is no email verification, lost-master-password recovery or automatic two-device sync. Hosting operators can serve changed code; this is not protection against a malicious hosting operator.
- Cloud sessions and the master password remain in memory while the backup panel is open; Close/sign out clears them. Each cloud account is separate. Delete cloud account removes its saved cloud copy; local records and downloaded files remain until you remove them separately.
- PDF and English OCR processing run in the browser using locally served libraries/workers/models. The app does not upload invoice images to an OCR service. No analytics or advertising is included.
- Hosting providers still handle normal connection metadata. Public deployment source, models, scripts and design assets are downloadable; never place private files in the public build.
- The public demo uses in-memory sample records. The separate hosted account site keeps its working copy in memory and uploads an encrypted snapshot only when you choose Save. The account site uses a separate database.

GitHub hosts code only. Never commit customer records, `Local Data`, exported backups, API tokens, `.env`, `.dev.vars`, `.wrangler` or private deployment credentials. Disclose suspected security issues privately through the repository owner's GitHub profile, without posting sensitive records.
