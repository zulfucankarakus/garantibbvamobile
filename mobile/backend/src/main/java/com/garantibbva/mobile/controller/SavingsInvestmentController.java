package com.garantibbva.mobile.controller;

import com.garantibbva.mobile.dto.request.ContributeRequest;
import com.garantibbva.mobile.dto.request.CreateSavingsInvestmentRequest;
import com.garantibbva.mobile.dto.response.ApiResponse;
import com.garantibbva.mobile.dto.response.SavingsInvestmentResponse;
import com.garantibbva.mobile.entity.SavingsInvestmentPlan;
import com.garantibbva.mobile.security.SecurityUtils;
import com.garantibbva.mobile.service.SavingsInvestmentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/savings-investment")
public class SavingsInvestmentController {
    
    @Autowired
    private SavingsInvestmentService savingsInvestmentService;
    
    @Autowired
    private SecurityUtils securityUtils;
    
    /**
     * Get all investment strategies
     */
    @GetMapping("/strategies")
    public ResponseEntity<?> getStrategies() {
        try {
            Map<String, Object> strategies = savingsInvestmentService.getStrategies();
            strategies.put("success", true);
            return ResponseEntity.ok(strategies);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(
                ApiResponse.error("Stratejiler alınamadı: " + e.getMessage())
            );
        }
    }
    
    /**
     * Get milestone thresholds
     */
    @GetMapping("/milestones")
    public ResponseEntity<?> getMilestones() {
        try {
            Map<String, Object> milestones = savingsInvestmentService.getMilestones();
            milestones.put("success", true);
            return ResponseEntity.ok(milestones);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(
                ApiResponse.error("Milestone'lar alınamadı: " + e.getMessage())
            );
        }
    }
    
    /**
     * Create a new savings investment plan
     */
    @PostMapping("/create")
    public ResponseEntity<?> createPlan(@RequestBody CreateSavingsInvestmentRequest request) {
        try {
            String userId = securityUtils.getCurrentUserId();
            
            SavingsInvestmentPlan plan = savingsInvestmentService.createPlan(userId, request);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("plan", plan);
            
            if (plan.getAiRecommendation() != null) {
                Map<String, Object> aiRec = new HashMap<>();
                aiRec.put("reasoning", plan.getAiRecommendation().getReasoning());
                aiRec.put("insights", plan.getAiRecommendation().getInsights());
                aiRec.put("source", plan.getAiRecommendation().getSource());
                aiRec.put("confidenceScore", plan.getAiRecommendation().getConfidenceScore());
                response.put("aiRecommendation", aiRec);
            }
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(
                ApiResponse.error("Plan oluşturulamadı: " + e.getMessage())
            );
        }
    }
    
    /**
     * Get all plans for current user
     */
    @GetMapping("/plans")
    public ResponseEntity<?> getPlans(@RequestParam(required = false) String status) {
        try {
            String userId = securityUtils.getCurrentUserId();
            
            List<SavingsInvestmentPlan> plans = savingsInvestmentService.getPlans(userId);
            
            // Enrich plans with progress info for dashboard
            List<Map<String, Object>> enrichedPlans = plans.stream().map(plan -> {
                Map<String, Object> planMap = new HashMap<>();
                planMap.put("id", plan.getId());
                planMap.put("userId", plan.getUserId());
                planMap.put("productName", plan.getProductName());
                planMap.put("targetAmount", plan.getTargetAmount());
                planMap.put("currentAmount", plan.getCurrentAmount());
                planMap.put("monthlyContribution", plan.getMonthlyContribution());
                planMap.put("durationMonths", plan.getDurationMonths());
                planMap.put("riskProfile", plan.getRiskProfile());
                planMap.put("strategy", plan.getStrategy());
                planMap.put("allocation", plan.getAllocation());
                planMap.put("status", plan.getStatus());
                planMap.put("createdAt", plan.getCreatedAt());
                planMap.put("startDate", plan.getStartDate());
                planMap.put("targetDate", plan.getTargetDate());
                
                // Calculate total current value and progress
                BigDecimal totalValue = BigDecimal.ZERO;
                for (BigDecimal val : plan.getAssetDistribution().values()) {
                    totalValue = totalValue.add(val);
                }
                planMap.put("totalCurrentValue", totalValue);
                
                double progress = plan.getTargetAmount().compareTo(BigDecimal.ZERO) > 0
                    ? totalValue.divide(plan.getTargetAmount(), 4, java.math.RoundingMode.HALF_UP)
                        .multiply(BigDecimal.valueOf(100)).doubleValue()
                    : 0;
                planMap.put("progressPercentage", Math.min(100, Math.round(progress * 100.0) / 100.0));
                
                return planMap;
            }).toList();
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("plans", enrichedPlans);
            response.put("total", enrichedPlans.size());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(
                ApiResponse.error("Planlar alınamadı: " + e.getMessage())
            );
        }
    }
    
    /**
     * Get plan detail by ID
     */
    @GetMapping("/{planId}")
    public ResponseEntity<?> getPlanDetail(@PathVariable String planId) {
        try {
            String userId = securityUtils.getCurrentUserId();
            
            SavingsInvestmentResponse response = savingsInvestmentService.getPlanDetail(userId, planId);
            
            if (response == null) {
                return ResponseEntity.notFound().build();
            }
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(
                ApiResponse.error("Plan detayı alınamadı: " + e.getMessage())
            );
        }
    }
    
    /**
     * Add contribution to a plan
     */
    @PostMapping("/{planId}/contribute")
    public ResponseEntity<?> contribute(
            @PathVariable String planId,
            @RequestBody ContributeRequest request) {
        try {
            String userId = securityUtils.getCurrentUserId();
            
            SavingsInvestmentResponse response = savingsInvestmentService.contribute(userId, planId, request);
            
            if (response == null) {
                return ResponseEntity.notFound().build();
            }
            
            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("newTotal", response.getPlan().getCurrentAmount());
            result.put("plan", response.getPlan());
            
            if (response.getMilestoneCheck() != null && response.getMilestoneCheck().isMilestoneChanged()) {
                Map<String, Object> milestoneNotif = new HashMap<>();
                milestoneNotif.put("sent", true);
                milestoneNotif.put("title", response.getMilestoneCheck().getNotification().getTitle());
                milestoneNotif.put("previousProgress", response.getMilestoneCheck().getPreviousProgress());
                milestoneNotif.put("currentProgress", response.getMilestoneCheck().getCurrentProgress());
                result.put("milestoneNotification", milestoneNotif);
            }
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(
                ApiResponse.error("Katkı eklenemedi: " + e.getMessage())
            );
        }
    }
    
    /**
     * Delete a plan
     */
    @DeleteMapping("/{planId}")
    public ResponseEntity<?> deletePlan(@PathVariable String planId) {
        try {
            String userId = securityUtils.getCurrentUserId();
            
            boolean deleted = savingsInvestmentService.deletePlan(userId, planId);
            
            if (!deleted) {
                return ResponseEntity.notFound().build();
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Plan başarıyla silindi.");
            response.put("deletedPlanId", planId);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(
                ApiResponse.error("Plan silinemedi: " + e.getMessage())
            );
        }
    }
    
    /**
     * Get AI credit advice for a plan
     */
    @GetMapping("/{planId}/ai-credit-advice")
    public ResponseEntity<?> getAICreditAdvice(@PathVariable String planId) {
        try {
            String userId = securityUtils.getCurrentUserId();
            
            SavingsInvestmentResponse response = savingsInvestmentService.getPlanDetail(userId, planId);
            
            if (response == null) {
                return ResponseEntity.notFound().build();
            }
            
            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("planId", planId);
            result.put("productName", response.getPlan().getProductName());
            result.put("progress", response.getProgress());
            result.put("creditRecommendation", response.getCreditRecommendation());
            result.put("milestoneCheck", response.getMilestoneCheck());
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(
                ApiResponse.error("AI kredi önerisi alınamadı: " + e.getMessage())
            );
        }
    }
    
    /**
     * Estimate plan results
     */
    @PostMapping("/estimate")
    public ResponseEntity<?> estimatePlan(@RequestBody CreateSavingsInvestmentRequest request) {
        try {
            // Calculate AI allocation if requested
            Map<String, Integer> allocation;
            Map<String, Object> aiRecommendation = null;
            
            if (request.isUseAiAllocation() && request.getCustomAllocation() == null) {
                // Get AI allocation
                allocation = calculateAIAllocation(request.getRiskProfile());
                
                aiRecommendation = new HashMap<>();
                aiRecommendation.put("reasoning", generateAllocationReasoning(allocation));
                aiRecommendation.put("insights", generateMarketInsights());
                aiRecommendation.put("source", "rule_based");
                aiRecommendation.put("confidenceScore", 75);
            } else if (request.getCustomAllocation() != null) {
                allocation = request.getCustomAllocation();
            } else {
                allocation = getBalancedAllocation();
            }
            
            // Calculate estimated future value
            BigDecimal existingSavings = request.getExistingSavings() != null 
                ? request.getExistingSavings() 
                : BigDecimal.ZERO;
            BigDecimal monthlyContribution = request.getMonthlyContribution();
            int months = request.getDurationMonths();
            
            BigDecimal estimatedValue = existingSavings;
            for (int i = 0; i < months; i++) {
                estimatedValue = estimatedValue.add(monthlyContribution);
                // Apply average monthly return
                estimatedValue = estimatedValue.multiply(BigDecimal.valueOf(1.035)); // ~3.5% monthly return
            }
            
            boolean canReachTarget = estimatedValue.compareTo(request.getTargetAmount()) >= 0;
            BigDecimal shortage = request.getTargetAmount().subtract(estimatedValue);
            if (shortage.compareTo(BigDecimal.ZERO) < 0) shortage = BigDecimal.ZERO;
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("allocation", allocation);
            response.put("estimate", Map.of(
                "estimatedValue", estimatedValue.setScale(2, java.math.RoundingMode.HALF_UP),
                "totalContributions", monthlyContribution.multiply(BigDecimal.valueOf(months))
            ));
            response.put("canReachTarget", canReachTarget);
            response.put("shortage", shortage.setScale(2, java.math.RoundingMode.HALF_UP));
            
            if (aiRecommendation != null) {
                response.put("aiRecommendation", aiRecommendation);
            }
            
            String summary = canReachTarget 
                ? "✅ " + months + " ay sonunda tahmini " + String.format("%,.0f", estimatedValue) + " TL biriktirmiş olacaksınız."
                : "⚠️ " + months + " ay sonunda tahmini " + String.format("%,.0f", estimatedValue) + " TL biriktirmiş olacaksınız. Hedefe ulaşmak için " + String.format("%,.0f", shortage) + " TL eksik kalacak.";
            response.put("summary", summary);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(
                ApiResponse.error("Tahmin yapılamadı: " + e.getMessage())
            );
        }
    }
    
    // Helper methods
    private Map<String, Integer> calculateAIAllocation(String riskProfile) {
        Map<String, Integer> allocation = new HashMap<>();
        
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
            return "Altın ağırlıklı (%" + goldPct + ") bir portföy öneriyoruz. Yüksek enflasyon ortamında (%50) altın güvenli liman olarak öne çıkıyor.";
        }
        return "Dengeli bir portföy öneriyoruz. Risk profilinize uygun çeşitlendirilmiş yatırım dağılımı oluşturuldu.";
    }
    
    private java.util.List<String> generateMarketInsights() {
        java.util.List<String> insights = new java.util.ArrayList<>();
        insights.add("⚠️ TL mevduat faizi (%45) enflasyonun (%50) altında");
        insights.add("🥇 Altın (%55) enflasyonu yeniyor");
        insights.add("💡 Yüksek enflasyon döneminde döviz ve altın koruması önemli");
        return insights;
    }
}
