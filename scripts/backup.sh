#!/bin/bash
# ApplyAgent Database Backup Script
# Run weekly: bash scripts/backup.sh
#
# SETUP: Replace the connection string below with yours from:
# Supabase Dashboard → Settings → Database → Connection string → URI

DB_URL="postgresql://postgres.YOURREF:YOURPASSWORD@aws-0-ca-central-1.pooler.supabase.com:5432/postgres"
BACKUP_DIR="$HOME/applyagent-backups"
DATE=$(date +%Y-%m-%d)
FILENAME="applyagent-backup-${DATE}.sql.gz"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Run backup
echo "Starting backup..."
pg_dump "$DB_URL" | gzip > "$BACKUP_DIR/$FILENAME"

if [ $? -eq 0 ]; then
  SIZE=$(ls -lh "$BACKUP_DIR/$FILENAME" | awk '{print $5}')
  echo "Backup complete: $BACKUP_DIR/$FILENAME ($SIZE)"

  # Keep only last 10 backups
  cd "$BACKUP_DIR" && ls -t applyagent-backup-*.sql.gz | tail -n +11 | xargs -r rm
  echo "Old backups cleaned (keeping last 10)"
else
  echo "Backup FAILED"
  exit 1
fi
