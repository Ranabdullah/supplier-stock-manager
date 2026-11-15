# Source review and release plan

Reviewed 15 November 2026. This release starts from the clean local/manual-backup edition, not the owner's Firebase app.

## Sources gathered

- Current clean source: Relevant Files / Source Code, prepared 4 October; empty records, local launcher, folder backups, guide and manual encrypted Cloudflare backups.
- Private GitHub owner reference, checked against the saved 7 October snapshot. Firebase sign-in and owner-only database rules are specific to that private deployment.
- Private maintainer source and historical sync deltas: retained separately as owner archives. They include business data and must not enter public history.
- Existing workflow/media reports: useful baseline evidence, rerun for this release rather than treating them as current certification.

## Findings and intended changes

1. Legacy GitHub backup code can write readable business data into repositories and stores a GitHub token in browser storage. Remove the workflow; GitHub should contain source only.
2. IndexedDB recovery picks the copy with more orders and can resurrect deleted records. Boot can overwrite recovery data before reading it. Use explicit save timestamps, wait for recovery before enabling editing, and honour empty/deleted workspaces.
3. JSON import only checks two fields and replaces current records immediately. Validate complete record structure, reject unsafe object keys/IDs and invalid quantities, confirm replacement and offer a downloadable backup first.
4. User-supplied product/category names are interpolated into inline JavaScript attributes. Encode JavaScript arguments independently from HTML text and test apostrophes and injection-shaped input.
5. Reporting/OCR libraries are old remote scripts. Pin maintained dependencies, serve them locally, preserve licences and exercise real PDF/Excel exports and document import.
6. Supplier payment calculations ignore order-level payments when any direct payment exists; supplier names containing eBay are silently treated as fully paid. Use explicit supplier flags and count both separately recorded payment types; explain duplicate-entry limits.
7. Reports contain fixed owner branding. Replace with a user-editable business name and neutral defaults.
8. There is no reproducible package/build/test setup or clean public-source licence. Add these, plus setup, transfer, privacy, backup/restore and troubleshooting instructions.

## Scope boundaries

This remains a single-browser workspace with manual encrypted cloud backups. Local screen locks are convenience controls, local JSON/browser records are readable, and cloud sign-in does not establish multi-user permissions or automatic live sync. OCR is a reviewable draft, not a verified invoice. Do not infer tax compliance or supplier credits from returns alone.

No owner database, private repository visibility, saved business records or existing deployment will be changed by preparing this public source.
