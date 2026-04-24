package com.garantibbva.mobile.dto.request;

import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;

public class QRPaymentRequest {
    
    @NotBlank(message = "QR kod boş olamaz")
    private String qrCode;
    
    @NotBlank(message = "Gönderen hesap ID boş olamaz")
    private String fromAccountId;
    
    private BigDecimal amount;
    
    public QRPaymentRequest() {}
    
    public String getQrCode() { return qrCode; }
    public void setQrCode(String qrCode) { this.qrCode = qrCode; }
    public String getFromAccountId() { return fromAccountId; }
    public void setFromAccountId(String fromAccountId) { this.fromAccountId = fromAccountId; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
}