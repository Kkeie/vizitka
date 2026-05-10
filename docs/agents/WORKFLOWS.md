# Standard Workflows

These workflows are agent-agnostic and should be reused by Cursor, Codex, or other assistants.

## 1) Reliable delivery loop

Use for feature work and non-trivial changes.

1. Clarify acceptance criteria.
2. Implement minimum scoped change.
3. Add/update tests for new logic.
4. Run required validations (lint if present, tests, build).
5. Fix failures and repeat validations until green.
6. Report changes, checks, and residual risks.

Use a maximum of 3 correction cycles before escalation.

## 2) Bugfix with regression protection

Use for defects and regressions.

1. Reproduce the issue.
2. Identify root cause hypothesis.
3. Add a failing regression test.
4. Implement the smallest correct fix.
5. Re-run regression test and full required validations.
6. Report root cause, fix scope, and confidence.

## 3) CI recovery loop

Use for failing pipelines.

1. Capture exact failing command and error.
2. Classify failure (lint/test/build/env/flaky).
3. Apply the smallest targeted fix.
4. Re-run failed command first, then full required validations.
5. Repeat until green or escalate with a blocker report.

If a fix cannot be validated locally, report the exact gap and propose the next safest step.

## Escalation triggers

Escalate to user when:

- best implementation path is ambiguous,
- a major refactor is required,
- the request and current path no longer match,
- repeated attempts are not converging,
- the agent is thinking too long without concrete progress.
