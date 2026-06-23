import { useState, useMemo } from 'react';
import {
  Search, Plus, Phone, Mail, MapPin, X, 
  List, LayoutGrid, Download, ArrowUpDown,
  Clock, FileText, MessageSquare, User,
  CheckCircle2, Circle, AlertTriangle, ArrowUp, ArrowRight, ArrowDown,
  Calendar, Wrench, Edit3, Pin, ClipboardList, ChevronRight,
  MoreHorizontal, ExternalLink,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { customers, getInitials, type Customer, type NoteType } from '../../data/store';

// ═══ Configs ═══════════════════════════════════════════════
const priColors: Record<string, string> = { 
  niedrig: '#71717a', mittel: '#06b6d4', hoch: '#f59e0b', dringend: '#ef4444' 
};
const priIcons: Record<string, React.ElementType> = { 
  niedrig: ArrowDown, mittel: ArrowRight, hoch: ArrowUp, dringend: AlertTriangle 
};
const taskStatusCfg: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  offen: { label: 'Offen', color: '#71717a', icon: Circle },
  'in-arbeit': { label: 'In Arbeit', color: '#6366f1', icon: Clock },
  erledigt: { label: 'Erledigt', color: '#10b981', icon: CheckCircle2 },
};
const noteTypeIcons: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  notiz: { icon: FileText, color: '#f59e0b', label: 'Notiz' },
  anruf: { icon: Phone, color: '#10b981', label: 'Telefonat' },
  email: { icon: Mail, color: '#06b6d4', label: 'E-Mail' },
  besuch: { icon: MapPin, color: '#8b5cf6', label: 'Vor-Ort' },
  intern: { icon: MessageSquare, color: '#6366f1', label: 'Intern' },
  änderung: { icon: Edit3, color: '#ef4444', label: 'Änderung' },
};

// ═══ Main Component ════════════════════════════════════════
export default function Kunden() {
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'table' | 'grid'>('table');
  const [sortBy, setSortBy] = useState<'name' | 'lastService' | 'nextService'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selected, setSelected] = useState<Customer | null>(null);
  const [detailTab, setDetailTab] = useState<'info' | 'notizen' | 'aufgaben' | 'historie'>('info');
  const [newNote, setNewNote] = useState('');
  const [noteType, setNoteType] = useState<NoteType>('notiz');

  const filtered = useMemo(() => {
    let r = [...customers];
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q) ||
        c.tags.some(t => t.toLowerCase().includes(q)) ||
        c.contacts[0]?.name.toLowerCase().includes(q)
      );
    }
    r.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortBy === 'lastService') cmp = new Date(a.lastService).getTime() - new Date(b.lastService).getTime();
      else cmp = new Date(a.nextService).getTime() - new Date(b.nextService).getTime();
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return r;
  }, [search, sortBy, sortDir]);

  const toggleSort = (f: typeof sortBy) => {
    if (sortBy === f) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(f); setSortDir('asc'); }
  };

  const openCustomer = (c: Customer) => { setSelected(c); setDetailTab('info'); };
  const openTasks = selected?.tasks.filter(t => t.status !== 'erledigt') || [];
  const latestNote = selected?.notes[0] || null;

  return (
    <div className="flex min-h-[calc(100dvh-76px)]">
      
      {/* ═══════════════════════════════════════════════════════════
         LIST PANEL
         ═══════════════════════════════════════════════════════════ */}
      <div className={cn(
        'flex flex-col overflow-hidden transition-all duration-300',
        selected ? 'hidden lg:flex lg:w-[calc(100%-480px)]' : 'w-full'
      )}>
        {/* Toolbar */}
        <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-3 border-b border-white/[0.08]">
          {/* Search */}
          <div className="relative flex-1 max-w-md group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-smoke group-focus-within:text-mist transition-colors" />
            <input
              type="text"
              placeholder="Kunden durchsuchen…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={cn(
                'w-full pl-11 pr-4 py-2.5',
                'bg-white/[0.045] border border-white/[0.09] rounded-2xl',
                'text-[15px] text-cloud placeholder-smoke',
                'hover:bg-white/[0.055] hover:border-white/[0.06]',
                'focus:outline-none focus:bg-white/[0.07] focus:border-primary/30',
                'transition-all duration-200'
              )}
            />
          </div>

          <div className="flex items-center gap-2">
            {/* View Toggle */}
            <div className="flex p-1 bg-white/[0.045] border border-white/[0.09] rounded-2xl">
              <button
                onClick={() => setView('table')}
                className={cn(
                  'p-2 rounded-lg transition-all duration-200',
                  view === 'table' 
                    ? 'bg-primary/10 text-primary-light' 
                    : 'text-smoke hover:text-white'
                )}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setView('grid')}
                className={cn(
                  'p-2 rounded-lg transition-all duration-200',
                  view === 'grid' 
                    ? 'bg-primary/10 text-primary-light' 
                    : 'text-smoke hover:text-white'
                )}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>

            {/* Export */}
            <button className={cn(
              'p-2.5 rounded-2xl',
              'bg-white/[0.045] border border-white/[0.09]',
              'text-smoke hover:text-white hover:bg-white/[0.07]',
              'transition-all duration-200'
            )}>
              <Download className="w-4 h-4" />
            </button>

            {/* Add Customer */}
            <button className={cn(
              'flex items-center gap-2 px-4 py-2.5',
              'bg-gradient-to-r from-primary to-[#5558e3]',
              'rounded-2xl text-[15px] font-medium text-white',
              'shadow-lg shadow-primary/20',
              'hover:shadow-xl hover:shadow-primary/30',
              'hover:-translate-y-0.5 active:translate-y-0',
              'transition-all duration-200'
            )}>
              <Plus className="w-4 h-4" />
              <span>Neuer Kunde</span>
            </button>
          </div>
        </div>

        {/* Table View */}
        {view === 'table' && (
          <div className="flex-1 overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 z-10 bg-void/95 backdrop-blur-xl">
                <tr className="border-b border-white/[0.08]">
                  <th className="text-left pl-8 pr-4 py-4">
                    <button 
                      onClick={() => toggleSort('name')}
                      className="flex items-center gap-1.5 text-micro text-smoke hover:text-white transition-colors"
                    >
                      Kunde
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="text-left px-4 py-4 text-micro text-smoke">Ort</th>
                  <th className="text-left px-4 py-4 text-micro text-smoke">Ansprechpartner</th>
                  <th className="text-left px-4 py-4">
                    <button 
                      onClick={() => toggleSort('lastService')}
                      className="flex items-center gap-1.5 text-micro text-smoke hover:text-white transition-colors"
                    >
                      Letzter Einsatz
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="text-left px-4 py-4">
                    <button 
                      onClick={() => toggleSort('nextService')}
                      className="flex items-center gap-1.5 text-micro text-smoke hover:text-white transition-colors"
                    >
                      Nächster Einsatz
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="text-left px-4 py-4 text-micro text-smoke">Einsätze</th>
                  <th className="w-12 px-4 py-4"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, idx) => (
                  <tr 
                    key={c.id} 
                    onClick={() => openCustomer(c)}
                    className={cn(
                      'table-row cursor-pointer group',
                      'animate-in'
                    )}
                    style={{ animationDelay: `${idx * 20}ms` }}
                  >
                    <td className="pl-8 pr-4 py-4">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-2xl flex items-center justify-center text-[15px] font-bold text-white shrink-0 shadow-lg"
                          style={{ background: `linear-gradient(135deg, ${c.avatar}, ${c.avatar}aa)` }}
                        >
                          {getInitials(c.name)}
                        </div>
                        <div>
                          <p className="text-body font-medium text-white group-hover:text-primary-light transition-colors">
                            {c.name}
                          </p>
                          <p className="text-[15px] text-smoke truncate max-w-[200px]">{c.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-caption text-mist">{c.city}</td>
                    <td className="px-4 py-4 text-caption text-mist">{c.contacts[0]?.name}</td>
                    <td className="px-4 py-4 text-caption text-smoke">{c.lastService}</td>
                    <td className="px-4 py-4 text-caption text-mist font-medium">{c.nextService}</td>
                    <td className="px-4 py-4">
                      <span className="text-caption font-semibold text-white">{c.serviceCount}</span>
                    </td>
                    <td className="px-4 py-4">
                      <button className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-white/[0.05] transition-all">
                        <MoreHorizontal className="w-4 h-4 text-smoke" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Grid View */}
        {view === 'grid' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((c, idx) => (
                <div
                  key={c.id}
                  onClick={() => openCustomer(c)}
                  className={cn(
                    'card p-5 cursor-pointer group animate-in'
                  )}
                  style={{ animationDelay: `${idx * 30}ms` }}
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div 
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-[15px] font-bold text-white shrink-0 shadow-lg"
                      style={{ background: `linear-gradient(135deg, ${c.avatar}, ${c.avatar}aa)` }}
                    >
                      {getInitials(c.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-body font-semibold text-white group-hover:text-primary-light transition-colors truncate">
                        {c.name}
                      </p>
                      <p className="text-[15px] text-smoke">{c.contacts[0]?.role}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-[15px] text-mist">
                      <MapPin className="w-3.5 h-3.5 text-smoke" />
                      <span className="truncate">{c.address}, {c.city}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[15px] text-mist">
                      <Phone className="w-3.5 h-3.5 text-smoke" />
                      {c.phone}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-white/[0.08]">
                    <div className="flex gap-1.5">
                      {c.tags.slice(0, 2).map(t => (
                        <span key={t} className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-violet/10 text-violet-soft border border-violet/20">
                          {t}
                        </span>
                      ))}
                    </div>
                    <span className="text-[15px] text-smoke">{c.serviceCount} Einsätze</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-4 sm:px-6 lg:px-8 py-3 border-t border-white/[0.08] flex items-center justify-between">
          <p className="text-caption text-smoke">
            {filtered.length} von {customers.length} Kunden
          </p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
         DETAIL PANEL
         ═══════════════════════════════════════════════════════════ */}
      {selected && (
        <div className={cn(
          'w-full lg:w-[480px] flex flex-col overflow-hidden',
          'bg-obsidian/95 backdrop-blur-2xl',
          'border-l border-white/[0.08]',
          'animate-slide-l'
        )}>
          {/* Header */}
          <div className="p-6 border-b border-white/[0.08]">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div 
                  className="w-14 h-14 rounded-[22px] flex items-center justify-center text-[15px] font-bold text-white shadow-xl"
                  style={{ background: `linear-gradient(135deg, ${selected.avatar}, ${selected.avatar}99)` }}
                >
                  {getInitials(selected.name)}
                </div>
                <div>
                  <h2 className="text-title text-white">{selected.name}</h2>
                  <p className="text-caption text-smoke mt-0.5">
                    {selected.address}, {selected.zip} {selected.city}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelected(null)}
                className="p-2 rounded-2xl hover:bg-white/[0.05] transition-colors"
              >
                <X className="w-5 h-5 text-smoke" />
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2">
              {[
                { icon: Phone, label: 'Anrufen', color: 'primary' },
                { icon: Mail, label: 'E-Mail', color: 'info' },
                { icon: Wrench, label: 'Einsatz', color: 'violet' },
                { icon: ExternalLink, label: 'Öffnen', color: 'mist' },
              ].map(action => (
                <button
                  key={action.label}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl',
                    'text-[15px] font-medium',
                    'border transition-all duration-200',
                    action.color === 'primary' && 'bg-primary/8 text-primary-light border-primary/20 hover:bg-primary/15',
                    action.color === 'info' && 'bg-info/8 text-info border-info/20 hover:bg-info/15',
                    action.color === 'violet' && 'bg-violet/8 text-violet-soft border-violet/20 hover:bg-violet/15',
                    action.color === 'mist' && 'bg-white/[0.045] text-mist border-white/[0.09] hover:bg-white/[0.05]',
                  )}
                >
                  <action.icon className="w-3.5 h-3.5" />
                  {action.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex px-6 border-b border-white/[0.08]">
            {(['info', 'notizen', 'aufgaben', 'historie'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setDetailTab(tab)}
                className={cn(
                  'px-4 py-3 text-caption font-medium relative',
                  'transition-colors duration-200',
                  detailTab === tab 
                    ? 'text-primary-light' 
                    : 'text-smoke hover:text-white'
                )}
              >
                {tab === 'info' ? 'Übersicht' : tab === 'notizen' ? 'Notizen' : tab === 'aufgaben' ? 'Aufgaben' : 'Historie'}
                {tab === 'notizen' && (
                  <span className="ml-1.5 text-[9px] bg-white/[0.06] px-1.5 py-0.5 rounded-full">{selected.notes.length}</span>
                )}
                {tab === 'aufgaben' && openTasks.length > 0 && (
                  <span className="ml-1.5 text-[9px] bg-warning/20 text-warning px-1.5 py-0.5 rounded-full">{openTasks.length}</span>
                )}
                {detailTab === tab && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto">
            
            {/* ─── ÜBERSICHT TAB ─── */}
            {detailTab === 'info' && (
              <div className="p-6 space-y-6 animate-in">
                {/* Contact Info */}
                <div>
                  <h3 className="text-micro text-smoke mb-3">Kontaktdaten</h3>
                  <div className="space-y-3">
                    {[
                      { icon: MapPin, label: 'Adresse', value: `${selected.address}, ${selected.zip} ${selected.city}` },
                      { icon: Phone, label: 'Telefon', value: selected.phone },
                      { icon: Mail, label: 'E-Mail', value: selected.email },
                    ].map(item => (
                      <div key={item.label} className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-2xl bg-white/[0.045] flex items-center justify-center shrink-0">
                          <item.icon className="w-4 h-4 text-smoke" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[15px] text-smoke uppercase tracking-wider">{item.label}</p>
                          <p className="text-caption text-cloud truncate">{item.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Contact Person */}
                <div>
                  <h3 className="text-micro text-smoke mb-3">Ansprechpartner</h3>
                  {selected.contacts.map((cp, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.045] border border-white/[0.08]">
                      <div className="w-10 h-10 rounded-2xl bg-slate flex items-center justify-center">
                        <User className="w-4 h-4 text-mist" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-caption font-medium text-white">{cp.name}</p>
                        <p className="text-[15px] text-smoke">{cp.role}</p>
                      </div>
                      <div className="flex gap-1">
                        <button className="p-2 rounded-lg bg-white/[0.055] hover:bg-white/[0.06] transition-colors">
                          <Phone className="w-3.5 h-3.5 text-mist" />
                        </button>
                        <button className="p-2 rounded-lg bg-white/[0.055] hover:bg-white/[0.06] transition-colors">
                          <Mail className="w-3.5 h-3.5 text-mist" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Details Grid */}
                <div>
                  <h3 className="text-micro text-smoke mb-3">Details</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Priorität', value: selected.priority, color: priColors[selected.priority] },
                      { label: 'Kunde seit', value: selected.customerSince },
                      { label: 'Letzter Einsatz', value: selected.lastService },
                      { label: 'Nächster Einsatz', value: selected.nextService, highlight: true },
                    ].map(item => (
                      <div key={item.label} className="p-3 rounded-2xl bg-white/[0.045]">
                        <p className="text-[15px] text-smoke uppercase tracking-wider">{item.label}</p>
                        <p className={cn(
                          'text-caption font-medium mt-0.5 capitalize',
                          item.highlight ? 'text-primary-light' : item.color ? '' : 'text-cloud'
                        )} style={item.color ? { color: item.color } : {}}>
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <h3 className="text-micro text-smoke mb-3">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {selected.tags.map(t => (
                      <span key={t} className="text-[15px] font-medium px-3 py-1 rounded-full bg-violet/10 text-violet-soft border border-violet/20">
                        {t}
                      </span>
                    ))}
                    <button className="text-[15px] px-3 py-1 rounded-full bg-white/[0.045] text-smoke hover:text-white border border-white/[0.09] hover:border-white/[0.08] transition-colors">
                      + Tag
                    </button>
                  </div>
                </div>

                {/* Open Tasks Preview */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-micro text-smoke flex items-center gap-2">
                      <ClipboardList className="w-3.5 h-3.5" />
                      Offene Aufgaben
                      {openTasks.length > 0 && (
                        <span className="text-[9px] bg-warning/15 text-warning px-1.5 py-0.5 rounded-full font-bold">
                          {openTasks.length}
                        </span>
                      )}
                    </h3>
                    <button 
                      onClick={() => setDetailTab('aufgaben')}
                      className="text-[15px] text-primary-light hover:text-white transition-colors flex items-center gap-0.5"
                    >
                      Alle <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                  {openTasks.length === 0 ? (
                    <div className="py-6 text-center rounded-2xl bg-white/[0.01]">
                      <p className="text-caption text-smoke">Keine offenen Aufgaben 👍</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {openTasks.slice(0, 3).map(task => {
                        const tc = taskStatusCfg[task.status];
                        const StatusIcon = tc.icon;
                        const PriIcon = priIcons[task.priority] || ArrowRight;
                        return (
                          <div key={task.id} className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.045] hover:bg-white/[0.055] transition-colors cursor-pointer group">
                            <StatusIcon className="w-4 h-4 shrink-0" style={{ color: tc.color }} />
                            <div className="flex-1 min-w-0">
                              <p className="text-caption font-medium text-white truncate group-hover:text-primary-light transition-colors">
                                {task.title}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="flex items-center gap-1 text-[15px] capitalize" style={{ color: priColors[task.priority] }}>
                                  <PriIcon className="w-2.5 h-2.5" />{task.priority}
                                </span>
                                <span className="text-[15px] text-smoke">{task.dueDate}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Latest Note Preview */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-micro text-smoke flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5" />
                      Letzte Notiz
                    </h3>
                    <button 
                      onClick={() => setDetailTab('notizen')}
                      className="text-[15px] text-primary-light hover:text-white transition-colors flex items-center gap-0.5"
                    >
                      Alle <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                  {latestNote ? (() => {
                    const nt = noteTypeIcons[latestNote.type] || noteTypeIcons.notiz;
                    return (
                      <div 
                        onClick={() => setDetailTab('notizen')}
                        className="p-4 rounded-2xl bg-white/[0.045] border border-white/[0.08] hover:border-primary/20 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: `${nt.color}15` }}>
                            <nt.icon className="w-3 h-3" style={{ color: nt.color }} />
                          </div>
                          <span className="text-caption font-medium text-white">{latestNote.author}</span>
                          <span className="text-[15px] px-1.5 py-0.5 rounded" style={{ background: `${nt.color}12`, color: nt.color }}>
                            {nt.label}
                          </span>
                          <span className="text-[15px] text-smoke ml-auto flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />{latestNote.createdAt}
                          </span>
                        </div>
                        <p className="text-caption text-mist line-clamp-2">{latestNote.content}</p>
                      </div>
                    );
                  })() : (
                    <div className="py-6 text-center rounded-2xl bg-white/[0.01]">
                      <p className="text-caption text-smoke">Noch keine Notizen</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ─── NOTIZEN TAB ─── */}
            {detailTab === 'notizen' && (
              <div className="p-6 space-y-5 animate-in">
                {/* New Note */}
                <div className="p-4 rounded-2xl bg-white/[0.045] border border-white/[0.09]">
                  <div className="flex items-center gap-2 mb-3">
                    <select 
                      value={noteType} 
                      onChange={e => setNoteType(e.target.value as NoteType)}
                      className="text-[15px] bg-white/[0.07] border border-white/[0.06] rounded-lg px-2.5 py-1.5 text-mist focus:outline-none appearance-none cursor-pointer"
                    >
                      <option value="notiz">📝 Notiz</option>
                      <option value="anruf">📞 Telefonat</option>
                      <option value="email">📧 E-Mail</option>
                      <option value="besuch">📍 Besuch</option>
                      <option value="intern">💬 Intern</option>
                    </select>
                    <span className="text-[15px] text-smoke">als Lars Herzer</span>
                  </div>
                  <textarea
                    value={newNote}
                    onChange={e => setNewNote(e.target.value)}
                    placeholder="Notiz hinzufügen…"
                    rows={3}
                    className="w-full bg-transparent text-caption text-cloud placeholder-smoke focus:outline-none resize-none"
                  />
                  <div className="flex justify-end pt-2 border-t border-white/[0.08]">
                    <button className="btn btn-primary text-[15px] px-4 py-2">Speichern</button>
                  </div>
                </div>

                {/* Notes Timeline */}
                <div className="relative">
                  <div className="absolute left-[15px] top-4 bottom-4 w-px bg-gradient-to-b from-primary/30 via-white/[0.03] to-transparent" />
                  <div className="space-y-4">
                    {selected.notes.map((n, idx) => {
                      const nt = noteTypeIcons[n.type] || noteTypeIcons.notiz;
                      return (
                        <div 
                          key={n.id} 
                          className="relative flex gap-4 animate-in"
                          style={{ animationDelay: `${idx * 40}ms` }}
                        >
                          <div 
                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 z-10 shadow-lg"
                            style={{ background: `linear-gradient(135deg, ${nt.color}25, ${nt.color}15)`, border: `1px solid ${nt.color}30` }}
                          >
                            <nt.icon className="w-3.5 h-3.5" style={{ color: nt.color }} />
                          </div>
                          <div className="flex-1 p-4 rounded-2xl bg-white/[0.045] border border-white/[0.08] hover:border-white/[0.06] transition-colors">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-caption font-medium text-white">{n.author}</span>
                              <span className="text-[15px] px-1.5 py-0.5 rounded" style={{ background: `${nt.color}12`, color: nt.color }}>
                                {nt.label}
                              </span>
                              {n.pinned && <Pin className="w-3 h-3 text-warning" />}
                              <span className="text-[15px] text-smoke ml-auto">{n.createdAt}</span>
                            </div>
                            <p className="text-caption text-mist leading-relaxed">{n.content}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ─── AUFGABEN TAB ─── */}
            {detailTab === 'aufgaben' && (
              <div className="p-6 space-y-4 animate-in">
                <div className="flex items-center justify-between">
                  <p className="text-micro text-smoke">
                    {openTasks.length} offen · {selected.tasks.filter(t => t.status === 'erledigt').length} erledigt
                  </p>
                  <button className="flex items-center gap-1.5 text-caption text-primary-light hover:text-white transition-colors">
                    <Plus className="w-3.5 h-3.5" />Aufgabe
                  </button>
                </div>
                <div className="space-y-2">
                  {selected.tasks.map((task, idx) => {
                    const tc = taskStatusCfg[task.status];
                    const StatusIcon = tc.icon;
                    const PriIcon = priIcons[task.priority] || ArrowRight;
                    return (
                      <div 
                        key={task.id} 
                        className={cn(
                          'p-4 rounded-2xl border transition-all cursor-pointer group',
                          task.status === 'erledigt' 
                            ? 'bg-white/[0.01] border-white/[0.08]' 
                            : 'bg-white/[0.045] border-white/[0.08] hover:border-primary/20',
                          'animate-in'
                        )}
                        style={{ animationDelay: `${idx * 30}ms` }}
                      >
                        <div className="flex items-start gap-3">
                          <button className="mt-0.5 shrink-0">
                            <StatusIcon className="w-5 h-5" style={{ color: tc.color }} />
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              'text-body font-medium transition-colors',
                              task.status === 'erledigt' 
                                ? 'text-smoke line-through' 
                                : 'text-white group-hover:text-primary-light'
                            )}>
                              {task.title}
                            </p>
                            <p className="text-[15px] text-smoke mt-0.5">{task.description}</p>
                            <div className="flex items-center gap-3 mt-2">
                              <span className="flex items-center gap-1 text-[15px] font-medium capitalize" style={{ color: priColors[task.priority] }}>
                                <PriIcon className="w-3 h-3" />{task.priority}
                              </span>
                              <span className="flex items-center gap-1 text-[15px] text-smoke">
                                <Calendar className="w-3 h-3" />{task.dueDate}
                              </span>
                              <span className="flex items-center gap-1 text-[15px] text-smoke">
                                <User className="w-3 h-3" />{task.assignee.split(' ')[0]}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ─── HISTORIE TAB ─── */}
            {detailTab === 'historie' && (
              <div className="p-6 animate-in">
                <p className="text-micro text-smoke mb-4">Komplette Kundenhistorie</p>
                <div className="relative">
                  <div className="absolute left-[15px] top-4 bottom-4 w-px bg-gradient-to-b from-primary/30 via-white/[0.03] to-transparent" />
                  <div className="space-y-3">
                    {[
                      ...selected.notes.map(n => ({ 
                        id: n.id, date: n.createdAt, type: n.type, 
                        title: noteTypeIcons[n.type]?.label || 'Notiz', 
                        desc: n.content, author: n.author, 
                        color: noteTypeIcons[n.type]?.color || '#6366f1', 
                        icon: noteTypeIcons[n.type]?.icon || FileText 
                      })),
                      ...selected.tasks.map(t => ({ 
                        id: t.id, date: t.createdAt, type: 'aufgabe', 
                        title: `Aufgabe: ${t.title}`, 
                        desc: `${taskStatusCfg[t.status]?.label} · ${t.assignee}`, 
                        author: t.assignee, color: '#06b6d4', icon: ClipboardList 
                      })),
                    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((item, idx) => (
                        <div 
                          key={item.id} 
                          className="relative flex gap-4 animate-in"
                          style={{ animationDelay: `${idx * 30}ms` }}
                        >
                          <div 
                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 z-10"
                            style={{ background: `${item.color}12`, border: `1px solid ${item.color}25` }}
                          >
                            <item.icon className="w-3.5 h-3.5" style={{ color: item.color }} />
                          </div>
                          <div className="flex-1 min-w-0 py-1">
                            <div className="flex items-center gap-2">
                              <span className="text-caption font-medium text-white">{item.title}</span>
                              <span className="text-[15px] text-smoke ml-auto">{item.date}</span>
                            </div>
                            <p className="text-[15px] text-smoke mt-0.5 line-clamp-1">{item.desc}</p>
                            <p className="text-[15px] text-ash mt-0.5">{item.author}</p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
