package com.garantibbva.mobile.dto.request;

import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;

public class QRGenerateRequest {
    
    @NotBlank(message = "Hesap ID boş olamaz")
    private String accountId;
    private BigDecimal amount;
    private String description;
    
    public QRGenerateRequest() {}
    
    public String getAccountId() { return accountId; }
    public void setAccountId(String accountId) { this.accountId = accountId; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
}