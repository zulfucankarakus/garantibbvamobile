"""
🧠 Smart Financial Decision Engine
Kullanıcının gelir/gider/birikim durumuna göre akıllı finansal kararlar verir
"""

from typing import Dict, Any, List
from datetime import datetime, timedelta
import math


class SmartFinancialDecisionEngine:
    """
    Akıllı Finansal Karar Motoru
    
    Kullanıcının mali durumuna göre en iyi finansman yöntemini belirler:
    1. Nakit ödeme
    2. Kredi kartı taksit
    3. Banka kredisi
    4. Birikim planı + kredi kartı
    5. Birikim planı + kredi
    """
    
    def __init__(self):
        # Faiz oranları (aylık)
        self.interest_rates = {
            'consumer_loan': 0.039,      # Tüketici kredisi %3.9/ay
            'vehicle_loan': 0.035,       # Taşıt kredisi %3.5/ay
            'mortgage': 0.029,           # Konut kredisi %2.9/ay
            'credit_card': 0.045,        # Kredi kartı %4.5/ay (faizli taksit)
            'cc_installment': 0.0,       # Faizsiz taksit kampanyası
            'savings_interest': 0.04     # Mevduat faizi %4/ay
        }
        
        # Risk skorları
        self.risk_thresholds = {
            'excellent': 750,  # Mükemmel kredi notu
            'good': 650,       # İyi kredi notu
            'fair': 550,       # Orta kredi notu
            'poor': 450        # Zayıf kredi notu
        }
        
        print("🧠 Smart Financial Decision Engine initialized")
    
    async def make_decision(
        self,
        user_profile: Dict[str, Any],
        product_info: Dict[str, Any],
        price: float
    ) -> Dict[str, Any]:
        """
        Ana karar motoru - En iyi finansman yöntemini belirler
        
        Args:
            user_profile: {
                balance: Mevcut bakiye,
                monthly_income: Aylık gelir,
                monthly_expense: Aylık gider,
                credit_score: Kredi notu (300-900),
                has_active_loan: Aktif kredi var mı?,
                active_loan_payment: Aktif kredi aylık ödeme,
                savings_goal: Tasarruf hedefi
            }
            product_info: {
                name: Ürün adı,
                category: Kategori
            }
            price: Ürün fiyatı
        
        Returns:
            Decision object with recommendation, alternatives, and navigation
        """
        
        print(f"\n🧠 Making financial decision for {product_info['name']} ({price:,.0f} TL)")
        
        # 0. Özel modlar kontrolü
        loan_only_mode = product_info.get('loan_only_mode', False)
        
        if loan_only_mode:
            print("   🏦 LOAN-ONLY MODE (200K+ TL product)")
        
        # 1. Kullanıcı profil analizi
        profile_analysis = self._analyze_user_profile(user_profile, price)
        
        # Kredi kartı limit kontrolü
        has_credit_card = user_profile.get('has_credit_card', False)
        available_credit_limit = user_profile.get('available_credit_limit', 0)
        
        print(f"   💳 Credit card: {has_credit_card}, Available limit: {available_credit_limit:,.0f} TL")
        
        # 2. Tüm seçenekleri değerlendir
        options = []
        
        # LOAN-ONLY MODE: Sadece kredi seçenekleri!
        if loan_only_mode:
            # Sadece kredi seçenekleri
            if profile_analysis['eligible_for_loan']:
                loan_option = self._evaluate_loan(user_profile, price, product_info['category'], profile_analysis)
                if loan_option:
                    options.append(loan_option)
                
                # Farklı vadelerle alternatifler
                for alt_term in [48, 60, 72]:
                    alt_loan = self._evaluate_loan_with_term(user_profile, price, product_info['category'], alt_term, profile_analysis)
                    if alt_loan:
                        options.append(alt_loan)
        else:
            # Normal mod - Tüm seçenekler
            
            # Seçenek 1: Nakit ödeme
            if profile_analysis['can_afford_cash']:
                cash_option = self._evaluate_cash_payment(user_profile, price, profile_analysis)
                if cash_option:
                    options.append(cash_option)
            
            # Seçenek 2: Kredi kartı taksit - LİMİT KONTROLÜ!
            if profile_analysis['eligible_for_installment'] and has_credit_card:
                # Limit yeterli mi?
                if available_credit_limit >= price:
                    print(f"   ✅ Credit limit sufficient ({available_credit_limit:,.0f} >= {price:,.0f})")
                    cc_option = self._evaluate_cc_installment(user_profile, price, profile_analysis)
                    if cc_option:
                        options.append(cc_option)
                else:
                    print(f"   ❌ Credit limit insufficient ({available_credit_limit:,.0f} < {price:,.0f})")
                    # Taksit seçeneği ekleme!
            
            # Seçenek 3: Banka kredisi
            if profile_analysis['eligible_for_loan']:
                loan_option = self._evaluate_loan(user_profile, price, product_info['category'], profile_analysis)
                if loan_option:
                    options.append(loan_option)
            
            # Seçenek 4: Birikim planı + kredi kartı (Sadece gerçekçiyse)
            if price < 200000:  # Sadece 200K altı için
                savings_cc = self._evaluate_savings_plus_cc(user_profile, price, profile_analysis)
                if savings_cc:
                    options.append(savings_cc)
            
            # Seçenek 5: Birikim planı + kredi (Sadece gerçekçiyse)
            if price < 200000:  # Sadece 200K altı için
                savings_loan = self._evaluate_savings_plus_loan(user_profile, price, profile_analysis)
                if savings_loan:
                    options.append(savings_loan)
        
        # None'ları filtrele
        options = [opt for opt in options if opt is not None]
        
        print(f"   📊 Generated {len(options)} options")
        
        # 3. Seçenekleri skorla ve sırala
        scored_options = self._score_options(options, user_profile, price, profile_analysis)
        
        # 4. En iyi seçeneği belirle
        best_option = scored_options[0] if scored_options else None
        
        # ÖNEMLİ: Hiçbir seçenek yoksa, en azından kredi öner!
        if not best_option:
            print("   ⚠️ No options generated, creating emergency loan option...")
            best_option = self._create_emergency_loan(price, product_info['category'], profile_analysis)
            scored_options = [best_option] if best_option else []
        
        # 5. Karar ver ve yönlendirme oluştur
        decision = self._create_decision(
            best_option=best_option,
            all_options=scored_options,
            user_profile=user_profile,
            product_info=product_info,
            price=price,
            profile_analysis=profile_analysis
        )
        
        print(f"   ✅ Decision: {decision['recommendation']['action']}")
        print(f"   📊 Score: {decision['recommendation']['score']:.1f}/100")
        
        return decision
    
    def _analyze_user_profile(self, profile: Dict, price: float) -> Dict:
        """Kullanıcı profil analizi"""
        
        balance = profile.get('balance', 0)
        monthly_income = profile.get('monthly_income', 0)
        monthly_expense = profile.get('monthly_expense', 0)
        credit_score = profile.get('credit_score', 650)
        active_loan_payment = profile.get('active_loan_payment', 0)
        
        # Kullanılabilir aylık gelir
        monthly_available = monthly_income - monthly_expense - active_loan_payment
        
        # Ödeme gücü analizi
        max_monthly_payment = monthly_available * 0.40  # Gelirin max %40'ı
        safe_monthly_payment = monthly_available * 0.25  # Güvenli oran %25
        
        # Kredi değerliliği
        can_afford_cash = balance >= price
        eligible_for_installment = credit_score >= self.risk_thresholds['fair'] and monthly_income > 0
        eligible_for_loan = (
            credit_score >= self.risk_thresholds['good'] and
            monthly_income >= 20000 and
            active_loan_payment < monthly_income * 0.30
        )
        
        # Risk seviyesi
        if credit_score >= self.risk_thresholds['excellent']:
            risk_level = 'low'
        elif credit_score >= self.risk_thresholds['good']:
            risk_level = 'medium'
        else:
            risk_level = 'high'
        
        # Birikim kapasitesi
        monthly_savings_capacity = max(monthly_available * 0.30, 0)
        months_to_save = math.ceil(price / monthly_savings_capacity) if monthly_savings_capacity > 0 else 999
        
        return {
            'balance': balance,
            'monthly_available': monthly_available,
            'max_monthly_payment': max_monthly_payment,
            'safe_monthly_payment': safe_monthly_payment,
            'can_afford_cash': can_afford_cash,
            'eligible_for_installment': eligible_for_installment,
            'eligible_for_loan': eligible_for_loan,
            'risk_level': risk_level,
            'credit_score': credit_score,
            'monthly_savings_capacity': monthly_savings_capacity,
            'months_to_save': months_to_save
        }
    
    def _evaluate_cash_payment(self, profile: Dict, price: float, analysis: Dict) -> Dict:
        """Nakit ödeme değerlendirmesi"""
        
        balance_after = analysis['balance'] - price
        emergency_fund_safe = balance_after >= profile.get('monthly_expense', 0) * 3
        
        return {
            'type': 'cash',
            'action': 'cash_payment',
            'title': '💵 Peşin Nakit Ödeme',
            'description': f'{price:,.0f} TL peşin öde, hemen sahip ol!',
            'monthly_payment': 0,
            'total_cost': price * 0.95,  # %5 nakit indirimi
            'term_months': 0,
            'interest_rate': 0,
            'discount': price * 0.05,
            'balance_after': balance_after,
            'pros': [
                f'{price * 0.05:,.0f} TL nakit indirimi',
                'Faiz ödemezsin',
                'Anında sahip olursun',
                'Borçlanmazsın'
            ],
            'cons': [
                f'Bakiye {balance_after:,.0f} TL\'ye düşer',
                'Acil durum fonu azalır' if not emergency_fund_safe else None
            ],
            'risk_level': 'low' if emergency_fund_safe else 'medium',
            'recommended': emergency_fund_safe and analysis['balance'] > price * 1.5,
            'navigation': {
                'screen': 'PaymentConfirmation',
                'params': {'method': 'cash', 'amount': price * 0.95}
            }
        }
    
    def _evaluate_cc_installment(self, profile: Dict, price: float, analysis: Dict) -> Dict:
        """Kredi kartı faizsiz taksit değerlendirmesi"""
        
        # Taksit vadesi belirleme
        if price < 5000:
            term = 3
        elif price < 20000:
            term = 6
        elif price < 50000:
            term = 12
        else:
            term = 18
        
        monthly_payment = price / term
        affordable = monthly_payment <= analysis['safe_monthly_payment']
        
        return {
            'type': 'installment',
            'action': 'credit_card_installment',
            'title': f'💳 {term} Ay Faizsiz Taksit',
            'description': f'Aylık {monthly_payment:,.0f} TL ile sahip ol!',
            'monthly_payment': round(monthly_payment, 2),
            'total_cost': price,
            'term_months': term,
            'interest_rate': 0,
            'bonus_points': int(price * 0.01),  # %1 bonus puan
            'pros': [
                'Faizsiz taksit kampanyası',
                f'{int(price * 0.01)} bonus puan kazan',
                'Bakiyeni korursun',
                'Aylık ödeme rahat'
            ],
            'cons': [
                f'{term} ay boyunca {monthly_payment:,.0f} TL ödeyeceksin',
                'Kredi kartı limiti kullanılacak'
            ],
            'risk_level': 'low' if affordable else 'medium',
            'recommended': affordable and term <= 12,
            'navigation': {
                'screen': 'InstallmentSelection',
                'params': {'term': term, 'monthly_payment': monthly_payment}
            }
        }
    
    def _evaluate_cc_interest(self, profile: Dict, price: float, analysis: Dict) -> Dict:
        """Kredi kartı faizli taksit değerlendirmesi"""
        
        term = 24  # 24 ay faizli taksit
        rate = self.interest_rates['credit_card']
        
        # Aylık ödeme hesaplama
        monthly_payment = (price * rate * (1 + rate) ** term) / (((1 + rate) ** term) - 1)
        total_cost = monthly_payment * term
        total_interest = total_cost - price
        
        affordable = monthly_payment <= analysis['safe_monthly_payment']
        
        return {
            'type': 'installment_interest',
            'action': 'credit_card_interest',
            'title': f'💳 {term} Ay Faizli Taksit',
            'description': f'Aylık {monthly_payment:,.0f} TL (%{rate*100:.1f} faiz)',
            'monthly_payment': round(monthly_payment, 2),
            'total_cost': round(total_cost, 2),
            'term_months': term,
            'interest_rate': rate * 100,
            'total_interest': round(total_interest, 2),
            'pros': [
                'Uzun vade imkanı',
                'Bakiyeni korursun'
            ],
            'cons': [
                f'{total_interest:,.0f} TL faiz ödeyeceksin',
                'Yüksek faiz oranı',
                f'Toplam maliyet {total_cost:,.0f} TL'
            ],
            'risk_level': 'medium' if affordable else 'high',
            'recommended': False,  # Genelde önerilmez
            'navigation': {
                'screen': 'InstallmentSelection',
                'params': {'term': term, 'monthly_payment': monthly_payment, 'interest': True}
            }
        }
    
    def _evaluate_loan(self, profile: Dict, price: float, category: str, analysis: Dict) -> Dict:
        """Banka kredisi değerlendirmesi"""
        
        # Kredi türünü belirle
        if category == 'vehicle':
            loan_type = 'vehicle_loan'
            term = 36  # 3 yıl
        elif category == 'home':
            loan_type = 'mortgage'
            term = 60  # 5 yıl
        else:
            loan_type = 'consumer_loan'
            term = 24  # 2 yıl
        
        rate = self.interest_rates[loan_type]
        
        # Aylık ödeme hesaplama
        monthly_payment = (price * rate * (1 + rate) ** term) / (((1 + rate) ** term) - 1)
        total_cost = monthly_payment * term
        total_interest = total_cost - price
        
        affordable = monthly_payment <= analysis['safe_monthly_payment']
        
        # Kredi onayı simülasyonu
        max_loan = analysis['credit_score'] * 1000  # Kredi notu × 1000
        approved = price <= max_loan
        
        return {
            'type': 'loan',
            'action': 'bank_loan',
            'title': f'🏦 {term} Ay Banka Kredisi',
            'description': f'%{rate*100:.1f} faizle aylık {monthly_payment:,.0f} TL',
            'monthly_payment': round(monthly_payment, 2),
            'total_cost': round(total_cost, 2),
            'term_months': term,
            'interest_rate': rate * 100,
            'total_interest': round(total_interest, 2),
            'loan_type': loan_type,
            'approved': approved,
            'max_loan_amount': max_loan,
            'pros': [
                f'Uzun vade ({term} ay)',
                'Düşük faiz oranı' if rate < 0.04 else 'Uygun faiz oranı',
                'Bakiyeni korursun',
                'Hemen sahip olursun'
            ],
            'cons': [
                f'{total_interest:,.0f} TL faiz ödeyeceksin',
                f'Toplam maliyet {total_cost:,.0f} TL',
                'Kredi borçlanması'
            ],
            'risk_level': 'medium' if affordable else 'high',
            'recommended': approved and affordable and term <= 36,
            'navigation': {
                'screen': 'LoanApplication',
                'params': {
                    'loan_type': loan_type,
                    'amount': price,
                    'term': term,
                    'monthly_payment': monthly_payment
                }
            }
        }
    
    def _evaluate_loan_with_term(self, profile: Dict, price: float, category: str, term: int, analysis: Dict) -> Dict:
        """Belirli vade ile kredi değerlendirmesi"""
        
        # Kredi türünü belirle
        if category == 'vehicle':
            loan_type = 'vehicle_loan'
        elif category == 'home':
            loan_type = 'mortgage'
        else:
            loan_type = 'consumer_loan'
        
        rate = self.interest_rates[loan_type]
        
        # Aylık ödeme hesaplama
        monthly_payment = (price * rate * (1 + rate) ** term) / (((1 + rate) ** term) - 1)
        total_cost = monthly_payment * term
        total_interest = total_cost - price
        
        affordable = monthly_payment <= analysis['safe_monthly_payment']
        
        # Kredi onayı simülasyonu
        max_loan = analysis['credit_score'] * 1000
        approved = price <= max_loan
        
        return {
            'type': 'loan',
            'action': 'bank_loan',
            'title': f'🏦 {term} Ay {loan_type.replace("_", " ").title()}',
            'description': f'%{rate*100:.1f} faizle aylık {monthly_payment:,.0f} TL',
            'monthly_payment': round(monthly_payment, 2),
            'total_cost': round(total_cost, 2),
            'term_months': term,
            'interest_rate': rate * 100,
            'total_interest': round(total_interest, 2),
            'loan_type': loan_type,
            'approved': approved,
            'max_loan_amount': max_loan,
            'pros': [
                f'{term} ay vade',
                'Düşük aylık ödeme' if term >= 48 else 'Orta vadeli',
                'Hemen sahip olursun'
            ],
            'cons': [
                f'{total_interest:,.0f} TL faiz',
                f'Toplam {total_cost:,.0f} TL'
            ],
            'risk_level': 'medium' if affordable else 'high',
            'recommended': approved and affordable,
            'navigation': {
                'screen': 'LoanApplication',
                'params': {
                    'loan_type': loan_type,
                    'amount': price,
                    'term': term,
                    'monthly_payment': monthly_payment
                }
            }
        }
    
    def _evaluate_savings_plus_cc(self, profile: Dict, price: float, analysis: Dict) -> Dict:
        """Birikim planı + kredi kartı - AKILLI HESAPLAMA (Max 24 ay)"""
        
        current_balance = analysis['balance']
        monthly_capacity = analysis['monthly_savings_capacity']
        
        # AKILLI KARAR: Ürün çok pahalıysa birikim planı ÖNERİLMEZ!
        max_savings_months = 24  # Maksimum 2 yıl
        
        # 24 ayda ne kadar biriktirebilir?
        max_savings_amount = monthly_capacity * max_savings_months
        total_available = current_balance + max_savings_amount
        
        # Fiyat çok yüksekse (24 ay biriktirse bile yetmezse)
        if price > total_available * 2:
            # BU PLANI ÖNERME! None döndür
            return None
        
        # Gerçekçi peşinat hedefi: %20-30
        down_payment_ratio = 0.25  # %25 peşinat
        needed_savings = price * down_payment_ratio
        total_needed = max(needed_savings - current_balance, 0)
        
        # Birikim süresi hesapla
        months_to_save = math.ceil(total_needed / monthly_capacity) if monthly_capacity > 0 else 999
        
        # KONTROL: 24 aydan fazlaysa bu planı ÖNERME
        if months_to_save > max_savings_months:
            return None  # Bu plan uygun değil
        
        # Kalan miktar için taksit
        remaining_amount = price - needed_savings
        installment_term = 12
        monthly_installment = remaining_amount / installment_term
        
        total_months = months_to_save + installment_term
        
        return {
            'type': 'savings_cc',
            'action': 'savings_plan_credit_card',
            'title': f'💰 {months_to_save} Ay Birikim + {installment_term} Ay Taksit',
            'description': f'Önce {needed_savings:,.0f} TL biriktir (%25 peşinat), sonra taksitle al',
            'savings_phase': {
                'duration_months': months_to_save,
                'monthly_savings': round(monthly_capacity, 2),
                'total_savings': round(needed_savings, 2),
                'target_date': (datetime.now() + timedelta(days=months_to_save * 30)).strftime('%Y-%m-%d')
            },
            'installment_phase': {
                'duration_months': installment_term,
                'monthly_payment': round(monthly_installment, 2),
                'total_amount': round(remaining_amount, 2)
            },
            'total_months': total_months,
            'total_cost': price,
            'pros': [
                'Faiz ödemezsin',
                f'Sadece {months_to_save} ay bekleme ({months_to_save//12} yıl)',
                'Düşük aylık yük',
                'Borç azaltılmış'
            ],
            'cons': [
                f'{months_to_save} ay beklemen gerekir',
                f'Toplam {total_months} ay sürer'
            ],
            'risk_level': 'low',
            'recommended': months_to_save <= 24 and monthly_capacity > 0,
            'navigation': {
                'screen': 'SavingsPlan',
                'params': {
                    'plan_type': 'savings_cc',
                    'savings_duration': months_to_save,
                    'monthly_savings': monthly_capacity
                }
            }
        }
    
    def _evaluate_savings_plus_loan(self, profile: Dict, price: float, analysis: Dict) -> Dict:
        """Birikim + Kredi - AKILLI (Max 24 ay birikim)"""
        
        monthly_capacity = analysis['monthly_savings_capacity']
        max_savings_months = 24  # Max 2 yıl
        
        # 24 ayda ne kadar biriktirebilir?
        max_possible_savings = monthly_capacity * max_savings_months + analysis['balance']
        
        # Çok pahalıysa bu planı önerme
        if price > max_possible_savings * 3:
            return None
        
        # Peşinat: %15-20 (düşük)
        down_payment = price * 0.15
        needed_savings = max(down_payment - analysis['balance'], 0)
        
        months_to_save = math.ceil(needed_savings / monthly_capacity) if monthly_capacity > 0 else 999
        
        # 24 aydan fazlaysa önerme
        if months_to_save > max_savings_months:
            return None
        
        # Kalan için kredi
        loan_amount = price - down_payment
        loan_term = 36  # 3 yıl
        rate = self.interest_rates['consumer_loan']
        monthly_loan = (loan_amount * rate * (1 + rate) ** loan_term) / (((1 + rate) ** loan_term) - 1)
        total_loan_cost = monthly_loan * loan_term
        
        return {
            'type': 'savings_loan',
            'action': 'savings_plan_loan',
            'title': f'💰 {months_to_save} Ay Birikim + {loan_term} Ay Kredi',
            'description': '%15 peşinat biriktir, geri kalanı kredi ile',
            'savings_phase': {
                'duration_months': months_to_save,
                'monthly_savings': round(monthly_capacity, 2),
                'total_savings': round(down_payment, 2)
            },
            'loan_phase': {
                'duration_months': loan_term,
                'monthly_payment': round(monthly_loan, 2),
                'loan_amount': round(loan_amount, 2),
                'total_cost': round(total_loan_cost, 2),
                'interest_rate': rate * 100
            },
            'total_cost': round(down_payment + total_loan_cost, 2),
            'pros': [
                f'Sadece {months_to_save} ay bekleme',
                'Peşinat ile kredi düşer',
                'Uygun faiz'
            ],
            'cons': [
                'Kredi borcu',
                f'Toplam faiz: {total_loan_cost - loan_amount:,.0f} TL'
            ],
            'risk_level': 'medium',
            'recommended': months_to_save <= 24,
            'navigation': {
                'screen': 'SavingsPlan',
                'params': {
                    'plan_type': 'savings_loan',
                    'savings_duration': months_to_save,
                    'loan_amount': loan_amount
                }
            }
        }
    
    def _create_emergency_loan(self, price: float, category: str, analysis: Dict) -> Dict:
        """Acil durum kredisi - hiçbir seçenek yoksa son çare"""
        
        # Kategori bazlı kredi türü
        if category == 'vehicle':
            loan_type = 'vehicle_loan'
            term = 48  # 4 yıl
        elif category == 'home':
            loan_type = 'mortgage'
            term = 120  # 10 yıl
        else:
            loan_type = 'consumer_loan'
            term = 36  # 3 yıl
        
        rate = self.interest_rates[loan_type]
        
        # Aylık ödeme hesaplama
        monthly_payment = (price * rate * (1 + rate) ** term) / (((1 + rate) ** term) - 1)
        total_cost = monthly_payment * term
        total_interest = total_cost - price
        
        return {
            'type': 'loan',
            'action': 'bank_loan',
            'title': f'🏦 {term} Ay Banka Kredisi (Acil)',
            'description': f'%{rate*100:.1f} faizle aylık {monthly_payment:,.0f} TL',
            'monthly_payment': round(monthly_payment, 2),
            'total_cost': round(total_cost, 2),
            'term_months': term,
            'interest_rate': rate * 100,
            'total_interest': round(total_interest, 2),
            'loan_type': loan_type,
            'approved': False,  # Değerlendirmeye tabi
            'pros': [
                f'Uzun vade ({term} ay)',
                'Hemen sahip olma imkanı',
                'Esnek ödeme planı'
            ],
            'cons': [
                f'{total_interest:,.0f} TL faiz ödeyeceksin',
                f'Toplam maliyet {total_cost:,.0f} TL',
                'Kredi onayı gerekli'
            ],
            'risk_level': 'high',
            'recommended': False,
            'score': 30,  # Düşük skor
            'navigation': {
                'screen': 'LoanApplication',
                'params': {
                    'loan_type': loan_type,
                    'amount': price,
                    'term': term,
                    'monthly_payment': monthly_payment,
                    'emergency': True
                }
            }
        }
    

    def _score_options(self, options: List[Dict], profile: Dict, price: float, analysis: Dict) -> List[Dict]:
        """Seçenekleri skorla ve sırala"""
        
        for option in options:
            score = 0
            
            # Risk seviyesi (40 puan)
            if option['risk_level'] == 'low':
                score += 40
            elif option['risk_level'] == 'medium':
                score += 20
            else:
                score += 5
            
            # Maliyet verimliliği (30 puan)
            cost_ratio = option['total_cost'] / price
            if cost_ratio <= 1.0:
                score += 30
            elif cost_ratio <= 1.1:
                score += 20
            elif cost_ratio <= 1.3:
                score += 10
            else:
                score += 0
            
            # Ödeme rahatı (20 puan)
            if option['type'] == 'cash':
                if analysis['balance'] > price * 2:
                    score += 20
                else:
                    score += 10
            elif 'monthly_payment' in option:
                payment_ratio = option['monthly_payment'] / analysis['safe_monthly_payment'] if analysis['safe_monthly_payment'] > 0 else 999
                if payment_ratio <= 0.5:
                    score += 20
                elif payment_ratio <= 0.8:
                    score += 15
                elif payment_ratio <= 1.0:
                    score += 10
                else:
                    score += 0
            
            # Süre faktörü (10 puan)
            if option.get('term_months', 0) == 0:
                score += 10  # Anında sahip olma
            elif option.get('term_months', 999) <= 12:
                score += 8
            elif option.get('term_months', 999) <= 24:
                score += 5
            else:
                score += 2
            
            option['score'] = score
        
        # Skora göre sırala
        return sorted(options, key=lambda x: x['score'], reverse=True)
    
    def _create_decision(self, best_option: Dict, all_options: List[Dict], user_profile: Dict, product_info: Dict, price: float, profile_analysis: Dict) -> Dict:
        """Final karar objesini oluştur"""
        
        if not best_option:
            # Hiçbir seçenek uygun değil
            return {
                'success': False,
                'message': 'Şu anda bu ürün için uygun finansman bulunamadı. Finansal danışmanımızla görüşebilirsiniz.',
                'recommendation': None,
                'alternatives': [],
                'user_analysis': profile_analysis
            }
        
        # Kullanıcıya özel mesaj
        user_message = self._generate_user_message(best_option, product_info, price, profile_analysis)
        
        return {
            'success': True,
            'message': user_message,
            'recommendation': best_option,
            'alternatives': [opt for opt in all_options if opt != best_option][:3],  # Top 3 alternatif
            'user_analysis': {
                'credit_score': profile_analysis['credit_score'],
                'risk_level': profile_analysis['risk_level'],
                'monthly_capacity': profile_analysis['safe_monthly_payment'],
                'can_save': profile_analysis['monthly_savings_capacity'] > 0,
                'savings_months': profile_analysis['months_to_save']
            },
            'next_steps': self._get_next_steps(best_option),
            'timestamp': datetime.now().isoformat()
        }
    
    def _generate_user_message(self, option: Dict, product_info: Dict, price: float, analysis: Dict) -> str:
        """Kullanıcıya özel mesaj oluştur"""
        
        product_name = product_info['name']
        
        if option['type'] == 'cash':
            return f"🎉 Harika haber! {product_name} için bakiyeniz yeterli. Peşin ödeyerek {option['discount']:,.0f} TL tasarruf edebilirsiniz!"
        
        elif option['type'] == 'installment':
            return f"💳 {product_name} aylık sadece {option['monthly_payment']:,.0f} TL ile sizin olabilir! {option['term_months']} ay faizsiz taksit fırsatı."
        
        elif option['type'] == 'loan':
            if option['approved']:
                return f"🏦 Kredi başvurunuz ön onaylı! {product_name} için {option['term_months']} ay vade ile aylık {option['monthly_payment']:,.0f} TL ödeme planı hazır."
            else:
                return f"⚠️ {product_name} için kredi başvurunuz değerlendirmeye alınacak. Alternatif seçenekleri inceleyin."
        
        elif option['type'] == 'savings_cc':
            return f"💰 Akıllı plan! {option['savings_phase']['duration_months']} ay boyunca aylık {option['savings_phase']['monthly_savings']:,.0f} TL biriktirin, sonra {option['installment_phase']['duration_months']} taksitle {product_name} sizin olsun!"
        
        elif option['type'] == 'savings_loan':
            return f"📊 Stratejik yaklaşım! Önce peşinat biriktirin, sonra uygun kredi ile {product_name}'e sahip olun."
        
        else:
            return f"{product_name} için size özel finansman planımız hazır!"
    
    def _get_next_steps(self, option: Dict) -> List[str]:
        """Sonraki adımları belirle"""
        
        if option['type'] == 'cash':
            return [
                "Ödeme ekranına git",
                "Ödeme yöntemini seç: Banka hesabı",
                "Ödemeyi onayla"
            ]
        
        elif option['type'] in ['installment', 'installment_interest']:
            return [
                "Taksit seçeneklerini incele",
                "Kredi kartını seç",
                "Taksit planını onayla"
            ]
        
        elif option['type'] == 'loan':
            return [
                "Kredi başvuru formunu doldur",
                "Kimlik ve gelir belgelerini yükle",
                "Onay bekle (1-2 iş günü)",
                "Kredi sözleşmesini imzala"
            ]
        
        elif option['type'] in ['savings_cc', 'savings_loan']:
            return [
                "Birikim planını oluştur",
                "Otomatik tasarruf talimatı ver",
                "Hedef tarihini takip et",
                "Hedef tutara ulaşınca satın al"
            ]
        
        return ["Finansman seçeneklerini incele"]


# Singleton instance
decision_engine = SmartFinancialDecisionEngine()
