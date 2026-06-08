# Resmi Python imajını kullanıyoruz (hafifletilmiş slim versiyon)
FROM python:3.12-slim

# Konteyner içindeki çalışma dizinini belirliyoruz
WORKDIR /app

# Önce sadece requirements.txt dosyasını kopyalayıp paketleri kuruyoruz (Önbellekleme optimizasyonu için)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

RUN python -m spacy download en_core_web_sm

# Şimdi kalan tüm kodlarımızı konteynerin içine kopyalıyoruz
COPY . .

RUN python -m grpc_tools.protoc -I. --python_out=. --grpc_python_out=. student_profile.proto

# FastAPI'nin çalışacağı 3003 portunu dışarı açıyoruz
EXPOSE 3003

# Konteyner ayağa kalktığında çalıştırılacak komut
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "3003"]