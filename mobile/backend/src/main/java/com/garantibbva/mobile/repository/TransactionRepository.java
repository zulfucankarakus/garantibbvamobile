package com.garantibbva.mobile.repository;

import com.garantibbva.mobile.entity.Transaction;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TransactionRepository extends MongoRepository<Transaction, String> {
    
    List<Transaction> findByUserIdOrderByCreatedAtDesc(String userId, Pageable pageable);
    
    List<Transaction> findByFromAccountIdOrderByCreatedAtDesc(String accountId);
    
    List<Transaction> findByUserIdOrderByCreatedAtDesc(String userId);
}