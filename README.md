# CGP CRM Pro — Optimized Railway Build

Diese Version wurde aus `cgp-crm-pro.zip` erzeugt und als aktueller Projektstand behandelt.

## Was geändert wurde

- Railway-Deployment auf Docker + Caddy stabilisiert.
- `Caddyfile` auf Railway-Port `${PORT}` mit Fallback `8080` umgestellt.
- SPA-Fallback ergänzt: `try_files {path} /index.html`.
- Gzip/Zstd-Kompression und Basis-Security-Header ergänzt.
- `.dockerignore` ergänzt, damit `.env`, `node_modules`, `dist` und Git-Artefakte nicht ins Image kopiert werden.
- `.npmrc` auf öffentliche npm Registry fixiert.
- `package-lock.json` von internen Registry-URLs bereinigt.
- `package.json` mit `overrides.esbuild=0.28.1` ergänzt, damit `npm audit` sauber ist.
- App-Viewport-Handling in `App.tsx` robuster gemacht.
- `.env` wurde wegen Secrets bewusst NICHT in dieses ZIP übernommen.

## Railway Deployment

Railway sollte wegen des vorhandenen `Dockerfile` automatisch den Docker Builder nutzen.

Erforderliche Dateien im Repo-Root:

- `Dockerfile`
- `Caddyfile`
- `.dockerignore`
- `.npmrc`
- `package.json`
- `package-lock.json`

### Railway Start

Keine manuelle Start-Command-Konfiguration nötig. Caddy startet im Runtime-Image.

### Wichtig

Setze Secrets ausschließlich in Railway Variables, nicht in `.env` committen.

## Lokale Prüfung

Ausgeführt:

```bash
npm ci --no-audit --no-fund --registry=https://registry.npmjs.org/
npm run build
npm audit
```

Ergebnis:

```text
npm ci: erfolgreich
npm run build: erfolgreich
npm audit: found 0 vulnerabilities
```

Build-Auszug:

```text
vite v7.3.5 building client environment for production...
✓ 1789 modules transformed.
dist/index.html                 0.70 kB │ gzip: 0.41 kB
dist/assets/index-D8rd2Nj0.css 63.21 kB │ gzip: 10.59 kB
dist/assets/index-DX4qNtqi.js 332.85 kB │ gzip: 95.85 kB
✓ built
```

## Nächste empfohlene Schritte

1. Dieses ZIP entpacken.
2. Inhalt ins Git-Repo übernehmen.
3. Prüfen, dass `.env` nicht committed wird.
4. Änderungen committen und zu Railway pushen.
5. In Railway prüfen, dass Docker Builder verwendet wird.
