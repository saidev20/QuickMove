import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Users, CheckSquare, Truck, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAppStore } from '@/stores/app-store';
import { cn, getStatusColor } from '@/lib/utils';
import type { SearchResult } from '@/types';

const ICONS: Record<string, any> = { customer: Users, task: CheckSquare, vendor: Truck };

export default function SearchModal() {
  const { searchOpen, setSearchOpen } = useAppStore();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    if (searchOpen) {
      setQuery('');
      setResults([]);
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [searchOpen]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.search(query);
        setResults(res);
        setSelected(0);
      } catch { setResults([]); }
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (result: SearchResult) => {
    setSearchOpen(false);
    if (result.type === 'customer') navigate(`/customers/${result.id}`);
    else if (result.type === 'vendor') navigate('/vendors');
    else if (result.type === 'task') navigate('/kanban');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected(s => Math.min(s + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected(s => Math.max(s - 1, 0));
    } else if (e.key === 'Enter' && results[selected]) {
      handleSelect(results[selected]);
    } else if (e.key === 'Escape') {
      setSearchOpen(false);
    }
  };

  if (!searchOpen) return null;

  return (
    <div className="overlay" onClick={() => setSearchOpen(false)}>
      <div className="fixed inset-x-4 top-[15%] sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-[560px] z-50"
        onClick={e => e.stopPropagation()}>
        <div className="modal">
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-subtle">
            <Search size={18} className="text-tertiary flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search customers, tasks, vendors..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 text-sm bg-transparent outline-none text-primary placeholder:text-tertiary"
            />
            {loading && <Loader2 size={16} className="animate-spin text-tertiary" />}
            <button onClick={() => setSearchOpen(false)}>
              <X size={16} className="text-tertiary" />
            </button>
          </div>

          {/* Results */}
          <div className="max-h-[350px] overflow-y-auto p-2">
            {results.length > 0 ? (
              results.map((r, i) => {
                const Icon = ICONS[r.type] || CheckSquare;
                return (
                  <button
                    key={`${r.type}-${r.id}`}
                    onClick={() => handleSelect(r)}
                    className={cn(
                      'dropdown-item w-full text-left',
                      i === selected && 'bg-[var(--bg-surface-hover)]',
                    )}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
                      <Icon size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-primary truncate">{r.title}</p>
                      <p className="text-xs text-tertiary truncate">{r.subtitle}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {r.status && <span className={`badge ${getStatusColor(r.status)} text-[10px]`}>{r.status.replace('_', ' ')}</span>}
                      <span className="text-[10px] text-tertiary capitalize px-1.5 py-0.5 rounded bg-inset">{r.type}</span>
                    </div>
                  </button>
                );
              })
            ) : query.trim() && !loading ? (
              <div className="text-center py-8 text-sm text-tertiary">
                No results found for "{query}"
              </div>
            ) : !query.trim() ? (
              <div className="text-center py-8 text-sm text-tertiary">
                Start typing to search...
              </div>
            ) : null}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-subtle flex items-center gap-4 text-[10px] text-tertiary">
            <span>Up/Down to navigate</span>
            <span>Enter to select</span>
            <span>Esc to close</span>
          </div>
        </div>
      </div>
    </div>
  );
}
