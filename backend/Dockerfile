###############################################################################
# Garanti BBVA - Akilli Birikim Backend (Python FastAPI + Deep Learning)
###############################################################################

FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    TF_CPP_MIN_LOG_LEVEL=2

WORKDIR /app

# Sistem bagimliliklari
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        gcc \
        g++ \
        curl \
        ca-certificates \
        libgomp1 \
        libxml2-dev \
        libxslt1-dev \
        libjpeg-dev \
        zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

# Python bagimliliklari
COPY requirements.txt /tmp/requirements.txt
RUN sed -E '/^librt(==.*)?$/d; /^bs4==beautifulsoup4$/d' /tmp/requirements.txt > /tmp/requirements.docker.txt \
    && pip install --upgrade pip \
    && pip install \
        --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/ \
        -r /tmp/requirements.docker.txt \
    && pip install --force-reinstall 'bcrypt==4.0.1' 'httpx==0.27.2'

# Uygulama kodu
COPY . /app

EXPOSE 8001

HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=3 \
    CMD curl -fsS http://localhost:8001/api/wealth-categories || exit 1

# Eski entrypoint varsa temizle
ENTRYPOINT []

# Inline CMD - ayri bir .sh dosyasi yok
CMD ["sh", "-c", "echo '[1/3] MongoDB bekleniyor...' && until python -c 'from pymongo import MongoClient; import os; MongoClient(os.environ[\"MONGO_URL\"], serverSelectionTimeoutMS=2000).admin.command(\"ping\")' 2>/dev/null; do sleep 1; done && echo '      MongoDB hazir.' && echo '[2/3] Seed verileri...' && (python init_data.py || echo '  UYARI: init_data.py hata verdi, devam') && (python seed_data.py || echo '  UYARI: seed_data.py hata verdi, devam') && echo '[3/3] FastAPI baslatiliyor (port 8001)' && exec uvicorn server:app --host 0.0.0.0 --port 8001 --workers 1"]
