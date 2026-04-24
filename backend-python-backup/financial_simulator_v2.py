"""
Enhanced Financial Goal Simulator & Shield System V2
Sandbox (Simülasyon) + Shield (Koruma) + AI + PSO + LSTM
"""
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import asyncio

# Import our new modules
from market_data_api import market_data_api
from product_scraper import product_scraper
from lstm_predictor import lstm_predictor
from portfolio_optimizer import portfolio_optimizer


class EnhancedFinancialSimulator:
    """Gelişmiş finansal simülatör - Tüm özellikleri içerir"""
    
    @staticmethod
    def calculate_advanced_scenario(
        goal_data: Dict[str, Any],
        use_real_data: bool = True
    ) -> Dict[str, Any]:
        """
        Gelişmiş senaryo analizi
        - Real market data kullanımı
        - LSTM fiyat tahmini
        - Enflasyon etkisi
        """
        
        target_amount = float(goal_data['target_amount'])
        duration_months = int(goal_data['duration_months'])
        monthly_income = float(goal_data['monthly_income'])
        monthly_expenses = float(goal_data['monthly_expenses'])
        current_amount = float(goal_data.get('current_amount', 0))
        product_name = goal_data.get('goal_name', 'Genel Hedef')
        category = goal_data.get('category', 'other')
        
        # Temel hesaplama
        monthly_savings = monthly_income - monthly_expenses
        total_savings_nominal = (monthly_savings * duration_months) + current_amount
        
        shortage_nominal = target_amount - total_savings_nominal
        is_achievable_nominal = shortage_nominal <= 0
        
        # Market data
        market_data = market_data_api.get_market_summary()
        inflation_rate = market_data['inflation']['annual_inflation'] / 100
        
        # Ürün fiyat tahmini (LSTM)
        price_prediction = None
        if use_real_data:
            try:
                # Ürün mevcut fiyatı
                product_data = product_scraper.get_product_price(product_name, category)
                
                # LSTM ile gelecek fiyat tahmini
                price_prediction = lstm_predictor.predict_future_prices(
                    current_price=target_amount,
                    months_ahead=duration_months,
                    inflation_rate=inflation_rate
                )
                
                # Gelecekteki gerçek hedef (enflasyon adjusted)
                adjusted_target = price_prediction['predicted_price']
            except Exception as e:
                print(f"Price prediction error: {e}")
                # Fallback: Basit enflasyon hesabı
                monthly_inflation = (1 + inflation_rate) ** (1/12) - 1
                adjusted_target = target_amount * ((1 + monthly_inflation) ** duration_months)
                price_prediction = {
                    'predicted_price': adjusted_target,
                    'price_increase_percent': ((adjusted_target - target_amount) / target_amount) * 100,
                    'method': 'fallback'
                }
        else:
            # Basit enflasyon hesabı
            monthly_inflation = (1 + inflation_rate) ** (1/12) - 1
            adjusted_target = target_amount * ((1 + monthly_inflation) ** duration_months)
            price_prediction = {
                'predicted_price': adjusted_target,
                'price_increase_percent': ((adjusted_target - target_amount) / target_amount) * 100,
                'method': 'simple'
            }
        
        # Enflasyon adjusted hesaplama
        shortage_real = adjusted_target - total_savings_nominal
        is_achievable_real = shortage_real <= 0
        
        # Aylık detay (enflasyon dahil)
        monthly_progress = []
        cumulative_nominal = current_amount
        monthly_inflation_rate = (1 + inflation_rate) ** (1/12) - 1
        
        for month in range(1, duration_months + 1):
            cumulative_nominal += monthly_savings
            
            # Hedef fiyatın o aydaki değeri
            target_at_month = target_amount * ((1 + monthly_inflation_rate) ** month)
            
            # Gap
            gap = target_at_month - cumulative_nominal
            progress_percent = (cumulative_nominal / target_at_month) * 100 if target_at_month > 0 else 0
            
            monthly_progress.append({
                "month": month,
                "cumulative_savings": round(cumulative_nominal, 2),
                "target_amount": round(target_at_month, 2),
                "gap": round(gap, 2),
                "progress_percent": round(progress_percent, 2)
            })
        
        return {
            # Nominal (Enflasyonsuz)
            "nominal_scenario": {
                "is_achievable": is_achievable_nominal,
                "total_savings": round(total_savings_nominal, 2),
                "target_amount": round(target_amount, 2),
                "shortage": round(shortage_nominal, 2) if shortage_nominal > 0 else 0
            },
            # Real (Enflasyon dahil)
            "real_scenario": {
                "is_achievable": is_achievable_real,
                "total_savings": round(total_savings_nominal, 2),
                "adjusted_target": round(adjusted_target, 2),
                "shortage": round(shortage_real, 2) if shortage_real > 0 else 0,
                "inflation_impact": round(adjusted_target - target_amount, 2)
            },
            # Tahmin
            "price_prediction": price_prediction,
            # İlerleme
            "monthly_progress": monthly_progress,
            # Öneriler
            "monthly_savings_current": round(monthly_savings, 2),
            "monthly_savings_needed": round(adjusted_target / duration_months, 2),
            "additional_savings_needed": round(max(0, (adjusted_target - total_savings_nominal) / duration_months), 2),
            # Market data
            "market_data": {
                "inflation_rate": round(inflation_rate * 100, 2),
                "usd_rate": market_data['currencies']['USD'],
                "eur_rate": market_data['currencies']['EUR'],
                "gold_price": market_data['gold']['gold_per_gram_try']
            }
        }
    
    @staticmethod
    def what_if_analysis(
        goal_data: Dict[str, Any],
        scenarios: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        What-If analizi - Çoklu senaryo karşılaştırması
        scenarios: [
            {"expense_reduction_percent": 10, "label": "Netflix iptal"},
            {"expense_reduction_percent": 20, "label": "Tüm abonelikler iptal"}
        ]
        """
        
        results = []
        
        for scenario in scenarios:
            expense_reduction = scenario.get('expense_reduction_percent', 0)
            label = scenario.get('label', f'{expense_reduction}% Harcama Azaltma')
            
            # Yeni gider hesapla
            new_expenses = goal_data['monthly_expenses'] * (1 - expense_reduction / 100)
            
            # Yeni senaryo oluştur
            modified_goal = goal_data.copy()
            modified_goal['monthly_expenses'] = new_expenses
            
            # Hesapla
            result = EnhancedFinancialSimulator.calculate_advanced_scenario(modified_goal)
            
            results.append({
                "label": label,
                "expense_reduction_percent": expense_reduction,
                "monthly_savings_increase": round(goal_data['monthly_expenses'] * (expense_reduction / 100), 2),
                "new_monthly_expenses": round(new_expenses, 2),
                "scenario_result": result
            })
        
        return results


class EnhancedShieldProtector:
    """Gelişmiş Shield koruma sistemi - PSO ile optimizasyon"""
    
    @staticmethod
    def activate_shield(
        goal_data: Dict[str, Any],
        market_data: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Shield'i aktive et - PSO optimizasyonu ile portföy oluştur
        """
        
        target_amount = float(goal_data['target_amount'])
        duration_months = int(goal_data['duration_months'])
        
        # Market data
        if market_data is None:
            market_data = market_data_api.get_market_summary()
        
        asset_returns = market_data['asset_returns']
        inflation_rate = market_data['inflation']['annual_inflation']
        
        # PSO ile optimizasyon
        optimized_portfolio = portfolio_optimizer.optimize_portfolio(
            target_return=inflation_rate * 1.1,  # Hedef: Enflasyonun %110'u
            asset_returns=asset_returns,
            duration_months=duration_months
        )
        
        # Koruma skoru
        protection_score = portfolio_optimizer.calculate_protection_score(
            portfolio_return=optimized_portfolio['expected_annual_return'],
            inflation_rate=inflation_rate
        )
        
        return {
            "shield_active": True,
            "asset_mix": optimized_portfolio['asset_mix'],
            "expected_annual_return": optimized_portfolio['expected_annual_return'],
            "inflation_rate": inflation_rate,
            "beats_inflation": protection_score > 100,
            "protection_score": protection_score,
            "portfolio_risk": optimized_portfolio.get('portfolio_risk', 0),
            "sharpe_ratio": optimized_portfolio.get('sharpe_ratio', 0),
            "optimization_method": optimized_portfolio['method'],
            "optimized": optimized_portfolio['optimized']
        }
    
    @staticmethod
    def generate_smart_alerts(
        goal_data: Dict[str, Any],
        scenario_result: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Akıllı uyarılar oluştur
        - Fiyat artış uyarısı
        - Erken alım önerisi
        - Kredi önerisi
        """
        
        alerts = []
        
        # Fiyat tahmin verileri
        price_pred = scenario_result.get('price_prediction', {})
        price_increase_percent = price_pred.get('price_increase_percent', 0)
        
        # Real scenario
        real_scenario = scenario_result.get('real_scenario', {})
        shortage = real_scenario.get('shortage', 0)
        
        # UYARI 1: Yüksek fiyat artışı bekleniyor
        if price_increase_percent > 20:
            alerts.append({
                "type": "price_alert",
                "severity": "high",
                "title": "⚠️ Yüksek Fiyat Artışı Bekleniyor",
                "message": f"Hedef ürününüz {goal_data['duration_months']} ay içinde %{round(price_increase_percent, 1)} artış gösterebilir.",
                "recommendation": f"Şu an alsanız {round(shortage, 2)} TL tasarruf edebilirsiniz.",
                "action": "early_purchase"
            })
        
        # UYARI 2: Hedefe ulaşılamıyor
        if not real_scenario.get('is_achievable', True):
            monthly_extra = scenario_result.get('additional_savings_needed', 0)
            
            alerts.append({
                "type": "savings_alert",
                "severity": "medium",
                "title": "💰 Ek Tasarruf Gerekli",
                "message": f"Mevcut tasarrufunuzla hedefinize ulaşamazsınız.",
                "recommendation": f"Aylık {round(monthly_extra, 2)} TL daha tasarruf yapmalısınız.",
                "action": "increase_savings"
            })
        
        # UYARI 3: Kredi önerisi (eksik tutar için)
        if shortage > 0 and shortage < goal_data['target_amount'] * 0.3:  # Eksik %30'dan azsa
            alerts.append({
                "type": "credit_offer",
                "severity": "info",
                "title": "💳 Mikro Kredi Önerisi",
                "message": f"Eksik {round(shortage, 2)} TL için özel kredi teklifimiz var.",
                "recommendation": f"12 ay vadeli, aylık {round(shortage / 12, 2)} TL taksit ile hedefinize ulaşın.",
                "action": "apply_credit",
                "credit_details": {
                    "amount": round(shortage, 2),
                    "duration_months": 12,
                    "monthly_payment": round(shortage / 12 * 1.1, 2),  # %10 faiz
                    "interest_rate": 10.0
                }
            })
        
        # UYARI 4: Shield önerisi
        market_data = scenario_result.get('market_data', {})
        inflation_rate = market_data.get('inflation_rate', 50)
        
        if inflation_rate > 40:
            alerts.append({
                "type": "shield_recommendation",
                "severity": "high",
                "title": "🛡️ Shield Korumasını Aktive Edin",
                "message": f"Enflasyon %{round(inflation_rate, 1)} seviyesinde. Paranız değer kaybediyor.",
                "recommendation": "Shield ile paranızı döviz, altın ve yatırım fonlarında koruyun.",
                "action": "activate_shield"
            })
        
        return alerts


def run_complete_simulation(goal_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Tam simülasyon çalıştır - Tüm modülleri kullan
    Sandbox + Shield + AI + LSTM + PSO
    """
    
    # 1. Gelişmiş senaryo analizi
    scenario_result = EnhancedFinancialSimulator.calculate_advanced_scenario(goal_data)
    
    # 2. Shield koruma
    shield_result = EnhancedShieldProtector.activate_shield(goal_data)
    
    # 3. Akıllı uyarılar
    smart_alerts = EnhancedShieldProtector.generate_smart_alerts(goal_data, scenario_result)
    
    # 4. What-If senaryoları (örnek)
    what_if_scenarios = EnhancedFinancialSimulator.what_if_analysis(
        goal_data,
        [
            {"expense_reduction_percent": 10, "label": "Gereksiz Harcamalar Kes"},
            {"expense_reduction_percent": 20, "label": "Agresif Tasarruf Planı"},
            {"expense_reduction_percent": 5, "label": "Minimal Değişiklik"}
        ]
    )
    
    # 5. Genel skor
    is_achievable = scenario_result['real_scenario']['is_achievable']
    beats_inflation = shield_result['beats_inflation']
    
    overall_score = 0
    if is_achievable:
        overall_score += 50
    if beats_inflation:
        overall_score += 30
    if shield_result['protection_score'] > 110:
        overall_score += 20
    
    return {
        "scenario": scenario_result,
        "shield": shield_result,
        "smart_alerts": smart_alerts,
        "what_if_scenarios": what_if_scenarios[:2],  # İlk 2 senaryo
        "overall_score": round(overall_score, 1),
        "timestamp": datetime.now().isoformat()
    }
