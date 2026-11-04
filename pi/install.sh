#!/usr/bin/env bash
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"

echo "NONZERO Pi v7.16.0 installer"
if ! command -v chromium >/dev/null 2>&1 && ! command -v chromium-browser >/dev/null 2>&1; then
  echo "Installing Chromium (sudo password may be requested)..."
  sudo apt-get update
  sudo apt-get install -y chromium || sudo apt-get install -y chromium-browser
fi
sudo apt-get install -y python3 python3-bleak bluez libusb-1.0-0 curl unzip x11-xserver-utils >/dev/null
sudo install -m 0644 "$HERE/systemd/99-nonzero-concept2.rules" /etc/udev/rules.d/99-nonzero-concept2.rules
sudo udevadm control --reload-rules
sudo udevadm trigger

mkdir -p "$HOME/.local/bin"
install -m 0755 "$HERE/bin/nonzero-update" "$HOME/.local/bin/nonzero-update"
"$HOME/.local/bin/nonzero-update" "$HERE"

printf '\nNONZERO v7.16.0 is installed and running.\n'
printf 'Pairing and Chromium profile were preserved.\n'
printf 'Future update: nonzero-update /path/to/NONZERO-Pi-version.zip\n'
printf 'Rollback: nonzero-update --rollback\n'
printf 'Status: nonzero-update --status\n'
