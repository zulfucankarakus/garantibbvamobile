"""
Push Notification Service - Mobil Bildirim Servisi
Expo Push Notifications ve Firebase Cloud Messaging desteği

Features:
- Expo Push Notification desteği (React Native)
- Firebase Cloud Messaging (FCM) alternatifi
- Batch bildirim gönderimi
- Bildirim geçmişi kaydetme
"""
import os
import json
import asyncio
import aiohttp
from typing import Dict, List, Optional, Any
from datetime import datetime
from enum import Enum


class NotificationPriority(str, Enum):
    """Bildirim önceliği"""
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"


class NotificationCategory(str, Enum):
    """Bildirim kategorisi"""
    CREDIT_ADVICE = "credit_advice"
    MILESTONE_REACHED = "milestone_reached"
    PAYMENT_REMINDER = "payment_reminder"
    MARKET_ALERT = "market_alert"
    GENERAL = "general"


class PushNotificationService:
    """Push notification servisi"""
    
    def __init__(self):
        self.expo_push_url = "https://exp.host/--/api/v2/push/send"
        self.fcm_url = "https://fcm.googleapis.com/fcm/send"
        self.fcm_server_key = os.environ.get("FCM_SERVER_KEY", "")
        
        # İstatistikler
        self.stats = {
            "total_sent": 0,
            "successful": 0,
            "failed": 0
        }
    
    async def send_expo_notification(
        self,
        push_token: str,
        title: str,
        body: str,
        data: Optional[Dict] = None,
        priority: NotificationPriority = NotificationPriority.NORMAL,
        badge: int = 1,
        sound: str = "default",
        category: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Expo Push Notification gönder
        
        Args:
            push_token: Expo push token (ExponentPushToken[xxx])
            title: Bildirim başlığı
            body: Bildirim içeriği
            data: Ek veri (JSON)
            priority: Öncelik seviyesi
            badge: Badge sayısı
            sound: Bildirim sesi
            category: Bildirim kategorisi
        
        Returns:
            Gönderim sonucu
        """
        if not push_token or not push_token.startswith("ExponentPushToken"):
            return {
                "success": False,
                "error": "Geçersiz Expo push token"
            }
        
        message = {
            "to": push_token,
            "title": title,
            "body": body,
            "sound": sound,
            "badge": badge,
            "priority": priority.value,
            "channelId": "default"
        }
        
        if data:
            message["data"] = data
        
        if category:
            message["categoryId"] = category
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.expo_push_url,
                    json=message,
                    headers={
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                        "Accept-Encoding": "gzip, deflate"
                    }
                ) as response:
                    result = await response.json()
                    
                    self.stats["total_sent"] += 1
                    
                    if result.get("data", {}).get("status") == "ok":
                        self.stats["successful"] += 1
                        return {
                            "success": True,
                            "ticket_id": result.get("data", {}).get("id"),
                            "status": "sent"
                        }
                    else:
                        self.stats["failed"] += 1
                        return {
                            "success": False,
                            "error": result.get("data", {}).get("message", "Gönderim başarısız"),
                            "details": result
                        }
                        
        except Exception as e:
            self.stats["failed"] += 1
            return {
                "success": False,
                "error": f"Bildirim gönderilemedi: {str(e)}"
            }
    
    async def send_batch_notifications(
        self,
        notifications: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Toplu bildirim gönder
        
        Args:
            notifications: Bildirim listesi [{push_token, title, body, data}, ...]
        
        Returns:
            Toplu gönderim sonucu
        """
        results = []
        successful = 0
        failed = 0
        
        # Expo batch limit: 100
        batch_size = 100
        
        for i in range(0, len(notifications), batch_size):
            batch = notifications[i:i + batch_size]
            
            messages = []
            for notif in batch:
                if notif.get("push_token", "").startswith("ExponentPushToken"):
                    messages.append({
                        "to": notif["push_token"],
                        "title": notif.get("title", "Bildirim"),
                        "body": notif.get("body", ""),
                        "sound": notif.get("sound", "default"),
                        "badge": notif.get("badge", 1),
                        "priority": notif.get("priority", "normal"),
                        "data": notif.get("data", {}),
                        "channelId": "default"
                    })
            
            if not messages:
                continue
            
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.post(
                        self.expo_push_url,
                        json=messages,
                        headers={
                            "Content-Type": "application/json",
                            "Accept": "application/json"
                        }
                    ) as response:
                        result = await response.json()
                        
                        if isinstance(result.get("data"), list):
                            for item in result["data"]:
                                if item.get("status") == "ok":
                                    successful += 1
                                else:
                                    failed += 1
                                results.append(item)
                        
            except Exception as e:
                failed += len(messages)
                results.append({"error": str(e)})
        
        self.stats["total_sent"] += successful + failed
        self.stats["successful"] += successful
        self.stats["failed"] += failed
        
        return {
            "success": failed == 0,
            "total": len(notifications),
            "successful": successful,
            "failed": failed,
            "results": results
        }
    
    async def send_credit_advice_notification(
        self,
        push_token: str,
        notification_content: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Kredi önerisi bildirimi gönder
        
        Args:
            push_token: Kullanıcının push token'ı
            notification_content: SmartCreditAdvisor'dan gelen bildirim içeriği
        
        Returns:
            Gönderim sonucu
        """
        return await self.send_expo_notification(
            push_token=push_token,
            title=notification_content.get("title", "Kredi Fırsatı"),
            body=notification_content.get("body", ""),
            data=notification_content.get("data", {}),
            priority=NotificationPriority.HIGH if notification_content.get("priority") == "high" else NotificationPriority.NORMAL,
            badge=notification_content.get("badge", 1),
            sound=notification_content.get("sound", "default"),
            category=notification_content.get("category", "CREDIT_ADVICE")
        )
    
    async def send_milestone_notification(
        self,
        push_token: str,
        product_name: str,
        milestone_title: str,
        milestone_emoji: str,
        progress_percent: float,
        plan_id: str
    ) -> Dict[str, Any]:
        """
        Milestone ulaşıldığında bildirim gönder
        """
        title = f"{milestone_emoji} {product_name}"
        body = f"{milestone_title}! Hedefinizin %{progress_percent:.0f}'ine ulaştınız."
        
        data = {
            "type": "milestone_reached",
            "plan_id": plan_id,
            "progress_percent": progress_percent,
            "action_url": f"/savings-investment/{plan_id}"
        }
        
        return await self.send_expo_notification(
            push_token=push_token,
            title=title,
            body=body,
            data=data,
            priority=NotificationPriority.HIGH,
            category="MILESTONE_REACHED"
        )
    
    def get_stats(self) -> Dict[str, Any]:
        """İstatistikleri getir"""
        return {
            **self.stats,
            "success_rate": round(
                (self.stats["successful"] / self.stats["total_sent"] * 100) 
                if self.stats["total_sent"] > 0 else 0, 
                2
            )
        }


# Global instance
push_notification_service = PushNotificationService()


# Bildirim kategorileri için action handlers
NOTIFICATION_ACTIONS = {
    "CREDIT_ADVICE": [
        {"identifier": "VIEW_DETAILS", "title": "Detayları Gör", "options": {"foreground": True}},
        {"identifier": "APPLY_NOW", "title": "Hemen Başvur", "options": {"foreground": True}},
        {"identifier": "REMIND_LATER", "title": "Sonra Hatırlat", "options": {"destructive": False}}
    ],
    "MILESTONE_REACHED": [
        {"identifier": "VIEW_PROGRESS", "title": "İlerlemeyi Gör", "options": {"foreground": True}},
        {"identifier": "ADD_CONTRIBUTION", "title": "Para Ekle", "options": {"foreground": True}}
    ]
}
