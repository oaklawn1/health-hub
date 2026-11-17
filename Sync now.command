#!/bin/bash
# Double-click me to pull the latest Garmin and Hevy data (last 7 days).
"$(dirname "$0")/sync/run.sh" --days 7
echo
read -n 1 -s -r -p "Press any key to close this window."
