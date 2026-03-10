FROM php:8.2-apache

# ติดตั้ง libpq-dev (จำเป็นสำหรับ PostgreSQL) แล้วค่อยติดตั้ง extension pgsql และ pdo_pgsql
RUN apt-get update && apt-get install -y libpq-dev \
    && docker-php-ext-install pgsql pdo_pgsql

COPY . /var/www/html/

EXPOSE 80