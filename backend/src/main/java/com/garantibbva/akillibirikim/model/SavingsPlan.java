package com.garantibbva.akillibirikim.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "savings_plans")
public class SavingsPlan {
    @Id
    private String id;
    
    private String odtUserId;
    private String productName;
    private Double targetAmount;
    private Double monthlyContribution;
    private Integer durationMonths;
    private String riskProfile;
    private String strategy;
    private Double existingSavings;
    private Double currentAmount;
    private Double totalCurrentValue;
    private Double progressPercentage;
    
    private Map<String, Double> allocation;
    private Map<String, Double> currentHoldings;
    
    private List<Map<String, Object>> contributionHistory;
    
    private String status;
    private String lastMilestone;
    
    private Boolean useAiAllocation;
    private Map<String, Object> aiRecommendation;
    
    private LocalDateTime startDate;
    private LocalDateTime targetDate;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
