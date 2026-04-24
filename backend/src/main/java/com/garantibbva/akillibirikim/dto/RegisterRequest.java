package com.garantibbva.akillibirikim.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterRequest {
    @NotBlank(message = "TC Kimlik No gerekli")
    @Size(min = 11, max = 11, message = "TC Kimlik No 11 haneli olmalı")
    @JsonAlias({"tc_no", "tcNo"})
    private String tcNo;
    
    @NotBlank(message = "İsim gerekli")
    private String name;
    
    @NotBlank(message = "E-posta gerekli")
    private String email;
    
    @NotBlank(message = "Telefon gerekli")
    private String phone;
    
    @NotBlank(message = "Şifre gerekli")
    @Size(min = 6, message = "Şifre en az 6 karakter olmalı")
    private String password;
}
