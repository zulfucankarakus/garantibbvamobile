# 🏦 Garanti BBVA Mobile Banking

Garanti BBVA "Akıllı Birikim" mobil bankacılık uygulaması.

- **Backend**: Python FastAPI + TensorFlow LSTM (Deep Learning)
- **Mobile**: React Native (Expo SDK 54)
- **Database**: MongoDB 7

> 💡 Depoda Java Spring Boot kodu da yer alır (`/app/backend/src/main/java`, `/app/mobile/backend`). Ancak **çalışan / aktif backend** Python tarafındaki `server.py`'dir; **Deep Learning özelliği (LSTM fiyat tahmini) bu backend içinde yer alır**. Docker ortamı da Python backend'i ayağa kaldırır.

---

## 📁 Proje Yapısı

```
/app/
├── backend/                # 🐍 Python FastAPI + Deep Learning (AKTİF)
│   ├── server.py           # Ana API uygulaması
│   ├── lstm_predictor.py   # TensorFlow LSTM fiyat tahmin modeli
│   ├── init_data.py        # İlk açılışta test verisi yükler
│   ├── seed_data.py        # Wealth categories / tips / saving plans seed
│   ├── requirements.txt    # Python bağımlılıkları
│   ├── Dockerfile          # Docker imajı tanımı
│   ├── docker-entrypoint.sh
│   ├── .env.example        # Environment template
│   └── src/main/java/      # (Pasif) Spring Boot alternatif
│
├── mobile/                 # 📱 React Native (Expo) uygulama
│   ├── App.js
│   ├── src/                # Ekranlar, servisler, context
│   └── package.json
│
├── docker-compose.yml      # 🐳 Mongo + Mongo Express + Backend tek komut
└── README.md
```

---

## 🚀 Hızlı Başlangıç (Önerilen: Docker)

Bilgisayarınızda **Docker Desktop** (Windows/macOS) veya **Docker Engine + Compose** (Linux) kuruluysa **tek komutla** her şeyi ayağa kaldırabilirsiniz.

```bash
cd /app
docker compose up -d --build
```

Bu komut:

| Servis | Port | Açıklama |
|--------|------|----------|
| **MongoDB** | `27017` | Veritabanı (kalıcı volume: `garanti_mongo_data`) |
| **Mongo Express** | `8081` | Web tabanlı DB admin paneli (`admin / admin123`) |
| **Backend** | `8001` | FastAPI API → `http://localhost:8001/api` |

İlk build TensorFlow nedeniyle 5–10 dk sürebilir. Sonraki başlatmalar saniyeler içinde tamamlanır.

### ✅ Çalıştığını doğrulayın

```bash
# Servis durumları
docker compose ps

# Backend log akışı
docker compose logs -f backend

# Hızlı API testi
curl http://localhost:8001/api/wealth-categories
```

### 🔑 Hazır test kullanıcısı

`init_data.py` ilk açılışta otomatik olarak şu kullanıcıyı oluşturur:

| Alan | Değer |
|------|-------|
| TC No | `12345678950` |
| Şifre | `Test123456` |
| Bakiye | `25.000 TL` |
| Kredi Kartı Limiti | `50.000 TL` |

### 🛑 Durdurma / Temizleme

```bash
docker compose down              # konteynerleri durdur (veriler korunur)
docker compose down -v           # konteyner + volume sil (sıfırdan başla)
docker compose logs backend      # tek seferlik log
docker compose restart backend   # sadece backend'i yeniden başlat
```

---

## 🖥️ Yerel (Docker'sız) Kurulum — Adım Adım

İşletim sisteminize göre talimatlar:

### 1. Ön Gereksinimler

| Araç | Sürüm | Windows | macOS | Linux |
|------|-------|---------|-------|-------|
| Python | 3.11 | [python.org](https://www.python.org/downloads/) | `brew install python@3.11` | `apt install python3.11` |
| Node.js | 18+ | [nodejs.org](https://nodejs.org/) | `brew install node` | `apt install nodejs` |
| Yarn | latest | `npm i -g yarn` | `brew install yarn` | `npm i -g yarn` |
| MongoDB | 7+ | [mongodb.com](https://www.mongodb.com/try/download/community) | `brew install mongodb-community` | [MongoDB docs](https://www.mongodb.com/docs/manual/installation/) |
| Expo CLI | latest | `npm i -g expo` | `npm i -g expo` | `npm i -g expo` |

> 💡 MongoDB'yi kurmak istemiyorsanız sadece DB için Docker kullanabilirsiniz:
> `docker run -d -p 27017:27017 --name mongo mongo:7`

### 2. Repoyu Hazırlayın

```bash
cd /app
```

### 3. Backend (Python FastAPI) Kurulumu

```bash
cd backend

# 3.1) Sanal ortam oluştur
python3.11 -m venv venv

# Windows:
venv\Scripts\activate
# macOS / Linux:
source venv/bin/activate

# 3.2) Bağımlılıkları kur (TensorFlow uzun sürebilir, sabırlı olun)
pip install --upgrade pip
pip install -r requirements.txt

# 3.3) Environment dosyasını oluştur
cp .env.example .env
# .env içinde MONGO_URL=mongodb://localhost:27017 olduğundan emin olun

# 3.4) İlk verileri yükle
python init_data.py
python seed_data.py

# 3.5) Sunucuyu başlat
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

✅ Tarayıcıda <http://localhost:8001/api/wealth-categories> görüldüğünde backend hazır.

### 4. Mobile (React Native + Expo) Kurulumu

Yeni bir terminal açın:

```bash
cd /app/mobile

# 4.1) Bağımlılıkları kur
yarn install

# 4.2) API URL'ini lokale yönlendir (önemli!)
# /app/mobile/src/config/api.js dosyasındaki API_URL'i kendi makinenize göre düzenleyin:
#   - Aynı bilgisayar:    http://localhost:8001/api
#   - Telefon ile test:   http://<BILGISAYAR_IP>:8001/api  (örn: http://192.168.1.42:8001/api)
#
# Veya environment variable ile çalıştırın:
EXPO_PUBLIC_API_URL=http://localhost:8001/api yarn start
# Windows PowerShell:
#   $env:EXPO_PUBLIC_API_URL="http://localhost:8001/api"; yarn start

# 4.3) Expo başlat
yarn start
```

Açılan ekranda:
- `w` → web tarayıcıda
- `a` → Android emulator
- `i` → iOS simulator (sadece macOS)
- **QR kod** → telefonda Expo Go uygulamasıyla

### 5. Test Girişi

Mobil uygulamada:
- **TC No**: `12345678950`
- **Şifre**: `Test123456`

---

## 🐳 Docker Ortamına Mobile Bağlama

Docker ile sadece backend ayağa kalkar. Mobil uygulama yine kendi makinenizde Expo ile çalışır:

```bash
# Bilgisayarınızın yerel IP'sini öğrenin
ipconfig         # Windows
ifconfig         # macOS / Linux
ip addr          # Linux (alternatif)

# Mobile'i bu IP üzerinden başlatın
cd /app/mobile
EXPO_PUBLIC_API_URL=http://192.168.X.Y:8001/api yarn start
```

> Telefonun ve bilgisayarın **aynı Wi-Fi ağında** olması gerekir.

---

## 🔌 Önemli Endpoint'ler

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| `POST` | `/api/auth/register` | Kullanıcı kaydı |
| `POST` | `/api/auth/login` | Giriş |
| `GET`  | `/api/auth/me` | Aktif kullanıcı |
| `GET`  | `/api/accounts` | Hesap listesi |
| `GET`  | `/api/cards` | Kart listesi |
| `POST` | `/api/transactions` | Para transferi |
| `POST` | `/api/qr/generate` | QR oluştur |
| `POST` | `/api/qr/pay` | QR ile ödeme |
| `POST` | `/api/lstm/predict` | 🧠 LSTM fiyat tahmini (Deep Learning) |
| `POST` | `/api/ai-investment/recommend` | AI yatırım dağılımı |
| `GET`  | `/api/branches/nearest` | En yakın şube |

> Tüm `api/*` rotaları FastAPI üzerinden servis edilir.

---

## 🧠 Deep Learning (LSTM) Notu

`/app/backend/lstm_predictor.py` dosyası TensorFlow tabanlı bir LSTM modeli içerir. Container ilk açıldığında modeller boş başlar ve istek geldikçe sentetik geçmiş veriden eğitilir (rolling prediction). TensorFlow yoksa otomatik olarak fallback (lineer projeksiyon) çalışır — bu yüzden uygulama ML kütüphaneleri olmadan da ayakta durur.

Docker imajında TensorFlow 2.15 + scikit-learn 1.3.2 hazır gelir, ek bir kurulum gerekmez.

---

## 🛠️ Sorun Giderme

| Sorun | Çözüm |
|-------|-------|
| `docker compose up` build çok yavaş | TensorFlow indiriliyor, ilk seferde 5-10 dk normaldir. |
| Backend `MONGO_URL not set` hatası | `.env` dosyası oluşturmadıysanız `cp .env.example .env` |
| Port 27017 / 8001 / 8081 çakışıyor | Diğer Mongo / API süreçlerini durdurun veya `docker-compose.yml` içinde port'u değiştirin |
| Mobil "Network Error" | API URL `localhost` olamaz; bilgisayarınızın LAN IP'sini kullanın |
| Mongo Express'e giremiyorum | Kullanıcı: `admin` / Şifre: `admin123` |
| TensorFlow uyarıları log'u dolduruyor | `TF_CPP_MIN_LOG_LEVEL=2` zaten set, kritik değil |

Docker temiz kurulum:

```bash
docker compose down -v
docker system prune -f
docker compose up -d --build
```

---