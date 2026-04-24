package com.garantibbva.mobile.dto.request;

import java.math.BigDecimal;
import java.util.Map;

public class CreateSavingsInvestmentRequest {
    private String productName;
    private BigDecimal targetAmount;
    private BigDecimal monthlyContribution;
    private int durationMonths;
    private String riskProfile = "medium";
    private String strategy;
    private Map<String, Integer> customAllocation;
    private BigDecimal existingSavings = BigDecimal.ZERO;
    private boolean autoInvest = true;
    private boolean useAiAllocation = true;
    
    // Getters and Setters
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
    public Map<String, Integer> getCustomAllocation() { return customAllocation; }
    public void setCustomAllocation(Map<String, Integer> customAllocation) { this.customAllocation = customAllocation; }
    public BigDecimal getExistingSavings() { return existingSavings; }
    public void setExistingSavings(BigDecimal existingSavings) { this.existingSavings = existingSavings; }
    public boolean isAutoInvest() { return autoInvest; }
    public void setAutoInvest(boolean autoInvest) { this.autoInvest = autoInvest; }
    public boolean isUseAiAllocation() { return useAiAllocation; }
    public void setUseAiAllocation(boolean useAiAllocation) { this.useAiAllocation = useAiAllocation; }
}