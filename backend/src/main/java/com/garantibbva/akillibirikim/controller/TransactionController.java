package com.garantibbva.akillibirikim.controller;

import com.garantibbva.akillibirikim.model.Transaction;
import com.garantibbva.akillibirikim.model.User;
import com.garantibbva.akillibirikim.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/transactions")
@RequiredArgsConstructor
public class TransactionController {
    
    private final TransactionRepository transactionRepository;
    
    @GetMapping
    public ResponseEntity<List<Transaction>> getTransactions(
            @RequestParam(defaultValue = "20") int limit,
            @AuthenticationPrincipal User user) {
        
        List<Transaction> transactions = transactionRepository.findByOdtUserIdOrderByTransactionDateDesc(user.getId());
        
        // Eğer işlem yoksa demo işlemler oluştur
        if (transactions.isEmpty()) {
            transactions = createDemoTransactions(user.getId());
        }
        
        // Limit uygula
        if (transactions.size() > limit) {
            transactions = transactions.subList(0, limit);
        }
        
        return ResponseEntity.ok(transactions);
    }
    
    @PostMapping
    public ResponseEntity<Transaction> createTransaction(
            @RequestBody Map<String, Object> request,
            @AuthenticationPrincipal User user) {
        
        Transaction transaction = Transaction.builder()
                .odtUserId(user.getId())
                .accountId((String) request.get("account_id"))
                .transactionType((String) request.getOrDefault("transaction_type", "transfer"))
                .category((String) request.getOrDefault("category", "Diğer"))
                .description((String) request.getOrDefault("description", ""))
                .amount(((Number) request.get("amount")).doubleValue())
                .currency((String) request.getOrDefault("currency", "TRY"))
                .status("completed")
                .merchantName((String) request.get("merchant_name"))
                .transactionDate(LocalDateTime.now())
                .createdAt(LocalDateTime.now())
                .build();
        
        transaction = transactionRepository.save(transaction);
        return ResponseEntity.ok(transaction);
    }
    
    @GetMapping("/account/{accountId}")
    public ResponseEntity<List<Transaction>> getAccountTransactions(
            @PathVariable String accountId,
            @AuthenticationPrincipal User user) {
        
        List<Transaction> transactions = transactionRepository.findByAccountIdOrderByTransactionDateDesc(accountId);
        return ResponseEntity.ok(transactions);
    }
    
    private List<Transaction> createDemoTransactions(String userId) {
        List<Transaction> transactions = new ArrayList<>();
        
        String[] categories = {"Market", "Restoran", "Ulaşım", "Fatura", "Eğlence", "Alışveriş"};
        String[] merchants = {"Migros", "Starbucks", "Shell", "Turkcell", "Netflix", "Zara"};
        double[] amounts = {-250.0, -85.0, -150.0, -320.0, -49.99, -450.0, 5000.0, -120.0};
        
        Random random = new Random();
        
        for (int i = 0; i < 10; i++) {
            int idx = random.nextInt(categories.length);
            double amount = amounts[random.nextInt(amounts.length)];
            
            Transaction transaction = Transaction.builder()
                    .odtUserId(userId)
                    .transactionType(amount > 0 ? "income" : "expense")
                    .category(categories[idx])
                    .description(amount > 0 ? "Maaş Ödemesi" : merchants[idx] + " Alışverişi")
                    .amount(amount)
                    .currency("TRY")
                    .status("completed")
                    .merchantName(amount > 0 ? "Garanti BBVA" : merchants[idx])
                    .transactionDate(LocalDateTime.now().minusDays(i))
                    .createdAt(LocalDateTime.now().minusDays(i))
                    .build();
            
            transactions.add(transactionRepository.save(transaction));
        }
        
        return transactions;
    }
}
