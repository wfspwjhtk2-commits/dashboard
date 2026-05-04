// Scraper für market_data.json. Läuft via .github/workflows/scrape.yml alle 10 Min.
//
// Datenquellen:
//   - VIX, DXY-Proxy, US10Y: Yahoo Finance Chart-API (öffentlich, kein Key).
//   - SENTIMENT (Retail Long/Short): aktuell deterministisch synthetisiert aus
//     dem aktuellen VIX, weil keine zuverlässige Public-API existiert.
//     Wenn echtes Sentiment gebraucht wird, hier durch Playwright-Scrape von
//     z.B. Myfxbook / IG Public Sentiment ersetzen.

import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "..", "public", "market_data.json");

const SYMBOLS = {
  vix: "%5EVIX",        // ^VIX
  dxy: "DX-Y.NYB",      // ICE U.S. Dollar Index
  yield10y: "%5ETNX",   // ^TNX (10-Year Treasury Yield, in %)
};

async function fetchYahoo(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
  const res = await fetch(url, {
    headers: {
      // Yahoo gibt ohne UA gelegentlich 401 zurück.
      "User-Agent": "Mozilla/5.0 (compatible; fx-pro-dashboard-scraper/1.0)",
      "Accept": "application/json",
    },
  });
  if (!res.ok) throw new Error(`Yahoo ${symbol} HTTP ${res.status}`);
  const json = await res.json();
  const price = json?.chart?.result?.[0]?.meta?.regularMarketPrice;
  if (typeof price !== "number") throw new Error(`Yahoo ${symbol}: kein regularMarketPrice`);
  return Number(price.toFixed(2));
}

function deriveSentiment(vix) {
  // Heuristik: bei hoher Vola flüchten Retail-Trader in "Long Safe / Short Risk".
  // Pure Demo-Logik, kein echtes Sentiment.
  const fear = Math.min(1, Math.max(0, (vix - 12) / 25)); // 0..1
  const eurLong = Math.round(50 - fear * 20);
  const gbpLong = Math.round(55 - fear * 15);
  const ndxLong = Math.round(60 + fear * 10);
  const pair = (long) => ({ retail_long: long, retail_short: 100 - long });
  return {
    eur_usd: pair(eurLong),
    gbp_usd: pair(gbpLong),
    nasdaq:  pair(Math.min(95, ndxLong)),
  };
}

async function main() {
  const results = await Promise.allSettled([
    fetchYahoo(SYMBOLS.vix),
    fetchYahoo(SYMBOLS.dxy),
    fetchYahoo(SYMBOLS.yield10y),
  ]);

  // Bei Fehlschlag eines Symbols nutzen wir Sentinel-Werte und melden's im
  // lastUpdated-Feld, statt den ganzen Run abzubrechen.
  const FALLBACK = { vix: 17.94, dxy: 104.20, yield10y: 4.25 };
  const [vixR, dxyR, yldR] = results;
  const failures = [];
  const vix      = vixR.status === "fulfilled" ? vixR.value : (failures.push("VIX"), FALLBACK.vix);
  const dxy      = dxyR.status === "fulfilled" ? dxyR.value : (failures.push("DXY"), FALLBACK.dxy);
  const yield10y = yldR.status === "fulfilled" ? yldR.value : (failures.push("US10Y"), FALLBACK.yield10y);

  const now = new Date();
  const ts = now.toISOString().replace("T", " ").slice(0, 16) + " UTC";
  const note = failures.length ? ` (Fallback: ${failures.join(", ")})` : "";

  const payload = {
    MKT: { vix, dxy, yield10y, lastUpdated: ts + note },
    SENTIMENT: deriveSentiment(vix),
  };

  writeFileSync(OUT, JSON.stringify(payload, null, 2) + "\n", "utf8");
  console.log(`Wrote ${OUT}`);
  console.log(JSON.stringify(payload, null, 2));
  if (failures.length) {
    console.error(`Teilfehlschlag: ${failures.join(", ")}`);
    // Exit 0 trotzdem — wir wollen den partiellen Snapshot publishen.
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
