import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, MapPin, ArrowRight, Calendar, Phone, Mail, Users as UsersIcon,
  Home, DollarSign, FileText, Zap, CheckCircle2, Clock, AlertTriangle,
  ChevronDown, ChevronRight, Upload, Trash2, ExternalLink, Sparkles, Send, Truck, ShieldCheck, Bot,
} from 'lucide-react';
import { api } from '@/lib/api';
import {
  cn, formatDate, formatDateTime, getStatusColor, getPriorityColor,
  getRiskColor, getCategoryLabel, getInitials, getDaysUntil,
} from '@/lib/utils';
import type { TaskBrief } from '@/types';
import EdgeCaseAdaptModal from '@/components/EdgeCaseAdaptModal';
import AIAgentPanel from '@/components/AIAgentPanel';


const TABS = ['Overview', 'Tasks', 'Documents', 'Timeline', 'Notes'] as const;

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>('Overview');
  const [uploadCategory, setUploadCategory] = useState('other');
  const [showAgentPanel, setShowAgentPanel] = useState(false);

  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => api.customers.get(Number(id)),
    enabled: !!id,
  });

  const { data: timeline } = useQuery({
    queryKey: ['timeline', id],
    queryFn: () => api.timeline(Number(id)),
    enabled: !!id && activeTab === 'Timeline',
  });

  const { data: documents } = useQuery({
    queryKey: ['documents', id],
    queryFn: () => api.documents.list(Number(id)),
    enabled: !!id && activeTab === 'Documents',
  });

  const uploadMutation = useMutation({
    mutationFn: ({ file, category }: { file: File; category: string }) =>
      api.documents.upload(Number(id), file, category),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', id] });
      queryClient.invalidateQueries({ queryKey: ['customer', id] });
    },
  });

  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);
  const [taskSelectMode, setTaskSelectMode] = useState(false);

  const deleteCustomerMutation = useMutation({
    mutationFn: () => api.customers.delete(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      navigate('/customers');
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: number) => api.tasks.delete(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', id] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });

  const batchDeleteTasksMutation = useMutation({
    mutationFn: (ids: number[]) => api.tasks.batchDelete(ids),
    onSuccess: () => {
      setSelectedTaskIds([]);
      queryClient.invalidateQueries({ queryKey: ['customer', id] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });

  const deleteAllTasksMutation = useMutation({
    mutationFn: () => api.tasks.deleteAll(customer?.project?.id),
    onSuccess: () => {
      setSelectedTaskIds([]);
      queryClient.invalidateQueries({ queryKey: ['customer', id] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });

  const deleteDocMutation = useMutation({
    mutationFn: (docId: number) => api.documents.delete(docId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', id] });
    },
  });

  const [showAdaptModal, setShowAdaptModal] = useState(false);

  const ocrMutation = useMutation({
    mutationFn: (docId: number) => api.agents.runOcr(docId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', id] });
      queryClient.invalidateQueries({ queryKey: ['checkpoints'] });
    },
  });

  const outreachMutation = useMutation({
    mutationFn: () => api.agents.runOutreach(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['checkpoints'] });
    },
  });

  const vendorMatchMutation = useMutation({
    mutationFn: () => api.agents.runVendorMatch(customer?.project?.id || 0, 'moving'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['checkpoints'] });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: number; status: string }) =>
      api.tasks.updateStatus(taskId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', id] });
    },
  });


  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-inset rounded w-1/3"></div>
        <div className="card p-6"><div className="h-40 bg-inset rounded"></div></div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="empty-state">
        <p className="text-lg font-medium">Customer not found</p>
        <button onClick={() => navigate('/customers')} className="btn btn-primary mt-4">Back to Customers</button>
      </div>
    );
  }

  const completionPct = customer.project?.completion_pct ?? 0;
  const daysUntil = getDaysUntil(customer.move_date);
  const tasksByCategory: Record<string, TaskBrief[]> = {};
  customer.tasks?.forEach(t => {
    if (!tasksByCategory[t.category]) tasksByCategory[t.category] = [];
    tasksByCategory[t.category].push(t);
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadMutation.mutate({ file, category: uploadCategory });
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Back + Delete Header */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/customers')} className="btn btn-ghost btn-sm gap-1.5 -ml-2">
          <ArrowLeft size={14} />
          Back to Customers
        </button>
        <button
          onClick={() => {
            if (window.confirm(`Are you sure you want to delete customer '${customer.name}' and all associated tasks & documents?`)) {
              deleteCustomerMutation.mutate();
            }
          }}
          className="btn btn-ghost btn-sm gap-1.5 text-error hover:bg-error/10"
          disabled={deleteCustomerMutation.isPending}
        >
          <Trash2 size={14} />
          {deleteCustomerMutation.isPending ? 'Deleting...' : 'Delete Customer'}
        </button>
      </div>

      {/* Profile Card */}
      <div className="card p-6 animate-slide-up">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center text-lg font-bold text-white flex-shrink-0"
              style={{ backgroundColor: 'var(--accent)' }}>
              {getInitials(customer.name)}
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl font-bold text-primary">{customer.name}</h2>
                <span className={`badge ${getStatusColor(customer.status)}`}>{customer.status.replace('_', ' ')}</span>
                {customer.project && (
                  <span className={`badge ${getRiskColor(customer.project.risk_level)}`}>Risk: {customer.project.risk_level}</span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-secondary">
                <span className="flex items-center gap-1"><Phone size={13} />{customer.phone}</span>
                <span className="flex items-center gap-1"><Mail size={13} />{customer.email}</span>
                <span className="flex items-center gap-1"><UsersIcon size={13} />Family of {customer.family_size}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">{completionPct.toFixed(0)}%</p>
              <p className="text-xs text-tertiary">Complete</p>
            </div>
            <div className="w-16 h-16 relative">
              <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none" stroke="var(--bg-inset)" strokeWidth="3" />
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke={completionPct >= 80 ? 'var(--success)' : completionPct >= 40 ? 'var(--accent)' : 'var(--warning)'}
                  strokeWidth="3"
                  strokeDasharray={`${completionPct}, 100`}
                  strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </div>

        {/* AI Agent Action Bar */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-subtle">
          <span className="text-xs font-semibold text-accent flex items-center gap-1 mr-2">
            <Sparkles size={13} /> Trigger AI Agents:
          </span>
          <button
            onClick={() => setShowAgentPanel(true)}
            className="btn btn-sm gap-1.5 font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-xs"
          >
            <Bot size={13} />
            Run AI Agent on Customer
          </button>
          <button
            onClick={() => outreachMutation.mutate()}
            disabled={outreachMutation.isPending}
            className="btn btn-secondary btn-sm gap-1.5"
          >
            <Send size={12} className="text-accent" />
            {outreachMutation.isPending ? 'Sending...' : 'Send Magic Link Outreach'}
          </button>
          <button
            onClick={() => vendorMatchMutation.mutate()}
            disabled={vendorMatchMutation.isPending}
            className="btn btn-secondary btn-sm gap-1.5"
          >
            <Truck size={12} className="text-accent" />
            {vendorMatchMutation.isPending ? 'Matching...' : 'Propose Vendor Booking'}
          </button>
          <button
            onClick={() => setShowAdaptModal(true)}
            className="btn btn-secondary btn-sm gap-1.5"
          >
            <Sparkles size={12} className="text-accent" />
            Adapt Workflow (Edge Case)
          </button>
        </div>

        {/* Move info bar */}
        <div className="flex flex-wrap items-center gap-6 mt-4 pt-4 border-t border-subtle text-sm">
          <div className="flex items-center gap-2">
            <MapPin size={14} style={{ color: 'var(--accent)' }} />
            <span className="text-secondary">{customer.current_city}</span>
            <ArrowRight size={12} className="text-tertiary" />
            <span className="font-medium text-primary">{customer.destination_city}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar size={14} style={{ color: 'var(--accent)' }} />
            <span>{formatDate(customer.move_date)}</span>
            {daysUntil >= 0 && daysUntil <= 7 && (
              <span className="badge badge-warning">{daysUntil === 0 ? 'Today' : `${daysUntil} days left`}</span>
            )}
            {daysUntil < 0 && customer.status !== 'completed' && (
              <span className="badge badge-error">{Math.abs(daysUntil)} days overdue</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Home size={14} style={{ color: 'var(--accent)' }} />
            <span>{customer.apartment_preference}</span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign size={14} style={{ color: 'var(--accent)' }} />
            <span>{customer.budget}/month</span>
          </div>
        </div>
      </div>

      {/* AI Summary */}
      {customer.project?.ai_summary && (
        <div className="card p-4 animate-slide-up" style={{ animationDelay: '50ms', backgroundColor: 'var(--accent-light)' }}>
          <div className="flex items-start gap-3">
            <Zap size={16} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--accent)' }} />
            <div>
              <p className="text-xs font-semibold text-accent uppercase tracking-wider mb-1">AI Summary</p>
              <p className="text-sm text-primary">{customer.project.ai_summary}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-subtle overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn('tab whitespace-nowrap', activeTab === tab && 'active')}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="animate-fade-in">
        {activeTab === 'Overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Utility Requirements */}
            <div className="card p-5">
              <h4 className="text-sm font-semibold text-primary mb-3">Utility Requirements</h4>
              <div className="flex flex-wrap gap-2">
                {customer.utility_requirements.map(u => (
                  <span key={u} className="badge badge-info capitalize">{u}</span>
                ))}
                {customer.utility_requirements.length === 0 && <p className="text-sm text-tertiary">None specified</p>}
              </div>
            </div>

            {/* Documents Required */}
            <div className="card p-5">
              <h4 className="text-sm font-semibold text-primary mb-3">Documents Required</h4>
              <div className="flex flex-wrap gap-2">
                {customer.documents_required.map(d => (
                  <span key={d} className="badge badge-neutral capitalize">{d.replace(/_/g, ' ')}</span>
                ))}
                {customer.documents_required.length === 0 && <p className="text-sm text-tertiary">None specified</p>}
              </div>
            </div>

            {/* Task Progress by Category */}
            <div className="card p-5 lg:col-span-2">
              <h4 className="text-sm font-semibold text-primary mb-4">Task Progress by Category</h4>
              <div className="space-y-4">
                {Object.entries(tasksByCategory).map(([cat, tasks]) => {
                  const done = tasks.filter(t => t.status === 'completed').length;
                  const pct = (done / tasks.length) * 100;
                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium text-primary">{getCategoryLabel(cat)}</span>
                        <span className="text-xs text-secondary">{done}/{tasks.length}</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-bar-fill" style={{
                          width: `${pct}%`,
                          backgroundColor: pct >= 80 ? 'var(--success)' : pct >= 40 ? 'var(--accent)' : 'var(--warning)',
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Tasks' && (
          <div className="space-y-4">
            {/* Task Select Mode Toggle & Action Bar */}
            {customer.tasks && customer.tasks.length > 0 && (
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    setTaskSelectMode(!taskSelectMode);
                    if (taskSelectMode) setSelectedTaskIds([]);
                  }}
                  className={cn('btn btn-secondary btn-sm gap-1.5 text-xs', taskSelectMode && 'border-[var(--error)] text-[var(--error)] bg-error/10')}
                >
                  <Trash2 size={13} />
                  {taskSelectMode ? 'Done Selecting' : 'Select & Delete Tasks'}
                </button>
              </div>
            )}

            {taskSelectMode && customer.tasks && customer.tasks.length > 0 && (
              <div className="card p-3 flex flex-wrap items-center justify-between gap-3 text-xs bg-inset animate-slide-down">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-primary">
                  <input
                    type="checkbox"
                    checked={customer.tasks.length > 0 && selectedTaskIds.length === customer.tasks.length}
                    onChange={() => {
                      if (selectedTaskIds.length === customer.tasks.length) setSelectedTaskIds([]);
                      else setSelectedTaskIds(customer.tasks.map(t => t.id));
                    }}
                    className="w-4 h-4 rounded accent-[var(--accent)] cursor-pointer"
                  />
                  Select All ({selectedTaskIds.length}/{customer.tasks.length} tasks selected)
                </label>

                <div className="flex items-center gap-2">
                  {selectedTaskIds.length > 0 && (
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete ${selectedTaskIds.length} selected tasks?`)) {
                          batchDeleteTasksMutation.mutate(selectedTaskIds);
                        }
                      }}
                      className="btn btn-secondary btn-sm gap-1 text-error border-error/30 hover:bg-error/10"
                      disabled={batchDeleteTasksMutation.isPending}
                    >
                      <Trash2 size={13} />
                      Delete Selected ({selectedTaskIds.length})
                    </button>
                  )}

                  <button
                    onClick={() => {
                      if (window.confirm(`Delete ALL ${customer.tasks.length} tasks for ${customer.name}?`)) {
                        deleteAllTasksMutation.mutate();
                      }
                    }}
                    className="btn btn-ghost btn-sm gap-1 text-error hover:bg-error/10"
                    disabled={deleteAllTasksMutation.isPending}
                  >
                    <Trash2 size={13} />
                    Delete All Tasks
                  </button>
                </div>
              </div>
            )}

            {Object.entries(tasksByCategory).map(([cat, tasks]) => (
              <div key={cat} className="card overflow-hidden">
                <div className="px-5 py-3 border-b border-subtle" style={{ backgroundColor: 'var(--bg-primary)' }}>
                  <h4 className="text-sm font-semibold text-primary">{getCategoryLabel(cat)}</h4>
                </div>
                <div className="divide-y divide-[var(--border-secondary)]">
                  {tasks.map(task => {
                    const isTaskSelected = selectedTaskIds.includes(task.id);
                    return (
                      <div key={task.id} className={cn('px-5 py-3 flex items-center justify-between gap-4 table-row', taskSelectMode && isTaskSelected && 'bg-[var(--accent-light)]/20')}>
                        <div className="flex items-center gap-3 min-w-0">
                          {taskSelectMode && (
                            <input
                              type="checkbox"
                              checked={isTaskSelected}
                              onChange={() => {
                                setSelectedTaskIds(prev => prev.includes(task.id) ? prev.filter(i => i !== task.id) : [...prev, task.id]);
                              }}
                              className="w-4 h-4 rounded accent-[var(--accent)] cursor-pointer"
                            />
                          )}
                          <button
                            onClick={() => updateStatusMutation.mutate({
                              taskId: task.id,
                              status: task.status === 'completed' ? 'pending' : 'completed'
                            })}
                            className={cn(
                              'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                              task.status === 'completed'
                                ? 'border-[var(--success)] bg-[var(--success)]'
                                : 'border-[var(--border-primary)] hover:border-[var(--accent)]'
                            )}
                          >
                            {task.status === 'completed' && <CheckCircle2 size={12} className="text-white" />}
                          </button>
                          <span className={cn('text-sm', task.status === 'completed' ? 'text-tertiary line-through' : 'text-primary')}>
                            {task.title}
                          </span>
                        </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`badge ${getPriorityColor(task.priority)} text-[10px]`}>{task.priority}</span>
                        <span className={`badge ${getStatusColor(task.status)} text-[10px]`}>{task.status.replace('_', ' ')}</span>
                        <span className="text-xs text-tertiary hidden sm:inline">{formatDate(task.due_date)}</span>
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete task '${task.title}'?`)) {
                              deleteTaskMutation.mutate(task.id);
                            }
                          }}
                          className="btn btn-ghost btn-sm btn-icon text-error hover:bg-error/10"
                          title="Delete task"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'Documents' && (
          <div className="space-y-4">
            {/* Upload area */}
            <div className="card p-5">
              <h4 className="text-sm font-semibold text-primary mb-3">Upload Document</h4>
              <div className="flex items-center gap-3">
                <select value={uploadCategory} onChange={e => setUploadCategory(e.target.value)} className="input w-auto">
                  <option value="other">Other</option>
                  <option value="id_proof">ID Proof</option>
                  <option value="rental_agreement">Rental Agreement</option>
                  <option value="bill">Bill</option>
                  <option value="moving_receipt">Moving Receipt</option>
                </select>
                <label className="btn btn-secondary cursor-pointer">
                  <Upload size={14} />
                  Choose File
                  <input type="file" className="hidden" onChange={handleFileUpload}
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
                </label>
                {uploadMutation.isPending && <span className="text-sm text-secondary">Uploading...</span>}
              </div>
            </div>

            {/* Document list */}
            <div className="card overflow-hidden">
              {documents && documents.length > 0 ? (
                <div className="divide-y divide-[var(--border-secondary)]">
                  {documents.map(doc => (
                    <div key={doc.id} className="px-5 py-3 flex items-center justify-between table-row">
                      <div className="flex items-center gap-3">
                        <FileText size={16} style={{ color: 'var(--accent)' }} />
                        <div>
                          <p className="text-sm font-medium text-primary">{doc.filename}</p>
                          <p className="text-xs text-tertiary">{doc.category.replace('_', ' ')} -- {formatDate(doc.uploaded_at)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => ocrMutation.mutate(doc.id)}
                          className="btn btn-secondary btn-sm gap-1 text-accent"
                          disabled={ocrMutation.isPending}
                          title="Run AI Vision OCR to parse document and auto-fill fields"
                        >
                          <Sparkles size={12} />
                          {ocrMutation.isPending ? 'Parsing...' : 'AI Vision OCR'}
                        </button>
                        <a href={doc.file_path} target="_blank" rel="noopener" className="btn btn-ghost btn-sm btn-icon">
                          <ExternalLink size={14} />
                        </a>
                        <button onClick={() => deleteDocMutation.mutate(doc.id)} className="btn btn-ghost btn-sm btn-icon text-error">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state py-10">
                  <FileText size={36} className="mb-3" />
                  <p className="text-sm">No documents uploaded yet</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'Timeline' && (
          <div className="card p-5">
            <div className="space-y-0">
              {timeline?.map((event, i) => (
                <div key={event.id} className="timeline-item">
                  <div className={`timeline-dot ${event.type}`} />
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className={cn('text-sm font-medium', event.type === 'completed' ? 'text-tertiary line-through' : 'text-primary')}>
                        {event.title}
                      </p>
                      <p className="text-xs text-tertiary mt-0.5">
                        {getCategoryLabel(event.category)} -- {event.owner}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={`badge ${getStatusColor(event.status)} text-[10px]`}>{event.status.replace('_', ' ')}</span>
                      <p className="text-xs text-tertiary mt-1">{formatDate(event.date)}</p>
                    </div>
                  </div>
                </div>
              ))}
              {(!timeline || timeline.length === 0) && (
                <p className="text-sm text-tertiary text-center py-8">No timeline events</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'Notes' && (
          <div className="card p-5">
            <h4 className="text-sm font-semibold text-primary mb-3">Notes</h4>
            <p className="text-sm text-secondary whitespace-pre-wrap">
              {customer.notes || 'No notes added for this customer.'}
            </p>
          </div>
        )}
      </div>

      <EdgeCaseAdaptModal
        isOpen={showAdaptModal}
        onClose={() => setShowAdaptModal(false)}
        customerId={Number(id)}
        customerName={customer.name}
      />

      <AIAgentPanel
        isOpen={showAgentPanel}
        onClose={() => setShowAgentPanel(false)}
        initialCustomerId={customer.id}
        initialCustomerName={customer.name}
      />
    </div>
  );
}

