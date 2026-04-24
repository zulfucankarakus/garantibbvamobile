package com.garantibbva.akillibirikim.repository;

import com.garantibbva.akillibirikim.model.User;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends MongoRepository<User, String> {
    Optional<User> findByTcNo(String tcNo);
    Optional<User> findByCustomerNo(String customerNo);
    Optional<User> findByEmail(String email);
    boolean existsByTcNo(String tcNo);
    boolean existsByEmail(String email);
}
