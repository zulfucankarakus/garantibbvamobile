package com.garantibbva.akillibirikim.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class VisionService {
    
    @Value("${OPENAI_API_KEY:}")
    private String openaiApiKey;
    
    @Value("${GEMINI_API_KEY:}")
    private String geminiApiKey;
    
    @Value("${GOOGLE_CLOUD_VISION_API_KEY:}")
    private String googleVisionApiKey;
    
    private final RestTemplate restTemplate = new RestTemplate();
    
    // Bilinen markalar ve kategorileri
    private static final Map<String, String> BRAND_CATEGORIES = Map.ofEntries(
        // Araçlar
        Map.entry("bmw", "vehicle"), Map.entry("mercedes", "vehicle"), Map.entry("audi", "vehicle"),
        Map.entry("toyota", "vehicle"), Map.entry("honda", "vehicle"), Map.entry("ford", "vehicle"),
        Map.entry("volkswagen", "vehicle"), Map.entry("renault", "vehicle"), Map.entry("fiat", "vehicle"),
        Map.entry("peugeot", "vehicle"), Map.entry("hyundai", "vehicle"), Map.entry("kia", "vehicle"),
        Map.entry("volvo", "vehicle"), Map.entry("tesla", "vehicle"), Map.entry("porsche", "vehicle"),
        // Elektronik
        Map.entry("iphone", "electronics"), Map.entry("samsung", "electronics"), Map.entry("apple", "electronics"),
        Map.entry("xiaomi", "electronics"), Map.entry("huawei", "electronics"), Map.entry("oppo", "electronics"),
        Map.entry("sony", "electronics"), Map.entry("lg", "electronics"), Map.entry("dell", "electronics"),
        Map.entry("hp", "electronics"), Map.entry("lenovo", "electronics"), Map.entry("asus", "electronics"),
        Map.entry("macbook", "electronics"), Map.entry("ipad", "electronics"), Map.entry("playstation", "electronics"),
        Map.entry("xbox", "electronics"), Map.entry("nintendo", "electronics"),
        // Ev eşyası
        Map.entry("bosch", "home"), Map.entry("siemens", "home"), Map.entry("arçelik", "home"),
        Map.entry("beko", "home"), Map.entry("vestel", "home"), Map.entry("dyson", "home"),
        // Giyim
        Map.entry("nike", "clothing"), Map.entry("adidas", "clothing"), Map.entry("puma", "clothing"),
        Map.entry("zara", "clothing"), Map.entry("mango", "clothing"), Map.entry("lcw", "clothing")
    );
    
    // Görsel tarama gerektiren kelimeler
    private static final List<String> VISUAL_TRIGGER_WORDS = Arrays.asList(
        "bunu", "şunu", "bu", "şu", "buna", "şuna", "bunun", "şunun",
        "görüyorum", "bakıyorum", "karşımda", "önümde", "elimde",
        "buradaki", "şuradaki", "ekrandaki"
    );
    
    /**
     * Sesli sorgudan ürün bilgisi çıkarma - ANA LOGIC
     */
    public Map<String, Object> parseVoiceQuery(String query) {
        if (query == null || query.trim().isEmpty()) {
            return Map.of(
                "success", false,
                "needs_visual", true,
                "reason", "empty_query"
            );
        }
        
        String queryLower = query.toLowerCase().trim();
        System.out.println("🎤 Parsing voice query: " + query);
        
        // 1. Görsel tarama tetikleyicileri kontrol et
        boolean needsVisual = VISUAL_TRIGGER_WORDS.stream()
            .anyMatch(word -> queryLower.contains(word));
        
        if (needsVisual) {
            System.out.println("👁️ Visual trigger detected - needs camera");
            return Map.of(
                "success", true,
                "needs_visual", true,
                "reason", "visual_reference_detected",
                "message", "Görsel tarama başlatılıyor..."
            );
        }
        
        // 2. Ürün adı ve kategori çıkarma
        Map<String, String> productInfo = extractProductInfo(queryLower);
        
        if (productInfo != null && productInfo.get("product_name") != null) {
            String productName = productInfo.get("product_name");
            String category = productInfo.get("category");
            
            System.out.println("✅ Product detected: " + productName + " (" + category + ")");
            
            return Map.of(
                "success", true,
                "needs_visual", false,
                "product_name", productName,
                "category", category,
                "confidence", 0.9,
                "message", productName + " için arama yapılıyor..."
            );
        }
        
        // 3. Genel sorgu - AI ile analiz et
        Map<String, Object> aiResult = analyzeQueryWithAI(query);
        if (aiResult != null && aiResult.get("product_name") != null) {
            return Map.of(
                "success", true,
                "needs_visual", false,
                "product_name", aiResult.get("product_name"),
                "category", aiResult.getOrDefault("category", "other"),
                "confidence", aiResult.getOrDefault("confidence", 0.7),
                "message", aiResult.get("product_name") + " için arama yapılıyor..."
            );
        }
        
        // 4. Hiçbir ürün bulunamadı - görsel tarama gerekli
        System.out.println("❓ No product found - requesting visual");
        return Map.of(
            "success", true,
            "needs_visual", true,
            "reason", "no_product_detected",
            "message", "Ürün tespit edilemedi. Lütfen ürünü kameraya gösterin."
        );
    }
    
    /**
     * Sorgudan ürün adı ve kategori çıkarma
     */
    private Map<String, String> extractProductInfo(String query) {
        // Ürün desenleri
        List<Pattern> patterns = Arrays.asList(
            // "BMW X3 nasıl alabilirim", "iPhone 15 almak istiyorum"
            Pattern.compile("([a-zA-ZğüşöçıİĞÜŞÖÇ]+\\s*[a-zA-Z0-9ğüşöçıİĞÜŞÖÇ\\-\\.]+(?:\\s+[a-zA-Z0-9\\-\\.]+)?)\\s*(?:nasıl|almak|satın|fiyat|kaç|ne kadar)", Pattern.CASE_INSENSITIVE),
            // "nasıl alabilirim BMW X3"
            Pattern.compile("(?:nasıl|almak|satın|fiyat).*?([a-zA-ZğüşöçıİĞÜŞÖÇ]+\\s*[a-zA-Z0-9ğüşöçıİĞÜŞÖÇ\\-\\.]+(?:\\s+[a-zA-Z0-9\\-\\.]+)?)", Pattern.CASE_INSENSITIVE)
        );
        
        for (Pattern pattern : patterns) {
            Matcher matcher = pattern.matcher(query);
            if (matcher.find()) {
                String potentialProduct = matcher.group(1).trim();
                
                // Çok kısa veya genel kelimeler değilse
                if (potentialProduct.length() > 2 && !isGenericWord(potentialProduct)) {
                    String category = detectCategory(potentialProduct);
                    return Map.of(
                        "product_name", formatProductName(potentialProduct),
                        "category", category
                    );
                }
            }
        }
        
        // Bilinen marka kontrolü
        for (Map.Entry<String, String> entry : BRAND_CATEGORIES.entrySet()) {
            if (query.contains(entry.getKey())) {
                // Marka bulundu, tam ürün adını çıkar
                String productName = extractFullProductName(query, entry.getKey());
                return Map.of(
                    "product_name", productName,
                    "category", entry.getValue()
                );
            }
        }
        
        return null;
    }
    
    /**
     * Tam ürün adını çıkar (marka + model)
     */
    private String extractFullProductName(String query, String brand) {
        String[] words = query.split("\\s+");
        StringBuilder productName = new StringBuilder();
        boolean foundBrand = false;
        int wordCount = 0;
        
        for (String word : words) {
            if (word.toLowerCase().contains(brand)) {
                foundBrand = true;
            }
            
            if (foundBrand && wordCount < 4) {
                // Durdurucu kelimeler
                if (word.matches("(?i)(nasıl|almak|satın|fiyat|kaç|istiyorum|ister|alabilir|misin|için)")) {
                    break;
                }
                if (productName.length() > 0) productName.append(" ");
                productName.append(word);
                wordCount++;
            }
        }
        
        String result = productName.toString().trim();
        return result.isEmpty() ? brand.substring(0, 1).toUpperCase() + brand.substring(1) : formatProductName(result);
    }
    
    /**
     * Ürün adını düzgün formata çevir
     */
    private String formatProductName(String name) {
        if (name == null || name.isEmpty()) return name;
        
        String[] words = name.split("\\s+");
        StringBuilder formatted = new StringBuilder();
        
        for (String word : words) {
            if (formatted.length() > 0) formatted.append(" ");
            
            // Model numaraları büyük harf
            if (word.matches("[A-Za-z]\\d+.*") || word.matches("\\d+.*")) {
                formatted.append(word.toUpperCase());
            } else {
                // İlk harf büyük
                formatted.append(word.substring(0, 1).toUpperCase())
                        .append(word.substring(1).toLowerCase());
            }
        }
        
        return formatted.toString();
    }
    
    /**
     * Kategori tespit et
     */
    private String detectCategory(String productName) {
        String lower = productName.toLowerCase();
        
        for (Map.Entry<String, String> entry : BRAND_CATEGORIES.entrySet()) {
            if (lower.contains(entry.getKey())) {
                return entry.getValue();
            }
        }
        
        // Anahtar kelime bazlı
        if (lower.matches(".*(araba|araç|otomobil|suv|sedan|hatchback).*")) return "vehicle";
        if (lower.matches(".*(telefon|laptop|bilgisayar|tablet|tv|televizyon|kulaklık|saat).*")) return "electronics";
        if (lower.matches(".*(buzdolabı|çamaşır|bulaşık|fırın|klima|elektrikli süpürge).*")) return "home";
        if (lower.matches(".*(ayakkabı|ceket|mont|pantolon|gömlek|elbise).*")) return "clothing";
        
        return "other";
    }
    
    /**
     * Genel kelime mi kontrol et
     */
    private boolean isGenericWord(String word) {
        List<String> genericWords = Arrays.asList(
            "bir", "bu", "şu", "o", "ve", "ile", "için", "nasıl", "ne", "kaç",
            "almak", "satın", "istiyorum", "ister", "misin", "misiniz"
        );
        return genericWords.contains(word.toLowerCase());
    }
    
    /**
     * AI ile sorgu analizi (Gemini)
     */
    private Map<String, Object> analyzeQueryWithAI(String query) {
        if (geminiApiKey == null || geminiApiKey.isEmpty()) {
            return null;
        }
        
        try {
            String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + geminiApiKey;
            
            String prompt = """nAşağıdaki Türkçe sorgudaki ürün adını ve kategorisini çıkar.
Sadece JSON formatında yanıt ver, başka açıklama yapma.

Sorgu: "%s"

Kategoriler: vehicle, electronics, home, clothing, jewelry, other

Örnek yanıt: {"product_name": "BMW X3", "category": "vehicle", "confidence": 0.95}

Eğer ürün bulunamazsa: {"product_name": null, "category": null, "confidence": 0}
""".formatted(query);
            
            Map<String, Object> requestBody = Map.of(
                "contents", List.of(Map.of(
                    "parts", List.of(Map.of("text", prompt))
                ))
            );
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
            
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> body = response.getBody();
                List<Map<String, Object>> candidates = (List<Map<String, Object>>) body.get("candidates");
                
                if (candidates != null && !candidates.isEmpty()) {
                    Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
                    List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
                    
                    if (parts != null && !parts.isEmpty()) {
                        String text = (String) parts.get(0).get("text");
                        // JSON parse
                        text = text.replaceAll("```json", "").replaceAll("```", "").trim();
                        
                        // Basit JSON parse
                        if (text.contains("product_name") && !text.contains("null")) {
                            Pattern namePattern = Pattern.compile("\"product_name\"\\s*:\\s*\"([^\"]+)\"");
                            Pattern categoryPattern = Pattern.compile("\"category\"\\s*:\\s*\"([^\"]+)\"");
                            
                            Matcher nameMatcher = namePattern.matcher(text);
                            Matcher categoryMatcher = categoryPattern.matcher(text);
                            
                            if (nameMatcher.find()) {
                                String productName = nameMatcher.group(1);
                                String category = categoryMatcher.find() ? categoryMatcher.group(1) : "other";
                                
                                return Map.of(
                                    "product_name", productName,
                                    "category", category,
                                    "confidence", 0.85
                                );
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("AI query analysis error: " + e.getMessage());
        }
        
        return null;
    }
    
    /**
     * Görsel analizi (Google Cloud Vision)
     */
    public Map<String, Object> analyzeImage(String imageBase64) {
        if (imageBase64 == null || imageBase64.isEmpty()) {
            return Map.of("success", false, "error", "No image provided");
        }
        
        try {
            String url = "https://vision.googleapis.com/v1/images:annotate?key=" + googleVisionApiKey;
            
            Map<String, Object> requestBody = Map.of(
                "requests", List.of(Map.of(
                    "image", Map.of("content", imageBase64),
                    "features", List.of(
                        Map.of("type", "WEB_DETECTION", "maxResults", 20),
                        Map.of("type", "LABEL_DETECTION", "maxResults", 10),
                        Map.of("type", "TEXT_DETECTION", "maxResults", 10),
                        Map.of("type", "LOGO_DETECTION", "maxResults", 5)
                    )
                ))
            );
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
            
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return parseVisionResponse(response.getBody());
            }
        } catch (Exception e) {
            System.err.println("Vision API error: " + e.getMessage());
        }
        
        return Map.of(
            "success", false,
            "error", "Vision analysis failed",
            "data", Map.of(
                "object_info", Map.of(
                    "object_name", "Bilinmeyen Ürün",
                    "category", "other",
                    "confidence", 0.3
                )
            )
        );
    }
    
    /**
     * Vision API yanıtını parse et
     */
    private Map<String, Object> parseVisionResponse(Map<String, Object> response) {
        List<Map<String, Object>> responses = (List<Map<String, Object>>) response.get("responses");
        
        if (responses == null || responses.isEmpty()) {
            return Map.of("success", false, "error", "Empty vision response");
        }
        
        Map<String, Object> result = responses.get(0);
        
        // Web detection - en önemli
        Map<String, Object> webDetection = (Map<String, Object>) result.get("webDetection");
        List<Map<String, Object>> webEntities = webDetection != null ? 
            (List<Map<String, Object>>) webDetection.get("webEntities") : null;
        List<Map<String, Object>> bestGuessLabels = webDetection != null ?
            (List<Map<String, Object>>) webDetection.get("bestGuessLabels") : null;
        
        // Labels
        List<Map<String, Object>> labels = (List<Map<String, Object>>) result.get("labelAnnotations");
        
        // Logo
        List<Map<String, Object>> logos = (List<Map<String, Object>>) result.get("logoAnnotations");
        
        // Text (OCR)
        List<Map<String, Object>> textAnnotations = (List<Map<String, Object>>) result.get("textAnnotations");
        String ocrText = textAnnotations != null && !textAnnotations.isEmpty() ?
            (String) textAnnotations.get(0).get("description") : "";
        
        // En iyi tahmin
        String objectName = "Bilinmeyen Ürün";
        double confidence = 0.5;
        String brand = null;
        
        // Best guess labels kullan
        if (bestGuessLabels != null && !bestGuessLabels.isEmpty()) {
            objectName = (String) bestGuessLabels.get(0).get("label");
            confidence = 0.85;
        } else if (webEntities != null && !webEntities.isEmpty()) {
            objectName = (String) webEntities.get(0).get("description");
            Number score = (Number) webEntities.get(0).get("score");
            confidence = score != null ? score.doubleValue() : 0.6;
        } else if (labels != null && !labels.isEmpty()) {
            objectName = (String) labels.get(0).get("description");
            Number score = (Number) labels.get(0).get("score");
            confidence = score != null ? score.doubleValue() : 0.5;
        }
        
        // Logo varsa marka olarak kullan
        if (logos != null && !logos.isEmpty()) {
            brand = (String) logos.get(0).get("description");
        }
        
        String category = detectCategory(objectName);
        
        return Map.of(
            "success", true,
            "data", Map.of(
                "object_info", Map.of(
                    "object_name", objectName,
                    "category", category,
                    "confidence", confidence,
                    "brand", brand != null ? brand : "",
                    "ocr_text", ocrText.replace("\n", " ").trim()
                )
            )
        );
    }
    
    /**
     * Fiyat tarama
     */
    public Map<String, Object> scrapePrices(String productName, String category) {
        // Tahmini fiyatlar - gerçek scraping için harici servis gerekli
        Map<String, Map<String, Object>> categoryPrices = Map.of(
            "vehicle", Map.of(
                "min", 800000, "max", 5000000, "avg", 2000000,
                "sites", List.of(
                    Map.of("site", "sahibinden.com", "price", 1800000, "url", "https://sahibinden.com"),
                    Map.of("site", "arabam.com", "price", 1900000, "url", "https://arabam.com"),
                    Map.of("site", "otomerkezi.com", "price", 2100000, "url", "https://otomerkezi.com")
                )
            ),
            "electronics", Map.of(
                "min", 5000, "max", 100000, "avg", 30000,
                "sites", List.of(
                    Map.of("site", "Hepsiburada", "price", 28000, "url", "https://hepsiburada.com"),
                    Map.of("site", "Trendyol", "price", 29500, "url", "https://trendyol.com"),
                    Map.of("site", "N11", "price", 27500, "url", "https://n11.com")
                )
            ),
            "home", Map.of(
                "min", 3000, "max", 50000, "avg", 15000,
                "sites", List.of(
                    Map.of("site", "Hepsiburada", "price", 14000, "url", "https://hepsiburada.com"),
                    Map.of("site", "Trendyol", "price", 15500, "url", "https://trendyol.com"),
                    Map.of("site", "MediaMarkt", "price", 16000, "url", "https://mediamarkt.com.tr")
                )
            )
        );
        
        Map<String, Object> priceData = categoryPrices.getOrDefault(category, Map.of(
            "min", 1000, "max", 10000, "avg", 5000,
            "sites", List.of(
                Map.of("site", "Hepsiburada", "price", 4500, "url", "https://hepsiburada.com"),
                Map.of("site", "Trendyol", "price", 5000, "url", "https://trendyol.com"),
                Map.of("site", "N11", "price", 5500, "url", "https://n11.com")
            )
        ));
        
        List<Map<String, Object>> sites = (List<Map<String, Object>>) priceData.get("sites");
        int minPrice = (int) priceData.get("min");
        int maxPrice = (int) priceData.get("max");
        int avgPrice = (int) priceData.get("avg");
        
        // En ucuz siteyi bul
        String cheapestSite = "";
        int cheapestPrice = Integer.MAX_VALUE;
        for (Map<String, Object> site : sites) {
            int price = (int) site.get("price");
            if (price < cheapestPrice) {
                cheapestPrice = price;
                cheapestSite = (String) site.get("site");
            }
        }
        
        return Map.of(
            "success", true,
            "data", Map.of(
                "product_name", productName,
                "category", category,
                "results", sites,
                "statistics", Map.of(
                    "min_price", cheapestPrice,
                    "max_price", maxPrice,
                    "average_price", avgPrice,
                    "cheapest_site", cheapestSite
                ),
                "estimated", true,
                "note", "Tahmini fiyatlar gösterilmektedir. Güncel fiyatlar için siteleri ziyaret edin."
            )
        );
    }
    
    /**
     * Speech-to-text
     */
    public Map<String, Object> speechToText(MultipartFile audioFile) {
        if (audioFile == null || audioFile.isEmpty()) {
            return Map.of("success", false, "error", "No audio file provided");
        }
        
        try {
            // OpenAI Whisper API
            String url = "https://api.openai.com/v1/audio/transcriptions";
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);
            headers.setBearerAuth(openaiApiKey);
            
            org.springframework.util.LinkedMultiValueMap<String, Object> body = 
                new org.springframework.util.LinkedMultiValueMap<>();
            body.add("file", new org.springframework.core.io.ByteArrayResource(audioFile.getBytes()) {
                @Override
                public String getFilename() {
                    return audioFile.getOriginalFilename() != null ? 
                        audioFile.getOriginalFilename() : "audio.m4a";
                }
            });
            body.add("model", "whisper-1");
            body.add("language", "tr");
            
            HttpEntity<org.springframework.util.LinkedMultiValueMap<String, Object>> entity = 
                new HttpEntity<>(body, headers);
            
            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
            
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                String text = (String) response.getBody().get("text");
                return Map.of(
                    "success", true,
                    "text", text != null ? text : ""
                );
            }
        } catch (Exception e) {
            System.err.println("Speech-to-text error: " + e.getMessage());
        }
        
        return Map.of("success", false, "error", "Speech recognition failed");
    }
    
    /**
     * Finansal öneri
     */
    public Map<String, Object> getFinancialAdvice(Map<String, Object> objectData, Map<String, Object> priceData) {
        // Basit finansal öneri
        double userBalance = 50000; // Örnek bakiye
        double estimatedPrice = 100000; // Örnek fiyat
        
        if (priceData != null && priceData.get("statistics") != null) {
            Map<String, Object> stats = (Map<String, Object>) priceData.get("statistics");
            estimatedPrice = ((Number) stats.getOrDefault("average_price", 100000)).doubleValue();
        }
        
        boolean canAfford = userBalance >= estimatedPrice;
        
        List<Map<String, Object>> recommendations = new ArrayList<>();
        
        if (!canAfford) {
            // Kredi önerisi
            double loanAmount = estimatedPrice - userBalance;
            double interestRate = 3.5;
            int months = 12;
            double monthlyPayment = (loanAmount * (1 + interestRate * months / 100)) / months;
            
            recommendations.add(Map.of(
                "type", "loan",
                "title", "İhtiyaç Kredisi",
                "description", "Uygun faiz oranlarıyla kredi kullanın",
                "details", Map.of(
                    "amount", loanAmount,
                    "months", months,
                    "interest_rate", interestRate,
                    "monthly_payment", monthlyPayment
                ),
                "cta", "Kredi Başvurusu Yap"
            ));
            
            // Taksit önerisi
            recommendations.add(Map.of(
                "type", "installment",
                "title", "Kredi Kartı Taksit",
                "description", "Kredi kartınızla taksitle alın",
                "details", Map.of(
                    "installment_options", List.of(
                        Map.of("months", 3, "monthly_payment", estimatedPrice / 3),
                        Map.of("months", 6, "monthly_payment", estimatedPrice / 6),
                        Map.of("months", 9, "monthly_payment", estimatedPrice / 9),
                        Map.of("months", 12, "monthly_payment", estimatedPrice / 12)
                    )
                ),
                "cta", "Taksit Seçeneklerini Gör"
            ));
        }
        
        // Yatırım önerisi
        recommendations.add(Map.of(
            "type", "investment",
            "title", "Birikim Planı",
            "description", "Hedefiniz için birikim yapın",
            "details", Map.of(
                "recommendation", "Altın ağırlıklı portföy ile biriktirin"
            ),
            "cta", "Birikim Planı Oluştur"
        ));
        
        return Map.of(
            "success", true,
            "data", Map.of(
                "user_balance", userBalance,
                "estimated_price", estimatedPrice,
                "can_afford", canAfford,
                "recommendations", recommendations
            )
        );
    }
}
