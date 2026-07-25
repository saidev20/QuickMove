import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Filter, Calendar, ChevronDown } from 'lucide-react';
import { api } from '@/lib/api';
import { cn, formatDate, getStatusColor, getPriorityColor, getCategoryLabel } from '@/lib/utils';

export default function TimelineView() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'overdue' | 'completed' | 'blocked'>('all');

  const { data: events, isLoading } = useQuery({
    queryKey: ['timeline'],
    queryFn: () => api.timeline(),
  });

  const filtered = events?.filter(e => {
    if (filter === 'all') return true;
    return e.type === filter;
  }) || [];

  // Group by date
  const grouped: Record<string, typeof filtered> = {};
  filtered.forEach(e => {
    const d = e.date || 'No date';
    if (!grouped[d]) grouped[d] = [];
    grouped[d].push(e);
  });

  const sortedDates = Object.keys(grouped).sort();

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-5">
      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'all', label: 'All Events' },
          { key: 'upcoming', label: 'Upcoming' },
          { key: 'overdue', label: 'Overdue' },
          { key: 'blocked', label: 'Blocked' },
          { key: 'completed', label: 'Completed' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as any)}
            className={cn('btn btn-sm rounded-full', filter === f.key ? 'btn-primary' : 'btn-secondary')}
          >
            {f.label}
            {events && (
              <span className="ml-1 text-[10px] opacity-70">
                ({events.filter(e => f.key === 'all' ? true : e.type === f.key).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div className="card p-6">
        {isLoading ? (
          <div className="space-y-6 animate-pulse">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="timeline-item">
                <div className="timeline-dot" />
                <div className="h-4 bg-inset rounded w-2/3 mb-2"></div>
                <div className="h-3 bg-inset rounded w-1/3"></div>
              </div>
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div>
            {sortedDates.map((date) => (
              <div key={date} className="mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className={cn(
                    'px-3 py-1 rounded-full text-xs font-semibold',
                    date === today ? 'bg-[var(--accent)] text-white' : 'bg-inset text-secondary'
                  )}>
                    {date === today ? 'Today' : formatDate(date)}
                  </div>
                  <div className="flex-1 h-px bg-[var(--border-secondary)]" />
                  <span className="text-xs text-tertiary">{grouped[date].length} events</span>
                </div>
                <div className="space-y-0">
                  {grouped[date].map((event) => (
                    <div key={event.id} className="timeline-item">
                      <div className={`timeline-dot ${event.type}`} />
                      <div
                        className="p-3 rounded-lg cursor-pointer transition-colors hover:bg-[var(--bg-surface-hover)]"
                        onClick={() => event.customer_id && navigate(`/customers/${event.customer_id}`)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className={cn(
                              'text-sm font-medium',
                              event.type === 'completed' ? 'text-tertiary line-through' : 'text-primary',
                            )}>
                              {event.title}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-tertiary">
                              <span>{getCategoryLabel(event.category)}</span>
                              <span>--</span>
                              <span>{event.customer_name}</span>
                              {event.owner && (
                                <>
                                  <span>--</span>
                                  <span>{event.owner}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`badge ${getPriorityColor(event.priority)} text-[10px]`}>{event.priority}</span>
                            <span className={`badge ${getStatusColor(event.status)} text-[10px]`}>{event.status.replace('_', ' ')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <Calendar size={48} className="mb-4" />
            <p className="text-lg font-medium mb-1">No events found</p>
            <p className="text-sm">Try changing the filter</p>
          </div>
        )}
      </div>
    </div>
  );
}
