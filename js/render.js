"use strict";
// Dựng khung hình: chỉnh màu bằng WebGL (chạy được trên iPhone lẫn Android) rồi vẽ chữ lên canvas 2D.
window.R = (() => {
  // Tone màu có sẵn. Mọi số đều chỉnh lại được bằng thanh trượt.
  const LOOKS = {
    goc:      { name: "Gốc",            sw: "#6b6f78", exposure: 0,     contrast: 1,    saturation: 1,    temp: 0,     tint: 0,    fade: 0,    vignette: 0,    grain: 0,    sh: [0, 0, 0],          hi: [0, 0, 0] },
    demlanh:  { name: "Đêm lạnh",       sw: "#24364a", exposure: -0.35, contrast: 1.12, saturation: 0.62, temp: -0.28, tint: 0,    fade: 0.05, vignette: 0.45, grain: 0.05, sh: [-0.02, 0.02, 0.06], hi: [0, 0, 0.02] },
    mua:      { name: "Mưa xám xanh",   sw: "#3a4650", exposure: -0.3,  contrast: 1.0,  saturation: 0.5,  temp: -0.16, tint: -0.03, fade: 0.14, vignette: 0.35, grain: 0.06, sh: [-0.01, 0.02, 0.04], hi: [0, 0.01, 0.02] },
    denduong: { name: "Đèn đường ấm",   sw: "#4a3622", exposure: -0.3,  contrast: 1.1,  saturation: 0.78, temp: 0.24,  tint: 0.02, fade: 0.04, vignette: 0.5,  grain: 0.05, sh: [0.04, 0.015, -0.02], hi: [0.03, 0.01, -0.02] },
    hoanghon: { name: "Hoàng hôn đỏ",   sw: "#4b1e1c", exposure: -0.25, contrast: 1.12, saturation: 0.9,  temp: 0.38,  tint: 0.1,  fade: 0.03, vignette: 0.5,  grain: 0.05, sh: [0.06, 0, 0],      hi: [0.03, 0, 0] },
    phim:     { name: "Phim cũ",        sw: "#47423a", exposure: -0.18, contrast: 0.95, saturation: 0.7,  temp: 0.1,   tint: 0,    fade: 0.18, vignette: 0.4,  grain: 0.11, sh: [0.02, 0.03, 0.04], hi: [0.03, 0.02, 0] },
    dentrang: { name: "Đen trắng mờ",   sw: "#3c3c3c", exposure: -0.22, contrast: 1.08, saturation: 0,    temp: 0,     tint: 0,    fade: 0.12, vignette: 0.45, grain: 0.08, sh: [0, 0, 0],          hi: [0, 0, 0] },
  };
  const DEFAULT_LOOK = "demlanh";
  function lookFrom(key) { const L = LOOKS[key] || LOOKS[DEFAULT_LOOK]; return { preset: key, exposure: L.exposure, contrast: L.contrast, saturation: L.saturation, temp: L.temp, tint: L.tint, fade: L.fade, vignette: L.vignette, grain: L.grain, sh: L.sh.slice(), hi: L.hi.slice() }; }

  const FONTS = {
    sans:   { name: "Mảnh (mặc định)", family: '"Be Vietnam Pro"', weight: 400, style: "normal" },
    medium: { name: "Đậm vừa",          family: '"Be Vietnam Pro"', weight: 500, style: "normal" },
    serif:  { name: "Serif nghiêng",    family: '"Lora"',            weight: 400, style: "italic" },
    hand:   { name: "Viết tay",         family: '"Dancing Script"',  weight: 500, style: "normal" },
  };
  function defaultText(extra) { return Object.assign({ content: "", size: 1, y: 0.44, width: 0.7, align: "center", quotes: false, font: "sans", anim: "fade", sign: false }, extra || {}); }
  async function loadFonts() {
    if (!document.fonts) return;
    const jobs = Object.values(FONTS).map(f => document.fonts.load(`${f.style} ${f.weight} 32px ${f.family}`, "Điều ạ ố")); jobs.push(document.fonts.load('italic 400 32px "Lora"', "Điều suy nghĩ"));
    await Promise.race([Promise.all(jobs).catch(() => {}), new Promise(r => setTimeout(r, 4000))]);
  }

  const VS = `attribute vec2 p; varying vec2 uv; uniform vec4 crop;
    void main(){ uv = vec2(p.x*0.5+0.5, 0.5-p.y*0.5); uv = crop.xy + uv*crop.zw; gl_Position = vec4(p,0.,1.); }`;
  const FS = `precision mediump float; varying vec2 uv; uniform sampler2D tex; uniform vec2 res; uniform float seed;
    uniform float exposure, contrast, saturation, temp, tint, fade, vignette, grain; uniform vec3 sh, hi;
    float hash(vec2 q){ return fract(sin(dot(q, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){
      vec3 c = texture2D(tex, uv).rgb;
      c *= exp2(exposure);
      c.r += temp*0.10 + tint*0.05; c.b -= temp*0.10 - tint*0.04; c.g -= tint*0.08;
      c = clamp(c, 0., 1.);
      c = (c - 0.5) * contrast + 0.5;
      float l = dot(c, vec3(0.2126,0.7152,0.0722));
      c = mix(vec3(l), c, saturation);
      c += sh * (1. - smoothstep(0., 0.55, l)) + hi * smoothstep(0.45, 1., l);
      c = mix(vec3(fade*0.32), vec3(1.0 - fade*0.08), clamp(c,0.,1.));
      vec2 q = gl_FragCoord.xy / res - 0.5; q.x *= res.x / res.y;
      float v = smoothstep(0.85, 0.2, length(q)); c *= mix(1., v, vignette);
      float n = hash(gl_FragCoord.xy + seed) - 0.5; c += n * grain * 0.35;
      gl_FragColor = vec4(clamp(c,0.,1.), 1.);
    }`;

  class Stage {
    constructor(out) {
      this.out = out; this.ctx = out.getContext("2d");
      this.gc = document.createElement("canvas");
      const gl = this.gc.getContext("webgl", { preserveDrawingBuffer: true, premultipliedAlpha: false, antialias: false }) || this.gc.getContext("experimental-webgl");
      if (!gl) throw new Error("Máy này không hỗ trợ WebGL nên không chỉnh màu được.");
      this.gl = gl;
      const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
      const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr); gl.useProgram(pr); this.pr = pr;
      const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(pr, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      this.tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, this.tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      this.u = {}; for (const k of ["crop", "tex", "res", "seed", "exposure", "contrast", "saturation", "temp", "tint", "fade", "vignette", "grain", "sh", "hi"]) this.u[k] = gl.getUniformLocation(pr, k);
      this.size(out.width || 720, out.height || 1280);
    }
    size(w, h) { this.W = w; this.H = h; this.out.width = w; this.out.height = h; this.gc.width = w; this.gc.height = h; this.gl.viewport(0, 0, w, h); }
    // src: video/ảnh/canvas; pan: -1..1 lệch khung khi ảnh nguồn rộng hơn khung; zoom ≥ 1
    drawImage(src, look, pan = 0, zoom = 1, seed = 0) {
      const gl = this.gl, sw = src.videoWidth || src.naturalWidth || src.width, sh = src.videoHeight || src.naturalHeight || src.height;
      if (!sw || !sh) return false;
      try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, src); } catch (e) { return false; }
      const ar = this.W / this.H, sar = sw / sh; let cw = 1, ch = 1;
      if (sar > ar) cw = ar / sar; else ch = sar / ar;
      cw /= zoom; ch /= zoom;
      const cx = (1 - cw) / 2 + pan * (1 - cw) / 2, cy = (1 - ch) / 2;
      const L = look;
      gl.uniform4f(this.u.crop, cx, cy, cw, ch); gl.uniform1i(this.u.tex, 0); gl.uniform2f(this.u.res, this.W, this.H); gl.uniform1f(this.u.seed, seed % 1000);
      for (const k of ["exposure", "contrast", "saturation", "temp", "tint", "fade", "vignette", "grain"]) gl.uniform1f(this.u[k], +L[k] || 0);
      gl.uniform3fv(this.u.sh, L.sh || [0, 0, 0]); gl.uniform3fv(this.u.hi, L.hi || [0, 0, 0]);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      this.ctx.drawImage(this.gc, 0, 0);
      return true;
    }
    blank() { this.ctx.fillStyle = "#000"; this.ctx.fillRect(0, 0, this.W, this.H); }
    // t: giây kể từ đầu video (để làm hiệu ứng hiện chữ); t = null → hiện đủ
    drawText(T, t = null) { drawQuote(this.ctx, this.W, this.H, T, t); }
  }

  function wrapLines(ctx, text, maxW) {
    const out = [];
    for (const para of String(text).replace(/\r/g, "").split("\n")) {
      if (!para.trim()) { out.push(""); continue; }
      let line = "";
      for (const w of para.split(/\s+/).filter(Boolean)) {
        const tryL = line ? line + " " + w : w;
        if (ctx.measureText(tryL).width > maxW && line) { out.push(line); line = w; } else line = tryL;
      }
      if (line) out.push(line);
    }
    while (out.length && out[out.length - 1] === "") out.pop();
    while (out.length && out[0] === "") out.shift();
    return out;
  }
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  function drawQuote(ctx, W, H, T, t) {
    let text = (T.content || "").trim();
    if (text) {
      if (T.quotes) text = "“" + text + "”";
      const F = FONTS[T.font] || FONTS.sans, size = Math.round(W * 0.036 * (T.size || 1) * (T.font === "hand" ? 1.3 : 1)), lh = size * (T.font === "hand" ? 1.3 : 1.45);
      ctx.save();
      ctx.font = `${F.style} ${F.weight} ${size}px ${F.family}, system-ui, sans-serif`;
      ctx.textBaseline = "middle";
      const lines = wrapLines(ctx, text, W * (T.width || 0.7));
      const gap = lh * 0.55, heights = lines.map(l => (l === "" ? gap : lh)), total = heights.reduce((a, b) => a + b, 0);
      const widths = lines.map(l => ctx.measureText(l).width), bw = Math.max(0, ...widths);
      let y = H * (T.y ?? 0.44) - total / 2;
      const left = (W - bw) / 2;
      ctx.fillStyle = "#fff"; ctx.shadowColor = "rgba(0,0,0,.55)"; ctx.shadowBlur = size * 0.35; ctx.shadowOffsetY = size * 0.04;
      ctx.textAlign = T.align === "left" ? "left" : "center";
      let shown = 0;
      lines.forEach((l, i) => {
        const h = heights[i];
        if (l !== "") {
          let a = 1;
          if (t != null) {
            if (T.anim === "fade") a = clamp((t - 0.25) / 0.9, 0, 1);
            else if (T.anim === "lines") a = clamp((t - 0.3 - shown * 0.75) / 0.6, 0, 1);
          }
          shown++;
          ctx.globalAlpha = a;
          ctx.fillText(l, T.align === "left" ? left : W / 2, y + h / 2);
        }
        y += h;
      });
      ctx.restore();
    }
    if (T.sign) {
      ctx.save(); const s = Math.round(W * 0.028);
      ctx.font = `italic 400 ${s}px "Lora", Georgia, serif`; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
      ctx.fillStyle = "rgba(255,255,255,.62)"; ctx.shadowColor = "rgba(0,0,0,.5)"; ctx.shadowBlur = s * 0.4;
      ctx.fillText("Điều suy nghĩ", W / 2, H - Math.max(s * 2.2, H * 0.06)); ctx.restore();
    }
  }

  return { LOOKS, DEFAULT_LOOK, lookFrom, FONTS, defaultText, loadFonts, Stage, drawQuote };
})();
