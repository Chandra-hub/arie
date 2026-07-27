'use client';
import { useEffect, useState } from 'react';
import { api, ComplianceReport, JurisdictionInfo } from '../../lib/api-client';
import { ShieldCheck, ShieldAlert, AlertTriangle, Loader2 } from 'lucide-react';
import { cn, SECTOR_LABELS } from '../../lib/utils';

const SECTORS = ['water', 'chemical', 'manufacturing', 'energy', 'waste', 'transportation', 'mining', 'general'];

const STATUS_CONFIG = {
  compliant:        { icon: ShieldCheck,  label: 'Compliant',        color: 'text-accent border-accent' },
  non_compliant:    { icon: ShieldAlert,  label: 'Non-Compliant',    color: 'text-danger border-danger' },
  review_required:  { icon: AlertTriangle,label: 'Review Required',  color: 'text-warn border-warn' },
};

export default function CompliancePage() {
  const [jurisdictions, setJurisdictions] = useState<JurisdictionInfo[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sector, setSector] = useState('');
  const [scenario, setScenario] = useState('');
  const [report, setReport] = useState<ComplianceReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getJurisdictions().then((d) => {
      const active = d.jurisdictions.filter((j) => j.inOrgFootprint);
      setJurisdictions(active);
      setSelected(new Set(active.map((j) => j.code)));
    });
  }, []);

  function toggleJurisdiction(code: string) {
    const next = new Set(selected);
    next.has(code) ? next.delete(code) : next.add(code);
    setSelected(next);
  }

  async function runCheck() {
    if (!scenario.trim()) { setError('Please describe your operational scenario.'); return; }
    setError('');
    setLoading(true);
    setReport(null);
    try {
      const res = await api.checkCompliance({
        scenario,
        jurisdictions: Array.from(selected),
        sector: sector || undefined,
      });
      setReport(res.complianceReport);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Check failed');
    } finally { setLoading(false); }
  }

  const statusCfg = report ? STATUS_CONFIG[report.status] : null;

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Compliance Check</h1>
        <p className="text-muted text-sm mt-1">Describe your operational scenario — ARIE will assess it against your indexed regulations</p>
      </div>

      {/* Form */}
      <div className="card space-y-5">
        <div>
          <label className="label">Scenario</label>
          <textarea
            className="input min-h-28 resize-y font-sans"
            placeholder="e.g. We discharge 500m³/day of treated wastewater into a river at our UK facility and store 2 tonnes of sodium hypochlorite on-site."
            value={scenario}
            onChange={(e) => setScenario(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Sector (optional)</label>
            <select className="input" value={sector} onChange={(e) => setSector(e.target.value)}>
              <option value="">All sectors</option>
              {SECTORS.map((s) => <option key={s} value={s}>{SECTOR_LABELS[s] ?? s}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Jurisdictions</label>
            <div className="flex flex-wrap gap-1.5">
              {jurisdictions.map((j) => (
                <button
                  key={j.code}
                  onClick={() => toggleJurisdiction(j.code)}
                  className={cn('badge transition-colors cursor-pointer font-mono',
                    selected.has(j.code) ? 'border-accent text-accent' : 'border-border text-muted')}
                >
                  {j.code}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && <p className="text-danger text-sm">{error}</p>}

        <button onClick={runCheck} disabled={loading} className="btn-primary flex items-center gap-2 w-fit">
          {loading ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
          {loading ? 'Checking…' : 'Run Compliance Check'}
        </button>
      </div>

      {/* Report */}
      {report && statusCfg && (
        <div className="space-y-4 animate-fade-in">
          {/* Overall status */}
          <div className={cn('card flex items-center gap-4 border-2', statusCfg.color)}>
            <statusCfg.icon size={28} />
            <div>
              <div className="font-bold text-lg">{statusCfg.label}</div>
              <div className="text-sm text-muted">
                Checked {report.checkedJurisdictions.join(', ')} · {report.findings.length} finding{report.findings.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>

          {/* Findings */}
          {report.findings.map((f, i) => (
            <div key={i} className="card space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-mono text-xs text-accent font-bold">{f.jurisdiction}</span>
                  <div className="font-semibold text-text mt-0.5">{f.regulation}</div>
                </div>
                <span className={cn('badge shrink-0',
                  f.status === 'compliant_if_permitted' ? 'border-warn text-warn' :
                  f.status === 'permit_required' ? 'border-warn text-warn' :
                  'border-border text-muted'
                )}>{f.status.replace(/_/g, ' ')}</span>
              </div>
              <p className="text-sm text-text/80">{f.details}</p>
              <div className="bg-surface rounded-lg p-3 text-sm">
                <span className="text-muted font-medium">Action: </span>
                <span className="text-text">{f.action}</span>
              </div>
              {f.penaltyIfNonCompliant && (
                <div className="text-xs text-danger">⚠ {f.penaltyIfNonCompliant}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
