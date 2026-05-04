# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repo-Umfang

Das Repository enthält aktuell genau eine Quelldatei: `market_data.js`. Es gibt keine `package.json`, keine Build-Konfiguration, kein Lockfile und keinen Test-Runner. Die Komponente ist dazu gedacht, in einer übergeordneten React-Anwendung (Vite / CRA / Next.js) konsumiert zu werden — sie wird nicht aus diesem Repo heraus gebaut. Erfinde keine Build-/Lint-/Test-Befehle; falls Tooling nötig wird, kläre das vorher mit dem Nutzer ab.

## Was `market_data.js` ist

Eine einzelne React-Dashboard-Datei ("FX PRO v18 — LIVE QUANT ENGINE") mit zwei Tabs (`DASHBOARD`, `QUANT`). Default-Export ist `App`. Kommentare und UI-Texte sind auf Deutsch — diese Sprache bei Bearbeitungen beibehalten.

### Datenfluss (das, wofür man die ganze Datei lesen muss)

1. Beim Mount pollt `useEffect` alle 10 Minuten eine entfernte `market_data.json` per `fetch` (`market_data.js:23-41`). Die URL enthält Platzhalter (`DEIN_GITHUB_USER/DEIN_REPO_NAME`), die der Endnutzer durch eine eigene GitHub-Raw-URL ersetzen muss.
2. Die JSON wird außerhalb dieses Repos von einer Playwright-Scraping-Pipeline erzeugt (nur in Kommentaren erwähnt — die Pipeline liegt nicht hier).
3. Die Live-Daten werden in zwei `useMemo`-Konstanten gemerged — `MKT` (VIX, DXY, US10Y) und `SENTIMENT` (Retail Long/Short pro Instrument) — mit hartkodierten Fallback-Werten, falls der Fetch fehlschlägt (`market_data.js:44-52`). Neue Live-Felder müssen demselben Live-oder-Fallback-Muster folgen; die UI liest immer aus `MKT` / `SENTIMENT`, niemals direkt aus `liveData`.
4. `stats` und `kelly` (`market_data.js:58-73`) berechnen Metriken aus einem `trades`-State-Array, das aktuell nie befüllt wird — es gibt keine Trade-Eingabe-UI. Quarter-Kelly-Sizing (`k * 0.25`) und durchschnittliches RR (`b = 1.5`) sind Konstanten in der Komponente.
5. Das HMM-"Regime"-Label im Quant-View ist nur ein Ternär auf `MKT.vix > 20` (`market_data.js:133`), kein echtes Modell.

### Styling

Inline-Style-Objekte am Ende der Datei (`cardStyle`, `labelStyle`, `valueStyle`, `btn`, `activeBtn`). Das Theme ist dunkel (`#0a0a0c` Hintergrund, `#00e5a0` Akzent). Es gibt keine CSS-Datei und kein Styling-Framework — neue Styles inline halten und die existierenden Konstanten wiederverwenden.

## Bekannte Probleme

- Zeile 11 enthält ein escaptes Anführungszeichen (`year:\"numeric\"`) innerhalb eines Template-Literals, das so nicht als JavaScript parst. Bei jeder substantiellen Bearbeitung der Datei muss das gefixt oder zumindest beachtet werden — nicht davon ausgehen, dass die Datei in der aktuellen Form lauffähig ist.
- Die Fetch-URL ist ein Platzhalter und liefert 404, bis sie ersetzt wird.

## Git-Workflow

Aktiver Entwicklungs-Branch für diese Aufgabe: `claude/add-claude-documentation-tg4Es`. Push mit `git push -u origin <branch>`. Keinen PR öffnen, außer der Nutzer fordert es ausdrücklich.
