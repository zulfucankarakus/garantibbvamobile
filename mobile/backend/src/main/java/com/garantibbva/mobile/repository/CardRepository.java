package com.garantibbva.mobile.repository;

import com.garantibbva.mobile.entity.Card;
import com.garantibbva.mobile.enums.CardType;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CardRepository extends MongoRepository<Card, String> {
    
    List<Card> findByUserId(String userId);
    
    List<Card> findByAccountId(String accountId);
    
    List<Card> findByUserIdAndCardType(String userId, CardType cardType);
    
    Optional<Card> findByCardNo(String cardNo);
}