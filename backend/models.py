from sqlalchemy import Column, Integer, String, Float, Text, DateTime, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    phone = Column(String(20), default="")
    email = Column(String(255), default="")
    current_city = Column(String(100), default="")
    destination_city = Column(String(100), default="")
    move_date = Column(String(20), default="")
    family_size = Column(Integer, default=1)
    apartment_preference = Column(String(50), default="")
    budget = Column(String(100), default="")
    utility_requirements = Column(JSON, default=list)
    documents_required = Column(JSON, default=list)
    notes = Column(Text, default="")
    status = Column(String(20), default="active")
    assigned_executive = Column(String(100), default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("RelocationProject", back_populates="customer", uselist=False, cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="customer", cascade="all, delete-orphan")


class RelocationProject(Base):
    __tablename__ = "relocation_projects"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    status = Column(String(20), default="planning")
    completion_pct = Column(Float, default=0.0)
    ai_summary = Column(Text, default="")
    risk_level = Column(String(20), default="low")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    customer = relationship("Customer", back_populates="project")
    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan")
    activity_logs = relationship("ActivityLog", back_populates="project", cascade="all, delete-orphan")


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("relocation_projects.id"), nullable=False)
    category = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, default="")
    priority = Column(String(20), default="medium")
    status = Column(String(20), default="pending")
    owner = Column(String(100), default="")
    due_date = Column(String(20), default="")
    estimated_duration = Column(String(50), default="")
    risk_level = Column(String(20), default="low")
    dependencies = Column(JSON, default=list)
    checklist = Column(JSON, default=list)
    suggested_action = Column(Text, default="")
    sort_order = Column(Integer, default=0)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("RelocationProject", back_populates="tasks")
    vendor = relationship("Vendor", back_populates="tasks")


class Vendor(Base):
    __tablename__ = "vendors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    type = Column(String(50), nullable=False)
    rating = Column(Float, default=4.0)
    past_jobs = Column(Integer, default=0)
    avg_delay_days = Column(Float, default=0.0)
    phone = Column(String(20), default="")
    email = Column(String(255), default="")
    address = Column(Text, default="")
    city = Column(String(100), default="")
    availability = Column(String(20), default="available")
    created_at = Column(DateTime, default=datetime.utcnow)

    tasks = relationship("Task", back_populates="vendor")


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    filename = Column(String(255), nullable=False)
    file_type = Column(String(50), default="")
    file_path = Column(String(500), default="")
    category = Column(String(50), default="other")
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    customer = relationship("Customer", back_populates="documents")


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("relocation_projects.id"), nullable=False)
    action = Column(String(255), nullable=False)
    details = Column(Text, default="")
    actor = Column(String(100), default="System")
    timestamp = Column(DateTime, default=datetime.utcnow)

    project = relationship("RelocationProject", back_populates="activity_logs")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String(50), nullable=False)
    message = Column(Text, nullable=False)
    severity = Column(String(20), default="info")
    related_entity_type = Column(String(50), default="")
    related_entity_id = Column(Integer, default=0)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class ApprovalRequest(Base):
    __tablename__ = "approval_requests"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("relocation_projects.id"), nullable=False)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=True)
    agent_name = Column(String(100), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, default="")
    proposed_action = Column(Text, default="")
    payload = Column(JSON, default=dict)
    status = Column(String(20), default="pending")  # pending, approved, rejected
    admin_feedback = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)


class StateCheckpoint(Base):
    __tablename__ = "state_checkpoints"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("relocation_projects.id"), nullable=False)
    agent_name = Column(String(100), nullable=False)
    action_description = Column(Text, nullable=False)
    snapshot_before = Column(JSON, nullable=False)
    snapshot_after = Column(JSON, nullable=False)
    is_reverted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

