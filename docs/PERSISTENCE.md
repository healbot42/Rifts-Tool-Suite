# Persistence architecture

Page components use the domain repositories exported by
`src/lib/persistence/index.js`. They do not select a browser storage API. The
repository contract is asynchronous: `load()`, `save(payload)`, and `remove()`
return structured results. The character repository also exposes `importSaved()`
for cross-page character import. A future authenticated adapter can implement
the same backend `get`, `put`, and `remove` methods without changing Vue
components.

## Local migration and rollback

IndexedDB database `rifts-tool-suite`, version 1, stores all documents in the
`documents` object store. Each envelope has a stable `key` and `type`, a
`schemaVersion`, monotonically increasing local `revision`, ISO `updatedAt`, and
the unchanged page `payload`. Revisions describe ordering within this browser; a
future sync adapter must compare server revisions or ETags and surface a
conflict instead of silently overwriting a newer remote document.

The legacy keys and JSON payloads remain unchanged:

- `rifts-tw-device`
- `rifts-character-sheet`
- `rifts-initiative-tracker`
- `rifts-initiative-presets`

On first load, a missing IndexedDB document is populated from valid legacy JSON.
The legacy value is never deleted by migration. Later successful IndexedDB
writes are mirrored to localStorage for rollback compatibility. A mirror quota
or availability failure is a degraded-compatibility warning, not a lost save. If
IndexedDB cannot open or transact, the repository uses localStorage as the
fallback and surfaces the primary failure. Malformed legacy JSON is left intact
and reported so it remains recoverable.

Rollback can restore the previous application build: its localStorage payloads
remain current whenever mirroring succeeded. If a degraded mirror warning was
shown, export current work before rollback because IndexedDB may contain a newer
revision. No server, account, network request, or dependency is part of this
design.
