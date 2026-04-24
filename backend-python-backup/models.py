from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum
import uuid

# Enums
class AccountType(str, Enum):
    CHECKING = "checking"
    SAVINGS = "savings"
    BUSINESS = "business"

class CardType(str, Enum):
    DEBIT = "debit"
    CREDIT = "credit"

class ApplicationStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class ApplicationType(str, Enum):
    ACCOUNT = "account"
    CARD = "card"

# User Models
class UserBase(BaseModel):
    name: str
    tc_no: str
    email: str
    phone: str

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    identifier: str  # Can be TC No or Customer No
    password: str

class User(UserBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_no: str
    role: str = "customer"
    profile_image: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Account Models
class AccountBase(BaseModel):
    name: str
    account_type: AccountType

class AccountCreate(AccountBase):
    pass

class Account(AccountBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    account_no: str
    balance: float = 0.0
    iban: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Card Models
class CardBase(BaseModel):
    name: str
    card_type: CardType

class CardCreate(CardBase):
    pass

class Card(CardBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    account_id: Optional[str] = None
    card_no: str
    limit: float = 0.0
    available_limit: float = 0.0
    balance: float = 0.0
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Transaction Models
class TransactionBase(BaseModel):
    from_account_id: str
    to_account_iban: str
    amount: float
    description: str

class TransactionCreate(TransactionBase):
    pass

class Transaction(TransactionBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    status: str = "pending"
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Application Models
class ApplicationBase(BaseModel):
    application_type: ApplicationType
    details: dict

class ApplicationCreate(ApplicationBase):
    pass

class Application(ApplicationBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    status: ApplicationStatus = ApplicationStatus.PENDING
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# Notification Models
class NotificationBase(BaseModel):
    title: str
    message: str
    notification_type: str

class NotificationCreate(NotificationBase):
    pass

class Notification(NotificationBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    read: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Wealth Category Models
class WealthCategoryBase(BaseModel):
    name: str
    icon: str
    color: str
    order: int

class WealthCategoryCreate(WealthCategoryBase):
    pass

class WealthCategory(WealthCategoryBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Financial Tip Models
class FinancialTipBase(BaseModel):
    title: str
    description: str
    category: str
    order: int

class FinancialTipCreate(FinancialTipBase):
    pass

class FinancialTip(FinancialTipBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Saving Plan Models
class SavingPlanBase(BaseModel):
    title: str
    description: str
    cta: str
    icon: str
    order: int

class SavingPlanCreate(SavingPlanBase):
    pass

class SavingPlan(SavingPlanBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Financial Goal Models (Sandbox & Shield System)
class FinancialGoalStatus(str, Enum):
    planning = "planning"
    active = "active"
    paused = "paused"
    completed = "completed"
    cancelled = "cancelled"

class FinancialGoalBase(BaseModel):
    goal_name: str  # e.g., "Oyuncu Bilgisayarı"
    target_amount: float  # Hedef tutar
    current_amount: float = 0.0  # Mevcut birikim
    duration_months: int  # Hedef süresi (ay)
    category: str  # electronics, house, car, etc.
    priority: str = "medium"  # low, medium, high
    
    # Simulation Data
    monthly_income: float = 0.0
    monthly_expenses: float = 0.0
    monthly_savings: float = 0.0
    
    # Shield (Protection) Settings
    shield_enabled: bool = False
    protection_assets: Optional[dict] = None  # {"gold": 30, "forex": 40, "funds": 30}
    expected_inflation: float = 0.0  # Beklenen enflasyon oranı
    
    status: FinancialGoalStatus = FinancialGoalStatus.planning

class FinancialGoalCreate(FinancialGoalBase):
    pass  # user_id backend'de eklenir

class FinancialGoal(FinancialGoalBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str  # Sadece response'da olacak
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    target_date: Optional[datetime] = None
    actual_completion_date: Optional[datetime] = None
    
    # Simulation Results
    simulation_result: Optional[dict] = None  # Simülasyon sonuçları
    recommendations: Optional[list] = None  # Öneriler
    ai_analysis: Optional[dict] = None  # AI analizi

# QR Payment Models
class QRGenerateRequest(BaseModel):
    account_id: str
    amount: Optional[float] = None  # None means any amount
    description: Optional[str] = "QR ile ödeme"

class QRPaymentRequest(BaseModel):
    qr_code: str  # QR code data
    from_account_id: str
    amount: Optional[float] = None  # If QR has amount, this overrides

# Debit Card with Account Creation
class DebitCardWithAccountCreate(BaseModel):
    card_name: str
    account_name: str
    account_type: AccountType  # User chooses: checking, savings, business

# Account Search Request
class AccountSearchRequest(BaseModel):
    query: str  # Can be account_no or IBAN

# Investment Models
class InvestmentCategory(str, Enum):
    GOLD = "gold"
    FOREX = "forex"
    STOCK = "stock"
    CRYPTO = "crypto"

class InvestmentBase(BaseModel):
    category: InvestmentCategory
    name: str
    symbol: str
    current_price: float
    currency: str = "TRY"

class Investment(InvestmentBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    change_percent: float = 0.0
    is_trending: bool = False

class UserInvestmentBase(BaseModel):
    investment_id: str
    quantity: float
    purchase_price: float
    purchase_date: datetime = Field(default_factory=datetime.utcnow)

class UserInvestmentCreate(UserInvestmentBase):
    pass

class UserInvestment(UserInvestmentBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    total_value: float = 0.0
    profit_loss: float = 0.0
    profit_loss_percent: float = 0.0

class InvestmentTransactionType(str, Enum):
    BUY = "buy"
    SELL = "sell"

class InvestmentTransactionBase(BaseModel):
    investment_id: str
    transaction_type: InvestmentTransactionType
    quantity: float
    price: float
    total_amount: float

class InvestmentTransactionCreate(InvestmentTransactionBase):
    pass

class InvestmentTransaction(InvestmentTransactionBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Web Scraping Models
class ScrapePriceRequest(BaseModel):
    product_name: str
    category: str = "electronics"
    urls: Optional[List[str]] = None  # Kullanıcı özel URL ekleyebilir