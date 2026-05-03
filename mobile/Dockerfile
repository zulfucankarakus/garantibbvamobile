###############################################################################
# Garanti BBVA Mobile - React Native / Expo SDK 54 (Docker)
###############################################################################
# Expo Metro bundler'i container icinde calistirir.
# QR kod `docker compose logs -f expo` ile gorulebilir.
#
# Not: Telefon Mac ile ayni Wi-Fi agindaki olmali cunku QR kod LAN IP
# (HOST_IP) uzerinden isaret eder. Backend'e de ayni IP'den erisir.
###############################################################################

FROM node:20-bookworm-slim

ENV NODE_ENV=development \
    EXPO_NO_TELEMETRY=1

WORKDIR /app

# Git + build tools (bazi native moduller icin)
RUN apt-get update && apt-get install -y --no-install-recommends \
        git \
        python3 \
        make \
        g++ \
        curl \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Bagimliliklari once kur (cache optimizasyonu)
COPY package.json yarn.lock ./

RUN yarn install --network-timeout 600000 \
    && yarn add --dev @expo/ngrok@^4.1.0 --network-timeout 600000

# Kaynak kodunu kopyala
COPY . .

# Expo port'lari
EXPOSE 8081 19000 19001 19002

# LAN modunda Metro bundler'i baslat
# REACT_NATIVE_PACKAGER_HOSTNAME env degeri compose'tan gelir ve QR kodda
# bu IP kullanilir. Boylece telefon Mac'in LAN IP'sine ulasir.
CMD ["sh", "-c", "yarn expo start --clear --lan"]