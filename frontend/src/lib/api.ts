import type {
  Customer, CustomerCreate, CustomerDetail,
  Task, TaskUpdate, KanbanData,
  Vendor, VendorCreate,
  Document, ActivityLog, Notification,
  ApprovalRequest, StateCheckpoint,
  AnalyticsDashboard,
  SearchResult, TimelineEvent,
  AIRisk, AIRecommendation, AIDailySummary,
} from '@/types';

const BASE = import.meta.env.VITE_API_URL || '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Request failed');
  }
  return res.json();
}

// ── Customers ────────────────────────────────────────────────────────

export const api = {
  customers: {
    list: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<Customer[]>(`/customers${qs}`);
    },
    get: (id: number) => request<CustomerDetail>(`/customers/${id}`),
    create: (data: CustomerCreate) =>
      request<Customer>('/customers', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: Partial<Customer>) =>
      request<Customer>(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) =>
      request<void>(`/customers/${id}`, { method: 'DELETE' }),
    batchDelete: (ids: number[]) =>
      request<{ detail: string; count: number }>('/customers/batch-delete', { method: 'POST', body: JSON.stringify(ids) }),
    deleteAll: () =>
      request<{ detail: string; count: number }>('/customers/delete-all', { method: 'POST' }),
  },

  tasks: {
    list: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<Task[]>(`/tasks${qs}`);
    },
    get: (id: number) => request<Task>(`/tasks/${id}`),
    kanban: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<KanbanData>(`/tasks/kanban${qs}`);
    },
    update: (id: number, data: TaskUpdate) =>
      request<Task>(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    updateStatus: (id: number, status: string) =>
      request<void>(`/tasks/${id}/status?status=${status}`, { method: 'PUT' }),
    delete: (id: number) =>
      request<void>(`/tasks/${id}`, { method: 'DELETE' }),
    batchDelete: (ids: number[]) =>
      request<{ detail: string; count: number }>('/tasks/batch-delete', { method: 'POST', body: JSON.stringify(ids) }),
    deleteAll: (projectId?: number) =>
      request<{ detail: string; count: number }>(`/tasks/delete-all${projectId ? `?project_id=${projectId}` : ''}`, { method: 'POST' }),
  },

  vendors: {
    list: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<Vendor[]>(`/vendors${qs}`);
    },
    get: (id: number) => request<Vendor>(`/vendors/${id}`),
    create: (data: VendorCreate) =>
      request<Vendor>('/vendors', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: Partial<Vendor>) =>
      request<Vendor>(`/vendors/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) =>
      request<void>(`/vendors/${id}`, { method: 'DELETE' }),
    batchDelete: (ids: number[]) =>
      request<{ detail: string; count: number }>('/vendors/batch-delete', { method: 'POST', body: JSON.stringify(ids) }),
    deleteAll: () =>
      request<{ detail: string; count: number }>('/vendors/delete-all', { method: 'POST' }),
  },

  documents: {
    list: (customerId: number) => request<Document[]>(`/documents/${customerId}`),
    upload: async (customerId: number, file: File, category: string) => {
      const formData = new FormData();
      formData.append('customer_id', customerId.toString());
      formData.append('category', category);
      formData.append('file', file);
      const res = await fetch(`${BASE}/documents`, { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      return res.json() as Promise<Document>;
    },
    delete: (id: number) =>
      request<void>(`/documents/${id}`, { method: 'DELETE' }),
  },

  activity: {
    list: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<ActivityLog[]>(`/activity${qs}`);
    },
  },

  notifications: {
    list: (unreadOnly?: boolean) =>
      request<Notification[]>(`/notifications${unreadOnly ? '?unread_only=true' : ''}`),
    markRead: (id: number) =>
      request<void>(`/notifications/${id}/read`, { method: 'PUT' }),
    markAllRead: () =>
      request<void>('/notifications/read-all', { method: 'PUT' }),
  },

  analytics: {
    get: () => request<AnalyticsDashboard>('/analytics'),
  },

  ai: {
    chat: (message: string) =>
      request<{ response: string; suggestions: string[] }>('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ message }),
      }),
    dailySummary: () => request<AIDailySummary>('/ai/daily-summary'),
    risks: () => request<AIRisk[]>('/ai/risks'),
    recommendations: () => request<AIRecommendation[]>('/ai/recommendations'),
  },

  search: (query: string) =>
    request<SearchResult[]>(`/search?q=${encodeURIComponent(query)}`),

  timeline: (customerId?: number) => {
    const qs = customerId ? `?customer_id=${customerId}` : '';
    return request<TimelineEvent[]>(`/timeline${qs}`);
  },

  executives: () => request<string[]>('/executives'),

  approvals: {
    list: (status?: string) =>
      request<ApprovalRequest[]>(`/approvals${status ? `?status=${status}` : ''}`),
    respond: (id: number, approve: boolean, feedback: string = '') =>
      request<{ status: string; executed: boolean }>(
        `/approvals/${id}/respond?approve=${approve}&feedback=${encodeURIComponent(feedback)}`,
        { method: 'POST' }
      ),
  },

  checkpoints: {
    list: (projectId?: number) =>
      request<StateCheckpoint[]>(`/checkpoints${projectId ? `?project_id=${projectId}` : ''}`),
    undo: (id: number) =>
      request<{ status: string; action_reverted: string }>(`/checkpoints/${id}/undo`, { method: 'POST' }),
  },

  agents: {
    runOcr: (docId: number) =>
      request<any>(`/agents/ocr/${docId}`, { method: 'POST' }),
    runOutreach: (customerId: number) =>
      request<any>(`/agents/outreach/${customerId}`, { method: 'POST' }),
    runVendorMatch: (projectId: number, category: string = 'moving') =>
      request<any>(`/agents/vendor-match/${projectId}?category=${category}`, { method: 'POST' }),
    adaptWorkflow: (customerId: number, daysShift: number, reason: string = 'Schedule change') =>
      request<any>(
        `/agents/adapt-workflow?customer_id=${customerId}&days_shift=${daysShift}&reason=${encodeURIComponent(reason)}`,
        { method: 'POST' }
      ),
    autonomousExecute: (instruction: string, customerId?: number) =>
      request<{
        status: string;
        instruction: string;
        reasoning: string;
        actions_executed: Array<{ type: string; description: string; details: string; entity_id?: number }>;
        checkpoint_id?: number;
      }>(
        `/agents/autonomous-execute?instruction=${encodeURIComponent(instruction)}${customerId ? `&customer_id=${customerId}` : ''}`,
        { method: 'POST' }
      ),
  },
};

