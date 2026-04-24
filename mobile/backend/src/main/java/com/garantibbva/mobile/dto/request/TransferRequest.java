package com.garantibbva.mobile.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public class TransferRequest {
    
    @NotBlank(message = "Gönderen hesap ID boş olamaz")
    private String fromAccountId;
    
    @NotBlank(message = "Alıcı IBAN boş olamaz")
    private String toAccountIban;
    
    @NotNull(message = "Tutar boş olamaz")
    @DecimalMin(value = "0.01", message = "Tutar 0'dan büyük olmalıdır")
    private BigDecimal amount;
    
    private String description;
    
    public TransferRequest() {}
    
    public String getFromAccountId() { return fromAccountId; }
    public void setFromAccountId(String fromAccountId) { this.fromAccountId = fromAccountId; }
    public String getToAccountIban() { return toAccountIban; }
    public void setToAccountIban(String toAccountIban) { this.toAccountIban = toAccountIban; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
}