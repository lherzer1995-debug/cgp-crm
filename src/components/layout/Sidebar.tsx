import { cn } from '../../utils/cn';
import {
  LayoutDashboard, Users, ClipboardList, Calendar, Settings,
  Search, ChevronLeft, ChevronRight, LogOut, Wrench, Command, Sparkles,
} from 'lucide-react';

export type Page = 'dashboard' | 'kunden' | 'aufgaben' | 'einsaetze' | 'kalender' | 'einstellungen';

interface Props {
  current: Page;
  onNav: (p: Page) => void;
  collapsed: boolean;
  onToggle: () => void;
}

const nav: { id: Page; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'kunden', label: 'Kunden', icon: Users },
  { id: 'aufgaben', label: 'Aufgaben', icon: ClipboardList },
  { id: 'einsaetze', label: 'Einsätze', icon: Wrench },
  { id: 'kalender', label: 'Kalender', icon: Calendar },
  { id: 'einstellungen', label: 'Einstellungen', icon: Settings },
];

export default function Sidebar({ current, onNav, collapsed, onToggle }: Props) {
  return (
    <aside className={cn(
      'fixed left-0 top-0 h-screen z-50 flex flex-col',
      'bg-obsidian/95 backdrop-blur-2xl',
      'border-r border-white/[0.02]',
      'transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
      collapsed ? 'w-[72px]' : 'w-[260px]'
    )}>
      {/* ═══ Logo ═══ */}
      <div className="h-[64px] flex items-center px-5 shrink-0">
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0',
            'bg-gradient-to-br from-primary to-violet',
            'shadow-lg shadow-primary/20',
            'relative overflow-hidden'
          )}>
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            <Sparkles className="w-5 h-5 text-white relative z-10" />
          </div>
          {!collapsed && (
            <div className="animate-in">
              <div className="flex items-baseline gap-0.5">
                <span className="text-[17px] font-bold tracking-tight text-white">CGP</span>
                <span className="text-[17px] font-light tracking-tight text-mist">CRM</span>
              </div>
              <p className="text-[9px] text-ash tracking-wide uppercase">Enterprise</p>
            </div>
          )}
        </div>
      </div>

      {/* ═══ Search ═══ */}
      {!collapsed && (
        <div className="px-4 pb-3 animate-in">
          <button className={cn(
            'w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl',
            'bg-white/[0.02] border border-white/[0.04]',
            'text-[13px] text-ash',
            'hover:bg-white/[0.04] hover:border-white/[0.06]',
            'transition-all duration-200 group'
          )}>
            <Search className="w-4 h-4 text-smoke group-hover:text-mist transition-colors" />
            <span className="flex-1 text-left">Suchen…</span>
            <kbd className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-white/[0.04] text-[10px] font-medium text-smoke">
              <Command className="w-2.5 h-2.5" />K
            </kbd>
          </button>
        </div>
      )}

      {/* ═══ Navigation ═══ */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {!collapsed && (
          <p className="px-3 pt-1 pb-2 text-micro text-ash/60">Navigation</p>
        )}
        {nav.map((item, idx) => {
          const Icon = item.icon;
          const active = current === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNav(item.id)}
              style={{ animationDelay: `${idx * 30}ms` }}
              className={cn(
                'w-full flex items-center gap-3 rounded-xl',
                'transition-all duration-200 group relative',
                collapsed ? 'justify-center p-3' : 'px-3.5 py-2.5',
                active 
                  ? 'bg-primary/8 text-primary-light' 
                  : 'text-mist hover:text-white hover:bg-white/[0.03]',
                !collapsed && 'animate-slide-r'
              )}
            >
              {active && (
                <div className={cn(
                  'absolute left-0 top-1/2 -translate-y-1/2',
                  'w-[3px] h-5 rounded-r-full',
                  'bg-gradient-to-b from-primary-light to-primary',
                  'shadow-[0_0_8px_rgba(99,102,241,0.5)]'
                )} />
              )}
              
              <div className={cn(
                'relative flex items-center justify-center',
                collapsed ? 'w-5 h-5' : 'w-[18px] h-[18px]'
              )}>
                <Icon className={cn(
                  'w-full h-full transition-all duration-200',
                  active ? 'text-primary-light' : 'text-smoke group-hover:text-white'
                )} strokeWidth={active ? 2 : 1.5} />
                {active && (
                  <div className="absolute inset-0 bg-primary/30 blur-md" />
                )}
              </div>
              
              {!collapsed && (
                <span className="text-[13px] font-medium">{item.label}</span>
              )}
              
              {collapsed && (
                <div className={cn(
                  'absolute left-full ml-3 px-3 py-1.5',
                  'bg-slate border border-white/[0.06] rounded-lg',
                  'text-[12px] font-medium text-white whitespace-nowrap',
                  'opacity-0 group-hover:opacity-100 pointer-events-none',
                  'transition-all duration-200 shadow-xl shadow-black/30',
                  'translate-x-1 group-hover:translate-x-0'
                )}>
                  {item.label}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* ═══ Bottom ═══ */}
      <div className="px-3 py-4 space-y-2 border-t border-white/[0.02]">
        <button
          onClick={onToggle}
          className={cn(
            'w-full flex items-center justify-center gap-2',
            'px-3 py-2 rounded-xl',
            'text-[12px] font-medium text-smoke',
            'hover:text-white hover:bg-white/[0.03]',
            'transition-all duration-200'
          )}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span className="animate-in">Einklappen</span>
            </>
          )}
        </button>

        {!collapsed && (
          <div className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-xl',
            'bg-gradient-to-r from-white/[0.02] to-transparent',
            'border border-white/[0.03]',
            'animate-in'
          )}>
            <div className={cn(
              'w-9 h-9 rounded-xl',
              'bg-gradient-to-br from-primary to-violet',
              'flex items-center justify-center',
              'text-[11px] font-bold text-white',
              'shadow-lg shadow-primary/15',
              'shrink-0'
            )}>
              LH
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-white truncate">Lars Herzer</p>
              <p className="text-[10px] text-smoke">Administrator</p>
            </div>
            <button className="p-1.5 rounded-lg hover:bg-white/[0.05] transition-colors group">
              <LogOut className="w-4 h-4 text-smoke group-hover:text-danger transition-colors" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
