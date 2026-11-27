"use strict";
// Nền đêm vẽ bằng code (không cần ảnh): phố đêm, mưa, đèn đường, hoàng hôn đỏ, tối trơn.
window.BG = (() => {
  const LIST = {
    pho: { name: "Phố đêm" }, mua: { name: "Mưa đêm" }, den: { name: "Đèn đường" }, hoanghon: { name: "Hoàng hôn đỏ" }, toi: { name: "Tối trơn" },
  };
  function rng(seed) { let s = (seed * 2654435761) >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  function glow(ctx, x, y, r, color, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${color},${a})`); g.addColorStop(0.35, `rgba(${color},${a * 0.45})`); g.addColorStop(1, `rgba(${color},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  function bokeh(ctx, R, W, H, n, y0, y1, colors, rMin, rMax, aMax) {
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < n; i++) { const x = R() * W, y = y0 + R() * (y1 - y0), r = rMin + R() * (rMax - rMin), c = colors[Math.floor(R() * colors.length)];
      const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${c},${aMax * (0.4 + R() * 0.6)})`); g.addColorStop(0.7, `rgba(${c},${aMax * 0.35})`); g.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalCompositeOperation = "source-over";
  }
  function skyline(ctx, R, W, H, base, color) {
    ctx.fillStyle = color; let x = -20;
    while (x < W) { const w = 60 + R() * 140, h = H * (0.08 + R() * 0.22); ctx.fillRect(x, base - h, w, h + H);
      ctx.save(); ctx.globalAlpha = 0.5; for (let k = 0; k < 6; k++) if (R() < 0.5) { ctx.fillStyle = R() < 0.7 ? "#e8b56a" : "#9fc2e8"; ctx.fillRect(x + 8 + R() * (w - 24), base - h + 10 + R() * (h - 20), 8, 12); } ctx.restore(); ctx.fillStyle = color;
      x += w + 4; }
  }
  function make(kind, seed = 1, outW = 1080, outH = 1920) {
    // luôn vẽ trên hệ toạ độ 1080×1920 rồi thu nhỏ, để ảnh xem trước nhỏ trông giống ảnh thật
    const W = 1080, H = 1920, c = document.createElement("canvas"); c.width = outW; c.height = outH; const ctx = c.getContext("2d"), R = rng(seed * 13 + kind.length);
    ctx.scale(outW / W, outH / H);
    const vgrad = (stops) => { const g = ctx.createLinearGradient(0, 0, 0, H); stops.forEach(([p, col]) => g.addColorStop(p, col)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); };
    if (kind === "pho") {
      vgrad([[0, "#05070d"], [0.55, "#0d1424"], [1, "#07080c"]]);
      skyline(ctx, R, W, H, H * 0.7, "#05060a");
      bokeh(ctx, R, W, H, 45, H * 0.64, H * 0.95, ["255,170,90", "255,140,90", "140,180,255", "255,220,160"], 18, 80, 0.32);
      glow(ctx, W * (0.3 + R() * 0.4), H * 0.75, W * 0.7, "255,150,80", 0.12);
    } else if (kind === "mua") {
      vgrad([[0, "#0a0f14"], [0.6, "#16202a"], [1, "#0a0d11"]]);
      bokeh(ctx, R, W, H, 34, H * 0.5, H * 0.92, ["255,190,110", "120,170,230", "255,190,110", "200,220,255"], 30, 110, 0.26);
      // phản chiếu đèn trên mặt đường ướt
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < 9; i++) { const x = R() * W, y0 = H * (0.8 + R() * 0.05), col = R() < 0.6 ? "255,180,100" : "140,180,240"; ctx.save(); ctx.translate(x, y0); ctx.scale(1, 9);
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 16 + R() * 12); g.addColorStop(0, `rgba(${col},0.16)`); g.addColorStop(1, `rgba(${col},0)`); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = "rgba(200,215,230,0.11)"; ctx.lineCap = "round";
      for (let i = 0; i < 420; i++) { const x = R() * W * 1.2 - W * 0.1, y = R() * H, l = 30 + R() * 70; ctx.lineWidth = 1 + R() * 1.6; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - l * 0.18, y + l); ctx.stroke(); }
    } else if (kind === "den") {
      vgrad([[0, "#030304"], [1, "#0b0906"]]);
      const lx = W * (0.35 + R() * 0.3), ly = H * 0.2;
      glow(ctx, lx, ly, W * 0.95, "255,200,120", 0.22); glow(ctx, lx, ly, W * 0.25, "255,230,180", 0.55);
      ctx.globalCompositeOperation = "lighter"; const g = ctx.createLinearGradient(0, ly, 0, H); g.addColorStop(0, "rgba(255,200,120,0.09)"); g.addColorStop(1, "rgba(255,200,120,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(lx - 20, ly); ctx.lineTo(lx + 20, ly); ctx.lineTo(lx + W * 0.5, H); ctx.lineTo(lx - W * 0.5, H); ctx.closePath(); ctx.fill(); ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "#020202"; ctx.fillRect(lx - 7, ly + 18, 14, H); ctx.fillRect(lx - 60, ly + 4, 120, 16);
      bokeh(ctx, R, W, H, 20, H * 0.75, H, ["255,190,110"], 14, 40, 0.3);
    } else if (kind === "hoanghon") {
      vgrad([[0, "#2a0c0c"], [0.45, "#5a1a16"], [0.7, "#2b0d0c"], [1, "#0a0505"]]);
      glow(ctx, W * 0.5, H * 0.55, W * 0.9, "255,90,60", 0.18);
      ctx.fillStyle = "#0a0405"; skyline(ctx, R, W, H, H * 0.74, "#0b0505");
      ctx.strokeStyle = "#0a0405"; ctx.lineWidth = 7;
      for (let i = 0; i < 3; i++) { const x = W * (0.15 + i * 0.35 + R() * 0.1); ctx.beginPath(); ctx.moveTo(x, H); ctx.lineTo(x, H * 0.32); ctx.quadraticCurveTo(x + 10, H * 0.28, x + 110, H * 0.29); ctx.stroke(); }
      bokeh(ctx, R, W, H, 26, H * 0.72, H * 0.95, ["255,120,80", "255,190,120"], 10, 34, 0.5);
    } else {
      vgrad([[0, "#0c0d10"], [1, "#050506"]]); glow(ctx, W * 0.5, H * 0.42, W * 0.8, "120,130,160", 0.06);
    }
    return c;
  }
  return { LIST, make };
})();
