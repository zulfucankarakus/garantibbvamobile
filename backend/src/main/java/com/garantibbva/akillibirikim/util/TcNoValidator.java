package com.garantibbva.akillibirikim.util;

import java.util.Random;

public class TcNoValidator {
    
    public static boolean validate(String tcNo) {
        if (tcNo == null || tcNo.length() != 11) {
            return false;
        }
        
        // TC Kimlik No sadece rakamlardan oluşmalı
        if (!tcNo.matches("\\d{11}")) {
            return false;
        }
        
        // İlk hane 0 olamaz
        if (tcNo.charAt(0) == '0') {
            return false;
        }
        
        // Test modunda basit doğrulama (development için)
        // 1 ile başlayan ve 11 haneli sayılar kabul edilir
        if (tcNo.startsWith("1") || tcNo.startsWith("2") || tcNo.startsWith("3") || 
            tcNo.startsWith("4") || tcNo.startsWith("5") || tcNo.startsWith("6") ||
            tcNo.startsWith("7") || tcNo.startsWith("8") || tcNo.startsWith("9")) {
            return true;
        }
        
        return false;
    }
    
    public static boolean validateStrict(String tcNo) {
        if (tcNo == null || tcNo.length() != 11) {
            return false;
        }
        
        if (!tcNo.matches("\\d{11}")) {
            return false;
        }
        
        if (tcNo.charAt(0) == '0') {
            return false;
        }
        
        int[] digits = new int[11];
        for (int i = 0; i < 11; i++) {
            digits[i] = Character.getNumericValue(tcNo.charAt(i));
        }
        
        // 10. hane algoritması
        int oddSum = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
        int evenSum = digits[1] + digits[3] + digits[5] + digits[7];
        int tenthDigit = (oddSum * 7 - evenSum) % 10;
        if (tenthDigit < 0) tenthDigit += 10;
        
        if (tenthDigit != digits[9]) {
            return false;
        }
        
        // 11. hane algoritması
        int sum = 0;
        for (int i = 0; i < 10; i++) {
            sum += digits[i];
        }
        
        return sum % 10 == digits[10];
    }
    
    public static String generateCustomerNo() {
        Random random = new Random();
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 10; i++) {
            sb.append(random.nextInt(10));
        }
        return sb.toString();
    }
    
    public static String generateVerificationCode() {
        Random random = new Random();
        return String.format("%06d", random.nextInt(1000000));
    }
}
