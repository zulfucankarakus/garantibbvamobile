#!/usr/bin/env python3
"""
Hesaba bakiye ekleme script'i
Kullanım: python add_balance.py <account_id> <amount>
Örnek: python add_balance.py 69635f00403205564812d5e6 5000
"""

import sys
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from pathlib import Path

# .env dosyasını yükle
env_path = Path(__file__).parent / '.env'
if env_path.exists():
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                os.environ[key] = value.strip('"').strip("'")

async def add_balance(account_id: str, amount: float):
    """Hesaba bakiye ekle"""
    from bson import ObjectId
    
    mongo_url = os.getenv("MONGO_URL", "mongodb://localhost:27017")
    db_name = os.getenv("DB_NAME", "test_database")
    
    print(f"🔗 MongoDB'ye bağlanılıyor: {mongo_url}")
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # ObjectId'ye çevir
    try:
        account_oid = ObjectId(account_id)
    except:
        # Eğer ObjectId değilse string olarak kullan
        account_oid = account_id
    
    # Önce hesabı kontrol et
    account = await db.accounts.find_one({"_id": account_oid})
    if not account:
        print(f"❌ Hesap bulunamadı! ID: {account_id}")
        client.close()
        return
    
    print(f"📊 Mevcut bakiye: {account.get('balance', 0)} TL")
    
    # Bakiye ekle
    result = await db.accounts.update_one(
        {"_id": account_oid},
        {"$inc": {"balance": amount}}
    )
    
    if result.modified_count > 0:
        # Güncel bakiyeyi al
        updated_account = await db.accounts.find_one({"_id": account_oid})
        print(f"✅ Başarılı! {amount} TL eklendi.")
        print(f"💰 Yeni bakiye: {updated_account['balance']} TL")
        print(f"📄 Hesap No: {updated_account.get('account_no')}")
        print(f"🏦 IBAN: {updated_account.get('iban')}")
    else:
        print("❌ Bakiye güncellenemedi!")
    
    client.close()

async def list_accounts(user_id: str = None):
    """Hesapları listele"""
    mongo_url = os.getenv("MONGO_URL", "mongodb://localhost:27017")
    db_name = os.getenv("DB_NAME", "test_database")
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    query = {}
    if user_id:
        query["user_id"] = user_id
    
    accounts = await db.accounts.find(query).to_list(length=100)
    
    if not accounts:
        print("❌ Hesap bulunamadı!")
    else:
        print(f"\n📋 Toplam {len(accounts)} hesap bulundu:\n")
        for acc in accounts:
            user = await db.users.find_one({"_id": acc.get("user_id")})
            user_name = user.get("name", "Bilinmiyor") if user else "Bilinmiyor"
            
            print(f"─────────────────────────────────────")
            print(f"👤 Kullanıcı: {user_name}")
            print(f"🆔 Hesap ID: {acc['_id']}")
            print(f"📄 Hesap No: {acc.get('account_no')}")
            print(f"🏦 IBAN: {acc.get('iban')}")
            print(f"📝 İsim: {acc.get('name')}")
            print(f"💰 Bakiye: {acc.get('balance', 0)} TL")
            print(f"📊 Tür: {acc.get('account_type')}")
    
    print(f"─────────────────────────────────────\n")
    client.close()

def print_usage():
    """Kullanım bilgisi göster"""
    print("""
🏦 Hesap Bakiye Yönetimi

Kullanım:
  python add_balance.py <account_id> <amount>    # Bakiye ekle
  python add_balance.py list                      # Tüm hesapları listele
  python add_balance.py list <user_id>            # Kullanıcının hesaplarını listele

Örnekler:
  python add_balance.py 69635f00403205564812d5e6 5000
  python add_balance.py list
  python add_balance.py list 69635eff403205564812d5e2

Not: Negatif tutar girerek bakiye azaltabilirsiniz.
""")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print_usage()
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "list":
        user_id = sys.argv[2] if len(sys.argv) > 2 else None
        asyncio.run(list_accounts(user_id))
    elif command in ["-h", "--help", "help"]:
        print_usage()
    else:
        if len(sys.argv) < 3:
            print("❌ Hata: Miktar belirtmelisiniz!")
            print_usage()
            sys.exit(1)
        
        account_id = sys.argv[1]
        try:
            amount = float(sys.argv[2])
            asyncio.run(add_balance(account_id, amount))
        except ValueError:
            print("❌ Hata: Geçersiz miktar!")
            print_usage()
            sys.exit(1)
