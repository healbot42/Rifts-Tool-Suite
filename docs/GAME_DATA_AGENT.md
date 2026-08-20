# Shared game-data maintainer

The project-scoped `game_data_maintainer` agent in
`.codex/agents/game-data-maintainer.toml` maintains the canonical catalogs under
`src/data/`, their runtime consumers, extraction scripts, tests, documentation,
and generated build output.

Start a new Codex session at the repository root after pulling the agent file,
then ask for it explicitly. For example:

```text
Use the game_data_maintainer agent. Read the local Rifts Book of Magic PDF pages 100-120, add the requested spells to the shared magic catalogs, update every dependent consumer and test, and run the required verification. Do not commit or push.
```

Always identify the sourcebook and page range. If several local PDFs could
match, give the exact filename. The agent treats PDFs as read-only local inputs
and will not commit them.

For a data-only audit:

```text
Use the game_data_maintainer agent in review mode. Check shared catalog schemas, stable IDs, provenance, cross-references, scripts, consumers, and tests. Do not edit files.
```

The agent preserves existing data shapes where possible. It updates consumers
and compatibility handling when a schema or stable ID must change, runs
domain-specific refresh scripts, then finishes with `npm run check` and
`git diff --check`.

PDF imports must include deterministic cleanup in the relevant generator rather
than one-off edits to generated JSON. Cleanup covers whitespace and punctuation,
soft hyphens and safe line-break joins, verified broken intraword spacing, and
common OCR damage to dice, numerals, and units. It must not globally join short
words or otherwise guess at prose. Every imported description and statistic is
audited for visible scan artifacts and correct excerpt boundaries; repeated or
ambiguous headings use explicit source-locator corrections. Shared-data tests
must reject each known artifact family while retaining legitimate prose spacing.
