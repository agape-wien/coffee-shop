#!/bin/bash
# Runs on every boot via startupscript.service.
# Pulls latest code from git, then rebuilds and restarts the app containers.
# Docker layer caching makes rebuilds fast when only source files changed
# and skips npm install entirely when package.json hasn't changed.
set -e

cd /opt/coffee-shop

echo "[autoupdate] Pulling latest code..."
git pull

echo "[autoupdate] Rebuilding and starting containers..."
docker compose -f docker-compose.prod.yaml up -d --build

echo "[autoupdate] Done."
