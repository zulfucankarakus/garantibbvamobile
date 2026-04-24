"""
LSTM Price Predictor - Machine Learning based Price Prediction
Gelişmiş fiyat tahmin modeli
"""
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Tuple
import warnings
warnings.filterwarnings('ignore')

try:
    from sklearn.preprocessing import MinMaxScaler
    from sklearn.model_selection import train_test_split
    import tensorflow as tf
    from tensorflow import keras
    from tensorflow.keras.models import Sequential
    from tensorflow.keras.layers import LSTM, Dense, Dropout
    ML_AVAILABLE = True
except ImportError:
    ML_AVAILABLE = False
    print("⚠️ TensorFlow/Scikit-learn not available. Using fallback predictions.")


class LSTMPricePredictor:
    """LSTM tabanlı fiyat tahmin modeli"""
    
    def __init__(self):
        self.model = None
        self.scaler = MinMaxScaler(feature_range=(0, 1)) if ML_AVAILABLE else None
        self.is_trained = False
        self.sequence_length = 12  # 12 aylık veri penceresi
    
    def generate_synthetic_data(self, 
                                 current_price: float, 
                                 months_history: int = 36,
                                 inflation_rate: float = 0.50) -> np.ndarray:
        """
        Sentetik fiyat geçmişi oluştur (gerçek data yoksa)
        Trend + Seasonality + Noise
        """
        np.random.seed(42)
        
        # Zaman serisi oluştur
        time_steps = np.arange(months_history)
        
        # Trend: Enflasyon bazlı artış
        monthly_inflation = (1 + inflation_rate) ** (1/12) - 1
        trend = current_price / ((1 + monthly_inflation) ** months_history) * (1 + monthly_inflation) ** time_steps
        
        # Mevsimsellik (sezonluk dalgalanmalar)
        seasonality = current_price * 0.05 * np.sin(2 * np.pi * time_steps / 12)
        
        # Rastgele gürültü
        noise = np.random.normal(0, current_price * 0.02, months_history)
        
        # Birleştir
        prices = trend + seasonality + noise
        
        return prices.reshape(-1, 1)
    
    def create_sequences(self, data: np.ndarray, seq_length: int) -> Tuple[np.ndarray, np.ndarray]:
        """Zaman serisi verilerini LSTM için sequence'lere böl"""
        X, y = [], []
        for i in range(len(data) - seq_length):
            X.append(data[i:i+seq_length])
            y.append(data[i+seq_length])
        return np.array(X), np.array(y)
    
    def build_model(self, input_shape: Tuple):
        """LSTM modelini oluştur"""
        if not ML_AVAILABLE:
            return None
        
        model = Sequential([
            LSTM(50, return_sequences=True, input_shape=input_shape),
            Dropout(0.2),
            LSTM(50, return_sequences=False),
            Dropout(0.2),
            Dense(25),
            Dense(1)
        ])
        
        model.compile(optimizer='adam', loss='mse', metrics=['mae'])
        return model
    
    def train_model(self, price_history: np.ndarray, epochs: int = 50, verbose: int = 0):
        """Modeli eğit"""
        if not ML_AVAILABLE:
            print("⚠️ ML libraries not available. Using fallback predictions.")
            return
        
        # Veriyi normalize et
        scaled_data = self.scaler.fit_transform(price_history)
        
        # Sequence'ler oluştur
        X, y = self.create_sequences(scaled_data, self.sequence_length)
        
        if len(X) < 10:
            print("⚠️ Insufficient data for training. Using fallback predictions.")
            return
        
        # Train-test split
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # Model oluştur
        self.model = self.build_model((X_train.shape[1], X_train.shape[2]))
        
        # Eğit
        self.model.fit(
            X_train, y_train,
            epochs=epochs,
            batch_size=32,
            validation_data=(X_test, y_test),
            verbose=verbose
        )
        
        self.is_trained = True
        print(f"✅ LSTM model trained successfully. Test Loss: {self.model.evaluate(X_test, y_test, verbose=0)[0]:.4f}")
    
    def predict_future_prices(self, 
                               current_price: float,
                               months_ahead: int = 12,
                               price_history: List[float] = None,
                               inflation_rate: float = 0.50) -> Dict:
        """
        Gelecek fiyatları tahmin et
        """
        if not ML_AVAILABLE or not self.is_trained:
            # Fallback: Basit linear projeksiyon
            return self._fallback_prediction(current_price, months_ahead, inflation_rate)
        
        try:
            # Eğer geçmiş veri yoksa, sentetik oluştur
            if price_history is None:
                price_history = self.generate_synthetic_data(current_price, months_history=36, inflation_rate=inflation_rate)
            else:
                price_history = np.array(price_history).reshape(-1, 1)
            
            # Eğer model eğitilmemişse, eğit
            if not self.is_trained:
                self.train_model(price_history, epochs=30, verbose=0)
            
            # Son sequence'i al
            scaled_data = self.scaler.transform(price_history)
            last_sequence = scaled_data[-self.sequence_length:].reshape(1, self.sequence_length, 1)
            
            # Gelecek tahminleri
            predictions = []
            current_sequence = last_sequence.copy()
            
            for _ in range(months_ahead):
                # Tahmin yap
                pred_scaled = self.model.predict(current_sequence, verbose=0)
                pred_price = self.scaler.inverse_transform(pred_scaled)[0][0]
                predictions.append(pred_price)
                
                # Sequence'i güncelle (rolling prediction)
                current_sequence = np.append(current_sequence[:, 1:, :], pred_scaled.reshape(1, 1, 1), axis=1)
            
            # Sonuçları formatla
            prediction_dates = []
            now = datetime.now()
            
            for i in range(1, months_ahead + 1):
                future_date = now + timedelta(days=30 * i)
                prediction_dates.append({
                    'month': i,
                    'date': future_date.strftime('%Y-%m-%d'),
                    'predicted_price': round(float(predictions[i-1]), 2)
                })
            
            final_price = float(predictions[-1])
            price_increase = final_price - current_price
            price_increase_percent = (price_increase / current_price) * 100
            
            return {
                'method': 'lstm',
                'current_price': round(current_price, 2),
                'predicted_price': round(final_price, 2),
                'months_ahead': months_ahead,
                'price_increase_amount': round(price_increase, 2),
                'price_increase_percent': round(price_increase_percent, 2),
                'monthly_predictions': prediction_dates,
                'confidence': 'high',
                'model_trained': True
            }
            
        except Exception as e:
            print(f"LSTM Prediction Error: {e}")
            return self._fallback_prediction(current_price, months_ahead, inflation_rate)
    
    def _fallback_prediction(self, current_price: float, months_ahead: int, inflation_rate: float) -> Dict:
        """Fallback tahmin (ML kullanılamazsa)"""
        monthly_increase = (1 + inflation_rate) ** (1/12) - 1
        future_price = current_price * ((1 + monthly_increase) ** months_ahead)
        
        # Aylık tahminler
        monthly_predictions = []
        now = datetime.now()
        
        for i in range(1, months_ahead + 1):
            future_date = now + timedelta(days=30 * i)
            month_price = current_price * ((1 + monthly_increase) ** i)
            monthly_predictions.append({
                'month': i,
                'date': future_date.strftime('%Y-%m-%d'),
                'predicted_price': round(month_price, 2)
            })
        
        price_increase = future_price - current_price
        price_increase_percent = (price_increase / current_price) * 100
        
        return {
            'method': 'fallback_linear',
            'current_price': round(current_price, 2),
            'predicted_price': round(future_price, 2),
            'months_ahead': months_ahead,
            'price_increase_amount': round(price_increase, 2),
            'price_increase_percent': round(price_increase_percent, 2),
            'monthly_predictions': monthly_predictions,
            'confidence': 'medium',
            'model_trained': False
        }


# Global instance
lstm_predictor = LSTMPricePredictor()
