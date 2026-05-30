package com.garantibbva.akillibirikim.controller;

import com.garantibbva.akillibirikim.model.Account;
import com.garantibbva.akillibirikim.model.Transaction;
import com.garantibbva.akillibirikim.model.User;
import com.garantibbva.akillibirikim.repository.AccountRepository;
import com.garantibbva.akillibirikim.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/accounts")
@RequiredArgsConstructor
public class AccountController {
    
    private final AccountRepository accountRepository;
    private final TransactionRepository transactionRepository;
    
    @GetMapping
    public ResponseEntity<List<Account>> getAccounts(@AuthenticationPrincipal User user) {
        List<Account> accounts = accountRepository.findByOdtUserId(user.getId());
        
        // Eğer hesap yoksa varsayılan hesaplar oluştur
        if (accounts.isEmpty()) {
            accounts = createDefaultAccounts(user.getId());
        }
        
        return ResponseEntity.ok(accounts);
    }
    
    @PostMapping
    public ResponseEntity<Account> createAccount(
            @RequestBody Map<String, Object> request,
            @AuthenticationPrincipal User user) {
        
        Account account = Account.builder()
                .odtUserId(user.getId())
                .accountName((String) request.getOrDefault("account_name", "Yeni Hesap"))
                .accountType((String) request.getOrDefault("account_type", "vadesiz"))
                .accountNo(generateAccountNo())
                .iban(generateIban())
                .currency((String) request.getOrDefault("currency", "TRY"))
                .balance(0.0)
                .status("active")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        
        account = accountRepository.save(account);
        return ResponseEntity.ok(account);
    }
    
    @PostMapping("/{accountId}/add-balance")
    public ResponseEntity<Account> addBalance(
            @PathVariable String accountId,
            @RequestParam Double amount,
            @AuthenticationPrincipal User user) {
        
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new RuntimeException("Hesap bulunamadı"));
        
        if (!account.getOdtUserId().equals(user.getId())) {
            throw new RuntimeException("Bu hesaba erişim yetkiniz yok");
        }
        
        account.setBalance(account.getBalance() + amount);
        account.setUpdatedAt(LocalDateTime.now());
        account = accountRepository.save(account);
        
        // İşlem kaydı oluştur
        Transaction transaction = Transaction.builder()
                .odtUserId(user.getId())
                .accountId(accountId)
                .transactionType("deposit")
                .category("Para Yatırma")
                .description("Hesaba para yatırma")
                .amount(amount)
                .currency(account.getCurrency())
                .status("completed")
                .transactionDate(LocalDateTime.now())
                .createdAt(LocalDateTime.now())
                .build();
        
        transactionRepository.save(transaction);
        
        return ResponseEntity.ok(account);
    }
    
    @DeleteMapping("/{accountId}")
    public ResponseEntity<Map<String, Object>> deleteAccount(
            @PathVariable String accountId,
            @AuthenticationPrincipal User user) {
        
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new RuntimeException("Hesap bulunamadı"));
        
        if (!account.getOdtUserId().equals(user.getId())) {
            throw new RuntimeException("Bu hesaba erişim yetkiniz yok");
        }
        
        accountRepository.delete(account);
        
        return ResponseEntity.ok(Map.of("success", true, "message", "Hesap silindi"));
    }
    
    @PostMapping("/search")
    public ResponseEntity<List<Account>> searchAccounts(@RequestBody Map<String, String> request) {
        // Basit arama - gerçek uygulamada daha gelişmiş olmalı
        return ResponseEntity.ok(new ArrayList<>());
    }
    
    private List<Account> createDefaultAccounts(String userId) {
        List<Account> accounts = new ArrayList<>();
        
        // Vadesiz TL Hesabı
        Account tlAccount = Account.builder()
                .odtUserId(userId)
                .accountName("Vadesiz TL Hesabı")
                .accountType("vadesiz")
                .accountNo(generateAccountNo())
                .iban(generateIban())
                .currency("TRY")
                .balance(15000.0)
                .status("active")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        accounts.add(accountRepository.save(tlAccount));
        
        // Vadesiz USD Hesabı
        Account usdAccount = Account.builder()
                .odtUserId(userId)
                .accountName("Vadesiz USD Hesabı")
                .accountType("vadesiz")
                .accountNo(generateAccountNo())
                .iban(generateIban())
                .currency("USD")
                .balance(500.0)
                .status("active")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        accounts.add(accountRepository.save(usdAccount));
        
        // Birikim Hesabı
        Account savingsAccount = Account.builder()
                .odtUserId(userId)
                .accountName("Birikim Hesabı")
                .accountType("birikim")
                .accountNo(generateAccountNo())
                .iban(generateIban())
                .currency("TRY")
                .balance(50000.0)
                .status("active")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        accounts.add(accountRepository.save(savingsAccount));
        
        return accounts;
    }
    
    private String generateAccountNo() {
        Random random = new Random();
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 16; i++) {
            sb.append(random.nextInt(10));
        }
        return sb.toString();
    }
    
    private String generateIban() {
        return "TR" + String.format("%02d", new Random().nextInt(100)) + 
               "0006" + generateAccountNo().substring(0, 16);
    }
}
