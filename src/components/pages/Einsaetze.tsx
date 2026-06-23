import { useState, useMemo } from 'react';
import {
  Search, Plus, MapPin, User, Clock, Calendar,
  ChevronRight, X, Phone,
  CheckCircle2, AlertCircle, Truck, Navigation, List, CalendarDays,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { serviceEvents, getInitials, type ServiceEvent } from '../../data/store';

const stCfg: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  geplant: { label: 'Geplant', color: '#06b6d4', icon: Calendar },
  unterwegs: { label: 'Unterwegs', color: '#f59e0b', icon: Truck },
  'vor-ort': { label: 'Vor Ort', color: '#8b5cf6', icon: Navigation },
  abgeschlossen: { label: 'Abgeschlossen', color: '#10b981', icon: CheckCircle2 },
  abgesagt: { label: 'Abgesagt', color: '#71717a', icon: AlertCircle },
};

export default function Einsaetze() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedEv, setSelectedEv] = useState<ServiceEvent | null>(null);
  const [view, setView] = useState<'list' | 'timeline'>('list');

  const filtered = useMemo(() => {
    let r = [...serviceEvents];
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(e => e.customerName.toLowerCase().includes(q) || e.title.toLowerCase().includes(q) || e.assignee.toLowerCase().includes(q));
    }
    if (statusFilter !== 'all') r = r.filter(e => e.status === statusFilter);
    return r;
  }, [search, statusFilter]);

  const byDate = useMemo(() => {
    const map: Record<string, ServiceEvent[]> = {};
    filtered.forEach(ev => { if (!map[ev.date]) map[ev.date] = []; map[ev.date].push(ev); });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const stats = {
    geplant: serviceEvents.filter(e => e.status === 'geplant').length,
    unterwegs: serviceEvents.filter(e => e.status === 'unterwegs').length,
    'vor-ort': serviceEvents.filter(e => e.status === 'vor-ort').length,
    abgeschlossen: serviceEvents.filter(e => e.status === 'abgeschlossen').length,
  };

  return (
    <div className="flex h-[calc(100vh-64px)]">
      <div className={cn('flex flex-col overflow-hidden transition-all duration-300', selectedEv ? 'hidden lg:flex lg:flex-1' : 'w-full')}>
        <div className="px-8 py-4 flex items-center gap-6 border-b border-white/[0.02] overflow-x-auto">
          {Object.entries(stats).map(([key, val]) => { const cfg = stCfg[key]; const Icon = cfg.icon; return (
            <div key={key} className="flex items-center gap-3 shrink-0">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg" style={{ background: `linear-gradient(135deg, ${cfg.color}20, ${cfg.color}10)` }}><Icon className="w-5 h-5" style={{ color: cfg.color }} /></div>
              <div><p className="text-[20px] font-bold text-white">{val}</p><p className="text-[10px] text-smoke uppercase tracking-wider">{cfg.label}</p></div>
            </div>
          );})}
          <div className="flex-1" />
          <div className="flex items-center gap-3 shrink-0">
            <div className="relative group"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-smoke" /><input type="text" placeholder="Einsätze suchen…" value={search} onChange={e => setSearch(e.target.value)} className="w-[200px] pl-11 pr-4 py-2.5 bg-white/[0.02] border border-white/[0.04] rounded-xl text-[13px] text-cloud placeholder-smoke focus:outline-none focus:border-primary/30 transition-all duration-200" /></div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-4 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] text-[13px] text-mist focus:outline-none appearance-none cursor-pointer"><option value="all">Alle Status</option><option value="geplant">Geplant</option><option value="unterwegs">Unterwegs</option><option value="vor-ort">Vor Ort</option><option value="abgeschlossen">Abgeschlossen</option><option value="abgesagt">Abgesagt</option></select>
            <div className="flex p-1 bg-white/[0.02] border border-white/[0.04] rounded-xl">
              <button onClick={() => setView('list')} className={cn('px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all', view === 'list' ? 'bg-primary/10 text-primary-light' : 'text-smoke hover:text-white')}><List className="w-4 h-4" /></button>
              <button onClick={() => setView('timeline')} className={cn('px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all', view === 'timeline' ? 'bg-primary/10 text-primary-light' : 'text-smoke hover:text-white')}><CalendarDays className="w-4 h-4" /></button>
            </div>
            <button className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary to-[#5558e3] rounded-xl text-[13px] font-medium text-white shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-200"><Plus className="w-4 h-4" /><span>Neuer Einsatz</span></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {view === 'list' ? (
            <table className="w-full">
              <thead className="sticky top-0 z-10 bg-void/95 backdrop-blur-xl"><tr className="border-b border-white/[0.03]">
                <th className="text-left pl-8 pr-4 py-4 text-micro text-smoke">Kunde</th>
                <th className="text-left px-4 py-4 text-micro text-smoke">Einsatztyp</th>
                <th className="text-left px-4 py-4 text-micro text-smoke">Status</th>
                <th className="text-left px-4 py-4 text-micro text-smoke">Datum</th>
                <th className="text-left px-4 py-4 text-micro text-smoke">Zeit</th>
                <th className="text-left px-4 py-4 text-micro text-smoke">Techniker</th>
                <th className="text-left px-4 py-4 text-micro text-smoke">Adresse</th>
                <th className="w-12 px-4 py-4"></th>
              </tr></thead>
              <tbody>{filtered.map((ev, idx) => { const cfg = stCfg[ev.status]; return (
                <tr key={ev.id} onClick={() => setSelectedEv(ev)} className="table-row cursor-pointer group animate-in" style={{ animationDelay: `${idx * 20}ms` }}>
                  <td className="pl-8 pr-4 py-4"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ background: ev.assigneeAvatar }}>{getInitials(ev.customerName)}</div><p className="text-body font-medium text-white group-hover:text-primary-light transition-colors truncate">{ev.customerName}</p></div></td>
                  <td className="px-4 py-4 text-caption text-mist">{ev.title}</td>
                  <td className="px-4 py-4"><span className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full" style={{ background: `${cfg.color}12`, color: cfg.color }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.color }} />{cfg.label}</span></td>
                  <td className="px-4 py-4 text-caption text-mist">{ev.date}</td>
                  <td className="px-4 py-4 text-caption text-mist">{ev.startTime}–{ev.endTime}</td>
                  <td className="px-4 py-4 text-caption text-mist">{ev.assignee}</td>
                  <td className="px-4 py-4 text-caption text-smoke truncate max-w-[180px]">{ev.customerAddress}</td>
                  <td className="px-4 py-4"><ChevronRight className="w-4 h-4 text-smoke opacity-0 group-hover:opacity-100 transition-opacity" /></td>
                </tr>
              );})}</tbody>
            </table>
          ) : (
            <div className="p-8 space-y-8">
              {byDate.map(([date, evts]) => (
                <div key={date} className="animate-in">
                  <div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Calendar className="w-5 h-5 text-primary-light" /></div><div><h3 className="text-heading text-white">{new Date(date + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}</h3><p className="text-[11px] text-smoke">{evts.length} Einsätze</p></div></div>
                  <div className="ml-5 pl-5 border-l border-white/[0.04] space-y-3">
                    {evts.map((ev, idx) => { const cfg = stCfg[ev.status]; const Icon = cfg.icon; return (
                      <div key={ev.id} onClick={() => setSelectedEv(ev)} className="card p-4 cursor-pointer group relative animate-in" style={{ animationDelay: `${idx * 40}ms` }}>
                        <div className="absolute -left-[25px] top-5 w-3 h-3 rounded-full border-2 border-obsidian z-10" style={{ background: cfg.color }} />
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${cfg.color}15` }}><Icon className="w-5 h-5" style={{ color: cfg.color }} /></div>
                          <div className="flex-1 min-w-0"><p className="text-body font-medium text-white group-hover:text-primary-light transition-colors">{ev.customerName}</p><p className="text-[12px] text-mist mt-0.5">{ev.title}</p><div className="flex items-center gap-4 mt-2"><span className="flex items-center gap-1.5 text-[11px] text-smoke"><Clock className="w-3 h-3" />{ev.startTime}–{ev.endTime}</span><span className="flex items-center gap-1.5 text-[11px] text-smoke"><User className="w-3 h-3" />{ev.assignee}</span><span className="flex items-center gap-1.5 text-[11px] text-smoke truncate"><MapPin className="w-3 h-3" />{ev.customerAddress.split(',')[0]}</span></div></div>
                          <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full shrink-0" style={{ background: `${cfg.color}15`, color: cfg.color }}>{cfg.label}</span>
                        </div>
                      </div>
                    );})}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedEv && (
        <div className="w-full lg:w-[420px] flex flex-col overflow-hidden bg-obsidian/95 backdrop-blur-2xl border-l border-white/[0.02] animate-slide-l">
          <div className="p-6 border-b border-white/[0.03]">
            <div className="flex items-start justify-between mb-4"><div><h2 className="text-title text-white">{selectedEv.title}</h2><p className="text-caption text-mist mt-0.5">{selectedEv.customerName}</p></div><button onClick={() => setSelectedEv(null)} className="p-2 rounded-xl hover:bg-white/[0.05] transition-colors"><X className="w-5 h-5 text-smoke" /></button></div>
            <span className="inline-flex items-center gap-2 text-[12px] font-semibold px-3 py-1.5 rounded-lg" style={{ background: `${stCfg[selectedEv.status].color}15`, color: stCfg[selectedEv.status].color }}>{(() => { const I = stCfg[selectedEv.status].icon; return <I className="w-4 h-4" />; })()}{stCfg[selectedEv.status].label}</span>
          </div>
          <div className="p-6 space-y-5 flex-1 overflow-y-auto">
            <div className="space-y-3">
              {[{ icon: Calendar, label: 'Datum', value: new Date(selectedEv.date + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) },{ icon: Clock, label: 'Uhrzeit', value: `${selectedEv.startTime} – ${selectedEv.endTime}` },{ icon: User, label: 'Techniker', value: selectedEv.assignee },{ icon: MapPin, label: 'Adresse', value: selectedEv.customerAddress },{ icon: Phone, label: 'Kunde', value: selectedEv.customerName }].map(item => (
                <div key={item.label} className="flex items-center gap-3"><div className="w-9 h-9 rounded-xl bg-white/[0.02] flex items-center justify-center shrink-0"><item.icon className="w-4 h-4 text-smoke" /></div><div className="min-w-0"><p className="text-[10px] text-smoke uppercase tracking-wider">{item.label}</p><p className="text-caption text-cloud">{item.value}</p></div></div>
              ))}
            </div>
            <div className="space-y-2 pt-4 border-t border-white/[0.03]">
              <button className="w-full btn btn-primary py-3">Status ändern</button>
              <button className="w-full btn btn-secondary py-3">Notiz hinzufügen</button>
              <button className="w-full btn btn-secondary py-3">Navigation starten</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
