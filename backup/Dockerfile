FROM alpine:3.20

RUN apk add --no-cache \
  aws-cli \
  bash \
  ca-certificates \
  sqlite

COPY backup-sqlite-to-s3.sh /usr/local/bin/backup-sqlite-to-s3
RUN chmod +x /usr/local/bin/backup-sqlite-to-s3

ENTRYPOINT ["backup-sqlite-to-s3"]
