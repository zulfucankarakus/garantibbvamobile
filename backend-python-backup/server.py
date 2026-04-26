from fastapi import FastAPI, APIRouter, HTTPException, Depends, Response, UploadFile, File, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
from pathlib import Path
from typing import List, Optional, Any, Dict
import jwt
from jwt.exceptions import InvalidTokenError, ExpiredSignatureError
from datetime import datetime, timedelta
from bson import ObjectId

from models import (
    User, UserCreate, UserLogin, Account, AccountCreate, 
    Card, CardCreate, Transaction, TransactionCreate,
    Application, ApplicationCreate, Notification, NotificationCreate,
    WealthCategory, WealthCategoryCreate, FinancialTip, FinancialTipCreate,
    SavingPlan, SavingPlanCreate, FinancialGoal, FinancialGoalCreate,
    AccountType, CardType, ApplicationStatus, ApplicationType,
    QRGenerateRequest, QRPaymentRequest, DebitCardWithAccountCreate, AccountSearchRequest,
    InvestmentTransactionCreate, InvestmentTransactionType, ScrapePriceRequest
)
from database import (
    Database, get_password_hash, verify_password,
    generate_customer_no, generate_account_no, generate_iban, generate_card_no,
    generate_cvv, generate_expiry_date, validate_tc_no,
    generate_verification_code, validate_password, validate_email, validate_phone
)
from investment_service import investment_service
from product_scraper import product_scraper
from smart_investment_advisor import smart_advisor
import uuid

# Deep Learning modulleri
from deep_learning.routes import deep_learning_router

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# Initialize Database class
from database import Database
Database.client = client
Database.db = db

# Initialize Database class
Database.initialize(mongo_url, os.environ['DB_NAME'])

# JWT Settings
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

security = HTTPBearer()

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Helper functions
def convert_objectid_to_str(data: Any) -> Any:
    """Recursively convert all ObjectId instances to strings in nested data structures"""
    if isinstance(data, ObjectId):
        return str(data)
    elif isinstance(data, dict):
        return {key: convert_objectid_to_str(value) for key, value in data.items()}
    elif isinstance(data, list):
        return [convert_objectid_to_str(item) for item in data]
    else:
        return data

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        user = await Database.get_user_by_id(user_id)
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except InvalidTokenError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

# Auth Routes
@api_router.post("/auth/send-email-code")
async def send_email_verification_code(email: str):
    """E-posta doğrulama kodu gönder (Demo mod - gerçek email gönderilmez)"""
    # E-posta validasyonu
    email_error = validate_email(email)
    if email_error:
        raise HTTPException(status_code=400, detail=email_error)
    
    # 6 haneli kod üret
    code = generate_verification_code()
    
    # Kodu database'e kaydet
    await Database.save_verification_code(email, code, 'email')
    
    # Console'a yazdır (debug için)
    print(f"📧 E-POSTA DOĞRULAMA KODU ({email}): {code}")
    
    return {
        "message": "Doğrulama kodu e-posta adresinize gönderildi",
        "email": email,
        # Demo mod - kod response'da döner
        "code_for_demo": code
    }

@api_router.post("/auth/verify-email-code")
async def verify_email_code(email: str, code: str):
    """E-posta kodunu doğrula"""
    is_valid = await Database.verify_code(email, code, 'email')
    
    if not is_valid:
        raise HTTPException(
            status_code=400,
            detail="Geçersiz veya süresi dolmuş kod. Lütfen tekrar deneyin."
        )
    
    return {"message": "E-posta adresi doğrulandı", "verified": True}

@api_router.post("/auth/send-phone-code")
async def send_phone_verification_code(phone: str):
    """Telefon doğrulama kodu gönder (Demo mod - gerçek SMS gönderilmez)"""
    # Telefon validasyonu
    phone_error = validate_phone(phone)
    if phone_error:
        raise HTTPException(status_code=400, detail=phone_error)
    
    # 6 haneli kod üret
    code = generate_verification_code()
    
    # Kodu database'e kaydet
    await Database.save_verification_code(phone, code, 'phone')
    
    # Console'a yazdır (debug için)
    print(f"📱 TELEFON DOĞRULAMA KODU ({phone}): {code}")
    
    return {
        "message": "Doğrulama kodu telefonunuza gönderildi",
        "phone": phone,
        # Demo mod - kod response'da döner
        "code_for_demo": code
    }

@api_router.post("/auth/verify-phone-code")
async def verify_phone_code(phone: str, code: str):
    """Telefon kodunu doğrula"""
    is_valid = await Database.verify_code(phone, code, 'phone')
    
    if not is_valid:
        raise HTTPException(
            status_code=400,
            detail="Geçersiz veya süresi dolmuş kod. Lütfen tekrar deneyin."
        )
    
    return {"message": "Telefon numarası doğrulandı", "verified": True}

@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    # TC Kimlik No doğrulama
    if not validate_tc_no(user_data.tc_no):
        raise HTTPException(
            status_code=400, 
            detail="Geçersiz TC Kimlik Numarası. Lütfen geçerli bir TC Kimlik Numarası girin."
        )
    
    # Şifre doğrulama
    password_error = validate_password(user_data.password)
    if password_error:
        raise HTTPException(status_code=400, detail=password_error)
    
    # E-posta doğrulama
    email_error = validate_email(user_data.email)
    if email_error:
        raise HTTPException(status_code=400, detail=email_error)
    
    # Telefon doğrulama
    phone_error = validate_phone(user_data.phone)
    if phone_error:
        raise HTTPException(status_code=400, detail=phone_error)
    
    # Check if user already exists
    existing_user = await Database.get_user_by_tc(user_data.tc_no)
    if existing_user:
        raise HTTPException(status_code=400, detail="User with this TC No already exists")
    
    # Create user
    hashed_password = get_password_hash(user_data.password)
    customer_no = generate_customer_no()
    
    user_dict = user_data.dict()
    user_dict['password'] = hashed_password
    user_dict['customer_no'] = customer_no
    user_dict['role'] = 'customer'
    user_dict['profile_image'] = f"https://ui-avatars.com/api/?name={user_data.name}&background=00A19A&color=fff"
    
    user = await Database.create_user(user_dict)
    
    # Create welcome notification
    await Database.create_notification({
        'user_id': user['id'],
        'title': 'Hoş Geldiniz!',
        'message': f'Garanti BBVA\'ya hoş geldiniz {user_data.name}. Hesap açmak için başvuru yapabilirsiniz.',
        'notification_type': 'welcome',
        'read': False
    })
    
    # Create access token
    access_token = create_access_token(data={"sub": user['id']})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user['id'],
            "name": user['name'],
            "customer_no": user['customer_no'],
            "tc_no": user['tc_no'],
            "email": user['email'],
            "phone": user['phone'],
            "profile_image": user['profile_image']
        }
    }

@api_router.post("/auth/login")
async def login(login_data: UserLogin):
    # Try to find user by TC No or Customer No
    user = await Database.get_user_by_tc(login_data.identifier)
    if not user:
        user = await Database.get_user_by_customer_no(login_data.identifier)
    
    if not user or not verify_password(login_data.password, user['password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Create access token
    access_token = create_access_token(data={"sub": user['id']})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user['id'],
            "name": user['name'],
            "customer_no": user['customer_no'],
            "tc_no": user['tc_no'],
            "email": user['email'],
            "phone": user['phone'],
            "profile_image": user.get('profile_image')
        }
    }

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "id": current_user['id'],
        "name": current_user['name'],
        "customer_no": current_user['customer_no'],
        "tc_no": current_user['tc_no'],
        "email": current_user['email'],
        "phone": current_user['phone'],
        "profile_image": current_user.get('profile_image')
    }

# Branch Routes (Şube API'leri)
from branch_service import get_all_branches, get_nearest_branch, get_branches_by_city, search_branches

@api_router.get("/branches")
async def list_all_branches():
    """Tüm Garanti BBVA şubelerini listele"""
    branches = await get_all_branches()
    return {"branches": branches, "total": len(branches)}

@api_router.get("/branches/nearest")
async def find_nearest_branch(lat: float, lng: float, limit: int = 5):
    """Kullanıcıya en yakın şubeleri bul"""
    branches = await get_nearest_branch(lat, lng, limit)
    return {"branches": branches}

@api_router.get("/branches/city/{city}")
async def list_branches_by_city(city: str):
    """Belirli bir şehirdeki şubeleri listele"""
    branches = await get_branches_by_city(city)
    return {"branches": branches, "city": city, "total": len(branches)}

@api_router.get("/branches/search")
async def search_branch(q: str):
    """Şube ara (isim veya şehir)"""
    branches = await search_branches(q)
    return {"branches": branches, "query": q, "total": len(branches)}

# Account Routes
@api_router.get("/accounts")
async def get_accounts(current_user: dict = Depends(get_current_user)):
    accounts = await Database.get_user_accounts(current_user['id'])
    return accounts

@api_router.post("/accounts")
async def create_account(account_data: AccountCreate, current_user: dict = Depends(get_current_user)):
    # Check if user has pending account application
    applications = await Database.get_user_applications(current_user['id'])
    pending_account_apps = [app for app in applications if app['application_type'] == 'account' and app['status'] == 'pending']
    
    if pending_account_apps:
        raise HTTPException(status_code=400, detail="You have a pending account application")
    
    # Create application first
    application_dict = {
        'user_id': current_user['id'],
        'application_type': ApplicationType.ACCOUNT,
        'status': ApplicationStatus.PENDING,
        'details': {
            'account_type': account_data.account_type,
            'name': account_data.name
        }
    }
    
    application = await Database.create_application(application_dict)
    
    # Create notification
    await Database.create_notification({
        'user_id': current_user['id'],
        'title': 'Hesap Başvurunuz Alındı',
        'message': f'{account_data.name} başvurunuz değerlendiriliyor.',
        'notification_type': 'application',
        'read': False
    })
    
    # Auto-approve for demo (in real system, this would be manual)
    await Database.update_application_status(application['id'], ApplicationStatus.APPROVED)
    
    # Create account
    account_no = generate_account_no()
    iban = generate_iban(account_no)
    
    account_dict = {
        'user_id': current_user['id'],
        'account_no': account_no,
        'account_type': account_data.account_type,
        'name': account_data.name,
        'balance': 0.0,
        'iban': iban
    }
    
    account = await Database.create_account(account_dict)
    
    # Vadesiz mevduat ve yemek hesabı için otomatik bankamatik kartı oluştur
    if account_data.account_type in ['checking', 'meal']:
        # Kart adını hesap tipine göre belirle
        card_name = f"{account_data.name} Kartı"
        if account_data.account_type == 'checking':
            card_name = "Bankamatik Kartı"
        elif account_data.account_type == 'meal':
            card_name = "Yemek Kartı"
        
        # Kart bilgilerini oluştur
        card_no = generate_card_no()
        cvv = generate_cvv()
        expiry_date = generate_expiry_date()
        
        # Bankamatik kartı oluştur (limit yok, hesap bakiyesi kadar kullanılabilir)
        card_dict = {
            'user_id': current_user['id'],
            'account_id': account['id'],  # Hesaba bağla
            'card_no': card_no,
            'card_type': 'debit',
            'name': card_name,
            'cvv': cvv,
            'expiry_date': expiry_date,
            'status': 'active',
            'limit': None,  # Bankamatik kartı için limit yok
            'available_limit': None,
            'balance': 0.0  # Hesap bakiyesiyle senkronize olacak
        }
        
        await Database.create_card(card_dict)
    
    # Create approval notification
    await Database.create_notification({
        'user_id': current_user['id'],
        'title': 'Hesap Başvurunuz Onaylandı!',
        'message': f'{account_data.name} hesabınız başarıyla oluşturuldu.',
        'notification_type': 'success',
        'read': False
    })
    
    return account

# Add Balance Route (For Testing)
@api_router.post("/accounts/{account_id}/add-balance")
async def add_balance_to_account(account_id: str, amount: float, current_user: dict = Depends(get_current_user)):
    """Test için hesaba bakiye ekleme endpoint'i"""
    # Hesabın kullanıcıya ait olduğunu kontrol et
    account = await Database.get_account_by_id(account_id)
    if not account or account['user_id'] != current_user['id']:
        raise HTTPException(status_code=404, detail="Account not found")
    
    # Bakiye ekle
    new_balance = account['balance'] + amount
    await Database.update_account_balance(account_id, new_balance)
    
    # Güncellenen hesabı döndür
    updated_account = await Database.get_account_by_id(account_id)
    
    # Bildirim oluştur
    await Database.create_notification({
        'user_id': current_user['id'],
        'title': 'Bakiye Eklendi',
        'message': f'{account["name"]} hesabınıza {amount} TL eklendi. Yeni bakiye: {new_balance} TL',
        'notification_type': 'success',
        'read': False
    })
    
    return updated_account

@api_router.delete("/accounts/{account_id}")
async def delete_account(account_id: str, target_account_id: str = None, current_user: dict = Depends(get_current_user)):
    """Delete/close an account with validations"""
    # Verify account belongs to user
    account = await Database.get_account_by_id(account_id)
    if not account or account['user_id'] != current_user['id']:
        raise HTTPException(status_code=404, detail="Account not found")
    
    # Only allow closing specific account types
    allowed_types = ['checking', 'meal', 'savings']
    if account['account_type'] not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Bu hesap tipi kapatılamaz."
        )
    
    # Get all user accounts
    all_accounts = await Database.get_user_accounts(current_user['id'])
    
    # Can't delete if it's the only account
    if len(all_accounts) <= 1:
        raise HTTPException(
            status_code=400,
            detail="En az bir hesabınız bulunmalıdır. Son hesabınızı kapatamazsınız."
        )
    
    # Check if account has balance
    if account.get('balance', 0) > 0:
        if not target_account_id:
            # Return list of other accounts for user to choose
            other_accounts = [acc for acc in all_accounts if acc['id'] != account_id]
            return {
                "requires_transfer": True,
                "balance": account['balance'],
                "available_accounts": other_accounts,
                "message": f"Hesabınızda {account['balance']:.2f} TL bulunmaktadır. Lütfen bakiyenizi aktaracağınız hesabı seçin."
            }
        
        # Verify target account exists and belongs to user
        target_account = await Database.get_account_by_id(target_account_id)
        if not target_account or target_account['user_id'] != current_user['id']:
            raise HTTPException(status_code=404, detail="Hedef hesap bulunamadı")
        
        if target_account_id == account_id:
            raise HTTPException(status_code=400, detail="Aynı hesaba transfer yapamazsınız")
        
        # Transfer balance to target account
        transfer_amount = account['balance']
        new_target_balance = target_account['balance'] + transfer_amount
        await Database.update_account_balance(target_account_id, new_target_balance)
        
        # Update source account balance to 0
        await Database.update_account_balance(account_id, 0)
        
        # Create notification about transfer
        await Database.create_notification({
            'user_id': current_user['id'],
            'title': 'Bakiye Aktarıldı',
            'message': f'{account["name"]} hesabından {target_account["name"]} hesabına {transfer_amount:.2f} TL aktarıldı.',
            'notification_type': 'info',
            'read': False
        })
    
    # Delete all cards linked to this account
    cards = await Database.get_user_cards(current_user['id'])
    for card in cards:
        if card.get('account_id') == account_id:
            await Database.delete_card(card['id'])
    
    # Delete the account
    await Database.delete_account(account_id)
    
    # Create notification
    await Database.create_notification({
        'user_id': current_user['id'],
        'title': 'Hesap Kapatıldı',
        'message': f'{account["name"]} hesabınız başarıyla kapatıldı.',
        'notification_type': 'info',
        'read': False
    })
    
    return {"message": "Hesap başarıyla kapatıldı", "status": "success"}

# Card Routes
@api_router.get("/cards")
async def get_cards(current_user: dict = Depends(get_current_user)):
    cards = await Database.get_user_cards(current_user['id'])
    return cards

@api_router.get("/cards/{card_id}/transactions")
async def get_card_transactions(card_id: str, current_user: dict = Depends(get_current_user)):
    """Get transactions for a specific card"""
    # Verify card belongs to user
    card = await Database.get_card_by_id(card_id)
    if not card or card['user_id'] != current_user['id']:
        raise HTTPException(status_code=404, detail="Card not found")
    
    # Get card transactions
    transactions = await Database.get_card_transactions(card_id)
    return transactions

@api_router.delete("/cards/{card_id}")
async def delete_card(card_id: str, current_user: dict = Depends(get_current_user)):
    """Delete/close a card with validations"""
    # Verify card belongs to user
    card = await Database.get_card_by_id(card_id)
    if not card or card['user_id'] != current_user['id']:
        raise HTTPException(status_code=404, detail="Card not found")
    
    # Check card type and apply rules
    if card['card_type'] == 'debit':
        # Bankamatik kartı - bakiye varsa ana hesaba aktar
        if card.get('balance', 0) > 0:
            # Ana hesabı bul (ilk oluşturulan vadesiz mevduat hesabı)
            accounts = await Database.get_user_accounts(current_user['id'])
            main_account = None
            
            # İlk vadesiz mevduat hesabını bul
            for account in sorted(accounts, key=lambda x: x.get('created_at', '')):
                if account['account_type'] == 'checking':
                    main_account = account
                    break
            
            if not main_account:
                raise HTTPException(
                    status_code=400, 
                    detail="Ana hesap bulunamadı. Kart bakiyesi aktarılamıyor."
                )
            
            # Bakiyeyi ana hesaba aktar
            transfer_amount = card['balance']
            new_main_balance = main_account['balance'] + transfer_amount
            await Database.update_account_balance(main_account['id'], new_main_balance)
            
            # Bildirim oluştur
            await Database.create_notification({
                'user_id': current_user['id'],
                'title': 'Kart Kapatıldı',
                'message': f'{card["name"]} kapatıldı. {transfer_amount:.2f} TL {main_account["name"]} hesabına aktarıldı.',
                'notification_type': 'info',
                'read': False
            })
    
    elif card['card_type'] == 'credit':
        # Kredi kartı - borç varsa kapatılamaz
        if card.get('balance', 0) > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Kredi kartınızda {card['balance']:.2f} TL ödenmemiş borç bulunmaktadır. Lütfen önce borcunuzu ödeyin."
            )
        
        # Bildirim oluştur
        await Database.create_notification({
            'user_id': current_user['id'],
            'title': 'Kart Kapatıldı',
            'message': f'{card["name"]} başarıyla kapatıldı.',
            'notification_type': 'info',
            'read': False
        })
    
    # Kartı sil
    await Database.delete_card(card_id)
    
    return {"message": "Kart başarıyla kapatıldı", "status": "success"}

@api_router.post("/cards")
async def create_card(card_data: CardCreate, current_user: dict = Depends(get_current_user)):
    # Create application first
    application_dict = {
        'user_id': current_user['id'],
        'application_type': ApplicationType.CARD,
        'status': ApplicationStatus.PENDING,
        'details': {
            'card_type': card_data.card_type,
            'name': card_data.name
        }
    }
    
    application = await Database.create_application(application_dict)
    
    # Create notification
    await Database.create_notification({
        'user_id': current_user['id'],
        'title': 'Kart Başvurunuz Alındı',
        'message': f'{card_data.name} başvurunuz değerlendiriliyor.',
        'notification_type': 'application',
        'read': False
    })
    
    # Auto-approve for demo
    await Database.update_application_status(application['id'], ApplicationStatus.APPROVED)
    
    # Create card
    card_no = generate_card_no()
    cvv = generate_cvv()
    expiry_date = generate_expiry_date()
    
    # Kredi kartı için 15000 TL limit, Bankamatik kartı için limit yok (hesap bakiyesi kadar)
    if card_data.card_type == CardType.CREDIT:
        limit = 15000.0
        available_limit = 15000.0
    else:
        limit = None  # Bankamatik kartı için limit yok
        available_limit = None
    
    card_dict = {
        'user_id': current_user['id'],
        'account_id': None,
        'card_no': card_no,
        'card_type': card_data.card_type,
        'name': card_data.name,
        'cvv': cvv,
        'expiry_date': expiry_date,
        'status': 'active',
        'limit': limit,
        'available_limit': available_limit,
        'balance': 0.0
    }
    
    card = await Database.create_card(card_dict)
    
    # Create approval notification
    await Database.create_notification({
        'user_id': current_user['id'],
        'title': 'Kart Başvurunuz Onaylandı!',
        'message': f'{card_data.name} kartınız başarıyla oluşturuldu.',
        'notification_type': 'success',
        'read': False
    })
    
    return card

# Transaction Routes
@api_router.get("/transactions")
async def get_transactions(current_user: dict = Depends(get_current_user), limit: int = 50):
    transactions = await Database.get_user_transactions(current_user['id'], limit)
    return transactions

@api_router.get("/transactions/account/{account_id}")
async def get_account_transactions(account_id: str, current_user: dict = Depends(get_current_user)):
    # Verify account belongs to user
    account = await Database.get_account_by_id(account_id)
    if not account or account['user_id'] != current_user['id']:
        raise HTTPException(status_code=404, detail="Account not found")
    
    transactions = await Database.get_account_transactions(account_id)
    return transactions

@api_router.post("/transactions")
async def create_transaction(transaction_data: TransactionCreate, current_user: dict = Depends(get_current_user)):
    from transaction_ai import transaction_ai
    
    # Verify from_account belongs to user
    from_account = await Database.get_account_by_id(transaction_data.from_account_id)
    if not from_account or from_account['user_id'] != current_user['id']:
        raise HTTPException(status_code=404, detail="From account not found")
    
    # Check balance
    if from_account['balance'] < transaction_data.amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    
    # Find recipient account by IBAN
    to_account = await Database.get_account_by_iban(transaction_data.to_account_iban)
    if not to_account:
        raise HTTPException(status_code=404, detail="Recipient account not found with this IBAN")
    
    # Create transaction
    transaction_dict = transaction_data.dict()
    transaction_dict['user_id'] = str(current_user['id'])
    transaction_dict['status'] = 'completed'
    transaction_dict['to_account_id'] = str(to_account['id'])  # Alıcı hesap ID'sini ekle
    transaction_dict['from_account_id'] = str(transaction_data.from_account_id)
    
    transaction = await Database.create_transaction(transaction_dict)
    
    # Update sender account balance (decrease)
    sender_new_balance = from_account['balance'] - transaction_data.amount
    await Database.update_account_balance(transaction_data.from_account_id, sender_new_balance)
    
    # Update recipient account balance (increase)
    recipient_new_balance = to_account['balance'] + transaction_data.amount
    await Database.update_account_balance(to_account['id'], recipient_new_balance)
    
    # Create notification for sender
    await Database.create_notification({
        'user_id': current_user['id'],
        'title': 'Transfer Başarılı',
        'message': f'{from_account["name"]} hesabınızdan {transaction_data.amount} TL transfer edildi.',
        'notification_type': 'success',
        'read': False
    })
    
    # Create notification for recipient
    await Database.create_notification({
        'user_id': to_account['user_id'],
        'title': 'Para Aldınız',
        'message': f'Hesabınıza {transaction_data.amount} TL transfer yapıldı.',
        'notification_type': 'success',
        'read': False
    })
    
    # Convert all ObjectId instances to strings BEFORE AI analysis
    transaction = convert_objectid_to_str(transaction)
    
    # AI ANALYSIS: Aktif hedeflere etkiyi analiz et
    active_goals = await Database.get_user_financial_goals(current_user['id'], status='active')
    if active_goals:
        # Clean active_goals data
        active_goals = convert_objectid_to_str(active_goals)
        
        recent_transactions = await Database.get_user_transactions(current_user['id'], limit=10)
        # Clean recent_transactions data
        recent_transactions = convert_objectid_to_str(recent_transactions)
        
        try:
            ai_impact = transaction_ai.analyze_transaction_impact(
                transaction=transaction,
                active_goals=active_goals,
                recent_transactions=recent_transactions
            )
            
            # Bildirim oluştur
            impact_emoji = "🎯" if ai_impact['impact'] == 'positive' else "⚠️" if ai_impact['impact'] == 'negative' else "ℹ️"
            
            await Database.create_notification({
                'user_id': current_user['id'],
                'title': f'{impact_emoji} Hedef Güncelleme',
                'message': ai_impact['comment'],
                'notification_type': 'info',
                'read': False
            })
            
            # İşleme AI analizi ekle
            transaction['ai_impact'] = ai_impact
        except Exception as e:
            # AI analysis hatası transfer işlemini etkilememeli
            print(f"AI analysis error (non-critical): {str(e)}")
    
    return transaction

# Application Routes
@api_router.get("/applications")
async def get_applications(current_user: dict = Depends(get_current_user)):
    applications = await Database.get_user_applications(current_user['id'])
    return applications

# Notification Routes
@api_router.get("/notifications")
async def get_notifications(unread_only: bool = False, current_user: dict = Depends(get_current_user)):
    notifications = await Database.get_user_notifications(current_user['id'], unread_only)
    return notifications

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user: dict = Depends(get_current_user)):
    await Database.mark_notification_read(notification_id)
    return {"message": "Notification marked as read"}

# Wealth Category Routes
@api_router.get("/wealth-categories")
async def get_wealth_categories():
    categories = await Database.get_wealth_categories()
    return categories

# Financial Tips Routes
@api_router.get("/financial-tips")
async def get_financial_tips():
    tips = await Database.get_financial_tips()
    return tips

# Saving Plans Routes
@api_router.get("/saving-plans")
async def get_saving_plans():
    plans = await Database.get_saving_plans()
    return plans

# Status/Wealth Overview Route
@api_router.get("/status/overview")
async def get_status_overview(current_user: dict = Depends(get_current_user)):
    # Get all data
    accounts = await Database.get_user_accounts(current_user['id'])
    cards = await Database.get_user_cards(current_user['id'])
    transactions = await Database.get_user_transactions(current_user['id'], limit=100)
    categories = await Database.get_wealth_categories()
    tips = await Database.get_financial_tips()
    plans = await Database.get_saving_plans()
    
    # Calculate wealth data
    total_assets = sum(acc.get('balance', 0) for acc in accounts)
    total_liabilities = sum(
        abs(card.get('balance', 0)) 
        for card in cards 
        if card.get('card_type') == 'credit'
    )
    
    # Calculate income and expenses
    income = sum(t.get('amount', 0) for t in transactions if t.get('amount', 0) > 0)
    expense = sum(abs(t.get('amount', 0)) for t in transactions if t.get('amount', 0) < 0)
    
    return {
        'assets': total_assets,
        'liabilities': total_liabilities,
        'netWorth': total_assets - total_liabilities,
        'income': income,
        'expense': expense,
        'monthlyBalance': income - expense,
        'categories': categories,
        'financialHealthTips': tips,
        'savingPlans': plans
    }

# Search Route
@api_router.get("/search")
async def search(q: str, current_user: dict = Depends(get_current_user)):
    transactions = await Database.search_transactions(current_user['id'], q)
    return {
        "transactions": transactions,
        "query": q
    }

# QR Payment Routes
import json
import base64

@api_router.post("/qr/generate")
async def generate_qr_code(qr_request: QRGenerateRequest, current_user: dict = Depends(get_current_user)):
    """Generate QR code for receiving payment"""
    # Verify account belongs to user
    account = await Database.get_account_by_id(qr_request.account_id)
    if not account or account['user_id'] != current_user['id']:
        raise HTTPException(status_code=404, detail="Account not found")
    
    # Create QR data
    qr_data = {
        'account_id': qr_request.account_id,
        'account_no': account['account_no'],
        'iban': account['iban'],
        'user_name': current_user['name'],
        'amount': qr_request.amount,
        'description': qr_request.description
    }
    
    # Encode to base64
    qr_json = json.dumps(qr_data)
    qr_code = base64.b64encode(qr_json.encode()).decode()
    
    return {
        'qr_code': qr_code,
        'qr_data': qr_data,
        'message': 'QR kod başarıyla oluşturuldu'
    }

@api_router.post("/qr/pay")
async def pay_with_qr(payment_request: QRPaymentRequest, current_user: dict = Depends(get_current_user)):
    """Pay using QR code"""
    try:
        # Decode QR code
        qr_json = base64.b64decode(payment_request.qr_code.encode()).decode()
        qr_data = json.loads(qr_json)
    except Exception as e:
        raise HTTPException(status_code=400, detail="Geçersiz QR kod")
    
    # Get amount (from request or QR code)
    amount = payment_request.amount or qr_data.get('amount')
    if not amount or amount <= 0:
        raise HTTPException(status_code=400, detail="Geçerli bir tutar giriniz")
    
    # Verify sender account
    from_account = await Database.get_account_by_id(payment_request.from_account_id)
    if not from_account or from_account['user_id'] != current_user['id']:
        raise HTTPException(status_code=404, detail="Gönderen hesap bulunamadı")
    
    # Check balance
    if from_account['balance'] < amount:
        raise HTTPException(status_code=400, detail="Yetersiz bakiye")
    
    # Get recipient account
    to_account = await Database.get_account_by_id(qr_data['account_id'])
    if not to_account:
        raise HTTPException(status_code=404, detail="Alıcı hesap bulunamadı")
    
    # Can't transfer to same account
    if from_account['id'] == to_account['id']:
        raise HTTPException(status_code=400, detail="Aynı hesaba transfer yapamazsınız")
    
    # Create transaction
    transaction_dict = {
        'user_id': current_user['id'],
        'from_account_id': payment_request.from_account_id,
        'to_account_id': to_account['id'],
        'to_account_iban': to_account['iban'],
        'amount': amount,
        'description': qr_data.get('description', 'QR ile ödeme'),
        'status': 'completed',
        'transaction_type': 'qr_payment'
    }
    
    transaction = await Database.create_transaction(transaction_dict)
    
    # Update balances
    sender_new_balance = from_account['balance'] - amount
    await Database.update_account_balance(payment_request.from_account_id, sender_new_balance)
    
    recipient_new_balance = to_account['balance'] + amount
    await Database.update_account_balance(to_account['id'], recipient_new_balance)
    
    # Create notifications
    await Database.create_notification({
        'user_id': current_user['id'],
        'title': 'QR Ödeme Başarılı',
        'message': f'{from_account["name"]} hesabınızdan {qr_data["user_name"]} adlı kişiye {amount} TL gönderildi.',
        'notification_type': 'success',
        'read': False
    })
    
    await Database.create_notification({
        'user_id': to_account['user_id'],
        'title': 'QR ile Para Aldınız',
        'message': f'{current_user["name"]} adlı kişiden {amount} TL aldınız.',
        'notification_type': 'success',
        'read': False
    })
    
    return {
        'transaction': transaction,
        'message': 'Ödeme başarıyla tamamlandı'
    }

# Account Search Route
@api_router.post("/accounts/search")
async def search_account(search_request: AccountSearchRequest, current_user: dict = Depends(get_current_user)):
    """Search account by account number or IBAN"""
    query = search_request.query.strip()
    
    # Try to find by IBAN first
    account = await Database.get_account_by_iban(query)
    
    # If not found, try by account number
    if not account:
        account = await Database.get_account_by_account_no(query)
    
    if not account:
        raise HTTPException(status_code=404, detail="Hesap bulunamadı")
    
    # Return limited info for security
    return {
        'account_id': account['id'],
        'account_no': account['account_no'],
        'iban': account['iban'],
        'name': account['name'],
        'account_type': account['account_type'],
        'user_name': 'Gizli'  # Don't expose user details for security
    }

# Debit Card with Account Creation Route
@api_router.post("/cards/debit-with-account")
async def create_debit_card_with_account(
    card_request: DebitCardWithAccountCreate, 
    current_user: dict = Depends(get_current_user)
):
    """Create debit card with automatic account creation"""
    # Create account first
    account_no = generate_account_no()
    iban = generate_iban(account_no)
    
    account_dict = {
        'user_id': current_user['id'],
        'account_no': account_no,
        'account_type': card_request.account_type,
        'name': card_request.account_name,
        'balance': 0.0,
        'iban': iban
    }
    
    account = await Database.create_account(account_dict)
    
    # Create debit card linked to this account
    card_no = generate_card_no()
    cvv = generate_cvv()
    expiry_date = generate_expiry_date()
    
    card_dict = {
        'user_id': current_user['id'],
        'account_id': account['id'],
        'card_no': card_no,
        'card_type': 'debit',
        'name': card_request.card_name,
        'cvv': cvv,
        'expiry_date': expiry_date,
        'status': 'active',
        'limit': None,
        'available_limit': None,
        'balance': 0.0
    }
    
    card = await Database.create_card(card_dict)
    
    # Create notification
    await Database.create_notification({
        'user_id': current_user['id'],
        'title': 'Hesap ve Kart Oluşturuldu!',
        'message': f'{card_request.card_name} ve {card_request.account_name} başarıyla oluşturuldu.',
        'notification_type': 'success',
        'read': False
    })
    
    return {
        'account': account,
        'card': card,
        'message': 'Banka kartı ve hesap başarıyla oluşturuldu'
    }

# Financial Goal Routes (Sandbox + Shield System V2)
from financial_simulator import run_full_simulation, FinancialSimulator, ShieldProtector
from financial_simulator_v2 import run_complete_simulation, EnhancedFinancialSimulator, EnhancedShieldProtector
from ai_advisor import ai_advisor
from market_data_api import market_data_api
from product_scraper import product_scraper
from enhanced_scraper import enhanced_scraper
from lstm_predictor import lstm_predictor
from portfolio_optimizer import portfolio_optimizer
from credit_system import credit_system
from pydantic import BaseModel as PydanticBaseModel

# Frontend-compatible Savings Plan model
class SavingsPlanRequest(PydanticBaseModel):
    goal_type: str = "savings"
    title: str
    target_amount: float
    current_amount: float = 0.0
    target_date: Optional[str] = None
    monthly_contribution: float
    auto_transfer: bool = True
    product_name: Optional[str] = None

@api_router.post("/financial-goals")
async def create_financial_goal(request: Request, current_user: dict = Depends(get_current_user)):
    """Frontend-compatible financial goal creation"""
    try:
        body = await request.json()
        
        # Frontend'den gelen verileri kontrol et
        if 'title' in body:
            # Yeni format (SavingsPlanScreen'den gelen)
            target_amount = float(body.get('target_amount', 0))
            monthly_contribution = float(body.get('monthly_contribution', 0))
            
            # Süreyi hesapla
            if monthly_contribution > 0:
                duration_months = int(target_amount / monthly_contribution) + 1
            else:
                duration_months = 12
            
            goal_dict = {
                'goal_name': body.get('title', body.get('product_name', 'Birikim Planı')),
                'target_amount': target_amount,
                'current_amount': float(body.get('current_amount', 0)),
                'duration_months': duration_months,
                'category': body.get('goal_type', 'savings'),
                'priority': 'medium',
                'monthly_income': 0,
                'monthly_expenses': 0,
                'monthly_savings': monthly_contribution,
                'shield_enabled': False,
                'status': 'planning',
                'user_id': current_user['id'],
                'auto_transfer': body.get('auto_transfer', True),
                'product_name': body.get('product_name'),
            }
        elif 'goal_name' in body:
            # Eski format (FinancialGoalCreate)
            goal_dict = body.copy()
            goal_dict['user_id'] = current_user['id']
        else:
            return {"success": False, "error": "Invalid request format"}
        
        # Run ENHANCED simulation (V2)
        try:
            simulation_result = run_complete_simulation(goal_dict)
        except Exception as e:
            print(f"V2 simulation error, falling back to V1: {e}")
            # Fallback to V1
            try:
                simulation_result = run_full_simulation(goal_dict)
                ai_analysis = ai_advisor.analyze_goal_feasibility(goal_dict, simulation_result)
                goal_dict['ai_analysis'] = ai_analysis
            except Exception as e2:
                print(f"V1 simulation also failed: {e2}")
                simulation_result = {
                    'success': True,
                    'monthly_savings': goal_dict.get('monthly_savings', 0),
                    'duration_months': goal_dict.get('duration_months', 12),
                    'recommendations': [],
                    'smart_alerts': []
                }
        
        goal_dict['simulation_result'] = simulation_result
        goal_dict['recommendations'] = simulation_result.get('recommendations', [])
        goal_dict['smart_alerts'] = simulation_result.get('smart_alerts', [])
        goal_dict['shield_data'] = simulation_result.get('shield', {})
        
        new_goal = await Database.create_financial_goal(goal_dict)
        return {"success": True, "goal": new_goal}
        
    except Exception as e:
        print(f"Financial goal creation error: {e}")
        import traceback
        traceback.print_exc()
        return {"success": False, "error": str(e)}

@api_router.get("/financial-goals")
async def get_financial_goals(status: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    goals = await Database.get_user_financial_goals(current_user['id'], status)
    return goals

@api_router.get("/financial-goals/{goal_id}")
async def get_financial_goal(goal_id: str, current_user: dict = Depends(get_current_user)):
    goal = await Database.get_financial_goal_by_id(goal_id)
    if not goal or goal['user_id'] != current_user['id']:
        raise HTTPException(status_code=404, detail="Goal not found")
    return goal

@api_router.put("/financial-goals/{goal_id}")
async def update_financial_goal(goal_id: str, update_data: dict, current_user: dict = Depends(get_current_user)):
    goal = await Database.get_financial_goal_by_id(goal_id)
    if not goal or goal['user_id'] != current_user['id']:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    # Re-run simulation if relevant fields changed
    if any(key in update_data for key in ['target_amount', 'duration_months', 'monthly_income', 'monthly_expenses', 'shield_enabled']):
        goal_data = {**goal, **update_data}
        simulation_result = run_full_simulation(goal_data)
        update_data['simulation_result'] = simulation_result
        update_data['recommendations'] = simulation_result.get('recommendations', [])
    
    success = await Database.update_financial_goal(goal_id, update_data)
    if success:
        return await Database.get_financial_goal_by_id(goal_id)
    raise HTTPException(status_code=500, detail="Update failed")

@api_router.delete("/financial-goals/{goal_id}")
async def delete_financial_goal(goal_id: str, current_user: dict = Depends(get_current_user)):
    goal = await Database.get_financial_goal_by_id(goal_id)
    if not goal or goal['user_id'] != current_user['id']:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    success = await Database.delete_financial_goal(goal_id)
    if success:
        return {"message": "Goal deleted successfully"}
    raise HTTPException(status_code=500, detail="Delete failed")

@api_router.post("/financial-goals/{goal_id}/contribute")
async def contribute_to_goal(goal_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Hedefe para ekle"""
    goal = await Database.get_financial_goal_by_id(goal_id)
    if not goal or goal['user_id'] != current_user['id']:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    body = await request.json()
    amount = float(body.get('amount', 0))
    
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    
    # Mevcut tutarı güncelle
    new_amount = float(goal.get('current_amount', 0)) + amount
    target_amount = float(goal.get('target_amount', 0))
    
    # Hedef tamamlandı mı kontrol et
    new_status = goal.get('status', 'planning')
    if new_amount >= target_amount:
        new_status = 'completed'
    elif new_amount > 0:
        new_status = 'active'
    
    # Katkı geçmişi oluştur
    contributions = goal.get('contributions', [])
    contributions.append({
        'amount': amount,
        'date': datetime.utcnow().isoformat(),
        'note': body.get('note', 'Manuel katkı')
    })
    
    update_data = {
        'current_amount': new_amount,
        'status': new_status,
        'contributions': contributions,
        'last_contribution_date': datetime.utcnow().isoformat()
    }
    
    success = await Database.update_financial_goal(goal_id, update_data)
    if success:
        updated_goal = await Database.get_financial_goal_by_id(goal_id)
        return {
            "success": True,
            "goal": updated_goal,
            "progress_percentage": min(100, (new_amount / target_amount) * 100) if target_amount > 0 else 0
        }
    raise HTTPException(status_code=500, detail="Contribution failed")

@api_router.post("/financial-goals/{goal_id}/simulate")
async def simulate_what_if(
    goal_id: str,
    expense_reduction_percent: float,
    current_user: dict = Depends(get_current_user)
):
    goal = await Database.get_financial_goal_by_id(goal_id)
    if not goal or goal['user_id'] != current_user['id']:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    result = FinancialSimulator.what_if_analysis(
        target_amount=goal['target_amount'],
        duration_months=goal['duration_months'],
        monthly_income=goal['monthly_income'],
        current_monthly_expenses=goal['monthly_expenses'],
        expense_reduction_percent=expense_reduction_percent
    )
    
    return result

@api_router.post("/financial-goals/{goal_id}/activate-shield")
async def activate_shield(goal_id: str, current_user: dict = Depends(get_current_user)):
    goal = await Database.get_financial_goal_by_id(goal_id)
    if not goal or goal['user_id'] != current_user['id']:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    # Calculate protection mix
    protection = ShieldProtector.calculate_protection_mix(
        target_amount=goal['target_amount'],
        duration_months=goal['duration_months'],
        expected_inflation=goal.get('expected_inflation', 40.0)
    )
    
    # Update goal
    update_data = {
        'shield_enabled': True,
        'protection_assets': protection['asset_mix'],
        'status': 'active'
    }
    
    await Database.update_financial_goal(goal_id, update_data)
    
    # Create notification
    await Database.create_notification({
        'user_id': current_user['id'],
        'title': 'Shield Aktif!',
        'message': f"{goal['goal_name']} hedefiniz için koruma kalkanı aktif edildi. Paranız artık enflasyona karşı korunuyor.",
        'type': 'success'
    })
    
    return {"message": "Shield activated successfully", "protection": protection}

# SMART INVESTMENT ADVISOR ENDPOINTS
@api_router.post("/smart-investment/analyze")
async def analyze_smart_investment(request: Request, current_user: dict = Depends(get_current_user)):
    """AI destekli akıllı yatırım planı oluştur"""
    try:
        body = await request.json()
        
        target_amount = float(body.get('target_amount', 0))
        product_name = body.get('product_name', 'Hedef')
        monthly_income = float(body.get('monthly_income', 0))
        monthly_expenses = float(body.get('monthly_expenses', 0))
        risk_tolerance = body.get('risk_tolerance', 'medium')
        existing_savings = float(body.get('existing_savings', 0))
        
        if target_amount <= 0:
            raise HTTPException(status_code=400, detail="Hedef tutar gereklidir")
        
        result = await smart_advisor.generate_smart_investment_plan(
            target_amount=target_amount,
            product_name=product_name,
            monthly_income=monthly_income,
            monthly_expenses=monthly_expenses,
            risk_tolerance=risk_tolerance,
            existing_savings=existing_savings
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Smart investment error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/smart-investment/market-analysis")
async def get_market_analysis(current_user: dict = Depends(get_current_user)):
    """Güncel piyasa analizi al"""
    try:
        market_data = smart_advisor.get_market_analysis()
        return {
            'success': True,
            'data': market_data,
            'timestamp': datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Market analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# MARKET DATA ENDPOINT - Simple CollectAPI Integration
@api_router.get("/market-data")
async def get_market_data_endpoint(response: Response):
    """USD, EUR, Altın ve Enflasyon verilerini getir"""
    try:
        # No-cache headers ekle
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        
        from simple_market_data import get_market_data
        data = get_market_data()
        return data
    except Exception as e:
        logger.error(f"Market data error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Market data error: {str(e)}")

# NEW ENDPOINTS - Product Price & Advanced Features
@api_router.get("/product-price/{product_name}")
async def get_product_price(product_name: str, category: str = 'electronics'):
    """Ürün fiyatı sorgula"""
    try:
        price_data = product_scraper.get_product_price(product_name, category)
        return price_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Product price error: {str(e)}")

@api_router.post("/product-price/scrape-url")
async def scrape_product_url(data: dict):
    """URL'den gerçek ürün fiyatı çek (Smart Matching)"""
    try:
        url = data.get('url', '').strip()
        goal_name = data.get('goal_name', '').strip()  # Hedef ürün adı
        
        if not url:
            raise HTTPException(status_code=400, detail="URL gereklidir")
        
        # URL validation
        if not url.startswith(('http://', 'https://')):
            url = 'https://' + url
        
        # Smart scraping with goal_name matching
        result = product_scraper.scrape_real_product_url(url, goal_name=goal_name)
        
        if not result:
            raise HTTPException(status_code=404, detail="Fiyat bulunamadı. Lütfen manuel girin.")
        
        if not result.get('success'):
            # Return user-friendly error
            error_msg = result.get('error', 'Fiyat çekilemedi')
            raise HTTPException(status_code=400, detail=error_msg)
        
        try:
            # Get market data for prediction
            market_data = market_data_api.get_market_summary()
            inflation_rate = market_data['inflation']['annual_inflation'] / 100
            
            # Predict future price
            months_ahead = int(data.get('months_ahead', 12))
            category = data.get('category', 'electronics')
            
            prediction = lstm_predictor.predict_future_prices(
                current_price=result['price'],
                months_ahead=months_ahead,
                inflation_rate=inflation_rate
            )
        except Exception as pred_error:
            # If prediction fails, still return scraped price
            print(f"Prediction error: {pred_error}")
            prediction = None
        
        # Combine results
        return {
            'success': True,
            'url': url,
            'product_name': result['product_name'],
            'current_price': result['price'],
            'scraped_at': result['scraped_at'],
            'prediction': prediction,
            'market_data': {
                'usd_rate': market_data.get('currencies', {}).get('USD', 0) if market_data else 0,
                'eur_rate': market_data.get('currencies', {}).get('EUR', 0) if market_data else 0,
                'inflation_rate': market_data.get('inflation', {}).get('annual_inflation', 50) if market_data else 50
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        error_detail = str(e)[:200]  # Limit error message length
        raise HTTPException(status_code=500, detail=f"Bir hata oluştu: {error_detail}")

@api_router.post("/product-price/predict")
async def predict_product_price(data: dict):
    """LSTM ile ürün fiyat tahmini"""
    try:
        current_price = float(data.get('current_price', 0))
        months_ahead = int(data.get('months_ahead', 12))
        inflation_rate = float(data.get('inflation_rate', 0.50))
        
        prediction = lstm_predictor.predict_future_prices(
            current_price=current_price,
            months_ahead=months_ahead,
            inflation_rate=inflation_rate
        )
        
        return prediction
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

@api_router.post("/portfolio/optimize")
async def optimize_portfolio_endpoint(data: dict):
    """PSO ile portföy optimizasyonu"""
    try:
        target_return = float(data.get('target_return', 50.0))
        duration_months = int(data.get('duration_months', 12))
        
        # Market data
        market_data = market_data_api.get_market_summary()
        asset_returns = market_data['asset_returns']
        
        optimized = portfolio_optimizer.optimize_portfolio(
            target_return=target_return,
            asset_returns=asset_returns,
            duration_months=duration_months
        )
        
        return optimized
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Optimization error: {str(e)}")

@api_router.post("/financial-goals/{goal_id}/what-if-advanced")
async def what_if_advanced_analysis(
    goal_id: str,
    scenarios: List[Dict],
    current_user: dict = Depends(get_current_user)
):
    """Gelişmiş What-If analizi (çoklu senaryo)"""
    goal = await Database.get_financial_goal_by_id(goal_id)
    if not goal or goal['user_id'] != current_user['id']:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    try:
        results = EnhancedFinancialSimulator.what_if_analysis(goal, scenarios)
        return {"scenarios": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"What-if analysis error: {str(e)}")

@api_router.get("/financial-goals/{goal_id}/smart-alerts")
async def get_smart_alerts(goal_id: str, current_user: dict = Depends(get_current_user)):
    """Akıllı uyarılar"""
    goal = await Database.get_financial_goal_by_id(goal_id)
    if not goal or goal['user_id'] != current_user['id']:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    try:
        # Simülasyon sonucu
        scenario_result = goal.get('simulation_result', {}).get('scenario', {})
        
        # Uyarılar oluştur
        alerts = EnhancedShieldProtector.generate_smart_alerts(goal, scenario_result)
        
        return {"alerts": alerts}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Smart alerts error: {str(e)}")

@api_router.post("/credit/calculate")
async def calculate_credit_offer(data: dict, current_user: dict = Depends(get_current_user)):
    """Kredi teklifi hesapla"""
    try:
        amount = float(data.get('amount', 0))
        duration_months = int(data.get('duration_months', 12))
        user_income = float(data.get('monthly_income', 0))
        
        # Kullanıcı verileri
        accounts = await Database.get_user_accounts(current_user['id'])
        cards = await Database.get_user_cards(current_user['id'])
        transactions = await Database.get_user_transactions(current_user['id'], limit=50)
        
        user_data = {
            'accounts': accounts,
            'cards': cards,
            'transactions': transactions
        }
        
        # Kredi skoru
        credit_score = credit_system.calculate_credit_score(user_data)
        
        # Kredi teklifi
        loan_offer = credit_system.calculate_loan_offer(
            amount_needed=amount,
            duration_months=duration_months,
            credit_score=credit_score,
            user_income=user_income
        )
        
        return loan_offer
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Credit calculation error: {str(e)}")

# Not: /credit/apply endpoint'i aşağıda tanımlı (VISION LENS bölümünde)

@api_router.get("/credit/score")
async def get_credit_score(current_user: dict = Depends(get_current_user)):
    """Kredi skoru sorgula"""
    try:
        # Kullanıcı verileri
        accounts = await Database.get_user_accounts(current_user['id'])
        cards = await Database.get_user_cards(current_user['id'])
        transactions = await Database.get_user_transactions(current_user['id'], limit=50)
        
        user_data = {
            'accounts': accounts,
            'cards': cards,
            'transactions': transactions
        }
        
        credit_score = credit_system.calculate_credit_score(user_data)
        credit_rating = credit_system.get_credit_rating(credit_score)
        
        return {
            'credit_score': credit_score,
            'credit_rating': credit_rating,
            'max_score': 850,
            'min_score': 300
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Credit score error: {str(e)}")

# ==================== VISION LENS ENDPOINTS ====================
from pydantic import BaseModel
from unified_vision_service import unified_service

class VisionAnalyzeRequest(BaseModel):
    image_base64: str

class VisionFinancialAdviceRequest(BaseModel):
    object_data: Dict[str, Any]
    price_data: Dict[str, Any]

@api_router.post("/vision/analyze")
async def analyze_image(request: VisionAnalyzeRequest, user: dict = Depends(get_current_user)):
    """
    🎯 UNIFIED VISION ANALYSIS
    Complete end-to-end analysis: The Eye → The Oracle → The Brain
    
    Success Rate: 99.9%+ with 5-layer fallback cascade:
    1. Google Cloud Vision
    2. Claude 3.5 Sonnet
    3. OpenAI GPT-4o
    4. Gemini 2.0 Flash
    5. Basic Image Analysis
    """
    try:
        logger.info("🎯 Starting unified vision analysis...")
        
        # Get user financial data
        accounts = await Database.get_user_accounts(user["id"])
        total_balance = sum([acc.get("balance", 0) for acc in accounts])
        
        user_data = {
            "user_id": user["id"],
            "balance": total_balance,
            "credit_score": 750,  # Mock - can be retrieved from database
            "monthly_income": 50000  # Mock - can be retrieved from database
        }
        
        # Complete analysis with all 3 layers
        result = await unified_service.complete_analysis(
            image_base64=request.image_base64,
            user_data=user_data
        )
        
        if not result.get("success"):
            logger.error(f"❌ Analysis failed: {result.get('error')}")
            # Return graceful error with fallback data
            return {
                "success": False,
                "error": result.get("error", "Analysis failed"),
                "data": {
                    "object_data": {
                        "object_name": "Ürün",
                        "category": "other",
                        "description": "Görüntü analiz edilemedi. Lütfen tekrar deneyin.",
                        "confidence": 0.1
                    },
                    "price_data": {
                        "current_price": 0,
                        "currency": "TRY"
                    }
                }
            }
        
        logger.info("✅ Unified vision analysis completed successfully")
        return result
        
    except Exception as e:
        logger.error(f"❌ Vision analyze error: {e}")
        import traceback
        traceback.print_exc()
        
        # Never return 500 - always provide fallback
        return {
            "success": False,
            "error": "Geçici bir hata oluştu",
            "data": {
                "object_data": {
                    "object_name": "Ürün",
                    "category": "other",
                    "description": "Servis geçici olarak kullanılamıyor. Lütfen tekrar deneyin.",
                    "confidence": 0.0
                },
                "price_data": {
                    "current_price": 0,
                    "currency": "TRY"
                }
            }
        }

@api_router.post("/vision/financial-advice")
async def get_financial_advice(
    request: VisionFinancialAdviceRequest, 
    user: dict = Depends(get_current_user)
):
    """
    🧠 Standalone Financial Advice (Legacy endpoint - use /vision/analyze for complete flow)
    """
    try:
        # Get user financial data
        accounts = await Database.get_user_accounts(user["id"])
        total_balance = sum([acc.get("balance", 0) for acc in accounts])
        
        user_data = {
            "user_id": user["id"],
            "balance": total_balance,
            "credit_score": 750,
            "monthly_income": 50000
        }
        
        # Use The Brain directly
        result = await unified_service.brain.generate_advice(
            user_data=user_data,
            object_data=request.object_data,
            price_data=request.price_data
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Financial advice error: {e}")
        return {
            "success": False,
            "error": str(e),
            "data": {
                "main_recommendation": None,
                "all_options": [],
                "user_message": "Finansal öneri oluşturulamadı. Lütfen tekrar deneyin."
            }
        }

@api_router.post("/vision/speech-to-text")
async def speech_to_text(
    audio_file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    """Ses dosyasını metne çevirir (Whisper API)"""
    try:
        import tempfile
        import openai
        
        # OpenAI client oluştur
        openai_client = openai.OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        
        # Geçici dosyaya kaydet
        with tempfile.NamedTemporaryFile(delete=False, suffix=".m4a") as temp_file:
            content = await audio_file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        try:
            # Whisper API ile transcribe et
            with open(temp_file_path, "rb") as audio:
                transcript = openai_client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio,
                    language="tr"  # Türkçe
                )
            
            transcribed_text = transcript.text
            
            return {
                "success": True,
                "text": transcribed_text
            }
            
        finally:
            # Geçici dosyayı sil
            import os as os_module
            if os_module.path.exists(temp_file_path):
                os_module.unlink(temp_file_path)
        
    except Exception as e:
        logger.error(f"Speech to text error: {e}")
        raise HTTPException(status_code=500, detail=f"Ses tanıma hatası: {str(e)}")

# ==================== NEW ENHANCED ENDPOINTS ====================
from enhanced_product_scraper import enhanced_scraper
from smart_financial_decision_engine import decision_engine

class ProductPriceRequest(BaseModel):
    product_name: str
    category: Optional[str] = 'electronics'

class FinancialDecisionRequest(BaseModel):
    product_name: str
    product_category: str
    selected_price: float
    selected_site: Optional[str] = None

@api_router.post("/vision/scrape-prices")
async def scrape_product_prices(
    request: ProductPriceRequest,
    user: dict = Depends(get_current_user)
):
    """
    🛒 Gerçek e-ticaret sitelerinden fiyat çekme
    Hepsiburada, N11, Trendyol'dan paralel olarak fiyat toplar
    """
    try:
        logger.info(f"🛒 Scraping prices for: {request.product_name}")
        
        result = await enhanced_scraper.scrape_all_sites(
            product_name=request.product_name,
            category=request.category
        )
        
        return {
            "success": result.get('success', True),
            "data": result
        }
        
    except Exception as e:
        logger.error(f"Price scraping error: {e}")
        import traceback
        traceback.print_exc()
        
        # Fallback tahmini fiyat döndür
        return {
            "success": False,
            "error": str(e),
            "data": enhanced_scraper._estimate_price(request.product_name, request.category)
        }

@api_router.post("/vision/financial-decision")
async def make_financial_decision(
    request: FinancialDecisionRequest,
    user: dict = Depends(get_current_user)
):
    """
    🧠 Akıllı Finansal Karar Motoru
    Kullanıcının mali durumuna göre en iyi finansman yöntemini belirler
    
    Karar Seçenekleri:
    1. Nakit ödeme
    2. Kredi kartı faizsiz taksit
    3. Kredi kartı faizli taksit
    4. Banka kredisi
    5. Birikim planı + kredi kartı
    6. Birikim planı + kredi
    """
    try:
        logger.info(f"🧠 Making decision for: {request.product_name} ({request.selected_price:,.0f} TL)")
        
        # Kullanıcının mali profilini çek
        accounts = await Database.get_user_accounts(user["id"])
        total_balance = sum([acc.get("balance", 0) for acc in accounts])
        
        # Kullanıcının kredi kartlarını çek
        cards = await Database.get_user_cards(user["id"])
        credit_cards = [c for c in cards if c.get('card_type') == 'credit']
        
        # Kredi kartı limitlerini hesapla
        total_credit_limit = 0
        available_credit_limit = 0
        
        for card in credit_cards:
            card_limit = card.get('limit', 0)
            card_debt = card.get('debt', 0)
            total_credit_limit += card_limit
            available_credit_limit += (card_limit - card_debt)
        
        logger.info(f"💳 Credit cards: {len(credit_cards)}, Available limit: {available_credit_limit:,.0f} TL")
        
        # Kullanıcı profili
        user_profile = {
            "balance": total_balance,
            "monthly_income": user.get("monthly_income", 50000),
            "monthly_expense": user.get("monthly_expense", 25000),
            "credit_score": user.get("credit_score", 750),
            "has_active_loan": False,
            "active_loan_payment": 0,
            "savings_goal": 100000,
            # Kredi kartı bilgileri eklendi
            "has_credit_card": len(credit_cards) > 0,
            "total_credit_limit": total_credit_limit,
            "available_credit_limit": available_credit_limit
        }
        
        # Ürün bilgisi
        product_info = {
            "name": request.product_name,
            "category": request.product_category,
            "price": request.selected_price
        }
        
        # 🎯 ÖZEL KURAL: 200K+ TL ürünler için SADECE KREDİ!
        if request.selected_price >= 200000:
            logger.info("🏦 High-value product (200K+) - Loan-only mode")
            product_info["loan_only_mode"] = True
        
        # Karar motoru çalıştır
        decision = await decision_engine.make_decision(
            user_profile=user_profile,
            product_info=product_info,
            price=request.selected_price
        )
        
        return {
            "success": decision.get('success', True),
            "data": decision
        }
        
    except Exception as e:
        logger.error(f"Financial decision error: {e}")
        import traceback
        traceback.print_exc()
        
        return {
            "success": False,
            "error": str(e),
            "message": "Finansal karar oluşturulamadı. Lütfen tekrar deneyin."
        }

@api_router.post("/credit/apply")
async def apply_for_credit(
    request: Dict[str, Any],
    user: dict = Depends(get_current_user)
):
    """
    🏦 Kredi Başvurusu
    Kullanıcının seçtiği kredi planı için başvuru oluşturur
    """
    try:
        loan_type = request.get("loan_type", "consumer_loan")
        amount = request.get("amount", 0)
        term = request.get("term", 24)
        
        logger.info(f"🏦 Credit application: {loan_type}, {amount:,.0f} TL, {term} months")
        
        # Kredi başvurusu oluştur (simülasyon)
        db = Database.get_database()
        
        application = {
            "user_id": user["id"],
            "loan_type": loan_type,
            "requested_amount": amount,
            "term_months": term,
            "status": "pending",  # pending, approved, rejected
            "application_date": datetime.utcnow(),
            "approval_date": None,
            "monthly_payment": request.get("monthly_payment", 0),
            "interest_rate": request.get("interest_rate", 3.9),
            "documents_uploaded": False
        }
        
        result = await db['credit_applications'].insert_one(application)
        application['id'] = str(result.inserted_id)
        
        # Bildirim oluştur
        notification = {
            "user_id": user["id"],
            "title": "Kredi Başvurusu Alındı",
            "message": f"{amount:,.0f} TL tutarındaki kredi başvurunuz değerlendirmeye alındı. 1-2 iş günü içinde sonuç bildirilecektir.",
            "type": "credit_application",
            "read": False,
            "created_at": datetime.utcnow()
        }
        
        await db['notifications'].insert_one(notification)
        
        return {
            "success": True,
            "data": {
                "application_id": application['id'],
                "status": "pending",
                "message": "Kredi başvurunuz alındı. 1-2 iş günü içinde sonuçlandırılacaktır.",
                "next_steps": [
                    "Kimlik belgesi yükleyin",
                    "Gelir belgesi yükleyin",
                    "İmza sirküsü yükleyin"
                ],
                "estimated_approval_time": "1-2 iş günü"
            }
        }
        
    except Exception as e:
        logger.error(f"Credit application error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# VISION PARSE QUERY - Akıllı Sesli Sorgu Analizi
# ============================================================================

# Bilinen markalar ve kategorileri
BRAND_CATEGORIES = {
    # Araçlar
    "bmw": "vehicle", "mercedes": "vehicle", "audi": "vehicle",
    "toyota": "vehicle", "honda": "vehicle", "ford": "vehicle",
    "volkswagen": "vehicle", "renault": "vehicle", "fiat": "vehicle",
    "peugeot": "vehicle", "hyundai": "vehicle", "kia": "vehicle",
    "volvo": "vehicle", "tesla": "vehicle", "porsche": "vehicle",
    "opel": "vehicle", "nissan": "vehicle", "mazda": "vehicle",
    # Elektronik
    "iphone": "electronics", "samsung": "electronics", "apple": "electronics",
    "xiaomi": "electronics", "huawei": "electronics", "oppo": "electronics",
    "sony": "electronics", "lg": "electronics", "dell": "electronics",
    "hp": "electronics", "lenovo": "electronics", "asus": "electronics",
    "macbook": "electronics", "ipad": "electronics", "playstation": "electronics",
    "xbox": "electronics", "nintendo": "electronics", "logitech": "electronics",
    # Ev eşyası
    "bosch": "home", "siemens": "home", "arçelik": "home",
    "beko": "home", "vestel": "home", "dyson": "home",
    # Giyim
    "nike": "clothing", "adidas": "clothing", "puma": "clothing",
    "zara": "clothing", "mango": "clothing", "lcw": "clothing",
}

# Görsel tarama tetikleyici kelimeler
VISUAL_TRIGGER_WORDS = [
    "bunu", "şunu", "bu", "şu", "buna", "şuna", "bunun", "şunun",
    "görüyorum", "bakıyorum", "karşımda", "önümde", "elimde",
    "buradaki", "şuradaki", "ekrandaki", "gösteriyorum"
]

def extract_product_from_query(query: str) -> dict:
    """Sorgudan ürün adı ve kategori çıkar"""
    import re
    
    query_lower = query.lower().strip()
    
    # Görsel tetikleyici var mı?
    for trigger in VISUAL_TRIGGER_WORDS:
        if trigger in query_lower:
            return {"needs_visual": True, "reason": "visual_reference_detected"}
    
    # Bilinen marka ara
    for brand, category in BRAND_CATEGORIES.items():
        if brand in query_lower:
            # Marka bulundu, tam ürün adını çıkar
            words = query.split()
            product_words = []
            found_brand = False
            
            for word in words:
                word_lower = word.lower()
                if brand in word_lower:
                    found_brand = True
                
                if found_brand:
                    # Durdurucu kelimeler
                    if word_lower in ["nasıl", "almak", "satın", "fiyat", "kaç", "istiyorum", 
                                     "ister", "alabilir", "misin", "için", "ne", "kadar"]:
                        break
                    product_words.append(word)
                    if len(product_words) >= 4:
                        break
            
            if product_words:
                product_name = " ".join(product_words)
                # İlk harfleri büyük yap
                product_name = " ".join(w.capitalize() if not w[0].isdigit() else w.upper() 
                                       for w in product_name.split())
                return {
                    "needs_visual": False,
                    "product_name": product_name,
                    "category": category,
                    "confidence": 0.9
                }
    
    # Regex ile ürün adı çıkarmayı dene
    patterns = [
        r'([a-zA-ZğüşöçıİĞÜŞÖÇ]+\s*[a-zA-Z0-9ğüşöçıİĞÜŞÖÇ\-\.]+(?:\s+[a-zA-Z0-9\-\.]+)?)\s*(?:nasıl|almak|satın|fiyat|kaç|ne kadar)',
        r'(?:nasıl|almak|satın|fiyat).*?([a-zA-ZğüşöçıİĞÜŞÖÇ]+\s*[a-zA-Z0-9ğüşöçıİĞÜŞÖÇ\-\.]+(?:\s+[a-zA-Z0-9\-\.]+)?)'
    ]
    
    for pattern in patterns:
        match = re.search(pattern, query, re.IGNORECASE)
        if match:
            potential_product = match.group(1).strip()
            
            # Çok kısa veya genel kelime mi?
            generic_words = ["bir", "bu", "şu", "o", "ve", "ile", "için", "nasıl", "ne", "kaç"]
            if len(potential_product) > 2 and potential_product.lower() not in generic_words:
                # Kategori tahmin et
                category = "other"
                lower_product = potential_product.lower()
                
                if any(w in lower_product for w in ["araba", "araç", "otomobil", "suv", "sedan"]):
                    category = "vehicle"
                elif any(w in lower_product for w in ["telefon", "laptop", "bilgisayar", "tablet", "tv"]):
                    category = "electronics"
                elif any(w in lower_product for w in ["buzdolabı", "çamaşır", "bulaşık", "fırın", "klima"]):
                    category = "home"
                
                return {
                    "needs_visual": False,
                    "product_name": potential_product.title(),
                    "category": category,
                    "confidence": 0.7
                }
    
    # Hiçbir şey bulunamadı
    return {"needs_visual": True, "reason": "no_product_detected"}

@api_router.post("/vision/parse-query")
async def parse_voice_query(
    request: Dict[str, Any],
    user: dict = Depends(get_current_user)
):
    """
    🎤 Sesli Sorgu Analizi - Akıllı Ürün Tespiti
    
    Kullanıcının sesli sorgusunu analiz eder:
    - Ürün adı belirtilmişse: needs_visual = false, ürün bilgisi döner
    - "bunu", "şunu" gibi kelimeler varsa: needs_visual = true, görsel tarama gerekli
    - Ürün tespit edilemezse: needs_visual = true
    
    Örnek:
    - "BMW X3 nasıl alabilirim?" -> needs_visual: false, product: "BMW X3"
    - "Bunu nasıl alabilirim?" -> needs_visual: true
    """
    try:
        query = request.get("query", "").strip()
        
        if not query:
            return {
                "success": False,
                "needs_visual": True,
                "reason": "empty_query",
                "message": "Sorgu boş olamaz"
            }
        
        logger.info(f"🎤 Parsing voice query: {query}")
        
        # Ürün bilgisi çıkar
        result = extract_product_from_query(query)
        
        if result.get("needs_visual"):
            logger.info(f"👁️ Visual scan required: {result.get('reason')}")
            return {
                "success": True,
                "needs_visual": True,
                "reason": result.get("reason", "no_product_detected"),
                "message": "Görsel tarama gerekli. Lütfen ürünü kameraya gösterin."
            }
        else:
            product_name = result.get("product_name")
            category = result.get("category")
            confidence = result.get("confidence", 0.8)
            
            logger.info(f"✅ Product detected: {product_name} ({category}) - confidence: {confidence}")
            
            return {
                "success": True,
                "needs_visual": False,
                "product_name": product_name,
                "category": category,
                "confidence": confidence,
                "message": f"{product_name} için arama yapılıyor..."
            }
        
    except Exception as e:
        logger.error(f"Parse query error: {e}")
        return {
            "success": False,
            "needs_visual": True,
            "reason": "error",
            "message": str(e)
        }

@api_router.post("/vision/voice-command")
async def process_voice_command(
    request: Dict[str, Any],
    user: dict = Depends(get_current_user)
):
    """Sesli komut işle"""
    try:
        command = request.get("command", "")
        context = request.get("context")
        
        if not command:
            raise HTTPException(status_code=400, detail="Komut boş olamaz")
        
        # AI ile cevap oluştur
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        system_message = """Sen Garanti BBVA'nın finansal asistanısın. Kullanıcıların sorularını Türkçe yanıtla.
        Eğer context varsa, o ürün hakkında finansal öneriler ver.
        Kısa ve öz cevaplar ver. Maksimum 2-3 cümle."""
        
        if context:
            system_message += f"\n\nBağlam: Kullanıcı {context.get('object_name')} ile ilgileniyor. "
            system_message += f"Kategori: {context.get('category')}, Fiyat: {context.get('price')}"
        
        chat = LlmChat(
            api_key=os.getenv('OPENAI_API_KEY'),
            session_id=f"voice-{user['id']}-{asyncio.get_event_loop().time()}",
            system_message=system_message
        ).with_model("openai", "gpt-4o-mini")
        
        response = await chat.send_message(UserMessage(text=command))
        
        return {
            "success": True,
            "answer": response.strip(),
            "command": command
        }
        
    except Exception as e:
        logger.error(f"Voice command error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/loan/apply")
async def apply_for_loan(
    request: Dict[str, Any],
    user: dict = Depends(get_current_user)
):
    """Kredi başvurusu yap"""
    try:
        # Başvuru numarası oluştur
        import random
        import string
        application_number = 'KRD' + ''.join(random.choices(string.digits, k=10))
        
        # Başvuru verisini hazırla
        application_data = {
            "user_id": user["id"],
            "application_number": application_number,
            "personal_info": request.get("personal_info"),
            "employment_info": request.get("employment_info"),
            "loan_info": request.get("loan_info"),
            "address_info": request.get("address_info"),
            "product_info": request.get("product_info"),
            "monthly_payment": request.get("monthly_payment"),
            "status": "pending",  # pending, approved, rejected
            "applied_at": request.get("applied_at"),
            "created_at": datetime.utcnow().isoformat()
        }
        
        # MongoDB'ye kaydet
        db = Database.get_database()
        result = db["loan_applications"].insert_one(application_data)
        
        logger.info(f"Loan application created: {application_number} for user {user['id']}")
        
        return {
            "success": True,
            "application_number": application_number,
            "message": "Başvurunuz başarıyla alındı",
            "id": str(result.inserted_id)
        }
        
    except Exception as e:
        logger.error(f"Loan application error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/loan/applications")
async def get_loan_applications(user: dict = Depends(get_current_user)):
    """Kullanıcının kredi başvurularını getir"""
    try:
        db = Database.get_database()
        applications = list(db["loan_applications"].find(
            {"user_id": user["id"]},
            {"_id": 0}
        ).sort("created_at", -1))
        
        return applications
        
    except Exception as e:
        logger.error(f"Get loan applications error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# INVESTMENT ROUTES - Yatırım API'leri
# ============================================================================

@api_router.get("/investments/assets")
async def get_all_investment_assets(user: dict = Depends(get_current_user)):
    """Tüm yatırım varlıklarını getir (Altın, Döviz, Hisse, Kripto)"""
    try:
        result = await investment_service.get_all_assets()
        return result
    except Exception as e:
        logger.error(f"Get investment assets error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/investments/asset/{asset_id}")
async def get_investment_asset_detail(asset_id: str, user: dict = Depends(get_current_user)):
    """Yatırım varlığı detayı + fiyat grafiği"""
    try:
        result = await investment_service.get_asset_detail(asset_id)
        if not result['success']:
            raise HTTPException(status_code=404, detail=result.get('error', 'Asset not found'))
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get asset detail error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/investments/ai-recommendation/{asset_id}")
async def get_ai_investment_recommendation(asset_id: str, user: dict = Depends(get_current_user)):
    """AI ile yatırım önerisi (AL/SAT/BEKLE)"""
    try:
        result = await investment_service.get_ai_recommendation(asset_id)
        if not result['success']:
            raise HTTPException(status_code=500, detail=result.get('error', 'Recommendation failed'))
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI recommendation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/investments/buy")
async def buy_investment(
    transaction: InvestmentTransactionCreate,
    user: dict = Depends(get_current_user)
):
    """Yatırım alımı (simülasyon)"""
    try:
        # Kullanıcı hesabını kontrol et
        accounts = await Database.get_user_accounts(user['id'])
        if not accounts:
            raise HTTPException(status_code=400, detail="Hesap bulunamadı")
        
        # İlk hesabı kullan (ana hesap)
        account = accounts[0]
        total_cost = transaction.total_amount
        
        if account['balance'] < total_cost:
            raise HTTPException(status_code=400, detail="Yetersiz bakiye")
        
        # Asset detayını al
        asset_detail = await investment_service.get_asset_detail(transaction.investment_id)
        if not asset_detail['success']:
            raise HTTPException(status_code=404, detail="Yatırım varlığı bulunamadı")
        
        asset = asset_detail['asset']
        
        # Bakiyeyi düş
        new_balance = account['balance'] - total_cost
        await Database.update_account_balance(account['id'], new_balance)
        
        # Yatırım işlemini kaydet
        db = Database.get_database()
        investment_transaction = {
            'user_id': user['id'],
            'investment_id': transaction.investment_id,
            'investment_name': asset['name'],
            'investment_symbol': asset['symbol'],
            'transaction_type': 'buy',
            'quantity': transaction.quantity,
            'price': transaction.price,
            'total_amount': total_cost,
            'created_at': datetime.utcnow()
        }
        
        result = await db['investment_transactions'].insert_one(investment_transaction)
        investment_transaction['id'] = str(result.inserted_id)
        
        # Portföye ekle veya güncelle
        portfolio_item = await db['user_investments'].find_one({
            'user_id': user['id'],
            'investment_id': transaction.investment_id
        })
        
        if portfolio_item:
            # Mevcut pozisyonu güncelle (ortalama maliyet)
            new_quantity = portfolio_item['quantity'] + transaction.quantity
            new_avg_price = (
                (portfolio_item['quantity'] * portfolio_item['purchase_price']) +
                (transaction.quantity * transaction.price)
            ) / new_quantity
            
            await db['user_investments'].update_one(
                {'_id': portfolio_item['_id']},
                {
                    '$set': {
                        'quantity': new_quantity,
                        'purchase_price': new_avg_price,
                        'total_value': new_quantity * asset['current_price'],
                        'profit_loss': (asset['current_price'] - new_avg_price) * new_quantity,
                        'updated_at': datetime.utcnow()
                    }
                }
            )
        else:
            # Yeni pozisyon oluştur
            await db['user_investments'].insert_one({
                'user_id': user['id'],
                'investment_id': transaction.investment_id,
                'investment_name': asset['name'],
                'investment_symbol': asset['symbol'],
                'investment_category': asset['category'],
                'quantity': transaction.quantity,
                'purchase_price': transaction.price,
                'total_value': transaction.quantity * asset['current_price'],
                'profit_loss': (asset['current_price'] - transaction.price) * transaction.quantity,
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow()
            })
        
        # Bildirim oluştur
        await Database.create_notification({
            'user_id': user['id'],
            'title': '✅ Yatırım Alımı Başarılı',
            'message': f'{asset["name"]} ({asset["symbol"]}) - {transaction.quantity} adet {total_cost:,.2f} TL karşılığında alındı.',
            'notification_type': 'success',
            'read': False
        })
        
        return {
            'success': True,
            'transaction': convert_objectid_to_str(investment_transaction),
            'new_balance': new_balance,
            'message': 'Yatırım alımı başarılı'
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Buy investment error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/investments/sell")
async def sell_investment(
    transaction: InvestmentTransactionCreate,
    user: dict = Depends(get_current_user)
):
    """Yatırım satımı (simülasyon)"""
    try:
        db = Database.get_database()
        
        # Portföyde var mı kontrol et
        portfolio_item = await db['user_investments'].find_one({
            'user_id': user['id'],
            'investment_id': transaction.investment_id
        })
        
        if not portfolio_item:
            raise HTTPException(status_code=400, detail="Bu yatırım portföyünüzde bulunamadı")
        
        if portfolio_item['quantity'] < transaction.quantity:
            raise HTTPException(status_code=400, detail="Yetersiz miktar")
        
        # Asset detayını al
        asset_detail = await investment_service.get_asset_detail(transaction.investment_id)
        if not asset_detail['success']:
            raise HTTPException(status_code=404, detail="Yatırım varlığı bulunamadı")
        
        asset = asset_detail['asset']
        
        # Satış tutarı
        total_revenue = transaction.total_amount
        
        # Kullanıcı hesabına ekle
        accounts = await Database.get_user_accounts(user['id'])
        if not accounts:
            raise HTTPException(status_code=400, detail="Hesap bulunamadı")
        
        account = accounts[0]
        new_balance = account['balance'] + total_revenue
        await Database.update_account_balance(account['id'], new_balance)
        
        # Yatırım işlemini kaydet
        investment_transaction = {
            'user_id': user['id'],
            'investment_id': transaction.investment_id,
            'investment_name': asset['name'],
            'investment_symbol': asset['symbol'],
            'transaction_type': 'sell',
            'quantity': transaction.quantity,
            'price': transaction.price,
            'total_amount': total_revenue,
            'created_at': datetime.utcnow()
        }
        
        result = await db['investment_transactions'].insert_one(investment_transaction)
        investment_transaction['id'] = str(result.inserted_id)
        
        # Portföyden düş
        new_quantity = portfolio_item['quantity'] - transaction.quantity
        
        if new_quantity <= 0:
            # Tamamen sat - portföyden kaldır
            await db['user_investments'].delete_one({'_id': portfolio_item['_id']})
        else:
            # Kısmi satış - miktarı güncelle
            await db['user_investments'].update_one(
                {'_id': portfolio_item['_id']},
                {
                    '$set': {
                        'quantity': new_quantity,
                        'total_value': new_quantity * asset['current_price'],
                        'profit_loss': (asset['current_price'] - portfolio_item['purchase_price']) * new_quantity,
                        'updated_at': datetime.utcnow()
                    }
                }
            )
        
        # Kâr/Zarar hesapla
        profit_loss = (transaction.price - portfolio_item['purchase_price']) * transaction.quantity
        profit_loss_percent = ((transaction.price - portfolio_item['purchase_price']) / portfolio_item['purchase_price']) * 100
        
        # Bildirim oluştur
        profit_emoji = '📈' if profit_loss >= 0 else '📉'
        await Database.create_notification({
            'user_id': user['id'],
            'title': f'{profit_emoji} Yatırım Satımı Başarılı',
            'message': f'{asset["name"]} ({asset["symbol"]}) - {transaction.quantity} adet {total_revenue:,.2f} TL karşılığında satıldı. Kâr/Zarar: {profit_loss:,.2f} TL (%{profit_loss_percent:.2f})',
            'notification_type': 'success',
            'read': False
        })
        
        return {
            'success': True,
            'transaction': convert_objectid_to_str(investment_transaction),
            'new_balance': new_balance,
            'profit_loss': round(profit_loss, 2),
            'profit_loss_percent': round(profit_loss_percent, 2),
            'message': 'Yatırım satımı başarılı'
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Sell investment error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/investments/portfolio")
async def get_investment_portfolio(user: dict = Depends(get_current_user)):
    """Kullanıcının yatırım portföyü"""
    try:
        db = Database.get_database()
        
        # Portföyü getir
        portfolio_items = list(await db['user_investments'].find(
            {'user_id': user['id']}
        ).to_list(length=None))
        
        # Her bir yatırım için güncel fiyatları al ve kar/zarar hesapla
        total_value = 0
        total_investment = 0
        
        for item in portfolio_items:
            # Güncel fiyatı al
            asset_detail = await investment_service.get_asset_detail(item['investment_id'])
            if asset_detail['success']:
                current_price = asset_detail['asset']['current_price']
                
                # Güncel değeri hesapla
                item['current_price'] = current_price
                item['total_value'] = item['quantity'] * current_price
                item['cost_basis'] = item['quantity'] * item['purchase_price']
                item['profit_loss'] = item['total_value'] - item['cost_basis']
                item['profit_loss_percent'] = (item['profit_loss'] / item['cost_basis']) * 100 if item['cost_basis'] > 0 else 0
                
                total_value += item['total_value']
                total_investment += item['cost_basis']
        
        total_profit_loss = total_value - total_investment
        total_profit_loss_percent = (total_profit_loss / total_investment) * 100 if total_investment > 0 else 0
        
        return {
            'success': True,
            'portfolio': convert_objectid_to_str(portfolio_items),
            'summary': {
                'total_value': round(total_value, 2),
                'total_investment': round(total_investment, 2),
                'total_profit_loss': round(total_profit_loss, 2),
                'total_profit_loss_percent': round(total_profit_loss_percent, 2)
            }
        }
        
    except Exception as e:
        logger.error(f"Get portfolio error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/investments/transactions")
async def get_investment_transactions(user: dict = Depends(get_current_user)):
    """Kullanıcının yatırım işlem geçmişi"""
    try:
        db = Database.get_database()
        
        transactions = list(await db['investment_transactions'].find(
            {'user_id': user['id']}
        ).sort('created_at', -1).to_list(length=100))
        
        return {
            'success': True,
            'transactions': convert_objectid_to_str(transactions)
        }
        
    except Exception as e:
        logger.error(f"Get investment transactions error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# WEB SCRAPING ROUTES - Fiyat Doğruluğu
# ============================================================================

@api_router.post("/vision/scrape-prices")
async def scrape_product_prices(
    scrape_request: ScrapePriceRequest,
    user: dict = Depends(get_current_user)
):
    """Ürün fiyatlarını web scraping ile gerçek e-ticaret sitelerinden çek"""
    try:
        product_name = scrape_request.product_name
        category = scrape_request.category
        custom_urls = scrape_request.urls or []
        
        results = []
        
        # Kullanıcı URL'leri varsa onları scrape et
        for url in custom_urls:
            try:
                scrape_result = product_scraper.scrape_real_product_url(url, product_name)
                if scrape_result and scrape_result.get('success'):
                    results.append({
                        'source': 'custom',
                        'site_name': url.split('/')[2],  # Domain name
                        'product_name': scrape_result['product_name'],
                        'price': scrape_result['price'],
                        'currency': scrape_result['currency'],
                        'url': url,
                        'scraped_at': scrape_result['scraped_at']
                    })
            except Exception as e:
                logger.warning(f"Scraping failed for {url}: {e}")
                continue
        
        # Eğer sonuç yoksa veya çok az sonuç varsa, mock data ekle
        if len(results) < 2:
            # Mock e-ticaret sitelerinden fiyatlar
            base_price = product_scraper.get_product_price(product_name, category)['current_price']
            
            mock_sites = [
                {'name': 'Hepsiburada', 'price_factor': 1.05},
                {'name': 'Trendyol', 'price_factor': 0.98},
                {'name': 'N11', 'price_factor': 1.02},
                {'name': 'Amazon TR', 'price_factor': 1.08}
            ]
            
            for site in mock_sites:
                results.append({
                    'source': 'estimated',
                    'site_name': site['name'],
                    'product_name': product_name,
                    'price': round(base_price * site['price_factor'], 2),
                    'currency': 'TRY',
                    'url': None,
                    'scraped_at': datetime.now().isoformat()
                })
        
        # Fiyat analizi
        if results:
            prices = [r['price'] for r in results]
            avg_price = sum(prices) / len(prices)
            min_price = min(prices)
            max_price = max(prices)
            cheapest_site = min(results, key=lambda x: x['price'])
            
            analysis = {
                'average_price': round(avg_price, 2),
                'min_price': round(min_price, 2),
                'max_price': round(max_price, 2),
                'price_range': round(max_price - min_price, 2),
                'cheapest_site': cheapest_site['site_name'],
                'savings_potential': round(max_price - min_price, 2)
            }
        else:
            analysis = None
        
        return {
            'success': True,
            'product_name': product_name,
            'category': category,
            'results': results,
            'analysis': analysis,
            'result_count': len(results)
        }
        
    except Exception as e:
        logger.error(f"Scrape prices error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    """Uygulama başlatıldığında çalışır"""
    logger.info("🚀 Application starting...")
    
    # Environment variable kontrolü
    collectapi_key = os.environ.get('COLLECTAPI_KEY', '')
    logger.info(f"🔑 Environment Check:")
    logger.info(f"   - COLLECTAPI_KEY: {'✓ Present (' + str(len(collectapi_key)) + ' chars)' if collectapi_key else '✗ MISSING!'}")
    
    # Eğer environment'ta yoksa .env'den yükle
    if not collectapi_key:
        logger.warning("⚠️ COLLECTAPI_KEY not in environment, reloading .env...")
        from dotenv import load_dotenv
        load_dotenv(ROOT_DIR / '.env', override=True)
        collectapi_key = os.environ.get('COLLECTAPI_KEY', '')
        logger.info(f"   - After reload: {'✓ Present' if collectapi_key else '✗ STILL MISSING!'}")
    
    logger.info("✅ Market Data API initialized")
    
    # Market data cache'i periyodik temizle (her 10 dakikada)
    import asyncio
    async def periodic_cache_clear():
        while True:
            await asyncio.sleep(600)  # 10 dakika
            try:
                market_data_api.clear_all_caches()
                logger.info("🔄 Market data cache cleared (scheduled)")
            except Exception as e:
                logger.error(f"Cache clear error: {e}")
    
    # Background task olarak başlat
    asyncio.create_task(periodic_cache_clear())

# ==================== SAVINGS + INVESTMENT ENDPOINTS ====================
from savings_investment_service import savings_investment_service, InvestmentStrategy, RiskProfile

class SavingsInvestmentCreateRequest(BaseModel):
    product_name: str
    target_amount: float
    monthly_contribution: float
    duration_months: int
    risk_profile: Optional[str] = "medium"  # low, medium, high
    strategy: Optional[str] = None  # tl_only, gold_heavy, usd_heavy, eur_heavy, balanced, custom, ai_recommended
    custom_allocation: Optional[Dict[str, int]] = None  # {"tl_savings": 25, "gold": 25, "usd": 25, "eur": 25}
    existing_savings: Optional[float] = 0
    auto_invest: Optional[bool] = True
    use_ai_allocation: Optional[bool] = True  # AI önerisi kullanılsın mı?

class SavingsContributionRequest(BaseModel):
    amount: float
    note: Optional[str] = ""

@api_router.get("/savings-investment/strategies")
async def get_investment_strategies(user: dict = Depends(get_current_user)):
    """Tüm yatırım stratejilerini ve risk profillerini listele"""
    try:
        return {
            "success": True,
            "risk_profiles": [
                {
                    "key": "low",
                    "name": "Düşük Risk",
                    "description": "Altın & TL ağırlıklı, enflasyona karşı korumalı",
                    "emoji": "🛡️",
                    "color": "#10B981",
                    "allocation": savings_investment_service.get_allocation_by_risk("low")
                },
                {
                    "key": "medium",
                    "name": "Dengeli",
                    "description": "Karma portföy, risk-getiri dengesi",
                    "emoji": "⚖️",
                    "color": "#F59E0B",
                    "allocation": savings_investment_service.get_allocation_by_risk("medium")
                },
                {
                    "key": "high",
                    "name": "Yüksek Risk",
                    "description": "Döviz ağırlıklı, yüksek getiri potansiyeli",
                    "emoji": "🚀",
                    "color": "#EF4444",
                    "allocation": savings_investment_service.get_allocation_by_risk("high")
                }
            ],
            "strategies": [
                {
                    "key": "ai_recommended",
                    "name": "🤖 AI Önerisi",
                    "description": "Yapay zeka piyasa koşullarına göre en uygun dağılımı belirler",
                    "emoji": "🤖",
                    "is_ai": True,
                    "recommended": True,
                    "allocation": None  # Dinamik olarak hesaplanır
                },
                {
                    "key": "tl_only",
                    "name": "Sadece TL Birikim",
                    "description": "Klasik birikim, döviz riski yok",
                    "emoji": "💰",
                    "allocation": savings_investment_service.get_allocation_by_strategy("tl_only")
                },
                {
                    "key": "gold_heavy",
                    "name": "Altın Ağırlıklı",
                    "description": "Güvenli liman, enflasyon koruması",
                    "emoji": "🥇",
                    "allocation": savings_investment_service.get_allocation_by_strategy("gold_heavy")
                },
                {
                    "key": "usd_heavy",
                    "name": "Dolar Ağırlıklı",
                    "description": "Dolar bazlı koruma",
                    "emoji": "💵",
                    "allocation": savings_investment_service.get_allocation_by_strategy("usd_heavy")
                },
                {
                    "key": "eur_heavy",
                    "name": "Euro Ağırlıklı",
                    "description": "Avrupa para birimi koruması",
                    "emoji": "💶",
                    "allocation": savings_investment_service.get_allocation_by_strategy("eur_heavy")
                },
                {
                    "key": "balanced",
                    "name": "Dengeli Portföy",
                    "description": "Tüm varlıklara eşit dağılım",
                    "emoji": "📊",
                    "allocation": savings_investment_service.get_allocation_by_strategy("balanced")
                }
            ],
            "assets": [
                {"key": "tl_savings", "name": "TL Birikim", "emoji": "💰", "color": "#6366F1"},
                {"key": "gold", "name": "Altın", "emoji": "🥇", "color": "#F59E0B"},
                {"key": "usd", "name": "Dolar", "emoji": "💵", "color": "#10B981"},
                {"key": "eur", "name": "Euro", "emoji": "💶", "color": "#3B82F6"}
            ],
            "ai_available": True,
            "ai_description": "AI önerisi seçildiğinde, yapay zeka güncel piyasa verilerini (enflasyon, faiz, döviz kurları) analiz ederek size özel optimal yatırım dağılımı önerir."
        }
    except Exception as e:
        logger.error(f"Get strategies error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/savings-investment/create")
async def create_savings_investment_plan(
    request: SavingsInvestmentCreateRequest,
    user: dict = Depends(get_current_user)
):
    """Yeni birikim + yatırım planı oluştur"""
    try:
        # AI önerisi kullanılacak mı?
        ai_allocation = None
        ai_recommendation_data = None
        
        if request.use_ai_allocation and not request.custom_allocation and request.strategy != "custom":
            # AI'dan dinamik dağılım önerisi al
            from ai_investment_advisor import ai_investment_advisor
            
            ai_recommendation = await ai_investment_advisor.get_ai_allocation_recommendation(
                target_amount=request.target_amount,
                duration_months=request.duration_months,
                risk_profile=request.risk_profile,
                product_name=request.product_name,
                existing_savings=request.existing_savings,
                monthly_contribution=request.monthly_contribution
            )
            
            if ai_recommendation.get("success"):
                ai_allocation = ai_recommendation.get("allocation")
                ai_recommendation_data = {
                    "reasoning": ai_recommendation.get("reasoning"),
                    "insights": ai_recommendation.get("insights", []),
                    "source": ai_recommendation.get("source"),
                    "confidence_score": ai_recommendation.get("confidence_score")
                }
        
        result = savings_investment_service.create_savings_investment_plan(
            user_id=user['id'],
            target_amount=request.target_amount,
            product_name=request.product_name,
            monthly_contribution=request.monthly_contribution,
            duration_months=request.duration_months,
            risk_profile=request.risk_profile,
            strategy=request.strategy if not ai_allocation else "ai_recommended",
            custom_allocation=ai_allocation or request.custom_allocation,
            existing_savings=request.existing_savings,
            auto_invest=request.auto_invest
        )
        
        if result['success']:
            # Veritabanına kaydet
            db = Database.get_database()
            plan = result['plan']
            
            # AI önerisi bilgilerini ekle
            if ai_recommendation_data:
                plan['ai_recommendation'] = ai_recommendation_data
            
            insert_result = await db['savings_investment_plans'].insert_one(plan)
            
            # ObjectId'yi string'e çevir
            plan['id'] = str(insert_result.inserted_id)
            if '_id' in plan:
                del plan['_id']
            
            # Result'ı güncelle
            result['plan'] = plan
            
            # AI önerisini result'a da ekle
            if ai_recommendation_data:
                result['ai_recommendation'] = ai_recommendation_data
            
            # Bildirim oluştur - AI önerisi vurgula
            allocation = plan.get('allocation', {})
            allocation_text = ", ".join([f"%{v} {k.replace('_', ' ').title()}" for k, v in allocation.items() if v > 0])
            
            await Database.create_notification({
                'user_id': user['id'],
                'title': '🤖 AI Destekli Birikim Planı Oluşturuldu',
                'message': f'{request.product_name} için {request.duration_months} aylık plan: {allocation_text}',
                'notification_type': 'success',
                'read': False
            })
        
        # Convert ObjectIds to strings before returning
        result = convert_objectid_to_str(result)
        return result
        
    except Exception as e:
        logger.error(f"Create savings investment plan error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/savings-investment/plans")
async def get_savings_investment_plans(
    status: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Kullanıcının tüm birikim + yatırım planlarını listele"""
    try:
        db = Database.get_database()
        query = {"user_id": user['id']}
        
        if status:
            query["status"] = status
        
        plans = await db['savings_investment_plans'].find(query).sort("created_at", -1).to_list(100)
        
        # Her plan için yatırım özeti ve ilerleme hesapla
        enriched_plans = []
        for plan in plans:
            plan['id'] = str(plan.pop('_id'))
            
            # Yatırım özeti hesapla
            investment_summary = savings_investment_service.get_investment_summary(plan)
            plan['investment_summary'] = investment_summary
            plan['total_current_value'] = investment_summary['total_current_value']
            
            # İlerleme hesapla
            target_amount = plan.get('target_amount', 0)
            total_value = investment_summary['total_current_value']
            progress_percentage = min(100, (total_value / target_amount * 100)) if target_amount > 0 else 0
            plan['progress_percentage'] = round(progress_percentage, 2)
            
            enriched_plans.append(plan)
        
        return {
            "success": True,
            "plans": enriched_plans,
            "total": len(enriched_plans)
        }
        
    except Exception as e:
        logger.error(f"Get savings investment plans error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/savings-investment/{plan_id}")
async def delete_savings_investment_plan(
    plan_id: str,
    user: dict = Depends(get_current_user)
):
    """Birikim + yatırım planını sil"""
    try:
        db = Database.get_database()
        
        from bson import ObjectId
        
        # Plan'ı bul
        try:
            object_id = ObjectId(plan_id)
            plan = await db['savings_investment_plans'].find_one({
                "_id": object_id,
                "user_id": user['id']
            })
        except:
            plan = await db['savings_investment_plans'].find_one({
                "id": plan_id,
                "user_id": user['id']
            })
        
        if not plan:
            raise HTTPException(status_code=404, detail="Plan bulunamadı")
        
        # Plan'ı sil
        try:
            result = await db['savings_investment_plans'].delete_one({"_id": ObjectId(plan_id)})
        except:
            result = await db['savings_investment_plans'].delete_one({"id": plan_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=500, detail="Plan silinemedi")
        
        # Bildirim oluştur
        await Database.create_notification({
            'user_id': user['id'],
            'title': '🗑️ Birikim Planı Silindi',
            'message': f'{plan.get("product_name", "Birikim planı")} başarıyla silindi.',
            'notification_type': 'info',
            'read': False
        })
        
        return {
            "success": True,
            "message": f"{plan.get('product_name', 'Plan')} başarıyla silindi.",
            "deleted_plan_id": plan_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete savings investment plan error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/savings-investment/market-prices")
async def get_market_prices_endpoint(user: dict = Depends(get_current_user)):
    """Güncel piyasa fiyatlarını getir"""
    try:
        prices = savings_investment_service.get_market_prices()
        return {
            "success": True,
            **prices
        }
    except Exception as e:
        logger.error(f"Get market prices error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/savings-investment/{plan_id}")
async def get_savings_investment_plan(
    plan_id: str,
    user: dict = Depends(get_current_user)
):
    """Belirli bir birikim + yatırım planını getir"""
    try:
        db = Database.get_database()
        
        from bson import ObjectId
        
        # Try to convert plan_id to ObjectId for MongoDB query
        try:
            object_id = ObjectId(plan_id)
            plan = await db['savings_investment_plans'].find_one({
                "_id": object_id,
                "user_id": user['id']
            })
        except:
            # If ObjectId conversion fails, try with string id
            plan = await db['savings_investment_plans'].find_one({
                "id": plan_id,
                "user_id": user['id']
            })
        
        if not plan:
            raise HTTPException(status_code=404, detail="Plan bulunamadı")
        
        plan['_id'] = str(plan['_id'])
        plan['id'] = plan['_id']
        
        # Yatırım özeti hesapla
        investment_summary = savings_investment_service.get_investment_summary(plan)
        
        # Doğru toplam değer: investment_summary'deki total_current_value
        total_value = investment_summary['total_current_value']
        target_amount = plan['target_amount']
        
        # İlerleme yüzdesi hesapla (Dashboard ile aynı formül)
        progress_percentage = min(100, (total_value / target_amount * 100)) if target_amount > 0 else 0
        
        # İlerleme durumu
        try:
            start_date = datetime.fromisoformat(plan['start_date'].replace('Z', '+00:00').replace('+00:00', ''))
        except:
            start_date = datetime.utcnow()
        
        elapsed_months = max(0, (datetime.utcnow() - start_date).days // 30)
        remaining_months = max(0, plan['duration_months'] - elapsed_months)
        remaining_amount = max(0, target_amount - total_value)
        required_monthly = remaining_amount / remaining_months if remaining_months > 0 else remaining_amount
        
        # Enflasyon hesabı
        monthly_inflation = 0.038  # Aylık %3.8
        future_target = target_amount * ((1 + monthly_inflation) ** remaining_months)
        
        progress = {
            "progress_percentage": round(progress_percentage, 2),
            "total_value": round(total_value, 2),
            "remaining_amount": round(remaining_amount, 2),
            "remaining_months": remaining_months,
            "required_monthly_savings": round(required_monthly, 2),
            "on_track": progress_percentage >= (elapsed_months / plan['duration_months'] * 100) if plan['duration_months'] > 0 else True,
            "future_target_with_inflation": round(future_target, 2),
            "inflation_adjusted_shortage": round(max(0, future_target - total_value), 2)
        }
        
        # Plan'a da progress bilgisini ekle
        plan['progress_percentage'] = progress['progress_percentage']
        plan['total_current_value'] = total_value
        
        # Kredi önerisi güncelle
        credit_recommendation = savings_investment_service.get_credit_recommendation(
            target_amount=plan['target_amount'],
            current_value=total_value,
            remaining_months=progress['remaining_months'],
            monthly_income=plan['monthly_contribution'] * 5,
            credit_score=650
        )
        
        # Milestone kontrolü yap
        milestone_check = None
        try:
            from smart_credit_advisor import smart_credit_advisor
            
            previous_progress = plan.get('last_progress_percent', 0)
            
            plan_data = {
                "id": plan['id'],
                "product_name": plan.get('product_name', 'Hedef'),
                "target_amount": target_amount,
                "current_amount": total_value,
                "monthly_contribution": plan.get('monthly_contribution', 0),
                "remaining_months": remaining_months,
                "duration_months": plan.get('duration_months', 12)
            }
            
            notification = await smart_credit_advisor.check_and_generate_milestone_notification(
                plan_data=plan_data,
                previous_progress=previous_progress,
                current_progress=progress_percentage
            )
            
            # İlerlemeyi kaydet
            from bson import ObjectId
            await db['savings_investment_plans'].update_one(
                {"_id": ObjectId(plan['id'])},
                {"$set": {"last_progress_percent": progress_percentage}}
            )
            
            if notification:
                milestone_check = {
                    "milestone_changed": True,
                    "notification": notification,
                    "previous_progress": previous_progress,
                    "current_progress": progress_percentage
                }
                
                # In-app bildirim oluştur
                await Database.create_notification({
                    'user_id': user['id'],
                    'title': notification.get('title', '🎯 Milestone!'),
                    'message': notification.get('body', ''),
                    'notification_type': 'credit_advice',
                    'read': False,
                    'data': notification.get('data', {})
                })
        except Exception as e:
            logger.warning(f"Milestone check error: {e}")
        
        result = {
            "success": True,
            "plan": plan,
            "investment_summary": investment_summary,
            "progress": progress,
            "credit_recommendation": credit_recommendation
        }
        
        if milestone_check:
            result["milestone_check"] = milestone_check
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get savings investment plan error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/savings-investment/{plan_id}/contribute")
async def contribute_to_savings_investment(
    plan_id: str,
    request: SavingsContributionRequest,
    user: dict = Depends(get_current_user)
):
    """Plana katkı ekle ve otomatik yatırıma dağıt"""
    try:
        db = Database.get_database()
        
        from bson import ObjectId
        
        # Try to convert plan_id to ObjectId for MongoDB query
        try:
            object_id = ObjectId(plan_id)
            plan = await db['savings_investment_plans'].find_one({
                "_id": object_id,
                "user_id": user['id']
            })
        except:
            # If ObjectId conversion fails, try with string id
            plan = await db['savings_investment_plans'].find_one({
                "id": plan_id,
                "user_id": user['id']
            })
        
        if not plan:
            raise HTTPException(status_code=404, detail="Plan bulunamadı")
        
        # Katkı ekle
        contribution_result = savings_investment_service.add_contribution(
            plan=plan,
            amount=request.amount,
            note=request.note
        )
        
        if contribution_result['success']:
            # Planı güncelle
            contributions = plan.get('contributions', [])
            contributions.append(contribution_result['contribution'])
            
            await db['savings_investment_plans'].update_one(
                {"_id": ObjectId(plan_id)},
                {
                    "$set": {
                        "current_amount": contribution_result['new_total'],
                        "asset_distribution": contribution_result['updated_distribution'],
                        "contributions": contributions,
                        "updated_at": datetime.utcnow().isoformat()
                    }
                }
            )
            
            # Bildirim oluştur
            await Database.create_notification({
                'user_id': user['id'],
                'title': '💰 Birikim Eklendi',
                'message': f'{request.amount:,.0f} TL eklendi ve yatırım araçlarına dağıtıldı.',
                'notification_type': 'success',
                'read': False
            })
            
            # Milestone kontrolü yap
            try:
                from smart_credit_advisor import smart_credit_advisor
                from push_notification_service import push_notification_service
                
                # Önceki ilerleme
                previous_progress = plan.get('last_progress_percent', 0)
                
                # Yeni ilerleme hesapla
                target_amount = plan.get('target_amount', 0)
                new_value = contribution_result['new_total']
                current_progress = (new_value / target_amount * 100) if target_amount > 0 else 0
                
                # Plan verisi hazırla
                elapsed_months = max(0, (datetime.utcnow() - datetime.fromisoformat(plan['start_date'].replace('Z', '+00:00').replace('+00:00', ''))).days // 30)
                remaining_months = max(1, plan['duration_months'] - elapsed_months)
                
                plan_data = {
                    "id": plan_id,
                    "product_name": plan.get('product_name', 'Hedef'),
                    "target_amount": target_amount,
                    "current_amount": new_value,
                    "monthly_contribution": plan.get('monthly_contribution', 0),
                    "remaining_months": remaining_months,
                    "duration_months": plan.get('duration_months', 12)
                }
                
                # Milestone değişikliği kontrol et
                notification = await smart_credit_advisor.check_and_generate_milestone_notification(
                    plan_data=plan_data,
                    previous_progress=previous_progress,
                    current_progress=current_progress
                )
                
                # İlerlemeyi kaydet
                await db['savings_investment_plans'].update_one(
                    {"_id": ObjectId(plan_id)},
                    {"$set": {"last_progress_percent": current_progress}}
                )
                
                if notification:
                    # In-app bildirim oluştur
                    await Database.create_notification({
                        'user_id': user['id'],
                        'title': notification.get('title', '🎯 Milestone Ulaşıldı!'),
                        'message': notification.get('body', ''),
                        'notification_type': 'credit_advice',
                        'read': False,
                        'data': notification.get('data', {})
                    })
                    
                    # Push notification gönder (token varsa)
                    user_doc = await db['users'].find_one({"id": user['id']})
                    push_token = user_doc.get('push_token') if user_doc else None
                    
                    if push_token:
                        await push_notification_service.send_credit_advice_notification(
                            push_token=push_token,
                            notification_content=notification
                        )
                        
                    contribution_result['milestone_notification'] = {
                        'sent': True,
                        'title': notification.get('title'),
                        'previous_progress': previous_progress,
                        'current_progress': current_progress
                    }
            except Exception as milestone_error:
                logger.warning(f"Milestone check error: {milestone_error}")
        
        return contribution_result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Contribute to savings investment error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class BuyAssetRequest(BaseModel):
    asset_type: str  # usd, eur, gbp, gold, silver, tl_savings
    amount_tl: float

@api_router.post("/savings-investment/{plan_id}/buy-asset")
async def buy_asset_for_plan(
    plan_id: str,
    request: BuyAssetRequest,
    user: dict = Depends(get_current_user)
):
    """Plana varlık satın al (döviz, altın, gümüş vb.)"""
    try:
        db = Database.get_database()
        
        from bson import ObjectId
        
        # Plan'ı bul
        try:
            object_id = ObjectId(plan_id)
            plan = await db['savings_investment_plans'].find_one({
                "_id": object_id,
                "user_id": user['id']
            })
        except:
            plan = await db['savings_investment_plans'].find_one({
                "id": plan_id,
                "user_id": user['id']
            })
        
        if not plan:
            raise HTTPException(status_code=404, detail="Plan bulunamadı")
        
        # Varlık satın al
        result = savings_investment_service.buy_asset(
            plan=plan,
            asset_type=request.asset_type,
            amount_tl=request.amount_tl
        )
        
        if result['success']:
            # Planı güncelle
            transactions = plan.get('transactions', [])
            transactions.append(result['transaction'])
            
            # ID'ye göre güncelle
            filter_query = {"_id": ObjectId(plan_id)} if '_id' in plan else {"id": plan_id}
            
            await db['savings_investment_plans'].update_one(
                filter_query,
                {
                    "$set": {
                        "current_amount": result['new_total'],
                        "asset_distribution": result['updated_distribution'],
                        "holdings": result['updated_holdings'],
                        "transactions": transactions,
                        "updated_at": datetime.utcnow().isoformat()
                    }
                }
            )
            
            # Bildirim oluştur
            asset_info = result['asset_info']
            await Database.create_notification({
                'user_id': user['id'],
                'title': f'{asset_info["emoji"]} {asset_info["name"]} Alındı',
                'message': result['message'],
                'notification_type': 'success',
                'read': False
            })
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Buy asset error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/savings-investment/{plan_id}/credit-options")
async def get_credit_options_for_plan(
    plan_id: str,
    user: dict = Depends(get_current_user)
):
    """Plan için kredi seçeneklerini getir"""
    try:
        db = Database.get_database()
        
        from bson import ObjectId
        
        # Try to convert plan_id to ObjectId for MongoDB query
        try:
            object_id = ObjectId(plan_id)
            plan = await db['savings_investment_plans'].find_one({
                "_id": object_id,
                "user_id": user['id']
            })
        except:
            # If ObjectId conversion fails, try with string id
            plan = await db['savings_investment_plans'].find_one({
                "id": plan_id,
                "user_id": user['id']
            })
        
        if not plan:
            raise HTTPException(status_code=404, detail="Plan bulunamadı")
        
        # Yatırım özeti
        investment_summary = savings_investment_service.get_investment_summary(plan)
        
        # İlerleme durumu
        elapsed_months = max(0, (datetime.utcnow() - datetime.fromisoformat(plan['start_date'].replace('Z', '+00:00').replace('+00:00', ''))).days // 30)
        remaining_months = max(0, plan['duration_months'] - elapsed_months)
        
        # Kredi önerisi
        credit_recommendation = savings_investment_service.get_credit_recommendation(
            target_amount=plan['target_amount'],
            current_value=investment_summary['total_current_value'],
            remaining_months=remaining_months,
            monthly_income=plan['monthly_contribution'] * 5,
            credit_score=650
        )
        
        return {
            "success": True,
            "plan_summary": {
                "product_name": plan['product_name'],
                "target_amount": plan['target_amount'],
                "current_value": investment_summary['total_current_value'],
                "remaining_months": remaining_months
            },
            "credit_recommendation": credit_recommendation
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get credit options error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/savings-investment/{plan_id}/apply-credit")
async def apply_credit_for_plan(
    plan_id: str,
    request: Dict[str, Any],
    user: dict = Depends(get_current_user)
):
    """Plan için kredi başvurusu yap"""
    try:
        db = Database.get_database()
        
        from bson import ObjectId
        
        # Try to convert plan_id to ObjectId for MongoDB query
        try:
            object_id = ObjectId(plan_id)
            plan = await db['savings_investment_plans'].find_one({
                "_id": object_id,
                "user_id": user['id']
            })
        except:
            # If ObjectId conversion fails, try with string id
            plan = await db['savings_investment_plans'].find_one({
                "id": plan_id,
                "user_id": user['id']
            })
        
        if not plan:
            raise HTTPException(status_code=404, detail="Plan bulunamadı")
        
        loan_type = request.get("loan_type", "consumer_loan")
        amount = request.get("amount", 0)
        term = request.get("term", 12)
        monthly_payment = request.get("monthly_payment", 0)
        
        # Kredi başvurusu oluştur
        application = {
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "plan_id": plan_id,
            "product_name": plan['product_name'],
            "loan_type": loan_type,
            "requested_amount": amount,
            "term_months": term,
            "monthly_payment": monthly_payment,
            "status": "pending",
            "application_date": datetime.utcnow().isoformat(),
            "purpose": f"{plan['product_name']} alımı için kredi"
        }
        
        await db['credit_applications'].insert_one(application)
        
        # Bildirim oluştur
        await Database.create_notification({
            'user_id': user['id'],
            'title': '🏦 Kredi Başvurusu Alındı',
            'message': f'{amount:,.0f} TL tutarındaki kredi başvurunuz değerlendirmeye alındı.',
            'notification_type': 'info',
            'read': False
        })
        
        return {
            "success": True,
            "application": application,
            "message": "Kredi başvurunuz alındı. 1-2 iş günü içinde sonuçlandırılacaktır."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Apply credit for plan error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/savings-investment/estimate")
async def estimate_savings_investment(
    request: SavingsInvestmentCreateRequest,
    user: dict = Depends(get_current_user)
):
    """Plan oluşturmadan önce tahmini sonuçları göster"""
    try:
        # AI önerisi kullanılacak mı?
        ai_allocation = None
        ai_recommendation_data = None
        
        if request.use_ai_allocation and not request.custom_allocation and request.strategy != "custom":
            # AI'dan dinamik dağılım önerisi al
            from ai_investment_advisor import ai_investment_advisor
            
            ai_recommendation = await ai_investment_advisor.get_ai_allocation_recommendation(
                target_amount=request.target_amount,
                duration_months=request.duration_months,
                risk_profile=request.risk_profile,
                product_name=request.product_name,
                existing_savings=request.existing_savings,
                monthly_contribution=request.monthly_contribution
            )
            
            if ai_recommendation.get("success"):
                ai_allocation = ai_recommendation.get("allocation")
                ai_recommendation_data = {
                    "reasoning": ai_recommendation.get("reasoning"),
                    "insights": ai_recommendation.get("insights", []),
                    "source": ai_recommendation.get("source"),
                    "confidence_score": ai_recommendation.get("confidence_score")
                }
        
        # Yatırım dağılımını belirle
        if ai_allocation:
            allocation = ai_allocation
        elif request.custom_allocation:
            allocation = request.custom_allocation
        elif request.strategy:
            allocation = savings_investment_service.get_allocation_by_strategy(request.strategy)
        else:
            allocation = savings_investment_service.get_allocation_by_risk(request.risk_profile)
        
        # Gelecek değer tahmini
        estimate = savings_investment_service.estimate_future_value(
            monthly_contribution=request.monthly_contribution,
            duration_months=request.duration_months,
            allocation=allocation,
            existing_savings=request.existing_savings
        )
        
        # Hedefe ulaşılabilirlik
        can_reach = estimate['estimated_value'] >= request.target_amount
        shortage = max(0, request.target_amount - estimate['estimated_value'])
        
        # Kredi gerekiyorsa öneri
        credit_recommendation = None
        if shortage > 0:
            credit_recommendation = savings_investment_service.get_credit_recommendation(
                target_amount=request.target_amount,
                current_value=request.existing_savings,
                remaining_months=request.duration_months,
                monthly_income=request.monthly_contribution * 5,
                credit_score=650
            )
        
        result = {
            "success": True,
            "allocation": allocation,
            "estimate": estimate,
            "can_reach_target": can_reach,
            "shortage": round(shortage, 2),
            "credit_recommendation": credit_recommendation,
            "summary": f"{'✅' if can_reach else '⚠️'} {request.duration_months} ay sonunda tahmini {estimate['estimated_value']:,.0f} TL biriktirmiş olacaksınız." +
                      (f" Hedefe ulaşmak için {shortage:,.0f} TL eksik kalacak." if not can_reach else "")
        }
        
        # AI önerisini sonuca ekle
        if ai_recommendation_data:
            result["ai_recommendation"] = ai_recommendation_data
        
        return result
        
    except Exception as e:
        logger.error(f"Estimate savings investment error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== AI SMART CREDIT ADVISOR ENDPOINTS ====================
from smart_credit_advisor import smart_credit_advisor, CreditMilestone, CreditUrgency
from push_notification_service import push_notification_service
from ai_investment_advisor import ai_investment_advisor

class PushTokenRequest(BaseModel):
    push_token: str

class AIAllocationRequest(BaseModel):
    product_name: str
    target_amount: float
    duration_months: int
    risk_profile: Optional[str] = "medium"  # low, medium, high
    existing_savings: Optional[float] = 0
    monthly_contribution: Optional[float] = 0

@api_router.post("/ai-investment/recommend-allocation")
async def get_ai_investment_allocation(
    request: AIAllocationRequest,
    user: dict = Depends(get_current_user)
):
    """
    🤖 AI Tabanlı Dinamik Yatırım Dağılımı Önerisi
    
    Piyasa koşullarına, enflasyona ve risk profiline göre
    optimal yatırım dağılımı önerir. Sabit %25-25-25-25 yerine
    AI dinamik olarak en uygun dağılımı belirler.
    
    Örnek: %10 TL, %35 Altın, %30 Dolar, %25 Euro
    """
    try:
        # AI'dan öneri al
        recommendation = await ai_investment_advisor.get_ai_allocation_recommendation(
            target_amount=request.target_amount,
            duration_months=request.duration_months,
            risk_profile=request.risk_profile,
            product_name=request.product_name,
            existing_savings=request.existing_savings,
            monthly_contribution=request.monthly_contribution
        )
        
        if recommendation.get("success"):
            # Tahmini getirileri hesapla
            projections = ai_investment_advisor.calculate_projected_returns(
                allocation=recommendation["allocation"],
                initial_amount=request.existing_savings,
                monthly_contribution=request.monthly_contribution,
                duration_months=request.duration_months
            )
            
            recommendation["projections"] = projections
            
            # Varlık detaylarını ekle
            allocation_details = []
            for asset, pct in recommendation["allocation"].items():
                if pct > 0:
                    asset_info = ai_investment_advisor.asset_properties.get(asset, {})
                    allocation_details.append({
                        "asset": asset,
                        "percentage": pct,
                        "name": asset_info.get("name", asset),
                        "emoji": asset_info.get("emoji", "📊"),
                        "risk_level": asset_info.get("risk_level", "medium"),
                        "inflation_hedge": asset_info.get("inflation_hedge", False)
                    })
            
            # Yüzdeye göre sırala (büyükten küçüğe)
            allocation_details.sort(key=lambda x: x["percentage"], reverse=True)
            recommendation["allocation_details"] = allocation_details
        
        return recommendation
        
    except Exception as e:
        logger.error(f"AI Investment Allocation error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/ai-investment/market-analysis")
async def get_ai_market_analysis(user: dict = Depends(get_current_user)):
    """
    📊 Güncel Piyasa Analizi
    
    Yatırım kararları için güncel piyasa verilerini döndürür.
    """
    try:
        market_data = ai_investment_advisor.market_data
        
        # Her varlık için analiz
        assets_analysis = []
        inflation = market_data.get("annual_inflation", 50)
        
        asset_returns = {
            "tl_savings": {
                "return": market_data.get("tl_deposit_rate", 45),
                "name": "TL Birikim",
                "emoji": "💰"
            },
            "gold": {
                "return": market_data.get("gold_yearly_change", 55),
                "name": "Altın",
                "emoji": "🥇"
            },
            "usd": {
                "return": market_data.get("usd_yearly_change", 35),
                "name": "Dolar",
                "emoji": "💵"
            },
            "eur": {
                "return": market_data.get("eur_yearly_change", 30),
                "name": "Euro",
                "emoji": "💶"
            }
        }
        
        for asset, info in asset_returns.items():
            ret = info["return"]
            real_return = ret - inflation
            
            assets_analysis.append({
                "asset": asset,
                "name": info["name"],
                "emoji": info["emoji"],
                "expected_return": ret,
                "real_return": round(real_return, 2),
                "beats_inflation": ret > inflation,
                "recommendation": "Öneriliyor" if ret > inflation else "Dikkatli olun"
            })
        
        # En iyi performans gösterene göre sırala
        assets_analysis.sort(key=lambda x: x["expected_return"], reverse=True)
        
        return {
            "success": True,
            "market_data": market_data,
            "assets_analysis": assets_analysis,
            "summary": {
                "inflation_rate": inflation,
                "best_performer": assets_analysis[0]["name"] if assets_analysis else None,
                "assets_beating_inflation": len([a for a in assets_analysis if a["beats_inflation"]])
            },
            "updated_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Market analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/savings-investment/{plan_id}/ai-credit-advice")
async def get_ai_credit_advice(
    plan_id: str,
    user: dict = Depends(get_current_user)
):
    """
    🤖 AI Tabanlı Akıllı Kredi Önerisi
    
    Birikim planının ilerleme durumuna göre kişiselleştirilmiş kredi önerileri sunar.
    - Milestone eşiklerine göre otomatik değerlendirme
    - Enflasyon vs faiz karşılaştırması
    - LLM (Gemini) ile akıllı mesajlar
    """
    try:
        db = Database.get_database()
        
        from bson import ObjectId
        
        # Plan'ı bul
        try:
            object_id = ObjectId(plan_id)
            plan = await db['savings_investment_plans'].find_one({
                "_id": object_id,
                "user_id": user['id']
            })
        except:
            plan = await db['savings_investment_plans'].find_one({
                "id": plan_id,
                "user_id": user['id']
            })
        
        if not plan:
            raise HTTPException(status_code=404, detail="Plan bulunamadı")
        
        # Yatırım özeti al
        investment_summary = savings_investment_service.get_investment_summary(plan)
        current_value = investment_summary['total_current_value']
        
        # İlerleme durumu
        start_date_str = plan.get('start_date', datetime.utcnow().isoformat())
        try:
            start_date = datetime.fromisoformat(start_date_str.replace('Z', '+00:00').replace('+00:00', ''))
        except:
            start_date = datetime.utcnow()
        
        elapsed_months = max(0, (datetime.utcnow() - start_date).days // 30)
        remaining_months = max(1, plan['duration_months'] - elapsed_months)
        
        # Plan verisini hazırla
        plan_data = {
            "id": plan_id,
            "product_name": plan.get('product_name', 'Hedef'),
            "target_amount": plan.get('target_amount', 0),
            "current_amount": current_value,
            "monthly_contribution": plan.get('monthly_contribution', 0),
            "remaining_months": remaining_months,
            "duration_months": plan.get('duration_months', 12)
        }
        
        # AI önerisi al
        advice = await smart_credit_advisor.get_smart_credit_advice(
            plan_data=plan_data,
            current_value=current_value,
            monthly_income=plan.get('monthly_contribution', 0) * 5
        )
        
        return advice
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI Credit Advice error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/savings-investment/{plan_id}/check-milestone")
async def check_milestone_and_notify(
    plan_id: str,
    user: dict = Depends(get_current_user)
):
    """
    📊 Milestone Kontrolü ve Bildirim
    
    Plan ilerleme durumunu kontrol eder ve milestone geçişi varsa bildirim oluşturur.
    """
    try:
        db = Database.get_database()
        
        from bson import ObjectId
        
        # Plan'ı bul
        try:
            object_id = ObjectId(plan_id)
            plan = await db['savings_investment_plans'].find_one({
                "_id": object_id,
                "user_id": user['id']
            })
        except:
            plan = await db['savings_investment_plans'].find_one({
                "id": plan_id,
                "user_id": user['id']
            })
        
        if not plan:
            raise HTTPException(status_code=404, detail="Plan bulunamadı")
        
        # Önceki ilerleme
        previous_progress = plan.get('last_progress_percent', 0)
        
        # Güncel ilerleme
        investment_summary = savings_investment_service.get_investment_summary(plan)
        current_value = investment_summary['total_current_value']
        target_amount = plan.get('target_amount', 0)
        current_progress = (current_value / target_amount * 100) if target_amount > 0 else 0
        
        # İlerleme durumu
        start_date_str = plan.get('start_date', datetime.utcnow().isoformat())
        try:
            start_date = datetime.fromisoformat(start_date_str.replace('Z', '+00:00').replace('+00:00', ''))
        except:
            start_date = datetime.utcnow()
        
        elapsed_months = max(0, (datetime.utcnow() - start_date).days // 30)
        remaining_months = max(1, plan['duration_months'] - elapsed_months)
        
        # Plan verisini hazırla
        plan_data = {
            "id": plan_id,
            "product_name": plan.get('product_name', 'Hedef'),
            "target_amount": target_amount,
            "current_amount": current_value,
            "monthly_contribution": plan.get('monthly_contribution', 0),
            "remaining_months": remaining_months,
            "duration_months": plan.get('duration_months', 12)
        }
        
        # Milestone kontrolü
        notification = await smart_credit_advisor.check_and_generate_milestone_notification(
            plan_data=plan_data,
            previous_progress=previous_progress,
            current_progress=current_progress
        )
        
        # İlerlemeyi kaydet
        await db['savings_investment_plans'].update_one(
            {"_id": ObjectId(plan_id)} if '_id' in plan else {"id": plan_id},
            {"$set": {"last_progress_percent": current_progress}}
        )
        
        result = {
            "success": True,
            "previous_progress": round(previous_progress, 2),
            "current_progress": round(current_progress, 2),
            "milestone_changed": notification is not None
        }
        
        if notification:
            result["notification"] = notification
            
            # In-app bildirim oluştur
            await Database.create_notification({
                'user_id': user['id'],
                'title': notification.get('title', 'Kredi Fırsatı'),
                'message': notification.get('body', ''),
                'notification_type': 'credit_advice',
                'read': False,
                'data': notification.get('data', {})
            })
            
            # Push notification gönder (token varsa)
            user_doc = await db['users'].find_one({"id": user['id']})
            push_token = user_doc.get('push_token') if user_doc else None
            
            if push_token:
                push_result = await push_notification_service.send_credit_advice_notification(
                    push_token=push_token,
                    notification_content=notification
                )
                result["push_notification_sent"] = push_result.get('success', False)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Check milestone error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/users/push-token")
async def register_push_token(
    request: PushTokenRequest,
    user: dict = Depends(get_current_user)
):
    """
    📱 Push Token Kaydet
    
    Kullanıcının Expo push token'ını kaydeder.
    """
    try:
        db = Database.get_database()
        
        # Token'ı doğrula
        if not request.push_token.startswith("ExponentPushToken"):
            raise HTTPException(status_code=400, detail="Geçersiz push token formatı")
        
        # Kullanıcıyı güncelle
        await db['users'].update_one(
            {"id": user['id']},
            {
                "$set": {
                    "push_token": request.push_token,
                    "push_token_updated_at": datetime.utcnow().isoformat()
                }
            }
        )
        
        return {
            "success": True,
            "message": "Push token kaydedildi"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Register push token error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/credit-advisor/milestones")
async def get_credit_milestones(user: dict = Depends(get_current_user)):
    """
    📊 Kredi Öneri Eşiklerini Listele
    
    Tüm milestone eşiklerini ve özelliklerini döndürür.
    """
    try:
        milestones = []
        for milestone, config in smart_credit_advisor.milestones.items():
            milestones.append({
                "key": milestone.value,
                "title": config["title"],
                "emoji": config["emoji"],
                "color": config["color"],
                "min_percent": config["min_percent"],
                "max_percent": config["max_percent"],
                "base_urgency": config["base_urgency"].value
            })
        
        return {
            "success": True,
            "milestones": milestones,
            "economic_params": smart_credit_advisor.economic_params
        }
        
    except Exception as e:
        logger.error(f"Get milestones error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/savings-investment/{plan_id}/simulate-credit")
async def simulate_credit_scenario(
    plan_id: str,
    request: Dict[str, Any],
    user: dict = Depends(get_current_user)
):
    """
    🔮 Kredi Senaryosu Simülasyonu
    
    Farklı kredi vadelerini ve ödeme planlarını simüle eder.
    """
    try:
        db = Database.get_database()
        
        from bson import ObjectId
        
        # Plan'ı bul
        try:
            object_id = ObjectId(plan_id)
            plan = await db['savings_investment_plans'].find_one({
                "_id": object_id,
                "user_id": user['id']
            })
        except:
            plan = await db['savings_investment_plans'].find_one({
                "id": plan_id,
                "user_id": user['id']
            })
        
        if not plan:
            raise HTTPException(status_code=404, detail="Plan bulunamadı")
        
        # Parametreleri al
        custom_shortage = request.get('shortage_amount')
        custom_income = request.get('monthly_income')
        custom_term = request.get('term_months')
        
        # Yatırım özeti al
        investment_summary = savings_investment_service.get_investment_summary(plan)
        current_value = investment_summary['total_current_value']
        
        # Eksik tutarı hesapla
        shortage = custom_shortage if custom_shortage else max(0, plan['target_amount'] - current_value)
        monthly_income = custom_income if custom_income else plan.get('monthly_contribution', 0) * 5
        
        # İlerleme durumu
        start_date_str = plan.get('start_date', datetime.utcnow().isoformat())
        try:
            start_date = datetime.fromisoformat(start_date_str.replace('Z', '+00:00').replace('+00:00', ''))
        except:
            start_date = datetime.utcnow()
        
        elapsed_months = max(0, (datetime.utcnow() - start_date).days // 30)
        remaining_months = max(1, plan['duration_months'] - elapsed_months)
        
        # Kredi analizi
        credit_analysis = smart_credit_advisor.calculate_credit_benefit(
            shortage_amount=shortage,
            remaining_months=remaining_months,
            monthly_income=monthly_income
        )
        
        # Enflasyon etkisi
        inflation_impact = smart_credit_advisor.calculate_inflation_impact(
            target_amount=plan['target_amount'],
            current_amount=current_value,
            remaining_months=remaining_months
        )
        
        return {
            "success": True,
            "plan_summary": {
                "product_name": plan['product_name'],
                "target_amount": plan['target_amount'],
                "current_value": current_value,
                "shortage": shortage
            },
            "credit_analysis": credit_analysis,
            "inflation_impact": inflation_impact,
            "recommendation": "Kredi çekmek avantajlı" if credit_analysis.get('comparison', {}).get('credit_is_better', False) else "Birikime devam edin"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Simulate credit scenario error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# Include the router in the main app AFTER all endpoints are defined
app.include_router(api_router)

# Deep Learning router
app.include_router(deep_learning_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
    logger.info("👋 Application shutdown")