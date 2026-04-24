package com.garantibbva.mobile.controller;

import com.garantibbva.mobile.dto.request.QRGenerateRequest;
import com.garantibbva.mobile.dto.request.QRPaymentRequest;
import com.garantibbva.mobile.dto.request.TransferRequest;
import com.garantibbva.mobile.dto.response.QRCodeResponse;
import com.garantibbva.mobile.dto.response.TransactionResponse;
import com.garantibbva.mobile.entity.User;
import com.garantibbva.mobile.security.SecurityUtils;
import com.garantibbva.mobile.service.TransactionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@Tag(name = "Transactions", description = "Islem yonetimi")
public class TransactionController {
    
    private final TransactionService transactionService;
    private final SecurityUtils securityUtils;
    
    public TransactionController(TransactionService transactionService, SecurityUtils securityUtils) {
        this.transactionService = transactionService;
        this.securityUtils = securityUtils;
    }
    
    @GetMapping("/transactions")
    @Operation(summary = "Kullanicinin islemlerini listele")
    public ResponseEntity<List<TransactionResponse>> getTransactions(@RequestParam(defaultValue = "50") int limit) {
        return ResponseEntity.ok(transactionService.getUserTransactions(securityUtils.getCurrentUserId(), limit));
    }
    
    @GetMapping("/transactions/account/{accountId}")
    @Operation(summary = "Hesaba ait islemler")
    public ResponseEntity<List<TransactionResponse>> getAccountTransactions(@PathVariable String accountId) {
        return ResponseEntity.ok(transactionService.getAccountTransactions(accountId, securityUtils.getCurrentUserId()));
    }
    
    @PostMapping("/transactions")
    @Operation(summary = "Para transferi yap")
    public ResponseEntity<TransactionResponse> transfer(@Valid @RequestBody TransferRequest request) {
        return ResponseEntity.ok(transactionService.transfer(securityUtils.getCurrentUserId(), request));
    }
    
    @PostMapping("/qr/generate")
    @Operation(summary = "QR kod olustur")
    public ResponseEntity<QRCodeResponse> generateQR(@Valid @RequestBody QRGenerateRequest request) {
        User user = securityUtils.getCurrentUser();
        return ResponseEntity.ok(transactionService.generateQRCode(user.getId(), request, user.getName()));
    }
    
    @PostMapping("/qr/pay")
    @Operation(summary = "QR ile odeme yap")
    public ResponseEntity<Map<String, Object>> payWithQR(@Valid @RequestBody QRPaymentRequest request) {
        User user = securityUtils.getCurrentUser();
        return ResponseEntity.ok(transactionService.payWithQR(user.getId(), request, user.getName()));
    }
}