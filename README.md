# Coffee Shop Ordering App

Real-time ordering system for a coffee shop. Customers order via kiosk or mobile (QR code). Baristas see live queues. Staff manage the menu via an admin panel.

**Tech stack:** React + TypeScript + Vite · Node.js + Express · Socket.io · PostgreSQL + Prisma · Docker

For full architecture and coding conventions see `CLAUDE.md` and `docs/`.

---

## Development

```bash
cp .env.example .env        # adjust values if needed
docker compose up -d        # starts db + server with hot reload
# App: http://localhost:3001
```

To populate the database with initial data:
```bash
docker compose exec server npm run db:seed --workspace=server
```

| URL | Who uses it |
|-----|-------------|
| `/order` | Customers and bar staff (kiosk). Append `?table=<qrToken>` for the QR/mobile variant |
| `/barista` | Barista screen |
| `/counter` | Counter screen |
| `/pickup` | Pickup display (big screen) |
| `/management` | Admin panel (default password is in `.env`, change it in Settings after first login) |

To delete containers and database: `docker compose down -v`

---

## Production deployment (Raspberry Pi)

### Prerequisites

- Raspberry Pi 3B or newer (built-in WiFi + arm64 Docker support)
- Raspberry Pi OS (Bookworm recommended)
- Docker installed: https://docs.docker.com/engine/install/raspberry-pi-os/

### 1. SSH key for the repository

If the repo is private, set up a deploy key so the Pi can pull it.

```bash
ssh-keygen -t ed25519 -C "pi-deploy" -f ~/.ssh/id_ed25519_aonisor -N ""
cat ~/.ssh/id_ed25519_aonisor.pub   # add this as a deploy key in GitHub repo settings
```

Tell SSH to use it for GitHub:
```bash
cat >> ~/.ssh/config <<EOF
Host github.com
  IdentityFile ~/.ssh/id_ed25519_aonisor
  User git
EOF
chmod 600 ~/.ssh/config
ssh -T git@github.com               # should respond: "Hi ... You've successfully authenticated"
```

### 2. Clone and run setup

```bash
sudo git clone <repo-url> /opt/coffee-shop
sudo chown -R agapewien:agapewien /opt/coffee-shop
cd /opt/coffee-shop
sudo bash setup.sh
```

`setup.sh` prompts for credentials, writes `.env`, builds and starts the containers, adds the user to the `docker` group, and installs the systemd service that auto-starts the app on every boot.

### 3. Seed the database

Run **once** on a fresh install:

```bash
docker compose -f docker-compose.prod.yaml exec server sh -c "NODE_ENV=development node server/prisma/seed.js"
```

> **Warning:** The seed wipes all existing data before inserting. Do not run this again once real orders or menu changes exist — use the `/management` panel instead.

### 4. Access the app

```bash
hostname -I    # find the Pi's IP on the current network
```

The app is on port 80: `http://<pi-ip>/order`, `/barista`, `/counter`, `/pickup`, `/management`

---

## Updating the app

Push changes to the repo, then on the Pi:

```bash
cd /opt/coffee-shop && bash autoupdate.sh
```

Pulls latest code, rebuilds the image, restarts containers. Docker layer caching keeps it fast — `npm install` only re-runs when `package.json` changes. The same script runs automatically on every reboot.

---

## Useful commands on the Pi

```bash
# View server logs
docker compose -f docker-compose.prod.yaml logs -f server

# Restart without rebuilding
docker compose -f docker-compose.prod.yaml restart

# Stop everything
docker compose -f docker-compose.prod.yaml down

# Check auto-start service
systemctl status startupscript.service
```

---

## Documentation

- [Overview & order lifecycle](docs/manual/00-overview.md)
- [Ordering screen](docs/manual/01-ordering.md) — `/order`
- [Barista screen](docs/manual/02-barista.md) — `/barista`
- [Counter screen](docs/manual/03-counter.md) — `/counter`
- [Pickup display](docs/manual/04-pickup.md) — `/pickup`
- [Management screen](docs/manual/05-management.md) — `/management`
- [Cross-cutting behaviors](docs/manual/06-cross-cutting.md) — language, dark mode, order numbers, real-time
