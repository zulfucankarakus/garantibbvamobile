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

### Backend (Java Spring Boot)

```bash
cd /app/mobile/backend

# Maven ile çalıştır
mvn spring-boot:run

# Veya JAR oluştur
mvn clean package
java -jar target/mobile-banking-1.0.0.jar
```

**API Docs:** http://localhost:8001/api/swagger-ui.html

### Mobile (React Native)

```bash
cd /app/mobile

# Bağımlılıkları yükle
yarn install

# Expo başlat
yarn start
```

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
