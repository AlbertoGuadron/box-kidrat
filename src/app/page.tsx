"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { WorkoutConfig } from "@/lib/types";

const DEFAULT_CONFIG: WorkoutConfig = {
  warmupMinutes: 3,
  restBeforeStart: 10,
  sets: 3,
  rounds: 4,
  roundDuration: 180,
  restBetweenRounds: 60,
  restBetweenSets: 120,
  cooldownMinutes: 2,
};

// ── Shared Ippo style tokens ───────────────────────────────────────────────
const S = {
  card: {
    background: "#111827",
    border: "2px solid #1E2D50",
    borderRadius: 16,
    padding: "20px 20px",
    position: "relative" as const,
    overflow: "hidden" as const,
  },
  label: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontStyle: "italic" as const,
    fontSize: "0.7rem",
    fontWeight: 900,
    letterSpacing: "0.2em",
    textTransform: "uppercase" as const,
    color: "var(--color-muted)",
  },
  sectionTitle: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontStyle: "italic" as const,
    fontWeight: 900,
    fontSize: "1.1rem",
    letterSpacing: "0.12em",
  },
};

// ── Corner accent for cards ────────────────────────────────────────────────
function CornerAccent({ color }: { color: string }) {
  return (
    <div style={{
      position: "absolute", top: 0, left: 0,
      width: 0, height: 0,
      borderStyle: "solid",
      borderWidth: "28px 28px 0 0",
      borderColor: `${color} transparent transparent transparent`,
    }} />
  );
}

// ── Numeric input ──────────────────────────────────────────────────────────
function NumericInput({ label, value, onChange, min, max, suffix, description }: {
  label: string; value: number; onChange: (v: number) => void;
  min: number; max: number; suffix: string; description?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={S.label}>{label}</label>
      {description && <p style={{ ...S.label, textTransform: "none", letterSpacing: 0, fontSize: "0.75rem", fontStyle: "normal", marginTop: -2 }}>{description}</p>}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          style={{
            width: 36, height: 36, borderRadius: 8, border: "2px solid #CC1414",
            background: "transparent", color: "#CC1414",
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: "1.2rem", fontWeight: 900,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.1s",
          }}
        >−</button>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
          <input
            type="number" value={value} min={min} max={max}
            onChange={e => { const v = parseInt(e.target.value, 10); if (!isNaN(v)) onChange(Math.min(max, Math.max(min, v))); }}
            style={{
              width: 56, textAlign: "center",
              fontFamily: "'Barlow Condensed', sans-serif", fontStyle: "italic",
              fontSize: "1.6rem", fontWeight: 900,
              background: "#0A0F1E", color: "var(--color-fg)",
              border: "2px solid #1E2D50", borderRadius: 8,
              padding: "2px 0", outline: "none",
            }}
          />
          <span style={{ color: "var(--color-muted)", fontSize: "0.8rem", fontFamily: "'Barlow Condensed', sans-serif" }}>{suffix}</span>
        </div>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          style={{
            width: 36, height: 36, borderRadius: 8, border: "2px solid #CC1414",
            background: "transparent", color: "#CC1414",
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: "1.2rem", fontWeight: 900,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.1s",
          }}
        >+</button>
      </div>
    </div>
  );
}

// ── Section card ───────────────────────────────────────────────────────────
function SectionCard({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div style={{ ...S.card, borderColor: `${color}55` }}>
      <CornerAccent color={color} />
      <p style={{ ...S.sectionTitle, color, marginBottom: 16, paddingLeft: 24 }}>{title}</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 20 }}>
        {children}
      </div>
    </div>
  );
}

// ── Summary ────────────────────────────────────────────────────────────────
function WorkoutSummary({ config }: { config: WorkoutConfig }) {
  const totalRounds = config.sets * config.rounds;
  const totalSec =
    config.warmupMinutes * 60 + config.restBeforeStart +
    totalRounds * config.roundDuration +
    (totalRounds - config.sets) * config.restBetweenRounds +
    Math.max(0, config.sets - 1) * config.restBetweenSets +
    config.cooldownMinutes * 60;
  const totalMin = Math.round(totalSec / 60);

  return (
    <div style={{
      background: "linear-gradient(135deg, #CC141422 0%, #1040A022 100%)",
      border: "2px solid #CC141444",
      borderRadius: 16, padding: "16px 20px",
      display: "flex", flexWrap: "wrap", gap: 16,
      alignItems: "center", justifyContent: "space-between",
      position: "relative", overflow: "hidden",
    }}>
      {/* Red stripe accent */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, #CC1414, #1040A0)" }} />
      <div>
        <p style={{ ...S.label, color: "#FFD700" }}>Entrenamiento</p>
        <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontStyle: "italic", fontSize: "2.5rem", fontWeight: 900, color: "var(--color-fg)", lineHeight: 1, marginTop: 2 }}>
          ~{totalMin} <span style={{ fontSize: "1rem", color: "var(--color-muted)" }}>min</span>
        </p>
      </div>
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        {[
          { v: config.sets, l: "Series" },
          { v: `×${config.rounds}`, l: "Rounds" },
          { v: totalRounds, l: "Total" },
          { v: `${Math.floor(config.roundDuration / 60)}:${(config.roundDuration % 60).toString().padStart(2, "0")}`, l: "Por round" },
        ].map(({ v, l }) => (
          <div key={l} style={{ textAlign: "center" }}>
            <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontStyle: "italic", fontSize: "1.8rem", fontWeight: 900, color: "#FFD700", lineHeight: 1 }}>{v}</p>
            <p style={{ fontSize: "0.7rem", color: "var(--color-muted)" }}>{l}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ConfigPage() {
  const router = useRouter();
  const [config, setConfig] = useState<WorkoutConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    const saved = localStorage.getItem("boxing-config");
    if (saved) { try { setConfig({ ...DEFAULT_CONFIG, ...JSON.parse(saved) }); } catch {} }
  }, []);

  const update = <K extends keyof WorkoutConfig>(k: K, v: WorkoutConfig[K]) =>
    setConfig(prev => ({ ...prev, [k]: v }));

  const handleStart = () => {
    localStorage.setItem("boxing-config", JSON.stringify(config));
    router.push("/train");
  };

  return (
    <main style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", background: "var(--color-bg)", position: "relative", zIndex: 1 }}>

      {/* ── Header — Ippo logo style ── */}
      <header style={{
        padding: "14px 20px",
        borderBottom: "2px solid #1E2D50",
        display: "flex", alignItems: "center", gap: 14,
        background: "#0A0F1E",
        position: "relative",
      }}>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, #CC1414 40%, #1040A0 100%)" }} />
        {/* Logo mark */}
        <div style={{
          width: 44, height: 44, borderRadius: 8,
          background: "linear-gradient(135deg, #CC1414, #8B0000)",
          border: "2px solid #FF333366",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 0 12px #CC141466",
        }}>
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontStyle: "italic", fontWeight: 900, fontSize: "1.3rem", color: "#fff" }}>B</span>
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontStyle: "italic", fontWeight: 900, fontSize: "1.6rem", color: "#1040A0", WebkitTextStroke: "1px #000", paintOrder: "stroke fill" as unknown as undefined }}>KD BOXING</span>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontStyle: "italic", fontWeight: 900, fontSize: "1.6rem", color: "#CC1414", WebkitTextStroke: "1px #000", paintOrder: "stroke fill" as unknown as undefined }}>TRAINER</span>
          </div>
          <p style={{ fontSize: "0.7rem", color: "#FFD700", fontFamily: "'Barlow Condensed', sans-serif", fontStyle: "italic", letterSpacing: "0.15em" }}>THE FIGHTING!</p>
        </div>
      </header>

      {/* ── Content ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 14 }}>
          <WorkoutSummary config={config} />

          <SectionCard title="CALENTAMIENTO" color="#F97316">
            <NumericInput label="Duración" value={config.warmupMinutes} onChange={v => update("warmupMinutes", v)} min={1} max={15} suffix="min" description="Tiempo de calentamiento" />
            <NumericInput label="Descanso antes de empezar" value={config.restBeforeStart} onChange={v => update("restBeforeStart", v)} min={5} max={120} suffix="seg" description="Pausa entre calentamiento y Round 1" />
          </SectionCard>

          <SectionCard title="SERIES DE ROUNDS" color="#FFD700">
            <NumericInput label="Cantidad de series" value={config.sets} onChange={v => update("sets", v)} min={1} max={10} suffix="series" description="Bloques de rounds" />
            <NumericInput label="Rounds por serie" value={config.rounds} onChange={v => update("rounds", v)} min={1} max={12} suffix="rounds" />
            <NumericInput label="Descanso entre series" value={config.restBetweenSets} onChange={v => update("restBetweenSets", v)} min={10} max={300} suffix="seg" />
          </SectionCard>

          <SectionCard title="ROUNDS" color="#1040A0">
            <NumericInput label="Duración por round" value={config.roundDuration} onChange={v => update("roundDuration", v)} min={30} max={600} suffix="seg" description="Tiempo activo por round" />
            <NumericInput label="Descanso entre rounds" value={config.restBetweenRounds} onChange={v => update("restBetweenRounds", v)} min={10} max={300} suffix="seg" />
          </SectionCard>

          <SectionCard title="ENFRIAMIENTO" color="#7B8DB0">
            <NumericInput label="Duración" value={config.cooldownMinutes} onChange={v => update("cooldownMinutes", v)} min={1} max={15} suffix="min" description="Tiempo de enfriamiento al finalizar" />
          </SectionCard>

          {/* Moves */}
          <div style={{ ...S.card, borderColor: "#1E2D50" }}>
            <CornerAccent color="#CC1414" />
            <p style={{ ...S.sectionTitle, color: "#CC1414", marginBottom: 10, paddingLeft: 24 }}>COMBINACIONES</p>
            <p style={{ fontSize: "0.82rem", color: "var(--color-muted)", lineHeight: 1.6, marginBottom: 12 }}>
              Siempre inician con <strong style={{ color: "var(--color-fg)" }}>Jab o Recto</strong>. Progresan de 3 a 6 golpes. 100% aleatorio cada sesión.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {[
                { m: "Jab", c: "#F97316" }, { m: "Recto", c: "#FB923C" },
                { m: "Upper Derecho", c: "#EF4444" }, { m: "Upper Izquierdo", c: "#EC4899" },
                { m: "Gancho Derecho", c: "#A855F7" }, { m: "Gancho Izquierdo", c: "#3B82F6" },
              ].map(({ m, c }) => (
                <span key={m} style={{
                  fontFamily: "'Barlow Condensed', sans-serif", fontStyle: "italic",
                  fontSize: "0.8rem", fontWeight: 700, padding: "3px 10px",
                  borderRadius: 6, background: `${c}18`,
                  color: c, border: `1.5px solid ${c}44`,
                }}>{m}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Start button ── */}
      <div style={{ padding: "14px 16px", borderTop: "2px solid #1E2D50", background: "#0A0F1E", position: "relative", zIndex: 1 }}>
        <button
          onClick={handleStart}
          style={{
            width: "100%", maxWidth: 720, margin: "0 auto", display: "flex",
            alignItems: "center", justifyContent: "center", gap: 10,
            padding: "16px", borderRadius: 12,
            background: "linear-gradient(135deg, #CC1414, #8B0000)",
            border: "3px solid #FF333366",
            color: "#fff", cursor: "pointer",
            fontFamily: "'Barlow Condensed', sans-serif", fontStyle: "italic",
            fontSize: "1.4rem", fontWeight: 900, letterSpacing: "0.15em",
            boxShadow: "0 0 20px #CC141466",
            transition: "all 0.15s",
            WebkitTextStroke: "1px #00000066",
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
          ¡A ENTRENAR!
        </button>
      </div>
    </main>
  );
}
