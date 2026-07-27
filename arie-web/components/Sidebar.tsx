'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Globe, FileText, ShieldCheck, Bot, Settings } from 'lucide-react';
import { cn } from '../lib/utils';

const NAV = [
  { href: '/',               label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/jurisdictions',  label: 'Jurisdictions',icon: Globe },
  { href: '/regulations',    label: 'Regulations',  icon: FileText },
  { href: '/compliance',     label: 'Compliance',   icon: ShieldCheck },
  { href: '/agent',          label: 'Agent',        icon: Bot },
  { href: '/settings',       label: 'Settings',     icon: Settings },
];

export default function Sidebar() {
  const path = usePathname();
  return (
    <aside className="w-56 shrink-0 h-screen sticky top-0 bg-surface border-r border-border flex flex-col">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-border">
        <span className="text-lg font-bold tracking-tight text-text">ARIE</span>
        <span className="ml-2 text-xs text-muted font-mono">v1.0</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = path === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-card text-accent border border-border'
                  : 'text-muted hover:text-text hover:bg-card',
              )}
            >
              <Icon size={16} className={active ? 'text-accent' : ''} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-border">
        <div className="flex items-center gap-2">
          <span className="live-dot" />
          <span className="text-xs text-muted">Agent active</span>
        </div>
      </div>
    </aside>
  );
}
