# Escalation Matrix

Use this matrix to decide whether to continue autonomously or ask the user.

## Ask immediately

- Major refactor required to complete the task.
- Two or more implementation options are valid and trade-offs are material.
- The request appears to conflict with current code constraints.
- The task objective appears to have drifted.

## Ask after bounded attempts

- Validation keeps failing after 3 focused fix attempts.
- Root cause is still uncertain after targeted debugging.
- Repro is unstable and blocks confidence in the fix.

## Ask after timebox

- No meaningful progress for ~20 minutes.
- Agent keeps analyzing without producing actionable edits.

## What to include when escalating

- current status,
- what was tried,
- concrete blocker,
- 1-2 best options with risks.
