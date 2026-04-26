"""
Model Egitim Modulu
Gercek verilerle model egitimi ve guncelleme
"""

import torch
import torch.nn as nn
import torch.optim as optim
import numpy as np
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple
import logging
import asyncio

from .real_data_fetcher import real_data_fetcher

logger = logging.getLogger(__name__)


class ModelTrainer:
    """Model egitim servisi"""
    
    def __init__(self):
        self.training_history = {}
        self.is_training = False
        logger.info("ModelTrainer initialized")
    
    async def prepare_lstm_data(self, asset: str, sequence_length: int = 30) -> Tuple[torch.Tensor, torch.Tensor]:
        """LSTM icin egitim verisi hazirla"""
        # Gercek veri cek
        prices = await real_data_fetcher.get_historical_prices(asset, 90)
        
        if len(prices) < sequence_length + 1:
            raise ValueError(f"Yetersiz veri: {len(prices)} < {sequence_length + 1}")
        
        # Normalize et
        prices_array = np.array(prices)
        mean = prices_array.mean()
        std = prices_array.std()
        normalized = (prices_array - mean) / std
        
        # Sekanslar olustur
        X, y = [], []
        for i in range(len(normalized) - sequence_length):
            X.append(normalized[i:i + sequence_length])
            y.append(normalized[i + sequence_length])
        
        X = torch.FloatTensor(np.array(X)).unsqueeze(-1)  # [batch, seq, 1]
        y = torch.FloatTensor(np.array(y)).unsqueeze(-1)  # [batch, 1]
        
        return X, y, mean, std
    
    async def train_lstm_model(self, model: nn.Module, asset: str, 
                                epochs: int = 50, lr: float = 0.001) -> Dict[str, Any]:
        """LSTM modelini egit"""
        if self.is_training:
            return {"success": False, "error": "Baska bir egitim devam ediyor"}
        
        self.is_training = True
        logger.info(f"LSTM egitimi baslatiliyor: {asset}")
        
        try:
            # Veri hazirla
            X, y, mean, std = await self.prepare_lstm_data(asset)
            
            # Train/val split
            split = int(len(X) * 0.8)
            X_train, X_val = X[:split], X[split:]
            y_train, y_val = y[:split], y[split:]
            
            # Optimizer ve loss
            optimizer = optim.Adam(model.parameters(), lr=lr)
            criterion = nn.MSELoss()
            
            # Egitim
            train_losses = []
            val_losses = []
            
            model.train()
            for epoch in range(epochs):
                # Forward pass
                optimizer.zero_grad()
                outputs = model(X_train)
                loss = criterion(outputs, y_train)
                
                # Backward pass
                loss.backward()
                optimizer.step()
                
                train_losses.append(loss.item())
                
                # Validation
                model.eval()
                with torch.no_grad():
                    val_outputs = model(X_val)
                    val_loss = criterion(val_outputs, y_val)
                    val_losses.append(val_loss.item())
                model.train()
                
                if (epoch + 1) % 10 == 0:
                    logger.info(f"Epoch {epoch+1}/{epochs} - Loss: {loss.item():.6f}, Val Loss: {val_loss.item():.6f}")
            
            # Sonuclari kaydet
            training_result = {
                "success": True,
                "asset": asset,
                "epochs": epochs,
                "final_train_loss": train_losses[-1],
                "final_val_loss": val_losses[-1],
                "train_losses": train_losses[-10:],  # Son 10
                "val_losses": val_losses[-10:],
                "normalization": {"mean": mean, "std": std},
                "trained_at": datetime.now().isoformat()
            }
            
            self.training_history[f"lstm_{asset}"] = training_result
            
            return training_result
            
        except Exception as e:
            logger.error(f"Egitim hatasi: {e}")
            return {"success": False, "error": str(e)}
        finally:
            self.is_training = False
    
    async def train_anomaly_model(self, model: nn.Module, 
                                   transactions: List[Dict], 
                                   epochs: int = 30) -> Dict[str, Any]:
        """Anomali tespit modelini egit"""
        if self.is_training:
            return {"success": False, "error": "Baska bir egitim devam ediyor"}
        
        self.is_training = True
        logger.info("Anomali modeli egitimi baslatiliyor")
        
        try:
            # Islem verilerini feature vectore donustur
            features = []
            for tx in transactions:
                feature = [
                    min(1.0, tx.get('amount', 0) / 100000),  # Normalize amount
                    tx.get('hour', 12) / 24,  # Normalize hour
                    0.5,  # Transaction type (default)
                    0.2 if tx.get('location', '').lower() in ['istanbul', 'ankara', 'izmir'] else 0.8,
                    0.3,  # Merchant category (default)
                    1.0 if tx.get('is_international', False) else 0.0
                ]
                features.append(feature)
            
            if len(features) < 10:
                # Sentetik veri ekle
                for _ in range(50):
                    features.append([
                        np.random.uniform(0, 0.5),
                        np.random.uniform(0.3, 0.8),
                        np.random.uniform(0.2, 0.5),
                        np.random.uniform(0.1, 0.3),
                        np.random.uniform(0.1, 0.4),
                        0.0
                    ])
            
            X = torch.FloatTensor(np.array(features))
            
            # Autoencoder egitimi
            optimizer = optim.Adam(model.parameters(), lr=0.001)
            criterion = nn.MSELoss()
            
            losses = []
            model.train()
            
            for epoch in range(epochs):
                optimizer.zero_grad()
                reconstructed, _ = model(X)
                loss = criterion(reconstructed, X)
                loss.backward()
                optimizer.step()
                losses.append(loss.item())
                
                if (epoch + 1) % 10 == 0:
                    logger.info(f"Epoch {epoch+1}/{epochs} - Reconstruction Loss: {loss.item():.6f}")
            
            training_result = {
                "success": True,
                "epochs": epochs,
                "final_loss": losses[-1],
                "losses": losses[-10:],
                "samples_used": len(features),
                "trained_at": datetime.now().isoformat()
            }
            
            self.training_history["anomaly_detector"] = training_result
            
            return training_result
            
        except Exception as e:
            logger.error(f"Anomali model egitim hatasi: {e}")
            return {"success": False, "error": str(e)}
        finally:
            self.is_training = False
    
    def get_training_history(self) -> Dict[str, Any]:
        """Egitim gecmisini getir"""
        return {
            "history": self.training_history,
            "is_training": self.is_training
        }


# Singleton instance
model_trainer = ModelTrainer()
