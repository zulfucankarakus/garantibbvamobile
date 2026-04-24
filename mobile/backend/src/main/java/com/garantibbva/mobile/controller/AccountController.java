package com.garantibbva.mobile.controller;

import com.garantibbva.mobile.dto.request.AccountSearchRequest;
import com.garantibbva.mobile.dto.request.CreateAccountRequest;
import com.garantibbva.mobile.dto.response.AccountResponse;
import com.garantibbva.mobile.dto.response.AccountSearchResponse;
import com.garantibbva.mobile.security.SecurityUtils;
import com.garantibbva.mobile.service.AccountService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/accounts")
@Tag(name = "Accounts", description = "Hesap yonetimi")
public class AccountController {
    
    private final AccountService accountService;
    private final SecurityUtils securityUtils;
    
    public AccountController(AccountService accountService, SecurityUtils securityUtils) {
        this.accountService = accountService;
        this.securityUtils = securityUtils;
    }
    
    @GetMapping
    @Operation(summary = "Kullanicinin hesaplarini listele")
    public ResponseEntity<List<AccountResponse>> getAccounts() {
        return ResponseEntity.ok(accountService.getUserAccounts(securityUtils.getCurrentUserId()));
    }
    
    @PostMapping
    @Operation(summary = "Yeni hesap olustur")
    public ResponseEntity<AccountResponse> createAccount(@Valid @RequestBody CreateAccountRequest request) {
        return ResponseEntity.ok(accountService.createAccount(securityUtils.getCurrentUserId(), request));
    }
    
    @GetMapping("/{accountId}")
    @Operation(summary = "Hesap detayi")
    public ResponseEntity<AccountResponse> getAccount(@PathVariable String accountId) {
        return ResponseEntity.ok(accountService.getAccountById(accountId, securityUtils.getCurrentUserId()));
    }
    
    @PostMapping("/{accountId}/add-balance")
    @Operation(summary = "Hesaba bakiye ekle")
    public ResponseEntity<AccountResponse> addBalance(@PathVariable String accountId, @RequestParam BigDecimal amount) {
        return ResponseEntity.ok(accountService.addBalance(accountId, securityUtils.getCurrentUserId(), amount));
    }
    
    @DeleteMapping("/{accountId}")
    @Operation(summary = "Hesabi kapat")
    public ResponseEntity<Map<String, Object>> deleteAccount(@PathVariable String accountId,
            @RequestParam(required = false) String targetAccountId) {
        return ResponseEntity.ok(accountService.deleteAccount(accountId, securityUtils.getCurrentUserId(), targetAccountId));
    }
    
    @PostMapping("/search")
    @Operation(summary = "IBAN veya Hesap No ile hesap ara")
    public ResponseEntity<AccountSearchResponse> searchAccount(@Valid @RequestBody AccountSearchRequest request) {
        return ResponseEntity.ok(accountService.searchAccount(request.getQuery()));
    }
}