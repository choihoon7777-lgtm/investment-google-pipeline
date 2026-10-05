#!/usr/bin/env bash
set -euo pipefail

echo "== Kiwoom CLI bootstrap =="

if command -v uv >/dev/null 2>&1; then
  echo "[1/5] Installing/upgrading kiwoom-cli with uv..."
  if command -v kiwoom >/dev/null 2>&1; then
    uv tool upgrade kiwoom-cli || uv tool install kiwoom-cli
  else
    uv tool install kiwoom-cli
  fi
elif command -v pipx >/dev/null 2>&1; then
  echo "[1/5] Installing/upgrading kiwoom-cli with pipx..."
  pipx install kiwoom-cli --force
else
  echo "uv or pipx is required. Install uv first: https://docs.astral.sh/uv/"
  exit 1
fi

echo
echo "Installed CLI:"
kiwoom --version

echo
echo "[2/5] Authentication setup"
echo "IMPORTANT: Enter Kiwoom App Key/Secret only into the CLI prompt. Do not paste them into chat or GitHub."
kiwoom config setup
kiwoom config domain prod
kiwoom auth login

echo
echo "[3/5] Connection status"
kiwoom auth status
kiwoom config show

echo
echo "[4/5] Samsung Electronics (005930) lookup"
kiwoom stock info 005930
kiwoom -f json stock info 005930 > samsung-005930.json
echo "Saved JSON: samsung-005930.json"

echo
echo "[5/5] AI command discovery"
kiwoom -f json describe --paths > kiwoom-command-paths.json
kiwoom find "거래량" || true
kiwoom find "실시간" || true
kiwoom find "프로그램" || true
kiwoom find "조건검색" || true

echo
echo "Optional radar checks:"
echo "  kiwoom market rank hot"
echo "  kiwoom market rank amount"
echo "  kiwoom market rank volume-surge"
echo "  kiwoom market rank foreign-inst"
echo "  kiwoom stream quote 005930 --max-events 10"
echo
echo "DONE"
