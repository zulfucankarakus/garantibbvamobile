"""
PSO Portfolio Optimizer - Particle Swarm Optimization
Varlık portföyü optimizasyonu
"""
import numpy as np
from typing import Dict, List, Tuple
import warnings
warnings.filterwarnings('ignore')

try:
    from pyswarm import pso
    PSO_AVAILABLE = True
except ImportError:
    PSO_AVAILABLE = False
    print("⚠️ PySwarm not available. Using fallback optimization.")


class PortfolioOptimizer:
    """PSO ile portföy optimizasyonu"""
    
    def __init__(self):
        self.asset_names = ['mevduat', 'doviz', 'altin', 'fon']
        self.n_assets = len(self.asset_names)
    
    def optimize_portfolio(self,
                           target_return: float,
                           asset_returns: Dict[str, float],
                           asset_risks: Dict[str, float] = None,
                           duration_months: int = 12) -> Dict:
        """
        Portföy optimizasyonu (PSO)
        Hedef: Risk minimize ederken getiriyi maksimize et
        """
        
        if not PSO_AVAILABLE:
            return self._fallback_optimization(target_return, asset_returns, duration_months)
        
        try:
            # Getiri ve risk değerleri
            returns = np.array([asset_returns[asset] for asset in self.asset_names])
            
            # Risk değerleri (volatilite)
            if asset_risks is None:
                # Default risk değerleri (yıllık volatilite %)
                risks = np.array([5.0, 15.0, 12.0, 18.0])  # Mevduat en düşük, Fon en yüksek
            else:
                risks = np.array([asset_risks[asset] for asset in self.asset_names])
            
            # Korelasyon matrisi (varlıklar arası)
            correlation_matrix = np.array([
                [1.0, 0.3, 0.2, 0.4],  # Mevduat
                [0.3, 1.0, 0.7, 0.6],  # Döviz
                [0.2, 0.7, 1.0, 0.5],  # Altın
                [0.4, 0.6, 0.5, 1.0]   # Fon
            ])
            
            # Kovaryans matrisi
            risk_matrix = np.outer(risks, risks) * correlation_matrix
            
            def objective_function(weights):
                """
                Minimize edilecek fonksiyon: Risk (variance)
                Constraint: Toplam ağırlık = 1, hedef getiri sağlanmalı
                """
                # Portföy getirisi
                portfolio_return = np.dot(weights, returns)
                
                # Portföy riski (variance)
                portfolio_variance = np.dot(weights, np.dot(risk_matrix, weights))
                
                # Penalty: Hedef getiriden uzaklaşma
                return_penalty = abs(portfolio_return - target_return) * 100
                
                # Minimize: Risk + Return Penalty
                return portfolio_variance + return_penalty
            
            # PSO constraints
            lb = [0.0] * self.n_assets  # Alt sınır: %0
            ub = [1.0] * self.n_assets  # Üst sınır: %100
            
            # PSO optimization
            xopt, fopt = pso(
                objective_function,
                lb, ub,
                swarmsize=100,
                maxiter=100,
                debug=False
            )
            
            # Normalize weights (toplamı 1 olsun)
            weights = xopt / np.sum(xopt)
            
            # Sonuçları hesapla
            portfolio_return = np.dot(weights, returns)
            portfolio_risk = np.sqrt(np.dot(weights, np.dot(risk_matrix, weights)))
            
            # Sharpe Ratio (risk-adjusted return)
            sharpe_ratio = (portfolio_return - asset_returns['mevduat']) / portfolio_risk if portfolio_risk > 0 else 0
            
            # Ağırlıkları dictionary'e çevir
            asset_mix = {
                asset: round(float(weights[i] * 100), 2)
                for i, asset in enumerate(self.asset_names)
            }
            
            return {
                'method': 'pso',
                'asset_mix': asset_mix,
                'expected_annual_return': round(float(portfolio_return), 2),
                'portfolio_risk': round(float(portfolio_risk), 2),
                'sharpe_ratio': round(float(sharpe_ratio), 2),
                'target_return': target_return,
                'optimization_score': round(100 - fopt, 2),  # Yüksek skor = iyi optimizasyon
                'duration_months': duration_months,
                'optimized': True
            }
            
        except Exception as e:
            print(f"PSO Optimization Error: {e}")
            return self._fallback_optimization(target_return, asset_returns, duration_months)
    
    def _fallback_optimization(self, 
                                target_return: float,
                                asset_returns: Dict[str, float],
                                duration_months: int) -> Dict:
        """
        Fallback optimizasyon (PSO kullanılamazsa)
        Basit heuristic yaklaşım
        """
        
        # Getiri sıralaması
        sorted_assets = sorted(
            asset_returns.items(),
            key=lambda x: x[1],
            reverse=True
        )
        
        # Süre bazlı risk toleransı
        if duration_months <= 6:
            # Kısa vade: Daha güvenli
            mix = {
                'mevduat': 50,
                'doviz': 25,
                'altin': 20,
                'fon': 5
            }
        elif duration_months <= 12:
            # Orta vade: Dengeli
            mix = {
                'doviz': 35,
                'altin': 30,
                'fon': 25,
                'mevduat': 10
            }
        else:
            # Uzun vade: Daha agresif
            mix = {
                'fon': 40,
                'doviz': 30,
                'altin': 20,
                'mevduat': 10
            }
        
        # Hedef getiriye göre ayarlama
        avg_return = sum(asset_returns[asset] * mix[asset] / 100 for asset in self.asset_names)
        
        if avg_return < target_return:
            # Getiriyi artır: Yüksek getirili varlıklara yönel
            high_return_asset = sorted_assets[0][0]
            if high_return_asset in mix:
                # En yüksek getirili varlığı artır
                mix[high_return_asset] += 10
                mix['mevduat'] = max(0, mix['mevduat'] - 10)
        
        # Normalize (toplam 100 olsun)
        total = sum(mix.values())
        mix = {k: round(v * 100 / total, 2) for k, v in mix.items()}
        
        # Beklenen getiri
        expected_return = sum(asset_returns[asset] * mix[asset] / 100 for asset in self.asset_names)
        
        return {
            'method': 'fallback_heuristic',
            'asset_mix': mix,
            'expected_annual_return': round(expected_return, 2),
            'portfolio_risk': 10.0,  # Ortalama risk
            'sharpe_ratio': 1.5,
            'target_return': target_return,
            'optimization_score': 75.0,
            'duration_months': duration_months,
            'optimized': False
        }
    
    def calculate_protection_score(self, 
                                     portfolio_return: float,
                                     inflation_rate: float) -> float:
        """
        Koruma skoru hesapla
        100+ = Enflasyonu geçiyor
        100- = Enflasyonun altında
        """
        if inflation_rate == 0:
            return 100.0
        
        protection_score = (portfolio_return / inflation_rate) * 100
        return round(protection_score, 1)
    
    def rebalance_portfolio(self,
                            current_mix: Dict[str, float],
                            market_conditions: Dict,
                            months_remaining: int) -> Dict:
        """
        Portföyü yeniden dengele (piyasa koşullarına göre)
        """
        # Güncel market data
        asset_returns = market_conditions.get('asset_returns', {})
        
        # Yeniden optimizasyon
        target_return = sum(
            asset_returns.get(asset, 0) * (current_mix.get(asset, 0) / 100)
            for asset in self.asset_names
        )
        
        new_portfolio = self.optimize_portfolio(
            target_return=target_return,
            asset_returns=asset_returns,
            duration_months=months_remaining
        )
        
        # Değişim analizi
        changes = {
            asset: round(new_portfolio['asset_mix'].get(asset, 0) - current_mix.get(asset, 0), 2)
            for asset in self.asset_names
        }
        
        return {
            'old_mix': current_mix,
            'new_mix': new_portfolio['asset_mix'],
            'changes': changes,
            'rebalance_recommended': any(abs(v) > 5 for v in changes.values()),  # %5+ değişim varsa önerilir
            'reason': 'Market koşulları değişti' if any(abs(v) > 5 for v in changes.values()) else 'Portföy dengede'
        }


# Global instance
portfolio_optimizer = PortfolioOptimizer()
