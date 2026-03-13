# 1. ใช้ Node.js version 20 บน Alpine Linux (ขนาดเล็กและเร็ว)
FROM node:20-alpine

# 2. สร้างโฟลเดอร์สำหรับทำงานภายใน Container
WORKDIR /usr/src/app

# 3. ก๊อปปี้ไฟล์ package.json และ package-lock.json (ถ้ามี)
# การก๊อปปี้เฉพาะไฟล์นี้ก่อนจะช่วยให้ Docker ไม่ต้อง run npm install ใหม่ถ้าโค้ดเปลี่ยนแต่ library ไม่เปลี่ยน
COPY package*.json ./

# 4. ติดตั้ง dependencies
RUN npm install --production && npm cache clean --force

# 5. ก๊อปปี้ไฟล์ทั้งหมดจากเครื่องเรา (server folder) เข้าไปใน WORKDIR
COPY . .

# 6. กำหนด Port ที่ Backend รัน (ปกติคือ 3000)
EXPOSE 3000

# 7. คำสั่งรัน App
# แนะนำให้ใช้ node index.js หรือถ้ามีคำสั่งใน package.json ก็ใช้ npm start
CMD ["node", "index.js"]