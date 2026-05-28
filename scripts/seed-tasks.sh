#!/usr/bin/env bash
# Dev seed: sample tasks for step 4 UI verification
set -euo pipefail
BASE="${BASE_URL:-http://localhost:3000}"

post() {
  curl -s -X POST "$BASE/api/tasks" \
    -H 'Content-Type: application/json' \
    -d "$1" > /dev/null
  echo "  + $1"
}

echo "Seeding tasks at $BASE ..."
post '{"title":"Review PR — ollama main","status":"Inbox","priority":"High","location_tag":"office","estimate_minutes":30}'
post '{"title":"Review PR — security patch","status":"Scheduled","priority":"High","location_tag":"office","estimate_minutes":45,"scheduled_at":"2026-05-28T16:00:00.000Z"}'
post '{"title":"Write weekly update","status":"Backlog","priority":"Medium","location_tag":"home","estimate_minutes":45}'
post '{"title":"Deploy hotfix","status":"Scheduled","priority":"Urgent","location_tag":"home","estimate_minutes":60,"scheduled_at":"2026-05-28T14:00:00.000Z"}'
post '{"title":"Morning standup prep","status":"In Progress","priority":"Medium","location_tag":"office","estimate_minutes":15}'
post '{"title":"Lunch walk","status":"Paused","priority":"Low","location_tag":"outside_williamsburg","estimate_minutes":20}'
echo "Done."
