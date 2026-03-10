FROM php:8.2-apache

# 1. ติดตั้ง PostgreSQL
RUN apt-get update && apt-get install -y libpq-dev \
    && docker-php-ext-install pgsql pdo_pgsql \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# 2. วิธีแก้ปัญหา MPM แบบถอนรากถอนโคน:
# - ลบ symbolic link ของ mpm ทั้งหมดที่ถูกเปิดไว้ทิ้ง
# - สร้างไฟล์คอนฟิก mpm_prefork เองกับมือ
# - บังคับโหลดแค่ตัวเดียวเท่านั้น
RUN rm -f /etc/apache2/mods-enabled/mpm_*.load \
    && echo "LoadModule mpm_prefork_module /usr/lib/apache2/modules/mod_mpm_prefork.so" > /etc/apache2/mods-available/mpm_prefork.load \
    && ln -s /etc/apache2/mods-available/mpm_prefork.load /etc/apache2/mods-enabled/mpm_prefork.load

# 3. ย้ายโปรเจกต์
COPY . /var/www/html/
RUN chown -R www-data:www-data /var/www/html

EXPOSE 80
CMD ["apache2-foreground"]