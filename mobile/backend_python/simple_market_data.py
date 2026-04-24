"""
Simple Market Data API - CollectAPI Integration
USD, EUR, Altın ve Enflasyon verilerini çeker
"""
import os
import requests
from datetime import datetime
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')


def get_market_data():
    """CollectAPI'den market verilerini çek"""
    
    api_key = os.environ.get('COLLECTAPI_KEY', '')
    
    print(f"[Market Data] API Key present: {bool(api_key)}")
    
    if not api_key:
        print("[Market Data] No API key, using fallback")
        return get_fallback_data()
    
    try:
        # CollectAPI Headers
        headers = {
            "authorization": api_key,
            "content-type": "application/json"
        }
        
        print("[Market Data] Fetching currency data...")
        
        # 1. Döviz Kurları (USD, EUR)
        currency_response = requests.get(
            "https://api.collectapi.com/economy/allCurrency",
            headers=headers,
            timeout=10
        )
        
        print(f"[Market Data] Currency response status: {currency_response.status_code}")
        
        currencies = {}
        if currency_response.status_code == 200:
            currency_data = currency_response.json()
            print(f"[Market Data] Currency success: {currency_data.get('success')}")
            if currency_data.get('success'):
                result = currency_data.get('result', [])
                usd = next((item for item in result if item['code'] == 'USD'), None)
                eur = next((item for item in result if item['code'] == 'EUR'), None)
                
                if usd and eur:
                    currencies = {
                        'USD': float(usd['selling']),
                        'EUR': float(eur['selling']),
                        'date': usd.get('date', ''),
                        'time': usd.get('time', '')
                    }
                    print(f"[Market Data] Currency parsed: USD={currencies['USD']}, EUR={currencies['EUR']}")
        
        print("[Market Data] Fetching gold data...")
        
        # 2. Altın Fiyatları
        gold_response = requests.get(
            "https://api.collectapi.com/economy/goldPrice",
            headers=headers,
            timeout=10
        )
        
        print(f"[Market Data] Gold response status: {gold_response.status_code}")
        
        gold = {}
        if gold_response.status_code == 200:
            gold_data = gold_response.json()
            print(f"[Market Data] Gold success: {gold_data.get('success')}")
            if gold_data.get('success'):
                result = gold_data.get('result', [])
                gram_gold = next((item for item in result if 'Gram Altın' in item.get('name', '')), None)
                
                if gram_gold:
                    gold = {
                        'price': float(gram_gold['selling']),
                        'unit': '₺/gr'
                    }
                    print(f"[Market Data] Gold parsed: {gold['price']}")
        
        # 3. Enflasyon (Statik - TÜİK resmi verileri)
        inflation = {
            'rate': 44.38,
            'source': 'TÜİK',
            'note': 'Yıllık enflasyon oranı'
        }
        
        # Eğer veri çekilemezse fallback
        if not currencies or not gold:
            print(f"[Market Data] Missing data - currencies: {bool(currencies)}, gold: {bool(gold)}")
            print("[Market Data] Using fallback")
            return get_fallback_data()
        
        print("[Market Data] All data collected successfully!")
        
        return {
            'success': True,
            'currencies': currencies,
            'gold': gold,
            'inflation': inflation,
            'timestamp': datetime.now().isoformat(),
            'source': 'collectapi'
        }
        
    except Exception as e:
        print(f"[Market Data] Exception: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        return get_fallback_data()


def get_fallback_data():
    """Fallback simulated data"""
    return {
        'success': False,
        'currencies': {
            'USD': 35.20,
            'EUR': 38.50,
            'date': '',
            'time': ''
        },
        'gold': {
            'price': 2850.00,
            'unit': '₺/gr'
        },
        'inflation': {
            'rate': 44.38,
            'source': 'TÜİK',
            'note': 'Yıllık enflasyon oranı'
        },
        'timestamp': datetime.now().isoformat(),
        'source': 'simulated',
        'warning': 'CollectAPI bağlantısı kurulamadı. Simüle edilmiş veriler gösteriliyor.'
    }


# Test
if __name__ == "__main__":
    data = get_market_data()
    print("\n=== Market Data ===")
    print(f"Source: {data['source']}")
    print(f"USD: {data['currencies']['USD']} ₺")
    print(f"EUR: {data['currencies']['EUR']} ₺")
    print(f"Altın: {data['gold']['price']} {data['gold']['unit']}")
    print(f"Enflasyon: %{data['inflation']['rate']}")
