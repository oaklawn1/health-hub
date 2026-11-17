#!/bin/bash
# Shared launcher: makes sure Python 3.12+ and the libraries are present, then runs sync.py.
cd "$(dirname "$0")" || exit 1
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

PY=""
for p in python3.14 python3.13 python3.12 python3; do
  if command -v "$p" >/dev/null 2>&1 && "$p" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 12) else 1)'; then PY="$p"; break; fi
done
if [ -z "$PY" ]; then
  if command -v brew >/dev/null 2>&1; then
    echo "Installing Python 3.13 (one time, takes a minute or two)..."
    brew install python@3.13 && PY="python3.13"
  fi
fi
if [ -z "$PY" ]; then
  echo "Python 3.12 or newer is needed. Install it from https://www.python.org/downloads/ and run this again."
  exit 1
fi

if [ ! -x .venv/bin/python ]; then
  echo "Setting up (one time)..."
  "$PY" -m venv .venv || exit 1
fi
.venv/bin/python -m pip install -q --upgrade pip
.venv/bin/python -m pip install -q -r requirements.txt || exit 1
.venv/bin/python sync.py "$@"
