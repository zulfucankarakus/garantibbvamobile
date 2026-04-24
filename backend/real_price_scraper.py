"""
🛒 Real Price Scraper - Google Custom Search + ScraperAPI
Gerçek e-ticaret sitelerinden gerçek fiyatlar!
"""

import os
import requests
from bs4 import BeautifulSoup
import re
from typing import Dict, List, Optional
import urllib.parse
import json
from concurrent.futures import ThreadPoolExecutor
import asyncio

SCRAPERAPI_KEY = os.getenv('SCRAPERAPI_KEY')
GOOGLE_SEARCH_API_KEY = os.getenv('GOOGLE_SEARCH_API_KEY')


class RealPriceScraper:
    """Google Shopping + ScraperAPI ile gerçek fiyat çekme"""
    
    def __init__(self):
        self.scraper_api_key = SCRAPERAPI_KEY
        self.google_api_key = GOOGLE_SEARCH_API_KEY
        self.timeout = 15
        
        print("🛒 Real Price Scraper initialized")
        print(f"   - ScraperAPI: {'✅' if self.scraper_api_key else '❌'}")
        print(f"   - Google Search: {'✅' if self.google_api_key else '❌'}")
    
    async def get_real_prices(self, product_name: str, category: str = 'electronics') -> Dict:
        """
        Google Custom Search ile ürünü ara, gerçek fiyatları çek
        """
        print(f"\n🔍 Searching REAL prices for: {product_name}")
        
        try:
            # 1. Google Custom Search ile ürün ara
            search_results = await self._google_custom_search(product_name)
            
            if not search_results:
                print("   ⚠️ No search results, using fallback")
                return self._fallback_response(product_name, category)
            
            # 2. E-ticaret sitelerini filtrele
            ecommerce_urls = self._filter_ecommerce_urls(search_results)
            
            print(f"   📦 Found {len(ecommerce_urls)} e-commerce URLs")
            
            if not ecommerce_urls:
                return self._fallback_response(product_name, category)
            
            # 3. ScraperAPI ile gerçek fiyatları çek (paralel)
            results = await self._scrape_with_scraperapi(ecommerce_urls[:10], product_name)
            
            # 4. En az 3 sonuç varsa başarılı, değilse fallback
            if len(results) >= 3:
                prices = [r['price'] for r in results]
                
                print(f"   ✅ SUCCESS! Found {len(results)} real prices")
                
                return {
                    'success': True,
                    'product_name': product_name,
                    'results': results[:5],  # İlk 5 sonuç
                    'statistics': {
                        'average_price': round(sum(prices[:5]) / min(len(prices), 5), 2),
                        'min_price': round(min(prices[:5]), 2),
                        'max_price': round(max(prices[:5]), 2),
                        'cheapest_site': min(results[:5], key=lambda x: x['price'])['site'],
                        'cheapest_price': min(prices[:5]),
                        'total_sites': len(results[:5])
                    },
                    'estimated': False,  # GERÇEK FİYATLAR!
                    'source': 'google_shopping'
                }
            else:
                print(f"   ⚠️ Only {len(results)} prices found, using fallback")
                return self._fallback_response(product_name, category)
                
        except Exception as e:
            print(f"   ❌ Error: {e}")
            return self._fallback_response(product_name, category)
    
    async def _google_custom_search(self, product_name: str) -> List[Dict]:
        """
        Google Custom Search API ile ürün ara
        """
        try:
            # Search query
            query = f"{product_name} fiyat satın al site:hepsiburada.com OR site:n11.com OR site:trendyol.com OR site:amazon.com.tr OR site:vatan.com"
            
            url = "https://www.googleapis.com/customsearch/v1"
            params = {
                'key': self.google_api_key,
                'q': query,
                'num': 10,  # İlk 10 sonuç
                'gl': 'tr',  # Türkiye
                'lr': 'lang_tr'  # Türkçe
            }
            
            response = requests.get(url, params=params, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                items = data.get('items', [])
                
                print(f"   🔍 Google found {len(items)} results")
                
                return [
                    {
                        'url': item.get('link', ''),
                        'title': item.get('title', ''),
                        'snippet': item.get('snippet', '')
                    }
                    for item in items
                ]
            else:
                print(f"   ❌ Google Search error: {response.status_code}")
                return []
                
        except Exception as e:
            print(f"   ❌ Google Search error: {e}")
            return []
    
    def _filter_ecommerce_urls(self, search_results: List[Dict]) -> List[str]:
        """E-ticaret URL'lerini filtrele"""
        ecommerce_sites = [
            'hepsiburada.com', 'n11.com', 'trendyol.com', 
            'amazon.com.tr', 'vatan.com', 'teknosa.com',
            'mediamarkt.com.tr', 'gittigidiyor.com'
        ]
        
        urls = []
        for result in search_results:
            url = result['url']
            # E-ticaret sitesi mi kontrol et
            if any(site in url for site in ecommerce_sites):
                # Arama sayfası değil, ürün sayfası olmalı
                if '/ara?' not in url and '/search?' not in url and '/arama?' not in url:
                    urls.append(url)
        
        return urls
    
    async def _scrape_with_scraperapi(self, urls: List[str], product_name: str) -> List[Dict]:
        """
        ScraperAPI ile bot korumasını aşarak fiyat çek
        """
        results = []
        
        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = []
            
            for url in urls:
                future = executor.submit(self._scrape_single_url, url, product_name)
                futures.append(future)
            
            for future in futures:
                try:
                    result = future.result(timeout=self.timeout)
                    if result:
                        results.append(result)
                except Exception as e:
                    print(f"   ⚠️ Scraping failed: {str(e)[:50]}")
        
        return results
    
    def _scrape_single_url(self, url: str, product_name: str) -> Optional[Dict]:
        """
        ScraperAPI kullanarak tek URL'den fiyat çek
        """
        try:
            # ScraperAPI URL
            scraper_url = f"http://api.scraperapi.com?api_key={self.scraper_api_key}&url={urllib.parse.quote(url)}&render=true"
            
            print(f"   🤖 Scraping: {url[:60]}...")
            
            response = requests.get(scraper_url, timeout=self.timeout)
            
            if response.status_code != 200:
                print(f"   ❌ Status: {response.status_code}")
                return None
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Site adını çıkar
            from urllib.parse import urlparse
            site_name = urlparse(url).netloc.replace('www.', '').split('.')[0].title()
            
            # Fiyat çıkarma - Çoklu strateji
            price = self._extract_price_multistra(soup, url)
            
            if price and price > 0:
                # Başlık çıkar
                title = soup.find('title')
                page_title = title.get_text()[:100] if title else product_name
                
                print(f"   ✅ {site_name}: {price:,.0f} TL")
                
                return {
                    'site': site_name,
                    'price': price,
                    'currency': 'TRY',
                    'product_title': page_title,
                    'url': url,
                    'available': True,
                    'source': 'scraperapi'
                }
            
            return None
            
        except Exception as e:
            print(f"   ❌ Error: {str(e)[:50]}")
            return None
    
    def _extract_price_multistrategy(self, soup: BeautifulSoup, url: str) -> Optional[float]:
        """Çoklu strateji ile fiyat çıkar"""
        
        # Strateji 1: Site-specific selectors
        if 'hepsiburada.com' in url:
            price_elem = soup.find('span', {'data-bind': 'markupText:currentPriceBeforePoint'})
            if price_elem:
                price_text = price_elem.get_text()
                next_elem = soup.find('span', {'data-bind': 'markupText:currentPriceAfterPoint'})
                if next_elem:
                    price_text += ',' + next_elem.get_text()
                return self._parse_price(price_text)
        
        elif 'n11.com' in url:
            price_elem = soup.find('ins', class_='newPrice')
            if price_elem:
                return self._parse_price(price_elem.get_text())
        
        elif 'trendyol.com' in url:
            price_elem = soup.find('span', class_='prc-dsc')
            if not price_elem:
                price_elem = soup.find('span', class_='prc-slg')
            if price_elem:
                return self._parse_price(price_elem.get_text())
        
        # Strateji 2: Meta tags
        price_meta = soup.find('meta', {'property': 'product:price:amount'})
        if price_meta:
            price = self._parse_price(price_meta.get('content', ''))
            if price:
                return price
        
        # Strateji 3: JSON-LD
        for script in soup.find_all('script', {'type': 'application/ld+json'}):
            try:
                data = json.loads(script.string)
                if isinstance(data, dict):
                    # Product schema
                    if 'offers' in data:
                        price_str = str(data['offers'].get('price', ''))
                        price = self._parse_price(price_str)
                        if price:
                            return price
            except:
                pass
        
        # Strateji 4: Common class patterns
        for pattern in ['price', 'fiyat', 'prc', 'tutar', 'amount']:
            elems = soup.find_all(class_=re.compile(pattern, re.I))
            for elem in elems[:10]:
                price = self._parse_price(elem.get_text())
                if price and 50 < price < 100000000:
                    return price
        
        return None
    
    def _parse_price(self, text: str) -> Optional[float]:
        """Fiyat parse et"""
        try:
            text = text.replace('TL', '').replace('₺', '').replace(' ', '').strip()
            
            # Türkçe format: 1.234,56
            if ',' in text:
                text = text.replace('.', '').replace(',', '.')
            elif text.count('.') > 1:
                text = text.replace('.', '')
            
            price = float(re.sub(r'[^\d.]', '', text))
            return price if price > 0 else None
        except:
            return None
    
    def _fallback_response(self, product_name: str, category: str) -> Dict:
        """Fallback - Gerçek fiyat çekilemezse kullanıcıya bilgi ver"""
        return {
            'success': False,
            'error': 'real_prices_unavailable',
            'message': '⚠️ Gerçek fiyatlar şu anda çekilemiyor. Lütfen manuel olarak arama yapın veya daha sonra tekrar deneyin.',
            'product_name': product_name,
            'results': [],
            'statistics': {},
            'estimated': False,
            'recommendation': f'"{product_name}" için Hepsiburada, N11 veya Trendyol\'da manuel arama yapabilirsiniz.'
        }


# Singleton
real_price_scraper = RealPriceScraper()
