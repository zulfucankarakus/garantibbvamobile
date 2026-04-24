# Garanti BBVA Mobile Banking API - Spring Boot

Java Spring Boot ile geliştirilmiş katmanlı mimari backend API.

## 🏗️ Proje Yapısı (Katmanlı Mimari)

```
src/main/java/com/garantibbva/mobile/
├── MobileBankingApplication.java    # Ana uygulama sınıfı
│
├── config/                          # Konfigürasyon Katmanı
│   ├── SecurityConfig.java         # Spring Security ayarları
│   ├── CorsConfig.java            # CORS ayarları
│   └── OpenApiConfig.java         # Swagger/OpenAPI ayarları
│
├── controller/                      # Sunum Katmanı (REST Controllers)
│   ├── AuthController.java        # /auth endpoints
│   ├── AccountController.java     # /accounts endpoints
│   ├── CardController.java        # /cards endpoints
│   ├── TransactionController.java # /transactions, /qr endpoints
│   ├── NotificationController.java # /notifications endpoints
│   └── PublicController.java      # Public endpoints
│
├── service/                         # İş Mantığı Katmanı (Business Logic)
│   ├── AuthService.java           # Kimlik doğrulama servisi
│   ├── AccountService.java        # Hesap işlemleri servisi
│   ├── CardService.java           # Kart işlemleri servisi
│   ├── TransactionService.java    # İşlem/transfer servisi
│   └── NotificationService.java   # Bildirim servisi
│
├── repository/                      # Veri Erişim Katmanı (Data Access)
│   ├── UserRepository.java
│   ├── AccountRepository.java
│   ├── CardRepository.java
│   ├── TransactionRepository.java
│   ├── NotificationRepository.java
│   ├── ApplicationRepository.java
│   └── VerificationCodeRepository.java
│
├── entity/                          # Veri Modeli Katmanı (Domain Entities)
│   ├── User.java
│   ├── Account.java
│   ├── Card.java
│   ├── Transaction.java
│   ├── Notification.java
│   ├── Application.java
│   └── VerificationCode.java
│
├── dto/                             # Veri Transfer Nesneleri
│   ├── request/                    # İstek DTOları
│   │   ├── RegisterRequest.java
│   │   ├── LoginRequest.java
│   │   ├── CreateAccountRequest.java
│   │   ├── CreateCardRequest.java
│   │   ├── TransferRequest.java
│   │   └── ...
│   └── response/                   # Yanıt DTOları
│       ├── AuthResponse.java
│       ├── UserResponse.java
│       ├── AccountResponse.java
│       ├── CardResponse.java
│       └── ...
│
├── enums/                           # Enum Tipleri
│   ├── AccountType.java
│   ├── CardType.java
│   ├── TransactionStatus.java
│   └── ...
│
├── exception/                       # Hata Yönetimi
│   ├── BadRequestException.java
│   ├── ResourceNotFoundException.java
│   ├── UnauthorizedException.java
│   ├── DuplicateResourceException.java
│   └── GlobalExceptionHandler.java
│
├── security/                        # Güvenlik Katmanı
│   ├── JwtTokenProvider.java      # JWT token oluşturma/doğrulama
│   ├── JwtAuthenticationFilter.java # JWT filtresi
│   └── SecurityUtils.java         # Güvenlik yardımcı metotları
│
└── util/                            # Yardımcı Sınıflar
    ├── GeneratorUtil.java         # Numara oluşturucular
    └── ValidationUtil.java        # Doğrulama metotları
```

## 🚀 Hızlı Başlangıç

### Gereksinimler
- Java 17+
- Maven 3.8+
- MongoDB 6.0+

### Kurulum

```bash
cd /app/mobile/backend

# Maven bağımlılıklarını indir
mvn clean install

# Uygulamayı başlat
mvn spring-boot:run
```

### Alternatif: JAR ile Çalıştırma

```bash
# JAR dosyası oluştur
mvn clean package

# JAR'ı çalıştır
java -jar target/mobile-banking-1.0.0.jar
```

## ⚙️ Konfigürasyon

### application.yml

```yaml
server:
  port: 8001
  servlet:
    context-path: /api

spring:
  data:
    mongodb:
      uri: mongodb://localhost:27017
      database: garanti_bbva

jwt:
  secret: your-secret-key-change-in-production
  expiration: 604800000  # 7 days
```

### Environment Variables

| Değişken | Açıklama | Varsayılan |
|----------|----------|------------|
| `MONGO_URL` | MongoDB bağlantı URL'i | mongodb://localhost:27017 |
| `DB_NAME` | Veritabanı adı | garanti_bbva |
| `JWT_SECRET_KEY` | JWT secret key | - |

## 📚 API Dokümantasyonu

Uygulama başlatıldıktan sonra Swagger UI'a erişebilirsiniz:

👉 **http://localhost:8001/api/swagger-ui.html**

## 🔐 Güvenlik

### JWT Authentication

```bash
# 1. Kayıt ol
curl -X POST http://localhost:8001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","tcNo":"12345678950","email":"test@test.com","phone":"5551234567","password":"123456"}'

# 2. Giriş yap
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"12345678950","password":"123456"}'

# 3. Korumalı endpoint'e istek at
curl -X GET http://localhost:8001/api/accounts \
  -H "Authorization: Bearer {token}"
```

## 📋 API Endpoints

### Authentication
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/auth/register` | Yeni kullanıcı kaydı |
| POST | `/auth/login` | Kullanıcı girişi |
| GET | `/auth/me` | Mevcut kullanıcı bilgisi |

### Accounts
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/accounts` | Hesap listesi |
| POST | `/accounts` | Yeni hesap oluştur |
| DELETE | `/accounts/{id}` | Hesap kapat |
| POST | `/accounts/search` | IBAN/Hesap No ile ara |

### Cards
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/cards` | Kart listesi |
| POST | `/cards` | Yeni kart oluştur |
| POST | `/cards/debit-with-account` | Kart + Hesap oluştur |
| DELETE | `/cards/{id}` | Kart kapat |

### Transactions
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/transactions` | İşlem listesi |
| POST | `/transactions` | Para transferi |
| POST | `/qr/generate` | QR kod oluştur |
| POST | `/qr/pay` | QR ile ödeme |

## 🧪 Test

```bash
# Unit testleri çalıştır
mvn test

# Integration testleri çalıştır
mvn verify
```

## 📦 Production Build

```bash
# Production JAR oluştur
mvn clean package -Pprod

# Docker image oluştur (opsiyonel)
docker build -t garanti-bbva-mobile-api .
```

## 🏛️ Mimari Katmanlar

1. **Controller (Sunum)**: HTTP isteklerini karşılar, DTO dönüşümlerini yapar
2. **Service (İş Mantığı)**: Business logic, validasyonlar, transaction yönetimi
3. **Repository (Veri Erişim)**: MongoDB ile CRUD işlemleri
4. **Entity (Domain)**: Veritabanı modelleri
5. **DTO (Transfer)**: Request/Response veri yapıları
6. **Security**: JWT tabanlı kimlik doğrulama

## 📄 Lisans

Garanti BBVA © 2025
