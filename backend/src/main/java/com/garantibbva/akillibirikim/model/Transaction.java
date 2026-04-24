package com.garantibbva.akillibirikim.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "transactions")
public class Transaction {
    @Id
    private String id;
    
    private String odtUserId;
    private String accountId;
    private String cardId;
    private String transactionType;
    private String category;
    private String description;
    private Double amount;
    private String currency;
    private String status;
    private String merchantName;
    private LocalDateTime transactionDate;
    private LocalDateTime createdAt;
}
