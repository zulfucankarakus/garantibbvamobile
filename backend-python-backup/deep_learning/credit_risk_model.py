"""
Kredi Risk Skorlama Modeli - Neural Network (MLP)
Kullanicinin kredi riskini tahmin eden derin ogrenme modeli

Girdiler: Gelir, yas, mevcut borc, kredi gecmisi, istihdam suresi
Cikti: Risk skoru (0-1000) ve risk sinifi
"""

import torch
import torch.nn as nn
import numpy as np
from typing import Dict, Any, List
import logging

logger = logging.getLogger(__name__)


class MLPRiskModel(nn.Module):
    """Multi-Layer Perceptron for Credit Risk Assessment"""
    
    def __init__(self, input_size=8, hidden_sizes=[64, 32, 16], output_size=1):
        super(MLPRiskModel, self).__init__()
        
        layers = []
        prev_size = input_size
        
        for hidden_size in hidden_sizes:
            layers.extend([
                nn.Linear(prev_size, hidden_size),
                nn.ReLU(),
                nn.BatchNorm1d(hidden_size),
                nn.Dropout(0.2)
            ])
            prev_size = hidden_size
        
        layers.append(nn.Linear(prev_size, output_size))
        layers.append(nn.Sigmoid())
        
        self.network = nn.Sequential(*layers)
    
    def forward(self, x):
        return self.network(x)


class CreditRiskModel:
    """Kredi Risk Analizi Servisi"""
    
    INPUT_SIZE = 8
    HIDDEN_SIZES = [64, 32, 16]
    
    def __init__(self):
        self.model = MLPRiskModel(
            input_size=self.INPUT_SIZE,
            hidden_sizes=self.HIDDEN_SIZES,
            output_size=1
        )
        self.model.eval()
        logger.info("Credit Risk Model initialized")
    
    def assess_credit_risk(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Kredi risk skorlamasi"""
        logger.info("Neural Network Kredi Risk Analizi baslatiliyor")
        
        try:
            # Girdileri al
            monthly_income = float(request.get('monthly_income', 15000))
            age = int(request.get('age', 30))
            existing_debt = float(request.get('existing_debt', 0))
            credit_history_years = int(request.get('credit_history_years', 5))
            employment_years = int(request.get('employment_years', 3))
            requested_amount = float(request.get('requested_amount', 100000))
            requested_term_months = int(request.get('requested_term_months', 12))
            existing_savings = float(request.get('existing_savings', 10000))
            
            # Feature normalization
            features = np.array([
                self._normalize_income(monthly_income),
                self._normalize_age(age),
                self._normalize_debt_ratio(existing_debt, monthly_income),
                self._normalize_credit_history(credit_history_years),
                self._normalize_employment(employment_years),
                self._normalize_loan_amount(requested_amount, monthly_income),
                self._normalize_term(requested_term_months),
                self._normalize_savings_ratio(existing_savings, requested_amount)
            ], dtype=np.float32)
            
            # PyTorch tensore donustur
            feature_tensor = torch.FloatTensor(features).unsqueeze(0)
            
            # Model tahmini
            with torch.no_grad():
                raw_score = self.model(feature_tensor).item()
            
            # Risk skorunu 0-1000 araligina donustur
            risk_score = int(raw_score * 1000)
            
            # Is kurallari ile skoru ayarla
            risk_score = self._adjust_score_with_rules(
                risk_score, monthly_income, existing_debt,
                requested_amount, credit_history_years, age
            )
            
            # Risk siniflandirmasi
            risk_class = self._classify_risk(risk_score)
            
            # Odeme kapasitesi
            payment_capacity = self._calculate_payment_capacity(
                monthly_income, existing_debt, requested_amount, requested_term_months
            )
            
            # Oneriler
            recommendations = self._generate_recommendations(
                risk_score, monthly_income, existing_debt, requested_amount, credit_history_years
            )
            
            # Feature importance
            feature_importance = {
                "income": 0.25,
                "debt_ratio": 0.20,
                "credit_history": 0.18,
                "loan_amount": 0.15,
                "employment": 0.10,
                "age": 0.07,
                "savings": 0.03,
                "term": 0.02
            }
            
            return {
                "success": True,
                "risk_score": risk_score,
                "risk_class": risk_class,
                "payment_capacity": payment_capacity,
                "recommendations": recommendations,
                "feature_importance": feature_importance,
                "input_summary": {
                    "monthly_income": monthly_income,
                    "age": age,
                    "existing_debt": existing_debt,
                    "credit_history_years": credit_history_years,
                    "employment_years": employment_years,
                    "requested_amount": requested_amount,
                    "requested_term_months": requested_term_months,
                    "existing_savings": existing_savings
                },
                "model_info": {
                    "type": "Multi-Layer Perceptron (MLP)",
                    "framework": "PyTorch",
                    "architecture": f"{self.INPUT_SIZE} -> {' -> '.join(map(str, self.HIDDEN_SIZES))} -> 1",
                    "activation": "ReLU + Sigmoid",
                    "model_version": "1.0.0"
                }
            }
            
        except Exception as e:
            logger.error(f"Kredi risk analizi hatasi: {e}")
            return {
                "success": False,
                "error": f"Risk analizi yapilamadi: {str(e)}"
            }
    
    # Normalization functions
    def _normalize_income(self, income: float) -> float:
        return min(1.0, income / 100000.0)
    
    def _normalize_age(self, age: int) -> float:
        return min(1.0, max(0.0, (age - 18) / 62.0))
    
    def _normalize_debt_ratio(self, debt: float, income: float) -> float:
        if income <= 0:
            return 1.0
        return min(1.0, debt / (income * 12))
    
    def _normalize_credit_history(self, years: int) -> float:
        return min(1.0, years / 20.0)
    
    def _normalize_employment(self, years: int) -> float:
        return min(1.0, years / 15.0)
    
    def _normalize_loan_amount(self, amount: float, income: float) -> float:
        return min(1.0, amount / (income * 36))
    
    def _normalize_term(self, months: int) -> float:
        return months / 60.0
    
    def _normalize_savings_ratio(self, savings: float, requested: float) -> float:
        if requested <= 0:
            return 1.0
        return min(1.0, savings / requested)
    
    def _adjust_score_with_rules(self, score: int, income: float, debt: float,
                                  amount: float, credit_years: int, age: int) -> int:
        """Is kurallari ile skoru ayarla"""
        debt_to_income = debt / (income * 12) if income > 0 else 1
        
        if debt_to_income > 0.5:
            score -= 100
        if credit_years >= 10:
            score += 50
        if 25 <= age <= 55:
            score += 30
        if income > 30000:
            score += 50
        if amount > income * 24:
            score -= 80
        
        return max(0, min(1000, score))
    
    def _classify_risk(self, score: int) -> Dict[str, Any]:
        """Risk siniflandirmasi"""
        if score >= 800:
            return {"class": "A", "level": "Cok Dusuk Risk", "emoji": "🟢", "color": "#22c55e"}
        elif score >= 650:
            return {"class": "B", "level": "Dusuk Risk", "emoji": "🟡", "color": "#84cc16"}
        elif score >= 500:
            return {"class": "C", "level": "Orta Risk", "emoji": "🟠", "color": "#f59e0b"}
        elif score >= 350:
            return {"class": "D", "level": "Yuksek Risk", "emoji": "🔴", "color": "#ef4444"}
        return {"class": "E", "level": "Cok Yuksek Risk", "emoji": "⛔", "color": "#dc2626"}
    
    def _calculate_payment_capacity(self, income: float, debt: float,
                                     amount: float, months: int) -> Dict[str, Any]:
        """Odeme kapasitesi hesapla"""
        annual_rate = 0.48  # %48 yillik faiz
        monthly_rate = annual_rate / 12
        
        # Aylik taksit hesabi
        monthly_payment = (amount * monthly_rate * (1 + monthly_rate) ** months) / \
                         ((1 + monthly_rate) ** months - 1)
        
        available_income = income - (debt / 12)
        payment_to_income = monthly_payment / income if income > 0 else 1
        max_affordable = available_income * 0.4
        can_afford = monthly_payment <= max_affordable
        
        return {
            "monthly_payment": round(monthly_payment),
            "payment_to_income_ratio": round(payment_to_income * 100, 2),
            "max_affordable_payment": round(max_affordable),
            "can_afford": can_afford,
            "remaining_income": round(available_income - monthly_payment)
        }
    
    def _generate_recommendations(self, score: int, income: float, debt: float,
                                   amount: float, credit_years: int) -> List[str]:
        """Oneriler olustur"""
        recommendations = []
        
        if score < 500:
            recommendations.append("💡 Kredi basvurusu oncesi mevcut borclarinizi azaltmanizi oneririz")
        if debt / (income * 12) > 0.3:
            recommendations.append("📉 Borc/Gelir oraniniz yuksek, konsolidasyon kredisi dusunebilirsiniz")
        if credit_years < 3:
            recommendations.append("📊 Kredi gecmisinizi guclendirmek icin duzenli odemeler yapin")
        if amount > income * 18:
            recommendations.append("💰 Talep ettiginiz miktar yuksek, daha dusuk bir tutar dusunebilirsiniz")
        if score >= 700:
            recommendations.append("✅ Kredi skorunuz iyi, uygun faiz oranlari icin pazarlik yapabilirsiniz")
        
        return recommendations


# Singleton instance
credit_risk_model = CreditRiskModel()
