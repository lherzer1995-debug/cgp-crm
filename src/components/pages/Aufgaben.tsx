import { useMemo, useState } from 'react';
import { CalendarClock, Circle, Filter, Plus, Search } from 'lucide-react';
import { useAppStore } from '../../data/app-store';
import { EmptyState, SectionHeader, StatusBadge } from '../ui/common';
import type { TaskPriority, TaskStatus } from '../../data/store';

const statusOptions: Array<'all' | TaskStatus> = ['all', 'offen', 'in-arbeit', 'wartet-auf-kunde', 'erledigt'];
const priorityOptions: Array<'all' | TaskPriority> = ['all', 'dringend', 'hoch', 'mittel', 'niedrig'];

export default function Aufgaben({ search }: { search: string }) {
  const { customers, updateTaskStatus, addTask } = useAppStore();
  const [statusFilter, setStatusFilter] = useState<'all' | TaskStatus>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | TaskPriority>('all');
  const [localSearch, setLocalSearch] = useState('');

  const query = (search || localSearch).toLowerCase();
  const tasks = useMemo(() => customers.flatMap((customer) => customer.tasks), [customers]);

  const filtered = tasks.filter((task) => {
    const matchesQuery = !query || task.title.toLowerCase().includes(query) || task.customerName.toLowerCase().includes(query);
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    return matchesQuery && matchesStatus && matchesPriority;
  });

  const createTask = () => {
    const customer = customers[0];
    const title = window.prompt('Titel der Aufgabe');
    if (!title || !customer) return;
    addTask({ customerId: customer.id, title });
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <SectionHeader
        title="Aufgaben"
        description="Ein Arbeitsstapel mit klaren Zuständen statt dekorativem Kanban um seiner selbst willen."
        action={<button className="btn btn-primary" onClick={createTask}><Plus className="h-4 w-4" />Aufgabe</button>}
      />

      <div className="rounded-[28px] border border-white/[0.08] bg-white/[0.03] p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ash" />
            <input
              type="search"
              value={search ? search : localSearch}
              onChange={(event) => setLocalSearch(event.target.value)}
              placeholder="Aufgabe oder Kunde suchen"
              className="h-11 w-full rounded-2xl border border-white/[0.09] bg-white/[0.04] pl-11 pr-4 text-[14px] text-cloud placeholder:text-ash focus:border-primary/40 focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {statusOptions.map((status) => (
              <button key={status} onClick={() => setStatusFilter(status)} className={`chip ${statusFilter === status ? 'chip-active' : ''}`}>
                {status}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {priorityOptions.map((priority) => (
              <button key={priority} onClick={() => setPriorityFilter(priority)} className={`chip ${priorityFilter === priority ? 'chip-active' : ''}`}>
                {priority}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={query ? 'Keine passenden Aufgaben' : 'Keine offenen Aufgaben'}
          description={query ? 'Prüfe Suchbegriff und Filterkombination.' : 'Im aktuellen Filter ist nichts offen. Das Team ist aufgeräumt.'}
          action={<button className="btn btn-secondary" onClick={createTask}>Neue Aufgabe anlegen</button>}
          icon={query ? 'search' : 'inbox'}
        />
      ) : (
        <div className="overflow-hidden rounded-[28px] border border-white/[0.08] bg-white/[0.03]">
          <table className="w-full">
            <thead className="bg-black/15">
              <tr className="text-left text-[12px] uppercase tracking-[0.14em] text-smoke">
                <th className="px-5 py-4 font-semibold">Aufgabe</th>
                <th className="px-5 py-4 font-semibold">Kunde</th>
                <th className="px-5 py-4 font-semibold">Status</th>
                <th className="px-5 py-4 font-semibold">Priorität</th>
                <th className="px-5 py-4 font-semibold">Fällig</th>
                <th className="px-5 py-4 font-semibold">Aktion</th>
              </tr>
            </thead>
            <tbody>
              {filtered
                .sort((a, b) => `${a.dueDate}${a.priority}`.localeCompare(`${b.dueDate}${b.priority}`))
                .map((task) => (
                  <tr key={task.id} className="border-t border-white/[0.06]">
                    <td className="px-5 py-4">
                      <p className="text-[15px] font-medium text-white">{task.title}</p>
                      <p className="mt-1 text-[13px] text-smoke">{task.description}</p>
                    </td>
                    <td className="px-5 py-4 text-[14px] text-smoke">{task.customerName}</td>
                    <td className="px-5 py-4">
                      <StatusBadge tone={task.status === 'erledigt' ? 'success' : task.status === 'wartet-auf-kunde' ? 'warning' : 'info'}>
                        {task.status}
                      </StatusBadge>
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge tone={task.priority === 'dringend' ? 'danger' : task.priority === 'hoch' ? 'warning' : task.priority === 'mittel' ? 'info' : 'neutral'}>
                        {task.priority}
                      </StatusBadge>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 text-[14px] text-smoke">
                        <CalendarClock className="h-4 w-4" />
                        {task.dueDate}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <button onClick={() => updateTaskStatus(task.id)} className="btn btn-secondary">
                        Nächster Status
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
