import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RotateCcw, X, History, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { cn, formatRelative } from '@/lib/utils';
import type { StateCheckpoint } from '@/types';

export default function StateHistoryDrawer({
  isOpen,
  onClose,
  projectId,
}: {
  isOpen: boolean;
  onClose: () => void;
  projectId?: number;
}) {
  const queryClient = useQueryClient();

  const { data: checkpoints, isLoading } = useQuery({
    queryKey: ['checkpoints', projectId],
    queryFn: () => api.checkpoints.list(projectId),
    enabled: isOpen,
  });

  const undoMutation = useMutation({
    mutationFn: (id: number) => api.checkpoints.undo(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['checkpoints'] });
      queryClient.invalidateQueries({ queryKey: ['customer'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      queryClient.invalidateQueries({ queryKey: ['activity'] });
    },
  });

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:bg-transparent" onClick={onClose} />

      <div className="fixed right-0 top-0 h-full z-50 w-full sm:w-[440px] flex flex-col animate-slide-in-right"
        style={{ backgroundColor: 'var(--bg-surface)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-subtle">
          <div className="flex items-center gap-2">
            <History size={18} style={{ color: 'var(--accent)' }} />
            <div>
              <h3 className="text-sm font-semibold text-primary">State Versioning & Audit History</h3>
              <p className="text-[10px] text-tertiary">1-Click Undo for all AI agent modifications</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost btn-icon rounded-lg"><X size={18} /></button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <div className="text-center py-8 text-sm text-tertiary">Loading state checkpoints...</div>
          ) : checkpoints && checkpoints.length > 0 ? (
            checkpoints.map(chk => (
              <div
                key={chk.id}
                className={cn(
                  'card p-4 space-y-2 border-l-4 transition-all',
                  chk.is_reverted ? 'opacity-60 border-l-[var(--border-primary)]' : 'border-l-[var(--accent)] hover:border-l-[var(--accent-hover)]',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Sparkles size={13} className="text-accent flex-shrink-0" />
                    <span className="text-xs font-semibold text-accent">{chk.agent_name}</span>
                  </div>
                  <span className="text-[10px] text-tertiary">{formatRelative(chk.created_at)}</span>
                </div>

                <p className="text-xs font-medium text-primary">{chk.action_description}</p>

                {/* State changes summary */}
                <div className="p-2 rounded bg-inset text-[11px] font-mono space-y-1">
                  {chk.snapshot_before?.customer?.destination_city !== chk.snapshot_after?.customer?.destination_city && (
                    <p className="text-secondary">Route: {chk.snapshot_before?.customer?.destination_city} → {chk.snapshot_after?.customer?.destination_city}</p>
                  )}
                  {chk.snapshot_before?.customer?.move_date !== chk.snapshot_after?.customer?.move_date && (
                    <p className="text-secondary">Move Date: {chk.snapshot_before?.customer?.move_date} → {chk.snapshot_after?.customer?.move_date}</p>
                  )}
                  {chk.snapshot_before?.project?.completion_pct !== chk.snapshot_after?.project?.completion_pct && (
                    <p className="text-secondary">Progress: {chk.snapshot_before?.project?.completion_pct}% → {chk.snapshot_after?.project?.completion_pct}%</p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-subtle">
                  {chk.is_reverted ? (
                    <span className="badge badge-neutral text-[10px] gap-1">
                      <CheckCircle2 size={10} /> Reverted (Undone)
                    </span>
                  ) : (
                    <button
                      onClick={() => undoMutation.mutate(chk.id)}
                      className="btn btn-secondary btn-sm gap-1 text-accent hover:border-accent"
                      disabled={undoMutation.isPending}
                    >
                      <RotateCcw size={12} />
                      {undoMutation.isPending ? 'Undoing...' : '1-Click Undo'}
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state py-12">
              <History size={40} className="mb-2 text-tertiary" />
              <p className="text-sm font-medium">No state checkpoints recorded yet</p>
              <p className="text-xs text-tertiary mt-1">Actions performed by AI agents will create state snapshots here for instant undo.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
