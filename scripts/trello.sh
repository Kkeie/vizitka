#!/usr/bin/env bash
# Trello CLI wrapper for AI agents.
# Requires: curl, jq
# Env: TRELLO_API_KEY, TRELLO_TOKEN, TRELLO_BOARD_ID
#
# Usage:
#   trello.sh next-task                    — first card from «Сделать»
#   trello.sh card <card-id>               — card details (name, desc, checklists)
#   trello.sh move <card-id> <list-name>   — move card to named list
#   trello.sh comment <card-id> <text>     — add comment to card
#   trello.sh lists                        — all lists on the board

set -euo pipefail

API="https://api.trello.com/1"
KEY="${TRELLO_API_KEY:?TRELLO_API_KEY is not set}"
TOKEN="${TRELLO_TOKEN:?TRELLO_TOKEN is not set}"
BOARD="${TRELLO_BOARD_ID:?TRELLO_BOARD_ID is not set}"
AUTH="key=${KEY}&token=${TOKEN}"

cmd="${1:-}"

_get()  { curl -sf "${API}${1}?${AUTH}&${2:-}"; }
_put()  { curl -sf -X PUT  "${API}${1}?${AUTH}&${2:-}"; }
_post() { curl -sf -X POST "${API}${1}?${AUTH}&${2:-}"; }

# Resolve list name → id
_list_id() {
  local name="$1"
  local id
  id=$(_get "/boards/${BOARD}/lists" "fields=id,name" \
    | jq -r --arg n "$name" '.[] | select(.name == $n) | .id')
  if [[ -z "$id" ]]; then
    echo "ERROR: list «${name}» not found on board ${BOARD}" >&2
    exit 1
  fi
  echo "$id"
}

case "$cmd" in

  lists)
    _get "/boards/${BOARD}/lists" "fields=id,name" | jq '.'
    ;;

  next-task)
    list_id=$(_list_id "Сделать")
    card=$(_get "/lists/${list_id}/cards" "fields=id,name,desc,idChecklists" \
      | jq '.[0] // empty')
    if [[ -z "$card" ]]; then
      echo '{"error":"no cards in «Сделать»"}'
      exit 0
    fi
    # Attach checklist items if any
    card_id=$(echo "$card" | jq -r '.id')
    checklists=$(_get "/cards/${card_id}/checklists" "fields=name,checkItems" \
      | jq '[.[] | {name:.name, items:[.checkItems[].name]}]')
    echo "$card" | jq --argjson cl "$checklists" '. + {checklists: $cl}'
    ;;

  card)
    card_id="${2:?Usage: trello.sh card <card-id>}"
    card=$(_get "/cards/${card_id}" "fields=id,name,desc,idList")
    checklists=$(_get "/cards/${card_id}/checklists" "fields=name,checkItems" \
      | jq '[.[] | {name:.name, items:[.checkItems[].name]}]')
    echo "$card" | jq --argjson cl "$checklists" '. + {checklists: $cl}'
    ;;

  move)
    card_id="${2:?Usage: trello.sh move <card-id> <list-name>}"
    list_name="${3:?Usage: trello.sh move <card-id> <list-name>}"
    list_id=$(_list_id "$list_name")
    _put "/cards/${card_id}" "idList=${list_id}" | jq '{id:.id, name:.name, list:.idList}'
    ;;

  comment)
    card_id="${2:?Usage: trello.sh comment <card-id> <text>}"
    text="${3:?Usage: trello.sh comment <card-id> <text>}"
    # URL-encode the text
    encoded=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$text")
    _post "/cards/${card_id}/actions/comments" "text=${encoded}" | jq '{id:.id}'
    ;;

  *)
    echo "Usage: trello.sh <next-task|card|move|comment|lists>" >&2
    echo "  next-task                    — first card from «Сделать»" >&2
    echo "  card <card-id>               — card details" >&2
    echo "  move <card-id> <list-name>   — move card to list" >&2
    echo "  comment <card-id> <text>     — add comment" >&2
    echo "  lists                        — all lists on board" >&2
    exit 1
    ;;
esac
