package com.garantibbva.mobile.entity;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "notifications")
public class Notification {
    
    @Id
    private String id;
    @Indexed
    private String userId;
    private String title;
    private String message;
    private String notificationType;
    private boolean read = false;
    @CreatedDate
    private LocalDateTime createdAt;
    
    public Notification() {}
    
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public String getNotificationType() { return notificationType; }
    public void setNotificationType(String notificationType) { this.notificationType = notificationType; }
    public boolean isRead() { return read; }
    public void setRead(boolean read) { this.read = read; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    
    public static Builder builder() { return new Builder(); }
    
    public static class Builder {
        private final Notification n = new Notification();
        public Builder id(String id) { n.id = id; return this; }
        public Builder userId(String userId) { n.userId = userId; return this; }
        public Builder title(String title) { n.title = title; return this; }
        public Builder message(String message) { n.message = message; return this; }
        public Builder notificationType(String notificationType) { n.notificationType = notificationType; return this; }
        public Builder read(boolean read) { n.read = read; return this; }
        public Builder createdAt(LocalDateTime createdAt) { n.createdAt = createdAt; return this; }
        public Notification build() { return n; }
    }
}