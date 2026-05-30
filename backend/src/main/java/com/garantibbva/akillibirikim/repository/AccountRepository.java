package com.garantibbva.akillibirikim.repository;

import com.garantibbva.akillibirikim.model.Account;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AccountRepository extends MongoRepository<Account, String> {
    List<Account> findByOdtUserId(String userId);
}
