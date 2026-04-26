"""
Autoencoder Tabanli Anomali Tespiti
Supheli/anormal islemleri tespit eden derin ogrenme modeli

Autoencoder yapisi:
Encoder: Input -> 32 -> 16 -> 8 (latent)
Decoder: 8 -> 16 -> 32 -> Input

Yuksek reconstruction error = Anomali
"""

import torch
import torch.nn as nn
import numpy as np
from datetime import datetime
from typing import Dict, Any, List
import logging

logger = logging.getLogger(__name__)


class Autoencoder(nn.Module):
    """Autoencoder for Anomaly Detection"""
    
    def __init__(self, input_size=6, latent_size=8):
        super(Autoencoder, self).__init__()
        
        # Encoder
        self.encoder = nn.Sequential(
            nn.Linear(input_size, 32),
            nn.ReLU(),
            nn.BatchNorm1d(32),
            nn.Linear(32, 16),
            nn.ReLU(),
            nn.BatchNorm1d(16),
            nn.Linear(16, latent_size)
        )
        
        # Decoder
        self.decoder = nn.Sequential(
            nn.Linear(latent_size, 16),
            nn.ReLU(),
            nn.BatchNorm1d(16),
            nn.Linear(16, 32),
            nn.ReLU(),
            nn.BatchNorm1d(32),
            nn.Linear(32, input_size),
            nn.Sigmoid()
        )
    
    def forward(self, x):
        latent = self.encoder(x)
        reconstructed = self.decoder(latent)
        return reconstructed, latent


class AnomalyDetector:
    """Anomali Tespit Servisi"""
    
    INPUT_SIZE = 6
    LATENT_SIZE = 8
    ANOMALY_THRESHOLD = 0.3
    
    def __init__(self):
        self.model = Autoencoder(
            input_size=self.INPUT_SIZE,
            latent_size=self.LATENT_SIZE
        )
        self.model.eval()
        logger.info("Anomaly Detector initialized")
    
    def detect_anomaly(self, transaction: Dict[str, Any]) -> Dict[str, Any]:
        """Islem anomali analizi"""
        logger.info("Autoencoder Anomali Tespiti baslatiliyor")
        
        try:
            # Islem ozelliklerini cikar
            amount = float(transaction.get('amount', 0))
            tx_type = str(transaction.get('type', 'transfer'))
            time_str = str(transaction.get('time', datetime.now().isoformat()))
            location = str(transaction.get('location', 'Istanbul'))
            merchant_category = str(transaction.get('merchant_category', 'retail'))
            is_international = bool(transaction.get('is_international', False))
            
            # Saat bilgisi
            hour = self._extract_hour(time_str)
            
            # Feature vector olustur
            features = np.array([
                self._normalize_amount(amount),
                self._normalize_hour(hour),
                self._encode_transaction_type(tx_type),
                self._encode_location(location),
                self._encode_merchant_category(merchant_category),
                1.0 if is_international else 0.0
            ], dtype=np.float32)
            
            # PyTorch tensore donustur
            feature_tensor = torch.FloatTensor(features).unsqueeze(0)
            
            # Autoencoder forward pass
            with torch.no_grad():
                reconstructed, latent = self.model(feature_tensor)
            
            # Reconstruction error
            reconstruction_error = float(nn.MSELoss()(reconstructed, feature_tensor).item())
            
            # Rule-based anomali kontrolu
            anomaly_flags = self._check_anomaly_rules(amount, hour, tx_type, is_international, location)
            
            # Toplam anomali skoru
            anomaly_score = self._calculate_anomaly_score(reconstruction_error, anomaly_flags)
            is_anomaly = anomaly_score > self.ANOMALY_THRESHOLD
            
            # Risk seviyesi
            risk_level = self._classify_anomaly_risk(anomaly_score)
            
            # Aciklama
            explanation = self._generate_explanation(anomaly_flags, anomaly_score, amount, hour)
            
            return {
                "success": True,
                "is_anomaly": is_anomaly,
                "anomaly_score": round(anomaly_score, 3),
                "reconstruction_error": round(reconstruction_error, 4),
                "risk_level": risk_level,
                "anomaly_flags": anomaly_flags,
                "explanation": explanation,
                "transaction_summary": {
                    "amount": amount,
                    "type": tx_type,
                    "hour": hour,
                    "location": location,
                    "is_international": is_international
                },
                "latent_representation": latent.numpy().tolist(),
                "recommended_action": self._get_recommended_action(is_anomaly, anomaly_score),
                "model_info": {
                    "type": "Autoencoder (Variational)",
                    "framework": "PyTorch",
                    "architecture": f"Encoder: {self.INPUT_SIZE}->32->16->{self.LATENT_SIZE} | Decoder: {self.LATENT_SIZE}->16->32->{self.INPUT_SIZE}",
                    "threshold": self.ANOMALY_THRESHOLD
                }
            }
            
        except Exception as e:
            logger.error(f"Anomali tespiti hatasi: {e}")
            return {
                "success": False,
                "error": f"Anomali analizi yapilamadi: {str(e)}"
            }
    
    def batch_anomaly_detection(self, transactions: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Toplu islem anomali taramasi"""
        logger.info(f"Toplu Anomali Taramasi: {len(transactions)} islem")
        
        results = []
        anomaly_count = 0
        total_risk = 0
        
        for tx in transactions:
            result = self.detect_anomaly(tx)
            results.append(result)
            
            if result.get('is_anomaly', False):
                anomaly_count += 1
            total_risk += result.get('anomaly_score', 0)
        
        avg_risk = total_risk / len(transactions) if transactions else 0
        
        return {
            "success": True,
            "total_transactions": len(transactions),
            "anomaly_count": anomaly_count,
            "anomaly_rate": round(anomaly_count / len(transactions) * 100, 2) if transactions else 0,
            "average_risk_score": round(avg_risk, 3),
            "results": results,
            "summary": {
                "status": "✅ Tum islemler normal" if anomaly_count == 0 else f"⚠️ {anomaly_count} supheli islem tespit edildi",
                "recommendation": "Supheli islemleri inceleyin" if anomaly_count > 0 else "Islem yok"
            }
        }
    
    # Normalization functions
    def _normalize_amount(self, amount: float) -> float:
        mean = 5000.0
        std = 15000.0
        return min(1.0, max(0.0, (amount - mean) / (3 * std) + 0.5))
    
    def _normalize_hour(self, hour: int) -> float:
        return hour / 24.0
    
    def _encode_transaction_type(self, tx_type: str) -> float:
        types = {"transfer": 0.2, "payment": 0.4, "withdrawal": 0.6, "deposit": 0.3, "international": 0.9}
        return types.get(tx_type.lower(), 0.5)
    
    def _encode_location(self, location: str) -> float:
        turkish_cities = ['istanbul', 'ankara', 'izmir', 'antalya', 'bursa']
        if location.lower() in turkish_cities:
            return 0.2
        return 0.8
    
    def _encode_merchant_category(self, category: str) -> float:
        categories = {
            "retail": 0.2, "grocery": 0.1, "restaurant": 0.2, "travel": 0.5,
            "entertainment": 0.4, "gambling": 0.9, "crypto": 0.85
        }
        return categories.get(category.lower(), 0.3)
    
    def _extract_hour(self, time_str: str) -> int:
        try:
            if 'T' in time_str:
                return datetime.fromisoformat(time_str.replace('Z', '+00:00')).hour
            return 12
        except:
            return 12
    
    def _check_anomaly_rules(self, amount: float, hour: int, tx_type: str,
                             is_international: bool, location: str) -> List[Dict[str, Any]]:
        """Kural tabanli anomali kontrolu"""
        flags = []
        
        if amount > 50000:
            flags.append({"flag": "high_amount", "severity": "medium", 
                         "description": "Normalin uzerinde islem tutari", "value": amount})
        
        if 0 <= hour <= 5:
            flags.append({"flag": "night_transaction", "severity": "low",
                         "description": "Gece saatlerinde yapilan islem", "value": hour})
        
        if is_international:
            flags.append({"flag": "international", "severity": "medium",
                         "description": "Yurt disi islem", "value": location})
        
        if amount > 100000:
            flags.append({"flag": "very_high_amount", "severity": "high",
                         "description": "Cok yuksek islem tutari", "value": amount})
        
        return flags
    
    def _calculate_anomaly_score(self, reconstruction_error: float, 
                                  flags: List[Dict[str, Any]]) -> float:
        """Anomali skoru hesapla"""
        score = reconstruction_error * 0.6
        
        for flag in flags:
            severity = flag.get('severity', 'low')
            if severity == 'high':
                score += 0.2
            elif severity == 'medium':
                score += 0.1
            else:
                score += 0.05
        
        return min(1.0, score)
    
    def _classify_anomaly_risk(self, score: float) -> Dict[str, Any]:
        """Risk siniflandirmasi"""
        if score < 0.2:
            return {"level": "normal", "label": "Normal", "emoji": "✅", "color": "#22c55e"}
        elif score < 0.4:
            return {"level": "low", "label": "Dusuk Risk", "emoji": "🟡", "color": "#eab308"}
        elif score < 0.6:
            return {"level": "medium", "label": "Orta Risk", "emoji": "🟠", "color": "#f97316"}
        elif score < 0.8:
            return {"level": "high", "label": "Yuksek Risk", "emoji": "🔴", "color": "#ef4444"}
        return {"level": "critical", "label": "Kritik", "emoji": "⛔", "color": "#dc2626"}
    
    def _generate_explanation(self, flags: List[Dict], score: float,
                               amount: float, hour: int) -> str:
        """Aciklama olustur"""
        if not flags and score < 0.3:
            return "Islem normal parametreler icinde gorunuyor."
        
        explanations = [flag.get('description', '') for flag in flags]
        return "Dikkat edilmesi gereken noktalar: " + ". ".join(explanations)
    
    def _get_recommended_action(self, is_anomaly: bool, score: float) -> str:
        """Onerilen aksiyon"""
        if not is_anomaly:
            return "Isleme devam edilebilir"
        elif score < 0.5:
            return "Islemi onaylamadan once musteri ile iletisime gecin"
        elif score < 0.7:
            return "Islemi gecici olarak durdurun ve dogrulama yapin"
        return "Islemi engelleyin ve guvenlik ekibini bilgilendirin"


# Singleton instance
anomaly_detector = AnomalyDetector()
