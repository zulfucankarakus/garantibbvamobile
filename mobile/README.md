# Garanti BBVA Mobile Banking

React Native (Expo) mobil uygulama ve Java Spring Boot backend API.

## 📁 Proje Yapısı

```
/app/mobile/
├── backend/                    # 🟢 Java Spring Boot Backend
│   ├── src/main/java/         # Java kaynak kodları
│   │   └── com/garantibbva/mobile/
│   │       ├── controller/    # REST Controllers
│   │       ├── service/       # Business Logic
│   │       ├── repository/    # Data Access
│   │       ├── entity/        # Domain Models
│   │       ├── dto/           # Data Transfer Objects
│   │       ├── security/      # JWT Authentication
│   │       ├── config/        # Configurations
│   │       └── exception/     # Error Handling
│   ├── pom.xml                # Maven dependencies
│   └── README.md              # Backend documentation
│
├── src/                        # 📱 React Native Kaynak Kodları
│   ├── screens/               # Uygulama ekranları
│   ├── components/            # UI bileşenleri
│   ├── services/              # API servisleri
│   ├── context/               # React Context
│   └── config/                # Konfigürasyonlar
│
├── backend_python/            # 🔴 Eski Python Backend (Yedek)
│
├── App.js                     # Ana uygulama
├── app.json                   # Expo konfigürasyonu
├── eas.json                   # EAS Build konfigürasyonu
└── package.json               # Node.js bağımlılıkları
```

## 🚀 Başlangıç

> 📌 **AKTİF backend Python FastAPI**'dir (`/app/backend/server.py`). LSTM tabanlı **Deep Learning** özelliği bu backend'in içinde yer alır. Aşağıdaki Java Spring Boot komutları alternatif/legacy backend içindir; tipik akış için Python + Docker yolunu tercih edin.
>
> 👉 **Tek komutluk Docker kurulumu için kök dizindeki [`/app/README.md`](../README.md) dosyasına bakın.**

### 🐳 Önerilen: Docker (kök dizinden)

```bash
cd /app
docker compose up -d --build
# MongoDB + Mongo Express + Python Backend (LSTM) tek komutla ayağa kalkar
```

### 🐍 Alternatif: Yerel Python Backend

```bash
cd /app/backend
python3.11 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python init_data.py && python seed_data.py
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### ☕ Alternatif: Java Spring Boot Backend (legacy, Deep Learning yok)

```bash
cd /app/mobile/backend

# Maven ile çalıştır
mvn spring-boot:run

# Veya JAR oluştur
mvn clean package
java -jar target/mobile-banking-1.0.0.jar
```

**API Docs:** http://localhost:8001/api/swagger-ui.html

### 📱 Mobile (React Native)

```bash
cd /app/mobile

# Bağımlılıkları yükle
yarn install

# Backend URL'ini set et (Docker kullanıyorsanız bilgisayarınızın LAN IP'si)
EXPO_PUBLIC_API_URL=http://localhost:8001/api yarn start
# Windows PowerShell:
#   $env:EXPO_PUBLIC_API_URL="http://localhost:8001/api"; yarn start
```

**Hazır test girişi:** TC `12345678950` / Şifre `Test123456`

## 📋 Teknolojiler

### Backend
- Java 17
- Spring Boot 3.2
- Spring Security + JWT
- Spring Data MongoDB
- Lombok
- SpringDoc OpenAPI (Swagger)

### Mobile
- React Native 0.81
- Expo SDK 54
- React Navigation 7
- Axios

## 🔗 API Endpoints

| Endpoint | Açıklama |
|----------|----------|
| `POST /api/auth/register` | Kullanıcı kaydı |
| `POST /api/auth/login` | Kullanıcı girişi |
| `GET /api/accounts` | Hesap listesi |
| `POST /api/accounts` | Hesap oluştur |
| `GET /api/cards` | Kart listesi |
| `POST /api/transactions` | Para transferi |
| `POST /api/qr/generate` | QR kod oluştur |
| `POST /api/qr/pay` | QR ile ödeme |

## 📄 Lisans

Garanti BBVA © 2025
