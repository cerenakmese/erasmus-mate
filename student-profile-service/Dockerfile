# Hafif Node.js imajı
FROM node:20-alpine

# Konteyner içi çalışma dizini
WORKDIR /app

# Sadece paket listesini kopyala ve kur (Önbellek optimizasyonu)
COPY package*.json ./
RUN npm install

# Geri kalan tüm kodları (gRPC proto dosyası, db.js, index.js vb.) kopyala
COPY . .

# Servisin dışarıya açacağı port
EXPOSE 3001

# Servisi başlatma komutu (Eğer ana dosyanın adı server.js ise burayı ona göre değiştir)
CMD ["node", "index.js"]