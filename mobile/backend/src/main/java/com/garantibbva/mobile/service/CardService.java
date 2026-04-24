package com.garantibbva.mobile.service;

import com.garantibbva.mobile.dto.request.CreateCardRequest;
import com.garantibbva.mobile.dto.request.CreateDebitCardWithAccountRequest;
import com.garantibbva.mobile.dto.response.AccountResponse;
import com.garantibbva.mobile.dto.response.CardResponse;
import com.garantibbva.mobile.entity.Account;
import com.garantibbva.mobile.entity.Card;
import com.garantibbva.mobile.enums.CardType;
import com.garantibbva.mobile.exception.BadRequestException;
import com.garantibbva.mobile.exception.ResourceNotFoundException;
import com.garantibbva.mobile.repository.AccountRepository;
import com.garantibbva.mobile.repository.CardRepository;
import com.garantibbva.mobile.util.GeneratorUtil;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class CardService {
    
    private final CardRepository cardRepository;
    private final AccountRepository accountRepository;
    private final NotificationService notificationService;
    private final GeneratorUtil generatorUtil;
    
    public CardService(CardRepository cardRepository, AccountRepository accountRepository,
                       NotificationService notificationService, GeneratorUtil generatorUtil) {
        this.cardRepository = cardRepository;
        this.accountRepository = accountRepository;
        this.notificationService = notificationService;
        this.generatorUtil = generatorUtil;
    }
    
    public List<CardResponse> getUserCards(String userId) {
        return cardRepository.findByUserId(userId).stream()
                .map(this::mapToResponse).collect(Collectors.toList());
    }
    
    @Transactional
    public CardResponse createCard(String userId, CreateCardRequest request) {
        BigDecimal limit = null, availableLimit = null;
        if (request.getCardType() == CardType.CREDIT) {
            limit = new BigDecimal("15000.00");
            availableLimit = new BigDecimal("15000.00");
        }
        
        Card card = Card.builder()
                .userId(userId)
                .name(request.getName())
                .cardNo(generatorUtil.generateCardNo())
                .cardType(request.getCardType())
                .cvv(generatorUtil.generateCvv())
                .expiryDate(generatorUtil.generateExpiryDate())
                .status("active")
                .limit(limit)
                .availableLimit(availableLimit)
                .balance(BigDecimal.ZERO)
                .createdAt(LocalDateTime.now())
                .build();
        
        card = cardRepository.save(card);
        notificationService.createNotification(userId, "Kart Oluşturuldu",
                request.getName() + " kartınız oluşturuldu.", "success");
        
        return mapToResponse(card);
    }
    
    @Transactional
    public Map<String, Object> createDebitCardWithAccount(String userId, CreateDebitCardWithAccountRequest request) {
        String accountNo = generatorUtil.generateAccountNo();
        String iban = generatorUtil.generateIban(accountNo);
        
        Account account = Account.builder()
                .userId(userId)
                .name(request.getAccountName())
                .accountType(request.getAccountType())
                .accountNo(accountNo)
                .iban(iban)
                .balance(BigDecimal.ZERO)
                .createdAt(LocalDateTime.now())
                .build();
        account = accountRepository.save(account);
        
        Card card = Card.builder()
                .userId(userId)
                .accountId(account.getId())
                .name(request.getCardName())
                .cardNo(generatorUtil.generateCardNo())
                .cardType(CardType.DEBIT)
                .cvv(generatorUtil.generateCvv())
                .expiryDate(generatorUtil.generateExpiryDate())
                .status("active")
                .balance(BigDecimal.ZERO)
                .createdAt(LocalDateTime.now())
                .build();
        card = cardRepository.save(card);
        
        notificationService.createNotification(userId, "Hesap ve Kart Oluşturuldu",
                request.getCardName() + " ve " + request.getAccountName() + " oluşturuldu.", "success");
        
        Map<String, Object> response = new HashMap<>();
        response.put("account", mapAccountToResponse(account));
        response.put("card", mapToResponse(card));
        response.put("message", "Banka kartı ve hesap oluşturuldu");
        return response;
    }
    
    @Transactional
    public Map<String, Object> deleteCard(String cardId, String userId) {
        Card card = cardRepository.findById(cardId)
                .orElseThrow(() -> new ResourceNotFoundException("Kart bulunamadı"));
        if (!card.getUserId().equals(userId)) {
            throw new ResourceNotFoundException("Kart bulunamadı");
        }
        
        if (card.getCardType() == CardType.CREDIT && card.getBalance().compareTo(BigDecimal.ZERO) > 0) {
            throw new BadRequestException("Kredi kartınızda " + card.getBalance() + " TL borç bulunmaktadır");
        }
        
        cardRepository.delete(card);
        notificationService.createNotification(userId, "Kart Kapatıldı",
                card.getName() + " kapatıldı.", "info");
        
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Kart kapatıldı");
        response.put("status", "success");
        return response;
    }
    
    private CardResponse mapToResponse(Card card) {
        CardResponse.LinkedAccountResponse linkedAccount = null;
        if (card.getAccountId() != null) {
            Account account = accountRepository.findById(card.getAccountId()).orElse(null);
            if (account != null) {
                card.setBalance(account.getBalance());
                linkedAccount = CardResponse.LinkedAccountResponse.builder()
                        .id(account.getId())
                        .name(account.getName())
                        .accountNo(account.getAccountNo())
                        .balance(account.getBalance())
                        .build();
            }
        }
        
        return CardResponse.builder()
                .id(card.getId())
                .userId(card.getUserId())
                .accountId(card.getAccountId())
                .name(card.getName())
                .cardNo(card.getCardNo())
                .cardType(card.getCardType())
                .cvv(card.getCvv())
                .expiryDate(card.getExpiryDate())
                .status(card.getStatus())
                .limit(card.getLimit())
                .availableLimit(card.getAvailableLimit())
                .balance(card.getBalance())
                .linkedAccount(linkedAccount)
                .createdAt(card.getCreatedAt())
                .build();
    }
    
    private AccountResponse mapAccountToResponse(Account account) {
        return AccountResponse.builder()
                .id(account.getId())
                .userId(account.getUserId())
                .name(account.getName())
                .accountNo(account.getAccountNo())
                .iban(account.getIban())
                .accountType(account.getAccountType())
                .balance(account.getBalance())
                .createdAt(account.getCreatedAt())
                .build();
    }
}