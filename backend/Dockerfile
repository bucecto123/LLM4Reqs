# ---------------------------------------------------------------------------
# Production Dockerfile for Laravel backend (PHP-FPM + Nginx)
# ---------------------------------------------------------------------------

# Stage 1: vendor dependencies
FROM composer:2 AS vendor

# IMPORTANT: must match the runtime app root so $baseDir in autoloader is consistent
WORKDIR /var/www/html
COPY composer.json composer.lock ./
# Delete stale lock file so composer regenerates it from scratch
RUN rm -f composer.lock && \
    composer install \
    --no-interaction \
    --prefer-dist \
    --no-dev \
    --no-scripts \
    --ignore-platform-reqs \
    --optimize-autoloader

# Stage 2: runtime
FROM php:8.2-fpm

# Ensure PHP sees environment variables from container runtime
RUN echo "variables_order = EGPCS" > /usr/local/etc/php/conf.d/docker-env.ini

# System dependencies + PHP extensions
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        nginx \
        curl \
        unzip \
        libpq-dev \
        libzip-dev \
        libicu-dev \
        libonig-dev \
        libgd-dev \
    && docker-php-ext-install pdo pdo_pgsql zip intl mbstring pcntl gd \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /var/www/html

# Copy application source
COPY . .

# Copy vendor from builder (same $baseDir = /var/www/html)
COPY --from=vendor /var/www/html/vendor ./vendor

# Clear stale bootstrap cache (e.g. removed packages like Pail)
RUN rm -f bootstrap/cache/config.php bootstrap/cache/packages.php bootstrap/cache/services.php

# Recreate runtime storage directories excluded by .dockerignore
# chmod 777 so www-data (php-fpm) can write to them
RUN mkdir -p storage/logs \
    && mkdir -p storage/framework/cache \
    && mkdir -p storage/framework/sessions \
    && mkdir -p storage/framework/testing \
    && mkdir -p storage/framework/views \
    && mkdir -p storage/app/public \
    && chmod -R 777 storage \
    && chmod 777 bootstrap/cache

# PHP runtime performance tuning (valid php.ini directives)
# session.save_path / sys_temp_dir: must be set BEFORE opcache caches realpath
# opcache.validate_timestamps=0 is fine for production (app code is immutable in image)
RUN echo "session.save_path=/var/www/html/storage/framework/sessions" >> /usr/local/etc/php/conf.d/99-performance.ini \
    && echo "sys_temp_dir=/var/www/html/storage/framework/cache" >> /usr/local/etc/php/conf.d/99-performance.ini \
    && echo "opcache.enable=1" >> /usr/local/etc/php/conf.d/99-performance.ini \
    && echo "opcache.memory_consumption=128" >> /usr/local/etc/php/conf.d/99-performance.ini \
    && echo "opcache.interned_strings_buffer=8" >> /usr/local/etc/php/conf.d/99-performance.ini \
    && echo "opcache.max_accelerated_files=10000" >> /usr/local/etc/php/conf.d/99-performance.ini \
    && echo "opcache.validate_timestamps=0" >> /usr/local/etc/php/conf.d/99-performance.ini \
    && echo "realpath_cache_size=4096K" >> /usr/local/etc/php/conf.d/99-performance.ini \
    && echo "realpath_cache_ttl=600" >> /usr/local/etc/php/conf.d/99-performance.ini \
    && echo "memory_limit=256M" >> /usr/local/etc/php/conf.d/99-performance.ini

# Nginx config for Laravel
RUN rm -f /etc/nginx/sites-enabled/default /etc/nginx/sites-available/default \
    && echo 'server { \
      listen 80; \
      server_name _; \
      root /var/www/html/public; \
      index index.php index.html; \
      gzip on; \
      gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss; \
      add_header X-Frame-Options "SAMEORIGIN"; \
      add_header X-Content-Type-Options "nosniff"; \
      location / { \
        try_files $uri $uri/ /index.php?$query_string; \
      } \
      location ~ \\.php$ { \
        include fastcgi_params; \
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name; \
        fastcgi_pass 127.0.0.1:9000; \
        fastcgi_index index.php; \
      } \
      location ~ /\\. { deny all; } \
    }' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["sh", "-c", "php-fpm -D && nginx -g 'daemon off;'"]
