"""
🧠 Financial Brain - The Brain
Intelligent financial advisory system with personalized recommendations

Features:
- Credit calculations
- Investment advisory
- Installment planning
- Personalized offers based on user profile

Intelligence: Rule-based + Data-driven decisions
"""

import os
from typing import Dict, Any, List
from datetime import datetime
import math

class FinancialBrain:
    """The Brain - Smart financial advisory"""
    
    def __init__(self):
        # Interest rates (annual)
        self.interest_rates = {
            'consumer_loan': 0.039,  # %3.9 aylık
            'vehicle_loan': 0.035,   # %3.5 aylık
            'mortgage': 0.029,       # %2.9 aylık
            'credit_card': 0.045     # %4.5 aylık
        }
        
        # Installment options
        self.installment_terms = [3, 6, 9, 12, 18, 24, 36, 48]
        
        print("🧠 Financial Brain initialized")
    
    async def generate_offer(
        self,
        user_data: Dict[str, Any],
        object_data: Dict[str, Any],
        price_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Generate personalized financial offer
        
        Args:
            user_data: User profile (balance, credit score, income)
            object_data: Object info (name, category)
            price_data: Price info (current_price)
        
        Returns:
            Comprehensive financial offer
        """
        print(f"\n🧠 Generating offer for: {object_data.get('object_name')}")
        
        category = object_data.get('category', 'other')
        price = price_data.get('data', {}).get('current_price', 0)
        
        # User financial profile
        balance = user_data.get('balance', 0)
        credit_score = user_data.get('credit_score', 750)
        monthly_income = user_data.get('monthly_income', 50000)
        
        print(f"   User: Balance={balance} TL, Score={credit_score}, Income={monthly_income} TL")
        print(f"   Product: {price} TL ({category})")
        
        # Generate offers
        offers = []
        
        # 1. Cash payment (if balance sufficient)
        if balance >= price:
            offers.append(self._cash_offer(price, balance))
        
        # 2. Credit card installments
        if price >= 100:
            offers.append(self._installment_offer(price, category))
        
        # 3. Loan options
        if price > 5000:
            offers.append(self._loan_offer(price, category, credit_score, monthly_income))
        
        # 4. Investment-based purchase
        if category in ['electronics', 'vehicle', 'home']:
            offers.append(self._investment_offer(price, category))
        
        # Select best offer
        best_offer = self._select_best_offer(offers, user_data, price)
        
        return {
            "success": True,
            "data": {
                "recommended_option": best_offer,
                "all_options": offers,
                "user_eligibility": self._check_eligibility(credit_score, monthly_income, price),
                "financial_advice": self._generate_advice(category, price, user_data)
            }
        }
    
    def _cash_offer(self, price: float, balance: float) -> Dict[str, Any]:
        """Cash payment offer"""
        discount = price * 0.05  # %5 nakit indirimi
        final_price = price - discount
        
        return {
            "type": "cash",
            "title": "💵 Nakit Ödeme",
            "description": f"Peşin öde, {discount:.0f} TL tasarruf et!",
            "total_amount": round(final_price, 2),
            "discount": round(discount, 2),
            "monthly_payment": 0,
            "term_months": 0,
            "interest_rate": 0,
            "pros": [
                f"{discount:.0f} TL nakit indirimi",
                "Faiz ödemezsin",
                "Anında sahip olursun"
            ],
            "cons": [
                f"Bakiyenden {final_price:.0f} TL düşer"
            ]
        }
    
    def _installment_offer(self, price: float, category: str) -> Dict[str, Any]:
        """Credit card installment offer"""
        # Determine best term
        if price < 1000:
            term = 3
        elif price < 5000:
            term = 6
        elif price < 20000:
            term = 12
        else:
            term = 24
        
        # Interest-free installments
        monthly_payment = price / term
        
        # Campaign bonus
        bonus_points = int(price * 0.01)  # %1 bonus
        
        return {
            "type": "installment",
            "title": f"💳 {term} Taksit",
            "description": f"Aylık {monthly_payment:.0f} TL ile sahip ol!",
            "total_amount": round(price, 2),
            "monthly_payment": round(monthly_payment, 2),
            "term_months": term,
            "interest_rate": 0,  # Faizsiz kampanya
            "bonus_points": bonus_points,
            "pros": [
                "Faizsiz taksit",
                f"{term} ay boyunca aylık {monthly_payment:.0f} TL",
                f"{bonus_points} bonus puan kazan"
            ],
            "cons": [
                "Kredi kartı limiti gerekli"
            ]
        }
    
    def _loan_offer(self, price: float, category: str, credit_score: int, monthly_income: float) -> Dict[str, Any]:
        """Loan offer calculation"""
        # Select loan type
        if category == 'vehicle':
            loan_type = 'vehicle_loan'
            term = 48  # 4 years
        elif category == 'home':
            loan_type = 'mortgage'
            term = 120  # 10 years
        else:
            loan_type = 'consumer_loan'
            term = 36  # 3 years
        
        # Interest rate (adjusted by credit score)
        base_rate = self.interest_rates[loan_type]
        if credit_score > 850:
            rate = base_rate * 0.9  # %10 discount
        elif credit_score < 650:
            rate = base_rate * 1.2  # %20 premium
        else:
            rate = base_rate
        
        # Calculate monthly payment (compound interest)
        monthly_rate = rate
        monthly_payment = (price * monthly_rate * math.pow(1 + monthly_rate, term)) / (math.pow(1 + monthly_rate, term) - 1)
        
        total_payment = monthly_payment * term
        total_interest = total_payment - price
        
        # Loan eligibility
        max_payment = monthly_income * 0.40  # Max 40% of income
        eligible = monthly_payment <= max_payment
        
        return {
            "type": "loan",
            "title": f"🏦 {term} Ay Kredi",
            "description": f"Onaylı kredin hazır! Aylık {monthly_payment:.0f} TL",
            "loan_amount": round(price, 2),
            "monthly_payment": round(monthly_payment, 2),
            "term_months": term,
            "interest_rate": round(rate * 100, 2),
            "total_payment": round(total_payment, 2),
            "total_interest": round(total_interest, 2),
            "eligible": eligible,
            "pros": [
                f"{term} ay vade",
                "Onaylı limit",
                "Hızlı onay süreci"
            ],
            "cons": [
                f"Toplam {total_interest:.0f} TL faiz",
                f"Aylık gelirin %{(monthly_payment/monthly_income*100):.0f}'ü"
            ]
        }
    
    def _investment_offer(self, price: float, category: str) -> Dict[str, Any]:
        """Investment-based purchase plan"""
        # Monthly saving needed
        months = 12  # 1 year saving plan
        monthly_save = price / months
        
        # Expected return from investment
        expected_return = 0.15  # %15 annual return (altın, hisse)
        
        # With investment returns
        future_value = monthly_save * ((math.pow(1 + expected_return/12, months) - 1) / (expected_return/12))
        
        discount = future_value - price if future_value > price else 0
        
        return {
            "type": "investment",
            "title": "📈 Yatırım Yaparak Al",
            "description": f"Aylık {monthly_save:.0f} TL biriktir, {months} ayda sahip ol!",
            "monthly_investment": round(monthly_save, 2),
            "term_months": months,
            "target_amount": round(price, 2),
            "expected_return": round(expected_return * 100, 1),
            "potential_saving": round(discount, 2),
            "investment_options": [
                "💰 Altın hesabı",
                "📊 Hisse senedi fonu",
                "💵 Döviz (USD/EUR)"
            ],
            "pros": [
                f"Potansiyel {discount:.0f} TL kazanç",
                "Finansal disiplin kazanırsın",
                "Yatırım bilgin artar"
            ],
            "cons": [
                f"{months} ay bekleme gerekir",
                "Piyasa riski var"
            ]
        }
    
    def _select_best_offer(self, offers: List[Dict], user_data: Dict, price: float) -> Dict[str, Any]:
        """Select best offer for user"""
        # Scoring system
        scores = []
        
        for offer in offers:
            score = 0
            
            # Cash is best if affordable
            if offer['type'] == 'cash' and user_data.get('balance', 0) >= price * 1.5:
                score = 100
            
            # Installment is good for medium prices
            elif offer['type'] == 'installment' and 500 < price < 20000:
                score = 90
            
            # Loan for expensive items
            elif offer['type'] == 'loan' and price > 10000 and offer.get('eligible', False):
                score = 80
            
            # Investment for patient users
            elif offer['type'] == 'investment':
                score = 70
            
            scores.append(score)
        
        # Return best
        best_idx = scores.index(max(scores))
        return offers[best_idx]
    
    def _check_eligibility(self, credit_score: int, monthly_income: float, price: float) -> Dict[str, Any]:
        """Check user eligibility for loans"""
        return {
            "credit_score": credit_score,
            "credit_rating": "Excellent" if credit_score > 850 else "Good" if credit_score > 700 else "Fair",
            "max_loan_amount": round(monthly_income * 30, 2),  # 30x monthly income
            "monthly_payment_capacity": round(monthly_income * 0.40, 2),  # 40% of income
            "eligible_for_loan": credit_score >= 600 and monthly_income > 0
        }
    
    def _generate_advice(self, category: str, price: float, user_data: Dict) -> List[str]:
        """Generate personalized financial advice"""
        advice = []
        
        balance = user_data.get('balance', 0)
        
        if balance >= price * 1.2:
            advice.append("💡 Bakiyeniz yeterli, nakit öneriyoruz - faizden kaçının!")
        elif price > balance * 2:
            advice.append("💡 Büyük bir alım, taksit veya kredi düşünün")
        
        if category == 'electronics':
            advice.append("📱 Teknoloji ürünleri hızlı değer kaybeder, uzun vade krediden kaçının")
        elif category == 'vehicle':
            advice.append("🚗 Araç kredisi faizleri düşük, uzun vadeli kredi mantıklı olabilir")
        elif category == 'jewelry':
            advice.append("💍 Altın yatırım aracı, gram fiyatını takip edin")
        
        if price > 50000:
            advice.append("💰 Büyük alımlarda %5-10 pazarlık yapabilirsiniz")
        
        return advice
