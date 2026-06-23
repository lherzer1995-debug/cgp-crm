import { useState } from 'react';
import {
  User, Bell, Shield, Palette, Zap,
  Mail, Building, Phone, MapPin, Globe,
  Check, ChevronRight, Key, Lock, Smartphone, Laptop,
  Monitor, Eye, EyeOff, Copy, RefreshCw,
  Webhook, Database, Calendar, Map,
  Sun, Moon, type LucideIcon,
} from 'lucide-react';
import { cn } from '../../utils/cn';

type Tab = 'konto' | 'darstellung' | 'sicherheit' | 'benachrichtigungen' | 'integrationen';

const tabs: { id: Tab; label: string; icon: LucideIcon; desc: string }[] = [
  { id: 'konto', label: 'Konto', icon: User, desc: 'Profil & Kontaktdaten' },
  { id: 'darstellung', label: 'Darstellung', icon: Palette, desc: 'Theme, Layout & Anzeige' },
  { id: 'sicherheit', label: 'Sicherheit', icon: Shield, desc: 'Passwort, Geräte & Sessions' },
  { id: 'benachrichtigungen', label: 'Benachrichtigungen', icon: Bell, desc: 'E-Mail, Push & Alerts' },
  { id: 'integrationen', label: 'Integrationen', icon: Zap, desc: 'APIs & externe Dienste' },
];

// ═══ Reusable Components ═══════════════════════════════════

function Toggle({ on, onChange, size = 'md' }: { on: boolean; onChange: () => void; size?: 'sm' | 'md' }) {
  return (
    <button
      onClick={onChange}
      className={cn(
        'rounded-full relative transition-all duration-300 shrink-0',
        on ? 'bg-gradient-to-r from-primary to-[#5558e3]' : 'bg-steel',
        size === 'sm' ? 'w-9 h-5' : 'w-11 h-6'
      )}
    >
      <div className={cn(
        'absolute rounded-full bg-white shadow-md transition-all duration-300',
        size === 'sm' ? 'top-[3px] w-3.5 h-3.5' : 'top-1 w-4 h-4',
        on
          ? (size === 'sm' ? 'translate-x-[18px]' : 'translate-x-[22px]')
          : (size === 'sm' ? 'translate-x-[3px]' : 'translate-x-[4px]')
      )} />
    </button>
  );
}

function SettingsSection({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="animate-in">
      <div className="mb-5">
        <h2 className="text-[17px] font-semibold text-white tracking-tight">{title}</h2>
        {desc && <p className="text-[15px] text-smoke mt-0.5">{desc}</p>}
      </div>
      <div className="space-y-3">
        {children}
      </div>
    </div>
  );
}

function SettingsRow({ icon: Icon, label, desc, children, onClick }: {
  icon?: LucideIcon; label: string; desc?: string; children?: React.ReactNode; onClick?: () => void;
}) {
  return (
    <div
      className={cn(
        'settings-row',
        onClick && 'cursor-pointer group'
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {Icon && (
          <div className="w-10 h-10 rounded-2xl bg-white/[0.055] flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-smoke" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-[15px] font-medium text-white group-hover:text-primary-light transition-colors">{label}</p>
          {desc && <p className="text-[15px] text-smoke mt-0.5 line-clamp-1">{desc}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-4">
        {children}
        {onClick && <ChevronRight className="w-4 h-4 text-silver opacity-0 group-hover:opacity-100 transition-opacity" />}
      </div>
    </div>
  );
}

function InputField({ label, value, icon: Icon, type = 'text' }: {
  label: string; value: string; icon?: LucideIcon; type?: string;
}) {
  return (
    <div>
      <label className="text-micro text-smoke block mb-2">{label}</label>
      <div className="relative">
        {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-smoke" />}
        <input
          type={type}
          defaultValue={value}
          className={cn(
            'w-full py-3 rounded-2xl',
            'bg-white/[0.045] border border-white/[0.05]',
            'text-[15px] text-cloud',
            'hover:border-white/[0.08]',
            'focus:outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/8',
            'transition-all duration-200',
            Icon ? 'pl-12 pr-4' : 'px-4'
          )}
        />
      </div>
    </div>
  );
}

// ═══ Main Component ════════════════════════════════════════

export default function Einstellungen() {
  const [tab, setTab] = useState<Tab>('konto');
  const [showPw, setShowPw] = useState(false);
  
  // Notification prefs
  const [notif, setNotif] = useState({
    emailEinsaetze: true, emailAufgaben: true, emailKunden: false,
    pushEinsaetze: true, pushAufgaben: false, pushSystem: true,
    wochenbericht: true, monatsbericht: false,
  });

  // Appearance prefs
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>('dark');
  const [sidebarBehavior, setSidebarBehavior] = useState<'fixed' | 'auto'>('fixed');
  const [density, setDensity] = useState<'compact' | 'default' | 'comfortable'>('default');
  const [fontSize, setFontSize] = useState(14);

  // API key mock
  const [apiKeyVisible, setApiKeyVisible] = useState(false);

  return (
    <div className="flex min-h-[calc(100dvh-76px)]">
      
      {/* ═══ Left Nav ═══ */}
      <div className={cn(
        'w-[280px] shrink-0 p-4 overflow-y-auto',
        'border-r border-white/[0.08]',
        'hidden md:block'
      )}>
        <div className="px-4 pt-2 pb-4">
          <h1 className="text-[20px] font-bold text-white tracking-tight">Einstellungen</h1>
          <p className="text-[15px] text-smoke mt-0.5">System konfigurieren</p>
        </div>
        
        <nav className="space-y-1">
          {tabs.map((t, idx) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl',
                  'transition-all duration-200 group',
                  'animate-in',
                  active
                    ? 'bg-primary/8 border border-primary/10'
                    : 'hover:bg-white/[0.045] border border-transparent'
                )}
                style={{ animationDelay: `${idx * 30}ms` }}
              >
                <div className={cn(
                  'w-9 h-9 rounded-2xl flex items-center justify-center shrink-0',
                  active ? 'bg-primary/15' : 'bg-white/[0.055]'
                )}>
                  <Icon className={cn(
                    'w-[18px] h-[18px] transition-colors',
                    active ? 'text-primary-light' : 'text-smoke group-hover:text-mist'
                  )} />
                </div>
                <div className="text-left min-w-0">
                  <p className={cn(
                    'text-[15px] font-medium transition-colors',
                    active ? 'text-primary-light' : 'text-mist group-hover:text-white'
                  )}>{t.label}</p>
                  <p className="text-[15px] text-ash truncate">{t.desc}</p>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* ═══ Mobile Nav ═══ */}
      <div className="md:hidden w-full flex flex-col">
        <div className="flex gap-1 p-3 overflow-x-auto border-b border-white/[0.08] shrink-0">
          {tabs.map(t => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-2xl shrink-0',
                  'text-[15px] font-medium transition-all whitespace-nowrap',
                  active ? 'bg-primary/10 text-primary-light' : 'text-smoke hover:text-white'
                )}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══ Content ═══ */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-6 sm:p-4 sm:p-6 lg:p-8 lg:p-10 space-y-10">

          {/* ──────────────────────────────────────────────────────
             KONTO TAB
             ────────────────────────────────────────────────────── */}
          {tab === 'konto' && (
            <>
              {/* Profile Header */}
              <div className={cn(
                'flex flex-col sm:flex-row items-start sm:items-center gap-6 p-6 rounded-[22px]',
                'bg-gradient-to-r from-white/[0.02] to-transparent',
                'border border-white/[0.08]',
                'animate-in'
              )}>
                <div className="relative group">
                  <div className={cn(
                    'w-20 h-20 rounded-[22px] flex items-center justify-center',
                    'bg-gradient-to-br from-primary to-violet',
                    'text-[28px] font-bold text-white',
                    'shadow-xl shadow-primary/20',
                    'transition-transform duration-200 group-hover:scale-105'
                  )}>
                    LH
                  </div>
                  <div className={cn(
                    'absolute -bottom-1 -right-1 w-7 h-7 rounded-lg',
                    'bg-slate border-2 border-obsidian',
                    'flex items-center justify-center',
                    'opacity-0 group-hover:opacity-100 transition-opacity',
                    'cursor-pointer'
                  )}>
                    <Palette className="w-3.5 h-3.5 text-mist" />
                  </div>
                </div>
                <div className="flex-1">
                  <h2 className="text-[18px] font-semibold text-white">Lars Herzer</h2>
                  <p className="text-[15px] text-smoke mt-0.5">Administrator · CGP Solutions GmbH</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={cn(
                      'inline-flex items-center gap-1.5 text-[15px] font-semibold px-2.5 py-1 rounded-full',
                      'bg-success/10 text-success'
                    )}>
                      <span className="w-1.5 h-1.5 rounded-full bg-success" />
                      Verifiziert
                    </span>
                    <span className="text-[15px] text-ash">Mitglied seit Jan 2024</span>
                  </div>
                </div>
                <button className="btn btn-secondary text-[15px] shrink-0">Foto ändern</button>
              </div>

              {/* Personal Info */}
              <SettingsSection title="Persönliche Daten" desc="Grundlegende Kontoinformationen">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InputField label="Vorname" value="Lars" icon={User} />
                  <InputField label="Nachname" value="Herzer" icon={User} />
                  <InputField label="E-Mail Adresse" value="lars@cgp-solutions.de" icon={Mail} />
                  <InputField label="Telefon" value="+49 170 1234567" icon={Phone} />
                </div>
              </SettingsSection>

              {/* Company */}
              <SettingsSection title="Unternehmen" desc="Ihre Firmendaten">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InputField label="Firmenname" value="CGP Solutions GmbH" icon={Building} />
                  <InputField label="Position" value="Geschäftsführer" icon={Key} />
                  <InputField label="Adresse" value="Hauptstraße 42, 80331 München" icon={MapPin} />
                  <InputField label="Website" value="www.cgp-solutions.de" icon={Globe} />
                </div>
              </SettingsSection>

              {/* Locale */}
              <SettingsSection title="Sprache & Region">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-micro text-smoke block mb-2">Sprache</label>
                    <select className={cn(
                      'w-full px-4 py-3 rounded-2xl',
                      'bg-white/[0.045] border border-white/[0.05]',
                      'text-[15px] text-cloud',
                      'focus:outline-none focus:border-primary/30',
                      'appearance-none cursor-pointer'
                    )}>
                      <option>🇩🇪 Deutsch</option>
                      <option>🇬🇧 English</option>
                      <option>🇫🇷 Français</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-micro text-smoke block mb-2">Zeitzone</label>
                    <select className={cn(
                      'w-full px-4 py-3 rounded-2xl',
                      'bg-white/[0.045] border border-white/[0.05]',
                      'text-[15px] text-cloud',
                      'focus:outline-none focus:border-primary/30',
                      'appearance-none cursor-pointer'
                    )}>
                      <option>🕐 Europe/Berlin (UTC+1)</option>
                      <option>🕐 Europe/Zurich (UTC+1)</option>
                      <option>🕐 Europe/Vienna (UTC+1)</option>
                    </select>
                  </div>
                </div>
              </SettingsSection>

              {/* Save */}
              <div className="flex justify-end gap-3 pt-2">
                <button className="btn btn-secondary">Verwerfen</button>
                <button className="btn btn-primary">Änderungen speichern</button>
              </div>
            </>
          )}

          {/* ──────────────────────────────────────────────────────
             DARSTELLUNG TAB
             ────────────────────────────────────────────────────── */}
          {tab === 'darstellung' && (
            <>
              {/* Theme */}
              <SettingsSection title="Theme" desc="Wählen Sie Ihr bevorzugtes Erscheinungsbild">
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { id: 'dark' as const, label: 'Dunkel', icon: Moon, preview: 'bg-void', desc: 'Augenfreundlich' },
                    { id: 'light' as const, label: 'Hell', icon: Sun, preview: 'bg-gray-50', desc: 'Klassisch' },
                    { id: 'system' as const, label: 'System', icon: Monitor, preview: 'bg-gradient-to-r from-void to-gray-50', desc: 'Automatisch' },
                  ].map(t => (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id)}
                      className={cn(
                        'p-4 rounded-2xl border text-left transition-all duration-200 group',
                        theme === t.id
                          ? 'border-primary/30 bg-primary/5 shadow-lg shadow-primary/5'
                          : 'border-white/[0.09] bg-white/[0.015] hover:border-white/[0.08] hover:bg-white/[0.025]'
                      )}
                    >
                      <div className={cn('w-full h-16 rounded-lg mb-3 border border-white/[0.06]', t.preview)} />
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[15px] font-medium text-white">{t.label}</p>
                          <p className="text-[15px] text-smoke mt-0.5">{t.desc}</p>
                        </div>
                        {theme === t.id && (
                          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </SettingsSection>

              {/* Accent Color */}
              <SettingsSection title="Akzentfarbe" desc="Primärfarbe für Buttons, Links und Highlights">
                <div className="flex flex-wrap gap-3">
                  {[
                    { color: '#6366f1', name: 'Indigo' },
                    { color: '#8b5cf6', name: 'Violett' },
                    { color: '#06b6d4', name: 'Cyan' },
                    { color: '#10b981', name: 'Smaragd' },
                    { color: '#f59e0b', name: 'Bernstein' },
                    { color: '#ef4444', name: 'Rot' },
                    { color: '#ec4899', name: 'Pink' },
                    { color: '#3b82f6', name: 'Blau' },
                  ].map((c, i) => (
                    <button
                      key={c.color}
                      className={cn(
                        'w-12 h-12 rounded-2xl transition-all duration-200',
                        'hover:scale-110 hover:shadow-lg',
                        'relative group',
                        i === 0 && 'ring-2 ring-white/20 ring-offset-2 ring-offset-obsidian'
                      )}
                      style={{ background: c.color, boxShadow: i === 0 ? `0 0 20px ${c.color}40` : undefined }}
                    >
                      {i === 0 && (
                        <Check className="w-4 h-4 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                      )}
                      <span className={cn(
                        'absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px] font-medium text-smoke',
                        'opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap'
                      )}>
                        {c.name}
                      </span>
                    </button>
                  ))}
                </div>
              </SettingsSection>

              {/* Sidebar */}
              <SettingsSection title="Sidebar" desc="Verhalten der Navigationsleiste">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'fixed' as const, label: 'Fixiert', desc: 'Immer sichtbar' },
                    { id: 'auto' as const, label: 'Auto-Collapse', desc: 'Klappt automatisch ein' },
                  ].map(s => (
                    <button
                      key={s.id}
                      onClick={() => setSidebarBehavior(s.id)}
                      className={cn(
                        'p-4 rounded-2xl border text-left transition-all',
                        sidebarBehavior === s.id
                          ? 'border-primary/30 bg-primary/5'
                          : 'border-white/[0.09] bg-white/[0.015] hover:border-white/[0.08]'
                      )}
                    >
                      <p className="text-[15px] font-medium text-white">{s.label}</p>
                      <p className="text-[15px] text-smoke mt-0.5">{s.desc}</p>
                    </button>
                  ))}
                </div>
              </SettingsSection>

              {/* Density */}
              <SettingsSection title="Informationsdichte" desc="Wie viel Inhalt pro Seite angezeigt wird">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'compact' as const, label: 'Kompakt', lines: 5 },
                    { id: 'default' as const, label: 'Standard', lines: 4 },
                    { id: 'comfortable' as const, label: 'Komfortabel', lines: 3 },
                  ].map(d => (
                    <button
                      key={d.id}
                      onClick={() => setDensity(d.id)}
                      className={cn(
                        'p-4 rounded-2xl border text-center transition-all',
                        density === d.id
                          ? 'border-primary/30 bg-primary/5'
                          : 'border-white/[0.09] bg-white/[0.015] hover:border-white/[0.08]'
                      )}
                    >
                      {/* Visual Preview */}
                      <div className="space-y-1 mb-3 px-2">
                        {Array.from({ length: d.lines }).map((_, i) => (
                          <div
                            key={i}
                            className="h-1.5 bg-white/[0.06] rounded-full"
                            style={{ width: `${70 + Math.random() * 30}%` }}
                          />
                        ))}
                      </div>
                      <p className="text-[15px] font-medium text-white">{d.label}</p>
                    </button>
                  ))}
                </div>
              </SettingsSection>

              {/* Font Size */}
              <SettingsSection title="Schriftgröße" desc="Globale Textgröße anpassen">
                <div className="p-5 rounded-2xl bg-white/[0.015] border border-white/[0.08]">
                  <div className="flex items-center gap-6">
                    <span className="text-[15px] text-smoke shrink-0">A</span>
                    <input
                      type="range"
                      min={12}
                      max={18}
                      value={fontSize}
                      onChange={e => setFontSize(parseInt(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-[18px] text-smoke shrink-0">A</span>
                    <span className="text-[15px] font-semibold text-white tabular-nums w-10 text-right">{fontSize}px</span>
                  </div>
                  {/* Preview */}
                  <div className="mt-4 p-4 rounded-2xl bg-white/[0.045] border border-white/[0.08]">
                    <p className="text-smoke mb-1 text-micro">Vorschau</p>
                    <p style={{ fontSize: `${fontSize}px` }} className="text-cloud leading-relaxed">
                      Dies ist ein Beispieltext zur Vorschau der gewählten Schriftgröße in Ihrem CRM-System.
                    </p>
                  </div>
                </div>
              </SettingsSection>
            </>
          )}

          {/* ──────────────────────────────────────────────────────
             SICHERHEIT TAB
             ────────────────────────────────────────────────────── */}
          {tab === 'sicherheit' && (
            <>
              {/* Security Score */}
              <div className={cn(
                'p-6 rounded-[22px] animate-in',
                'bg-gradient-to-r from-success/5 via-transparent to-transparent',
                'border border-success/10'
              )}>
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-[22px] bg-success/10 flex items-center justify-center shrink-0">
                    <Shield className="w-7 h-7 text-success" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-[17px] font-semibold text-white">Sicherheitsstatus</h2>
                      <span className="text-[15px] font-bold px-2 py-0.5 rounded-full bg-success/10 text-success">Stark</span>
                    </div>
                    <p className="text-[15px] text-smoke mt-0.5">Ihr Konto ist gut geschützt</p>
                    {/* Progress */}
                    <div className="mt-3 h-1.5 bg-white/[0.07] rounded-full overflow-hidden">
                      <div className="h-full w-[85%] bg-gradient-to-r from-success to-success-soft rounded-full" />
                    </div>
                    <p className="text-[15px] text-smoke mt-1">4 von 5 Sicherheitsmaßnahmen aktiv</p>
                  </div>
                </div>
              </div>

              {/* Password */}
              <SettingsSection title="Passwort" desc="Ändern Sie Ihr Zugangspasswort">
                <div className="p-5 rounded-2xl bg-white/[0.015] border border-white/[0.08] space-y-4">
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-smoke" />
                    <input
                      type={showPw ? 'text' : 'password'}
                      placeholder="Aktuelles Passwort"
                      className="input w-full pl-12 pr-12"
                    />
                    <button onClick={() => setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-smoke hover:text-mist transition-colors">
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input type="password" placeholder="Neues Passwort" className="input" />
                    <input type="password" placeholder="Passwort bestätigen" className="input" />
                  </div>
                  <div className="flex justify-end">
                    <button className="btn btn-primary text-[15px]">Passwort ändern</button>
                  </div>
                </div>
              </SettingsSection>

              {/* 2FA */}
              <SettingsSection title="Zwei-Faktor-Authentifizierung">
                <SettingsRow icon={Smartphone} label="Authenticator App" desc="TOTP-basierte Verifizierung">
                  <span className="flex items-center gap-1.5 text-[15px] font-semibold text-success bg-success/10 px-3 py-1 rounded-full">
                    <Check className="w-3.5 h-3.5" />Aktiv
                  </span>
                </SettingsRow>
                <SettingsRow icon={Mail} label="E-Mail Backup" desc="Fallback bei verlorenem Gerät">
                  <span className="text-[15px] text-smoke">lars@cgp-solutions.de</span>
                </SettingsRow>
              </SettingsSection>

              {/* Active Devices */}
              <SettingsSection title="Aktive Geräte" desc="Derzeit angemeldete Sitzungen">
                {[
                  { icon: Laptop, name: 'MacBook Pro', location: 'München, DE', current: true, time: 'Jetzt aktiv', browser: 'Chrome 121' },
                  { icon: Smartphone, name: 'iPhone 15 Pro', location: 'München, DE', current: false, time: 'Vor 2 Stunden', browser: 'Safari Mobile' },
                  { icon: Monitor, name: 'Windows Desktop', location: 'München, DE', current: false, time: 'Gestern, 18:30', browser: 'Firefox 122' },
                ].map((device, i) => (
                  <div key={i} className={cn(
                    'settings-row animate-in'
                  )} style={{ animationDelay: `${i * 40}ms` }}>
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className={cn(
                        'w-10 h-10 rounded-2xl flex items-center justify-center shrink-0',
                        device.current ? 'bg-primary/10' : 'bg-white/[0.055]'
                      )}>
                        <device.icon className={cn('w-5 h-5', device.current ? 'text-primary-light' : 'text-smoke')} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[15px] font-medium text-white">{device.name}</p>
                          {device.current && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary-light">Dieses Gerät</span>
                          )}
                        </div>
                        <p className="text-[15px] text-smoke mt-0.5">
                          {device.browser} · {device.location} · {device.time}
                        </p>
                      </div>
                    </div>
                    {!device.current && (
                      <button className="text-[15px] font-medium text-danger hover:text-danger-soft transition-colors shrink-0">
                        Abmelden
                      </button>
                    )}
                  </div>
                ))}
                <div className="pt-2">
                  <button className="text-[15px] font-medium text-danger hover:text-danger-soft transition-colors">
                    Alle anderen Sitzungen beenden
                  </button>
                </div>
              </SettingsSection>

              {/* Login History */}
              <SettingsSection title="Letzte Anmeldungen">
                <div className="p-5 rounded-2xl bg-white/[0.015] border border-white/[0.08] space-y-3">
                  {[
                    { time: 'Heute, 08:45', ip: '192.168.1.42', location: 'München', status: 'success' },
                    { time: 'Gestern, 17:20', ip: '192.168.1.42', location: 'München', status: 'success' },
                    { time: '12. Jan, 09:15', ip: '10.0.0.55', location: 'Stuttgart', status: 'success' },
                    { time: '10. Jan, 22:03', ip: '85.214.12.8', location: 'Berlin', status: 'failed' },
                  ].map((log, i) => (
                    <div key={i} className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-2 h-2 rounded-full',
                          log.status === 'success' ? 'bg-success' : 'bg-danger'
                        )} />
                        <div>
                          <p className="text-[15px] text-cloud">{log.time}</p>
                          <p className="text-[15px] text-smoke">{log.ip} · {log.location}</p>
                        </div>
                      </div>
                      <span className={cn(
                        'text-[15px] font-semibold px-2 py-0.5 rounded-full',
                        log.status === 'success' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                      )}>
                        {log.status === 'success' ? 'Erfolgreich' : 'Fehlgeschlagen'}
                      </span>
                    </div>
                  ))}
                </div>
              </SettingsSection>
            </>
          )}

          {/* ──────────────────────────────────────────────────────
             BENACHRICHTIGUNGEN TAB
             ────────────────────────────────────────────────────── */}
          {tab === 'benachrichtigungen' && (
            <>
              {/* Email Notifications */}
              <SettingsSection title="E-Mail Benachrichtigungen" desc="Welche E-Mails Sie erhalten möchten">
                <SettingsRow icon={Wrench} label="Einsatz-Updates" desc="Status-Änderungen und neue Einsätze">
                  <Toggle on={notif.emailEinsaetze} onChange={() => setNotif(p => ({ ...p, emailEinsaetze: !p.emailEinsaetze }))} />
                </SettingsRow>
                <SettingsRow icon={ClipboardList} label="Aufgaben-Erinnerungen" desc="Fällige und zugewiesene Aufgaben">
                  <Toggle on={notif.emailAufgaben} onChange={() => setNotif(p => ({ ...p, emailAufgaben: !p.emailAufgaben }))} />
                </SettingsRow>
                <SettingsRow icon={User} label="Kundenaktivität" desc="Neue Notizen und Änderungen">
                  <Toggle on={notif.emailKunden} onChange={() => setNotif(p => ({ ...p, emailKunden: !p.emailKunden }))} />
                </SettingsRow>
              </SettingsSection>

              {/* Push Notifications */}
              <SettingsSection title="Push Benachrichtigungen" desc="Echtzeit-Alerts im Browser">
                <SettingsRow icon={Wrench} label="Einsatz-Alerts" desc="Sofortige Benachrichtigung bei Änderungen">
                  <Toggle on={notif.pushEinsaetze} onChange={() => setNotif(p => ({ ...p, pushEinsaetze: !p.pushEinsaetze }))} />
                </SettingsRow>
                <SettingsRow icon={ClipboardList} label="Aufgaben-Alerts" desc="Wenn Aufgaben fällig werden">
                  <Toggle on={notif.pushAufgaben} onChange={() => setNotif(p => ({ ...p, pushAufgaben: !p.pushAufgaben }))} />
                </SettingsRow>
                <SettingsRow icon={Bell} label="System-Benachrichtigungen" desc="Updates, Wartung und Sicherheit">
                  <Toggle on={notif.pushSystem} onChange={() => setNotif(p => ({ ...p, pushSystem: !p.pushSystem }))} />
                </SettingsRow>
              </SettingsSection>

              {/* Reports */}
              <SettingsSection title="Berichte" desc="Automatische Zusammenfassungen per E-Mail">
                <SettingsRow icon={Calendar} label="Wochenbericht" desc="Jeden Montag um 08:00 Uhr">
                  <Toggle on={notif.wochenbericht} onChange={() => setNotif(p => ({ ...p, wochenbericht: !p.wochenbericht }))} />
                </SettingsRow>
                <SettingsRow icon={Calendar} label="Monatsbericht" desc="Am 1. jeden Monats">
                  <Toggle on={notif.monatsbericht} onChange={() => setNotif(p => ({ ...p, monatsbericht: !p.monatsbericht }))} />
                </SettingsRow>
              </SettingsSection>
            </>
          )}

          {/* ──────────────────────────────────────────────────────
             INTEGRATIONEN TAB
             ────────────────────────────────────────────────────── */}
          {tab === 'integrationen' && (
            <>
              {/* Connected Services */}
              <SettingsSection title="Verbundene Dienste" desc="Externe Plattformen und APIs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { name: 'Google Kalender', desc: 'Termine synchronisieren', icon: Calendar, color: '#4285F4', connected: true, status: 'Synchronisiert' },
                    { name: 'Google Maps', desc: 'Routenplanung & Adressen', icon: Map, color: '#34A853', connected: true, status: 'Aktiv' },
                    { name: 'Slack', desc: 'Team-Benachrichtigungen', icon: Mail, color: '#611f69', connected: false, status: null },
                    { name: 'Buchhaltung', desc: 'Rechnungen & Belege', icon: Database, color: '#6366f1', connected: false, status: null },
                  ].map((svc, i) => (
                    <div
                      key={svc.name}
                      className={cn(
                        'p-5 rounded-2xl border transition-all duration-200 animate-in',
                        svc.connected
                          ? 'bg-white/[0.045] border-white/[0.09]'
                          : 'bg-white/[0.01] border-white/[0.08] hover:border-white/[0.06]'
                      )}
                      style={{ animationDelay: `${i * 40}ms` }}
                    >
                      <div className="flex items-start gap-3 mb-4">
                        <div
                          className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg"
                          style={{ background: `linear-gradient(135deg, ${svc.color}25, ${svc.color}10)` }}
                        >
                          <svc.icon className="w-6 h-6" style={{ color: svc.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[15px] font-medium text-white">{svc.name}</p>
                          <p className="text-[15px] text-smoke mt-0.5">{svc.desc}</p>
                        </div>
                      </div>
                      {svc.connected ? (
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-[15px] font-semibold text-success">
                            <Check className="w-3.5 h-3.5" />{svc.status}
                          </span>
                          <button className="text-[15px] font-medium text-smoke hover:text-danger transition-colors">
                            Trennen
                          </button>
                        </div>
                      ) : (
                        <button className={cn(
                          'w-full py-2.5 rounded-2xl text-[15px] font-medium',
                          'bg-white/[0.055] text-mist border border-white/[0.09]',
                          'hover:bg-white/[0.06] hover:text-white',
                          'transition-all duration-200'
                        )}>
                          Verbinden
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </SettingsSection>

              {/* API Access */}
              <SettingsSection title="API-Zugang" desc="Programmatischer Zugriff auf Ihre Daten">
                <div className="p-5 rounded-2xl bg-white/[0.015] border border-white/[0.08] space-y-4">
                  <div>
                    <label className="text-micro text-smoke block mb-2">API-Schlüssel</label>
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-smoke" />
                        <input
                          type={apiKeyVisible ? 'text' : 'password'}
                          readOnly
                          value="cgp_live_sk_7f8a9b2c3d4e5f6g7h8i9j0k"
                          className="input w-full pl-12 pr-12 font-mono text-[15px]"
                        />
                        <button
                          onClick={() => setApiKeyVisible(!apiKeyVisible)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-smoke hover:text-mist transition-colors"
                        >
                          {apiKeyVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <button className="btn btn-secondary px-3 shrink-0">
                        <Copy className="w-4 h-4" />
                      </button>
                      <button className="btn btn-secondary px-3 shrink-0">
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-[15px] text-smoke mt-2">Erstellt am 15. Jan 2024 · Letzter Zugriff: Heute</p>
                  </div>
                </div>
              </SettingsSection>

              {/* Webhooks */}
              <SettingsSection title="Webhooks" desc="Automatische HTTP-Callbacks bei Ereignissen">
                <div className="p-5 rounded-2xl bg-white/[0.015] border border-white/[0.08] space-y-3">
                  {[
                    { event: 'Einsatz abgeschlossen', url: 'https://api.cgp.de/hooks/service', active: true },
                    { event: 'Neuer Kunde', url: 'https://api.cgp.de/hooks/customer', active: true },
                    { event: 'Aufgabe fällig', url: 'https://api.cgp.de/hooks/task', active: false },
                  ].map((hook, i) => (
                    <div key={i} className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <Webhook className="w-4 h-4 text-smoke shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[15px] font-medium text-white">{hook.event}</p>
                          <p className="text-[15px] text-smoke font-mono truncate">{hook.url}</p>
                        </div>
                      </div>
                      <Toggle on={hook.active} onChange={() => {}} size="sm" />
                    </div>
                  ))}
                  <button className="flex items-center gap-2 text-[15px] font-medium text-primary-light hover:text-white transition-colors pt-2">
                    <Plus className="w-4 h-4" />
                    Webhook hinzufügen
                  </button>
                </div>
              </SettingsSection>
            </>
          )}

        </div>
      </div>
    </div>
  );
}

// Need to import these for the notification section
import { Wrench, ClipboardList, Plus } from 'lucide-react';
