package com.garantibbva.mobile.service;

import com.garantibbva.mobile.dto.request.CreateAccountRequest;
import com.garantibbva.mobile.dto.response.AccountResponse;
import com.garantibbva.mobile.dto.response.AccountSearchResponse;
import com.garantibbva.mobile.entity.Account;
import com.garantibbva.mobile.entity.Card;
import com.garantibbva.mobile.enums.AccountType;
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
public class AccountService {
    
    private final AccountRepository accountRepository;
    private final CardRepository cardRepository;
    private final NotificationService notificationService;
    private final GeneratorUtil generatorUtil;
    
    public AccountService(AccountRepository accountRepository, CardRepository cardRepository,
                          NotificationService notificationService, GeneratorUtil generatorUtil) {
        this.accountRepository = accountRepository;
        this.cardRepository = cardRepository;
        this.notificationService = notificationService;
        this.generatorUtil = generatorUtil;
    }
    
    public List<AccountResponse> getUserAccounts(String userId) {
        return accountRepository.findByUserId(userId).stream()
                .map(this::mapToResponse).collect(Collectors.toList());
    }
    
    @Transactional
    public AccountResponse createAccount(String userId, CreateAccountRequest request) {
        String accountNo = generatorUtil.generateAccountNo();
        String iban = generatorUtil.generateIban(accountNo);
        
        Account account = Account.builder()
                .userId(userId)
                .name(request.getName())
                .accountType(request.getAccountType())
                .accountNo(accountNo)
                .iban(iban)
                .balance(BigDecimal.ZERO)
                .createdAt(LocalDateTime.now())
                .build();
        
        account = accountRepository.save(account);
        
        if (request.getAccountType() == AccountType.CHECKING || request.getAccountType() == AccountType.MEAL) {
            createLinkedDebitCard(userId, account);
        }
        
        notificationService.createNotification(userId, "Hesap Oluşturuldu",
                request.getName() + " hesabınız oluşturuldu.", "success");
        
        return mapToResponse(account);
    }
    
    public AccountResponse getAccountById(String accountId, String userId) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Hesap bulunamadı"));
        if (!account.getUserId().equals(userId)) {
            throw new ResourceNotFoundException("Hesap bulunamadı");
        }
        return mapToResponse(account);
    }
    
    @Transactional
    public AccountResponse addBalance(String accountId, String userId, BigDecimal amount) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Hesap bulunamadı"));
        if (!account.getUserId().equals(userId)) {
            throw new ResourceNotFoundException("Hesap bulunamadı");
        }
        
        account.setBalance(account.getBalance().add(amount));
        account = accountRepository.save(account);
        updateLinkedCardsBalance(accountId, account.getBalance());
        
        notificationService.createNotification(userId, "Bakiye Eklendi",
                amount + " TL eklendi. Yeni bakiye: " + account.getBalance() + " TL", "success");
        
        return mapToResponse(account);
    }
    
    @Transactional
    public Map<String, Object> deleteAccount(String accountId, String userId, String targetAccountId) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Hesap bulunamadı"));
        if (!account.getUserId().equals(userId)) {
            throw new ResourceNotFoundException("Hesap bulunamadı");
        }
        
        List<Account> allAccounts = accountRepository.findByUserId(userId);
        if (allAccounts.size() <= 1) {
            throw new BadRequestException("Son hesabınızı kapatamazsınız");
        }
        
        if (account.getBalance().compareTo(BigDecimal.ZERO) > 0) {
            if (targetAccountId == null || targetAccountId.isEmpty()) {
                List<AccountResponse> otherAccounts = allAccounts.stream()
                        .filter(a -> !a.getId().equals(accountId))
                        .map(this::mapToResponse).collect(Collectors.toList());
                
                Map<String, Object> response = new HashMap<>();
                response.put("requires_transfer", true);
                response.put("balance", account.getBalance());
                response.put("available_accounts", otherAccounts);
                return response;
            }
            
            Account targetAccount = accountRepository.findById(targetAccountId)
                    .orElseThrow(() -> new ResourceNotFoundException("Hedef hesap bulunamadı"));
            
            BigDecimal transferAmount = account.getBalance();
            targetAccount.setBalance(targetAccount.getBalance().add(transferAmount));
            accountRepository.save(targetAccount);
            
            account.setBalance(BigDecimal.ZERO);
            accountRepository.save(account);
        }
        
        cardRepository.deleteAll(cardRepository.findByAccountId(accountId));
        accountRepository.delete(account);
        
        notificationService.createNotification(userId, "Hesap Kapatıldı",
                account.getName() + " hesabınız kapatıldı.", "info");
        
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Hesap kapatıldı");
        response.put("status", "success");
        return response;
    }
    
    public AccountSearchResponse searchAccount(String query) {
        Account account = accountRepository.findByIban(query.trim())
                .orElseGet(() -> accountRepository.findByAccountNo(query.trim()).orElse(null));
        if (account == null) {
            throw new ResourceNotFoundException("Hesap bulunamadı");
        }
        return AccountSearchResponse.builder()
                .accountId(account.getId())
                .accountNo(account.getAccountNo())
                .iban(account.getIban())
                .name(account.getName())
                .accountType(account.getAccountType())
                .userName("Gizli")
                .build();
    }
    
    @Transactional
    public void updateBalance(String accountId, BigDecimal newBalance) {
        accountRepository.findById(accountId).ifPresent(account -> {
            account.setBalance(newBalance);
            accountRepository.save(account);
            updateLinkedCardsBalance(accountId, newBalance);
        });
    }
    
    public Account getAccountEntityById(String accountId) {
        return accountRepository.findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Hesap bulunamadı"));
    }
    
    public Account getAccountByIban(String iban) {
        return accountRepository.findByIban(iban)
                .orElseThrow(() -> new ResourceNotFoundException("Alıcı hesap bulunamadı"));
    }
    
    private void createLinkedDebitCard(String userId, Account account) {
        String cardName = account.getAccountType() == AccountType.MEAL ? "Yemek Kartı" : "Bankamatik Kartı";
        Card card = Card.builder()
                .userId(userId)
                .accountId(account.getId())
                .name(cardName)
                .cardNo(generatorUtil.generateCardNo())
                .cardType(CardType.DEBIT)
                .cvv(generatorUtil.generateCvv())
                .expiryDate(generatorUtil.generateExpiryDate())
                .status("active")
                .balance(account.getBalance())
                .createdAt(LocalDateTime.now())
                .build();
        cardRepository.save(card);
    }
    
    private void updateLinkedCardsBalance(String accountId, BigDecimal newBalance) {
        cardRepository.findByAccountId(accountId).forEach(card -> {
            if (card.getCardType() == CardType.DEBIT) {
                card.setBalance(newBalance);
                cardRepository.save(card);
            }
        });
    }
    
    private AccountResponse mapToResponse(Account account) {
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