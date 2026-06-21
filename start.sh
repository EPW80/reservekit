#!/usr/bin/env bash
#
# start.sh — one-command local startup for ReserveKit.
#
# What it does:
#   1. Ensures a .env exists (generates a strong JWT_SECRET if creating one).
#   2. Installs dependencies (root + client) if missing.
#   3. Ensures a Postgres is reachable at DATABASE_URL — reuses one if it's
#      already up, otherwise spins up a Docker container on the same port.
#   4. Runs migrations + seed.
#   5. Starts the API (:3000) and client (:5173) together.
#
# Override defaults with env vars, e.g.:
#   DB_PORT=5544 ./start.sh         # host port when *creating* a fresh .env
#   SKIP_DOCKER=1 ./start.sh        # never start Docker; just use DATABASE_URL
#   SKIP_SEED=1 ./start.sh          # skip seeding demo data
#
set -euo pipefail

cd "$(dirname "$0")"

DB_PORT="${DB_PORT:-5432}"
DB_NAME="reservekit"
DB_CONTAINER="reservekit-pg"

log() { printf '\033[1;36m▶ %s\033[0m\n' "$1"; }
err() { printf '\033[1;31m✖ %s\033[0m\n' "$1" >&2; }

# 1. ── .env ──────────────────────────────────────────────────────────────────
if [ ! -f .env ]; then
  log "Creating .env (generating a JWT secret)…"
  SECRET="$(openssl rand -hex 32 2>/dev/null || node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
  cat > .env <<EOF
PORT=3000
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:5173
DATABASE_URL=postgres://postgres:postgres@localhost:${DB_PORT}/${DB_NAME}
JWT_SECRET=${SECRET}
EOF
else
  log ".env already exists — leaving it untouched."
fi

# 2. ── dependencies ──────────────────────────────────────────────────────────
if [ ! -d node_modules ]; then
  log "Installing root dependencies…"
  npm install
fi
if [ ! -d client/node_modules ]; then
  log "Installing client dependencies…"
  npm install --prefix client
fi

# 3. ── database ──────────────────────────────────────────────────────────────
# Derive host/port from DATABASE_URL so Docker and the app always agree.
DB_URL="$(grep -E '^DATABASE_URL=' .env | head -1 | cut -d= -f2- | tr -d "\"'")"
hostport="${DB_URL#*@}"        # strip scheme + credentials  → host:port/db…
hostport="${hostport%%/*}"     # strip /db and query         → host:port
DB_HOST="${hostport%%:*}"
DB_PORT_ACTUAL="${hostport##*:}"
[ "$DB_PORT_ACTUAL" = "$DB_HOST" ] && DB_PORT_ACTUAL=5432   # no explicit :port

db_reachable() { timeout 2 bash -c ">/dev/tcp/${DB_HOST}/${DB_PORT_ACTUAL}" 2>/dev/null; }

if db_reachable; then
  log "Postgres already reachable at ${DB_HOST}:${DB_PORT_ACTUAL} — using it."
elif [ -n "${SKIP_DOCKER:-}" ]; then
  err "No Postgres reachable at ${DB_HOST}:${DB_PORT_ACTUAL} and SKIP_DOCKER is set."
  err "Start a database there (or unset SKIP_DOCKER to use Docker)."
  exit 1
else
  if ! command -v docker >/dev/null 2>&1; then
    err "Docker not found and no DB reachable at ${DB_HOST}:${DB_PORT_ACTUAL}."
    err "Install Docker, or start your own Postgres and re-run with SKIP_DOCKER=1."
    exit 1
  fi

  docker rm -f "${DB_CONTAINER}" >/dev/null 2>&1 || true
  log "Starting Postgres container '${DB_CONTAINER}' on port ${DB_PORT_ACTUAL}…"
  if ! docker run -d --name "${DB_CONTAINER}" \
    -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB="${DB_NAME}" \
    -p "${DB_PORT_ACTUAL}:5432" postgres:16 >/dev/null; then
    err "Could not start Postgres on port ${DB_PORT_ACTUAL} (is it already in use?)."
    err "Pick a free port: edit DATABASE_URL in .env (or run 'DB_PORT=5544 ./start.sh' after deleting .env)."
    exit 1
  fi

  log "Waiting for Postgres to accept connections…"
  for i in $(seq 1 30); do
    if docker exec "${DB_CONTAINER}" pg_isready -U postgres >/dev/null 2>&1; then
      log "Postgres is ready."
      break
    fi
    [ "$i" -eq 30 ] && { err "Postgres did not become ready in time."; exit 1; }
    sleep 1
  done
fi

# 4. ── schema + data ─────────────────────────────────────────────────────────
log "Running migrations…"
npm run db:migrate

if [ -z "${SKIP_SEED:-}" ]; then
  log "Seeding demo data…"
  npm run db:seed
fi

# 5. ── run ───────────────────────────────────────────────────────────────────
log "Starting API (:3000) and client (:5173) — press Ctrl+C to stop."
npm run dev
