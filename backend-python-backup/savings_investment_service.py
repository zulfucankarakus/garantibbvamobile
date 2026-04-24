"""
Savings + Investment Service
Birikim Planı + Yatırım Entegrasyonu + Kredi Yönlendirme
"""
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from enum import Enum
import uuid
import random


class InvestmentStrategy(str, Enum):
    TL_ONLY = "tl_only"           # Sadece TL birikim
    GOLD_HEAVY = "gold_heavy"     # Altın ağırlıklı
    USD_HEAVY = "usd_heavy"       # Dolar ağırlıklı
    EUR_HEAVY = "eur_heavy"       # Euro ağırlıklı
    BALANCED = "balanced"         # Dengeli portföy
    CUSTOM = "custom"             # Kullanıcı özel dağılım


class RiskProfile(str, Enum):
    LOW = "low"           # Düşük risk - Altın & TL ağırlıklı
    MEDIUM = "medium"     # Orta risk - Dengeli
    HIGH = "high"         # Yüksek risk - Döviz ağırlıklı


class SavingsInvestmentService:
    """Birikim + Yatırım + Kredi Yönlendirme Servisi"""
    
    def __init__(self):
        # Risk profiline göre varsayılan dağılımlar
        self.default_allocations = {
            RiskProfile.LOW: {
                "tl_savings": 40,
                "gold": 35,
                "usd": 15,
                "eur": 10
            },
            RiskProfile.MEDIUM: {
                "tl_savings": 25,
                "gold": 25,
                "usd": 25,
                "eur": 25
            },
            RiskProfile.HIGH: {
                "tl_savings": 10,
                "gold": 15,
                "usd": 40,
                "eur": 35
            }
        }
        
        # Strateji bazlı dağılımlar
        self.strategy_allocations = {
            InvestmentStrategy.TL_ONLY: {"tl_savings": 100, "gold": 0, "usd": 0, "eur": 0},
            InvestmentStrategy.GOLD_HEAVY: {"tl_savings": 20, "gold": 50, "usd": 15, "eur": 15},
            InvestmentStrategy.USD_HEAVY: {"tl_savings": 15, "gold": 15, "usd": 50, "eur": 20},
            InvestmentStrategy.EUR_HEAVY: {"tl_savings": 15, "gold": 15, "usd": 20, "eur": 50},
            InvestmentStrategy.BALANCED: {"tl_savings": 25, "gold": 25, "usd": 25, "eur": 25},
        }
        
        # Tahmini yıllık getiri oranları (%)
        self.expected_returns = {
            "tl_savings": 45.0,    # TL mevduat faizi
            "gold": 55.0,         # Altın yıllık getiri tahmini
            "usd": 35.0,          # Dolar yıllık değer artışı
            "eur": 30.0           # Euro yıllık değer artışı
        }
        
        # Enflasyon tahmini
        self.inflation_rate = 50.0  # Yıllık %
    
    def get_allocation_by_risk(self, risk_profile: str) -> Dict[str, int]:
        """Risk profiline göre yatırım dağılımı döndür"""
        try:
            profile = RiskProfile(risk_profile)
            return self.default_allocations.get(profile, self.default_allocations[RiskProfile.MEDIUM])
        except ValueError:
            return self.default_allocations[RiskProfile.MEDIUM]
    
    def get_allocation_by_strategy(self, strategy: str) -> Dict[str, int]:
        """Stratejiye göre yatırım dağılımı döndür"""
        try:
            strat = InvestmentStrategy(strategy)
            return self.strategy_allocations.get(strat, self.strategy_allocations[InvestmentStrategy.BALANCED])
        except ValueError:
            return self.strategy_allocations[InvestmentStrategy.BALANCED]
    
    def calculate_investment_distribution(
        self,
        amount: float,
        allocation: Dict[str, int]
    ) -> Dict[str, float]:
        """Tutarı yatırım araçlarına dağıt"""
        distribution = {}
        for asset, percentage in allocation.items():
            distribution[asset] = round(amount * (percentage / 100), 2)
        return distribution
    
    def estimate_future_value(
        self,
        monthly_contribution: float,
        duration_months: int,
        allocation: Dict[str, int],
        existing_savings: float = 0
    ) -> Dict[str, Any]:
        """Gelecek değer tahmini - yatırım getirileriyle birlikte"""
        
        total_contribution = monthly_contribution * duration_months + existing_savings
        
        # Her varlık için getiri hesapla
        asset_values = {}
        total_value = 0
        
        for asset, percentage in allocation.items():
            annual_return = self.expected_returns.get(asset, 0) / 100
            monthly_return = (1 + annual_return) ** (1/12) - 1
            
            # Bileşik faiz ile aylık katkı hesabı
            future_value = 0
            for month in range(duration_months):
                # Her ay katkı ekle ve değerlendir
                contribution_this_month = monthly_contribution * (percentage / 100)
                months_to_grow = duration_months - month
                future_value += contribution_this_month * ((1 + monthly_return) ** months_to_grow)
            
            # Mevcut birikimi de değerlendir
            existing_portion = existing_savings * (percentage / 100)
            future_value += existing_portion * ((1 + monthly_return) ** duration_months)
            
            asset_values[asset] = round(future_value, 2)
            total_value += future_value
        
        # Toplam getiri
        total_profit = total_value - total_contribution
        profit_percentage = (total_profit / total_contribution * 100) if total_contribution > 0 else 0
        
        # Enflasyon etkisi
        monthly_inflation = (1 + self.inflation_rate / 100) ** (1/12) - 1
        inflation_adjusted_value = total_value / ((1 + monthly_inflation) ** duration_months)
        real_return = ((inflation_adjusted_value / total_contribution) - 1) * 100 if total_contribution > 0 else 0
        
        return {
            "total_contribution": round(total_contribution, 2),
            "estimated_value": round(total_value, 2),
            "estimated_profit": round(total_profit, 2),
            "profit_percentage": round(profit_percentage, 2),
            "asset_breakdown": asset_values,
            "inflation_adjusted_value": round(inflation_adjusted_value, 2),
            "real_return_percentage": round(real_return, 2),
            "beats_inflation": profit_percentage > self.inflation_rate
        }
    
    def calculate_progress(
        self,
        target_amount: float,
        current_savings: float,
        investment_value: float,
        elapsed_months: int,
        total_months: int
    ) -> Dict[str, Any]:
        """İlerleme durumu hesapla"""
        
        total_value = current_savings + investment_value
        progress_percentage = min(100, (total_value / target_amount * 100)) if target_amount > 0 else 0
        remaining_amount = max(0, target_amount - total_value)
        remaining_months = max(0, total_months - elapsed_months)
        
        # Kalan sürede hedefe ulaşılabilir mi?
        required_monthly = remaining_amount / remaining_months if remaining_months > 0 else remaining_amount
        
        # Hedef fiyat tahmini (enflasyon etkisi)
        monthly_inflation = (1 + self.inflation_rate / 100) ** (1/12) - 1
        future_target = target_amount * ((1 + monthly_inflation) ** remaining_months)
        
        return {
            "progress_percentage": round(progress_percentage, 2),
            "total_value": round(total_value, 2),
            "remaining_amount": round(remaining_amount, 2),
            "remaining_months": remaining_months,
            "required_monthly_savings": round(required_monthly, 2),
            "on_track": progress_percentage >= (elapsed_months / total_months * 100) if total_months > 0 else True,
            "future_target_with_inflation": round(future_target, 2),
            "inflation_adjusted_shortage": round(max(0, future_target - total_value), 2)
        }
    
    def get_credit_recommendation(
        self,
        target_amount: float,
        current_value: float,
        remaining_months: int,
        monthly_income: float,
        credit_score: int = 650,
        monthly_savings: float = 0
    ) -> Dict[str, Any]:
        """Kredi yönlendirme önerisi - Gerçekçi hesaplama"""
        
        # Eksik tutar hesabı
        shortage = max(0, target_amount - current_value)
        
        # Kredi gerekli mi?
        needs_credit = shortage > 0
        
        if not needs_credit:
            return {
                "needs_credit": False,
                "message": "Tebrikler! Hedefinize ulaştınız, kredi gerekmez.",
                "recommendation": "buy_now"
            }
        
        # Gerçekçi kredi faiz oranları (yıllık, Türkiye piyasası 2024-2025)
        # Tüketici kredisi yıllık faiz oranları
        if credit_score >= 750:
            annual_rate = 42.0  # Yıllık %42
        elif credit_score >= 650:
            annual_rate = 48.0  # Yıllık %48
        elif credit_score >= 550:
            annual_rate = 54.0  # Yıllık %54
        else:
            annual_rate = 60.0  # Yıllık %60
        
        monthly_rate = annual_rate / 12 / 100  # Aylık faiz oranı (decimal)
        
        # Maksimum vade - daha uzun vadeler ekle
        max_duration = 60  # 60 aya kadar
        
        # Taksit hesapla
        best_option = None
        options = []
        
        for duration in [12, 24, 36, 48, 60]:
            if duration > max_duration:
                continue
                
            # Aylık taksit hesabı (PMT formülü)
            if monthly_rate > 0:
                monthly_payment = shortage * (monthly_rate * (1 + monthly_rate) ** duration) / \
                                 ((1 + monthly_rate) ** duration - 1)
            else:
                monthly_payment = shortage / duration
            
            total_payment = monthly_payment * duration
            total_interest = total_payment - shortage
            
            # Gelir kontrolü - farklı seviyeler
            # Düşük risk: %25, Orta risk: %35, Yüksek risk: %45
            income_ratio = (monthly_payment / monthly_income * 100) if monthly_income > 0 else 999
            
            affordable_low = income_ratio <= 25
            affordable_medium = income_ratio <= 35
            affordable_high = income_ratio <= 45
            
            # Gerekli gelir hesapla
            required_income = monthly_payment / 0.35  # %35 oranına göre
            
            # Ne kadar daha birikim gerekli (bu kredi uygun olsun diye)
            if not affordable_medium and monthly_income > 0:
                # Aylık taksit = gelir * 0.35 olsun
                max_affordable_payment = monthly_income * 0.35
                # Bu taksitle alınabilecek maksimum kredi
                if monthly_rate > 0:
                    max_affordable_loan = max_affordable_payment * ((1 + monthly_rate) ** duration - 1) / \
                                         (monthly_rate * (1 + monthly_rate) ** duration)
                else:
                    max_affordable_loan = max_affordable_payment * duration
                additional_savings_needed = max(0, shortage - max_affordable_loan)
            else:
                additional_savings_needed = 0
            
            option = {
                "duration_months": duration,
                "monthly_payment": round(monthly_payment, 2),
                "total_payment": round(total_payment, 2),
                "total_interest": round(total_interest, 2),
                "annual_rate": annual_rate,
                "affordable": affordable_medium,
                "affordable_level": "low_risk" if affordable_low else ("medium_risk" if affordable_medium else ("high_risk" if affordable_high else "not_affordable")),
                "required_income": round(required_income, 2),
                "additional_savings_needed": round(additional_savings_needed, 2),
                "income_to_debt_ratio": round(income_ratio, 1)
            }
            
            options.append(option)
            
            if affordable_medium and (best_option is None or monthly_payment < best_option["monthly_payment"]):
                best_option = option
        
        # Eğer hiçbir seçenek uygun değilse, en uzun vadeyi kontrol et
        if best_option is None and len(options) > 0:
            # En düşük taksitli seçeneği bul
            min_payment_option = min(options, key=lambda x: x["monthly_payment"])
            if min_payment_option["affordable_level"] == "high_risk":
                best_option = min_payment_option
                best_option["warning"] = "Bu taksit gelirinizin %35-45'i arasında. Dikkatli değerlendirin."
        
        # Öneri mesajı
        savings_ratio = current_value / target_amount if target_amount > 0 else 0
        
        if savings_ratio >= 0.7:
            recommendation = "consider_credit"
            message = f"Hedefinizin %{round(savings_ratio*100)}'ine ulaştınız! Kalan {shortage:,.0f} TL için kredi kullanabilirsiniz."
        elif savings_ratio >= 0.5:
            recommendation = "continue_saving"
            message = f"Hedefinizin yarısına ulaştınız. {shortage:,.0f} TL daha gerekiyor."
        elif savings_ratio >= 0.2:
            recommendation = "keep_saving"
            message = f"İyi ilerliyorsunuz. Hedefe ulaşmak için {shortage:,.0f} TL daha gerekiyor."
        else:
            recommendation = "start_saving"
            message = f"Birikime devam edin. Hedefinize {shortage:,.0f} TL kaldı."
        
        # Uygunluk özeti
        affordable_options = [o for o in options if o["affordable"]]
        high_risk_options = [o for o in options if o["affordable_level"] == "high_risk"]
        
        affordability_summary = {
            "total_options": len(options),
            "affordable_count": len(affordable_options),
            "high_risk_count": len(high_risk_options),
            "min_monthly_payment": min([o["monthly_payment"] for o in options]) if options else 0,
            "suggestion": self._get_affordability_suggestion(options, monthly_income, shortage)
        }
        
        return {
            "needs_credit": True,
            "loan_amount": round(shortage, 2),
            "current_savings": round(current_value, 2),
            "target_amount": round(target_amount, 2),
            "current_shortage": round(shortage, 2),
            "annual_rate": annual_rate,
            "credit_score": credit_score,
            "options": options,
            "best_option": best_option,
            "recommendation": recommendation,
            "message": message,
            "tip": f"Aylık {monthly_savings:,.0f} TL birikim yaparak kredi ihtiyacınızı azaltabilirsiniz." if monthly_savings > 0 else "Düzenli birikim yaparak kredi ihtiyacınızı azaltabilirsiniz.",
            "affordability_summary": affordability_summary
        }
    
    def _get_affordability_suggestion(self, options: list, monthly_income: float, loan_amount: float) -> Dict[str, Any]:
        """Kredi uygunluğu için öneri oluştur"""
        affordable_options = [o for o in options if o["affordable"]]
        
        if len(affordable_options) > 0:
            best_affordable = min(affordable_options, key=lambda x: x["monthly_payment"])
            return {
                "status": "affordable",
                "message": f"{len(affordable_options)} farklı vade seçeneği mevcut.",
                "action": f"En uygun: {best_affordable['duration_months']} ay vadede aylık {best_affordable['monthly_payment']:,.0f} TL taksit.",
                "can_apply": True
            }
        
        # Hiçbiri uygun değilse
        high_risk_options = [o for o in options if o.get("affordable_level") == "high_risk"]
        
        if len(high_risk_options) > 0:
            best_hr = min(high_risk_options, key=lambda x: x["monthly_payment"])
            return {
                "status": "high_risk",
                "message": "Gelirinize göre yüksek riskli seçenekler mevcut.",
                "action": f"{best_hr['duration_months']} ay vadede aylık {best_hr['monthly_payment']:,.0f} TL (gelirinizin %{best_hr['income_to_debt_ratio']})",
                "warning": "Aylık bütçenizi zorlayabilir.",
                "can_apply": True
            }
        
        # Hiçbiri uygun değil
        if options:
            min_option = min(options, key=lambda x: x["monthly_payment"])
            additional_needed = min_option.get("additional_savings_needed", 0)
            
            # Ne kadar daha birikim yapılmalı
            months_to_save = int(additional_needed / (monthly_income * 0.15)) + 1 if monthly_income > 0 else 12
            
            return {
                "status": "not_affordable",
                "message": "Mevcut gelirinizle kredi taksitlerini karşılamak güç.",
                "action": f"{additional_needed:,.0f} TL daha birikim yaparsanız {min_option['duration_months']} ay vadeye uygun olursunuz.",
                "timeline": f"Yaklaşık {months_to_save} ay daha birikim yapmanız önerilir.",
                "alternative": "Birikim süresini uzatarak kredi ihtiyacını azaltabilirsiniz.",
                "can_apply": False
            }
        
        return {
            "status": "unknown",
            "message": "Kredi seçenekleri hesaplanamadı.",
            "action": "Lütfen bilgilerinizi kontrol edin.",
            "can_apply": False
        }
    
    def create_savings_investment_plan(
        self,
        user_id: str,
        target_amount: float,
        product_name: str,
        monthly_contribution: float,
        duration_months: int,
        risk_profile: str = "medium",
        strategy: str = None,
        custom_allocation: Dict[str, int] = None,
        existing_savings: float = 0,
        auto_invest: bool = True
    ) -> Dict[str, Any]:
        """Yeni birikim + yatırım planı oluştur"""
        
        # Yatırım dağılımını belirle
        if custom_allocation:
            # Kullanıcı özel dağılım belirlemiş
            allocation = custom_allocation
            strategy_used = "custom"
        elif strategy:
            # Strateji bazlı
            allocation = self.get_allocation_by_strategy(strategy)
            strategy_used = strategy
        else:
            # Risk profiline göre
            allocation = self.get_allocation_by_risk(risk_profile)
            strategy_used = f"risk_{risk_profile}"
        
        # Gelecek değer tahmini
        future_estimate = self.estimate_future_value(
            monthly_contribution=monthly_contribution,
            duration_months=duration_months,
            allocation=allocation,
            existing_savings=existing_savings
        )
        
        # Hedefe ulaşılabilirlik analizi
        estimated_final = future_estimate["estimated_value"]
        can_reach_target = estimated_final >= target_amount
        shortage = max(0, target_amount - estimated_final)
        
        # Kredi önerisi (eğer eksik varsa)
        credit_recommendation = None
        if shortage > 0:
            credit_recommendation = self.get_credit_recommendation(
                target_amount=target_amount,
                current_value=existing_savings,
                remaining_months=duration_months,
                monthly_income=monthly_contribution * 5,  # Tahmini gelir
                credit_score=650
            )
        
        plan = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "product_name": product_name,
            "target_amount": target_amount,
            "monthly_contribution": monthly_contribution,
            "duration_months": duration_months,
            "start_date": datetime.utcnow().isoformat(),
            "target_date": (datetime.utcnow() + timedelta(days=duration_months * 30)).isoformat(),
            "risk_profile": risk_profile,
            "strategy": strategy_used,
            "allocation": allocation,
            "auto_invest": auto_invest,
            "existing_savings": existing_savings,
            "current_amount": existing_savings,
            "investment_value": 0,
            "contributions": [],
            "status": "active",
            
            # Tahminler
            "estimated_final_value": round(estimated_final, 2),
            "estimated_profit": future_estimate["estimated_profit"],
            "estimated_profit_percentage": future_estimate["profit_percentage"],
            "beats_inflation": future_estimate["beats_inflation"],
            "can_reach_target": can_reach_target,
            "estimated_shortage": round(shortage, 2),
            
            # Kredi önerisi
            "credit_recommendation": credit_recommendation,
            
            # Asset breakdown
            "asset_distribution": self.calculate_investment_distribution(existing_savings, allocation),
            
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        return {
            "success": True,
            "plan": plan,
            "future_estimate": future_estimate,
            "message": self._generate_plan_message(plan)
        }
    
    def _generate_plan_message(self, plan: Dict) -> str:
        """Plan özet mesajı oluştur"""
        if plan["can_reach_target"]:
            return f"🎯 Harika! {plan['duration_months']} ay sonunda hedefinize ulaşabilirsiniz. Tahmini birikim: {plan['estimated_final_value']:,.0f} TL"
        else:
            return f"📊 Mevcut planla {plan['duration_months']} ay sonunda {plan['estimated_final_value']:,.0f} TL biriktirmiş olacaksınız. Hedefe ulaşmak için {plan['estimated_shortage']:,.0f} TL eksik kalacak. Kredi seçeneklerini inceleyebilirsiniz."
    
    def add_contribution(
        self,
        plan: Dict,
        amount: float,
        note: str = ""
    ) -> Dict[str, Any]:
        """Plana katkı ekle ve yatırıma dağıt"""
        
        allocation = plan.get("allocation", {"tl_savings": 100})
        
        # Tutarı yatırım araçlarına dağıt
        distribution = self.calculate_investment_distribution(amount, allocation)
        
        contribution = {
            "id": str(uuid.uuid4()),
            "amount": amount,
            "distribution": distribution,
            "date": datetime.utcnow().isoformat(),
            "note": note
        }
        
        # Mevcut dağılımı güncelle
        current_distribution = plan.get("asset_distribution", {})
        for asset, value in distribution.items():
            current_distribution[asset] = current_distribution.get(asset, 0) + value
        
        # Toplam değeri güncelle
        new_total = plan.get("current_amount", 0) + amount
        
        return {
            "success": True,
            "contribution": contribution,
            "new_total": round(new_total, 2),
            "updated_distribution": current_distribution,
            "message": f"✅ {amount:,.0f} TL başarıyla eklendi ve yatırım araçlarına dağıtıldı."
        }
    
    def buy_asset(
        self,
        plan: Dict,
        asset_type: str,
        amount_tl: float,
        market_prices: Dict = None
    ) -> Dict[str, Any]:
        """Belirli bir varlık satın al"""
        
        # Varsayılan piyasa fiyatları (TL cinsinden)
        if market_prices is None:
            market_prices = {
                "usd": 34.50,        # 1 USD = 34.50 TL
                "eur": 37.80,        # 1 EUR = 37.80 TL
                "gbp": 43.50,        # 1 GBP = 43.50 TL
                "gold": 3250.0,      # 1 gram altın = 3250 TL
                "silver": 38.50,     # 1 gram gümüş = 38.50 TL
            }
        
        # Varlık bilgileri
        asset_info = {
            "usd": {"name": "Amerikan Doları", "emoji": "💵", "unit": "USD", "unit_name": "dolar"},
            "eur": {"name": "Euro", "emoji": "💶", "unit": "EUR", "unit_name": "euro"},
            "gbp": {"name": "İngiliz Sterlini", "emoji": "💷", "unit": "GBP", "unit_name": "sterlin"},
            "gold": {"name": "Altın", "emoji": "🥇", "unit": "gr", "unit_name": "gram altın"},
            "silver": {"name": "Gümüş", "emoji": "🥈", "unit": "gr", "unit_name": "gram gümüş"},
            "tl_savings": {"name": "TL Birikim", "emoji": "💰", "unit": "TL", "unit_name": "TL"},
        }
        
        if asset_type not in market_prices and asset_type != "tl_savings":
            return {
                "success": False,
                "message": f"Geçersiz varlık türü: {asset_type}"
            }
        
        # TL birikimde fiyat 1:1
        if asset_type == "tl_savings":
            unit_price = 1.0
            units_bought = amount_tl
        else:
            unit_price = market_prices.get(asset_type, 1.0)
            units_bought = amount_tl / unit_price
        
        info = asset_info.get(asset_type, {"name": asset_type, "emoji": "📊", "unit": "", "unit_name": ""})
        
        # Mevcut dağılımı al
        current_distribution = plan.get("asset_distribution", {})
        current_holdings = plan.get("holdings", {})
        
        # Varlık miktarını güncelle (TL değeri olarak)
        current_distribution[asset_type] = current_distribution.get(asset_type, 0) + amount_tl
        
        # Birim cinsinden tutmak için holdings ekle
        if asset_type not in current_holdings:
            current_holdings[asset_type] = {
                "units": 0,
                "total_cost": 0,
                "avg_price": 0
            }
        
        old_units = current_holdings[asset_type]["units"]
        old_cost = current_holdings[asset_type]["total_cost"]
        
        new_units = old_units + units_bought
        new_cost = old_cost + amount_tl
        new_avg_price = new_cost / new_units if new_units > 0 else 0
        
        current_holdings[asset_type] = {
            "units": round(new_units, 4),
            "total_cost": round(new_cost, 2),
            "avg_price": round(new_avg_price, 4)
        }
        
        # İşlem kaydı
        transaction = {
            "id": str(uuid.uuid4()),
            "type": "buy",
            "asset": asset_type,
            "asset_name": info["name"],
            "amount_tl": amount_tl,
            "units": round(units_bought, 4),
            "unit_price": unit_price,
            "date": datetime.utcnow().isoformat()
        }
        
        # Toplam değeri güncelle
        new_total = plan.get("current_amount", 0) + amount_tl
        
        return {
            "success": True,
            "transaction": transaction,
            "asset_info": info,
            "units_bought": round(units_bought, 4),
            "unit_price": unit_price,
            "new_total": round(new_total, 2),
            "updated_distribution": current_distribution,
            "updated_holdings": current_holdings,
            "message": f"✅ {units_bought:.4f} {info['unit']} {info['name']} satın alındı ({amount_tl:,.0f} TL)"
        }
    
    def get_market_prices(self) -> Dict[str, Any]:
        """Güncel piyasa fiyatlarını getir"""
        # Gerçek API entegrasyonu yapılabilir, şimdilik simüle edilmiş veriler
        
        base_prices = {
            "usd": 34.50,
            "eur": 37.80,
            "gbp": 43.50,
            "gold": 3250.0,
            "silver": 38.50,
        }
        
        # Küçük dalgalanmalar ekle
        prices = {}
        for asset, base_price in base_prices.items():
            change_percent = random.uniform(-0.5, 0.5)
            current_price = base_price * (1 + change_percent / 100)
            prices[asset] = {
                "price": round(current_price, 4),
                "change_percent": round(change_percent, 2),
                "base_price": base_price
            }
        
        asset_info = {
            "usd": {"name": "Amerikan Doları", "emoji": "💵", "unit": "USD", "color": "#10B981"},
            "eur": {"name": "Euro", "emoji": "💶", "unit": "EUR", "color": "#3B82F6"},
            "gbp": {"name": "İngiliz Sterlini", "emoji": "💷", "unit": "GBP", "color": "#8B5CF6"},
            "gold": {"name": "Altın", "emoji": "🥇", "unit": "gr", "color": "#F59E0B"},
            "silver": {"name": "Gümüş", "emoji": "🥈", "unit": "gr", "color": "#6B7280"},
        }
        
        return {
            "prices": prices,
            "asset_info": asset_info,
            "updated_at": datetime.utcnow().isoformat()
        }
    
    def get_investment_summary(
        self,
        plan: Dict,
        market_data: Dict = None
    ) -> Dict[str, Any]:
        """Yatırım özeti ve güncel değerler"""
        
        asset_distribution = plan.get("asset_distribution", {})
        holdings = plan.get("holdings", {})
        allocation = plan.get("allocation", {})
        
        # Güncel piyasa fiyatlarını al
        market_prices = self.get_market_prices()
        
        # Her varlık için güncel değer hesapla
        total_value = 0
        total_cost = 0
        assets_summary = []
        
        for asset, amount in asset_distribution.items():
            holding = holdings.get(asset, {})
            units = holding.get("units", 0)
            cost = holding.get("total_cost", amount)
            avg_price = holding.get("avg_price", 0)
            
            if asset == "tl_savings":
                current_price = 1.0
                current_value = amount
                change = 0
                unit = "TL"
            else:
                price_info = market_prices["prices"].get(asset, {"price": 1.0, "change_percent": 0})
                current_price = price_info["price"]
                change = price_info["change_percent"]
                
                # Eğer birim bilgisi varsa, birim * güncel fiyat
                if units > 0:
                    current_value = units * current_price
                else:
                    current_value = amount * (1 + change / 100)
                
                unit = market_prices["asset_info"].get(asset, {}).get("unit", "")
            
            # Kar/zarar hesabı
            profit = current_value - cost if cost > 0 else 0
            profit_percent = (profit / cost * 100) if cost > 0 else 0
            
            total_value += current_value
            total_cost += cost
            
            asset_labels = {
                "tl_savings": "TL Birikim",
                "gold": "Altın",
                "silver": "Gümüş",
                "usd": "Dolar",
                "eur": "Euro",
                "gbp": "Sterlin"
            }
            
            asset_emojis = {
                "tl_savings": "💰",
                "gold": "🥇",
                "silver": "🥈",
                "usd": "💵",
                "eur": "💶",
                "gbp": "💷"
            }
            
            asset_colors = {
                "tl_savings": "#6366F1",
                "gold": "#F59E0B",
                "silver": "#6B7280",
                "usd": "#10B981",
                "eur": "#3B82F6",
                "gbp": "#8B5CF6"
            }
            
            assets_summary.append({
                "asset": asset,
                "label": asset_labels.get(asset, asset),
                "emoji": asset_emojis.get(asset, "📊"),
                "color": asset_colors.get(asset, "#6B7280"),
                "unit": unit,
                "units": round(units, 4) if units > 0 else None,
                "avg_price": round(avg_price, 4) if avg_price > 0 else None,
                "current_price": round(current_price, 4),
                "invested": round(cost, 2),
                "current_value": round(current_value, 2),
                "profit": round(profit, 2),
                "profit_percent": round(profit_percent, 2),
                "change_percent": round(change, 2),
                "allocation_percent": allocation.get(asset, 0)
            })
        
        total_profit = total_value - total_cost
        profit_percentage = (total_profit / total_cost * 100) if total_cost > 0 else 0
        
        return {
            "assets": assets_summary,
            "total_invested": round(total_cost, 2),
            "total_current_value": round(total_value, 2),
            "total_profit": round(total_profit, 2),
            "profit_percentage": round(profit_percentage, 2),
            "market_prices": market_prices,
            "last_updated": datetime.utcnow().isoformat()
        }


# Global instance
savings_investment_service = SavingsInvestmentService()
