'use client';
import { useEffect, useState } from 'react';
import { api, OrgConfig } from '../../lib/api-client';
import { Save, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function SettingsPage() {
  const [org, setOrg] = useState<OrgConfig | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('arie_api_key') ?? '';
    setApiKey(stored);
    if (stored) {
      api.getOrg().then((o) => { setOrg(o); setWebhookUrl(o.webhookUrl ?? ''); }).finally(() => setLoading(false));
    } else { setLoading(false); }
  }, []);

  function saveApiKey() {
    localStorage.setItem('arie_api_key', apiKey);
    window.location.reload();
  }

  async function saveSettings() {
    setSaving(true);
    try {
      await api.updateOrg({ webhookUrl: webhookUrl || undefined });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* API Key */}
      <div className="card space-y-4">
        <span className="section-title">API Key</span>
        <p className="text-sm text-muted">Your organisation API key is stored locally in your browser and sent with every request.</p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              className="input pr-10"
              type={showKey ? 'text' : 'password'}
              placeholder="arie_live_…"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <button onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text">
              {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <button onClick={saveApiKey} className="btn-primary flex items-center gap-2">
            <Save size={14} /> Save Key
          </button>
        </div>
      </div>

      {/* Org info */}
      {loading && <div className="text-muted animate-pulse text-sm">Loading org details…</div>}
      {org && (
        <>
          <div className="card space-y-4">
            <span className="section-title">Organisation</span>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="label">Name</span><span className="text-text">{org.name}</span></div>
              <div><span className="label">Org ID</span><span className="font-mono text-muted text-xs">{org.orgId}</span></div>
              <div>
                <span className="label">Sectors</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {org.sectors.map((s) => (
                    <span key={s} className="badge border-border text-muted">{s}</span>
                  ))}
                </div>
              </div>
              <div>
                <span className="label">Jurisdiction Footprint</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {org.jurisdictionFootprint.map((c) => (
                    <span key={c} className="badge border-accent text-accent font-mono">{c}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="card space-y-4">
            <span className="section-title">Webhook</span>
            <p className="text-sm text-muted">ARIE will POST a JSON payload to this URL when regulatory changes are detected.</p>
            <input className="input" placeholder="https://your-system.com/webhooks/regulations"
                   value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} />
            <button onClick={saveSettings} disabled={saving} className="btn-primary flex items-center gap-2 w-fit">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {saved ? 'Saved!' : saving ? 'Saving…' : 'Save Settings'}
            </button>
          </div>
        </>
      )}

      {/* API URL */}
      <div className="card space-y-2">
        <span className="section-title">API Endpoint</span>
        <p className="font-mono text-sm text-accent">{process.env.NEXT_PUBLIC_ARIE_API_URL ?? 'http://localhost:3000/api/v1'}</p>
        <p className="text-xs text-muted">Configured via NEXT_PUBLIC_ARIE_API_URL environment variable.</p>
      </div>
    </div>
  );
}
