import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, Area, AreaChart,
} from 'recharts';
import { api } from '@/lib/api';
import { getCategoryLabel } from '@/lib/utils';

const CHART_COLORS = ['#4F46E5', '#06B6D4', '#8B5CF6', '#F59E0B', '#EF4444', '#10B981', '#EC4899', '#6366F1'];
const STATUS_COLORS: Record<string, string> = {
  pending: '#9CA3AF', in_progress: '#3B82F6', waiting: '#F59E0B',
  blocked: '#EF4444', completed: '#10B981',
};
const PRIORITY_COLORS: Record<string, string> = {
  low: '#9CA3AF', medium: '#3B82F6', high: '#F59E0B', critical: '#EF4444',
};

function ChartCard({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`card p-5 animate-slide-up ${className}`}>
      <h3 className="text-sm font-semibold text-primary mb-4">{title}</h3>
      {children}
    </div>
  );
}

export default function AnalyticsPage() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analytics'],
    queryFn: () => api.analytics.get(),
  });

  if (isLoading || !analytics) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="card p-5 animate-pulse">
            <div className="h-4 bg-inset rounded w-1/3 mb-4"></div>
            <div className="h-48 bg-inset rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  const ov = analytics.overview;

  // Prepare data
  const statusData = Object.entries(analytics.status_distribution).map(([k, v]) => ({
    name: k.replace('_', ' '),
    value: v,
    fill: STATUS_COLORS[k] || '#9CA3AF',
  }));

  const priorityData = Object.entries(analytics.priority_distribution).map(([k, v]) => ({
    name: k,
    value: v,
    fill: PRIORITY_COLORS[k] || '#9CA3AF',
  }));

  const categoryData = Object.entries(analytics.category_distribution).map(([k, v]) => ({
    name: getCategoryLabel(k),
    count: v,
  }));

  const completionRate = ov.total_tasks > 0
    ? ((ov.completed_tasks / ov.total_tasks) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Completion Rate', value: `${completionRate}%` },
          { label: 'Avg Progress', value: `${ov.avg_completion_pct.toFixed(1)}%` },
          { label: 'Due Today', value: ov.tasks_due_today },
          { label: 'Total Customers', value: ov.total_customers },
        ].map((stat, i) => (
          <div key={i} className="stat-card animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
            <p className="text-xs text-secondary mb-1">{stat.label}</p>
            <p className="text-xl font-bold text-primary">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Completion Trend */}
        <ChartCard title="Task Activity Trend (30 Days)" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={analytics.trends}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-secondary)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} interval={4} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Area type="monotone" dataKey="created" stroke="#4F46E5" fill="#4F46E520" name="Created" />
              <Area type="monotone" dataKey="completed" stroke="#10B981" fill="#10B98120" name="Completed" />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Status Distribution */}
        <ChartCard title="Task Status Distribution">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
                style={{ fontSize: '10px' }}
              >
                {statusData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Priority Distribution */}
        <ChartCard title="Task Priority Distribution">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={priorityData} cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
                style={{ fontSize: '10px' }}
              >
                {priorityData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Relocations by City */}
        <ChartCard title="Active Relocations by Destination City">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={analytics.by_city} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-secondary)" />
              <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} />
              <YAxis dataKey="city" type="category" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} width={90} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="count" fill="#4F46E5" radius={[0, 4, 4, 0]} name="Relocations" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Tasks by Category */}
        <ChartCard title="Tasks by Category">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-secondary)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} angle={-15} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="count" fill="#8B5CF6" radius={[4, 4, 0, 0]} name="Tasks" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Vendor Performance */}
        <ChartCard title="Vendor Performance" className="lg:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-subtle">
                  <th className="text-left py-2 px-3 font-medium text-secondary">Vendor</th>
                  <th className="text-left py-2 px-3 font-medium text-secondary">Type</th>
                  <th className="text-center py-2 px-3 font-medium text-secondary">Rating</th>
                  <th className="text-center py-2 px-3 font-medium text-secondary">Avg Delay</th>
                  <th className="text-center py-2 px-3 font-medium text-secondary">Jobs</th>
                </tr>
              </thead>
              <tbody>
                {analytics.vendor_performance.map((v, i) => (
                  <tr key={i} className="table-row">
                    <td className="py-2.5 px-3 font-medium text-primary">{v.name}</td>
                    <td className="py-2.5 px-3 text-secondary capitalize">{v.type.replace('_', ' ')}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`badge ${v.rating >= 4 ? 'badge-success' : v.rating >= 3 ? 'badge-warning' : 'badge-error'}`}>
                        {v.rating.toFixed(1)}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`badge ${v.avg_delay <= 1 ? 'badge-success' : v.avg_delay <= 2 ? 'badge-warning' : 'badge-error'}`}>
                        {v.avg_delay.toFixed(1)}d
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center text-primary font-medium">{v.jobs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>

        {/* Common Blockers */}
        {analytics.common_blockers.length > 0 && (
          <ChartCard title="Most Common Blockers" className="lg:col-span-2">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={analytics.common_blockers}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-secondary)" />
                <XAxis dataKey="blocker" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" fill="#EF4444" radius={[4, 4, 0, 0]} name="Blocked Tasks" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </div>
    </div>
  );
}
