package com.garantibbva.akillibirikim.service;

import com.garantibbva.akillibirikim.model.SavingsPlan;
import com.garantibbva.akillibirikim.util.EconomicParameters;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
@RequiredArgsConstructor
public class CreditAdvisorService {
    
    public Map<String, Object> getMilestones() {
        return Map.of(
            "milestones", EconomicParameters.getMilestones(),
            "economic_params", Map.of(
                "inflation", Map.of(
                    "annual", EconomicParameters.ANNUAL_INFLATION,
                    "monthly", EconomicParameters.MONTHLY_INFLATION
                ),
                "credit_rate", EconomicParameters.CREDIT_INTEREST_RATE,
                "deposit_rate", EconomicParameters.DEPOSIT_RATE
            )
        );
    }
    
    public Map<String, Object> getAiCreditAdvice(SavingsPlan plan) {
        double progress = plan.getProgressPercentage();
        Map<String, Object> milestone = EconomicParameters.getMilestoneForProgress(progress);
        
        double remaining = plan.getTargetAmount() - plan.getTotalCurrentValue();
        double inflationImpact = remaining * (EconomicParameters.ANNUAL_INFLATION / 100);
        
        // Basit AI önerisi
        String headline;
        String mainMessage;
        String urgencyLevel;
        
        if (progress >= 75) {
            headline = "🎉 Hedefinize çok yakınsınız!";
            mainMessage = "Birikiminiz hedefin %" + String.format("%.0f", progress) + "'ine ulaştı. Kredi ile hedefinize hemen ulaşabilirsiniz.";
            urgencyLevel = "high";
        } else if (progress >= 50) {
            headline = "⚖️ Yarı yolda iyi gidiyorsunuz!";
            mainMessage = "Birikiminiz hedefin yarısını geçti. Enflasyon etkisini azaltmak için kredi seçeneklerini değerlendirebilirsiniz.";
            urgencyLevel = "medium";
        } else {
            headline = "🐣 Birikim yolculuğunuz başladı!";
            mainMessage = "Biriktirmeye devam edin. Düzenli katkılarla hedefinize ulaşacaksınız.";
            urgencyLevel = "low";
        }
        
        return Map.of(
            "plan_id", plan.getId(),
            "progress", Map.of(
                "current_value", plan.getTotalCurrentValue(),
                "target_amount", plan.getTargetAmount(),
                "progress_percentage", progress
            ),
            "milestone", milestone != null ? milestone : Map.of(),
            "inflation_impact", Map.of(
                "annual_rate", EconomicParameters.ANNUAL_INFLATION,
                "estimated_loss", inflationImpact
            ),
            "credit_analysis", Map.of(
                "remaining_amount", remaining,
                "credit_rate", EconomicParameters.CREDIT_INTEREST_RATE,
                "recommendation", progress >= 60 ? "Kredi çekmek mantıklı olabilir" : "Biriktirmeye devam edin"
            ),
            "ai_recommendation", Map.of(
                "headline", headline,
                "main_message", mainMessage,
                "urgency_level", urgencyLevel
            )
        );
    }
    
    public Map<String, Object> simulateCredit(SavingsPlan plan, double monthlyIncome) {
        double remaining = plan.getTargetAmount() - plan.getTotalCurrentValue();
        double creditRate = EconomicParameters.CREDIT_INTEREST_RATE;
        
        List<Map<String, Object>> termOptions = new ArrayList<>();
        int[] terms = {12, 24, 36, 48, 60};
        
        Map<String, Object> bestOption = null;
        
        for (int term : terms) {
            double monthlyRate = creditRate / 100 / 12;
            double monthlyPayment = (remaining * monthlyRate * Math.pow(1 + monthlyRate, term)) /
                                   (Math.pow(1 + monthlyRate, term) - 1);
            double totalPayment = monthlyPayment * term;
            double incomeRatio = (monthlyPayment / monthlyIncome) * 100;
            
            String riskLevel;
            boolean affordable;
            
            if (incomeRatio <= 30) {
                riskLevel = "low";
                affordable = true;
            } else if (incomeRatio <= 50) {
                riskLevel = "medium";
                affordable = true;
            } else {
                riskLevel = "high";
                affordable = false;
            }
            
            Map<String, Object> option = new HashMap<>();
            option.put("term_months", term);
            option.put("monthly_payment", Math.round(monthlyPayment));
            option.put("total_payment", Math.round(totalPayment));
            option.put("income_ratio", Math.round(incomeRatio * 10) / 10.0);
            option.put("risk_level", riskLevel);
            option.put("affordable", affordable);
            
            termOptions.add(option);
            
            if (affordable && (bestOption == null || 
                (int) option.get("term_months") < (int) bestOption.get("term_months"))) {
                bestOption = option;
            }
        }
        
        // Enflasyon etkisi
        double waitingCost = remaining * (EconomicParameters.ANNUAL_INFLATION / 100);
        
        return Map.of(
            "plan_id", plan.getId(),
            "simulation", Map.of(
                "loan_amount", remaining,
                "monthly_income", monthlyIncome,
                "interest_rate", creditRate,
                "term_options", termOptions
            ),
            "inflation_impact", Map.of(
                "waiting_cost_1year", waitingCost,
                "current_inflation", EconomicParameters.ANNUAL_INFLATION
            ),
            "recommendation", bestOption != null ? bestOption : Map.of("message", "Gelir düzeyi kredi için uygun değil")
        );
    }
    
    public Map<String, Object> checkMilestone(SavingsPlan plan, double previousProgress) {
        double currentProgress = plan.getProgressPercentage();
        
        Map<String, Object> previousMilestone = EconomicParameters.getMilestoneForProgress(previousProgress);
        Map<String, Object> currentMilestone = EconomicParameters.getMilestoneForProgress(currentProgress);
        
        boolean milestoneChanged = false;
        Map<String, Object> notification = null;
        
        if (currentMilestone != null) {
            String currentId = (String) currentMilestone.get("id");
            String previousId = previousMilestone != null ? (String) previousMilestone.get("id") : null;
            
            if (!currentId.equals(previousId)) {
                milestoneChanged = true;
                String emoji = (String) currentMilestone.get("emoji");
                String name = (String) currentMilestone.get("name");
                
                notification = Map.of(
                    "title", emoji + " " + plan.getProductName() + " - Kredi Fırsatı!",
                    "message", name + " eşiğine ulaştınız! İlerlemeniz: %" + String.format("%.1f", currentProgress),
                    "milestone", currentMilestone
                );
            }
        }
        
        return Map.of(
            "previous_progress", previousProgress,
            "current_progress", currentProgress,
            "milestone_changed", milestoneChanged,
            "notification", notification != null ? notification : Map.of()
        );
    }
}
