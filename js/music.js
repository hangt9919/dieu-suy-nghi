"use strict";
// Nhạc nền buồn/chill do app tự soạn ngay trên máy (không vướng bản quyền).
// Nhạc cụ được tổng hợp bằng JS, trộn vào mảng âm thanh, rồi qua OfflineAudioContext để thêm độ vang.
window.MUSIC = (() => {
  const SR = 32000;
  const TRACKS = {
    piano:     { name: "Piano buồn",    em: "🎹", desc: "Chậm, thưa nốt, nhiều vang" },
    rainpiano: { name: "Mưa + piano",   em: "🌧️", desc: "Tiếng mưa rơi với vài nốt piano" },
    lofi:      { name: "Lofi đêm",      em: "🌙", desc: "Đàn điện nhẹ, trống mềm, tiếng đĩa than" },
    guitar:    { name: "Guitar mộc",    em: "🎸", desc: "Rải dây chậm, ấm và trầm" },
    ambient:   { name: "Đêm tĩnh",      em: "🌫️", desc: "Nền âm vang, chuông nhỏ, không trống" },
    rain:      { name: "Chỉ tiếng mưa", em: "☔", desc: "Mưa rơi, sấm xa, không giai điệu" },
  };
  // vòng hợp âm (giọng La thứ / Đô trưởng) — mỗi bài có vài vòng, "Đổi giai điệu" sẽ đổi vòng + giai điệu
  const Q = { m: [0, 3, 7], M: [0, 4, 7], m7: [0, 3, 7, 10], M7: [0, 4, 7, 11], m9: [0, 3, 7, 10, 14], d9: [0, 4, 10, 14], M9: [0, 4, 7, 11, 14], sus2: [0, 2, 7], add9: [0, 4, 7, 14] };
  const PROGS = {
    sad: [[[57, "m"], [53, "M"], [48, "M"], [55, "M"]], [[57, "m"], [52, "m"], [53, "M"], [48, "M"]], [[53, "M7"], [55, "M"], [52, "m7"], [57, "m"]], [[57, "m"], [55, "M"], [53, "M7"], [52, "m"]]],
    lofi: [[[50, "m9"], [55, "d9"], [48, "M9"], [57, "m7"]], [[53, "M9"], [52, "m7"], [50, "m9"], [48, "M9"]], [[57, "m7"], [50, "m9"], [55, "d9"], [48, "M9"]]],
    amb: [[[57, "sus2"], [53, "M7"], [48, "add9"], [52, "m7"]], [[53, "M7"], [48, "add9"], [57, "m7"], [55, "sus2"]]],
  };
  const SCALE = [0, 2, 4, 5, 7, 9, 11];
  const inScale = m => SCALE.includes(((m % 12) + 12) % 12);
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  function rng(seed) { let s = (seed * 2654435761) >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

  /* ---------------- nhạc cụ (trả Float32Array mono) */
  const cache = new Map();
  function memo(key, fn) { if (!cache.has(key)) cache.set(key, fn()); return cache.get(key); }
  const TAU = Math.PI * 2;
  function piano(m) {
    return memo("p" + m, () => {
      const f = hz(m), len = Math.round(SR * (m < 50 ? 5 : 4)), out = new Float32Array(len), B = 0.00035, base = m < 55 ? 1.35 : 1;
      for (let k = 1; k <= 7; k++) {
        const fk = f * k * Math.sqrt(1 + B * k * k); if (fk > SR / 2.2) break;
        const amp = (k === 1 ? 1 : 0.55 / Math.pow(k, 1.25)) * (m > 76 ? 0.8 : 1), tau = (2.6 * base) / (1 + 0.55 * (k - 1)), w = TAU * fk / SR;
        for (let i = 0; i < len; i++) out[i] += amp * Math.sin(w * i) * Math.exp(-i / SR / tau);
      }
      const w2 = TAU * f * 1.0011 / SR; for (let i = 0; i < len; i++) out[i] += 0.35 * Math.sin(w2 * i) * Math.exp(-i / SR / (2.2 * base)); // dây thứ hai lệch nhẹ → âm "ngân"
      const att = Math.round(SR * 0.004); for (let i = 0; i < att; i++) out[i] *= i / att;
      for (let i = len - 2000; i < len; i++) out[i] *= (len - i) / 2000;
      return out;
    });
  }
  function epiano(m) {
    return memo("e" + m, () => {
      const f = hz(m), len = Math.round(SR * 3), out = new Float32Array(len), w = TAU * f / SR;
      for (let i = 0; i < len; i++) { const t = i / SR, I = 1.5 * Math.exp(-t / 0.35); out[i] = Math.sin(w * i + I * Math.sin(w * i)) * Math.exp(-t / 1.5) * (1 + 0.12 * Math.sin(TAU * 4.2 * t)); }
      const att = Math.round(SR * 0.006); for (let i = 0; i < att; i++) out[i] *= i / att;
      for (let i = len - 2000; i < len; i++) out[i] *= (len - i) / 2000;
      return out;
    });
  }
  function pluck(m) { // Karplus–Strong: tiếng dây gảy
    return memo("g" + m, () => {
      const f = hz(m), len = Math.round(SR * 3.2), out = new Float32Array(len), N = Math.round(SR / f), R = rng(m + 7);
      const buf = new Float32Array(N); let prev = 0; for (let i = 0; i < N; i++) { const x = R() * 2 - 1; prev = prev * 0.55 + x * 0.45; buf[i] = prev; }
      let idx = 0, last = 0; const damp = m < 52 ? 0.9975 : 0.9962;
      for (let i = 0; i < len; i++) { const cur = buf[idx]; const nxt = damp * 0.5 * (cur + last); last = cur; buf[idx] = nxt; out[i] = cur; idx = (idx + 1) % N; }
      for (let i = len - 2000; i < len; i++) out[i] *= (len - i) / 2000;
      return out;
    });
  }
  function bell(m) {
    return memo("b" + m, () => {
      const f = hz(m), len = Math.round(SR * 3), out = new Float32Array(len);
      const parts = [[1, 1, 2.2], [2.76, 0.4, 0.7], [5.4, 0.18, 0.35], [2, 0.25, 1.2]];
      for (const [r, a, tau] of parts) { const w = TAU * f * r / SR; if (f * r > SR / 2.2) continue; for (let i = 0; i < len; i++) out[i] += a * Math.sin(w * i) * Math.exp(-i / SR / tau); }
      const att = Math.round(SR * 0.003); for (let i = 0; i < att; i++) out[i] *= i / att;
      return out;
    });
  }
  function bass(m) {
    return memo("s" + m, () => {
      const f = hz(m), len = Math.round(SR * 2.2), out = new Float32Array(len), w = TAU * f / SR;
      for (let i = 0; i < len; i++) { const t = i / SR; out[i] = (Math.sin(w * i) + 0.25 * Math.sin(2 * w * i)) * Math.exp(-t / 0.9); }
      const att = Math.round(SR * 0.01); for (let i = 0; i < att; i++) out[i] *= i / att;
      for (let i = len - 1500; i < len; i++) out[i] *= (len - i) / 1500;
      return out;
    });
  }
  function pad(m, secs) {
    const L = Math.round(secs * 4) / 4;
    return memo("a" + m + ":" + L, () => {
      const f = hz(m), len = Math.round(SR * (L + 1.6)), out = new Float32Array(len), atk = Math.min(1.2, L * 0.4);
      const ph = [0, 0.33, 0.71], det = [1, 1.004, 0.9963]; let lp = 0; const a = 1 - Math.exp(-TAU * 900 / SR);
      for (let i = 0; i < len; i++) {
        let s = 0; for (let v = 0; v < 3; v++) { ph[v] += f * det[v] / SR; ph[v] -= Math.floor(ph[v]); s += ph[v] * 2 - 1; }
        lp += a * (s / 3 - lp);
        const t = i / SR, env = t < atk ? t / atk : t < L ? 1 : Math.max(0, 1 - (t - L) / 1.6);
        out[i] = lp * env;
      }
      return out;
    });
  }
  function kick() { return memo("k", () => { const len = Math.round(SR * 0.45), out = new Float32Array(len); let ph = 0; for (let i = 0; i < len; i++) { const t = i / SR, f = 45 + 75 * Math.exp(-t / 0.05); ph += f / SR; out[i] = Math.sin(TAU * ph) * Math.exp(-t / 0.16); } return out; }); }
  function snare() { return memo("n", () => { const len = Math.round(SR * 0.3), out = new Float32Array(len), R = rng(3); let lp = 0, prev = 0; for (let i = 0; i < len; i++) { const t = i / SR, x = R() * 2 - 1; lp += 0.35 * (x - lp); const hp = lp - prev; prev = lp; out[i] = hp * 1.6 * Math.exp(-t / 0.09) + 0.3 * Math.sin(TAU * 185 * t) * Math.exp(-t / 0.05); } return out; }); }
  function hat() { return memo("h", () => { const len = Math.round(SR * 0.08), out = new Float32Array(len), R = rng(5); let prev = 0; for (let i = 0; i < len; i++) { const x = R() * 2 - 1; out[i] = (x - prev) * 0.5 * Math.exp(-i / SR / 0.025); prev = x; } return out; }); }

  /* ---------------- trộn */
  function makeMix(dur) { const n = Math.ceil(dur * SR); return { n, L: new Float32Array(n), Rr: new Float32Array(n), sL: new Float32Array(n), sR: new Float32Array(n) }; }
  function add(mx, buf, t, gain, pan = 0, send = 0.3) {
    const start = Math.round(t * SR); if (start >= mx.n) return;
    const gl = gain * Math.cos((pan + 1) * Math.PI / 4) * 1.414, gr = gain * Math.sin((pan + 1) * Math.PI / 4) * 1.414;
    const end = Math.min(mx.n, start + buf.length);
    for (let i = Math.max(0, start); i < end; i++) { const s = buf[i - start]; mx.L[i] += s * gl; mx.Rr[i] += s * gr; if (send) { mx.sL[i] += s * gl * send; mx.sR[i] += s * gr * send; } }
  }
  function rainBed(mx, gain, seed) { // mưa: tiếng ồn hồng lọc + giọt mưa lách tách, hai kênh độc lập
    for (const [arr, sd] of [[mx.L, seed], [mx.Rr, seed + 99]]) {
      const R = rng(sd); let b0 = 0, b1 = 0, b2 = 0, lp = 0, hpPrev = 0;
      for (let i = 0; i < mx.n; i++) {
        const w = R() * 2 - 1; b0 = 0.99765 * b0 + w * 0.099; b1 = 0.963 * b1 + w * 0.2965; b2 = 0.57 * b2 + w * 1.0526;
        const pink = (b0 + b1 + b2 + w * 0.1848) * 0.18; lp += 0.3 * (pink - lp); const hp = lp - hpPrev * 0.97; hpPrev = lp;
        arr[i] += hp * gain * (0.9 + 0.1 * Math.sin(i / SR * 0.7));
      }
      // giọt mưa
      const drops = Math.round(mx.n / SR * 55);
      for (let d = 0; d < drops; d++) { const at = Math.floor(R() * mx.n), len = 90 + Math.floor(R() * 140), amp = gain * (0.15 + R() * 0.35), fr = 2500 + R() * 4000;
        for (let i = 0; i < len && at + i < mx.n; i++) arr[at + i] += amp * Math.sin(TAU * fr * i / SR) * Math.exp(-i / (len * 0.25)); }
    }
  }
  function thunder(mx, t, gain, seed) {
    const R = rng(seed), start = Math.round(t * SR), len = Math.round(SR * 4.5); let lp = 0, lp2 = 0;
    for (let i = 0; i < len && start + i < mx.n; i++) { const x = R() * 2 - 1; lp += 0.012 * (x - lp); lp2 += 0.02 * (lp - lp2); const tt = i / SR, env = Math.min(1, tt / 0.6) * Math.exp(-tt / 1.6) * (1 + 0.5 * Math.sin(tt * 9 + R() * 0.1));
      const s = lp2 * 9 * env * gain; mx.L[start + i] += s; mx.Rr[start + i] += s * 0.85; }
  }
  function vinyl(mx, gain, seed) {
    const R = rng(seed);
    for (let i = 0; i < mx.n; i++) { const h = (R() * 2 - 1) * 0.04 * gain; mx.L[i] += h; mx.Rr[i] += h; if (R() < 0.0009) { const a = (R() * 2 - 1) * gain * 0.9; mx.L[i] += a; mx.Rr[i] += a; } }
  }

  function voicing(root, q, lo = 55) { let r = root; while (r < lo - 5) r += 12; while (r > lo + 6) r -= 12; return Q[q].map(x => r + x); }
  function nearest(target, pool) { return pool.reduce((a, b) => (Math.abs(b - target) < Math.abs(a - target) ? b : a)); }
  function melodyNotes(prog, nBars, R, lo, hi, every) { // giai điệu đi từng bậc, nốt mạnh rơi vào nốt trong hợp âm
    const out = []; let cur = Math.round((lo + hi) / 2);
    const rh = [[[0, 2], [2, 2]], [[0, 1.5], [1.5, 0.5], [2, 2]], [[0, 3], [3, 1]], [[0.5, 1], [1.5, 2.5]], [[0, 4]], [[1, 1], [2, 1], [3, 1]]];
    for (let b = 0; b < nBars; b++) {
      if (every && b % every) continue;
      const [root, q] = prog[b % prog.length]; const ct = []; for (let o = -24; o <= 24; o += 12) for (const x of Q[q]) { const m = root + o + x; if (m >= lo && m <= hi) ct.push(m); }
      const pat = rh[Math.floor(R() * rh.length)];
      pat.forEach(([beat, len], j) => {
        if (j === 0) cur = nearest(cur + Math.round((R() - 0.5) * 5), ct);
        else { let step = R() < 0.5 ? -1 : 1; let m = cur + step; while (!inScale(m)) m += step; if (m < lo || m > hi) m = cur - step * 2; while (!inScale(m)) m -= step; cur = m; }
        out.push({ bar: b, beat, len, m: cur });
      });
    }
    return out;
  }

  // Soạn và trả AudioBuffer dài đúng `dur` giây
  async function render(key, dur, seed = 1) {
    dur = Math.max(4, Math.min(90, dur));
    const R = rng(seed * 31 + key.length * 7), mx = makeMix(dur + 0.5);
    let bpm = 64, prog, wet = 0.32, lowpass = 0, swing = 0;
    const pick = list => list[Math.floor(R() * list.length)];
    if (key === "lofi") { bpm = 72 + Math.floor(R() * 6); prog = pick(PROGS.lofi); swing = 0.12; lowpass = 3200; wet = 0.22; }
    else if (key === "ambient") { bpm = 58; prog = pick(PROGS.amb); wet = 0.5; }
    else if (key === "guitar") { bpm = 68 + Math.floor(R() * 6); prog = pick(PROGS.sad); wet = 0.24; }
    else { bpm = 58 + Math.floor(R() * 8); prog = pick(PROGS.sad); wet = key === "rain" ? 0.4 : 0.38; }
    const beat = 60 / bpm, bar = beat * 4, nBars = Math.ceil(dur / bar) + 1;
    const T = (b, bt) => b * bar + bt * beat + (swing && (bt * 2) % 2 === 1 ? swing * beat : 0);

    if (key === "piano" || key === "rainpiano") {
      const sparse = key === "rainpiano";
      if (sparse) rainBed(mx, 0.5, seed);
      for (let b = 0; b < nBars; b++) {
        const [root, q] = prog[b % prog.length], v = voicing(root, q, 57);
        let bm = root; while (bm > 50) bm -= 12;
        add(mx, piano(bm), T(b, 0), 0.26, -0.15, 0.35);
        const arp = sparse ? [[0.5, 0], [1.5, 1], [2.5, 2], [3.5, 1]] : [[0.5, 0], [1, 1], [1.5, 2], [2.5, 1], [3, 2], [3.5, 0]];
        for (const [bt, i] of arp) if (!sparse || R() < 0.75) add(mx, piano(v[i % v.length] + (i === 2 ? 12 : 0)), T(b, bt), sparse ? 0.12 : 0.1, 0.1, 0.4);
      }
      for (const n of melodyNotes(prog, nBars, R, 69, 81, sparse ? 2 : 0)) if (n.bar >= 1) add(mx, piano(n.m), T(n.bar, n.beat), sparse ? 0.13 : 0.15, 0.2, 0.45);
    } else if (key === "lofi") {
      vinyl(mx, 0.35, seed);
      for (let b = 0; b < nBars; b++) {
        const [root, q] = prog[b % prog.length], v = voicing(root, q, 55);
        v.forEach((m, k) => add(mx, epiano(m), T(b, 0) + k * 0.012, 0.075, k % 2 ? 0.25 : -0.25, 0.3));
        if (R() < 0.7) v.slice(1).forEach((m, k) => add(mx, epiano(m), T(b, 2.5) + k * 0.01, 0.05, 0.15, 0.3));
        add(mx, bass(root - 24 + (root < 52 ? 12 : 0)), T(b, 0), 0.3, 0, 0);
        add(mx, bass(root - 24 + (root < 52 ? 12 : 0) + 7), T(b, 2.5), 0.2, 0, 0);
        if (b >= 1) { add(mx, kick(), T(b, 0), 0.45, 0, 0); add(mx, kick(), T(b, 2.5), 0.32, 0, 0); add(mx, snare(), T(b, 1), 0.2, 0.05, 0.1); add(mx, snare(), T(b, 3), 0.2, 0.05, 0.1);
          for (let h = 0; h < 8; h++) add(mx, hat(), T(b, h / 2), h % 2 ? 0.07 : 0.1, 0.3, 0); }
      }
      for (const n of melodyNotes(prog, nBars, R, 67, 79, 2)) if (n.bar >= 2) add(mx, epiano(n.m), T(n.bar, n.beat), 0.07, 0.3, 0.35);
    } else if (key === "guitar") {
      for (let b = 0; b < nBars; b++) {
        const [root, q] = prog[b % prog.length], v = voicing(root, q, 55); let bassN = root; while (bassN > 47) bassN -= 12; while (bassN < 40) bassN += 12;
        const seq = [[0, bassN], [0.5, v[1] + 12], [1, v[0] + 12], [1.5, v[2]], [2, bassN + 7 > 52 ? bassN : bassN + 7], [2.5, v[1] + 12], [3, v[2] + 12], [3.5, v[0] + 12]];
        for (const [bt, m] of seq) add(mx, pluck(m), T(b, bt) + R() * 0.012, bt % 2 === 0 && m === bassN ? 0.26 : 0.17, m < 50 ? -0.1 : 0.15, 0.25);
      }
    } else if (key === "ambient") {
      for (let b = 0; b < nBars; b++) { const [root, q] = prog[b % prog.length], v = voicing(root, q, 52); v.slice(0, 3).forEach((m, k) => add(mx, pad(m, bar), T(b, 0), 0.07, (k - 1) * 0.4, 0.6)); }
      for (const n of melodyNotes(prog, nBars, R, 72, 88, 1)) if (n.bar >= 1 && R() < 0.6) add(mx, bell(n.m), T(n.bar, n.beat), 0.09, R() * 1.2 - 0.6, 0.7);
    } else if (key === "rain") {
      rainBed(mx, 0.8, seed);
      thunder(mx, Math.min(dur * 0.45, 5 + R() * 3), 0.55, seed + 1);
      for (let b = 0; b < nBars; b += 2) { const [root, q] = prog[(b / 2) % prog.length], v = voicing(root, q, 50); v.slice(0, 2).forEach((m, k) => add(mx, pad(m, bar * 2), T(b, 0), 0.025, k ? 0.3 : -0.3, 0.5)); }
    }

    // vang + nén + lọc bằng Web Audio (chạy offline, nhanh)
    const n = Math.ceil(dur * SR), ac = new OfflineAudioContext(2, n, SR);
    const mk = (l, r) => { const b = ac.createBuffer(2, n, SR); b.copyToChannel(l.subarray(0, n), 0); b.copyToChannel(r.subarray(0, n), 1); const s = ac.createBufferSource(); s.buffer = b; return s; };
    const dry = mk(mx.L, mx.Rr), send = mk(mx.sL, mx.sR);
    const conv = ac.createConvolver(), irLen = Math.round(SR * 3.2), ir = ac.createBuffer(2, irLen, SR), RI = rng(77);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); let lp = 0; for (let i = 0; i < irLen; i++) { lp += 0.5 * ((RI() * 2 - 1) - lp); d[i] = lp * Math.pow(1 - i / irLen, 2.6); } }
    conv.buffer = ir; const wetG = ac.createGain(); wetG.gain.value = wet * 2.2;
    const master = ac.createGain(); master.gain.value = 0.9;
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.25;
    let tail = comp;
    if (lowpass) { const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = lowpass; comp.connect(lp); tail = lp; }
    const fade = ac.createGain(); fade.gain.setValueAtTime(0, 0); fade.gain.linearRampToValueAtTime(1, 0.8); fade.gain.setValueAtTime(1, Math.max(1, dur - 2)); fade.gain.linearRampToValueAtTime(0, dur);
    dry.connect(master); send.connect(conv); conv.connect(wetG); wetG.connect(master); master.connect(comp); tail.connect(fade); fade.connect(ac.destination);
    dry.start(0); send.start(0);
    const out = await ac.startRendering();
    // chuẩn hoá âm lượng (đỉnh ≈ -2 dB)
    let peak = 0; for (let c = 0; c < 2; c++) { const d = out.getChannelData(c); for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i])); }
    if (peak > 0) { const g = 0.79 / peak; for (let c = 0; c < 2; c++) { const d = out.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] *= g; } }
    return out;
  }
  return { TRACKS, render, SR };
})();
