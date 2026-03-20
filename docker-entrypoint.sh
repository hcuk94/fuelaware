#!/bin/sh
set -eu

DATABASE_FILE_PATH="${DATABASE_FILE_PATH:-/app/data/dev.db}"
mkdir -p "$(dirname "$DATABASE_FILE_PATH")"

if [ ! -f "$DATABASE_FILE_PATH" ]; then
  sqlite3 "$DATABASE_FILE_PATH" ".read /app/prisma/init.sql"
fi

export DATABASE_URL="${DATABASE_URL:-file:${DATABASE_FILE_PATH}}"

exec "$@"
