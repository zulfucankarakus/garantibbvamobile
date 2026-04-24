package com.garantibbva.mobile.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@Tag(name = "Public", description = "Herkese acik endpointler")
public class PublicController {
    
    @GetMapping("/financial-tips")
    @Operation(summary = "Finansal ipucu listesi")
    public ResponseEntity<List<Map<String, Object>>> getFinancialTips() {
        List<Map<String, Object>> tips = List.of(
            Map.of("id", "1", "title", "Biriktirmeye Baslayin", "description", "Gelirinizin en az %20'sini biriktirin", "category", "savings"),
            Map.of("id", "2", "title", "Borclarinizi Odeyin", "description", "Yuksek faizli borclarinizi once odeyin", "category", "debt"),
            Map.of("id", "3", "title", "Acil Durum Fonu", "description", "3-6 aylik giderinizi karsilayacak fon olusturun", "category", "emergency")
        );
        return ResponseEntity.ok(tips);
    }
    
    @GetMapping("/wealth-categories")
    @Operation(summary = "Varlik kategorileri")
    public ResponseEntity<List<Map<String, Object>>> getWealthCategories() {
        List<Map<String, Object>> categories = List.of(
            Map.of("id", "1", "name", "Mevduat", "icon", "bank", "color", "#00A19A"),
            Map.of("id", "2", "name", "Yatirim", "icon", "trending-up", "color", "#7C3AED"),
            Map.of("id", "3", "name", "Altin", "icon", "star", "color", "#F59E0B")
        );
        return ResponseEntity.ok(categories);
    }
    
    @GetMapping("/saving-plans")
    @Operation(summary = "Birikim planlari")
    public ResponseEntity<List<Map<String, Object>>> getSavingPlans() {
        List<Map<String, Object>> plans = List.of(
            Map.of("id", "1", "title", "Ev Alim Plani", "description", "Hayalinizdeki eve ulasin", "icon", "home"),
            Map.of("id", "2", "title", "Arac Alim Plani", "description", "Yeni arabaniz icin biriktirin", "icon", "car"),
            Map.of("id", "3", "title", "Tatil Plani", "description", "Hayalinizdeki tatil icin", "icon", "plane")
        );
        return ResponseEntity.ok(plans);
    }
}