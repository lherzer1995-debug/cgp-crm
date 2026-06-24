
import { ClerkLoaded, ClerkLoading, Show, SignIn } from '@clerk/react';
import { ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { SkeletonBlock } from '../ui/common';

export function MissingClerkConfig() {
  return (
    <div className="min-h-screen bg-[#0b0f17] p-6 text-white">
      <div className="mx-auto mt-16 max-w-2xl rounded-[32px] border border-warning/25 bg-[#111722] p-8 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-warning/10 text-warning">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-[28px] font-semibold tracking-[-0.04em]">Clerk ist noch nicht konfiguriert</h1>
            <p className="mt-1 text-[14px] text-smoke">Ohne Publishable Key startet die Anmeldung nicht.</p>
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-white/[0.08] bg-black/15 p-5">
          <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-smoke">Railway Setup</p>
          <ol className="mt-3 space-y-3 text-[14px] leading-6 text-mist">
            <li>1. In Clerk den Publishable Key und den Secret Key aus dem Dashboard kopieren.</li>
            <li>2. In Railway setzen: <code className="rounded bg-white/[0.08] px-1.5 py-0.5 text-cloud">VITE_CLERK_PUBLISHABLE_KEY</code>, <code className="rounded bg-white/[0.08] px-1.5 py-0.5 text-cloud">CLERK_SECRET_KEY</code>, <code className="rounded bg-white/[0.08] px-1.5 py-0.5 text-cloud">APP_ADMIN_USER_IDS</code> und <code className="rounded bg-white/[0.08] px-1.5 py-0.5 text-cloud">DATA_DIR=/data</code>.</li>
            <li>3. Prüfe, dass das Railway-Volume auf <code className="rounded bg-white/[0.08] px-1.5 py-0.5 text-cloud">/data</code> gemountet ist und die Clerk-Domain in der Clerk-Konsole freigegeben wurde.</li>
            <li>4. Neu deployen, damit Vite den Frontend-Key ins Bundle schreibt und der Server zur Laufzeit den Secret Key laden kann.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <>
      <ClerkLoading>
        <div className="min-h-screen bg-[#0b0f17] p-6">
          <div className="mx-auto mt-16 max-w-4xl space-y-4">
            <SkeletonBlock className="h-20" />
            <SkeletonBlock className="h-[420px]" />
          </div>
        </div>
      </ClerkLoading>

      <ClerkLoaded>
        <Show when="signed-out">
          <div className="min-h-screen bg-[#0b0f17] p-6 text-white">
            <div className="mx-auto mt-12 grid max-w-6xl gap-6 lg:grid-cols-[1.1fr_.9fr]">
              <section className="rounded-[32px] border border-white/[0.08] bg-[#111722] p-8">
                <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-smoke">Service Operations CRM</p>
                <h1 className="mt-4 max-w-xl text-[44px] font-semibold tracking-[-0.06em] leading-[1.02]">
                  Einsätze, Aufgaben und Kundenkontext in einer Arbeitsoberfläche.
                </h1>
                <p className="mt-4 max-w-xl text-[16px] leading-7 text-smoke">
                  Kein generisches CRM, sondern ein operatives Werkzeug für Servicebetriebe mit Außendienst, Rückrufen und belastbaren Übergaben.
                </p>
                <div className="mt-8 grid gap-3 md:grid-cols-3">
                  {[
                    ['Tageslage statt Dashboard-Show', 'überfällige Aufgaben, Risikokunden und offene Einsätze zuerst'],
                    ['Nachvollziehbare Arbeit', 'Statuswechsel, Notizen und Verantwortung bleiben sichtbar'],
                    ['Schnell planbar', 'Einsätze, Folgeaufgaben und Kalendereinträge ohne Kontextverlust'],
                  ].map(([title, text]) => (
                    <div key={title} className="rounded-3xl border border-white/[0.08] bg-black/15 p-4">
                      <p className="text-[14px] font-semibold text-white">{title}</p>
                      <p className="mt-2 text-[13px] leading-6 text-smoke">{text}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-[32px] border border-white/[0.08] bg-[#0f1622] p-6 shadow-2xl">
                <SignIn
                  routing="hash"
                  appearance={{
                    elements: {
                      rootBox: 'w-full',
                      card: 'shadow-none bg-transparent border-0',
                    },
                  }}
                />
              </section>
            </div>
          </div>
        </Show>

        <Show when="signed-in">{children}</Show>
      </ClerkLoaded>
    </>
  );
}
