
import { Bell, ChevronDown, Menu, Plus, Search, UserPlus, Wrench, ClipboardPlus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { UserButton, useUser } from '@clerk/react';
import { cn } from '../../utils/cn';
import { useAppStore, type Page } from '../../data/app-store';

const titles: Record<Page, { title: string; subtitle: string }> = {
  dashboard: { title: 'Arbeitsübersicht', subtitle: 'Was heute offen ist, was warten kann und wo du eingreifen musst.' },
  kunden: { title: 'Kundenbestand', subtitle: 'Kontakte, Historie und operative Risiken im Blick.' },
  aufgaben: { title: 'Aufgabenliste', subtitle: 'Offene Punkte nach Fälligkeit, Priorität und Zuständigkeit.' },
  einsaetze: { title: 'Einsatzsteuerung', subtitle: 'Geplante Termine, Statuswechsel und Rückmeldungen aus dem Feld.' },
  kalender: { title: 'Kalender', subtitle: 'Tagesplanung und Auslastung ohne dekorativen Ballast.' },
  einstellungen: { title: 'Einstellungen', subtitle: 'Nur Einstellungen, die im Alltag wirklich relevant sind.' },
};

interface Props {
  page: Page;
  search: string;
  onSearch: (value: string) => void;
  onMenuClick: () => void;
  isMobile: boolean;
}

export default function Header({ page, search, onSearch, onMenuClick, isMobile }: Props) {
  const { feedback, clearFeedback, viewer } = useAppStore();
  const { user } = useUser();
  const meta = titles[page];
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!quickCreateOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (!popoverRef.current?.contains(event.target as Node)) {
        setQuickCreateOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, [quickCreateOpen]);

  const emitCreate = (type: 'customer' | 'task' | 'service') => {
    window.dispatchEvent(new CustomEvent('crm:create', { detail: { type } }));
    setQuickCreateOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-[#0b0f17]/90 backdrop-blur-xl">
      <div className="flex min-h-[76px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            className={cn(
              'inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.09] bg-white/[0.04] text-mist transition-colors',
              'hover:bg-white/[0.08] hover:text-white',
            )}
            aria-label={isMobile ? 'Navigation öffnen' : 'Sidebar ein- oder ausklappen'}
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="min-w-0">
            <h1 className="truncate text-[22px] font-semibold tracking-[-0.04em] text-white">{meta.title}</h1>
            <p className="hidden truncate text-[14px] text-smoke md:block">{meta.subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="relative hidden lg:block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ash" />
            <input
              type="search"
              value={search}
              onChange={(event) => onSearch(event.target.value)}
              placeholder="Suchen nach Kunde, Aufgabe oder Einsatz"
              className="h-11 w-[320px] rounded-2xl border border-white/[0.09] bg-white/[0.04] pl-11 pr-4 text-[14px] text-cloud placeholder:text-ash focus:border-primary/40 focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={() => (feedback ? clearFeedback() : undefined)}
            className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.09] bg-white/[0.04] text-mist transition-colors hover:bg-white/[0.08] hover:text-white"
            aria-label="Benachrichtigungen"
          >
            <Bell className="h-5 w-5" />
            {feedback ? <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-warning" /> : null}
          </button>

          <div ref={popoverRef} className="relative">
            <button type="button" onClick={() => setQuickCreateOpen((current) => !current)} className="btn btn-primary">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Neu</span>
              <ChevronDown className="h-4 w-4 opacity-80" />
            </button>

            {quickCreateOpen ? (
              <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-[280px] rounded-[24px] border border-white/[0.08] bg-[#111722] p-2 shadow-[0_24px_60px_rgba(0,0,0,0.38)]">
                <button onClick={() => emitCreate('customer')} className="flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-white/[0.05]">
                  <span className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/12 text-primary-light"><UserPlus className="h-4 w-4" /></span>
                  <span>
                    <span className="block text-[14px] font-semibold text-white">Kunde anlegen</span>
                    <span className="mt-1 block text-[13px] leading-5 text-smoke">Neuer Kunde mit Ansprechpartner, Priorität und Startkontext.</span>
                  </span>
                </button>
                <button onClick={() => emitCreate('task')} className="flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-white/[0.05]">
                  <span className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-warning/10 text-warning"><ClipboardPlus className="h-4 w-4" /></span>
                  <span>
                    <span className="block text-[14px] font-semibold text-white">Aufgabe anlegen</span>
                    <span className="mt-1 block text-[13px] leading-5 text-smoke">Mit Kunde, Verantwortlichem, Priorität und Fälligkeit.</span>
                  </span>
                </button>
                <button onClick={() => emitCreate('service')} className="flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-white/[0.05]">
                  <span className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-info/10 text-info"><Wrench className="h-4 w-4" /></span>
                  <span>
                    <span className="block text-[14px] font-semibold text-white">Einsatz planen</span>
                    <span className="mt-1 block text-[13px] leading-5 text-smoke">Termin direkt mit Techniker und Zeitfenster sauber einplanen.</span>
                  </span>
                </button>
              </div>
            ) : null}
          </div>

          <div className="hidden items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 lg:flex">
            <div className="text-right">
              <p className="text-[12px] text-smoke">Angemeldet</p>
              <p className="text-[13px] font-medium text-white">{user?.fullName || user?.primaryEmailAddress?.emailAddress || 'Teammitglied'}</p>
            </div>
            <UserButton afterSignOutUrl="/" appearance={{ elements: { userButtonAvatarBox: 'h-9 w-9' } }} />
          </div>
        </div>
      </div>
    </header>
  );
}
