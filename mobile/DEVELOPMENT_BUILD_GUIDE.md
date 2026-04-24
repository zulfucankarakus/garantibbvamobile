# Garanti BBVA Mobile - Development Build Guide

## 🚀 Kurulum ve Çalıştırma

### Ön Gereksinimler
- Node.js (v18 veya üzeri)
- Yarn
- Android Studio (Android için) veya Xcode (iOS için)
- EAS CLI: `npm install -g eas-cli`

### 1. Bağımlılıkları Yükle
```bash
cd /app/mobile
yarn install
```

### 2. Development Build Oluştur

#### Android için:
```bash
# Local build (Android Studio gerekli)
npx expo run:android

# Veya EAS Build ile cloud'da build
eas build --profile development --platform android
```

#### iOS için (sadece macOS):
```bash
# Local build (Xcode gerekli)
npx expo run:ios

# Veya EAS Build ile cloud'da build
eas build --profile development --platform ios
```

### 3. Uygulamayı Başlat
```bash
npx expo start --dev-client
```

**QR kod çıkacak:**
- Android için: Development build APK'yı yükleyin, ardından QR kodu tarayın
- iOS için: Development build IPA'yı yükleyin, ardından QR kodu tarayın

---

## 📱 Yeni Özellikler

### 💰 Yatırımlar (Investments)
- **4 Kategori**: Altın, Döviz, Hisse Senedi, Kripto
- **Gerçek Zamanlı Fiyatlar**: API'den güncel veriler
- **Grafik Görünümü**: 7/30/90 günlük fiyat grafiği
- **AI Yatırım Önerisi**: Gemini/OpenAI ile AL/SAT/BEKLE önerileri
- **Alım/Satım Simülasyonu**: Gerçek hesaptan işlem
- **Portföy Takibi**: Kâr/zarar hesaplamaları

### 🔍 Web Scraping - Fiyat Karşılaştırma
- **Vision Lens Entegrasyonu**: Fotoğraf çek → AI analiz → Fiyat karşılaştır
- **5 E-Ticaret Sitesi**: Hepsiburada, Trendyol, N11, Amazon TR, Sahibinden
- **Akıllı Analiz**: Ortalama fiyat, en ucuz site, tasarruf fırsatı

---

## 🛠️ Sorun Giderme

### "Metro bundler başlamıyor"
```bash
# Cache'i temizle
cd /app/mobile
rm -rf .expo node_modules/.cache
yarn cache clean
yarn install
```

### "Native modül bulunamadı"
```bash
# Prebuild'i tekrarla
npx expo prebuild --clean
```

### "Android build hatası"
- Android Studio'da `/app/mobile/android` klasörünü açın
- Gradle sync yapın
- Build → Clean Project → Rebuild Project

---

## 📚 API Endpoint'leri

Backend: `https://smart-interaction.preview.emergentagent.com/api`

### Yatırım API'leri:
- `GET /investments/assets` - Tüm yatırım varlıkları
- `GET /investments/asset/{id}` - Varlık detayı
- `GET /investments/ai-recommendation/{id}` - AI öneri
- `POST /investments/buy` - Yatırım al
- `POST /investments/sell` - Yatırım sat
- `GET /investments/portfolio` - Portföy
- `GET /investments/transactions` - İşlem geçmişi

### Web Scraping:
- `POST /vision/scrape-prices` - Fiyat karşılaştırma

---

## 🎯 Test Kullanıcısı

**TC Kimlik No:** 12345678950  
**Şifre:** 123456  
**Bakiye:** 25,000 TL

---

## 💡 Önemli Notlar

1. **Expo Go Desteklenmiyor**: Bu proje custom native kod kullandığı için Development Build gereklidir
2. **Hot Reload**: Development build'de hot reload çalışır
3. **Backend URL**: `/app/mobile/src/config/api.js` dosyasında tanımlı
4. **Asset'ler**: `/app/mobile/assets/` klasöründe

---

## 📦 Üretim Build (Production)

### EAS Build ile:
```bash
# Android APK
eas build --profile production --platform android

# iOS IPA (App Store)
eas build --profile production --platform ios
```

### Local build:
```bash
# Android
cd android && ./gradlew assembleRelease

# iOS (macOS only)
cd ios && xcodebuild
```

---

## 🔗 Faydalı Linkler

- [Expo Development Builds](https://docs.expo.dev/develop/development-builds/introduction/)
- [EAS Build](https://docs.expo.dev/build/introduction/)
- [React Navigation](https://reactnavigation.org/)
- [Expo Linear Gradient](https://docs.expo.dev/versions/latest/sdk/linear-gradient/)
