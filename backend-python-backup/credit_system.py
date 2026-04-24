"""
Credit System - Mikro Kredi Sistemi
Finansal hedefler için kredi önerileri ve başvuru
"""
from typing import Dict, List, Optional
from datetime import datetime, timedelta
import uuid


class CreditSystem:
    """Kredi sistemi"""
    
    def __init__(self):
        self.min_credit_score = 500  # Min kredi puanı
        self.max_loan_amount = 500000  # Max kredi tutarı
        self.interest_rates = {
            'excellent': 8.0,  # 750+
            'good': 10.0,      # 650-749
            'fair': 15.0,      # 550-649
            'poor': 20.0       # 500-549
        }
    
    def calculate_credit_score(self, user_data: Dict) -> int:
        """
        Kredi skoru hesaplama
        Basit model (gerçek sistemde daha kompleks)
        """
        score = 600  # Base score
        
        # Faktörler:
        # 1. Hesap sayısı
        account_count = len(user_data.get('accounts', []))
        score += min(account_count * 20, 100)
        
        # 2. Toplam bakiye
        total_balance = sum(acc.get('balance', 0) for acc in user_data.get('accounts', []))
        if total_balance > 50000:
            score += 50
        elif total_balance > 20000:
            score += 30
        elif total_balance > 10000:
            score += 15
        
        # 3. Kredi kartı borç durumu
        cards = user_data.get('cards', [])
        credit_cards = [c for c in cards if c.get('card_type') == 'credit']
        
        if credit_cards:
            total_debt = sum(c.get('balance', 0) for c in credit_cards)
            total_limit = sum(c.get('limit', 0) for c in credit_cards)
            
            if total_limit > 0:
                utilization = (total_debt / total_limit) * 100
                if utilization < 30:
                    score += 50
                elif utilization < 50:
                    score += 20
                elif utilization > 80:
                    score -= 50
        
        # 4. İşlem geçmişi (aktif kullanım)
        transaction_count = len(user_data.get('transactions', []))
        score += min(transaction_count * 2, 50)
        
        # Sınırlar
        score = max(300, min(850, score))
        
        return score
    
    def get_credit_rating(self, score: int) -> str:
        """Kredi notu"""
        if score >= 750:
            return 'excellent'
        elif score >= 650:
            return 'good'
        elif score >= 550:
            return 'fair'
        else:
            return 'poor'
    
    def calculate_loan_offer(self,
                             amount_needed: float,
                             duration_months: int,
                             credit_score: int,
                             user_income: float) -> Optional[Dict]:
        """
        Kredi teklifi hesapla
        """
        
        # Kredi skoru kontrolü
        if credit_score < self.min_credit_score:
            return {
                'approved': False,
                'reason': 'Kredi skorunuz yetersiz. Minimum 500 puan gereklidir.',
                'credit_score': credit_score
            }
        
        # Tutar kontrolü
        if amount_needed > self.max_loan_amount:
            return {
                'approved': False,
                'reason': f'Maksimum kredi tutarı {self.max_loan_amount:,.2f} TL\'dir.',
                'requested_amount': amount_needed
            }
        
        # Gelir kontrolü (aylık taksit gelirinizin %40\'ını geçemez)
        credit_rating = self.get_credit_rating(credit_score)
        interest_rate = self.interest_rates[credit_rating]
        
        # Basit taksit hesabı (eşit taksit)
        monthly_interest = interest_rate / 100 / 12
        if monthly_interest > 0:
            # Eşit taksit formülü
            monthly_payment = amount_needed * (monthly_interest * (1 + monthly_interest) ** duration_months) / \
                              ((1 + monthly_interest) ** duration_months - 1)
        else:
            monthly_payment = amount_needed / duration_months
        
        # Gelir kontrolü
        max_payment = user_income * 0.40
        
        if monthly_payment > max_payment:
            return {
                'approved': False,
                'reason': f'Aylık taksit ({monthly_payment:,.2f} TL) gelirinizin %40\'ını ({max_payment:,.2f} TL) aşıyor.',
                'monthly_payment': round(monthly_payment, 2),
                'max_affordable_payment': round(max_payment, 2)
            }
        
        # Toplam ödeme
        total_payment = monthly_payment * duration_months
        total_interest = total_payment - amount_needed
        
        # ONAYLANDI
        return {
            'approved': True,
            'loan_id': str(uuid.uuid4()),
            'amount': round(amount_needed, 2),
            'duration_months': duration_months,
            'interest_rate': interest_rate,
            'monthly_payment': round(monthly_payment, 2),
            'total_payment': round(total_payment, 2),
            'total_interest': round(total_interest, 2),
            'credit_score': credit_score,
            'credit_rating': credit_rating,
            'first_payment_date': (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d'),
            'last_payment_date': (datetime.now() + timedelta(days=30 * duration_months)).strftime('%Y-%m-%d')
        }
    
    def suggest_credit_for_goal(self,
                                 goal_data: Dict,
                                 scenario_result: Dict,
                                 user_data: Dict) -> Optional[Dict]:
        """
        Finansal hedef için kredi önerisi
        """
        
        # Eksik tutar
        shortage = scenario_result.get('real_scenario', {}).get('shortage', 0)
        
        if shortage <= 0:
            return None  # Kredi gerekmiyor
        
        # Eksik tutar çok büyükse önerme (%50'den fazla)
        target_amount = goal_data.get('target_amount', 0)
        if shortage > target_amount * 0.5:
            return None  # Çok büyük eksik, kredi uygun değil
        
        # Kredi skoru hesapla
        credit_score = self.calculate_credit_score(user_data)
        
        # Kredi teklifi
        duration_months = min(12, goal_data.get('duration_months', 12))  # Max 12 ay
        user_income = goal_data.get('monthly_income', 0)
        
        loan_offer = self.calculate_loan_offer(
            amount_needed=shortage,
            duration_months=duration_months,
            credit_score=credit_score,
            user_income=user_income
        )
        
        if loan_offer and loan_offer.get('approved'):
            loan_offer['purpose'] = f"{goal_data.get('goal_name')} için kredi"
            loan_offer['suggestion_type'] = 'goal_credit'
            
        return loan_offer
    
    def apply_for_credit(self, 
                          user_id: str,
                          loan_offer: Dict,
                          goal_id: Optional[str] = None) -> Dict:
        """
        Kredi başvurusu yap
        """
        
        if not loan_offer.get('approved'):
            return {
                'success': False,
                'message': 'Kredi onaylanmadı. Başvuru yapılamaz.'
            }
        
        # Başvuru oluştur
        application_id = str(uuid.uuid4())
        
        application = {
            'application_id': application_id,
            'user_id': user_id,
            'loan_id': loan_offer.get('loan_id'),
            'goal_id': goal_id,
            'amount': loan_offer['amount'],
            'duration_months': loan_offer['duration_months'],
            'interest_rate': loan_offer['interest_rate'],
            'monthly_payment': loan_offer['monthly_payment'],
            'status': 'pending',  # pending, approved, rejected, disbursed
            'applied_at': datetime.now().isoformat(),
            'decision_date': None,
            'disbursement_date': None
        }
        
        # Demo: Otomatik onay (gerçek sistemde manuel veya otomatik değerlendirme)
        application['status'] = 'approved'
        application['decision_date'] = datetime.now().isoformat()
        
        return {
            'success': True,
            'message': 'Kredi başvurunuz onaylandı!',
            'application': application
        }
    
    def disburse_credit(self, application_id: str, account_id: str) -> Dict:
        """
        Krediyi hesaba aktar (gerçek sistemde)
        """
        
        return {
            'success': True,
            'message': 'Kredi hesabınıza aktarıldı.',
            'application_id': application_id,
            'account_id': account_id,
            'disbursement_date': datetime.now().isoformat()
        }


# Global instance
credit_system = CreditSystem()
