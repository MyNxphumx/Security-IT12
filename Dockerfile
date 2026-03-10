FROM php:8.2-apache

# 1. ติดตั้ง PostgreSQL
RUN apt-get update && apt-get install -y libpq-dev \
    && docker-php-ext-install pgsql pdo_pgsql \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# 2. ปิด MPM อื่นๆ และสร้างไฟล์คอนฟิก mpm_prefork เองกับมือ
RUN a2dismod mpm_event mpm_worker || true \
    && echo "LoadModule mpm_prefork_module /usr/lib/apache2/modules/mod_mpm_prefork.so" > /etc/apache2/mods-available/mpm_prefork.load \
    && a2enmod mpm_prefork

# 3. ย้ายโปรเจกต์
COPY . /var/www/html/
RUN chown -R www-data:www-data /var/www/html

EXPOSE 80
CMD ["apache2-foreground"]