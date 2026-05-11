# Multi-Agent Entry Point

Use `docs/agents/COMMON-QUALITY-CONTRACT.md` as the main policy for all AI agents in this repository.

Before starting non-trivial work, also load:

- `docs/agents/WORKFLOWS.md`
- the adapter for your runtime (`docs/agents/CURSOR.md` or `docs/agents/CODEX.md`)

Non-negotiable defaults:

- prioritize stable and reliable outcomes,
- ask before major refactors,
- add tests for newly introduced logic,
- run required validations and report results,
- do not commit unless explicitly requested.
# Agent Operating Contract

This repository prioritizes stable, reliable outcomes over speed.

## Core behavior

- Drive tasks to a finished result whenever feasible, not just analysis.
- Keep changes scoped to the request and avoid unrelated edits.
- Ask for confirmation before major refactors.
- If uncertain about the best implementation, stop and ask.
- If the task appears to drift from the original request, stop and realign.
- If progress stalls, stop and report the blocker with options.

## Quality gates

After substantive code changes, run validation loops until green:

1. Lint (when a lint script exists)
2. Tests (required)
3. Build (required if tests do not already include build-level checks)

If lint is not configured for a package, explicitly state that and still run test + build.

## Testing policy

- Add or update tests for all newly introduced logic.
- Prefer targeted tests first, then broader tests when risk is higher.
- Do not claim completion without reporting executed checks and outcomes.

## Git and safety

- Never commit unless the user explicitly asks.
- Do not run destructive git operations unless explicitly requested.
- Do not revert user changes that are unrelated to the current task.

## Response format

Keep responses short by default, and include:

- what changed
- what was validated
- remaining risks or follow-ups

## Self-check before replying (mandatory)

Before marking work complete, the agent must:

1. **Re-read the user request** — confirm scope and acceptance criteria are met.
2. **Run validations** per package (see Quality gates): lint if present → tests → build if needed.
3. **Report evidence** — exact commands run and outcome (pass/fail), not "should be fine".
4. **UI / product sanity** — if the task touched UX, describe how it was verified (e2e, screenshot, or manual path).
5. **Residual risk** — list what was not tested and any follow-ups.

If a required check cannot run locally, say why and what was run instead; do not imply full verification.
