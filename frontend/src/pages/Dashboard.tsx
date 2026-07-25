import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Users, CheckCircle2, AlertTriangle, Clock, ArrowRight,
  TrendingUp, AlertCircle, Zap, Calendar,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatRelative, getStatusColor, getPriorityColor, getRiskColor } from '@/lib/utils';

function StatCard({ icon: Icon, label, value, color, sub }: {
  icon: any; label: string; value: string | number; color: string; sub?: string;
}) {
  return (
    <div className="stat-card animate-slide-up">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-secondary mb-1">{label}</p>
          <p className="text-2xl font-bold text-primary">{value}</p>
          {sub && <p className="text-xs text-tertiary mt-1">{sub}</p>}
        </div>
        <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}15`, color }}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();

  const { data: analytics } = useQuery({
    queryKey: ['analytics'],
    queryFn: () => api.analytics.get(),
  });

  const { data: risks } = useQuery({
    queryKey: ['ai-risks'],
    queryFn: () => api.ai.risks(),
  });

  const { data: recommendations } = useQuery({
    queryKey: ['ai-recommendations'],
    queryFn: () => api.ai.recommendations(),
  });

  const { data: activity } = useQuery({
    queryKey: ['activity'],
    queryFn: () => api.activity.list({ limit: '10' }),
  });

  const { data: summary } = useQuery({
    queryKey: ['daily-summary'],
    queryFn: () => api.ai.dailySummary(),
  });

  const ov = analytics?.overview;

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Active Relocations" value={ov?.active_relocations ?? '--'} color="#4F46E5"
          sub={`${ov?.completed_relocations ?? 0} completed`} />
        <StatCard icon={CheckCircle2} label="Tasks Completed" value={ov?.completed_tasks ?? '--'} color="#059669"
          sub={`of ${ov?.total_tasks ?? 0} total`} />
        <StatCard icon={AlertTriangle} label="Delayed Tasks" value={ov?.delayed_tasks ?? '--'} color="#D97706"
          sub={`${ov?.blocked_tasks ?? 0} blocked`} />
        <StatCard icon={TrendingUp} label="Avg Completion" value={`${ov?.avg_completion_pct?.toFixed(1) ?? 0}%`} color="#2563EB"
          sub={`${ov?.tasks_due_today ?? 0} due today`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AI Daily Summary */}
        <div className="lg:col-span-2 card p-5 animate-slide-up" style={{ animationDelay: '50ms' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-primary flex items-center gap-2">
              <Zap size={16} style={{ color: 'var(--accent)' }} />
              AI Daily Summary
            </h3>
            <span className="text-xs text-tertiary">{summary?.date}</span>
          </div>

          {summary && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {summary.priorities.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2">Top Priorities</p>
                  <ul className="space-y-1.5">
                    {summary.priorities.slice(0, 5).map((p, i) => (
                      <li key={i} className="text-sm text-primary flex items-start gap-2">
                        <AlertCircle size={14} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--warning)' }} />
                        <span className="line-clamp-1">{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {summary.follow_ups.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2">Follow-ups Needed</p>
                  <ul className="space-y-1.5">
                    {summary.follow_ups.slice(0, 5).map((f, i) => (
                      <li key={i} className="text-sm text-primary flex items-start gap-2">
                        <Calendar size={14} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--info)' }} />
                        <span className="line-clamp-1">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {summary.blocked.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2">Blocked Workflows</p>
                  <ul className="space-y-1.5">
                    {summary.blocked.slice(0, 4).map((b, i) => (
                      <li key={i} className="text-sm text-primary flex items-start gap-2">
                        <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--error)' }} />
                        <span className="line-clamp-1">{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {summary.deadlines.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2">Upcoming Deadlines</p>
                  <ul className="space-y-1.5">
                    {summary.deadlines.slice(0, 4).map((d, i) => (
                      <li key={i} className="text-sm text-primary flex items-start gap-2">
                        <Clock size={14} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--accent)' }} />
                        <span className="line-clamp-1">{d}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Risks & Alerts */}
        <div className="card p-5 animate-slide-up" style={{ animationDelay: '100ms' }}>
          <h3 className="text-base font-semibold text-primary flex items-center gap-2 mb-4">
            <AlertTriangle size={16} style={{ color: 'var(--warning)' }} />
            Risk Alerts
          </h3>
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {risks && risks.length > 0 ? (
              risks.slice(0, 8).map((risk, i) => (
                <div key={i} className="flex items-start gap-2 text-sm p-2 rounded-lg"
                  style={{ backgroundColor: 'var(--bg-primary)' }}
                  onClick={() => risk.customer_id && navigate(`/customers/${risk.customer_id}`)}
                  role={risk.customer_id ? 'button' : undefined}
                >
                  <span className={`badge ${risk.severity === 'critical' ? 'badge-error' : risk.severity === 'error' ? 'badge-error' : 'badge-warning'} mt-0.5`}>
                    {risk.severity}
                  </span>
                  <span className="text-primary line-clamp-2">{risk.message}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-tertiary text-center py-4">No active risks detected</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recommendations */}
        <div className="card p-5 animate-slide-up" style={{ animationDelay: '150ms' }}>
          <h3 className="text-base font-semibold text-primary flex items-center gap-2 mb-4">
            <Zap size={16} style={{ color: 'var(--accent)' }} />
            AI Recommendations
          </h3>
          <div className="space-y-3">
            {recommendations?.slice(0, 5).map((rec, i) => (
              <div key={i} className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-primary)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`badge ${getPriorityColor(rec.priority)}`}>{rec.priority}</span>
                  <span className="text-xs text-tertiary capitalize">{rec.type}</span>
                </div>
                <p className="text-sm text-primary mb-1">{rec.message}</p>
                <p className="text-xs text-secondary">{rec.action}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card p-5 animate-slide-up" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-primary">Recent Activity</h3>
          </div>
          <div className="space-y-3 max-h-[350px] overflow-y-auto">
            {activity?.map((log) => (
              <div key={log.id} className="flex items-start gap-3 text-sm">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
                  style={{
                    backgroundColor: 'var(--accent-light)',
                    color: 'var(--accent)',
                  }}>
                  {log.actor.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-primary">
                    <span className="font-medium">{log.actor}</span>{' '}
                    <span className="text-secondary">{log.action.toLowerCase()}</span>
                  </p>
                  <p className="text-xs text-tertiary mt-0.5">{formatRelative(log.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
