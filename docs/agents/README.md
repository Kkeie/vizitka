# AI Agent Playbook

This folder is the single source of truth for autonomous agent behavior in this repository.

## Files

- `COMMON-QUALITY-CONTRACT.md` - universal policy for all agents.
- `WORKFLOWS.md` - reusable execution loops for delivery, bugfixing, and CI recovery.
- `ESCALATION-MATRIX.md` - exact conditions when the agent must stop and ask.
- `TASK-BRIEF-TEMPLATE.md` - short task handoff template to improve output quality.
- `CURSOR.md` - how to apply this playbook in Cursor (skills + subagents).
- `CODEX.md` - how to apply this playbook in Codex.
- `SUBAGENTS.md` - when to use Cursor Task subagents (explore, shell, CI, …).

## Priority order

When rules conflict, use:

1. user request
2. safety constraints of the current tool/runtime
3. `COMMON-QUALITY-CONTRACT.md`
4. tool-specific adapter (`CURSOR.md` or `CODEX.md`)

## Team usage

1. Start every non-trivial task from `AGENTS.md` (repo root).
2. Use `TASK-BRIEF-TEMPLATE.md` when requirements are vague.
3. Apply one of the loops in `WORKFLOWS.md`.
4. If blocked or uncertain, follow `ESCALATION-MATRIX.md`.

## Cursor skills & subagents

- **Skills** (20): `.cursor/skills/README.md` — do-task, quality-gate, bugfix, bento-grid, editor-page, auth, e2e, deploy, spec-check, …
- **Subagents**: `SUBAGENTS.md` — explore / shell / ci-investigator, 10 copy-paste сценариев
- **Cursor adapter**: `CURSOR.md`
