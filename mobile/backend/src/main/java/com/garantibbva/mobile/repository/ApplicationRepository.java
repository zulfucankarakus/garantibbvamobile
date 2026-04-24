package com.garantibbva.mobile.repository;

import com.garantibbva.mobile.entity.Application;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ApplicationRepository extends MongoRepository<Application, String> {
    
    List<Application> findByUserIdOrderByCreatedAtDesc(String userId);
}