#!/usr/bin/env bash
# Deploys Slaptasis Kalėdų Senelis to the staging droplet as
# https://santa.linasaninkevicius.dev (Node app behind an OpenLiteSpeed proxy vhost).
#
# Run ON THE DROPLET as root, after uploading the release archive to /tmp/santa.tgz.
# Safe to re-run: a second run only updates the app code and restarts the service.
# It never overwrites existing participant data or an existing admin password.
set -euo pipefail

SUB=santa
DOMAIN=$SUB.linasaninkevicius.dev
PORT=3020
APP=/var/www/$SUB
NODE_DIR=/opt/node22
LSWS=/usr/local/lsws
CONF=$LSWS/conf/httpd_config.conf
VHDIR=$LSWS/conf/vhosts/$SUB
MAIN=https://linasaninkevicius.dev/
TGZ=/tmp/santa.tgz

main_ok() {
  local code
  code=$(curl -s -o /dev/null -m 15 -w '%{http_code}' "$MAIN" || true)
  [[ $code =~ ^[23] ]]
}

[[ -f $TGZ ]] || { echo "Missing $TGZ – upload the release archive first."; exit 1; }
main_ok || { echo "Main site is not healthy BEFORE the deploy – aborting."; exit 1; }

# ---------- 1. Node (standalone, nothing else on the system is touched) ----------
if [[ ! -x $NODE_DIR/bin/node ]]; then
  cd /tmp
  SUMS=$(curl -fsSL https://nodejs.org/dist/latest-v22.x/SHASUMS256.txt)
  TARBALL=$(grep -oE 'node-v22\.[0-9]+\.[0-9]+-linux-x64\.tar\.xz' <<<"$SUMS" | head -1)
  curl -fsSLO "https://nodejs.org/dist/latest-v22.x/$TARBALL"
  grep " $TARBALL\$" <<<"$SUMS" | sha256sum -c -
  mkdir -p "$NODE_DIR"
  tar -xJf "$TARBALL" -C "$NODE_DIR" --strip-components=1
  rm -f "$TARBALL"
fi
echo "Node: $("$NODE_DIR/bin/node" -v)"

# ---------- 2. App files ----------
mkdir -p "$APP/app" "$APP/data" "$APP/public/.well-known/acme-challenge" "$APP/logs"
STAGE=$(mktemp -d)
tar -xzf "$TGZ" -C "$STAGE"
rm -rf "$APP/app/dist" "$APP/app/server"
cp -r "$STAGE/dist" "$STAGE/server" "$STAGE/package.json" "$STAGE/package-lock.json" "$APP/app/"
if [[ ! -f $APP/data/data.json && -f $STAGE/data/data.json ]]; then
  cp "$STAGE/data/data.json" "$APP/data/data.json"
  echo "Participant data copied."
else
  echo "Existing participant data kept."
fi
rm -rf "$STAGE"
(cd "$APP/app" && PATH="$NODE_DIR/bin:$PATH" npm ci --omit=dev --no-audit --no-fund)
chown -R www-data:www-data "$APP"

# ---------- 3. Service ----------
if [[ ! -f /etc/santa.env ]]; then
  umask 077
  cat >/etc/santa.env <<EOF
NODE_ENV=production
HOST=127.0.0.1
PORT=$PORT
DATA_DIR=$APP/data
ADMIN_PASSWORD=$(openssl rand -base64 15 | tr -d '/+=')
EOF
  umask 022
fi

cat >/etc/systemd/system/santa.service <<EOF
[Unit]
Description=Slaptasis Kalėdų Senelis
After=network.target

[Service]
User=www-data
WorkingDirectory=$APP/app
EnvironmentFile=/etc/santa.env
ExecStart=$NODE_DIR/bin/node server/index.js
Restart=on-failure
RestartSec=3
MemoryMax=200M
NoNewPrivileges=true
ProtectSystem=full
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable santa >/dev/null 2>&1
systemctl restart santa
sleep 2
curl -fsS "http://127.0.0.1:$PORT/api/health" >/dev/null || { echo "App did not start:"; journalctl -u santa -n 30 --no-pager; exit 1; }
echo "App is running on 127.0.0.1:$PORT"

# ---------- 4. OpenLiteSpeed vhost (first run only) ----------
write_vhconf() { # $1 = "ssl" to include the certificate and the https redirect
  cat >"$VHDIR/vhconf.conf" <<EOF
docRoot                   $APP/public/

errorlog \$VH_ROOT/logs/error.log {
  useServer               0
  logLevel                WARN
  rollingSize             10M
}

# ACME challenge: static, longest-prefix match so it beats the proxy below.
context /.well-known/acme-challenge {
  location                $APP/public/.well-known/acme-challenge/
  allowBrowse             1
  addDefaultCharset       off
}

context / {
  type                    proxy
  handler                 ${SUB}_app
  addDefaultCharset       off
}
EOF
  if [[ ${1:-} == ssl ]]; then
    cat >>"$VHDIR/vhconf.conf" <<EOF

# The .well-known exclusion keeps certbot renewals working (rewrite runs before contexts).
rewrite  {
  enable                  1
  rules                   <<<END_rules
RewriteCond %{HTTPS} !on
RewriteCond %{REQUEST_URI} !^/\.well-known/
RewriteRule ^(.*)\$ https://$DOMAIN%{REQUEST_URI} [R=301,L]
END_rules
}

vhssl  {
  keyFile                 /etc/letsencrypt/live/$DOMAIN/privkey.pem
  certFile                /etc/letsencrypt/live/$DOMAIN/fullchain.pem
  certChain               1
}
EOF
  fi
  chown lsadm:lsadm "$VHDIR/vhconf.conf"
}

if ! grep -q "^virtualhost $SUB " "$CONF"; then
  BACKUP=$CONF.bak.$(date +%s)
  cp -p "$CONF" "$BACKUP"
  echo "Config backup: $BACKUP"
  rollback() {
    echo "Main site check failed – rolling back the web server config."
    cp -p "$BACKUP" "$CONF"
    "$LSWS/bin/lswsctrl" reload
    exit 1
  }

  mkdir -p "$VHDIR"
  chown lsadm:lsadm "$VHDIR"
  write_vhconf

  BLOCK=$(mktemp)
  cat >"$BLOCK" <<EOF
extprocessor ${SUB}_app {
  type                    proxy
  address                 127.0.0.1:$PORT
  maxConns                50
  initTimeout             60
  retryTimeout            0
  respBuffer              0
}

virtualhost $SUB {
vhRoot                  $APP
configFile              $VHDIR/vhconf.conf
allowSymbolLink         0
enableScript            1
restrained              1
setUIDMode              2
}

EOF
  # insert the block before the first listener, then map the domain in every listener
  awk -v f="$BLOCK" '!done && /^listener / { while ((getline l < f) > 0) print l; done = 1 } { print }' "$CONF" >"$CONF.new"
  cat "$CONF.new" >"$CONF" && rm -f "$CONF.new" "$BLOCK"
  sed -i "/^[[:space:]]*map[[:space:]]\+wordpress /a\\  map                     $SUB $DOMAIN" "$CONF"

  "$LSWS/bin/lswsctrl" reload
  sleep 3
  main_ok || rollback

  certbot certonly --webroot -w "$APP/public" -d "$DOMAIN" --non-interactive --agree-tos --keep-until-expiring
  write_vhconf ssl
  "$LSWS/bin/lswsctrl" reload
  sleep 3
  main_ok || rollback
else
  echo "Web server vhost already exists – left unchanged."
fi

# ---------- 5. Verify ----------
echo "https://$DOMAIN/api/health -> $(curl -s -m 15 "https://$DOMAIN/api/health" || echo FAILED)"
echo "Main site                  -> $(curl -s -o /dev/null -m 15 -w '%{http_code}' "$MAIN")"
echo
echo "Admin panel:    https://$DOMAIN/"
echo "Admin password: $(grep '^ADMIN_PASSWORD=' /etc/santa.env | cut -d= -f2-)"
