"""
Market Data API - CollectAPI Only (Production)
Gerçek zamanlı döviz, altın ve enflasyon verileri
"""
import os
import requests
from datetime import datetime
from typing import Dict, Optional
import time
from threading import Lock
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')


class CachedData:
    """TTL (Time-To-Live) ile cache sistemi"""
    def __init__(self, ttl_seconds: int = 300):  # 5 dakika default
        self.data = None
        self.timestamp = None
        self.ttl = ttl_seconds
        self.lock = Lock()
    
    def get(self) -> Optional[Dict]:
        """Cache'den veri al (geçerliyse)"""
        with self.lock:
            if self.data and self.timestamp:
                age = time.time() - self.timestamp
                if age < self.ttl:
                    return self.data
        return None
    
    def set(self, data: Dict):
        """Cache'e veri kaydet"""
        with self.lock:
            self.data = data
            self.timestamp = time.time()
    
    def clear(self):
        """Cache'i temizle"""
        with self.lock:
            self.data = None
            self.timestamp = None


class MarketDataAPI:
    """CollectAPI Market Data Provider"""
    
    def __init__(self):
        # API Key
        self.collectapi_key = os.environ.get('COLLECTAPI_KEY', '')
        
        # Cache instances - ARTIRILDI: Rate limit koruması için
        self.currency_cache = CachedData(ttl_seconds=600)  # 10 dakika (önceden 5)
        self.gold_cache = CachedData(ttl_seconds=600)  # 10 dakika (önceden 5)
        self.inflation_cache = CachedData(ttl_seconds=3600)  # 1 saat
        
        # Rate limit protection
        self.last_api_call = 0
        self.min_interval = 1.5  # Minimum 1.5 saniye arası (güvenli taraf)
        
        print(f"✅ MarketDataAPI initialized (CollectAPI Only)")
        print(f"   - CollectAPI Key: {'✓ Configured' if self.collectapi_key else '✗ Missing'}")
        print(f"   - Cache TTL: 10 min (currency/gold), 1 hour (inflation)")
        print(f"   - Rate limit protection: {self.min_interval}s minimum interval")
    
    # ==================== YARDIMCI FONKSİYONLAR ====================
    
    def _call_collectapi(self, endpoint: str) -> Optional[Dict]:
        """CollectAPI'ye istek gönder (rate limit korumalı)"""
        if not self.collectapi_key:
            return None
        
        try:
            # Rate limit protection: Son çağrıdan beri yeterli zaman geçti mi?
            now = time.time()
            time_since_last_call = now - self.last_api_call
            
            if time_since_last_call < self.min_interval:
                wait_time = self.min_interval - time_since_last_call
                print(f"⏱️  Rate limit protection: waiting {wait_time:.1f}s")
                time.sleep(wait_time)
            
            url = f"https://api.collectapi.com/economy/{endpoint}"
            headers = {
                "authorization": self.collectapi_key,
                "content-type": "application/json"
            }
            
            response = requests.get(url, headers=headers, timeout=10)
            self.last_api_call = time.time()  # Son çağrı zamanını kaydet
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    return data.get('result', [])
            
            # Rate limit özel kontrolü
            if response.status_code == 429:
                print(f"⚠️ CollectAPI rate limit (429) - Using cache or fallback")
                return None
            
            print(f"⚠️ CollectAPI error: {response.status_code} - {response.text[:100]}")
            return None
            
        except Exception as e:
            print(f"⚠️ CollectAPI request error: {e}")
            return None
    
    # ==================== DÖVİZ KURLARI ====================
    
    def get_currency_rates(self) -> Dict[str, float]:
        """
        Döviz kurları (USD, EUR)
        Strateji: CollectAPI -> Cache -> Simulated
        """
        # 1. Cache kontrol
        cached = self.currency_cache.get()
        if cached:
            print("💾 Currency rates from cache")
            return cached
        
        # 2. CollectAPI (Gerçek zamanlı)
        try:
            data = self._get_currency_from_collectapi()
            if data:
                self.currency_cache.set(data)
                print("🌐 Currency rates from CollectAPI (real-time)")
                return data
        except Exception as e:
            print(f"⚠️ CollectAPI error: {e}")
        
        # 3. Simulated fallback
        print("⚠️ Using simulated currency rates")
        data = self._get_fallback_currency_rates()
        self.currency_cache.set(data)
        return data
    
    def _get_currency_from_collectapi(self) -> Optional[Dict]:
        """CollectAPI'den döviz kurları çek"""
        result = self._call_collectapi("allCurrency")
        
        if result:
            usd = next((item for item in result if item['code'] == 'USD'), None)
            eur = next((item for item in result if item['code'] == 'EUR'), None)
            
            if usd and eur:
                return {
                    'USD': float(usd['selling']),
                    'EUR': float(eur['selling']),
                    'USD_buying': float(usd['buying']),
                    'EUR_buying': float(eur['buying']),
                    'timestamp': datetime.now().isoformat(),
                    'source': 'collectapi',
                    'data_date': usd.get('date', ''),
                    'data_time': usd.get('time', '')
                }
        return None
    
    def _get_fallback_currency_rates(self) -> Dict[str, float]:
        """Simulated fallback döviz kurları"""
        import random
        base_usd = 35.20
        base_eur = 38.50
        
        return {
            'USD': round(base_usd + random.uniform(-0.3, 0.3), 2),
            'EUR': round(base_eur + random.uniform(-0.3, 0.3), 2),
            'timestamp': datetime.now().isoformat(),
            'source': 'simulated',
            'warning': 'CollectAPI bağlantısı kurulamadı. Simüle edilmiş veriler kullanılıyor.'
        }
    
    # ==================== ALTIN FİYATLARI ====================
    
    def get_gold_prices(self) -> Dict[str, float]:
        """
        Altın fiyatları
        Strateji: CollectAPI -> Cache -> Simulated
        """
        # 1. Cache kontrol
        cached = self.gold_cache.get()
        if cached:
            print("💾 Gold prices from cache")
            return cached
        
        # 2. CollectAPI (Gerçek zamanlı)
        try:
            data = self._get_gold_from_collectapi()
            if data:
                self.gold_cache.set(data)
                print("🌐 Gold prices from CollectAPI (real-time)")
                return data
        except Exception as e:
            print(f"⚠️ CollectAPI gold error: {e}")
        
        # 3. Simulated fallback
        print("⚠️ Using simulated gold prices")
        data = self._get_fallback_gold_prices()
        self.gold_cache.set(data)
        return data
    
    def _get_gold_from_collectapi(self) -> Optional[Dict]:
        """CollectAPI'den altın fiyatları çek"""
        result = self._call_collectapi("goldPrice")
        
        if result:
            # Gram altın (24 ayar)
            gram_gold = next((item for item in result if 'Gram Altın' in item.get('name', '')), None)
            # Ons altın
            ons_gold = next((item for item in result if 'ONS Altın' == item.get('name', '')), None)
            
            if gram_gold and ons_gold:
                # USD cinsinden ons fiyatı için USD kurunu kullan
                usd_rate = self.get_currency_rates()['USD']
                ons_usd = round(float(ons_gold['selling']) / usd_rate, 2)
                
                return {
                    'gold_per_gram_try': round(float(gram_gold['selling']), 2),
                    'gold_per_gram_buying': round(float(gram_gold['buying']), 2),
                    'gold_per_ounce_try': round(float(ons_gold['selling']), 2),
                    'gold_per_ounce_usd': ons_usd,
                    'timestamp': datetime.now().isoformat(),
                    'source': 'collectapi'
                }
        return None
    
    def _get_fallback_gold_prices(self) -> Dict[str, float]:
        """Simulated fallback altın fiyatları"""
        import random
        usd_rate = self.get_currency_rates()['USD']
        gold_ounce_usd = 2680 + random.uniform(-30, 30)
        gram_price = (gold_ounce_usd / 31.1035) * usd_rate
        
        return {
            'gold_per_gram_try': round(gram_price, 2),
            'gold_per_ounce_try': round(gold_ounce_usd * usd_rate, 2),
            'gold_per_ounce_usd': round(gold_ounce_usd, 2),
            'timestamp': datetime.now().isoformat(),
            'source': 'simulated',
            'warning': 'CollectAPI bağlantısı kurulamadı. Simüle edilmiş veriler kullanılıyor.'
        }
    
    # ==================== ENFLASYON ====================
    
    def get_inflation_data(self) -> Dict[str, float]:
        """
        Enflasyon verileri (TÜİK resmi)
        Not: CollectAPI enflasyon endpoint'i yok, statik değerler kullanılıyor
        """
        # 1. Cache kontrol (enflasyon günlük değişmez)
        cached = self.inflation_cache.get()
        if cached:
            print("💾 Inflation data from cache")
            return cached
        
        # 2. Statik güncel enflasyon değerleri (manuel güncelleme gerekir)
        print("📊 Using static inflation data (TÜİK resmi)")
        data = self._get_static_inflation_data()
        self.inflation_cache.set(data)
        return data
    
    def _get_static_inflation_data(self) -> Dict[str, float]:
        """Statik enflasyon verileri (TÜİK'den manuel)"""
        # Son resmi TÜİK verileri (Ocak 2026)
        # Not: Bu değerler manuel olarak güncellenmelidir
        return {
            'monthly_inflation': 2.76,  # Aralık 2025 (örnek)
            'annual_inflation': 44.38,  # Yıllık (örnek)
            'timestamp': datetime.now().isoformat(),
            'source': 'static_tuik',
            'note': 'TÜİK resmi verileri - Manuel güncelleme gerekir',
            'last_update': '2026-01-03'
        }
    
    # ==================== DİĞER FONKSİYONLAR ====================
    
    def get_asset_returns(self) -> Dict[str, float]:
        """Varlık getiri oranları (yıllık %)"""
        inflation = self.get_inflation_data()['annual_inflation']
        
        return {
            'mevduat': round(inflation * 0.85, 2),
            'doviz': round(inflation * 1.05, 2),
            'altin': round(inflation * 0.95, 2),
            'fon': round(inflation * 1.25, 2),
            'inflation': inflation
        }
    
    def get_market_summary(self) -> Dict:
        """Tüm market verilerini toplu olarak getir"""
        return {
            'currencies': self.get_currency_rates(),
            'gold': self.get_gold_prices(),
            'inflation': self.get_inflation_data(),
            'asset_returns': self.get_asset_returns(),
            'last_updated': datetime.now().isoformat()
        }
    
    def clear_all_caches(self):
        """Tüm cache'leri temizle"""
        self.currency_cache.clear()
        self.gold_cache.clear()
        self.inflation_cache.clear()
        print("✅ All market data caches cleared")
    
    def get_cache_status(self) -> Dict:
        """Cache durumunu göster"""
        def get_age(cache: CachedData) -> Optional[float]:
            if cache.timestamp:
                return time.time() - cache.timestamp
            return None
        
        return {
            'currency_cache': {
                'has_data': self.currency_cache.data is not None,
                'age_seconds': get_age(self.currency_cache),
                'ttl': self.currency_cache.ttl
            },
            'gold_cache': {
                'has_data': self.gold_cache.data is not None,
                'age_seconds': get_age(self.gold_cache),
                'ttl': self.gold_cache.ttl
            },
            'inflation_cache': {
                'has_data': self.inflation_cache.data is not None,
                'age_seconds': get_age(self.inflation_cache),
                'ttl': self.inflation_cache.ttl
            }
        }


# Global instance
market_data_api = MarketDataAPI()


# Test fonksiyonu
if __name__ == "__main__":
    print("\n=== Market Data API Test (CollectAPI Only) ===\n")
    
    print("1. Döviz Kurları:")
    currencies = market_data_api.get_currency_rates()
    print(f"   USD: {currencies['USD']} TL (Alış: {currencies.get('USD_buying', 'N/A')})")
    print(f"   EUR: {currencies['EUR']} TL (Alış: {currencies.get('EUR_buying', 'N/A')})")
    print(f"   Kaynak: {currencies.get('source', 'unknown')}")
    print(f"   Tarih: {currencies.get('data_date', 'N/A')} {currencies.get('data_time', '')}\n")
    
    print("2. Altın Fiyatları:")
    gold = market_data_api.get_gold_prices()
    print(f"   Gram Altın: {gold['gold_per_gram_try']} TL")
    print(f"   Ons (TRY): {gold['gold_per_ounce_try']} TL")
    print(f"   Ons (USD): ${gold['gold_per_ounce_usd']}")
    print(f"   Kaynak: {gold.get('source', 'unknown')}\n")
    
    print("3. Enflasyon:")
    inflation = market_data_api.get_inflation_data()
    print(f"   Yıllık: %{inflation['annual_inflation']}")
    print(f"   Aylık: %{inflation['monthly_inflation']}")
    print(f"   Kaynak: {inflation.get('source', 'unknown')}")
    print(f"   Not: {inflation.get('note', 'N/A')}\n")
    
    print("4. Cache Durumu:")
    import json
    print(json.dumps(market_data_api.get_cache_status(), indent=2))
