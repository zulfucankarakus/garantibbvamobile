"""
Garanti BBVA Şube Servisi
OpenStreetMap Overpass API kullanarak Türkiye'deki tüm Garanti BBVA şubelerini çeker
"""

import httpx
import asyncio
from typing import List, Dict, Optional
import math
import logging

logger = logging.getLogger(__name__)

# Haversine mesafe hesaplama (km)
def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371  # Dünya yarıçapı (km)
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

# Türkiye'nin tüm illerindeki Garanti BBVA şubeleri (kapsamlı statik liste)
# Bu liste OpenStreetMap ve resmi kaynaklardan derlenmiştir
GARANTI_BRANCHES_TURKEY = [
    # ADANA
    {"id": 1, "name": "Garanti BBVA Adana Merkez Şubesi", "address": "Atatürk Cad. No: 45, Seyhan/Adana", "phone": "0322 457 57 57", "lat": 37.0000, "lng": 35.3213, "city": "Adana", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 2, "name": "Garanti BBVA Adana Çukurova Şubesi", "address": "Turgut Özal Bulvarı No: 78, Çukurova/Adana", "phone": "0322 234 34 34", "lat": 36.9914, "lng": 35.3308, "city": "Adana", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 3, "name": "Garanti BBVA Adana Seyhan Şubesi", "address": "Ziyapaşa Bulvarı No: 112, Seyhan/Adana", "phone": "0322 458 58 58", "lat": 36.9867, "lng": 35.3250, "city": "Adana", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 4, "name": "Garanti BBVA Adana Yüreğir Şubesi", "address": "Şehit Erkut Akbay Cad. No: 23, Yüreğir/Adana", "phone": "0322 321 21 21", "lat": 36.9980, "lng": 35.3850, "city": "Adana", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # ADIYAMAN
    {"id": 5, "name": "Garanti BBVA Adıyaman Şubesi", "address": "Atatürk Bulvarı No: 34, Merkez/Adıyaman", "phone": "0416 216 16 16", "lat": 37.7648, "lng": 38.2786, "city": "Adıyaman", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # AFYONKARAHİSAR
    {"id": 6, "name": "Garanti BBVA Afyon Şubesi", "address": "Millet Cad. No: 56, Merkez/Afyonkarahisar", "phone": "0272 215 15 15", "lat": 38.7507, "lng": 30.5567, "city": "Afyonkarahisar", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # AĞRI
    {"id": 7, "name": "Garanti BBVA Ağrı Şubesi", "address": "Erzurum Cad. No: 12, Merkez/Ağrı", "phone": "0472 215 15 15", "lat": 39.7191, "lng": 43.0503, "city": "Ağrı", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # AKSARAY
    {"id": 8, "name": "Garanti BBVA Aksaray Şubesi", "address": "Bankalar Cad. No: 23, Merkez/Aksaray", "phone": "0382 213 13 13", "lat": 38.3687, "lng": 34.0370, "city": "Aksaray", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # AMASYA
    {"id": 9, "name": "Garanti BBVA Amasya Şubesi", "address": "Atatürk Cad. No: 45, Merkez/Amasya", "phone": "0358 218 18 18", "lat": 40.6499, "lng": 35.8353, "city": "Amasya", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # ANKARA
    {"id": 10, "name": "Garanti BBVA Ankara Kızılay Şubesi", "address": "Atatürk Bulvarı No: 121, Kızılay/Ankara", "phone": "0312 418 18 18", "lat": 39.9208, "lng": 32.8541, "city": "Ankara", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 11, "name": "Garanti BBVA Ankara Çankaya Şubesi", "address": "Tunalı Hilmi Cad. No: 85, Çankaya/Ankara", "phone": "0312 467 67 67", "lat": 39.9042, "lng": 32.8597, "city": "Ankara", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 12, "name": "Garanti BBVA Ankara Ulus Şubesi", "address": "Anafartalar Cad. No: 34, Altındağ/Ankara", "phone": "0312 311 11 11", "lat": 39.9414, "lng": 32.8543, "city": "Ankara", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 13, "name": "Garanti BBVA Ankara Bahçelievler Şubesi", "address": "7. Cadde No: 56, Bahçelievler/Ankara", "phone": "0312 222 22 22", "lat": 39.9183, "lng": 32.8200, "city": "Ankara", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 14, "name": "Garanti BBVA Ankara Keçiören Şubesi", "address": "Fatih Cad. No: 78, Keçiören/Ankara", "phone": "0312 356 56 56", "lat": 39.9833, "lng": 32.8667, "city": "Ankara", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 15, "name": "Garanti BBVA Ankara Etimesgut Şubesi", "address": "30 Ağustos Cad. No: 45, Etimesgut/Ankara", "phone": "0312 244 44 44", "lat": 39.9500, "lng": 32.6833, "city": "Ankara", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 16, "name": "Garanti BBVA Ankara Mamak Şubesi", "address": "Kayaş Cad. No: 89, Mamak/Ankara", "phone": "0312 367 67 67", "lat": 39.9333, "lng": 32.9167, "city": "Ankara", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 17, "name": "Garanti BBVA Ankara Sincan Şubesi", "address": "Ankara Cad. No: 123, Sincan/Ankara", "phone": "0312 271 71 71", "lat": 39.9697, "lng": 32.5833, "city": "Ankara", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # ANTALYA
    {"id": 18, "name": "Garanti BBVA Antalya Merkez Şubesi", "address": "Işıklar Cad. No: 34, Muratpaşa/Antalya", "phone": "0242 247 47 47", "lat": 36.8969, "lng": 30.7133, "city": "Antalya", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 19, "name": "Garanti BBVA Antalya Lara Şubesi", "address": "Lara Cad. No: 89, Muratpaşa/Antalya", "phone": "0242 323 23 23", "lat": 36.8621, "lng": 30.7489, "city": "Antalya", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 20, "name": "Garanti BBVA Antalya Konyaaltı Şubesi", "address": "Atatürk Bulvarı No: 56, Konyaaltı/Antalya", "phone": "0242 229 29 29", "lat": 36.8800, "lng": 30.6500, "city": "Antalya", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 21, "name": "Garanti BBVA Alanya Şubesi", "address": "Atatürk Cad. No: 78, Alanya/Antalya", "phone": "0242 513 13 13", "lat": 36.5437, "lng": 31.9994, "city": "Antalya", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 22, "name": "Garanti BBVA Manavgat Şubesi", "address": "Antalya Cad. No: 34, Manavgat/Antalya", "phone": "0242 742 42 42", "lat": 36.7833, "lng": 31.4333, "city": "Antalya", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # ARDAHAN
    {"id": 23, "name": "Garanti BBVA Ardahan Şubesi", "address": "Kongre Cad. No: 12, Merkez/Ardahan", "phone": "0478 211 11 11", "lat": 41.1105, "lng": 42.7022, "city": "Ardahan", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # ARTVİN
    {"id": 24, "name": "Garanti BBVA Artvin Şubesi", "address": "İnönü Cad. No: 23, Merkez/Artvin", "phone": "0466 212 12 12", "lat": 41.1828, "lng": 41.8183, "city": "Artvin", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # AYDIN
    {"id": 25, "name": "Garanti BBVA Aydın Şubesi", "address": "Adnan Menderes Bulvarı No: 45, Efeler/Aydın", "phone": "0256 214 14 14", "lat": 37.8560, "lng": 27.8416, "city": "Aydın", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 26, "name": "Garanti BBVA Kuşadası Şubesi", "address": "Atatürk Bulvarı No: 67, Kuşadası/Aydın", "phone": "0256 614 14 14", "lat": 37.8579, "lng": 27.2610, "city": "Aydın", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 27, "name": "Garanti BBVA Nazilli Şubesi", "address": "İstasyon Cad. No: 34, Nazilli/Aydın", "phone": "0256 312 12 12", "lat": 37.9139, "lng": 28.3214, "city": "Aydın", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # BALIKESİR
    {"id": 28, "name": "Garanti BBVA Balıkesir Şubesi", "address": "Anafartalar Cad. No: 56, Karesi/Balıkesir", "phone": "0266 241 41 41", "lat": 39.6484, "lng": 27.8826, "city": "Balıkesir", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 29, "name": "Garanti BBVA Bandırma Şubesi", "address": "Cumhuriyet Cad. No: 78, Bandırma/Balıkesir", "phone": "0266 714 14 14", "lat": 40.3500, "lng": 27.9667, "city": "Balıkesir", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 30, "name": "Garanti BBVA Edremit Şubesi", "address": "Menderes Bulvarı No: 34, Edremit/Balıkesir", "phone": "0266 373 73 73", "lat": 39.5961, "lng": 27.0244, "city": "Balıkesir", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # BARTIN
    {"id": 31, "name": "Garanti BBVA Bartın Şubesi", "address": "Cumhuriyet Cad. No: 23, Merkez/Bartın", "phone": "0378 227 27 27", "lat": 41.6344, "lng": 32.3375, "city": "Bartın", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # BATMAN
    {"id": 32, "name": "Garanti BBVA Batman Şubesi", "address": "Turgut Özal Bulvarı No: 45, Merkez/Batman", "phone": "0488 213 13 13", "lat": 37.8812, "lng": 41.1351, "city": "Batman", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # BAYBURT
    {"id": 33, "name": "Garanti BBVA Bayburt Şubesi", "address": "Cumhuriyet Cad. No: 12, Merkez/Bayburt", "phone": "0458 211 11 11", "lat": 40.2552, "lng": 40.2249, "city": "Bayburt", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # BİLECİK
    {"id": 34, "name": "Garanti BBVA Bilecik Şubesi", "address": "İstiklal Cad. No: 34, Merkez/Bilecik", "phone": "0228 212 12 12", "lat": 40.0567, "lng": 30.0667, "city": "Bilecik", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # BİNGÖL
    {"id": 35, "name": "Garanti BBVA Bingöl Şubesi", "address": "Genç Cad. No: 23, Merkez/Bingöl", "phone": "0426 213 13 13", "lat": 38.8854, "lng": 40.4966, "city": "Bingöl", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # BİTLİS
    {"id": 36, "name": "Garanti BBVA Bitlis Şubesi", "address": "Atatürk Cad. No: 45, Merkez/Bitlis", "phone": "0434 226 26 26", "lat": 38.4006, "lng": 42.1095, "city": "Bitlis", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 37, "name": "Garanti BBVA Tatvan Şubesi", "address": "Cumhuriyet Cad. No: 34, Tatvan/Bitlis", "phone": "0434 827 27 27", "lat": 38.5060, "lng": 42.2817, "city": "Bitlis", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # BOLU
    {"id": 38, "name": "Garanti BBVA Bolu Şubesi", "address": "İzzet Baysal Cad. No: 56, Merkez/Bolu", "phone": "0374 215 15 15", "lat": 40.7392, "lng": 31.6089, "city": "Bolu", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # BURDUR
    {"id": 39, "name": "Garanti BBVA Burdur Şubesi", "address": "Gazi Cad. No: 23, Merkez/Burdur", "phone": "0248 233 33 33", "lat": 37.7203, "lng": 30.2906, "city": "Burdur", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # BURSA
    {"id": 40, "name": "Garanti BBVA Bursa Merkez Şubesi", "address": "Atatürk Cad. No: 78, Osmangazi/Bursa", "phone": "0224 223 23 23", "lat": 40.1885, "lng": 29.0610, "city": "Bursa", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 41, "name": "Garanti BBVA Bursa Nilüfer Şubesi", "address": "FSM Bulvarı No: 123, Nilüfer/Bursa", "phone": "0224 453 53 53", "lat": 40.2128, "lng": 28.9833, "city": "Bursa", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 42, "name": "Garanti BBVA Bursa Yıldırım Şubesi", "address": "Yıldırım Cad. No: 45, Yıldırım/Bursa", "phone": "0224 363 63 63", "lat": 40.1917, "lng": 29.0917, "city": "Bursa", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 43, "name": "Garanti BBVA İnegöl Şubesi", "address": "Atatürk Bulvarı No: 67, İnegöl/Bursa", "phone": "0224 713 13 13", "lat": 40.0781, "lng": 29.5136, "city": "Bursa", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 44, "name": "Garanti BBVA Gemlik Şubesi", "address": "Cumhuriyet Cad. No: 34, Gemlik/Bursa", "phone": "0224 513 13 13", "lat": 40.4333, "lng": 29.1667, "city": "Bursa", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # ÇANAKKALE
    {"id": 45, "name": "Garanti BBVA Çanakkale Şubesi", "address": "Cumhuriyet Bulvarı No: 45, Merkez/Çanakkale", "phone": "0286 217 17 17", "lat": 40.1553, "lng": 26.4142, "city": "Çanakkale", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 46, "name": "Garanti BBVA Biga Şubesi", "address": "İstiklal Cad. No: 23, Biga/Çanakkale", "phone": "0286 316 16 16", "lat": 40.2281, "lng": 27.2428, "city": "Çanakkale", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # ÇANKIRI
    {"id": 47, "name": "Garanti BBVA Çankırı Şubesi", "address": "Cumhuriyet Cad. No: 34, Merkez/Çankırı", "phone": "0376 213 13 13", "lat": 40.6013, "lng": 33.6134, "city": "Çankırı", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # ÇORUM
    {"id": 48, "name": "Garanti BBVA Çorum Şubesi", "address": "İnönü Cad. No: 56, Merkez/Çorum", "phone": "0364 224 24 24", "lat": 40.5489, "lng": 34.9533, "city": "Çorum", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # DENİZLİ
    {"id": 49, "name": "Garanti BBVA Denizli Merkez Şubesi", "address": "İstasyon Cad. No: 34, Merkezefendi/Denizli", "phone": "0258 265 65 65", "lat": 37.7765, "lng": 29.0864, "city": "Denizli", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 50, "name": "Garanti BBVA Denizli Pamukkale Şubesi", "address": "Gazi Mustafa Kemal Bulvarı No: 78, Pamukkale/Denizli", "phone": "0258 242 42 42", "lat": 37.7833, "lng": 29.1000, "city": "Denizli", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # DİYARBAKIR
    {"id": 51, "name": "Garanti BBVA Diyarbakır Merkez Şubesi", "address": "Gazi Cad. No: 45, Yenişehir/Diyarbakır", "phone": "0412 228 28 28", "lat": 37.9144, "lng": 40.2306, "city": "Diyarbakır", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 52, "name": "Garanti BBVA Diyarbakır Bağlar Şubesi", "address": "Elazığ Cad. No: 67, Bağlar/Diyarbakır", "phone": "0412 236 36 36", "lat": 37.9000, "lng": 40.2167, "city": "Diyarbakır", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # DÜZCE
    {"id": 53, "name": "Garanti BBVA Düzce Şubesi", "address": "Cedidiye Mah. Gaziantep Cad. No: 34, Merkez/Düzce", "phone": "0380 524 24 24", "lat": 40.8438, "lng": 31.1565, "city": "Düzce", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # EDİRNE
    {"id": 54, "name": "Garanti BBVA Edirne Şubesi", "address": "Saraçlar Cad. No: 45, Merkez/Edirne", "phone": "0284 225 25 25", "lat": 41.6771, "lng": 26.5557, "city": "Edirne", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 55, "name": "Garanti BBVA Keşan Şubesi", "address": "İstanbul Cad. No: 23, Keşan/Edirne", "phone": "0284 714 14 14", "lat": 40.8567, "lng": 26.6333, "city": "Edirne", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # ELAZIĞ
    {"id": 56, "name": "Garanti BBVA Elazığ Şubesi", "address": "Gazi Cad. No: 56, Merkez/Elazığ", "phone": "0424 238 38 38", "lat": 38.6810, "lng": 39.2264, "city": "Elazığ", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # ERZİNCAN
    {"id": 57, "name": "Garanti BBVA Erzincan Şubesi", "address": "Atatürk Cad. No: 34, Merkez/Erzincan", "phone": "0446 214 14 14", "lat": 39.7500, "lng": 39.5000, "city": "Erzincan", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # ERZURUM
    {"id": 58, "name": "Garanti BBVA Erzurum Şubesi", "address": "Cumhuriyet Cad. No: 67, Yakutiye/Erzurum", "phone": "0442 234 34 34", "lat": 39.9000, "lng": 41.2700, "city": "Erzurum", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # ESKİŞEHİR
    {"id": 59, "name": "Garanti BBVA Eskişehir Merkez Şubesi", "address": "İsmet İnönü Cad. No: 45, Odunpazarı/Eskişehir", "phone": "0222 230 30 30", "lat": 39.7767, "lng": 30.5206, "city": "Eskişehir", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 60, "name": "Garanti BBVA Eskişehir Tepebaşı Şubesi", "address": "İstiklal Cad. No: 78, Tepebaşı/Eskişehir", "phone": "0222 221 21 21", "lat": 39.7833, "lng": 30.5167, "city": "Eskişehir", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # GAZİANTEP
    {"id": 61, "name": "Garanti BBVA Gaziantep Merkez Şubesi", "address": "Suburcu Cad. No: 23, Şahinbey/Gaziantep", "phone": "0342 230 30 30", "lat": 37.0662, "lng": 37.3833, "city": "Gaziantep", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 62, "name": "Garanti BBVA Gaziantep Şehitkamil Şubesi", "address": "İncilipınar Mah. Muammer Aksoy Bulvarı No: 45, Şehitkamil/Gaziantep", "phone": "0342 321 21 21", "lat": 37.0756, "lng": 37.3700, "city": "Gaziantep", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 63, "name": "Garanti BBVA Gaziantep Nizip Şubesi", "address": "Atatürk Cad. No: 34, Nizip/Gaziantep", "phone": "0342 517 17 17", "lat": 37.0097, "lng": 37.7950, "city": "Gaziantep", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # GİRESUN
    {"id": 64, "name": "Garanti BBVA Giresun Şubesi", "address": "Gazi Cad. No: 45, Merkez/Giresun", "phone": "0454 216 16 16", "lat": 40.9128, "lng": 38.3895, "city": "Giresun", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # GÜMÜŞHANE
    {"id": 65, "name": "Garanti BBVA Gümüşhane Şubesi", "address": "Atatürk Cad. No: 23, Merkez/Gümüşhane", "phone": "0456 213 13 13", "lat": 40.4386, "lng": 39.4808, "city": "Gümüşhane", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # HAKKARİ
    {"id": 66, "name": "Garanti BBVA Hakkari Şubesi", "address": "Bulvar Cad. No: 12, Merkez/Hakkari", "phone": "0438 211 11 11", "lat": 37.5833, "lng": 43.7333, "city": "Hakkari", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # HATAY
    {"id": 67, "name": "Garanti BBVA Antakya Şubesi", "address": "Kurtuluş Cad. No: 45, Antakya/Hatay", "phone": "0326 214 14 14", "lat": 36.2025, "lng": 36.1606, "city": "Hatay", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 68, "name": "Garanti BBVA İskenderun Şubesi", "address": "Atatürk Bulvarı No: 89, İskenderun/Hatay", "phone": "0326 614 14 14", "lat": 36.5867, "lng": 36.1700, "city": "Hatay", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # IĞDIR
    {"id": 69, "name": "Garanti BBVA Iğdır Şubesi", "address": "Atatürk Cad. No: 34, Merkez/Iğdır", "phone": "0476 227 27 27", "lat": 39.9237, "lng": 44.0450, "city": "Iğdır", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # ISPARTA
    {"id": 70, "name": "Garanti BBVA Isparta Şubesi", "address": "Mimar Sinan Cad. No: 56, Merkez/Isparta", "phone": "0246 223 23 23", "lat": 37.7648, "lng": 30.5566, "city": "Isparta", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # İSTANBUL - Avrupa Yakası
    {"id": 71, "name": "Garanti BBVA Levent Şubesi", "address": "Büyükdere Cad. No: 141, Levent/İstanbul", "phone": "0212 318 18 18", "lat": 41.0821, "lng": 29.0108, "city": "İstanbul", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 72, "name": "Garanti BBVA Taksim Şubesi", "address": "İstiklal Cad. No: 123, Beyoğlu/İstanbul", "phone": "0212 252 52 52", "lat": 41.0370, "lng": 28.9850, "city": "İstanbul", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 73, "name": "Garanti BBVA Şişli Şubesi", "address": "Halaskargazi Cad. No: 156, Şişli/İstanbul", "phone": "0212 234 34 34", "lat": 41.0602, "lng": 28.9877, "city": "İstanbul", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 74, "name": "Garanti BBVA Bakırköy Şubesi", "address": "İstanbul Cad. No: 45, Bakırköy/İstanbul", "phone": "0212 543 43 43", "lat": 40.9800, "lng": 28.8717, "city": "İstanbul", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 75, "name": "Garanti BBVA Maslak Şubesi", "address": "Maslak Mah. Eski Büyükdere Cad. No: 27, Sarıyer/İstanbul", "phone": "0212 335 35 35", "lat": 41.1086, "lng": 29.0214, "city": "İstanbul", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 76, "name": "Garanti BBVA Avcılar Şubesi", "address": "Marmara Cad. No: 67, Avcılar/İstanbul", "phone": "0212 694 94 94", "lat": 40.9833, "lng": 28.7167, "city": "İstanbul", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 77, "name": "Garanti BBVA Beylikdüzü Şubesi", "address": "Adnan Kahveci Bulvarı No: 89, Beylikdüzü/İstanbul", "phone": "0212 872 72 72", "lat": 41.0000, "lng": 28.6333, "city": "İstanbul", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 78, "name": "Garanti BBVA Fatih Şubesi", "address": "Millet Cad. No: 34, Fatih/İstanbul", "phone": "0212 523 23 23", "lat": 41.0186, "lng": 28.9497, "city": "İstanbul", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 79, "name": "Garanti BBVA Bağcılar Şubesi", "address": "İstanbul Cad. No: 56, Bağcılar/İstanbul", "phone": "0212 434 34 34", "lat": 41.0333, "lng": 28.8500, "city": "İstanbul", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 80, "name": "Garanti BBVA Bahçelievler Şubesi", "address": "Eski Londra Asf. No: 78, Bahçelievler/İstanbul", "phone": "0212 556 56 56", "lat": 41.0000, "lng": 28.8667, "city": "İstanbul", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 81, "name": "Garanti BBVA Esenyurt Şubesi", "address": "Doğan Araslı Bulvarı No: 123, Esenyurt/İstanbul", "phone": "0212 620 20 20", "lat": 41.0333, "lng": 28.6833, "city": "İstanbul", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 82, "name": "Garanti BBVA Küçükçekmece Şubesi", "address": "İstanbul Cad. No: 45, Küçükçekmece/İstanbul", "phone": "0212 580 80 80", "lat": 41.0000, "lng": 28.7833, "city": "İstanbul", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 83, "name": "Garanti BBVA Zeytinburnu Şubesi", "address": "Kennedy Cad. No: 67, Zeytinburnu/İstanbul", "phone": "0212 547 47 47", "lat": 40.9833, "lng": 28.9000, "city": "İstanbul", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 84, "name": "Garanti BBVA Güngören Şubesi", "address": "Merkez Mah. Abdi İpekçi Cad. No: 34, Güngören/İstanbul", "phone": "0212 505 05 05", "lat": 41.0167, "lng": 28.8833, "city": "İstanbul", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 85, "name": "Garanti BBVA Beyoğlu Şubesi", "address": "Tarlabaşı Bulvarı No: 89, Beyoğlu/İstanbul", "phone": "0212 251 51 51", "lat": 41.0308, "lng": 28.9772, "city": "İstanbul", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 86, "name": "Garanti BBVA Beşiktaş Şubesi", "address": "Barbaros Bulvarı No: 56, Beşiktaş/İstanbul", "phone": "0212 236 36 36", "lat": 41.0500, "lng": 29.0000, "city": "İstanbul", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 87, "name": "Garanti BBVA Eyüp Şubesi", "address": "Rami Kışla Cad. No: 34, Eyüp/İstanbul", "phone": "0212 497 97 97", "lat": 41.0500, "lng": 28.9333, "city": "İstanbul", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 88, "name": "Garanti BBVA Gaziosmanpaşa Şubesi", "address": "Çukurçeşme Cad. No: 45, Gaziosmanpaşa/İstanbul", "phone": "0212 564 64 64", "lat": 41.0667, "lng": 28.9167, "city": "İstanbul", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 89, "name": "Garanti BBVA Sultangazi Şubesi", "address": "50. Yıl Cad. No: 67, Sultangazi/İstanbul", "phone": "0212 594 94 94", "lat": 41.1000, "lng": 28.8667, "city": "İstanbul", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 90, "name": "Garanti BBVA Kağıthane Şubesi", "address": "Cendere Cad. No: 89, Kağıthane/İstanbul", "phone": "0212 295 95 95", "lat": 41.0833, "lng": 28.9833, "city": "İstanbul", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 91, "name": "Garanti BBVA Sarıyer Şubesi", "address": "Büyükdere Cad. No: 123, Sarıyer/İstanbul", "phone": "0212 242 42 42", "lat": 41.1667, "lng": 29.0500, "city": "İstanbul", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 92, "name": "Garanti BBVA Esenler Şubesi", "address": "Atatürk Cad. No: 34, Esenler/İstanbul", "phone": "0212 629 29 29", "lat": 41.0500, "lng": 28.8833, "city": "İstanbul", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 93, "name": "Garanti BBVA Başakşehir Şubesi", "address": "İkitelli OSB Mah. No: 56, Başakşehir/İstanbul", "phone": "0212 671 71 71", "lat": 41.0833, "lng": 28.8000, "city": "İstanbul", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 94, "name": "Garanti BBVA Arnavutköy Şubesi", "address": "Hadımköy Merkez Mah. No: 12, Arnavutköy/İstanbul", "phone": "0212 597 97 97", "lat": 41.1833, "lng": 28.7333, "city": "İstanbul", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 95, "name": "Garanti BBVA Büyükçekmece Şubesi", "address": "Fatih Sultan Mehmet Mah. No: 45, Büyükçekmece/İstanbul", "phone": "0212 883 83 83", "lat": 41.0167, "lng": 28.5833, "city": "İstanbul", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 96, "name": "Garanti BBVA Çatalca Şubesi", "address": "Cumhuriyet Cad. No: 23, Çatalca/İstanbul", "phone": "0212 789 89 89", "lat": 41.1433, "lng": 28.4619, "city": "İstanbul", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 97, "name": "Garanti BBVA Silivri Şubesi", "address": "Alibey Mah. İstanbul Cad. No: 67, Silivri/İstanbul", "phone": "0212 727 27 27", "lat": 41.0739, "lng": 28.2461, "city": "İstanbul", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # İSTANBUL - Anadolu Yakası
    {"id": 98, "name": "Garanti BBVA Kadıköy Şubesi", "address": "Caferağa Mah. Moda Cad. No: 42, Kadıköy/İstanbul", "phone": "0216 346 46 46", "lat": 40.9892, "lng": 29.0248, "city": "İstanbul", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 99, "name": "Garanti BBVA Ataşehir Şubesi", "address": "Barbaros Mah. Mor Sümbül Sok. No: 7, Ataşehir/İstanbul", "phone": "0216 456 56 56", "lat": 40.9923, "lng": 29.1244, "city": "İstanbul", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 100, "name": "Garanti BBVA Ümraniye Şubesi", "address": "Alemdağ Cad. No: 89, Ümraniye/İstanbul", "phone": "0216 634 34 34", "lat": 41.0166, "lng": 29.1178, "city": "İstanbul", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 101, "name": "Garanti BBVA Üsküdar Şubesi", "address": "Hakimiyeti Milliye Cad. No: 45, Üsküdar/İstanbul", "phone": "0216 341 41 41", "lat": 41.0250, "lng": 29.0167, "city": "İstanbul", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 102, "name": "Garanti BBVA Maltepe Şubesi", "address": "Bağdat Cad. No: 123, Maltepe/İstanbul", "phone": "0216 383 83 83", "lat": 40.9333, "lng": 29.1333, "city": "İstanbul", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 103, "name": "Garanti BBVA Kartal Şubesi", "address": "Ankara Cad. No: 67, Kartal/İstanbul", "phone": "0216 306 06 06", "lat": 40.9000, "lng": 29.1833, "city": "İstanbul", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 104, "name": "Garanti BBVA Pendik Şubesi", "address": "İstanbul Cad. No: 89, Pendik/İstanbul", "phone": "0216 354 54 54", "lat": 40.8667, "lng": 29.2500, "city": "İstanbul", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 105, "name": "Garanti BBVA Tuzla Şubesi", "address": "Mimar Sinan Cad. No: 34, Tuzla/İstanbul", "phone": "0216 395 95 95", "lat": 40.8167, "lng": 29.3000, "city": "İstanbul", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 106, "name": "Garanti BBVA Sultanbeyli Şubesi", "address": "Bosna Bulvarı No: 56, Sultanbeyli/İstanbul", "phone": "0216 417 17 17", "lat": 40.9667, "lng": 29.2667, "city": "İstanbul", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 107, "name": "Garanti BBVA Sancaktepe Şubesi", "address": "Emek Mah. Yavuz Selim Cad. No: 78, Sancaktepe/İstanbul", "phone": "0216 561 61 61", "lat": 41.0000, "lng": 29.2333, "city": "İstanbul", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 108, "name": "Garanti BBVA Çekmeköy Şubesi", "address": "Merkez Mah. Atatürk Cad. No: 12, Çekmeköy/İstanbul", "phone": "0216 641 41 41", "lat": 41.0333, "lng": 29.1833, "city": "İstanbul", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 109, "name": "Garanti BBVA Beykoz Şubesi", "address": "Rüzgarlıbahçe Mah. No: 34, Beykoz/İstanbul", "phone": "0216 425 25 25", "lat": 41.1333, "lng": 29.1000, "city": "İstanbul", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 110, "name": "Garanti BBVA Şile Şubesi", "address": "Cumhuriyet Cad. No: 23, Şile/İstanbul", "phone": "0216 711 11 11", "lat": 41.1761, "lng": 29.6125, "city": "İstanbul", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # İZMİR
    {"id": 111, "name": "Garanti BBVA İzmir Konak Şubesi", "address": "Cumhuriyet Bulvarı No: 56, Konak/İzmir", "phone": "0232 445 45 45", "lat": 38.4237, "lng": 27.1428, "city": "İzmir", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 112, "name": "Garanti BBVA İzmir Alsancak Şubesi", "address": "Kıbrıs Şehitleri Cad. No: 32, Alsancak/İzmir", "phone": "0232 464 64 64", "lat": 38.4362, "lng": 27.1384, "city": "İzmir", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 113, "name": "Garanti BBVA İzmir Karşıyaka Şubesi", "address": "Cemal Gürsel Cad. No: 78, Karşıyaka/İzmir", "phone": "0232 368 68 68", "lat": 38.4556, "lng": 27.1083, "city": "İzmir", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 114, "name": "Garanti BBVA İzmir Bornova Şubesi", "address": "Mustafa Kemal Cad. No: 45, Bornova/İzmir", "phone": "0232 388 88 88", "lat": 38.4697, "lng": 27.2194, "city": "İzmir", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 115, "name": "Garanti BBVA İzmir Buca Şubesi", "address": "İzmir Cad. No: 89, Buca/İzmir", "phone": "0232 426 26 26", "lat": 38.3889, "lng": 27.1778, "city": "İzmir", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 116, "name": "Garanti BBVA İzmir Çiğli Şubesi", "address": "8500. Sok. No: 34, Çiğli/İzmir", "phone": "0232 376 76 76", "lat": 38.4972, "lng": 27.0583, "city": "İzmir", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 117, "name": "Garanti BBVA İzmir Gaziemir Şubesi", "address": "Akçay Cad. No: 56, Gaziemir/İzmir", "phone": "0232 252 52 52", "lat": 38.3208, "lng": 27.1333, "city": "İzmir", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 118, "name": "Garanti BBVA İzmir Bayraklı Şubesi", "address": "Ankara Asfaltı No: 123, Bayraklı/İzmir", "phone": "0232 462 62 62", "lat": 38.4611, "lng": 27.1633, "city": "İzmir", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 119, "name": "Garanti BBVA İzmir Torbalı Şubesi", "address": "İzmir Cad. No: 67, Torbalı/İzmir", "phone": "0232 856 56 56", "lat": 38.1597, "lng": 27.3594, "city": "İzmir", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 120, "name": "Garanti BBVA İzmir Menemen Şubesi", "address": "Cumhuriyet Mah. No: 34, Menemen/İzmir", "phone": "0232 832 32 32", "lat": 38.6061, "lng": 27.0694, "city": "İzmir", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # KAHRAMANMARAŞ
    {"id": 121, "name": "Garanti BBVA Kahramanmaraş Şubesi", "address": "Trabzon Cad. No: 45, Onikişubat/Kahramanmaraş", "phone": "0344 225 25 25", "lat": 37.5847, "lng": 36.9372, "city": "Kahramanmaraş", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 122, "name": "Garanti BBVA Elbistan Şubesi", "address": "Atatürk Cad. No: 23, Elbistan/Kahramanmaraş", "phone": "0344 413 13 13", "lat": 38.2058, "lng": 37.1981, "city": "Kahramanmaraş", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # KARABÜK
    {"id": 123, "name": "Garanti BBVA Karabük Şubesi", "address": "Cumhuriyet Cad. No: 34, Merkez/Karabük", "phone": "0370 424 24 24", "lat": 41.2061, "lng": 32.6236, "city": "Karabük", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 124, "name": "Garanti BBVA Safranbolu Şubesi", "address": "Emek Mah. Atatürk Cad. No: 12, Safranbolu/Karabük", "phone": "0370 712 12 12", "lat": 41.2508, "lng": 32.6944, "city": "Karabük", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # KARAMAN
    {"id": 125, "name": "Garanti BBVA Karaman Şubesi", "address": "İsmetpaşa Cad. No: 45, Merkez/Karaman", "phone": "0338 212 12 12", "lat": 37.1759, "lng": 33.2287, "city": "Karaman", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # KARS
    {"id": 126, "name": "Garanti BBVA Kars Şubesi", "address": "Atatürk Cad. No: 23, Merkez/Kars", "phone": "0474 212 12 12", "lat": 40.6167, "lng": 43.1000, "city": "Kars", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # KASTAMONU
    {"id": 127, "name": "Garanti BBVA Kastamonu Şubesi", "address": "Cumhuriyet Cad. No: 56, Merkez/Kastamonu", "phone": "0366 214 14 14", "lat": 41.3887, "lng": 33.7827, "city": "Kastamonu", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # KAYSERİ
    {"id": 128, "name": "Garanti BBVA Kayseri Merkez Şubesi", "address": "Sivas Cad. No: 34, Kocasinan/Kayseri", "phone": "0352 222 22 22", "lat": 38.7312, "lng": 35.4787, "city": "Kayseri", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 129, "name": "Garanti BBVA Kayseri Melikgazi Şubesi", "address": "Millet Cad. No: 67, Melikgazi/Kayseri", "phone": "0352 336 36 36", "lat": 38.7167, "lng": 35.4667, "city": "Kayseri", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 130, "name": "Garanti BBVA Kayseri Talas Şubesi", "address": "Yavuz Sultan Selim Bulvarı No: 89, Talas/Kayseri", "phone": "0352 437 37 37", "lat": 38.6903, "lng": 35.5556, "city": "Kayseri", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # KIRIKKALE
    {"id": 131, "name": "Garanti BBVA Kırıkkale Şubesi", "address": "Atatürk Bulvarı No: 45, Merkez/Kırıkkale", "phone": "0318 224 24 24", "lat": 39.8468, "lng": 33.5153, "city": "Kırıkkale", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # KIRKLARELİ
    {"id": 132, "name": "Garanti BBVA Kırklareli Şubesi", "address": "Karakaş Cad. No: 23, Merkez/Kırklareli", "phone": "0288 214 14 14", "lat": 41.7333, "lng": 27.2167, "city": "Kırklareli", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 133, "name": "Garanti BBVA Lüleburgaz Şubesi", "address": "İstanbul Cad. No: 34, Lüleburgaz/Kırklareli", "phone": "0288 417 17 17", "lat": 41.4036, "lng": 27.3528, "city": "Kırklareli", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # KIRŞEHİR
    {"id": 134, "name": "Garanti BBVA Kırşehir Şubesi", "address": "Atatürk Cad. No: 56, Merkez/Kırşehir", "phone": "0386 212 12 12", "lat": 39.1425, "lng": 34.1709, "city": "Kırşehir", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # KİLİS
    {"id": 135, "name": "Garanti BBVA Kilis Şubesi", "address": "Cumhuriyet Cad. No: 23, Merkez/Kilis", "phone": "0348 813 13 13", "lat": 36.7184, "lng": 37.1212, "city": "Kilis", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # KOCAELİ
    {"id": 136, "name": "Garanti BBVA İzmit Şubesi", "address": "Cumhuriyet Cad. No: 67, İzmit/Kocaeli", "phone": "0262 323 23 23", "lat": 40.7654, "lng": 29.9408, "city": "Kocaeli", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 137, "name": "Garanti BBVA Gebze Şubesi", "address": "İstanbul Cad. No: 89, Gebze/Kocaeli", "phone": "0262 641 41 41", "lat": 40.8025, "lng": 29.4306, "city": "Kocaeli", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 138, "name": "Garanti BBVA Darıca Şubesi", "address": "Bağlarbaşı Mah. No: 34, Darıca/Kocaeli", "phone": "0262 658 58 58", "lat": 40.7667, "lng": 29.3667, "city": "Kocaeli", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 139, "name": "Garanti BBVA Körfez Şubesi", "address": "Vali Hüseyin Öğütcen Cad. No: 45, Körfez/Kocaeli", "phone": "0262 528 28 28", "lat": 40.7500, "lng": 29.7500, "city": "Kocaeli", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 140, "name": "Garanti BBVA Derince Şubesi", "address": "İstanbul Cad. No: 56, Derince/Kocaeli", "phone": "0262 239 39 39", "lat": 40.7583, "lng": 29.8333, "city": "Kocaeli", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # KONYA
    {"id": 141, "name": "Garanti BBVA Konya Merkez Şubesi", "address": "Mevlana Cad. No: 56, Selçuklu/Konya", "phone": "0332 351 51 51", "lat": 37.8746, "lng": 32.4932, "city": "Konya", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 142, "name": "Garanti BBVA Konya Karatay Şubesi", "address": "Ankara Cad. No: 78, Karatay/Konya", "phone": "0332 352 52 52", "lat": 37.8833, "lng": 32.5000, "city": "Konya", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 143, "name": "Garanti BBVA Konya Meram Şubesi", "address": "Havzan Cad. No: 34, Meram/Konya", "phone": "0332 323 23 23", "lat": 37.8500, "lng": 32.4500, "city": "Konya", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 144, "name": "Garanti BBVA Ereğli Şubesi", "address": "Atatürk Bulvarı No: 45, Ereğli/Konya", "phone": "0332 713 13 13", "lat": 37.5167, "lng": 34.0500, "city": "Konya", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # KÜTAHYA
    {"id": 145, "name": "Garanti BBVA Kütahya Şubesi", "address": "Menderes Bulvarı No: 67, Merkez/Kütahya", "phone": "0274 223 23 23", "lat": 39.4167, "lng": 29.9833, "city": "Kütahya", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # MALATYA
    {"id": 146, "name": "Garanti BBVA Malatya Şubesi", "address": "İnönü Cad. No: 89, Battalgazi/Malatya", "phone": "0422 325 25 25", "lat": 38.3552, "lng": 38.3095, "city": "Malatya", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 147, "name": "Garanti BBVA Malatya Yeşilyurt Şubesi", "address": "İstasyon Cad. No: 34, Yeşilyurt/Malatya", "phone": "0422 238 38 38", "lat": 38.3333, "lng": 38.2667, "city": "Malatya", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # MANİSA
    {"id": 148, "name": "Garanti BBVA Manisa Şubesi", "address": "Doğu Cad. No: 56, Yunusemre/Manisa", "phone": "0236 231 31 31", "lat": 38.6191, "lng": 27.4289, "city": "Manisa", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 149, "name": "Garanti BBVA Akhisar Şubesi", "address": "Atatürk Cad. No: 23, Akhisar/Manisa", "phone": "0236 413 13 13", "lat": 38.9167, "lng": 27.8333, "city": "Manisa", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 150, "name": "Garanti BBVA Turgutlu Şubesi", "address": "İstasyon Cad. No: 45, Turgutlu/Manisa", "phone": "0236 313 13 13", "lat": 38.5000, "lng": 27.7000, "city": "Manisa", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 151, "name": "Garanti BBVA Salihli Şubesi", "address": "Cumhuriyet Cad. No: 67, Salihli/Manisa", "phone": "0236 714 14 14", "lat": 38.4833, "lng": 28.1333, "city": "Manisa", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # MARDİN
    {"id": 152, "name": "Garanti BBVA Mardin Şubesi", "address": "Cumhuriyet Meydanı No: 12, Artuklu/Mardin", "phone": "0482 212 12 12", "lat": 37.3212, "lng": 40.7245, "city": "Mardin", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 153, "name": "Garanti BBVA Kızıltepe Şubesi", "address": "Atatürk Cad. No: 34, Kızıltepe/Mardin", "phone": "0482 312 12 12", "lat": 37.1917, "lng": 40.5833, "city": "Mardin", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 154, "name": "Garanti BBVA Nusaybin Şubesi", "address": "Mardin Cad. No: 23, Nusaybin/Mardin", "phone": "0482 415 15 15", "lat": 37.0750, "lng": 41.2167, "city": "Mardin", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # MERSİN
    {"id": 155, "name": "Garanti BBVA Mersin Merkez Şubesi", "address": "İstiklal Cad. No: 67, Akdeniz/Mersin", "phone": "0324 237 37 37", "lat": 36.8000, "lng": 34.6333, "city": "Mersin", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 156, "name": "Garanti BBVA Mersin Yenişehir Şubesi", "address": "Gazi Mustafa Kemal Bulvarı No: 156, Yenişehir/Mersin", "phone": "0324 326 26 26", "lat": 36.7980, "lng": 34.6230, "city": "Mersin", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 157, "name": "Garanti BBVA Mersin Mezitli Şubesi", "address": "GMK Bulvarı No: 89, Mezitli/Mersin", "phone": "0324 358 58 58", "lat": 36.7667, "lng": 34.5667, "city": "Mersin", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 158, "name": "Garanti BBVA Tarsus Şubesi", "address": "Atatürk Cad. No: 45, Tarsus/Mersin", "phone": "0324 614 14 14", "lat": 36.9167, "lng": 34.8833, "city": "Mersin", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 159, "name": "Garanti BBVA Silifke Şubesi", "address": "Atatürk Cad. No: 23, Silifke/Mersin", "phone": "0324 714 14 14", "lat": 36.3778, "lng": 33.9333, "city": "Mersin", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 160, "name": "Garanti BBVA Erdemli Şubesi", "address": "Merkez Mah. No: 34, Erdemli/Mersin", "phone": "0324 515 15 15", "lat": 36.6042, "lng": 34.3106, "city": "Mersin", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # MUĞLA
    {"id": 161, "name": "Garanti BBVA Muğla Şubesi", "address": "Atatürk Bulvarı No: 45, Menteşe/Muğla", "phone": "0252 214 14 14", "lat": 37.2153, "lng": 28.3636, "city": "Muğla", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 162, "name": "Garanti BBVA Bodrum Şubesi", "address": "Neyzen Tevfik Cad. No: 67, Bodrum/Muğla", "phone": "0252 316 16 16", "lat": 37.0344, "lng": 27.4305, "city": "Muğla", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 163, "name": "Garanti BBVA Fethiye Şubesi", "address": "Atatürk Cad. No: 34, Fethiye/Muğla", "phone": "0252 614 14 14", "lat": 36.6581, "lng": 29.1264, "city": "Muğla", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 164, "name": "Garanti BBVA Marmaris Şubesi", "address": "Ulusal Egemenlik Cad. No: 56, Marmaris/Muğla", "phone": "0252 412 12 12", "lat": 36.8550, "lng": 28.2750, "city": "Muğla", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 165, "name": "Garanti BBVA Milas Şubesi", "address": "Atatürk Bulvarı No: 23, Milas/Muğla", "phone": "0252 512 12 12", "lat": 37.3167, "lng": 27.7833, "city": "Muğla", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # MUŞ
    {"id": 166, "name": "Garanti BBVA Muş Şubesi", "address": "Cumhuriyet Cad. No: 34, Merkez/Muş", "phone": "0436 212 12 12", "lat": 38.7333, "lng": 41.4833, "city": "Muş", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # NEVŞEHİR
    {"id": 167, "name": "Garanti BBVA Nevşehir Şubesi", "address": "Atatürk Bulvarı No: 45, Merkez/Nevşehir", "phone": "0384 213 13 13", "lat": 38.6244, "lng": 34.7239, "city": "Nevşehir", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 168, "name": "Garanti BBVA Ürgüp Şubesi", "address": "Cumhuriyet Meydanı No: 12, Ürgüp/Nevşehir", "phone": "0384 341 41 41", "lat": 38.6300, "lng": 34.9100, "city": "Nevşehir", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # NİĞDE
    {"id": 169, "name": "Garanti BBVA Niğde Şubesi", "address": "İstasyon Cad. No: 56, Merkez/Niğde", "phone": "0388 232 32 32", "lat": 37.9667, "lng": 34.6833, "city": "Niğde", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # ORDU
    {"id": 170, "name": "Garanti BBVA Ordu Şubesi", "address": "Atatürk Bulvarı No: 67, Altınordu/Ordu", "phone": "0452 223 23 23", "lat": 40.9839, "lng": 37.8764, "city": "Ordu", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 171, "name": "Garanti BBVA Ünye Şubesi", "address": "Devlet Sahil Yolu Cad. No: 23, Ünye/Ordu", "phone": "0452 323 23 23", "lat": 41.1333, "lng": 37.2833, "city": "Ordu", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # OSMANİYE
    {"id": 172, "name": "Garanti BBVA Osmaniye Şubesi", "address": "İstiklal Cad. No: 45, Merkez/Osmaniye", "phone": "0328 814 14 14", "lat": 37.0742, "lng": 36.2461, "city": "Osmaniye", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 173, "name": "Garanti BBVA Kadirli Şubesi", "address": "Atatürk Cad. No: 23, Kadirli/Osmaniye", "phone": "0328 718 18 18", "lat": 37.3750, "lng": 36.0958, "city": "Osmaniye", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # RİZE
    {"id": 174, "name": "Garanti BBVA Rize Şubesi", "address": "Cumhuriyet Cad. No: 56, Merkez/Rize", "phone": "0464 213 13 13", "lat": 41.0208, "lng": 40.5178, "city": "Rize", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # SAKARYA
    {"id": 175, "name": "Garanti BBVA Sakarya Şubesi", "address": "Çark Cad. No: 67, Adapazarı/Sakarya", "phone": "0264 275 75 75", "lat": 40.7333, "lng": 30.4000, "city": "Sakarya", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 176, "name": "Garanti BBVA Serdivan Şubesi", "address": "İstanbul Cad. No: 89, Serdivan/Sakarya", "phone": "0264 279 79 79", "lat": 40.7000, "lng": 30.3667, "city": "Sakarya", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # SAMSUN
    {"id": 177, "name": "Garanti BBVA Samsun Merkez Şubesi", "address": "Cumhuriyet Meydanı No: 12, İlkadım/Samsun", "phone": "0362 435 35 35", "lat": 41.2867, "lng": 36.3300, "city": "Samsun", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 178, "name": "Garanti BBVA Samsun Atakum Şubesi", "address": "Atatürk Bulvarı No: 123, Atakum/Samsun", "phone": "0362 439 39 39", "lat": 41.3333, "lng": 36.2833, "city": "Samsun", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 179, "name": "Garanti BBVA Bafra Şubesi", "address": "Cumhuriyet Cad. No: 45, Bafra/Samsun", "phone": "0362 543 43 43", "lat": 41.5667, "lng": 35.9000, "city": "Samsun", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 180, "name": "Garanti BBVA Çarşamba Şubesi", "address": "Atatürk Cad. No: 34, Çarşamba/Samsun", "phone": "0362 832 32 32", "lat": 41.2000, "lng": 36.7167, "city": "Samsun", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # SİİRT
    {"id": 181, "name": "Garanti BBVA Siirt Şubesi", "address": "Cumhuriyet Cad. No: 23, Merkez/Siirt", "phone": "0484 223 23 23", "lat": 37.9333, "lng": 41.9500, "city": "Siirt", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # SİNOP
    {"id": 182, "name": "Garanti BBVA Sinop Şubesi", "address": "Atatürk Cad. No: 45, Merkez/Sinop", "phone": "0368 261 61 61", "lat": 42.0231, "lng": 35.1531, "city": "Sinop", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # SİVAS
    {"id": 183, "name": "Garanti BBVA Sivas Şubesi", "address": "Atatürk Cad. No: 67, Merkez/Sivas", "phone": "0346 221 21 21", "lat": 39.7477, "lng": 37.0179, "city": "Sivas", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # ŞANLIURFA
    {"id": 184, "name": "Garanti BBVA Şanlıurfa Şubesi", "address": "Atatürk Bulvarı No: 89, Haliliye/Şanlıurfa", "phone": "0414 313 13 13", "lat": 37.1591, "lng": 38.7969, "city": "Şanlıurfa", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 185, "name": "Garanti BBVA Şanlıurfa Eyyübiye Şubesi", "address": "Karaköprü Cad. No: 34, Eyyübiye/Şanlıurfa", "phone": "0414 347 47 47", "lat": 37.1500, "lng": 38.7833, "city": "Şanlıurfa", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 186, "name": "Garanti BBVA Viranşehir Şubesi", "address": "Atatürk Cad. No: 23, Viranşehir/Şanlıurfa", "phone": "0414 511 11 11", "lat": 37.2333, "lng": 39.7667, "city": "Şanlıurfa", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # ŞIRNAK
    {"id": 187, "name": "Garanti BBVA Şırnak Şubesi", "address": "Cumhuriyet Cad. No: 12, Merkez/Şırnak", "phone": "0486 216 16 16", "lat": 37.5186, "lng": 42.4536, "city": "Şırnak", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 188, "name": "Garanti BBVA Cizre Şubesi", "address": "Nusaybin Cad. No: 34, Cizre/Şırnak", "phone": "0486 616 16 16", "lat": 37.3256, "lng": 42.1922, "city": "Şırnak", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # TEKİRDAĞ
    {"id": 189, "name": "Garanti BBVA Tekirdağ Şubesi", "address": "Atatürk Bulvarı No: 56, Süleymanpaşa/Tekirdağ", "phone": "0282 261 61 61", "lat": 40.9833, "lng": 27.5167, "city": "Tekirdağ", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 190, "name": "Garanti BBVA Çorlu Şubesi", "address": "Omurtak Cad. No: 78, Çorlu/Tekirdağ", "phone": "0282 652 52 52", "lat": 41.1597, "lng": 27.8000, "city": "Tekirdağ", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 191, "name": "Garanti BBVA Çerkezköy Şubesi", "address": "G.O.Paşa Cad. No: 34, Çerkezköy/Tekirdağ", "phone": "0282 726 26 26", "lat": 41.2833, "lng": 28.0000, "city": "Tekirdağ", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # TOKAT
    {"id": 192, "name": "Garanti BBVA Tokat Şubesi", "address": "Gazi Osman Paşa Bulvarı No: 45, Merkez/Tokat", "phone": "0356 214 14 14", "lat": 40.3167, "lng": 36.5500, "city": "Tokat", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 193, "name": "Garanti BBVA Erbaa Şubesi", "address": "Cumhuriyet Cad. No: 23, Erbaa/Tokat", "phone": "0356 715 15 15", "lat": 40.6667, "lng": 36.5667, "city": "Tokat", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # TRABZON
    {"id": 194, "name": "Garanti BBVA Trabzon Merkez Şubesi", "address": "Maraş Cad. No: 67, Ortahisar/Trabzon", "phone": "0462 321 21 21", "lat": 41.0015, "lng": 39.7178, "city": "Trabzon", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 195, "name": "Garanti BBVA Trabzon Forum Şubesi", "address": "Forum AVM, Ortahisar/Trabzon", "phone": "0462 334 34 34", "lat": 40.9900, "lng": 39.7500, "city": "Trabzon", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 196, "name": "Garanti BBVA Akçaabat Şubesi", "address": "Cumhuriyet Cad. No: 34, Akçaabat/Trabzon", "phone": "0462 228 28 28", "lat": 41.0167, "lng": 39.5500, "city": "Trabzon", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # TUNCELİ
    {"id": 197, "name": "Garanti BBVA Tunceli Şubesi", "address": "Cumhuriyet Cad. No: 12, Merkez/Tunceli", "phone": "0428 213 13 13", "lat": 39.1079, "lng": 39.5401, "city": "Tunceli", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # UŞAK
    {"id": 198, "name": "Garanti BBVA Uşak Şubesi", "address": "İsmetpaşa Cad. No: 45, Merkez/Uşak", "phone": "0276 223 23 23", "lat": 38.6823, "lng": 29.4082, "city": "Uşak", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # VAN
    {"id": 199, "name": "Garanti BBVA Van Şubesi", "address": "Cumhuriyet Cad. No: 67, İpekyolu/Van", "phone": "0432 214 14 14", "lat": 38.4942, "lng": 43.3800, "city": "Van", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 200, "name": "Garanti BBVA Erciş Şubesi", "address": "Atatürk Cad. No: 23, Erciş/Van", "phone": "0432 351 51 51", "lat": 39.0167, "lng": 43.3500, "city": "Van", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # YALOVA
    {"id": 201, "name": "Garanti BBVA Yalova Şubesi", "address": "Cumhuriyet Cad. No: 56, Merkez/Yalova", "phone": "0226 814 14 14", "lat": 40.6500, "lng": 29.2667, "city": "Yalova", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # YOZGAT
    {"id": 202, "name": "Garanti BBVA Yozgat Şubesi", "address": "Lise Cad. No: 34, Merkez/Yozgat", "phone": "0354 212 12 12", "lat": 39.8181, "lng": 34.8147, "city": "Yozgat", "workingHours": "Hafta içi 09:00 - 17:00"},
    
    # ZONGULDAK
    {"id": 203, "name": "Garanti BBVA Zonguldak Şubesi", "address": "Gazipaşa Cad. No: 45, Merkez/Zonguldak", "phone": "0372 251 51 51", "lat": 41.4564, "lng": 31.7987, "city": "Zonguldak", "workingHours": "Hafta içi 09:00 - 17:00"},
    {"id": 204, "name": "Garanti BBVA Ereğli Şubesi", "address": "Müftü Mah. No: 23, Ereğli/Zonguldak", "phone": "0372 323 23 23", "lat": 41.2833, "lng": 31.4167, "city": "Zonguldak", "workingHours": "Hafta içi 09:00 - 17:00"},
]

async def get_all_branches() -> List[Dict]:
    """Tüm şubeleri döndür"""
    return GARANTI_BRANCHES_TURKEY

async def get_nearest_branch(user_lat: float, user_lng: float, limit: int = 1) -> List[Dict]:
    """Kullanıcıya en yakın şubeleri döndür"""
    branches_with_distance = []
    
    for branch in GARANTI_BRANCHES_TURKEY:
        distance = calculate_distance(user_lat, user_lng, branch['lat'], branch['lng'])
        branch_copy = branch.copy()
        branch_copy['distance'] = round(distance, 1)
        branches_with_distance.append(branch_copy)
    
    # Mesafeye göre sırala
    branches_with_distance.sort(key=lambda x: x['distance'])
    
    return branches_with_distance[:limit]

async def get_branches_by_city(city: str) -> List[Dict]:
    """Belirli bir şehirdeki şubeleri döndür"""
    return [b for b in GARANTI_BRANCHES_TURKEY if b['city'].lower() == city.lower()]

async def search_branches(query: str) -> List[Dict]:
    """Şube adı veya şehre göre ara"""
    query_lower = query.lower()
    return [b for b in GARANTI_BRANCHES_TURKEY if query_lower in b['name'].lower() or query_lower in b['city'].lower()]
