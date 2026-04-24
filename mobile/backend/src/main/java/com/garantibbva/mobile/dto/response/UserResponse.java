package com.garantibbva.mobile.dto.response;

public class UserResponse {
    private String id;
    private String name;
    private String tcNo;
    private String customerNo;
    private String email;
    private String phone;
    private String profileImage;
    
    public UserResponse() {}
    
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
    public String getProfileImage() { return profileImage; }
    public void setProfileImage(String profileImage) { this.profileImage = profileImage; }
    
    public static Builder builder() { return new Builder(); }
    
    public static class Builder {
        private final UserResponse r = new UserResponse();
        public Builder id(String id) { r.id = id; return this; }
        public Builder name(String name) { r.name = name; return this; }
        public Builder tcNo(String tcNo) { r.tcNo = tcNo; return this; }
        public Builder customerNo(String customerNo) { r.customerNo = customerNo; return this; }
        public Builder email(String email) { r.email = email; return this; }
        public Builder phone(String phone) { r.phone = phone; return this; }
        public Builder profileImage(String profileImage) { r.profileImage = profileImage; return this; }
        public UserResponse build() { return r; }
    }
}