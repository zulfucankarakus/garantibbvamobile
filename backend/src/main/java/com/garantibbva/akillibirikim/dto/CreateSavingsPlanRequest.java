package com.garantibbva.akillibirikim.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.Data;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

@Data
public class CreateSavingsPlanRequest {
    @NotBlank(message = "Ürün adı gerekli")
    @JsonAlias({"product_name", "productName"})
    private String productName;
    
    @NotNull(message = "Hedef tutar gerekli")
    @Positive(message = "Hedef tutar pozitif olmalı")
    @JsonAlias({"target_amount", "targetAmount"})
    private Double targetAmount;
    
    @NotNull(message = "Aylık katkı gerekli")
    @Positive(message = "Aylık katkı pozitif olmalı")
    @JsonAlias({"monthly_contribution", "monthlyContribution"})
    private Double monthlyContribution;
    
    @NotNull(message = "Süre gerekli")
    @Positive(message = "Süre pozitif olmalı")
    @JsonAlias({"duration_months", "durationMonths"})
    private Integer durationMonths;
    
    @JsonAlias({"risk_profile", "riskProfile"})
    private String riskProfile = "medium";
    
    private String strategy = "balanced";
    
    @JsonAlias({"existing_savings", "existingSavings"})
    private Double existingSavings = 0.0;
    
    @JsonAlias({"use_ai_allocation", "useAiAllocation"})
    private Boolean useAiAllocation = false;
}
