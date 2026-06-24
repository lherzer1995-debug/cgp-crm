
import { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, ArrowRightLeft, Database, ExternalLink, RefreshCw, ShieldAlert, Siren, Workflow, Wrench } from 'lucide-react';
import { useAppStore, type Page } from '../../data/app-store';
import { canAccessOps, roleLabel } from '../../utils/permissions';
import { EmptyState, SectionHeader, SkeletonBlock, StatusBadge } from '../ui/common';

type AuditEntry = Awaited<ReturnType<ReturnType<typeof useAppStore>['fetchAudit']>>[number];
type LogEntry = Awaited<ReturnType<ReturnType<typeof useAppStore>['fetchLogs']>>[number];
type DrilldownTarget = { page: Page; entityType: 'customer' | 'task' | 'service'; entityId: string; customerId?: string; focusSection?: 'overview' | 'tasks' | 'notes' | 'timeline' | 'details' | 'context' };

function isCriticalAudit(entry: AuditEntry) {
  const haystack = `${entry.title} ${entry.detail}`.toLowerCase();
  return haystack.includes('dring') || haystack.includes('überfällig') || haystack.includes('krit') || haystack.includes('eskal') || haystack.includes('abgesagt');
}

function levelTone(level: 'info' | 'warn' | 'error') {
  if (level === 'error') return 'danger';
  if (level === 'warn') return 'warning';
  return 'neutral';
}

function auditTone(entry: AuditEntry) {
  if (isCriticalAudit(entry)) return 'danger';
  if (entry.handoffTo) return 'violet';
  if (entry.kind === 'service') return 'info';
  if (entry.kind === 'task') return 'warning';
  return 'neutral';
}

function drilldownFromAudit(entry: AuditEntry): DrilldownTarget | null {
  if (entry.entityType === 'task' && entry.entityId) {
    return { page: 'aufgaben', entityType: 'task', entityId: entry.entityId, customerId: entry.customerId, focusSection: entry.handoffTo || entry.kind === 'note' ? 'timeline' : 'details' };
  }
  if (entry.entityType === 'service' && entry.entityId) {
    return { page: 'einsaetze', entityType: 'service', entityId: entry.entityId, customerId: entry.customerId, focusSection: entry.handoffTo || entry.kind === 'note' ? 'timeline' : 'details' };
  }
  if (entry.customerId) {
    const focusSection = entry.kind === 'note' ? 'notes' : entry.kind === 'task' ? 'tasks' : 'timeline';
    return { page: 'kunden', entityType: 'customer', entityId: entry.customerId, focusSection };
  }
  return null;
}

function drilldownFromLog(entry: LogEntry): DrilldownTarget | null {
  const meta = entry.meta || {};
  const entityType = typeof meta.entityType === 'string' ? meta.entityType : null;
  const entityId = typeof meta.entityId === 'string' ? meta.entityId : null;
  const customerId = typeof meta.customerId === 'string' ? meta.customerId : undefined;

  if (entityType === 'task' && entityId) return { page: 'aufgaben', entityType: 'task', entityId, customerId, focusSection: 'details' };
  if (entityType === 'service' && entityId) return { page: 'einsaetze', entityType: 'service', entityId, customerId, focusSection: 'details' };
  if ((entityType === 'customer' && entityId) || customerId) return { page: 'kunden', entityType: 'customer', entityId: entityId || customerId!, customerId, focusSection: 'overview' };
  return null;
}

export default function Ops({ onDrilldown }: { onDrilldown: (target: DrilldownTarget) => void }) {
  const { viewer, fetchAudit, fetchLogs, systemHealth, reloadWorkspace } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [entityFilter, setEntityFilter] = useState<'all' | 'customer' | 'task' | 'service'>('all');
  const [levelFilter, setLevelFilter] = useState<'all' | 'info' | 'warn' | 'error'>('all');
  const [onlyCritical, setOnlyCritical] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let active = true;
    if (!canAccessOps(viewer)) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([fetchAudit({ limit: 120 }), fetchLogs({ limit: 80 })])
      .then(([audit, logs]) => {
        if (!active) return;
        setAuditEntries(audit);
        setLogEntries(logs);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [fetchAudit, fetchLogs, viewer]);

  const filteredAudit = useMemo(() => {
    const needle = query.toLowerCase().trim();
    return auditEntries
      .filter((entry) => entityFilter === 'all' || entry.entityType === entityFilter)
      .filter((entry) => !onlyCritical || isCriticalAudit(entry))
      .filter((entry) => !needle || `${entry.title} ${entry.detail} ${entry.customerName} ${entry.actor} ${entry.handoffTo || ''}`.toLowerCase().includes(needle))
      .slice(0, 80);
  }, [auditEntries, entityFilter, onlyCritical, query]);

  const filteredLogs = useMemo(() => {
    const needle = query.toLowerCase().trim();
    return logEntries
      .filter((entry) => levelFilter === 'all' || entry.level === levelFilter)
      .filter((entry) => !needle || `${entry.code} ${entry.message}`.toLowerCase().includes(needle))
      .slice(0, 50);
  }, [logEntries, levelFilter, query]);

  const metrics = useMemo(() => ({
    criticalAudit: auditEntries.filter(isCriticalAudit).length,
    handoffs: auditEntries.filter((entry) => Boolean(entry.handoffTo)).length,
    serviceSignals: auditEntries.filter((entry) => entry.kind === 'service').length,
    errorLogs: logEntries.filter((entry) => entry.level === 'error').length,
    warnLogs: logEntries.filter((entry) => entry.level === 'warn').length,
  }), [auditEntries, logEntries]);

  if (!canAccessOps(viewer)) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <EmptyState
          icon="warning"
          title="Ops-Zentrale nur für Leitung und Admin"
          description={`Als ${roleLabel(viewer.role)} siehst du operative Detailansichten, aber keine systemweite Audit- und Betriebszentrale.`}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <SectionHeader
        title="Audit & Betriebszentrale"
        description="Kritische Übergaben, Fehlersignale und Systemlage an einem Ort. Diese Ansicht ist für Admin und Serviceleitung gedacht."
        action={<button className="btn btn-secondary" onClick={() => reloadWorkspace()}><RefreshCw className="h-4 w-4" />Workspace neu laden</button>}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-[24px] border border-danger/20 bg-danger/8 p-5">
          <div className="flex items-center justify-between"><Siren className="h-4 w-4 text-danger-soft" /><StatusBadge tone="danger">{metrics.criticalAudit} kritisch</StatusBadge></div>
          <p className="mt-4 text-[28px] font-semibold text-white">{metrics.criticalAudit}</p>
          <p className="mt-1 text-[13px] leading-5 text-smoke">Eskalationsnahe oder zeitkritische Vorgänge im Audit-Feed.</p>
        </div>
        <div className="rounded-[24px] border border-violet/20 bg-violet/8 p-5">
          <div className="flex items-center justify-between"><ArrowRightLeft className="h-4 w-4 text-violet-soft" /><StatusBadge tone="violet">{metrics.handoffs} Übergaben</StatusBadge></div>
          <p className="mt-4 text-[28px] font-semibold text-white">{metrics.handoffs}</p>
          <p className="mt-1 text-[13px] leading-5 text-smoke">Verantwortungswechsel, die operative Reibung oder Klärung erzeugen können.</p>
        </div>
        <div className="rounded-[24px] border border-info/20 bg-info/8 p-5">
          <div className="flex items-center justify-between"><Wrench className="h-4 w-4 text-info" /><StatusBadge tone="info">{metrics.serviceSignals} Einsatzspur</StatusBadge></div>
          <p className="mt-4 text-[28px] font-semibold text-white">{metrics.serviceSignals}</p>
          <p className="mt-1 text-[13px] leading-5 text-smoke">Audit-Einträge aus Einsatzplanung, Statuswechseln und Rückmeldungen.</p>
        </div>
        <div className="rounded-[24px] border border-warning/20 bg-warning/8 p-5">
          <div className="flex items-center justify-between"><ShieldAlert className="h-4 w-4 text-warning" /><StatusBadge tone="warning">{metrics.warnLogs} Warnungen</StatusBadge></div>
          <p className="mt-4 text-[28px] font-semibold text-white">{metrics.warnLogs}</p>
          <p className="mt-1 text-[13px] leading-5 text-smoke">Server- und Betriebswarnungen, die Beobachtung brauchen, aber nicht akut brechen.</p>
        </div>
        <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.03] p-5">
          <div className="flex items-center justify-between"><Database className="h-4 w-4 text-primary-light" /><StatusBadge tone={systemHealth?.ok ? 'success' : 'warning'}>{systemHealth?.storage || 'unbekannt'}</StatusBadge></div>
          <p className="mt-4 text-[18px] font-semibold text-white">{systemHealth?.auditStorage || 'kein Audit-Storage'}</p>
          <p className="mt-1 text-[13px] leading-5 text-smoke">Version {systemHealth?.version || '–'} · {systemHealth?.auditCount ?? 0} Audit-Einträge.</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="rounded-[28px] border border-white/[0.08] bg-white/[0.03] p-5">
          <SectionHeader
            title="Audit-Feed"
            description="Direkt aus /api/audit geladen. Fokus auf kritische Vorgänge, Übergaben und Kunden-/Einsatzkontext."
            action={
              <div className="flex flex-wrap gap-2">
                <select value={entityFilter} onChange={(event) => setEntityFilter(event.target.value as typeof entityFilter)} className="field-input h-11 min-w-[150px]">
                  <option value="all">Alle Entitäten</option>
                  <option value="customer">Kunden</option>
                  <option value="task">Aufgaben</option>
                  <option value="service">Einsätze</option>
                </select>
                <label className="flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-black/15 px-4 text-[13px] text-white">
                  <input type="checkbox" checked={onlyCritical} onChange={(event) => setOnlyCritical(event.target.checked)} />
                  nur kritisch
                </label>
              </div>
            }
          />
          <div className="mt-4">
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Audit nach Kunde, Akteur oder Detail filtern" className="field-input h-11" />
          </div>
          <div className="mt-4 space-y-3">
            {loading ? (
              <>
                <SkeletonBlock className="h-[94px]" />
                <SkeletonBlock className="h-[94px]" />
                <SkeletonBlock className="h-[94px]" />
              </>
            ) : filteredAudit.length === 0 ? (
              <EmptyState
                title="Keine Audit-Einträge im aktuellen Filter"
                description="Passe Entität, Kritikalität oder Suchbegriff an. Diese Sicht zeigt bewusst nur betriebsrelevante Spuren."
                icon="search"
              />
            ) : filteredAudit.map((entry) => {
              const target = drilldownFromAudit(entry);
              return (
                <article key={entry.id} className="rounded-[24px] border border-white/[0.08] bg-black/15 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone={auditTone(entry)}>
                      {entry.entityType || entry.kind}
                    </StatusBadge>
                    {entry.handoffTo ? <StatusBadge tone="violet">Übergabe an {entry.handoffTo}</StatusBadge> : null}
                    {entry.visibility === 'office' ? <StatusBadge tone="warning">intern</StatusBadge> : null}
                    {target ? (
                      <button className="ml-auto inline-flex items-center gap-1 rounded-full border border-white/[0.1] bg-white/[0.04] px-3 py-1 text-[12px] font-medium text-white transition hover:bg-white/[0.08]" onClick={() => onDrilldown(target)}>
                        Öffnen
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    ) : null}
                  </div>
                  <div className="mt-3 flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-[15px] font-medium text-white">{entry.title}</h3>
                      <p className="mt-1 text-[13px] leading-6 text-smoke">{entry.detail}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[12px] uppercase tracking-[0.14em] text-smoke">Zeitpunkt</p>
                      <p className="mt-1 text-[13px] text-white">{entry.timestamp}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-3 text-[12px] text-smoke">
                    <span>{entry.customerName}</span>
                    <span>•</span>
                    <span>{entry.actor}</span>
                    {entry.entityId ? <><span>•</span><span>{entry.entityId}</span></> : null}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-[28px] border border-white/[0.08] bg-white/[0.03] p-5">
            <SectionHeader
              title="API- und Betriebslogs"
              description="Log-Spur aus dem Serverbetrieb. Fehler und Warnungen sind hier bewusst getrennt von der Objekt-Historie."
              action={
                <select value={levelFilter} onChange={(event) => setLevelFilter(event.target.value as typeof levelFilter)} className="field-input h-11 min-w-[132px]">
                  <option value="all">Alle Levels</option>
                  <option value="info">Info</option>
                  <option value="warn">Warn</option>
                  <option value="error">Error</option>
                </select>
              }
            />
            <div className="mt-4 space-y-3">
              {loading ? (
                <>
                  <SkeletonBlock className="h-[82px]" />
                  <SkeletonBlock className="h-[82px]" />
                </>
              ) : filteredLogs.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.02] p-5 text-center text-[13px] text-smoke">Keine Logs im aktuellen Filter.</div>
              ) : filteredLogs.map((entry) => {
                const target = drilldownFromLog(entry);
                return (
                  <div key={entry.id} className="rounded-2xl border border-white/[0.08] bg-black/15 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <StatusBadge tone={levelTone(entry.level)}>{entry.level}</StatusBadge>
                      <div className="flex items-center gap-2">
                        {target ? (
                          <button className="inline-flex items-center gap-1 rounded-full border border-white/[0.1] bg-white/[0.04] px-3 py-1 text-[12px] font-medium text-white transition hover:bg-white/[0.08]" onClick={() => onDrilldown(target)}>
                            Öffnen
                            <ExternalLink className="h-3 w-3" />
                          </button>
                        ) : null}
                        <span className="text-[12px] text-smoke">{entry.createdAt}</span>
                      </div>
                    </div>
                    <p className="mt-3 text-[14px] font-medium text-white">{entry.code}</p>
                    <p className="mt-1 text-[13px] leading-6 text-smoke">{entry.message}</p>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-[28px] border border-white/[0.08] bg-white/[0.03] p-5">
            <SectionHeader title="Systemlage" description="Direkt aus dem Health- und Versionsstatus." />
            <div className="mt-4 space-y-3 text-[13px]">
              <div className="rounded-2xl border border-white/[0.08] bg-black/15 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-smoke">Storage</p>
                  <StatusBadge tone={systemHealth?.ok ? 'success' : 'warning'}>{systemHealth?.storage || 'unbekannt'}</StatusBadge>
                </div>
                <p className="mt-2 text-white">Audit: {systemHealth?.auditStorage || '–'} · Modus: {systemHealth?.auditMode || '–'}</p>
              </div>
              <div className="rounded-2xl border border-white/[0.08] bg-black/15 p-4">
                <p className="text-smoke">Version</p>
                <p className="mt-2 text-white">{systemHealth?.version || '–'}</p>
                <p className="mt-1 text-smoke">Start: {systemHealth?.startedAt || '–'}</p>
              </div>
              <div className="rounded-2xl border border-white/[0.08] bg-black/15 p-4">
                <p className="text-smoke">Ops-Hinweis</p>
                <p className="mt-2 text-white">
                  Diese Seite ist absichtlich kein dekorativer Feed. Sie bündelt kritische Vorgänge, Übergaben, Fehler und Plattformzustand für Leitung und Admin.
                </p>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
