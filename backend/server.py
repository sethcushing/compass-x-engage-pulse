from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from enum import Enum
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(title="Engagement Pulse API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ===================== ENUMS =====================
class UserRole(str, Enum):
    CONSULTANT = "CONSULTANT"
    LEAD = "LEAD"
    ADMIN = "ADMIN"

class RAGStatus(str, Enum):
    GREEN = "GREEN"
    AMBER = "AMBER"
    RED = "RED"

class Sentiment(str, Enum):
    HIGH = "HIGH"
    OK = "OK"
    LOW = "LOW"

class MilestoneStatus(str, Enum):
    NOT_STARTED = "NOT_STARTED"
    IN_PROGRESS = "IN_PROGRESS"
    AT_RISK = "AT_RISK"
    DONE = "DONE"
    BLOCKED = "BLOCKED"

class RiskCategory(str, Enum):
    SCOPE = "SCOPE"
    SCHEDULE = "SCHEDULE"
    RESOURCING = "RESOURCING"
    DEPENDENCY = "DEPENDENCY"
    TECH = "TECH"
    SECURITY = "SECURITY"
    BUDGET = "BUDGET"
    OTHER = "OTHER"

class Probability(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"

class Impact(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"

class RiskStatus(str, Enum):
    OPEN = "OPEN"
    MITIGATING = "MITIGATING"
    ACCEPTED = "ACCEPTED"
    CLOSED = "CLOSED"

class IssueSeverity(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class IssueStatus(str, Enum):
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    BLOCKED = "BLOCKED"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"

class ContactType(str, Enum):
    CLIENT = "CLIENT"
    INTERNAL = "INTERNAL"
    VENDOR = "VENDOR"

class EntityType(str, Enum):
    PULSE = "PULSE"
    MILESTONE = "MILESTONE"
    RISK = "RISK"
    ISSUE = "ISSUE"
    CONTACT = "CONTACT"
    ENGAGEMENT = "ENGAGEMENT"

class ActionType(str, Enum):
    CREATE = "CREATE"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    SUBMIT = "SUBMIT"

# ===================== MODELS =====================
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str = Field(default_factory=lambda: f"user_{uuid.uuid4().hex[:12]}")
    name: str
    email: str
    picture: Optional[str] = None
    role: UserRole = UserRole.CONSULTANT
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    name: str
    email: str
    role: UserRole = UserRole.CONSULTANT
    picture: Optional[str] = None

class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None

class Client(BaseModel):
    model_config = ConfigDict(extra="ignore")
    client_id: str = Field(default_factory=lambda: f"client_{uuid.uuid4().hex[:12]}")
    client_name: str
    industry: Optional[str] = None
    notes: Optional[str] = None
    primary_contact_name: Optional[str] = None
    primary_contact_email: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ClientCreate(BaseModel):
    client_name: str
    industry: Optional[str] = None
    notes: Optional[str] = None
    primary_contact_name: Optional[str] = None
    primary_contact_email: Optional[str] = None

class Engagement(BaseModel):
    model_config = ConfigDict(extra="ignore")
    engagement_id: str = Field(default_factory=lambda: f"eng_{uuid.uuid4().hex[:12]}")
    client_id: str
    engagement_name: str
    engagement_code: str
    consultant_user_id: Optional[str] = None
    start_date: datetime
    target_end_date: Optional[datetime] = None
    rag_status: RAGStatus = RAGStatus.GREEN
    rag_reason: Optional[str] = None
    overall_summary: Optional[str] = None
    last_pulse_date: Optional[datetime] = None
    health_score: int = 100
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EngagementCreate(BaseModel):
    client_id: str
    engagement_name: str
    engagement_code: str
    consultant_user_id: Optional[str] = None
    start_date: datetime
    target_end_date: Optional[datetime] = None
    rag_status: RAGStatus = RAGStatus.GREEN
    rag_reason: Optional[str] = None
    overall_summary: Optional[str] = None

class EngagementUpdate(BaseModel):
    engagement_name: Optional[str] = None
    consultant_user_id: Optional[str] = None
    target_end_date: Optional[datetime] = None
    rag_status: Optional[RAGStatus] = None
    rag_reason: Optional[str] = None
    overall_summary: Optional[str] = None
    is_active: Optional[bool] = None

class WeeklyPulse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    pulse_id: str = Field(default_factory=lambda: f"pulse_{uuid.uuid4().hex[:12]}")
    engagement_id: str
    consultant_user_id: str
    week_start_date: datetime
    week_end_date: datetime
    rag_status_this_week: RAGStatus
    what_went_well: Optional[str] = None
    delivered_this_week: Optional[str] = None
    issues_facing: Optional[str] = None
    roadblocks: Optional[str] = None
    plan_next_week: Optional[str] = None
    time_allocation: Optional[float] = None
    sentiment: Optional[Sentiment] = None
    submitted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_draft: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class WeeklyPulseCreate(BaseModel):
    engagement_id: str
    rag_status_this_week: RAGStatus
    what_went_well: Optional[str] = None
    delivered_this_week: Optional[str] = None
    issues_facing: Optional[str] = None
    roadblocks: Optional[str] = None
    plan_next_week: Optional[str] = None
    time_allocation: Optional[float] = None
    sentiment: Optional[Sentiment] = None
    is_draft: bool = False

class WeeklyPulseUpdate(BaseModel):
    rag_status_this_week: Optional[RAGStatus] = None
    what_went_well: Optional[str] = None
    delivered_this_week: Optional[str] = None
    issues_facing: Optional[str] = None
    roadblocks: Optional[str] = None
    plan_next_week: Optional[str] = None
    time_allocation: Optional[float] = None
    sentiment: Optional[Sentiment] = None
    is_draft: Optional[bool] = None

class Milestone(BaseModel):
    model_config = ConfigDict(extra="ignore")
    milestone_id: str = Field(default_factory=lambda: f"ms_{uuid.uuid4().hex[:12]}")
    engagement_id: str
    title: str
    description: Optional[str] = None
    owner: Optional[str] = None
    due_date: datetime
    status: MilestoneStatus = MilestoneStatus.NOT_STARTED
    completion_percent: int = 0
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MilestoneCreate(BaseModel):
    engagement_id: str
    title: str
    description: Optional[str] = None
    owner: Optional[str] = None
    due_date: datetime
    status: MilestoneStatus = MilestoneStatus.NOT_STARTED
    completion_percent: int = 0
    notes: Optional[str] = None

class MilestoneUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    owner: Optional[str] = None
    due_date: Optional[datetime] = None
    status: Optional[MilestoneStatus] = None
    completion_percent: Optional[int] = None
    notes: Optional[str] = None

class Risk(BaseModel):
    model_config = ConfigDict(extra="ignore")
    risk_id: str = Field(default_factory=lambda: f"risk_{uuid.uuid4().hex[:12]}")
    engagement_id: str
    title: str
    description: str
    category: RiskCategory
    probability: Probability
    impact: Impact
    mitigation_plan: Optional[str] = None
    owner: Optional[str] = None
    status: RiskStatus = RiskStatus.OPEN
    target_resolution_date: Optional[datetime] = None
    last_reviewed_date: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RiskCreate(BaseModel):
    engagement_id: str
    title: str
    description: str
    category: RiskCategory
    probability: Probability
    impact: Impact
    mitigation_plan: Optional[str] = None
    owner: Optional[str] = None
    status: RiskStatus = RiskStatus.OPEN
    target_resolution_date: Optional[datetime] = None

class RiskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[RiskCategory] = None
    probability: Optional[Probability] = None
    impact: Optional[Impact] = None
    mitigation_plan: Optional[str] = None
    owner: Optional[str] = None
    status: Optional[RiskStatus] = None
    target_resolution_date: Optional[datetime] = None
    last_reviewed_date: Optional[datetime] = None

class Issue(BaseModel):
    model_config = ConfigDict(extra="ignore")
    issue_id: str = Field(default_factory=lambda: f"issue_{uuid.uuid4().hex[:12]}")
    engagement_id: str
    title: str
    description: str
    severity: IssueSeverity
    status: IssueStatus = IssueStatus.OPEN
    owner: Optional[str] = None
    blocked_by: Optional[str] = None
    due_date: Optional[datetime] = None
    resolution: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class IssueCreate(BaseModel):
    engagement_id: str
    title: str
    description: str
    severity: IssueSeverity
    status: IssueStatus = IssueStatus.OPEN
    owner: Optional[str] = None
    blocked_by: Optional[str] = None
    due_date: Optional[datetime] = None

class IssueUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    severity: Optional[IssueSeverity] = None
    status: Optional[IssueStatus] = None
    owner: Optional[str] = None
    blocked_by: Optional[str] = None
    due_date: Optional[datetime] = None
    resolution: Optional[str] = None

class Contact(BaseModel):
    model_config = ConfigDict(extra="ignore")
    contact_id: str = Field(default_factory=lambda: f"contact_{uuid.uuid4().hex[:12]}")
    engagement_id: str
    name: str
    title: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    type: ContactType
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ContactCreate(BaseModel):
    engagement_id: str
    name: str
    title: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    type: ContactType
    notes: Optional[str] = None

class ContactUpdate(BaseModel):
    name: Optional[str] = None
    title: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    type: Optional[ContactType] = None
    notes: Optional[str] = None

class ActivityLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    log_id: str = Field(default_factory=lambda: f"log_{uuid.uuid4().hex[:12]}")
    actor_user_id: str
    engagement_id: Optional[str] = None
    entity_type: EntityType
    entity_id: str
    action: ActionType
    message: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ===================== HELPER FUNCTIONS =====================
def get_current_week_start():
    """Get the Monday of the current week"""
    today = datetime.now(timezone.utc)
    monday = today - timedelta(days=today.weekday())
    return monday.replace(hour=0, minute=0, second=0, microsecond=0)

def get_week_end(week_start: datetime):
    """Get the Sunday of the week"""
    return week_start + timedelta(days=6, hours=23, minutes=59, seconds=59)

def serialize_datetime(dt):
    """Serialize datetime to ISO string"""
    if isinstance(dt, datetime):
        return dt.isoformat()
    return dt

def serialize_doc(doc):
    """Serialize a document for MongoDB"""
    result = {}
    for key, value in doc.items():
        if isinstance(value, datetime):
            result[key] = value.isoformat()
        elif isinstance(value, Enum):
            result[key] = value.value
        else:
            result[key] = value
    return result

def deserialize_doc(doc):
    """Deserialize datetime strings from MongoDB"""
    if doc is None:
        return None
    for key, value in doc.items():
        if isinstance(value, str) and key.endswith(('_at', '_date')):
            try:
                doc[key] = datetime.fromisoformat(value)
            except:
                pass
    return doc

async def calculate_health_score(engagement_id: str) -> int:
    """Calculate health score for an engagement"""
    engagement = await db.engagements.find_one({"engagement_id": engagement_id}, {"_id": 0})
    if not engagement:
        return 100
    
    score = 100
    
    # RAG status penalty
    rag_status = engagement.get("rag_status", "GREEN")
    if rag_status == "AMBER":
        score -= 15
    elif rag_status == "RED":
        score -= 35
    
    # Open issues penalty
    issues = await db.issues.find({"engagement_id": engagement_id, "status": {"$in": ["OPEN", "IN_PROGRESS", "BLOCKED"]}}, {"_id": 0}).to_list(100)
    for issue in issues:
        severity = issue.get("severity", "LOW")
        if severity == "CRITICAL":
            score -= 15
        elif severity == "HIGH":
            score -= 8
        elif severity == "MEDIUM":
            score -= 4
        else:
            score -= 2
    
    # High/High risks penalty
    risks = await db.risks.find({
        "engagement_id": engagement_id, 
        "status": "OPEN",
        "probability": "HIGH",
        "impact": "HIGH"
    }, {"_id": 0}).to_list(100)
    score -= len(risks) * 10
    
    # Missing pulse this week
    week_start = get_current_week_start()
    current_pulse = await db.weekly_pulses.find_one({
        "engagement_id": engagement_id,
        "week_start_date": week_start.isoformat()
    }, {"_id": 0})
    if not current_pulse:
        score -= 10
    
    return max(0, score)

async def get_current_user(request: Request) -> Optional[dict]:
    """Get current user from session token"""
    # Check cookie first
    session_token = request.cookies.get("session_token")
    
    # Fallback to Authorization header
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]
    
    if not session_token:
        return None
    
    session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session:
        return None
    
    # Check expiry
    expires_at = session.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        return None
    
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    return deserialize_doc(user) if user else None

async def require_auth(request: Request) -> dict:
    """Require authentication"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user

async def require_role(request: Request, roles: List[UserRole]) -> dict:
    """Require specific roles"""
    user = await require_auth(request)
    if user["role"] not in [r.value for r in roles]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    return user

async def log_activity(actor_user_id: str, entity_type: EntityType, entity_id: str, action: ActionType, message: str, engagement_id: str = None):
    """Log an activity"""
    log = ActivityLog(
        actor_user_id=actor_user_id,
        engagement_id=engagement_id,
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        message=message
    )
    await db.activity_logs.insert_one(serialize_doc(log.model_dump()))

# ===================== AUTH ENDPOINTS =====================
@api_router.post("/auth/session")
async def create_session(request: Request, response: Response):
    """Exchange session_id for session_token"""
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    # Call Emergent Auth API
    async with httpx.AsyncClient() as client:
        try:
            auth_response = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id}
            )
            if auth_response.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid session")
            
            auth_data = auth_response.json()
        except Exception as e:
            logging.error(f"Auth error: {e}")
            raise HTTPException(status_code=401, detail="Authentication failed")
    
    # Check if user exists
    email = auth_data.get("email")
    existing_user = await db.users.find_one({"email": email}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
        # Update user info
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {
                "name": auth_data.get("name", existing_user.get("name")),
                "picture": auth_data.get("picture"),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
    else:
        # Create new user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        new_user = User(
            user_id=user_id,
            name=auth_data.get("name", ""),
            email=email,
            picture=auth_data.get("picture"),
            role=UserRole.CONSULTANT  # Default role
        )
        await db.users.insert_one(serialize_doc(new_user.model_dump()))
    
    # Create session
    session_token = auth_data.get("session_token", f"session_{uuid.uuid4().hex}")
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60
    )
    
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return deserialize_doc(user)

@api_router.get("/auth/me")
async def get_me(request: Request):
    """Get current user"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    """Logout user"""
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out"}

# ===================== USER ENDPOINTS =====================
@api_router.get("/users", response_model=List[User])
async def get_users(request: Request):
    """Get all users (Admin/Lead only)"""
    await require_role(request, [UserRole.ADMIN, UserRole.LEAD])
    users = await db.users.find({}, {"_id": 0}).to_list(1000)
    return [deserialize_doc(u) for u in users]

@api_router.get("/users/{user_id}")
async def get_user(user_id: str, request: Request):
    """Get user by ID"""
    current_user = await require_auth(request)
    if current_user["user_id"] != user_id and current_user["role"] not in ["ADMIN", "LEAD"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return deserialize_doc(user)

@api_router.post("/users", response_model=User)
async def create_user(user_data: UserCreate, request: Request):
    """Create a new user (Admin only)"""
    await require_role(request, [UserRole.ADMIN])
    
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")
    
    user = User(**user_data.model_dump())
    await db.users.insert_one(serialize_doc(user.model_dump()))
    return user

@api_router.put("/users/{user_id}")
async def update_user(user_id: str, user_data: UserUpdate, request: Request):
    """Update a user (Admin only)"""
    await require_role(request, [UserRole.ADMIN])
    
    update_data = {k: v for k, v in user_data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.users.update_one({"user_id": user_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return deserialize_doc(user)

# ===================== CLIENT ENDPOINTS =====================
@api_router.get("/clients", response_model=List[Client])
async def get_clients(request: Request):
    """Get all clients"""
    await require_role(request, [UserRole.ADMIN, UserRole.LEAD])
    clients = await db.clients.find({}, {"_id": 0}).to_list(1000)
    return [deserialize_doc(c) for c in clients]

@api_router.get("/clients/{client_id}")
async def get_client(client_id: str, request: Request):
    """Get client by ID"""
    await require_role(request, [UserRole.ADMIN, UserRole.LEAD])
    client = await db.clients.find_one({"client_id": client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return deserialize_doc(client)

@api_router.post("/clients", response_model=Client)
async def create_client(client_data: ClientCreate, request: Request):
    """Create a new client"""
    user = await require_role(request, [UserRole.ADMIN])
    client = Client(**client_data.model_dump())
    await db.clients.insert_one(serialize_doc(client.model_dump()))
    await log_activity(user["user_id"], EntityType.ENGAGEMENT, client.client_id, ActionType.CREATE, f"Created client: {client.client_name}")
    return client

@api_router.put("/clients/{client_id}")
async def update_client(client_id: str, client_data: ClientCreate, request: Request):
    """Update a client"""
    user = await require_role(request, [UserRole.ADMIN])
    
    update_data = client_data.model_dump()
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.clients.update_one({"client_id": client_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Client not found")
    
    client = await db.clients.find_one({"client_id": client_id}, {"_id": 0})
    return deserialize_doc(client)

@api_router.delete("/clients/{client_id}")
async def delete_client(client_id: str, request: Request):
    """Delete a client"""
    await require_role(request, [UserRole.ADMIN])
    result = await db.clients.delete_one({"client_id": client_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Client not found")
    return {"message": "Client deleted"}

# ===================== ENGAGEMENT ENDPOINTS =====================
@api_router.get("/engagements")
async def get_engagements(request: Request, client_id: str = None, consultant_user_id: str = None, rag_status: str = None, is_active: bool = None):
    """Get engagements with optional filters"""
    user = await require_auth(request)
    
    query = {}
    if user["role"] == "CONSULTANT":
        query["consultant_user_id"] = user["user_id"]
    else:
        if client_id:
            query["client_id"] = client_id
        if consultant_user_id:
            query["consultant_user_id"] = consultant_user_id
        if rag_status:
            query["rag_status"] = rag_status
        if is_active is not None:
            query["is_active"] = is_active
    
    engagements = await db.engagements.find(query, {"_id": 0}).to_list(1000)
    
    # Enrich with client info and recalculate health scores
    result = []
    for eng in engagements:
        eng = deserialize_doc(eng)
        # Get client info
        client = await db.clients.find_one({"client_id": eng["client_id"]}, {"_id": 0})
        eng["client"] = deserialize_doc(client) if client else None
        # Get consultant info
        if eng.get("consultant_user_id"):
            consultant = await db.users.find_one({"user_id": eng["consultant_user_id"]}, {"_id": 0})
            eng["consultant"] = deserialize_doc(consultant) if consultant else None
        # Recalculate health score
        eng["health_score"] = await calculate_health_score(eng["engagement_id"])
        # Get open issues count by severity
        issues = await db.issues.find({"engagement_id": eng["engagement_id"], "status": {"$in": ["OPEN", "IN_PROGRESS", "BLOCKED"]}}, {"_id": 0}).to_list(100)
        eng["issues_summary"] = {
            "critical": len([i for i in issues if i.get("severity") == "CRITICAL"]),
            "high": len([i for i in issues if i.get("severity") == "HIGH"]),
            "medium": len([i for i in issues if i.get("severity") == "MEDIUM"]),
            "low": len([i for i in issues if i.get("severity") == "LOW"])
        }
        # Get open risks count
        risks = await db.risks.find({"engagement_id": eng["engagement_id"], "status": "OPEN"}, {"_id": 0}).to_list(100)
        eng["risks_count"] = len(risks)
        result.append(eng)
    
    return result

@api_router.get("/engagements/{engagement_id}")
async def get_engagement(engagement_id: str, request: Request):
    """Get engagement by ID"""
    user = await require_auth(request)
    
    engagement = await db.engagements.find_one({"engagement_id": engagement_id}, {"_id": 0})
    if not engagement:
        raise HTTPException(status_code=404, detail="Engagement not found")
    
    if user["role"] == "CONSULTANT" and engagement.get("consultant_user_id") != user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    engagement = deserialize_doc(engagement)
    
    # Enrich with related data
    client = await db.clients.find_one({"client_id": engagement["client_id"]}, {"_id": 0})
    engagement["client"] = deserialize_doc(client) if client else None
    
    if engagement.get("consultant_user_id"):
        consultant = await db.users.find_one({"user_id": engagement["consultant_user_id"]}, {"_id": 0})
        engagement["consultant"] = deserialize_doc(consultant) if consultant else None
    
    engagement["health_score"] = await calculate_health_score(engagement_id)
    
    return engagement

@api_router.post("/engagements", response_model=Engagement)
async def create_engagement(engagement_data: EngagementCreate, request: Request):
    """Create a new engagement"""
    user = await require_role(request, [UserRole.ADMIN])
    
    # Check if consultant is already assigned to another active engagement
    if engagement_data.consultant_user_id:
        existing = await db.engagements.find_one({
            "consultant_user_id": engagement_data.consultant_user_id,
            "is_active": True
        }, {"_id": 0})
        if existing:
            raise HTTPException(status_code=400, detail="Consultant is already assigned to an active engagement")
    
    # Check if engagement code is unique
    existing_code = await db.engagements.find_one({"engagement_code": engagement_data.engagement_code}, {"_id": 0})
    if existing_code:
        raise HTTPException(status_code=400, detail="Engagement code already exists")
    
    engagement = Engagement(**engagement_data.model_dump())
    await db.engagements.insert_one(serialize_doc(engagement.model_dump()))
    await log_activity(user["user_id"], EntityType.ENGAGEMENT, engagement.engagement_id, ActionType.CREATE, f"Created engagement: {engagement.engagement_name}", engagement.engagement_id)
    return engagement

@api_router.put("/engagements/{engagement_id}")
async def update_engagement(engagement_id: str, engagement_data: EngagementUpdate, request: Request):
    """Update an engagement"""
    user = await require_role(request, [UserRole.ADMIN, UserRole.LEAD])
    
    existing = await db.engagements.find_one({"engagement_id": engagement_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Engagement not found")
    
    update_data = {k: v for k, v in engagement_data.model_dump().items() if v is not None}
    
    # Check consultant assignment
    if "consultant_user_id" in update_data and update_data["consultant_user_id"]:
        other = await db.engagements.find_one({
            "consultant_user_id": update_data["consultant_user_id"],
            "is_active": True,
            "engagement_id": {"$ne": engagement_id}
        }, {"_id": 0})
        if other:
            raise HTTPException(status_code=400, detail="Consultant is already assigned to another active engagement")
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Serialize enums and datetimes
    for key, value in update_data.items():
        if isinstance(value, Enum):
            update_data[key] = value.value
        elif isinstance(value, datetime):
            update_data[key] = value.isoformat()
    
    await db.engagements.update_one({"engagement_id": engagement_id}, {"$set": update_data})
    await log_activity(user["user_id"], EntityType.ENGAGEMENT, engagement_id, ActionType.UPDATE, f"Updated engagement", engagement_id)
    
    engagement = await db.engagements.find_one({"engagement_id": engagement_id}, {"_id": 0})
    return deserialize_doc(engagement)

@api_router.delete("/engagements/{engagement_id}")
async def delete_engagement(engagement_id: str, request: Request):
    """Delete an engagement"""
    await require_role(request, [UserRole.ADMIN])
    result = await db.engagements.delete_one({"engagement_id": engagement_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Engagement not found")
    return {"message": "Engagement deleted"}

# ===================== WEEKLY PULSE ENDPOINTS =====================
@api_router.get("/pulses")
async def get_pulses(request: Request, engagement_id: str = None, limit: int = 50):
    """Get pulses with optional filters"""
    user = await require_auth(request)
    
    query = {}
    if user["role"] == "CONSULTANT":
        query["consultant_user_id"] = user["user_id"]
    elif engagement_id:
        query["engagement_id"] = engagement_id
    
    pulses = await db.weekly_pulses.find(query, {"_id": 0}).sort("week_start_date", -1).to_list(limit)
    return [deserialize_doc(p) for p in pulses]

@api_router.get("/pulses/current-week/{engagement_id}")
async def get_current_week_pulse(engagement_id: str, request: Request):
    """Get pulse for current week"""
    user = await require_auth(request)
    
    # Check access
    engagement = await db.engagements.find_one({"engagement_id": engagement_id}, {"_id": 0})
    if not engagement:
        raise HTTPException(status_code=404, detail="Engagement not found")
    
    if user["role"] == "CONSULTANT" and engagement.get("consultant_user_id") != user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    week_start = get_current_week_start()
    pulse = await db.weekly_pulses.find_one({
        "engagement_id": engagement_id,
        "week_start_date": week_start.isoformat()
    }, {"_id": 0})
    
    if not pulse:
        return None
    
    return deserialize_doc(pulse)

@api_router.get("/pulses/{pulse_id}")
async def get_pulse(pulse_id: str, request: Request):
    """Get pulse by ID"""
    user = await require_auth(request)
    
    pulse = await db.weekly_pulses.find_one({"pulse_id": pulse_id}, {"_id": 0})
    if not pulse:
        raise HTTPException(status_code=404, detail="Pulse not found")
    
    if user["role"] == "CONSULTANT" and pulse.get("consultant_user_id") != user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return deserialize_doc(pulse)

@api_router.post("/pulses")
async def create_pulse(pulse_data: WeeklyPulseCreate, request: Request):
    """Create a new pulse"""
    user = await require_auth(request)
    
    # Check engagement access
    engagement = await db.engagements.find_one({"engagement_id": pulse_data.engagement_id}, {"_id": 0})
    if not engagement:
        raise HTTPException(status_code=404, detail="Engagement not found")
    
    if user["role"] == "CONSULTANT" and engagement.get("consultant_user_id") != user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    week_start = get_current_week_start()
    week_end = get_week_end(week_start)
    
    # Check if pulse already exists for this week
    existing = await db.weekly_pulses.find_one({
        "engagement_id": pulse_data.engagement_id,
        "week_start_date": week_start.isoformat()
    }, {"_id": 0})
    
    if existing:
        raise HTTPException(status_code=400, detail="Pulse already exists for this week. Use PUT to update.")
    
    pulse = WeeklyPulse(
        **pulse_data.model_dump(),
        consultant_user_id=user["user_id"],
        week_start_date=week_start,
        week_end_date=week_end
    )
    
    await db.weekly_pulses.insert_one(serialize_doc(pulse.model_dump()))
    
    # Update engagement last_pulse_date and potentially RAG status
    update_data = {"last_pulse_date": pulse.submitted_at.isoformat()}
    if not pulse_data.is_draft:
        update_data["rag_status"] = pulse_data.rag_status_this_week.value
    
    await db.engagements.update_one(
        {"engagement_id": pulse_data.engagement_id},
        {"$set": update_data}
    )
    
    await log_activity(user["user_id"], EntityType.PULSE, pulse.pulse_id, ActionType.CREATE, f"Created pulse for week of {week_start.strftime('%Y-%m-%d')}", pulse_data.engagement_id)
    
    return pulse

@api_router.put("/pulses/{pulse_id}")
async def update_pulse(pulse_id: str, pulse_data: WeeklyPulseUpdate, request: Request):
    """Update a pulse"""
    user = await require_auth(request)
    
    pulse = await db.weekly_pulses.find_one({"pulse_id": pulse_id}, {"_id": 0})
    if not pulse:
        raise HTTPException(status_code=404, detail="Pulse not found")
    
    # Check access - only owner or admin can update
    if user["role"] == "CONSULTANT" and pulse.get("consultant_user_id") != user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Check if editable (before Sunday 11:59pm)
    week_end = pulse.get("week_end_date")
    if isinstance(week_end, str):
        week_end = datetime.fromisoformat(week_end)
    if week_end.tzinfo is None:
        week_end = week_end.replace(tzinfo=timezone.utc)
    
    if datetime.now(timezone.utc) > week_end and user["role"] != "ADMIN":
        raise HTTPException(status_code=400, detail="Cannot edit pulse after the week has ended")
    
    update_data = {k: v for k, v in pulse_data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Serialize enums
    for key, value in update_data.items():
        if isinstance(value, Enum):
            update_data[key] = value.value
    
    await db.weekly_pulses.update_one({"pulse_id": pulse_id}, {"$set": update_data})
    
    # Update engagement RAG if not draft
    if pulse_data.rag_status_this_week and not pulse_data.is_draft:
        await db.engagements.update_one(
            {"engagement_id": pulse["engagement_id"]},
            {"$set": {"rag_status": pulse_data.rag_status_this_week.value}}
        )
    
    await log_activity(user["user_id"], EntityType.PULSE, pulse_id, ActionType.UPDATE, "Updated pulse", pulse["engagement_id"])
    
    updated_pulse = await db.weekly_pulses.find_one({"pulse_id": pulse_id}, {"_id": 0})
    return deserialize_doc(updated_pulse)

# ===================== MILESTONE ENDPOINTS =====================
@api_router.get("/milestones")
async def get_milestones(request: Request, engagement_id: str = None):
    """Get milestones"""
    user = await require_auth(request)
    
    query = {}
    if engagement_id:
        query["engagement_id"] = engagement_id
    elif user["role"] == "CONSULTANT":
        engagement = await db.engagements.find_one({"consultant_user_id": user["user_id"]}, {"_id": 0})
        if engagement:
            query["engagement_id"] = engagement["engagement_id"]
    
    milestones = await db.milestones.find(query, {"_id": 0}).sort("due_date", 1).to_list(1000)
    return [deserialize_doc(m) for m in milestones]

@api_router.post("/milestones", response_model=Milestone)
async def create_milestone(milestone_data: MilestoneCreate, request: Request):
    """Create a milestone"""
    user = await require_role(request, [UserRole.ADMIN, UserRole.LEAD])
    
    milestone = Milestone(**milestone_data.model_dump())
    await db.milestones.insert_one(serialize_doc(milestone.model_dump()))
    await log_activity(user["user_id"], EntityType.MILESTONE, milestone.milestone_id, ActionType.CREATE, f"Created milestone: {milestone.title}", milestone_data.engagement_id)
    return milestone

@api_router.put("/milestones/{milestone_id}")
async def update_milestone(milestone_id: str, milestone_data: MilestoneUpdate, request: Request):
    """Update a milestone"""
    user = await require_role(request, [UserRole.ADMIN, UserRole.LEAD])
    
    update_data = {k: v for k, v in milestone_data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    for key, value in update_data.items():
        if isinstance(value, Enum):
            update_data[key] = value.value
        elif isinstance(value, datetime):
            update_data[key] = value.isoformat()
    
    result = await db.milestones.update_one({"milestone_id": milestone_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Milestone not found")
    
    milestone = await db.milestones.find_one({"milestone_id": milestone_id}, {"_id": 0})
    await log_activity(user["user_id"], EntityType.MILESTONE, milestone_id, ActionType.UPDATE, "Updated milestone", milestone.get("engagement_id"))
    return deserialize_doc(milestone)

@api_router.delete("/milestones/{milestone_id}")
async def delete_milestone(milestone_id: str, request: Request):
    """Delete a milestone"""
    await require_role(request, [UserRole.ADMIN])
    result = await db.milestones.delete_one({"milestone_id": milestone_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Milestone not found")
    return {"message": "Milestone deleted"}

# ===================== RISK ENDPOINTS =====================
@api_router.get("/risks")
async def get_risks(request: Request, engagement_id: str = None, status: str = None):
    """Get risks"""
    user = await require_auth(request)
    
    query = {}
    if engagement_id:
        query["engagement_id"] = engagement_id
    elif user["role"] == "CONSULTANT":
        engagement = await db.engagements.find_one({"consultant_user_id": user["user_id"]}, {"_id": 0})
        if engagement:
            query["engagement_id"] = engagement["engagement_id"]
    
    if status:
        query["status"] = status
    
    risks = await db.risks.find(query, {"_id": 0}).to_list(1000)
    return [deserialize_doc(r) for r in risks]

@api_router.post("/risks", response_model=Risk)
async def create_risk(risk_data: RiskCreate, request: Request):
    """Create a risk"""
    user = await require_role(request, [UserRole.ADMIN, UserRole.LEAD])
    
    risk = Risk(**risk_data.model_dump())
    await db.risks.insert_one(serialize_doc(risk.model_dump()))
    await log_activity(user["user_id"], EntityType.RISK, risk.risk_id, ActionType.CREATE, f"Created risk: {risk.title}", risk_data.engagement_id)
    return risk

@api_router.put("/risks/{risk_id}")
async def update_risk(risk_id: str, risk_data: RiskUpdate, request: Request):
    """Update a risk"""
    user = await require_role(request, [UserRole.ADMIN, UserRole.LEAD])
    
    update_data = {k: v for k, v in risk_data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    for key, value in update_data.items():
        if isinstance(value, Enum):
            update_data[key] = value.value
        elif isinstance(value, datetime):
            update_data[key] = value.isoformat()
    
    result = await db.risks.update_one({"risk_id": risk_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Risk not found")
    
    risk = await db.risks.find_one({"risk_id": risk_id}, {"_id": 0})
    await log_activity(user["user_id"], EntityType.RISK, risk_id, ActionType.UPDATE, "Updated risk", risk.get("engagement_id"))
    return deserialize_doc(risk)

@api_router.delete("/risks/{risk_id}")
async def delete_risk(risk_id: str, request: Request):
    """Delete a risk"""
    await require_role(request, [UserRole.ADMIN])
    result = await db.risks.delete_one({"risk_id": risk_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Risk not found")
    return {"message": "Risk deleted"}

# ===================== ISSUE ENDPOINTS =====================
@api_router.get("/issues")
async def get_issues(request: Request, engagement_id: str = None, status: str = None, severity: str = None):
    """Get issues"""
    user = await require_auth(request)
    
    query = {}
    if engagement_id:
        query["engagement_id"] = engagement_id
    elif user["role"] == "CONSULTANT":
        engagement = await db.engagements.find_one({"consultant_user_id": user["user_id"]}, {"_id": 0})
        if engagement:
            query["engagement_id"] = engagement["engagement_id"]
    
    if status:
        query["status"] = status
    if severity:
        query["severity"] = severity
    
    issues = await db.issues.find(query, {"_id": 0}).to_list(1000)
    return [deserialize_doc(i) for i in issues]

@api_router.post("/issues", response_model=Issue)
async def create_issue(issue_data: IssueCreate, request: Request):
    """Create an issue"""
    user = await require_role(request, [UserRole.ADMIN, UserRole.LEAD])
    
    issue = Issue(**issue_data.model_dump())
    await db.issues.insert_one(serialize_doc(issue.model_dump()))
    await log_activity(user["user_id"], EntityType.ISSUE, issue.issue_id, ActionType.CREATE, f"Created issue: {issue.title}", issue_data.engagement_id)
    return issue

@api_router.put("/issues/{issue_id}")
async def update_issue(issue_id: str, issue_data: IssueUpdate, request: Request):
    """Update an issue"""
    user = await require_role(request, [UserRole.ADMIN, UserRole.LEAD])
    
    update_data = {k: v for k, v in issue_data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    for key, value in update_data.items():
        if isinstance(value, Enum):
            update_data[key] = value.value
        elif isinstance(value, datetime):
            update_data[key] = value.isoformat()
    
    result = await db.issues.update_one({"issue_id": issue_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Issue not found")
    
    issue = await db.issues.find_one({"issue_id": issue_id}, {"_id": 0})
    await log_activity(user["user_id"], EntityType.ISSUE, issue_id, ActionType.UPDATE, "Updated issue", issue.get("engagement_id"))
    return deserialize_doc(issue)

@api_router.delete("/issues/{issue_id}")
async def delete_issue(issue_id: str, request: Request):
    """Delete an issue"""
    await require_role(request, [UserRole.ADMIN])
    result = await db.issues.delete_one({"issue_id": issue_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Issue not found")
    return {"message": "Issue deleted"}

# ===================== CONTACT ENDPOINTS =====================
@api_router.get("/contacts")
async def get_contacts(request: Request, engagement_id: str = None):
    """Get contacts"""
    user = await require_auth(request)
    
    query = {}
    if engagement_id:
        query["engagement_id"] = engagement_id
    elif user["role"] == "CONSULTANT":
        engagement = await db.engagements.find_one({"consultant_user_id": user["user_id"]}, {"_id": 0})
        if engagement:
            query["engagement_id"] = engagement["engagement_id"]
    
    contacts = await db.contacts.find(query, {"_id": 0}).to_list(1000)
    return [deserialize_doc(c) for c in contacts]

@api_router.post("/contacts", response_model=Contact)
async def create_contact(contact_data: ContactCreate, request: Request):
    """Create a contact"""
    user = await require_role(request, [UserRole.ADMIN, UserRole.LEAD])
    
    contact = Contact(**contact_data.model_dump())
    await db.contacts.insert_one(serialize_doc(contact.model_dump()))
    await log_activity(user["user_id"], EntityType.CONTACT, contact.contact_id, ActionType.CREATE, f"Created contact: {contact.name}", contact_data.engagement_id)
    return contact

@api_router.put("/contacts/{contact_id}")
async def update_contact(contact_id: str, contact_data: ContactUpdate, request: Request):
    """Update a contact"""
    user = await require_role(request, [UserRole.ADMIN, UserRole.LEAD])
    
    update_data = {k: v for k, v in contact_data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    for key, value in update_data.items():
        if isinstance(value, Enum):
            update_data[key] = value.value
    
    result = await db.contacts.update_one({"contact_id": contact_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    contact = await db.contacts.find_one({"contact_id": contact_id}, {"_id": 0})
    await log_activity(user["user_id"], EntityType.CONTACT, contact_id, ActionType.UPDATE, "Updated contact", contact.get("engagement_id"))
    return deserialize_doc(contact)

@api_router.delete("/contacts/{contact_id}")
async def delete_contact(contact_id: str, request: Request):
    """Delete a contact"""
    await require_role(request, [UserRole.ADMIN])
    result = await db.contacts.delete_one({"contact_id": contact_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contact not found")
    return {"message": "Contact deleted"}

# ===================== ACTIVITY LOG ENDPOINTS =====================
@api_router.get("/activity-logs")
async def get_activity_logs(request: Request, engagement_id: str = None, limit: int = 50):
    """Get activity logs"""
    await require_role(request, [UserRole.ADMIN, UserRole.LEAD])
    
    query = {}
    if engagement_id:
        query["engagement_id"] = engagement_id
    
    logs = await db.activity_logs.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return [deserialize_doc(l) for l in logs]

# ===================== DASHBOARD ENDPOINTS =====================
@api_router.get("/dashboard/summary")
async def get_dashboard_summary(request: Request):
    """Get dashboard summary for leaders"""
    await require_role(request, [UserRole.ADMIN, UserRole.LEAD])
    
    # RAG counts
    rag_counts = {
        "GREEN": await db.engagements.count_documents({"rag_status": "GREEN", "is_active": True}),
        "AMBER": await db.engagements.count_documents({"rag_status": "AMBER", "is_active": True}),
        "RED": await db.engagements.count_documents({"rag_status": "RED", "is_active": True})
    }
    
    # Missing pulses this week
    week_start = get_current_week_start()
    all_active_engagements = await db.engagements.find({"is_active": True}, {"_id": 0}).to_list(1000)
    
    missing_pulses = []
    for eng in all_active_engagements:
        pulse = await db.weekly_pulses.find_one({
            "engagement_id": eng["engagement_id"],
            "week_start_date": week_start.isoformat()
        }, {"_id": 0})
        if not pulse:
            eng = deserialize_doc(eng)
            if eng.get("consultant_user_id"):
                consultant = await db.users.find_one({"user_id": eng["consultant_user_id"]}, {"_id": 0})
                eng["consultant"] = deserialize_doc(consultant) if consultant else None
            client = await db.clients.find_one({"client_id": eng["client_id"]}, {"_id": 0})
            eng["client"] = deserialize_doc(client) if client else None
            missing_pulses.append(eng)
    
    # Top issues by severity
    critical_issues = await db.issues.find({"severity": "CRITICAL", "status": {"$in": ["OPEN", "IN_PROGRESS", "BLOCKED"]}}, {"_id": 0}).to_list(10)
    high_issues = await db.issues.find({"severity": "HIGH", "status": {"$in": ["OPEN", "IN_PROGRESS", "BLOCKED"]}}, {"_id": 0}).to_list(10)
    
    # Enrich issues with engagement info
    for issue in critical_issues + high_issues:
        eng = await db.engagements.find_one({"engagement_id": issue["engagement_id"]}, {"_id": 0})
        issue["engagement"] = deserialize_doc(eng) if eng else None
    
    # Top risks (high probability + high impact)
    high_risks = await db.risks.find({
        "probability": "HIGH",
        "impact": "HIGH",
        "status": "OPEN"
    }, {"_id": 0}).to_list(10)
    
    for risk in high_risks:
        eng = await db.engagements.find_one({"engagement_id": risk["engagement_id"]}, {"_id": 0})
        risk["engagement"] = deserialize_doc(eng) if eng else None
    
    # Milestones due in next 30 days
    now = datetime.now(timezone.utc)
    thirty_days = now + timedelta(days=30)
    upcoming_milestones = await db.milestones.find({
        "status": {"$nin": ["DONE", "BLOCKED"]},
    }, {"_id": 0}).to_list(100)
    
    # Filter by due_date
    filtered_milestones = []
    for ms in upcoming_milestones:
        due_date = ms.get("due_date")
        if isinstance(due_date, str):
            due_date = datetime.fromisoformat(due_date)
        if due_date.tzinfo is None:
            due_date = due_date.replace(tzinfo=timezone.utc)
        if now <= due_date <= thirty_days:
            eng = await db.engagements.find_one({"engagement_id": ms["engagement_id"]}, {"_id": 0})
            ms["engagement"] = deserialize_doc(eng) if eng else None
            filtered_milestones.append(deserialize_doc(ms))
    
    # Sort by due_date
    filtered_milestones.sort(key=lambda x: x.get("due_date", now))
    
    return {
        "rag_counts": rag_counts,
        "total_engagements": len(all_active_engagements),
        "missing_pulses": missing_pulses[:10],
        "missing_pulses_count": len(missing_pulses),
        "critical_issues": [deserialize_doc(i) for i in critical_issues],
        "high_issues": [deserialize_doc(i) for i in high_issues],
        "high_risks": [deserialize_doc(r) for r in high_risks],
        "upcoming_milestones": filtered_milestones[:10]
    }

@api_router.get("/dashboard/rag-trend/{engagement_id}")
async def get_rag_trend(engagement_id: str, request: Request):
    """Get RAG trend for last 8 weeks"""
    await require_auth(request)
    
    pulses = await db.weekly_pulses.find(
        {"engagement_id": engagement_id, "is_draft": False},
        {"_id": 0}
    ).sort("week_start_date", -1).to_list(8)
    
    # Reverse to show chronologically
    pulses.reverse()
    
    trend = []
    for pulse in pulses:
        pulse = deserialize_doc(pulse)
        trend.append({
            "week_start_date": pulse.get("week_start_date"),
            "rag_status": pulse.get("rag_status_this_week"),
            "pulse_id": pulse.get("pulse_id")
        })
    
    return trend

# ===================== SEED DATA ENDPOINT =====================
@api_router.post("/seed-data")
async def seed_demo_data(request: Request):
    """Seed demo data for testing"""
    # Check if data already exists
    existing_clients = await db.clients.count_documents({})
    if existing_clients > 0:
        return {"message": "Data already seeded", "seeded": False}
    
    # Create demo users
    users = [
        User(user_id="user_admin001", name="Sarah Mitchell", email="sarah.mitchell@firm.com", role=UserRole.ADMIN, picture="https://images.unsplash.com/photo-1659353220597-71b8c6a56259?w=150"),
        User(user_id="user_lead001", name="Michael Chen", email="michael.chen@firm.com", role=UserRole.LEAD, picture="https://images.unsplash.com/photo-1704627363842-a169b9743309?w=150"),
        User(user_id="user_cons001", name="Emily Rodriguez", email="emily.rodriguez@firm.com", role=UserRole.CONSULTANT),
        User(user_id="user_cons002", name="James Wilson", email="james.wilson@firm.com", role=UserRole.CONSULTANT),
        User(user_id="user_cons003", name="Priya Sharma", email="priya.sharma@firm.com", role=UserRole.CONSULTANT),
    ]
    
    for user in users:
        await db.users.insert_one(serialize_doc(user.model_dump()))
    
    # Create demo clients
    clients = [
        Client(client_id="client_001", client_name="TechCorp Industries", industry="Technology", primary_contact_name="John Smith", primary_contact_email="john.smith@techcorp.com"),
        Client(client_id="client_002", client_name="HealthPlus Medical", industry="Healthcare", primary_contact_name="Dr. Lisa Brown", primary_contact_email="lisa.brown@healthplus.com"),
        Client(client_id="client_003", client_name="Global Finance Corp", industry="Financial Services", primary_contact_name="Robert Johnson", primary_contact_email="r.johnson@globalfinance.com"),
    ]
    
    for client in clients:
        await db.clients.insert_one(serialize_doc(client.model_dump()))
    
    # Create demo engagements
    now = datetime.now(timezone.utc)
    engagements = [
        Engagement(
            engagement_id="eng_001",
            client_id="client_001",
            engagement_name="Digital Transformation Initiative",
            engagement_code="TC-DT-2024",
            consultant_user_id="user_cons001",
            start_date=now - timedelta(days=60),
            target_end_date=now + timedelta(days=120),
            rag_status=RAGStatus.GREEN,
            overall_summary="Major digital transformation project focusing on cloud migration and process automation.",
            health_score=85
        ),
        Engagement(
            engagement_id="eng_002",
            client_id="client_002",
            engagement_name="EHR System Implementation",
            engagement_code="HP-EHR-2024",
            consultant_user_id="user_cons002",
            start_date=now - timedelta(days=30),
            target_end_date=now + timedelta(days=180),
            rag_status=RAGStatus.AMBER,
            rag_reason="Vendor delays affecting timeline",
            overall_summary="Implementing new Electronic Health Records system across 5 hospital locations.",
            health_score=65
        ),
        Engagement(
            engagement_id="eng_003",
            client_id="client_003",
            engagement_name="Risk Management Framework",
            engagement_code="GF-RMF-2024",
            consultant_user_id="user_cons003",
            start_date=now - timedelta(days=90),
            target_end_date=now + timedelta(days=30),
            rag_status=RAGStatus.RED,
            rag_reason="Critical resource constraints and scope creep",
            overall_summary="Developing comprehensive risk management framework for regulatory compliance.",
            health_score=45
        ),
    ]
    
    for eng in engagements:
        await db.engagements.insert_one(serialize_doc(eng.model_dump()))
    
    # Create demo weekly pulses
    week_start = get_current_week_start()
    pulses = [
        WeeklyPulse(
            pulse_id="pulse_001",
            engagement_id="eng_001",
            consultant_user_id="user_cons001",
            week_start_date=week_start,
            week_end_date=get_week_end(week_start),
            rag_status_this_week=RAGStatus.GREEN,
            what_went_well="Successfully completed cloud migration for 3 business units. Team morale is high.",
            delivered_this_week="• Migrated CRM to AWS\n• Completed security audit\n• Trained 50 users on new system",
            issues_facing="Minor integration issues with legacy systems",
            roadblocks="None currently",
            plan_next_week="• Begin Phase 2 migration\n• Complete documentation\n• Start change management training",
            time_allocation=45,
            sentiment=Sentiment.HIGH
        ),
        WeeklyPulse(
            pulse_id="pulse_002",
            engagement_id="eng_002",
            consultant_user_id="user_cons002",
            week_start_date=week_start,
            week_end_date=get_week_end(week_start),
            rag_status_this_week=RAGStatus.AMBER,
            what_went_well="Completed requirements gathering for all 5 locations",
            delivered_this_week="• Requirements documentation\n• Vendor evaluation matrix\n• Initial system configuration",
            issues_facing="Vendor has delayed delivery by 2 weeks",
            roadblocks="Waiting on vendor hardware shipment",
            plan_next_week="• Continue parallel testing\n• Escalate vendor delays\n• Begin staff training prep",
            time_allocation=50,
            sentiment=Sentiment.OK
        ),
    ]
    
    # Add historical pulses for RAG trend
    for i in range(1, 8):
        past_week = week_start - timedelta(weeks=i)
        rag = RAGStatus.GREEN if i % 3 == 0 else (RAGStatus.AMBER if i % 3 == 1 else RAGStatus.RED)
        pulses.append(WeeklyPulse(
            pulse_id=f"pulse_hist_{i}",
            engagement_id="eng_003",
            consultant_user_id="user_cons003",
            week_start_date=past_week,
            week_end_date=get_week_end(past_week),
            rag_status_this_week=rag,
            what_went_well=f"Historical pulse {i}",
            delivered_this_week=f"Week {i} deliverables",
            submitted_at=past_week + timedelta(days=4)
        ))
    
    for pulse in pulses:
        await db.weekly_pulses.insert_one(serialize_doc(pulse.model_dump()))
    
    # Create demo milestones
    milestones = [
        Milestone(milestone_id="ms_001", engagement_id="eng_001", title="Phase 1 Complete", due_date=now + timedelta(days=7), status=MilestoneStatus.IN_PROGRESS, completion_percent=80, owner="Emily Rodriguez"),
        Milestone(milestone_id="ms_002", engagement_id="eng_001", title="User Training Complete", due_date=now + timedelta(days=30), status=MilestoneStatus.NOT_STARTED, owner="Training Team"),
        Milestone(milestone_id="ms_003", engagement_id="eng_002", title="System Go-Live", due_date=now + timedelta(days=60), status=MilestoneStatus.AT_RISK, completion_percent=30, owner="James Wilson"),
        Milestone(milestone_id="ms_004", engagement_id="eng_003", title="Framework Documentation", due_date=now + timedelta(days=14), status=MilestoneStatus.BLOCKED, completion_percent=60, owner="Priya Sharma"),
    ]
    
    for ms in milestones:
        await db.milestones.insert_one(serialize_doc(ms.model_dump()))
    
    # Create demo risks
    risks = [
        Risk(risk_id="risk_001", engagement_id="eng_001", title="Cloud Cost Overrun", description="Potential for cloud costs to exceed budget", category=RiskCategory.BUDGET, probability=Probability.MEDIUM, impact=Impact.HIGH, mitigation_plan="Implement cost monitoring and alerts", owner="Finance Team", status=RiskStatus.MITIGATING),
        Risk(risk_id="risk_002", engagement_id="eng_002", title="Vendor Dependency", description="Heavy reliance on single vendor for critical components", category=RiskCategory.DEPENDENCY, probability=Probability.HIGH, impact=Impact.HIGH, mitigation_plan="Identify backup vendors", owner="James Wilson", status=RiskStatus.OPEN),
        Risk(risk_id="risk_003", engagement_id="eng_003", title="Regulatory Changes", description="Upcoming regulatory changes may impact framework", category=RiskCategory.SCOPE, probability=Probability.HIGH, impact=Impact.HIGH, mitigation_plan="Monitor regulatory updates weekly", owner="Compliance Team", status=RiskStatus.OPEN),
    ]
    
    for risk in risks:
        await db.risks.insert_one(serialize_doc(risk.model_dump()))
    
    # Create demo issues
    issues = [
        Issue(issue_id="issue_001", engagement_id="eng_001", title="API Integration Failure", description="Third-party API returning intermittent errors", severity=IssueSeverity.MEDIUM, status=IssueStatus.IN_PROGRESS, owner="Dev Team"),
        Issue(issue_id="issue_002", engagement_id="eng_002", title="Hardware Delay", description="Critical server hardware delayed by vendor", severity=IssueSeverity.HIGH, status=IssueStatus.OPEN, owner="James Wilson", due_date=now + timedelta(days=7)),
        Issue(issue_id="issue_003", engagement_id="eng_003", title="Resource Shortage", description="Key SME unavailable for next 2 weeks", severity=IssueSeverity.CRITICAL, status=IssueStatus.OPEN, owner="Priya Sharma"),
        Issue(issue_id="issue_004", engagement_id="eng_003", title="Scope Creep", description="Client requesting additional features outside original scope", severity=IssueSeverity.HIGH, status=IssueStatus.OPEN, owner="Project Manager"),
    ]
    
    for issue in issues:
        await db.issues.insert_one(serialize_doc(issue.model_dump()))
    
    # Create demo contacts
    contacts = [
        Contact(contact_id="contact_001", engagement_id="eng_001", name="John Smith", title="CTO", email="john.smith@techcorp.com", phone="+1-555-0101", type=ContactType.CLIENT),
        Contact(contact_id="contact_002", engagement_id="eng_001", name="AWS Support", title="Technical Account Manager", email="support@aws.com", type=ContactType.VENDOR),
        Contact(contact_id="contact_003", engagement_id="eng_002", name="Dr. Lisa Brown", title="Chief Medical Officer", email="lisa.brown@healthplus.com", phone="+1-555-0102", type=ContactType.CLIENT),
        Contact(contact_id="contact_004", engagement_id="eng_003", name="Robert Johnson", title="CFO", email="r.johnson@globalfinance.com", phone="+1-555-0103", type=ContactType.CLIENT),
    ]
    
    for contact in contacts:
        await db.contacts.insert_one(serialize_doc(contact.model_dump()))
    
    return {"message": "Demo data seeded successfully", "seeded": True}

# ===================== ROOT ENDPOINT =====================
@api_router.get("/")
async def root():
    return {"message": "Engagement Pulse API", "version": "1.0.0"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
