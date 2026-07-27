'use client';
import { useEffect, useState } from 'react';
import { api, OrgConfig, AgentRun, Regulation } from '../lib/api-client';
import { formatDateTime, durationString, STATUS_COLORS, cn } from '../lib/utils';
import { Globe, FileText, AlertTriangle, RefreshCw, Bot } from 'lucide-react';

export default function DashboardPage() {
  const [org, setOrg] = useState<OrgConfig | null>(null);
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [regulations, setRegulations] = useState<Regulation[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [orgData, runsData, regsData] = await Promise.all([
          api.getOrg(),
          api.getRuns(),
          api.getRegulations({ limit: 5 }),
        ]);
        setOrg(orgData);
        setRuns(runsData.runs.slice(0, 5));
        setRegulations(regsData.regulations);
      } catch { /* handled gracefully */ }
      finally { setLoading(false); }
    }
    load();
  }, []);

  const recentChanges = regulations.filter((r) => r.changeDetected);
  const lastRun = runs[0];

  async function triggerRun() {
    setTriggering(true);
    try { await api.triggerRun({ force: false }); }
    catch { /* ignore */ }
    finally { setTriggering(false); }
  }

  if (loading) return <div className="text-muted animate-pulse">Loading…</div>;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">{org?.name ?? 'Dashboard'}</h1>
          <p className="text-muted text-sm mt-1">Regulatory intelligence across your global footprint</p>
        </div>
        <button onClick={triggerRun} disabled={triggering} className="btn-primary flex items-center gap-2">
          <RefreshCw size={14} className={triggering ? 'animate-spin' : ''} />
          {triggering ? 'Triggering…' : 'Run Agent'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Jurisdictions', value: org?.jurisdictionFootprint.length ?? 0, icon: Globe, color: 'text-accent' },
          { label: 'Regulations Indexed', value: regulations.length, icon: FileText, color: 'text-text' },
          { label: 'Change Alerts', value: recentChanges.length, icon: AlertTriangle, color: recentChanges.length > 0 ? 'text-warn' : 'text-muted' },
          { label: 'Agent Runs', value: runs.length, icon: Bot, color: 'text-text' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card">
            <Icon size={18} className={cn('mb-3', color)} />
            <div className="stat-value">{value}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Recent Agent Runs */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <span className="section-title">Recent Runs</span>
            {lastRun && (
              <span className="flex items-center gap-1.5">
                <span className={cn('live-dot', lastRun.status === 'running' ? 'bg-accent' : 'bg-muted')} />
                <span className="text-xs text-muted capitalize">{lastRun.status}</span>
              </span>
            )}
          </div>
          {runs.length === 0 && <p className="text-muted text-sm">No runs yet. Trigger one above.</p>}
          {runs.map((run) => (
            <div key={run.runId} className="flex items-center justify-between py-2 border-t border-border first:border-0">
              <div>
                <div className="text-sm font-medium text-text capitalize">{run.trigger} run</div>
                <div className="text-xs text-muted">{formatDateTime(run.startedAt)}</div>
              </div>
              <div className="text-right">
                <div className={cn('text-sm font-medium', STATUS_COLORS[run.status] ?? 'text-muted')}>
                  {run.status}
                </div>
                <div className="text-xs text-muted font-mono">
                  {run.regulationsUpdated} updated · {durationString(run.startedAt, run.completedAt)}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Change Alerts */}
        <div className="card space-y-4">
          <span className="section-title">Change Alerts</span>
          {recentChanges.length === 0 && (
            <p className="text-muted text-sm">No regulatory changes detected yet.</p>
          )}
          {recentChanges.map((reg) => (
            <div key={reg.id} className="py-2 border-t border-border first:border-0">
              <div className="flex items-start gap-2">
                <AlertTriangle size={14} className="text-warn mt-0.5 shrink-0" />
                <div>
                  <div className="text-sm font-medium text-text line-clamp-1">{reg.title}</div>
                  <div className="text-xs text-muted mt-0.5">{reg.jurisdictionCode} · {reg.sector}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footprint */}
      {org && (
        <div className="card">
          <span className="section-title block mb-3">Active Jurisdiction Footprint</span>
          <div className="flex flex-wrap gap-2">
            {org.jurisdictionFootprint.map((code) => (
              <span key={code} className="badge border-accent text-accent font-mono">{code}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
