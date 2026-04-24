package com.garantibbva.mobile.dto.response;

import com.garantibbva.mobile.enums.AccountType;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public class AccountResponse {
    private String id;
    private String userId;
    private String name;
    private String accountNo;
    private String iban;
    private AccountType accountType;
    private BigDecimal balance;
    private LocalDateTime createdAt;
    
    public AccountResponse() {}
    
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
        private final AccountResponse r = new AccountResponse();
        public Builder id(String id) { r.id = id; return this; }
        public Builder userId(String userId) { r.userId = userId; return this; }
        public Builder name(String name) { r.name = name; return this; }
        public Builder accountNo(String accountNo) { r.accountNo = accountNo; return this; }
        public Builder iban(String iban) { r.iban = iban; return this; }
        public Builder accountType(AccountType accountType) { r.accountType = accountType; return this; }
        public Builder balance(BigDecimal balance) { r.balance = balance; return this; }
        public Builder createdAt(LocalDateTime createdAt) { r.createdAt = createdAt; return this; }
        public AccountResponse build() { return r; }
    }
}