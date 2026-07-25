#!/bin/sh
set -eu

: "${APP_DB_PASSWORD:?APP_DB_PASSWORD is required}"

psql \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  --set ON_ERROR_STOP=1 \
  --set app_password="$APP_DB_PASSWORD" <<'EOSQL'
SELECT format(
  'CREATE ROLE identity_app LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION',
  :'app_password')
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'identity_app')
\gexec

SELECT format('ALTER ROLE identity_app PASSWORD %L', :'app_password')
\gexec

SELECT format(
  'CREATE ROLE services_app LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION',
  :'app_password')
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'services_app')
\gexec

SELECT format('ALTER ROLE services_app PASSWORD %L', :'app_password')
\gexec

REVOKE CREATE ON DATABASE appdb FROM PUBLIC;
GRANT CONNECT ON DATABASE appdb TO identity_app, services_app;

CREATE SCHEMA IF NOT EXISTS identity AUTHORIZATION identity_app;
ALTER SCHEMA identity OWNER TO identity_app;
REVOKE ALL ON SCHEMA identity FROM PUBLIC, services_app;
GRANT USAGE, CREATE ON SCHEMA identity TO identity_app;

CREATE SCHEMA IF NOT EXISTS services AUTHORIZATION services_app;
ALTER SCHEMA services OWNER TO services_app;
REVOKE ALL ON SCHEMA services FROM PUBLIC, identity_app;
GRANT USAGE, CREATE ON SCHEMA services TO services_app;

ALTER DEFAULT PRIVILEGES FOR ROLE identity_app IN SCHEMA identity
  REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE identity_app IN SCHEMA identity
  REVOKE ALL ON SEQUENCES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE services_app IN SCHEMA services
  REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE services_app IN SCHEMA services
  REVOKE ALL ON SEQUENCES FROM PUBLIC;
EOSQL
