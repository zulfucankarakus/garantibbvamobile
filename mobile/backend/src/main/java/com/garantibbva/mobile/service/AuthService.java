package com.garantibbva.mobile.service;

import com.garantibbva.mobile.dto.request.LoginRequest;
import com.garantibbva.mobile.dto.request.RegisterRequest;
import com.garantibbva.mobile.dto.response.AuthResponse;
import com.garantibbva.mobile.dto.response.UserResponse;
import com.garantibbva.mobile.entity.User;
import com.garantibbva.mobile.entity.VerificationCode;
import com.garantibbva.mobile.exception.BadRequestException;
import com.garantibbva.mobile.exception.DuplicateResourceException;
import com.garantibbva.mobile.exception.UnauthorizedException;
import com.garantibbva.mobile.repository.UserRepository;
import com.garantibbva.mobile.repository.VerificationCodeRepository;
import com.garantibbva.mobile.security.JwtTokenProvider;
import com.garantibbva.mobile.util.GeneratorUtil;
import com.garantibbva.mobile.util.ValidationUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Service
public class AuthService {
    
    private static final Logger log = LoggerFactory.getLogger(AuthService.class);
    
    private final UserRepository userRepository;
    private final VerificationCodeRepository verificationCodeRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final GeneratorUtil generatorUtil;
    private final ValidationUtil validationUtil;
    private final NotificationService notificationService;
    
    public AuthService(UserRepository userRepository, VerificationCodeRepository verificationCodeRepository,
                       PasswordEncoder passwordEncoder, JwtTokenProvider tokenProvider,
                       GeneratorUtil generatorUtil, ValidationUtil validationUtil,
                       NotificationService notificationService) {
        this.userRepository = userRepository;
        this.verificationCodeRepository = verificationCodeRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenProvider = tokenProvider;
        this.generatorUtil = generatorUtil;
        this.validationUtil = validationUtil;
        this.notificationService = notificationService;
    }
    
    public AuthResponse register(RegisterRequest request) {
        if (!validationUtil.validateTcNo(request.getTcNo())) {
            throw new BadRequestException("Geçersiz TC Kimlik Numarası");
        }
        
        String passwordError = validationUtil.validatePassword(request.getPassword());
        if (passwordError != null) {
            throw new BadRequestException(passwordError);
        }
        
        if (userRepository.existsByTcNo(request.getTcNo())) {
            throw new DuplicateResourceException("Bu TC Kimlik No ile kayıtlı kullanıcı bulunmaktadır");
        }
        
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateResourceException("Bu e-posta adresi ile kayıtlı kullanıcı bulunmaktadır");
        }
        
        User user = User.builder()
                .name(request.getName())
                .tcNo(request.getTcNo())
                .email(request.getEmail())
                .phone(request.getPhone())
                .password(passwordEncoder.encode(request.getPassword()))
                .customerNo(generatorUtil.generateCustomerNo())
                .role("customer")
                .profileImage("https://ui-avatars.com/api/?name=" + request.getName().replace(" ", "+") + "&background=00A19A&color=fff")
                .createdAt(LocalDateTime.now())
                .build();
        
        user = userRepository.save(user);
        
        notificationService.createNotification(user.getId(), "Hoş Geldiniz!",
                "Garanti BBVA'ya hoş geldiniz " + request.getName(), "welcome");
        
        String token = tokenProvider.generateToken(user.getId());
        
        return AuthResponse.builder()
                .accessToken(token)
                .tokenType("bearer")
                .user(mapToUserResponse(user))
                .build();
    }
    
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByTcNo(request.getIdentifier())
                .orElseGet(() -> userRepository.findByCustomerNo(request.getIdentifier()).orElse(null));
        
        if (user == null || !passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new UnauthorizedException("Geçersiz kimlik bilgileri");
        }
        
        String token = tokenProvider.generateToken(user.getId());
        
        return AuthResponse.builder()
                .accessToken(token)
                .tokenType("bearer")
                .user(mapToUserResponse(user))
                .build();
    }
    
    public Map<String, Object> sendEmailCode(String email) {
        String code = generatorUtil.generateVerificationCode();
        
        VerificationCode vc = VerificationCode.builder()
                .identifier(email)
                .code(code)
                .type("email")
                .verified(false)
                .createdAt(LocalDateTime.now())
                .build();
        
        verificationCodeRepository.save(vc);
        log.info("EMAIL CODE ({}): {}", email, code);
        
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Doğrulama kodu gönderildi");
        response.put("code_for_demo", code);
        return response;
    }
    
    public Map<String, Object> verifyEmailCode(String email, String code) {
        LocalDateTime tenMinutesAgo = LocalDateTime.now().minusMinutes(10);
        var verification = verificationCodeRepository
                .findByIdentifierAndCodeAndTypeAndVerifiedFalseAndCreatedAtAfter(email, code, "email", tenMinutesAgo);
        
        if (verification.isEmpty()) {
            throw new BadRequestException("Geçersiz veya süresi dolmuş kod");
        }
        
        VerificationCode vc = verification.get();
        vc.setVerified(true);
        verificationCodeRepository.save(vc);
        
        Map<String, Object> response = new HashMap<>();
        response.put("message", "E-posta doğrulandı");
        response.put("verified", true);
        return response;
    }
    
    public Map<String, Object> sendPhoneCode(String phone) {
        String code = generatorUtil.generateVerificationCode();
        
        VerificationCode vc = VerificationCode.builder()
                .identifier(phone)
                .code(code)
                .type("phone")
                .verified(false)
                .createdAt(LocalDateTime.now())
                .build();
        
        verificationCodeRepository.save(vc);
        log.info("PHONE CODE ({}): {}", phone, code);
        
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Doğrulama kodu gönderildi");
        response.put("code_for_demo", code);
        return response;
    }
    
    public Map<String, Object> verifyPhoneCode(String phone, String code) {
        LocalDateTime tenMinutesAgo = LocalDateTime.now().minusMinutes(10);
        var verification = verificationCodeRepository
                .findByIdentifierAndCodeAndTypeAndVerifiedFalseAndCreatedAtAfter(phone, code, "phone", tenMinutesAgo);
        
        if (verification.isEmpty()) {
            throw new BadRequestException("Geçersiz veya süresi dolmuş kod");
        }
        
        VerificationCode vc = verification.get();
        vc.setVerified(true);
        verificationCodeRepository.save(vc);
        
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Telefon doğrulandı");
        response.put("verified", true);
        return response;
    }
    
    public UserResponse mapToUserResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .tcNo(user.getTcNo())
                .customerNo(user.getCustomerNo())
                .email(user.getEmail())
                .phone(user.getPhone())
                .profileImage(user.getProfileImage())
                .build();
    }
}