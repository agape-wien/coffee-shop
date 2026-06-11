#!/bin/bash
# One-time setup script for the Raspberry Pi.
# Clone the repo to /opt/coffee-shop first, then run from inside it:
#   sudo git clone <repo-url> /opt/coffee-shop && cd /opt/coffee-shop && sudo bash setup.sh
set -e

echo "=== Coffee shop — first-time Pi setup ==="
echo ""

# Verify Docker is running.
if ! docker info > /dev/null 2>&1; then
  echo "ERROR: Docker is not running or not installed."
  echo "Install Docker first: https://docs.docker.com/engine/install/raspberry-pi-os/"
  exit 1
fi

# Create .env if it doesn't exist.
if [ -f .env ]; then
  echo ".env already exists — skipping creation. Edit it manually if needed."
else
  echo "Creating .env..."
  echo "Leave fields blank to accept the default shown in brackets."
  echo ""

  read -p "PostgreSQL password [coffee]: " PG_PASS
  PG_PASS="${PG_PASS:-coffee}"

  read -p "JWT secret (long random string) [auto-generate]: " JWT_SECRET
  if [ -z "$JWT_SECRET" ]; then
    JWT_SECRET=$(tr -dc 'A-Za-z0-9' </dev/urandom | head -c 48)
    echo "  Generated: $JWT_SECRET"
  fi

  read -p "Initial admin password: " ADMIN_PASS
  if [ -z "$ADMIN_PASS" ]; then
    echo "ERROR: Admin password cannot be empty."
    exit 1
  fi

  # CLIENT_URL is the Socket.io CORS origin.
  # '*' allows any origin — correct for a local-network-only deployment
  # where the app is accessed by IP and the IP may change with DHCP.
  cat > .env <<EOF
POSTGRES_USER=coffee
POSTGRES_PASSWORD=${PG_PASS}
POSTGRES_DB=coffeedb
DATABASE_URL=postgresql://coffee:${PG_PASS}@db:5432/coffeedb
CLIENT_URL=*
JWT_SECRET=${JWT_SECRET}
ADMIN_PASSWORD=${ADMIN_PASS}
NODE_ENV=production
PORT=3001
EOF
  echo ".env created."
fi

echo ""
echo "=== Initial build and start (this takes several minutes on first run) ==="
docker compose -f docker-compose.prod.yaml up -d --build

echo ""
echo "=== Adding pi to the docker group ==="
# The systemd service runs autoupdate.sh as the pi user.
# Without this, docker commands would fail with a permission error.
# The group change takes effect on next login — the service itself starts
# after a full reboot, by which point the group membership is active.
usermod -aG docker pi
echo "pi added to docker group."

echo ""
echo "=== Installing systemd service ==="
cp startupscript.service /etc/systemd/system/startupscript.service
systemctl daemon-reload
systemctl enable startupscript.service
echo "Service enabled — will auto-start on every boot."

echo ""
PI_IP=$(hostname -I | awk '{print $1}')
echo "=== Setup complete ==="
echo "App is running at: http://${PI_IP}"
echo "Management panel:  http://${PI_IP}/management"
