package com.garantibbva.akillibirikim.repository;

import com.garantibbva.akillibirikim.model.FinancialGoal;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FinancialGoalRepository extends MongoRepository<FinancialGoal, String> {
    List<FinancialGoal> findByOdtUserId(String userId);
}
