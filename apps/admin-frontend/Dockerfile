# Dev-server container - infra/docker-compose.yml injects the VITE_* vars
# at container runtime, which only works with the Vite dev server (a
# production `vite build` would need them at image build time instead).
# Matches the compose file's port mapping (5173).
FROM node:26-alpine

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
