package com.garantibbva.mobile.util;

import org.springframework.stereotype.Component;

import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Random;

@Component
public class GeneratorUtil {
    
    private static final Random random = new Random();
    
    public String generateCustomerNo() {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 10; i++) sb.append(random.nextInt(10));
        return sb.toString();
    }
    
    public String generateAccountNo() {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 12; i++) sb.append(random.nextInt(10));
        return sb.toString();
    }
    
    public String generateIban(String accountNo) {
        return "TR33000620" + accountNo;
    }
    
    public String generateCardNo() {
        StringBuilder sb = new StringBuilder("5406");
        for (int i = 0; i < 12; i++) sb.append(random.nextInt(10));
        return sb.toString();
    }
    
    public String generateCvv() {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 3; i++) sb.append(random.nextInt(10));
        return sb.toString();
    }
    
    public String generateExpiryDate() {
        LocalDate expiry = LocalDate.now().plusYears(5);
        return expiry.format(DateTimeFormatter.ofPattern("MM/yy"));
    }
    
    public String generateVerificationCode() {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 6; i++) sb.append(random.nextInt(10));
        return sb.toString();
    }
}