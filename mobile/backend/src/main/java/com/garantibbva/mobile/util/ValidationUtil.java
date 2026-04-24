package com.garantibbva.mobile.util;

import org.springframework.stereotype.Component;

@Component
public class ValidationUtil {
    
    public boolean validateTcNo(String tcNo) {
        if (tcNo == null || !tcNo.matches("^[0-9]+$") || tcNo.length() != 11 || tcNo.charAt(0) == '0') {
            return false;
        }
        int[] digits = new int[11];
        for (int i = 0; i < 11; i++) digits[i] = Character.getNumericValue(tcNo.charAt(i));
        
        int oddSum = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
        int evenSum = digits[1] + digits[3] + digits[5] + digits[7];
        int tenthDigit = ((oddSum * 7) - evenSum) % 10;
        if (tenthDigit < 0) tenthDigit += 10;
        if (tenthDigit != digits[9]) return false;
        
        int firstTenSum = 0;
        for (int i = 0; i < 10; i++) firstTenSum += digits[i];
        return firstTenSum % 10 == digits[10];
    }
    
    public String validatePassword(String password) {
        if (password == null || password.isEmpty()) return "Şifre boş olamaz";
        if (password.length() != 6) return "Şifre 6 haneli olmalıdır";
        if (!password.matches("^[0-9]+$")) return "Şifre sadece rakamlardan oluşmalıdır";
        return null;
    }
    
    public String validateEmail(String email) {
        if (email == null || email.isEmpty()) return "E-posta boş olamaz";
        if (!email.matches("^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$")) return "Geçersiz e-posta";
        return null;
    }
    
    public String validatePhone(String phone) {
        if (phone == null || phone.isEmpty()) return "Telefon boş olamaz";
        String digitsOnly = phone.replaceAll("[^0-9]", "");
        if (digitsOnly.length() != 10) return "Telefon 10 haneli olmalıdır";
        if (!digitsOnly.startsWith("5")) return "Telefon 5 ile başlamalıdır";
        return null;
    }
}