import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, AlertTriangle, Sparkles, X, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

export default function EdgeCaseAdaptModal({
  isOpen,
  onClose,
  customerId,
  customerName,
}: {
  isOpen: boolean;
  onClose: () => void;
  customerId: number;
  customerName: string;
}) {
  const queryClient = useQueryClient();
  const [daysShift, setDaysShift] = useState(5);
  const [reason, setReason] = useState('Move date postponed by customer request');

  const adaptMutation = useMutation({
    mutationFn: () => api.agents.adaptWorkflow(customerId, daysShift, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', customerId.toString()] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
      queryClient.invalidateQueries({ queryKey: ['checkpoints'] });
      onClose();
    },
  });

  if (!isOpen) return null;

  return (
    <div className="overlay" onClick={onClose}>
      <div className="fixed inset-x-4 top-[20%] sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-[500px] z-50"
        onClick={e => e.stopPropagation()}>
        <div className="modal p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-subtle pb-3">
            <div className="flex items-center gap-2">
              <Sparkles size={18} style={{ color: 'var(--accent)' }} />
              <h3 className="text-base font-semibold text-primary">Exception & Edge-Case Adaptation Agent</h3>
            </div>
            <button onClick={onClose} className="btn-ghost btn-icon rounded-lg"><X size={16} /></button>
          </div>

          <p className="text-xs text-secondary">
            Declare a schedule shift or edge-case disruption for <strong className="text-primary">{customerName}</strong>. The AI Agent will automatically recalculate task dependencies, shift due dates, adjust risk parameters, and create a 1-Click Undo checkpoint.
          </p>

          <div className="space-y-3">
            <div>
              <label className="label">Days Shift (Positive for postponement, negative for earlier move)</label>
              <input
                type="number"
                className="input"
                value={daysShift}
                onChange={e => setDaysShift(parseInt(e.target.value) || 0)}
              />
            </div>

            <div>
              <label className="label">Reason / Exception Context</label>
              <textarea
                className="input min-h-[70px]"
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Describe the disruption or change..."
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-subtle">
            <button onClick={onClose} className="btn btn-secondary btn-sm">Cancel</button>
            <button
              onClick={() => adaptMutation.mutate()}
              className="btn btn-primary btn-sm gap-1.5"
              disabled={adaptMutation.isPending || daysShift === 0}
            >
              {adaptMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              Adapt Workflow Automatically
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
