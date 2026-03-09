FROM php:8.2-apache

# 1. ติดตั้ง PostgreSQL library
RUN apt-get update && apt-get install -y libpq-dev \
    && docker-php-ext-install pgsql pdo_pgsql \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# 2. แก้ปัญหา MPM Conflict แบบเจาะจงไฟล์ (ไม่ลบสุ่มเสี่ยงเหมือนรอบที่แล้ว)
# ปิด event และ worker ที่เป็นตัวปัญหา และบังคับเปิด prefork
RUN a2dismod mpm_event || true && \
    a2dismod mpm_worker || true && \
    a2enmod mpm_prefork

# 3. Copy โปรเจกต์เข้าไปที่เครื่อง
COPY . /var/www/html/

# 4. ตั้งสิทธิ์ไฟล์ให้ Apache อ่านได้
RUN chown -R www-data:www-data /var/www/html

EXPOSE 80

# บังคับรัน apache ใน foreground เพื่อไม่ให้ container ปิดตัว
CMD ["apache2-foreground"]