# Rifts Tool Suite code-comment agent

The project-scoped `code_comment_maintainer` agent at
`.codex/agents/code-comment-maintainer.toml` audits comments and API
documentation without changing runtime behavior.

## How to use it

Start a Codex session at the repository root, then request a scoped audit:

```text
Use the code_comment_maintainer agent to audit the current changes. Add durable
JSDoc or invariant comments where they clarify contracts and constraints,
remove inaccurate comments, run verification, and do not commit or push.
```

For a review with no edits:

```text
Use the code_comment_maintainer agent in review mode. Report missing, stale, or
redundant comments with file references, but do not edit files.
```

## Comment policy

The agent documents exported JavaScript contracts with JSDoc when useful and
uses Python docstrings for Python modules and functions. Inline comments are
reserved for non-obvious reasons and constraints such as stable IDs, ordering,
source boundaries, conservative OCR repair, explicit correction tables, and
review-before-overwrite workflows.

It avoids comments that narrate syntax, explain obvious Vue markup or CSS, or
repeat architecture already maintained in repository documentation. It also
checks nearby comments for drift so added documentation remains trustworthy.

## Verification

The agent runs focused formatting, linting, and tests while working, followed by
`npm run check` and `git diff --check`. Changes remain uncommitted unless the
user explicitly requests otherwise.

## End-of-day use

The repository end-of-day workflow runs this agent after the maintenance audit
and before the final quality gate. Scope that pass to newly generated or
materially changed code so stable files are not churned merely to add comments.
