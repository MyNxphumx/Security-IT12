FROM php:8.2-apache

# 1. ติดตั้ง PostgreSQL library (เพิ่มการล้างไฟล์ขยะเพื่อให้ Image เล็กและทำงานเร็วขึ้น)
RUN apt-get update && apt-get install -y libpq-dev \
    && docker-php-ext-install pgsql pdo_pgsql \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# 2. แก้ปัญหา Apache MPM conflict (ลำดับสำคัญมาก)
# เราต้องมั่นใจว่าเหลือแค่ prefork ตัวเดียวที่รันอยู่
RUN a2dismod mpm_event || true && \
    a2dismod mpm_worker || true && \
    a2enmod mpm_prefork || true

# 3. Copy โปรเจกต์เข้าไป
COPY . /var/www/html/

# 4. ตั้งค่าสิทธิ์ไฟล์ (สำคัญมากสำหรับ PHP บน Apache)
RUN chown -R www-data:www-data /var/www/html

# คงไว้ที่ 80 เหมือนเดิมครับ
EXPOSE 80

# คำสั่งสำหรับเริ่ม Apache (ใส่เพื่อให้มั่นใจว่ามันจะไม่หลุด)
CMD ["apache2-foreground"]