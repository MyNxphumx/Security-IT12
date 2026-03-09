FROM php:8.2-apache

# ติดตั้ง PostgreSQL library
RUN apt-get update && apt-get install -y libpq-dev \
    && docker-php-ext-install pgsql pdo_pgsql

# แก้ปัญหา Apache MPM conflict
RUN a2dismod mpm_event || true \
    && a2dismod mpm_worker || true \
    && a2enmod mpm_prefork

# copy project
COPY . /var/www/html/

EXPOSE 80