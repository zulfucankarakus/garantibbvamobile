"""
Gercek Veri Entegrasyonu
CollectAPI ve diger kaynaklardan gercek piyasa verisi cekme
"""

import os
import aiohttp
import asyncio
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
import logging
import numpy as np

logger = logging.getLogger(__name__)


class RealDataFetcher:
    """Gercek piyasa verisi cekici"""
    
    def __init__(self):
        self.collectapi_key = os.environ.get('COLLECTAPI_KEY', '')
        self.base_url = "https://api.collectapi.com"
        self.cache = {}  # Basit cache
        self.cache_duration = 300  # 5 dakika
        logger.info("RealDataFetcher initialized")
    
    async def _make_request(self, endpoint: str) -> Optional[Dict]:
        """CollectAPI'ye istek gonder"""
        if not self.collectapi_key:
            logger.warning("CollectAPI key bulunamadi")
            return None
        
        headers = {
            "authorization": f"apikey {self.collectapi_key}",
            "content-type": "application/json"
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.base_url}{endpoint}",
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as response:
                    if response.status == 200:
                        return await response.json()
                    else:
                        logger.error(f"API Error: {response.status}")
                        return None
        except Exception as e:
            logger.error(f"Request error: {e}")
            return None
    
    def _get_from_cache(self, key: str) -> Optional[Any]:
        """Cache'den veri al"""
        if key in self.cache:
            data, timestamp = self.cache[key]
            if datetime.now().timestamp() - timestamp < self.cache_duration:
                return data
        return None
    
    def _set_cache(self, key: str, data: Any):
        """Cache'e veri kaydet"""
        self.cache[key] = (data, datetime.now().timestamp())
    
    async def get_gold_prices(self) -> Dict[str, Any]:
        """Altin fiyatlarini getir"""
        cache_key = "gold_prices"
        cached = self._get_from_cache(cache_key)
        if cached:
            return cached
        
        data = await self._make_request("/economy/goldPrice")
        
        if data and data.get('success'):
            result = {
                "success": True,
                "source": "CollectAPI",
                "timestamp": datetime.now().isoformat(),
                "prices": []
            }
            
            for item in data.get('result', []):
                buying = item.get('buying', 0)
                selling = item.get('selling', 0)
                
                # String ise float'a cevir
                if isinstance(buying, str):
                    buying = float(buying.replace('.', '').replace(',', '.'))
                if isinstance(selling, str):
                    selling = float(selling.replace('.', '').replace(',', '.'))
                    
                result["prices"].append({
                    "name": item.get('name', ''),
                    "buying": float(buying),
                    "selling": float(selling)
                })
            
            self._set_cache(cache_key, result)
            return result
        
        return {"success": False, "error": "Veri alinamadi"}
    
    async def get_currency_rates(self) -> Dict[str, Any]:
        """Doviz kurlarini getir"""
        cache_key = "currency_rates"
        cached = self._get_from_cache(cache_key)
        if cached:
            return cached
        
        data = await self._make_request("/economy/currencyToAll?int=1&base=USD")
        
        if data and data.get('success'):
            result = {
                "success": True,
                "source": "CollectAPI",
                "timestamp": datetime.now().isoformat(),
                "rates": data.get('result', {}).get('data', {})
            }
            self._set_cache(cache_key, result)
            return result
        
        # Fallback - CollectAPI hata verirse
        return await self._get_fallback_currency()
    
    async def _get_fallback_currency(self) -> Dict[str, Any]:
        """Yedek doviz kuru"""
        return {
            "success": True,
            "source": "Fallback",
            "timestamp": datetime.now().isoformat(),
            "rates": {
                "USD": {"name": "Amerikan Dolari", "rate": 32.50},
                "EUR": {"name": "Euro", "rate": 35.80},
                "GBP": {"name": "Ingiliz Sterlini", "rate": 41.20}
            }
        }
    
    async def get_historical_prices(self, asset: str, days: int = 60) -> List[float]:
        """Tarihsel fiyat verisi getir"""
        # CollectAPI tarihsel veri saglamiyor, simule ediyoruz
        # Gercek uygulamada Yahoo Finance, Alpha Vantage vb. kullanilabilir
        
        base_prices = {
            "gold": 2900.0,
            "usd": 32.5,
            "eur": 35.8,
            "bist100": 9800.0,
            "btc": 67000.0
        }
        
        base = base_prices.get(asset.lower(), 100.0)
        
        # Gercekci bir zaman serisi olustur
        np.random.seed(int(datetime.now().timestamp()) % 1000 + hash(asset) % 1000)
        
        prices = [base]
        volatility = {
            "gold": 0.015,
            "usd": 0.008,
            "eur": 0.009,
            "bist100": 0.02,
            "btc": 0.04
        }.get(asset.lower(), 0.01)
        
        trend = {
            "gold": 0.002,
            "usd": 0.001,
            "eur": 0.001,
            "bist100": 0.0015,
            "btc": 0.003
        }.get(asset.lower(), 0.001)
        
        for i in range(1, days):
            change = np.random.normal(trend, volatility)
            new_price = prices[-1] * (1 + change)
            prices.append(new_price)
        
        return prices
    
    async def get_live_price(self, asset: str) -> Dict[str, Any]:
        """Canli fiyat getir"""
        if asset.lower() == "gold":
            gold_data = await self.get_gold_prices()
            if gold_data.get('success') and gold_data.get('prices'):
                gram_gold = next(
                    (p for p in gold_data['prices'] if 'gram' in p['name'].lower()),
                    gold_data['prices'][0] if gold_data['prices'] else None
                )
                if gram_gold:
                    return {
                        "success": True,
                        "asset": asset,
                        "price": gram_gold['selling'],
                        "currency": "TRY",
                        "timestamp": datetime.now().isoformat()
                    }
        
        elif asset.lower() in ["usd", "eur", "gbp"]:
            currency_data = await self.get_currency_rates()
            if currency_data.get('success'):
                rate = currency_data.get('rates', {}).get(asset.upper(), {})
                if rate:
                    return {
                        "success": True,
                        "asset": asset,
                        "price": rate.get('rate', 0),
                        "currency": "TRY",
                        "timestamp": datetime.now().isoformat()
                    }
        
        # Fallback
        prices = await self.get_historical_prices(asset, 1)
        return {
            "success": True,
            "asset": asset,
            "price": prices[-1] if prices else 0,
            "currency": "TRY" if asset.lower() != "btc" else "USD",
            "timestamp": datetime.now().isoformat(),
            "source": "simulated"
        }


# Singleton instance
real_data_fetcher = RealDataFetcher()
