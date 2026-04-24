import os
import base64
import asyncio
import requests
from typing import Dict, Any, Optional
from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

load_dotenv()

GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
COLLECTAPI_KEY = os.getenv('COLLECTAPI_KEY')

class VisionService:
    """Garanti Vision Lens - AI Görsel Tanıma ve Finansal Öneri Servisi"""
    
    def __init__(self):
        self.gemini_api_key = GEMINI_API_KEY
        self.openai_api_key = OPENAI_API_KEY
        self.collectapi_key = COLLECTAPI_KEY
        self.use_openai = bool(self.openai_api_key)  # OpenAI varsa onu kullan
        
    async def analyze_image(self, image_base64: str) -> Dict[str, Any]:
        """
        Görsel analizi yapar - nesne tanıma, kategori belirleme
        FALLBACK STACK:
        1. OpenAI Vision (gpt-4o) - en güçlü
        2. Gemini Vision - alternatif
        3. Basic Image Analysis - basit analiz
        4. Her durumda bir sonuç döndür!
        """
        result = None
        providers_tried = []
        
        # ÖNCE: OpenAI Vision dene (varsa ve öncelikliyse)
        if self.use_openai:
            try:
                print("Trying OpenAI Vision...")
                result = await self._analyze_with_openai(image_base64)
                if result and result.get('success'):
                    print("✅ OpenAI Vision başarılı")
                    return result
            except Exception as e:
                print(f"❌ OpenAI Vision hatası: {e}")
                providers_tried.append("openai")
        
        # SONRA: Gemini Vision dene
        try:
            print("Trying Gemini Vision...")
            result = await self._analyze_with_gemini(image_base64)
            if result and result.get('success'):
                print("✅ Gemini Vision başarılı")
                return result
        except Exception as e:
            print(f"❌ Gemini Vision hatası: {e}")
            providers_tried.append("gemini")
        
        # HER İKİSİ DE BAŞARISIZ OLDU: Basic analysis yap
        print("⚠️ Tüm AI modelleri başarısız, basic analysis yapılıyor...")
        return await self._basic_image_analysis(image_base64, providers_tried)
    
    async def _analyze_with_openai(self, image_base64: str) -> Dict[str, Any]:
        """OpenAI GPT-4 Vision ile görsel analizi"""
        try:
            chat = LlmChat(
                api_key=self.openai_api_key,
                session_id=f"vision-openai-{asyncio.get_event_loop().time()}",
                system_message="""Sen bir Görsel Tanıma Uzmanısın. Görseldeki nesneleri analiz edip şu formatta JSON döndür:
                {
                    "object_name": "Nesnenin adı (Türkçe)",
                    "category": "electronics/vehicle/jewelry/clothing/food/home/other",
                    "description": "Detaylı açıklama (marka, model, özellikler)",
                    "estimated_price_range": "Tahmini fiyat aralığı (TL)",
                    "confidence": 0.95,
                    "keywords": ["anahtar", "kelimeler"]
                }
                
                Kategoriler:
                - electronics: Elektronik ürünler (telefon, bilgisayar, tv, kamera vb.)
                - vehicle: Araçlar (araba, motor, bisiklet vb.)
                - jewelry: Mücevher, altın, gümüş
                - clothing: Giyim, ayakkabı, aksesuar
                - food: Yiyecek, içecek
                - home: Ev eşyası, mobilya
                - other: Diğer
                
                Sadece JSON döndür, başka açıklama ekleme."""
            ).with_model("openai", "gpt-4o")
            
            image_content = ImageContent(image_base64=image_base64)
            
            user_message = UserMessage(
                text="Bu görselde ne var? Yukarıdaki JSON formatında analiz et.",
                file_contents=[image_content]
            )
            
            response = await chat.send_message(user_message)
            
            # JSON parse et
            import json
            response_text = response.strip()
            if response_text.startswith('```'):
                lines = response_text.split('\n')
                response_text = '\n'.join(lines[1:-1])
                if response_text.startswith('json'):
                    response_text = response_text[4:].strip()
            
            result = json.loads(response_text)
            return {
                "success": True,
                "data": result,
                "provider": "openai"
            }
            
        except Exception as e:
            print(f"OpenAI Vision hatası: {e}")
            raise
    
    async def _analyze_with_gemini(self, image_base64: str) -> Dict[str, Any]:
        """Gemini Vision ile görsel analizi"""
        try:
            chat = LlmChat(
                api_key=self.gemini_api_key,
                session_id=f"vision-gemini-{asyncio.get_event_loop().time()}",
                system_message="""Sen bir Görsel Tanıma Uzmanısın. Görseldeki nesneleri analiz edip şu formatta JSON döndür:
                {
                    "object_name": "Nesnenin adı (Türkçe)",
                    "category": "electronics/vehicle/jewelry/clothing/food/home/other",
                    "description": "Detaylı açıklama (marka, model, özellikler)",
                    "estimated_price_range": "Tahmini fiyat aralığı (TL)",
                    "confidence": 0.95,
                    "keywords": ["anahtar", "kelimeler"]
                }
                
                Kategoriler:
                - electronics: Elektronik ürünler (telefon, bilgisayar, tv, kamera vb.)
                - vehicle: Araçlar (araba, motor, bisiklet vb.)
                - jewelry: Mücevher, altın, gümüş
                - clothing: Giyim, ayakkabı, aksesuar
                - food: Yiyecek, içecek
                - home: Ev eşyası, mobilya
                - other: Diğer
                
                Sadece JSON döndür, başka açıklama ekleme."""
            ).with_model("gemini", "gemini-2.0-flash")
            
            image_content = ImageContent(image_base64=image_base64)
            
            user_message = UserMessage(
                text="Bu görselde ne var? Yukarıdaki JSON formatında analiz et.",
                file_contents=[image_content]
            )
            
            response = await chat.send_message(user_message)
            
            # JSON parse et
            import json
            response_text = response.strip()
            if response_text.startswith('```'):
                lines = response_text.split('\n')
                response_text = '\n'.join(lines[1:-1])
                if response_text.startswith('json'):
                    response_text = response_text[4:].strip()
            
            result = json.loads(response_text)
            return {
                "success": True,
                "data": result,
                "provider": "gemini"
            }
            
        except Exception as e:
            print(f"Gemini Vision hatası: {e}")
            raise
    
    def _get_mock_analysis(self) -> Dict[str, Any]:
        """Rate limit durumunda örnek veri döndür"""
        import random
        
        mock_objects = [
            {
                "object_name": "iPhone 15 Pro",
                "category": "electronics",
                "description": "Apple iPhone 15 Pro, 256GB, Titanium Blue renk, A17 Pro işlemci",
                "estimated_price_range": "45,000 - 55,000 TL",
                "confidence": 0.92,
                "keywords": ["telefon", "iphone", "apple", "akıllı telefon"]
            },
            {
                "object_name": "MacBook Pro M3",
                "category": "electronics",
                "description": "Apple MacBook Pro 14-inch, M3 çip, 16GB RAM, 512GB SSD",
                "estimated_price_range": "65,000 - 75,000 TL",
                "confidence": 0.95,
                "keywords": ["laptop", "macbook", "apple", "bilgisayar"]
            },
            {
                "object_name": "Altın Kolye",
                "category": "jewelry",
                "description": "22 ayar altın kolye, 10 gram, el işçiliği",
                "estimated_price_range": "12,000 - 15,000 TL",
                "confidence": 0.88,
                "keywords": ["altın", "kolye", "mücevher", "takı"]
            }
        ]
        
        selected = random.choice(mock_objects)
        
        return {
            "success": True,
            "data": selected,
            "is_mock": True  # Mock data olduğunu belirt
        }
    
    async def _basic_image_analysis(self, image_base64: str, failed_providers: list) -> Dict[str, Any]:
        """
        Basit görüntü analizi - AI modelleri başarısız olduğunda
        Görüntünün temel özelliklerini analiz eder ve MUTLAKA bir tahmin yapar
        """
        try:
            from PIL import Image
            import io
            
            # Base64'ü decode et
            image_data = base64.b64decode(image_base64)
            image = Image.open(io.BytesIO(image_data))
            
            # Görüntü özelliklerini al
            width, height = image.size
            mode = image.mode
            
            # Dominant renkleri analiz et
            image_rgb = image.convert('RGB')
            pixels = list(image_rgb.getdata())
            
            # Basit renk analizi
            avg_r = sum(p[0] for p in pixels[:1000]) / min(1000, len(pixels))
            avg_g = sum(p[1] for p in pixels[:1000]) / min(1000, len(pixels))
            avg_b = sum(p[2] for p in pixels[:1000]) / min(1000, len(pixels))
            
            # Renk tonuna göre kategori tahmini
            if avg_r > 150 and avg_g < 100 and avg_b < 100:
                color_hint = "kırmızı/pembe tonlu"
                possible_categories = ["clothing", "electronics", "home"]
            elif avg_g > 150 and avg_r < 100 and avg_b < 100:
                color_hint = "yeşil tonlu"
                possible_categories = ["food", "home", "other"]
            elif avg_b > 150 and avg_r < 100 and avg_g < 100:
                color_hint = "mavi tonlu"
                possible_categories = ["electronics", "clothing", "vehicle"]
            elif avg_r > 200 and avg_g > 180:
                color_hint = "sarı/altın tonlu"
                possible_categories = ["jewelry", "electronics", "home"]
            elif avg_r < 100 and avg_g < 100 and avg_b < 100:
                color_hint = "koyu/siyah tonlu"
                possible_categories = ["electronics", "vehicle", "clothing"]
            else:
                color_hint = "çok renkli veya nötr"
                possible_categories = ["electronics", "home", "other"]
            
            # Boyut oranına göre tahmin
            aspect_ratio = width / height if height > 0 else 1
            
            if 0.9 < aspect_ratio < 1.1:
                shape_hint = "kare/kompakt nesne"
            elif aspect_ratio > 1.5:
                shape_hint = "geniş/yatay nesne"
            elif aspect_ratio < 0.6:
                shape_hint = "uzun/dikey nesne"
            else:
                shape_hint = "standart oran"
            
            # Son LLM denemesi - daha basit bir prompt ile
            try:
                print("Son deneme: Basit prompt ile OpenAI...")
                result = await self._simple_vision_analysis(image_base64)
                if result and result.get('success'):
                    return result
            except Exception as e:
                print(f"Basit vision analizi de başarısız: {e}")
            
            # HER DURUMDA bir tahmin yap
            category = possible_categories[0]
            
            # Kategori bazlı akıllı tahmin
            if category == "electronics":
                object_name = "Elektronik Cihaz"
                description = f"Bu bir elektronik cihaz gibi görünüyor. {color_hint}, {shape_hint}. Telefon, tablet, bilgisayar veya elektronik aksesuar olabilir."
                price_range = "1,000 - 50,000 TL"
                keywords = ["elektronik", "cihaz", "teknoloji"]
            elif category == "jewelry":
                object_name = "Değerli Eşya"
                description = f"Bu altın, gümüş veya mücevher gibi görünüyor. {color_hint}. Kolye, yüzük, bilezik veya başka bir takı olabilir."
                price_range = "5,000 - 20,000 TL"
                keywords = ["takı", "altın", "mücevher", "değerli"]
            elif category == "vehicle":
                object_name = "Araç"
                description = f"Bu bir araç veya araç parçası gibi görünüyor. {color_hint}, {shape_hint}."
                price_range = "100,000 - 1,000,000 TL"
                keywords = ["araç", "otomobil", "taşıt"]
            elif category == "clothing":
                object_name = "Giyim Ürünü"
                description = f"Bu bir giyim veya aksesuar ürünü gibi görünüyor. {color_hint}. Giysi, ayakkabı veya çanta olabilir."
                price_range = "500 - 5,000 TL"
                keywords = ["giyim", "kıyafet", "aksesuar"]
            elif category == "food":
                object_name = "Yiyecek/İçecek"
                description = f"Bu bir gıda ürünü gibi görünüyor. {color_hint}."
                price_range = "50 - 500 TL"
                keywords = ["yiyecek", "içecek", "gıda"]
            elif category == "home":
                object_name = "Ev Eşyası"
                description = f"Bu bir ev eşyası veya mobilya gibi görünüyor. {color_hint}, {shape_hint}."
                price_range = "500 - 10,000 TL"
                keywords = ["ev", "eşya", "mobilya"]
            else:
                object_name = "Bir Nesne"
                description = f"Görüntü analiz edildi. {color_hint}, {shape_hint}. Daha net bir görüntü veya farklı açı ile tekrar deneyebilirsiniz."
                price_range = "100 - 10,000 TL"
                keywords = ["nesne", "ürün"]
            
            return {
                "success": True,
                "data": {
                    "object_name": object_name,
                    "category": category,
                    "description": description,
                    "estimated_price_range": price_range,
                    "confidence": 0.45,  # Düşük güven seviyesi
                    "keywords": keywords,
                    "analysis_method": "basic_image_analysis",
                    "note": f"AI modelleri kullanılamadı ({', '.join(failed_providers)}), temel görüntü analizi yapıldı."
                },
                "is_fallback": True
            }
            
        except Exception as e:
            print(f"Basic image analysis hatası: {e}")
            # EN SON ÇARE: Genel tahmin
            return {
                "success": True,
                "data": {
                    "object_name": "Tanımlanamayan Nesne",
                    "category": "other",
                    "description": "Görüntü analiz edilemedi, ancak bu bir ürün veya nesne gibi görünüyor. Daha net bir fotoğraf ile tekrar deneyebilirsiniz.",
                    "estimated_price_range": "Belirlenemedi",
                    "confidence": 0.2,
                    "keywords": ["nesne", "ürün", "tanımlanamadı"],
                    "analysis_method": "emergency_fallback"
                },
                "is_fallback": True
            }
    
    async def _simple_vision_analysis(self, image_base64: str) -> Dict[str, Any]:
        """
        Çok basit prompt ile son bir deneme - daha yüksek başarı şansı
        """
        try:
            chat = LlmChat(
                api_key=self.openai_api_key,
                session_id=f"simple-vision-{asyncio.get_event_loop().time()}",
                system_message="""Sen bir nesne tanıma uzmanısın. Görsele bak ve ÇOK KISA bir şekilde ne olduğunu söyle.
                JSON formatında döndür:
                {
                    "object_name": "Nesne adı",
                    "category": "electronics/vehicle/jewelry/clothing/food/home/other",
                    "description": "Kısa açıklama",
                    "confidence": 0.8
                }"""
            ).with_model("openai", "gpt-4o-mini")  # Daha hızlı ve ucuz model
            
            image_content = ImageContent(image_base64=image_base64)
            user_message = UserMessage(
                text="Bu ne? JSON formatında kısa yanıt ver.",
                file_contents=[image_content]
            )
            
            response = await chat.send_message(user_message)
            
            import json
            response_text = response.strip()
            if response_text.startswith('```'):
                lines = response_text.split('\n')
                response_text = '\n'.join(lines[1:-1])
                if response_text.startswith('json'):
                    response_text = response_text[4:].strip()
            
            result = json.loads(response_text)
            
            # Eksik alanları tamamla
            if 'estimated_price_range' not in result:
                result['estimated_price_range'] = "Belirlenemedi"
            if 'keywords' not in result:
                result['keywords'] = [result.get('object_name', 'nesne').lower()]
            
            return {
                "success": True,
                "data": result,
                "provider": "openai-simple"
            }
            
        except Exception as e:
            print(f"Simple vision analysis hatası: {e}")
            raise
    
    
    async def get_market_price(self, category: str, keywords: list, object_name: str) -> Dict[str, Any]:
        """
        Piyasa fiyatını bulur - CollectAPI ve e-ticaret verileri
        """
        try:
            price_data = {
                "source": "market_data",
                "prices": []
            }
            
            # Kategori bazlı fiyat bulma
            if category == "jewelry":
                # Altın/Gümüş fiyatı
                gold_data = await self._get_gold_prices()
                if gold_data:
                    price_data["prices"].append(gold_data)
            
            elif category == "vehicle":
                # Araç fiyatları (Örnek veri - gerçek API entegrasyonu yapılabilir)
                price_data["prices"].append({
                    "source": "sahibinden",
                    "price": 850000,
                    "currency": "TRY",
                    "description": "2. El Araç Ortalama Fiyat"
                })
            
            elif category == "electronics":
                # Elektronik ürün fiyatları (Mock data - gerçek e-ticaret API'si eklenebilir)
                if "macbook" in object_name.lower() or "laptop" in object_name.lower():
                    price_data["prices"].append({
                        "source": "e-commerce",
                        "price": 45000,
                        "currency": "TRY",
                        "description": "Ortalama Laptop Fiyatı"
                    })
                elif "iphone" in object_name.lower() or "telefon" in object_name.lower():
                    price_data["prices"].append({
                        "source": "e-commerce",
                        "price": 35000,
                        "currency": "TRY",
                        "description": "Ortalama Akıllı Telefon Fiyatı"
                    })
                else:
                    price_data["prices"].append({
                        "source": "e-commerce",
                        "price": 15000,
                        "currency": "TRY",
                        "description": "Ortalama Elektronik Ürün Fiyatı"
                    })
            
            else:
                # Genel ürün fiyatı (Mock)
                price_data["prices"].append({
                    "source": "general",
                    "price": 5000,
                    "currency": "TRY",
                    "description": "Tahmini Piyasa Fiyatı"
                })
            
            return {
                "success": True,
                "data": price_data
            }
            
        except Exception as e:
            print(f"Fiyat bulma hatası: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def _get_gold_prices(self) -> Optional[Dict[str, Any]]:
        """CollectAPI'den altın fiyatlarını çeker"""
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
                    # Gram altın fiyatı
                    gold_data = data.get("result", [])
                    if gold_data:
                        gram_gold = next((item for item in gold_data if "Gram" in item.get("name", "")), None)
                        if gram_gold:
                            return {
                                "source": "collectapi",
                                "price": float(gram_gold.get("buying", 0)),
                                "currency": "TRY",
                                "description": "Gram Altın Fiyatı",
                                "unit": "gram"
                            }
            
            return None
            
        except Exception as e:
            print(f"Altın fiyatı alma hatası: {e}")
            return None
    
    async def generate_financial_advice(
        self, 
        user_id: str,
        object_data: Dict[str, Any],
        price_data: Dict[str, Any],
        user_balance: float = 0,
        user_credit_score: int = 750
    ) -> Dict[str, Any]:
        """
        Finansal öneri oluşturur - kredi, taksit, yatırım önerileri
        """
        try:
            category = object_data.get("category", "other")
            object_name = object_data.get("object_name", "Ürün")
            
            # Ortalama fiyatı hesapla
            prices = price_data.get("data", {}).get("prices", [])
            if not prices:
                avg_price = 10000
            else:
                avg_price = sum([p.get("price", 0) for p in prices]) / len(prices)
            
            recommendations = []
            
            # Kredi/Taksit Önerileri
            if avg_price > 5000:
                # İhtiyaç Kredisi
                if category in ["vehicle", "electronics", "home"]:
                    loan_recommendation = self._calculate_loan_offer(
                        amount=avg_price,
                        category=category,
                        credit_score=user_credit_score
                    )
                    recommendations.append(loan_recommendation)
                
                # Taksit Önerisi
                installment_recommendation = self._calculate_installment_offer(
                    amount=avg_price,
                    category=category
                )
                recommendations.append(installment_recommendation)
            
            # Yatırım Önerileri
            if category == "jewelry":
                investment_recommendation = await self._get_investment_advice("gold")
                if investment_recommendation:
                    recommendations.append(investment_recommendation)
            
            # Genel Yatırım Tavsiyeleri
            if avg_price > 50000:
                general_investment = await self._get_investment_advice("general")
                if general_investment:
                    recommendations.append(general_investment)
            
            return {
                "success": True,
                "data": {
                    "object_name": object_name,
                    "category": category,
                    "average_price": avg_price,
                    "recommendations": recommendations,
                    "user_balance": user_balance,
                    "can_afford": user_balance >= avg_price
                }
            }
            
        except Exception as e:
            print(f"Finansal öneri hatası: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def _calculate_loan_offer(self, amount: float, category: str, credit_score: int) -> Dict[str, Any]:
        """Kredi teklifi hesaplar"""
        # Kategori bazlı faiz oranları
        interest_rates = {
            "vehicle": 3.50,
            "electronics": 3.99,
            "home": 3.75,
            "other": 4.25
        }
        
        interest_rate = interest_rates.get(category, 4.25)
        
        # Kredi notu düşükse faiz artır
        if credit_score < 700:
            interest_rate += 0.5
        
        # 36 ay vade ile hesaplama
        months = 36
        monthly_interest = interest_rate / 100 / 12
        
        # Aylık taksit hesaplama (eşit taksit formülü)
        if monthly_interest > 0:
            monthly_payment = amount * (monthly_interest * (1 + monthly_interest) ** months) / ((1 + monthly_interest) ** months - 1)
        else:
            monthly_payment = amount / months
        
        return {
            "type": "loan",
            "title": "İhtiyaç Kredisi",
            "icon": "💰",
            "description": f"{amount:,.0f} TL kredi ile hemen sahip olun",
            "details": {
                "amount": amount,
                "interest_rate": interest_rate,
                "months": months,
                "monthly_payment": round(monthly_payment, 2),
                "total_payment": round(monthly_payment * months, 2)
            },
            "cta": "Kredi Başvurusu Yap",
            "priority": 1
        }
    
    def _calculate_installment_offer(self, amount: float, category: str) -> Dict[str, Any]:
        """Taksit teklifi hesaplar"""
        # Bonus Kart ile taksit
        installments = [3, 6, 9, 12]
        
        return {
            "type": "installment",
            "title": "Bonus Kart ile Taksit",
            "icon": "💳",
            "description": "Peşin fiyatına taksit fırsatı",
            "details": {
                "amount": amount,
                "installment_options": [
                    {
                        "months": month,
                        "monthly_payment": round(amount / month, 2),
                        "total_payment": amount,
                        "interest_rate": 0
                    }
                    for month in installments
                ]
            },
            "cta": "Hemen Al",
            "priority": 2
        }
    
    async def _get_investment_advice(self, investment_type: str) -> Optional[Dict[str, Any]]:
        """Yatırım tavsiyesi verir"""
        try:
            if investment_type == "gold":
                # Altın fiyatı al
                gold_data = await self._get_gold_prices()
                if gold_data:
                    return {
                        "type": "investment",
                        "title": "Altın Yatırımı",
                        "icon": "🪙",
                        "description": "Altına yatırım yaparak değer kazanın",
                        "details": {
                            "current_price": gold_data.get("price"),
                            "currency": "TRY",
                            "unit": "gram",
                            "recommendation": "Altın fiyatları yükselişte. Fiziki altın veya altın hesabı açabilirsiniz."
                        },
                        "cta": "Altın Hesabı Aç",
                        "priority": 3
                    }
            
            elif investment_type == "general":
                # Genel yatırım tavsiyeleri
                return {
                    "type": "investment",
                    "title": "Yatırım Fonu",
                    "icon": "📈",
                    "description": "Profesyonel portföy yönetimiyle kazancınızı artırın",
                    "details": {
                        "min_amount": 10000,
                        "expected_return": "Yıllık %15-25 getiri potansiyeli",
                        "risk_level": "Orta",
                        "recommendation": "Çeşitlendirilmiş portföy ile riskinizi azaltın."
                    },
                    "cta": "Yatırım Fonu İncele",
                    "priority": 4
                }
            
            return None
            
        except Exception as e:
            print(f"Yatırım tavsiyesi hatası: {e}")
            return None
