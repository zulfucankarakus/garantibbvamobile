package com.garantibbva.akillibirikim.repository;

import com.garantibbva.akillibirikim.model.VerificationCode;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface VerificationCodeRepository extends MongoRepository<VerificationCode, String> {
    Optional<VerificationCode> findByTargetAndTypeOrderByCreatedAtDesc(String target, String type);
    void deleteByTarget(String target);
}
