"""
QuickMove AI Relocation Operations Hub - FastAPI Backend
All API routes consolidated in a single file for clarity.
"""

import os
import shutil
from datetime import datetime, timedelta
from typing import Optional

from fastapi import FastAPI, Depends, HTTPException, Query, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_, and_

from database import engine, get_db, Base
from models import Customer, RelocationProject, Task, Vendor, Document, ActivityLog, Notification, ApprovalRequest, StateCheckpoint
from schemas import (
    CustomerCreate, CustomerUpdate, CustomerResponse, CustomerDetailResponse,
    TaskBriefResponse, DocumentBriefResponse, ProjectResponse,
    TaskCreate, TaskUpdate, TaskResponse,
    VendorCreate, VendorUpdate, VendorResponse, VendorBriefResponse,
    DocumentResponse,
    ActivityLogResponse,
    NotificationResponse,
    ApprovalRequestResponse, StateCheckpointResponse,
    AnalyticsOverview, AnalyticsDashboard, CityMetric, TrendPoint, VendorPerformance, BlockerMetric,
    AIChatRequest, AIChatResponse, AIRisk, AIRecommendation, AIDailySummary,
    SearchResult,
)
from services import generate_workflow, detect_risks, ai_chat, generate_daily_summary, generate_recommendations
from agent_engine import (
    undo_checkpoint, run_outreach_agent, run_ocr_agent,
    run_vendor_match_agent, respond_approval_request, adapt_workflow_for_exception,
    run_autonomous_agent
)


# Create tables
Base.metadata.create_all(bind=engine)

# Uploads dir
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

app = FastAPI(title="QuickMove API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded files
if os.path.exists(UPLOAD_DIR):
    app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


# ── Health ────────────────────────────────────────────────────────────

@app.get("/api/health")
def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}


# ── Customers ─────────────────────────────────────────────────────────

@app.get("/api/customers", response_model=list[CustomerResponse])
def list_customers(
    status: Optional[str] = None,
    city: Optional[str] = None,
    executive: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(Customer).options(joinedload(Customer.project))

    if status:
        q = q.filter(Customer.status == status)
    if city:
        q = q.filter(or_(Customer.destination_city.ilike(f"%{city}%"), Customer.current_city.ilike(f"%{city}%")))
    if executive:
        q = q.filter(Customer.assigned_executive.ilike(f"%{executive}%"))
    if search:
        q = q.filter(or_(
            Customer.name.ilike(f"%{search}%"),
            Customer.email.ilike(f"%{search}%"),
            Customer.phone.ilike(f"%{search}%"),
        ))

    return q.order_by(Customer.created_at.desc()).all()


@app.get("/api/customers/{customer_id}")
def get_customer(customer_id: int, db: Session = Depends(get_db)):
    customer = db.query(Customer).options(
        joinedload(Customer.project).joinedload(RelocationProject.tasks),
        joinedload(Customer.documents),
    ).filter(Customer.id == customer_id).first()

    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    tasks = []
    if customer.project:
        tasks = [TaskBriefResponse.model_validate(t) for t in customer.project.tasks]
    docs = [DocumentBriefResponse.model_validate(d) for d in customer.documents]

    result = CustomerDetailResponse.model_validate(customer)
    result.tasks = tasks
    result.documents = docs
    return result


@app.post("/api/customers", response_model=CustomerResponse)
def create_customer(data: CustomerCreate, db: Session = Depends(get_db)):
    customer = Customer(**data.model_dump())
    db.add(customer)
    db.commit()
    db.refresh(customer)

    # Create relocation project
    project = RelocationProject(
        customer_id=customer.id,
        status="planning",
        completion_pct=0.0,
        ai_summary=f"New relocation project for {customer.name} from {customer.current_city} to {customer.destination_city}. Move date: {customer.move_date}.",
        risk_level="low",
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    # Generate workflow tasks
    generate_workflow(db, project.id, customer)

    # Update completion
    _update_project_completion(db, project.id)

    # Log activity
    log = ActivityLog(
        project_id=project.id,
        action="Project created",
        details=f"Relocation project created for {customer.name}. {len(project.tasks)} tasks generated.",
        actor="System",
    )
    db.add(log)
    db.commit()

    db.refresh(customer)
    return customer


@app.put("/api/customers/{customer_id}", response_model=CustomerResponse)
def update_customer(customer_id: int, data: CustomerUpdate, db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, val in update_data.items():
        setattr(customer, key, val)
    customer.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(customer)
    return customer


@app.delete("/api/customers/{customer_id}")
def delete_customer(customer_id: int, db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    db.delete(customer)
    db.commit()
    return {"detail": "Customer deleted"}


@app.post("/api/customers/batch-delete")
def batch_delete_customers(ids: list[int], db: Session = Depends(get_db)):
    customers = db.query(Customer).filter(Customer.id.in_(ids)).all()
    count = len(customers)
    for c in customers:
        db.delete(c)
    db.commit()
    return {"detail": f"Deleted {count} customers", "count": count}


@app.post("/api/customers/delete-all")
def delete_all_customers(db: Session = Depends(get_db)):
    count = db.query(Customer).count()
    db.query(Customer).delete(synchronize_session=False)
    db.commit()
    return {"detail": f"Deleted all {count} customers", "count": count}



# ── Tasks ─────────────────────────────────────────────────────────────

@app.get("/api/tasks", response_model=list[TaskResponse])
def list_tasks(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    category: Optional[str] = None,
    owner: Optional[str] = None,
    project_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    q = db.query(Task).options(joinedload(Task.vendor), joinedload(Task.project).joinedload(RelocationProject.customer))

    if status:
        q = q.filter(Task.status == status)
    if priority:
        q = q.filter(Task.priority == priority)
    if category:
        q = q.filter(Task.category == category)
    if owner:
        q = q.filter(Task.owner.ilike(f"%{owner}%"))
    if project_id:
        q = q.filter(Task.project_id == project_id)

    tasks = q.order_by(Task.sort_order, Task.created_at).all()

    result = []
    for t in tasks:
        tr = TaskResponse.model_validate(t)
        if t.project and t.project.customer:
            tr.customer_name = t.project.customer.name
        result.append(tr)
    return result


@app.get("/api/tasks/kanban")
def get_kanban_tasks(
    project_id: Optional[int] = None,
    category: Optional[str] = None,
    owner: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(Task).options(joinedload(Task.vendor), joinedload(Task.project).joinedload(RelocationProject.customer))

    if project_id:
        q = q.filter(Task.project_id == project_id)
    if category:
        q = q.filter(Task.category == category)
    if owner:
        q = q.filter(Task.owner.ilike(f"%{owner}%"))

    tasks = q.order_by(Task.sort_order).all()

    columns = {"pending": [], "in_progress": [], "waiting": [], "blocked": [], "completed": []}
    for t in tasks:
        tr = TaskResponse.model_validate(t)
        if t.project and t.project.customer:
            tr.customer_name = t.project.customer.name
        if t.status in columns:
            columns[t.status].append(tr)
        else:
            columns["pending"].append(tr)

    return columns


@app.get("/api/tasks/{task_id}", response_model=TaskResponse)
def get_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(Task).options(joinedload(Task.vendor), joinedload(Task.project).joinedload(RelocationProject.customer)).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    tr = TaskResponse.model_validate(task)
    if task.project and task.project.customer:
        tr.customer_name = task.project.customer.name
    return tr


@app.put("/api/tasks/{task_id}", response_model=TaskResponse)
def update_task(task_id: int, data: TaskUpdate, db: Session = Depends(get_db)):
    task = db.query(Task).options(joinedload(Task.vendor), joinedload(Task.project).joinedload(RelocationProject.customer)).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    update_data = data.model_dump(exclude_unset=True)
    old_status = task.status
    for key, val in update_data.items():
        setattr(task, key, val)
    task.updated_at = datetime.utcnow()
    db.commit()

    # Update project completion if status changed
    if "status" in update_data and update_data["status"] != old_status:
        _update_project_completion(db, task.project_id)
        # Log activity
        log = ActivityLog(
            project_id=task.project_id,
            action=f"Task status changed",
            details=f"'{task.title}' changed from {old_status} to {task.status}",
            actor=task.owner or "System",
        )
        db.add(log)
        db.commit()

    db.refresh(task)
    tr = TaskResponse.model_validate(task)
    if task.project and task.project.customer:
        tr.customer_name = task.project.customer.name
    return tr


@app.put("/api/tasks/{task_id}/status")
def update_task_status(task_id: int, status: str = Query(...), db: Session = Depends(get_db)):
    """Quick status update for Kanban drag-and-drop."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    old_status = task.status
    task.status = status
    task.updated_at = datetime.utcnow()
    db.commit()

    _update_project_completion(db, task.project_id)

    log = ActivityLog(
        project_id=task.project_id,
        action="Task status changed",
        details=f"'{task.title}' moved from {old_status} to {status}",
        actor=task.owner or "System",
    )
    db.add(log)
    db.commit()

    return {"detail": "Status updated", "old_status": old_status, "new_status": status}


@app.delete("/api/tasks/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    project_id = task.project_id
    db.delete(task)
    db.commit()
    _update_project_completion(db, project_id)
    return {"detail": "Task deleted"}


@app.post("/api/tasks/batch-delete")
def batch_delete_tasks(ids: list[int], db: Session = Depends(get_db)):
    tasks = db.query(Task).filter(Task.id.in_(ids)).all()
    count = len(tasks)
    project_ids = set(t.project_id for t in tasks)
    for t in tasks:
        db.delete(t)
    db.commit()
    for pid in project_ids:
        _update_project_completion(db, pid)
    return {"detail": f"Deleted {count} tasks", "count": count}


@app.post("/api/tasks/delete-all")
def delete_all_tasks(project_id: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(Task)
    if project_id:
        q = q.filter(Task.project_id == project_id)
    count = q.count()
    q.delete(synchronize_session=False)
    db.commit()
    if project_id:
        _update_project_completion(db, project_id)
    return {"detail": f"Deleted {count} tasks", "count": count}




def _update_project_completion(db: Session, project_id: int):
    """Recalculate project completion percentage."""
    project = db.query(RelocationProject).filter(RelocationProject.id == project_id).first()
    if not project:
        return
    tasks = db.query(Task).filter(Task.project_id == project_id).all()
    if not tasks:
        return
    completed = sum(1 for t in tasks if t.status == "completed")
    project.completion_pct = round((completed / len(tasks)) * 100, 1)

    # Update project status
    if completed == len(tasks):
        project.status = "completed"
    elif completed > 0:
        project.status = "in_progress"

    # Update risk level
    blocked = sum(1 for t in tasks if t.status == "blocked")
    today = datetime.utcnow().strftime("%Y-%m-%d")
    overdue = sum(1 for t in tasks if t.due_date and t.due_date < today and t.status != "completed")
    if blocked > 2 or overdue > 3:
        project.risk_level = "critical"
    elif blocked > 0 or overdue > 1:
        project.risk_level = "high"
    elif overdue > 0:
        project.risk_level = "medium"
    else:
        project.risk_level = "low"

    project.updated_at = datetime.utcnow()
    db.commit()


# ── Vendors ───────────────────────────────────────────────────────────

@app.get("/api/vendors", response_model=list[VendorResponse])
def list_vendors(
    type: Optional[str] = None,
    city: Optional[str] = None,
    availability: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(Vendor)
    if type:
        q = q.filter(Vendor.type == type)
    if city:
        q = q.filter(Vendor.city.ilike(f"%{city}%"))
    if availability:
        q = q.filter(Vendor.availability == availability)
    return q.order_by(Vendor.rating.desc()).all()


@app.get("/api/vendors/{vendor_id}", response_model=VendorResponse)
def get_vendor(vendor_id: int, db: Session = Depends(get_db)):
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return vendor


@app.post("/api/vendors", response_model=VendorResponse)
def create_vendor(data: VendorCreate, db: Session = Depends(get_db)):
    vendor = Vendor(**data.model_dump())
    db.add(vendor)
    db.commit()
    db.refresh(vendor)
    return vendor


@app.put("/api/vendors/{vendor_id}", response_model=VendorResponse)
def update_vendor(vendor_id: int, data: VendorUpdate, db: Session = Depends(get_db)):
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    for key, val in data.model_dump(exclude_unset=True).items():
        setattr(vendor, key, val)
    db.commit()
    db.refresh(vendor)
    return vendor


@app.delete("/api/vendors/{vendor_id}")
def delete_vendor(vendor_id: int, db: Session = Depends(get_db)):
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    db.delete(vendor)
    db.commit()
    return {"detail": "Vendor deleted"}


@app.post("/api/vendors/batch-delete")
def batch_delete_vendors(ids: list[int], db: Session = Depends(get_db)):
    vendors = db.query(Vendor).filter(Vendor.id.in_(ids)).all()
    count = len(vendors)
    for v in vendors:
        db.delete(v)
    db.commit()
    return {"detail": f"Deleted {count} vendors", "count": count}


@app.post("/api/vendors/delete-all")
def delete_all_vendors(db: Session = Depends(get_db)):
    count = db.query(Vendor).count()
    db.query(Vendor).delete(synchronize_session=False)
    db.commit()
    return {"detail": f"Deleted all {count} vendors", "count": count}



# ── Documents ─────────────────────────────────────────────────────────

@app.get("/api/documents/{customer_id}", response_model=list[DocumentResponse])
def list_documents(customer_id: int, db: Session = Depends(get_db)):
    return db.query(Document).filter(Document.customer_id == customer_id).order_by(Document.uploaded_at.desc()).all()


@app.post("/api/documents")
async def upload_document(
    customer_id: int = Form(...),
    category: str = Form("other"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    # Save file
    safe_name = f"{customer_id}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, safe_name)
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)

    doc = Document(
        customer_id=customer_id,
        filename=file.filename,
        file_type=file.content_type or "",
        file_path=f"/uploads/{safe_name}",
        category=category,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return DocumentResponse.model_validate(doc)


@app.delete("/api/documents/{doc_id}")
def delete_document(doc_id: int, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Delete file
    file_path = os.path.join(os.path.dirname(__file__), doc.file_path.lstrip("/"))
    if os.path.exists(file_path):
        os.remove(file_path)

    db.delete(doc)
    db.commit()
    return {"detail": "Document deleted"}


# ── Activity Logs ─────────────────────────────────────────────────────

@app.get("/api/activity", response_model=list[ActivityLogResponse])
def list_activity(
    project_id: Optional[int] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    q = db.query(ActivityLog)
    if project_id:
        q = q.filter(ActivityLog.project_id == project_id)
    return q.order_by(ActivityLog.timestamp.desc()).limit(limit).all()


# ── Notifications ─────────────────────────────────────────────────────

@app.get("/api/notifications", response_model=list[NotificationResponse])
def list_notifications(unread_only: bool = False, db: Session = Depends(get_db)):
    q = db.query(Notification)
    if unread_only:
        q = q.filter(Notification.is_read == False)
    return q.order_by(Notification.created_at.desc()).limit(50).all()


@app.put("/api/notifications/{notif_id}/read")
def mark_notification_read(notif_id: int, db: Session = Depends(get_db)):
    notif = db.query(Notification).filter(Notification.id == notif_id).first()
    if notif:
        notif.is_read = True
        db.commit()
    return {"detail": "Marked as read"}


@app.put("/api/notifications/read-all")
def mark_all_read(db: Session = Depends(get_db)):
    db.query(Notification).filter(Notification.is_read == False).update({"is_read": True})
    db.commit()
    return {"detail": "All marked as read"}


# ── Analytics ─────────────────────────────────────────────────────────

@app.get("/api/analytics")
def get_analytics(db: Session = Depends(get_db)):
    today = datetime.utcnow().strftime("%Y-%m-%d")

    # Overview
    total_customers = db.query(Customer).count()
    active = db.query(RelocationProject).filter(RelocationProject.status.in_(["planning", "in_progress"])).count()
    completed = db.query(RelocationProject).filter(RelocationProject.status == "completed").count()
    total_tasks = db.query(Task).count()
    done_tasks = db.query(Task).filter(Task.status == "completed").count()
    delayed = db.query(Task).filter(Task.due_date < today, Task.due_date != "", Task.status.notin_(["completed"])).count()
    blocked = db.query(Task).filter(Task.status == "blocked").count()
    due_today = db.query(Task).filter(Task.due_date == today, Task.status != "completed").count()

    avg_completion = db.query(func.avg(RelocationProject.completion_pct)).scalar() or 0

    overview = {
        "active_relocations": active,
        "completed_relocations": completed,
        "total_customers": total_customers,
        "total_tasks": total_tasks,
        "completed_tasks": done_tasks,
        "delayed_tasks": delayed,
        "blocked_tasks": blocked,
        "avg_completion_pct": round(avg_completion, 1),
        "overdue_tasks": delayed,
        "tasks_due_today": due_today,
    }

    # By city
    city_data = db.query(
        Customer.destination_city, func.count(Customer.id)
    ).group_by(Customer.destination_city).all()
    by_city = [{"city": c[0] or "Unknown", "count": c[1]} for c in city_data if c[0]]

    # Status distribution
    status_data = db.query(Task.status, func.count(Task.id)).group_by(Task.status).all()
    status_dist = {s[0]: s[1] for s in status_data}

    # Priority distribution
    pri_data = db.query(Task.priority, func.count(Task.id)).group_by(Task.priority).all()
    pri_dist = {p[0]: p[1] for p in pri_data}

    # Category distribution
    cat_data = db.query(Task.category, func.count(Task.id)).group_by(Task.category).all()
    cat_dist = {c[0]: c[1] for c in cat_data}

    # Vendor performance
    vendors = db.query(Vendor).order_by(Vendor.rating.desc()).limit(10).all()
    vendor_perf = [
        {"name": v.name, "type": v.type, "rating": v.rating, "avg_delay": v.avg_delay_days, "jobs": v.past_jobs}
        for v in vendors
    ]

    # Trends (last 30 days)
    trends = []
    for i in range(30):
        d = datetime.utcnow() - timedelta(days=29 - i)
        ds = d.strftime("%Y-%m-%d")
        created = db.query(Task).filter(func.date(Task.created_at) == ds).count()
        comp = db.query(Task).filter(Task.status == "completed", func.date(Task.updated_at) == ds).count()
        trends.append({"date": d.strftime("%b %d"), "completed": comp, "created": created})

    # Common blockers
    blockers = []
    blocked_tasks = db.query(Task).filter(Task.status == "blocked").all()
    blocker_cats = {}
    for t in blocked_tasks:
        cat = t.category.replace("_", " ").title()
        blocker_cats[cat] = blocker_cats.get(cat, 0) + 1
    blockers = [{"blocker": k, "count": v} for k, v in sorted(blocker_cats.items(), key=lambda x: -x[1])]

    return {
        "overview": overview,
        "by_city": by_city,
        "trends": trends,
        "vendor_performance": vendor_perf,
        "common_blockers": blockers,
        "status_distribution": status_dist,
        "priority_distribution": pri_dist,
        "category_distribution": cat_dist,
    }


# ── AI Endpoints ──────────────────────────────────────────────────────

@app.post("/api/ai/chat")
def ai_chat_endpoint(req: AIChatRequest, db: Session = Depends(get_db)):
    result = ai_chat(db, req.message)
    return result


@app.get("/api/ai/daily-summary")
def daily_summary(db: Session = Depends(get_db)):
    return generate_daily_summary(db)


@app.get("/api/ai/risks")
def get_risks(db: Session = Depends(get_db)):
    return detect_risks(db)


@app.get("/api/ai/recommendations")
def get_recommendations(db: Session = Depends(get_db)):
    return generate_recommendations(db)


# ── Search ────────────────────────────────────────────────────────────

@app.get("/api/search", response_model=list[SearchResult])
def global_search(q: str = Query(..., min_length=1), db: Session = Depends(get_db)):
    results = []
    query = f"%{q}%"

    # Search customers
    customers = db.query(Customer).filter(or_(
        Customer.name.ilike(query),
        Customer.email.ilike(query),
        Customer.phone.ilike(query),
        Customer.current_city.ilike(query),
        Customer.destination_city.ilike(query),
    )).limit(10).all()
    for c in customers:
        results.append(SearchResult(
            type="customer",
            id=c.id,
            title=c.name,
            subtitle=f"{c.current_city} to {c.destination_city}",
            status=c.status,
            meta=c.phone,
        ))

    # Search tasks
    tasks = db.query(Task).options(joinedload(Task.project).joinedload(RelocationProject.customer)).filter(or_(
        Task.title.ilike(query),
        Task.description.ilike(query),
        Task.owner.ilike(query),
    )).limit(10).all()
    for t in tasks:
        cname = t.project.customer.name if t.project and t.project.customer else ""
        results.append(SearchResult(
            type="task",
            id=t.id,
            title=t.title,
            subtitle=f"{cname} - {t.category.replace('_', ' ').title()}",
            status=t.status,
            meta=t.priority,
        ))

    # Search vendors
    vendors = db.query(Vendor).filter(or_(
        Vendor.name.ilike(query),
        Vendor.type.ilike(query),
        Vendor.city.ilike(query),
        Vendor.phone.ilike(query),
    )).limit(10).all()
    for v in vendors:
        results.append(SearchResult(
            type="vendor",
            id=v.id,
            title=v.name,
            subtitle=f"{v.type.replace('_', ' ').title()} - {v.city}",
            status=v.availability,
            meta=f"Rating: {v.rating}",
        ))

    return results


# ── Timeline ──────────────────────────────────────────────────────────

@app.get("/api/timeline")
def get_timeline(
    customer_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """Get timeline events for display."""
    today = datetime.utcnow().strftime("%Y-%m-%d")
    events = []

    q = db.query(Task).options(joinedload(Task.project).joinedload(RelocationProject.customer))
    if customer_id:
        project = db.query(RelocationProject).filter(RelocationProject.customer_id == customer_id).first()
        if project:
            q = q.filter(Task.project_id == project.id)

    tasks = q.filter(Task.due_date != "").order_by(Task.due_date).all()

    for t in tasks:
        cname = t.project.customer.name if t.project and t.project.customer else "Unknown"
        event_type = "completed" if t.status == "completed" else (
            "overdue" if t.due_date < today else (
                "blocked" if t.status == "blocked" else "upcoming"
            )
        )
        events.append({
            "id": t.id,
            "title": t.title,
            "date": t.due_date,
            "type": event_type,
            "status": t.status,
            "priority": t.priority,
            "category": t.category,
            "customer_name": cname,
            "customer_id": t.project.customer.id if t.project and t.project.customer else None,
            "owner": t.owner,
        })

    return events


# ── Executives ────────────────────────────────────────────────────────

@app.get("/api/executives")
def list_executives(db: Session = Depends(get_db)):
    """Get distinct executive names for filtering."""
    execs = db.query(Customer.assigned_executive).distinct().filter(Customer.assigned_executive != "").all()
    return [e[0] for e in execs]


# ── LangGraph Multi-Agent Orchestration & HITL Approvals ─────────────

@app.get("/api/approvals", response_model=list[ApprovalRequestResponse])
def list_approval_requests(status: Optional[str] = None, db: Session = Depends(get_db)):
    """List pending/all HITL Admin approval requests."""
    q = db.query(ApprovalRequest)
    if status:
        q = q.filter(ApprovalRequest.status == status)
    return q.order_by(ApprovalRequest.created_at.desc()).all()


@app.post("/api/approvals/{request_id}/respond")
def respond_approval(
    request_id: int,
    approve: bool = Query(...),
    feedback: str = Query(""),
    db: Session = Depends(get_db),
):
    """Admin approves or rejects an AI proposal."""
    result = respond_approval_request(db, request_id, approve, feedback)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@app.get("/api/checkpoints", response_model=list[StateCheckpointResponse])
def list_state_checkpoints(project_id: Optional[int] = None, db: Session = Depends(get_db)):
    """List state checkpoints for 1-Click Undo auditing."""
    q = db.query(StateCheckpoint)
    if project_id:
        q = q.filter(StateCheckpoint.project_id == project_id)
    return q.order_by(StateCheckpoint.created_at.desc()).limit(30).all()


@app.post("/api/checkpoints/{checkpoint_id}/undo")
def undo_state_action(checkpoint_id: int, db: Session = Depends(get_db)):
    """1-Click Undo: Revert project state to snapshot_before."""
    try:
        return undo_checkpoint(db, checkpoint_id)
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))


@app.post("/api/agents/ocr/{doc_id}")
def trigger_ocr_agent(doc_id: int, db: Session = Depends(get_db)):
    """Trigger Document Vision/OCR Agent to parse document, auto-fill fields & tasks."""
    result = run_ocr_agent(db, doc_id)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@app.post("/api/agents/outreach/{customer_id}")
def trigger_outreach_agent(customer_id: int, db: Session = Depends(get_db)):
    """Trigger Customer Outreach Agent to generate magic upload link & send reminder."""
    result = run_outreach_agent(db, customer_id)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@app.post("/api/agents/vendor-match/{project_id}")
def trigger_vendor_match_agent(project_id: int, category: str = Query("moving"), db: Session = Depends(get_db)):
    """Trigger Vendor Match Agent to pre-select vendors and create Admin Approval Request."""
    result = run_vendor_match_agent(db, project_id, category)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@app.post("/api/agents/adapt-workflow")
def trigger_exception_agent(
    customer_id: int = Query(...),
    days_shift: int = Query(...),
    reason: str = Query("Schedule disruption"),
    db: Session = Depends(get_db),
):
    """Trigger Exception Adaptation Agent to shift due dates and adapt workflow."""
    result = adapt_workflow_for_exception(db, customer_id, days_shift, reason)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@app.post("/api/agents/autonomous-execute")
def trigger_autonomous_agent(
    instruction: str = Query(...),
    customer_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    """Trigger Autonomous Operations Agent to parse instruction and perform database actions."""
    result = run_autonomous_agent(db, instruction, customer_id)
    return result


