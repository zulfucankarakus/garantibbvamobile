package com.garantibbva.akillibirikim.dto;

import lombok.Data;
import lombok.Builder;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class UserResponse {
    private String id;
    private String name;
    private String customerNo;
    private String tcNo;
    private String email;
    private String phone;
    private String profileImage;
}
