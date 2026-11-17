#!/bin/bash
# Double-click me once to sign in to Garmin (and optionally Hevy) and pull your last 30 days.
"$(dirname "$0")/sync/run.sh" --login --days 30
echo
read -n 1 -s -r -p "Press any key to close this window."
