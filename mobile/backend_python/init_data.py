"""
Docker başlatıldığında test verilerini oluşturur
"""
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
import bcrypt
from datetime import datetime

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'test_database')

async def create_test_data():
    """Test kullanıcısı ve verileri oluştur"""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Test kullanıcısı var mı kontrol et
    existing = await db.users.find_one({"tc_no": "12345678950"})
    if existing:
        # Kullanıcı var, hesap var mı kontrol et
        user_id = str(existing['_id'])
        has_account = await db.accounts.find_one({"user_id": user_id})
        if has_account:
            print("✅ Test kullanıcısı ve hesabı zaten mevcut")
            client.close()
            return
        else:
            print("⚠️ Kullanıcı var ama hesap yok, hesap oluşturuluyor...")
    else:
        print("📝 Test kullanıcısı oluşturuluyor...")
        
        # Kullanıcı oluştur
        password_hash = bcrypt.hashpw("Test123456".encode(), bcrypt.gensalt()).decode()
        
        user = {
            "tc_no": "12345678950",
            "customer_no": "00123456789",
            "name": "Test Kullanıcı",
            "full_name": "Test Kullanıcı",
            "email": "test@garantibbva.com",
            "phone": "5551234567",
            "password": password_hash,
            "password_hash": password_hash,
            "created_at": datetime.utcnow().isoformat(),
            "is_verified": True
        }
        result = await db.users.insert_one(user)
        user_id = str(result.inserted_id)
        print(f"✅ Kullanıcı oluşturuldu: TC 12345678950 (ID: {user_id})")
        existing = await db.users.find_one({"tc_no": "12345678950"})
    
    # User ID'yi MongoDB _id'den al
    user_id = str(existing['_id'])
    
    # Hesap oluştur
    account = {
        "id": f"acc-{user_id[:8]}",
        "user_id": user_id,
        "account_name": "Vadesiz TL Hesabı",
        "account_type": "checking",
        "currency": "TRY",
        "balance": 25000.00,
        "iban": "TR320006200000000012345678",
        "created_at": datetime.utcnow().isoformat(),
        "is_active": True
    }
    await db.accounts.delete_many({"user_id": user_id})
    await db.accounts.insert_one(account)
    print(f"✅ Hesap oluşturuldu: 25.000 TL bakiye")
    
    # Kredi kartı oluştur
    card = {
        "id": f"card-{user_id[:8]}",
        "user_id": user_id,
        "account_id": account['id'],
        "card_name": "Bonus Kredi Kartı",
        "card_type": "credit",
        "card_number": "4532012345678901",
        "expiry_date": "12/28",
        "cvv": "123",
        "credit_limit": 50000.00,
        "available_limit": 45000.00,
        "current_debt": 5000.00,
        "min_payment": 500.00,
        "due_date": "2025-02-15",
        "is_active": True,
        "created_at": datetime.utcnow().isoformat()
    }
    await db.cards.delete_many({"user_id": user_id})
    await db.cards.insert_one(card)
    print(f"✅ Kart oluşturuldu: Bonus Kredi Kartı")
    
    # Wealth categories
    existing_cats = await db.wealth_categories.count_documents({})
    if existing_cats == 0:
        categories = [
            {"id": "cat-1", "name": "Araç", "icon": "🚗", "color": "#3B82F6", "order": 1},
            {"id": "cat-2", "name": "Ev", "icon": "🏠", "color": "#10B981", "order": 2},
            {"id": "cat-3", "name": "Seyahat", "icon": "✈️", "color": "#F59E0B", "order": 3},
            {"id": "cat-4", "name": "Teknoloji", "icon": "💻", "color": "#8B5CF6", "order": 4},
            {"id": "cat-5", "name": "Yatırım", "icon": "📈", "color": "#EF4444", "order": 5}
        ]
        await db.wealth_categories.insert_many(categories)
        print(f"✅ {len(categories)} kategori oluşturuldu")
    
    # Financial tips
    existing_tips = await db.financial_tips.count_documents({})
    if existing_tips == 0:
        tips = [
            {"id": "tip-1", "title": "Acil Durum Fonu", "description": "3-6 aylık gideriniz kadar acil durum fonu oluşturun.", "icon": "💰"},
            {"id": "tip-2", "title": "Bütçe Takibi", "description": "Aylık gelir ve giderlerinizi düzenli takip edin.", "icon": "📊"},
            {"id": "tip-3", "title": "Otomatik Tasarruf", "description": "Maaşınızın %10-20'sini otomatik tasarruf edin.", "icon": "🎯"},
            {"id": "tip-4", "title": "Borç Yönetimi", "description": "Yüksek faizli borçlarınızı öncelikli ödeyin.", "icon": "📉"}
        ]
        await db.financial_tips.insert_many(tips)
        print(f"✅ {len(tips)} finansal ipucu oluşturuldu")
    
    # Saving plans
    existing_plans = await db.saving_plans.count_documents({})
    if existing_plans == 0:
        plans = [
            {"id": "plan-1", "name": "Tatil Planı", "target_amount": 15000, "duration_months": 6, "icon": "🏖️"},
            {"id": "plan-2", "name": "Araba Planı", "target_amount": 100000, "duration_months": 24, "icon": "🚗"},
            {"id": "plan-3", "name": "Ev Planı", "target_amount": 500000, "duration_months": 60, "icon": "🏠"}
        ]
        await db.saving_plans.insert_many(plans)
        print(f"✅ {len(plans)} tasarruf planı oluşturuldu")
    
    print("\n" + "="*50)
    print("🎉 TEST VERİLERİ HAZIR!")
    print("="*50)
    print("📱 TC No: 12345678950")
    print("🔑 Şifre: Test123456")
    print("💰 Bakiye: 25.000 TL")
    print("💳 Kredi Kartı: 50.000 TL limit")
    print("="*50)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(create_test_data())
