"""
AI Akıllı Yatırım Danışmanı Servisi
Piyasa verilerini analiz ederek optimal birikim stratejisi önerir
"""

import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import json
from anthropic import Anthropic

# Market data için import
try:
    from market_data_api import market_data_api
except:
    market_data_api = None

class SmartInvestmentAdvisor:
    """AI Destekli Akıllı Yatırım Danışmanı"""
    
    def __init__(self):
        self.anthropic_key = os.environ.get('ANTHROPIC_API_KEY', '')
        if self.anthropic_key:
            self.client = Anthropic(api_key=self.anthropic_key)
        else:
            self.client = None
        print(f"🤖 SmartInvestmentAdvisor initialized - AI: {'✓' if self.client else '✗'}")
    
    def get_market_analysis(self) -> Dict:
        """Güncel piyasa verilerini al ve analiz et"""
        try:
            if market_data_api:
                currencies = market_data_api.get_currency_rates()
                gold = market_data_api.get_gold_prices()
                summary = market_data_api.get_market_summary()
            else:
                # Fallback veriler
                currencies = {'USD': 35.20, 'EUR': 38.50, 'GBP': 44.80}
                gold = {'gram_gold': 3150, 'gram_silver': 38, 'quarter_gold': 5100}
                summary = {'inflation': {'annual_inflation': 45}}
            
            # Piyasa trend analizi (basit momentum)
            trends = self._analyze_trends(currencies, gold)
            
            return {
                'currencies': {
                    'USD': {'price': currencies.get('USD', 35.20), 'trend': trends.get('USD', 'stable')},
                    'EUR': {'price': currencies.get('EUR', 38.50), 'trend': trends.get('EUR', 'stable')},
                    'GBP': {'price': currencies.get('GBP', 44.80), 'trend': trends.get('GBP', 'stable')},
                },
                'metals': {
                    'gold': {'price': gold.get('gram_gold', 3150), 'unit': 'gram', 'trend': trends.get('gold', 'up')},
                    'silver': {'price': gold.get('gram_silver', 38), 'unit': 'gram', 'trend': trends.get('silver', 'stable')},
                    'quarter_gold': {'price': gold.get('quarter_gold', 5100), 'unit': 'adet', 'trend': trends.get('gold', 'up')},
                },
                'inflation_rate': summary.get('inflation', {}).get('annual_inflation', 45),
                'timestamp': datetime.now().isoformat()
            }
        except Exception as e:
            print(f"Market analysis error: {e}")
            return self._get_fallback_market_data()
    
    def _analyze_trends(self, currencies: Dict, gold: Dict) -> Dict:
        """Basit trend analizi (gerçek uygulamada geçmiş verilere bakılır)"""
        # Bu basit bir simülasyon - gerçekte geçmiş verilere bakılır
        import random
        trends = {}
        for key in ['USD', 'EUR', 'GBP', 'gold', 'silver']:
            r = random.random()
            if r < 0.3:
                trends[key] = 'down'
            elif r < 0.6:
                trends[key] = 'stable'
            else:
                trends[key] = 'up'
        return trends
    
    def _get_fallback_market_data(self) -> Dict:
        """Fallback piyasa verileri"""
        return {
            'currencies': {
                'USD': {'price': 35.20, 'trend': 'stable'},
                'EUR': {'price': 38.50, 'trend': 'up'},
                'GBP': {'price': 44.80, 'trend': 'stable'},
            },
            'metals': {
                'gold': {'price': 3150, 'unit': 'gram', 'trend': 'up'},
                'silver': {'price': 38, 'unit': 'gram', 'trend': 'stable'},
                'quarter_gold': {'price': 5100, 'unit': 'adet', 'trend': 'up'},
            },
            'inflation_rate': 45,
            'timestamp': datetime.now().isoformat()
        }
    
    async def generate_smart_investment_plan(
        self,
        target_amount: float,
        product_name: str,
        monthly_income: float,
        monthly_expenses: float,
        risk_tolerance: str = 'medium',  # low, medium, high
        existing_savings: float = 0
    ) -> Dict:
        """
        AI destekli akıllı yatırım planı oluştur
        """
        # Piyasa verilerini al
        market_data = self.get_market_analysis()
        
        # Aylık tasarruf kapasitesi
        monthly_savings_capacity = monthly_income - monthly_expenses
        if monthly_savings_capacity <= 0:
            monthly_savings_capacity = monthly_income * 0.1  # En az %10
        
        # Kalan hedef tutar
        remaining_target = target_amount - existing_savings
        
        # AI ile analiz yap
        if self.client:
            ai_plan = await self._get_ai_investment_plan(
                target_amount=target_amount,
                remaining_target=remaining_target,
                product_name=product_name,
                monthly_savings=monthly_savings_capacity,
                market_data=market_data,
                risk_tolerance=risk_tolerance,
                existing_savings=existing_savings
            )
        else:
            ai_plan = self._get_rule_based_plan(
                target_amount=target_amount,
                remaining_target=remaining_target,
                monthly_savings=monthly_savings_capacity,
                market_data=market_data,
                risk_tolerance=risk_tolerance
            )
        
        return {
            'success': True,
            'plan': ai_plan,
            'market_data': market_data,
            'user_profile': {
                'target_amount': target_amount,
                'product_name': product_name,
                'monthly_savings_capacity': monthly_savings_capacity,
                'existing_savings': existing_savings,
                'remaining_target': remaining_target,
                'risk_tolerance': risk_tolerance
            }
        }
    
    async def _get_ai_investment_plan(
        self,
        target_amount: float,
        remaining_target: float,
        product_name: str,
        monthly_savings: float,
        market_data: Dict,
        risk_tolerance: str,
        existing_savings: float
    ) -> Dict:
        """Claude AI ile yatırım planı oluştur"""
        
        prompt = f"""Sen bir Türk bankası yatırım danışmanısın. Müşteriye {product_name} almak için optimal birikim ve yatırım stratejisi önereceksin.

## MÜŞTERİ BİLGİLERİ:
- Hedef Tutar: {target_amount:,.0f} TL
- Mevcut Birikim: {existing_savings:,.0f} TL
- Kalan Hedef: {remaining_target:,.0f} TL
- Aylık Tasarruf Kapasitesi: {monthly_savings:,.0f} TL
- Risk Toleransı: {risk_tolerance}

## GÜNCEL PİYASA VERİLERİ:
- Dolar: {market_data['currencies']['USD']['price']:.2f} TL (Trend: {market_data['currencies']['USD']['trend']})
- Euro: {market_data['currencies']['EUR']['price']:.2f} TL (Trend: {market_data['currencies']['EUR']['trend']})
- Sterlin: {market_data['currencies']['GBP']['price']:.2f} TL (Trend: {market_data['currencies']['GBP']['trend']})
- Gram Altın: {market_data['metals']['gold']['price']:,.0f} TL (Trend: {market_data['metals']['gold']['trend']})
- Gram Gümüş: {market_data['metals']['silver']['price']:.0f} TL (Trend: {market_data['metals']['silver']['trend']})
- Yıllık Enflasyon: %{market_data['inflation_rate']:.1f}

## GÖREV:
Aşağıdaki JSON formatında bir yatırım planı oluştur:

{{
  "strategy_name": "Strateji adı",
  "summary": "1-2 cümlelik özet",
  "total_duration_months": sayı,
  "phases": [
    {{
      "phase_number": 1,
      "name": "Faz adı",
      "duration_months": sayı,
      "description": "Ne yapılacak",
      "monthly_allocation": {{
        "tl_savings": yüzde,
        "gold": yüzde,
        "usd": yüzde,
        "eur": yüzde
      }},
      "expected_return_percent": sayı,
      "reasoning": "Neden bu strateji"
    }}
  ],
  "investment_breakdown": {{
    "tl_savings_total": tutar,
    "gold_total": tutar,
    "usd_total": tutar,
    "eur_total": tutar,
    "bank_loan_needed": tutar
  }},
  "expected_outcome": {{
    "total_savings_at_end": tutar,
    "estimated_profit_from_investments": tutar,
    "loan_amount_needed": tutar,
    "loan_recommendation": "Kredi önerisi açıklaması"
  }},
  "risk_analysis": {{
    "level": "low/medium/high",
    "main_risks": ["risk1", "risk2"],
    "mitigation": "Risk azaltma önerisi"
  }},
  "tips": ["Öneri 1", "Öneri 2", "Öneri 3"]
}}

ÖNEMLİ KURALLAR:
1. Enflasyonu yenmek için yatırım öner (en az enflasyon oranı kadar getiri hedefle)
2. Trend "up" olan varlıklara daha fazla ağırlık ver
3. Risk toleransına göre dağılım ayarla (low: daha fazla altın/TL, high: daha fazla döviz)
4. Birikim süresini makul tut (6-24 ay arası)
5. Hedefe ulaşılamayacaksa banka kredisi öner ve miktarını belirt
6. Türkçe yaz

Sadece JSON döndür, başka bir şey yazma."""

        try:
            response = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=2000,
                messages=[{"role": "user", "content": prompt}]
            )
            
            result_text = response.content[0].text.strip()
            
            # JSON parse
            if result_text.startswith('```'):
                result_text = result_text.split('```')[1]
                if result_text.startswith('json'):
                    result_text = result_text[4:]
            
            plan = json.loads(result_text)
            plan['ai_generated'] = True
            return plan
            
        except Exception as e:
            print(f"AI plan generation error: {e}")
            return self._get_rule_based_plan(
                target_amount, remaining_target, monthly_savings, market_data, risk_tolerance
            )
    
    def _get_rule_based_plan(
        self,
        target_amount: float,
        remaining_target: float,
        monthly_savings: float,
        market_data: Dict,
        risk_tolerance: str
    ) -> Dict:
        """Kural tabanlı yatırım planı (AI yoksa fallback)"""
        
        # Basit süre hesaplama
        months_needed = int(remaining_target / monthly_savings) + 1 if monthly_savings > 0 else 24
        months_needed = min(max(months_needed, 6), 36)  # 6-36 ay arası
        
        # Risk toleransına göre dağılım
        if risk_tolerance == 'low':
            allocation = {'tl_savings': 40, 'gold': 40, 'usd': 10, 'eur': 10}
        elif risk_tolerance == 'high':
            allocation = {'tl_savings': 20, 'gold': 30, 'usd': 30, 'eur': 20}
        else:  # medium
            allocation = {'tl_savings': 30, 'gold': 35, 'usd': 20, 'eur': 15}
        
        # Toplam birikim hesapla
        total_savings = monthly_savings * months_needed
        estimated_return = total_savings * 0.15  # Tahmini %15 getiri
        final_amount = total_savings + estimated_return
        
        loan_needed = max(0, remaining_target - final_amount)
        
        return {
            'strategy_name': f'{risk_tolerance.capitalize()} Riskli Karma Yatırım Planı',
            'summary': f'{months_needed} ay boyunca aylık {monthly_savings:,.0f} TL birikim yaparak hedefinize ulaşabilirsiniz.',
            'total_duration_months': months_needed,
            'phases': [
                {
                    'phase_number': 1,
                    'name': 'Birikim Fazı',
                    'duration_months': months_needed,
                    'description': f'Her ay {monthly_savings:,.0f} TL biriktirin ve yatırımlara dağıtın',
                    'monthly_allocation': allocation,
                    'expected_return_percent': 15,
                    'reasoning': 'Enflasyonu yenmek için çeşitlendirilmiş portföy'
                }
            ],
            'investment_breakdown': {
                'tl_savings_total': total_savings * allocation['tl_savings'] / 100,
                'gold_total': total_savings * allocation['gold'] / 100,
                'usd_total': total_savings * allocation['usd'] / 100,
                'eur_total': total_savings * allocation['eur'] / 100,
                'bank_loan_needed': loan_needed
            },
            'expected_outcome': {
                'total_savings_at_end': final_amount,
                'estimated_profit_from_investments': estimated_return,
                'loan_amount_needed': loan_needed,
                'loan_recommendation': 'Düşük faizli ihtiyaç kredisi önerilir' if loan_needed > 0 else 'Kredi gerekmeyecek'
            },
            'risk_analysis': {
                'level': risk_tolerance,
                'main_risks': ['Döviz kuru dalgalanması', 'Altın fiyat değişimi'],
                'mitigation': 'Düzenli alım yaparak ortalama maliyet stratejisi uygulayın'
            },
            'tips': [
                'Her ay düzenli olarak belirlenen miktarı yatırın',
                'Altın alımlarını gram altın olarak yapın',
                'Döviz alımlarını bölerek yapın (DCA stratejisi)',
                'Piyasaları takip edin, büyük düşüşlerde ekstra alım yapın'
            ],
            'ai_generated': False
        }


# Singleton instance
smart_advisor = SmartInvestmentAdvisor()
