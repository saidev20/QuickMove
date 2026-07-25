# QuickMove AI Operations Hub - User Guide & Workflow Manual

Welcome to **QuickMove**, the AI-powered operations hub built for relocation executives. This guide details the standard operational flow to manage customer moves efficiently from intake to post-move feedback.

---

## Operations Flow Overview

```
 [1. Customer Intake] ──> [2. AI Plan Generation] ──> [3. Daily Triage & Risk Check]
                                                                  │
 [6. Post-Move & Review] <── [5. Vendor & Utility Setup] <── [4. Kanban Task Execution]
```

---

## 1. Daily Operations Briefing (Start of Day)

**Objective**: Assess overall pipeline health, prioritize high-risk moves, and address urgent blockers.

1. **Review Dashboard Metrics**:
   - Check **Active Relocations**, **Tasks Completed**, **Delayed Tasks**, and **Avg Completion %**.
2. **Read the AI Daily Summary**:
   - Inspect **Top Priorities** (tasks due today or overdue).
   - Review **Blocked Workflows** requiring coordinator intervention.
   - Note **Customers Moving This Week** for final status checks.
3. **Audit Risk Alerts**:
   - Look for critical alerts (e.g., missing mandatory documents, tight move windows < 3 days with low progress, vendor delays).
   - Click directly on a risk alert card to navigate to the customer profile.
4. **Check Smart Notifications**:
   - Click the Bell icon in the top right to view real-time alerts on overdue tasks, unassigned owners, and customer milestones.

---

## 2. Customer Intake & Automated AI Workflow Generation

**Objective**: Onboard a new customer and automatically generate a complete, tailored 20+ step relocation plan.

1. Navigate to **Customers** -> Click **+ New Customer** (or `/customers/new`).
2. Complete the Intake Form:
   - **Personal Info**: Name, Phone, Email, Family Size.
   - **Relocation Details**: Current City, Destination City, Target Move Date, Monthly Budget, Apartment Preference (e.g., 2 BHK).
   - **Executive Assignment**: Choose the executive owner or auto-assign.
   - **Utility Requirements**: Select required services (Electricity, Fiber Internet, Water, Cooking Gas).
   - **Documents Required**: Check required proofs (Aadhaar, Rental Agreement, Bank Statement, ID Proof).
3. Click **Create Relocation Project**:
   - The AI service instantly generates ~20 structured tasks across 5 core categories:
     - **Property Search** (Research, Shortlist, Schedule Visits, Approval)
     - **Moving Logistics** (Vendor Selection, Pickup Scheduling, Inventory, Delivery)
     - **Utilities Setup** (Electricity, Internet, Water, Gas)
     - **Documentation & Address Change** (Aadhaar update, Bank address update, Insurance, Subscriptions)
     - **Post Move Support** (Move-in confirmation, Issue resolution, Customer feedback)
   - Each task includes priority, due date, owner assignment, risk rating, and checklist items.

---

## 3. Customer Profile & Case Management

**Objective**: Deep-dive into a specific customer's relocation progress and manage docs.

1. Open a customer record from the **Customers** list or **Search (`Ctrl+K`)**.
2. **Overview Tab**:
   - View the circular completion gauge (% complete).
   - Read the **AI Summary** card summarizing the move parameters.
   - Review utility requirements, document status, and category progress bars.
3. **Tasks Tab**:
   - View tasks grouped by category.
   - Click the circular checkbox to toggle task completion. Completion % recalculates automatically.
4. **Documents Tab**:
   - Select document category (ID Proof, Rental Agreement, Bills, Receipts).
   - Upload customer files (PDFs, Images). View or delete uploaded files directly.
5. **Timeline & Notes Tabs**:
   - Audit chronological milestones and view special customer instructions.

---

## 4. Operational Execution via Kanban Board

**Objective**: Drag-and-drop workflow execution across execution stages.

1. Navigate to **Kanban Board** from the sidebar.
2. View tasks across 5 status columns:
   - **Pending** -> **In Progress** -> **Waiting** -> **Blocked** -> **Completed**
3. **Drag & Drop**:
   - Drag any task card between columns to update status instantly.
   - Dropping into **Completed** automatically updates the customer's overall project progress.
4. **Filter View**:
   - Filter by **Category** (e.g., show only `Moving` or `Utilities` tasks).
   - Filter by **Owner** to view an executive's individual task queue.

---

## 5. Timeline & Deadline Tracking

**Objective**: Monitor chronological deadlines and prevent schedule slippage.

1. Navigate to **Timeline** view.
2. Use top filter chips to toggle between **All Events**, **Upcoming**, **Overdue**, **Blocked**, and **Completed**.
3. Inspect events grouped by date. Overdue milestones are highlighted in red, blocked items in amber, and completed items in green.

---

## 6. Vendor & Logistics Partner Coordination

**Objective**: Select reliable vendors, monitor delay metrics, and maintain service quality.

1. Navigate to **Vendors** directory.
2. Filter vendors by **Type** (Packers & Movers, Internet, Electricity, Gas, Water, Property Partners) or **City**.
3. Evaluate Vendor Cards:
   - Check Star Rating (1.0 to 5.0).
   - Monitor **Avg Delay** (flagged in red if > 2 days).
   - Review Past Job Counts and Availability status (`Available`, `Busy`).
4. Click **+ Add Vendor** to onboard new local moving or utility service providers.

---

## 7. AI Assistant & Quick Information Retrieval

**Objective**: Get instant answers about operations data without manual searching.

1. Click the **AI Assistant** button in the sidebar (or top right message icon).
2. Ask natural language questions such as:
   - *"What is pending for Rahul?"* -> Returns pending tasks for that customer.
   - *"Which relocations are delayed?"* -> Lists overdue tasks and affected customers.
   - *"Show customers moving this week"* -> Lists upcoming move dates and progress.
   - *"What should I do today?"* -> Gives an executive daily action list.
   - *"Which vendor has the most delays?"* -> Shows vendor delay rankings.
   - *"Summarize active relocations"* -> Gives high-level operational statistics.

---

## 8. Global Search (`Ctrl+K`)

**Objective**: Instant navigation across all entities.

1. Press `Ctrl+K` (or `Cmd+K` on Mac) or click the Search bar in the header.
2. Type any Customer Name, Phone Number, Email, City, Task, or Vendor Name.
3. Use Arrow keys to highlight results and press `Enter` to open.

---

## 9. Performance Analytics & Optimization (End of Week)

**Objective**: Evaluate operational efficiency, identify systemic bottlenecks, and optimize processes.

1. Navigate to **Analytics** dashboard.
2. Review Key Performance Indicators:
   - **Task Activity Trend (30 Days)**: Monitor creation vs. completion velocity.
   - **Status & Priority Distributions**: Ensure blocked/overdue items stay minimal.
   - **Active Relocations by City**: Understand high-demand relocation corridors.
   - **Vendor Performance Table**: Benchmark vendors by average delay days and ratings.
   - **Most Common Blockers**: Identify recurring operational friction points.

---

## 10. LangGraph Multi-Agent Orchestration & HITL Approvals

**Objective**: Leverage autonomous agents for outreach, OCR document auto-filling, vendor proposals, and edge-case adaptation—with full admin approval gates and 1-Click Undo state versioning.

1. **Human-in-the-Loop (HITL) Approvals**:
   - Click **Approvals** in the header to view pending AI proposals.
   - Review pre-matched vendor proposals generated by the AI Vendor Agent.
   - Click **Approve Proposal** to execute booking or **Reject** to decline.
2. **State Versioning & 1-Click Undo**:
   - Click the **History (Clock/History)** icon in the header to open the State Versioning Drawer.
   - Audit every modification made by AI agents (OCR field auto-fills, timeline shifts, task completions).
   - Click **1-Click Undo** on any entry to revert the database state back to the exact snapshot taken before the AI action!
3. **AI Agent Triggers on Customer Workspace**:
   - **Send Magic Upload Link**: Triggers the Customer Outreach Agent to generate a secure customer upload link and dispatch outreach for missing proofs.
   - **Propose Vendor Booking**: Triggers the Vendor Match Agent to select top candidate partners and queue an approval card for the admin.
   - **AI Vision OCR**: On any uploaded document card in the Documents tab, click **AI Vision OCR** to automatically extract entities (addresses, IDs, rent amounts), auto-populate pending database fields, and complete related tasks.
   - **Adapt Workflow (Edge Case)**: Declare schedule shifts (e.g. Move date postponed by 5 days). The Exception Adaptation Agent automatically shifts task due dates, adjusts risk ratings, and updates the timeline while creating an Undo checkpoint.

