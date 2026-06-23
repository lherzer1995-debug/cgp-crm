import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, Clock, MapPin, User, Wrench } from 'lucide-react';
import { cn } from '../../utils/cn';
import { serviceEvents, type ServiceEvent } from '../../data/store';

const DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

function getDays(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function getFirst(y: number, m: number) { const d = new Date(y, m, 1).getDay(); return d === 0 ? 6 : d - 1; }

const stColors: Record<string, string> = { 
  geplant: '#06b6d4', unterwegs: '#f59e0b', 'vor-ort': '#8b5cf6', 
  abgeschlossen: '#10b981', abgesagt: '#71717a' 
};

export default function Kalender() {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());
  const [selDate, setSelDate] = useState(today.toISOString().split('T')[0]);

  const prev = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const next = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const evByDate = useMemo(() => {
    const m: Record<string, ServiceEvent[]> = {};
    serviceEvents.forEach(ev => { if (!m[ev.date]) m[ev.date] = []; m[ev.date].push(ev); });
    return m;
  }, []);

  const dim = getDays(year, month);
  const first = getFirst(year, month);
  const prevDim = getDays(year, month - 1);

  const cells = useMemo(() => {
    const c: { day: number; month: 'prev' | 'cur' | 'next'; key: string }[] = [];
    for (let i = first - 1; i >= 0; i--) {
      const d = prevDim - i;
      const m2 = month === 0 ? 11 : month - 1;
      const y2 = month === 0 ? year - 1 : year;
      c.push({ day: d, month: 'prev', key: `${y2}-${String(m2 + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}` });
    }
    for (let d = 1; d <= dim; d++) {
      c.push({ day: d, month: 'cur', key: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}` });
    }
    const rem = 42 - c.length;
    for (let d = 1; d <= rem; d++) {
      const m2 = month === 11 ? 0 : month + 1;
      const y2 = month === 11 ? year + 1 : year;
      c.push({ day: d, month: 'next', key: `${y2}-${String(m2 + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}` });
    }
    return c;
  }, [month, year, dim, first, prevDim]);

  const todayStr = today.toISOString().split('T')[0];
  const selEvents = evByDate[selDate] || [];

  return (
    <div className="flex min-h-[calc(100dvh-76px)]">
      {/* Calendar Grid */}
      <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h1 className="text-display text-white">{MONTHS[month]} {year}</h1>
            <div className="flex gap-1">
              <button onClick={prev} className={cn(
                'p-2 rounded-2xl',
                'bg-white/[0.045] border border-white/[0.09]',
                'text-smoke hover:text-white hover:bg-white/[0.07]',
                'transition-all duration-200'
              )}>
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={next} className={cn(
                'p-2 rounded-2xl',
                'bg-white/[0.045] border border-white/[0.09]',
                'text-smoke hover:text-white hover:bg-white/[0.07]',
                'transition-all duration-200'
              )}>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <button
              onClick={() => { setMonth(today.getMonth()); setYear(today.getFullYear()); setSelDate(todayStr); }}
              className={cn(
                'px-4 py-2 rounded-2xl',
                'bg-primary/10 border border-primary/20',
                'text-[15px] font-medium text-primary-light',
                'hover:bg-primary/15 transition-all duration-200'
              )}
            >
              Heute
            </button>
          </div>
          <button className={cn(
            'flex items-center gap-2 px-4 py-2.5',
            'bg-gradient-to-r from-primary to-[#5558e3]',
            'rounded-2xl text-[15px] font-medium text-white',
            'shadow-lg shadow-primary/20',
            'transition-all duration-200'
          )}>
            <Plus className="w-4 h-4" />
            <span>Neuer Einsatz</span>
          </button>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 mb-1">
          {DAYS.map(d => (
            <div key={d} className="py-3 text-center text-micro text-smoke">{d}</div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 rounded-[22px] overflow-hidden border border-white/[0.08]">
          {cells.map((cell, i) => {
            const isToday = cell.key === todayStr;
            const isSel = cell.key === selDate;
            const dayEvs = evByDate[cell.key] || [];
            const isOther = cell.month !== 'cur';
            
            return (
              <div
                key={i}
                onClick={() => setSelDate(cell.key)}
                className={cn(
                  'min-h-[100px] p-2 cursor-pointer transition-all duration-200',
                  isOther ? 'opacity-30' : '',
                  isSel ? 'bg-primary/5' : 'bg-graphite/50 hover:bg-slate/50'
                )}
              >
                <span className={cn(
                  'flex items-center justify-center w-8 h-8 rounded-full text-[15px] font-medium mb-1 transition-colors',
                  isToday ? 'bg-primary text-white' : isSel ? 'text-primary-light' : 'text-mist'
                )}>
                  {cell.day}
                </span>
                <div className="space-y-0.5">
                  {dayEvs.slice(0, 2).map(ev => (
                    <div
                      key={ev.id}
                      className="px-1.5 py-0.5 rounded text-[9px] font-medium truncate"
                      style={{ background: `${stColors[ev.status]}20`, color: stColors[ev.status] }}
                    >
                      {ev.startTime} {ev.customerName.split(' ')[0]}
                    </div>
                  ))}
                  {dayEvs.length > 2 && (
                    <span className="text-[9px] text-smoke px-1.5">+{dayEvs.length - 2}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Panel */}
      <div className={cn(
        'w-[360px] flex flex-col overflow-hidden',
        'bg-obsidian/95 backdrop-blur-2xl',
        'border-l border-white/[0.08]'
      )}>
        <div className="p-6 border-b border-white/[0.08]">
          <h2 className="text-heading text-white">
            {new Date(selDate + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
          </h2>
          <p className="text-caption text-smoke mt-0.5">{selEvents.length} Einsätze</p>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {selEvents.length === 0 && (
            <div className="py-16 text-center">
              <div className="w-14 h-14 rounded-[22px] bg-white/[0.045] flex items-center justify-center mx-auto mb-4">
                <Wrench className="w-7 h-7 text-smoke opacity-50" />
              </div>
              <p className="text-body text-smoke">Keine Einsätze</p>
              <p className="text-caption text-ash mt-1">Klicken Sie auf + um einen Termin zu erstellen</p>
            </div>
          )}
          {selEvents.map((ev, idx) => (
            <div 
              key={ev.id} 
              className={cn(
                'card p-4 cursor-pointer group animate-in'
              )}
              style={{ animationDelay: `${idx * 40}ms` }}
            >
              <div className="flex items-start gap-3">
                <div 
                  className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ background: `${stColors[ev.status]}15` }}
                >
                  <Wrench className="w-5 h-5" style={{ color: stColors[ev.status] }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-body font-medium text-white group-hover:text-primary-light transition-colors">
                    {ev.customerName}
                  </p>
                  <p className="text-[15px] text-mist mt-0.5">{ev.title}</p>
                  <div className="space-y-1 mt-2">
                    <span className="flex items-center gap-1.5 text-[15px] text-smoke">
                      <Clock className="w-3 h-3" />{ev.startTime}–{ev.endTime}
                    </span>
                    <span className="flex items-center gap-1.5 text-[15px] text-smoke">
                      <User className="w-3 h-3" />{ev.assignee.split(' ')[0]}
                    </span>
                    <span className="flex items-center gap-1.5 text-[15px] text-smoke truncate">
                      <MapPin className="w-3 h-3" />{ev.customerAddress.split(',')[0]}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
