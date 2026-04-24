package com.garantibbva.mobile.repository;

import com.garantibbva.mobile.entity.Account;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AccountRepository extends MongoRepository<Account, String> {
    
    List<Account> findByUserId(String userId);
    
    Optional<Account> findByIban(String iban);
    
    Optional<Account> findByAccountNo(String accountNo);
    
    long countByUserId(String userId);
}