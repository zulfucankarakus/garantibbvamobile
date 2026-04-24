package com.garantibbva.akillibirikim.service;

import com.garantibbva.akillibirikim.dto.*;
import com.garantibbva.akillibirikim.model.Notification;
import com.garantibbva.akillibirikim.model.User;
import com.garantibbva.akillibirikim.model.VerificationCode;
import com.garantibbva.akillibirikim.repository.NotificationRepository;
import com.garantibbva.akillibirikim.repository.UserRepository;
import com.garantibbva.akillibirikim.repository.VerificationCodeRepository;
import com.garantibbva.akillibirikim.security.JwtTokenProvider;
import com.garantibbva.akillibirikim.util.TcNoValidator;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AuthService {
    
    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final VerificationCodeRepository verificationCodeRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    
    public AuthResponse register(RegisterRequest request) {
        // TC Kimlik No doğrulama
        if (!TcNoValidator.validate(request.getTcNo())) {
            throw new RuntimeException("Geçersiz TC Kimlik Numarası");
        }
        
        // Kullanıcı var mı kontrol et
        if (userRepository.existsByTcNo(request.getTcNo())) {
            throw new RuntimeException("Bu TC Kimlik No ile kayıtlı kullanıcı var");
        }
        
        // Kullanıcı oluştur
        User user = User.builder()
                .tcNo(request.getTcNo())
                .name(request.getName())
                .email(request.getEmail())
                .phone(request.getPhone())
                .password(passwordEncoder.encode(request.getPassword()))
                .customerNo(TcNoValidator.generateCustomerNo())
                .role("customer")
                .profileImage("https://ui-avatars.com/api/?name=" + request.getName().replace(" ", "+") + "&background=00A19A&color=fff")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        
        user = userRepository.save(user);
        
        // Hoş geldin bildirimi oluştur
        Notification notification = Notification.builder()
                .userId(user.getId())
                .title("Hoş Geldiniz!")
                .message("Garanti BBVA'ya hoş geldiniz " + user.getName() + ". Hesap açmak için başvuru yapabilirsiniz.")
                .notificationType("welcome")
                .read(false)
                .createdAt(LocalDateTime.now())
                .build();
        
        notificationRepository.save(notification);
        
        // Token oluştur
        String token = tokenProvider.generateToken(user.getId());
        
        return AuthResponse.builder()
                .accessToken(token)
                .tokenType("bearer")
                .user(mapToUserResponse(user))
                .build();
    }
    
    public AuthResponse login(LoginRequest request) {
        // TC No veya Müşteri No ile ara
        Optional<User> userOpt = userRepository.findByTcNo(request.getIdentifier());
        if (userOpt.isEmpty()) {
            userOpt = userRepository.findByCustomerNo(request.getIdentifier());
        }
        
        User user = userOpt.orElseThrow(() -> new RuntimeException("Invalid credentials"));
        
        // Şifre kontrol
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("Invalid credentials");
        }
        
        // Token oluştur
        String token = tokenProvider.generateToken(user.getId());
        
        return AuthResponse.builder()
                .accessToken(token)
                .tokenType("bearer")
                .user(mapToUserResponse(user))
                .build();
    }
    
    public UserResponse getMe(User user) {
        return mapToUserResponse(user);
    }
    
    public String sendEmailCode(String email) {
        String code = TcNoValidator.generateVerificationCode();
        
        VerificationCode verificationCode = VerificationCode.builder()
                .target(email)
                .code(code)
                .type("email")
                .expiresAt(LocalDateTime.now().plusMinutes(10))
                .createdAt(LocalDateTime.now())
                .build();
        
        verificationCodeRepository.save(verificationCode);
        
        System.out.println("📧 E-POSTA DOĞRULAMA KODU (" + email + "): " + code);
        
        return code;
    }
    
    public boolean verifyEmailCode(String email, String code) {
        Optional<VerificationCode> vcOpt = verificationCodeRepository
                .findByTargetAndTypeOrderByCreatedAtDesc(email, "email");
        
        if (vcOpt.isEmpty()) {
            return false;
        }
        
        VerificationCode vc = vcOpt.get();
        
        if (vc.getExpiresAt().isBefore(LocalDateTime.now())) {
            return false;
        }
        
        return vc.getCode().equals(code);
    }
    
    public String sendPhoneCode(String phone) {
        String code = TcNoValidator.generateVerificationCode();
        
        VerificationCode verificationCode = VerificationCode.builder()
                .target(phone)
                .code(code)
                .type("phone")
                .expiresAt(LocalDateTime.now().plusMinutes(10))
                .createdAt(LocalDateTime.now())
                .build();
        
        verificationCodeRepository.save(verificationCode);
        
        System.out.println("📱 TELEFON DOĞRULAMA KODU (" + phone + "): " + code);
        
        return code;
    }
    
    public boolean verifyPhoneCode(String phone, String code) {
        Optional<VerificationCode> vcOpt = verificationCodeRepository
                .findByTargetAndTypeOrderByCreatedAtDesc(phone, "phone");
        
        if (vcOpt.isEmpty()) {
            return false;
        }
        
        VerificationCode vc = vcOpt.get();
        
        if (vc.getExpiresAt().isBefore(LocalDateTime.now())) {
            return false;
        }
        
        return vc.getCode().equals(code);
    }
    
    private UserResponse mapToUserResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .customerNo(user.getCustomerNo())
                .tcNo(user.getTcNo())
                .email(user.getEmail())
                .phone(user.getPhone())
                .profileImage(user.getProfileImage())
                .build();
    }
}
