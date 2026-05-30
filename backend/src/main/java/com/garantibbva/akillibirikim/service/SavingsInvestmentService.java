package com.garantibbva.akillibirikim.service;

import com.garantibbva.akillibirikim.dto.ContributeRequest;
import com.garantibbva.akillibirikim.dto.CreateSavingsPlanRequest;
import com.garantibbva.akillibirikim.dto.EstimateRequest;
import com.garantibbva.akillibirikim.model.Notification;
import com.garantibbva.akillibirikim.model.SavingsPlan;
import com.garantibbva.akillibirikim.model.User;
import com.garantibbva.akillibirikim.repository.NotificationRepository;
import com.garantibbva.akillibirikim.repository.SavingsPlanRepository;
import com.garantibbva.akillibirikim.util.EconomicParameters;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class SavingsInvestmentService {
    
    private final SavingsPlanRepository savingsPlanRepository;
    private final NotificationRepository notificationRepository;
    
    public Map<String, Object> getStrategies() {
        Map<String, Object> result = new HashMap<>();
        
        // Risk profilleri
        List<Map<String, Object>> riskProfiles = List.of(
            Map.of("id", "low", "name", "Düşük Risk", "description", "Muhafazakar yatırım", "emoji", "🛡️"),
            Map.of("id", "medium", "name", "Orta Risk", "description", "Dengeli yatırım", "emoji", "⚖️"),
            Map.of("id", "high", "name", "Yüksek Risk", "description", "Agresif yatırım", "emoji", "🚀")
        );
        
        // Yatırım stratejileri
        List<Map<String, Object>> strategies = List.of(
            Map.of("id", "tl_only", "name", "Sadece TL", "description", "Türk Lirası ağırlıklı", "emoji", "🇹🇷"),
            Map.of("id", "gold_heavy", "name", "Altın Ağırlıklı", "description", "Altın odaklı strateji", "emoji", "🥇"),
            Map.of("id", "usd_heavy", "name", "Dolar Ağırlıklı", "description", "USD odaklı strateji", "emoji", "💵"),
            Map.of("id", "eur_heavy", "name", "Euro Ağırlıklı", "description", "EUR odaklı strateji", "emoji", "💶"),
            Map.of("id", "balanced", "name", "Dengeli", "description", "Dengeli dağılım", "emoji", "⚖️"),
            Map.of("id", "ai_recommended", "name", "AI Önerisi", "description", "Yapay zeka destekli dinamik dağılım", "emoji", "🤖", "is_ai", true)
        );
        
        result.put("risk_profiles", riskProfiles);
        result.put("strategies", strategies);
        result.put("ai_available", true);
        
        return result;
    }
    
    public Map<String, Object> estimate(EstimateRequest request) {
        Map<String, Double> allocation;
        Map<String, Object> aiRecommendation = null;
        
        if (Boolean.TRUE.equals(request.getUseAiAllocation())) {
            allocation = EconomicParameters.getAiRecommendedAllocation(request.getRiskProfile());
            aiRecommendation = Map.of(
                "reasoning", "Yüksek enflasyon ortamında altın enflasyonu geçen tek varlık olarak öne çıkıyor.",
                "insights", List.of(
                    "Altın getirisi (%55) enflasyonu (%50) geçiyor",
                    "TL mevduat faizi (%45) enflasyonun altında",
                    "Döviz portföyü koruma sağlıyor"
                ),
                "source", "ai_analysis",
                "confidence_score", 85
            );
        } else {
            allocation = EconomicParameters.getRiskBasedAllocation(request.getRiskProfile());
        }
        
        // Tahmini hesaplamalar
        double totalContribution = request.getExistingSavings() + 
                                   (request.getMonthlyContribution() * request.getDurationMonths());
        
        // Ortalama getiri hesapla
        double avgReturn = calculateWeightedReturn(allocation);
        double estimatedValue = totalContribution * (1 + avgReturn / 100);
        boolean canReachTarget = estimatedValue >= request.getTargetAmount();
        
        Map<String, Object> result = new HashMap<>();
        result.put("allocation", allocation);
        result.put("estimate", Map.of(
            "total_contribution", totalContribution,
            "estimated_value", estimatedValue,
            "estimated_return", avgReturn,
            "can_reach_target", canReachTarget
        ));
        result.put("can_reach_target", canReachTarget);
        
        if (aiRecommendation != null) {
            result.put("ai_recommendation", aiRecommendation);
        }
        
        return result;
    }
    
    public SavingsPlan createPlan(CreateSavingsPlanRequest request, User user) {
        Map<String, Double> allocation;
        Map<String, Object> aiRecommendation = null;
        
        if (Boolean.TRUE.equals(request.getUseAiAllocation())) {
            allocation = EconomicParameters.getAiRecommendedAllocation(request.getRiskProfile());
            aiRecommendation = Map.of(
                "reasoning", "Yüksek enflasyon ortamında altın ağırlıklı portföy önerilmektedir.",
                "source", "ai_analysis",
                "confidence_score", 85
            );
        } else {
            allocation = EconomicParameters.getRiskBasedAllocation(request.getRiskProfile());
        }
        
        // Mevcut varlıkları dağıt
        Map<String, Double> currentHoldings = new HashMap<>();
        for (Map.Entry<String, Double> entry : allocation.entrySet()) {
            currentHoldings.put(entry.getKey(), request.getExistingSavings() * entry.getValue() / 100);
        }
        
        double totalCurrentValue = request.getExistingSavings();
        double progressPercentage = (totalCurrentValue / request.getTargetAmount()) * 100;
        
        SavingsPlan plan = SavingsPlan.builder()
                .odtUserId(user.getId())
                .productName(request.getProductName())
                .targetAmount(request.getTargetAmount())
                .monthlyContribution(request.getMonthlyContribution())
                .durationMonths(request.getDurationMonths())
                .riskProfile(request.getRiskProfile())
                .strategy(request.getStrategy())
                .existingSavings(request.getExistingSavings())
                .currentAmount(request.getExistingSavings())
                .totalCurrentValue(totalCurrentValue)
                .progressPercentage(progressPercentage)
                .allocation(allocation)
                .currentHoldings(currentHoldings)
                .contributionHistory(new ArrayList<>())
                .status("active")
                .useAiAllocation(request.getUseAiAllocation())
                .aiRecommendation(aiRecommendation)
                .startDate(LocalDateTime.now())
                .targetDate(LocalDateTime.now().plusMonths(request.getDurationMonths()))
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        
        plan = savingsPlanRepository.save(plan);
        
        // Bildirim oluştur
        Notification notification = Notification.builder()
                .userId(user.getId())
                .title("Yeni Birikim Planı Oluşturuldu")
                .message(request.getProductName() + " için birikim planınız başarıyla oluşturuldu.")
                .notificationType("plan_created")
                .read(false)
                .createdAt(LocalDateTime.now())
                .build();
        
        notificationRepository.save(notification);
        
        return plan;
    }
    
    public List<SavingsPlan> getUserPlans(String userId) {
        return savingsPlanRepository.findByOdtUserId(userId);
    }
    
    public SavingsPlan getPlanById(String planId, String userId) {
        SavingsPlan plan = savingsPlanRepository.findById(planId)
                .orElseThrow(() -> new RuntimeException("Plan bulunamadı"));
        
        if (!plan.getOdtUserId().equals(userId)) {
            throw new RuntimeException("Bu plana erişim yetkiniz yok");
        }
        
        return plan;
    }
    
    public Map<String, Object> contribute(String planId, ContributeRequest request, User user) {
        SavingsPlan plan = getPlanById(planId, user.getId());
        
        double previousProgress = plan.getProgressPercentage();
        String previousMilestone = plan.getLastMilestone();
        
        // Katkıyı varlıklara dağıt
        Map<String, Double> currentHoldings = plan.getCurrentHoldings();
        for (Map.Entry<String, Double> entry : plan.getAllocation().entrySet()) {
            double addAmount = request.getAmount() * entry.getValue() / 100;
            currentHoldings.put(entry.getKey(), currentHoldings.getOrDefault(entry.getKey(), 0.0) + addAmount);
        }
        
        // Toplam değeri güncelle
        double newCurrentAmount = plan.getCurrentAmount() + request.getAmount();
        double newTotalValue = currentHoldings.values().stream().mapToDouble(Double::doubleValue).sum();
        double newProgress = (newTotalValue / plan.getTargetAmount()) * 100;
        
        // Katkı geçmişine ekle
        List<Map<String, Object>> history = plan.getContributionHistory();
        if (history == null) history = new ArrayList<>();
        history.add(Map.of(
            "amount", request.getAmount(),
            "date", LocalDateTime.now().toString(),
            "progress_after", newProgress
        ));
        
        // Milestone kontrolü
        Map<String, Object> newMilestone = EconomicParameters.getMilestoneForProgress(newProgress);
        Map<String, Object> milestoneNotification = null;
        
        if (newMilestone != null) {
            String newMilestoneId = (String) newMilestone.get("id");
            if (previousMilestone == null || !previousMilestone.equals(newMilestoneId)) {
                plan.setLastMilestone(newMilestoneId);
                
                // Milestone bildirimi oluştur
                String emoji = (String) newMilestone.get("emoji");
                String milestoneName = (String) newMilestone.get("name");
                
                Notification notification = Notification.builder()
                        .userId(user.getId())
                        .title(emoji + " " + plan.getProductName() + " - Kredi Fırsatı!")
                        .message(milestoneName + " eşiğine ulaştınız! İlerlemeniz: %" + String.format("%.1f", newProgress))
                        .notificationType("credit_advice")
                        .read(false)
                        .createdAt(LocalDateTime.now())
                        .build();
                
                notificationRepository.save(notification);
                
                milestoneNotification = Map.of(
                    "title", notification.getTitle(),
                    "message", notification.getMessage(),
                    "milestone", newMilestone
                );
            }
        }
        
        // Planı güncelle
        plan.setCurrentAmount(newCurrentAmount);
        plan.setTotalCurrentValue(newTotalValue);
        plan.setProgressPercentage(newProgress);
        plan.setCurrentHoldings(currentHoldings);
        plan.setContributionHistory(history);
        plan.setUpdatedAt(LocalDateTime.now());
        
        savingsPlanRepository.save(plan);
        
        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("message", "Katkı başarıyla eklendi");
        result.put("previous_progress", previousProgress);
        result.put("current_progress", newProgress);
        result.put("plan", plan);
        
        if (milestoneNotification != null) {
            result.put("milestone_notification", milestoneNotification);
        }
        
        return result;
    }
    
    public Map<String, Object> deletePlan(String planId, User user) {
        SavingsPlan plan = getPlanById(planId, user.getId());
        
        savingsPlanRepository.delete(plan);
        
        // Bildirim oluştur
        Notification notification = Notification.builder()
                .userId(user.getId())
                .title("Birikim Planı Silindi")
                .message(plan.getProductName() + " birikim planınız silindi.")
                .notificationType("plan_deleted")
                .read(false)
                .createdAt(LocalDateTime.now())
                .build();
        
        notificationRepository.save(notification);
        
        return Map.of(
            "success", true,
            "message", plan.getProductName() + " başarıyla silindi.",
            "deleted_plan_id", planId
        );
    }
    
    public Map<String, Object> getCreditOptions(String planId, User user) {
        SavingsPlan plan = getPlanById(planId, user.getId());
        
        double remaining = plan.getTargetAmount() - plan.getTotalCurrentValue();
        double creditRate = EconomicParameters.CREDIT_INTEREST_RATE;
        
        List<Map<String, Object>> options = new ArrayList<>();
        int[] terms = {12, 24, 36, 48, 60};
        
        for (int term : terms) {
            double monthlyRate = creditRate / 100 / 12;
            double monthlyPayment = (remaining * monthlyRate * Math.pow(1 + monthlyRate, term)) /
                                   (Math.pow(1 + monthlyRate, term) - 1);
            double totalPayment = monthlyPayment * term;
            double totalInterest = totalPayment - remaining;
            
            options.add(Map.of(
                "term_months", term,
                "monthly_payment", Math.round(monthlyPayment),
                "total_payment", Math.round(totalPayment),
                "total_interest", Math.round(totalInterest),
                "interest_rate", creditRate
            ));
        }
        
        return Map.of(
            "plan_id", planId,
            "current_savings", plan.getTotalCurrentValue(),
            "target_amount", plan.getTargetAmount(),
            "remaining_amount", remaining,
            "credit_options", options
        );
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
