"""
AI Financial Advisor - Yapay Zeka Karar Mekanizması
Google Gemini API ile çalışan akıllı finansal danışman
"""
import os
import json

try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False

class AIFinancialAdvisor:
    """AI tabanlı finansal danışman"""
    
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
    
    def analyze_goal_feasibility(self, goal_data: dict, simulation_result: dict) -> dict:
        """Hedefin gerçekleşebilirliğini AI ile analiz et"""
        
        if not self.model:
            return self._fallback_analysis(goal_data, simulation_result)
        
        prompt = f"""
Sen bir finansal danışmansın. Kullanıcının finansal hedefini analiz et ve öneriler sun.

HEDEF BİLGİLERİ:
- Hedef: {goal_data.get('goal_name')}
- Hedef Tutar: {goal_data.get('target_amount'):,.2f} TL
- Süre: {goal_data.get('duration_months')} ay
- Aylık Gelir: {goal_data.get('monthly_income'):,.2f} TL
- Aylık Gider: {goal_data.get('monthly_expenses'):,.2f} TL
- Mevcut Birikim: {goal_data.get('current_amount', 0):,.2f} TL

SİMÜLASYON SONUCU:
- Hedefe Ulaşılabilir mi: {"Evet" if simulation_result['scenario']['is_achievable'] else "Hayır"}
- Eksik Tutar: {simulation_result['scenario'].get('shortage', 0):,.2f} TL
- Aylık Tasarruf Gerekli: {simulation_result['scenario']['monthly_savings_needed']:,.2f} TL
- Mevcut Aylık Tasarruf: {simulation_result['scenario']['current_monthly_savings']:,.2f} TL

Lütfen:
1. Hedefe ulaşabilirlik durumunu değerlendir
2. Somut 3-5 maddelik aksiyon planı öner
3. Risk faktörlerini belirt
4. Motivasyonel bir mesaj ekle

Yanıtını JSON formatında ver:
{{"feasibility": "yüksek/orta/düşük", "action_plan": ["madde1", "madde2"], "risks": ["risk1"], "motivation": "mesaj"}}
"""
        
        try:
            response = self.model.generate_content(prompt)
            ai_response = response.text
            
            # Extract JSON from response
            start = ai_response.find('{')
            end = ai_response.rfind('}') + 1
            if start != -1 and end > start:
                ai_analysis = json.loads(ai_response[start:end])
            else:
                ai_analysis = {"feasibility": "orta", "action_plan": ["AI analizi yapılamadı"], "risks": [], "motivation": ""}
            
            return ai_analysis
        except Exception as e:
            print(f"AI Analysis Error: {e}")
            return self._fallback_analysis(goal_data, simulation_result)
    
    def _fallback_analysis(self, goal_data: dict, simulation_result: dict) -> dict:
        """AI kullanılamazsa basit analiz"""
        is_achievable = simulation_result['scenario']['is_achievable']
        
        action_plan = []
        if not is_achievable:
            shortage = simulation_result['scenario']['shortage']
            monthly_extra = shortage / goal_data['duration_months']
            action_plan = [
                f"Aylık {monthly_extra:,.0f} TL daha tasarruf etmelisiniz",
                "Gereksiz abonelikleri iptal edin",
                "Harcama kategorilerinizi gözden geçirin"
            ]
        else:
            action_plan = [
                "Planınız uygulanabilir!",
                "Düzenli tasarruf yapmaya devam edin",
                "Shield özelliğini aktif edin"
            ]
        
        return {
            "feasibility": "yüksek" if is_achievable else "orta",
            "action_plan": action_plan,
            "risks": ["Enflasyon", "Beklenmedik harcamalar"],
            "motivation": "Hedefinize ulaşmak için kararlı olun!"
        }
    
    def generate_smart_recommendations(self, goal_data: dict, user_spending: list) -> list:
        """Harcama verisine göre akıllı öneriler üret"""
        
        if not self.model:
            return self._fallback_recommendations()
        
        # Basit kategori analizi
        spending_summary = "Son harcamalar analiz edildi."
        if user_spending:
            total = sum(abs(t.get('amount', 0)) for t in user_spending)
            spending_summary = f"Son işlemlerde toplam {total:,.2f} TL harcama tespit edildi."
        
        prompt = f"""
Kullanıcı "{goal_data.get('goal_name')}" hedefine {goal_data.get('duration_months')} ayda ulaşmak istiyor.
{spending_summary}

3 somut tasarruf önerisi ver. Her öneri max 50 kelime olsun.
Sadece madde işaretli liste olarak yaz, başka bir şey ekleme.
"""
        
        try:
            response = self.model.generate_content(prompt)
            recommendations = response.text.strip().split('\n')
            return [r.strip('- ').strip() for r in recommendations if r.strip()][:3]
        except Exception as e:
            print(f"AI Recommendations Error: {e}")
            return self._fallback_recommendations()
    
    def _fallback_recommendations(self) -> list:
        """Basit öneriler"""
        return [
            "Günlük kahve alışkanlığınızı azaltın, ayda 500 TL tasarruf edin",
            "Gereksiz abonelikleri iptal edin",
            "Market alışverişi için liste yapın, plansız alışverişi önleyin"
        ]

# Global instance
ai_advisor = AIFinancialAdvisor()
