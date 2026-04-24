package com.garantibbva.mobile;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.mongodb.config.EnableMongoAuditing;

@SpringBootApplication
@EnableMongoAuditing
public class MobileBankingApplication {

    public static void main(String[] args) {
        SpringApplication.run(MobileBankingApplication.class, args);
        System.out.println("\n" +
            "╔══════════════════════════════════════════════════════════╗\n" +
            "║  🏦 Garanti BBVA Mobile Banking API Started!            ║\n" +
            "║  📍 API Docs: http://localhost:8001/api/swagger-ui.html ║\n" +
            "╚══════════════════════════════════════════════════════════╝\n");
    }
}