# Trello Integration

This document describes how AI agents interact with the project's Trello board.

## Board

URL: https://trello.com/b/hLz2cifW  
Columns: **Бэклог → Сделать → В работе → Тестирование → Сделано → Архив**

The agent owns the cycle up to «Сделано». «Архив» is moved by a human.

---

## Claude Code (MCP)

Claude Code connects to Trello via the MCP server configured in `.mcp.json`.  
The server is `@delorenj/mcp-server-trello` and exposes Trello as native tools.

**Setup:** `.mcp.json` is gitignored. Copy `.mcp.json.example` and fill in credentials:

```json
{
  "mcpServers": {
    "trello": {
      "command": "npx",
      "args": ["-y", "@delorenj/mcp-server-trello"],
      "env": {
        "TRELLO_API_KEY": "...",
        "TRELLO_TOKEN": "...",
        "TRELLO_BOARD_ID": "..."
      }
    }
  }
}
```

**Available MCP tools** (called automatically by the agent, no shell needed):

| Tool | Purpose |
|---|---|
| `mcp__trello__get_cards_by_list_name` | Get cards from a named list |
| `mcp__trello__move_card_to_list` | Move card to a named list |
| `mcp__trello__add_comment_to_card` | Add comment to a card |
| `mcp__trello__get_card_info` | Get card details, checklists |

**Trigger:** type `/do-task` or ask "возьми задачу из Trello и сделай".  
The full workflow is defined in `.claude/commands/do-task.md`.

---

## Codex (shell script)

Codex does not support MCP. All Trello operations go through `scripts/trello.sh`,
which wraps the Trello REST API via `curl` + `jq`.

**Setup:** set environment variables in Codex's Secrets/Environment settings:

```
TRELLO_API_KEY=...
TRELLO_TOKEN=...
TRELLO_BOARD_ID=...
```

**Available commands:**

```bash
# Get first card from «Сделать» (returns JSON with id, name, desc, checklists)
bash scripts/trello.sh next-task

# Move card to a list (exact column name required)
bash scripts/trello.sh move <card-id> "В работе"
bash scripts/trello.sh move <card-id> "Тестирование"
bash scripts/trello.sh move <card-id> "Сделано"

# Add a comment to a card
bash scripts/trello.sh comment <card-id> "text"

# Get full card details
bash scripts/trello.sh card <card-id>

# List all columns on the board
bash scripts/trello.sh lists
```

**Trigger:** tell Codex to follow the workflow from `AGENTS.md`.

---

## Credentials

| Variable | Where to get |
|---|---|
| `TRELLO_API_KEY` | https://trello.com/app-key |
| `TRELLO_TOKEN` | https://trello.com/1/authorize?expiration=never&scope=read,write&response_type=token&key=YOUR_KEY |
| `TRELLO_BOARD_ID` | Short code from board URL: `trello.com/b/<ID>/...` |
