"""
Product Price Scraper - Web Scraping for Product Prices
E-ticaret sitelerinden ürün fiyat takibi
"""
import requests
from bs4 import BeautifulSoup
import re
from typing import Dict, List, Optional
from datetime import datetime
import random
import time

# Try to import cloudscraper for better anti-bot bypass
try:
    import cloudscraper
    CLOUDSCRAPER_AVAILABLE = True
except ImportError:
    CLOUDSCRAPER_AVAILABLE = False
    print("⚠️ CloudScraper not available. Using standard requests.")


class ProductScraper:
    """Ürün fiyat scraper sınıfı"""
    
    def __init__(self):
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        # Kategori bazlı örnek ürünler ve fiyat aralıkları
        self.product_categories = {
            'electronics': {
                'Oyuncu Bilgisayarı': {'min': 85000, 'max': 120000},
                'iPhone 15 Pro': {'min': 65000, 'max': 85000},
                'MacBook Pro M3': {'min': 90000, 'max': 130000},
                'PlayStation 5': {'min': 25000, 'max': 35000},
                'Samsung QLED TV': {'min': 45000, 'max': 75000},
            },
            'house': {
                'Ev Mobilyası Seti': {'min': 150000, 'max': 300000},
                'Mutfak Dolabı': {'min': 80000, 'max': 150000},
                'Koltuk Takımı': {'min': 40000, 'max': 90000},
            },
            'car': {
                'Fiat Egea': {'min': 850000, 'max': 1100000},
                'Volkswagen Passat': {'min': 1500000, 'max': 1900000},
                'Toyota Corolla': {'min': 1200000, 'max': 1500000},
            },
            'education': {
                'Üniversite Eğitimi (Yıllık)': {'min': 100000, 'max': 250000},
                'Dil Kursu': {'min': 25000, 'max': 50000},
                'MBA Programı': {'min': 300000, 'max': 500000},
            },
            'travel': {
                'Avrupa Turu': {'min': 75000, 'max': 150000},
                'Antalya Tatili (7 Gün)': {'min': 35000, 'max': 65000},
                'Dubai Tatili': {'min': 60000, 'max': 120000},
            },
            'other': {
                'Düğün Organizasyonu': {'min': 200000, 'max': 400000},
                'Sürpriz Paket': {'min': 10000, 'max': 50000},
            }
        }
    
    def get_product_price(self, product_name: str, category: str = 'electronics') -> Dict:
        """
        Ürün fiyatını getir (gerçek scraping veya simülasyon)
        Real scraping için sitelere özel logic eklenebilir
        """
        
        # Önce kategori içinde ürünü bul
        if category in self.product_categories:
            if product_name in self.product_categories[category]:
                price_range = self.product_categories[category][product_name]
                current_price = random.uniform(price_range['min'], price_range['max'])
                
                return {
                    'product_name': product_name,
                    'category': category,
                    'current_price': round(current_price, 2),
                    'currency': 'TRY',
                    'timestamp': datetime.now().isoformat(),
                    'source': 'market_average',
                    'price_range': price_range
                }
        
        # Genel ürün için tahmin
        return self._estimate_product_price(product_name, category)
    
    def _estimate_product_price(self, product_name: str, category: str) -> Dict:
        """Ürün fiyat tahmini (AI ile geliştirilebilir)"""
        
        # Kategori bazlı ortalama fiyat
        category_avg_prices = {
            'electronics': 50000,
            'house': 100000,
            'car': 1000000,
            'education': 150000,
            'travel': 50000,
            'other': 50000
        }
        
        base_price = category_avg_prices.get(category, 50000)
        estimated_price = base_price + random.uniform(-base_price * 0.3, base_price * 0.3)
        
        return {
            'product_name': product_name,
            'category': category,
            'current_price': round(estimated_price, 2),
            'currency': 'TRY',
            'timestamp': datetime.now().isoformat(),
            'source': 'estimated',
            'note': 'Fiyat tahmini - gerçek veriler için web scraping eklenebilir'
        }
    
    def get_price_history(self, product_name: str, category: str, months: int = 12) -> List[Dict]:
        """
        Ürün fiyat geçmişi (simüle edilmiş)
        Gerçek sistemde database'den çekilir
        """
        current_price_data = self.get_product_price(product_name, category)
        current_price = current_price_data['current_price']
        
        history = []
        
        # Son X ay için fiyat geçmişi oluştur
        for i in range(months, 0, -1):
            date = datetime.now()
            date = date.replace(month=max(1, date.month - i))
            
            # Geriye doğru giderken fiyat azalır (enflasyon tersine)
            price_factor = 1 - (i * 0.03)  # Her ay %3 daha düşük
            historical_price = current_price * price_factor
            
            history.append({
                'date': date.strftime('%Y-%m-%d'),
                'price': round(historical_price, 2),
                'month_ago': i
            })
        
        return history
    
    def predict_future_price(self, product_name: str, category: str, months_ahead: int = 12) -> Dict:
        """
        Gelecek fiyat tahmini (basit linear projeksiyon)
        LSTM modeliyle geliştirilebilir
        """
        from market_data_api import market_data_api
        
        current_price_data = self.get_product_price(product_name, category)
        current_price = current_price_data['current_price']
        
        # Enflasyon oranını al
        inflation_data = market_data_api.get_inflation_data()
        annual_inflation = inflation_data['annual_inflation'] / 100
        
        # Kategori bazlı fiyat artış çarpanı
        category_multipliers = {
            'electronics': 1.2,  # Elektronik daha hızlı artar (kur + teknoloji)
            'house': 0.9,        # Ev mobilyası daha yavaş
            'car': 1.3,          # Araç çok hızlı artar
            'education': 1.1,
            'travel': 1.0,
            'other': 1.0
        }
        
        multiplier = category_multipliers.get(category, 1.0)
        adjusted_inflation = annual_inflation * multiplier
        
        # Aylık artış oranı
        monthly_increase = adjusted_inflation / 12
        
        # Gelecek fiyat hesapla
        future_price = current_price * (1 + (monthly_increase * months_ahead))
        
        # Fiyat artış yüzdesi
        price_increase_percent = ((future_price - current_price) / current_price) * 100
        
        return {
            'product_name': product_name,
            'category': category,
            'current_price': round(current_price, 2),
            'predicted_price': round(future_price, 2),
            'months_ahead': months_ahead,
            'price_increase_amount': round(future_price - current_price, 2),
            'price_increase_percent': round(price_increase_percent, 2),
            'inflation_factor': round(adjusted_inflation * 100, 2),
            'prediction_date': datetime.now().isoformat(),
            'confidence': 'medium'  # Basit model için orta güven
        }
    
    def scrape_real_product_url(self, url: str, goal_name: str = None) -> Optional[Dict]:
        """
        Gerçek URL'den fiyat scraping (CloudScraper + Smart Matching)
        goal_name: Kullanıcının hedef ürün adı (e-3008, iPhone 15, vs.)
        Bot korumasını bypass eder + Akıllı eşleştirme yapar
        """
        try:
            # CloudScraper kullan (varsa)
            if CLOUDSCRAPER_AVAILABLE:
                scraper = cloudscraper.create_scraper(
                    browser={
                        'browser': 'chrome',
                        'platform': 'windows',
                        'mobile': False
                    },
                    delay=10  # Daha hızlı
                )
                response = scraper.get(url, timeout=15)  # Timeout azaltıldı
            else:
                # Standard requests
                session = requests.Session()
                session.headers.update(self.headers)
                response = session.get(url, timeout=15, allow_redirects=True)
            
            response.raise_for_status()
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # SMART MATCHING: Eğer goal_name verilmişse, önce ona göre ara
            if goal_name:
                smart_result = self._smart_match_product(soup, url, goal_name)
                if smart_result and smart_result.get('success'):
                    return smart_result
            
            # Site bazlı özel selectors
            price = None
            product_name = None
            
            # Hepsiburada
            if 'hepsiburada.com' in url:
                # Try all possible selectors
                price_elem = None
                price_selectors = [
                    {'data-bind': 'markupText:CurrentPriceText'},
                    {'data-bind': 'text: CurrentPriceText'},
                    {'class': 'price'},
                    {'class': 'product-price'},
                    {'itemprop': 'price'},
                    {'data-test': 'price'},
                    {'id': 'offering-price'},
                    {'class': re.compile(r'price', re.I)}
                ]
                
                for selector in price_selectors:
                    price_elem = soup.find(['span', 'div', 'p'], selector)
                    if price_elem:
                        break
                
                # Try JSON-LD
                if not price_elem:
                    script_tags = soup.find_all('script', type='application/ld+json')
                    for script in script_tags:
                        try:
                            import json
                            data = json.loads(script.string)
                            if isinstance(data, dict) and 'offers' in data:
                                price = float(data['offers'].get('price', 0))
                                if price > 0:
                                    break
                        except:
                            pass
                
                name_elem = soup.find('h1', id='product-name') or soup.find('h1', class_='product-name') or soup.find('h1')
                
            # Trendyol
            elif 'trendyol.com' in url:
                price_selectors = [
                    {'class': 'prc-dsc'},
                    {'class': 'product-price'},
                    {'class': 'prc-slg'},
                    {'class': re.compile(r'price|prc', re.I)}
                ]
                
                for selector in price_selectors:
                    price_elem = soup.find(['span', 'div'], selector)
                    if price_elem:
                        break
                        
                name_elem = soup.find('h1', class_='pr-new-br') or soup.find('h1', class_=re.compile(r'product|title')) or soup.find('h1')
                
            # N11
            elif 'n11.com' in url:
                price_elem = (
                    soup.find('ins') or 
                    soup.find('span', class_='newPrice') or
                    soup.find('div', class_='priceContainer') or
                    soup.find('span', class_=re.compile(r'price', re.I))
                )
                name_elem = soup.find('h1', class_='proDetailTitle') or soup.find('h1', class_=re.compile(r'product|title')) or soup.find('h1')
                
            # Amazon Türkiye
            elif 'amazon.com.tr' in url:
                price_elem = (
                    soup.find('span', class_='a-price-whole') or
                    soup.find('span', id='priceblock_ourprice') or
                    soup.find('span', id='priceblock_dealprice') or
                    soup.find('span', class_='a-offscreen') or
                    soup.find('span', class_=re.compile(r'price', re.I))
                )
                name_elem = soup.find('span', id='productTitle') or soup.find('h1', id='title') or soup.find('h1')
            
            # Genel pattern matching (diğer siteler için)
            else:
                # Generic price patterns
                price_patterns = [
                    {'class': re.compile(r'price|fiyat|tutar|amount', re.I)},
                    {'id': re.compile(r'price|fiyat|tutar|amount', re.I)},
                    {'itemprop': 'price'},
                    {'data-test': re.compile(r'price', re.I)}
                ]
                
                for pattern in price_patterns:
                    price_elem = soup.find(['span', 'div', 'ins', 'p', 'strong'], pattern)
                    if price_elem:
                        break
                
                # Generic product name
                name_elem = soup.find('h1') or soup.find('title')
            
            # Extract price
            if price_elem:
                price_text = price_elem.get_text(strip=True)
                # Remove currency symbols and extract number
                price_text = re.sub(r'[^\d.,]', '', price_text)
                price_text = price_text.replace('.', '').replace(',', '.')
                
                try:
                    price = float(price_text)
                except ValueError:
                    pass
            
            # Extract product name
            if name_elem:
                product_name = name_elem.get_text(strip=True)
                # Limit length
                if len(product_name) > 100:
                    product_name = product_name[:100] + '...'
            
            # Eğer bulunamadıysa, text içinde arama yap
            if not price:
                page_text = soup.get_text()
                # TL ile biten sayıları ara
                matches = re.findall(r'(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)\s*(?:TL|₺)', page_text)
                if matches:
                    # En büyük fiyatı al (genelde ürün fiyatı en büyüktür)
                    prices = []
                    for match in matches:
                        try:
                            clean_price = match.replace('.', '').replace(',', '.')
                            price_val = float(clean_price)
                            # Makul fiyat aralığında olmalı (100 TL - 10M TL)
                            if 100 <= price_val <= 10000000:
                                prices.append(price_val)
                        except:
                            pass
                    if prices:
                        # Ortanca değeri al (outlier'lardan kaçın)
                        prices.sort()
                        price = prices[len(prices)//2]
            
            if price and price > 0:
                return {
                    'url': url,
                    'price': round(price, 2),
                    'product_name': product_name or 'Ürün',
                    'currency': 'TRY',
                    'scraped_at': datetime.now().isoformat(),
                    'method': 'real_scraping',
                    'success': True
                }
            else:
                return {
                    'success': False,
                    'error': 'Fiyat bulunamadı. Lütfen fiyatı manuel girin.',
                    'url': url
                }
            
        except requests.exceptions.Timeout:
            return {
                'success': False,
                'error': 'Site yanıt vermedi (timeout). Lütfen tekrar deneyin veya manuel girin.',
                'url': url
            }
        except requests.exceptions.RequestException as e:
            return {
                'success': False,
                'error': f'Bağlantı hatası: {str(e)[:100]}',
                'url': url
            }
        except Exception as e:
            print(f"Scraping error for {url}: {e}")
            return {
                'success': False,
                'error': f'Scraping hatası. Lütfen manuel girin.',
                'url': url
            }
    
    def _smart_match_product(self, soup: BeautifulSoup, url: str, goal_name: str) -> Optional[Dict]:
        """
        Akıllı ürün eşleştirme - Hedef adını HTML içinde arar
        
        Kullanım Senaryoları:
        1. Araç fiyat listesi (tablo) → Modele göre fiyat bul
        2. Sahibinden ilanı → İlan fiyatını bul
        3. Çoklu varyant ürünler → İsme göre varyant seç
        """
        
        goal_name_lower = goal_name.lower().strip()
        
        # Anahtar kelimeler çıkar (e-3008 → e3008, 3008)
        keywords = self._extract_keywords(goal_name_lower)
        
        print(f"🔍 Smart matching for: {goal_name} (keywords: {keywords})")
        
        # Strategy 1: Sahibinden için özel
        if 'sahibinden.com' in url:
            return self._parse_sahibinden(soup, url, keywords)
        
        # Strategy 2: Tablo parse et (fiyat listesi)
        table_result = self._parse_price_table(soup, url, keywords)
        if table_result:
            return table_result
        
        # Strategy 3: Liste parse et (ul/li yapısı)
        list_result = self._parse_product_list(soup, url, keywords)
        if list_result:
            return list_result
        
        # Strategy 4: Genel text matching
        text_result = self._parse_text_matching(soup, url, keywords)
        if text_result:
            return text_result
        
        return None
    
    def _extract_keywords(self, text: str) -> List[str]:
        """Anahtar kelimeleri çıkar"""
        # Noktalama işaretlerini temizle
        cleaned = re.sub(r'[^\w\s]', '', text)
        
        # Kelimeleri ayır
        words = cleaned.split()
        
        # Sayıları ve özel karakterleri koru
        keywords = [text.replace('-', '').replace(' ', '')]  # e-3008 → e3008
        keywords.extend(words)  # ['e', '3008']
        keywords.append(text)  # 'e-3008'
        
        return list(set([k.lower() for k in keywords if len(k) > 1]))
    
    def _parse_sahibinden(self, soup: BeautifulSoup, url: str, keywords: List[str]) -> Optional[Dict]:
        """Sahibinden.com özel parsing"""
        
        # İlan fiyatı (Sahibinden)
        price_elem = soup.find('h3') or soup.find('div', class_='price')
        if not price_elem:
            # Alternatif selector'lar
            price_elem = soup.find('span', class_=re.compile(r'price|fiyat', re.I))
        
        if price_elem:
            price_text = price_elem.get_text(strip=True)
            price_match = re.search(r'(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)', price_text)
            
            if price_match:
                price_str = price_match.group(1).replace('.', '').replace(',', '.')
                try:
                    price = float(price_str)
                    
                    # İlan başlığı
                    title_elem = soup.find('h1') or soup.find('title')
                    product_name = title_elem.get_text(strip=True) if title_elem else 'İlan'
                    
                    return {
                        'url': url,
                        'price': round(price, 2),
                        'product_name': product_name[:100],
                        'currency': 'TRY',
                        'scraped_at': datetime.now().isoformat(),
                        'method': 'smart_match_sahibinden',
                        'success': True
                    }
                except ValueError:
                    pass
        
        return None
    
    def _parse_price_table(self, soup: BeautifulSoup, url: str, keywords: List[str]) -> Optional[Dict]:
        """HTML tablolardan fiyat listesi parse et"""
        
        tables = soup.find_all('table')
        
        for table in tables:
            rows = table.find_all('tr')
            
            for row in rows:
                # Satır metnini al
                row_text = row.get_text().lower()
                
                # Anahtar kelimelerden biri eşleşiyor mu?
                if any(keyword in row_text for keyword in keywords):
                    # Bu satırdaki tüm hücreleri al
                    cells = row.find_all(['td', 'th'])
                    
                    # İlk hücreyi model adı olarak al
                    model_name = cells[0].get_text(strip=True) if cells else 'Model'
                    
                    # Diğer hücrelerde fiyat ara (ilk hücreyi atla)
                    for cell in cells[1:]:  # İlk hücreyi atla
                        cell_text = cell.get_text(strip=True)
                        
                        # Önce TL/₺ ile biten tam fiyatları ara
                        full_price_match = re.search(r'(\d{1,3}(?:\.\d{3})+)\s*(?:TL|₺)', cell_text)
                        
                        price = None
                        if full_price_match:
                            # Türk formatı: 1.250.000 TL
                            price_str = full_price_match.group(1).replace('.', '')
                            try:
                                price = float(price_str)
                            except:
                                pass
                        
                        # Eğer bulunamadıysa alternatif pattern'ler dene
                        if not price:
                            price_patterns = [
                                r'(\d{4,})',  # 1250000 (nokta olmadan)
                            ]
                            
                            for pattern in price_patterns:
                                price_match = re.search(pattern, cell_text)
                                if price_match:
                                    try:
                                        price = float(price_match.group(1))
                                        if 100 <= price <= 10000000:
                                            break
                                    except ValueError:
                                        continue
                        
                        if price and 100 <= price <= 10000000:
                            return {
                                'url': url,
                                'price': round(price, 2),
                                'product_name': model_name[:100],
                                'currency': 'TRY',
                                'scraped_at': datetime.now().isoformat(),
                                'method': 'smart_match_table',
                                'success': True,
                                'matched_keywords': keywords
                            }
        
        return None
    
    def _parse_product_list(self, soup: BeautifulSoup, url: str, keywords: List[str]) -> Optional[Dict]:
        """Liste yapılarından (ul/li) ürün parse et"""
        
        lists = soup.find_all(['ul', 'ol', 'div'], class_=re.compile(r'product|item|list', re.I))
        
        for product_list in lists:
            items = product_list.find_all(['li', 'div'], recursive=False)
            
            for item in items:
                item_text = item.get_text().lower()
                
                # Keyword match
                if any(keyword in item_text for keyword in keywords):
                    # Fiyat ara
                    price_elem = item.find(['span', 'div', 'p'], class_=re.compile(r'price|fiyat', re.I))
                    
                    if price_elem:
                        price_text = price_elem.get_text(strip=True)
                        price_match = re.search(r'(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)', price_text)
                        
                        if price_match:
                            try:
                                price_str = price_match.group(1).replace('.', '').replace(',', '.')
                                price = float(price_str)
                                
                                if 100 <= price <= 10000000:
                                    # Ürün adı
                                    name_elem = item.find(['h1', 'h2', 'h3', 'h4', 'a'])
                                    product_name = name_elem.get_text(strip=True) if name_elem else 'Ürün'
                                    
                                    return {
                                        'url': url,
                                        'price': round(price, 2),
                                        'product_name': product_name[:100],
                                        'currency': 'TRY',
                                        'scraped_at': datetime.now().isoformat(),
                                        'method': 'smart_match_list',
                                        'success': True
                                    }
                            except ValueError:
                                continue
        
        return None
    
    def _parse_text_matching(self, soup: BeautifulSoup, url: str, keywords: List[str]) -> Optional[Dict]:
        """Genel text matching - tüm sayfa içinde ara"""
        
        # Tüm text'i al
        page_text = soup.get_text()
        lines = page_text.split('\n')
        
        # Her satırı kontrol et
        for i, line in enumerate(lines):
            line_lower = line.lower().strip()
            
            # Keyword eşleşmesi var mı?
            if any(keyword in line_lower for keyword in keywords):
                # Bu satır ve sonraki 3 satırda fiyat ara
                search_lines = lines[i:i+4]
                search_text = ' '.join(search_lines)
                
                price_matches = re.findall(r'(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)\s*(?:TL|₺)', search_text)
                
                if price_matches:
                    for match in price_matches:
                        try:
                            price_str = match.replace('.', '').replace(',', '.')
                            price = float(price_str)
                            
                            if 100 <= price <= 10000000:
                                return {
                                    'url': url,
                                    'price': round(price, 2),
                                    'product_name': line.strip()[:100],
                                    'currency': 'TRY',
                                    'scraped_at': datetime.now().isoformat(),
                                    'method': 'smart_match_text',
                                    'success': True
                                }
                        except ValueError:
                            continue
        
        return None


# Global instance
product_scraper = ProductScraper()
