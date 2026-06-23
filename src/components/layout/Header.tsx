import { Bell, Menu, Plus, Search, Sparkles } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { Page } from './Sidebar';

const titles: Record<Page, { title: string; subtitle: string; eyebrow: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Service, Kunden und Aufgaben in einem klaren Überblick.', eyebrow: 'Heute' },
  kunden: { title: 'Kunden', subtitle: 'Kontakte, Historie und Servicebedarf sauber priorisieren.', eyebrow: 'CRM' },
  aufgaben: { title: 'Aufgaben', subtitle: 'Fokus auf offene To-dos, Dringlichkeit und Verantwortliche.', eyebrow: 'Operations' },
  einsaetze: { title: 'Einsätze', subtitle: 'Service-Termine planen, verfolgen und abschließen.', eyebrow: 'Service' },
  kalender: { title: 'Kalender', subtitle: 'Kapazitäten, Termine und Vor-Ort-Einsätze koordinieren.', eyebrow: 'Planung' },
  einstellungen: { title: 'Einstellungen', subtitle: 'Profil, Sicherheit, Darstellung und Integrationen.', eyebrow: 'System' },
};

interface Props {
  page: Page;
  search: string;
  onSearch: (value: string) => void;
  onMenuClick: () => void;
  isMobile: boolean;
}

export default function Header({ page, search, onSearch, onMenuClick, isMobile }: Props) {
  const meta = titles[page];

  return (
    <header className={cn(
      'sticky top-0 z-30',
      'min-h-[76px] border-b border-white/[0.07]',
      'bg-void/72 backdrop-blur-2xl'
    )}>
      <div className="flex min-h-[76px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            className={cn(
              'inline-flex h-11 w-11 items-center justify-center rounded-2xl',
              'border border-white/[0.09] bg-white/[0.055] text-mist',
              'hover:bg-white/[0.085] hover:text-white',
              'transition-all duration-200'
            )}
            aria-label={isMobile ? 'Navigation öffnen' : 'Sidebar ein- oder ausklappen'}
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="min-w-0">
            <div className="hidden sm:flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.14em] text-primary-soft">
              <Sparkles className="h-3.5 w-3.5" />
              {meta.eyebrow}
            </div>
            <h1 className="truncate text-[21px] sm:text-[24px] font-extrabold tracking-[-0.035em] text-white">
              {meta.title}
            </h1>
            <p className="hidden md:block truncate text-[14px] text-smoke">
              {meta.subtitle}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <div className="relative hidden lg:block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ash" />
            <input
              type="search"
              value={search}
              onChange={(event) => onSearch(event.target.value)}
              placeholder="Kunden, Aufgaben, Einsätze suchen…"
              className={cn(
                'h-11 w-[320px] rounded-2xl border border-white/[0.09]',
                'bg-white/[0.055] pl-11 pr-4 text-[14px] text-cloud placeholder:text-ash',
                'transition-all duration-200',
                'hover:border-white/[0.14] hover:bg-white/[0.075]',
                'focus:border-primary/50 focus:bg-white/[0.08] focus:outline-none focus:ring-4 focus:ring-primary/15'
              )}
            />
          </div>

          <button
            type="button"
            className={cn(
              'hidden md:inline-flex h-11 items-center gap-2 rounded-2xl px-4',
              'border border-primary/25 bg-primary/12 text-[14px] font-bold text-primary-soft',
              'hover:border-primary/40 hover:bg-primary/18 transition-all duration-200'
            )}
          >
            <Sparkles className="h-4 w-4" />
            Assistent
          </button>

          <button
            type="button"
            className={cn(
              'relative inline-flex h-11 w-11 items-center justify-center rounded-2xl',
              'border border-white/[0.09] bg-white/[0.055] text-mist',
              'hover:bg-white/[0.085] hover:text-white transition-all duration-200'
            )}
            aria-label="Benachrichtigungen"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-danger ring-2 ring-void" />
          </button>

          <button type="button" className="btn btn-primary">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Neu</span>
          </button>
        </div>
      </div>
    </header>
  );
}
