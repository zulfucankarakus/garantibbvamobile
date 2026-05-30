package com.garantibbva.akillibirikim.service;

import com.garantibbva.akillibirikim.model.Notification;
import com.garantibbva.akillibirikim.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class NotificationService {
    
    private final NotificationRepository notificationRepository;
    
    public List<Notification> getUserNotifications(String userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }
    
    public List<Notification> getUnreadNotifications(String userId) {
        return notificationRepository.findByUserIdAndReadOrderByCreatedAtDesc(userId, false);
    }
    
    public long getUnreadCount(String userId) {
        return notificationRepository.countByUserIdAndRead(userId, false);
    }
    
    public Notification markAsRead(String notificationId, String userId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("Bildirim bulunamadı"));
        
        if (!notification.getUserId().equals(userId)) {
            throw new RuntimeException("Bu bildirime erişim yetkiniz yok");
        }
        
        notification.setRead(true);
        return notificationRepository.save(notification);
    }
    
    public Map<String, Object> markAllAsRead(String userId) {
        List<Notification> unread = notificationRepository.findByUserIdAndReadOrderByCreatedAtDesc(userId, false);
        
        for (Notification n : unread) {
            n.setRead(true);
            notificationRepository.save(n);
        }
        
        return Map.of(
            "success", true,
            "marked_count", unread.size()
        );
    }
}
