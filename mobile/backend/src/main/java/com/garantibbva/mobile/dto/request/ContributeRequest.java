package com.garantibbva.mobile.dto.request;

import java.math.BigDecimal;

public class ContributeRequest {
    private BigDecimal amount;
    private String note;
    
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
}