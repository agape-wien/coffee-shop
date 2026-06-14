# Coffee Shop Ordering App

Real-time ordering system for a coffee shop. Customers order via kiosk or mobile (QR code at table). Baristas see live queues. Staff manage the menu via an admin panel.

**Tech stack:** React + TypeScript + Vite · Node.js + Express · Socket.io · PostgreSQL + Prisma · Docker

For architecture decisions and coding conventions see `CLAUDE.md` and `docs/`.

---

## System requirements

### Development machine
| Requirement | Notes |
|-------------|-------|
| Docker + Docker Compose | Both dev and prod. [Install Docker](https://docs.docker.com/engine/install/) — Compose is included. |
| Node.js 25.x | Required on the host for running e2e tests. Use `nvm` to manage versions. |
| Git | For cloning and version control. |

### Production (Raspberry Pi)
| Requirement | Notes |
|-------------|-------|
| Raspberry Pi 3B or newer | arm64, built-in WiFi |
| Raspberry Pi OS (Bookworm) | |
| Docker + Docker Compose | [Raspberry Pi install guide](https://docs.docker.com/engine/install/raspberry-pi-os/) |
| Git | For pulling updates |

---

## Development

### First setup

```bash
git clone <repo-url>
cd coffee-shop
cp .env.example .env          # default values in .env.example work for dev without changes
docker compose up -d          # starts PostgreSQL + server with hot reload; seeds Prisma schema on start
```

To populate the database with menu items and tables (run once after first start):
```bash
docker compose exec server npm run db:seed --workspace=server
```

The app is now at **http://localhost:3001**

| URL | Who uses it |
|-----|-------------|
| `/order` | Customers and bar staff (kiosk). Append `?table=<qrToken>` for QR/mobile. |
| `/barista` | Barista screen |
| `/counter` | Counter screen |
| `/pickup` | Pickup display (big screen, read-only) |
| `/management` | Admin panel — password set from `ADMIN_PASSWORD` on first start, then managed in Settings |

### Resetting the admin password

The `ADMIN_PASSWORD` value in `.env` is used **once** — on first startup, when no password row exists yet. After that, the hashed password lives in the database and the env var is never read again. Changing `.env` does nothing while the row exists.

To reset the password back to the current `ADMIN_PASSWORD` value:

```bash
# 1. Delete the password row
docker compose exec db psql -U coffee -d coffeedb -c 'DELETE FROM "AdminConfig";'

# 2. Restart the server — it will re-read ADMIN_PASSWORD and create a fresh row
docker compose restart server
```

You can then log in with the value in `.env` and change it via **Management → Settings → Change password**.

---

### Running the dev server

```bash
docker compose up -d          # start (or resume) all services
docker compose down           # stop
docker compose down -v        # stop and delete the database volume
docker compose logs -f server # tail server logs
```

### Running tests

Tests run on the host machine against the running dev server. They open a real Chromium browser and exercise the full stack — ordering, real-time socket updates, barista/counter flows.

**One-time setup** (after cloning, or after `npm install` adds new packages):
```bash
npm install                        # installs Playwright on the host
npx playwright install chromium    # downloads the browser binary (~150 MB)
```

**Running tests:**
```bash
# Dev server must be running first (docker compose up -d)

npm run test:e2e          # headless, results in terminal
npm run test:e2e:ui       # interactive Playwright UI — shows browser, step-by-step
```

Tests are in `e2e/` and run sequentially against a live DB. They place real orders — intentional and harmless on a dev instance. Never run the test suite against production.

---

## Production deployment (Raspberry Pi)

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
ssh -T git@github.com   # should respond: "Hi ... You've successfully authenticated"
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

> **Warning:** the seed wipes all existing data before inserting. Do not run this again once real orders or menu changes exist — use the `/management` panel instead.

### 4. Access the app

```bash
hostname -I    # find the Pi's IP on the current network
```

The app runs on port 80: `http://<pi-ip>/order`, `/barista`, `/counter`, `/pickup`, `/management`

---

## Updating the app (production)

Push changes to the repo, then on the Pi:

```bash
cd /opt/coffee-shop && bash autoupdate.sh
```

Pulls latest code, rebuilds the image, restarts containers. Docker layer caching keeps rebuilds fast — `npm install` only re-runs when `package.json` changes. The same script runs automatically on every reboot.

---

## Useful production commands

```bash
# View live server logs
docker compose -f docker-compose.prod.yaml logs -f server

# Restart containers without rebuilding
docker compose -f docker-compose.prod.yaml restart

# Stop everything
docker compose -f docker-compose.prod.yaml down

# Check the auto-start service
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
- [Cross-cutting behaviours](docs/manual/06-cross-cutting.md) — language, dark mode, order numbers, real-time
