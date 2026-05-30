package com.garantibbva.akillibirikim.dto;

import lombok.Data;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

@Data
public class ContributeRequest {
    @NotNull(message = "Tutar gerekli")
    @Positive(message = "Tutar pozitif olmalı")
    private Double amount;
}
