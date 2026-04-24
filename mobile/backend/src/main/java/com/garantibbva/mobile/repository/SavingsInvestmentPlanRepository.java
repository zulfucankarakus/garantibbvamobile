package com.garantibbva.mobile.repository;

import com.garantibbva.mobile.entity.SavingsInvestmentPlan;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SavingsInvestmentPlanRepository extends MongoRepository<SavingsInvestmentPlan, String> {
    
    List<SavingsInvestmentPlan> findByUserIdOrderByCreatedAtDesc(String userId);
    
    List<SavingsInvestmentPlan> findByUserIdAndStatusOrderByCreatedAtDesc(String userId, String status);
    
    Optional<SavingsInvestmentPlan> findByIdAndUserId(String id, String userId);
    
    void deleteByIdAndUserId(String id, String userId);
    
    long countByUserId(String userId);
}