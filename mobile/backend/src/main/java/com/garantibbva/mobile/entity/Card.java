package com.garantibbva.mobile.entity;

import com.garantibbva.mobile.enums.CardType;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Document(collection = "cards")
public class Card {
    
    @Id
    private String id;
    @Indexed
    private String userId;
    private String accountId;
    private String name;
    @Indexed(unique = true)
    private String cardNo;
    private CardType cardType;
    private String cvv;
    private String expiryDate;
    private String status = "active";
    private BigDecimal limit;
    private BigDecimal availableLimit;
    private BigDecimal balance = BigDecimal.ZERO;
    @CreatedDate
    private LocalDateTime createdAt;
    
    public Card() {}
    
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getAccountId() { return accountId; }
    public void setAccountId(String accountId) { this.accountId = accountId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getCardNo() { return cardNo; }
    public void setCardNo(String cardNo) { this.cardNo = cardNo; }
    public CardType getCardType() { return cardType; }
    public void setCardType(CardType cardType) { this.cardType = cardType; }
    public String getCvv() { return cvv; }
    public void setCvv(String cvv) { this.cvv = cvv; }
    public String getExpiryDate() { return expiryDate; }
    public void setExpiryDate(String expiryDate) { this.expiryDate = expiryDate; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public BigDecimal getLimit() { return limit; }
    public void setLimit(BigDecimal limit) { this.limit = limit; }
    public BigDecimal getAvailableLimit() { return availableLimit; }
    public void setAvailableLimit(BigDecimal availableLimit) { this.availableLimit = availableLimit; }
    public BigDecimal getBalance() { return balance; }
    public void setBalance(BigDecimal balance) { this.balance = balance; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    
    public static Builder builder() { return new Builder(); }
    
    public static class Builder {
        private final Card card = new Card();
        public Builder id(String id) { card.id = id; return this; }
        public Builder userId(String userId) { card.userId = userId; return this; }
        public Builder accountId(String accountId) { card.accountId = accountId; return this; }
        public Builder name(String name) { card.name = name; return this; }
        public Builder cardNo(String cardNo) { card.cardNo = cardNo; return this; }
        public Builder cardType(CardType cardType) { card.cardType = cardType; return this; }
        public Builder cvv(String cvv) { card.cvv = cvv; return this; }
        public Builder expiryDate(String expiryDate) { card.expiryDate = expiryDate; return this; }
        public Builder status(String status) { card.status = status; return this; }
        public Builder limit(BigDecimal limit) { card.limit = limit; return this; }
        public Builder availableLimit(BigDecimal availableLimit) { card.availableLimit = availableLimit; return this; }
        public Builder balance(BigDecimal balance) { card.balance = balance; return this; }
        public Builder createdAt(LocalDateTime createdAt) { card.createdAt = createdAt; return this; }
        public Card build() { return card; }
    }
}