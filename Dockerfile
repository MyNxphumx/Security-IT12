FROM php:8.2-apache

# 1. ติดตั้ง PostgreSQL
RUN apt-get update && apt-get install -y libpq-dev \
    && docker-php-ext-install pgsql pdo_pgsql \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# 2. ไม้ตาย: ลบไฟล์คอนฟิก MPM ทุกตัวที่อาจจะทำให้เกิดการโหลดซ้ำ
# และบังคับสร้างไฟล์โหลด mpm_prefork ใหม่ตัวเดียว
RUN rm -f /etc/apache2/mods-enabled/mpm_* \
    && rm -f /etc/apache2/mods-available/mpm_* \
    && echo "LoadModule mpm_prefork_module /usr/lib/apache2/modules/mod_mpm_prefork.so" > /etc/apache2/mods-enabled/mpm_prefork.load \
    && a2enmod mpm_prefork

# 3. Copy โปรเจกต์
COPY . /var/www/html/
RUN chown -R www-data:www-data /var/www/html

EXPOSE 80
CMD ["apache2-foreground"]