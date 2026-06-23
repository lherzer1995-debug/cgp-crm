import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Search,
  Settings,
  Sparkles,
  Users,
  Wrench,
} from 'lucide-react';
import { cn } from '../../utils/cn';

export type Page = 'dashboard' | 'kunden' | 'aufgaben' | 'einsaetze' | 'kalender' | 'einstellungen';

interface Props {
  current: Page;
  onNav: (page: Page) => void;
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen?: boolean;
  isMobile?: boolean;
}

const navigation: { id: Page; label: string; icon: React.ElementType; badge?: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'kunden', label: 'Kunden', icon: Users },
  { id: 'aufgaben', label: 'Aufgaben', icon: ClipboardList, badge: '8' },
  { id: 'einsaetze', label: 'Einsätze', icon: Wrench },
  { id: 'kalender', label: 'Kalender', icon: Calendar },
  { id: 'einstellungen', label: 'Einstellungen', icon: Settings },
];

export default function Sidebar({ current, onNav, collapsed, onToggle, mobileOpen = false, isMobile = false }: Props) {
  const visible = !isMobile || mobileOpen;

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-50 flex h-[100dvh] flex-col',
        'border-r border-white/[0.08] bg-obsidian/88 backdrop-blur-2xl',
        'shadow-[24px_0_80px_rgba(0,0,0,.32)]',
        'transition-all duration-300 ease-[cubic-bezier(.16,1,.3,1)]',
        collapsed ? 'w-[84px]' : 'w-[284px]',
        isMobile && 'w-[292px]',
        isMobile && !visible && '-translate-x-full',
        isMobile && visible && 'translate-x-0'
      )}
    >
      <div className="flex h-[76px] shrink-0 items-center justify-between px-5">
        <button
          type="button"
          onClick={() => onNav('dashboard')}
          className="flex min-w-0 items-center gap-3 rounded-2xl text-left"
          aria-label="Zum Dashboard"
        >
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-violet shadow-lg shadow-primary/25">
            <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-white/10" />
            <Sparkles className="relative z-10 h-5 w-5 text-white" />
          </div>

          {!collapsed && (
            <div className="min-w-0 animate-in">
              <div className="flex items-baseline gap-1">
                <span className="text-[20px] font-extrabold tracking-[-0.045em] text-white">CGP</span>
                <span className="text-[20px] font-semibold tracking-[-0.045em] text-mist">CRM</span>
              </div>
              <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-ash">Service Suite</p>
            </div>
          )}
        </button>

        {!isMobile && !collapsed && (
          <button
            type="button"
            onClick={onToggle}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-ash hover:bg-white/[0.06] hover:text-white"
            aria-label="Sidebar einklappen"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {!collapsed && (
        <div className="px-4 pb-4">
          <button
            type="button"
            className={cn(
              'flex h-12 w-full items-center gap-3 rounded-2xl px-4 text-left',
              'border border-white/[0.08] bg-white/[0.045] text-[14px] text-ash',
              'hover:border-white/[0.14] hover:bg-white/[0.07] hover:text-mist',
              'transition-all duration-200'
            )}
          >
            <Search className="h-4 w-4" />
            <span className="flex-1">Suchen…</span>
            <kbd className="rounded-lg bg-white/[0.07] px-2 py-1 text-[12px] font-bold text-smoke">⌘K</kbd>
          </button>
        </div>
      )}

      <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 py-2">
        {!collapsed && (
          <p className="px-3 pb-2 text-[12px] font-bold uppercase tracking-[0.14em] text-ash/80">Navigation</p>
        )}

        {navigation.map((item, index) => {
          const Icon = item.icon;
          const active = current === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNav(item.id)}
              style={{ animationDelay: `${index * 25}ms` }}
              className={cn(
                'group relative flex w-full items-center rounded-2xl transition-all duration-200',
                collapsed ? 'justify-center p-3.5' : 'gap-3 px-3.5 py-3',
                active
                  ? 'bg-white/[0.075] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,.08)]'
                  : 'text-smoke hover:bg-white/[0.045] hover:text-white',
                !collapsed && 'animate-slide-r'
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-primary-light to-primary shadow-[0_0_18px_rgba(99,91,255,.55)]" />
              )}

              <span
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-200',
                  active ? 'bg-primary/16 text-primary-light' : 'bg-white/[0.035] text-ash group-hover:text-white'
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.2 : 1.8} />
              </span>

              {!collapsed && (
                <>
                  <span className="flex-1 text-left text-[15px] font-bold">{item.label}</span>
                  {item.badge && (
                    <span className="rounded-full bg-primary/16 px-2 py-0.5 text-[12px] font-extrabold text-primary-soft">
                      {item.badge}
                    </span>
                  )}
                </>
              )}

              {collapsed && (
                <span className="pointer-events-none absolute left-full ml-3 translate-x-1 whitespace-nowrap rounded-xl border border-white/[0.08] bg-slate px-3 py-2 text-[13px] font-bold text-white opacity-0 shadow-2xl shadow-black/40 transition-all group-hover:translate-x-0 group-hover:opacity-100">
                  {item.label}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="space-y-3 border-t border-white/[0.08] p-3">
        {!isMobile && collapsed && (
          <button
            type="button"
            onClick={onToggle}
            className="flex w-full items-center justify-center rounded-2xl p-3 text-ash hover:bg-white/[0.05] hover:text-white"
            aria-label="Sidebar ausklappen"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}

        {!collapsed && (
          <div className="rounded-3xl border border-white/[0.08] bg-white/[0.045] p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-violet text-[13px] font-extrabold text-white shadow-lg shadow-primary/20">
                LH
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-extrabold text-white">Lars Herzer</p>
                <p className="truncate text-[13px] text-smoke">Administrator</p>
              </div>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-xl text-ash hover:bg-white/[0.06] hover:text-danger"
                aria-label="Abmelden"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
