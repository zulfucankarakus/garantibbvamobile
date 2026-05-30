package com.garantibbva.akillibirikim.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "verification_codes")
public class VerificationCode {
    @Id
    private String id;
    
    private String target;
    private String code;
    private String type;
    private LocalDateTime expiresAt;
    private LocalDateTime createdAt;
}
