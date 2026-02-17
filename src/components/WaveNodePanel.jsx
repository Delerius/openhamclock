import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useWaveNode } from '../hooks/useWaveNode.js';

const STORAGE_KEY_CFG = 'openhamclock_wavenode_ui';

const DEFAULT_UI = {
  meters: [
    { name: 'Meter 1', visible: true },
    { name: 'Meter 2', visible: true },
    { name: 'Meter 3', visible: true },
    { name: 'Meter 4', visible: true },
  ],
  swrSensor: 0,
  swrLimit: 3.0,
};

function loadUi() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CFG);
    if (!raw) return DEFAULT_UI;
    const p = JSON.parse(raw);
    const meters = Array.isArray(p?.meters) ? p.meters : DEFAULT_UI.meters;
    return {
      ...DEFAULT_UI,
      ...(p || {}),
      meters: meters
        .map((m, i) => ({
          name: String(m?.name || DEFAULT_UI.meters[i].name),
          visible: m?.visible == null ? DEFAULT_UI.meters[i].visible : !!m.visible,
        }))
        .slice(0, 4),
    };
  } catch {
    return DEFAULT_UI;
  }
}

function saveUi(ui) {
  try {
    localStorage.setItem(STORAGE_KEY_CFG, JSON.stringify(ui));
  } catch {}
}

function fmtNum(v, digits = 0) {
  if (v == null || typeof v !== 'number' || !Number.isFinite(v)) return '--';
  return v.toFixed(digits);
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function swrLabel(swr) {
  if (swr == null || typeof swr !== 'number' || !Number.isFinite(swr) || swr < 0) return '—';
  if (swr >= 99) return '99';
  return swr.toFixed(swr < 10 ? 2 : 1);
}

function swrTone(swr, limit = 3.0) {
  if (swr == null || typeof swr !== 'number' || !Number.isFinite(swr) || swr < 0) return 'muted';
  if (swr >= limit) return 'bad';
  if (swr >= Math.max(1.5, limit * 0.7)) return 'warn';
  return 'good';
}

export default function WaveNodePanel() {
  const { data, error, connected, prefs, setPrefs, defaults, resetMeter } = useWaveNode();

  // SWR hold per meter (latched until next RF)
  const swrHoldRef = useRef([0, 0, 0, 0]);
  const swrWasActiveRef = useRef([false, false, false, false]);

  const [ui, setUi] = useState(loadUi);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [focused, setFocused] = useState(0);

  useEffect(() => saveUi(ui), [ui]);

  // Blink the "USB" dot when connected + not stale
  const [blink, setBlink] = useState(true);
  useEffect(() => {
    const t = setInterval(() => setBlink((b) => !b), 650);
    return () => clearInterval(t);
  }, []);

  const stale = !!data?.stale || !connected;
  const liveDot = !stale && blink;

  const visible = useMemo(() => {
    return ui.meters.map((m, i) => (m?.visible ? i : null)).filter((x) => x != null);
  }, [ui.meters]);

  const values = data?.values;

  // Active RF detection (for SWR validity)
  const rfThr = Math.max(0, Number(prefs.rfThresholdWatts) || defaults.rfThresholdWatts);
  const rfSenseIdx = 0; // Meter 1 is the default RF activity sense

  const isActive = (i) => {
    const sense = values?.avgWatts?.[rfSenseIdx];
    const senseOn = typeof sense === 'number' && sense >= rfThr;
    if (i === rfSenseIdx) {
      const a = values?.avgWatts?.[i];
      return typeof a === 'number' && a >= rfThr;
    }
    return senseOn;
  };

  const worstSWR = useMemo(() => {
    if (!values?.swr) return null;
    let w = null;
    for (let i = 0; i < 4; i++) {
      if (!isActive(i)) continue;
      const s = values.swr[i];
      if (typeof s !== 'number' || !Number.isFinite(s) || s < 0) continue;
      if (w == null || s > w) w = s;
    }
    return w;
  }, [values, rfThr]);

  const totals = useMemo(() => {
    const a = values?.avgWatts || [];
    const p = values?.peakWatts || [];
    let sumA = 0;
    let sumP = 0;
    for (let i = 0; i < 4; i++) {
      if (typeof a[i] === 'number' && a[i] > 0) sumA += a[i];
      if (typeof p[i] === 'number' && p[i] > 0) sumP += p[i];
    }
    return { sumA, sumP };
  }, [values]);

  const hasReflected = useMemo(() => {
    const ra = values?.rfdAvgWatts;
    const rp = values?.rfdPeakWatts;
    return Array.isArray(ra) || Array.isArray(rp);
  }, [values]);

  const gridCols = visible.length <= 1 ? '1fr' : visible.length === 2 ? '1fr 1fr' : '1fr 1fr';

  const headerPill = (text, tone) => (
    <span
      style={{
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        padding: '4px 8px',
        borderRadius: 999,
        background:
          tone === 'bad'
            ? 'rgba(255, 80, 80, 0.18)'
            : tone === 'warn'
              ? 'rgba(255, 193, 7, 0.18)'
              : tone === 'good'
                ? 'rgba(0, 200, 140, 0.16)'
                : 'rgba(255,255,255,0.07)',
        color:
          tone === 'bad'
            ? 'var(--accent-red)'
            : tone === 'warn'
              ? 'var(--accent-amber)'
              : tone === 'good'
                ? 'var(--accent-green)'
                : 'var(--text-muted)',
        border: '1px solid rgba(255,255,255,0.10)',
      }}
    >
      {text}
    </span>
  );

  const MeterCard = ({ idx }) => {
    const m = ui.meters[idx] || DEFAULT_UI.meters[idx];

    const avg = values?.avgWatts?.[idx];
    const pk = values?.peakWatts?.[idx];
    const displayAvg = typeof avg === 'number' && avg >= 2 ? avg : 0;
    const displayPk = typeof pk === 'number' && pk >= 2 ? pk : 0;
    const rAvg = values?.rfdAvgWatts?.[idx];
    const rPk = values?.rfdPeakWatts?.[idx];

    // SWR latch: capture max SWR while SWR is valid (>= 1), then keep showing it after unkey.
    const rawSWR = Number(values?.swr?.[idx]);
    const fwd = Number(values?.avgWatts?.[idx]);

    // Only consider SWR valid if RF > 2W
    const rfActive = Number.isFinite(fwd) && fwd >= 2;
    const swrActive = rfActive && Number.isFinite(rawSWR) && rawSWR >= 1;

    const wasActive = !!swrWasActiveRef.current[idx];
    const started = swrActive && !wasActive;
    swrWasActiveRef.current[idx] = swrActive;

    if (prefs.holdEnabled && started) {
      swrHoldRef.current[idx] = 0;
    }

    let displaySWR = swrActive ? rawSWR : -1;

    if (prefs.holdEnabled) {
      if (swrActive) {
        swrHoldRef.current[idx] = Math.max(swrHoldRef.current[idx] || 0, rawSWR);
        displaySWR = swrHoldRef.current[idx];
      } else if ((swrHoldRef.current[idx] || 0) > 0) {
        displaySWR = swrHoldRef.current[idx];
      }
    }

    const tone = swrTone(displaySWR, ui.swrLimit);
    const focusedOn = focused === idx;

    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => setFocused(idx)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') setFocused(idx);
        }}
        style={{
          textAlign: 'left',
          border: focusedOn ? '1px solid rgba(0, 220, 255, 0.35)' : '1px solid rgba(255,255,255,0.10)',
          background: 'rgba(0,0,0,0.20)',
          borderRadius: 14,
          padding: 12,
          cursor: 'pointer',
          color: 'var(--text-primary)',
          boxShadow: focusedOn ? '0 0 0 1px rgba(0, 220, 255, 0.15)' : 'none',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.06em' }}>
            {m.name}
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {tone === 'bad' && headerPill('SWR', 'bad')}
            {tone === 'warn' && headerPill('SWR', 'warn')}
            <button
              type="button"
              title="Reset meter hold"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();

                // Clear SWR latch for this meter
                swrHoldRef.current[idx] = 0;
                swrWasActiveRef.current[idx] = false;

                // Ask hook to clear held peaks/avg (if it supports it)
                if (typeof resetMeter === 'function') {
                  if (resetMeter.length >= 1) resetMeter(idx);
                  else resetMeter();
                }
              }}
              onClick={(e) => {
                // belt + suspenders
                e.preventDefault();
                e.stopPropagation();
              }}
              style={{
                marginLeft: 6,
                width: 22,
                height: 22,
                borderRadius: 999,
                border: '1px solid rgba(255,255,255,0.14)',
                background: 'rgba(255,255,255,0.06)',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'grid',
                placeItems: 'center',
                fontSize: 12,
                lineHeight: 1,
              }}
            >
              ↺
            </button>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: hasReflected ? '1fr 1fr' : '1fr',
            gap: 10,
            marginTop: 10,
            textAlign: 'center',
          }}
        >
          {/* FWD */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div
              style={{
                fontSize: 10,
                color: 'var(--text-muted)',
                fontWeight: 800,
                letterSpacing: '0.08em',
              }}
            >
              FWD
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.05 }}>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 900,
                  fontFamily: 'JetBrains Mono, monospace',
                  color: 'var(--accent-green)',
                }}
              >
                {fmtNum(displayAvg, 0)}
              </div>
              <div
                style={{
                  marginTop: 2,
                  fontSize: 12,
                  color: 'var(--text-muted)',
                  fontFamily: 'JetBrains Mono, monospace',
                  whiteSpace: 'nowrap',
                }}
              >
                pk {fmtNum(displayPk, 0)}
              </div>
            </div>
          </div>

          {/* RFD */}
          {hasReflected ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div
                style={{
                  fontSize: 10,
                  color: 'var(--text-muted)',
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                }}
              >
                RFD
              </div>

              {/* big value */}
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 900,
                  fontFamily: 'JetBrains Mono, monospace',
                  color: 'var(--accent-red)',
                  lineHeight: 1.05,
                  textAlign: 'center',
                }}
              >
                {typeof rAvg === 'number' ? fmtNum(rAvg, 0) : '--'}
              </div>

              {/* pk line under it */}
              <div
                style={{
                  marginTop: 2,
                  fontSize: 12,
                  color: 'var(--text-muted)',
                  fontFamily: 'JetBrains Mono, monospace',
                  lineHeight: 1.1,
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                }}
              >
                pk {typeof rPk === 'number' ? fmtNum(rPk, 0) : '--'}
              </div>
            </div>
          ) : null}
        </div>

        <div style={{ marginTop: 10, display: 'flex', justifyContent: 'center' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 10,
              justifyContent: 'center',
              transform: 'translateX(-2px)',
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: 'var(--text-muted)',
                fontWeight: 800,
                letterSpacing: '0.08em',
              }}
            >
              SWR
            </div>

            <div
              style={{
                fontSize: 20,
                fontWeight: 900,
                fontFamily: 'JetBrains Mono, monospace',
                color:
                  tone === 'bad'
                    ? 'var(--accent-red)'
                    : tone === 'warn'
                      ? 'var(--accent-amber)'
                      : 'var(--text-primary)',
              }}
            >
              {swrLabel(displaySWR)}
            </div>

            {values?.swrTripped ? headerPill('TRIP', 'bad') : null}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            title={stale ? 'No recent data' : 'USB link OK'}
            style={{
              width: 10,
              height: 10,
              borderRadius: 99,
              background: liveDot ? 'var(--accent-green)' : 'rgba(255,255,255,0.18)',
              boxShadow: liveDot ? '0 0 10px rgba(0, 200, 140, 0.45)' : 'none',
              border: '1px solid rgba(255,255,255,0.15)',
            }}
          />
          {values?.swrTripped
            ? headerPill('SWR TRIP', 'bad')
            : stale
              ? headerPill('STALE', 'muted')
              : headerPill('LIVE', 'good')}
          {error ? headerPill('ERR', 'bad') : null}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={() => setSettingsOpen((o) => !o)}
            title="Settings"
            style={{
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.06)',
              borderRadius: 10,
              padding: '6px 10px',
              cursor: 'pointer',
              color: 'var(--text-primary)',
              fontWeight: 900,
              letterSpacing: '0.03em',
            }}
          >
            ⚙
          </button>
        </div>
      </div>

      {/* Settings (collapsed) */}
      {settingsOpen ? (
        <div
          style={{
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 14,
            padding: 12,
            background: 'rgba(0,0,0,0.16)',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14 }}>
            {/* Left column */}
            <div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  fontWeight: 900,
                  letterSpacing: '0.06em',
                  marginBottom: 8,
                }}
              >
                Bridge URL
              </div>
              <input
                value={prefs.baseUrl}
                onChange={(e) => setPrefs((p) => ({ ...p, baseUrl: e.target.value }))}
                placeholder="http://192.168.1.43:8787"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.06)',
                  color: 'var(--text-primary)',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 12,
                }}
              />

              <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
                <label
                  style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: 'var(--text-muted)' }}
                >
                  <input
                    type="checkbox"
                    checked={!!prefs.holdEnabled}
                    onChange={(e) => setPrefs((p) => ({ ...p, holdEnabled: !!e.target.checked }))}
                  />
                  Hold peaks until next RF
                </label>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>poll</span>
                  <input
                    type="number"
                    min={150}
                    step={50}
                    value={Number(prefs.pollMs) || defaults.pollMs}
                    onChange={(e) =>
                      setPrefs((p) => ({ ...p, pollMs: clamp(Number(e.target.value) || defaults.pollMs, 150, 10000) }))
                    }
                    style={{
                      width: 86,
                      padding: '6px 8px',
                      borderRadius: 10,
                      border: '1px solid rgba(255,255,255,0.12)',
                      background: 'rgba(255,255,255,0.06)',
                      color: 'var(--text-primary)',
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 12,
                      textAlign: 'right',
                    }}
                  />
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>ms</span>
                </div>

                {/* Visible meters goes directly under Hold/Poll */}
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--text-muted)',
                      fontWeight: 900,
                      letterSpacing: '0.06em',
                      marginBottom: 6,
                    }}
                  >
                    Visible meters
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    {[0, 1, 2, 3].map((i) => (
                      <label
                        key={i}
                        style={{
                          display: 'flex',
                          gap: 8,
                          alignItems: 'center',
                          fontSize: 12,
                          color: 'var(--text-muted)',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={!!ui.meters[i]?.visible}
                          onChange={(e) => {
                            const on = !!e.target.checked;
                            setUi((u) => {
                              const meters = [...u.meters];
                              meters[i] = { ...meters[i], visible: on };
                              return { ...u, meters };
                            });
                          }}
                        />
                        {ui.meters[i]?.name || `Meter ${i + 1}`}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <div
              style={{
                fontSize: 11,
                color: 'var(--text-muted)',
                fontWeight: 900,
                letterSpacing: '0.06em',
                marginBottom: 8,
              }}
            >
              Meter names
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
                  <input
                    value={ui.meters[i]?.name || ''}
                    onChange={(e) =>
                      setUi((u) => {
                        const meters = [...u.meters];
                        meters[i] = { ...meters[i], name: e.target.value };
                        return { ...u, meters };
                      })
                    }
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      borderRadius: 10,
                      border: '1px solid rgba(255,255,255,0.12)',
                      background: 'rgba(255,255,255,0.06)',
                      color: 'var(--text-primary)',
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 12,
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
          {/* SWR controls */}
          <div style={{ marginTop: 12 }}>
            <div
              style={{
                fontSize: 11,
                color: 'var(--text-muted)',
                fontWeight: 900,
                letterSpacing: '0.06em',
                marginBottom: 8,
              }}
            >
              SWR
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--text-muted)',
                    fontWeight: 900,
                    letterSpacing: '0.06em',
                    marginBottom: 6,
                  }}
                >
                  SWR limit
                </div>
                <input
                  type="number"
                  step={0.1}
                  min={1.0}
                  max={10.0}
                  value={Number(ui.swrLimit) || 3.0}
                  onChange={(e) => setUi((u) => ({ ...u, swrLimit: clamp(Number(e.target.value) || 3.0, 1.0, 10.0) }))}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    borderRadius: 10,
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: 'rgba(255,255,255,0.06)',
                    color: 'var(--text-primary)',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 12,
                    textAlign: 'right',
                  }}
                />
              </div>

              <div>
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--text-muted)',
                    fontWeight: 900,
                    letterSpacing: '0.06em',
                    marginBottom: 6,
                  }}
                >
                  SWR sensor
                </div>
                <select
                  value={ui.swrSensor}
                  onChange={(e) => setUi((u) => ({ ...u, swrSensor: Number(e.target.value) || 0 }))}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    borderRadius: 10,
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: 'rgba(255,255,255,0.06)',
                    color: 'var(--text-primary)',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 12,
                  }}
                >
                  {[0, 1, 2, 3].map((i) => (
                    <option key={i} value={i}>
                      {ui.meters[i]?.name || `Meter ${i + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Meter grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
        {visible.map((idx) => (
          <MeterCard key={idx} idx={idx} />
        ))}
      </div>

      {/* Bottom info */}
      {error ? (
        <div
          style={{
            marginTop: 'auto',
            fontSize: 11,
            color: 'var(--text-muted)',
            fontFamily: 'JetBrains Mono, monospace',
          }}
        >
          error: {error}
        </div>
      ) : null}
    </div>
  );
}
