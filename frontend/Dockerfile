FROM node:20

WORKDIR /app

# ---------------------------------------------------------------------------
# Build arguments for Vite environment variables (injected at build time).
# Defaults match local dev; override at docker-compose build or CLI build:
#   docker-compose build --build-arg VITE_REVERB_HOST=reverb-1
#   docker build --build-arg VITE_REVERB_HOST=reverb-1 .
# ---------------------------------------------------------------------------
ARG VITE_API_BASE=http://localhost:8001
ARG VITE_REVERB_HOST=localhost
ARG VITE_REVERB_PORT=8081
ARG VITE_REVERB_SCHEME=http
ARG VITE_REVERB_APP_KEY=local-app-key

COPY package.json package-lock.json ./
RUN rm -rf node_modules package-lock.json && npm install

COPY . .

# Bake VITE_ vars into the bundle (these are read-only after build)
RUN echo "VITE_API_BASE=${VITE_API_BASE}" > .env.build && \
    echo "VITE_REVERB_HOST=${VITE_REVERB_HOST}" >> .env.build && \
    echo "VITE_REVERB_PORT=${VITE_REVERB_PORT}" >> .env.build && \
    echo "VITE_REVERB_SCHEME=${VITE_REVERB_SCHEME}" >> .env.build && \
    echo "VITE_REVERB_APP_KEY=${VITE_REVERB_APP_KEY}" >> .env.build && \
    mv .env.build .env
