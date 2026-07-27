'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, Regulation } from '../../lib/api-client';
import { Search, AlertTriangle, ChevronRight } from 'lucide-react';
import { formatDate, SECTOR_LABELS, cn } from '../../lib/utils';

const SECTORS = ['', 'water', 'chemical', 'manufacturing', 'energy', 'waste', 'transportation', 'mining', 'general'];

export default function RegulationsPage() {
  const [regulations, setRegulations] = useState<Regulation[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sector, setSector] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    api.getRegulations({ search: search || undefined, sector: sector || undefined, page, limit: 20 })
      .then((r) => { setRegulations(r.regulations); setTotal(r.total); })
      .finally(() => setLoading(false));
  }, [search, sector, page]);

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Regulations</h1>
        <p className="text-muted text-sm mt-1">{total} regulations indexed across your footprint</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            className="input pl-9"
            placeholder="Search regulations…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select
          className="input w-44"
          value={sector}
          onChange={(e) => { setSector(e.target.value); setPage(1); }}
        >
          <option value="">All sectors</option>
          {SECTORS.filter(Boolean).map((s) => (
            <option key={s} value={s}>{SECTOR_LABELS[s] ?? s}</option>
          ))}
        </select>
      </div>

      {/* List */}
      <div className="space-y-2">
        {loading && <div className="text-muted animate-pulse text-sm">Loading…</div>}
        {!loading && regulations.length === 0 && (
          <div className="card text-center text-muted py-12">
            No regulations found. Run the agent to index your jurisdiction footprint.
          </div>
        )}
        {regulations.map((reg) => (
          <Link key={reg.id} href={`/regulations/${reg.id}`} className="block">
            <div className="card hover:border-accent/50 transition-all flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-bold text-accent">{reg.jurisdictionCode}</span>
                  {reg.sector && <span className="badge border-border text-muted">{SECTOR_LABELS[reg.sector] ?? reg.sector}</span>}
                  {reg.changeDetected && (
                    <span className="badge border-warn text-warn flex items-center gap-1">
                      <AlertTriangle size={10} /> Changed
                    </span>
                  )}
                </div>
                <div className="font-medium text-text line-clamp-1">{reg.title}</div>
                {reg.summary && <div className="text-sm text-muted mt-1 line-clamp-2">{reg.summary}</div>}
              </div>
              <div className="flex items-center gap-3 shrink-0 text-muted">
                {reg.effectiveDate && <span className="text-xs">{formatDate(reg.effectiveDate)}</span>}
                <ChevronRight size={16} />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button className="btn-ghost text-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Previous</button>
          <span className="text-sm text-muted">Page {page} of {totalPages}</span>
          <button className="btn-ghost text-sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next →</button>
        </div>
      )}
    </div>
  );
}
