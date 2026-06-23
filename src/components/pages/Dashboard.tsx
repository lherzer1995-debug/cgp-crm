import {
  Users, Wrench, ClipboardList, AlertTriangle,
  ArrowUpRight, ChevronRight, MapPin, Clock,
  TrendingUp, Zap,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { kpi, serviceEvents, customers } from '../../data/store';
import type { Page } from '../layout/Sidebar';

function fmt(n: number) { return n.toLocaleString('de-DE'); }

export default function Dashboard({ onNav }: { onNav: (p: Page) => void }) {
  const todayServices = serviceEvents.filter(s => 
    s.status === 'geplant' || s.status === 'unterwegs' || s.status === 'vor-ort'
  ).slice(0, 6);

  const recentCustomers = customers.slice(0, 4);

  return (
    <div className="p-8 space-y-8 overflow-y-auto h-[calc(100vh-64px)]">
      
      {/* ═══════════════════════════════════════════════════════════
         WELCOME HERO
         ═══════════════════════════════════════════════════════════ */}
      <div className={cn(
        'relative overflow-hidden rounded-2xl',
        'bg-gradient-to-br from-graphite via-carbon to-obsidian',
        'border border-white/[0.03]',
        'p-8'
      )}>
        <div className="absolute top-0 right-0 w-[500px] h-[300px] bg-primary/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[200px] bg-violet/5 rounded-full blur-[80px]" />
        <div className="absolute inset-0 bg-gradient-to-t from-obsidian/50 to-transparent" />
        
        <div className="relative z-10 flex items-center justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-micro text-success">System Online</span>
            </div>
            <h1 className="text-display text-white">
              Guten Tag, Lars
            </h1>
            <p className="text-body text-mist max-w-md">
              Sie haben <span className="text-primary-light font-semibold">{kpi.scheduledServices} Einsätze</span> geplant 
              und <span className="text-warning font-semibold">{kpi.urgentTasks} dringende Aufgaben</span> für heute.
            </p>
            
            <div className="flex items-center gap-6 pt-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-primary-light" />
                </div>
                <div>
                  <p className="text-[20px] font-bold text-white">{kpi.completedServices}</p>
                  <p className="text-[10px] text-smoke uppercase tracking-wider">Erledigt</p>
                </div>
              </div>
              <div className="w-px h-10 bg-white/[0.06]" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                  <Users className="w-4 h-4 text-success" />
                </div>
                <div>
                  <p className="text-[20px] font-bold text-white">{kpi.activeCustomers}</p>
                  <p className="text-[10px] text-smoke uppercase tracking-wider">Aktive Kunden</p>
                </div>
              </div>
            </div>
          </div>

          <div className="hidden xl:block text-right">
            <p className="text-[48px] font-bold text-white/10 tracking-tight">
              {new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
            </p>
            <p className="text-caption text-smoke -mt-2">
              {new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
         KPI CARDS
         ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { 
            label: 'Aktive Kunden', 
            value: fmt(kpi.activeCustomers), 
            sub: `von ${kpi.totalCustomers} gesamt`, 
            icon: Users, 
            color: '#6366f1',
            trend: '+12%'
          },
          { 
            label: 'Geplante Einsätze', 
            value: fmt(kpi.scheduledServices), 
            sub: 'diese Woche', 
            icon: Wrench, 
            color: '#06b6d4',
            trend: '+8%'
          },
          { 
            label: 'Offene Aufgaben', 
            value: fmt(kpi.openTasks), 
            sub: `${kpi.completedTasks} erledigt`, 
            icon: ClipboardList, 
            color: '#10b981',
            trend: '-3%'
          },
          { 
            label: 'Dringend', 
            value: fmt(kpi.urgentTasks), 
            sub: 'sofort bearbeiten', 
            icon: AlertTriangle, 
            color: '#ef4444',
            trend: null
          },
        ].map((k, idx) => (
          <div 
            key={k.label} 
            className="card p-5 group cursor-pointer animate-in"
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            <div className="flex items-start justify-between mb-4">
              <div 
                className={cn(
                  'w-11 h-11 rounded-xl flex items-center justify-center',
                  'transition-transform duration-300 group-hover:scale-110'
                )}
                style={{ background: `${k.color}12` }}
              >
                <k.icon className="w-5 h-5" style={{ color: k.color }} />
              </div>
              {k.trend && (
                <span className={cn(
                  'text-[10px] font-semibold px-2 py-1 rounded-full',
                  k.trend.startsWith('+') 
                    ? 'bg-success/10 text-success' 
                    : 'bg-danger/10 text-danger'
                )}>
                  {k.trend}
                </span>
              )}
            </div>
            
            <p className="text-[28px] font-bold text-white tracking-tight">{k.value}</p>
            <p className="text-caption text-smoke mt-1">{k.sub}</p>
            
            <div className="mt-4 h-1 bg-white/[0.03] rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-1000 ease-out"
                style={{ 
                  width: `${Math.min(85, 30 + Math.random() * 55)}%`,
                  background: `linear-gradient(90deg, ${k.color}, ${k.color}88)`
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════
         MAIN GRID
         ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* ─── Heutige Einsätze (3 cols) ─── */}
        <div className="lg:col-span-3 card p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-info/10 flex items-center justify-center">
                <Wrench className="w-4 h-4 text-info" />
              </div>
              <div>
                <h2 className="text-heading text-white">Heutige Einsätze</h2>
                <p className="text-[11px] text-smoke">{todayServices.length} anstehend</p>
              </div>
            </div>
            <button 
              onClick={() => onNav('einsaetze')}
              className="flex items-center gap-1 text-caption text-primary-light hover:text-white transition-colors group"
            >
              Alle anzeigen
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          <div className="space-y-2">
            {todayServices.length === 0 && (
              <div className="py-12 text-center">
                <div className="w-12 h-12 rounded-2xl bg-white/[0.02] flex items-center justify-center mx-auto mb-3">
                  <Zap className="w-6 h-6 text-smoke" />
                </div>
                <p className="text-body text-smoke">Keine Einsätze für heute</p>
              </div>
            )}
            {todayServices.map((ev, idx) => {
              const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
                geplant: { bg: 'bg-info/8', text: 'text-info', dot: 'bg-info' },
                unterwegs: { bg: 'bg-warning/8', text: 'text-warning', dot: 'bg-warning' },
                'vor-ort': { bg: 'bg-violet/8', text: 'text-violet', dot: 'bg-violet' },
                abgeschlossen: { bg: 'bg-success/8', text: 'text-success', dot: 'bg-success' },
                abgesagt: { bg: 'bg-smoke/8', text: 'text-smoke', dot: 'bg-smoke' },
              };
              const st = statusColors[ev.status] || statusColors.geplant;
              
              return (
                <div 
                  key={ev.id}
                  className={cn(
                    'flex items-center gap-4 p-4 rounded-xl',
                    'bg-white/[0.01] border border-white/[0.02]',
                    'hover:bg-white/[0.02] hover:border-white/[0.04]',
                    'transition-all duration-200 cursor-pointer group',
                    'animate-in'
                  )}
                  style={{ animationDelay: `${idx * 40}ms` }}
                >
                  <div className="w-14 shrink-0">
                    <p className="text-[15px] font-semibold text-white">{ev.startTime}</p>
                    <p className="text-[10px] text-smoke">{ev.endTime}</p>
                  </div>
                  
                  <div className="w-px h-10 bg-white/[0.04]" />
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-body font-medium text-white truncate group-hover:text-primary-light transition-colors">
                      {ev.customerName}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1.5 text-[11px] text-smoke">
                        <MapPin className="w-3 h-3" />
                        {ev.customerAddress.split(',')[0]}
                      </span>
                      <span className="flex items-center gap-1.5 text-[11px] text-smoke">
                        <Clock className="w-3 h-3" />
                        {ev.title}
                      </span>
                    </div>
                  </div>

                  <div className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1 rounded-full shrink-0',
                    st.bg
                  )}>
                    <div className={cn('w-1.5 h-1.5 rounded-full', st.dot)} />
                    <span className={cn('text-[10px] font-semibold uppercase tracking-wide', st.text)}>
                      {ev.status}
                    </span>
                  </div>

                  <ArrowUpRight className="w-4 h-4 text-smoke opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── Recent Customers (2 cols) ─── */}
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="w-4 h-4 text-primary-light" />
              </div>
              <div>
                <h2 className="text-heading text-white">Aktuelle Kunden</h2>
                <p className="text-[11px] text-smoke">Zuletzt bearbeitet</p>
              </div>
            </div>
            <button 
              onClick={() => onNav('kunden')}
              className="flex items-center gap-1 text-caption text-primary-light hover:text-white transition-colors group"
            >
              Alle
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          <div className="space-y-3">
            {recentCustomers.map((c, idx) => (
              <div 
                key={c.id}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-xl',
                  'hover:bg-white/[0.02] transition-all duration-200 cursor-pointer group',
                  'animate-in'
                )}
                style={{ animationDelay: `${idx * 40}ms` }}
              >
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                  style={{ background: `linear-gradient(135deg, ${c.avatar}, ${c.avatar}99)` }}
                >
                  {c.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-body font-medium text-white truncate group-hover:text-primary-light transition-colors">
                    {c.name}
                  </p>
                  <p className="text-[11px] text-smoke truncate">{c.city} · {c.contacts[0]?.name}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-caption font-semibold text-white">{c.serviceCount}</p>
                  <p className="text-[10px] text-smoke">Einsätze</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
