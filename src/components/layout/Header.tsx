import { Bell, Search, Plus, Sparkles } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { Page } from './Sidebar';

const titles: Record<Page, { t: string; s: string }> = {
  dashboard: { t: 'Dashboard', s: 'Willkommen zurück' },
  kunden: { t: 'Kunden', s: 'Bestandskunden verwalten' },
  aufgaben: { t: 'Aufgaben', s: 'Offene Aufgaben im Überblick' },
  einsaetze: { t: 'Einsätze', s: 'Service-Einsätze planen' },
  kalender: { t: 'Kalender', s: 'Termine & Planung' },
  einstellungen: { t: 'Einstellungen', s: 'System konfigurieren' },
};

interface Props {
  page: Page;
  search: string;
  onSearch: (v: string) => void;
  onAdd?: () => void;
}

export default function Header({ page, search, onSearch }: Props) {
  const { t, s } = titles[page];
  
  return (
    <header className={cn(
      'h-[64px] flex items-center justify-between px-8',
      'bg-void/80 backdrop-blur-2xl',
      'border-b border-white/[0.02]',
      'sticky top-0 z-40'
    )}>
      {/* Left: Title */}
      <div className="animate-in">
        <h1 className="text-[17px] font-semibold text-white tracking-tight">{t}</h1>
        <p className="text-[11px] text-smoke -mt-0.5">{s}</p>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-smoke group-focus-within:text-mist transition-colors" />
          <input
            type="text"
            placeholder="Suchen…"
            value={search}
            onChange={e => onSearch(e.target.value)}
            className={cn(
              'w-[220px] pl-10 pr-4 py-2.5',
              'bg-white/[0.02] border border-white/[0.04] rounded-xl',
              'text-[13px] text-cloud placeholder-smoke',
              'hover:bg-white/[0.03] hover:border-white/[0.06]',
              'focus:outline-none focus:bg-white/[0.04] focus:border-primary/30',
              'focus:ring-2 focus:ring-primary/10',
              'transition-all duration-200'
            )}
          />
        </div>

        {/* AI Assistant */}
        <button className={cn(
          'flex items-center gap-2 px-4 py-2.5',
          'bg-gradient-to-r from-primary/10 to-violet/10',
          'border border-primary/20 rounded-xl',
          'text-[12px] font-medium text-primary-light',
          'hover:from-primary/15 hover:to-violet/15',
          'hover:border-primary/30',
          'transition-all duration-200 group'
        )}>
          <Sparkles className="w-4 h-4 group-hover:animate-pulse" />
          <span className="hidden lg:inline">AI Assistent</span>
        </button>

        {/* Notifications */}
        <button className={cn(
          'relative p-2.5 rounded-xl',
          'bg-white/[0.02] border border-white/[0.04]',
          'text-smoke hover:text-white',
          'hover:bg-white/[0.04] hover:border-white/[0.06]',
          'transition-all duration-200'
        )}>
          <Bell className="w-[18px] h-[18px]" />
          <span className={cn(
            'absolute -top-0.5 -right-0.5',
            'w-4 h-4 flex items-center justify-center',
            'bg-danger rounded-full',
            'text-[9px] font-bold text-white',
            'ring-2 ring-void'
          )}>2</span>
        </button>

        {/* Add New */}
        <button className={cn(
          'flex items-center gap-2 px-4 py-2.5',
          'bg-gradient-to-r from-primary to-[#5558e3]',
          'rounded-xl text-[13px] font-medium text-white',
          'shadow-lg shadow-primary/20',
          'hover:shadow-xl hover:shadow-primary/30',
          'hover:-translate-y-0.5',
          'active:translate-y-0',
          'transition-all duration-200'
        )}>
          <Plus className="w-4 h-4" />
          <span>Neu</span>
        </button>
      </div>
    </header>
  );
}
