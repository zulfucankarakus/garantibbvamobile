package com.garantibbva.mobile.dto.request;

import com.garantibbva.mobile.enums.AccountType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class CreateDebitCardWithAccountRequest {
    
    @NotBlank(message = "Kart adı boş olamaz")
    private String cardName;
    
    @NotBlank(message = "Hesap adı boş olamaz")
    private String accountName;
    
    @NotNull(message = "Hesap tipi seçilmelidir")
    private AccountType accountType;
    
    public CreateDebitCardWithAccountRequest() {}
    
    public String getCardName() { return cardName; }
    public void setCardName(String cardName) { this.cardName = cardName; }
    public String getAccountName() { return accountName; }
    public void setAccountName(String accountName) { this.accountName = accountName; }
    public AccountType getAccountType() { return accountType; }
    public void setAccountType(AccountType accountType) { this.accountType = accountType; }
}