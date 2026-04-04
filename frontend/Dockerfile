# ---------------------------------------------------------------------------
# Stage 1 — Build
# ---------------------------------------------------------------------------
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files first (Docker cache layer)
COPY package.json package-lock.json ./

# Install all dependencies (including dev for build)
RUN npm ci

# Copy source
COPY . .

# Inject build-time env vars into .env so Vite bakes them into the bundle
RUN echo "VITE_API_BASE=${VITE_API_BASE}" > .env && \
    echo "VITE_REVERB_HOST=${VITE_REVERB_HOST:-localhost}" >> .env && \
    echo "VITE_REVERB_PORT=${VITE_REVERB_PORT:-8081}" >> .env && \
    echo "VITE_REVERB_SCHEME=${VITE_REVERB_SCHEME:-http}" >> .env && \
    echo "VITE_REVERB_APP_KEY=${VITE_REVERB_APP_KEY:-llm4reqs-reverb-key}" >> .env

# Build for production (no dev server, no source maps)
RUN npm run build

# ---------------------------------------------------------------------------
# Stage 2 — Serve with nginx
# ---------------------------------------------------------------------------
FROM nginx:1.27-alpine AS runner

# Remove default nginx site
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets from stage 1
COPY --from=builder /app/dist /usr/share/nginx/html

# nginx config for SPA (React Router) — all routes fall back to index.html
RUN echo 'server { \
    listen 80; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    # Gzip compression \
    gzip on; \
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript application/vnd.ms-fontobject application/x-font-ttf font/opentype; \
    gzip_min_length 1024; \
    # Cache static assets aggressively (content-hashed filenames from Vite) \
    location ~* \\.(js|css|woff2?|svg|png|jpg|ico|webp)$ { \
        expires 1y; \
        add_header Cache-Control "public, immutable"; \
    } \
    # index.html — no cache (browsers will revalidate) \
    location = /index.html { \
        add_header Cache-Control "no-cache, no-store, must-revalidate"; \
    } \
    # All other routes -> SPA \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    # Proxy API calls to backend — no trailing slash so the full /api prefix is
    # forwarded (Laravel routes are defined with Route::prefix('api')). \
    location /api/ { \
        proxy_pass http://backend:80; \
        proxy_http_version 1.1; \
        proxy_set_header X-Forwarded-Host $host; \
        proxy_set_header X-Forwarded-Proto $scheme; \
    } \
    # Proxy WebSocket (Reverb) \
    location /ws { \
        proxy_pass http://reverb:8081; \
        proxy_http_version 1.1; \
        proxy_set_header Upgrade $http_upgrade; \
        proxy_set_header Connection "upgrade"; \
        proxy_read_timeout 86400; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
