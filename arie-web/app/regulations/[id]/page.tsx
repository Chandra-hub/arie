'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api, Regulation } from '../../../lib/api-client';
import { formatDate, formatDateTime, SECTOR_LABELS } from '../../../lib/utils';
import { ArrowLeft, ExternalLink, AlertTriangle, CheckCircle } from 'lucide-react';

export default function RegulationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [reg, setReg] = useState<Regulation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getRegulation(id).then(setReg).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="text-muted animate-pulse">Loading…</div>;
  if (!reg) return <div className="text-muted">Regulation not found.</div>;

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <Link href="/regulations" className="flex items-center gap-2 text-muted hover:text-accent text-sm transition-colors">
        <ArrowLeft size={14} /> Back to regulations
      </Link>

      {/* Header */}
      <div className="card space-y-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-bold text-accent">{reg.jurisdictionCode}</span>
          {reg.sector && <span className="badge border-border text-muted">{SECTOR_LABELS[reg.sector] ?? reg.sector}</span>}
          {reg.changeDetected && (
            <span className="badge border-warn text-warn flex items-center gap-1">
              <AlertTriangle size={10} /> Change Detected
            </span>
          )}
          {!reg.changeDetected && (
            <span className="badge border-accent text-accent flex items-center gap-1">
              <CheckCircle size={10} /> Up to date
            </span>
          )}
        </div>
        <h1 className="text-xl font-bold text-text">{reg.title}</h1>
        {reg.body && <p className="text-sm text-muted">Issued by: {reg.body}</p>}
        {reg.summary && <p className="text-text/80 text-sm leading-relaxed">{reg.summary}</p>}
        {reg.sourceUrl && (
          <a href={reg.sourceUrl} target="_blank" rel="noopener noreferrer"
             className="flex items-center gap-1.5 text-accent text-sm hover:underline w-fit">
            View source <ExternalLink size={12} />
          </a>
        )}
      </div>

      {/* Key Obligations */}
      {reg.keyObligations && reg.keyObligations.length > 0 && (
        <div className="card space-y-3">
          <span className="section-title">Key Obligations</span>
          <ul className="space-y-2">
            {reg.keyObligations.map((o, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-text/80">
                <span className="w-5 h-5 rounded-full bg-accent/10 text-accent text-xs flex items-center justify-center shrink-0 mt-0.5 font-mono">{i + 1}</span>
                {o}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Penalty Framework */}
      {reg.penaltyFramework && (
        <div className="card space-y-3">
          <span className="section-title">Penalty Framework</span>
          <div className="grid grid-cols-3 gap-4">
            {reg.penaltyFramework.maxFine && (
              <div>
                <div className="stat-value text-2xl">
                  {reg.penaltyFramework.currency} {reg.penaltyFramework.maxFine.toLocaleString()}
                </div>
                <div className="stat-label">Maximum Fine</div>
              </div>
            )}
            <div>
              <div className={`text-2xl font-bold ${reg.penaltyFramework.criminalLiability ? 'text-danger' : 'text-accent'}`}>
                {reg.penaltyFramework.criminalLiability ? 'Yes' : 'No'}
              </div>
              <div className="stat-label">Criminal Liability</div>
            </div>
          </div>
          {reg.penaltyFramework.notes && (
            <p className="text-sm text-muted border-t border-border pt-3">{reg.penaltyFramework.notes}</p>
          )}
        </div>
      )}

      {/* Metadata */}
      <div className="card grid grid-cols-2 gap-4 text-sm">
        {reg.effectiveDate && (
          <div><span className="label">Effective Date</span><span className="text-text">{formatDate(reg.effectiveDate)}</span></div>
        )}
        <div><span className="label">Last Updated</span><span className="text-text">{formatDateTime(reg.updatedAt)}</span></div>
        {reg.changeHistory && reg.changeHistory.length > 0 && (
          <div className="col-span-2">
            <span className="label">Change History</span>
            <div className="space-y-1 mt-1">
              {reg.changeHistory.map((c, i) => (
                <div key={i} className="flex items-center gap-2 text-muted">
                  <span className="font-mono text-xs">{formatDateTime(c.detectedAt)}</span>
                  <span>—</span>
                  <span>{c.summary}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
