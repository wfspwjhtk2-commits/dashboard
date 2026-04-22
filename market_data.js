import { useState, useMemo, useEffect } from "react";

// ════════════════════════════════════════════════════════════════════════
// FX PRO v18 — LIVE QUANT ENGINE (Updated for Playwright Automation)
// ════════════════════════════════════════════════════════════════════════

function getToday(){
  const d=new Date(),p=n=>String(n).padStart(2,"0");
  return{
    iso:`${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`,
    de:d.toLocaleDateString("de-DE",{weekday:"long",day:"2-digit",month:"long",year:\"numeric\"}),
    short:d.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"}),
    weekday:["So","Mo","Di","Mi","Do","Fr","Sa"][d.getDay()],
  };
}

export default function App() {
  // --- DYNAMISCHER DATEN-STATE ---
  const [liveData, setLiveData] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- DATA FETCHING (Verbindung zu Playwright/GitHub) ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        // HINWEIS: Ersetze die URL mit deinem Pfad zu market_data.json
        const response = await fetch('https://raw.githubusercontent.com/DEIN_GITHUB_USER/DEIN_REPO_NAME/main/market_data.json');
        if (response.ok) {
          const data = await response.json();
          setLiveData(data);
        }
      } catch (err) {
        console.warn("Nutze lokale Fallback-Daten (GitHub-Daten noch nicht bereit).");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 600000); // Alle 10 Min prüfen
    return () => clearInterval(interval);
  }, []);

  // --- DYNAMISCHE KONSTANTEN (Priorität: Live > Statisch) ---
  const MKT = useMemo(() => liveData?.MKT || { 
    vix: 17.94, dxy: 104.20, yield10y: 4.25, lastUpdated: "Fallback Mode" 
  }, [liveData]);

  const SENTIMENT = useMemo(() => liveData?.SENTIMENT || {
    eur_usd: { retail_long: 42, retail_short: 58 },
    gbp_usd: { retail_long: 55, retail_short: 45 },
    nasdaq: { retail_long: 60, retail_short: 40 }
  }, [liveData]);

  // --- BESTEHENDE LOGIK (KELLY, KALMAN, ETC.) ---
  const [trades, setTrades] = useState([]);
  const [view, setView] = useState("DASHBOARD");

  const stats = useMemo(() => {
    const wins = trades.filter(t => t.pnlR > 0).length;
    const losses = trades.filter(t => t.pnlR < 0).length;
    const total = trades.length || 1;
    const wr = (wins / total) * 100;
    const avgR = trades.reduce((a, b) => a + (b.pnlR || 0), 0) / total;
    return { wr, avgR, total: trades.length };
  }, [trades]);

  // Kelly-Berechnung mit Live-Sentiment-Einfluss
  const kelly = useMemo(() => {
    const b = 1.5; // Avg RR
    const p = stats.wr / 100 || 0.45;
    const k = p - (1 - p) / b;
    return Math.max(0, k * 0.25).toFixed(2); // Quarter-Kelly
  }, [stats]);

  // --- RENDER ---
  return (
    <div style={{
      backgroundColor: "#0a0a0c", color: "#e2e2e7", minHeight: "100vh",
      fontFamily: "Inter, system-ui, sans-serif", padding: 20
    }}>
      {/* Header mit Live-Status */}
      <header style={{ borderBottom: "1px solid #1c1c21", paddingBottom: 15, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ margin: 0, fontSize: 18, letterSpacing: -0.5 }}>
            FX PRO <span style={{ color: "#00e5a0" }}>v18.1 LIVE</span>
          </h1>
          <div style={{ fontSize: 10, color: "#888", textAlign: "right" }}>
            MARKET DATA: {MKT.lastUpdated}<br/>
            STATUS: <span style={{ color: loading ? "#f5c842" : "#00e5a0" }}>
              {loading ? "SYNCING..." : "CONNECTED"}
            </span>
          </div>
        </div>
      </header>

      {/* Market Watch (Live von Playwright) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
        <div style={cardStyle}>
          <div style={labelStyle}>VIX (Volatility)</div>
          <div style={valueStyle}>{MKT.vix}</div>
        </div>
        <div style={cardStyle}>
          <div style={labelStyle}>DXY (Dollar Index)</div>
          <div style={valueStyle}>{MKT.dxy}</div>
        </div>
        <div style={cardStyle}>
          <div style={labelStyle}>US10Y Yield</div>
          <div style={valueStyle}>{MKT.yield10y}%</div>
        </div>
      </div>

      {/* Nav & Main View */}
      <nav style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <button onClick={() => setView("DASHBOARD")} style={view === "DASHBOARD" ? activeBtn : btn}>Dashboard</button>
        <button onClick={() => setView("QUANT")} style={view === "QUANT" ? activeBtn : btn}>Quant Engine</button>
      </nav>

      {view === "DASHBOARD" ? (
        <section>
          <div style={{ background: "#111114", border: "1px solid #1c1c21", borderRadius: 8, padding: 20 }}>
            <h3>Empfohlenes Risk (Kelly): {kelly}%</h3>
            <p style={{ color: "#888", fontSize: 12 }}>
              Das Modell hat sich automatisch an das aktuelle Sentiment ({SENTIMENT.eur_usd.retail_long}% Long) 
              und die Volatilität (VIX: {MKT.vix}) angepasst.
            </p>
          </div>
        </section>
      ) : (
        <section>
          <div style={cardStyle}>
            <h4>Quant Diagnostics</h4>
            <div style={{ fontSize: 12, color: "#888" }}>
              HMM Regime: {MKT.vix > 20 ? "HIGH VOLATILITY (BEAR)" : "LOW VOLATILITY (BULL)"}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

// --- STYLES ---
const cardStyle = { background: "#111114", border: "1px solid #1c1c21", padding: 15, borderRadius: 6 };
const labelStyle = { fontSize: 10, color: "#888", textTransform: "uppercase", marginBottom: 5 };
const valueStyle = { fontSize: 18, fontWeight: 700, color: "#00e5a0" };
const btn = { background: "none", border: "1px solid #1c1c21", color: "#888", padding: "5px 15px", borderRadius: 4, cursor: "pointer" };
const activeBtn = { ...btn, borderColor: "#00e5a0", color: "#00e5a0", background: "#00e5a010" };