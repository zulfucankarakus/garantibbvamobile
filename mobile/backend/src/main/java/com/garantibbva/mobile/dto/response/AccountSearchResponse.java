package com.garantibbva.mobile.dto.response;

import com.garantibbva.mobile.enums.AccountType;

public class AccountSearchResponse {
    private String accountId;
    private String accountNo;
    private String iban;
    private String name;
    private AccountType accountType;
    private String userName;
    
    public AccountSearchResponse() {}
    
    public String getAccountId() { return accountId; }
    public void setAccountId(String accountId) { this.accountId = accountId; }
    public String getAccountNo() { return accountNo; }
    public void setAccountNo(String accountNo) { this.accountNo = accountNo; }
    public String getIban() { return iban; }
    public void setIban(String iban) { this.iban = iban; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public AccountType getAccountType() { return accountType; }
    public void setAccountType(AccountType accountType) { this.accountType = accountType; }
    public String getUserName() { return userName; }
    public void setUserName(String userName) { this.userName = userName; }
    
    public static Builder builder() { return new Builder(); }
    
    public static class Builder {
        private final AccountSearchResponse r = new AccountSearchResponse();
        public Builder accountId(String accountId) { r.accountId = accountId; return this; }
        public Builder accountNo(String accountNo) { r.accountNo = accountNo; return this; }
        public Builder iban(String iban) { r.iban = iban; return this; }
        public Builder name(String name) { r.name = name; return this; }
        public Builder accountType(AccountType accountType) { r.accountType = accountType; return this; }
        public Builder userName(String userName) { r.userName = userName; return this; }
        public AccountSearchResponse build() { return r; }
    }
}