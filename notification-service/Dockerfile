# Hafif ve hızlı bir Node.js imajı kullanıyoruz
FROM node:20-alpine

# Konteyner içindeki çalışma dizinini belirliyoruz
WORKDIR /app

# Sadece paket listelerini kopyalayıp kurulum yapıyoruz (Cache optimizasyonu için)
COPY package*.json ./
RUN npm install

# Geri kalan tüm kodlarımızı (index.js, db.js, student.proto vb.) kopyalıyoruz
COPY . .

# Servisimizin dışarıya açılacağı port
EXPOSE 3005

# Konteyner ayağa kalktığında çalıştırılacak komut
CMD ["node", "index.js"]