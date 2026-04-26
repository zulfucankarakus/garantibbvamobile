#!/bin/sh
cd /app/backend
exec /usr/bin/java -jar target/akilli-birikim-1.0.0.jar
# Backend başlangıç scripti

echo "🚀 Backend başlatılıyor..."

# MongoDB'nin hazır olmasını bekle
echo "⏳ MongoDB bekleniyor..."
sleep 5

# Test verilerini oluştur
echo "📝 Test verileri kontrol ediliyor..."
python init_data.py

# Uvicorn'u başlat
echo "🌐 API sunucusu başlatılıyor..."
exec uvicorn server:app --host 0.0.0.0 --port 8001
