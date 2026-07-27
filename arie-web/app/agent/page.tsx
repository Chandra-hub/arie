'use client';
import { useEffect, useState } from 'react';
import { api, AgentRun, JurisdictionInfo } from '../../lib/api-client';
import { RefreshCw, Play, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import { formatDateTime, durationString, cn } from '../../lib/utils';

const STATUS_ICON = {
  completed: <CheckCircle size={16} className="text-accent" />,
  failed:    <XCircle size={16} className="text-danger" />,
  running:   <Loader2 size={16} className="text-warn animate-spin" />,
  queued:    <Clock size={16} className="text-muted" />,
};

export default function AgentPage() {
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [jurisdictions, setJurisdictions] = useState<JurisdictionInfo[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [force, setForce] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  async function load() {
    const [runsData, jData] = await Promise.all([api.getRuns(), api.getJurisdictions()]);
    setRuns(runsData.runs);
    const active = jData.jurisdictions.filter((j) => j.inOrgFootprint);
    setJurisdictions(active);
    setLoading(false);
  }

  useEffect(() => { load().catch(() => setLoading(false)); }, []);

  async function triggerRun() {
    setTriggering(true);
    setMessage('');
    try {
      const res = await api.triggerRun({
        jurisdictions: selected.size > 0 ? Array.from(selected) : undefined,
        force,
      });
      setMessage(res.message);
      setTimeout(() => { load(); setMessage(''); }, 3000);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed to trigger run');
    } finally { setTriggering(false); }
  }

  function toggleJurisdiction(code: string) {
    const next = new Set(selected);
    next.has(code) ? next.delete(code) : next.add(code);
    setSelected(next);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agent Console</h1>
          <p className="text-muted text-sm mt-1">Monitor and control the regulatory intelligence agent</p>
        </div>
        <button onClick={load} className="btn-ghost flex items-center gap-2 text-sm">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Trigger panel */}
      <div className="card space-y-4">
        <span className="section-title">Manual Trigger</span>
        <div>
          <label className="label">Jurisdictions (leave empty for full footprint)</label>
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
        <label className="flex items-center gap-2 cursor-pointer w-fit">
          <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)}
                 className="accent-accent" />
          <span className="text-sm text-muted">Force fetch (bypass change detection)</span>
        </label>
        <div className="flex items-center gap-3">
          <button onClick={triggerRun} disabled={triggering} className="btn-primary flex items-center gap-2">
            {triggering ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            {triggering ? 'Triggering…' : 'Trigger Run'}
          </button>
          {message && <p className="text-sm text-accent">{message}</p>}
        </div>
      </div>

      {/* Run history */}
      <div className="card space-y-1">
        <span className="section-title block mb-4">Run History</span>
        {loading && <div className="text-muted text-sm animate-pulse">Loading…</div>}
        {!loading && runs.length === 0 && (
          <div className="text-muted text-sm py-6 text-center">No runs yet. Trigger one above.</div>
        )}
        {runs.map((run) => (
          <div key={run.runId} className="flex items-center gap-4 py-3 border-t border-border first:border-0">
            <div className="shrink-0">{STATUS_ICON[run.status] ?? STATUS_ICON.queued}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium capitalize">{run.trigger}</span>
                {run.jurisdictions && (
                  <div className="flex gap-1">
                    {run.jurisdictions.map((c) => (
                      <span key={c} className="badge border-border text-muted font-mono text-[10px]">{c}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="text-xs text-muted mt-0.5">{formatDateTime(run.startedAt)}</div>
              {run.error && <div className="text-xs text-danger mt-0.5">{run.error}</div>}
            </div>
            <div className="text-right shrink-0">
              <div className="text-sm font-mono">{run.regulationsUpdated} updated</div>
              <div className="text-xs text-muted">
                {run.changesDetected} changes · {durationString(run.startedAt, run.completedAt)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
