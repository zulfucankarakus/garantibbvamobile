package com.garantibbva.mobile.entity;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Document(collection = "savings_investment_plans")
public class SavingsInvestmentPlan {
    
    @Id
    private String id;
    
    @Indexed
    private String userId;
    
    private String productName;
    private BigDecimal targetAmount;
    private BigDecimal monthlyContribution;
    private int durationMonths;
    private String riskProfile; // low, medium, high
    private String strategy; // ai_recommended, balanced, gold_heavy, etc.
    
    // Allocation percentages
    private Map<String, Integer> allocation = new HashMap<>();
    
    // Current values
    private BigDecimal currentAmount = BigDecimal.ZERO;
    private BigDecimal existingSavings = BigDecimal.ZERO;
    
    // Asset distribution and holdings
    private Map<String, BigDecimal> assetDistribution = new HashMap<>();
    private Map<String, AssetHolding> holdings = new HashMap<>();
    
    // Transactions and contributions
    private List<Contribution> contributions = new ArrayList<>();
    private List<AssetTransaction> transactions = new ArrayList<>();
    
    // Progress tracking
    private double lastProgressPercent = 0;
    private String status = "active";
    
    // AI Recommendation
    private AIRecommendation aiRecommendation;
    
    @CreatedDate
    private LocalDateTime createdAt;
    private LocalDateTime startDate;
    private LocalDateTime targetDate;
    private LocalDateTime updatedAt;
    
    // Nested classes
    public static class AssetHolding {
        private double units;
        private BigDecimal totalCost;
        private BigDecimal avgPrice;
        
        public double getUnits() { return units; }
        public void setUnits(double units) { this.units = units; }
        public BigDecimal getTotalCost() { return totalCost; }
        public void setTotalCost(BigDecimal totalCost) { this.totalCost = totalCost; }
        public BigDecimal getAvgPrice() { return avgPrice; }
        public void setAvgPrice(BigDecimal avgPrice) { this.avgPrice = avgPrice; }
    }
    
    public static class Contribution {
        private String id;
        private BigDecimal amount;
        private String note;
        private LocalDateTime date;
        private Map<String, BigDecimal> distribution;
        
        public String getId() { return id; }
        public void setId(String id) { this.id = id; }
        public BigDecimal getAmount() { return amount; }
        public void setAmount(BigDecimal amount) { this.amount = amount; }
        public String getNote() { return note; }
        public void setNote(String note) { this.note = note; }
        public LocalDateTime getDate() { return date; }
        public void setDate(LocalDateTime date) { this.date = date; }
        public Map<String, BigDecimal> getDistribution() { return distribution; }
        public void setDistribution(Map<String, BigDecimal> distribution) { this.distribution = distribution; }
    }
    
    public static class AssetTransaction {
        private String id;
        private String assetType;
        private String type; // buy, sell
        private BigDecimal amountTl;
        private double units;
        private BigDecimal price;
        private LocalDateTime date;
        
        public String getId() { return id; }
        public void setId(String id) { this.id = id; }
        public String getAssetType() { return assetType; }
        public void setAssetType(String assetType) { this.assetType = assetType; }
        public String getType() { return type; }
        public void setType(String type) { this.type = type; }
        public BigDecimal getAmountTl() { return amountTl; }
        public void setAmountTl(BigDecimal amountTl) { this.amountTl = amountTl; }
        public double getUnits() { return units; }
        public void setUnits(double units) { this.units = units; }
        public BigDecimal getPrice() { return price; }
        public void setPrice(BigDecimal price) { this.price = price; }
        public LocalDateTime getDate() { return date; }
        public void setDate(LocalDateTime date) { this.date = date; }
    }
    
    public static class AIRecommendation {
        private String reasoning;
        private List<String> insights;
        private String source;
        private int confidenceScore;
        
        public String getReasoning() { return reasoning; }
        public void setReasoning(String reasoning) { this.reasoning = reasoning; }
        public List<String> getInsights() { return insights; }
        public void setInsights(List<String> insights) { this.insights = insights; }
        public String getSource() { return source; }
        public void setSource(String source) { this.source = source; }
        public int getConfidenceScore() { return confidenceScore; }
        public void setConfidenceScore(int confidenceScore) { this.confidenceScore = confidenceScore; }
    }
    
    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }
    public BigDecimal getTargetAmount() { return targetAmount; }
    public void setTargetAmount(BigDecimal targetAmount) { this.targetAmount = targetAmount; }
    public BigDecimal getMonthlyContribution() { return monthlyContribution; }
    public void setMonthlyContribution(BigDecimal monthlyContribution) { this.monthlyContribution = monthlyContribution; }
    public int getDurationMonths() { return durationMonths; }
    public void setDurationMonths(int durationMonths) { this.durationMonths = durationMonths; }
    public String getRiskProfile() { return riskProfile; }
    public void setRiskProfile(String riskProfile) { this.riskProfile = riskProfile; }
    public String getStrategy() { return strategy; }
    public void setStrategy(String strategy) { this.strategy = strategy; }
    public Map<String, Integer> getAllocation() { return allocation; }
    public void setAllocation(Map<String, Integer> allocation) { this.allocation = allocation; }
    public BigDecimal getCurrentAmount() { return currentAmount; }
    public void setCurrentAmount(BigDecimal currentAmount) { this.currentAmount = currentAmount; }
    public BigDecimal getExistingSavings() { return existingSavings; }
    public void setExistingSavings(BigDecimal existingSavings) { this.existingSavings = existingSavings; }
    public Map<String, BigDecimal> getAssetDistribution() { return assetDistribution; }
    public void setAssetDistribution(Map<String, BigDecimal> assetDistribution) { this.assetDistribution = assetDistribution; }
    public Map<String, AssetHolding> getHoldings() { return holdings; }
    public void setHoldings(Map<String, AssetHolding> holdings) { this.holdings = holdings; }
    public List<Contribution> getContributions() { return contributions; }
    public void setContributions(List<Contribution> contributions) { this.contributions = contributions; }
    public List<AssetTransaction> getTransactions() { return transactions; }
    public void setTransactions(List<AssetTransaction> transactions) { this.transactions = transactions; }
    public double getLastProgressPercent() { return lastProgressPercent; }
    public void setLastProgressPercent(double lastProgressPercent) { this.lastProgressPercent = lastProgressPercent; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public AIRecommendation getAiRecommendation() { return aiRecommendation; }
    public void setAiRecommendation(AIRecommendation aiRecommendation) { this.aiRecommendation = aiRecommendation; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getStartDate() { return startDate; }
    public void setStartDate(LocalDateTime startDate) { this.startDate = startDate; }
    public LocalDateTime getTargetDate() { return targetDate; }
    public void setTargetDate(LocalDateTime targetDate) { this.targetDate = targetDate; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}