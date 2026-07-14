#!/bin/sh
set -eu

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p /backups/database /backups/media

PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
  --host=db \
  --username="$POSTGRES_USER" \
  --dbname="$POSTGRES_DB" \
  --format=custom \
  --file="/backups/database/qrhub-${timestamp}.dump"

tar -czf "/backups/media/media-${timestamp}.tar.gz" -C /media .
sha256sum "/backups/database/qrhub-${timestamp}.dump" \
  "/backups/media/media-${timestamp}.tar.gz" \
  > "/backups/checksums-${timestamp}.sha256"

find /backups -type f -mtime +30 -delete
