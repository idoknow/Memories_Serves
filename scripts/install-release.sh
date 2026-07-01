#!/usr/bin/env bash
set -euo pipefail

REPO="idoknow/Memories_Serves"
VERSION="${1:-latest}"
INSTALL_DIR="${INSTALL_DIR:-/opt/memories-serves}"
ASSET_NAME="memories-serves-linux-x86_64.tar.gz"
SERVICE_NAME="${SERVICE_NAME:-memories-serves}"

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required" >&2
  exit 1
fi

if ! command -v tar >/dev/null 2>&1; then
  echo "tar is required" >&2
  exit 1
fi

if [[ "$VERSION" == "latest" ]]; then
  DOWNLOAD_URL="https://github.com/${REPO}/releases/latest/download/${ASSET_NAME}"
else
  DOWNLOAD_URL="https://github.com/${REPO}/releases/download/${VERSION}/${ASSET_NAME}"
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

echo "Downloading ${DOWNLOAD_URL}"
curl -fL "$DOWNLOAD_URL" -o "$TMP_DIR/$ASSET_NAME"

# Stop service if running via systemd
if command -v systemctl >/dev/null 2>&1 && systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
  echo "Stopping ${SERVICE_NAME} service..."
  systemctl stop "$SERVICE_NAME"
fi

mkdir -p "$INSTALL_DIR"
tar -xzf "$TMP_DIR/$ASSET_NAME" -C "$INSTALL_DIR" memories-serves LICENSE README.md
chmod +x "$INSTALL_DIR/memories-serves"

# Restart service if systemd unit exists
if command -v systemctl >/dev/null 2>&1 && systemctl is-enabled --quiet "$SERVICE_NAME" 2>/dev/null; then
  echo "Starting ${SERVICE_NAME} service..."
  systemctl start "$SERVICE_NAME"
fi

cat <<EOF
Installed memories-serves ${VERSION} to ${INSTALL_DIR}

Run it with:
  cd ${INSTALL_DIR}
  HOST=0.0.0.0 PORT=3000 ./memories-serves
EOF