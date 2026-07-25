import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Star, Clock, Phone, Mail, MapPin, ChevronDown, X, Loader2, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';
import type { Vendor, VendorCreate } from '@/types';

const VENDOR_TYPES = [
  { value: 'packers', label: 'Packers & Movers' },
  { value: 'internet', label: 'Internet' },
  { value: 'electricity', label: 'Electricity' },
  { value: 'gas', label: 'Gas' },
  { value: 'water', label: 'Water' },
  { value: 'property_partner', label: 'Property Partner' },
];

function VendorCard({ vendor, isSelected, onToggleSelect, onDelete }: { vendor: Vendor; isSelected?: boolean; onToggleSelect?: (id: number) => void; onDelete?: (id: number) => void }) {
  return (
    <div className={cn('card card-hover p-5 animate-slide-up relative group', isSelected && 'ring-2 ring-[var(--accent)] bg-[var(--accent-light)]/20')}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          {onToggleSelect && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelect(vendor.id)}
              className="w-4 h-4 rounded accent-[var(--accent)] cursor-pointer"
            />
          )}
          <div>
            <h3 className="font-semibold text-primary text-sm">{vendor.name}</h3>
            <p className="text-xs text-secondary capitalize">{vendor.type.replace('_', ' ')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn(
            'badge text-[10px]',
            vendor.availability === 'available' ? 'badge-success' : vendor.availability === 'busy' ? 'badge-warning' : 'badge-error'
          )}>
            {vendor.availability}
          </span>
          {onDelete && (
            <button
              onClick={() => {
                if (window.confirm(`Delete vendor '${vendor.name}'?`)) {
                  onDelete(vendor.id);
                }
              }}
              className="btn btn-ghost btn-sm btn-icon text-error hover:bg-error/10"
              title="Delete vendor"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Rating */}
      <div className="flex items-center gap-1.5 mb-3">
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map(i => (
            <Star key={i} size={13}
              className={i <= Math.round(vendor.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-[var(--border-primary)]'}
            />
          ))}
        </div>
        <span className="text-xs font-medium text-primary">{vendor.rating.toFixed(1)}</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-3 text-center">
        <div className="p-2 rounded-lg bg-inset">
          <p className="text-base font-bold text-primary">{vendor.past_jobs}</p>
          <p className="text-[10px] text-tertiary">Past Jobs</p>
        </div>
        <div className="p-2 rounded-lg bg-inset">
          <p className={cn('text-base font-bold', vendor.avg_delay_days > 2 ? 'text-[var(--error)]' : 'text-primary')}>
            {vendor.avg_delay_days.toFixed(1)}d
          </p>
          <p className="text-[10px] text-tertiary">Avg Delay</p>
        </div>
      </div>

      {/* Contact */}
      <div className="space-y-1.5 text-xs text-secondary">
        <div className="flex items-center gap-2"><Phone size={11} />{vendor.phone}</div>
        <div className="flex items-center gap-2"><Mail size={11} /><span className="truncate">{vendor.email}</span></div>
        <div className="flex items-center gap-2"><MapPin size={11} />{vendor.city}</div>
      </div>
    </div>
  );
}

export default function VendorsPage() {
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [newVendor, setNewVendor] = useState<VendorCreate>({
    name: '', type: 'packers', rating: 4.0, past_jobs: 0, avg_delay_days: 0,
    phone: '', email: '', address: '', city: '', availability: 'available',
  });

  const params: Record<string, string> = {};
  if (typeFilter) params.type = typeFilter;
  if (cityFilter) params.city = cityFilter;

  const { data: vendors, isLoading } = useQuery({
    queryKey: ['vendors', params],
    queryFn: () => api.vendors.list(Object.keys(params).length > 0 ? params : undefined),
  });

  const deleteMutation = useMutation({
    mutationFn: (vendorId: number) => api.vendors.delete(vendorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });

  const batchDeleteMutation = useMutation({
    mutationFn: (ids: number[]) => api.vendors.batchDelete(ids),
    onSuccess: () => {
      setSelectedIds([]);
      setSelectMode(false);
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: () => api.vendors.deleteAll(),
    onSuccess: () => {
      setSelectedIds([]);
      setSelectMode(false);
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: VendorCreate) => api.vendors.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      setShowForm(false);
      setNewVendor({ name: '', type: 'packers', rating: 4.0, past_jobs: 0, avg_delay_days: 0, phone: '', email: '', address: '', city: '', availability: 'available' });
    },
  });

  const cities = [...new Set(vendors?.map(v => v.city).filter(Boolean) || [])].sort();
  const allIds = vendors?.map(v => v.id) || [];
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
        <p className="text-sm text-secondary">{vendors?.length ?? 0} vendors total</p>
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
          <button onClick={() => setShowForm(true)} className="btn btn-primary">
            <Plus size={16} />
            Add Vendor
          </button>
        </div>
      </div>

      {/* Filters & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="input w-auto">
            <option value="">All Types</option>
            {VENDOR_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select value={cityFilter} onChange={e => setCityFilter(e.target.value)} className="input w-auto">
            <option value="">All Cities</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {(typeFilter || cityFilter) && (
            <button onClick={() => { setTypeFilter(''); setCityFilter(''); }} className="btn btn-ghost btn-sm text-accent">
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Selection & Batch Action Bar */}
      {selectMode && vendors && vendors.length > 0 && (
        <div className="card p-3 flex flex-wrap items-center justify-between gap-3 text-xs bg-inset animate-slide-down">
          <label className="flex items-center gap-2 cursor-pointer font-medium text-primary">
            <input
              type="checkbox"
              checked={isAllSelected}
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded accent-[var(--accent)] cursor-pointer"
            />
            Select All ({selectedIds.length}/{vendors.length} selected)
          </label>

          <div className="flex items-center gap-2">
            {selectedIds.length > 0 && (
              <button
                onClick={() => {
                  if (window.confirm(`Delete ${selectedIds.length} selected vendors?`)) {
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
                if (window.confirm("Are you sure you want to DELETE ALL VENDORS?")) {
                  deleteAllMutation.mutate();
                }
              }}
              className="btn btn-ghost btn-sm gap-1 text-error hover:bg-error/10"
              disabled={deleteAllMutation.isPending}
            >
              <Trash2 size={13} />
              Delete All Vendors
            </button>
          </div>
        </div>
      )}

      {/* Add Vendor Form */}
      {showForm && (
        <div className="card p-5 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-primary">Add New Vendor</h3>
            <button onClick={() => setShowForm(false)} className="btn-ghost btn-icon rounded-lg"><X size={16} /></button>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(newVendor); }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="label">Name *</label>
              <input className="input" required value={newVendor.name}
                onChange={e => setNewVendor(v => ({ ...v, name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Type</label>
              <select className="input" value={newVendor.type}
                onChange={e => setNewVendor(v => ({ ...v, type: e.target.value }))}>
                {VENDOR_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">City</label>
              <input className="input" value={newVendor.city}
                onChange={e => setNewVendor(v => ({ ...v, city: e.target.value }))} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" value={newVendor.phone}
                onChange={e => setNewVendor(v => ({ ...v, phone: e.target.value }))} />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={newVendor.email}
                onChange={e => setNewVendor(v => ({ ...v, email: e.target.value }))} />
            </div>
            <div>
              <label className="label">Rating</label>
              <input className="input" type="number" step="0.1" min="0" max="5" value={newVendor.rating}
                onChange={e => setNewVendor(v => ({ ...v, rating: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div className="sm:col-span-2 lg:col-span-3 flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={createMutation.isPending}>
                {createMutation.isPending ? <><Loader2 size={14} className="animate-spin" /> Adding...</> : 'Add Vendor'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Vendor Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-4 bg-inset rounded w-2/3 mb-3"></div>
              <div className="h-3 bg-inset rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : vendors && vendors.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {vendors.map(v => (
            <VendorCard
              key={v.id}
              vendor={v}
              isSelected={selectMode && selectedIds.includes(v.id)}
              onToggleSelect={selectMode ? toggleSelect : undefined}
              onDelete={(id) => deleteMutation.mutate(id)}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p className="text-lg font-medium mb-1">No vendors found</p>
          <p className="text-sm mb-4">Try adjusting your filters</p>
        </div>
      )}
    </div>
  );
}
