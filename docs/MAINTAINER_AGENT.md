# Rifts Tool Suite maintenance agent

The repository includes a project-scoped Codex custom agent named
`maintenance_cleaner` at `.codex/agents/maintenance-cleaner.toml`. It
specializes in codebase cleanup, architectural consistency, tests,
documentation, release metadata, generated artifacts, and low-risk refactoring.

Codex loads project agents from `.codex/agents/` when a session starts in this
trusted repository. The agent also receives the repository-wide rules from
`AGENTS.md`.

## How to use it

Start a new Codex session at the repository root after pulling the agent file,
then ask explicitly for the agent:

```text
Use the maintenance_cleaner agent to audit this branch for maintainability problems. Make safe, behavior-preserving fixes, update tests and documentation, run npm run check, but do not commit or push.
```

For review-only work:

```text
Use the maintenance_cleaner agent in review mode. Do not edit files. Report concrete cleanup opportunities in priority order with file references and explain the expected benefit and risk of each.
```

For a narrow page cleanup:

```text
Use the maintenance_cleaner agent to clean up the TW Device Browser only. Preserve behavior and catalog data, update its tests and README, run the relevant page tests and npm run build, and leave the changes uncommitted.
```

In the Codex CLI, `/agent` lets you inspect or switch between spawned agent
threads while they run. In the Codex app or IDE extension, the background-agent
panel shows active and completed agent threads.

## What the agent is designed to catch

- Stale imports, paths, documentation, and build artifacts.
- Duplicated metadata or constants that can drift.
- Page modules that do not follow the suite architecture.
- Misplaced tests and missing maintenance regression tests.
- Dead files, unused code, and avoidable cross-page coupling.
- Release-version drift.
- Changes that unnecessarily hurt older mobile-browser performance.

It deliberately avoids speculative rewrites, dependency churn, destructive
cleanup, hand-editing `dist`, and Git publishing without explicit permission.

## When to use the main agent instead

Use the normal Codex agent for feature design, sourcebook interpretation, major
UI work, or tasks whose primary purpose is new functionality. The maintenance
agent is best when the requested outcome is cleanup, consistency, verification,
or reducing future maintenance cost.

## Release checklist

1. Update the version in `package.json` and the root entries in
   `package-lock.json`.
2. Confirm `src/lib/release.js` still derives the footer label from package
   metadata.
3. Update release-specific documentation.
4. Run `npm run check`.
5. Review `git diff --check` and generated `dist/` changes.
6. Commit and push only when explicitly requested.
