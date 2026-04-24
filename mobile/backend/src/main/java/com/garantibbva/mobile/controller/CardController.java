package com.garantibbva.mobile.controller;

import com.garantibbva.mobile.dto.request.CreateCardRequest;
import com.garantibbva.mobile.dto.request.CreateDebitCardWithAccountRequest;
import com.garantibbva.mobile.dto.response.CardResponse;
import com.garantibbva.mobile.security.SecurityUtils;
import com.garantibbva.mobile.service.CardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/cards")
@Tag(name = "Cards", description = "Kart yonetimi")
public class CardController {
    
    private final CardService cardService;
    private final SecurityUtils securityUtils;
    
    public CardController(CardService cardService, SecurityUtils securityUtils) {
        this.cardService = cardService;
        this.securityUtils = securityUtils;
    }
    
    @GetMapping
    @Operation(summary = "Kullanicinin kartlarini listele")
    public ResponseEntity<List<CardResponse>> getCards() {
        return ResponseEntity.ok(cardService.getUserCards(securityUtils.getCurrentUserId()));
    }
    
    @PostMapping
    @Operation(summary = "Yeni kart olustur")
    public ResponseEntity<CardResponse> createCard(@Valid @RequestBody CreateCardRequest request) {
        return ResponseEntity.ok(cardService.createCard(securityUtils.getCurrentUserId(), request));
    }
    
    @PostMapping("/debit-with-account")
    @Operation(summary = "Banka karti + Hesap birlikte olustur")
    public ResponseEntity<Map<String, Object>> createDebitCardWithAccount(
            @Valid @RequestBody CreateDebitCardWithAccountRequest request) {
        return ResponseEntity.ok(cardService.createDebitCardWithAccount(securityUtils.getCurrentUserId(), request));
    }
    
    @DeleteMapping("/{cardId}")
    @Operation(summary = "Karti kapat")
    public ResponseEntity<Map<String, Object>> deleteCard(@PathVariable String cardId) {
        return ResponseEntity.ok(cardService.deleteCard(cardId, securityUtils.getCurrentUserId()));
    }
}