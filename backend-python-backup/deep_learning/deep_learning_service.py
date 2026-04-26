"""
Deep Learning Service
Tum derin ogrenme modellerini yoneten ana servis
"""

from typing import Dict, Any, List
import logging

from .lstm_price_predictor import lstm_predictor
from .credit_risk_model import credit_risk_model
from .anomaly_detector import anomaly_detector
from .market_transformer import market_transformer
from .product_classifier import product_classifier

logger = logging.getLogger(__name__)


class DeepLearningService:
    """Deep Learning Servisi - Tum modelleri yonetir"""
    
    VALID_ASSETS = ['gold', 'usd', 'eur', 'bist100', 'btc']
    
    # ==================== LSTM Fiyat Tahmini ====================
    
    def predict_price(self, asset: str, days: int) -> Dict[str, Any]:
        """LSTM ile fiyat tahmini"""
        logger.info(f"Fiyat tahmini istegi: {asset} icin {days} gun")
        
        if days <= 0 or days > 90:
            return {
                "success": False,
                "error": "Tahmin suresi 1-90 gun arasinda olmalidir"
            }
        
        if asset.lower() not in self.VALID_ASSETS:
            return {
                "success": False,
                "error": f"Gecersiz varlik turu. Gecerli degerler: {self.VALID_ASSETS}"
            }
        
        return lstm_predictor.predict_price(asset, days)
    
    def predict_multiple_assets(self, assets: List[str], days: int) -> Dict[str, Any]:
        """Coklu varlik fiyat tahmini"""
        logger.info(f"Coklu fiyat tahmini: {len(assets)} varlik, {days} gun")
        
        predictions = []
        for asset in assets:
            prediction = self.predict_price(asset, days)
            predictions.append({
                "asset": asset,
                "prediction": prediction
            })
        
        return {
            "success": True,
            "assets_count": len(assets),
            "prediction_days": days,
            "predictions": predictions
        }
    
    # ==================== Kredi Risk Skorlama ====================
    
    def assess_credit_risk(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Kredi risk analizi"""
        logger.info("Kredi risk analizi baslatildi")
        
        if 'monthly_income' not in request:
            return {
                "success": False,
                "error": "Aylik gelir (monthly_income) zorunludur"
            }
        
        return credit_risk_model.assess_credit_risk(request)
    
    def quick_credit_check(self, monthly_income: float, requested_amount: float, 
                           term_months: int) -> Dict[str, Any]:
        """Hizli kredi uygunluk kontrolu"""
        logger.info(f"Hizli kredi kontrolu: {monthly_income} TL gelir, {requested_amount} TL talep")
        
        request = {
            "monthly_income": monthly_income,
            "requested_amount": requested_amount,
            "requested_term_months": term_months,
            "age": 35,
            "existing_debt": 0,
            "credit_history_years": 5,
            "employment_years": 3,
            "existing_savings": monthly_income * 2
        }
        
        result = credit_risk_model.assess_credit_risk(request)
        
        if result.get('success'):
            return {
                "success": True,
                "eligible": result['risk_score'] >= 500,
                "risk_score": result['risk_score'],
                "risk_class": result['risk_class'],
                "payment_capacity": result['payment_capacity']
            }
        
        return result
    
    # ==================== Anomali Tespiti ====================
    
    def detect_anomaly(self, transaction: Dict[str, Any]) -> Dict[str, Any]:
        """Tek islem anomali kontrolu"""
        logger.info("Islem anomali kontrolu baslatildi")
        
        if 'amount' not in transaction:
            return {
                "success": False,
                "error": "Islem tutari (amount) zorunludur"
            }
        
        return anomaly_detector.detect_anomaly(transaction)
    
    def batch_anomaly_detection(self, transactions: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Toplu islem anomali taramasi"""
        logger.info(f"Toplu anomali taramasi: {len(transactions)} islem")
        
        if not transactions:
            return {
                "success": False,
                "error": "En az bir islem gereklidir"
            }
        
        return anomaly_detector.batch_anomaly_detection(transactions)
    
    # ==================== Transformer Piyasa Analizi ====================
    
    def analyze_market(self, assets: List[str], prediction_days: int) -> Dict[str, Any]:
        """Transformer ile piyasa analizi"""
        logger.info(f"Transformer piyasa analizi: {len(assets)} varlik")
        
        if not assets:
            assets = ['gold', 'usd', 'eur', 'bist100']
        
        if prediction_days <= 0:
            prediction_days = 7
        
        return market_transformer.analyze_market(assets, prediction_days)
    
    def get_default_market_analysis(self) -> Dict[str, Any]:
        """Varsayilan piyasa analizi"""
        return self.analyze_market(['gold', 'usd', 'eur', 'bist100'], 7)
    
    # ==================== CNN Urun Siniflandirma ====================
    
    def classify_product(self, image_data: str, detected_labels: List[str]) -> Dict[str, Any]:
        """Urun siniflandirma"""
        logger.info("Urun siniflandirma baslatildi")
        return product_classifier.classify_product(image_data, detected_labels)
    
    def classify_from_labels(self, labels: List[str]) -> Dict[str, Any]:
        """Etiketlerden urun siniflandirma"""
        logger.info(f"Etiketlerden siniflandirma: {len(labels)} etiket")
        
        if not labels:
            return {
                "success": False,
                "error": "En az bir etiket gereklidir"
            }
        
        return product_classifier.classify_product(None, labels)
    
    def batch_classify(self, images: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Toplu urun siniflandirma"""
        logger.info(f"Toplu urun siniflandirma: {len(images)} goruntu")
        
        if not images:
            return {
                "success": False,
                "error": "En az bir goruntu gereklidir"
            }
        
        return product_classifier.batch_classify(images)
    
    # ==================== Model Bilgileri ====================
    
    def get_model_info(self) -> Dict[str, Any]:
        """Tum model bilgilerini getir"""
        return {
            "service": "Garanti BBVA Deep Learning Service",
            "version": "1.0.0",
            "framework": "PyTorch",
            "models": [
                {
                    "name": "LSTM Price Predictor",
                    "type": "LSTM (Long Short-Term Memory)",
                    "purpose": "Varlik fiyat tahmini (Altin, Dolar, Euro)",
                    "endpoint": "/api/deep-learning/price-prediction"
                },
                {
                    "name": "Credit Risk Model",
                    "type": "MLP (Multi-Layer Perceptron)",
                    "purpose": "Kredi risk skorlama ve analizi",
                    "endpoint": "/api/deep-learning/credit-risk"
                },
                {
                    "name": "Anomaly Detector",
                    "type": "Autoencoder (Variational)",
                    "purpose": "Supheli islem tespiti",
                    "endpoint": "/api/deep-learning/anomaly-detection"
                },
                {
                    "name": "Market Transformer",
                    "type": "Transformer Encoder",
                    "purpose": "Kapsamli piyasa analizi",
                    "endpoint": "/api/deep-learning/market-transformer"
                },
                {
                    "name": "Product Classifier",
                    "type": "CNN (ResNet-50 based)",
                    "purpose": "Goruntuden urun siniflandirma",
                    "endpoint": "/api/deep-learning/product-classification"
                }
            ],
            "total_parameters": "~15M (simulated)",
            "supported_assets": self.VALID_ASSETS,
            "product_categories": product_classifier.CATEGORIES
        }


# Singleton instance
deep_learning_service = DeepLearningService()
