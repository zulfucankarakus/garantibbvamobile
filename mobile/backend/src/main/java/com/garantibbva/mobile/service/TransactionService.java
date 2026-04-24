package com.garantibbva.mobile.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.garantibbva.mobile.dto.request.QRGenerateRequest;
import com.garantibbva.mobile.dto.request.QRPaymentRequest;
import com.garantibbva.mobile.dto.request.TransferRequest;
import com.garantibbva.mobile.dto.response.QRCodeResponse;
import com.garantibbva.mobile.dto.response.TransactionResponse;
import com.garantibbva.mobile.entity.Account;
import com.garantibbva.mobile.entity.Transaction;
import com.garantibbva.mobile.enums.TransactionStatus;
import com.garantibbva.mobile.exception.BadRequestException;
import com.garantibbva.mobile.exception.ResourceNotFoundException;
import com.garantibbva.mobile.repository.TransactionRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class TransactionService {
    
    private final TransactionRepository transactionRepository;
    private final AccountService accountService;
    private final NotificationService notificationService;
    private final ObjectMapper objectMapper;
    
    public TransactionService(TransactionRepository transactionRepository, AccountService accountService,
                              NotificationService notificationService, ObjectMapper objectMapper) {
        this.transactionRepository = transactionRepository;
        this.accountService = accountService;
        this.notificationService = notificationService;
        this.objectMapper = objectMapper;
    }
    
    public List<TransactionResponse> getUserTransactions(String userId, int limit) {
        return transactionRepository.findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(0, limit))
                .stream().map(this::mapToResponse).collect(Collectors.toList());
    }
    
    public List<TransactionResponse> getAccountTransactions(String accountId, String userId) {
        Account account = accountService.getAccountEntityById(accountId);
        if (!account.getUserId().equals(userId)) {
            throw new ResourceNotFoundException("Hesap bulunamadı");
        }
        return transactionRepository.findByFromAccountIdOrderByCreatedAtDesc(accountId)
                .stream().map(this::mapToResponse).collect(Collectors.toList());
    }
    
    @Transactional
    public TransactionResponse transfer(String userId, TransferRequest request) {
        Account fromAccount = accountService.getAccountEntityById(request.getFromAccountId());
        if (!fromAccount.getUserId().equals(userId)) {
            throw new ResourceNotFoundException("Gönderen hesap bulunamadı");
        }
        if (fromAccount.getBalance().compareTo(request.getAmount()) < 0) {
            throw new BadRequestException("Yetersiz bakiye");
        }
        
        Account toAccount = accountService.getAccountByIban(request.getToAccountIban());
        
        Transaction tx = Transaction.builder()
                .userId(userId)
                .fromAccountId(request.getFromAccountId())
                .toAccountId(toAccount.getId())
                .toAccountIban(request.getToAccountIban())
                .amount(request.getAmount())
                .description(request.getDescription() != null ? request.getDescription() : "Para transferi")
                .status(TransactionStatus.COMPLETED)
                .transactionType("transfer")
                .createdAt(LocalDateTime.now())
                .build();
        tx = transactionRepository.save(tx);
        
        accountService.updateBalance(fromAccount.getId(), fromAccount.getBalance().subtract(request.getAmount()));
        accountService.updateBalance(toAccount.getId(), toAccount.getBalance().add(request.getAmount()));
        
        notificationService.createNotification(userId, "Transfer Başarılı",
                request.getAmount() + " TL transfer edildi.", "success");
        notificationService.createNotification(toAccount.getUserId(), "Para Aldınız",
                request.getAmount() + " TL alındı.", "success");
        
        return mapToResponse(tx);
    }
    
    public QRCodeResponse generateQRCode(String userId, QRGenerateRequest request, String userName) {
        Account account = accountService.getAccountEntityById(request.getAccountId());
        if (!account.getUserId().equals(userId)) {
            throw new ResourceNotFoundException("Hesap bulunamadı");
        }
        
        Map<String, Object> qrData = new HashMap<>();
        qrData.put("account_id", request.getAccountId());
        qrData.put("account_no", account.getAccountNo());
        qrData.put("iban", account.getIban());
        qrData.put("user_name", userName);
        qrData.put("amount", request.getAmount());
        qrData.put("description", request.getDescription() != null ? request.getDescription() : "QR ile ödeme");
        
        String qrCode;
        try {
            String qrJson = objectMapper.writeValueAsString(qrData);
            qrCode = Base64.getEncoder().encodeToString(qrJson.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            throw new BadRequestException("QR kod oluşturulamadı");
        }
        
        return QRCodeResponse.builder().qrCode(qrCode).qrData(qrData).message("QR kod oluşturuldu").build();
    }
    
    @Transactional
    @SuppressWarnings("unchecked")
    public Map<String, Object> payWithQR(String userId, QRPaymentRequest request, String userName) {
        Map<String, Object> qrData;
        try {
            String qrJson = new String(Base64.getDecoder().decode(request.getQrCode()), StandardCharsets.UTF_8);
            qrData = objectMapper.readValue(qrJson, Map.class);
        } catch (Exception e) {
            throw new BadRequestException("Geçersiz QR kod");
        }
        
        BigDecimal amount = request.getAmount();
        if (amount == null && qrData.get("amount") != null) {
            amount = new BigDecimal(qrData.get("amount").toString());
        }
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("Geçerli bir tutar giriniz");
        }
        
        Account fromAccount = accountService.getAccountEntityById(request.getFromAccountId());
        if (!fromAccount.getUserId().equals(userId)) {
            throw new ResourceNotFoundException("Gönderen hesap bulunamadı");
        }
        if (fromAccount.getBalance().compareTo(amount) < 0) {
            throw new BadRequestException("Yetersiz bakiye");
        }
        
        String toAccountId = (String) qrData.get("account_id");
        Account toAccount = accountService.getAccountEntityById(toAccountId);
        
        if (fromAccount.getId().equals(toAccount.getId())) {
            throw new BadRequestException("Aynı hesaba transfer yapamazsınız");
        }
        
        Transaction tx = Transaction.builder()
                .userId(userId)
                .fromAccountId(request.getFromAccountId())
                .toAccountId(toAccount.getId())
                .toAccountIban(toAccount.getIban())
                .amount(amount)
                .description((String) qrData.getOrDefault("description", "QR ile ödeme"))
                .status(TransactionStatus.COMPLETED)
                .transactionType("qr_payment")
                .createdAt(LocalDateTime.now())
                .build();
        tx = transactionRepository.save(tx);
        
        accountService.updateBalance(fromAccount.getId(), fromAccount.getBalance().subtract(amount));
        accountService.updateBalance(toAccount.getId(), toAccount.getBalance().add(amount));
        
        String recipientName = (String) qrData.get("user_name");
        notificationService.createNotification(userId, "QR Ödeme Başarılı",
                recipientName + " adlı kişiye " + amount + " TL gönderildi.", "success");
        notificationService.createNotification(toAccount.getUserId(), "QR ile Para Aldınız",
                userName + " adlı kişiden " + amount + " TL aldınız.", "success");
        
        Map<String, Object> response = new HashMap<>();
        response.put("transaction", mapToResponse(tx));
        response.put("message", "Ödeme tamamlandı");
        return response;
    }
    
    private TransactionResponse mapToResponse(Transaction tx) {
        return TransactionResponse.builder()
                .id(tx.getId())
                .userId(tx.getUserId())
                .fromAccountId(tx.getFromAccountId())
                .toAccountId(tx.getToAccountId())
                .toAccountIban(tx.getToAccountIban())
                .amount(tx.getAmount())
                .description(tx.getDescription())
                .status(tx.getStatus())
                .transactionType(tx.getTransactionType())
                .createdAt(tx.getCreatedAt())
                .build();
    }
}