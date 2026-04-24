"""
Real-Time AI Transaction Analyzer
Her işlem sonrası hedefleri analiz eder ve kullanıcıyı bilgilendirir
Google Gemini API ile çalışır
"""
import os
import json

try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False

class TransactionAIAnalyzer:
    """İşlem bazlı AI analizi"""
    
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
    
    def analyze_transaction_impact(
        self,
        transaction: dict,
        active_goals: list,
        recent_transactions: list
    ) -> dict:
        """
        Her işlem sonrası hedeflere etkiyi analiz et
        """
        
        if not self.model or not active_goals:
            return self._fallback_impact_analysis(transaction, active_goals)
        
        # Son 10 işlemi özetle
        recent_summary = self._summarize_transactions(recent_transactions[:10])
        
        # Aktif hedefleri özetle
        goals_summary = ", ".join([
            f"{g['goal_name']} ({g['target_amount']:,.0f} TL, {g['duration_months']} ay)"
            for g in active_goals
        ])
        
        transaction_type = "gelir" if transaction['amount'] > 0 else "gider"
        transaction_amount = abs(transaction['amount'])
        
        prompt = f"""
Sen bir finansal AI asistansın. Kullanıcının yeni işlemini analiz et ve hedefe etkisini değerlendir.

YENİ İŞLEM:
- Tip: {transaction_type.upper()}
- Tutar: {transaction_amount:,.2f} TL
- Açıklama: {transaction.get('description', 'Belirtilmemiş')}

AKTİF HEDEFLER:
{goals_summary}

SON İŞLEMLER ÖZETİ:
{recent_summary}

Lütfen:
1. Bu işlemin hedeflere etkisini değerlendir (pozitif/negatif/nötr)
2. Kısa bir yorum yap (max 60 kelime)
3. Gerekirse 1 aksiyon öner

JSON formatında yanıt ver:
{{"impact": "positive/negative/neutral", "comment": "...", "action": "..."}}
"""
        
        try:
            response = self.model.generate_content(prompt)
            ai_response = response.text
            
            start = ai_response.find('{')
            end = ai_response.rfind('}') + 1
            if start != -1 and end > start:
                result = json.loads(ai_response[start:end])
            else:
                result = self._fallback_impact_analysis(transaction, active_goals)
            
            return result
        except Exception as e:
            print(f"AI Transaction Analysis Error: {e}")
            return self._fallback_impact_analysis(transaction, active_goals)
    
    def _fallback_impact_analysis(self, transaction: dict, active_goals: list) -> dict:
        """AI yoksa basit analiz"""
        amount = transaction['amount']
        
        if amount > 0:
            # Gelir
            return {
                "impact": "positive",
                "comment": f"{abs(amount):,.0f} TL gelir hedefinize yaklaşmanızı sağlıyor!",
                "action": "Gelen parayı hedefiniz için ayırın"
            }
        else:
            # Gider
            abs_amount = abs(amount)
            if abs_amount > 1000:
                return {
                    "impact": "negative",
                    "comment": f"{abs_amount:,.0f} TL büyük bir harcama. Hedefinizi etkileyebilir.",
                    "action": "Gereksiz harcamalardan kaçının"
                }
            else:
                return {
                    "impact": "neutral",
                    "comment": f"{abs_amount:,.0f} TL harcama yapıldı.",
                    "action": "Planınıza devam edin"
                }
    
    def _summarize_transactions(self, transactions: list) -> str:
        """Son işlemleri özetle"""
        if not transactions:
            return "Henüz işlem yok"
        
        total_income = sum(t['amount'] for t in transactions if t['amount'] > 0)
        total_expense = sum(abs(t['amount']) for t in transactions if t['amount'] < 0)
        
        return f"Son işlemlerde {total_income:,.0f} TL gelir, {total_expense:,.0f} TL gider"
    
    def generate_progress_insight(self, goal: dict, new_amount: float) -> dict:
        """İlerleme insight'ı üret"""
        
        if not self.model:
            return self._fallback_progress_insight(goal, new_amount)
        
        progress_percent = (new_amount / goal['target_amount']) * 100
        remaining = goal['target_amount'] - new_amount
        
        prompt = f"""
Kullanıcının hedef ilerlemesi:
- Hedef: {goal['goal_name']}
- Hedef Tutar: {goal['target_amount']:,.0f} TL
- Mevcut: {new_amount:,.0f} TL
- İlerleme: %{progress_percent:.1f}
- Kalan: {remaining:,.0f} TL
- Süre: {goal['duration_months']} ay

Motivasyonel ve kısa bir ilerleme mesajı yaz (max 40 kelime).
Sadece mesajı yaz, başka bir şey ekleme.
"""
        
        try:
            response = self.model.generate_content(prompt)
            insight = response.text.strip()
            
            return {
                "progress_percent": round(progress_percent, 1),
                "remaining": remaining,
                "insight": insight
            }
        except Exception as e:
            print(f"AI Progress Insight Error: {e}")
            return self._fallback_progress_insight(goal, new_amount)
    
    def _fallback_progress_insight(self, goal: dict, new_amount: float) -> dict:
        """Basit ilerleme mesajı"""
        progress_percent = (new_amount / goal['target_amount']) * 100
        remaining = goal['target_amount'] - new_amount
        
        if progress_percent >= 75:
            insight = f"Harika! Hedefinize çok yaklaştınız. Sadece {remaining:,.0f} TL kaldı!"
        elif progress_percent >= 50:
            insight = f"Yarı yoldasınız! {remaining:,.0f} TL daha biriktirin."
        elif progress_percent >= 25:
            insight = f"İyi gidiyorsunuz! {remaining:,.0f} TL daha tasarruf edin."
        else:
            insight = f"Başlangıç güzel! Hedefinize ulaşmak için {remaining:,.0f} TL gerekli."
        
        return {
            "progress_percent": round(progress_percent, 1),
            "remaining": remaining,
            "insight": insight
        }

# Global instance
transaction_ai = TransactionAIAnalyzer()
