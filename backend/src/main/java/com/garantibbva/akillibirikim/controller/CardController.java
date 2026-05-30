package com.garantibbva.akillibirikim.controller;

import com.garantibbva.akillibirikim.model.Card;
import com.garantibbva.akillibirikim.model.Transaction;
import com.garantibbva.akillibirikim.model.User;
import com.garantibbva.akillibirikim.repository.CardRepository;
import com.garantibbva.akillibirikim.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/cards")
@RequiredArgsConstructor
public class CardController {
    
    private final CardRepository cardRepository;
    private final TransactionRepository transactionRepository;
    
    @GetMapping
    public ResponseEntity<List<Card>> getCards(@AuthenticationPrincipal User user) {
        List<Card> cards = cardRepository.findByOdtUserId(user.getId());
        
        // Eğer kart yoksa varsayılan kartlar oluştur
        if (cards.isEmpty()) {
            cards = createDefaultCards(user.getId());
        }
        
        return ResponseEntity.ok(cards);
    }
    
    @PostMapping
    public ResponseEntity<Card> createCard(
            @RequestBody Map<String, Object> request,
            @AuthenticationPrincipal User user) {
        
        String cardNo = generateCardNo();
        
        Card card = Card.builder()
                .odtUserId(user.getId())
                .cardName((String) request.getOrDefault("card_name", "Yeni Kart"))
                .cardType((String) request.getOrDefault("card_type", "credit"))
                .cardNo(cardNo)
                .lastFourDigits(cardNo.substring(cardNo.length() - 4))
                .expiryDate("12/28")
                .cardLimit(50000.0)
                .usedLimit(0.0)
                .availableLimit(50000.0)
                .status("active")
                .createdAt(LocalDateTime.now())
                .build();
        
        card = cardRepository.save(card);
        return ResponseEntity.ok(card);
    }
    
    @PostMapping("/debit-with-account")
    public ResponseEntity<Card> createDebitCard(
            @RequestBody Map<String, Object> request,
            @AuthenticationPrincipal User user) {
        
        String cardNo = generateCardNo();
        
        Card card = Card.builder()
                .odtUserId(user.getId())
                .cardName((String) request.getOrDefault("card_name", "Banka Kartı"))
                .cardType("debit")
                .cardNo(cardNo)
                .lastFourDigits(cardNo.substring(cardNo.length() - 4))
                .expiryDate("12/28")
                .linkedAccountId((String) request.get("account_id"))
                .status("active")
                .createdAt(LocalDateTime.now())
                .build();
        
        card = cardRepository.save(card);
        return ResponseEntity.ok(card);
    }
    
    @GetMapping("/{cardId}/transactions")
    public ResponseEntity<List<Transaction>> getCardTransactions(
            @PathVariable String cardId,
            @AuthenticationPrincipal User user) {
        
        Card card = cardRepository.findById(cardId)
                .orElseThrow(() -> new RuntimeException("Kart bulunamadı"));
        
        if (!card.getOdtUserId().equals(user.getId())) {
            throw new RuntimeException("Bu karta erişim yetkiniz yok");
        }
        
        // Kart işlemlerini getir (demo için boş liste)
        return ResponseEntity.ok(new ArrayList<>());
    }
    
    private List<Card> createDefaultCards(String userId) {
        List<Card> cards = new ArrayList<>();
        
        // Kredi Kartı
        String creditCardNo = generateCardNo();
        Card creditCard = Card.builder()
                .odtUserId(userId)
                .cardName("Bonus Kredi Kartı")
                .cardType("credit")
                .cardNo(creditCardNo)
                .lastFourDigits(creditCardNo.substring(creditCardNo.length() - 4))
                .expiryDate("12/28")
                .cardLimit(75000.0)
                .usedLimit(12500.0)
                .availableLimit(62500.0)
                .status("active")
                .createdAt(LocalDateTime.now())
                .build();
        cards.add(cardRepository.save(creditCard));
        
        // Banka Kartı
        String debitCardNo = generateCardNo();
        Card debitCard = Card.builder()
                .odtUserId(userId)
                .cardName("Vadesiz Hesap Kartı")
                .cardType("debit")
                .cardNo(debitCardNo)
                .lastFourDigits(debitCardNo.substring(debitCardNo.length() - 4))
                .expiryDate("12/28")
                .status("active")
                .createdAt(LocalDateTime.now())
                .build();
        cards.add(cardRepository.save(debitCard));
        
        return cards;
    }
    
    private String generateCardNo() {
        Random random = new Random();
        StringBuilder sb = new StringBuilder("5400"); // Mastercard prefix
        for (int i = 0; i < 12; i++) {
            sb.append(random.nextInt(10));
        }
        return sb.toString();
    }
}
