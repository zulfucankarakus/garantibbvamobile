package com.garantibbva.mobile.repository;

import com.garantibbva.mobile.entity.VerificationCode;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface VerificationCodeRepository extends MongoRepository<VerificationCode, String> {
    
    Optional<VerificationCode> findByIdentifierAndCodeAndTypeAndVerifiedFalseAndCreatedAtAfter(
        String identifier, 
        String code, 
        String type, 
        LocalDateTime after
    );
}