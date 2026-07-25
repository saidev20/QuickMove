"""
LangGraph Multi-Agent Orchestration Engine & State Versioning System for QuickMove.
Provides:
- Checkpointer & State Versioning (1-Click Undo)
- Document Vision / OCR Auto-Fill Agent
- Vendor Match & RFQ Proposal Agent
- Human-In-The-Loop (HITL) Admin Approval Agent
- Customer Outreach & Magic Link Agent
- Exception & Edge Case Adaptation Agent
"""

import json
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session

from models import (
    Customer, RelocationProject, Task, Vendor, Document, ActivityLog,
    Notification, ApprovalRequest, StateCheckpoint
)


# ── State Checkpointer & Undo Engine ──────────────────────────────────

def _capture_project_snapshot(db: Session, project_id: int) -> dict:
    """Capture a complete JSON serializable snapshot of project, customer, and task state."""
    project = db.query(RelocationProject).filter(RelocationProject.id == project_id).first()
    if not project:
        return {}

    customer = project.customer
    tasks = db.query(Task).filter(Task.project_id == project_id).all()

    return {
        "project": {
            "id": project.id,
            "status": project.status,
            "completion_pct": project.completion_pct,
            "risk_level": project.risk_level,
            "ai_summary": project.ai_summary,
        },
        "customer": {
            "id": customer.id,
            "name": customer.name,
            "phone": customer.phone,
            "email": customer.email,
            "current_city": customer.current_city,
            "destination_city": customer.destination_city,
            "move_date": customer.move_date,
            "apartment_preference": customer.apartment_preference,
            "budget": customer.budget,
            "status": customer.status,
            "notes": customer.notes,
        },
        "tasks": [
            {
                "id": t.id,
                "title": t.title,
                "status": t.status,
                "priority": t.priority,
                "due_date": t.due_date,
                "owner": t.owner,
                "vendor_id": t.vendor_id,
            }
            for t in tasks
        ],
    }


def create_checkpoint(
    db: Session,
    project_id: int,
    agent_name: str,
    action_description: str,
    snapshot_before: dict,
) -> StateCheckpoint:
    """Create an immutable state checkpoint after an agent action."""
    snapshot_after = _capture_project_snapshot(db, project_id)
    checkpoint = StateCheckpoint(
        project_id=project_id,
        agent_name=agent_name,
        action_description=action_description,
        snapshot_before=snapshot_before,
        snapshot_after=snapshot_after,
        is_reverted=False,
    )
    db.add(checkpoint)
    db.commit()
    db.refresh(checkpoint)
    return checkpoint


def undo_checkpoint(db: Session, checkpoint_id: int) -> dict:
    """Revert project, customer, and tasks state to snapshot_before (1-Click Undo)."""
    checkpoint = db.query(StateCheckpoint).filter(StateCheckpoint.id == checkpoint_id).first()
    if not checkpoint:
        raise ValueError("Checkpoint not found")
    if checkpoint.is_reverted:
        raise ValueError("Checkpoint has already been reverted")

    before = checkpoint.snapshot_before
    if not before:
        raise ValueError("No prior snapshot available for reversion")

    project_data = before.get("project", {})
    customer_data = before.get("customer", {})
    tasks_data = before.get("tasks", [])

    # Restore project
    project = db.query(RelocationProject).filter(RelocationProject.id == checkpoint.project_id).first()
    if project and project_data:
        project.status = project_data.get("status", project.status)
        project.completion_pct = project_data.get("completion_pct", project.completion_pct)
        project.risk_level = project_data.get("risk_level", project.risk_level)

    # Restore customer
    if project and project.customer and customer_data:
        c = project.customer
        c.current_city = customer_data.get("current_city", c.current_city)
        c.destination_city = customer_data.get("destination_city", c.destination_city)
        c.move_date = customer_data.get("move_date", c.move_date)
        c.apartment_preference = customer_data.get("apartment_preference", c.apartment_preference)
        c.budget = customer_data.get("budget", c.budget)
        c.status = customer_data.get("status", c.status)
        c.notes = customer_data.get("notes", c.notes)

    # Restore tasks
    for td in tasks_data:
        t = db.query(Task).filter(Task.id == td["id"]).first()
        if t:
            t.status = td.get("status", t.status)
            t.priority = td.get("priority", t.priority)
            t.due_date = td.get("due_date", t.due_date)
            t.owner = td.get("owner", t.owner)
            t.vendor_id = td.get("vendor_id", t.vendor_id)

    checkpoint.is_reverted = True

    # Log activity
    log = ActivityLog(
        project_id=checkpoint.project_id,
        action="State Undo (1-Click Revert)",
        details=f"Reverted AI action '{checkpoint.action_description}' by {checkpoint.agent_name}",
        actor="Admin",
    )
    db.add(log)
    db.commit()

    return {"status": "reverted", "action_reverted": checkpoint.action_description}


# ── Agent 1: Customer Outreach & Magic Link Agent ──────────────────────

def run_outreach_agent(db: Session, customer_id: int) -> dict:
    """Send customer an automated outreach message with a magic upload link for missing docs."""
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer or not customer.project:
        return {"error": "Customer not found"}

    snapshot_before = _capture_project_snapshot(db, customer.project.id)

    missing_docs = customer.documents_required or ["aadhaar", "rental_agreement"]
    token = f"magic_{customer_id}_{int(datetime.utcnow().timestamp())}"
    upload_url = f"/customers/{customer_id}?tab=Documents&token={token}"

    msg = f"Outreach sent to {customer.name} via WhatsApp/Email requesting missing docs ({', '.join(missing_docs)}). Upload URL generated: {upload_url}"

    notif = Notification(
        type="outreach_sent",
        message=f"Automated outreach sent to {customer.name} for missing documents",
        severity="info",
        related_entity_type="customer",
        related_entity_id=customer_id,
    )
    db.add(notif)

    checkpoint = create_checkpoint(
        db,
        project_id=customer.project.id,
        agent_name="Customer Outreach Agent",
        action_description=f"Generated magic upload link and sent outreach to {customer.name}",
        snapshot_before=snapshot_before,
    )

    return {
        "status": "outreach_sent",
        "customer": customer.name,
        "missing_docs": missing_docs,
        "upload_url": upload_url,
        "checkpoint_id": checkpoint.id,
    }


# ── Agent 2: Document Processing & Vision OCR Agent ──────────────────

def run_ocr_agent(db: Session, document_id: int) -> dict:
    """Process an uploaded document with AI Vision OCR, auto-fill pending fields, and update tasks."""
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        return {"error": "Document not found"}

    customer = db.query(Customer).filter(Customer.id == doc.customer_id).first()
    if not customer or not customer.project:
        return {"error": "Customer or project not found"}

    snapshot_before = _capture_project_snapshot(db, customer.project.id)

    # Simulated Vision/OCR extraction based on category/filename
    extracted_data = {}
    completed_task_titles = []

    if doc.category in ("id_proof", "aadhaar", "pan_card") or "aadhaar" in doc.filename.lower() or "id" in doc.filename.lower():
        extracted_data = {
            "verified_document_type": "Government ID Proof (Aadhaar/PAN)",
            "document_id": f"IND-{doc.id}847291",
            "verified_name": customer.name,
            "verification_status": "VERIFIED_SUCCESS",
        }
        # Find and auto-complete Aadhaar/ID tasks
        tasks = db.query(Task).filter(Task.project_id == customer.project.id).all()
        for t in tasks:
            if "aadhaar" in t.title.lower() or "id" in t.title.lower():
                t.status = "completed"
                for item in t.checklist:
                    item["completed"] = True
                completed_task_titles.append(t.title)

    elif doc.category in ("rental_agreement",) or "rental" in doc.filename.lower() or "agreement" in doc.filename.lower():
        extracted_data = {
            "verified_document_type": "Rental Lease Agreement",
            "lease_term": "11 Months",
            "extracted_rent": customer.budget or "Rs. 25,000/mo",
            "destination_address": f"Flat 402, Sunshine Heights, {customer.destination_city}",
        }
        customer.notes = f"{customer.notes}\n[AI OCR Auto-Fill]: Verified Address: {extracted_data['destination_address']}".strip()
        tasks = db.query(Task).filter(Task.project_id == customer.project.id).all()
        for t in tasks:
            if "rental" in t.title.lower() or "apartment" in t.title.lower():
                t.status = "completed"
                for item in t.checklist:
                    item["completed"] = True
                completed_task_titles.append(t.title)

    else:
        extracted_data = {
            "verified_document_type": doc.category.replace("_", " ").title(),
            "status": "VERIFIED_GENERIC",
        }

    # Recalculate project progress
    all_tasks = db.query(Task).filter(Task.project_id == customer.project.id).all()
    completed_count = sum(1 for t in all_tasks if t.status == "completed")
    customer.project.completion_pct = round((completed_count / len(all_tasks)) * 100, 1)

    db.commit()

    checkpoint = create_checkpoint(
        db,
        project_id=customer.project.id,
        agent_name="Document OCR Agent",
        action_description=f"Parsed '{doc.filename}', auto-filled fields and completed {len(completed_task_titles)} tasks",
        snapshot_before=snapshot_before,
    )

    return {
        "status": "processed",
        "document": doc.filename,
        "extracted_data": extracted_data,
        "completed_tasks": completed_task_titles,
        "new_completion_pct": customer.project.completion_pct,
        "checkpoint_id": checkpoint.id,
    }


# ── Agent 3: Vendor Match & RFQ Proposal Agent ───────────────────────

def run_vendor_match_agent(db: Session, project_id: int, category: str = "moving") -> dict:
    """Evaluate vendors, prepare quote proposal, and create an Admin HITL Approval Request."""
    project = db.query(RelocationProject).filter(RelocationProject.id == project_id).first()
    if not project or not project.customer:
        return {"error": "Project not found"}

    customer = project.customer
    
    # Find matching vendors
    vtype = "packers" if category == "moving" else (category if category in ("internet", "electricity", "gas", "water") else "property_partner")
    vendors = db.query(Vendor).filter(Vendor.type == vtype, Vendor.availability == "available").order_by(Vendor.rating.desc()).limit(3).all()
    
    if not vendors:
        vendors = db.query(Vendor).order_by(Vendor.rating.desc()).limit(3).all()

    top_vendor = vendors[0] if vendors else None
    if not top_vendor:
        return {"error": "No available vendors"}

    # Find task
    task = db.query(Task).filter(Task.project_id == project_id, Task.category == category).first()

    proposal_title = f"Approve Vendor Booking: {top_vendor.name} for {customer.name}"
    proposed_action = f"Assign {top_vendor.name} ({top_vendor.type.replace('_', ' ').title()}, Rating {top_vendor.rating}/5, Avg delay {top_vendor.avg_delay_days:.1f}d) for {customer.name}'s relocation from {customer.current_city} to {customer.destination_city}."

    approval_req = ApprovalRequest(
        project_id=project_id,
        task_id=task.id if task else None,
        agent_name="Vendor Match Agent",
        title=proposal_title,
        description=f"AI Vendor Agent selected {top_vendor.name} as optimal partner based on customer budget ({customer.budget}) and route.",
        proposed_action=proposed_action,
        payload={
            "vendor_id": top_vendor.id,
            "vendor_name": top_vendor.name,
            "vendor_rating": top_vendor.rating,
            "category": category,
            "task_id": task.id if task else None,
        },
        status="pending",
    )
    db.add(approval_req)
    db.commit()

    return {
        "status": "proposal_created",
        "approval_id": approval_req.id,
        "vendor": top_vendor.name,
        "rating": top_vendor.rating,
        "proposed_action": proposed_action,
    }


# ── Agent 4: HITL Admin Approval Agent ────────────────────────────────

def respond_approval_request(db: Session, request_id: int, approve: bool, feedback: str = "") -> dict:
    """Process admin response (approve or reject) for a pending AI approval gate."""
    req = db.query(ApprovalRequest).filter(ApprovalRequest.id == request_id).first()
    if not req:
        return {"error": "Approval request not found"}
    if req.status != "pending":
        return {"error": f"Request is already {req.status}"}

    project = db.query(RelocationProject).filter(RelocationProject.id == req.project_id).first()
    if not project:
        return {"error": "Project not found"}

    snapshot_before = _capture_project_snapshot(db, req.project_id)

    req.resolved_at = datetime.utcnow()
    req.admin_feedback = feedback

    if approve:
        req.status = "approved"
        # Execute proposed action payload
        payload = req.payload or {}
        vendor_id = payload.get("vendor_id")
        task_id = payload.get("task_id")

        if task_id:
            task = db.query(Task).filter(Task.id == task_id).first()
            if task:
                task.vendor_id = vendor_id
                task.status = "in_progress"
                if payload.get("vendor_name"):
                    task.suggested_action = f"Confirmed booking with vendor {payload['vendor_name']}."

        log = ActivityLog(
            project_id=req.project_id,
            action="HITL Admin Approved AI Proposal",
            details=f"Approved: {req.title}. {feedback}",
            actor="Admin",
        )
        db.add(log)
        db.commit()

        checkpoint = create_checkpoint(
            db,
            project_id=req.project_id,
            agent_name="HITL Admin Approval Agent",
            action_description=f"Admin approved AI proposal '{req.title}'",
            snapshot_before=snapshot_before,
        )

        return {"status": "approved", "executed": True, "checkpoint_id": checkpoint.id}
    else:
        req.status = "rejected"
        log = ActivityLog(
            project_id=req.project_id,
            action="HITL Admin Rejected AI Proposal",
            details=f"Rejected: {req.title}. Feedback: {feedback}",
            actor="Admin",
        )
        db.add(log)
        db.commit()
        return {"status": "rejected", "executed": False}


# ── Agent 5: Exception & Edge-Case Adaptation Agent ──────────────────

def adapt_workflow_for_exception(
    db: Session,
    customer_id: int,
    days_shift: int,
    reason: str = "Customer requested move date shift",
) -> dict:
    """Handle edge cases (schedule shifts, vendor cancellations) by re-calculating dependency due dates."""
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer or not customer.project:
        return {"error": "Customer not found"}

    project = customer.project
    snapshot_before = _capture_project_snapshot(db, project.id)

    # Shift move date
    try:
        old_date = datetime.strptime(customer.move_date, "%Y-%m-%d")
        new_date = old_date + timedelta(days=days_shift)
        customer.move_date = new_date.strftime("%Y-%m-%d")
    except (ValueError, TypeError):
        new_date = datetime.utcnow() + timedelta(days=30)
        customer.move_date = new_date.strftime("%Y-%m-%d")

    # Recalculate task due dates
    tasks = db.query(Task).filter(Task.project_id == project.id, Task.status != "completed").all()
    updated_count = 0
    for t in tasks:
        if t.due_date:
            try:
                t_due = datetime.strptime(t.due_date, "%Y-%m-%d") + timedelta(days=days_shift)
                t.due_date = t_due.strftime("%Y-%m-%d")
                updated_count += 1
            except ValueError:
                pass

    # Log & notify
    log = ActivityLog(
        project_id=project.id,
        action="Exception Adaptation Agent Shifted Timeline",
        details=f"Shifted move date by {days_shift} days to {customer.move_date}. Reason: {reason}. {updated_count} pending tasks rescheduled.",
        actor="Exception Agent",
    )
    db.add(log)

    notif = Notification(
        type="schedule_adapted",
        message=f"AI Exception Agent adapted workflow for {customer.name} (Move date shifted by {days_shift} days)",
        severity="warning",
        related_entity_type="customer",
        related_entity_id=customer_id,
    )
    db.add(notif)

    db.commit()

    checkpoint = create_checkpoint(
        db,
        project_id=project.id,
        agent_name="Exception Adaptation Agent",
        action_description=f"Adapted workflow for {customer.name} (Shifted move date by {days_shift} days)",
        snapshot_before=snapshot_before,
    )

    return {
        "status": "adapted",
        "new_move_date": customer.move_date,
        "rescheduled_tasks_count": updated_count,
        "checkpoint_id": checkpoint.id,
    }


# ── Autonomous Operations Execution Agent ─────────────────────────────

def _heuristic_agent_planner(db: Session, instruction: str, target_customer_id: Optional[int] = None) -> dict:
    """Fallback rule-based planner if LLM is unavailable."""
    instr_lower = instruction.lower()
    actions = []
    cid = target_customer_id

    if not cid:
        custs = db.query(Customer).all()
        for c in custs:
            if c.name.lower() in instr_lower:
                cid = c.id
                break
        if not cid and custs:
            cid = custs[0].id

    if "date" in instr_lower or "july" in instr_lower or "august" in instr_lower or "move" in instr_lower and ("change" in instr_lower or "set" in instr_lower):
        # Extract target date string if present
        target_date = "2026-07-31"
        if "31st july" in instr_lower or "31 july" in instr_lower:
            target_date = "2026-07-31"
        elif "30th july" in instr_lower or "30 july" in instr_lower:
            target_date = "2026-07-30"
        elif "15th august" in instr_lower or "15 august" in instr_lower:
            target_date = "2026-08-15"
        actions.append({"action": "set_move_date", "customer_id": cid, "new_move_date": target_date})
    elif "outreach" in instr_lower or "magic link" in instr_lower or "request document" in instr_lower or "upload" in instr_lower:
        actions.append({"action": "trigger_outreach", "customer_id": cid})
    elif "vendor" in instr_lower or "packer" in instr_lower or "match" in instr_lower:
        actions.append({"action": "assign_vendor", "customer_id": cid, "vendor_type": "packers"})
    elif "shift" in instr_lower or "delay" in instr_lower or "extend" in instr_lower:
        actions.append({"action": "shift_schedule", "customer_id": cid, "days": 5})
    elif "complete" in instr_lower or "done" in instr_lower:
        t = db.query(Task).filter(Task.status != "completed").first()
        if t:
            actions.append({"action": "update_task_status", "task_id": t.id, "status": "completed"})
    else:
        # Default action: create task
        actions.append({
            "action": "create_task",
            "customer_id": cid,
            "title": instruction.capitalize(),
            "category": "moving",
            "priority": "high",
        })

    return {
        "reasoning": f"Generated operational execution plan for: '{instruction}'",
        "target_customer_id": cid,
        "actions": actions,
    }


def run_autonomous_agent(db: Session, instruction: str, target_customer_id: Optional[int] = None) -> dict:
    """
    Autonomous Execution Agent:
    Accepts natural language operational directives, compiles structured actions,
    executes DB mutations (task creation/completion/deletion, customer updates, vendor matching, outreach),
    records immutable state checkpoints for 1-click Undo, and returns execution trace.
    """
    customers = db.query(Customer).all()
    cust_summary = [f"ID:{c.id} | Name:{c.name} | City:{c.current_city}->{c.destination_city} | Status:{c.status} | MoveDate:{c.move_date}" for c in customers[:20]]
    vendors = db.query(Vendor).all()
    vendor_summary = [f"ID:{v.id} | Name:{v.name} | Type:{v.type} | City:{v.city}" for v in vendors[:15]]

    system_prompt = f"""You are the QuickMove Autonomous Operations AI Agent.
Your job is to convert natural language operational instructions into structured database mutations to manage customer moves.

Available Customers:
{chr(10).join(cust_summary)}

Available Vendors:
{chr(10).join(vendor_summary)}

You MUST respond with ONLY a valid JSON object with the following structure:
{{
  "reasoning": "Explanation of your plan and decisions",
  "target_customer_id": <int or null>,
  "actions": [
    {{
      "action": "create_task",
      "customer_id": <int>,
      "title": "<title>",
      "category": "property_search" | "moving" | "utilities" | "documentation" | "post_move",
      "priority": "high" | "medium" | "low",
      "due_date": "YYYY-MM-DD"
    }},
    {{
      "action": "update_task_status",
      "task_id": <int>,
      "status": "pending" | "in_progress" | "waiting" | "blocked" | "completed"
    }},
    {{
      "action": "delete_task",
      "task_id": <int>
    }},
    {{
      "action": "trigger_outreach",
      "customer_id": <int>
    }},
    {{
      "action": "assign_vendor",
      "customer_id": <int>,
      "vendor_type": "packers" | "utilities" | "documentation" | "property_partner"
    }},
    {{
      "action": "shift_schedule",
      "customer_id": <int>,
      "days": <int>
    }},
    {{
      "action": "update_customer_status",
      "customer_id": <int>,
      "status": "active" | "in_progress" | "completed" | "on_hold"
    }}
  ]
}}
"""

    from services import call_groq_llm
    llm_resp = call_groq_llm(system_prompt, f"Operational Instruction: {instruction}")

    parsed = None
    if llm_resp:
        try:
            clean_json = llm_resp.strip()
            if "```json" in clean_json:
                clean_json = clean_json.split("```json")[1].split("```")[0]
            elif "```" in clean_json:
                clean_json = clean_json.split("```")[1].split("```")[0]
            parsed = json.loads(clean_json.strip())
        except Exception as e:
            print(f"[Autonomous Agent] JSON parse error: {e}")

    if not parsed or "actions" not in parsed:
        parsed = _heuristic_agent_planner(db, instruction, target_customer_id)

    actions_executed = []
    checkpoint_id = None
    affected_customer_id = parsed.get("target_customer_id") or target_customer_id

    if not affected_customer_id:
        for c in customers:
            if c.name.lower() in instruction.lower():
                affected_customer_id = c.id
                break
        if not affected_customer_id and customers:
            affected_customer_id = customers[0].id

    snapshot_before = {}
    if affected_customer_id:
        project = db.query(RelocationProject).filter(RelocationProject.customer_id == affected_customer_id).first()
        if project:
            snapshot_before = _capture_project_snapshot(db, project.id)

    for act in parsed.get("actions", []):
        act_type = act.get("action")
        cid = act.get("customer_id") or affected_customer_id

        if act_type == "create_task" and cid:
            cust = db.query(Customer).filter(Customer.id == cid).first()
            if cust and cust.project:
                t = Task(
                    project_id=cust.project.id,
                    title=act.get("title", "AI Task"),
                    category=act.get("category", "moving"),
                    priority=act.get("priority", "medium"),
                    due_date=act.get("due_date") or (datetime.utcnow() + timedelta(days=3)).strftime("%Y-%m-%d"),
                    status="pending",
                    owner=cust.assigned_executive or "AI Agent",
                )
                db.add(t)
                db.commit()
                db.refresh(t)
                actions_executed.append({
                    "type": "create_task",
                    "description": f"Created task '{t.title}' for {cust.name}",
                    "details": f"Category: {t.category}, Priority: {t.priority}, Due: {t.due_date}",
                    "entity_id": t.id,
                })

        elif act_type == "update_task_status":
            tid = act.get("task_id")
            new_st = act.get("status", "completed")
            t = db.query(Task).filter(Task.id == tid).first()
            if t:
                old_st = t.status
                t.status = new_st
                db.commit()
                actions_executed.append({
                    "type": "update_task_status",
                    "description": f"Updated task '{t.title}' status to {new_st}",
                    "details": f"Status changed from {old_st} -> {new_st}",
                    "entity_id": t.id,
                })

        elif act_type == "delete_task":
            tid = act.get("task_id")
            t = db.query(Task).filter(Task.id == tid).first()
            if t:
                title = t.title
                db.delete(t)
                db.commit()
                actions_executed.append({
                    "type": "delete_task",
                    "description": f"Deleted task '{title}'",
                    "details": f"Removed from database",
                    "entity_id": tid,
                })

        elif act_type == "trigger_outreach" and cid:
            out_res = run_customer_outreach_agent(db, cid)
            actions_executed.append({
                "type": "trigger_outreach",
                "description": f"Triggered document magic link outreach to customer",
                "details": f"Magic link generated: {out_res.get('magic_link')}",
                "entity_id": cid,
            })

        elif act_type == "assign_vendor" and cid:
            v_res = run_vendor_match_agent(db, cid, act.get("vendor_type", "packers"))
            actions_executed.append({
                "type": "assign_vendor",
                "description": f"Proposed top vendor match via Admin HITL Gate",
                "details": f"Matched vendor: {v_res.get('vendor_name')} (Cost: ₹{v_res.get('estimated_cost', 0):,})",
                "entity_id": cid,
            })

        elif act_type == "shift_schedule" and cid:
            shift_days = act.get("days", 3)
            adapt_res = adapt_workflow_for_exception(db, cid, days_shift=shift_days, reason=instruction)
            actions_executed.append({
                "type": "shift_schedule",
                "description": f"Shifted move schedule by {shift_days} days",
                "details": f"New move date: {adapt_res.get('new_move_date')}, {adapt_res.get('rescheduled_tasks_count')} tasks updated",
                "entity_id": cid,
            })

        elif (act_type == "set_move_date" or act_type == "update_move_date") and cid:
            cust = db.query(Customer).filter(Customer.id == cid).first()
            if cust:
                new_date = act.get("new_move_date") or act.get("date") or "2026-07-31"
                old_date = cust.move_date
                cust.move_date = new_date
                db.commit()
                actions_executed.append({
                    "type": "set_move_date",
                    "description": f"Updated move date for {cust.name} to {cust.move_date}",
                    "details": f"Move date changed from {old_date} -> {cust.move_date}",
                    "entity_id": cid,
                })

        elif act_type == "update_customer_status" and cid:
            cust = db.query(Customer).filter(Customer.id == cid).first()
            if cust:
                cust.status = act.get("status", "active")
                db.commit()
                actions_executed.append({
                    "type": "update_customer_status",
                    "description": f"Updated customer '{cust.name}' status to {cust.status}",
                    "details": f"Customer status updated",
                    "entity_id": cid,
                })

    if affected_customer_id and actions_executed:
        proj = db.query(RelocationProject).filter(RelocationProject.customer_id == affected_customer_id).first()
        if proj:
            cp = create_checkpoint(
                db,
                project_id=proj.id,
                agent_name="Autonomous Operations Agent",
                action_description=f"Executed AI Agent directive: '{instruction[:60]}...'",
                snapshot_before=snapshot_before,
            )
            checkpoint_id = cp.id

    return {
        "status": "success",
        "instruction": instruction,
        "reasoning": parsed.get("reasoning", "Analyzed instruction and executed database action pipeline."),
        "actions_executed": actions_executed,
        "checkpoint_id": checkpoint_id,
    }

