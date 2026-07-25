import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, Check, X, Clock, AlertCircle, Sparkles, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { cn, formatRelative } from '@/lib/utils';
import type { ApprovalRequest } from '@/types';

export function AdminApprovalsBadge() {
  const { data: approvals } = useQuery({
    queryKey: ['approvals', 'pending'],
    queryFn: () => api.approvals.list('pending'),
    refetchInterval: 15000,
  });

  const pendingCount = approvals?.length || 0;
  if (pendingCount === 0) return null;

  return (
    <span className="badge badge-warning font-semibold text-[10px] animate-pulse">
      {pendingCount} Pending Approvals
    </span>
  );
}

export default function AdminApprovalsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [feedbackMap, setFeedbackMap] = useState<Record<number, string>>({});

  const { data: approvals, isLoading } = useQuery({
    queryKey: ['approvals'],
    queryFn: () => api.approvals.list(),
    enabled: isOpen,
  });

  const respondMutation = useMutation({
    mutationFn: ({ id, approve, feedback }: { id: number; approve: boolean; feedback: string }) =>
      api.approvals.respond(id, approve, feedback),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['checkpoints'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });

  if (!isOpen) return null;

  const pending = approvals?.filter(a => a.status === 'pending') || [];
  const resolved = approvals?.filter(a => a.status !== 'pending') || [];

  return (
    <div className="overlay" onClick={onClose}>
      <div className="fixed inset-x-4 top-[10%] sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-[640px] z-50"
        onClick={e => e.stopPropagation()}>
        <div className="modal max-h-[80vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-subtle">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'var(--warning-bg)', color: 'var(--warning)' }}>
                <ShieldCheck size={18} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-primary">Admin Approval Queue (HITL)</h3>
                <p className="text-xs text-tertiary">Review and authorize AI-generated operational proposals</p>
              </div>
            </div>
            <button onClick={onClose} className="btn-ghost btn-icon rounded-lg"><X size={16} /></button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {isLoading ? (
              <div className="text-center py-8 text-sm text-tertiary">Loading proposals...</div>
            ) : pending.length > 0 ? (
              <div className="space-y-4">
                <p className="text-xs font-semibold text-tertiary uppercase tracking-wider">Pending Action Proposals ({pending.length})</p>
                {pending.map(req => (
                  <div key={req.id} className="card p-4 space-y-3 border-l-4 border-l-[var(--warning)] animate-slide-up">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <Sparkles size={14} style={{ color: 'var(--accent)' }} />
                          <span className="text-xs font-semibold text-accent">{req.agent_name}</span>
                          <span className="text-[10px] text-tertiary">{formatRelative(req.created_at)}</span>
                        </div>
                        <h4 className="text-sm font-bold text-primary mt-1">{req.title}</h4>
                      </div>
                      <span className="badge badge-warning text-[10px]">Needs Admin Action</span>
                    </div>

                    <p className="text-xs text-secondary">{req.description}</p>

                    <div className="p-3 rounded-lg bg-inset text-xs space-y-1">
                      <p className="font-semibold text-primary">Proposed Action:</p>
                      <p className="text-secondary">{req.proposed_action}</p>
                    </div>

                    {/* Feedback input & buttons */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 border-t border-subtle">
                      <input
                        type="text"
                        placeholder="Optional feedback / note..."
                        className="input text-xs flex-1 py-1.5"
                        value={feedbackMap[req.id] || ''}
                        onChange={e => setFeedbackMap(prev => ({ ...prev, [req.id]: e.target.value }))}
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => respondMutation.mutate({ id: req.id, approve: false, feedback: feedbackMap[req.id] || '' })}
                          className="btn btn-secondary btn-sm gap-1 text-error border-error/30 hover:bg-error/10"
                          disabled={respondMutation.isPending}
                        >
                          <X size={14} /> Reject
                        </button>
                        <button
                          onClick={() => respondMutation.mutate({ id: req.id, approve: true, feedback: feedbackMap[req.id] || '' })}
                          className="btn btn-primary btn-sm gap-1"
                          disabled={respondMutation.isPending}
                        >
                          <Check size={14} /> Approve Proposal
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state py-8">
                <ShieldCheck size={40} className="mb-2 text-tertiary" />
                <p className="text-sm font-medium">All clear! No pending approval requests.</p>
                <p className="text-xs text-tertiary mt-1">Sensitive AI agent proposals will appear here for one-click admin authorization.</p>
              </div>
            )}

            {resolved.length > 0 && (
              <div className="pt-4 border-t border-subtle space-y-2">
                <p className="text-xs font-semibold text-tertiary uppercase tracking-wider">Resolved Proposals ({resolved.length})</p>
                <div className="space-y-2 max-h-[180px] overflow-y-auto">
                  {resolved.map(req => (
                    <div key={req.id} className="p-3 rounded-lg bg-inset flex items-center justify-between text-xs">
                      <div>
                        <p className="font-medium text-primary">{req.title}</p>
                        <p className="text-tertiary text-[10px]">{req.agent_name} -- {formatRelative(req.created_at)}</p>
                      </div>
                      <span className={cn('badge text-[10px]', req.status === 'approved' ? 'badge-success' : 'badge-error')}>
                        {req.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
