'use client';
import { useEffect, useState } from 'react';
import { api, JurisdictionInfo } from '../../lib/api-client';
import { Check, Plus, Minus, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function JurisdictionsPage() {
  const [jurisdictions, setJurisdictions] = useState<JurisdictionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [footprint, setFootprint] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      const [jData, orgData] = await Promise.all([api.getJurisdictions(), api.getOrg()]);
      setJurisdictions(jData.jurisdictions);
      setFootprint(new Set(orgData.jurisdictionFootprint));
      setLoading(false);
    }
    load().catch(() => setLoading(false));
  }, []);

  async function toggleJurisdiction(code: string) {
    const next = new Set(footprint);
    next.has(code) ? next.delete(code) : next.add(code);
    setFootprint(next);
    setSaving(true);
    try {
      await api.updateOrg({ jurisdictionFootprint: Array.from(next) });
    } finally { setSaving(false); }
  }

  if (loading) return <div className="text-muted animate-pulse">Loading…</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Jurisdictions</h1>
          <p className="text-muted text-sm mt-1">Manage which jurisdictions ARIE monitors for your organisation</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted">
          {saving && <Loader2 size={14} className="animate-spin text-accent" />}
          <span>{footprint.size} active</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {jurisdictions.map((j) => {
          const active = footprint.has(j.code);
          return (
            <div
              key={j.code}
              className={cn('card cursor-pointer transition-all', active ? 'border-accent' : 'hover:border-muted')}
              onClick={() => toggleJurisdiction(j.code)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-lg font-bold text-accent">{j.code}</span>
                  <div>
                    <div className="font-semibold text-text">{j.name}</div>
                    <div className="text-xs text-muted mt-0.5">{j.regulatoryBodies.slice(0, 2).join(' · ')}</div>
                  </div>
                </div>
                <div className={cn('w-5 h-5 rounded-full border flex items-center justify-center shrink-0',
                  active ? 'bg-accent border-accent' : 'border-border')}>
                  {active ? <Check size={12} className="text-base" /> : <Plus size={12} className="text-muted" />}
                </div>
              </div>
              <div className="flex gap-1.5 mt-3 flex-wrap">
                {j.sectors.slice(0, 4).map((s) => (
                  <span key={s} className="badge border-border text-muted">{s}</span>
                ))}
                {j.rssFeedAvailable && (
                  <span className="badge border-accent text-accent">RSS</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
