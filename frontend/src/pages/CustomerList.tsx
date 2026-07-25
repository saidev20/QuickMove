import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, ArrowRight, MapPin, Calendar, ChevronDown, Users, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { cn, formatDate, getStatusColor, getRiskColor, getInitials, getDaysUntil } from '@/lib/utils';


export default function CustomerList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [execFilter, setExecFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const deleteCustomerMutation = useMutation({
    mutationFn: (id: number) => api.customers.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });

  const batchDeleteMutation = useMutation({
    mutationFn: (ids: number[]) => api.customers.batchDelete(ids),
    onSuccess: () => {
      setSelectedIds([]);
      setSelectMode(false);
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: () => api.customers.deleteAll(),
    onSuccess: () => {
      setSelectedIds([]);
      setSelectMode(false);
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });

  const params: Record<string, string> = {};
  if (search) params.search = search;
  if (statusFilter) params.status = statusFilter;
  if (cityFilter) params.city = cityFilter;
  if (execFilter) params.executive = execFilter;

  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers', params],
    queryFn: () => api.customers.list(Object.keys(params).length > 0 ? params : undefined),
  });

  const { data: executives } = useQuery({
    queryKey: ['executives'],
    queryFn: () => api.executives(),
  });

  const cities = [...new Set(customers?.flatMap(c => [c.current_city, c.destination_city]).filter(Boolean) || [])].sort();

  const allIds = customers?.map(c => c.id) || [];
  const isAllSelected = allIds.length > 0 && selectedIds.length === allIds.length;

  const toggleSelectAll = () => {
    if (isAllSelected) setSelectedIds([]);
    else setSelectedIds(allIds);
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-sm text-secondary">{customers?.length ?? 0} customers total</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSelectMode(!selectMode);
              if (selectMode) setSelectedIds([]);
            }}
            className={cn('btn btn-secondary gap-1.5 text-xs', selectMode && 'border-[var(--error)] text-[var(--error)] bg-error/10')}
          >
            <Trash2 size={14} />
            {selectMode ? 'Done Selecting' : 'Select & Delete'}
          </button>
          <button onClick={() => navigate('/customers/new')} className="btn btn-primary">
            <Plus size={16} />
            New Customer
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" />
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn('btn btn-secondary gap-2', showFilters && 'border-[var(--accent)]')}
          >
            <Filter size={14} />
            Filters
            <ChevronDown size={14} className={cn('transition-transform', showFilters && 'rotate-180')} />
          </button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-3 pt-2 border-t border-subtle animate-slide-up">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input w-auto">
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="on_hold">On Hold</option>
            </select>
            <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className="input w-auto">
              <option value="">All Cities</option>
              {cities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={execFilter} onChange={(e) => setExecFilter(e.target.value)} className="input w-auto">
              <option value="">All Executives</option>
              {executives?.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
            {(statusFilter || cityFilter || execFilter) && (
              <button
                onClick={() => { setStatusFilter(''); setCityFilter(''); setExecFilter(''); }}
                className="btn btn-ghost btn-sm text-accent"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Selection & Batch Action Bar */}
      {selectMode && customers && customers.length > 0 && (
        <div className="card p-3 flex flex-wrap items-center justify-between gap-3 text-xs bg-inset animate-slide-down">
          <label className="flex items-center gap-2 cursor-pointer font-medium text-primary">
            <input
              type="checkbox"
              checked={isAllSelected}
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded accent-[var(--accent)] cursor-pointer"
            />
            Select All ({selectedIds.length}/{customers.length} selected)
          </label>

          <div className="flex items-center gap-2">
            {selectedIds.length > 0 && (
              <button
                onClick={() => {
                  if (window.confirm(`Delete ${selectedIds.length} selected customers?`)) {
                    batchDeleteMutation.mutate(selectedIds);
                  }
                }}
                className="btn btn-secondary btn-sm gap-1 text-error border-error/30 hover:bg-error/10"
                disabled={batchDeleteMutation.isPending}
              >
                <Trash2 size={13} />
                Delete Selected ({selectedIds.length})
              </button>
            )}

            <button
              onClick={() => {
                if (window.confirm("CRITICAL WARNING: Are you sure you want to DELETE ALL CUSTOMERS and their relocation projects?")) {
                  deleteAllMutation.mutate();
                }
              }}
              className="btn btn-ghost btn-sm gap-1 text-error hover:bg-error/10"
              disabled={deleteAllMutation.isPending}
            >
              <Trash2 size={13} />
              Delete All Customers
            </button>
          </div>
        </div>
      )}

      {/* Customer Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-4 bg-inset rounded w-2/3 mb-3"></div>
              <div className="h-3 bg-inset rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-inset rounded w-1/3"></div>
            </div>
          ))}
        </div>
      ) : customers && customers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {customers.map((c) => {
            const daysUntil = getDaysUntil(c.move_date);
            const completionPct = c.project?.completion_pct ?? 0;
            const isSelected = selectedIds.includes(c.id);
            return (
              <div
                key={c.id}
                onClick={() => navigate(`/customers/${c.id}`)}
                className={cn('card card-hover p-5 cursor-pointer animate-slide-up relative', selectMode && isSelected && 'ring-2 ring-[var(--accent)] bg-[var(--accent-light)]/20')}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {selectMode && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => toggleSelect(c.id)}
                        className="w-4 h-4 rounded accent-[var(--accent)] cursor-pointer"
                      />
                    )}
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white"
                      style={{ backgroundColor: 'var(--accent)' }}>
                      {getInitials(c.name)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-primary text-sm">{c.name}</h3>
                      <p className="text-xs text-secondary">{c.assigned_executive}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`badge ${getStatusColor(c.status)}`}>
                      {c.status.replace('_', ' ')}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Delete customer '${c.name}'?`)) {
                          deleteCustomerMutation.mutate(c.id);
                        }
                      }}
                      className="btn btn-ghost btn-sm btn-icon text-error hover:bg-error/10"
                      title="Delete customer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-secondary mb-2">
                  <MapPin size={12} />
                  <span>{c.current_city}</span>
                  <ArrowRight size={10} />
                  <span className="font-medium text-primary">{c.destination_city}</span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-secondary mb-3">
                  <Calendar size={12} />
                  <span>{formatDate(c.move_date)}</span>
                  {daysUntil <= 3 && daysUntil >= 0 && (
                    <span className="badge badge-error ml-1">{daysUntil === 0 ? 'Today' : `${daysUntil}d left`}</span>
                  )}
                  {daysUntil < 0 && c.status !== 'completed' && (
                    <span className="badge badge-warning ml-1">{Math.abs(daysUntil)}d ago</span>
                  )}
                </div>

                {/* Progress bar */}
                <div className="flex items-center gap-3">
                  <div className="progress-bar flex-1">
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${completionPct}%`,
                        backgroundColor: completionPct >= 80 ? 'var(--success)' : completionPct >= 40 ? 'var(--accent)' : 'var(--warning)',
                      }}
                    />
                  </div>
                  <span className="text-xs font-medium text-secondary w-10 text-right">{completionPct.toFixed(0)}%</span>
                </div>

                {c.project && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-subtle">
                    <span className={`badge ${getRiskColor(c.project.risk_level)} text-[10px]`}>
                      Risk: {c.project.risk_level}
                    </span>
                    <span className="text-[10px] text-tertiary">
                      Family: {c.family_size} | {c.apartment_preference}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <Users size={48} className="mb-4" style={{ color: 'var(--text-tertiary)' }} />
          <p className="text-lg font-medium mb-1">No customers found</p>
          <p className="text-sm mb-4">Try adjusting your search or filters</p>
          <button onClick={() => navigate('/customers/new')} className="btn btn-primary">
            <Plus size={16} />
            Add First Customer
          </button>
        </div>
      )}
    </div>
  );
}
