import {
  Calendar,
  ClipboardList,
  LayoutDashboard,
  Settings,
  Users,
  Wrench,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useAppStore, type Page } from '../../data/app-store';
import { StatusBadge } from '../ui/common';

export type { Page };

interface Props {
  current: Page;
  onNav: (page: Page) => void;
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen?: boolean;
  isMobile?: boolean;
}

const navItems: { id: Page; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Übersicht', icon: LayoutDashboard },
  { id: 'kunden', label: 'Kunden', icon: Users },
  { id: 'aufgaben', label: 'Aufgaben', icon: ClipboardList },
  { id: 'einsaetze', label: 'Einsätze', icon: Wrench },
  { id: 'kalender', label: 'Kalender', icon: Calendar },
  { id: 'einstellungen', label: 'Einstellungen', icon: Settings },
];

export default function Sidebar({ current, onNav, collapsed, mobileOpen = false, isMobile = false }: Props) {
  const { kpi, saveState, settings } = useAppStore();
  const visible = !isMobile || mobileOpen;

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-50 flex h-[100dvh] flex-col border-r border-white/[0.08] bg-[#0b0f17] shadow-[18px_0_50px_rgba(0,0,0,.32)] transition-all duration-300',
        collapsed ? 'w-[88px]' : 'w-[286px]',
        isMobile && 'w-[292px]',
        isMobile && !visible && '-translate-x-full',
      )}
    >
      <div className="flex h-[76px] items-center px-5">
        <button type="button" onClick={() => onNav('dashboard')} className="flex items-center gap-3 text-left">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12 text-primary-light ring-1 ring-primary/20">
            CRM
          </div>
          {!collapsed && (
            <div>
              <p className="text-[14px] font-semibold text-white">{settings.company}</p>
              <p className="text-[12px] text-smoke">Service-Arbeitsplatz</p>
            </div>
          )}
        </button>
      </div>

      {!collapsed && (
        <div className="px-4 pb-4">
          <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-4">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-smoke">Heute</p>
              <StatusBadge tone={saveState === 'saving' ? 'warning' : 'success'}>
                {saveState === 'saving' ? 'speichert' : 'aktuell'}
              </StatusBadge>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/[0.04] p-3">
                <p className="text-[22px] font-semibold text-white">{kpi.todayServices}</p>
                <p className="text-[12px] text-smoke">Einsätze heute</p>
              </div>
              <div className="rounded-2xl bg-white/[0.04] p-3">
                <p className="text-[22px] font-semibold text-white">{kpi.urgentTasks}</p>
                <p className="text-[12px] text-smoke">dringende To-dos</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <nav className="flex-1 space-y-1 px-3">
        {navItems.map((item) => {
          const active = current === item.id;
          const Icon = item.icon;
          const badge =
            item.id === 'aufgaben'
              ? kpi.openTasks
              : item.id === 'kunden'
              ? kpi.waitingCustomers
              : item.id === 'einsaetze'
              ? kpi.todayServices
              : null;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNav(item.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-colors',
                active ? 'bg-white/[0.08] text-white' : 'text-smoke hover:bg-white/[0.04] hover:text-white',
                collapsed && 'justify-center px-0',
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1 text-[14px] font-medium">{item.label}</span>
                  {badge ? <span className="rounded-full bg-white/[0.08] px-2 py-0.5 text-[11px] font-semibold">{badge}</span> : null}
                </>
              )}
            </button>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="border-t border-white/[0.08] p-4">
          <div className="rounded-2xl bg-white/[0.03] p-4">
            <p className="text-[13px] font-medium text-white">Aktuelle Aufmerksamkeit</p>
            <p className="mt-1 text-[13px] leading-5 text-smoke">
              {kpi.riskCustomers > 0
                ? `${kpi.riskCustomers} Kunden mit erhöhtem Risiko oder offener Eskalation.`
                : 'Heute keine eskalierten Kundenfälle.'}
            </p>
          </div>
        </div>
      )}
    </aside>
  );
}
