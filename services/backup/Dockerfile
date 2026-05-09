FROM alpine:3.19

RUN apk add --no-cache \
    aws-cli \
    tar \
    gzip \
    tzdata

RUN addgroup -S backup && adduser -S -G backup backup

RUN mkdir -p /var/log && chown backup:backup /var/log

COPY backup.sh /usr/local/bin/backup.sh
RUN chmod +x /usr/local/bin/backup.sh

COPY crontab /etc/crontabs/backup
RUN chmod 600 /etc/crontabs/backup

CMD ["crond", "-f", "-d", "8"]
