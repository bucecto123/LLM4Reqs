FROM php:8.2-cli

# Ensure PHP populates $_ENV from OS environment variables (needed for Docker env vars)
RUN echo "variables_order = EGPCS" > /usr/local/etc/php/conf.d/docker-env.ini

RUN apt-get update \
    && apt-get install -y --no-install-recommends git unzip libpq-dev libzip-dev libicu-dev libonig-dev \
    && docker-php-ext-install pdo pdo_pgsql zip intl mbstring pcntl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY . .
RUN composer install --no-interaction --prefer-dist
