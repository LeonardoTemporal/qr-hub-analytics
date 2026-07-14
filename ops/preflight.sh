#!/bin/sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
ENV_FILE="$ROOT_DIR/.env"

fail() {
  printf 'preflight: %s\n' "$1" >&2
  exit 1
}

env_value() {
  sed -n "s/^$1=//p" "$ENV_FILE" | tail -n 1
}

[ -f "$ENV_FILE" ] || fail ".env not found"

for key in POSTGRES_PASSWORD FRONTEND_URL VITE_API_URL PORTAL_TOKEN_SECRET; do
  value=$(env_value "$key")
  [ -n "$value" ] || fail "$key is required"
  case "$value" in
    change_me_in_production|replace_with_a_long_random_secret)
      fail "$key still uses a placeholder"
      ;;
  esac
done

[ "$(env_value FRONTEND_URL)" = "https://7fitment.com" ] || \
  fail "FRONTEND_URL must be https://7fitment.com"
[ "$(env_value VITE_API_URL)" = "https://api.7fitment.com" ] || \
  fail "VITE_API_URL must be https://api.7fitment.com"
[ "$(env_value ADMIN_COOKIE_SECURE)" = "true" ] || \
  fail "ADMIN_COOKIE_SECURE must be true"

portal_secret=$(env_value PORTAL_TOKEN_SECRET)
[ "${#portal_secret}" -ge 32 ] || fail "PORTAL_TOKEN_SECRET must contain at least 32 characters"

cd "$ROOT_DIR"
docker compose config --quiet
printf 'preflight: configuration is ready\n'
