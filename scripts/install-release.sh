#!/usr/bin/env bash
set -euo pipefail

REPO="idoknow/Memories_Serves"
VERSION="${1:-latest}"
INSTALL_DIR="${INSTALL_DIR:-/opt/memories-serves}"
ASSET_NAME="memories-serves-linux-x86_64.tar.gz"

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

mkdir -p "$INSTALL_DIR"
tar -xzf "$TMP_DIR/$ASSET_NAME" -C "$INSTALL_DIR" memories-serves LICENSE README.md
chmod +x "$INSTALL_DIR/memories-serves"

cat <<EOF
Installed memories-serves to ${INSTALL_DIR}

Run it with:
  cd ${INSTALL_DIR}
  HOST=0.0.0.0 PORT=3000 ./memories-serves
EOF