FROM alpine:3.19

# Installation AWS CLI + outils de base
RUN apk add --no-cache \
    aws-cli \
    tar \
    gzip \
    tzdata

# Crée le dossier de logs
RUN mkdir -p /var/log

# Copie du script de backup
COPY backup.sh /usr/local/bin/backup.sh
RUN chmod +x /usr/local/bin/backup.sh

# Copie de l'entrée cron (toutes les 6h)
COPY crontab /etc/crontabs/root

CMD ["crond", "-f", "-d", "8"]
