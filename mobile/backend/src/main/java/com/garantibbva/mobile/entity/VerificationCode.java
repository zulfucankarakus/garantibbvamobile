package com.garantibbva.mobile.entity;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "verification_codes")
public class VerificationCode {
    
    @Id
    private String id;
    private String identifier;
    private String code;
    private String type;
    private boolean verified = false;
    @CreatedDate
    private LocalDateTime createdAt;
    
    public VerificationCode() {}
    
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getIdentifier() { return identifier; }
    public void setIdentifier(String identifier) { this.identifier = identifier; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public boolean isVerified() { return verified; }
    public void setVerified(boolean verified) { this.verified = verified; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    
    public static Builder builder() { return new Builder(); }
    
    public static class Builder {
        private final VerificationCode vc = new VerificationCode();
        public Builder id(String id) { vc.id = id; return this; }
        public Builder identifier(String identifier) { vc.identifier = identifier; return this; }
        public Builder code(String code) { vc.code = code; return this; }
        public Builder type(String type) { vc.type = type; return this; }
        public Builder verified(boolean verified) { vc.verified = verified; return this; }
        public Builder createdAt(LocalDateTime createdAt) { vc.createdAt = createdAt; return this; }
        public VerificationCode build() { return vc; }
    }
}