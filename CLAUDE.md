# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Was das ist

Statisches React-Dashboard ("FX PRO v18 — LIVE QUANT ENGINE"), gehostet auf GitHub Pages, mit zwei Tabs (`DASHBOARD`, `QUANT`). Live-Marktdaten werden von einem GitHub-Actions-Scraper alle ~10 Minuten erzeugt und als statische JSON neben das Bundle gelegt. Comments und UI-Texte sind auf Deutsch — diese Sprache bei Bearbeitungen beibehalten.

## Befehle

```
npm install        # Dependencies (Vite, React)
npm run dev        # Dev-Server (Vite), Hot-Reload
npm run build      # Produktions-Build nach dist/
npm run preview    # dist/ lokal servieren
npm run scrape     # Scraper einmal lokal laufen lassen → public/market_data.json
```

Es gibt keinen Test-Runner und keinen Linter im Repo. Nicht erfinden.

## Architektur (das, was mehrere Files berührt)

### Datenfluss

1. `scripts/scrape.mjs` läuft via `.github/workflows/scrape.yml` (cron `*/10 * * * *`) und holt VIX, DXY und US10Y von Yahoos öffentlicher Chart-API. SENTIMENT wird *deterministisch aus VIX abgeleitet* — kein echter Sentiment-Scrape. Wenn echtes Retail-Sentiment gewünscht ist, hier durch Playwright-Scrape (z.B. Myfxbook) ersetzen.
2. Der Workflow committet die fertige `market_data.json` direkt auf den `gh-pages`-Branch (nicht auf `main`), damit kein voller Vite-Rebuild pro Datenupdate nötig ist.
3. `src/App.jsx` pollt im Browser alle 10 Minuten `${BASE_URL}market_data.json?t=<now>` (Cache-Buster, `cache: "no-store"`). Bei Fetch-Fehler oder fehlender Datei greift sie auf hartkodierte Fallback-Werte zurück.
4. UI liest *immer* aus den `useMemo`-Konstanten `MKT` und `SENTIMENT`, niemals direkt aus `liveData`. Neue Live-Felder müssen demselben Live-oder-Fallback-Muster folgen (`src/App.jsx:43-52`).

### Deploy

- `.github/workflows/deploy.yml` baut bei jedem Push auf `main` mit Vite und published `dist/` via `peaceiris/actions-gh-pages` mit `force_orphan: true` auf den `gh-pages`-Branch.
- Vor dem Build läuft `npm run scrape` (best-effort, `continue-on-error`) damit der initiale Deploy schon Live-Werte enthält.
- `vite.config.js` setzt `base` aus `VITE_BASE` (vom Workflow auf `/<repo-name>/` gesetzt) — lokal default `/dashboard/`. Falls das Repo umbenannt wird oder unter Custom Domain läuft, hier anpassen.
- `concurrency: gh-pages` verhindert, dass Deploy und Scraper sich gegenseitig auf demselben Branch überschreiben.

### Komponentenlogik (`src/App.jsx`)

- `stats` und `kelly` (`src/App.jsx:58-73`) berechnen Metriken aus `trades`. Das Array wird aktuell nicht befüllt — es gibt keine Trade-Eingabe-UI. Quarter-Kelly (`k * 0.25`) und durchschnittliches RR (`b = 1.5`) sind Konstanten.
- HMM-"Regime"-Label im Quant-View ist nur ein Ternär auf `MKT.vix > 20` (`src/App.jsx:136`), kein echtes Modell.
- Inline-Style-Objekte am Ende der Datei (`cardStyle`, `labelStyle`, `valueStyle`, `btn`, `activeBtn`). Theme dunkel (`#0a0a0c` Hintergrund, `#00e5a0` Akzent). Kein CSS-File, kein Framework — Styles inline halten und Konstanten wiederverwenden.

## Bekannte Bedingungen

- Yahoos Chart-API ist undokumentiert und kann sich ohne Vorwarnung ändern. Der Scraper hat per-Symbol Fallbacks und schreibt auch bei Teilfehlschlag eine vollständige `market_data.json` (mit `"(Fallback: …)"` im `lastUpdated`-Feld).
- Der Scraper-Workflow überspringt sich selbst, solange der `gh-pages`-Branch noch nicht existiert. Erst-Setup: einmal Deploy laufen lassen (oder `workflow_dispatch`), danach läuft der Cron.
- `getToday()` (`src/App.jsx:7-15`) wird im Header verwendet; bei Bearbeitungen daran denken, dass die Funktion lokale Browserzeit liefert, der Scraper-Timestamp aber UTC ist.

## Git-Workflow

Aktiver Entwicklungs-Branch für diese Aufgabe: `claude/add-claude-documentation-tg4Es`. Push mit `git push -u origin <branch>`. Keinen PR öffnen, außer der Nutzer fordert es ausdrücklich.
