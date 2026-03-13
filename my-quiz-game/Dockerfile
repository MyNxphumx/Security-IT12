FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5173
# ใช้ --host เพื่อให้เข้าถึงผ่าน Browser จากภายนอกกล่องได้
CMD ["npm", "run", "dev", "--", "--host"]