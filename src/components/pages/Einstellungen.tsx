import { RotateCcw } from 'lucide-react';
import { useAppStore } from '../../data/app-store';
import { SectionHeader } from '../ui/common';

export default function Einstellungen() {
  const { settings, updateSettings, resetDemoData, viewer, systemHealth } = useAppStore();

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <SectionHeader title="Einstellungen" description="Nur relevante Systemoptionen – keine Fake-Sicherheitszonen." />
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-[28px] border border-white/[0.08] bg-white/[0.03] p-6">
          <h2 className="text-[18px] font-semibold text-white">Profil</h2>
          <div className="mt-5 grid gap-4">
            <input value={settings.profileName} onChange={(event) => updateSettings({ profileName: event.target.value })} className="field" />
            <input value={settings.company} onChange={(event) => updateSettings({ company: event.target.value })} className="field" />
            <input value={settings.email} onChange={(event) => updateSettings({ email: event.target.value })} className="field" />
            <input value={settings.phone} onChange={(event) => updateSettings({ phone: event.target.value })} className="field" />
          </div>
        </section>

        <section className="rounded-[28px] border border-white/[0.08] bg-white/[0.03] p-6">
          <h2 className="text-[18px] font-semibold text-white">Arbeitsansicht</h2>
          <div className="mt-5 grid gap-4">
            <select value={settings.theme} onChange={(event) => updateSettings({ theme: event.target.value as typeof settings.theme })} className="field">
              <option value="dark">Dunkel</option>
              <option value="light">Hell</option>
              <option value="system">System</option>
            </select>
            <label className="flex items-center justify-between rounded-2xl border border-white/[0.08] bg-black/15 px-4 py-3 text-[14px] text-white">
              Kompakte Tabellen
              <input type="checkbox" checked={settings.compactTables} onChange={(event) => updateSettings({ compactTables: event.target.checked })} />
            </label>
            <label className="flex items-center justify-between rounded-2xl border border-white/[0.08] bg-black/15 px-4 py-3 text-[14px] text-white">
              E-Mail Updates
              <input type="checkbox" checked={settings.emailUpdates} onChange={(event) => updateSettings({ emailUpdates: event.target.checked })} />
            </label>
            <label className="flex items-center justify-between rounded-2xl border border-white/[0.08] bg-black/15 px-4 py-3 text-[14px] text-white">
              Push Alerts
              <input type="checkbox" checked={settings.pushAlerts} onChange={(event) => updateSettings({ pushAlerts: event.target.checked })} />
            </label>
          </div>
        </section>
      </div>


      <section className="rounded-[28px] border border-white/[0.08] bg-white/[0.03] p-6">
        <h2 className="text-[18px] font-semibold text-white">Betriebsstatus</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/[0.08] bg-black/15 p-4">
            <p className="text-[12px] uppercase tracking-[0.14em] text-smoke">Viewer</p>
            <p className="mt-2 text-[18px] font-semibold text-white">{viewer.name}</p>
            <p className="mt-1 text-[13px] text-smoke">{viewer.role}</p>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-black/15 p-4">
            <p className="text-[12px] uppercase tracking-[0.14em] text-smoke">Storage</p>
            <p className="mt-2 text-[18px] font-semibold text-white">{systemHealth?.storage || 'unbekannt'}</p>
            <p className="mt-1 text-[13px] text-smoke">{systemHealth?.ok ? 'verbunden' : systemHealth?.message || 'nicht erreichbar'}</p>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-black/15 p-4">
            <p className="text-[12px] uppercase tracking-[0.14em] text-smoke">Version</p>
            <p className="mt-2 text-[18px] font-semibold text-white">{systemHealth?.version || 'unbekannt'}</p>
            <p className="mt-1 text-[13px] text-smoke">Serverstart {systemHealth?.startedAt || '—'}</p>
          </div>
        </div>
      </section>

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
    </div>
  );
}
