package com.garantibbva.akillibirikim.controller;

import com.garantibbva.akillibirikim.dto.*;
import com.garantibbva.akillibirikim.model.User;
import com.garantibbva.akillibirikim.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {
    
    private final AuthService authService;
    
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }
    
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }
    
    @GetMapping("/me")
    public ResponseEntity<UserResponse> getMe(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(authService.getMe(user));
    }
    
    @PostMapping("/send-email-code")
    public ResponseEntity<Map<String, Object>> sendEmailCode(@RequestBody Map<String, String> request) {
        String code = authService.sendEmailCode(request.get("email"));
        return ResponseEntity.ok(Map.of(
            "success", true,
            "message", "Doğrulama kodu gönderildi",
            "code", code // Gerçek uygulamada bu döndürülmez
        ));
    }
    
    @PostMapping("/verify-email-code")
    public ResponseEntity<Map<String, Object>> verifyEmailCode(@RequestBody Map<String, String> request) {
        boolean verified = authService.verifyEmailCode(request.get("email"), request.get("code"));
        return ResponseEntity.ok(Map.of(
            "verified", verified,
            "message", verified ? "Doğrulama başarılı" : "Geçersiz veya süresi dolmuş kod"
        ));
    }
    
    @PostMapping("/send-phone-code")
    public ResponseEntity<Map<String, Object>> sendPhoneCode(@RequestBody Map<String, String> request) {
        String code = authService.sendPhoneCode(request.get("phone"));
        return ResponseEntity.ok(Map.of(
            "success", true,
            "message", "Doğrulama kodu gönderildi",
            "code", code // Gerçek uygulamada bu döndürülmez
        ));
    }
    
    @PostMapping("/verify-phone-code")
    public ResponseEntity<Map<String, Object>> verifyPhoneCode(@RequestBody Map<String, String> request) {
        boolean verified = authService.verifyPhoneCode(request.get("phone"), request.get("code"));
        return ResponseEntity.ok(Map.of(
            "verified", verified,
            "message", verified ? "Doğrulama başarılı" : "Geçersiz veya süresi dolmuş kod"
        ));
    }
}
