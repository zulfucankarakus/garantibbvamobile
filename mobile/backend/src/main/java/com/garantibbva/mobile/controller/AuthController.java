package com.garantibbva.mobile.controller;

import com.garantibbva.mobile.dto.request.LoginRequest;
import com.garantibbva.mobile.dto.request.RegisterRequest;
import com.garantibbva.mobile.dto.response.AuthResponse;
import com.garantibbva.mobile.dto.response.UserResponse;
import com.garantibbva.mobile.entity.User;
import com.garantibbva.mobile.security.SecurityUtils;
import com.garantibbva.mobile.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/auth")
@Tag(name = "Authentication", description = "Kimlik dogrulama islemleri")
public class AuthController {
    
    private final AuthService authService;
    private final SecurityUtils securityUtils;
    
    public AuthController(AuthService authService, SecurityUtils securityUtils) {
        this.authService = authService;
        this.securityUtils = securityUtils;
    }
    
    @PostMapping("/register")
    @Operation(summary = "Yeni kullanici kaydi")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }
    
    @PostMapping("/login")
    @Operation(summary = "Kullanici girisi")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }
    
    @GetMapping("/me")
    @Operation(summary = "Mevcut kullanici bilgisi")
    public ResponseEntity<UserResponse> me() {
        User currentUser = securityUtils.getCurrentUser();
        return ResponseEntity.ok(authService.mapToUserResponse(currentUser));
    }
    
    @PostMapping("/send-email-code")
    @Operation(summary = "E-posta dogrulama kodu gonder")
    public ResponseEntity<Map<String, Object>> sendEmailCode(@RequestParam String email) {
        return ResponseEntity.ok(authService.sendEmailCode(email));
    }
    
    @PostMapping("/verify-email-code")
    @Operation(summary = "E-posta kodunu dogrula")
    public ResponseEntity<Map<String, Object>> verifyEmailCode(@RequestParam String email, @RequestParam String code) {
        return ResponseEntity.ok(authService.verifyEmailCode(email, code));
    }
    
    @PostMapping("/send-phone-code")
    @Operation(summary = "Telefon dogrulama kodu gonder")
    public ResponseEntity<Map<String, Object>> sendPhoneCode(@RequestParam String phone) {
        return ResponseEntity.ok(authService.sendPhoneCode(phone));
    }
    
    @PostMapping("/verify-phone-code")
    @Operation(summary = "Telefon kodunu dogrula")
    public ResponseEntity<Map<String, Object>> verifyPhoneCode(@RequestParam String phone, @RequestParam String code) {
        return ResponseEntity.ok(authService.verifyPhoneCode(phone, code));
    }
}