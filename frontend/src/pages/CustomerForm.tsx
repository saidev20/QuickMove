import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { CustomerCreate } from '@/types';

const UTILITY_OPTIONS = ['electricity', 'internet', 'water', 'gas'];
const DOC_OPTIONS = ['aadhaar', 'pan_card', 'rental_agreement', 'bank_statement', 'id_proof'];
const APT_OPTIONS = ['Studio', '1 RK', '1 BHK', '2 BHK', '3 BHK', '4 BHK'];

const CITIES = [
  'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai',
  'Pune', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Lucknow',
  'Noida', 'Gurgaon', 'Chandigarh', 'Kochi',
];

export default function CustomerForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: executives } = useQuery({
    queryKey: ['executives'],
    queryFn: () => api.executives(),
  });

  const [form, setForm] = useState<CustomerCreate>({
    name: '',
    phone: '',
    email: '',
    current_city: '',
    destination_city: '',
    move_date: '',
    family_size: 2,
    apartment_preference: '2 BHK',
    budget: '',
    utility_requirements: [],
    documents_required: [],
    notes: '',
    assigned_executive: '',
  });

  const [success, setSuccess] = useState(false);

  const mutation = useMutation({
    mutationFn: (data: CustomerCreate) => api.customers.create(data),
    onSuccess: (customer) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      setSuccess(true);
      setTimeout(() => navigate(`/customers/${customer.id}`), 1500);
    },
  });

  const updateField = (field: keyof CustomerCreate, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const toggleArrayItem = (field: 'utility_requirements' | 'documents_required', item: string) => {
    setForm(prev => {
      const arr = prev[field] || [];
      return {
        ...prev,
        [field]: arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item],
      };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    mutation.mutate(form);
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-scale-in">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
          style={{ backgroundColor: 'var(--success-bg)' }}>
          <Check size={32} style={{ color: 'var(--success)' }} />
        </div>
        <h2 className="text-xl font-semibold text-primary mb-2">Customer Created Successfully</h2>
        <p className="text-sm text-secondary">Relocation workflow has been generated. Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button onClick={() => navigate('/customers')} className="btn btn-ghost btn-sm gap-1.5 -ml-2">
        <ArrowLeft size={14} />
        Back to Customers
      </button>

      <div className="card p-6 animate-slide-up">
        <h2 className="text-lg font-semibold text-primary mb-1">Customer Intake Form</h2>
        <p className="text-sm text-secondary mb-6">Enter the customer's relocation details. An AI workflow will be generated automatically.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Info */}
          <fieldset>
            <legend className="text-xs font-semibold text-tertiary uppercase tracking-wider mb-3">Personal Information</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Customer Name *</label>
                <input type="text" className="input" placeholder="e.g., Rahul Sharma" required
                  value={form.name} onChange={e => updateField('name', e.target.value)} />
              </div>
              <div>
                <label className="label">Phone Number</label>
                <input type="tel" className="input" placeholder="+91 99999 99999"
                  value={form.phone} onChange={e => updateField('phone', e.target.value)} />
              </div>
              <div>
                <label className="label">Email</label>
                <input type="email" className="input" placeholder="rahul@email.com"
                  value={form.email} onChange={e => updateField('email', e.target.value)} />
              </div>
              <div>
                <label className="label">Family Size</label>
                <input type="number" className="input" min={1} max={20}
                  value={form.family_size} onChange={e => updateField('family_size', parseInt(e.target.value) || 1)} />
              </div>
            </div>
          </fieldset>

          {/* Relocation Details */}
          <fieldset>
            <legend className="text-xs font-semibold text-tertiary uppercase tracking-wider mb-3">Relocation Details</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Current City</label>
                <select className="input" value={form.current_city} onChange={e => updateField('current_city', e.target.value)}>
                  <option value="">Select city</option>
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Destination City</label>
                <select className="input" value={form.destination_city} onChange={e => updateField('destination_city', e.target.value)}>
                  <option value="">Select city</option>
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Move Date</label>
                <input type="date" className="input"
                  value={form.move_date} onChange={e => updateField('move_date', e.target.value)} />
              </div>
              <div>
                <label className="label">Budget (per month)</label>
                <input type="text" className="input" placeholder="e.g., 15000-20000"
                  value={form.budget} onChange={e => updateField('budget', e.target.value)} />
              </div>
              <div>
                <label className="label">Apartment Preference</label>
                <select className="input" value={form.apartment_preference} onChange={e => updateField('apartment_preference', e.target.value)}>
                  {APT_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Assigned Executive</label>
                <select className="input" value={form.assigned_executive} onChange={e => updateField('assigned_executive', e.target.value)}>
                  <option value="">Auto-assign</option>
                  {executives?.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
            </div>
          </fieldset>

          {/* Utilities */}
          <fieldset>
            <legend className="text-xs font-semibold text-tertiary uppercase tracking-wider mb-3">Utility Requirements</legend>
            <div className="flex flex-wrap gap-2">
              {UTILITY_OPTIONS.map(u => (
                <button key={u} type="button"
                  onClick={() => toggleArrayItem('utility_requirements', u)}
                  className={cn(
                    'btn btn-sm rounded-full capitalize',
                    form.utility_requirements?.includes(u) ? 'btn-primary' : 'btn-secondary'
                  )}
                >
                  {form.utility_requirements?.includes(u) && <Check size={12} />}
                  {u}
                </button>
              ))}
            </div>
          </fieldset>

          {/* Documents */}
          <fieldset>
            <legend className="text-xs font-semibold text-tertiary uppercase tracking-wider mb-3">Documents Required</legend>
            <div className="flex flex-wrap gap-2">
              {DOC_OPTIONS.map(d => (
                <button key={d} type="button"
                  onClick={() => toggleArrayItem('documents_required', d)}
                  className={cn(
                    'btn btn-sm rounded-full capitalize',
                    form.documents_required?.includes(d) ? 'btn-primary' : 'btn-secondary'
                  )}
                >
                  {form.documents_required?.includes(d) && <Check size={12} />}
                  {d.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </fieldset>

          {/* Notes */}
          <div>
            <label className="label">Additional Notes</label>
            <textarea className="input min-h-[80px]" placeholder="Any special requirements or notes..."
              value={form.notes} onChange={e => updateField('notes', e.target.value)} />
          </div>

          {/* Submit */}
          <div className="flex items-center justify-between pt-4 border-t border-subtle">
            <p className="text-xs text-tertiary">An AI-generated relocation plan will be created automatically.</p>
            <button type="submit" className="btn btn-primary btn-lg" disabled={mutation.isPending || !form.name.trim()}>
              {mutation.isPending ? (
                <><Loader2 size={16} className="animate-spin" /> Creating...</>
              ) : (
                'Create Relocation Project'
              )}
            </button>
          </div>

          {mutation.isError && (
            <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: 'var(--error-bg)', color: 'var(--error)' }}>
              Error: {mutation.error?.message || 'Failed to create customer'}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
