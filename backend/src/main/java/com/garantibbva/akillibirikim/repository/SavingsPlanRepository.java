package com.garantibbva.akillibirikim.repository;

import com.garantibbva.akillibirikim.model.SavingsPlan;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SavingsPlanRepository extends MongoRepository<SavingsPlan, String> {
    List<SavingsPlan> findByOdtUserId(String userId);
    List<SavingsPlan> findByOdtUserIdAndStatus(String userId, String status);
}
