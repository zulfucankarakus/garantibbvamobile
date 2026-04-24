package com.garantibbva.mobile.dto.response;

import com.garantibbva.mobile.enums.TransactionStatus;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public class TransactionResponse {
    private String id;
    private String userId;
    private String fromAccountId;
    private String toAccountId;
    private String toAccountIban;
    private BigDecimal amount;
    private String description;
    private TransactionStatus status;
    private String transactionType;
    private LocalDateTime createdAt;
    
    public TransactionResponse() {}
    
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getFromAccountId() { return fromAccountId; }
    public void setFromAccountId(String fromAccountId) { this.fromAccountId = fromAccountId; }
    public String getToAccountId() { return toAccountId; }
    public void setToAccountId(String toAccountId) { this.toAccountId = toAccountId; }
    public String getToAccountIban() { return toAccountIban; }
    public void setToAccountIban(String toAccountIban) { this.toAccountIban = toAccountIban; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public TransactionStatus getStatus() { return status; }
    public void setStatus(TransactionStatus status) { this.status = status; }
    public String getTransactionType() { return transactionType; }
    public void setTransactionType(String transactionType) { this.transactionType = transactionType; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    
    public static Builder builder() { return new Builder(); }
    
    public static class Builder {
        private final TransactionResponse r = new TransactionResponse();
        public Builder id(String id) { r.id = id; return this; }
        public Builder userId(String userId) { r.userId = userId; return this; }
        public Builder fromAccountId(String fromAccountId) { r.fromAccountId = fromAccountId; return this; }
        public Builder toAccountId(String toAccountId) { r.toAccountId = toAccountId; return this; }
        public Builder toAccountIban(String toAccountIban) { r.toAccountIban = toAccountIban; return this; }
        public Builder amount(BigDecimal amount) { r.amount = amount; return this; }
        public Builder description(String description) { r.description = description; return this; }
        public Builder status(TransactionStatus status) { r.status = status; return this; }
        public Builder transactionType(String transactionType) { r.transactionType = transactionType; return this; }
        public Builder createdAt(LocalDateTime createdAt) { r.createdAt = createdAt; return this; }
        public TransactionResponse build() { return r; }
    }
}