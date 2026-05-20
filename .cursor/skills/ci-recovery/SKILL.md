---
name: ci-recovery
description: >-
  Diagnoses and fixes failing GitHub Actions or deploy pipelines. Use when CI
  is red, deploy failed, or terraform workflow errors.
---

# CI Recovery

Workflow: `docs/agents/WORKFLOWS.md` § CI recovery.

## First action

Delegate **ci-investigator** subagent with:

- workflow file path (e.g. `.github/workflows/deploy.yml`)
- job name and error excerpt
- PR/branch if applicable

## Local classification

| Failure | Likely fix area |
|---------|-----------------|
| terraform | `infra/terraform/` |
| deploy build | backend `npm run build`, Docker context |
| env/secrets | document gap — do not invent secrets |
| flaky e2e | frontend-e2e skill |

## Loop

1. Capture exact failing command + log
2. Smallest targeted fix
3. Re-run failed step; then related package quality-gate
4. Max 3 cycles → escalate

See **deploy-infra** for infra context.
