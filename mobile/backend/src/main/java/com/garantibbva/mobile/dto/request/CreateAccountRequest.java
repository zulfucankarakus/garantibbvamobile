package com.garantibbva.mobile.dto.request;

import com.garantibbva.mobile.enums.AccountType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class CreateAccountRequest {
    
    @NotBlank(message = "Hesap adı boş olamaz")
    private String name;
    
    @NotNull(message = "Hesap tipi seçilmelidir")
    private AccountType accountType;
    
    public CreateAccountRequest() {}
    
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public AccountType getAccountType() { return accountType; }
    public void setAccountType(AccountType accountType) { this.accountType = accountType; }
}