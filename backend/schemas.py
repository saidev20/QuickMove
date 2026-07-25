from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


# ── Customer ──────────────────────────────────────────────────────────

class CustomerCreate(BaseModel):
    name: str
    phone: str = ""
    email: str = ""
    current_city: str = ""
    destination_city: str = ""
    move_date: str = ""
    family_size: int = 1
    apartment_preference: str = ""
    budget: str = ""
    utility_requirements: list[str] = []
    documents_required: list[str] = []
    notes: str = ""
    assigned_executive: str = ""


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    current_city: Optional[str] = None
    destination_city: Optional[str] = None
    move_date: Optional[str] = None
    family_size: Optional[int] = None
    apartment_preference: Optional[str] = None
    budget: Optional[str] = None
    utility_requirements: Optional[list[str]] = None
    documents_required: Optional[list[str]] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    assigned_executive: Optional[str] = None


class ProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    customer_id: int
    status: str
    completion_pct: float
    ai_summary: str
    risk_level: str
    created_at: datetime
    updated_at: datetime


class TaskBriefResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    project_id: int
    category: str
    title: str
    priority: str
    status: str
    owner: str
    due_date: str
    risk_level: str


class DocumentBriefResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    filename: str
    file_type: str
    category: str
    uploaded_at: datetime


class CustomerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    phone: str
    email: str
    current_city: str
    destination_city: str
    move_date: str
    family_size: int
    apartment_preference: str
    budget: str
    utility_requirements: list
    documents_required: list
    notes: str
    status: str
    assigned_executive: str
    created_at: datetime
    updated_at: datetime
    project: Optional[ProjectResponse] = None


class CustomerDetailResponse(CustomerResponse):
    tasks: list[TaskBriefResponse] = []
    documents: list[DocumentBriefResponse] = []


# ── Task ──────────────────────────────────────────────────────────────

class TaskCreate(BaseModel):
    project_id: int
    category: str
    title: str
    description: str = ""
    priority: str = "medium"
    status: str = "pending"
    owner: str = ""
    due_date: str = ""
    estimated_duration: str = ""
    risk_level: str = "low"
    dependencies: list = []
    checklist: list = []
    suggested_action: str = ""
    sort_order: int = 0
    vendor_id: Optional[int] = None


class TaskUpdate(BaseModel):
    category: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    owner: Optional[str] = None
    due_date: Optional[str] = None
    estimated_duration: Optional[str] = None
    risk_level: Optional[str] = None
    dependencies: Optional[list] = None
    checklist: Optional[list] = None
    suggested_action: Optional[str] = None
    sort_order: Optional[int] = None
    vendor_id: Optional[int] = None


class VendorBriefResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    type: str


class TaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    project_id: int
    category: str
    title: str
    description: str
    priority: str
    status: str
    owner: str
    due_date: str
    estimated_duration: str
    risk_level: str
    dependencies: list
    checklist: list
    suggested_action: str
    sort_order: int
    vendor_id: Optional[int] = None
    vendor: Optional[VendorBriefResponse] = None
    created_at: datetime
    updated_at: datetime
    customer_name: Optional[str] = None


# ── Vendor ────────────────────────────────────────────────────────────

class VendorCreate(BaseModel):
    name: str
    type: str
    rating: float = 4.0
    past_jobs: int = 0
    avg_delay_days: float = 0.0
    phone: str = ""
    email: str = ""
    address: str = ""
    city: str = ""
    availability: str = "available"


class VendorUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    rating: Optional[float] = None
    past_jobs: Optional[int] = None
    avg_delay_days: Optional[float] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    availability: Optional[str] = None


class VendorResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    type: str
    rating: float
    past_jobs: int
    avg_delay_days: float
    phone: str
    email: str
    address: str
    city: str
    availability: str
    created_at: datetime


# ── Document ──────────────────────────────────────────────────────────

class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    customer_id: int
    filename: str
    file_type: str
    file_path: str
    category: str
    uploaded_at: datetime


# ── Activity Log ──────────────────────────────────────────────────────

class ActivityLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    project_id: int
    action: str
    details: str
    actor: str
    timestamp: datetime


# ── Notification ──────────────────────────────────────────────────────

class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    type: str
    message: str
    severity: str
    related_entity_type: str
    related_entity_id: int
    is_read: bool
    created_at: datetime


class ApprovalRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    project_id: int
    task_id: Optional[int] = None
    agent_name: str
    title: str
    description: str
    proposed_action: str
    payload: dict
    status: str
    admin_feedback: str
    created_at: datetime
    resolved_at: Optional[datetime] = None


class StateCheckpointResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    project_id: int
    agent_name: str
    action_description: str
    snapshot_before: dict
    snapshot_after: dict
    is_reverted: bool
    created_at: datetime



# ── Analytics ─────────────────────────────────────────────────────────

class AnalyticsOverview(BaseModel):
    active_relocations: int
    completed_relocations: int
    total_customers: int
    total_tasks: int
    completed_tasks: int
    delayed_tasks: int
    blocked_tasks: int
    avg_completion_pct: float
    overdue_tasks: int
    tasks_due_today: int


class CityMetric(BaseModel):
    city: str
    count: int


class TrendPoint(BaseModel):
    date: str
    completed: int
    created: int


class VendorPerformance(BaseModel):
    name: str
    type: str
    rating: float
    avg_delay: float
    jobs: int


class BlockerMetric(BaseModel):
    blocker: str
    count: int


class AnalyticsDashboard(BaseModel):
    overview: AnalyticsOverview
    by_city: list[CityMetric]
    trends: list[TrendPoint]
    vendor_performance: list[VendorPerformance]
    common_blockers: list[BlockerMetric]
    status_distribution: dict[str, int]
    priority_distribution: dict[str, int]
    category_distribution: dict[str, int]


# ── AI ────────────────────────────────────────────────────────────────

class AIChatRequest(BaseModel):
    message: str
    context: Optional[dict] = None


class AIChatResponse(BaseModel):
    response: str
    suggestions: list[str] = []


class AIRisk(BaseModel):
    type: str
    severity: str
    message: str
    customer_name: Optional[str] = None
    customer_id: Optional[int] = None
    task_id: Optional[int] = None


class AIRecommendation(BaseModel):
    type: str
    priority: str
    message: str
    action: str


class AIDailySummary(BaseModel):
    date: str
    priorities: list[str]
    pending_approvals: list[str]
    high_risk: list[str]
    follow_ups: list[str]
    deadlines: list[str]
    blocked: list[str]
    stats: dict


# ── Search ────────────────────────────────────────────────────────────

class SearchResult(BaseModel):
    type: str
    id: int
    title: str
    subtitle: str
    status: Optional[str] = None
    meta: Optional[str] = None
