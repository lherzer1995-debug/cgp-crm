import { useState, useMemo } from 'react';
import {
  Plus, CheckCircle2, Circle, Clock, AlertTriangle,
  ArrowUp, ArrowRight, ArrowDown, 
  Calendar, User, Search, MoreHorizontal,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { customers, type Task, type TaskStatus } from '../../data/store';

const allTasks = customers.flatMap(c => c.tasks);

const statusCfg: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  offen: { label: 'Offen', color: '#71717a', icon: Circle },
  'in-arbeit': { label: 'In Arbeit', color: '#6366f1', icon: Clock },
  erledigt: { label: 'Erledigt', color: '#10b981', icon: CheckCircle2 },
};

const priCfg: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  niedrig: { label: 'Niedrig', color: '#71717a', icon: ArrowDown },
  mittel: { label: 'Mittel', color: '#06b6d4', icon: ArrowRight },
  hoch: { label: 'Hoch', color: '#f59e0b', icon: ArrowUp },
  dringend: { label: 'Dringend', color: '#ef4444', icon: AlertTriangle },
};

const statusOrder: TaskStatus[] = ['offen', 'in-arbeit', 'erledigt'];

export default function Aufgaben() {
  const [search, setSearch] = useState('');
  const [priFilter, setPriFilter] = useState('all');
  const [tasks, setTasks] = useState(allTasks);

  const filtered = useMemo(() => {
    let r = [...tasks];
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(t => t.title.toLowerCase().includes(q) || t.customerName.toLowerCase().includes(q));
    }
    if (priFilter !== 'all') r = r.filter(t => t.priority === priFilter);
    return r;
  }, [search, priFilter, tasks]);

  const grouped = useMemo(() => {
    const g: Record<string, Task[]> = {};
    statusOrder.forEach(s => { g[s] = []; });
    filtered.forEach(t => { if (g[t.status]) g[t.status].push(t); });
    return g;
  }, [filtered]);

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t;
      const next: Record<string, TaskStatus> = { offen: 'in-arbeit', 'in-arbeit': 'erledigt', erledigt: 'offen' };
      return { ...t, status: next[t.status] };
    }));
  };

  const done = tasks.filter(t => t.status === 'erledigt').length;
  const pct = tasks.length ? Math.round(done / tasks.length * 100) : 0;

  return (
    <div className="flex flex-col min-h-[calc(100dvh-76px)]">
      {/* Toolbar */}
      <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-smoke group-focus-within:text-mist transition-colors" />
            <input
              type="text"
              placeholder="Aufgaben durchsuchen…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={cn(
                'w-[280px] pl-11 pr-4 py-2.5',
                'bg-white/[0.045] border border-white/[0.09] rounded-2xl',
                'text-[15px] text-cloud placeholder-smoke',
                'hover:bg-white/[0.055] hover:border-white/[0.06]',
                'focus:outline-none focus:bg-white/[0.07] focus:border-primary/30',
                'transition-all duration-200'
              )}
            />
          </div>
          
          {/* Priority Filter */}
          <select
            value={priFilter}
            onChange={e => setPriFilter(e.target.value)}
            className={cn(
              'px-4 py-2.5 rounded-2xl',
              'bg-white/[0.045] border border-white/[0.09]',
              'text-[15px] text-mist',
              'focus:outline-none appearance-none cursor-pointer',
              'hover:bg-white/[0.055]'
            )}
          >
            <option value="all">Alle Prioritäten</option>
            <option value="dringend">🔴 Dringend</option>
            <option value="hoch">🟡 Hoch</option>
            <option value="mittel">🔵 Mittel</option>
            <option value="niedrig">⚪ Niedrig</option>
          </select>
        </div>

        <div className="flex items-center gap-5">
          {/* Progress */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[15px] text-smoke uppercase tracking-wider">Fortschritt</p>
              <p className="text-caption font-semibold text-white">{done}/{tasks.length}</p>
            </div>
            <div className="w-32 h-1.5 bg-white/[0.055] rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-success to-success-soft rounded-full transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-caption font-bold text-success">{pct}%</span>
          </div>

          {/* Add Task */}
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
            <span>Neue Aufgabe</span>
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto p-6">
        <div className="flex gap-5 h-full min-w-max">
          {statusOrder.map(status => {
            const cfg = statusCfg[status];
            const Icon = cfg.icon;
            const list = grouped[status] || [];
            
            return (
              <div key={status} className="w-[340px] flex flex-col shrink-0">
                {/* Column Header */}
                <div className="flex items-center justify-between px-4 py-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: `${cfg.color}12` }}
                    >
                      <Icon className="w-4 h-4" style={{ color: cfg.color }} />
                    </div>
                    <span className="text-heading text-white">{cfg.label}</span>
                    <span className={cn(
                      'text-[15px] font-semibold px-2 py-0.5 rounded-full',
                      'bg-white/[0.07] text-smoke'
                    )}>
                      {list.length}
                    </span>
                  </div>
                  <button className="p-1.5 rounded-lg hover:bg-white/[0.05] transition-colors">
                    <Plus className="w-4 h-4 text-smoke" />
                  </button>
                </div>

                {/* Cards */}
                <div className="flex-1 space-y-2.5 overflow-y-auto">
                  {list.map((task, idx) => {
                    const pi = priCfg[task.priority];
                    const PIcon = pi.icon;
                    return (
                      <div
                        key={task.id}
                        className={cn(
                          'card p-4 group cursor-pointer animate-in'
                        )}
                        style={{ animationDelay: `${idx * 30}ms` }}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => toggleTask(task.id)}
                            className="mt-0.5 shrink-0"
                          >
                            {task.status === 'erledigt' ? (
                              <CheckCircle2 className="w-5 h-5 text-success" />
                            ) : (
                              <Circle className="w-5 h-5 text-smoke hover:text-primary-light transition-colors" />
                            )}
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
                            <p className="text-[15px] text-smoke mt-1 truncate">{task.customerName}</p>
                            <div className="flex items-center gap-3 mt-3">
                              <span 
                                className="flex items-center gap-1 text-[15px] font-semibold capitalize"
                                style={{ color: pi.color }}
                              >
                                <PIcon className="w-3 h-3" />{pi.label}
                              </span>
                              <span className="flex items-center gap-1 text-[15px] text-smoke">
                                <Calendar className="w-3 h-3" />{task.dueDate}
                              </span>
                              <span className="flex items-center gap-1 text-[15px] text-smoke">
                                <User className="w-3 h-3" />{task.assignee.split(' ')[0]}
                              </span>
                            </div>
                          </div>
                          <button className="p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-white/[0.05] transition-all">
                            <MoreHorizontal className="w-4 h-4 text-smoke" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  
                  {list.length === 0 && (
                    <div className="py-12 text-center opacity-50">
                      <Icon className="w-8 h-8 text-smoke mx-auto mb-2" />
                      <p className="text-caption text-smoke">Keine Aufgaben</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
