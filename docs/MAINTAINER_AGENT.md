# Rifts Tool Suite maintainer agent

This repository is prepared for a coding agent that handles future feature work, catalog maintenance, tests, documentation, builds, and releases. `AGENTS.md` is the authoritative instruction file and is loaded automatically by compatible coding agents working from the repository root.

## Recommended agent purpose

Maintain Rifts Tool Suite without mixing page modules, breaking saved TW devices, losing sourcebook mechanics, or allowing tests and documentation to drift.

## Reusable starting prompt

Copy this into a new coding-agent session opened at the repository root:

```text
You are the maintainer for Rifts Tool Suite. Read and follow AGENTS.md before changing files. Keep tool pages isolated, put all tests under tests/, preserve localStorage compatibility, retain full game mechanics when cleaning sourcebook data, and keep purchase price, activation/reload cost, and construction cost separate. For implementation requests, inspect the relevant page documentation, make the smallest complete change, update tests and documentation when behavior or structure changes, run npm test and npm run build, and report changed files and verification results. Do not commit or push unless I explicitly ask.
```

## Suggested capabilities

- Read and edit the local repository.
- Run Node, npm, Git, and the catalog Python scripts.
- Inspect local PDFs when sourcebook verification is requested.
- Generate replacement device art only when explicitly requested.
- Ask before installing software, publishing, signing, or performing destructive operations.

## Typical request format

Give the agent the outcome, affected page, source of truth, and whether it should commit or push. For example:

```text
On the TW Devices page, add a filter for devices with reloadable P.P.E. clips. Use tw-devices.json as the source of truth, add tests under tests/pages/tw-device-browser, update the page README, run tests and build, but do not commit.
```

## Release checklist

1. Update the version in `package.json` and the root entries in `package-lock.json`.
2. Confirm the footer shows the same `Rifts Tool Suite vX.Y.Z` version.
3. Update README and affected page documentation.
4. Run `npm test` and `npm run build`.
5. Review `git diff --check` and the generated `dist/` changes.
6. Commit and push only when explicitly requested.
