#!/usr/bin/env bash
# Generates the permanent OpenIddict signing and encryption certificates (PFX) once per server.
# Usage: sudo infra/identity/generate-certificates.sh [directory]   (default: /etc/agenza/identity)
# Env: DAYS (validity, default 1825), OWNER_GROUP (default agenza-app), FORCE=1 to overwrite.
#
# Overwriting invalidates every issued token and refresh token, so existing files are never replaced
# without FORCE=1. The passwords go only to <directory>/certificates.env (the four
# Identity__Certificates__* variables), which the service reads as an EnvironmentFile.
set -euo pipefail
umask 077

dir="${1:-/etc/agenza/identity}"
days="${DAYS:-1825}"
group="${OWNER_GROUP:-agenza-app}"
env_file="$dir/certificates.env"

for file in "$dir/signing.pfx" "$dir/encryption.pfx" "$env_file"; do
  if [ -e "$file" ] && [ "${FORCE:-0}" != "1" ]; then
    echo "$file already exists; refusing to overwrite (FORCE=1 replaces it and invalidates issued tokens)." >&2
    exit 1
  fi
done

mkdir -p "$dir"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

new_password() {
  openssl rand -base64 48 | tr -dc 'A-Za-z0-9' | head -c 40
}

# $1 file name, $2 common name, $3 key usage, $4 password
generate() {
  openssl req -x509 -newkey rsa:2048 -nodes -sha256 -days "$days" \
    -subj "/CN=$2" -addext "keyUsage=critical,$3" \
    -keyout "$work/$1.key" -out "$work/$1.crt" 2>"$work/openssl.log" || { cat "$work/openssl.log" >&2; exit 1; }
  PFX_PASSWORD="$4" openssl pkcs12 -export -inkey "$work/$1.key" -in "$work/$1.crt" \
    -out "$dir/$1.pfx" -passout env:PFX_PASSWORD
}

signing_password="$(new_password)"
encryption_password="$(new_password)"

generate signing "Agenza Identity Signing" digitalSignature "$signing_password"
generate encryption "Agenza Identity Encryption" keyEncipherment "$encryption_password"

cat > "$env_file" <<EOF
Identity__Certificates__Signing__Path=$dir/signing.pfx
Identity__Certificates__Signing__Password=$signing_password
Identity__Certificates__Encryption__Path=$dir/encryption.pfx
Identity__Certificates__Encryption__Password=$encryption_password
EOF

if getent group "$group" >/dev/null 2>&1; then
  chgrp "$group" "$dir" "$dir/signing.pfx" "$dir/encryption.pfx" "$env_file"
  chmod 750 "$dir"
  chmod 640 "$dir/signing.pfx" "$dir/encryption.pfx" "$env_file"
else
  echo "Group '$group' not found; files left readable only by the current user." >&2
fi

echo "Generated $dir/signing.pfx and $dir/encryption.pfx (valid for $days days)."
echo "Add EnvironmentFile=$env_file to the identity service unit and restart it."
echo "Back up $dir somewhere protected: losing it invalidates every issued token."
