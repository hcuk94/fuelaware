#!/bin/sh
set -eu

DATABASE_FILE_PATH="${DATABASE_FILE_PATH:-/app/data/dev.db}"
mkdir -p "$(dirname "$DATABASE_FILE_PATH")"

export DATABASE_URL="${DATABASE_URL:-file:${DATABASE_FILE_PATH}}"

exec "$@"
