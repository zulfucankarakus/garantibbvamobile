"""
AI Smart Credit Advisor - Yapay Zeka Tabanlı Akıllı Kredi Danışmanı
Birikim planlarına göre otomatik kredi önerileri sunar

Features:
- LLM (Gemini) ile kişiselleştirilmiş kredi önerileri
- Farklı milestone eşiklerinde otomatik kontrol
- Enflasyon vs faiz karşılaştırması
- Push notification desteği
"""
import os
import json
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from enum import Enum
import asyncio

try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False


class CreditMilestone(str, Enum):
    """Kredi öneri eşikleri"""
    EARLY_BIRD = "early_bird"       # %30-40 - Erken kuş fırsatı
    HALF_WAY = "half_way"           # %45-55 - Yarı yolda
    GOLDEN_POINT = "golden_point"   # %60-70 - Altın nokta
    NEAR_TARGET = "near_target"     # %75-85 - Hedefe yakın
    FINAL_STRETCH = "final_stretch" # %85-95 - Son düzlük
    ALMOST_DONE = "almost_done"     # %95+ - Neredeyse tamam


class CreditUrgency(str, Enum):
    """Kredi önerisi aciliyeti"""
    LOW = "low"           # Bilgilendirme
    MEDIUM = "medium"     # Düşünülebilir
    HIGH = "high"         # Öneriliyor
    CRITICAL = "critical" # Şiddetle öneriliyor


class SmartCreditAdvisor:
    """AI tabanlı akıllı kredi danışmanı"""
    
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
        
        # Milestone eşikleri ve özellikleri
        self.milestones = {
            CreditMilestone.EARLY_BIRD: {
                "min_percent": 30, "max_percent": 44,
                "emoji": "🐣", "color": "#94A3B8",
                "title": "Erken Kuş Fırsatı",
                "base_urgency": CreditUrgency.LOW
            },
            CreditMilestone.HALF_WAY: {
                "min_percent": 45, "max_percent": 59,
                "emoji": "⚖️", "color": "#F59E0B",
                "title": "Yarı Yoldasınız",
                "base_urgency": CreditUrgency.MEDIUM
            },
            CreditMilestone.GOLDEN_POINT: {
                "min_percent": 60, "max_percent": 74,
                "emoji": "🌟", "color": "#EAB308",
                "title": "Altın Nokta",
                "base_urgency": CreditUrgency.HIGH
            },
            CreditMilestone.NEAR_TARGET: {
                "min_percent": 75, "max_percent": 84,
                "emoji": "🎯", "color": "#22C55E",
                "title": "Hedefe Yakınsınız",
                "base_urgency": CreditUrgency.HIGH
            },
            CreditMilestone.FINAL_STRETCH: {
                "min_percent": 85, "max_percent": 94,
                "emoji": "🏃", "color": "#10B981",
                "title": "Son Düzlük",
                "base_urgency": CreditUrgency.CRITICAL
            },
            CreditMilestone.ALMOST_DONE: {
                "min_percent": 95, "max_percent": 100,
                "emoji": "🏆", "color": "#059669",
                "title": "Neredeyse Tamamlandı",
                "base_urgency": CreditUrgency.CRITICAL
            }
        }
        
        # Güncel ekonomik parametreler (gerçek zamanlı API'dan alınabilir)
        self.economic_params = {
            "annual_inflation": 50.0,      # Yıllık enflasyon %
            "monthly_inflation": 3.8,      # Aylık enflasyon %
            "credit_interest_rate": 48.0,  # Ortalama kredi faizi %
            "deposit_rate": 45.0,          # Mevduat faizi %
            "gold_return": 55.0,           # Altın yıllık getiri %
            "usd_return": 35.0,            # Dolar yıllık değişim %
        }
    
    def get_current_milestone(self, progress_percent: float) -> Optional[CreditMilestone]:
        """Mevcut ilerleme yüzdesine göre milestone belirle"""
        for milestone, config in self.milestones.items():
            if config["min_percent"] <= progress_percent <= config["max_percent"]:
                return milestone
        return None
    
    def calculate_inflation_impact(
        self,
        target_amount: float,
        current_amount: float,
        remaining_months: int
    ) -> Dict[str, Any]:
        """Enflasyonun birikim üzerindeki etkisini hesapla"""
        monthly_inflation = self.economic_params["monthly_inflation"] / 100
        
        # Hedef fiyatın gelecekteki tahmini değeri
        future_target = target_amount * ((1 + monthly_inflation) ** remaining_months)
        
        # Mevcut birikimin reel değer kaybı
        real_value_loss = current_amount * (1 - (1 / ((1 + monthly_inflation) ** remaining_months)))
        
        # Enflasyon kaynaklı ek maliyet
        inflation_cost = future_target - target_amount
        
        return {
            "current_target": round(target_amount, 2),
            "future_target_estimated": round(future_target, 2),
            "inflation_cost": round(inflation_cost, 2),
            "real_value_loss": round(real_value_loss, 2),
            "monthly_inflation_rate": self.economic_params["monthly_inflation"],
            "annual_inflation_rate": self.economic_params["annual_inflation"],
            "warning": inflation_cost > current_amount * 0.1,  # %10'dan fazla artış varsa uyar
            "message": f"Enflasyon nedeniyle hedefiniz {remaining_months} ay sonra {future_target:,.0f} TL olabilir (+{inflation_cost:,.0f} TL)"
        }
    
    def calculate_credit_benefit(
        self,
        shortage_amount: float,
        remaining_months: int,
        monthly_income: float
    ) -> Dict[str, Any]:
        """Kredi çekmenin fayda analizini yap"""
        annual_credit_rate = self.economic_params["credit_interest_rate"] / 100
        monthly_credit_rate = annual_credit_rate / 12
        
        # Farklı vade seçenekleri
        term_options = [12, 24, 36, 48, 60]
        credit_options = []
        
        for term in term_options:
            if term > 60:
                continue
            
            # Aylık taksit hesabı (PMT formülü)
            if monthly_credit_rate > 0:
                monthly_payment = shortage_amount * (monthly_credit_rate * (1 + monthly_credit_rate) ** term) / \
                                 ((1 + monthly_credit_rate) ** term - 1)
            else:
                monthly_payment = shortage_amount / term
            
            total_payment = monthly_payment * term
            total_interest = total_payment - shortage_amount
            
            # Gelir kontrolü
            income_ratio = (monthly_payment / monthly_income * 100) if monthly_income > 0 else 999
            
            # Risk seviyesi
            if income_ratio <= 25:
                risk_level = "low"
                risk_label = "Düşük Risk"
                risk_emoji = "🟢"
            elif income_ratio <= 35:
                risk_level = "medium"
                risk_label = "Orta Risk"
                risk_emoji = "🟡"
            elif income_ratio <= 45:
                risk_level = "high"
                risk_label = "Yüksek Risk"
                risk_emoji = "🟠"
            else:
                risk_level = "very_high"
                risk_label = "Çok Yüksek Risk"
                risk_emoji = "🔴"
            
            credit_options.append({
                "term_months": term,
                "monthly_payment": round(monthly_payment, 2),
                "total_payment": round(total_payment, 2),
                "total_interest": round(total_interest, 2),
                "income_ratio": round(income_ratio, 1),
                "risk_level": risk_level,
                "risk_label": risk_label,
                "risk_emoji": risk_emoji,
                "affordable": income_ratio <= 35,
                "recommended": 25 <= income_ratio <= 35
            })
        
        # En uygun seçeneği bul
        affordable_options = [opt for opt in credit_options if opt["affordable"]]
        best_option = None
        
        if affordable_options:
            # En düşük toplam ödeme
            best_option = min(affordable_options, key=lambda x: x["total_payment"])
        elif credit_options:
            # Hiçbiri uygun değilse en düşük taksitli
            best_option = min(credit_options, key=lambda x: x["monthly_payment"])
        
        # Enflasyon vs Faiz karşılaştırması
        monthly_inflation = self.economic_params["monthly_inflation"] / 100
        avg_term = 36  # Ortalama vade
        
        # Bekleme maliyeti (enflasyon)
        waiting_cost = shortage_amount * ((1 + monthly_inflation) ** avg_term - 1)
        
        # Kredi maliyeti (faiz)
        credit_cost = best_option["total_interest"] if best_option else 0
        
        credit_is_better = credit_cost < waiting_cost
        
        return {
            "shortage_amount": round(shortage_amount, 2),
            "credit_options": credit_options,
            "best_option": best_option,
            "affordable_options_count": len(affordable_options),
            "comparison": {
                "waiting_cost_inflation": round(waiting_cost, 2),
                "credit_cost_interest": round(credit_cost, 2),
                "credit_is_better": credit_is_better,
                "savings_with_credit": round(waiting_cost - credit_cost, 2) if credit_is_better else 0,
                "message": f"Kredi çekmek {'avantajlı' if credit_is_better else 'dezavantajlı'}: " +
                          (f"{waiting_cost - credit_cost:,.0f} TL tasarruf" if credit_is_better else f"{credit_cost - waiting_cost:,.0f} TL ek maliyet")
            }
        }
    
    async def generate_ai_recommendation(
        self,
        plan_data: Dict[str, Any],
        progress_data: Dict[str, Any],
        credit_analysis: Dict[str, Any],
        inflation_impact: Dict[str, Any]
    ) -> Dict[str, Any]:
        """LLM ile kişiselleştirilmiş kredi önerisi üret"""
        
        milestone = self.get_current_milestone(progress_data.get("progress_percent", 0))
        milestone_config = self.milestones.get(milestone, {})
        
        if not self.model:
            return self._generate_fallback_recommendation(
                plan_data, progress_data, credit_analysis, inflation_impact, milestone_config
            )
        
        prompt = f"""
Sen bir bankacılık uzmanı ve finansal danışmansın. Kullanıcının birikim planını analiz et ve kredi önerisi sun.

📊 BİRİKİM PLANI:
- Hedef Ürün: {plan_data.get('product_name', 'Ürün')}
- Hedef Tutar: {plan_data.get('target_amount', 0):,.0f} TL
- Mevcut Birikim: {progress_data.get('current_value', 0):,.0f} TL
- İlerleme: %{progress_data.get('progress_percent', 0):.1f}
- Kalan Süre: {progress_data.get('remaining_months', 0)} ay
- Eksik Tutar: {credit_analysis.get('shortage_amount', 0):,.0f} TL

💰 EKONOMİK DURUM:
- Yıllık Enflasyon: %{self.economic_params['annual_inflation']}
- Tahmini Gelecek Fiyat: {inflation_impact.get('future_target_estimated', 0):,.0f} TL
- Enflasyon Maliyeti: +{inflation_impact.get('inflation_cost', 0):,.0f} TL

🏦 KREDİ ANALİZİ:
- En Uygun Vade: {credit_analysis.get('best_option', {}).get('term_months', 0)} ay
- Aylık Taksit: {credit_analysis.get('best_option', {}).get('monthly_payment', 0):,.0f} TL
- Toplam Faiz: {credit_analysis.get('best_option', {}).get('total_interest', 0):,.0f} TL
- Kredi Çekmek Avantajlı mı: {"Evet" if credit_analysis.get('comparison', {}).get('credit_is_better', False) else "Hayır"}

📍 MEVCUT AŞAMA: {milestone_config.get('title', 'Belirsiz')} ({milestone_config.get('emoji', '📍')})

Lütfen kullanıcıya özel, samimi ve motive edici bir kredi önerisi yaz. 
- Durumu kısa ve net özetle
- Neden şimdi kredi çekmenin mantıklı olduğunu (veya olmadığını) açıkla
- Enflasyon etkisini vurgula
- Somut bir aksiyon öner
- Maksimum 150 kelime kullan
- Türkçe yaz

JSON formatında yanıt ver:
{{
    "headline": "Dikkat çekici başlık (max 10 kelime)",
    "main_message": "Ana mesaj (2-3 cümle)",
    "key_insight": "En önemli bilgi (1 cümle)",
    "action_recommendation": "Önerilen aksiyon",
    "urgency_reason": "Neden şimdi",
    "emoji": "Uygun emoji",
    "confidence_score": 0-100 arası güven skoru
}}
"""
        
        try:
            response = self.model.generate_content(prompt)
            ai_response = response.text
            
            # JSON'u parse et
            start = ai_response.find('{')
            end = ai_response.rfind('}') + 1
            if start != -1 and end > start:
                ai_result = json.loads(ai_response[start:end])
                ai_result["source"] = "gemini_ai"
                ai_result["generated_at"] = datetime.utcnow().isoformat()
                return ai_result
            else:
                raise ValueError("JSON not found in response")
                
        except Exception as e:
            print(f"AI Recommendation Error: {e}")
            return self._generate_fallback_recommendation(
                plan_data, progress_data, credit_analysis, inflation_impact, milestone_config
            )
    
    def _generate_fallback_recommendation(
        self,
        plan_data: Dict[str, Any],
        progress_data: Dict[str, Any],
        credit_analysis: Dict[str, Any],
        inflation_impact: Dict[str, Any],
        milestone_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """AI kullanılamazsa kural tabanlı öneri üret"""
        
        progress_percent = progress_data.get("progress_percent", 0)
        shortage = credit_analysis.get("shortage_amount", 0)
        credit_is_better = credit_analysis.get("comparison", {}).get("credit_is_better", False)
        best_option = credit_analysis.get("best_option", {})
        inflation_cost = inflation_impact.get("inflation_cost", 0)
        
        # Durum bazlı mesajlar
        if progress_percent >= 90:
            headline = "🏆 Son Adıma Geldiniz!"
            main_message = f"Hedefinize sadece {shortage:,.0f} TL kaldı. Bu tutarı küçük bir kredi ile tamamlayabilirsiniz."
            urgency_reason = "Enflasyon fiyatı artırmadan ürününüze kavuşun"
            emoji = "🎉"
        elif progress_percent >= 70:
            headline = "🎯 Hedefinize Çok Yakınsınız!"
            main_message = f"Birikiminizin %{progress_percent:.0f}'ini tamamladınız. Kalan {shortage:,.0f} TL için kredi değerlendirin."
            urgency_reason = f"Enflasyon nedeniyle hedef fiyat {inflation_cost:,.0f} TL artabilir"
            emoji = "🌟"
        elif progress_percent >= 50:
            headline = "⚖️ Yarı Yolu Geçtiniz!"
            main_message = f"Harika gidiyorsunuz! Şu an kredi çekerseniz enflasyondan {inflation_cost:,.0f} TL tasarruf edebilirsiniz."
            urgency_reason = "Enflasyondan korunmak için ideal zaman"
            emoji = "💡"
        elif progress_percent >= 30:
            headline = "🐣 Erken Kuş Avantajı"
            main_message = f"Birikim yolculuğunuzda ilerliyorsunuz. Şu an için birikime devam etmenizi öneriyoruz."
            urgency_reason = "Biraz daha birikim yaparak daha az kredi çekebilirsiniz"
            emoji = "📈"
        else:
            headline = "🚀 Yolculuk Başladı"
            main_message = "Hedefinize doğru ilk adımları attınız. Düzenli birikim yaparak ilerlemeye devam edin."
            urgency_reason = "Henüz kredi için erken, birikime devam edin"
            emoji = "💪"
        
        action = "Kredi başvurusu yapın" if credit_is_better and progress_percent >= 50 else "Birikime devam edin"
        
        if best_option:
            key_insight = f"{best_option.get('term_months', 0)} ay vadede aylık {best_option.get('monthly_payment', 0):,.0f} TL taksit ile hedefinize ulaşabilirsiniz."
        else:
            key_insight = "Detaylı kredi seçenekleri için hesaplama yapılıyor."
        
        return {
            "headline": headline,
            "main_message": main_message,
            "key_insight": key_insight,
            "action_recommendation": action,
            "urgency_reason": urgency_reason,
            "emoji": emoji,
            "confidence_score": 75,
            "source": "rule_based",
            "generated_at": datetime.utcnow().isoformat()
        }
    
    async def get_smart_credit_advice(
        self,
        plan_data: Dict[str, Any],
        current_value: float,
        monthly_income: float = 0
    ) -> Dict[str, Any]:
        """
        Tam kapsamlı akıllı kredi önerisi al
        
        Args:
            plan_data: Birikim planı verisi
            current_value: Mevcut birikim değeri
            monthly_income: Aylık gelir (taksit hesabı için)
        
        Returns:
            Kapsamlı kredi önerisi
        """
        target_amount = plan_data.get("target_amount", 0)
        remaining_months = plan_data.get("remaining_months", 12)
        
        # İlerleme hesapla
        progress_percent = (current_value / target_amount * 100) if target_amount > 0 else 0
        shortage = max(0, target_amount - current_value)
        
        progress_data = {
            "progress_percent": round(progress_percent, 2),
            "current_value": round(current_value, 2),
            "target_amount": round(target_amount, 2),
            "shortage": round(shortage, 2),
            "remaining_months": remaining_months
        }
        
        # Milestone belirle
        milestone = self.get_current_milestone(progress_percent)
        milestone_config = self.milestones.get(milestone, {})
        
        # Enflasyon etkisi
        inflation_impact = self.calculate_inflation_impact(
            target_amount=target_amount,
            current_amount=current_value,
            remaining_months=remaining_months
        )
        
        # Kredi fayda analizi
        if monthly_income <= 0:
            monthly_income = plan_data.get("monthly_contribution", 0) * 5
        
        credit_analysis = self.calculate_credit_benefit(
            shortage_amount=shortage,
            remaining_months=remaining_months,
            monthly_income=monthly_income
        )
        
        # AI önerisi
        ai_recommendation = await self.generate_ai_recommendation(
            plan_data=plan_data,
            progress_data=progress_data,
            credit_analysis=credit_analysis,
            inflation_impact=inflation_impact
        )
        
        # Urgency seviyesi belirle
        urgency = milestone_config.get("base_urgency", CreditUrgency.LOW)
        if credit_analysis.get("comparison", {}).get("credit_is_better", False):
            # Kredi avantajlıysa urgency'yi artır
            if urgency == CreditUrgency.LOW:
                urgency = CreditUrgency.MEDIUM
            elif urgency == CreditUrgency.MEDIUM:
                urgency = CreditUrgency.HIGH
        
        # Bildirim gerekli mi?
        should_notify = (
            progress_percent >= 45 and 
            credit_analysis.get("affordable_options_count", 0) > 0 and
            (credit_analysis.get("comparison", {}).get("credit_is_better", False) or progress_percent >= 70)
        )
        
        return {
            "success": True,
            "plan_id": plan_data.get("id"),
            "product_name": plan_data.get("product_name"),
            
            # İlerleme durumu
            "progress": progress_data,
            
            # Milestone bilgisi
            "milestone": {
                "key": milestone.value if milestone else None,
                "title": milestone_config.get("title", "Belirsiz"),
                "emoji": milestone_config.get("emoji", "📍"),
                "color": milestone_config.get("color", "#6B7280")
            },
            
            # Enflasyon etkisi
            "inflation_impact": inflation_impact,
            
            # Kredi analizi
            "credit_analysis": credit_analysis,
            
            # AI önerisi
            "ai_recommendation": ai_recommendation,
            
            # Aciliyet ve bildirim
            "urgency": {
                "level": urgency.value,
                "label": self._get_urgency_label(urgency),
                "should_notify": should_notify,
                "notification_type": "push" if should_notify else None
            },
            
            # Özet
            "summary": {
                "headline": ai_recommendation.get("headline", "Kredi Önerisi"),
                "should_consider_credit": credit_analysis.get("comparison", {}).get("credit_is_better", False),
                "best_option_summary": self._format_best_option(credit_analysis.get("best_option")),
                "savings_potential": credit_analysis.get("comparison", {}).get("savings_with_credit", 0)
            },
            
            "generated_at": datetime.utcnow().isoformat()
        }
    
    def _get_urgency_label(self, urgency: CreditUrgency) -> str:
        """Urgency seviyesi için label"""
        labels = {
            CreditUrgency.LOW: "Bilgi Amaçlı",
            CreditUrgency.MEDIUM: "Değerlendirilebilir",
            CreditUrgency.HIGH: "Öneriliyor",
            CreditUrgency.CRITICAL: "Şiddetle Öneriliyor"
        }
        return labels.get(urgency, "Belirsiz")
    
    def _format_best_option(self, best_option: Optional[Dict]) -> str:
        """En iyi kredi seçeneğini formatla"""
        if not best_option:
            return "Uygun kredi seçeneği hesaplanıyor..."
        
        return f"{best_option.get('term_months', 0)} ay vadede aylık {best_option.get('monthly_payment', 0):,.0f} TL taksit"
    
    def generate_notification_content(
        self,
        advice_result: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Push notification içeriği oluştur"""
        
        ai_rec = advice_result.get("ai_recommendation", {})
        milestone = advice_result.get("milestone", {})
        credit = advice_result.get("credit_analysis", {})
        progress = advice_result.get("progress", {})
        
        # Başlık
        title = f"{milestone.get('emoji', '💰')} {advice_result.get('product_name', 'Birikim')} - Kredi Fırsatı!"
        
        # Mesaj
        body = ai_rec.get("main_message", "Hedefinize ulaşmak için kredi fırsatını değerlendirin.")
        
        # Detaylı bilgi
        best_option = credit.get("best_option", {})
        data = {
            "type": "smart_credit_advice",
            "plan_id": advice_result.get("plan_id"),
            "progress_percent": progress.get("progress_percent", 0),
            "milestone": milestone.get("key"),
            "urgency": advice_result.get("urgency", {}).get("level"),
            "monthly_payment": best_option.get("monthly_payment", 0),
            "credit_is_better": credit.get("comparison", {}).get("credit_is_better", False),
            "action_url": f"/savings-investment/{advice_result.get('plan_id')}/credit",
            "timestamp": datetime.utcnow().isoformat()
        }
        
        return {
            "title": title,
            "body": body,
            "data": data,
            "priority": "high" if advice_result.get("urgency", {}).get("level") in ["high", "critical"] else "normal",
            "badge": 1,
            "sound": "default",
            "category": "CREDIT_ADVICE"
        }
    
    async def check_and_generate_milestone_notification(
        self,
        plan_data: Dict[str, Any],
        previous_progress: float,
        current_progress: float
    ) -> Optional[Dict[str, Any]]:
        """
        Milestone geçişlerini kontrol et ve bildirim oluştur
        
        Args:
            plan_data: Plan verisi
            previous_progress: Önceki ilerleme yüzdesi
            current_progress: Yeni ilerleme yüzdesi
        
        Returns:
            Bildirim verisi veya None
        """
        previous_milestone = self.get_current_milestone(previous_progress)
        current_milestone = self.get_current_milestone(current_progress)
        
        # Milestone değişmediyse veya geri gittiyse bildirim gönderme
        if previous_milestone == current_milestone:
            return None
        
        # Yeni milestone'a geçiş var mı kontrol et
        milestone_order = list(CreditMilestone)
        
        try:
            prev_idx = milestone_order.index(previous_milestone) if previous_milestone else -1
            curr_idx = milestone_order.index(current_milestone) if current_milestone else -1
            
            # İleri doğru geçiş varsa bildirim oluştur
            if curr_idx > prev_idx:
                # Tam analiz al
                advice = await self.get_smart_credit_advice(
                    plan_data=plan_data,
                    current_value=plan_data.get("current_amount", 0),
                    monthly_income=plan_data.get("monthly_contribution", 0) * 5
                )
                
                if advice.get("urgency", {}).get("should_notify", False):
                    return self.generate_notification_content(advice)
        except ValueError:
            pass
        
        return None


# Global instance
smart_credit_advisor = SmartCreditAdvisor()
