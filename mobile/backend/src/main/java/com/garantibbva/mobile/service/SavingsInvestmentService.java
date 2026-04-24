package com.garantibbva.mobile.service;

import com.garantibbva.mobile.dto.request.ContributeRequest;
import com.garantibbva.mobile.dto.request.CreateSavingsInvestmentRequest;
import com.garantibbva.mobile.dto.response.SavingsInvestmentResponse;
import com.garantibbva.mobile.dto.response.SavingsInvestmentResponse.*;
import com.garantibbva.mobile.entity.Notification;
import com.garantibbva.mobile.entity.SavingsInvestmentPlan;
import com.garantibbva.mobile.entity.SavingsInvestmentPlan.*;
import com.garantibbva.mobile.repository.NotificationRepository;
import com.garantibbva.mobile.repository.SavingsInvestmentPlanRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
public class SavingsInvestmentService {
    
    @Autowired
    private SavingsInvestmentPlanRepository planRepository;
    
    @Autowired
    private NotificationRepository notificationRepository;
    
    // Milestone thresholds
    private static final Map<String, int[]> MILESTONES = new LinkedHashMap<>();
    private static final Map<String, String> MILESTONE_EMOJIS = new HashMap<>();
    private static final Map<String, String> MILESTONE_TITLES = new HashMap<>();
    
    // Market data (simulated - can be replaced with real API)
    private static final double ANNUAL_INFLATION = 50.0;
    private static final double TL_DEPOSIT_RATE = 45.0;
    private static final double GOLD_RETURN = 55.0;
    private static final double USD_RETURN = 35.0;
    private static final double EUR_RETURN = 30.0;
    private static final double CREDIT_INTEREST_RATE = 48.0;
    
    static {
        MILESTONES.put("early_bird", new int[]{30, 44});
        MILESTONES.put("half_way", new int[]{45, 59});
        MILESTONES.put("golden_point", new int[]{60, 74});
        MILESTONES.put("near_target", new int[]{75, 84});
        MILESTONES.put("final_stretch", new int[]{85, 94});
        MILESTONES.put("almost_done", new int[]{95, 100});
        
        MILESTONE_EMOJIS.put("early_bird", "🐣");
        MILESTONE_EMOJIS.put("half_way", "⚖️");
        MILESTONE_EMOJIS.put("golden_point", "🌟");
        MILESTONE_EMOJIS.put("near_target", "🎯");
        MILESTONE_EMOJIS.put("final_stretch", "🏃");
        MILESTONE_EMOJIS.put("almost_done", "🏆");
        
        MILESTONE_TITLES.put("early_bird", "Erken Kuş Fırsatı");
        MILESTONE_TITLES.put("half_way", "Yarı Yoldasınız");
        MILESTONE_TITLES.put("golden_point", "Altın Nokta");
        MILESTONE_TITLES.put("near_target", "Hedefe Yakınsınız");
        MILESTONE_TITLES.put("final_stretch", "Son Düzlük");
        MILESTONE_TITLES.put("almost_done", "Neredeyse Tamamlandı");
    }
    
    public SavingsInvestmentPlan createPlan(String userId, CreateSavingsInvestmentRequest request) {
        SavingsInvestmentPlan plan = new SavingsInvestmentPlan();
        plan.setUserId(userId);
        plan.setProductName(request.getProductName());
        plan.setTargetAmount(request.getTargetAmount());
        plan.setMonthlyContribution(request.getMonthlyContribution());
        plan.setDurationMonths(request.getDurationMonths());
        plan.setRiskProfile(request.getRiskProfile() != null ? request.getRiskProfile() : "medium");
        plan.setExistingSavings(request.getExistingSavings() != null ? request.getExistingSavings() : BigDecimal.ZERO);
        plan.setCurrentAmount(plan.getExistingSavings());
        
        // Get AI allocation if requested
        Map<String, Integer> allocation;
        AIRecommendation aiRec = null;
        
        if (request.isUseAiAllocation() && request.getCustomAllocation() == null) {
            allocation = calculateAIAllocation(request.getRiskProfile());
            aiRec = new AIRecommendation();
            aiRec.setReasoning(generateAllocationReasoning(allocation));
            aiRec.setInsights(generateMarketInsights());
            aiRec.setSource("rule_based");
            aiRec.setConfidenceScore(75);
            plan.setStrategy("ai_recommended");
        } else if (request.getCustomAllocation() != null) {
            allocation = request.getCustomAllocation();
            plan.setStrategy("custom");
        } else {
            allocation = getBalancedAllocation();
            plan.setStrategy("balanced");
        }
        
        plan.setAllocation(allocation);
        plan.setAiRecommendation(aiRec);
        
        // Initialize asset distribution
        Map<String, BigDecimal> assetDist = new HashMap<>();
        BigDecimal existing = plan.getExistingSavings();
        for (Map.Entry<String, Integer> entry : allocation.entrySet()) {
            BigDecimal amount = existing.multiply(BigDecimal.valueOf(entry.getValue()))
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            assetDist.put(entry.getKey(), amount);
        }
        plan.setAssetDistribution(assetDist);
        
        // Set dates
        plan.setStartDate(LocalDateTime.now());
        plan.setTargetDate(LocalDateTime.now().plusMonths(request.getDurationMonths()));
        plan.setCreatedAt(LocalDateTime.now());
        plan.setUpdatedAt(LocalDateTime.now());
        plan.setStatus("active");
        
        // Calculate initial progress
        double progress = calculateProgress(plan);
        plan.setLastProgressPercent(progress);
        
        return planRepository.save(plan);
    }
    
    public List<SavingsInvestmentPlan> getPlans(String userId) {
        List<SavingsInvestmentPlan> plans = planRepository.findByUserIdOrderByCreatedAtDesc(userId);
        
        // Enrich each plan with calculated values
        for (SavingsInvestmentPlan plan : plans) {
            BigDecimal totalValue = calculateTotalValue(plan);
            double progress = calculateProgressFromValue(plan, totalValue);
            plan.setLastProgressPercent(progress);
        }
        
        return plans;
    }
    
    public SavingsInvestmentResponse getPlanDetail(String userId, String planId) {
        Optional<SavingsInvestmentPlan> optPlan = planRepository.findByIdAndUserId(planId, userId);
        
        if (optPlan.isEmpty()) {
            return null;
        }
        
        SavingsInvestmentPlan plan = optPlan.get();
        SavingsInvestmentResponse response = new SavingsInvestmentResponse();
        response.setSuccess(true);
        response.setPlan(plan);
        
        // Calculate investment summary
        InvestmentSummary summary = calculateInvestmentSummary(plan);
        response.setInvestmentSummary(summary);
        
        // Calculate progress
        Progress progress = calculateProgressDetail(plan, summary.getTotalCurrentValue());
        response.setProgress(progress);
        
        // Check for milestone notification
        double previousProgress = plan.getLastProgressPercent();
        double currentProgress = progress.getProgressPercentage();
        
        MilestoneCheck milestoneCheck = checkMilestone(plan, previousProgress, currentProgress);
        if (milestoneCheck != null && milestoneCheck.isMilestoneChanged()) {
            response.setMilestoneCheck(milestoneCheck);
            
            // Save notification
            saveNotification(userId, milestoneCheck.getNotification());
            
            // Update plan progress
            plan.setLastProgressPercent(currentProgress);
            planRepository.save(plan);
        }
        
        // Calculate credit recommendation if progress >= 30%
        if (currentProgress >= 30) {
            CreditRecommendation creditRec = calculateCreditRecommendation(plan, summary.getTotalCurrentValue());
            response.setCreditRecommendation(creditRec);
        }
        
        return response;
    }
    
    public SavingsInvestmentResponse contribute(String userId, String planId, ContributeRequest request) {
        Optional<SavingsInvestmentPlan> optPlan = planRepository.findByIdAndUserId(planId, userId);
        
        if (optPlan.isEmpty()) {
            return null;
        }
        
        SavingsInvestmentPlan plan = optPlan.get();
        double previousProgress = plan.getLastProgressPercent();
        
        // Add contribution
        BigDecimal amount = request.getAmount();
        BigDecimal newTotal = plan.getCurrentAmount().add(amount);
        plan.setCurrentAmount(newTotal);
        
        // Distribute to assets
        Map<String, BigDecimal> distribution = new HashMap<>();
        for (Map.Entry<String, Integer> entry : plan.getAllocation().entrySet()) {
            BigDecimal assetAmount = amount.multiply(BigDecimal.valueOf(entry.getValue()))
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            distribution.put(entry.getKey(), assetAmount);
            
            BigDecimal currentAsset = plan.getAssetDistribution().getOrDefault(entry.getKey(), BigDecimal.ZERO);
            plan.getAssetDistribution().put(entry.getKey(), currentAsset.add(assetAmount));
        }
        
        // Record contribution
        Contribution contrib = new Contribution();
        contrib.setId(UUID.randomUUID().toString());
        contrib.setAmount(amount);
        contrib.setNote(request.getNote());
        contrib.setDate(LocalDateTime.now());
        contrib.setDistribution(distribution);
        plan.getContributions().add(contrib);
        
        plan.setUpdatedAt(LocalDateTime.now());
        
        // Calculate new progress
        BigDecimal totalValue = calculateTotalValue(plan);
        double currentProgress = calculateProgressFromValue(plan, totalValue);
        
        // Check milestone
        MilestoneCheck milestoneCheck = checkMilestone(plan, previousProgress, currentProgress);
        if (milestoneCheck != null && milestoneCheck.isMilestoneChanged()) {
            // Save notification
            saveNotification(userId, milestoneCheck.getNotification());
        }
        
        plan.setLastProgressPercent(currentProgress);
        planRepository.save(plan);
        
        // Create contribution notification
        Notification notif = new Notification();
        notif.setUserId(userId);
        notif.setTitle("💰 Birikim Eklendi");
        notif.setMessage(String.format("%,.0f TL eklendi ve yatırım araçlarına dağıtıldı.", amount.doubleValue()));
        notif.setNotificationType("success");
        notif.setRead(false);
        notif.setCreatedAt(LocalDateTime.now());
        notificationRepository.save(notif);
        
        // Build response
        SavingsInvestmentResponse response = new SavingsInvestmentResponse();
        response.setSuccess(true);
        response.setPlan(plan);
        response.setMilestoneCheck(milestoneCheck);
        
        return response;
    }
    
    public boolean deletePlan(String userId, String planId) {
        Optional<SavingsInvestmentPlan> optPlan = planRepository.findByIdAndUserId(planId, userId);
        
        if (optPlan.isEmpty()) {
            return false;
        }
        
        SavingsInvestmentPlan plan = optPlan.get();
        planRepository.delete(plan);
        
        // Create notification
        Notification notif = new Notification();
        notif.setUserId(userId);
        notif.setTitle("🗑️ Birikim Planı Silindi");
        notif.setMessage(plan.getProductName() + " başarıyla silindi.");
        notif.setNotificationType("info");
        notif.setRead(false);
        notif.setCreatedAt(LocalDateTime.now());
        notificationRepository.save(notif);
        
        return true;
    }
    
    // Helper methods
    private Map<String, Integer> calculateAIAllocation(String riskProfile) {
        Map<String, Integer> allocation = new HashMap<>();
        
        // AI-based allocation considering market conditions
        // High inflation -> favor gold
        // Risk profile affects base allocation
        
        if ("low".equals(riskProfile)) {
            allocation.put("tl_savings", 15);
            allocation.put("gold", 50);
            allocation.put("usd", 25);
            allocation.put("eur", 10);
        } else if ("high".equals(riskProfile)) {
            allocation.put("tl_savings", 5);
            allocation.put("gold", 30);
            allocation.put("usd", 40);
            allocation.put("eur", 25);
        } else { // medium
            allocation.put("tl_savings", 10);
            allocation.put("gold", 45);
            allocation.put("usd", 30);
            allocation.put("eur", 15);
        }
        
        return allocation;
    }
    
    private Map<String, Integer> getBalancedAllocation() {
        Map<String, Integer> allocation = new HashMap<>();
        allocation.put("tl_savings", 25);
        allocation.put("gold", 25);
        allocation.put("usd", 25);
        allocation.put("eur", 25);
        return allocation;
    }
    
    private String generateAllocationReasoning(Map<String, Integer> allocation) {
        int goldPct = allocation.getOrDefault("gold", 0);
        if (goldPct >= 40) {
            return "Altın ağırlıklı (%" + goldPct + ") bir portföy öneriyoruz. Yüksek enflasyon ortamında (%" + ANNUAL_INFLATION + ") altın güvenli liman olarak öne çıkıyor.";
        }
        return "Dengeli bir portföy öneriyoruz. Risk profilinize uygun çeşitlendirilmiş yatırım dağılımı oluşturuldu.";
    }
    
    private List<String> generateMarketInsights() {
        List<String> insights = new ArrayList<>();
        
        if (TL_DEPOSIT_RATE < ANNUAL_INFLATION) {
            insights.add("⚠️ TL mevduat faizi (%" + TL_DEPOSIT_RATE + ") enflasyonun (%" + ANNUAL_INFLATION + ") altında");
        }
        if (GOLD_RETURN > ANNUAL_INFLATION) {
            insights.add("🥇 Altın (%" + GOLD_RETURN + ") enflasyonu yeniyor");
        }
        if (ANNUAL_INFLATION > 40) {
            insights.add("💡 Yüksek enflasyon döneminde döviz ve altın koruması önemli");
        }
        
        return insights;
    }
    
    private double calculateProgress(SavingsInvestmentPlan plan) {
        BigDecimal totalValue = calculateTotalValue(plan);
        return calculateProgressFromValue(plan, totalValue);
    }
    
    private double calculateProgressFromValue(SavingsInvestmentPlan plan, BigDecimal totalValue) {
        if (plan.getTargetAmount().compareTo(BigDecimal.ZERO) == 0) {
            return 0;
        }
        double progress = totalValue.divide(plan.getTargetAmount(), 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100)).doubleValue();
        return Math.min(100, progress);
    }
    
    private BigDecimal calculateTotalValue(SavingsInvestmentPlan plan) {
        // Simplified: sum of asset distribution with simulated returns
        BigDecimal total = BigDecimal.ZERO;
        
        for (Map.Entry<String, BigDecimal> entry : plan.getAssetDistribution().entrySet()) {
            String asset = entry.getKey();
            BigDecimal amount = entry.getValue();
            
            // Apply simulated daily return
            double dailyReturn = getDailyReturn(asset);
            BigDecimal currentValue = amount.multiply(BigDecimal.valueOf(1 + dailyReturn));
            total = total.add(currentValue);
        }
        
        return total;
    }
    
    private double getDailyReturn(String asset) {
        // Daily return based on annual return
        switch (asset) {
            case "tl_savings": return TL_DEPOSIT_RATE / 100 / 365;
            case "gold": return GOLD_RETURN / 100 / 365;
            case "usd": return USD_RETURN / 100 / 365;
            case "eur": return EUR_RETURN / 100 / 365;
            default: return 0;
        }
    }
    
    private InvestmentSummary calculateInvestmentSummary(SavingsInvestmentPlan plan) {
        InvestmentSummary summary = new InvestmentSummary();
        List<AssetSummary> assets = new ArrayList<>();
        
        BigDecimal totalInvested = BigDecimal.ZERO;
        BigDecimal totalCurrentValue = BigDecimal.ZERO;
        
        Map<String, String> labels = Map.of(
            "tl_savings", "TL Birikim",
            "gold", "Altın",
            "usd", "Dolar",
            "eur", "Euro"
        );
        Map<String, String> emojis = Map.of(
            "tl_savings", "💰",
            "gold", "🥇",
            "usd", "💵",
            "eur", "💶"
        );
        Map<String, String> colors = Map.of(
            "tl_savings", "#6366F1",
            "gold", "#F59E0B",
            "usd", "#10B981",
            "eur", "#3B82F6"
        );
        
        for (Map.Entry<String, BigDecimal> entry : plan.getAssetDistribution().entrySet()) {
            String asset = entry.getKey();
            BigDecimal invested = entry.getValue();
            
            double dailyReturn = getDailyReturn(asset);
            BigDecimal currentValue = invested.multiply(BigDecimal.valueOf(1 + dailyReturn));
            BigDecimal profit = currentValue.subtract(invested);
            double profitPercent = invested.compareTo(BigDecimal.ZERO) > 0 
                ? profit.divide(invested, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100)).doubleValue()
                : 0;
            
            AssetSummary assetSummary = new AssetSummary();
            assetSummary.setAsset(asset);
            assetSummary.setLabel(labels.getOrDefault(asset, asset));
            assetSummary.setEmoji(emojis.getOrDefault(asset, "📊"));
            assetSummary.setColor(colors.getOrDefault(asset, "#6B7280"));
            assetSummary.setInvested(invested.setScale(2, RoundingMode.HALF_UP));
            assetSummary.setCurrentValue(currentValue.setScale(2, RoundingMode.HALF_UP));
            assetSummary.setProfit(profit.setScale(2, RoundingMode.HALF_UP));
            assetSummary.setProfitPercent(profitPercent);
            assetSummary.setAllocationPercent(plan.getAllocation().getOrDefault(asset, 0));
            
            assets.add(assetSummary);
            totalInvested = totalInvested.add(invested);
            totalCurrentValue = totalCurrentValue.add(currentValue);
        }
        
        BigDecimal totalProfit = totalCurrentValue.subtract(totalInvested);
        double profitPercentage = totalInvested.compareTo(BigDecimal.ZERO) > 0
            ? totalProfit.divide(totalInvested, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100)).doubleValue()
            : 0;
        
        summary.setAssets(assets);
        summary.setTotalInvested(totalInvested.setScale(2, RoundingMode.HALF_UP));
        summary.setTotalCurrentValue(totalCurrentValue.setScale(2, RoundingMode.HALF_UP));
        summary.setTotalProfit(totalProfit.setScale(2, RoundingMode.HALF_UP));
        summary.setProfitPercentage(profitPercentage);
        
        return summary;
    }
    
    private Progress calculateProgressDetail(SavingsInvestmentPlan plan, BigDecimal totalValue) {
        Progress progress = new Progress();
        
        double progressPct = calculateProgressFromValue(plan, totalValue);
        progress.setProgressPercentage(Math.round(progressPct * 100.0) / 100.0);
        progress.setTotalValue(totalValue.setScale(2, RoundingMode.HALF_UP));
        
        BigDecimal remaining = plan.getTargetAmount().subtract(totalValue);
        progress.setRemainingAmount(remaining.compareTo(BigDecimal.ZERO) > 0 
            ? remaining.setScale(2, RoundingMode.HALF_UP) 
            : BigDecimal.ZERO);
        
        long monthsElapsed = ChronoUnit.MONTHS.between(plan.getStartDate(), LocalDateTime.now());
        int remainingMonths = Math.max(0, plan.getDurationMonths() - (int) monthsElapsed);
        progress.setRemainingMonths(remainingMonths);
        
        BigDecimal requiredMonthly = remainingMonths > 0 
            ? progress.getRemainingAmount().divide(BigDecimal.valueOf(remainingMonths), 2, RoundingMode.HALF_UP)
            : progress.getRemainingAmount();
        progress.setRequiredMonthlySavings(requiredMonthly);
        
        double expectedProgress = plan.getDurationMonths() > 0 
            ? (monthsElapsed * 100.0 / plan.getDurationMonths()) 
            : 0;
        progress.setOnTrack(progressPct >= expectedProgress);
        
        // Future target with inflation
        double monthlyInflation = Math.pow(1 + ANNUAL_INFLATION / 100, 1.0 / 12) - 1;
        BigDecimal futureTarget = plan.getTargetAmount().multiply(
            BigDecimal.valueOf(Math.pow(1 + monthlyInflation, remainingMonths)));
        progress.setFutureTargetWithInflation(futureTarget.setScale(2, RoundingMode.HALF_UP));
        
        return progress;
    }
    
    private String getCurrentMilestone(double progress) {
        for (Map.Entry<String, int[]> entry : MILESTONES.entrySet()) {
            int[] range = entry.getValue();
            if (progress >= range[0] && progress <= range[1]) {
                return entry.getKey();
            }
        }
        return null;
    }
    
    private MilestoneCheck checkMilestone(SavingsInvestmentPlan plan, double previousProgress, double currentProgress) {
        String previousMilestone = getCurrentMilestone(previousProgress);
        String currentMilestone = getCurrentMilestone(currentProgress);
        
        if (currentMilestone == null || currentMilestone.equals(previousMilestone)) {
            return null;
        }
        
        // Check if moving forward
        List<String> milestoneOrder = new ArrayList<>(MILESTONES.keySet());
        int prevIdx = previousMilestone != null ? milestoneOrder.indexOf(previousMilestone) : -1;
        int currIdx = milestoneOrder.indexOf(currentMilestone);
        
        if (currIdx <= prevIdx) {
            return null; // Not moving forward
        }
        
        // Create milestone notification
        MilestoneCheck check = new MilestoneCheck();
        check.setMilestoneChanged(true);
        check.setPreviousProgress(previousProgress);
        check.setCurrentProgress(currentProgress);
        
        MilestoneNotification notification = new MilestoneNotification();
        notification.setTitle(MILESTONE_EMOJIS.get(currentMilestone) + " " + plan.getProductName() + " - Kredi Fırsatı!");
        notification.setBody(MILESTONE_TITLES.get(currentMilestone) + "! Hedefinizin %" + Math.round(currentProgress) + "'ine ulaştınız.");
        notification.setPriority(currentProgress >= 60 ? "high" : "normal");
        notification.setCategory("CREDIT_ADVICE");
        
        Map<String, Object> data = new HashMap<>();
        data.put("type", "milestone_reached");
        data.put("plan_id", plan.getId());
        data.put("progress_percent", currentProgress);
        data.put("milestone", currentMilestone);
        notification.setData(data);
        
        check.setNotification(notification);
        
        return check;
    }
    
    private void saveNotification(String userId, MilestoneNotification milestoneNotif) {
        if (milestoneNotif == null) return;
        
        Notification notif = new Notification();
        notif.setUserId(userId);
        notif.setTitle(milestoneNotif.getTitle());
        notif.setMessage(milestoneNotif.getBody());
        notif.setNotificationType("credit_advice");
        notif.setRead(false);
        notif.setCreatedAt(LocalDateTime.now());
        notificationRepository.save(notif);
    }
    
    private CreditRecommendation calculateCreditRecommendation(SavingsInvestmentPlan plan, BigDecimal currentValue) {
        CreditRecommendation rec = new CreditRecommendation();
        
        BigDecimal shortage = plan.getTargetAmount().subtract(currentValue);
        if (shortage.compareTo(BigDecimal.ZERO) <= 0) {
            rec.setShortage(BigDecimal.ZERO);
            rec.setCreditRecommended(false);
            rec.setSummary("Hedefinize ulaştınız!");
            return rec;
        }
        
        rec.setShortage(shortage.setScale(2, RoundingMode.HALF_UP));
        rec.setAnnualRate(CREDIT_INTEREST_RATE);
        
        // Calculate credit options
        List<CreditOption> options = new ArrayList<>();
        int[] terms = {12, 24, 36, 48, 60};
        BigDecimal estimatedIncome = plan.getMonthlyContribution().multiply(BigDecimal.valueOf(5));
        
        for (int term : terms) {
            CreditOption option = calculateCreditOption(shortage, term, estimatedIncome);
            options.add(option);
        }
        
        rec.setOptions(options);
        
        // Find best option
        CreditOption best = options.stream()
            .filter(CreditOption::isAffordable)
            .min(Comparator.comparing(CreditOption::getTotalPayment))
            .orElse(options.stream()
                .min(Comparator.comparing(CreditOption::getMonthlyPayment))
                .orElse(null));
        
        rec.setBestOption(best);
        rec.setCreditRecommended(best != null && best.isAffordable());
        
        if (best != null && best.isAffordable()) {
            rec.setSummary("Kredi çekmek avantajlı: " + best.getDurationMonths() + " ay vadede aylık " + 
                String.format("%,.0f", best.getMonthlyPayment()) + " TL taksit");
        } else {
            rec.setSummary("Birikime devam etmenizi öneriyoruz.");
        }
        
        return rec;
    }
    
    private CreditOption calculateCreditOption(BigDecimal principal, int months, BigDecimal monthlyIncome) {
        CreditOption option = new CreditOption();
        option.setDurationMonths(months);
        option.setInterestRate(CREDIT_INTEREST_RATE);
        
        double monthlyRate = CREDIT_INTEREST_RATE / 100 / 12;
        double payment = principal.doubleValue() * 
            (monthlyRate * Math.pow(1 + monthlyRate, months)) /
            (Math.pow(1 + monthlyRate, months) - 1);
        
        option.setMonthlyPayment(BigDecimal.valueOf(payment).setScale(2, RoundingMode.HALF_UP));
        option.setTotalPayment(option.getMonthlyPayment().multiply(BigDecimal.valueOf(months)));
        option.setTotalInterest(option.getTotalPayment().subtract(principal).setScale(2, RoundingMode.HALF_UP));
        
        double incomeRatio = monthlyIncome.compareTo(BigDecimal.ZERO) > 0
            ? payment / monthlyIncome.doubleValue() * 100
            : 999;
        option.setIncomeToDebtRatio(Math.round(incomeRatio * 10.0) / 10.0);
        option.setAffordable(incomeRatio <= 35);
        option.setAffordableLevel(incomeRatio <= 25 ? "low_risk" : incomeRatio <= 35 ? "medium_risk" : "high_risk");
        
        return option;
    }
    
    public Map<String, Object> getStrategies() {
        Map<String, Object> result = new HashMap<>();
        
        List<Map<String, Object>> strategies = new ArrayList<>();
        
        // AI Recommended
        Map<String, Object> aiStrategy = new HashMap<>();
        aiStrategy.put("key", "ai_recommended");
        aiStrategy.put("name", "🤖 AI Önerisi");
        aiStrategy.put("description", "Yapay zeka piyasa koşullarına göre en uygun dağılımı belirler");
        aiStrategy.put("emoji", "🤖");
        aiStrategy.put("isAi", true);
        aiStrategy.put("recommended", true);
        strategies.add(aiStrategy);
        
        // Balanced
        Map<String, Object> balanced = new HashMap<>();
        balanced.put("key", "balanced");
        balanced.put("name", "Dengeli Portföy");
        balanced.put("description", "Tüm varlıklara eşit dağılım");
        balanced.put("emoji", "📊");
        balanced.put("allocation", getBalancedAllocation());
        strategies.add(balanced);
        
        result.put("strategies", strategies);
        result.put("aiAvailable", true);
        result.put("aiDescription", "AI önerisi seçildiğinde, yapay zeka güncel piyasa verilerini analiz ederek size özel optimal yatırım dağılımı önerir.");
        
        return result;
    }
    
    public Map<String, Object> getMilestones() {
        Map<String, Object> result = new HashMap<>();
        
        List<Map<String, Object>> milestoneList = new ArrayList<>();
        for (Map.Entry<String, int[]> entry : MILESTONES.entrySet()) {
            Map<String, Object> m = new HashMap<>();
            m.put("key", entry.getKey());
            m.put("title", MILESTONE_TITLES.get(entry.getKey()));
            m.put("emoji", MILESTONE_EMOJIS.get(entry.getKey()));
            m.put("minPercent", entry.getValue()[0]);
            m.put("maxPercent", entry.getValue()[1]);
            milestoneList.add(m);
        }
        
        result.put("milestones", milestoneList);
        
        Map<String, Object> economic = new HashMap<>();
        economic.put("annualInflation", ANNUAL_INFLATION);
        economic.put("tlDepositRate", TL_DEPOSIT_RATE);
        economic.put("goldReturn", GOLD_RETURN);
        economic.put("usdReturn", USD_RETURN);
        economic.put("eurReturn", EUR_RETURN);
        economic.put("creditInterestRate", CREDIT_INTEREST_RATE);
        result.put("economicParams", economic);
        
        return result;
    }
}
