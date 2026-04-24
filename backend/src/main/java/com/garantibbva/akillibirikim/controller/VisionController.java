package com.garantibbva.akillibirikim.controller;

import com.garantibbva.akillibirikim.service.VisionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/vision")
@RequiredArgsConstructor
public class VisionController {
    
    private final VisionService visionService;
    
    /**
     * Sesli sorgudan ürün bilgisi çıkarma
     * - Ürün adı belirtilmişse: needs_visual = false, direkt ürün bilgisi döner
     * - Ürün adı belirtilmemişse ("bunu", "şunu" vs): needs_visual = true
     */
    @PostMapping("/parse-query")
    public ResponseEntity<Map<String, Object>> parseVoiceQuery(@RequestBody Map<String, String> request) {
        String query = request.get("query");
        return ResponseEntity.ok(visionService.parseVoiceQuery(query));
    }
    
    /**
     * Görsel analizi
     */
    @PostMapping("/analyze")
    public ResponseEntity<Map<String, Object>> analyzeImage(@RequestBody Map<String, String> request) {
        String imageBase64 = request.get("image_base64");
        return ResponseEntity.ok(visionService.analyzeImage(imageBase64));
    }
    
    /**
     * Fiyat tarama (web scraping)
     */
    @PostMapping("/scrape-prices")
    public ResponseEntity<Map<String, Object>> scrapePrices(@RequestBody Map<String, String> request) {
        String productName = request.get("product_name");
        String category = request.getOrDefault("category", "other");
        return ResponseEntity.ok(visionService.scrapePrices(productName, category));
    }
    
    /**
     * Speech-to-text API
     */
    @PostMapping("/speech-to-text")
    public ResponseEntity<Map<String, Object>> speechToText(@RequestParam("audio_file") MultipartFile audioFile) {
        return ResponseEntity.ok(visionService.speechToText(audioFile));
    }
    
    /**
     * Finansal öneri al
     */
    @PostMapping("/financial-advice")
    public ResponseEntity<Map<String, Object>> getFinancialAdvice(@RequestBody Map<String, Object> request) {
        Map<String, Object> objectData = (Map<String, Object>) request.get("object_data");
        Map<String, Object> priceData = (Map<String, Object>) request.get("price_data");
        return ResponseEntity.ok(visionService.getFinancialAdvice(objectData, priceData));
    }
}
