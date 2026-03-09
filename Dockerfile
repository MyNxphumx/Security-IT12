FROM php:8.2-apache

# 1. ติดตั้ง PostgreSQL
RUN apt-get update && apt-get install -y libpq-dev \
    && docker-php-ext-install pgsql pdo_pgsql \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# 2. แก้ปัญหา MPM แบบเด็ดขาด (ลบไฟล์คอนฟิกตัวที่ไม่ได้ใช้ออก)
RUN rm -f /etc/apache2/mods-enabled/mpm_event.load /etc/apache2/mods-enabled/mpm_worker.load || true \
    && printf "LoadModule mpm_prefork_module /usr/lib/apache2/modules/mod_mpm_prefork.so\n" > /etc/apache2/mods-available/mpm_prefork.load \
    && a2enmod mpm_prefork

# 3. Copy โปรเจกต์
COPY . /var/www/html/
RUN chown -R www-data:www-data /var/www/html

EXPOSE 80
CMD ["apache2-foreground"]