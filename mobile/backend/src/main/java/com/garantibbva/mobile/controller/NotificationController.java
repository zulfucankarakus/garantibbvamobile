package com.garantibbva.mobile.controller;

import com.garantibbva.mobile.dto.response.NotificationResponse;
import com.garantibbva.mobile.security.SecurityUtils;
import com.garantibbva.mobile.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/notifications")
@Tag(name = "Notifications", description = "Bildirim yonetimi")
public class NotificationController {
    
    private final NotificationService notificationService;
    private final SecurityUtils securityUtils;
    
    public NotificationController(NotificationService notificationService, SecurityUtils securityUtils) {
        this.notificationService = notificationService;
        this.securityUtils = securityUtils;
    }
    
    @GetMapping
    @Operation(summary = "Bildirimleri listele")
    public ResponseEntity<List<NotificationResponse>> getNotifications(
            @RequestParam(defaultValue = "false") boolean unreadOnly) {
        return ResponseEntity.ok(notificationService.getUserNotifications(securityUtils.getCurrentUserId(), unreadOnly));
    }
    
    @PutMapping("/{notificationId}/read")
    @Operation(summary = "Bildirimi okundu olarak isaretle")
    public ResponseEntity<Map<String, String>> markAsRead(@PathVariable String notificationId) {
        notificationService.markAsRead(notificationId);
        return ResponseEntity.ok(Map.of("message", "Okundu olarak isaretlendi"));
    }
    
    @GetMapping("/unread-count")
    @Operation(summary = "Okunmamis bildirim sayisi")
    public ResponseEntity<Map<String, Long>> getUnreadCount() {
        return ResponseEntity.ok(Map.of("count", notificationService.getUnreadCount(securityUtils.getCurrentUserId())));
    }
}