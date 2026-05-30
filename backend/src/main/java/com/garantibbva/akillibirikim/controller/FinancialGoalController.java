package com.garantibbva.akillibirikim.controller;

import com.garantibbva.akillibirikim.model.FinancialGoal;
import com.garantibbva.akillibirikim.model.User;
import com.garantibbva.akillibirikim.repository.FinancialGoalRepository;
import com.garantibbva.akillibirikim.util.EconomicParameters;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequiredArgsConstructor
public class FinancialGoalController {
    
    private final FinancialGoalRepository financialGoalRepository;
    
    @GetMapping("/financial-goals")
    public ResponseEntity<List<FinancialGoal>> getGoals(@AuthenticationPrincipal User user) {
        List<FinancialGoal> goals = financialGoalRepository.findByOdtUserId(user.getId());
        return ResponseEntity.ok(goals);
    }
    
    @PostMapping("/financial-goals")
    public ResponseEntity<FinancialGoal> createGoal(
            @RequestBody Map<String, Object> request,
            @AuthenticationPrincipal User user) {
        
        double targetAmount = ((Number) request.get("target_amount")).doubleValue();
        double currentAmount = ((Number) request.getOrDefault("current_amount", 0)).doubleValue();
        
        FinancialGoal goal = FinancialGoal.builder()
                .odtUserId(user.getId())
                .goalName((String) request.getOrDefault("goal_name", "Yeni Hedef"))
                .productName((String) request.get("product_name"))
                .category((String) request.getOrDefault("category", "Diğer"))
                .targetAmount(targetAmount)
                .currentAmount(currentAmount)
                .progressPercentage((currentAmount / targetAmount) * 100)
                .status("active")
                .allocation(EconomicParameters.getAiRecommendedAllocation("medium"))
                .targetDate(LocalDateTime.now().plusMonths(12))
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        
        goal = financialGoalRepository.save(goal);
        return ResponseEntity.ok(goal);
    }
    
    @GetMapping("/market-data")
    public ResponseEntity<Map<String, Object>> getMarketData() {
        Map<String, Object> marketData = new HashMap<>();
        
        // Döviz kurları
        marketData.put("usd_try", Map.of(
            "rate", 32.50,
            "change", 0.25,
            "change_percent", 0.78
        ));
        marketData.put("eur_try", Map.of(
            "rate", 35.20,
            "change", 0.15,
            "change_percent", 0.43
        ));
        marketData.put("gbp_try", Map.of(
            "rate", 41.30,
            "change", -0.10,
            "change_percent", -0.24
        ));
        
        // Altın
        marketData.put("gold", Map.of(
            "rate", 2150.0,
            "change", 12.5,
            "change_percent", 0.58
        ));
        
        // Borsa
        marketData.put("bist100", Map.of(
            "value", 9850.0,
            "change", 125.0,
            "change_percent", 1.28
        ));
        
        // Faiz oranları
        marketData.put("interest_rates", Map.of(
            "policy_rate", 45.0,
            "deposit_rate", 42.0,
            "credit_rate", 48.0
        ));
        
        // Enflasyon
        marketData.put("inflation", Map.of(
            "annual", EconomicParameters.ANNUAL_INFLATION,
            "monthly", EconomicParameters.MONTHLY_INFLATION
        ));
        
        marketData.put("last_updated", LocalDateTime.now().toString());
        
        return ResponseEntity.ok(marketData);
    }
    
    @GetMapping("/credit/score")
    public ResponseEntity<Map<String, Object>> getCreditScore(@AuthenticationPrincipal User user) {
        Random random = new Random();
        int score = 650 + random.nextInt(200); // 650-850 arası
        
        String rating;
        if (score >= 800) rating = "Mükemmel";
        else if (score >= 700) rating = "İyi";
        else if (score >= 600) rating = "Orta";
        else rating = "Düşük";
        
        return ResponseEntity.ok(Map.of(
            "score", score,
            "rating", rating,
            "max_score", 900,
            "min_score", 300,
            "last_updated", LocalDateTime.now().toString()
        ));
    }
    
    @GetMapping("/status/overview")
    public ResponseEntity<Map<String, Object>> getStatusOverview(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(Map.of(
            "total_balance", 65000.0,
            "total_debt", 12500.0,
            "monthly_income", 35000.0,
            "monthly_expense", 22000.0,
            "savings_rate", 37.14,
            "financial_health", "good"
        ));
    }
    
    @GetMapping("/applications")
    public ResponseEntity<List<Map<String, Object>>> getApplications(@AuthenticationPrincipal User user) {
        // Boş liste dön - kullanıcının başvuruları yok
        return ResponseEntity.ok(new ArrayList<>());
    }
    
    @GetMapping("/search")
    public ResponseEntity<Map<String, Object>> search(@RequestParam String q) {
        return ResponseEntity.ok(Map.of(
            "results", new ArrayList<>(),
            "query", q
        ));
    }
}
