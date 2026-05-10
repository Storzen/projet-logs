FROM alpine:3.19

RUN apk add --no-cache \
    aws-cli \
    tar \
    gzip \
    tzdata

COPY backup.sh /usr/local/bin/backup.sh
RUN chmod +x /usr/local/bin/backup.sh

COPY crontab /etc/crontabs/root
RUN chmod 600 /etc/crontabs/root

CMD ["/bin/sh", "-c", "export -p > /etc/container-env.sh && crond -f -d 8"]
