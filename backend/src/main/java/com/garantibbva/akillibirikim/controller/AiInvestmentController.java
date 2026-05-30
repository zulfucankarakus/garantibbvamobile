package com.garantibbva.akillibirikim.controller;

import com.garantibbva.akillibirikim.service.AiInvestmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/ai-investment")
@RequiredArgsConstructor
public class AiInvestmentController {
    
    private final AiInvestmentService aiInvestmentService;
    
    @PostMapping("/recommend")
    public ResponseEntity<Map<String, Object>> recommendAllocation(@RequestBody Map<String, Object> request) {
        return ResponseEntity.ok(aiInvestmentService.recommendAllocation(
            (String) request.get("product_name"),
            ((Number) request.get("target_amount")).doubleValue(),
            ((Number) request.get("duration_months")).intValue(),
            (String) request.getOrDefault("risk_profile", "medium"),
            ((Number) request.getOrDefault("existing_savings", 0)).doubleValue(),
            ((Number) request.getOrDefault("monthly_contribution", 0)).doubleValue()
        ));
    }
    
    @GetMapping("/market-analysis")
    public ResponseEntity<Map<String, Object>> getMarketAnalysis() {
        return ResponseEntity.ok(aiInvestmentService.getMarketAnalysis());
    }
}
