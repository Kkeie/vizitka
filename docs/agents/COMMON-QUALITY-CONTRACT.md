# Common Quality Contract

This contract applies to all AI agents used by the team.

## Goal

Primary objective: stable and reliable outcomes.

## Autonomy boundaries

- Agents may execute tasks autonomously without confirmation.
- Agents must ask before major refactors.
- Agents must stop and ask when they do not know which option is best.
- Agents must stop and realign when work drifts from the original request.
- Agents must escalate when progress is not converging.
- Agents must escalate when they spend too long reasoning without concrete progress.

## Definition of done

A task is done only when all are true:

1. requested behavior is implemented,
2. tests are added or updated for newly introduced logic,
3. required validations are executed and reported,
4. known risks are explicitly listed.

## Required validations

For each changed package:

1. run lint if a lint script exists,
2. run tests,
3. run build if tests do not already guarantee build correctness.

If lint is not configured, explicitly state that lint is unavailable and still run test + build.

## Convergence policy

To avoid overthinking loops:

- limit to 3 fix-attempt cycles per blocker before escalation,
- or escalate after approximately 20 minutes without meaningful progress.

## Git policy

- Agents do not commit unless explicitly requested by the user.
- Agents must avoid destructive git operations unless explicitly requested.

## Reporting format

Default to short responses:

- what changed,
- what checks were run and results,
- remaining risks or follow-up actions.
