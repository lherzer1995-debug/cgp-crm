import { RotateCcw, ShieldCheck, Users2 } from 'lucide-react';
import { useAppStore } from '../../data/app-store';
import { SectionHeader, StatusBadge } from '../ui/common';
import { canEditSettings, roleDescription, roleLabel } from '../../utils/permissions';

export default function Einstellungen() {
  const { settings, updateSettings, resetDemoData, viewer, systemHealth } = useAppStore();
  const editable = canEditSettings(viewer);

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <SectionHeader title="Einstellungen" description="Nur Optionen, die im Betrieb wirklich relevant sind. Rechte werden serverseitig erzwungen." />
      {!editable ? (
        <div className="rounded-[24px] border border-warning/20 bg-warning/8 p-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-warning" />
            <p className="text-[14px] font-medium text-white">Lesemodus für {roleLabel(viewer.role)}</p>
          </div>
          <p className="mt-2 text-[13px] leading-6 text-smoke">
            {roleDescription(viewer.role)}. Profil- und Betriebsinformationen bleiben sichtbar, aber Änderungen an Systemoptionen sind für diese Rolle gesperrt.
          </p>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-[28px] border border-white/[0.08] bg-white/[0.03] p-6">
          <h2 className="text-[18px] font-semibold text-white">Profil</h2>
          <div className="mt-5 grid gap-4">
            <input value={settings.profileName} onChange={(event) => editable && updateSettings({ profileName: event.target.value })} className="field" disabled={!editable} />
            <input value={settings.company} onChange={(event) => editable && updateSettings({ company: event.target.value })} className="field" disabled={!editable} />
            <input value={settings.email} onChange={(event) => editable && updateSettings({ email: event.target.value })} className="field" disabled={!editable} />
            <input value={settings.phone} onChange={(event) => editable && updateSettings({ phone: event.target.value })} className="field" disabled={!editable} />
          </div>
        </section>

        <section className="rounded-[28px] border border-white/[0.08] bg-white/[0.03] p-6">
          <h2 className="text-[18px] font-semibold text-white">Arbeitsansicht</h2>
          <div className="mt-5 grid gap-4">
            <select value={settings.theme} onChange={(event) => editable && updateSettings({ theme: event.target.value as typeof settings.theme })} className="field" disabled={!editable}>
              <option value="dark">Dunkel</option>
              <option value="light">Hell</option>
              <option value="system">System</option>
            </select>
            <label className="flex items-center justify-between rounded-2xl border border-white/[0.08] bg-black/15 px-4 py-3 text-[14px] text-white">
              Kompakte Tabellen
              <input type="checkbox" checked={settings.compactTables} onChange={(event) => editable && updateSettings({ compactTables: event.target.checked })} disabled={!editable} />
            </label>
            <label className="flex items-center justify-between rounded-2xl border border-white/[0.08] bg-black/15 px-4 py-3 text-[14px] text-white">
              E-Mail Updates
              <input type="checkbox" checked={settings.emailUpdates} onChange={(event) => editable && updateSettings({ emailUpdates: event.target.checked })} disabled={!editable} />
            </label>
            <label className="flex items-center justify-between rounded-2xl border border-white/[0.08] bg-black/15 px-4 py-3 text-[14px] text-white">
              Push Alerts
              <input type="checkbox" checked={settings.pushAlerts} onChange={(event) => editable && updateSettings({ pushAlerts: event.target.checked })} disabled={!editable} />
            </label>
          </div>
        </section>
      </div>

      <section className="rounded-[28px] border border-white/[0.08] bg-white/[0.03] p-6">
        <div className="flex items-center gap-2">
          <Users2 className="h-4 w-4 text-primary-light" />
          <h2 className="text-[18px] font-semibold text-white">Rolle und Betriebsstatus</h2>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-5">
          <div className="rounded-2xl border border-white/[0.08] bg-black/15 p-4">
            <p className="text-[12px] uppercase tracking-[0.14em] text-smoke">Viewer</p>
            <p className="mt-2 text-[18px] font-semibold text-white">{viewer.name}</p>
            <p className="mt-1 text-[13px] text-smoke">{roleLabel(viewer.role)}</p>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-black/15 p-4">
            <p className="text-[12px] uppercase tracking-[0.14em] text-smoke">Rollenlogik</p>
            <p className="mt-2 text-[18px] font-semibold text-white">{editable ? 'schreibend' : 'nur lesen'}</p>
            <p className="mt-1 text-[13px] text-smoke">{roleDescription(viewer.role)}</p>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-black/15 p-4">
            <p className="text-[12px] uppercase tracking-[0.14em] text-smoke">Storage</p>
            <p className="mt-2 text-[18px] font-semibold text-white">{systemHealth?.storage || 'unbekannt'}</p>
            <p className="mt-1 text-[13px] text-smoke">{systemHealth?.ok ? 'verbunden' : systemHealth?.message || 'nicht erreichbar'}</p>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-black/15 p-4">
            <p className="text-[12px] uppercase tracking-[0.14em] text-smoke">Audit</p>
            <p className="mt-2 text-[18px] font-semibold text-white">{systemHealth?.auditMode || 'embedded'}</p>
            <p className="mt-1 text-[13px] text-smoke">{systemHealth?.auditStorage || 'unbekannt'} · {systemHealth?.auditCount ?? '—'} Einträge</p>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-black/15 p-4">
            <p className="text-[12px] uppercase tracking-[0.14em] text-smoke">Version</p>
            <p className="mt-2 text-[18px] font-semibold text-white">{systemHealth?.version || 'unbekannt'}</p>
            <p className="mt-1 text-[13px] text-smoke">Serverstart {systemHealth?.startedAt || '—'}</p>
          </div>
        </div>
      </section>

      {editable ? (
        <section className="rounded-[28px] border border-danger/20 bg-danger/6 p-6">
          <h2 className="text-[18px] font-semibold text-white">Workspace zurücksetzen</h2>
          <p className="mt-2 max-w-2xl text-[14px] leading-6 text-smoke">
            Setzt Demo-Daten, Aufgaben, Notizen und Einsätze auf den Startzustand zurück. Das ist nützlich für Tests, aber nicht rückgängig zu machen.
          </p>
          <div className="mt-5">
            <button className="btn btn-secondary" onClick={resetDemoData}>
              <RotateCcw className="h-4 w-4" />
              Demo-Daten zurücksetzen
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}