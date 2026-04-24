import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

async def clean_test_data():
    mongo_url = os.environ['MONGO_URL']
    db_name = os.environ['DB_NAME']
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Clean test users and related data
    print("Cleaning test data...")
    
    # Find test users
    test_users = await db.users.find({"email": {"$regex": "test", "$options": "i"}}).to_list(length=None)
    
    if test_users:
        print(f"Found {len(test_users)} test users")
        for user in test_users:
            user_id = str(user['_id'])
            print(f"Cleaning data for user: {user.get('name', 'Unknown')}")
            
            # Delete accounts
            accounts_result = await db.accounts.delete_many({"user_id": user_id})
            print(f"  - Deleted {accounts_result.deleted_count} accounts")
            
            # Delete cards
            cards_result = await db.cards.delete_many({"user_id": user_id})
            print(f"  - Deleted {cards_result.deleted_count} cards")
            
            # Delete transactions
            transactions_result = await db.transactions.delete_many({"user_id": user_id})
            print(f"  - Deleted {transactions_result.deleted_count} transactions")
            
            # Delete applications
            applications_result = await db.applications.delete_many({"user_id": user_id})
            print(f"  - Deleted {applications_result.deleted_count} applications")
            
            # Delete notifications
            notifications_result = await db.notifications.delete_many({"user_id": user_id})
            print(f"  - Deleted {notifications_result.deleted_count} notifications")
            
            # Delete user
            await db.users.delete_one({"_id": user['_id']})
            print(f"  - Deleted user")
    else:
        print("No test users found")
    
    print("\n✅ Cleanup completed!")
    client.close()

if __name__ == "__main__":
    asyncio.run(clean_test_data())
