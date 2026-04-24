"""
🛒 Enhanced Product Scraper - Optimized for Speed
Gerçek e-ticaret sitelerinden hızlı fiyat çekme
"""

import requests
from bs4 import BeautifulSoup
import re
from typing import Dict, List, Optional
from datetime import datetime
import urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed
import asyncio
import json
import os
import random

class EnhancedProductScraper:
    """Optimized price scraper with fast fallback"""
    
    def __init__(self):
        self.scraper_api_key = os.environ.get('SCRAPERAPI_KEY', 'ebe96bb9d771f5b405b840d498c6d3ce')
        self.timeout = 25
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'tr-TR,tr;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
        
        # Çıkarılacak renk ve gereksiz kelimeler
        self.colors_to_remove = [
            # Türkçe renkler
            'siyah', 'beyaz', 'kırmızı', 'mavi', 'yeşil', 'sarı', 'turuncu', 'mor', 
            'pembe', 'gri', 'kahverengi', 'lacivert', 'bordo', 'bej', 'krem',
            'altın', 'gümüş', 'bronz', 'bakır', 'titan', 'titanyum',
            # İngilizce renkler
            'black', 'white', 'red', 'blue', 'green', 'yellow', 'orange', 'purple',
            'pink', 'gray', 'grey', 'brown', 'navy', 'gold', 'silver', 'bronze',
            'copper', 'titanium', 'titan', 'graphite', 'midnight', 'starlight',
            'space gray', 'space grey', 'rose gold', 'pacific blue', 'sierra blue',
            'alpine green', 'deep purple', 'natural titanium', 'desert titanium',
            'blue titanium', 'black titanium', 'white titanium',
            # Genel kelimeler
            'colour', 'color', 'renk', 'renkli', 'colored', 'coloured'
        ]
        
        print(f"🛒 Enhanced Product Scraper initialized (Optimized)")
    
    def _clean_product_name(self, product_name: str) -> str:
        """Ürün adından renk ve gereksiz kelimeleri çıkar"""
        cleaned = product_name.lower()
        
        # Önce çok kelimeli renk ifadelerini çıkar
        multi_word_colors = [
            'space gray', 'space grey', 'rose gold', 'pacific blue', 'sierra blue',
            'alpine green', 'deep purple', 'natural titanium', 'desert titanium',
            'blue titanium', 'black titanium', 'white titanium'
        ]
        for color in multi_word_colors:
            cleaned = cleaned.replace(color, ' ')
        
        # Tek kelimeli renkleri çıkar
        words = cleaned.split()
        filtered_words = []
        for word in words:
            # Kelime bir renk mi kontrol et
            is_color = False
            for color in self.colors_to_remove:
                if word == color or word.rstrip('s') == color:  # "blacks" gibi çoğullar için
                    is_color = True
                    break
            if not is_color:
                filtered_words.append(word)
        
        cleaned = ' '.join(filtered_words)
        
        # Fazla boşlukları temizle
        cleaned = re.sub(r'\s+', ' ', cleaned).strip()
        
        print(f"   🔄 Temizlenmiş ürün adı: '{product_name}' → '{cleaned}'")
        return cleaned
    
    def _is_product_available_in_market(self, product_name: str) -> bool:
        """Ürünün piyasada mevcut olup olmadığını kontrol et"""
        name_lower = product_name.lower()
        
        # iPhone kontrolü - 2025 Temmuz itibariyle iPhone 16 en yeni model
        if 'iphone' in name_lower:
            version_match = re.search(r'iphone\s*(\d+)', name_lower)
            if version_match:
                version = int(version_match.group(1))
                if version >= 17:
                    print(f"   ⚠️ iPhone {version} henüz piyasada yok - tahmini fiyat kullanılacak")
                    return False
                if version <= 5:
                    print(f"   ⚠️ iPhone {version} artık satılmıyor - tahmini fiyat kullanılacak")
                    return False
        
        # Samsung Galaxy kontrolü
        if 'samsung' in name_lower and 'galaxy' in name_lower:
            version_match = re.search(r's(\d+)', name_lower)
            if version_match:
                version = int(version_match.group(1))
                if version >= 25:
                    print(f"   ⚠️ Samsung Galaxy S{version} henüz piyasada yok")
                    return False
        
        return True
    
    def _get_price_range_for_product(self, product_name: str) -> tuple:
        """Ürün için beklenen fiyat aralığını döndür (min, max)"""
        name_lower = product_name.lower()
        
        # Araç markaları ve fiyat aralıkları
        car_brands = {
            # Ekonomik markalar
            'dacia': (400000, 1200000),
            'fiat': (500000, 1500000),
            'renault': (600000, 2000000),
            'citroen': (700000, 2500000),
            'opel': (700000, 2500000),
            'skoda': (800000, 2500000),
            'seat': (800000, 2500000),
            'hyundai': (700000, 3000000),
            'kia': (800000, 3000000),
            'toyota': (900000, 4000000),
            'honda': (900000, 3500000),
            'nissan': (800000, 3000000),
            'mazda': (1000000, 3500000),
            'suzuki': (600000, 2000000),
            # Orta segment
            'peugeot': (800000, 3500000),
            'ford': (800000, 3500000),
            'volkswagen': (1000000, 4000000),
            'vw': (1000000, 4000000),
            # Premium markalar
            'bmw': (1500000, 8000000),
            'mercedes': (1500000, 10000000),
            'audi': (1500000, 7000000),
            'volvo': (1500000, 5000000),
            'lexus': (2000000, 6000000),
            'jaguar': (2500000, 8000000),
            'land rover': (3000000, 12000000),
            'range rover': (4000000, 15000000),
            'porsche': (4000000, 20000000),
            'tesla': (2000000, 6000000),
            # Süper spor
            'ferrari': (15000000, 50000000),
            'lamborghini': (15000000, 50000000),
        }
        
        # Araç markası kontrolü
        for brand, price_range in car_brands.items():
            if brand in name_lower:
                # Model tipine göre ayarla
                if any(term in name_lower for term in ['3008', '5008', 'suv', 'crossover']):
                    return (price_range[0] * 1.2, price_range[1] * 1.3)  # SUV premium
                return price_range
        
        # iPhone fiyat aralıkları
        if 'iphone' in name_lower:
            version_match = re.search(r'iphone\s*(\d+)', name_lower)
            if version_match:
                version = int(version_match.group(1))
                
                if version >= 17:
                    if 'pro max' in name_lower:
                        return (85000, 120000)
                    elif 'pro' in name_lower:
                        return (75000, 105000)
                    elif 'plus' in name_lower:
                        return (65000, 90000)
                    else:
                        return (55000, 80000)
                
                if 'pro max' in name_lower:
                    if version >= 16:
                        return (65000, 150000)
                    elif version >= 14:
                        return (50000, 110000)
                    elif version >= 12:
                        return (30000, 75000)
                    else:
                        return (12000, 50000)
                elif 'pro' in name_lower:
                    if version >= 16:
                        return (55000, 130000)
                    elif version >= 14:
                        return (40000, 95000)
                    elif version >= 12:
                        return (25000, 65000)
                    else:
                        return (10000, 40000)
                else:
                    if version >= 16:
                        return (45000, 100000)
                    elif version >= 14:
                        return (30000, 75000)
                    elif version >= 12:
                        return (20000, 55000)
                    elif version >= 10:
                        return (12000, 40000)
                    elif version >= 8:
                        return (6000, 25000)
                    else:
                        return (2000, 15000)
        
        return (1000, 500000)
    
    def _get_min_price_for_product(self, product_name: str) -> float:
        """Ürün adına göre minimum geçerli fiyat belirle"""
        price_range = self._get_price_range_for_product(product_name)
        return price_range[0]
    
    def _make_scraper_request(self, url: str, render: bool = False) -> Optional[requests.Response]:
        """Make fast request through ScraperAPI"""
        try:
            scraper_url = f"http://api.scraperapi.com"
            params = {
                'api_key': self.scraper_api_key,
                'url': url,
                'render': 'true' if render else 'false',
                'country_code': 'tr'
            }
            response = requests.get(scraper_url, params=params, timeout=self.timeout)
            return response if response.status_code == 200 else None
        except Exception as e:
            print(f"   ❌ ScraperAPI error: {e}")
            return None
    
    def _make_direct_request(self, url: str) -> Optional[requests.Response]:
        """Try direct request first (faster if not blocked)"""
        try:
            response = requests.get(url, headers=self.headers, timeout=8)
            if response.status_code == 200 and len(response.content) > 10000:
                return response
            return None
        except:
            return None
    
    async def scrape_all_sites(self, product_name: str, category: str = 'electronics', matching_pages: List[str] = None) -> Dict:
        """Optimized price search - fast with fallback"""
        print(f"\n🛒 Price search: {product_name} ({category})")
        
        # Ürün adını temizle (renkleri ve gereksiz kelimeleri çıkar)
        search_name = self._clean_product_name(product_name)
        
        # Kategoriyi otomatik algıla
        detected_category = self._detect_category(search_name)
        if detected_category:
            category = detected_category
            print(f"   🏷️ Algılanan kategori: {category}")
        
        # Önce ürünün piyasada olup olmadığını kontrol et
        if not self._is_product_available_in_market(search_name):
            print(f"   📦 Ürün piyasada mevcut değil - tahmini fiyat hesaplanıyor")
            return self._estimate_price(search_name, category)
        
        min_price = self._get_min_price_for_product(search_name)
        price_range = self._get_price_range_for_product(search_name)
        results = []
        
        # Kategoriye göre uygun siteleri seç
        if category == 'vehicle':
            # Araç kategorisi - sıfır ve ikinci el için farklı arama
            vehicle_condition = self._detect_vehicle_condition(product_name)
            vehicle_year = self._extract_vehicle_year(product_name)
            brand_info = self._extract_vehicle_brand(search_name)
            
            print(f"   🚗 Araç kategorisi - Durum: {vehicle_condition}, Yıl: {vehicle_year or 'Belirtilmemiş'}")
            
            if vehicle_condition == 'new':
                # Sıfır araç - resmi marka sitesinden fiyat
                print(f"   🆕 Sıfır araç - Resmi fiyat listesi aranıyor...")
                with ThreadPoolExecutor(max_workers=2) as executor:
                    futures = {}
                    
                    # Marka sitesinden fiyat çek
                    if brand_info:
                        futures[executor.submit(self._scrape_official_price, search_name, brand_info, price_range)] = 'Resmi Fiyat'
                    
                    # Yedek olarak dealer sitelerinden de bak
                    futures[executor.submit(self._scrape_new_car_prices, search_name, price_range)] = 'Bayi Fiyat'
                    
                    for future in as_completed(futures, timeout=30):
                        site = futures[future]
                        try:
                            result = future.result(timeout=10)
                            if result:
                                results.append(result)
                                print(f"   ✅ {result['site']}: {result['price']:,.2f} TL")
                        except Exception as e:
                            print(f"   ⚠️ {site} timeout/error: {e}")
            else:
                # İkinci el araç - Sahibinden ve Arabam'da "hatasız boyasız değişensiz" ile ara
                print(f"   🔄 İkinci el araç - Sahibinden ve Arabam'da aranıyor...")
                with ThreadPoolExecutor(max_workers=2) as executor:
                    futures = {
                        executor.submit(self._scrape_sahibinden_used, search_name, min_price, price_range, vehicle_year): 'Sahibinden',
                        executor.submit(self._scrape_arabam_used, search_name, min_price, price_range, vehicle_year): 'Arabam',
                    }
                    
                    for future in as_completed(futures, timeout=30):
                        site = futures[future]
                        try:
                            result = future.result(timeout=10)
                            if result:
                                results.append(result)
                                print(f"   ✅ {result['site']}: {result['price']:,.2f} TL")
                        except Exception as e:
                            print(f"   ⚠️ {site} timeout/error: {e}")
        else:
            # Elektronik ve diğer kategoriler için e-ticaret siteleri
            with ThreadPoolExecutor(max_workers=3) as executor:
                futures = {
                    executor.submit(self._scrape_hepsiburada_fast, search_name, min_price, price_range): 'Hepsiburada',
                    executor.submit(self._scrape_trendyol_fast, search_name, min_price, price_range): 'Trendyol',
                    executor.submit(self._scrape_n11_fast, search_name, min_price, price_range): 'N11',
                }
                
                for future in as_completed(futures, timeout=30):
                    site = futures[future]
                    try:
                        result = future.result(timeout=5)
                        if result:
                            results.append(result)
                            print(f"   ✅ {result['site']}: {result['price']:,.2f} TL")
                    except Exception as e:
                        print(f"   ⚠️ {site} timeout/error")
        
        if results and len(results) >= 1:
            prices = [r['price'] for r in results]
            cheapest = min(results, key=lambda x: x['price'])
            
            return {
                'success': True,
                'product_name': search_name,
                'original_query': product_name,
                'category': category,
                'results': sorted(results, key=lambda x: x['price']),
                'statistics': {
                    'average_price': round(sum(prices) / len(prices), 2),
                    'min_price': round(min(prices), 2),
                    'max_price': round(max(prices), 2),
                    'cheapest_site': cheapest['site'],
                    'cheapest_price': cheapest['price'],
                    'total_sites': len(results)
                },
                'estimated': False
            }
        else:
            print(f"   ⚠️ No real prices found, using estimation")
            return self._estimate_price(search_name, category)
    
    def _detect_category(self, product_name: str) -> Optional[str]:
        """Ürün adından kategoriyi otomatik algıla"""
        name_lower = product_name.lower()
        
        # Araç markaları ve modelleri
        car_brands = [
            'peugeot', 'renault', 'fiat', 'ford', 'volkswagen', 'vw', 'opel', 
            'toyota', 'honda', 'hyundai', 'kia', 'bmw', 'mercedes', 'audi', 
            'volvo', 'skoda', 'seat', 'citroen', 'dacia', 'nissan', 'mazda',
            'suzuki', 'mitsubishi', 'subaru', 'jeep', 'land rover', 'range rover',
            'porsche', 'ferrari', 'lamborghini', 'tesla', 'chevrolet', 'dodge'
        ]
        
        # Araç terimler
        car_terms = ['araba', 'araç', 'otomobil', 'sedan', 'suv', 'hatchback', 
                     'station wagon', 'pickup', 'kamyonet', 'minivan', 'coupe',
                     'cabrio', 'hybrid', 'elektrikli araç', 'dizel', 'benzinli']
        
        # Araç model kalıpları (3008, 308, 1.6, 2.0 gibi)
        if any(brand in name_lower for brand in car_brands):
            return 'vehicle'
        
        if any(term in name_lower for term in car_terms):
            return 'vehicle'
        
        # Model numarası kalıpları (örn: 3008, 5008, 308, c3, c4)
        if re.search(r'\b[1-9]\d{2,3}\b', name_lower):  # 3 veya 4 haneli model
            # Eğer araba markası yoksa ama model numarası varsa
            if any(brand in name_lower for brand in car_brands):
                return 'vehicle'
        
        # Elektronik ürünler
        electronics_terms = ['iphone', 'samsung', 'xiaomi', 'huawei', 'oppo', 'vivo',
                            'macbook', 'laptop', 'bilgisayar', 'tablet', 'ipad',
                            'airpod', 'kulaklık', 'telefon', 'phone', 'watch', 'saat']
        
        if any(term in name_lower for term in electronics_terms):
            return 'electronics'
        
        return None
    
    def _detect_vehicle_condition(self, product_name: str) -> str:
        """Araç durumunu algıla - sıfır mı ikinci el mi"""
        name_lower = product_name.lower()
        
        # Sıfır araç belirteçleri
        new_indicators = ['sıfır', '0 km', '0km', 'yeni', 'new', '2025', '2024 model', 
                         'sıfır km', 'sifir', 'fabrika çıkışı']
        
        # İkinci el belirteçleri
        used_indicators = ['ikinci el', '2. el', 'ikinciel', 'used', 'sahibinden',
                          '2020', '2021', '2022', '2023', '2019', '2018', '2017', '2016', '2015',
                          'hatasız', 'boyasız', 'değişensiz', 'temiz', 'km']
        
        if any(ind in name_lower for ind in new_indicators):
            return 'new'
        
        if any(ind in name_lower for ind in used_indicators):
            return 'used'
        
        # Default olarak sıfır kabul et (kullanıcı model gösterdiğinde genelde yeni almak ister)
        return 'new'
    
    def _extract_vehicle_year(self, product_name: str) -> Optional[int]:
        """Ürün adından araç yılını çıkar"""
        # 2015-2025 arası yıl ara
        year_match = re.search(r'\b(201[5-9]|202[0-5])\b', product_name)
        if year_match:
            return int(year_match.group(1))
        return None
    
    def _extract_vehicle_brand(self, product_name: str) -> Optional[Dict]:
        """Araç marka ve model bilgisini çıkar"""
        name_lower = product_name.lower()
        
        # Marka ve resmi site bilgileri
        brand_sites = {
            'peugeot': {
                'name': 'Peugeot',
                'official_url': 'https://www.peugeot.com.tr/fiyat-listesi.html',
                'price_list_url': 'https://www.peugeot.com.tr/fiyat-listesi.html'
            },
            'renault': {
                'name': 'Renault',
                'official_url': 'https://www.renault.com.tr/araclar.html',
                'price_list_url': 'https://www.renault.com.tr/araclar.html'
            },
            'fiat': {
                'name': 'Fiat',
                'official_url': 'https://www.fiat.com.tr/fiyat-listesi.html',
                'price_list_url': 'https://www.fiat.com.tr/fiyat-listesi.html'
            },
            'ford': {
                'name': 'Ford',
                'official_url': 'https://www.ford.com.tr/araclar',
                'price_list_url': 'https://www.ford.com.tr/fiyat-listesi'
            },
            'volkswagen': {
                'name': 'Volkswagen',
                'official_url': 'https://www.volkswagen.com.tr/tr/modeller.html',
                'price_list_url': 'https://www.volkswagen.com.tr/tr/modeller.html'
            },
            'toyota': {
                'name': 'Toyota',
                'official_url': 'https://www.toyota.com.tr/araclar',
                'price_list_url': 'https://www.toyota.com.tr/fiyat-listesi'
            },
            'honda': {
                'name': 'Honda',
                'official_url': 'https://www.honda.com.tr/otomobil',
                'price_list_url': 'https://www.honda.com.tr/otomobil'
            },
            'hyundai': {
                'name': 'Hyundai',
                'official_url': 'https://www.hyundai.com.tr/modeller',
                'price_list_url': 'https://www.hyundai.com.tr/modeller'
            },
            'kia': {
                'name': 'Kia',
                'official_url': 'https://www.kia.com/tr/modeller.html',
                'price_list_url': 'https://www.kia.com/tr/modeller.html'
            },
            'bmw': {
                'name': 'BMW',
                'official_url': 'https://www.bmw.com.tr/tr/all-models.html',
                'price_list_url': 'https://www.bmw.com.tr/tr/all-models.html'
            },
            'mercedes': {
                'name': 'Mercedes-Benz',
                'official_url': 'https://www.mercedes-benz.com.tr/passengercars.html',
                'price_list_url': 'https://www.mercedes-benz.com.tr/passengercars.html'
            },
            'audi': {
                'name': 'Audi',
                'official_url': 'https://www.audi.com.tr/tr/web/tr/modeller.html',
                'price_list_url': 'https://www.audi.com.tr/tr/web/tr/modeller.html'
            },
            'volvo': {
                'name': 'Volvo',
                'official_url': 'https://www.volvocars.com/tr/cars/',
                'price_list_url': 'https://www.volvocars.com/tr/cars/'
            },
            'skoda': {
                'name': 'Skoda',
                'official_url': 'https://www.skoda.com.tr/modeller',
                'price_list_url': 'https://www.skoda.com.tr/modeller'
            },
            'seat': {
                'name': 'Seat',
                'official_url': 'https://www.seat.com.tr/modeller.html',
                'price_list_url': 'https://www.seat.com.tr/modeller.html'
            },
            'citroen': {
                'name': 'Citroen',
                'official_url': 'https://www.citroen.com.tr/fiyat-listesi.html',
                'price_list_url': 'https://www.citroen.com.tr/fiyat-listesi.html'
            },
            'dacia': {
                'name': 'Dacia',
                'official_url': 'https://www.dacia.com.tr/arac-serisi.html',
                'price_list_url': 'https://www.dacia.com.tr/arac-serisi.html'
            },
            'nissan': {
                'name': 'Nissan',
                'official_url': 'https://www.nissan.com.tr/araclar.html',
                'price_list_url': 'https://www.nissan.com.tr/araclar.html'
            },
            'mazda': {
                'name': 'Mazda',
                'official_url': 'https://www.mazda.com.tr/modeller/',
                'price_list_url': 'https://www.mazda.com.tr/modeller/'
            },
            'opel': {
                'name': 'Opel',
                'official_url': 'https://www.opel.com.tr/araclar.html',
                'price_list_url': 'https://www.opel.com.tr/araclar.html'
            },
            'tesla': {
                'name': 'Tesla',
                'official_url': 'https://www.tesla.com/tr_tr',
                'price_list_url': 'https://www.tesla.com/tr_tr'
            },
        }
        
        for brand_key, brand_info in brand_sites.items():
            if brand_key in name_lower:
                # Model adını da çıkar
                model_match = re.search(rf'{brand_key}\s+([a-zA-Z0-9\-\.]+)', name_lower)
                model = model_match.group(1) if model_match else None
                return {
                    **brand_info,
                    'brand_key': brand_key,
                    'model': model,
                    'full_name': product_name
                }
        
        return None
    
    def _scrape_official_price(self, product_name: str, brand_info: Dict, price_range: tuple = None) -> Optional[Dict]:
        """Resmi marka sitesinden sıfır araç fiyatı çek"""
        try:
            print(f"   🏭 {brand_info['name']} resmi fiyat listesi aranıyor...")
            
            url = brand_info['price_list_url']
            response = self._make_scraper_request(url, render=True)  # JavaScript gerekebilir
            
            if not response:
                return None
            
            soup = BeautifulSoup(response.content, 'html.parser')
            price = None
            
            min_valid = price_range[0] if price_range else 500000
            max_valid = price_range[1] if price_range else 15000000
            
            # Model adı ile eşleşen fiyatı bul
            model = brand_info.get('model', '')
            all_text = soup.get_text()
            
            # Önce modeli içeren bölümü bul
            if model:
                # Model adı yakınındaki fiyatları ara
                model_pattern = rf'{model}.*?(\d{{1,3}}(?:\.\d{{3}}){{1,2}})\s*(?:TL|₺|EUR|€)'
                model_matches = re.findall(model_pattern, all_text, re.IGNORECASE | re.DOTALL)
                for match in model_matches[:5]:
                    extracted = self._extract_price(match + ' TL')
                    if extracted and min_valid <= extracted <= max_valid:
                        price = extracted
                        break
            
            # Model bulunamadıysa genel fiyat ara
            if not price:
                matches = re.findall(r'(\d{1,3}(?:\.\d{3}){1,2})\s*(?:TL|₺)', all_text)
                for match in matches[:30]:
                    extracted = self._extract_price(match + ' TL')
                    if extracted and min_valid <= extracted <= max_valid:
                        price = extracted
                        break
            
            if price:
                return {
                    'site': f'{brand_info["name"]} Resmi',
                    'price': price,
                    'currency': 'TRY',
                    'product_title': product_name,
                    'url': url,
                    'available': True,
                    'condition': 'new'
                }
            return None
        except Exception as e:
            print(f"   ❌ Resmi site error: {e}")
            return None
    
    def _scrape_new_car_prices(self, product_name: str, price_range: tuple = None) -> Optional[Dict]:
        """Yeni araç fiyat karşılaştırma sitelerinden fiyat çek"""
        try:
            # arabalar.com.tr sıfır araç fiyatları için
            search_query = urllib.parse.quote(product_name)
            url = f"https://www.arabalar.com.tr/fiyat-listesi?q={search_query}"
            
            print(f"   🔍 Sıfır araç fiyatları aranıyor...")
            
            response = self._make_scraper_request(url, render=False)
            if not response:
                # Alternatif: Google'da "marka model 2025 fiyat listesi" ara
                return self._search_new_car_price_google(product_name, price_range)
            
            soup = BeautifulSoup(response.content, 'html.parser')
            price = None
            
            min_valid = price_range[0] if price_range else 500000
            max_valid = price_range[1] if price_range else 15000000
            
            all_text = soup.get_text()
            matches = re.findall(r'(\d{1,3}(?:\.\d{3}){1,2})\s*(?:TL|₺)', all_text)
            for match in matches[:30]:
                extracted = self._extract_price(match + ' TL')
                if extracted and min_valid <= extracted <= max_valid:
                    price = extracted
                    break
            
            if price:
                return {
                    'site': 'Bayi Fiyatı',
                    'price': price,
                    'currency': 'TRY',
                    'product_title': product_name,
                    'url': url,
                    'available': True,
                    'condition': 'new'
                }
            return None
        except Exception as e:
            print(f"   ❌ Yeni araç fiyat error: {e}")
            return None
    
    def _search_new_car_price_google(self, product_name: str, price_range: tuple = None) -> Optional[Dict]:
        """Google'da sıfır araç fiyatı ara"""
        try:
            search_query = urllib.parse.quote(f"{product_name} 2025 fiyat listesi TL")
            url = f"https://www.google.com/search?q={search_query}"
            
            response = self._make_scraper_request(url, render=False)
            if not response:
                return None
            
            soup = BeautifulSoup(response.content, 'html.parser')
            all_text = soup.get_text()
            
            min_valid = price_range[0] if price_range else 500000
            max_valid = price_range[1] if price_range else 15000000
            
            # TL cinsinden fiyat ara
            matches = re.findall(r'(\d{1,3}(?:\.\d{3}){1,2})\s*(?:TL|₺)', all_text)
            for match in matches[:20]:
                extracted = self._extract_price(match + ' TL')
                if extracted and min_valid <= extracted <= max_valid:
                    return {
                        'site': 'Güncel Fiyat',
                        'price': extracted,
                        'currency': 'TRY',
                        'product_title': product_name,
                        'url': f"https://www.google.com/search?q={search_query}",
                        'available': True,
                        'condition': 'new'
                    }
            return None
        except Exception as e:
            print(f"   ❌ Google search error: {e}")
            return None
    
    def _scrape_sahibinden_used(self, product_name: str, min_price: float, price_range: tuple = None, year: int = None) -> Optional[Dict]:
        """Sahibinden.com ikinci el araç scraper - hatasız boyasız değişensiz"""
        try:
            # Arama sorgusu: "marka model hatasız boyasız değişensiz"
            search_terms = f"{product_name} hatasız boyasız değişensiz"
            if year:
                search_terms = f"{product_name} {year} hatasız boyasız değişensiz"
            
            search_query = urllib.parse.quote(search_terms)
            url = f"https://www.sahibinden.com/arama?query={search_query}&category=3&pagingOffset=0"
            
            print(f"   🔍 Sahibinden (İkinci El): {search_terms}")
            
            response = self._make_scraper_request(url, render=False)
            if not response:
                return None
            
            soup = BeautifulSoup(response.content, 'html.parser')
            price = None
            
            min_valid = price_range[0] if price_range else 100000
            max_valid = price_range[1] if price_range else 10000000
            
            all_text = soup.get_text()
            matches = re.findall(r'(\d{1,3}(?:\.\d{3}){1,3})\s*(?:TL|₺)', all_text)
            
            prices_found = []
            for match in matches[:50]:
                extracted = self._extract_price(match + ' TL')
                if extracted and min_valid <= extracted <= max_valid:
                    prices_found.append(extracted)
            
            if prices_found:
                # En düşük ve en yüksek fiyatı al, ortalamasını hesapla
                avg_price = sum(prices_found[:10]) / len(prices_found[:10])
                price = round(avg_price, 2)
            
            if price:
                return {
                    'site': 'Sahibinden (İkinci El)',
                    'price': price,
                    'currency': 'TRY',
                    'product_title': f"{product_name} (Hatasız Boyasız)",
                    'url': url,
                    'available': True,
                    'condition': 'used',
                    'search_criteria': 'hatasız boyasız değişensiz'
                }
            return None
        except Exception as e:
            print(f"   ❌ Sahibinden error: {e}")
            return None
    
    def _scrape_arabam_used(self, product_name: str, min_price: float, price_range: tuple = None, year: int = None) -> Optional[Dict]:
        """Arabam.com ikinci el araç scraper - hatasız boyasız değişensiz"""
        try:
            search_terms = f"{product_name}"
            if year:
                search_terms = f"{product_name} {year}"
            
            search_query = urllib.parse.quote(search_terms)
            # Arabam.com'da hatasız/boyasız filtresi için parametre ekle
            url = f"https://www.arabam.com/ikinci-el/otomobil?q={search_query}"
            
            print(f"   🔍 Arabam (İkinci El): {search_terms}")
            
            response = self._make_scraper_request(url, render=False)
            if not response:
                return None
            
            soup = BeautifulSoup(response.content, 'html.parser')
            price = None
            
            min_valid = price_range[0] if price_range else 100000
            max_valid = price_range[1] if price_range else 10000000
            
            all_text = soup.get_text()
            matches = re.findall(r'(\d{1,3}(?:\.\d{3}){1,3})\s*(?:TL|₺)', all_text)
            
            prices_found = []
            for match in matches[:50]:
                extracted = self._extract_price(match + ' TL')
                if extracted and min_valid <= extracted <= max_valid:
                    prices_found.append(extracted)
            
            if prices_found:
                avg_price = sum(prices_found[:10]) / len(prices_found[:10])
                price = round(avg_price, 2)
            
            if price:
                return {
                    'site': 'Arabam (İkinci El)',
                    'price': price,
                    'currency': 'TRY',
                    'product_title': f"{product_name} (Hatasız Boyasız)",
                    'url': url,
                    'available': True,
                    'condition': 'used'
                }
            return None
        except Exception as e:
            print(f"   ❌ Arabam error: {e}")
            return None
    
    def _scrape_sahibinden(self, product_name: str, min_price: float, price_range: tuple = None) -> Optional[Dict]:
        """Sahibinden.com araç scraper"""
        try:
            # Sahibinden arama URL'i
            search_query = urllib.parse.quote(product_name)
            url = f"https://www.sahibinden.com/arama?query={search_query}&category=3&pagingOffset=0"
            
            print(f"   🔍 Scraping Sahibinden...")
            
            response = self._make_scraper_request(url, render=False)
            if not response:
                return None
            
            soup = BeautifulSoup(response.content, 'html.parser')
            price = None
            product_url = url  # Arama sayfası URL'i (daha güvenli)
            
            # Fiyat aralığını belirle (araçlar için)
            min_valid = price_range[0] if price_range else 100000  # Min 100K TL
            max_valid = price_range[1] if price_range else 10000000  # Max 10M TL
            
            # Sahibinden fiyat formatı: "1.500.000 TL"
            all_text = soup.get_text()
            
            # Türk formatında büyük fiyatları bul (araç fiyatları genellikle 6-7 haneli)
            matches = re.findall(r'(\d{1,3}(?:\.\d{3}){1,3})\s*(?:TL|₺)', all_text)
            for match in matches[:30]:
                extracted = self._extract_price(match + ' TL')
                if extracted and min_valid <= extracted <= max_valid:
                    price = extracted
                    break
            
            if price:
                return {
                    'site': 'Sahibinden',
                    'price': price,
                    'currency': 'TRY',
                    'product_title': product_name,
                    'url': product_url,  # Arama sonuç sayfası
                    'available': True
                }
            return None
        except Exception as e:
            print(f"   ❌ Sahibinden error: {e}")
            return None
    
    def _scrape_arabam(self, product_name: str, min_price: float, price_range: tuple = None) -> Optional[Dict]:
        """Arabam.com araç scraper"""
        try:
            search_query = urllib.parse.quote(product_name)
            url = f"https://www.arabam.com/ikinci-el/otomobil?q={search_query}"
            
            print(f"   🔍 Scraping Arabam...")
            
            response = self._make_scraper_request(url, render=False)
            if not response:
                return None
            
            soup = BeautifulSoup(response.content, 'html.parser')
            price = None
            product_url = url  # Arama sayfası URL'i (daha güvenli)
            
            # Fiyat aralığını belirle
            min_valid = price_range[0] if price_range else 100000
            max_valid = price_range[1] if price_range else 10000000
            
            # Arabam fiyat formatı
            all_text = soup.get_text()
            matches = re.findall(r'(\d{1,3}(?:\.\d{3}){1,3})\s*(?:TL|₺)', all_text)
            for match in matches[:30]:
                extracted = self._extract_price(match + ' TL')
                if extracted and min_valid <= extracted <= max_valid:
                    price = extracted
                    break
            
            if price:
                return {
                    'site': 'Arabam',
                    'price': price,
                    'currency': 'TRY',
                    'product_title': product_name,
                    'url': product_url,  # Arama sonuç sayfası
                    'available': True
                }
            return None
        except Exception as e:
            print(f"   ❌ Arabam error: {e}")
            return None
    
    def _scrape_hepsiburada_fast(self, product_name: str, min_price: float, price_range: tuple = None) -> Optional[Dict]:
        """Fast Hepsiburada scraper"""
        try:
            url = f"https://www.hepsiburada.com/ara?q={urllib.parse.quote(product_name)}"
            print(f"   🔍 Scraping Hepsiburada...")
            
            response = self._make_direct_request(url)
            if not response:
                response = self._make_scraper_request(url, render=False)
            if not response:
                return None
            
            soup = BeautifulSoup(response.content, 'html.parser')
            price = None
            product_url = url
            
            min_valid = price_range[0] if price_range else min_price
            max_valid = price_range[1] if price_range else 500000
            
            all_text = soup.get_text()
            matches = re.findall(r'(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)\s*TL', all_text)
            for match in matches[:30]:
                extracted = self._extract_price(match + ' TL')
                if extracted and min_valid <= extracted <= max_valid:
                    price = extracted
                    break
            
            if not price:
                price_elem = soup.find('div', {'data-test-id': 'price-current-price'})
                if price_elem:
                    extracted = self._extract_price(price_elem.get_text())
                    if extracted and min_valid <= extracted <= max_valid:
                        price = extracted
            
            link = soup.find('a', href=re.compile(r'/[a-z0-9-]+-p-'))
            if link and link.get('href'):
                href = link['href']
                product_url = f"https://www.hepsiburada.com{href}" if href.startswith('/') else href
            
            if price:
                return {
                    'site': 'Hepsiburada',
                    'price': price,
                    'currency': 'TRY',
                    'product_title': product_name,
                    'url': product_url,
                    'available': True
                }
            return None
        except Exception as e:
            print(f"   ❌ Hepsiburada error: {e}")
            return None
    
    def _scrape_n11_fast(self, product_name: str, min_price: float, price_range: tuple = None) -> Optional[Dict]:
        """Fast N11 scraper"""
        try:
            url = f"https://www.n11.com/arama?q={urllib.parse.quote(product_name)}"
            print(f"   🔍 Scraping N11...")
            
            response = self._make_direct_request(url)
            if not response:
                response = self._make_scraper_request(url, render=False)
            if not response:
                return None
            
            soup = BeautifulSoup(response.content, 'html.parser')
            price = None
            product_url = url
            
            min_valid = price_range[0] if price_range else min_price
            max_valid = price_range[1] if price_range else 500000
            
            all_text = soup.get_text()
            matches = re.findall(r'(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)\s*TL', all_text)
            for match in matches[:30]:
                extracted = self._extract_price(match + ' TL')
                if extracted and min_valid <= extracted <= max_valid:
                    price = extracted
                    break
            
            link = soup.find('a', class_='plink')
            if link and link.get('href'):
                product_url = link['href']
            
            if price:
                return {
                    'site': 'N11',
                    'price': price,
                    'currency': 'TRY',
                    'product_title': product_name,
                    'url': product_url,
                    'available': True
                }
            return None
        except Exception as e:
            print(f"   ❌ N11 error: {e}")
            return None
    
    def _scrape_trendyol_fast(self, product_name: str, min_price: float, price_range: tuple = None) -> Optional[Dict]:
        """Fast Trendyol scraper"""
        try:
            url = f"https://www.trendyol.com/sr?q={urllib.parse.quote(product_name)}"
            print(f"   🔍 Scraping Trendyol...")
            
            response = self._make_direct_request(url)
            if not response:
                response = self._make_scraper_request(url, render=False)
            if not response:
                return None
            
            soup = BeautifulSoup(response.content, 'html.parser')
            price = None
            product_url = url
            
            min_valid = price_range[0] if price_range else min_price
            max_valid = price_range[1] if price_range else 500000
            
            all_text = soup.get_text()
            matches = re.findall(r'(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)\s*TL', all_text)
            for match in matches[:30]:
                extracted = self._extract_price(match + ' TL')
                if extracted and min_valid <= extracted <= max_valid:
                    price = extracted
                    break
            
            if not price:
                scripts = soup.find_all('script', type='application/ld+json')
                for script in scripts:
                    try:
                        data = json.loads(script.string)
                        if isinstance(data, dict) and 'offers' in data:
                            offers = data['offers']
                            if isinstance(offers, dict) and 'price' in offers:
                                extracted = float(offers['price'])
                                if min_valid <= extracted <= max_valid:
                                    price = extracted
                                    break
                    except:
                        pass
            
            link = soup.find('a', href=re.compile(r'/p-'))
            if link and link.get('href'):
                href = link['href']
                product_url = f"https://www.trendyol.com{href}" if href.startswith('/') else href
            
            if price:
                return {
                    'site': 'Trendyol',
                    'price': price,
                    'currency': 'TRY',
                    'product_title': product_name,
                    'url': product_url,
                    'available': True
                }
            return None
        except Exception as e:
            print(f"   ❌ Trendyol error: {e}")
            return None
    
    def _extract_price(self, price_text: str) -> Optional[float]:
        """Extract price from text - Turkish format support"""
        try:
            if not price_text:
                return None
            
            price_text = str(price_text).replace('TL', '').replace('₺', '').strip()
            
            if ',' in price_text:
                price_text = price_text.replace('.', '').replace(',', '.')
            elif price_text.count('.') > 1:
                price_text = price_text.replace('.', '')
            
            price = float(re.sub(r'[^\d.]', '', price_text))
            return price if price > 0 else None
        except:
            return None
    
    def _estimate_price(self, product_name: str, category: str) -> Dict:
        """Fast fallback: Realistic market price estimation"""
        print(f"   💡 Estimating realistic price for: {product_name}")
        
        name_lower = product_name.lower()
        price_range = self._get_price_range_for_product(product_name)
        
        # Fallback fiyat aralıkları
        if price_range == (1000, 500000):
            realistic_base_prices = {
                'electronics': {
                    'phone': (5000, 50000),
                    'laptop': (35000, 150000),
                    'macbook': (55000, 180000),
                    'tablet': (15000, 60000),
                    'ipad': (25000, 70000),
                    'headphone': (500, 12000),
                    'airpod': (3000, 12000),
                    'monitor': (8000, 45000),
                    'mouse': (500, 3500),
                    'keyboard': (800, 5000),
                    'watch': (5000, 35000),
                    'default': (5000, 60000)
                },
                'vehicle': (1200000, 5000000),
                'jewelry': (8000, 200000),
                'clothing': (500, 12000),
                'home': (3000, 80000),
                'other': (1000, 30000)
            }
            
            if category == 'electronics':
                if 'phone' in name_lower or 'telefon' in name_lower:
                    price_range = realistic_base_prices['electronics']['phone']
                elif 'macbook' in name_lower:
                    price_range = realistic_base_prices['electronics']['macbook']
                elif 'laptop' in name_lower:
                    price_range = realistic_base_prices['electronics']['laptop']
                elif 'ipad' in name_lower:
                    price_range = realistic_base_prices['electronics']['ipad']
                elif 'tablet' in name_lower:
                    price_range = realistic_base_prices['electronics']['tablet']
                elif 'airpod' in name_lower:
                    price_range = realistic_base_prices['electronics']['airpod']
                elif 'headphone' in name_lower or 'kulaklık' in name_lower:
                    price_range = realistic_base_prices['electronics']['headphone']
                elif 'watch' in name_lower or 'saat' in name_lower:
                    price_range = realistic_base_prices['electronics']['watch']
                elif 'monitor' in name_lower:
                    price_range = realistic_base_prices['electronics']['monitor']
                elif 'mouse' in name_lower:
                    price_range = realistic_base_prices['electronics']['mouse']
                elif 'keyboard' in name_lower:
                    price_range = realistic_base_prices['electronics']['keyboard']
                else:
                    price_range = realistic_base_prices['electronics']['default']
            else:
                price_range = realistic_base_prices.get(category, (1000, 30000))
        
        min_price = price_range[0]
        max_price = price_range[1]
        avg_price = (min_price + max_price) / 2
        
        print(f"   💰 Estimated range: {min_price:,.0f} - {max_price:,.0f} TL")
        
        results = []
        
        # Kategoriye göre site URL'leri
        if category == 'vehicle':
            site_urls = {
                'Sahibinden': f'https://www.sahibinden.com/arama?query={urllib.parse.quote(product_name)}',
                'Arabam': f'https://www.arabam.com/ikinci-el/otomobil?q={urllib.parse.quote(product_name)}',
            }
            sites = ['Sahibinden', 'Arabam']
        else:
            site_urls = {
                'N11': f'https://www.n11.com/arama?q={urllib.parse.quote(product_name)}',
                'Trendyol': f'https://www.trendyol.com/sr?q={urllib.parse.quote(product_name)}',
                'Hepsiburada': f'https://www.hepsiburada.com/ara?q={urllib.parse.quote(product_name)}'
            }
            sites = ['N11', 'Trendyol', 'Hepsiburada']
        
        for site in sites:
            site_price = avg_price * random.uniform(0.92, 1.08)
            results.append({
                'site': site,
                'price': round(site_price, 2),
                'currency': 'TRY',
                'product_title': product_name,
                'url': site_urls[site],
                'available': True,
                'estimated': True
            })
        
        results.sort(key=lambda x: x['price'])
        prices = [r['price'] for r in results]
        
        return {
            'success': True,
            'product_name': product_name,
            'category': category,
            'results': results,
            'statistics': {
                'average_price': round(sum(prices) / len(prices), 2),
                'min_price': round(min(prices), 2),
                'max_price': round(max(prices), 2),
                'cheapest_site': results[0]['site'],
                'cheapest_price': results[0]['price'],
                'total_sites': len(results)
            },
            'estimated': True,
            'note': '⚠️ Bu ürün henüz piyasada mevcut değil veya gerçek fiyatlar çekilemedi. Tahmini fiyatlar gösteriliyor.',
            'price_accuracy': 'estimated_market_average'
        }


# Singleton
enhanced_scraper = EnhancedProductScraper()
