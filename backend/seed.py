"""
Seed script: generates 50 customers, 20 vendors, 200+ tasks, activity logs, and notifications.
Run with: python seed.py
"""

import random
from datetime import datetime, timedelta
from database import engine, SessionLocal, Base
from models import Customer, RelocationProject, Task, Vendor, Document, ActivityLog, Notification

# ── Data pools ────────────────────────────────────────────────────────

FIRST_NAMES = [
    "Rahul", "Priya", "Amit", "Sneha", "Vikram", "Anjali", "Rohit", "Deepika",
    "Arjun", "Kavita", "Suresh", "Meera", "Rajesh", "Pooja", "Karthik",
    "Swati", "Nikhil", "Divya", "Sanjay", "Ritu", "Arun", "Nisha",
    "Manoj", "Anita", "Gaurav", "Shweta", "Varun", "Pallavi", "Dhruv",
    "Isha", "Harsh", "Tanvi", "Kunal", "Shruti", "Abhishek", "Neelam",
    "Pranav", "Sonali", "Tarun", "Bhavna", "Vivek", "Komal", "Akash",
    "Jyoti", "Vishal", "Rekha", "Manish", "Usha", "Sachin", "Geeta",
]

LAST_NAMES = [
    "Sharma", "Patel", "Gupta", "Singh", "Kumar", "Mehta", "Reddy",
    "Iyer", "Nair", "Joshi", "Verma", "Malhotra", "Chopra", "Bhatia",
    "Agarwal", "Desai", "Rao", "Pillai", "Menon", "Tiwari", "Chauhan",
    "Saxena", "Pandey", "Mishra", "Kulkarni",
]

CITIES = [
    "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai",
    "Pune", "Kolkata", "Ahmedabad", "Jaipur", "Lucknow",
    "Noida", "Gurgaon", "Chandigarh", "Kochi",
]

EXECUTIVES = ["Priya Sharma", "Amit Patel", "Neha Gupta", "Vikram Singh", "Anjali Mehta"]

APT_PREFS = ["1 BHK", "2 BHK", "3 BHK", "Studio", "1 RK", "4 BHK"]

BUDGETS = [
    "8000-12000", "10000-15000", "12000-18000", "15000-20000",
    "18000-25000", "20000-30000", "25000-35000", "30000-45000",
    "40000-60000", "50000-80000",
]

UTILITIES = ["electricity", "internet", "water", "gas"]
DOCS_REQUIRED = ["aadhaar", "pan_card", "rental_agreement", "bank_statement", "id_proof"]

STATUSES = ["active", "in_progress", "completed", "on_hold"]
STATUS_WEIGHTS = [25, 35, 30, 10]

TASK_STATUSES = ["pending", "in_progress", "waiting", "blocked", "completed"]
TASK_STATUS_WEIGHTS = [20, 25, 10, 8, 37]

PRIORITIES = ["low", "medium", "high", "critical"]
PRIORITY_WEIGHTS = [15, 40, 35, 10]

# Vendor data
VENDOR_DATA = [
    # Packers & Movers
    {"name": "SwiftMove Packers", "type": "packers", "city": "Mumbai", "rating": 4.5, "past_jobs": 145, "avg_delay_days": 0.5},
    {"name": "SafeShift Logistics", "type": "packers", "city": "Delhi", "rating": 4.2, "past_jobs": 120, "avg_delay_days": 1.2},
    {"name": "HomeTrans Movers", "type": "packers", "city": "Bangalore", "rating": 4.7, "past_jobs": 98, "avg_delay_days": 0.3},
    {"name": "QuickPack Solutions", "type": "packers", "city": "Pune", "rating": 3.8, "past_jobs": 76, "avg_delay_days": 2.1},
    {"name": "ReloEase Packers", "type": "packers", "city": "Hyderabad", "rating": 4.0, "past_jobs": 89, "avg_delay_days": 1.5},
    # Internet
    {"name": "JioFiber Services", "type": "internet", "city": "Mumbai", "rating": 4.3, "past_jobs": 200, "avg_delay_days": 1.0},
    {"name": "Airtel Broadband", "type": "internet", "city": "Delhi", "rating": 4.1, "past_jobs": 180, "avg_delay_days": 1.5},
    {"name": "ACT Fibernet", "type": "internet", "city": "Bangalore", "rating": 4.6, "past_jobs": 150, "avg_delay_days": 0.5},
    # Electricity
    {"name": "MSEDCL Connect", "type": "electricity", "city": "Mumbai", "rating": 3.9, "past_jobs": 95, "avg_delay_days": 2.0},
    {"name": "BSES Delhi", "type": "electricity", "city": "Delhi", "rating": 3.7, "past_jobs": 110, "avg_delay_days": 2.5},
    {"name": "BESCOM Services", "type": "electricity", "city": "Bangalore", "rating": 4.0, "past_jobs": 88, "avg_delay_days": 1.8},
    # Gas
    {"name": "Indane Gas Agency", "type": "gas", "city": "Mumbai", "rating": 4.2, "past_jobs": 130, "avg_delay_days": 1.0},
    {"name": "HP Gas Connect", "type": "gas", "city": "Delhi", "rating": 4.0, "past_jobs": 105, "avg_delay_days": 1.3},
    {"name": "Bharat Gas Services", "type": "gas", "city": "Bangalore", "rating": 3.9, "past_jobs": 92, "avg_delay_days": 1.7},
    # Water
    {"name": "Municipal Water Board", "type": "water", "city": "Mumbai", "rating": 3.5, "past_jobs": 70, "avg_delay_days": 3.0},
    {"name": "DJB Water Services", "type": "water", "city": "Delhi", "rating": 3.3, "past_jobs": 65, "avg_delay_days": 3.5},
    # Property Partners
    {"name": "NestAway Properties", "type": "property_partner", "city": "Bangalore", "rating": 4.4, "past_jobs": 160, "avg_delay_days": 0.8},
    {"name": "MagicBricks Local", "type": "property_partner", "city": "Mumbai", "rating": 4.1, "past_jobs": 140, "avg_delay_days": 1.0},
    {"name": "Housing Connect", "type": "property_partner", "city": "Delhi", "rating": 4.3, "past_jobs": 125, "avg_delay_days": 0.7},
    {"name": "99acres Partner", "type": "property_partner", "city": "Pune", "rating": 4.0, "past_jobs": 100, "avg_delay_days": 1.2},
]

# Task templates (same as in services.py but used for seeding with varied statuses)
TASK_TEMPLATES = [
    {"category": "property_search", "title": "Research apartments in destination city", "description": "Search for apartments matching customer preferences.", "estimated_duration": "2 days", "checklist": [{"text": "Check online listings", "completed": False}, {"text": "Contact property partners", "completed": False}, {"text": "Prepare shortlist", "completed": False}]},
    {"category": "property_search", "title": "Shortlist apartments for customer review", "description": "Narrow down to best options.", "estimated_duration": "1 day", "checklist": [{"text": "Verify availability", "completed": False}, {"text": "Collect photos", "completed": False}, {"text": "Send shortlist", "completed": False}]},
    {"category": "property_search", "title": "Schedule property visits", "description": "Coordinate visits with customer and owners.", "estimated_duration": "2 days", "checklist": [{"text": "Confirm dates", "completed": False}, {"text": "Book appointments", "completed": False}]},
    {"category": "property_search", "title": "Collect customer approval on apartment", "description": "Get final confirmation on selected apartment.", "estimated_duration": "1 day", "checklist": [{"text": "Customer confirms", "completed": False}, {"text": "Negotiate terms", "completed": False}]},
    {"category": "moving", "title": "Find and assign moving vendor", "description": "Select a reliable packers and movers vendor.", "estimated_duration": "1 day", "checklist": [{"text": "Get quotes", "completed": False}, {"text": "Compare vendors", "completed": False}, {"text": "Confirm selection", "completed": False}]},
    {"category": "moving", "title": "Schedule pickup date and time", "description": "Coordinate pickup logistics.", "estimated_duration": "1 day", "checklist": [{"text": "Confirm with customer", "completed": False}, {"text": "Confirm with vendor", "completed": False}]},
    {"category": "moving", "title": "Confirm packing and inventory", "description": "Verify packing requirements.", "estimated_duration": "1 day", "checklist": [{"text": "Create inventory", "completed": False}, {"text": "Special items noted", "completed": False}]},
    {"category": "moving", "title": "Coordinate delivery and unpacking", "description": "Manage delivery at destination.", "estimated_duration": "1 day", "checklist": [{"text": "Confirm address access", "completed": False}, {"text": "Verify all items", "completed": False}]},
    {"category": "utilities", "title": "Set up electricity connection", "description": "Apply for electricity at new address.", "estimated_duration": "3 days", "checklist": [{"text": "Identify provider", "completed": False}, {"text": "Submit application", "completed": False}, {"text": "Verify connection", "completed": False}]},
    {"category": "utilities", "title": "Set up internet connection", "description": "Arrange broadband at new address.", "estimated_duration": "3 days", "checklist": [{"text": "Compare ISPs", "completed": False}, {"text": "Place order", "completed": False}, {"text": "Test connection", "completed": False}]},
    {"category": "utilities", "title": "Set up water supply", "description": "Ensure water supply at new address.", "estimated_duration": "2 days", "checklist": [{"text": "Verify availability", "completed": False}, {"text": "Apply if needed", "completed": False}]},
    {"category": "utilities", "title": "Set up gas connection", "description": "Apply for gas connection.", "estimated_duration": "3 days", "checklist": [{"text": "Apply or transfer", "completed": False}, {"text": "Schedule delivery", "completed": False}]},
    {"category": "documentation", "title": "Update address on Aadhaar card", "description": "Initiate Aadhaar address update.", "estimated_duration": "5 days", "checklist": [{"text": "Gather proofs", "completed": False}, {"text": "Submit request", "completed": False}, {"text": "Track status", "completed": False}]},
    {"category": "documentation", "title": "Update bank account address", "description": "Update address in all banks.", "estimated_duration": "3 days", "checklist": [{"text": "List accounts", "completed": False}, {"text": "Submit changes", "completed": False}]},
    {"category": "documentation", "title": "Update insurance policies", "description": "Notify insurers of address change.", "estimated_duration": "2 days", "checklist": [{"text": "List policies", "completed": False}, {"text": "Contact providers", "completed": False}]},
    {"category": "documentation", "title": "Update subscription services", "description": "Update delivery and billing addresses.", "estimated_duration": "1 day", "checklist": [{"text": "List subscriptions", "completed": False}, {"text": "Update addresses", "completed": False}]},
    {"category": "documentation", "title": "Prepare rental agreement", "description": "Draft and execute rental agreement.", "estimated_duration": "3 days", "checklist": [{"text": "Draft terms", "completed": False}, {"text": "Get signatures", "completed": False}, {"text": "Register", "completed": False}]},
    {"category": "post_move", "title": "Customer move-in confirmation", "description": "Verify successful move-in.", "estimated_duration": "1 day", "checklist": [{"text": "Confirm moved in", "completed": False}, {"text": "Check utilities", "completed": False}]},
    {"category": "post_move", "title": "Resolve pending issues", "description": "Address outstanding issues.", "estimated_duration": "2 days", "checklist": [{"text": "List pending items", "completed": False}, {"text": "Assign owners", "completed": False}]},
    {"category": "post_move", "title": "Collect customer feedback", "description": "Gather feedback on experience.", "estimated_duration": "1 day", "checklist": [{"text": "Send feedback form", "completed": False}, {"text": "Record feedback", "completed": False}]},
]

SUGGESTED_ACTIONS = [
    "Follow up with the customer via phone.",
    "Send an email reminder to the vendor.",
    "Check the online portal for status updates.",
    "Coordinate with the team for next steps.",
    "Escalate if no response within 24 hours.",
    "Verify all documents are in order.",
    "Schedule a call with the customer.",
    "Update the status in the system.",
    "Confirm availability with the vendor.",
    "Review and approve the pending request.",
]

ACTIVITY_ACTIONS = [
    "Task status updated", "Customer contacted", "Vendor assigned",
    "Document uploaded", "Appointment scheduled", "Quote received",
    "Follow-up sent", "Issue escalated", "Task completed", "Note added",
]

NOTIFICATION_TYPES = [
    ("overdue", "error", "Task '{}' is overdue by {} days"),
    ("due_today", "warning", "Task '{}' is due today"),
    ("blocked", "error", "Task '{}' is blocked and needs attention"),
    ("missing_info", "warning", "Customer {} is missing required documents"),
    ("vendor_delay", "warning", "Vendor {} has reported a {} day delay"),
    ("milestone", "info", "Relocation for {} is {}% complete"),
]


def seed():
    """Populate database with realistic dummy data."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # ── Vendors ───────────────────────────────────────────────
        vendors = []
        for vd in VENDOR_DATA:
            v = Vendor(
                name=vd["name"],
                type=vd["type"],
                rating=vd["rating"],
                past_jobs=vd["past_jobs"],
                avg_delay_days=vd["avg_delay_days"],
                phone=f"+91 {random.randint(70000, 99999)} {random.randint(10000, 99999)}",
                email=f"{vd['name'].lower().replace(' ', '.')}@example.com",
                address=f"{random.randint(1, 500)}, {random.choice(['MG Road', 'Station Road', 'Ring Road', 'Highway Plaza', 'Industrial Area'])}, {vd['city']}",
                city=vd["city"],
                availability=random.choice(["available", "available", "available", "busy"]),
                created_at=datetime.utcnow() - timedelta(days=random.randint(30, 365)),
            )
            db.add(v)
            vendors.append(v)
        db.commit()
        print(f"Created {len(vendors)} vendors")

        # ── Customers + Projects + Tasks ──────────────────────────
        used_names = set()
        customers = []

        for i in range(50):
            # Generate unique name
            while True:
                fname = random.choice(FIRST_NAMES)
                lname = random.choice(LAST_NAMES)
                full_name = f"{fname} {lname}"
                if full_name not in used_names:
                    used_names.add(full_name)
                    break

            # Pick different cities
            current = random.choice(CITIES)
            dest = random.choice([c for c in CITIES if c != current])

            # Move date: some in past, some today-ish, some future
            if i < 15:
                move_offset = random.randint(-20, -1)  # Past (completed/delayed)
            elif i < 25:
                move_offset = random.randint(0, 7)  # This week
            else:
                move_offset = random.randint(8, 60)  # Future

            move_date = (datetime.utcnow() + timedelta(days=move_offset)).strftime("%Y-%m-%d")
            created_offset = random.randint(14, 60)
            created_at = datetime.utcnow() - timedelta(days=created_offset)

            # Status based on move date
            if move_offset < -5:
                status = random.choices(["completed", "active"], weights=[80, 20])[0]
            elif move_offset < 0:
                status = random.choices(["in_progress", "completed"], weights=[60, 40])[0]
            else:
                status = random.choices(["active", "in_progress"], weights=[40, 60])[0]

            num_utils = random.randint(2, 4)
            utils = random.sample(UTILITIES, num_utils)
            num_docs = random.randint(2, 4)
            docs = random.sample(DOCS_REQUIRED, num_docs)

            customer = Customer(
                name=full_name,
                phone=f"+91 {random.randint(70000, 99999)} {random.randint(10000, 99999)}",
                email=f"{fname.lower()}.{lname.lower()}@{random.choice(['gmail.com', 'outlook.com', 'yahoo.com'])}",
                current_city=current,
                destination_city=dest,
                move_date=move_date,
                family_size=random.randint(1, 6),
                apartment_preference=random.choice(APT_PREFS),
                budget=random.choice(BUDGETS),
                utility_requirements=utils,
                documents_required=docs,
                notes=random.choice([
                    "", "Customer prefers ground floor.", "Has pets, needs pet-friendly apartment.",
                    "Requires parking space.", "Working from home, needs good internet.",
                    "Elderly parents, needs elevator access.", "Needs furnished apartment.",
                    "Tight budget, explore sharing options.", "Premium customer, prioritize service quality.",
                    "Returning customer, use previous vendor.",
                ]),
                status=status,
                assigned_executive=random.choice(EXECUTIVES),
                created_at=created_at,
                updated_at=created_at + timedelta(days=random.randint(0, 10)),
            )
            db.add(customer)
            db.flush()

            # Create project
            proj_status = "completed" if status == "completed" else ("in_progress" if status == "in_progress" else "planning")
            project = RelocationProject(
                customer_id=customer.id,
                status=proj_status,
                completion_pct=0,
                ai_summary=f"Relocation for {full_name} from {current} to {dest}. Move date: {move_date}. Family size: {customer.family_size}. Budget: {customer.budget}/month.",
                risk_level="low",
                created_at=created_at,
                updated_at=created_at + timedelta(days=random.randint(0, 10)),
            )
            db.add(project)
            db.flush()

            # Create tasks
            num_tasks = random.randint(15, 20)
            task_templates = random.sample(TASK_TEMPLATES, min(num_tasks, len(TASK_TEMPLATES)))
            completed_count = 0

            for j, tmpl in enumerate(task_templates):
                # Decide task status based on project status and position
                if proj_status == "completed":
                    t_status = "completed"
                elif proj_status == "in_progress":
                    progress_point = j / len(task_templates)
                    if progress_point < 0.4:
                        t_status = random.choices(["completed", "completed", "in_progress"], weights=[60, 25, 15])[0]
                    elif progress_point < 0.7:
                        t_status = random.choices(["in_progress", "waiting", "pending", "blocked"], weights=[35, 20, 35, 10])[0]
                    else:
                        t_status = random.choices(["pending", "pending", "waiting"], weights=[50, 30, 20])[0]
                else:
                    t_status = random.choices(["pending", "pending", "in_progress"], weights=[60, 25, 15])[0]

                # Some random blocked tasks
                if random.random() < 0.06 and t_status != "completed":
                    t_status = "blocked"

                if t_status == "completed":
                    completed_count += 1

                priority = random.choices(PRIORITIES, weights=PRIORITY_WEIGHTS)[0]
                due_offset = (j + 1) * 2 - len(task_templates)
                due_date = (datetime.strptime(move_date, "%Y-%m-%d") + timedelta(days=due_offset)).strftime("%Y-%m-%d")

                risk = "low"
                if priority == "critical" or t_status == "blocked":
                    risk = "high"
                elif priority == "high":
                    risk = "medium"

                # Update checklist based on status
                checklist = []
                for ci, item in enumerate(tmpl.get("checklist", [])):
                    item_copy = dict(item)
                    if t_status == "completed":
                        item_copy["completed"] = True
                    elif t_status == "in_progress" and ci == 0:
                        item_copy["completed"] = True
                    checklist.append(item_copy)

                # Assign vendor for relevant categories
                vendor_id = None
                if tmpl["category"] == "moving":
                    matching = [v for v in vendors if v.type == "packers"]
                    if matching:
                        vendor_id = random.choice(matching).id
                elif tmpl["category"] == "utilities":
                    vtype = None
                    if "electricity" in tmpl["title"].lower():
                        vtype = "electricity"
                    elif "internet" in tmpl["title"].lower():
                        vtype = "internet"
                    elif "gas" in tmpl["title"].lower():
                        vtype = "gas"
                    elif "water" in tmpl["title"].lower():
                        vtype = "water"
                    if vtype:
                        matching = [v for v in vendors if v.type == vtype]
                        if matching:
                            vendor_id = random.choice(matching).id
                elif tmpl["category"] == "property_search":
                    matching = [v for v in vendors if v.type == "property_partner"]
                    if matching:
                        vendor_id = random.choice(matching).id

                task = Task(
                    project_id=project.id,
                    category=tmpl["category"],
                    title=tmpl["title"],
                    description=tmpl["description"],
                    priority=priority,
                    status=t_status,
                    owner=random.choice(EXECUTIVES),
                    due_date=due_date,
                    estimated_duration=tmpl["estimated_duration"],
                    risk_level=risk,
                    dependencies=[],
                    checklist=checklist,
                    suggested_action=random.choice(SUGGESTED_ACTIONS),
                    sort_order=j,
                    vendor_id=vendor_id,
                    created_at=created_at + timedelta(hours=j),
                    updated_at=created_at + timedelta(days=random.randint(0, 10)),
                )
                db.add(task)

            # Update project completion
            total = len(task_templates)
            project.completion_pct = round((completed_count / total) * 100, 1) if total > 0 else 0
            if project.completion_pct >= 100:
                project.status = "completed"

            # Set risk level
            if project.completion_pct < 30 and move_offset < 7:
                project.risk_level = "critical"
            elif project.completion_pct < 50 and move_offset < 14:
                project.risk_level = "high"
            elif project.completion_pct < 70:
                project.risk_level = "medium"
            else:
                project.risk_level = "low"

            customers.append(customer)

            # Activity logs
            num_logs = random.randint(3, 8)
            for k in range(num_logs):
                log = ActivityLog(
                    project_id=project.id,
                    action=random.choice(ACTIVITY_ACTIONS),
                    details=f"Activity for {full_name}'s relocation project",
                    actor=random.choice(EXECUTIVES),
                    timestamp=created_at + timedelta(days=random.randint(0, created_offset), hours=random.randint(0, 23)),
                )
                db.add(log)

        db.commit()
        print(f"Created {len(customers)} customers with projects and tasks")

        # Count tasks
        total_tasks = db.query(Task).count()
        print(f"Total tasks: {total_tasks}")

        # ── Notifications ─────────────────────────────────────────
        today = datetime.utcnow().strftime("%Y-%m-%d")

        # Overdue task notifications
        overdue_tasks = db.query(Task).filter(
            Task.due_date < today, Task.due_date != "", Task.status.notin_(["completed"])
        ).limit(15).all()
        for t in overdue_tasks:
            try:
                days_overdue = (datetime.utcnow() - datetime.strptime(t.due_date, "%Y-%m-%d")).days
            except ValueError:
                days_overdue = 1
            n = Notification(
                type="overdue",
                message=f"Task '{t.title}' is overdue by {days_overdue} days",
                severity="error",
                related_entity_type="task",
                related_entity_id=t.id,
                is_read=random.choice([True, False]),
                created_at=datetime.utcnow() - timedelta(hours=random.randint(1, 48)),
            )
            db.add(n)

        # Due today notifications
        due_today = db.query(Task).filter(Task.due_date == today, Task.status != "completed").limit(10).all()
        for t in due_today:
            n = Notification(
                type="due_today",
                message=f"Task '{t.title}' is due today",
                severity="warning",
                related_entity_type="task",
                related_entity_id=t.id,
                is_read=False,
                created_at=datetime.utcnow() - timedelta(hours=random.randint(0, 6)),
            )
            db.add(n)

        # Blocked notifications
        blocked = db.query(Task).filter(Task.status == "blocked").limit(10).all()
        for t in blocked:
            n = Notification(
                type="blocked",
                message=f"Task '{t.title}' is blocked and requires attention",
                severity="error",
                related_entity_type="task",
                related_entity_id=t.id,
                is_read=random.choice([True, False, False]),
                created_at=datetime.utcnow() - timedelta(hours=random.randint(2, 72)),
            )
            db.add(n)

        # Milestone notifications
        for c in random.sample(customers, min(10, len(customers))):
            if c.project:
                n = Notification(
                    type="milestone",
                    message=f"Relocation for {c.name} is {c.project.completion_pct:.0f}% complete",
                    severity="info",
                    related_entity_type="customer",
                    related_entity_id=c.id,
                    is_read=random.choice([True, False]),
                    created_at=datetime.utcnow() - timedelta(hours=random.randint(1, 96)),
                )
                db.add(n)

        db.commit()
        notif_count = db.query(Notification).count()
        print(f"Created {notif_count} notifications")

        print("\nSeed complete!")
        print(f"  Vendors:       {len(vendors)}")
        print(f"  Customers:     {len(customers)}")
        print(f"  Tasks:         {total_tasks}")
        print(f"  Notifications: {notif_count}")

    finally:
        db.close()


if __name__ == "__main__":
    seed()
