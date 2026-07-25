import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Zap, Bot, Send, CheckCircle2, AlertCircle, ArrowRight, RotateCcw,
  Sparkles, ShieldCheck, Play, FileText, User, Truck, Clock, X
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface AIAgentPanelProps {
  isOpen: boolean;
  onClose: () => void;
  initialCustomerId?: number;
  initialCustomerName?: string;
}

const PRESET_DIRECTIVES = [
  { label: '📩 Request Documents from Customer', prompt: 'Trigger document upload magic link for customer' },
  { label: '🚀 Match & Propose Vendors', prompt: 'Match best packers and movers vendor for active relocation' },
  { label: '📅 Shift Schedule by 5 Days', prompt: 'Shift move date by 5 days due to landlord keys delay' },
  { label: '✅ Complete Utility Setup Tasks', prompt: 'Mark all utility setup tasks as completed' },
  { label: '➕ Add Apartment Inspection Task', prompt: 'Add a high priority task to inspect apartment keys before move date' },
];

export default function AIAgentPanel({
  isOpen,
  onClose,
  initialCustomerId,
  initialCustomerName,
}: AIAgentPanelProps) {
  const queryClient = useQueryClient();
  const [instruction, setInstruction] = useState('');
  const [lastResult, setLastResult] = useState<{
    status: string;
    instruction: string;
    reasoning: string;
    actions_executed: Array<{ type: string; description: string; details: string; entity_id?: number }>;
    checkpoint_id?: number;
  } | null>(null);

  const agentExecuteMutation = useMutation({
    mutationFn: (text: string) => api.agents.autonomousExecute(text, initialCustomerId),
    onSuccess: (data) => {
      setLastResult(data);
      setInstruction('');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer'] });
      queryClient.invalidateQueries({ queryKey: ['kanban'] });
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      queryClient.invalidateQueries({ queryKey: ['checkpoints'] });
    },
  });

  const undoMutation = useMutation({
    mutationFn: (checkpointId: number) => api.checkpoints.undo(checkpointId),
    onSuccess: () => {
      setLastResult(null);
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer'] });
      queryClient.invalidateQueries({ queryKey: ['kanban'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      queryClient.invalidateQueries({ queryKey: ['checkpoints'] });
    },
  });

  if (!isOpen) return null;

  const handleExecute = (textToExecute?: string) => {
    const text = textToExecute || instruction;
    if (!text.trim()) return;
    setLastResult(null);
    agentExecuteMutation.mutate(text);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-xl h-full flex flex-col shadow-2xl border-l border-subtle" style={{ backgroundColor: 'var(--bg-surface)' }}>
        
        {/* Header */}
        <div className="p-4 border-b border-subtle flex items-center justify-between" style={{ backgroundColor: 'var(--bg-primary)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold bg-gradient-to-tr from-indigo-600 to-violet-500 shadow-md">
              <Bot size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-primary text-base">Autonomous AI Operations Agent</h3>
                <span className="badge badge-success text-[10px] gap-1 py-0.5">
                  <Zap size={10} /> Active
                </span>
              </div>
              <p className="text-xs text-secondary">
                {initialCustomerName ? `Focused on ${initialCustomerName}` : 'Tell the agent what to do and it executes it autonomously'}
              </p>
            </div>
          </div>

          <button onClick={onClose} className="btn btn-ghost btn-icon rounded-lg">
            <X size={18} />
          </button>
        </div>

        {/* Guardrails Banner */}
        <div className="px-4 py-2 bg-inset/50 border-b border-subtle flex items-center justify-between text-xs text-tertiary">
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={13} className="text-success" /> HITL Guardrails Active
          </span>
          <span className="flex items-center gap-1.5">
            <RotateCcw size={12} className="text-accent" /> 1-Click Undo Checkpointing
          </span>
        </div>

        {/* Main Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">

          {/* Quick Preset Directive Chips */}
          <div>
            <label className="text-xs font-semibold text-secondary mb-2 block uppercase tracking-wider">Quick Agent Action Presets</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_DIRECTIVES.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setInstruction(p.prompt);
                    handleExecute(p.prompt);
                  }}
                  className="px-2.5 py-1.5 rounded-lg border border-subtle text-xs bg-[var(--bg-secondary)] hover:bg-[var(--accent-light)] hover:border-[var(--accent)] text-primary transition-all text-left flex items-center gap-1.5"
                >
                  <Play size={10} className="text-accent" />
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Directive Input */}
          <div className="card p-4 space-y-3">
            <label className="text-xs font-semibold text-primary block">
              Give Operational Directive to AI Agent:
            </label>
            <div className="relative">
              <textarea
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder="e.g. Add 2 high priority utility setup tasks for Saidev and send outreach link for Aadhaar..."
                className="input w-full min-h-[90px] p-3 text-sm resize-none"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-tertiary">
                Executes tasks, assigns vendors, sends outreach links, shifts schedules.
              </span>
              <button
                onClick={() => handleExecute()}
                disabled={agentExecuteMutation.isPending || !instruction.trim()}
                className="btn btn-primary btn-sm gap-2"
              >
                {agentExecuteMutation.isPending ? (
                  <>Executing Agent...</>
                ) : (
                  <>
                    <Send size={13} />
                    Run AI Agent
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Loading Indicator */}
          {agentExecuteMutation.isPending && (
            <div className="card p-5 space-y-3 animate-pulse border-accent/40 bg-accent-light/10">
              <div className="flex items-center gap-3">
                <Sparkles size={18} className="text-accent animate-spin" />
                <span className="text-sm font-semibold text-primary">Autonomous Agent Executing...</span>
              </div>
              <div className="h-2 bg-inset rounded-full overflow-hidden">
                <div className="h-full bg-[var(--accent)] animate-pulse w-3/4"></div>
              </div>
              <p className="text-xs text-secondary">Analyzing database context, scheduling tasks, and generating state checkpoint...</p>
            </div>
          )}

          {/* Execution Trace & Results Report */}
          {lastResult && (
            <div className="card p-5 space-y-4 border-success/40 bg-success-bg/10 animate-slide-up">
              <div className="flex items-center justify-between border-b border-subtle pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-success" />
                  <h4 className="font-semibold text-primary text-sm">Execution Completed</h4>
                </div>
                {lastResult.checkpoint_id && (
                  <button
                    onClick={() => undoMutation.mutate(lastResult.checkpoint_id!)}
                    disabled={undoMutation.isPending}
                    className="btn btn-secondary btn-xs gap-1 text-error border-error/30 hover:bg-error/10"
                    title="Undo all database changes made by this AI Agent run"
                  >
                    <RotateCcw size={12} />
                    {undoMutation.isPending ? 'Reverting...' : '1-Click Undo'}
                  </button>
                )}
              </div>

              {/* Reasoning */}
              <div>
                <p className="text-xs font-semibold text-secondary uppercase tracking-wider mb-1">Agent Reasoning</p>
                <p className="text-xs text-primary bg-inset/50 p-2.5 rounded-lg border border-subtle leading-relaxed">
                  {lastResult.reasoning}
                </p>
              </div>

              {/* Actions List */}
              <div>
                <p className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2">
                  Actions Performed ({lastResult.actions_executed.length})
                </p>
                <div className="space-y-2">
                  {lastResult.actions_executed.map((act, i) => (
                    <div key={i} className="p-3 rounded-lg border border-subtle bg-[var(--bg-surface)] text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-primary flex items-center gap-1.5">
                          <CheckCircle2 size={13} className="text-success" />
                          {act.description}
                        </span>
                        <span className="badge badge-secondary text-[10px] uppercase">{act.type.replace('_', ' ')}</span>
                      </div>
                      {act.details && <p className="text-secondary pl-5">{act.details}</p>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
