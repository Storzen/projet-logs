#!/bin/sh

LOG=/var/log/backup.log

if [ -z "$_BACKUP_LOGGED" ]; then
  export _BACKUP_LOGGED=1
  "$0" "$@" 2>&1 | tee -a "$LOG"
  exit $?
fi

set -e

DATE=$(date +%Y-%m-%dT%H-%M-%S)
ARCHIVE="/tmp/loki-backup-${DATE}.tar.gz"

echo "[INFO] Démarrage du backup Loki — ${DATE}"

# Vérifie que le dossier Loki existe et n'est pas vide
if [ ! -d "/loki-data/chunks" ]; then
  echo "[WARN] Aucune donnée Loki trouvée, backup ignoré."
  exit 0
fi

# Compression des données Loki
echo "[INFO] Compression des données..."
tar -czf "$ARCHIVE" -C /loki-data .

SIZE=$(du -sh "$ARCHIVE" | cut -f1)
echo "[INFO] Archive créée : $ARCHIVE ($SIZE)"

# Upload vers S3
echo "[INFO] Upload vers s3://${S3_BUCKET_NAME}/loki-backups/${DATE}.tar.gz"
aws s3 cp "$ARCHIVE" "s3://${S3_BUCKET_NAME}/loki-backups/${DATE}.tar.gz" \
  --region "$AWS_DEFAULT_REGION"

echo "[INFO] Backup terminé avec succès."

# Nettoyage local
rm -f "$ARCHIVE"

# Nettoyage des anciens backups S3 (garde seulement les 7 derniers jours)
echo "[INFO] Nettoyage des backups de plus de 7 jours..."
# Compatible BusyBox/Alpine : calcul via timestamp Unix
CUTOFF=$(date -d @$(( $(date +%s) - 604800 )) +%Y-%m-%d)
aws s3 ls "s3://${S3_BUCKET_NAME}/loki-backups/" \
  | awk '{print $4}' \
  | while read KEY; do
      FILE_DATE=$(echo "$KEY" | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}')
      if [ "$FILE_DATE" \< "$CUTOFF" ]; then
        echo "[INFO] Suppression ancien backup : $KEY"
        aws s3 rm "s3://${S3_BUCKET_NAME}/loki-backups/$KEY"
      fi
    done

echo "[INFO] Nettoyage terminé."
