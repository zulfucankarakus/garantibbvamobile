import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

async def seed_database():
    mongo_url = os.environ['MONGO_URL']
    db_name = os.environ['DB_NAME']
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Check if wealth categories already exist
    existing_categories = await db.wealth_categories.count_documents({})
    if existing_categories == 0:
        print("Seeding wealth categories...")
        wealth_categories = [
            {'name': 'Araç', 'icon': 'Car', 'color': 'teal', 'order': 1},
            {'name': 'Ev', 'icon': 'Home', 'color': 'blue', 'order': 2},
            {'name': 'Seyahat', 'icon': 'Plane', 'color': 'purple', 'order': 3},
            {'name': 'Teknoloji', 'icon': 'Tv', 'color': 'indigo', 'order': 4},
            {'name': 'Yatırım', 'icon': 'Leaf', 'color': 'green', 'order': 5}
        ]
        await db.wealth_categories.insert_many(wealth_categories)
        print("✓ Wealth categories seeded")
    
    # Check if financial tips already exist
    existing_tips = await db.financial_tips.count_documents({})
    if existing_tips == 0:
        print("Seeding financial tips...")
        financial_tips = [
            {
                'title': 'Acil Durum Fonu Oluşturun',
                'description': 'Aylık giderinizin 3-6 katı kadar acil durum fonu bulundurun.',
                'category': 'saving',
                'order': 1
            },
            {
                'title': 'Düzenli Tasarruf Yapın',
                'description': 'Gelir elde ettiğiniz her ay bir kısmını düzenli olarak tasarruf edin.',
                'category': 'saving',
                'order': 2
            },
            {
                'title': 'Borçlarınızı Azaltın',
                'description': 'Yüksek faizli borçlarınızı öncelikli olarak ödeyin.',
                'category': 'debt',
                'order': 3
            },
            {
                'title': 'Yatırım Yapın',
                'description': 'Paranızın değer kaybetmemesi için uygun yatırım araçlarını değerlendirin.',
                'category': 'investment',
                'order': 4
            }
        ]
        await db.financial_tips.insert_many(financial_tips)
        print("✓ Financial tips seeded")
    
    # Check if saving plans already exist
    existing_plans = await db.saving_plans.count_documents({})
    if existing_plans == 0:
        print("Seeding saving plans...")
        saving_plans = [
            {
                'title': 'Otomatik Tasarruf Planı',
                'description': 'Her ay düzenli olarak tasarruf yapmak için otomatik plan oluşturun.',
                'cta': 'Plan Oluştur',
                'icon': 'Target',
                'order': 1
            },
            {
                'title': 'Hedef Odaklı Tasarruf',
                'description': 'Belirlediğiniz hedefe ulaşmak için özel tasarruf planı oluşturun.',
                'cta': 'Hedef Belirle',
                'icon': 'TrendingUp',
                'order': 2
            },
            {
                'title': 'Yatırım Planı',
                'description': 'Uzun vadeli kazançlar için yatırım planı oluşturun.',
                'cta': 'Yatırım Yap',
                'icon': 'PieChart',
                'order': 3
            }
        ]
        await db.saving_plans.insert_many(saving_plans)
        print("✓ Saving plans seeded")
    
    print("\n✅ Database seeding completed!")
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_database())
