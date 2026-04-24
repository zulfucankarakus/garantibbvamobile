package com.garantibbva.mobile.dto.response;

import java.time.LocalDateTime;

public class NotificationResponse {
    private String id;
    private String userId;
    private String title;
    private String message;
    private String notificationType;
    private boolean read;
    private LocalDateTime createdAt;
    
    public NotificationResponse() {}
    
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
        private final NotificationResponse r = new NotificationResponse();
        public Builder id(String id) { r.id = id; return this; }
        public Builder userId(String userId) { r.userId = userId; return this; }
        public Builder title(String title) { r.title = title; return this; }
        public Builder message(String message) { r.message = message; return this; }
        public Builder notificationType(String notificationType) { r.notificationType = notificationType; return this; }
        public Builder read(boolean read) { r.read = read; return this; }
        public Builder createdAt(LocalDateTime createdAt) { r.createdAt = createdAt; return this; }
        public NotificationResponse build() { return r; }
    }
}