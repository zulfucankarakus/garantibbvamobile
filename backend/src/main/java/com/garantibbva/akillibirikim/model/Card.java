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
@Document(collection = "cards")
public class Card {
    @Id
    private String id;
    
    private String odtUserId;
    private String cardName;
    private String cardType;
    private String cardNo;
    private String lastFourDigits;
    private String expiryDate;
    private Double cardLimit;
    private Double usedLimit;
    private Double availableLimit;
    private String status;
    private String linkedAccountId;
    private LocalDateTime createdAt;
}
