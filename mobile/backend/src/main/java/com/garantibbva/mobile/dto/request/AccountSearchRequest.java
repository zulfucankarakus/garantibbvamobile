package com.garantibbva.mobile.dto.request;

import jakarta.validation.constraints.NotBlank;

public class AccountSearchRequest {
    
    @NotBlank(message = "Arama sorgusu boş olamaz")
    private String query;
    
    public AccountSearchRequest() {}
    
    public String getQuery() { return query; }
    public void setQuery(String query) { this.query = query; }
}