#!/usr/bin/env bash
set -euo pipefail

POSTGRES_USER="${POSTGRES_USER:-user}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-password}"
POSTGRES_DB="${POSTGRES_DB:-spiralwave}"
POSTGRES_HOST="${POSTGRES_HOST:-127.0.0.1}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_LISTEN_ADDRESSES="${POSTGRES_LISTEN_ADDRESSES:-*}"
POSTGRES_HOST_AUTH_METHOD="${POSTGRES_HOST_AUTH_METHOD:-md5}"
POSTGRES_DATA_DIR="${POSTGRES_DATA_DIR:-/var/lib/postgresql/data}"
CLIENT_PORT="${CLIENT_PORT:-3000}"
SERVICE_URL="${SERVICE_URL:-http://127.0.0.1:$CLIENT_PORT}"

export POSTGRES_USER POSTGRES_PASSWORD POSTGRES_DB POSTGRES_HOST POSTGRES_PORT CLIENT_PORT SERVICE_URL

mkdir -p "$POSTGRES_DATA_DIR" /var/run/postgresql
chown -R postgres:postgres "$POSTGRES_DATA_DIR" /var/run/postgresql
chmod 700 "$POSTGRES_DATA_DIR"

PG_BIN_DIR="$(dirname "$(find /usr/lib/postgresql -name postgres -type f | sort | tail -n 1)")"
INITDB_BIN="$PG_BIN_DIR/initdb"
PG_CTL_BIN="$PG_BIN_DIR/pg_ctl"
PSQL_BIN="$PG_BIN_DIR/psql"

if [ ! -s "$POSTGRES_DATA_DIR/PG_VERSION" ]; then
  su postgres -c "\"$INITDB_BIN\" -D \"$POSTGRES_DATA_DIR\" --auth-local=trust --auth-host=$POSTGRES_HOST_AUTH_METHOD"
fi

PG_HBA_FILE="$POSTGRES_DATA_DIR/pg_hba.conf"
if ! grep -q "spiralwave-host-auth" "$PG_HBA_FILE"; then
  cat <<'EOF' >> "$PG_HBA_FILE"
host all all 0.0.0.0/0 md5 # spiralwave-host-auth
host all all ::/0 md5 # spiralwave-host-auth
EOF
fi

su postgres -c "\"$PG_CTL_BIN\" -D \"$POSTGRES_DATA_DIR\" -o \"-c listen_addresses='$POSTGRES_LISTEN_ADDRESSES' -p $POSTGRES_PORT\" -w start"

cleanup() {
  if [ -n "${SERVER_PID:-}" ]; then
    kill "$SERVER_PID" >/dev/null 2>&1 || true
  fi
  su postgres -c "\"$PG_CTL_BIN\" -D \"$POSTGRES_DATA_DIR\" -m fast stop" >/dev/null 2>&1 || true
}

trap cleanup EXIT INT TERM

su postgres -c "\"$PSQL_BIN\" -v ON_ERROR_STOP=1 postgres" <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${POSTGRES_USER}') THEN
    EXECUTE format('CREATE ROLE %I LOGIN PASSWORD %L', '${POSTGRES_USER}', '${POSTGRES_PASSWORD}');
  ELSE
    EXECUTE format('ALTER ROLE %I WITH LOGIN PASSWORD %L', '${POSTGRES_USER}', '${POSTGRES_PASSWORD}');
  END IF;
END
\$\$;
SQL

DB_EXISTS="$(su postgres -c "\"$PSQL_BIN\" -tAc \"SELECT 1 FROM pg_database WHERE datname = '$POSTGRES_DB'\" postgres" | tr -d '[:space:]')"
if [ "$DB_EXISTS" != "1" ]; then
  su postgres -c "\"$PSQL_BIN\" -v ON_ERROR_STOP=1 postgres -c \"CREATE DATABASE \\\"$POSTGRES_DB\\\" OWNER \\\"$POSTGRES_USER\\\"\""
fi

cd /app
PORT="$CLIENT_PORT" npm run serve --workspace @repo/server &
SERVER_PID=$!

for _ in $(seq 1 30); do
  if node -e "const http=require('node:http'); const req=http.get('${SERVICE_URL}/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }); req.on('error', () => process.exit(1));" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

wait "$SERVER_PID"
