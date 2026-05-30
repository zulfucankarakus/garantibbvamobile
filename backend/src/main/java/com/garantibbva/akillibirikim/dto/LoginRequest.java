package com.garantibbva.akillibirikim.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LoginRequest {
    @NotBlank(message = "TC Kimlik No veya Müşteri No gerekli")
    private String identifier;
    
    @NotBlank(message = "Şifre gerekli")
    private String password;
}
