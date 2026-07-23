# Dev-server container - infra/docker-compose.yml injects the VITE_* vars
# at container runtime, which only works with the Vite dev server (a
# production `vite build` would need them at image build time instead).
# Matches the compose file's port mapping (5173).
#
# Build context is the monorepo root (see infra/docker-compose.yml's
# `context: ../..`), not this directory - this is an npm workspace, so
# `npm ci` needs the root package.json/package-lock.json to reproduce the
# exact dependency tree CI installs, not whatever `npm install` would
# resolve from this workspace's package.json alone.
FROM node:22.22.1-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/admin-frontend/package.json apps/admin-frontend/package.json
RUN npm ci

COPY apps/admin-frontend/ apps/admin-frontend/

WORKDIR /app/apps/admin-frontend

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
