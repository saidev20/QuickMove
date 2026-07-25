// ── Customer ─────────────────────────────────────────────────────────

export interface Customer {
  id: number;
  name: string;
  phone: string;
  email: string;
  current_city: string;
  destination_city: string;
  move_date: string;
  family_size: number;
  apartment_preference: string;
  budget: string;
  utility_requirements: string[];
  documents_required: string[];
  notes: string;
  status: string;
  assigned_executive: string;
  created_at: string;
  updated_at: string;
  project?: Project | null;
}

export interface CustomerDetail extends Customer {
  tasks: TaskBrief[];
  documents: DocumentBrief[];
}

export interface CustomerCreate {
  name: string;
  phone?: string;
  email?: string;
  current_city?: string;
  destination_city?: string;
  move_date?: string;
  family_size?: number;
  apartment_preference?: string;
  budget?: string;
  utility_requirements?: string[];
  documents_required?: string[];
  notes?: string;
  assigned_executive?: string;
}

// ── Project ──────────────────────────────────────────────────────────

export interface Project {
  id: number;
  customer_id: number;
  status: string;
  completion_pct: number;
  ai_summary: string;
  risk_level: string;
  created_at: string;
  updated_at: string;
}

// ── Task ─────────────────────────────────────────────────────────────

export interface TaskBrief {
  id: number;
  project_id: number;
  category: string;
  title: string;
  priority: string;
  status: string;
  owner: string;
  due_date: string;
  risk_level: string;
}

export interface Task {
  id: number;
  project_id: number;
  category: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  owner: string;
  due_date: string;
  estimated_duration: string;
  risk_level: string;
  dependencies: number[];
  checklist: ChecklistItem[];
  suggested_action: string;
  sort_order: number;
  vendor_id: number | null;
  vendor: VendorBrief | null;
  created_at: string;
  updated_at: string;
  customer_name?: string;
}

export interface TaskUpdate {
  category?: string;
  title?: string;
  description?: string;
  priority?: string;
  status?: string;
  owner?: string;
  due_date?: string;
  estimated_duration?: string;
  risk_level?: string;
  dependencies?: number[];
  checklist?: ChecklistItem[];
  suggested_action?: string;
  sort_order?: number;
  vendor_id?: number | null;
}

export interface ChecklistItem {
  text: string;
  completed: boolean;
}

export interface KanbanData {
  pending: Task[];
  in_progress: Task[];
  waiting: Task[];
  blocked: Task[];
  completed: Task[];
}

// ── Vendor ────────────────────────────────────────────────────────────

export interface VendorBrief {
  id: number;
  name: string;
  type: string;
}

export interface Vendor {
  id: number;
  name: string;
  type: string;
  rating: number;
  past_jobs: number;
  avg_delay_days: number;
  phone: string;
  email: string;
  address: string;
  city: string;
  availability: string;
  created_at: string;
}

export interface VendorCreate {
  name: string;
  type: string;
  rating?: number;
  past_jobs?: number;
  avg_delay_days?: number;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  availability?: string;
}

// ── Document ─────────────────────────────────────────────────────────

export interface DocumentBrief {
  id: number;
  filename: string;
  file_type: string;
  category: string;
  uploaded_at: string;
}

export interface Document {
  id: number;
  customer_id: number;
  filename: string;
  file_type: string;
  file_path: string;
  category: string;
  uploaded_at: string;
}

// ── Activity & Notifications ─────────────────────────────────────────

export interface ActivityLog {
  id: number;
  project_id: number;
  action: string;
  details: string;
  actor: string;
  timestamp: string;
}

export interface Notification {
  id: number;
  type: string;
  message: string;
  severity: string;
  related_entity_type: string;
  related_entity_id: number;
  is_read: boolean;
  created_at: string;
}

export interface ApprovalRequest {
  id: number;
  project_id: number;
  task_id?: number | null;
  agent_name: string;
  title: string;
  description: string;
  proposed_action: string;
  payload: Record<string, any>;
  status: 'pending' | 'approved' | 'rejected';
  admin_feedback: string;
  created_at: string;
  resolved_at?: string | null;
}

export interface StateCheckpoint {
  id: number;
  project_id: number;
  agent_name: string;
  action_description: string;
  snapshot_before: Record<string, any>;
  snapshot_after: Record<string, any>;
  is_reverted: boolean;
  created_at: string;
}


// ── Analytics ────────────────────────────────────────────────────────

export interface AnalyticsOverview {
  active_relocations: number;
  completed_relocations: number;
  total_customers: number;
  total_tasks: number;
  completed_tasks: number;
  delayed_tasks: number;
  blocked_tasks: number;
  avg_completion_pct: number;
  overdue_tasks: number;
  tasks_due_today: number;
}

export interface AnalyticsDashboard {
  overview: AnalyticsOverview;
  by_city: { city: string; count: number }[];
  trends: { date: string; completed: number; created: number }[];
  vendor_performance: { name: string; type: string; rating: number; avg_delay: number; jobs: number }[];
  common_blockers: { blocker: string; count: number }[];
  status_distribution: Record<string, number>;
  priority_distribution: Record<string, number>;
  category_distribution: Record<string, number>;
}

// ── AI ───────────────────────────────────────────────────────────────

export interface AIChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface AIRisk {
  type: string;
  severity: string;
  message: string;
  customer_name?: string;
  customer_id?: number;
  task_id?: number;
}

export interface AIRecommendation {
  type: string;
  priority: string;
  message: string;
  action: string;
}

export interface AIDailySummary {
  date: string;
  priorities: string[];
  pending_approvals: string[];
  high_risk: string[];
  follow_ups: string[];
  deadlines: string[];
  blocked: string[];
  stats: Record<string, number>;
}

// ── Search ───────────────────────────────────────────────────────────

export interface SearchResult {
  type: string;
  id: number;
  title: string;
  subtitle: string;
  status?: string;
  meta?: string;
}

// ── Timeline ─────────────────────────────────────────────────────────

export interface TimelineEvent {
  id: number;
  title: string;
  date: string;
  type: string;
  status: string;
  priority: string;
  category: string;
  customer_name: string;
  customer_id: number | null;
  owner: string;
}

// ── Helpers ──────────────────────────────────────────────────────────

export type TaskStatus = 'pending' | 'in_progress' | 'waiting' | 'blocked' | 'completed';
export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
