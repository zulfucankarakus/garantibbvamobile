package com.garantibbva.mobile.dto.response;

import com.garantibbva.mobile.enums.CardType;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public class CardResponse {
    private String id;
    private String userId;
    private String accountId;
    private String name;
    private String cardNo;
    private CardType cardType;
    private String cvv;
    private String expiryDate;
    private String status;
    private BigDecimal limit;
    private BigDecimal availableLimit;
    private BigDecimal balance;
    private LinkedAccountResponse linkedAccount;
    private LocalDateTime createdAt;
    
    public CardResponse() {}
    
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
    public LinkedAccountResponse getLinkedAccount() { return linkedAccount; }
    public void setLinkedAccount(LinkedAccountResponse linkedAccount) { this.linkedAccount = linkedAccount; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    
    public static Builder builder() { return new Builder(); }
    
    public static class Builder {
        private final CardResponse r = new CardResponse();
        public Builder id(String id) { r.id = id; return this; }
        public Builder userId(String userId) { r.userId = userId; return this; }
        public Builder accountId(String accountId) { r.accountId = accountId; return this; }
        public Builder name(String name) { r.name = name; return this; }
        public Builder cardNo(String cardNo) { r.cardNo = cardNo; return this; }
        public Builder cardType(CardType cardType) { r.cardType = cardType; return this; }
        public Builder cvv(String cvv) { r.cvv = cvv; return this; }
        public Builder expiryDate(String expiryDate) { r.expiryDate = expiryDate; return this; }
        public Builder status(String status) { r.status = status; return this; }
        public Builder limit(BigDecimal limit) { r.limit = limit; return this; }
        public Builder availableLimit(BigDecimal availableLimit) { r.availableLimit = availableLimit; return this; }
        public Builder balance(BigDecimal balance) { r.balance = balance; return this; }
        public Builder linkedAccount(LinkedAccountResponse linkedAccount) { r.linkedAccount = linkedAccount; return this; }
        public Builder createdAt(LocalDateTime createdAt) { r.createdAt = createdAt; return this; }
        public CardResponse build() { return r; }
    }
    
    public static class LinkedAccountResponse {
        private String id;
        private String name;
        private String accountNo;
        private BigDecimal balance;
        
        public LinkedAccountResponse() {}
        
        public String getId() { return id; }
        public void setId(String id) { this.id = id; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getAccountNo() { return accountNo; }
        public void setAccountNo(String accountNo) { this.accountNo = accountNo; }
        public BigDecimal getBalance() { return balance; }
        public void setBalance(BigDecimal balance) { this.balance = balance; }
        
        public static LABuilder builder() { return new LABuilder(); }
        
        public static class LABuilder {
            private final LinkedAccountResponse r = new LinkedAccountResponse();
            public LABuilder id(String id) { r.id = id; return this; }
            public LABuilder name(String name) { r.name = name; return this; }
            public LABuilder accountNo(String accountNo) { r.accountNo = accountNo; return this; }
            public LABuilder balance(BigDecimal balance) { r.balance = balance; return this; }
            public LinkedAccountResponse build() { return r; }
        }
    }
}