"""
Financial Goal Simulator & Shield System
Sandbox (Simülasyon) + Shield (Koruma) MVP
"""
from typing import Dict, Any, List
import random

class FinancialSimulator:
    """Gelecek simülatörü - Sandbox modülü"""
    
    @staticmethod
    def calculate_scenario(
        target_amount: float,
        duration_months: int,
        monthly_income: float,
        monthly_expenses: float,
        current_amount: float = 0.0
    ) -> Dict[str, Any]:
        """Senaryo analizi - Mevcut harcama ile hedefe ulaşılabilir mi?"""
        
        monthly_savings = monthly_income - monthly_expenses
        total_savings = (monthly_savings * duration_months) + current_amount
        
        shortage = target_amount - total_savings
        is_achievable = shortage <= 0
        
        # Aylık detay
        monthly_progress = []
        cumulative = current_amount
        for month in range(1, duration_months + 1):
            cumulative += monthly_savings
            monthly_progress.append({
                "month": month,
                "cumulative": round(cumulative, 2),
                "target": round(target_amount, 2)
            })
        
        return {
            "is_achievable": is_achievable,
            "total_savings": round(total_savings, 2),
            "shortage": round(shortage, 2) if shortage > 0 else 0,
            "monthly_savings_needed": round(target_amount / duration_months, 2),
            "current_monthly_savings": round(monthly_savings, 2),
            "monthly_progress": monthly_progress[-6:] if len(monthly_progress) > 6 else monthly_progress
        }
    
    @staticmethod
    def what_if_analysis(
        target_amount: float,
        duration_months: int,
        monthly_income: float,
        current_monthly_expenses: float,
        expense_reduction_percent: float = 0.0  # 0-100 arası
    ) -> Dict[str, Any]:
        """What-If analizi - Harcama değişiklikleri ile simülasyon"""
        
        reduction_amount = current_monthly_expenses * (expense_reduction_percent / 100)
        new_monthly_expenses = current_monthly_expenses - reduction_amount
        
        result = FinancialSimulator.calculate_scenario(
            target_amount=target_amount,
            duration_months=duration_months,
            monthly_income=monthly_income,
            monthly_expenses=new_monthly_expenses
        )
        
        result["expense_reduction"] = round(reduction_amount, 2)
        result["new_monthly_expenses"] = round(new_monthly_expenses, 2)
        result["reduction_percent"] = expense_reduction_percent
        
        return result


class ShieldProtector:
    """Dinamik koruma kalkanı - Shield modülü"""
    
    @staticmethod
    def calculate_protection_mix(
        target_amount: float,
        duration_months: int,
        expected_inflation: float = 40.0  # Yıllık enflasyon %
    ) -> Dict[str, Any]:
        """
        PSO benzeri optimizasyon (MVP için basitleştirilmiş)
        Paranın nasıl dağıtılacağını hesaplar
        """
        
        # MVP: Basit risk-getiri dengesi
        # Gerçek sistemde burada PSO algoritması çalışacak
        
        if duration_months <= 6:
            # Kısa vade: Daha az risk
            mix = {
                "mevduat": 50,
                "doviz": 30,
                "altin": 15,
                "fon": 5
            }
        elif duration_months <= 12:
            # Orta vade: Dengeli
            mix = {
                "doviz": 40,
                "altin": 30,
                "fon": 20,
                "mevduat": 10
            }
        else:
            # Uzun vade: Daha fazla getiri odaklı
            mix = {
                "fon": 35,
                "doviz": 30,
                "altin": 25,
                "mevduat": 10
            }
        
        # Beklenen getiri hesaplama (MVP)
        expected_return = {
            "mevduat": 45.0,  # %
            "doviz": 55.0,
            "altin": 50.0,
            "fon": 65.0
        }
        
        total_expected_return = sum(
            mix[asset] * expected_return[asset] / 100
            for asset in mix
        )
        
        beats_inflation = total_expected_return > expected_inflation
        
        return {
            "asset_mix": mix,
            "expected_annual_return": round(total_expected_return, 2),
            "expected_inflation": expected_inflation,
            "beats_inflation": beats_inflation,
            "protection_score": round((total_expected_return / expected_inflation) * 100, 1) if expected_inflation > 0 else 100
        }
    
    @staticmethod
    def smart_alert(
        target_amount: float,
        current_savings: float,
        months_remaining: int,
        expected_price_increase: float = 20.0  # Beklenen fiyat artışı %
    ) -> Dict[str, Any]:
        """
        Akıllı uyarı sistemi
        Fiyat artışı bekleniyorsa erken alım önerisi
        """
        
        future_price = target_amount * (1 + expected_price_increase / 100)
        shortage = future_price - current_savings
        
        should_buy_early = shortage > 0 and expected_price_increase > 15
        
        alert = {
            "alert_active": should_buy_early,
            "current_price": target_amount,
            "expected_future_price": round(future_price, 2),
            "price_increase_percent": expected_price_increase,
            "current_savings": current_savings,
            "shortage": round(shortage, 2) if shortage > 0 else 0,
            "recommendation": ""
        }
        
        if should_buy_early:
            alert["recommendation"] = f"Fiyat artışı bekleniyor! Şimdi alsanız {round(future_price - target_amount, 2)} TL tasarruf edersiniz. Eksik {round(shortage, 2)} TL için kredi önerilerimiz var."
        else:
            alert["recommendation"] = "Planınıza devam edin, şu an için acele etmeye gerek yok."
        
        return alert


def run_full_simulation(goal_data: Dict[str, Any]) -> Dict[str, Any]:
    """Tam simülasyon - Sandbox + Shield birlikte"""
    
    # Sandbox: Senaryo analizi
    scenario = FinancialSimulator.calculate_scenario(
        target_amount=goal_data['target_amount'],
        duration_months=goal_data['duration_months'],
        monthly_income=goal_data['monthly_income'],
        monthly_expenses=goal_data['monthly_expenses'],
        current_amount=goal_data.get('current_amount', 0.0)
    )
    
    # Shield: Koruma analizi
    protection = ShieldProtector.calculate_protection_mix(
        target_amount=goal_data['target_amount'],
        duration_months=goal_data['duration_months'],
        expected_inflation=goal_data.get('expected_inflation', 40.0)
    )
    
    # Akıllı uyarı
    alert = ShieldProtector.smart_alert(
        target_amount=goal_data['target_amount'],
        current_savings=goal_data.get('current_amount', 0.0),
        months_remaining=goal_data['duration_months'],
        expected_price_increase=goal_data.get('expected_price_increase', 20.0)
    )
    
    # Öneriler
    recommendations = []
    if not scenario['is_achievable']:
        recommendations.append(f"Aylık {round(scenario['shortage'] / goal_data['duration_months'], 2)} TL daha tasarruf etmeniz gerekiyor.")
    
    if protection['beats_inflation']:
        recommendations.append(f"Shield aktif! Paranız enflasyonun {round(protection['protection_score'] - 100, 1)}% üstünde değerleniyor.")
    
    if alert['alert_active']:
        recommendations.append(alert['recommendation'])
    
    return {
        "scenario": scenario,
        "protection": protection,
        "alert": alert,
        "recommendations": recommendations,
        "overall_score": round((protection['protection_score'] + (100 if scenario['is_achievable'] else 50)) / 2, 1)
    }
