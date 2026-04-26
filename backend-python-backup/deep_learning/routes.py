"""
Deep Learning API Routes
Tum derin ogrenme endpoint'leri
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
import logging

from .deep_learning_service import deep_learning_service

logger = logging.getLogger(__name__)

# Router
deep_learning_router = APIRouter(prefix="/api/deep-learning", tags=["Deep Learning"])


# ==================== Request Models ====================

class CreditRiskRequest(BaseModel):
    monthly_income: float
    age: Optional[int] = 30
    existing_debt: Optional[float] = 0
    credit_history_years: Optional[int] = 5
    employment_years: Optional[int] = 3
    requested_amount: Optional[float] = 100000
    requested_term_months: Optional[int] = 12
    existing_savings: Optional[float] = 10000


class TransactionRequest(BaseModel):
    amount: float
    type: Optional[str] = "transfer"
    time: Optional[str] = None
    location: Optional[str] = "Istanbul"
    merchant_category: Optional[str] = "retail"
    is_international: Optional[bool] = False


class BatchTransactionRequest(BaseModel):
    transactions: List[Dict[str, Any]]


class ProductClassificationRequest(BaseModel):
    image_data: Optional[str] = ""
    detected_labels: Optional[List[str]] = []


class LabelsRequest(BaseModel):
    labels: List[str]


class BatchPredictionRequest(BaseModel):
    assets: List[str] = ["gold", "usd", "eur"]
    days: int = 7


class MarketAnalysisRequest(BaseModel):
    assets: Optional[List[str]] = None
    days: Optional[int] = 7


class BatchClassifyRequest(BaseModel):
    images: List[Dict[str, Any]]


class ComprehensiveAnalysisRequest(BaseModel):
    assets: Optional[List[str]] = ["gold", "usd", "eur"]
    monthly_income: Optional[float] = None
    product_labels: Optional[List[str]] = None


# ==================== Model Bilgileri ====================

@deep_learning_router.get("/models")
async def get_model_info():
    """Tum model bilgilerini getir"""
    logger.info("GET /api/deep-learning/models")
    return deep_learning_service.get_model_info()


# ==================== LSTM Fiyat Tahmini ====================

@deep_learning_router.get("/price-prediction")
async def predict_price(
    asset: str = Query(default="gold", description="Varlik turu (gold, usd, eur, bist100, btc)"),
    days: int = Query(default=7, description="Tahmin suresi (1-90 gun)")
):
    """LSTM ile fiyat tahmini"""
    logger.info(f"GET /api/deep-learning/price-prediction?asset={asset}&days={days}")
    return deep_learning_service.predict_price(asset, days)


@deep_learning_router.post("/price-prediction/batch")
async def predict_multiple_assets(request: BatchPredictionRequest):
    """Coklu varlik fiyat tahmini"""
    logger.info("POST /api/deep-learning/price-prediction/batch")
    return deep_learning_service.predict_multiple_assets(request.assets, request.days)


# ==================== Kredi Risk Skorlama ====================

@deep_learning_router.post("/credit-risk")
async def assess_credit_risk(request: CreditRiskRequest):
    """Kredi risk analizi"""
    logger.info("POST /api/deep-learning/credit-risk")
    return deep_learning_service.assess_credit_risk(request.dict())


@deep_learning_router.get("/credit-risk/quick")
async def quick_credit_check(
    income: float = Query(..., description="Aylik gelir (TL)"),
    amount: float = Query(..., description="Talep edilen kredi tutari (TL)"),
    term: int = Query(default=12, description="Vade (ay)")
):
    """Hizli kredi uygunluk kontrolu"""
    logger.info(f"GET /api/deep-learning/credit-risk/quick?income={income}&amount={amount}&term={term}")
    return deep_learning_service.quick_credit_check(income, amount, term)


# ==================== Anomali Tespiti ====================

@deep_learning_router.post("/anomaly-detection")
async def detect_anomaly(request: TransactionRequest):
    """Tek islem anomali kontrolu"""
    logger.info("POST /api/deep-learning/anomaly-detection")
    return deep_learning_service.detect_anomaly(request.dict())


@deep_learning_router.post("/anomaly-detection/batch")
async def batch_anomaly_detection(request: BatchTransactionRequest):
    """Toplu islem anomali taramasi"""
    logger.info("POST /api/deep-learning/anomaly-detection/batch")
    return deep_learning_service.batch_anomaly_detection(request.transactions)


# ==================== Transformer Piyasa Analizi ====================

@deep_learning_router.get("/market-transformer")
async def analyze_market(
    assets: Optional[List[str]] = Query(default=None, description="Varliklar"),
    days: int = Query(default=7, description="Tahmin suresi")
):
    """Transformer ile piyasa analizi"""
    logger.info(f"GET /api/deep-learning/market-transformer?assets={assets}&days={days}")
    asset_list = assets if assets else ["gold", "usd", "eur", "bist100"]
    return deep_learning_service.analyze_market(asset_list, days)


@deep_learning_router.get("/market-transformer/default")
async def get_default_market_analysis():
    """Varsayilan piyasa analizi"""
    logger.info("GET /api/deep-learning/market-transformer/default")
    return deep_learning_service.get_default_market_analysis()


# ==================== CNN Urun Siniflandirma ====================

@deep_learning_router.post("/product-classification")
async def classify_product(request: ProductClassificationRequest):
    """Urun siniflandirma"""
    logger.info("POST /api/deep-learning/product-classification")
    return deep_learning_service.classify_product(request.image_data, request.detected_labels)


@deep_learning_router.post("/product-classification/from-labels")
async def classify_from_labels(request: LabelsRequest):
    """Etiketlerden siniflandirma"""
    logger.info("POST /api/deep-learning/product-classification/from-labels")
    return deep_learning_service.classify_from_labels(request.labels)


@deep_learning_router.post("/product-classification/batch")
async def batch_classify(request: BatchClassifyRequest):
    """Toplu urun siniflandirma"""
    logger.info("POST /api/deep-learning/product-classification/batch")
    return deep_learning_service.batch_classify(request.images)


# ==================== CNN Fine-Tuning ve Kategori Yonetimi ====================

from .product_classifier import product_classifier


class FineTuneRequest(BaseModel):
    training_data: List[Dict[str, Any]]  # [{"labels": [...], "category": "electronics"}, ...]
    epochs: Optional[int] = 20
    learning_rate: Optional[float] = 0.001


@deep_learning_router.post("/product-classification/fine-tune")
async def fine_tune_cnn(request: FineTuneRequest):
    """CNN modelini gercek veri ile fine-tune et"""
    logger.info(f"POST /api/deep-learning/product-classification/fine-tune - {len(request.training_data)} samples")
    return product_classifier.fine_tune(
        training_data=request.training_data,
        epochs=request.epochs,
        learning_rate=request.learning_rate
    )


@deep_learning_router.get("/product-classification/categories")
async def get_categories():
    """Tum kategorileri ve istatistikleri getir"""
    logger.info("GET /api/deep-learning/product-classification/categories")
    return product_classifier.get_category_stats()


@deep_learning_router.post("/product-classification/save-model")
async def save_model():
    """Mevcut modeli kaydet"""
    logger.info("POST /api/deep-learning/product-classification/save-model")
    try:
        path = product_classifier.save_model()
        return {"success": True, "message": "Model kaydedildi", "path": path}
    except Exception as e:
        return {"success": False, "error": str(e)}


# ==================== Kombine Analizler ====================

@deep_learning_router.post("/comprehensive-analysis")
async def comprehensive_analysis(request: ComprehensiveAnalysisRequest):
    """Kapsamli finansal analiz (tum modeller)"""
    logger.info("POST /api/deep-learning/comprehensive-analysis")
    
    result = {
        "success": True,
        "analysis_type": "Comprehensive Deep Learning Analysis"
    }
    
    # Piyasa analizi
    assets = request.assets or ["gold", "usd", "eur"]
    result["market_analysis"] = deep_learning_service.analyze_market(assets, 7)
    
    # Kredi risk (eger bilgi varsa)
    if request.monthly_income:
        result["credit_risk"] = deep_learning_service.assess_credit_risk({
            "monthly_income": request.monthly_income
        })
    
    # Urun siniflandirma (eger etiket varsa)
    if request.product_labels:
        result["product_classification"] = deep_learning_service.classify_from_labels(request.product_labels)
    
    return result


# ==================== Gercek Veri ve Egitim ====================

from .real_data_fetcher import real_data_fetcher
from .model_trainer import model_trainer
from .lstm_price_predictor import lstm_predictor
from .anomaly_detector import anomaly_detector


@deep_learning_router.get("/real-data/gold")
async def get_real_gold_prices():
    """Gercek altin fiyatlarini getir"""
    logger.info("GET /api/deep-learning/real-data/gold")
    return await real_data_fetcher.get_gold_prices()


@deep_learning_router.get("/real-data/currency")
async def get_real_currency_rates():
    """Gercek doviz kurlarini getir"""
    logger.info("GET /api/deep-learning/real-data/currency")
    return await real_data_fetcher.get_currency_rates()


@deep_learning_router.get("/real-data/live/{asset}")
async def get_live_price(asset: str):
    """Canli fiyat getir"""
    logger.info(f"GET /api/deep-learning/real-data/live/{asset}")
    return await real_data_fetcher.get_live_price(asset)


@deep_learning_router.get("/real-data/historical/{asset}")
async def get_historical_prices(
    asset: str,
    days: int = Query(default=60, description="Kac gunluk veri")
):
    """Tarihsel fiyat verisi getir"""
    logger.info(f"GET /api/deep-learning/real-data/historical/{asset}?days={days}")
    prices = await real_data_fetcher.get_historical_prices(asset, days)
    return {
        "success": True,
        "asset": asset,
        "days": days,
        "prices": prices,
        "min": min(prices),
        "max": max(prices),
        "avg": sum(prices) / len(prices)
    }


class TrainRequest(BaseModel):
    asset: Optional[str] = "gold"
    epochs: Optional[int] = 50


@deep_learning_router.post("/training/lstm")
async def train_lstm(request: TrainRequest):
    """LSTM modelini egit"""
    logger.info(f"POST /api/deep-learning/training/lstm - {request.asset}")
    return await model_trainer.train_lstm_model(
        lstm_predictor.model,
        request.asset,
        request.epochs
    )


@deep_learning_router.post("/training/anomaly")
async def train_anomaly(request: BatchTransactionRequest):
    """Anomali modelini egit"""
    logger.info("POST /api/deep-learning/training/anomaly")
    return await model_trainer.train_anomaly_model(
        anomaly_detector.model,
        request.transactions
    )


@deep_learning_router.get("/training/history")
async def get_training_history():
    """Egitim gecmisini getir"""
    logger.info("GET /api/deep-learning/training/history")
    return model_trainer.get_training_history()


# ==================== Gercek Veri ile Tahmin ====================

@deep_learning_router.get("/predict/real/{asset}")
async def predict_with_real_data(
    asset: str,
    days: int = Query(default=7, description="Tahmin gun sayisi")
):
    """Gercek veri ile fiyat tahmini"""
    logger.info(f"GET /api/deep-learning/predict/real/{asset}?days={days}")
    
    # Gercek tarihsel veri cek
    historical = await real_data_fetcher.get_historical_prices(asset, 60)
    
    # Canli fiyat
    live = await real_data_fetcher.get_live_price(asset)
    
    # LSTM tahmini (gercek veri ile guncellenmis)
    prediction = deep_learning_service.predict_price(asset, days)
    
    if prediction.get('success'):
        prediction['real_data'] = {
            'current_live_price': live.get('price', 0),
            'historical_days': len(historical),
            'historical_min': min(historical),
            'historical_max': max(historical),
            'historical_avg': sum(historical) / len(historical),
            'data_source': live.get('source', 'CollectAPI')
        }
    
    return prediction

