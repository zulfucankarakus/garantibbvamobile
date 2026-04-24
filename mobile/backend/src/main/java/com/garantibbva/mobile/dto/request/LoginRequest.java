package com.garantibbva.mobile.dto.request;

import jakarta.validation.constraints.NotBlank;

public class LoginRequest {
    
    @NotBlank(message = "TC Kimlik No veya Müşteri No boş olamaz")
    private String identifier;
    
    @NotBlank(message = "Şifre boş olamaz")
    private String password;
    
    public LoginRequest() {}
    
    public String getIdentifier() { return identifier; }
    public void setIdentifier(String identifier) { this.identifier = identifier; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
}