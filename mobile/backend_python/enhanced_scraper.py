"""
Enhanced Product Scraper with Multiple Strategies
Strategy 1: CloudScraper (Anti-bot bypass)
Strategy 2: Direct Requests
Strategy 3: ScraperAPI (fallback - requires API key)
"""
import os
from product_scraper import ProductScraper

class EnhancedProductScraper(ProductScraper):
    """Multiple scraping strategies for better success rate"""
    
    def __init__(self):
        super().__init__()
        self.strategies = [
            ('cloudscraper', self._scrape_with_cloudscraper),
            ('direct', self._scrape_direct),
            ('api_proxy', self._scrape_with_proxy)
        ]
    
    def scrape_with_retry(self, url: str, max_retries: int = 2):
        """Try multiple strategies until one succeeds"""
        
        for retry in range(max_retries):
            for strategy_name, strategy_func in self.strategies:
                try:
                    print(f"Trying strategy: {strategy_name} (attempt {retry + 1})")
                    result = strategy_func(url)
                    
                    if result and result.get('success'):
                        result['strategy_used'] = strategy_name
                        return result
                        
                except Exception as e:
                    print(f"Strategy {strategy_name} failed: {e}")
                    continue
        
        # All strategies failed
        return {
            'success': False,
            'error': 'Tüm yöntemler başarısız oldu. Lütfen fiyatı manuel girin.',
            'url': url
        }
    
    def _scrape_with_cloudscraper(self, url: str):
        """Strategy 1: CloudScraper"""
        try:
            import cloudscraper
            scraper = cloudscraper.create_scraper(
                browser={'browser': 'chrome', 'platform': 'windows', 'mobile': False}
            )
            response = scraper.get(url, timeout=25)
            response.raise_for_status()
            
            # Use parent class logic for parsing
            return self._parse_html_content(response.content, url)
            
        except Exception as e:
            raise Exception(f"CloudScraper failed: {str(e)}")
    
    def _scrape_direct(self, url: str):
        """Strategy 2: Direct requests with good headers"""
        import requests
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Cache-Control': 'max-age=0'
        }
        
        session = requests.Session()
        session.headers.update(headers)
        
        response = session.get(url, timeout=25, allow_redirects=True)
        response.raise_for_status()
        
        return self._parse_html_content(response.content, url)
    
    def _scrape_with_proxy(self, url: str):
        """Strategy 3: ScraperAPI (requires API key)"""
        scraper_api_key = os.environ.get('SCRAPER_API_KEY')
        
        if not scraper_api_key:
            raise Exception("ScraperAPI key not configured")
        
        import requests
        
        # ScraperAPI endpoint
        api_url = 'http://api.scraperapi.com'
        params = {
            'api_key': scraper_api_key,
            'url': url,
            'render': 'false'
        }
        
        response = requests.get(api_url, params=params, timeout=30)
        response.raise_for_status()
        
        return self._parse_html_content(response.content, url)
    
    def _parse_html_content(self, html_content: bytes, url: str):
        """Parse HTML and extract price (reuse parent logic)"""
        from bs4 import BeautifulSoup
        import re
        from datetime import datetime
        
        soup = BeautifulSoup(html_content, 'html.parser')
        
        price = None
        product_name = None
        
        # Site-specific selectors (same as parent)
        if 'hepsiburada.com' in url:
            price_selectors = [
                {'data-bind': 'markupText:CurrentPriceText'},
                {'class': 'price'},
                {'itemprop': 'price'},
                {'data-test': 'price'}
            ]
            for selector in price_selectors:
                price_elem = soup.find('span', selector)
                if price_elem:
                    break
            name_elem = soup.find('h1', id='product-name') or soup.find('h1', class_='product-name')
        
        elif 'trendyol.com' in url:
            price_selectors = [
                {'class': 'prc-dsc'},
                {'class': 'product-price'},
                {'class': re.compile(r'price')}
            ]
            for selector in price_selectors:
                price_elem = soup.find('span', selector)
                if price_elem:
                    break
            name_elem = soup.find('h1', class_='pr-new-br') or soup.find('h1')
        
        elif 'n11.com' in url:
            price_elem = soup.find('ins') or soup.find('span', class_='newPrice')
            name_elem = soup.find('h1', class_='proDetailTitle') or soup.find('h1')
        
        elif 'amazon.com.tr' in url:
            price_elem = soup.find('span', class_='a-price-whole') or soup.find('span', id='priceblock_ourprice')
            name_elem = soup.find('span', id='productTitle') or soup.find('h1', id='title')
        
        else:
            # Generic patterns
            price_patterns = [
                {'class': re.compile(r'price|fiyat|tutar|amount', re.I)},
                {'id': re.compile(r'price|fiyat|tutar|amount', re.I)},
                {'itemprop': 'price'}
            ]
            for pattern in price_patterns:
                price_elem = soup.find(['span', 'div', 'ins', 'p', 'strong'], pattern)
                if price_elem:
                    break
            name_elem = soup.find('h1') or soup.find('title')
        
        # Extract price
        if price_elem:
            price_text = price_elem.get_text(strip=True)
            price_text = re.sub(r'[^\d.,]', '', price_text)
            price_text = price_text.replace('.', '').replace(',', '.')
            try:
                price = float(price_text)
            except ValueError:
                pass
        
        # Extract product name
        if name_elem:
            product_name = name_elem.get_text(strip=True)
            if len(product_name) > 100:
                product_name = product_name[:100] + '...'
        
        # Fallback: search in page text
        if not price:
            page_text = soup.get_text()
            matches = re.findall(r'(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)\s*(?:TL|₺)', page_text)
            if matches:
                prices = []
                for match in matches:
                    try:
                        clean_price = match.replace('.', '').replace(',', '.')
                        price_val = float(clean_price)
                        if 100 <= price_val <= 10000000:
                            prices.append(price_val)
                    except:
                        pass
                if prices:
                    prices.sort()
                    price = prices[len(prices)//2]
        
        if price and price > 0:
            return {
                'url': url,
                'price': round(price, 2),
                'product_name': product_name or 'Ürün',
                'currency': 'TRY',
                'scraped_at': datetime.now().isoformat(),
                'method': 'enhanced_multi_strategy',
                'success': True
            }
        else:
            return {
                'success': False,
                'error': 'Fiyat bulunamadı.',
                'url': url
            }


# Global enhanced instance
enhanced_scraper = EnhancedProductScraper()
