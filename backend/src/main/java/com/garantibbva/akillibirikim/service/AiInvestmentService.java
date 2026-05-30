package com.garantibbva.akillibirikim.service;

import com.garantibbva.akillibirikim.util.EconomicParameters;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
@RequiredArgsConstructor
public class AiInvestmentService {
    
    public Map<String, Object> recommendAllocation(String productName, double targetAmount, 
            int durationMonths, String riskProfile, double existingSavings, double monthlyContribution) {
        
        // AI tabanlı dinamik dağılım
        Map<String, Double> allocation = EconomicParameters.getAiRecommendedAllocation(riskProfile);
        
        // Dağılım detayları
        List<Map<String, Object>> allocationDetails = new ArrayList<>();
        Map<String, String> assetNames = Map.of(
            "tl_savings", "TL Birikim",
            "gold", "Altın",
            "usd", "Dolar",
            "eur", "Euro"
        );
        Map<String, String> assetEmojis = Map.of(
            "tl_savings", "💰",
            "gold", "🥇",
            "usd", "💵",
            "eur", "💶"
        );
        
        for (Map.Entry<String, Double> entry : allocation.entrySet()) {
            allocationDetails.add(Map.of(
                "asset", entry.getKey(),
                "name", assetNames.get(entry.getKey()),
                "percentage", entry.getValue(),
                "emoji", assetEmojis.get(entry.getKey()),
                "risk_level", getRiskLevel(entry.getKey())
            ));
        }
        
        // Projeksiyon hesapla
        double totalContribution = existingSavings + (monthlyContribution * durationMonths);
        double avgReturn = calculateWeightedReturn(allocation);
        double projectedValue = totalContribution * (1 + avgReturn / 100);
        
        return Map.of(
            "allocation", allocation,
            "allocation_details", allocationDetails,
            "reasoning", "Yüksek enflasyon ortamında (" + EconomicParameters.ANNUAL_INFLATION + "%) altın enflasyonu geçen tek varlık olarak öne çıkıyor. Bu nedenle altın ağırlıklı portföy önerilmektedir.",
            "insights", List.of(
                "Altın getirisi (%" + EconomicParameters.GOLD_RETURN + ") enflasyonu (%" + EconomicParameters.ANNUAL_INFLATION + ") geçiyor",
                "TL mevduat faizi (%" + EconomicParameters.DEPOSIT_RATE + ") enflasyonun altında",
                "Döviz sepeti uzun vadeli koruma sağlıyor"
            ),
            "projections", Map.of(
                "total_contribution", totalContribution,
                "estimated_return", avgReturn,
                "projected_value", projectedValue,
                "can_reach_target", projectedValue >= targetAmount
            ),
            "source", "ai_analysis",
            "confidence_score", 85
        );
    }
    
    public Map<String, Object> getMarketAnalysis() {
        Map<String, Object> marketData = EconomicParameters.getMarketData();
        
        List<Map<String, Object>> assetsAnalysis = new ArrayList<>();
        Map<String, Double> returns = (Map<String, Double>) marketData.get("assetReturns");
        Map<String, Double> inflation = (Map<String, Double>) marketData.get("inflation");
        double annualInflation = inflation.get("annual");
        
        Map<String, String> assetNames = Map.of(
            "tl_savings", "TL Birikim",
            "gold", "Altın",
            "usd", "Dolar",
            "eur", "Euro"
        );
        
        int beatsInflation = 0;
        String bestPerformer = null;
        double bestReturn = Double.MIN_VALUE;
        
        for (Map.Entry<String, Double> entry : returns.entrySet()) {
            double realReturn = entry.getValue() - annualInflation;
            boolean beats = entry.getValue() > annualInflation;
            if (beats) beatsInflation++;
            if (entry.getValue() > bestReturn) {
                bestReturn = entry.getValue();
                bestPerformer = entry.getKey();
            }
            
            assetsAnalysis.add(Map.of(
                "asset", entry.getKey(),
                "name", assetNames.get(entry.getKey()),
                "expected_return", entry.getValue(),
                "real_return", realReturn,
                "beats_inflation", beats
            ));
        }
        
        return Map.of(
            "market_data", marketData,
            "assets_analysis", assetsAnalysis,
            "summary", Map.of(
                "inflation_rate", annualInflation,
                "best_performer", bestPerformer,
                "assets_beating_inflation", beatsInflation
            )
        );
    }
    
    private String getRiskLevel(String asset) {
        return switch (asset) {
            case "tl_savings" -> "low";
            case "gold" -> "medium";
            case "usd", "eur" -> "medium-high";
            default -> "medium";
        };
    }
    
    private double calculateWeightedReturn(Map<String, Double> allocation) {
        double totalReturn = 0;
        Map<String, Double> returns = Map.of(
            "tl_savings", EconomicParameters.DEPOSIT_RATE,
            "gold", EconomicParameters.GOLD_RETURN,
            "usd", EconomicParameters.USD_RETURN,
            "eur", EconomicParameters.EUR_RETURN
        );
        
        for (Map.Entry<String, Double> entry : allocation.entrySet()) {
            totalReturn += (entry.getValue() / 100) * returns.getOrDefault(entry.getKey(), 0.0);
        }
        
        return totalReturn;
    }
}
