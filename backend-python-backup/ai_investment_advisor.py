"""
AI Investment Advisor - Yapay Zeka Tabanlı Dinamik Yatırım Danışmanı
Piyasa koşullarına göre optimal portföy dağılımı önerir

Features:
- LLM (Gemini) ile akıllı yatırım dağılımı
- Piyasa verilerine göre dinamik analiz
- Enflasyon, faiz, döviz kuru analizi
- Kişiselleştirilmiş öneriler
"""
import os
import json
from typing import Dict, List, Optional, Any
from datetime import datetime
import asyncio

try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False


class AIInvestmentAdvisor:
    """AI tabanlı dinamik yatırım danışmanı"""
    
    def __init__(self):
        self.api_key = os.environ.get('GEMINI_API_KEY')
        self.model = None
        
        if self.api_key and GEMINI_AVAILABLE:
            try:
                genai.configure(api_key=self.api_key)
                self.model = genai.GenerativeModel('gemini-2.0-flash')
            except Exception as e:
                print(f"Gemini initialization error: {e}")
                self.model = None
        
        # Güncel piyasa parametreleri (gerçek API'den alınabilir)
        self.market_data = {
            "tl_deposit_rate": 45.0,      # TL mevduat faizi %
            "annual_inflation": 50.0,      # Yıllık enflasyon %
            "usd_yearly_change": 35.0,     # Dolar yıllık değişim %
            "eur_yearly_change": 30.0,     # Euro yıllık değişim %
            "gold_yearly_change": 55.0,    # Altın yıllık değişim %
            "usd_rate": 34.50,            # Güncel USD/TRY
            "eur_rate": 37.80,            # Güncel EUR/TRY
            "gold_gram_price": 3250.0,    # Gram altın fiyatı TL
            "policy_rate": 50.0,          # TCMB politika faizi
        }
        
        # Varlık özellikleri
        self.asset_properties = {
            "tl_savings": {
                "name": "TL Birikim",
                "emoji": "💰",
                "risk_level": "low",
                "liquidity": "high",
                "inflation_hedge": False,
                "expected_return": 45.0
            },
            "gold": {
                "name": "Altın",
                "emoji": "🥇",
                "risk_level": "medium",
                "liquidity": "high",
                "inflation_hedge": True,
                "expected_return": 55.0
            },
            "usd": {
                "name": "Dolar",
                "emoji": "💵",
                "risk_level": "medium",
                "liquidity": "high",
                "inflation_hedge": True,
                "expected_return": 35.0
            },
            "eur": {
                "name": "Euro",
                "emoji": "💶",
                "risk_level": "medium",
                "liquidity": "high",
                "inflation_hedge": True,
                "expected_return": 30.0
            }
        }
    
    def update_market_data(self, new_data: Dict[str, float]):
        """Piyasa verilerini güncelle"""
        self.market_data.update(new_data)
    
    def _calculate_optimal_allocation_rule_based(
        self,
        target_amount: float,
        duration_months: int,
        risk_profile: str,
        current_market: Dict[str, float]
    ) -> Dict[str, Any]:
        """
        Kural tabanlı optimal dağılım hesapla
        (AI kullanılamazsa fallback)
        """
        inflation = current_market.get("annual_inflation", 50.0)
        deposit_rate = current_market.get("tl_deposit_rate", 45.0)
        gold_return = current_market.get("gold_yearly_change", 55.0)
        usd_return = current_market.get("usd_yearly_change", 35.0)
        eur_return = current_market.get("eur_yearly_change", 30.0)
        
        # Enflasyon vs getiri analizi
        tl_real_return = deposit_rate - inflation
        gold_real_return = gold_return - inflation
        usd_real_return = usd_return - inflation
        eur_real_return = eur_return - inflation
        
        # Risk profiline göre base allocation
        if risk_profile == "low":
            base = {"tl_savings": 30, "gold": 40, "usd": 20, "eur": 10}
        elif risk_profile == "high":
            base = {"tl_savings": 10, "gold": 20, "usd": 40, "eur": 30}
        else:  # medium
            base = {"tl_savings": 20, "gold": 30, "usd": 30, "eur": 20}
        
        # Getiri bazlı ayarlama
        adjustments = {}
        
        # En yüksek getirili varlığa bonus
        returns = {
            "tl_savings": deposit_rate,
            "gold": gold_return,
            "usd": usd_return,
            "eur": eur_return
        }
        
        sorted_returns = sorted(returns.items(), key=lambda x: x[1], reverse=True)
        
        # En iyi performans gösteren varlığa +10, en kötüye -5
        best_asset = sorted_returns[0][0]
        worst_asset = sorted_returns[-1][0]
        
        adjustments[best_asset] = 10
        adjustments[worst_asset] = -5
        
        # Enflasyon yüksekse TL'den kaç, altına yönel
        if inflation > 40:
            adjustments["tl_savings"] = adjustments.get("tl_savings", 0) - 10
            adjustments["gold"] = adjustments.get("gold", 0) + 5
        
        # Süre kısaysa (< 6 ay) daha likit varlıklara yönel
        if duration_months < 6:
            adjustments["tl_savings"] = adjustments.get("tl_savings", 0) + 10
            adjustments["gold"] = adjustments.get("gold", 0) - 5
        
        # Final allocation hesapla
        allocation = {}
        total = 0
        
        for asset, base_pct in base.items():
            adj = adjustments.get(asset, 0)
            final_pct = max(5, min(60, base_pct + adj))  # 5-60 arası sınırla
            allocation[asset] = final_pct
            total += final_pct
        
        # Normalize et (toplam 100 olsun)
        if total != 100:
            factor = 100 / total
            for asset in allocation:
                allocation[asset] = round(allocation[asset] * factor)
        
        # Küçük düzeltme (toplam 100 olsun)
        diff = 100 - sum(allocation.values())
        if diff != 0:
            # En büyük paya ekle/çıkar
            max_asset = max(allocation, key=allocation.get)
            allocation[max_asset] += diff
        
        return allocation
    
    async def get_ai_allocation_recommendation(
        self,
        target_amount: float,
        duration_months: int,
        risk_profile: str,
        product_name: str,
        existing_savings: float = 0,
        monthly_contribution: float = 0
    ) -> Dict[str, Any]:
        """
        AI ile dinamik yatırım dağılımı önerisi al
        
        Returns:
            allocation: {tl_savings: %, gold: %, usd: %, eur: %}
            reasoning: AI'ın gerekçesi
            insights: Önemli bilgiler
        """
        
        # Piyasa verilerini al
        market = self.market_data.copy()
        
        if not self.model:
            # AI kullanılamazsa kural tabanlı hesapla
            allocation = self._calculate_optimal_allocation_rule_based(
                target_amount, duration_months, risk_profile, market
            )
            return {
                "success": True,
                "allocation": allocation,
                "reasoning": self._generate_rule_based_reasoning(allocation, market, risk_profile),
                "insights": self._generate_market_insights(market),
                "source": "rule_based",
                "confidence_score": 75
            }
        
        prompt = f"""
Sen bir profesyonel yatırım danışmanısın. Aşağıdaki bilgilere göre optimal yatırım dağılımı öner.

📊 YATIRIM HEDEFİ:
- Hedef Ürün: {product_name}
- Hedef Tutar: {target_amount:,.0f} TL
- Mevcut Birikim: {existing_savings:,.0f} TL
- Aylık Katkı: {monthly_contribution:,.0f} TL
- Süre: {duration_months} ay
- Risk Profili: {risk_profile} (low=düşük risk, medium=orta, high=yüksek)

📈 GÜNCEL PİYASA VERİLERİ:
- Yıllık Enflasyon: %{market['annual_inflation']}
- TL Mevduat Faizi: %{market['tl_deposit_rate']}
- Altın Yıllık Değişim: %{market['gold_yearly_change']}
- Dolar Yıllık Değişim: %{market['usd_yearly_change']}
- Euro Yıllık Değişim: %{market['eur_yearly_change']}
- USD/TRY: {market['usd_rate']}
- EUR/TRY: {market['eur_rate']}
- Gram Altın: {market['gold_gram_price']} TL
- TCMB Politika Faizi: %{market['policy_rate']}

🎯 YATIRIM ARAÇLARI:
1. TL Birikim (tl_savings): Düşük risk, yüksek likidite, enflasyona karşı zayıf
2. Altın (gold): Orta risk, enflasyon koruması, güvenli liman
3. Dolar (usd): Orta risk, global rezerv para, döviz koruması
4. Euro (eur): Orta risk, Avrupa ekonomisi bağlantılı

📋 TALİMATLAR:
1. Her varlık için yüzde belirle (toplam 100 olmalı)
2. Risk profiline uygun ol
3. Enflasyonu yenecek strateji öner
4. Kısa gerekçe yaz
5. Önemli 2-3 içgörü paylaş

JSON formatında yanıt ver:
{{
    "allocation": {{
        "tl_savings": <yüzde>,
        "gold": <yüzde>,
        "usd": <yüzde>,
        "eur": <yüzde>
    }},
    "reasoning": "<Neden bu dağılımı önerdiğinin kısa açıklaması - max 2 cümle>",
    "insights": [
        "<Önemli bilgi 1>",
        "<Önemli bilgi 2>",
        "<Önemli bilgi 3>"
    ],
    "dominant_asset": "<En çok önerilen varlık adı>",
    "expected_total_return": <Tahmini yıllık getiri yüzdesi>
}}
"""
        
        try:
            response = self.model.generate_content(prompt)
            ai_response = response.text
            
            # JSON'u parse et
            start = ai_response.find('{')
            end = ai_response.rfind('}') + 1
            
            if start != -1 and end > start:
                result = json.loads(ai_response[start:end])
                
                # Allocation validasyonu
                allocation = result.get("allocation", {})
                
                # Gerekli varlıklar var mı kontrol et
                required_assets = ["tl_savings", "gold", "usd", "eur"]
                for asset in required_assets:
                    if asset not in allocation:
                        allocation[asset] = 0
                
                # Toplam 100 mü kontrol et
                total = sum(allocation.values())
                if total != 100:
                    # Normalize et
                    factor = 100 / total if total > 0 else 1
                    for asset in allocation:
                        allocation[asset] = round(allocation[asset] * factor)
                    
                    # Son düzeltme
                    diff = 100 - sum(allocation.values())
                    if diff != 0:
                        max_asset = max(allocation, key=allocation.get)
                        allocation[max_asset] += diff
                
                result["allocation"] = allocation
                result["source"] = "gemini_ai"
                result["success"] = True
                result["confidence_score"] = 90
                result["generated_at"] = datetime.utcnow().isoformat()
                
                return result
            else:
                raise ValueError("JSON not found in response")
                
        except Exception as e:
            print(f"AI Allocation Error: {e}")
            
            # Fallback to rule-based
            allocation = self._calculate_optimal_allocation_rule_based(
                target_amount, duration_months, risk_profile, market
            )
            return {
                "success": True,
                "allocation": allocation,
                "reasoning": self._generate_rule_based_reasoning(allocation, market, risk_profile),
                "insights": self._generate_market_insights(market),
                "source": "rule_based_fallback",
                "confidence_score": 70,
                "error": str(e)
            }
    
    def _generate_rule_based_reasoning(
        self,
        allocation: Dict[str, int],
        market: Dict[str, float],
        risk_profile: str
    ) -> str:
        """Kural tabanlı öneri için gerekçe oluştur"""
        
        # En yüksek paylı varlığı bul
        dominant = max(allocation, key=allocation.get)
        dominant_pct = allocation[dominant]
        
        asset_names = {
            "tl_savings": "TL Birikim",
            "gold": "Altın",
            "usd": "Dolar",
            "eur": "Euro"
        }
        
        inflation = market.get("annual_inflation", 50)
        
        if dominant == "gold":
            reason = f"Yüksek enflasyon ortamında (%{inflation}) altın güvenli liman olarak öne çıkıyor."
        elif dominant == "usd":
            reason = f"Dolar, global rezerv para olarak değer koruma özelliğiyle öneriliyor."
        elif dominant == "eur":
            reason = f"Euro, çeşitlendirme ve Avrupa ekonomisi korelasyonu için tercih ediliyor."
        else:
            reason = f"TL mevduat faizi yüksek olsa da enflasyonun altında kalıyor."
        
        return f"{asset_names[dominant]} ağırlıklı (%{dominant_pct}) bir portföy öneriyoruz. {reason}"
    
    def _generate_market_insights(self, market: Dict[str, float]) -> List[str]:
        """Piyasa içgörüleri oluştur"""
        insights = []
        
        inflation = market.get("annual_inflation", 50)
        deposit_rate = market.get("tl_deposit_rate", 45)
        gold_return = market.get("gold_yearly_change", 55)
        
        # Enflasyon vs faiz
        if deposit_rate < inflation:
            insights.append(f"⚠️ TL mevduat faizi (%{deposit_rate}) enflasyonun (%{inflation}) altında")
        
        # Altın performansı
        if gold_return > inflation:
            insights.append(f"🥇 Altın (%{gold_return}) enflasyonu yeniyor")
        
        # Genel tavsiye
        if inflation > 40:
            insights.append("💡 Yüksek enflasyon döneminde döviz ve altın koruması önemli")
        
        return insights[:3]  # Max 3 insight
    
    def calculate_projected_returns(
        self,
        allocation: Dict[str, int],
        initial_amount: float,
        monthly_contribution: float,
        duration_months: int
    ) -> Dict[str, Any]:
        """
        Önerilen dağılıma göre tahmini getirileri hesapla
        """
        market = self.market_data
        
        # Her varlık için yıllık getiri
        asset_returns = {
            "tl_savings": market.get("tl_deposit_rate", 45) / 100,
            "gold": market.get("gold_yearly_change", 55) / 100,
            "usd": market.get("usd_yearly_change", 35) / 100,
            "eur": market.get("eur_yearly_change", 30) / 100
        }
        
        asset_projections = {}
        total_future_value = 0
        total_invested = initial_amount + (monthly_contribution * duration_months)
        
        for asset, pct in allocation.items():
            if pct <= 0:
                continue
            
            asset_ratio = pct / 100
            initial_for_asset = initial_amount * asset_ratio
            monthly_for_asset = monthly_contribution * asset_ratio
            annual_return = asset_returns.get(asset, 0)
            monthly_return = (1 + annual_return) ** (1/12) - 1
            
            # Gelecek değer hesabı
            future_value = 0
            
            # Mevcut birikim değerlendirilmesi
            future_value += initial_for_asset * ((1 + monthly_return) ** duration_months)
            
            # Aylık katkıların değerlendirilmesi
            for month in range(duration_months):
                months_to_grow = duration_months - month
                future_value += monthly_for_asset * ((1 + monthly_return) ** months_to_grow)
            
            invested_for_asset = initial_for_asset + (monthly_for_asset * duration_months)
            profit = future_value - invested_for_asset
            
            asset_projections[asset] = {
                "allocation_percent": pct,
                "invested": round(invested_for_asset, 2),
                "future_value": round(future_value, 2),
                "profit": round(profit, 2),
                "return_percent": round((profit / invested_for_asset * 100) if invested_for_asset > 0 else 0, 2),
                "name": self.asset_properties.get(asset, {}).get("name", asset),
                "emoji": self.asset_properties.get(asset, {}).get("emoji", "📊")
            }
            
            total_future_value += future_value
        
        total_profit = total_future_value - total_invested
        total_return_pct = (total_profit / total_invested * 100) if total_invested > 0 else 0
        
        # Enflasyon düzeltmeli değer
        inflation = market.get("annual_inflation", 50) / 100
        monthly_inflation = (1 + inflation) ** (1/12) - 1
        inflation_adjusted = total_future_value / ((1 + monthly_inflation) ** duration_months)
        real_return_pct = ((inflation_adjusted / total_invested) - 1) * 100 if total_invested > 0 else 0
        
        return {
            "asset_projections": asset_projections,
            "summary": {
                "total_invested": round(total_invested, 2),
                "total_future_value": round(total_future_value, 2),
                "total_profit": round(total_profit, 2),
                "nominal_return_percent": round(total_return_pct, 2),
                "inflation_adjusted_value": round(inflation_adjusted, 2),
                "real_return_percent": round(real_return_pct, 2),
                "beats_inflation": total_return_pct > (inflation * 100 * duration_months / 12)
            }
        }


# Global instance
ai_investment_advisor = AIInvestmentAdvisor()
