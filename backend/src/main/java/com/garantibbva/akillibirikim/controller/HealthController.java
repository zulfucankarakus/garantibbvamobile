package com.garantibbva.akillibirikim.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
public class HealthController {
    
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        return ResponseEntity.ok(Map.of(
            "status", "healthy",
            "service", "Garanti BBVA Akıllı Birikim API",
            "version", "1.0.0",
            "framework", "Java Spring Boot",
            "timestamp", LocalDateTime.now().toString()
        ));
    }
}
