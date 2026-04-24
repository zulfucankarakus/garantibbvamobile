package com.garantibbva.akillibirikim.util;

import java.util.*;

public class EconomicParameters {
    
    // Güncel ekonomik parametreler (gerçek zamanlı API'den alınabilir)
    public static final double ANNUAL_INFLATION = 50.0;
    public static final double MONTHLY_INFLATION = 3.8;
    public static final double CREDIT_INTEREST_RATE = 48.0;
    public static final double DEPOSIT_RATE = 45.0;
    public static final double GOLD_RETURN = 55.0;
    public static final double USD_RETURN = 35.0;
    public static final double EUR_RETURN = 30.0;
    
    public static Map<String, Object> getMarketData() {
        Map<String, Object> data = new HashMap<>();
        data.put("inflation", Map.of(
            "annual", ANNUAL_INFLATION,
            "monthly", MONTHLY_INFLATION
        ));
        data.put("assetReturns", Map.of(
            "tl_savings", DEPOSIT_RATE,
            "gold", GOLD_RETURN,
            "usd", USD_RETURN,
            "eur", EUR_RETURN
        ));
        data.put("creditRate", CREDIT_INTEREST_RATE);
        return data;
    }
    
    public static Map<String, Double> getRiskBasedAllocation(String riskProfile) {
        Map<String, Double> allocation = new HashMap<>();
        
        switch (riskProfile.toLowerCase()) {
            case "low":
                allocation.put("tl_savings", 40.0);
                allocation.put("gold", 30.0);
                allocation.put("usd", 20.0);
                allocation.put("eur", 10.0);
                break;
            case "high":
                allocation.put("tl_savings", 10.0);
                allocation.put("gold", 40.0);
                allocation.put("usd", 35.0);
                allocation.put("eur", 15.0);
                break;
            default: // medium
                allocation.put("tl_savings", 25.0);
                allocation.put("gold", 35.0);
                allocation.put("usd", 25.0);
                allocation.put("eur", 15.0);
                break;
        }
        
        return allocation;
    }
    
    public static Map<String, Double> getAiRecommendedAllocation(String riskProfile) {
        // AI tabanlı dinamik dağılım - enflasyonu yenen varlıklara ağırlık verir
        Map<String, Double> allocation = new HashMap<>();
        
        // Altın enflasyonu geçtiği için ağırlık artırılıyor
        if (GOLD_RETURN > ANNUAL_INFLATION) {
            allocation.put("tl_savings", 10.0);
            allocation.put("gold", 45.0);
            allocation.put("usd", 30.0);
            allocation.put("eur", 15.0);
        } else {
            allocation = getRiskBasedAllocation(riskProfile);
        }
        
        return allocation;
    }
    
    public static List<Map<String, Object>> getMilestones() {
        List<Map<String, Object>> milestones = new ArrayList<>();
        
        milestones.add(Map.of(
            "id", "early_bird",
            "name", "Erken Kuş",
            "emoji", "🐣",
            "minProgress", 30,
            "maxProgress", 44
        ));
        
        milestones.add(Map.of(
            "id", "half_way",
            "name", "Yarı Yol",
            "emoji", "⚖️",
            "minProgress", 45,
            "maxProgress", 59
        ));
        
        milestones.add(Map.of(
            "id", "golden_point",
            "name", "Altın Nokta",
            "emoji", "🌟",
            "minProgress", 60,
            "maxProgress", 74
        ));
        
        milestones.add(Map.of(
            "id", "near_target",
            "name", "Hedefe Yakın",
            "emoji", "🎯",
            "minProgress", 75,
            "maxProgress", 84
        ));
        
        milestones.add(Map.of(
            "id", "final_stretch",
            "name", "Son Düzlük",
            "emoji", "🏃",
            "minProgress", 85,
            "maxProgress", 94
        ));
        
        milestones.add(Map.of(
            "id", "almost_done",
            "name", "Neredeyse Tamam",
            "emoji", "🏆",
            "minProgress", 95,
            "maxProgress", 100
        ));
        
        return milestones;
    }
    
    public static Map<String, Object> getMilestoneForProgress(double progress) {
        for (Map<String, Object> milestone : getMilestones()) {
            int min = (int) milestone.get("minProgress");
            int max = (int) milestone.get("maxProgress");
            if (progress >= min && progress <= max) {
                return milestone;
            }
        }
        return null;
    }
}
