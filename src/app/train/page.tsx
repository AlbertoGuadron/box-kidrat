"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import type { WorkoutConfig, TrainingPhase, Serie } from "@/lib/types";
import { generateComboForRound, formatTime, MOVE_COLORS } from "@/lib/boxing";

const DEFAULT_CONFIG: WorkoutConfig = {
  warmupMinutes: 3, restBeforeStart: 10, sets: 3, rounds: 4,
  roundDuration: 180, restBetweenRounds: 60, restBetweenSets: 120, cooldownMinutes: 2,
};

// ── Audio ─────────────────────────────────────────────────────────────────
let audioCtx: AudioContext | null = null;
function getAudioCtx(): AudioContext {
  if (!audioCtx) audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  return audioCtx;
}
function playTone(freq: number, endFreq: number, dur: number, type: OscillatorType, vol: number, t0 = 0) {
  try {
    const ctx = getAudioCtx(); const t = ctx.currentTime + t0;
    const osc = ctx.createOscillator(); const g = ctx.createGain();
    osc.connect(g); g.connect(ctx.destination);
    osc.type = type; osc.frequency.setValueAtTime(freq, t);
    if (endFreq !== freq) osc.frequency.exponentialRampToValueAtTime(endFreq, t + dur * 0.8);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.start(t); osc.stop(t + dur);
  } catch {}
}
function playNoise(f1: number, f2: number, dur: number, vol: number, t0 = 0) {
  try {
    const ctx = getAudioCtx(); const t = ctx.currentTime + t0;
    const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
    const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const flt = ctx.createBiquadFilter(); flt.type = "bandpass"; flt.Q.value = 1.5;
    flt.frequency.setValueAtTime(f1, t); flt.frequency.exponentialRampToValueAtTime(f2, t + dur * 0.8);
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(flt); flt.connect(g); g.connect(ctx.destination); src.start(t); src.stop(t + dur);
  } catch {}
}
function playBeep() { playTone(1400, 900, 0.08, "square", 0.22); }
function playBell() {
  [440, 880, 1320, 2200, 3300].forEach((f, i) => playTone(f, f, 1.2 - i * 0.15, "sine", [0.5, 0.35, 0.25, 0.15, 0.08][i]));
  playTone(3500, 500, 0.04, "square", 0.2);
}
function playFight() {
  playNoise(200, 4000, 0.18, 0.35);
  playTone(120, 40, 0.22, "sine", 0.55, 0.14);
  playTone(2200, 800, 0.08, "square", 0.18, 0.14);
  playTone(660, 660, 0.12, "triangle", 0.2, 0.3);
}
function playGong() {
  // Deep resonant gong — low-frequency harmonics with long decay
  [55, 110, 165, 247].forEach((f, i) => playTone(f, f * 0.88, 3.5 - i * 0.5, "sine", [0.65, 0.35, 0.18, 0.1][i]));
  playTone(600, 180, 0.14, "square", 0.28);
  playNoise(1200, 3500, 0.09, 0.3);
}
function playCelebration() {
  // Ascending arpeggio — C major pentatonic
  [262, 330, 392, 524, 659].forEach((f, i) => {
    playTone(f, f, 0.35, "triangle", 0.38, i * 0.13);
    playTone(f * 2, f * 2, 0.18, "sine", 0.12, i * 0.13 + 0.02);
  });
  // Final victory chord
  [524, 659, 784].forEach((f, i) => playTone(f, f, 1.8, "sine", 0.28 - i * 0.04, 0.7));
  // Sparkle bells
  [1047, 1319, 1568, 2093].forEach((f, i) => playTone(f, f * 1.25, 0.55, "sine", 0.13, 0.68 + i * 0.1));
}

// ── Speed lines ───────────────────────────────────────────────────────────
function SpeedLines({ color, intensity = 1 }: { color: string; intensity?: number }) {
  const lines = Array.from({ length: 28 }, (_, i) => {
    const angle = (i / 28) * 360;
    const rad = (angle * Math.PI) / 180;
    const r1 = 18 + (i % 4) * 3;
    return { x1: 50 + Math.cos(rad) * r1, y1: 50 + Math.sin(rad) * r1, x2: 50 + Math.cos(rad) * 90, y2: 50 + Math.sin(rad) * 90, thick: i % 5 === 0 };
  });
  return (
    <svg viewBox="0 0 100 100" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.09 * intensity, pointerEvents: "none" }}>
      {lines.map((l, i) => <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={color} strokeWidth={l.thick ? "1.2" : "0.4"} />)}
    </svg>
  );
}

// ── Circular timer ────────────────────────────────────────────────────────
function CircularTimer({ timeLeft, total, color }: { timeLeft: number; total: number; color: string }) {
  const R = 50; const C = 2 * Math.PI * R;
  const off = C * (1 - (total > 0 ? timeLeft / total : 0));
  const urgent = timeLeft <= 5 && timeLeft > 0;
  return (
    <div style={{ position: "relative", width: 140, height: 140, flexShrink: 0 }}>
      <svg width="140" height="140" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="70" cy="70" r={R} fill="none" stroke="#1E2D50" strokeWidth="8" />
        <circle cx="70" cy="70" r={R} fill="none" stroke={urgent ? "#EF4444" : color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={off} style={{ transition: "stroke-dashoffset 0.9s linear, stroke 0.2s" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span className={urgent ? "countdown-flash manga-outline-sm" : ""} style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontStyle: "italic",
          fontSize: "1.9rem", fontWeight: 900,
          color: urgent ? "#EF4444" : "var(--color-fg)", lineHeight: 1,
        }}>
          {formatTime(timeLeft)}
        </span>
      </div>
    </div>
  );
}

// ── Move pill ─────────────────────────────────────────────────────────────
function MovePill({ move, size = "md" }: { move: string; size?: "sm" | "md" | "xl" }) {
  const color = MOVE_COLORS[move as keyof typeof MOVE_COLORS] || "#F97316";
  const s = { sm: { fs: "0.72rem", p: "3px 10px" }, md: { fs: "1rem", p: "6px 14px" }, xl: { fs: "clamp(1.1rem, 3.5vw, 1.6rem)", p: "10px 18px" } }[size];
  return (
    <span style={{
      fontFamily: "'Barlow Condensed', sans-serif", fontStyle: "italic",
      fontSize: s.fs, fontWeight: 900, padding: s.p, borderRadius: 8,
      background: `${color}18`, color,
      border: `2px solid ${color}66`, whiteSpace: "nowrap",
      letterSpacing: "0.04em",
    }}>{move}</span>
  );
}

// ── Combo preview card ────────────────────────────────────────────────────
function ComboPreview({ combo, label }: { combo: Serie; label: string }) {
  return (
    <div style={{
      background: "#111827", border: "2px solid #1E2D50", borderRadius: 14,
      padding: "14px 16px", position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, #CC1414, #1040A0)" }} />
      <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontStyle: "italic", fontSize: "0.65rem", fontWeight: 900, letterSpacing: "0.2em", color: "#FFD700", textTransform: "uppercase", marginBottom: 10 }}>
        {label}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "flex-end" }}>
        {combo.map((move, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <MovePill move={move} size="sm" />
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "0.6rem", fontWeight: 900, color: "var(--color-muted)" }}>{i + 1}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Announcement overlay ──────────────────────────────────────────────────
function Announcement({ text, color, visible }: { text: string; color: string; visible: boolean }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 60,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: visible ? "#0A0F1Eee" : "transparent",
      pointerEvents: "none",
      transition: "background 0.4s",
    }}>
      {visible && <SpeedLines color={color} intensity={3} />}
      <span className="manga-outline" style={{
        fontFamily: "'Barlow Condensed', sans-serif", fontStyle: "italic",
        fontSize: "clamp(4rem, 15vw, 9rem)", fontWeight: 900,
        color, letterSpacing: "0.04em",
        opacity: visible ? 1 : 0,
        transform: visible ? "scale(1)" : "scale(1.4)",
        transition: "opacity 0.4s ease-out, transform 0.4s ease-out",
      }}>{text}</span>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────
export default function TrainPage() {
  const router = useRouter();
  const [config, setConfig] = useState<WorkoutConfig | null>(null);
  const [phase, setPhase] = useState<TrainingPhase>("idle");
  const [currentSet, setCurrentSet] = useState(1);
  const [currentRound, setCurrentRound] = useState(1);
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [combo, setCombo] = useState<Serie>([]);
  const [nextComboData, setNextComboData] = useState<{ combo: Serie; label: string } | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [announcementVisible, setAnnouncementVisible] = useState(false);

  const phaseRef = useRef<TrainingPhase>("idle");
  const setRef = useRef(1);
  const roundRef = useRef(1);
  const timeLeftRef = useRef(0);
  const configRef = useRef<WorkoutConfig | null>(null);
  const isPausedRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  // KEY FIX: store the pre-generated combo so the round uses the same one shown during rest
  const upcomingComboRef = useRef<Serie | null>(null);
  const wakeLockRef = useRef<{ release: () => Promise<void> } | null>(null);

  isPausedRef.current = isPaused;
  useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);

  // Re-acquire wake lock when page comes back to foreground (lock is auto-released on hide)
  useEffect(() => {
    type NavWithWakeLock = { wakeLock?: { request: (t: string) => Promise<{ release: () => Promise<void> }> } };
    const requestLock = () =>
      (navigator as unknown as NavWithWakeLock).wakeLock?.request("screen")
        .then(lock => { wakeLockRef.current = lock; }).catch(() => {});
    const handleVisibility = () => {
      const p = phaseRef.current;
      if (document.visibilityState === "visible" && p !== "idle" && p !== "done") requestLock();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      wakeLockRef.current?.release().catch(() => {}); wakeLockRef.current = null;
    };
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("boxing-config");
    try { const c = { ...DEFAULT_CONFIG, ...(saved ? JSON.parse(saved) : {}) }; setConfig(c); configRef.current = c; }
    catch { setConfig(DEFAULT_CONFIG); configRef.current = DEFAULT_CONFIG; }
  }, []);

  const showAnnouncement = useCallback((text: string) => {
    setAnnouncement(text);
    setAnnouncementVisible(true);
    setTimeout(() => setAnnouncementVisible(false), 1000);
  }, []);

  const startPhase = useCallback((p: TrainingPhase, cfg: WorkoutConfig, set = 1, round = 1) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    phaseRef.current = p; setRef.current = set; roundRef.current = round;
    setPhase(p); setCurrentSet(set); setCurrentRound(round);

    let duration = 0;
    const totalRounds = cfg.sets * cfg.rounds;

    switch (p) {
      case "warmup":
        duration = cfg.warmupMinutes * 60;
        setCombo([]); upcomingComboRef.current = null; setNextComboData(null);
        playGong();
        // Keep screen awake during training (tablet / phone)
        (navigator as unknown as { wakeLock?: { request: (t: string) => Promise<{ release: () => Promise<void> }> } })
          .wakeLock?.request("screen").then(lock => { wakeLockRef.current = lock; }).catch(() => {});
        showAnnouncement("CALIENTA");
        break;

      case "rest_before": {
        duration = cfg.restBeforeStart;
        // Pre-generate combo for Round 1 — stored so the round uses EXACTLY this one
        const c0 = generateComboForRound(0, totalRounds);
        upcomingComboRef.current = c0;
        setCombo([]); setNextComboData({ combo: c0, label: "Combinación del Round 1" });
        showAnnouncement("¡PREPÁRATE!");
        break;
      }

      case "round": {
        duration = cfg.roundDuration;
        // Use pre-generated combo if available (same one shown during rest), else generate fresh
        const roundCombo = upcomingComboRef.current ?? generateComboForRound((set - 1) * cfg.rounds + (round - 1), totalRounds);
        upcomingComboRef.current = null;
        setCombo(roundCombo); setNextComboData(null);
        playFight(); showAnnouncement(`ROUND ${round}`);
        break;
      }

      case "rest_between_rounds": {
        duration = cfg.restBetweenRounds;
        const nextIdx = (set - 1) * cfg.rounds + round; // round is 1-based, so this is the NEXT round's 0-based index
        const cNext = generateComboForRound(nextIdx, totalRounds);
        upcomingComboRef.current = cNext;
        setCombo([]); setNextComboData({ combo: cNext, label: `Combinación del Round ${round + 1}` });
        showAnnouncement("DESCANSA");
        break;
      }

      case "rest_between_sets": {
        duration = cfg.restBetweenSets;
        const nextSetIdx = set * cfg.rounds; // first round of next set (0-based global)
        const cSet = generateComboForRound(nextSetIdx, totalRounds);
        upcomingComboRef.current = cSet;
        setCombo([]); setNextComboData({ combo: cSet, label: `Combinación — Serie ${set + 1}, Round 1` });
        showAnnouncement("¡SERIE COMPLETA!");
        break;
      }

      case "cooldown":
        duration = cfg.cooldownMinutes * 60;
        setCombo([]); upcomingComboRef.current = null; setNextComboData(null);
        showAnnouncement("ENFRÍA");
        break;

      case "done":
        setTimeLeft(0); setTotalTime(0);
        setCombo([]); upcomingComboRef.current = null; setNextComboData(null);
        playCelebration();
        wakeLockRef.current?.release().catch(() => {}); wakeLockRef.current = null;
        showAnnouncement("¡VICTORIOSO!");
        return;
    }

    timeLeftRef.current = duration;
    setTimeLeft(duration); setTotalTime(duration);
  }, [showAnnouncement]);

  const advancePhase = useCallback(() => {
    const cfg = configRef.current; if (!cfg) return;
    const p = phaseRef.current; const set = setRef.current; const round = roundRef.current;
    playBell();
    if (p === "warmup")              return startPhase("rest_before", cfg, 1, 1);
    if (p === "rest_before")         return startPhase("round", cfg, 1, 1);
    if (p === "round") {
      if (round < cfg.rounds)        return startPhase("rest_between_rounds", cfg, set, round);
      if (set < cfg.sets)            return startPhase("rest_between_sets", cfg, set, round);
      return startPhase("cooldown", cfg, set, round);
    }
    if (p === "rest_between_rounds") return startPhase("round", cfg, set, round + 1);
    if (p === "rest_between_sets")   return startPhase("round", cfg, set + 1, 1);
    if (p === "cooldown")            return startPhase("done", cfg, set, round);
  }, [startPhase]);

  useEffect(() => {
    if (phase === "idle" || phase === "done") return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (isPausedRef.current) return;
      const next = timeLeftRef.current - 1;
      if (next <= 0) { clearInterval(intervalRef.current!); timeLeftRef.current = 0; setTimeLeft(0); advancePhase(); }
      else { if (next <= 5) playBeep(); timeLeftRef.current = next; setTimeLeft(next); }
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => { if (config && phase === "idle") startPhase("warmup", config); }, [config, phase, startPhase]);

  if (!config) return (
    <div style={{ minHeight: "100dvh", background: "var(--color-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontStyle: "italic", fontSize: "1.5rem", color: "var(--color-muted)" }}>Cargando...</span>
    </div>
  );

  const totalRounds = config.sets * config.rounds;
  const globalRoundIndex = (currentSet - 1) * config.rounds + (currentRound - 1);

  // Phase display config
  type PhaseInfo = { color: string; bg: string; label: string; sub: string; stripe: string };
  const PS: Record<string, PhaseInfo> = {
    warmup:              { color: "#F97316", bg: "#F9731614", stripe: "#F97316", label: "CALENTAMIENTO", sub: "Prepara tu cuerpo" },
    rest_before:         { color: "#FFD700", bg: "#FFD70014", stripe: "#FFD700", label: "¡PREPÁRATE!", sub: "El combate está por comenzar" },
    round:               { color: "#CC1414",  bg: "#CC141414", stripe: "#CC1414", label: `ROUND ${currentRound}`, sub: `Serie ${currentSet} de ${config.sets}` },
    rest_between_rounds: { color: "#1040A0", bg: "#1040A014", stripe: "#1040A0", label: "DESCANSO", sub: `Round ${currentRound} completo — viene Round ${currentRound + 1}` },
    rest_between_sets:   { color: "#FFD700", bg: "#FFD70014", stripe: "#FFD700", label: "ENTRE SERIES", sub: `Serie ${currentSet} terminada — viene Serie ${currentSet + 1}` },
    cooldown:            { color: "#7B8DB0", bg: "#7B8DB014", stripe: "#7B8DB0", label: "ENFRIAMIENTO", sub: "Excelente combate" },
    done:                { color: "#22C55E", bg: "#22C55E22", stripe: "#22C55E", label: "¡VICTORIOSO!", sub: "" },
    idle:                { color: "#CC1414",  bg: "transparent", stripe: "#CC1414", label: "", sub: "" },
  };
  const ps = PS[phase] || PS.idle;
  const contentVisible = !announcementVisible;

  return (
    <div style={{ minHeight: "100dvh", background: "var(--color-bg)", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>

      <Announcement text={announcement} color={ps.color} visible={announcementVisible} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", opacity: contentVisible ? 1 : 0, transition: "opacity 0.3s ease-in", pointerEvents: contentVisible ? "auto" : "none" }}>

        {/* ── Top bar ── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 14px", borderBottom: "2px solid #1E2D50",
          background: "#0A0F1E", position: "relative", zIndex: 1,
        }}>
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${ps.color}, #1E2D50)` }} />

          <button onClick={() => router.push("/")} style={{
            display: "flex", alignItems: "center", gap: 5, background: "none", border: "none",
            color: "var(--color-muted)", cursor: "pointer",
            fontFamily: "'Barlow Condensed', sans-serif", fontStyle: "italic",
            fontSize: "0.8rem", letterSpacing: "0.1em", fontWeight: 700,
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg>
            SALIR
          </button>

          {/* Progress grid */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <div style={{ display: "flex", gap: 5 }}>
              {Array.from({ length: Math.min(config.sets, 8) }, (_, si) => (
                <div key={si} style={{ display: "flex", gap: 2 }}>
                  {Array.from({ length: Math.min(config.rounds, 8) }, (_, ri) => {
                    const g = si * config.rounds + ri;
                    const done = g < globalRoundIndex || (g === globalRoundIndex && phase !== "round");
                    const active = g === globalRoundIndex && phase === "round";
                    return <div key={ri} style={{ width: 7, height: 7, borderRadius: "50%", background: done ? "#22C55E" : active ? ps.color : "#1E2D50", transition: "background 0.3s", border: active ? `1px solid ${ps.color}` : "none" }} />;
                  })}
                </div>
              ))}
            </div>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontStyle: "italic", fontSize: "0.6rem", color: "var(--color-muted)", letterSpacing: "0.1em" }}>
              S{currentSet}/{config.sets} · R{currentRound}/{config.rounds}
            </span>
          </div>

          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => setIsPaused(p => !p)} style={{
              display: "flex", alignItems: "center", gap: 5,
              background: isPaused ? "#CC1414" : "#1E2D50",
              color: isPaused ? "#fff" : "var(--color-fg)",
              border: `1.5px solid ${isPaused ? "#CC141488" : "#1E2D50"}`,
              borderRadius: 8, padding: "6px 11px", cursor: "pointer",
              fontFamily: "'Barlow Condensed', sans-serif", fontStyle: "italic",
              fontSize: "0.75rem", letterSpacing: "0.08em", fontWeight: 900,
            }}>
              {isPaused ? "▶ REANUDAR" : "⏸ PAUSA"}
            </button>
            <button onClick={advancePhase} title="Saltar etapa" style={{
              display: "flex", alignItems: "center", gap: 4,
              background: "#1E2D50", color: "var(--color-muted)",
              border: "1.5px solid #1E2D50", borderRadius: 8, padding: "6px 10px", cursor: "pointer",
              fontFamily: "'Barlow Condensed', sans-serif", fontStyle: "italic",
              fontSize: "0.75rem", letterSpacing: "0.08em", fontWeight: 900,
            }}>
              SKIP <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zm2-8.14L11.03 12 8 14.14V9.86zM16 6h2v12h-2z" /></svg>
            </button>
          </div>
        </div>

        {/* ── Done screen ── */}
        {phase === "done" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24, padding: "0 16px", position: "relative" }}>
            <SpeedLines color="#22C55E" intensity={2} />
            <div style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
              <div style={{ width: 100, height: 100, borderRadius: "50%", border: "3px solid #22C55E", background: "#22C55E18", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                <svg width="52" height="52" viewBox="0 0 24 24" fill="#22C55E"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
              </div>
              <h1 className="manga-outline" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontStyle: "italic", fontSize: "clamp(3rem, 10vw, 5rem)", fontWeight: 900, color: "#22C55E", letterSpacing: "0.04em" }}>
                ¡VICTORIOSO!
              </h1>
              <p style={{ color: "var(--color-muted)", marginTop: 8 }}>{config.sets} series · {totalRounds} rounds completados</p>
            </div>
            <button onClick={() => router.push("/")} style={{
              background: "linear-gradient(135deg, #CC1414, #8B0000)", color: "#fff", border: "2px solid #FF333366",
              borderRadius: 14, padding: "14px 32px", position: "relative", zIndex: 1,
              fontFamily: "'Barlow Condensed', sans-serif", fontStyle: "italic",
              fontSize: "1.1rem", fontWeight: 900, letterSpacing: "0.12em", cursor: "pointer",
              boxShadow: "0 0 20px #CC141466",
            }}>
              NUEVO ENTRENAMIENTO
            </button>
          </div>
        )}

        {/* ── Active training ── */}
        {phase !== "done" && phase !== "idle" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

            {/* Phase header */}
            <div style={{
              background: ps.bg, padding: "14px 16px",
              borderBottom: "2px solid #1E2D50",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              gap: 12, position: "relative", overflow: "hidden",
            }}>
              {/* Top stripe */}
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${ps.stripe}, transparent)` }} />
              {phase === "round" && <SpeedLines color={ps.color} intensity={2} />}
              <div style={{ position: "relative", zIndex: 1 }}>
                <h2 className={phase === "round" ? "manga-outline" : ""} style={{
                  fontFamily: "'Barlow Condensed', sans-serif", fontStyle: "italic",
                  fontSize: "clamp(2.2rem, 7vw, 3.8rem)", fontWeight: 900, lineHeight: 1,
                  color: ps.color, letterSpacing: "0.03em",
                }}>
                  {ps.label}
                </h2>
                <p style={{ color: "var(--color-muted)", fontSize: "0.82rem", marginTop: 4 }}>{ps.sub}</p>
              </div>
              <CircularTimer timeLeft={timeLeft} total={totalTime} color={ps.color} />
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", position: "relative", zIndex: 1 }}>
              <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 14 }}>

                {/* ROUND — combo display */}
                {phase === "round" && combo.length > 0 && (
                  <div style={{
                    background: "#CC141408", borderRadius: 16, padding: "18px 18px",
                    position: "relative", overflow: "hidden",
                    border: "2px solid #CC141444",
                  }}>
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, #CC1414, #1040A0)" }} />
                    <SpeedLines color="#CC1414" intensity={1.5} />
                    <div style={{ position: "relative", zIndex: 1 }}>
                      <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontStyle: "italic", fontSize: "0.65rem", fontWeight: 900, letterSpacing: "0.25em", color: "#FFD700", textTransform: "uppercase", marginBottom: 14 }}>
                        COMBINACIÓN — {combo.length} GOLPES
                      </p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end" }}>
                        {combo.map((move, i) => (
                          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                            <MovePill move={move} size="xl" />
                            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "0.68rem", fontWeight: 900, color: "var(--color-muted)" }}>{i + 1}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* REST / WARMUP / COOLDOWN */}
                {["warmup", "rest_before", "rest_between_rounds", "rest_between_sets", "cooldown"].includes(phase) && (
                  <>
                    <div style={{ textAlign: "center", padding: "16px 0 4px" }}>
                      <p className="manga-outline" style={{
                        fontFamily: "'Barlow Condensed', sans-serif", fontStyle: "italic",
                        fontSize: "clamp(2.8rem, 10vw, 5.5rem)", fontWeight: 900, lineHeight: 1,
                        color: ps.color, letterSpacing: "0.03em",
                      }}>
                        {phase === "warmup"              && "CALIENTA"}
                        {phase === "rest_before"         && (timeLeft <= 5 ? timeLeft : "¡LISTO!")}
                        {phase === "rest_between_rounds" && "DESCANSA"}
                        {phase === "rest_between_sets"   && "RECUPERA"}
                        {phase === "cooldown"            && "ENFRÍA"}
                      </p>
                      <p style={{ color: "var(--color-muted)", fontSize: "0.9rem", marginTop: 8 }}>
                        {phase === "warmup"              && "Muévete a tu ritmo — activa articulaciones y mente"}
                        {phase === "rest_before"         && "Ponte los guantes — el combate está por iniciar"}
                        {phase === "rest_between_rounds" && `Round ${currentRound} terminado — viene Round ${currentRound + 1}`}
                        {phase === "rest_between_sets"   && `Serie ${currentSet} terminada — descansa antes de la Serie ${currentSet + 1}`}
                        {phase === "cooldown"            && `${totalRounds} rounds completados — excelente combate`}
                      </p>
                    </div>

                    {nextComboData && (
                      <ComboPreview combo={nextComboData.combo} label={nextComboData.label} />
                    )}
                  </>
                )}

                {isPaused && (
                  <div style={{
                    background: "#111827", border: "2px solid #CC141444", borderRadius: 10,
                    padding: "10px 16px", textAlign: "center",
                    fontFamily: "'Barlow Condensed', sans-serif", fontStyle: "italic",
                    fontSize: "0.85rem", fontWeight: 900, letterSpacing: "0.15em", color: "#CC1414",
                  }}>
                    EN PAUSA — TOCA REANUDAR PARA CONTINUAR
                  </div>
                )}

              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
