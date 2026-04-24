package com.garantibbva.mobile.entity;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "users")
public class User {
    
    @Id
    private String id;
    private String name;
    @Indexed(unique = true)
    private String tcNo;
    @Indexed(unique = true)
    private String customerNo;
    @Indexed(unique = true)
    private String email;
    private String phone;
    private String password;
    private String role = "customer";
    private String profileImage;
    @CreatedDate
    private LocalDateTime createdAt;
    
    public User() {}
    
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getTcNo() { return tcNo; }
    public void setTcNo(String tcNo) { this.tcNo = tcNo; }
    public String getCustomerNo() { return customerNo; }
    public void setCustomerNo(String customerNo) { this.customerNo = customerNo; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public String getProfileImage() { return profileImage; }
    public void setProfileImage(String profileImage) { this.profileImage = profileImage; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    
    public static Builder builder() { return new Builder(); }
    
    public static class Builder {
        private final User user = new User();
        public Builder id(String id) { user.id = id; return this; }
        public Builder name(String name) { user.name = name; return this; }
        public Builder tcNo(String tcNo) { user.tcNo = tcNo; return this; }
        public Builder customerNo(String customerNo) { user.customerNo = customerNo; return this; }
        public Builder email(String email) { user.email = email; return this; }
        public Builder phone(String phone) { user.phone = phone; return this; }
        public Builder password(String password) { user.password = password; return this; }
        public Builder role(String role) { user.role = role; return this; }
        public Builder profileImage(String profileImage) { user.profileImage = profileImage; return this; }
        public Builder createdAt(LocalDateTime createdAt) { user.createdAt = createdAt; return this; }
        public User build() { return user; }
    }
}