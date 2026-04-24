package com.garantibbva.mobile.dto.response;

public class AuthResponse {
    private String accessToken;
    private String tokenType;
    private UserResponse user;
    
    public AuthResponse() {}
    
    public String getAccessToken() { return accessToken; }
    public void setAccessToken(String accessToken) { this.accessToken = accessToken; }
    public String getTokenType() { return tokenType; }
    public void setTokenType(String tokenType) { this.tokenType = tokenType; }
    public UserResponse getUser() { return user; }
    public void setUser(UserResponse user) { this.user = user; }
    
    public static Builder builder() { return new Builder(); }
    
    public static class Builder {
        private final AuthResponse r = new AuthResponse();
        public Builder accessToken(String accessToken) { r.accessToken = accessToken; return this; }
        public Builder tokenType(String tokenType) { r.tokenType = tokenType; return this; }
        public Builder user(UserResponse user) { r.user = user; return this; }
        public AuthResponse build() { return r; }
    }
}