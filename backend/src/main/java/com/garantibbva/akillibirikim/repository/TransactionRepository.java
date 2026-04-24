package com.garantibbva.akillibirikim.repository;

import com.garantibbva.akillibirikim.model.Transaction;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TransactionRepository extends MongoRepository<Transaction, String> {
    List<Transaction> findByOdtUserIdOrderByTransactionDateDesc(String userId);
    List<Transaction> findByAccountIdOrderByTransactionDateDesc(String accountId);
}
