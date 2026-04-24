package com.garantibbva.akillibirikim.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "financial_goals")
public class FinancialGoal {
    @Id
    private String id;
    
    private String odtUserId;
    private String goalName;
    private String productName;
    private String category;
    private Double targetAmount;
    private Double currentAmount;
    private Double progressPercentage;
    private String status;
    private Map<String, Double> allocation;
    private LocalDateTime targetDate;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
