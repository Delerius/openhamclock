import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const STORAGE_KEY = 'openhamclock_wavenode';

const DEFAULTS = {
  baseUrl: 'http://localhost:8787',
  pollMs: 200,
  // which meters to show (0-3)
  visibleMeters: [0, 1, 2],
  // "hold" means hold the last peak/avg after RF ends, until RF returns
  holdEnabled: false,
  // treat RF active when avg watts >= this
  rfThresholdWatts: 1,
};

function loadPrefs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const p = JSON.parse(raw);
    return {
      ...DEFAULTS,
      ...(p || {}),
      visibleMeters: Array.isArray(p?.visibleMeters) ? p.visibleMeters : DEFAULTS.visibleMeters,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

function savePrefs(prefs) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        baseUrl: prefs.baseUrl,
        pollMs: prefs.pollMs,
        visibleMeters: prefs.visibleMeters,
        holdEnabled: prefs.holdEnabled,
        rfThresholdWatts: prefs.rfThresholdWatts,
      }),
    );
  } catch {}
}

// Normalizes arrays to length 4.
function norm4(a, fill = -1) {
  const out = [fill, fill, fill, fill];
  if (Array.isArray(a)) {
    for (let i = 0; i < 4; i++) out[i] = typeof a[i] === 'number' ? a[i] : fill;
  }
  return out;
}

export function useWaveNode() {
  const [prefs, setPrefs] = useState(loadPrefs);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(false);

  // "hold" state (per meter)
  const holdRef = useRef({
    active: [false, false, false, false],
    latched: [false, false, false, false],
    avgWatts: [-1, -1, -1, -1],
    peakWatts: [-1, -1, -1, -1],
    // optional reflected if backend provides
    rfdAvgWatts: [-1, -1, -1, -1],
    rfdPeakWatts: [-1, -1, -1, -1],
  });

  useEffect(() => {
    savePrefs(prefs);
  }, [prefs]);

  const apiUrl = useMemo(() => {
    const base = (prefs.baseUrl || DEFAULTS.baseUrl).replace(/\/+$/, '');
    return `${base}/api/wavenode/status`;
  }, [prefs.baseUrl]);

  useEffect(() => {
    let alive = true;
    let t = null;
    const ac = new AbortController();

    async function tick() {
      try {
        const r = await fetch(apiUrl, { cache: 'no-store', signal: ac.signal });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        if (!alive) return;

        setConnected(true);
        setError(null);

        // normalize fields
        const v = j?.values || {};
        const snap = {
          lastSeenUtc: j?.lastSeenUtc ?? null,
          stale: !!j?.stale,
          values: {
            avgWatts: norm4(v.avgWatts),
            peakWatts: norm4(v.peakWatts),
            swr: norm4(v.swr),
            dcVolts: typeof v.dcVolts === 'number' ? v.dcVolts : -1,
            dcAmps: typeof v.dcAmps === 'number' ? v.dcAmps : -1,
            aux: norm4(v.aux),
            swrTripped: !!v.swrTripped,

            // optional reflected arrays (if backend adds them)
            rfdAvgWatts: norm4(v.rfdAvgWatts, null),
            rfdPeakWatts: norm4(v.rfdPeakWatts, null),
          },
        };

        // Apply hold logic
        if (prefs.holdEnabled) {
          const hr = holdRef.current;
          const thr = Math.max(0, Number(prefs.rfThresholdWatts) || DEFAULTS.rfThresholdWatts);
          for (let i = 0; i < 4; i++) {
            const avg = snap.values.avgWatts[i] ?? -1;
            const pk = snap.values.peakWatts[i] ?? -1;
            const rAvg = snap.values.rfdAvgWatts?.[i];
            const rPk = snap.values.rfdPeakWatts?.[i];

            const isActive = typeof avg === 'number' && avg >= thr;

            // Transition: inactive -> active => clear latch
            if (isActive && !hr.active[i]) {
              hr.latched[i] = false;
            }

            // While active, update hold buffers
            if (isActive) {
              hr.avgWatts[i] = avg;
              hr.peakWatts[i] = Math.max(hr.peakWatts[i] ?? -1, pk);
              if (typeof rAvg === 'number') hr.rfdAvgWatts[i] = rAvg;
              if (typeof rPk === 'number') hr.rfdPeakWatts[i] = Math.max(hr.rfdPeakWatts[i] ?? -1, rPk);
            }

            // Transition: active -> inactive => latch
            if (!isActive && hr.active[i]) {
              hr.latched[i] = true;
            }

            hr.active[i] = isActive;

            // If latched, override displayed values with held values
            if (hr.latched[i]) {
              snap.values.avgWatts[i] = hr.avgWatts[i];
              snap.values.peakWatts[i] = hr.peakWatts[i];
              if (Array.isArray(snap.values.rfdAvgWatts) && typeof hr.rfdAvgWatts[i] === 'number') {
                snap.values.rfdAvgWatts[i] = hr.rfdAvgWatts[i];
              }
              if (Array.isArray(snap.values.rfdPeakWatts) && typeof hr.rfdPeakWatts[i] === 'number') {
                snap.values.rfdPeakWatts[i] = hr.rfdPeakWatts[i];
              }
            }
          }
        } else {
          // reset hold buffers when disabled
          holdRef.current = {
            active: [false, false, false, false],
            latched: [false, false, false, false],
            avgWatts: [-1, -1, -1, -1],
            peakWatts: [-1, -1, -1, -1],
            rfdAvgWatts: [-1, -1, -1, -1],
            rfdPeakWatts: [-1, -1, -1, -1],
          };
        }

        setData(snap);
      } catch (e) {
        if (!alive) return;
        if (e?.name === 'AbortError') return;
        setConnected(false);
        setError(String(e?.message || e));
      }
    }

    tick();
    t = setInterval(tick, Math.max(100, Number(prefs.pollMs) || DEFAULTS.pollMs));
    return () => {
      alive = false;
      try {
        ac.abort();
      } catch {}
      if (t) clearInterval(t);
    };
  }, [apiUrl, prefs.pollMs, prefs.holdEnabled, prefs.rfThresholdWatts]);

  const resetMeter = useCallback((idx) => {
    const hr = holdRef.current;
    const resetOne = (i) => {
      if (i < 0 || i > 3) return;
      hr.active[i] = false;
      hr.latched[i] = false;
      hr.avgWatts[i] = -1;
      hr.peakWatts[i] = -1;
      hr.rfdAvgWatts[i] = -1;
      hr.rfdPeakWatts[i] = -1;
    };

    if (typeof idx === 'number' && Number.isFinite(idx)) {
      resetOne(Math.max(0, Math.min(3, Math.trunc(idx))));
    } else {
      for (let i = 0; i < 4; i++) resetOne(i);
    }
  }, []);

  return {
    data,
    error,
    connected,
    prefs,
    setPrefs,
    defaults: DEFAULTS,
    resetMeter,
  };
}
