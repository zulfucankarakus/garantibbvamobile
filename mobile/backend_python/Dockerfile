FROM python:3.11-slim

WORKDIR /app

# Sistem bağımlılıkları
RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Python bağımlılıkları
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Uygulama kodunu kopyala
COPY . .

# Start script'e çalıştırma izni ver
RUN chmod +x start.sh

# Port aç
EXPOSE 8001

# Başlangıç scripti ile çalıştır
CMD ["./start.sh"]
