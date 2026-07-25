"""
AI service layer with mock implementation.
Provides: chat, daily summary, risk detection, recommendations, workflow generation.
Designed so any LLM (OpenAI, Anthropic, Gemini) can be plugged in later.
"""

import os
import json
import urllib.request
from datetime import datetime, timedelta
from dotenv import load_dotenv
from sqlalchemy.orm import Session
from models import Customer, RelocationProject, Task, Vendor, Notification, ActivityLog

load_dotenv()


# ── Workflow Generator ────────────────────────────────────────────────

WORKFLOW_TEMPLATE = [
    # Property Search
    {
        "category": "property_search",
        "title": "Research apartments in destination city",
        "description": "Search for apartments matching customer preferences in the destination city. Consider budget, family size, and location preferences.",
        "priority": "high",
        "estimated_duration": "2 days",
        "risk_level": "medium",
        "checklist": [
            {"text": "Check online listings", "completed": False},
            {"text": "Contact property partners", "completed": False},
            {"text": "Prepare shortlist of 5+ options", "completed": False},
        ],
        "suggested_action": "Start by checking major property portals for the destination city.",
        "sort_order": 1,
    },
    {
        "category": "property_search",
        "title": "Shortlist apartments for customer review",
        "description": "Narrow down to 3-5 best options based on customer criteria.",
        "priority": "high",
        "estimated_duration": "1 day",
        "risk_level": "low",
        "checklist": [
            {"text": "Verify availability and pricing", "completed": False},
            {"text": "Collect photos and details", "completed": False},
            {"text": "Send shortlist to customer", "completed": False},
        ],
        "suggested_action": "Share the shortlist with the customer via email with photos and pricing.",
        "sort_order": 2,
    },
    {
        "category": "property_search",
        "title": "Schedule property visits",
        "description": "Coordinate visit schedule with customer and property owners/agents.",
        "priority": "medium",
        "estimated_duration": "2 days",
        "risk_level": "medium",
        "checklist": [
            {"text": "Confirm visit dates with customer", "completed": False},
            {"text": "Book appointments with property owners", "completed": False},
            {"text": "Arrange transportation if needed", "completed": False},
        ],
        "suggested_action": "Coordinate with the customer to find available dates for visits.",
        "sort_order": 3,
    },
    {
        "category": "property_search",
        "title": "Collect customer approval on apartment",
        "description": "Get final confirmation from customer on selected apartment.",
        "priority": "high",
        "estimated_duration": "1 day",
        "risk_level": "high",
        "checklist": [
            {"text": "Customer confirms selection", "completed": False},
            {"text": "Negotiate rent terms", "completed": False},
            {"text": "Initiate rental agreement", "completed": False},
        ],
        "suggested_action": "Follow up with customer for their decision on the shortlisted properties.",
        "sort_order": 4,
    },
    # Moving
    {
        "category": "moving",
        "title": "Find and assign moving vendor",
        "description": "Select a reliable packers and movers vendor for the relocation.",
        "priority": "high",
        "estimated_duration": "1 day",
        "risk_level": "medium",
        "checklist": [
            {"text": "Get quotes from 3 vendors", "completed": False},
            {"text": "Compare ratings and pricing", "completed": False},
            {"text": "Confirm vendor selection", "completed": False},
        ],
        "suggested_action": "Request quotes from top-rated moving vendors in the area.",
        "sort_order": 5,
    },
    {
        "category": "moving",
        "title": "Schedule pickup date and time",
        "description": "Coordinate with the moving vendor and customer for pickup logistics.",
        "priority": "high",
        "estimated_duration": "1 day",
        "risk_level": "medium",
        "checklist": [
            {"text": "Confirm date with customer", "completed": False},
            {"text": "Confirm date with vendor", "completed": False},
            {"text": "Share pickup address", "completed": False},
        ],
        "suggested_action": "Align vendor availability with the customer's preferred moving date.",
        "sort_order": 6,
    },
    {
        "category": "moving",
        "title": "Confirm packing and inventory",
        "description": "Verify packing requirements and create inventory list.",
        "priority": "medium",
        "estimated_duration": "1 day",
        "risk_level": "low",
        "checklist": [
            {"text": "Create inventory checklist", "completed": False},
            {"text": "Confirm special handling items", "completed": False},
            {"text": "Arrange packing materials", "completed": False},
        ],
        "suggested_action": "Ask the customer about any fragile or high-value items needing special care.",
        "sort_order": 7,
    },
    {
        "category": "moving",
        "title": "Coordinate delivery and unpacking",
        "description": "Manage the delivery at the destination and unpacking process.",
        "priority": "high",
        "estimated_duration": "1 day",
        "risk_level": "medium",
        "checklist": [
            {"text": "Confirm delivery address access", "completed": False},
            {"text": "Coordinate delivery timing", "completed": False},
            {"text": "Verify all items delivered", "completed": False},
        ],
        "suggested_action": "Ensure someone is available at destination to receive the delivery.",
        "sort_order": 8,
    },
    # Utilities
    {
        "category": "utilities",
        "title": "Set up electricity connection",
        "description": "Apply for electricity connection at the new address.",
        "priority": "high",
        "estimated_duration": "3 days",
        "risk_level": "medium",
        "checklist": [
            {"text": "Identify electricity provider", "completed": False},
            {"text": "Submit application", "completed": False},
            {"text": "Schedule meter installation", "completed": False},
            {"text": "Verify connection active", "completed": False},
        ],
        "suggested_action": "Contact the local electricity board for new connection requirements.",
        "sort_order": 9,
    },
    {
        "category": "utilities",
        "title": "Set up internet connection",
        "description": "Arrange broadband/fiber internet at the new address.",
        "priority": "medium",
        "estimated_duration": "3 days",
        "risk_level": "low",
        "checklist": [
            {"text": "Compare ISP plans", "completed": False},
            {"text": "Place order", "completed": False},
            {"text": "Schedule installation", "completed": False},
            {"text": "Test connection", "completed": False},
        ],
        "suggested_action": "Check which ISPs provide service in the new locality.",
        "sort_order": 10,
    },
    {
        "category": "utilities",
        "title": "Set up water supply",
        "description": "Ensure water supply is active at the new address.",
        "priority": "high",
        "estimated_duration": "2 days",
        "risk_level": "low",
        "checklist": [
            {"text": "Verify water supply availability", "completed": False},
            {"text": "Apply for connection if needed", "completed": False},
            {"text": "Arrange water purifier", "completed": False},
        ],
        "suggested_action": "Check with the landlord if water supply is already active.",
        "sort_order": 11,
    },
    {
        "category": "utilities",
        "title": "Set up gas connection",
        "description": "Apply for cooking gas connection at the new address.",
        "priority": "medium",
        "estimated_duration": "3 days",
        "risk_level": "low",
        "checklist": [
            {"text": "Apply for new connection or transfer", "completed": False},
            {"text": "Schedule delivery", "completed": False},
            {"text": "Verify connection", "completed": False},
        ],
        "suggested_action": "Check if an existing gas connection can be transferred.",
        "sort_order": 12,
    },
    # Documentation
    {
        "category": "documentation",
        "title": "Update address on Aadhaar card",
        "description": "Initiate Aadhaar address update process for all family members.",
        "priority": "high",
        "estimated_duration": "5 days",
        "risk_level": "medium",
        "checklist": [
            {"text": "Gather address proof documents", "completed": False},
            {"text": "Submit online request", "completed": False},
            {"text": "Schedule biometric if needed", "completed": False},
            {"text": "Track update status", "completed": False},
        ],
        "suggested_action": "Start the online Aadhaar update process on the UIDAI portal.",
        "sort_order": 13,
    },
    {
        "category": "documentation",
        "title": "Update bank account address",
        "description": "Update address in all bank accounts.",
        "priority": "high",
        "estimated_duration": "3 days",
        "risk_level": "low",
        "checklist": [
            {"text": "List all bank accounts", "completed": False},
            {"text": "Submit address change requests", "completed": False},
            {"text": "Update linked mobile/email if needed", "completed": False},
        ],
        "suggested_action": "Most banks allow online address updates through net banking.",
        "sort_order": 14,
    },
    {
        "category": "documentation",
        "title": "Update insurance policies",
        "description": "Notify insurance providers of address change.",
        "priority": "medium",
        "estimated_duration": "2 days",
        "risk_level": "low",
        "checklist": [
            {"text": "List all insurance policies", "completed": False},
            {"text": "Contact each provider", "completed": False},
            {"text": "Confirm updates", "completed": False},
        ],
        "suggested_action": "Email or call insurance providers with the new address details.",
        "sort_order": 15,
    },
    {
        "category": "documentation",
        "title": "Update subscription services",
        "description": "Update delivery address for all subscriptions and online services.",
        "priority": "low",
        "estimated_duration": "1 day",
        "risk_level": "low",
        "checklist": [
            {"text": "List all subscriptions", "completed": False},
            {"text": "Update delivery addresses", "completed": False},
            {"text": "Update billing addresses", "completed": False},
        ],
        "suggested_action": "Go through recent transactions to identify all active subscriptions.",
        "sort_order": 16,
    },
    {
        "category": "documentation",
        "title": "Prepare rental agreement",
        "description": "Draft and execute rental agreement for the new apartment.",
        "priority": "high",
        "estimated_duration": "3 days",
        "risk_level": "high",
        "checklist": [
            {"text": "Draft agreement terms", "completed": False},
            {"text": "Review with customer", "completed": False},
            {"text": "Get signatures", "completed": False},
            {"text": "Register if required", "completed": False},
        ],
        "suggested_action": "Coordinate with the landlord to finalize rental terms.",
        "sort_order": 17,
    },
    # Post-Move
    {
        "category": "post_move",
        "title": "Customer move-in confirmation",
        "description": "Verify that the customer has successfully moved in and settled.",
        "priority": "high",
        "estimated_duration": "1 day",
        "risk_level": "low",
        "checklist": [
            {"text": "Confirm customer has moved in", "completed": False},
            {"text": "Check all utilities working", "completed": False},
            {"text": "Verify no damage during transit", "completed": False},
        ],
        "suggested_action": "Call the customer to confirm everything is in order.",
        "sort_order": 18,
    },
    {
        "category": "post_move",
        "title": "Resolve pending issues",
        "description": "Address any outstanding issues from the relocation process.",
        "priority": "medium",
        "estimated_duration": "2 days",
        "risk_level": "medium",
        "checklist": [
            {"text": "List all pending items", "completed": False},
            {"text": "Assign owners for resolution", "completed": False},
            {"text": "Follow up on each item", "completed": False},
        ],
        "suggested_action": "Review the task list for any incomplete items.",
        "sort_order": 19,
    },
    {
        "category": "post_move",
        "title": "Collect customer feedback",
        "description": "Gather feedback on the relocation experience.",
        "priority": "medium",
        "estimated_duration": "1 day",
        "risk_level": "low",
        "checklist": [
            {"text": "Send feedback form", "completed": False},
            {"text": "Follow up if no response", "completed": False},
            {"text": "Record feedback", "completed": False},
        ],
        "suggested_action": "Send the feedback form via email and WhatsApp.",
        "sort_order": 20,
    },
]

EXECUTIVES = ["Priya Sharma", "Amit Patel", "Neha Gupta", "Vikram Singh", "Anjali Mehta"]


def generate_workflow(db: Session, project_id: int, customer: Customer) -> list[Task]:
    """Generate a complete relocation workflow for a customer."""
    import random

    tasks = []
    move_date = None
    try:
        move_date = datetime.strptime(customer.move_date, "%Y-%m-%d")
    except (ValueError, TypeError):
        move_date = datetime.utcnow() + timedelta(days=30)

    for i, tmpl in enumerate(WORKFLOW_TEMPLATE):
        # Calculate due dates relative to move date
        days_before = max(1, len(WORKFLOW_TEMPLATE) - i) * 2
        due = move_date - timedelta(days=days_before)
        if due < datetime.utcnow():
            due = datetime.utcnow() + timedelta(days=i + 1)

        owner = customer.assigned_executive or random.choice(EXECUTIVES)

        task = Task(
            project_id=project_id,
            category=tmpl["category"],
            title=tmpl["title"],
            description=tmpl["description"],
            priority=tmpl["priority"],
            status="pending",
            owner=owner,
            due_date=due.strftime("%Y-%m-%d"),
            estimated_duration=tmpl["estimated_duration"],
            risk_level=tmpl["risk_level"],
            dependencies=[],
            checklist=tmpl["checklist"],
            suggested_action=tmpl["suggested_action"],
            sort_order=tmpl["sort_order"],
        )
        db.add(task)
        tasks.append(task)

    db.commit()
    return tasks


# ── Risk Detection ────────────────────────────────────────────────────

def detect_risks(db: Session) -> list[dict]:
    """Detect risks across all active relocations using rule-based logic."""
    risks = []
    today = datetime.utcnow().strftime("%Y-%m-%d")
    today_dt = datetime.utcnow()

    # Check all active projects
    projects = db.query(RelocationProject).filter(
        RelocationProject.status.in_(["planning", "in_progress"])
    ).all()

    for project in projects:
        customer = project.customer
        tasks = project.tasks

        # 1. Missing documents
        if customer.documents_required:
            docs = [d.category for d in customer.documents]
            for req in customer.documents_required:
                if req.lower().replace(" ", "_") not in [d.lower() for d in docs]:
                    risks.append({
                        "type": "missing_document",
                        "severity": "warning",
                        "message": f"Missing document '{req}' for {customer.name}",
                        "customer_name": customer.name,
                        "customer_id": customer.id,
                        "task_id": None,
                    })

        # 2. Overdue tasks
        for task in tasks:
            if task.status not in ("completed",) and task.due_date and task.due_date < today:
                risks.append({
                    "type": "overdue_task",
                    "severity": "error",
                    "message": f"Task '{task.title}' for {customer.name} is overdue (due: {task.due_date})",
                    "customer_name": customer.name,
                    "customer_id": customer.id,
                    "task_id": task.id,
                })

        # 3. Tasks without owners
        for task in tasks:
            if task.status not in ("completed",) and not task.owner:
                risks.append({
                    "type": "unassigned_task",
                    "severity": "warning",
                    "message": f"Task '{task.title}' for {customer.name} has no owner assigned",
                    "customer_name": customer.name,
                    "customer_id": customer.id,
                    "task_id": task.id,
                })

        # 4. Tight timeline (move date within 3 days with incomplete high-priority tasks)
        try:
            move_dt = datetime.strptime(customer.move_date, "%Y-%m-%d")
            if (move_dt - today_dt).days <= 3:
                incomplete_high = [t for t in tasks if t.priority == "high" and t.status != "completed"]
                if incomplete_high:
                    risks.append({
                        "type": "tight_timeline",
                        "severity": "critical",
                        "message": f"{customer.name} moves in {(move_dt - today_dt).days} days with {len(incomplete_high)} high-priority tasks pending",
                        "customer_name": customer.name,
                        "customer_id": customer.id,
                        "task_id": None,
                    })
        except (ValueError, TypeError):
            pass

        # 5. Blocked tasks
        blocked = [t for t in tasks if t.status == "blocked"]
        for task in blocked:
            risks.append({
                "type": "blocked_task",
                "severity": "error",
                "message": f"Task '{task.title}' for {customer.name} is blocked",
                "customer_name": customer.name,
                "customer_id": customer.id,
                "task_id": task.id,
            })

        # 6. Low completion with approaching move date
        try:
            move_dt = datetime.strptime(customer.move_date, "%Y-%m-%d")
            days_left = (move_dt - today_dt).days
            if 0 < days_left <= 7 and project.completion_pct < 50:
                risks.append({
                    "type": "low_progress",
                    "severity": "critical",
                    "message": f"{customer.name} is only {project.completion_pct:.0f}% complete with {days_left} days until move",
                    "customer_name": customer.name,
                    "customer_id": customer.id,
                    "task_id": None,
                })
        except (ValueError, TypeError):
            pass

    return risks


# ── Groq LLM Integration ──────────────────────────────────────────────

def call_groq_llm(system_prompt: str, user_message: str) -> str | None:
    """Call Groq API using llama-3.3-70b-versatile."""
    api_key = os.getenv("GROQ_API_KEY", "").strip()
    if not api_key:
        return None
    model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile").strip()
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) QuickMove/1.0",
    }
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        "temperature": 0.3,
        "max_tokens": 800,
    }
    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers=headers,
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=12) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data["choices"][0]["message"]["content"]
    except urllib.error.HTTPError as err:
        try:
            err_body = err.read().decode("utf-8")
            print(f"[Groq LLM Service] HTTP Error {err.code}: {err_body}")
        except Exception:
            print(f"[Groq LLM Service] HTTP Error {err.code}: {err.reason}")
        return None
    except Exception as e:
        print(f"[Groq LLM Service] API Call Error: {e}")
        return None



# ── AI Chat ────────────────────────────────────────────────────────────

def ai_chat(db: Session, message: str) -> dict:
    """Process a chat message using Groq LLM if API key exists, else fallback to mock."""
    msg_lower = message.lower().strip()
    suggestions = [
        "What is pending for today?",
        "Which relocations are delayed?",
        "Show customers moving this week",
        "What should I do today?",
        "Summarize active relocations",
    ]

    # Check if Groq API key is present
    api_key = os.getenv("GROQ_API_KEY", "").strip()
    if api_key:
        summary_data = generate_daily_summary(db)
        risks_data = detect_risks(db)
        
        # 1. Search DB for any customer mentioned in the user's message
        customer_matches = []
        all_customers = db.query(Customer).all()
        for c in all_customers:
            name_parts = c.name.lower().split()
            if any(part in msg_lower for part in name_parts if len(part) > 2) or c.name.lower() in msg_lower:
                tasks_info = []
                if c.project:
                    for t in c.project.tasks:
                        tasks_info.append(f"    * [{t.status.upper()}] {t.title} (Priority: {t.priority}, Due: {t.due_date})")
                customer_matches.append(
                    f"Customer: {c.name} | Phone: {c.phone} | Route: {c.current_city} -> {c.destination_city} | Move Date: {c.move_date} | Status: {c.status} | Executive: {c.assigned_executive} | Completion: {c.project.completion_pct if c.project else 0:.0f}%\n" +
                    ("  Tasks:\n" + "\n".join(tasks_info[:10]) if tasks_info else "  No tasks")
                )

        # 2. Build concise context for all active customers
        active_customers_summary = []
        for c in db.query(Customer).filter(Customer.status != "completed").limit(30).all():
            pct = f"{c.project.completion_pct:.0f}%" if c.project else "0%"
            active_customers_summary.append(f"- {c.name}: {c.current_city} -> {c.destination_city} (Move: {c.move_date}, Progress: {pct}, Executive: {c.assigned_executive}, Status: {c.status})")

        matched_context = ""
        if customer_matches:
            matched_context = "\n=== RELEVANT CUSTOMER MATCHES ===\n" + "\n\n".join(customer_matches) + "\n"

        system_prompt = f"""You are the QuickMove AI Relocation Operations Assistant.
You assist operations executives with tracking customer moves, task management, vendor logistics, risk analysis, and customer updates.

{matched_context}
=== OVERALL OPERATIONS CONTEXT ===
- Active Relocations: {summary_data['stats']['active_relocations']}
- Completed Relocations: {summary_data['stats']['completed_relocations']}
- Total Tasks: {summary_data['stats']['total_tasks']} (Completed: {summary_data['stats']['completed_tasks']}, Overdue: {summary_data['stats']['overdue_count']}, Blocked: {summary_data['stats']['blocked_count']})
- High Risk Relocations: {', '.join(summary_data['high_risk'][:5])}
- Known Risks: {[r['message'] for r in risks_data[:5]]}

=== ALL ACTIVE CUSTOMERS SUMMARY ===
{chr(10).join(active_customers_summary)}

Instructions:
- Answer user queries directly and concisely using the provided context.
- If asking about a specific customer, check the customer matches and active customer list carefully.
- If a customer exists, summarize their move details, status, route, and pending tasks clearly.
- Do not use emojis."""

        llm_response = call_groq_llm(system_prompt, message)
        if llm_response:
            return {"response": llm_response, "suggestions": suggestions}

    # Fallback to smart rule-based mock matching if no API key or API call failed


    # "what is pending for <name>"
    if "pending" in msg_lower and "for" in msg_lower:
        # Extract name after "for"
        parts = msg_lower.split("for")
        if len(parts) > 1:
            name_query = parts[-1].strip().rstrip("?").strip()
            customer = db.query(Customer).filter(
                Customer.name.ilike(f"%{name_query}%")
            ).first()
            if customer and customer.project:
                pending_tasks = [t for t in customer.project.tasks if t.status in ("pending", "in_progress", "waiting", "blocked")]
                if pending_tasks:
                    lines = [f"Pending tasks for {customer.name} ({customer.current_city} -> {customer.destination_city}):"]
                    lines.append("")
                    for t in pending_tasks:
                        status_label = t.status.upper()
                        lines.append(f"- [{status_label}] {t.title} (Priority: {t.priority}, Due: {t.due_date or 'Not set'})")
                    lines.append(f"\nTotal: {len(pending_tasks)} pending tasks out of {len(customer.project.tasks)}")
                    return {"response": "\n".join(lines), "suggestions": suggestions}
                else:
                    return {"response": f"All tasks for {customer.name} are completed.", "suggestions": suggestions}
            else:
                return {"response": f"No customer found matching '{name_query}'.", "suggestions": suggestions}

    # "delayed" / "overdue"
    if "delayed" in msg_lower or "overdue" in msg_lower:
        today = datetime.utcnow().strftime("%Y-%m-%d")
        overdue = db.query(Task).filter(
            Task.status.notin_(["completed"]),
            Task.due_date < today,
            Task.due_date != "",
        ).all()
        if overdue:
            lines = [f"There are {len(overdue)} overdue tasks:", ""]
            for t in overdue[:15]:
                customer = t.project.customer if t.project else None
                cname = customer.name if customer else "Unknown"
                lines.append(f"- {t.title} (Customer: {cname}, Due: {t.due_date}, Status: {t.status})")
            if len(overdue) > 15:
                lines.append(f"\n...and {len(overdue) - 15} more.")
            return {"response": "\n".join(lines), "suggestions": suggestions}
        else:
            return {"response": "No overdue tasks found. Everything is on track.", "suggestions": suggestions}

    # "moving this week"
    if "this week" in msg_lower or "moving this week" in msg_lower:
        today = datetime.utcnow()
        week_end = today + timedelta(days=7)
        customers = db.query(Customer).filter(
            Customer.move_date >= today.strftime("%Y-%m-%d"),
            Customer.move_date <= week_end.strftime("%Y-%m-%d"),
        ).all()
        if customers:
            lines = [f"{len(customers)} customers moving this week:", ""]
            for c in customers:
                pct = c.project.completion_pct if c.project else 0
                lines.append(f"- {c.name}: {c.current_city} -> {c.destination_city} (Move: {c.move_date}, Progress: {pct:.0f}%)")
            return {"response": "\n".join(lines), "suggestions": suggestions}
        else:
            return {"response": "No customers are scheduled to move this week.", "suggestions": suggestions}

    # "what should I do today" / "priorities"
    if "today" in msg_lower or "priorit" in msg_lower or "what should" in msg_lower:
        today = datetime.utcnow().strftime("%Y-%m-%d")
        due_today = db.query(Task).filter(Task.due_date == today, Task.status != "completed").all()
        overdue = db.query(Task).filter(Task.due_date < today, Task.due_date != "", Task.status.notin_(["completed"])).all()
        blocked = db.query(Task).filter(Task.status == "blocked").all()

        lines = ["Here is your daily briefing:", ""]
        if overdue:
            lines.append(f"OVERDUE ({len(overdue)} tasks):")
            for t in overdue[:5]:
                cname = t.project.customer.name if t.project and t.project.customer else "Unknown"
                lines.append(f"  - {t.title} ({cname}) - Due: {t.due_date}")
            lines.append("")

        if due_today:
            lines.append(f"DUE TODAY ({len(due_today)} tasks):")
            for t in due_today[:5]:
                cname = t.project.customer.name if t.project and t.project.customer else "Unknown"
                lines.append(f"  - {t.title} ({cname}) - Priority: {t.priority}")
            lines.append("")

        if blocked:
            lines.append(f"BLOCKED ({len(blocked)} tasks):")
            for t in blocked[:5]:
                cname = t.project.customer.name if t.project and t.project.customer else "Unknown"
                lines.append(f"  - {t.title} ({cname})")
            lines.append("")

        if not overdue and not due_today and not blocked:
            lines.append("All clear for today. No overdue, due-today, or blocked tasks.")

        return {"response": "\n".join(lines), "suggestions": suggestions}

    # "summarize" or "summary"
    if "summar" in msg_lower:
        active = db.query(RelocationProject).filter(RelocationProject.status.in_(["planning", "in_progress"])).count()
        completed = db.query(RelocationProject).filter(RelocationProject.status == "completed").count()
        total_tasks = db.query(Task).count()
        done_tasks = db.query(Task).filter(Task.status == "completed").count()
        blocked_tasks = db.query(Task).filter(Task.status == "blocked").count()

        lines = [
            "Relocation Operations Summary:",
            "",
            f"- Active relocations: {active}",
            f"- Completed relocations: {completed}",
            f"- Total tasks: {total_tasks}",
            f"- Completed tasks: {done_tasks}",
            f"- Blocked tasks: {blocked_tasks}",
            f"- Completion rate: {(done_tasks / total_tasks * 100) if total_tasks else 0:.1f}%",
        ]
        return {"response": "\n".join(lines), "suggestions": suggestions}

    # "vendor" with "delay" or "performance"
    if "vendor" in msg_lower and ("delay" in msg_lower or "performance" in msg_lower):
        vendors = db.query(Vendor).order_by(Vendor.avg_delay_days.desc()).limit(10).all()
        if vendors:
            lines = ["Vendor performance (sorted by delay):", ""]
            for v in vendors:
                lines.append(f"- {v.name} ({v.type}): Rating {v.rating}/5, Avg delay: {v.avg_delay_days:.1f} days, Jobs: {v.past_jobs}")
            return {"response": "\n".join(lines), "suggestions": suggestions}

    # Default response
    total_customers = db.query(Customer).count()
    active = db.query(RelocationProject).filter(RelocationProject.status.in_(["planning", "in_progress"])).count()
    return {
        "response": (
            f"I can help you manage your relocation operations. "
            f"Currently tracking {total_customers} customers with {active} active relocations.\n\n"
            f"Try asking me:\n"
            f"- 'What is pending for [customer name]?'\n"
            f"- 'Which relocations are delayed?'\n"
            f"- 'Show customers moving this week'\n"
            f"- 'What should I do today?'\n"
            f"- 'Summarize active relocations'\n"
            f"- 'Which vendor has the most delays?'"
        ),
        "suggestions": suggestions,
    }


# ── Daily Summary ─────────────────────────────────────────────────────

def generate_daily_summary(db: Session) -> dict:
    """Generate the AI daily summary from current data."""
    today = datetime.utcnow().strftime("%Y-%m-%d")
    today_dt = datetime.utcnow()
    week_end = (today_dt + timedelta(days=7)).strftime("%Y-%m-%d")

    # Tasks due today
    due_today = db.query(Task).filter(Task.due_date == today, Task.status != "completed").all()
    # Overdue
    overdue = db.query(Task).filter(Task.due_date < today, Task.due_date != "", Task.status.notin_(["completed"])).all()
    # Blocked
    blocked = db.query(Task).filter(Task.status == "blocked").all()
    # High priority pending
    high_pri = db.query(Task).filter(Task.priority == "high", Task.status.in_(["pending", "in_progress"])).all()
    # Customers moving this week
    moving_soon = db.query(Customer).filter(Customer.move_date >= today, Customer.move_date <= week_end).all()
    # Active projects with low completion
    at_risk = db.query(RelocationProject).filter(
        RelocationProject.status.in_(["planning", "in_progress"]),
        RelocationProject.completion_pct < 30,
    ).all()

    # Stats
    total_active = db.query(RelocationProject).filter(RelocationProject.status.in_(["planning", "in_progress"])).count()
    total_completed = db.query(RelocationProject).filter(RelocationProject.status == "completed").count()
    total_tasks = db.query(Task).count()
    done_tasks = db.query(Task).filter(Task.status == "completed").count()

    return {
        "date": today,
        "priorities": [f"{t.title} - {t.project.customer.name if t.project and t.project.customer else 'N/A'}" for t in (overdue + due_today)[:10]],
        "pending_approvals": [f"{t.title} ({t.project.customer.name if t.project and t.project.customer else 'N/A'})" for t in high_pri if t.status == "waiting"][:5],
        "high_risk": [f"{p.customer.name}: {p.completion_pct:.0f}% complete" for p in at_risk if p.customer][:5],
        "follow_ups": [f"{c.name} - moving on {c.move_date}" for c in moving_soon][:5],
        "deadlines": [f"{t.title} due {t.due_date}" for t in due_today][:5],
        "blocked": [f"{t.title} ({t.project.customer.name if t.project and t.project.customer else 'N/A'})" for t in blocked][:5],
        "stats": {
            "active_relocations": total_active,
            "completed_relocations": total_completed,
            "total_tasks": total_tasks,
            "completed_tasks": done_tasks,
            "overdue_count": len(overdue),
            "blocked_count": len(blocked),
            "due_today_count": len(due_today),
        },
    }


# ── Recommendations ──────────────────────────────────────────────────

def generate_recommendations(db: Session) -> list[dict]:
    """Generate AI-powered recommendations based on current data."""
    recommendations = []
    today = datetime.utcnow().strftime("%Y-%m-%d")

    # 1. Unassigned tasks
    unassigned = db.query(Task).filter(Task.owner == "", Task.status != "completed").count()
    if unassigned > 0:
        recommendations.append({
            "type": "assignment",
            "priority": "high",
            "message": f"{unassigned} tasks have no owner assigned. Assign owners to prevent bottlenecks.",
            "action": "Review unassigned tasks and distribute among team members.",
        })

    # 2. Overdue tasks
    overdue_count = db.query(Task).filter(Task.due_date < today, Task.due_date != "", Task.status.notin_(["completed"])).count()
    if overdue_count > 0:
        recommendations.append({
            "type": "urgency",
            "priority": "critical",
            "message": f"{overdue_count} tasks are overdue. These need immediate attention.",
            "action": "Prioritize overdue tasks and reschedule if necessary.",
        })

    # 3. Blocked tasks
    blocked = db.query(Task).filter(Task.status == "blocked").count()
    if blocked > 0:
        recommendations.append({
            "type": "workflow",
            "priority": "high",
            "message": f"{blocked} tasks are blocked. Resolve blockers to keep workflows moving.",
            "action": "Investigate blocked tasks and remove dependencies or resolve issues.",
        })

    # 4. Vendor delays
    slow_vendors = db.query(Vendor).filter(Vendor.avg_delay_days > 2).all()
    if slow_vendors:
        recommendations.append({
            "type": "vendor",
            "priority": "medium",
            "message": f"{len(slow_vendors)} vendors have average delays over 2 days. Consider alternatives.",
            "action": "Review vendor performance and consider replacing slow vendors.",
        })

    # 5. Parallel tasks
    projects = db.query(RelocationProject).filter(RelocationProject.status == "in_progress").all()
    for p in projects[:5]:
        pending = [t for t in p.tasks if t.status == "pending"]
        independent = [t for t in pending if not t.dependencies or len(t.dependencies) == 0]
        if len(independent) >= 3:
            cname = p.customer.name if p.customer else "Unknown"
            recommendations.append({
                "type": "optimization",
                "priority": "medium",
                "message": f"{cname} has {len(independent)} independent tasks that can run in parallel.",
                "action": f"Start these tasks simultaneously to speed up the relocation.",
            })

    # 6. General tips
    if not recommendations:
        recommendations.append({
            "type": "status",
            "priority": "low",
            "message": "Operations are running smoothly. No immediate actions needed.",
            "action": "Continue monitoring and check back later.",
        })

    return recommendations
