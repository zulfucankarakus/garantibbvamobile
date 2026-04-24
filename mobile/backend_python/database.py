from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
import os
import random
import string
from typing import List, Optional, Dict, Any
from datetime import datetime

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

# TC Kimlik No Doğrulama
def validate_tc_no(tc_no: str) -> bool:
    """
    TC Kimlik Numarası doğrulama algoritması
    
    Kurallar:
    1. 11 haneli olmalı
    2. İlk hane 0 olamaz
    3. İlk 10 hanenin toplamının birler basamağı 11. haneye eşit olmalı
    4. 1, 3, 5, 7, 9. hanelerin toplamının 7 katından, 
       2, 4, 6, 8. hanelerin toplamı çıkarıldığında,
       elde edilen sonucun birler basamağı 10. haneye eşit olmalı
    """
    # Sadece rakam kontrolü
    if not tc_no.isdigit():
        return False
    
    # 11 hane kontrolü
    if len(tc_no) != 11:
        return False
    
    # İlk hane 0 olamaz
    if tc_no[0] == '0':
        return False
    
    # Rakamları integer dizisine çevir
    digits = [int(d) for d in tc_no]
    
    # 10. hane kontrolü
    # (1. + 3. + 5. + 7. + 9. hane toplamı) * 7 - (2. + 4. + 6. + 8. hane toplamı) % 10 = 10. hane
    odd_sum = digits[0] + digits[2] + digits[4] + digits[6] + digits[8]  # 1,3,5,7,9. haneler
    even_sum = digits[1] + digits[3] + digits[5] + digits[7]  # 2,4,6,8. haneler
    tenth_digit = ((odd_sum * 7) - even_sum) % 10
    
    if tenth_digit != digits[9]:
        return False
    
    # 11. hane kontrolü
    # İlk 10 hanenin toplamının birler basamağı 11. haneye eşit olmalı
    first_ten_sum = sum(digits[:10])
    eleventh_digit = first_ten_sum % 10
    
    if eleventh_digit != digits[10]:
        return False
    
    return True

# Number generators
def generate_customer_no() -> str:
    return ''.join(random.choices(string.digits, k=10))

def generate_account_no() -> str:
    return ''.join(random.choices(string.digits, k=12))

def generate_iban(account_no: str) -> str:
    # Turkish IBAN format: TR + 2 check digits + 5 bank code + 1 reserved + 12 account number
    bank_code = "00062"  # Garanti BBVA bank code
    reserved = "0"
    check_digits = "33"  # Simplified for demo
    return f"TR{check_digits}{bank_code}{reserved}{account_no}"

def generate_card_no() -> str:
    # Generate 16-digit card number starting with 5406 (Garanti BBVA)
    prefix = "5406"
    remaining = ''.join(random.choices(string.digits, k=12))
    return f"{prefix}{remaining}"

def generate_cvv() -> str:
    """Generate 3-digit CVV code"""
    return ''.join(random.choices(string.digits, k=3))

def generate_expiry_date() -> str:
    """Generate expiry date (5 years from now) in MM/YY format"""
    from datetime import datetime, timedelta
    expiry = datetime.now() + timedelta(days=365*5)
    return expiry.strftime("%m/%y")

def generate_verification_code() -> str:
    """Generate 6-digit verification code"""
    return ''.join(random.choices(string.digits, k=6))

def validate_password(password: str) -> str:
    """
    Şifre doğrulama - 6 haneli, sadece rakam
    Returns empty string if valid, error message if invalid
    """
    if not password:
        return "Şifre boş olamaz"
    
    if len(password) != 6:
        return "Şifre 6 haneli olmalıdır"
    
    if not password.isdigit():
        return "Şifre sadece rakamlardan oluşmalıdır"
    
    return ""

def validate_email(email: str) -> str:
    """
    E-posta doğrulama
    Returns empty string if valid, error message if invalid
    """
    import re
    
    if not email:
        return "E-posta adresi boş olamaz"
    
    # Basit e-posta regex kontrolü
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, email):
        return "Geçersiz e-posta adresi"
    
    return ""

def validate_phone(phone: str) -> str:
    """
    Telefon numarası doğrulama - Türkiye formatı
    Returns empty string if valid, error message if invalid
    """
    # Sadece rakamları al
    digits_only = ''.join(filter(str.isdigit, phone))
    
    if not digits_only:
        return "Telefon numarası boş olamaz"
    
    # 10 haneli olmalı (5XXXXXXXXX)
    if len(digits_only) != 10:
        return "Telefon numarası 10 haneli olmalıdır (5XX XXX XX XX)"
    
    # 5 ile başlamalı
    if not digits_only.startswith('5'):
        return "Telefon numarası 5 ile başlamalıdır"
    
    return ""

class Database:
    client: AsyncIOMotorClient = None
    db = None
    
    @classmethod
    def initialize(cls, mongo_url: str, db_name: str):
        cls.client = AsyncIOMotorClient(mongo_url)
        cls.db = cls.client[db_name]
    
    @classmethod
    def get_database(cls):
        """Get the database instance"""
        return cls.db
    
    # User operations
    @classmethod
    async def create_user(cls, user_data: Dict[str, Any]) -> Dict[str, Any]:
        user_data['created_at'] = datetime.utcnow()
        result = await cls.db.users.insert_one(user_data)
        user_data['id'] = str(result.inserted_id)
        user_data.pop('_id', None)
        return user_data
    
    @classmethod
    async def get_user_by_id(cls, user_id: str) -> Optional[Dict[str, Any]]:
        from bson import ObjectId
        try:
            user = await cls.db.users.find_one({"_id": ObjectId(user_id)})
            if user:
                user['id'] = str(user['_id'])
                del user['_id']
            return user
        except Exception:
            return None
    
    @classmethod
    async def get_user_by_tc(cls, tc_no: str) -> Optional[Dict[str, Any]]:
        user = await cls.db.users.find_one({"tc_no": tc_no})
        if user:
            user['id'] = str(user['_id'])
            del user['_id']
        return user
    
    @classmethod
    async def get_user_by_customer_no(cls, customer_no: str) -> Optional[Dict[str, Any]]:
        user = await cls.db.users.find_one({"customer_no": customer_no})
        if user:
            user['id'] = str(user['_id'])
            del user['_id']
        return user
    
    # Verification codes operations
    @classmethod
    async def save_verification_code(cls, identifier: str, code: str, code_type: str):
        """Save verification code (email or phone)"""
        verification_data = {
            'identifier': identifier,  # email or phone
            'code': code,
            'type': code_type,  # 'email' or 'phone'
            'created_at': datetime.utcnow(),
            'verified': False
        }
        await cls.db.verification_codes.insert_one(verification_data)
    
    @classmethod
    async def verify_code(cls, identifier: str, code: str, code_type: str) -> bool:
        """Verify the code"""
        from datetime import timedelta
        
        # Code should be valid for 10 minutes
        ten_minutes_ago = datetime.utcnow() - timedelta(minutes=10)
        
        verification = await cls.db.verification_codes.find_one({
            'identifier': identifier,
            'code': code,
            'type': code_type,
            'verified': False,
            'created_at': {'$gte': ten_minutes_ago}
        })
        
        if verification:
            # Mark as verified
            await cls.db.verification_codes.update_one(
                {'_id': verification['_id']},
                {'$set': {'verified': True}}
            )
            return True
        
        return False
    
    # Account operations
    @classmethod
    async def create_account(cls, account_data: Dict[str, Any]) -> Dict[str, Any]:
        account_data['created_at'] = datetime.utcnow()
        result = await cls.db.accounts.insert_one(account_data)
        account_data['id'] = str(result.inserted_id)
        account_data.pop('_id', None)  # Remove _id from response
        return account_data
    
    @classmethod
    async def get_user_accounts(cls, user_id: str) -> List[Dict[str, Any]]:
        try:
            # user_id is stored as string, not ObjectId
            cursor = cls.db.accounts.find({"user_id": user_id})
            accounts = await cursor.to_list(length=None)
            for account in accounts:
                account['id'] = str(account['_id'])
                del account['_id']
            return accounts
        except Exception as e:
            print(f"Error in get_user_accounts: {e}")
            return []
    
    @classmethod
    async def get_account_by_id(cls, account_id: str) -> Optional[Dict[str, Any]]:
        from bson import ObjectId
        try:
            account = await cls.db.accounts.find_one({"_id": ObjectId(account_id)})
            if account:
                account['id'] = str(account['_id'])
                del account['_id']
            return account
        except Exception as e:
            print(f"Error in get_account_by_id: {e}")
            return None
    
    @classmethod
    async def get_account_by_iban(cls, iban: str) -> Optional[Dict[str, Any]]:
        """Get account by IBAN number"""
        try:
            account = await cls.db.accounts.find_one({"iban": iban})
            if account:
                account['id'] = str(account['_id'])
                del account['_id']
            return account
        except Exception as e:
            print(f"Error in get_account_by_iban: {e}")
            return None
    
    @classmethod
    async def get_account_by_account_no(cls, account_no: str) -> Optional[Dict[str, Any]]:
        """Get account by account number"""
        try:
            account = await cls.db.accounts.find_one({"account_no": account_no})
            if account:
                account['id'] = str(account['_id'])
                del account['_id']
            return account
        except Exception as e:
            print(f"Error in get_account_by_account_no: {e}")
            return None
    
    @classmethod
    async def update_account_balance(cls, account_id: str, new_balance: float):
        """Update account balance and sync with linked debit cards"""
        from bson import ObjectId
        
        # Update account balance
        await cls.db.accounts.update_one(
            {"_id": ObjectId(account_id)},
            {"$set": {"balance": new_balance}}
        )
        
        # Update balance of all debit cards linked to this account
        await cls.db.cards.update_many(
            {
                "account_id": account_id,
                "card_type": "debit"
            },
            {"$set": {"balance": new_balance}}
        )
    
    @classmethod
    async def delete_account(cls, account_id: str):
        """Delete an account"""
        from bson import ObjectId
        result = await cls.db.accounts.delete_one({"_id": ObjectId(account_id)})
        return result.deleted_count > 0
    
    # Card operations
    @classmethod
    async def create_card(cls, card_data: Dict[str, Any]) -> Dict[str, Any]:
        card_data['created_at'] = datetime.utcnow()
        result = await cls.db.cards.insert_one(card_data)
        card_data['id'] = str(result.inserted_id)
        card_data.pop('_id', None)
        return card_data
    
    @classmethod
    async def get_user_cards(cls, user_id: str) -> List[Dict[str, Any]]:
        """Get all cards for a user, with linked account balance for debit cards"""
        try:
            # user_id is stored as string, not ObjectId
            cursor = cls.db.cards.find({"user_id": user_id})
            cards = await cursor.to_list(length=None)
            
            for card in cards:
                card['id'] = str(card['_id'])
                del card['_id']
                
                # If card is linked to an account (debit card), get account balance
                if card.get('account_id'):
                    account = await cls.get_account_by_id(card['account_id'])
                    if account:
                        # Sync card balance with account balance
                        card['balance'] = account['balance']
                        card['linked_account'] = {
                            'id': account['id'],
                            'name': account['name'],
                            'account_no': account['account_no'],
                            'balance': account['balance']
                        }
            
            return cards
        except Exception as e:
            print(f"Error in get_user_cards: {e}")
            return []
    
    @classmethod
    async def get_card_by_id(cls, card_id: str) -> Optional[Dict[str, Any]]:
        """Get card by ID"""
        from bson import ObjectId
        try:
            card = await cls.db.cards.find_one({"_id": ObjectId(card_id)})
            if card:
                card['id'] = str(card['_id'])
                del card['_id']
            return card
        except Exception as e:
            print(f"Error in get_card_by_id: {e}")
            return None
    
    @classmethod
    async def get_card_transactions(cls, card_id: str) -> List[Dict[str, Any]]:
        """Get all transactions for a specific card"""
        try:
            # Search for transactions where this card was used
            cursor = cls.db.card_transactions.find({"card_id": card_id}).sort("created_at", -1)
            transactions = await cursor.to_list(length=None)
            for transaction in transactions:
                transaction['id'] = str(transaction['_id'])
                del transaction['_id']
            return transactions
        except Exception as e:
            print(f"Error in get_card_transactions: {e}")
            return []
    
    @classmethod
    async def update_card_limit(cls, card_id: str, new_available_limit: float):
        """Update card's available limit"""
        from bson import ObjectId
        await cls.db.cards.update_one(
            {"_id": ObjectId(card_id)},
            {"$set": {"available_limit": new_available_limit}}
        )
    
    @classmethod
    async def delete_card(cls, card_id: str):
        """Delete a card"""
        from bson import ObjectId
        result = await cls.db.cards.delete_one({"_id": ObjectId(card_id)})
        return result.deleted_count > 0
    
    # Transaction operations
    @classmethod
    async def create_transaction(cls, transaction_data: Dict[str, Any]) -> Dict[str, Any]:
        from bson import ObjectId
        transaction_data['created_at'] = datetime.utcnow()
        
        # Create a copy to avoid modifying original data
        insert_data = transaction_data.copy()
        result = await cls.db.transactions.insert_one(insert_data)
        
        # Get the inserted transaction from database to ensure clean data
        transaction = await cls.db.transactions.find_one({"_id": result.inserted_id})
        if transaction:
            transaction['id'] = str(transaction['_id'])
            del transaction['_id']
            # Convert datetime to ISO format
            if 'created_at' in transaction:
                transaction['created_at'] = transaction['created_at'].isoformat()
            return transaction
        
        # Fallback: clean up the data manually
        transaction_data['id'] = str(result.inserted_id)
        transaction_data.pop('_id', None)
        return transaction_data
    
    @classmethod
    async def get_user_transactions(cls, user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        try:
            # user_id is stored as string, not ObjectId
            cursor = cls.db.transactions.find({"user_id": user_id}).sort("created_at", -1).limit(limit)
            transactions = await cursor.to_list(length=None)
            for transaction in transactions:
                transaction['id'] = str(transaction['_id'])
                del transaction['_id']
            return transactions
        except Exception as e:
            print(f"Error in get_user_transactions: {e}")
            return []
    
    @classmethod
    async def get_account_transactions(cls, account_id: str) -> List[Dict[str, Any]]:
        try:
            # account_id is stored as string in from_account_id field
            cursor = cls.db.transactions.find({"from_account_id": account_id}).sort("created_at", -1)
            transactions = await cursor.to_list(length=None)
            for transaction in transactions:
                transaction['id'] = str(transaction['_id'])
                del transaction['_id']
            return transactions
        except Exception as e:
            print(f"Error in get_account_transactions: {e}")
            return []
    
    @classmethod
    async def search_transactions(cls, user_id: str, query: str) -> List[Dict[str, Any]]:
        try:
            # user_id is stored as string, not ObjectId
            cursor = cls.db.transactions.find({
                "user_id": user_id,
                "$or": [
                    {"description": {"$regex": query, "$options": "i"}},
                    {"to_account_iban": {"$regex": query, "$options": "i"}}
                ]
            }).sort("created_at", -1)
            transactions = await cursor.to_list(length=None)
            for transaction in transactions:
                transaction['id'] = str(transaction['_id'])
                del transaction['_id']
            return transactions
        except Exception as e:
            print(f"Error in search_transactions: {e}")
            return []
    
    # Application operations
    @classmethod
    async def create_application(cls, application_data: Dict[str, Any]) -> Dict[str, Any]:
        application_data['created_at'] = datetime.utcnow()
        application_data['updated_at'] = datetime.utcnow()
        result = await cls.db.applications.insert_one(application_data)
        application_data['id'] = str(result.inserted_id)
        return application_data
    
    @classmethod
    async def get_user_applications(cls, user_id: str) -> List[Dict[str, Any]]:
        try:
            # user_id is stored as string, not ObjectId
            cursor = cls.db.applications.find({"user_id": user_id}).sort("created_at", -1)
            applications = await cursor.to_list(length=None)
            for application in applications:
                application['id'] = str(application['_id'])
                del application['_id']
            return applications
        except Exception as e:
            print(f"Error in get_user_applications: {e}")
            return []
    
    @classmethod
    async def update_application_status(cls, application_id: str, status: str):
        from bson import ObjectId
        await cls.db.applications.update_one(
            {"_id": ObjectId(application_id)},
            {"$set": {"status": status, "updated_at": datetime.utcnow()}}
        )
    
    # Notification operations
    @classmethod
    async def create_notification(cls, notification_data: Dict[str, Any]) -> Dict[str, Any]:
        notification_data['created_at'] = datetime.utcnow()
        result = await cls.db.notifications.insert_one(notification_data)
        notification_data['id'] = str(result.inserted_id)
        return notification_data
    
    @classmethod
    async def get_user_notifications(cls, user_id: str, unread_only: bool = False) -> List[Dict[str, Any]]:
        try:
            # user_id is stored as string, not ObjectId
            query = {"user_id": user_id}
            if unread_only:
                query["read"] = False
            
            cursor = cls.db.notifications.find(query).sort("created_at", -1)
            notifications = await cursor.to_list(length=None)
            for notification in notifications:
                notification['id'] = str(notification['_id'])
                del notification['_id']
            return notifications
        except Exception as e:
            print(f"Error in get_user_notifications: {e}")
            return []
    
    @classmethod
    async def mark_notification_read(cls, notification_id: str):
        from bson import ObjectId
        await cls.db.notifications.update_one(
            {"_id": ObjectId(notification_id)},
            {"$set": {"read": True}}
        )
    
    # Wealth Category operations
    @classmethod
    async def get_wealth_categories(cls) -> List[Dict[str, Any]]:
        try:
            cursor = cls.db.wealth_categories.find().sort("order", 1)
            categories = await cursor.to_list(length=None)
            for category in categories:
                category['id'] = str(category['_id'])
                del category['_id']
            return categories
        except Exception:
            return []
    
    @classmethod
    async def create_wealth_category(cls, category_data: Dict[str, Any]) -> Dict[str, Any]:
        category_data['created_at'] = datetime.utcnow()
        result = await cls.db.wealth_categories.insert_one(category_data)
        category_data['id'] = str(result.inserted_id)
        category_data.pop('_id', None)
        return category_data
    
    # Financial Tip operations
    @classmethod
    async def get_financial_tips(cls) -> List[Dict[str, Any]]:
        try:
            cursor = cls.db.financial_tips.find().sort("order", 1)
            tips = await cursor.to_list(length=None)
            for tip in tips:
                tip['id'] = str(tip['_id'])
                del tip['_id']
            return tips
        except Exception:
            return []
    
    @classmethod
    async def create_financial_tip(cls, tip_data: Dict[str, Any]) -> Dict[str, Any]:
        tip_data['created_at'] = datetime.utcnow()
        result = await cls.db.financial_tips.insert_one(tip_data)
        tip_data['id'] = str(result.inserted_id)
        tip_data.pop('_id', None)
        return tip_data
    
    # Saving Plan operations
    @classmethod
    async def get_saving_plans(cls) -> List[Dict[str, Any]]:
        try:
            cursor = cls.db.saving_plans.find().sort("order", 1)
            plans = await cursor.to_list(length=None)
            for plan in plans:
                plan['id'] = str(plan['_id'])
                del plan['_id']
            return plans
        except Exception:
            return []
    
    @classmethod
    async def create_saving_plan(cls, plan_data: Dict[str, Any]) -> Dict[str, Any]:
        plan_data['created_at'] = datetime.utcnow()
        result = await cls.db.saving_plans.insert_one(plan_data)
        plan_data['id'] = str(result.inserted_id)
        plan_data.pop('_id', None)
        return plan_data
    
    # Financial Goal operations
    @classmethod
    async def create_financial_goal(cls, goal_data: Dict[str, Any]) -> Dict[str, Any]:
        goal_data['created_at'] = datetime.utcnow()
        goal_data['updated_at'] = datetime.utcnow()
        
        # Calculate target date
        from dateutil.relativedelta import relativedelta
        goal_data['target_date'] = datetime.utcnow() + relativedelta(months=goal_data.get('duration_months', 12))
        
        result = await cls.db.financial_goals.insert_one(goal_data)
        goal_data['id'] = str(result.inserted_id)
        goal_data.pop('_id', None)
        return goal_data
    
    @classmethod
    async def get_user_financial_goals(cls, user_id: str, status: str = None) -> List[Dict[str, Any]]:
        try:
            query = {"user_id": user_id}
            if status:
                query["status"] = status
            
            cursor = cls.db.financial_goals.find(query).sort("created_at", -1)
            goals = await cursor.to_list(length=None)
            for goal in goals:
                goal['id'] = str(goal['_id'])
                del goal['_id']
            return goals
        except Exception as e:
            print(f"Error in get_user_financial_goals: {e}")
            return []
    
    @classmethod
    async def get_financial_goal_by_id(cls, goal_id: str) -> Optional[Dict[str, Any]]:
        from bson import ObjectId
        try:
            goal = await cls.db.financial_goals.find_one({"_id": ObjectId(goal_id)})
            if goal:
                goal['id'] = str(goal['_id'])
                del goal['_id']
            return goal
        except Exception as e:
            print(f"Error in get_financial_goal_by_id: {e}")
            return None
    
    @classmethod
    async def update_financial_goal(cls, goal_id: str, update_data: Dict[str, Any]) -> bool:
        from bson import ObjectId
        try:
            update_data['updated_at'] = datetime.utcnow()
            result = await cls.db.financial_goals.update_one(
                {"_id": ObjectId(goal_id)},
                {"$set": update_data}
            )
            return result.modified_count > 0
        except Exception as e:
            print(f"Error in update_financial_goal: {e}")
            return False
    
    @classmethod
    async def delete_financial_goal(cls, goal_id: str) -> bool:
        from bson import ObjectId
        try:
            result = await cls.db.financial_goals.delete_one({"_id": ObjectId(goal_id)})
            return result.deleted_count > 0
        except Exception as e:
            print(f"Error in delete_financial_goal: {e}")
            return False