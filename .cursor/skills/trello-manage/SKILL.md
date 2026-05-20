---
name: trello-manage
description: >-
  Lists, moves, or comments Trello cards without full do-task implementation.
  Use to check board status, move a card manually, add progress comment, or
  inspect checklists on a card.
---

# Trello Manage

Full delivery: use skill **do-task** instead.

API: `docs/agents/TRELLO.md`, `scripts/trello.sh`.

## Commands

```bash
bash scripts/trello.sh lists
bash scripts/trello.sh next-task
bash scripts/trello.sh card <card-id>
bash scripts/trello.sh move <card-id> "В работе"
bash scripts/trello.sh comment <card-id> "progress: ..."
```

MCP: `mcp__trello__*` if configured.

## Columns (exact names)

Бэклог → Сделать → В работе → Тестирование → Сделано → Архив

Agent may not move to Архив.
