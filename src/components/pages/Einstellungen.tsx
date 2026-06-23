import { useState } from 'react';
import { User, Bell, Shield, Palette, Users, Zap } from 'lucide-react';
import { cn } from '../../utils/cn';
import { team, getInitials } from '../../data/store';

type Tab = 'profil' | 'benachrichtigungen' | 'sicherheit' | 'darstellung' | 'team' | 'integrationen';

const tabs: { id: Tab; label: string; icon: React.ElementType; desc: string }[] = [
  { id: 'profil', label: 'Profil', icon: User, desc: 'Persönliche Daten' },
  { id: 'benachrichtigungen', label: 'Benachrichtigungen', icon: Bell, desc: 'E-Mail & Push' },
  { id: 'sicherheit', label: 'Sicherheit', icon: Shield, desc: 'Passwort & 2FA' },
  { id: 'darstellung', label: 'Darstellung', icon: Palette, desc: 'Theme & Farben' },
  { id: 'team', label: 'Team', icon: Users, desc: 'Mitglieder verwalten' },
  { id: 'integrationen', label: 'Integrationen', icon: Zap, desc: 'Verbundene Dienste' },
];

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange} className={cn('w-11 h-6 rounded-full relative transition-all duration-200', on ? 'bg-primary' : 'bg-steel')}>
      <div className={cn('absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200', on ? 'translate-x-6' : 'translate-x-1')} />
    </button>
  );
}

export default function Einstellungen() {
  const [tab, setTab] = useState<Tab>('profil');
  const [notif, setNotif] = useState({ email: true, push: true, einsaetze: true, aufgaben: false, weekly: true });

  return (
    <div className="flex h-[calc(100vh-64px)]">
      <div className="w-[280px] p-4 overflow-y-auto border-r border-white/[0.02]">
        <p className="px-4 py-2 text-micro text-smoke">Einstellungen</p>
        <nav className="space-y-1 mt-2">
          {tabs.map(t => { const Icon = t.icon; const active = tab === t.id; return (
            <button key={t.id} onClick={() => setTab(t.id)} className={cn('w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200', active ? 'bg-primary/8 text-primary-light' : 'text-mist hover:bg-white/[0.02] hover:text-white')}>
              <Icon className={cn('w-5 h-5', active ? 'text-primary-light' : 'text-smoke')} />
              <div className="text-left"><p className="text-body font-medium">{t.label}</p><p className="text-[10px] text-smoke">{t.desc}</p></div>
            </button>
          );})}
        </nav>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        {tab === 'profil' && (
          <div className="max-w-xl space-y-8 animate-in">
            <div><h1 className="text-title text-white">Profil</h1><p className="text-caption text-smoke mt-1">Ihre persönlichen Informationen</p></div>
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center bg-gradient-to-br from-primary to-violet text-[24px] font-bold text-white shadow-xl shadow-primary/20">LH</div>
              <div><p className="text-body font-medium text-white">Profilbild ändern</p><p className="text-caption text-smoke mt-0.5">JPG, PNG. Max 5MB.</p><button className="mt-2 btn btn-secondary text-[12px] px-4 py-2">Hochladen</button></div>
            </div>
            <div className="space-y-5">
              {[{ label: 'Vorname', value: 'Lars' },{ label: 'Nachname', value: 'Herzer' },{ label: 'E-Mail', value: 'lars@cgp.de' },{ label: 'Telefon', value: '+49 123 4567890' }].map(f => (
                <div key={f.label}><label className="text-[10px] text-smoke uppercase tracking-wider font-semibold">{f.label}</label><input defaultValue={f.value} className="input w-full mt-1.5" /></div>
              ))}
              <div className="flex gap-3"><button className="btn btn-primary px-6">Speichern</button><button className="btn btn-secondary px-6">Abbrechen</button></div>
            </div>
          </div>
        )}

        {tab === 'benachrichtigungen' && (
          <div className="max-w-xl space-y-8 animate-in">
            <div><h1 className="text-title text-white">Benachrichtigungen</h1><p className="text-caption text-smoke mt-1">Verwalten Sie Ihre Benachrichtigungseinstellungen</p></div>
            <div className="space-y-1">
              {[{ key: 'email', label: 'E-Mail-Benachrichtigungen', desc: 'Erhalten Sie Updates per E-Mail' },{ key: 'push', label: 'Push-Benachrichtigungen', desc: 'Browser-Benachrichtigungen' },{ key: 'einsaetze', label: 'Neue Einsätze', desc: 'Bei neuen Einsätzen benachrichtigen' },{ key: 'aufgaben', label: 'Aufgaben-Erinnerungen', desc: 'Erinnerungen an fällige Aufgaben' },{ key: 'weekly', label: 'Wochenbericht', desc: 'Wöchentliche Zusammenfassung per E-Mail' }].map(item => (
                <div key={item.key} className="flex items-center justify-between py-4 px-4 rounded-xl hover:bg-white/[0.02] transition-colors">
                  <div><p className="text-body font-medium text-white">{item.label}</p><p className="text-caption text-smoke">{item.desc}</p></div>
                  <Toggle on={(notif as any)[item.key]} onChange={() => setNotif((prev: any) => ({ ...prev, [item.key]: !prev[item.key] }))} />
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'team' && (
          <div className="space-y-6 animate-in">
            <div><h1 className="text-title text-white">Team</h1><p className="text-caption text-smoke mt-1">Team-Mitglieder verwalten</p></div>
            <div className="space-y-2">
              {team.map(m => (
                <div key={m.id} className="card p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[11px] font-bold text-white shrink-0" style={{ background: m.avatar }}>{getInitials(m.name)}</div>
                  <div className="flex-1 min-w-0"><p className="text-body font-medium text-white">{m.name}</p><p className="text-[11px] text-smoke">{m.role}</p></div>
                  <div className="text-right text-caption text-smoke">{m.activeTasks} Aufgaben</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(tab === 'sicherheit' || tab === 'darstellung' || tab === 'integrationen') && (
          <div className="py-16 text-center animate-in">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.02] flex items-center justify-center mx-auto mb-4">
              {tab === 'sicherheit' ? <Shield className="w-8 h-8 text-smoke" /> : tab === 'darstellung' ? <Palette className="w-8 h-8 text-smoke" /> : <Zap className="w-8 h-8 text-smoke" />}
            </div>
            <p className="text-body text-smoke">Coming soon</p>
            <p className="text-caption text-ash mt-1">Dieser Bereich befindet sich in Entwicklung</p>
          </div>
        )}
      </div>
    </div>
  );
}
