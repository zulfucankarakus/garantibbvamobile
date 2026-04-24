package com.garantibbva.mobile.entity;

import com.garantibbva.mobile.enums.TransactionStatus;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Document(collection = "transactions")
public class Transaction {
    
    @Id
    private String id;
    @Indexed
    private String userId;
    private String fromAccountId;
    private String toAccountId;
    private String toAccountIban;
    private BigDecimal amount;
    private String description;
    private TransactionStatus status = TransactionStatus.PENDING;
    private String transactionType;
    @CreatedDate
    private LocalDateTime createdAt;
    
    public Transaction() {}
    
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
        private final Transaction tx = new Transaction();
        public Builder id(String id) { tx.id = id; return this; }
        public Builder userId(String userId) { tx.userId = userId; return this; }
        public Builder fromAccountId(String fromAccountId) { tx.fromAccountId = fromAccountId; return this; }
        public Builder toAccountId(String toAccountId) { tx.toAccountId = toAccountId; return this; }
        public Builder toAccountIban(String toAccountIban) { tx.toAccountIban = toAccountIban; return this; }
        public Builder amount(BigDecimal amount) { tx.amount = amount; return this; }
        public Builder description(String description) { tx.description = description; return this; }
        public Builder status(TransactionStatus status) { tx.status = status; return this; }
        public Builder transactionType(String transactionType) { tx.transactionType = transactionType; return this; }
        public Builder createdAt(LocalDateTime createdAt) { tx.createdAt = createdAt; return this; }
        public Transaction build() { return tx; }
    }
}