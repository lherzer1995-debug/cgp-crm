import { Bell, Menu, Plus, Search } from 'lucide-react';
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
  const { customers, addCustomer, addTask, addServiceEvent, feedback, clearFeedback } = useAppStore();
  const meta = titles[page];

  const handleCreate = () => {
    if (page === 'kunden') {
      const name = window.prompt('Neuer Kunde – Name');
      const city = window.prompt('Ort', 'München') || '';
      const email = window.prompt('E-Mail', 'kontakt@example.de') || '';
      if (!name) return;
      addCustomer({ name, city, email });
      return;
    }
    if (page === 'aufgaben') {
      const customer = customers[0];
      const title = window.prompt('Neue Aufgabe');
      if (!title || !customer) return;
      addTask({ customerId: customer.id, title });
      return;
    }
    const customer = customers[0];
    const title = window.prompt('Neuer Einsatz', 'Wartung vor Ort');
    if (!title || !customer) return;
    addServiceEvent({ customerId: customer.id, title, date: '2026-06-23' });
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
            onClick={() => (feedback ? clearFeedback() : window.alert('Benachrichtigungen erscheinen unten rechts als Inline-Feedback.'))}
            className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.09] bg-white/[0.04] text-mist transition-colors hover:bg-white/[0.08] hover:text-white"
            aria-label="Benachrichtigungen"
          >
            <Bell className="h-5 w-5" />
            {feedback ? <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-warning" /> : null}
          </button>

          <button type="button" onClick={handleCreate} className="btn btn-primary">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Neu</span>
          </button>
        </div>
      </div>
    </header>
  );
}
