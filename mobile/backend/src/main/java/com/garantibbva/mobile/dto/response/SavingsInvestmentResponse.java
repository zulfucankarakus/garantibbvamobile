package com.garantibbva.mobile.dto.response;

import com.garantibbva.mobile.entity.SavingsInvestmentPlan;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public class SavingsInvestmentResponse {
    private boolean success;
    private SavingsInvestmentPlan plan;
    private InvestmentSummary investmentSummary;
    private Progress progress;
    private CreditRecommendation creditRecommendation;
    private MilestoneCheck milestoneCheck;
    private AIRecommendationInfo aiRecommendation;
    
    // Nested classes
    public static class InvestmentSummary {
        private List<AssetSummary> assets;
        private BigDecimal totalInvested;
        private BigDecimal totalCurrentValue;
        private BigDecimal totalProfit;
        private double profitPercentage;
        
        public List<AssetSummary> getAssets() { return assets; }
        public void setAssets(List<AssetSummary> assets) { this.assets = assets; }
        public BigDecimal getTotalInvested() { return totalInvested; }
        public void setTotalInvested(BigDecimal totalInvested) { this.totalInvested = totalInvested; }
        public BigDecimal getTotalCurrentValue() { return totalCurrentValue; }
        public void setTotalCurrentValue(BigDecimal totalCurrentValue) { this.totalCurrentValue = totalCurrentValue; }
        public BigDecimal getTotalProfit() { return totalProfit; }
        public void setTotalProfit(BigDecimal totalProfit) { this.totalProfit = totalProfit; }
        public double getProfitPercentage() { return profitPercentage; }
        public void setProfitPercentage(double profitPercentage) { this.profitPercentage = profitPercentage; }
    }
    
    public static class AssetSummary {
        private String asset;
        private String label;
        private String emoji;
        private String color;
        private BigDecimal invested;
        private BigDecimal currentValue;
        private BigDecimal profit;
        private double profitPercent;
        private int allocationPercent;
        
        // Getters and setters
        public String getAsset() { return asset; }
        public void setAsset(String asset) { this.asset = asset; }
        public String getLabel() { return label; }
        public void setLabel(String label) { this.label = label; }
        public String getEmoji() { return emoji; }
        public void setEmoji(String emoji) { this.emoji = emoji; }
        public String getColor() { return color; }
        public void setColor(String color) { this.color = color; }
        public BigDecimal getInvested() { return invested; }
        public void setInvested(BigDecimal invested) { this.invested = invested; }
        public BigDecimal getCurrentValue() { return currentValue; }
        public void setCurrentValue(BigDecimal currentValue) { this.currentValue = currentValue; }
        public BigDecimal getProfit() { return profit; }
        public void setProfit(BigDecimal profit) { this.profit = profit; }
        public double getProfitPercent() { return profitPercent; }
        public void setProfitPercent(double profitPercent) { this.profitPercent = profitPercent; }
        public int getAllocationPercent() { return allocationPercent; }
        public void setAllocationPercent(int allocationPercent) { this.allocationPercent = allocationPercent; }
    }
    
    public static class Progress {
        private double progressPercentage;
        private BigDecimal totalValue;
        private BigDecimal remainingAmount;
        private int remainingMonths;
        private BigDecimal requiredMonthlySavings;
        private boolean onTrack;
        private BigDecimal futureTargetWithInflation;
        
        public double getProgressPercentage() { return progressPercentage; }
        public void setProgressPercentage(double progressPercentage) { this.progressPercentage = progressPercentage; }
        public BigDecimal getTotalValue() { return totalValue; }
        public void setTotalValue(BigDecimal totalValue) { this.totalValue = totalValue; }
        public BigDecimal getRemainingAmount() { return remainingAmount; }
        public void setRemainingAmount(BigDecimal remainingAmount) { this.remainingAmount = remainingAmount; }
        public int getRemainingMonths() { return remainingMonths; }
        public void setRemainingMonths(int remainingMonths) { this.remainingMonths = remainingMonths; }
        public BigDecimal getRequiredMonthlySavings() { return requiredMonthlySavings; }
        public void setRequiredMonthlySavings(BigDecimal requiredMonthlySavings) { this.requiredMonthlySavings = requiredMonthlySavings; }
        public boolean isOnTrack() { return onTrack; }
        public void setOnTrack(boolean onTrack) { this.onTrack = onTrack; }
        public BigDecimal getFutureTargetWithInflation() { return futureTargetWithInflation; }
        public void setFutureTargetWithInflation(BigDecimal futureTargetWithInflation) { this.futureTargetWithInflation = futureTargetWithInflation; }
    }
    
    public static class CreditRecommendation {
        private BigDecimal shortage;
        private boolean creditRecommended;
        private List<CreditOption> options;
        private CreditOption bestOption;
        private double annualRate;
        private String summary;
        
        public BigDecimal getShortage() { return shortage; }
        public void setShortage(BigDecimal shortage) { this.shortage = shortage; }
        public boolean isCreditRecommended() { return creditRecommended; }
        public void setCreditRecommended(boolean creditRecommended) { this.creditRecommended = creditRecommended; }
        public List<CreditOption> getOptions() { return options; }
        public void setOptions(List<CreditOption> options) { this.options = options; }
        public CreditOption getBestOption() { return bestOption; }
        public void setBestOption(CreditOption bestOption) { this.bestOption = bestOption; }
        public double getAnnualRate() { return annualRate; }
        public void setAnnualRate(double annualRate) { this.annualRate = annualRate; }
        public String getSummary() { return summary; }
        public void setSummary(String summary) { this.summary = summary; }
    }
    
    public static class CreditOption {
        private int durationMonths;
        private BigDecimal monthlyPayment;
        private BigDecimal totalPayment;
        private BigDecimal totalInterest;
        private double interestRate;
        private boolean affordable;
        private String affordableLevel;
        private double incomeToDebtRatio;
        
        public int getDurationMonths() { return durationMonths; }
        public void setDurationMonths(int durationMonths) { this.durationMonths = durationMonths; }
        public BigDecimal getMonthlyPayment() { return monthlyPayment; }
        public void setMonthlyPayment(BigDecimal monthlyPayment) { this.monthlyPayment = monthlyPayment; }
        public BigDecimal getTotalPayment() { return totalPayment; }
        public void setTotalPayment(BigDecimal totalPayment) { this.totalPayment = totalPayment; }
        public BigDecimal getTotalInterest() { return totalInterest; }
        public void setTotalInterest(BigDecimal totalInterest) { this.totalInterest = totalInterest; }
        public double getInterestRate() { return interestRate; }
        public void setInterestRate(double interestRate) { this.interestRate = interestRate; }
        public boolean isAffordable() { return affordable; }
        public void setAffordable(boolean affordable) { this.affordable = affordable; }
        public String getAffordableLevel() { return affordableLevel; }
        public void setAffordableLevel(String affordableLevel) { this.affordableLevel = affordableLevel; }
        public double getIncomeToDebtRatio() { return incomeToDebtRatio; }
        public void setIncomeToDebtRatio(double incomeToDebtRatio) { this.incomeToDebtRatio = incomeToDebtRatio; }
    }
    
    public static class MilestoneCheck {
        private boolean milestoneChanged;
        private MilestoneNotification notification;
        private double previousProgress;
        private double currentProgress;
        
        public boolean isMilestoneChanged() { return milestoneChanged; }
        public void setMilestoneChanged(boolean milestoneChanged) { this.milestoneChanged = milestoneChanged; }
        public MilestoneNotification getNotification() { return notification; }
        public void setNotification(MilestoneNotification notification) { this.notification = notification; }
        public double getPreviousProgress() { return previousProgress; }
        public void setPreviousProgress(double previousProgress) { this.previousProgress = previousProgress; }
        public double getCurrentProgress() { return currentProgress; }
        public void setCurrentProgress(double currentProgress) { this.currentProgress = currentProgress; }
    }
    
    public static class MilestoneNotification {
        private String title;
        private String body;
        private Map<String, Object> data;
        private String priority;
        private String category;
        
        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }
        public String getBody() { return body; }
        public void setBody(String body) { this.body = body; }
        public Map<String, Object> getData() { return data; }
        public void setData(Map<String, Object> data) { this.data = data; }
        public String getPriority() { return priority; }
        public void setPriority(String priority) { this.priority = priority; }
        public String getCategory() { return category; }
        public void setCategory(String category) { this.category = category; }
    }
    
    public static class AIRecommendationInfo {
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
    
    // Main getters and setters
    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }
    public SavingsInvestmentPlan getPlan() { return plan; }
    public void setPlan(SavingsInvestmentPlan plan) { this.plan = plan; }
    public InvestmentSummary getInvestmentSummary() { return investmentSummary; }
    public void setInvestmentSummary(InvestmentSummary investmentSummary) { this.investmentSummary = investmentSummary; }
    public Progress getProgress() { return progress; }
    public void setProgress(Progress progress) { this.progress = progress; }
    public CreditRecommendation getCreditRecommendation() { return creditRecommendation; }
    public void setCreditRecommendation(CreditRecommendation creditRecommendation) { this.creditRecommendation = creditRecommendation; }
    public MilestoneCheck getMilestoneCheck() { return milestoneCheck; }
    public void setMilestoneCheck(MilestoneCheck milestoneCheck) { this.milestoneCheck = milestoneCheck; }
    public AIRecommendationInfo getAiRecommendation() { return aiRecommendation; }
    public void setAiRecommendation(AIRecommendationInfo aiRecommendation) { this.aiRecommendation = aiRecommendation; }
}