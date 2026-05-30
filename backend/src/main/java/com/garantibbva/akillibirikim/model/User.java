package com.garantibbva.akillibirikim.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.Indexed;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "users")
public class User {
    @Id
    private String id;
    
    @Indexed(unique = true)
    private String tcNo;
    
    @Indexed(unique = true)
    private String customerNo;
    
    private String name;
    private String email;
    private String phone;
    private String password;
    private String role;
    private String profileImage;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
