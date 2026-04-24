package com.garantibbva.akillibirikim.controller;

import com.garantibbva.akillibirikim.model.SavingsPlan;
import com.garantibbva.akillibirikim.model.User;
import com.garantibbva.akillibirikim.service.CreditAdvisorService;
import com.garantibbva.akillibirikim.service.SavingsInvestmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/credit-advisor")
@RequiredArgsConstructor
public class CreditAdvisorController {
    
    private final CreditAdvisorService creditAdvisorService;
    private final SavingsInvestmentService savingsInvestmentService;
    
    @GetMapping("/milestones")
    public ResponseEntity<Map<String, Object>> getMilestones() {
        return ResponseEntity.ok(creditAdvisorService.getMilestones());
    }
    
    @GetMapping("/plans/{planId}/advice")
    public ResponseEntity<Map<String, Object>> getAiCreditAdvice(
            @PathVariable String planId,
            @AuthenticationPrincipal User user) {
        SavingsPlan plan = savingsInvestmentService.getPlanById(planId, user.getId());
        return ResponseEntity.ok(creditAdvisorService.getAiCreditAdvice(plan));
    }
    
    @PostMapping("/plans/{planId}/simulate")
    public ResponseEntity<Map<String, Object>> simulateCredit(
            @PathVariable String planId,
            @RequestBody Map<String, Double> request,
            @AuthenticationPrincipal User user) {
        SavingsPlan plan = savingsInvestmentService.getPlanById(planId, user.getId());
        return ResponseEntity.ok(creditAdvisorService.simulateCredit(plan, request.get("monthly_income")));
    }
}
