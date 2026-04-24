package com.garantibbva.mobile.entity;

import com.garantibbva.mobile.enums.AccountType;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Document(collection = "accounts")
public class Account {
    
    @Id
    private String id;
    @Indexed
    private String userId;
    private String name;
    @Indexed(unique = true)
    private String accountNo;
    @Indexed(unique = true)
    private String iban;
    private AccountType accountType;
    private BigDecimal balance = BigDecimal.ZERO;
    @CreatedDate
    private LocalDateTime createdAt;
    
    public Account() {}
    
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getAccountNo() { return accountNo; }
    public void setAccountNo(String accountNo) { this.accountNo = accountNo; }
    public String getIban() { return iban; }
    public void setIban(String iban) { this.iban = iban; }
    public AccountType getAccountType() { return accountType; }
    public void setAccountType(AccountType accountType) { this.accountType = accountType; }
    public BigDecimal getBalance() { return balance; }
    public void setBalance(BigDecimal balance) { this.balance = balance; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    
    public static Builder builder() { return new Builder(); }
    
    public static class Builder {
        private final Account account = new Account();
        public Builder id(String id) { account.id = id; return this; }
        public Builder userId(String userId) { account.userId = userId; return this; }
        public Builder name(String name) { account.name = name; return this; }
        public Builder accountNo(String accountNo) { account.accountNo = accountNo; return this; }
        public Builder iban(String iban) { account.iban = iban; return this; }
        public Builder accountType(AccountType accountType) { account.accountType = accountType; return this; }
        public Builder balance(BigDecimal balance) { account.balance = balance; return this; }
        public Builder createdAt(LocalDateTime createdAt) { account.createdAt = createdAt; return this; }
        public Account build() { return account; }
    }
}