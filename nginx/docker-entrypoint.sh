#!/bin/sh
set -e

DOMAIN="${DOMAIN:-localhost}"
CERT="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"
TMPL_DIR="/etc/nginx/templates"

if [ -f "$CERT" ]; then
    envsubst '${DOMAIN}' < "${TMPL_DIR}/nginx-https.conf.template" > /etc/nginx/nginx.conf
    echo "[nginx] SSL cert found — starting in HTTPS mode for ${DOMAIN}"
else
    envsubst '${DOMAIN}' < "${TMPL_DIR}/nginx-http.conf.template" > /etc/nginx/nginx.conf
    echo "[nginx] No cert found for ${DOMAIN} — starting in HTTP-only mode"
    echo "[nginx] To enable HTTPS: SSH into VM and run the certbot command from docs/HTTPS_SETUP.md"
fi

exec nginx -g 'daemon off;'
