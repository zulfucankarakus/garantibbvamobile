package com.garantibbva.akillibirikim.controller;

import com.garantibbva.akillibirikim.dto.ContributeRequest;
import com.garantibbva.akillibirikim.dto.CreateSavingsPlanRequest;
import com.garantibbva.akillibirikim.dto.EstimateRequest;
import com.garantibbva.akillibirikim.model.SavingsPlan;
import com.garantibbva.akillibirikim.model.User;
import com.garantibbva.akillibirikim.service.SavingsInvestmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/savings-investment")
@RequiredArgsConstructor
public class SavingsInvestmentController {
    
    private final SavingsInvestmentService savingsInvestmentService;
    
    @GetMapping("/strategies")
    public ResponseEntity<Map<String, Object>> getStrategies() {
        return ResponseEntity.ok(savingsInvestmentService.getStrategies());
    }
    
    @PostMapping("/estimate")
    public ResponseEntity<Map<String, Object>> estimate(@Valid @RequestBody EstimateRequest request) {
        return ResponseEntity.ok(savingsInvestmentService.estimate(request));
    }
    
    @PostMapping("/plans")
    public ResponseEntity<SavingsPlan> createPlan(
            @Valid @RequestBody CreateSavingsPlanRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(savingsInvestmentService.createPlan(request, user));
    }
    
    @GetMapping("/plans")
    public ResponseEntity<List<SavingsPlan>> getUserPlans(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(savingsInvestmentService.getUserPlans(user.getId()));
    }
    
    @GetMapping("/plans/{planId}")
    public ResponseEntity<SavingsPlan> getPlanById(
            @PathVariable String planId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(savingsInvestmentService.getPlanById(planId, user.getId()));
    }
    
    @PostMapping("/plans/{planId}/contribute")
    public ResponseEntity<Map<String, Object>> contribute(
            @PathVariable String planId,
            @Valid @RequestBody ContributeRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(savingsInvestmentService.contribute(planId, request, user));
    }
    
    @DeleteMapping("/plans/{planId}")
    public ResponseEntity<Map<String, Object>> deletePlan(
            @PathVariable String planId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(savingsInvestmentService.deletePlan(planId, user));
    }
    
    @GetMapping("/plans/{planId}/credit-options")
    public ResponseEntity<Map<String, Object>> getCreditOptions(
            @PathVariable String planId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(savingsInvestmentService.getCreditOptions(planId, user));
    }
}
