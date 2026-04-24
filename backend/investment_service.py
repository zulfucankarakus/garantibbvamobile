"""
Investment Service - Yatırım Varlıkları ve Portföy Yönetimi
Altın, Döviz, Hisse Senetleri, Kripto
"""
import os
import requests
import asyncio
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage
import random

load_dotenv()

COLLECTAPI_KEY = os.getenv('COLLECTAPI_KEY')
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')


class InvestmentService:
    """Yatırım servisi - Gerçek zamanlı fiyatlar ve AI önerileri"""
    
    def __init__(self):
        self.collectapi_key = COLLECTAPI_KEY
        self.gemini_api_key = GEMINI_API_KEY
        self.openai_api_key = OPENAI_API_KEY
        
        # Yatırım kategorileri
        self.categories = {
            'gold': {'name': 'Altın', 'icon': '🪙', 'color': '#FFD700'},
            'forex': {'name': 'Döviz', 'icon': '💵', 'color': '#4CAF50'},
            'stock': {'name': 'Hisse Senedi', 'icon': '📈', 'color': '#2196F3'},
            'crypto': {'name': 'Kripto', 'icon': '₿', 'color': '#FF9800'}
        }
    
    async def get_all_assets(self) -> Dict[str, Any]:
        """Tüm yatırım varlıklarını kategorilere göre listele"""
        try:
            assets = {
                'gold': await self._get_gold_assets(),
                'forex': await self._get_forex_assets(),
                'stock': await self._get_stock_assets(),
                'crypto': await self._get_crypto_assets()
            }
            
            return {
                'success': True,
                'categories': self.categories,
                'assets': assets
            }
        except Exception as e:
            print(f"Get all assets error: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def _get_gold_assets(self) -> List[Dict[str, Any]]:
        """Altın varlıkları - CollectAPI"""
        try:
            url = "https://api.collectapi.com/economy/goldPrice"
            headers = {
                "authorization": f"apikey {self.collectapi_key}",
                "content-type": "application/json"
            }
            
            response = requests.get(url, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    gold_data = data.get("result", [])
                    
                    assets = []
                    for item in gold_data:
                        name = item.get("name", "")
                        buying = float(item.get("buying", 0))
                        selling = float(item.get("selling", 0))
                        change = float(item.get("rate", 0))
                        
                        # Sadece önemli altınları ekle
                        if any(keyword in name for keyword in ["Gram", "Çeyrek", "Cumhuriyet", "Ons"]):
                            asset_id = f"gold_{name.lower().replace(' ', '_')}"
                            assets.append({
                                'id': asset_id,
                                'name': name,
                                'symbol': name[:4].upper(),
                                'category': 'gold',
                                'current_price': buying,
                                'selling_price': selling,
                                'change_percent': change,
                                'currency': 'TRY',
                                'is_trending': abs(change) > 2
                            })
                    
                    return assets
            
            # Fallback: Mock data
            return self._get_mock_gold_assets()
            
        except Exception as e:
            print(f"Gold assets error: {e}")
            return self._get_mock_gold_assets()
    
    def _get_mock_gold_assets(self) -> List[Dict[str, Any]]:
        """Altın mock data"""
        base_prices = {
            'Gram Altın': 6362.94,
            'Çeyrek Altın': 10441.00,
            'Yarım Altın': 20512.00,
            'Cumhuriyet Altını': 41690.00
        }
        
        assets = []
        for name, price in base_prices.items():
            change = random.uniform(-3, 3)
            assets.append({
                'id': f"gold_{name.lower().replace(' ', '_')}",
                'name': name,
                'symbol': name[:4].upper(),
                'category': 'gold',
                'current_price': round(price, 2),
                'selling_price': round(price * 1.01, 2),
                'change_percent': round(change, 2),
                'currency': 'TRY',
                'is_trending': abs(change) > 2
            })
        
        return assets
    
    async def _get_forex_assets(self) -> List[Dict[str, Any]]:
        """Döviz kurları - TCMB veya API"""
        try:
            # TCMB API veya başka bir forex API kullanılabilir
            # Şimdilik mock data döndürelim
            return self._get_mock_forex_assets()
        except Exception as e:
            print(f"Forex assets error: {e}")
            return self._get_mock_forex_assets()
    
    def _get_mock_forex_assets(self) -> List[Dict[str, Any]]:
        """Döviz mock data"""
        forex_data = [
            {'name': 'Dolar', 'symbol': 'USD/TRY', 'price': 34.25, 'change': 0.45},
            {'name': 'Euro', 'symbol': 'EUR/TRY', 'price': 37.58, 'change': 0.67},
            {'name': 'Sterlin', 'symbol': 'GBP/TRY', 'price': 43.92, 'change': 0.32},
            {'name': 'Japon Yeni', 'symbol': 'JPY/TRY', 'price': 0.23, 'change': -0.15}
        ]
        
        assets = []
        for item in forex_data:
            assets.append({
                'id': f"forex_{item['symbol'].lower().replace('/', '_')}",
                'name': item['name'],
                'symbol': item['symbol'],
                'category': 'forex',
                'current_price': item['price'],
                'change_percent': item['change'],
                'currency': 'TRY',
                'is_trending': abs(item['change']) > 0.5
            })
        
        return assets
    
    async def _get_stock_assets(self) -> List[Dict[str, Any]]:
        """Hisse senetleri - BIST100"""
        try:
            # BIST API veya finans API'si kullanılabilir
            # Şimdilik mock data
            return self._get_mock_stock_assets()
        except Exception as e:
            print(f"Stock assets error: {e}")
            return self._get_mock_stock_assets()
    
    def _get_mock_stock_assets(self) -> List[Dict[str, Any]]:
        """Hisse senedi mock data"""
        stocks = [
            {'name': 'Garanti BBVA', 'symbol': 'GARAN', 'price': 125.50, 'change': 2.34},
            {'name': 'Türk Hava Yolları', 'symbol': 'THYAO', 'price': 398.75, 'change': 1.89},
            {'name': 'Ereğli Demir Çelik', 'symbol': 'EREGL', 'price': 52.30, 'change': -0.95},
            {'name': 'Koç Holding', 'symbol': 'KCHOL', 'price': 178.20, 'change': 0.56},
            {'name': 'Aselsan', 'symbol': 'ASELS', 'price': 145.80, 'change': 3.21}
        ]
        
        assets = []
        for item in stocks:
            assets.append({
                'id': f"stock_{item['symbol'].lower()}",
                'name': item['name'],
                'symbol': item['symbol'],
                'category': 'stock',
                'current_price': item['price'],
                'change_percent': item['change'],
                'currency': 'TRY',
                'is_trending': abs(item['change']) > 2
            })
        
        return assets
    
    async def _get_crypto_assets(self) -> List[Dict[str, Any]]:
        """Kripto paralar - CoinGecko API"""
        try:
            # CoinGecko API kullanılabilir (ücretsiz)
            url = "https://api.coingecko.com/api/v3/simple/price"
            params = {
                'ids': 'bitcoin,ethereum,ripple,cardano,solana',
                'vs_currencies': 'usd,try',
                'include_24hr_change': 'true'
            }
            
            response = requests.get(url, params=params, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                crypto_names = {
                    'bitcoin': 'Bitcoin',
                    'ethereum': 'Ethereum',
                    'ripple': 'Ripple',
                    'cardano': 'Cardano',
                    'solana': 'Solana'
                }
                
                crypto_symbols = {
                    'bitcoin': 'BTC',
                    'ethereum': 'ETH',
                    'ripple': 'XRP',
                    'cardano': 'ADA',
                    'solana': 'SOL'
                }
                
                assets = []
                for coin_id, coin_data in data.items():
                    try_price = coin_data.get('try', 0)
                    change = coin_data.get('try_24h_change', 0)
                    
                    assets.append({
                        'id': f"crypto_{coin_id}",
                        'name': crypto_names.get(coin_id, coin_id.title()),
                        'symbol': crypto_symbols.get(coin_id, coin_id.upper()),
                        'category': 'crypto',
                        'current_price': round(try_price, 2),
                        'change_percent': round(change, 2),
                        'currency': 'TRY',
                        'is_trending': abs(change) > 5
                    })
                
                return assets
            
            # Fallback: Mock data
            return self._get_mock_crypto_assets()
            
        except Exception as e:
            print(f"Crypto assets error: {e}")
            return self._get_mock_crypto_assets()
    
    def _get_mock_crypto_assets(self) -> List[Dict[str, Any]]:
        """Kripto mock data"""
        cryptos = [
            {'name': 'Bitcoin', 'symbol': 'BTC', 'price': 3258740.50, 'change': 4.23},
            {'name': 'Ethereum', 'symbol': 'ETH', 'price': 121456.30, 'change': 2.87},
            {'name': 'Ripple', 'symbol': 'XRP', 'price': 9.45, 'change': -1.34},
            {'name': 'Cardano', 'symbol': 'ADA', 'price': 3.78, 'change': 1.95},
            {'name': 'Solana', 'symbol': 'SOL', 'price': 4823.60, 'change': 6.42}
        ]
        
        assets = []
        for item in cryptos:
            assets.append({
                'id': f"crypto_{item['symbol'].lower()}",
                'name': item['name'],
                'symbol': item['symbol'],
                'category': 'crypto',
                'current_price': item['price'],
                'change_percent': item['change'],
                'currency': 'TRY',
                'is_trending': abs(item['change']) > 5
            })
        
        return assets
    
    async def get_asset_detail(self, asset_id: str) -> Dict[str, Any]:
        """Varlık detayı + tarihsel fiyatlar"""
        try:
            # Asset'i bul
            all_assets = await self.get_all_assets()
            asset = None
            
            for category, assets in all_assets['assets'].items():
                for a in assets:
                    if a['id'] == asset_id:
                        asset = a
                        break
                if asset:
                    break
            
            if not asset:
                return {'success': False, 'error': 'Asset not found'}
            
            # Tarihsel fiyat verisi oluştur (7 gün, 30 gün, 90 gün)
            current_price = asset['current_price']
            history = self._generate_price_history(current_price, days=90)
            
            return {
                'success': True,
                'asset': asset,
                'price_history': {
                    '7d': history[-7:],
                    '30d': history[-30:],
                    '90d': history
                }
            }
            
        except Exception as e:
            print(f"Asset detail error: {e}")
            return {'success': False, 'error': str(e)}
    
    def _generate_price_history(self, current_price: float, days: int = 90) -> List[Dict[str, Any]]:
        """Tarihsel fiyat verisi oluştur (simülasyon)"""
        history = []
        price = current_price * 0.85  # 90 gün önceki fiyat %15 daha düşük
        
        for i in range(days):
            # Rastgele günlük değişim (-2% ile +3% arası)
            daily_change = random.uniform(-0.02, 0.03)
            price = price * (1 + daily_change)
            
            date = datetime.now() - timedelta(days=days - i)
            
            history.append({
                'date': date.strftime('%Y-%m-%d'),
                'price': round(price, 2),
                'change_percent': round(daily_change * 100, 2)
            })
        
        return history
    
    async def get_ai_recommendation(self, asset_id: str) -> Dict[str, Any]:
        """AI ile yatırım önerisi (Al/Sat/Bekle)"""
        try:
            # Asset detayını al
            asset_detail = await self.get_asset_detail(asset_id)
            if not asset_detail['success']:
                return asset_detail
            
            asset = asset_detail['asset']
            history = asset_detail['price_history']['30d']
            
            # AI önerisi için veri hazırla
            analysis_data = {
                'asset_name': asset['name'],
                'symbol': asset['symbol'],
                'category': asset['category'],
                'current_price': asset['current_price'],
                'change_percent': asset['change_percent'],
                'price_trend': self._analyze_trend(history)
            }
            
            # Gemini veya OpenAI ile analiz
            api_key = self.openai_api_key or self.gemini_api_key
            provider = "openai" if self.openai_api_key else "gemini"
            model = "gpt-4o-mini" if provider == "openai" else "gemini-2.0-flash"
            
            if not api_key:
                # Fallback: Basit algoritma
                return self._get_algorithmic_recommendation(analysis_data, history)
            
            chat = LlmChat(
                api_key=api_key,
                session_id=f"investment-{asset_id}-{datetime.now().timestamp()}",
                system_message="""Sen bir finansal yatırım danışmanısın. Yatırım varlıkları için AL/SAT/BEKLE önerisi ver.
                
                Yanıt formatı (JSON):
                {
                    "recommendation": "BUY/SELL/HOLD",
                    "confidence": 0.85,
                    "reason": "Kısa açıklama (1-2 cümle)",
                    "detailed_analysis": "Detaylı analiz (3-4 cümle)",
                    "risk_level": "low/medium/high",
                    "target_price": 123.45,
                    "stop_loss": 100.00
                }
                
                Sadece JSON döndür, başka metin ekleme."""
            ).with_model(provider, model)
            
            prompt = f"""
            Yatırım Varlığı: {asset['name']} ({asset['symbol']})
            Kategori: {asset['category']}
            Mevcut Fiyat: {asset['current_price']} TRY
            24 Saatlik Değişim: %{asset['change_percent']}
            30 Günlük Trend: {analysis_data['price_trend']['trend']}
            Volatilite: {analysis_data['price_trend']['volatility']}
            
            Bu varlık için AL/SAT/BEKLE önerisi ver. JSON formatında döndür.
            """
            
            response = await chat.send_message(UserMessage(text=prompt))
            
            # JSON parse
            import json
            response_text = response.strip()
            if response_text.startswith('```'):
                lines = response_text.split('\n')
                response_text = '\n'.join(lines[1:-1])
                if response_text.startswith('json'):
                    response_text = response_text[4:].strip()
            
            ai_result = json.loads(response_text)
            
            # Türkçe çeviri
            recommendation_map = {
                'BUY': 'AL',
                'SELL': 'SAT',
                'HOLD': 'BEKLE'
            }
            
            ai_result['recommendation'] = recommendation_map.get(
                ai_result['recommendation'].upper(), 
                ai_result['recommendation']
            )
            
            return {
                'success': True,
                'recommendation': ai_result,
                'provider': provider
            }
            
        except Exception as e:
            print(f"AI recommendation error: {e}")
            # Fallback: Algoritmic recommendation
            asset_detail = await self.get_asset_detail(asset_id)
            if asset_detail['success']:
                asset = asset_detail['asset']
                history = asset_detail['price_history']['30d']
                analysis_data = {
                    'asset_name': asset['name'],
                    'change_percent': asset['change_percent'],
                    'price_trend': self._analyze_trend(history)
                }
                return self._get_algorithmic_recommendation(analysis_data, history)
            
            return {'success': False, 'error': str(e)}
    
    def _analyze_trend(self, price_history: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Fiyat trendini analiz et"""
        if not price_history or len(price_history) < 2:
            return {
                'trend': 'neutral',
                'volatility': 'low',
                'avg_price': 0
            }
        
        prices = [p['price'] for p in price_history]
        avg_price = sum(prices) / len(prices)
        
        # Trend hesapla (ilk ve son fiyat karşılaştırması)
        first_price = prices[0]
        last_price = prices[-1]
        trend_change = ((last_price - first_price) / first_price) * 100
        
        if trend_change > 5:
            trend = 'uptrend'
        elif trend_change < -5:
            trend = 'downtrend'
        else:
            trend = 'neutral'
        
        # Volatilite hesapla (standart sapma)
        variance = sum((p - avg_price) ** 2 for p in prices) / len(prices)
        std_dev = variance ** 0.5
        volatility_percent = (std_dev / avg_price) * 100
        
        if volatility_percent > 10:
            volatility = 'high'
        elif volatility_percent > 5:
            volatility = 'medium'
        else:
            volatility = 'low'
        
        return {
            'trend': trend,
            'trend_change_percent': round(trend_change, 2),
            'volatility': volatility,
            'volatility_percent': round(volatility_percent, 2),
            'avg_price': round(avg_price, 2)
        }
    
    def _get_algorithmic_recommendation(
        self, 
        analysis_data: Dict[str, Any], 
        price_history: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Basit algoritma ile öneri (AI yoksa fallback)"""
        
        change = analysis_data['change_percent']
        trend = analysis_data['price_trend']['trend']
        volatility = analysis_data['price_trend']['volatility']
        
        # Basit karar ağacı
        if trend == 'uptrend' and change > 2:
            recommendation = 'AL'
            reason = f"Yükseliş trendinde ve günlük değişim pozitif (%{change:.2f})"
            confidence = 0.75
            risk = 'medium'
        elif trend == 'downtrend' and change < -2:
            recommendation = 'SAT'
            reason = f"Düşüş trendinde ve günlük değişim negatif (%{change:.2f})"
            confidence = 0.70
            risk = 'high'
        else:
            recommendation = 'BEKLE'
            reason = "Piyasa kararsız, net bir trend yok"
            confidence = 0.60
            risk = 'medium'
        
        current_price = price_history[-1]['price']
        target_price = current_price * 1.10 if recommendation == 'AL' else current_price * 0.90
        stop_loss = current_price * 0.95 if recommendation == 'AL' else current_price * 1.05
        
        return {
            'success': True,
            'recommendation': {
                'recommendation': recommendation,
                'confidence': confidence,
                'reason': reason,
                'detailed_analysis': f"{analysis_data['asset_name']} için teknik analiz: "
                                   f"Trend: {trend}, Volatilite: {volatility}. "
                                   f"{reason}",
                'risk_level': risk,
                'target_price': round(target_price, 2),
                'stop_loss': round(stop_loss, 2)
            },
            'provider': 'algorithmic'
        }


# Global instance
investment_service = InvestmentService()
