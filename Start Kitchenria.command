#!/bin/bash
# ------------------------------------------------------------------
#  Double-click this file on a Mac to play Kitchenria on your computer.
#  It starts a tiny private web server (only your Mac can see it)
#  and opens the game in your web browser.
#  Keep the Terminal window open while you play; close it to stop.
# ------------------------------------------------------------------
cd "$(dirname "$0")/game" || exit 1
PORT=8123
URL="http://localhost:$PORT/"

# Already running? Then just open the game again.
if curl -s -o /dev/null "$URL"; then
  open "$URL"
  exit 0
fi

if /usr/bin/python3 -c "" >/dev/null 2>&1; then
  echo ""
  echo "  🍳  Kitchenria is running at  $URL"
  echo "      Keep this window open while you play."
  echo "      To stop: close this window (or press Control + C)."
  echo ""
  (sleep 1; open "$URL") &
  /usr/bin/python3 -m http.server "$PORT" --bind 127.0.0.1 >/dev/null 2>&1
else
  echo ""
  echo "  Your Mac needs Apple's free 'Command Line Developer Tools' to run the game locally."
  echo "  A window should pop up offering to install them: click Install, wait until it"
  echo "  finishes, then double-click 'Start Kitchenria' again."
  echo ""
  read -r -p "  Press Return to close this window."
fi
