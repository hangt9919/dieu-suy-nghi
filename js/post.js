"use strict";
// Tab Ảnh post: nền tối/đêm + câu tâm trạng chữ trắng → PNG + caption.
window.POST = (() => {
  const { $, toast } = UI;
  const SIZES = { "4:5": [1080, 1350], "1:1": [1080, 1080], "9:16": [1080, 1920] };
  let stage, P, panel = "bg", src = null, photo = null;
  const fresh = () => ({ aspect: "4:5", bg: { kind: "gen", gen: "mua", seed: 1 }, pan: 0, zoom: 1,
    text: R.defaultText({ size: 1.25, y: 0.47, width: 0.74, sign: true, anim: "none" }), look: R.lookFrom("goc"), suggestions: [], caption: "", sugNote: "" });

  function makeSrc() {
    const b = P.bg;
    if (b.kind === "photo" && photo) src = photo;
    else if (b.kind === "frame" && b.frame) src = b.frame;
    else { if (b.kind !== "gen") b.kind = "gen"; src = BG.make(b.gen, b.seed); }
  }
  function draw() { if (!src) makeSrc(); stage.drawImage(src, P.look, P.pan, P.zoom, 7) || stage.blank(); stage.drawText(P.text, null); }
  let saveT;
  function changed() { draw(); clearTimeout(saveT); saveT = setTimeout(() => { const s = JSON.parse(JSON.stringify(Object.assign({}, P, { bg: Object.assign({}, P.bg, { frame: null }) }))); if (s.bg.kind === "frame") s.bg.kind = "gen"; DB.set("postState", s); }, 600); }
  function setAspect(a) { P.aspect = a; const [w, h] = SIZES[a]; stage.size(w, h); document.querySelectorAll("#pAspect button").forEach(b => b.classList.toggle("on", b.dataset.a === a)); changed(); }

  function renderPanel() {
    const root = $("#pPanels");
    document.querySelectorAll("#pTools button").forEach(b => b.classList.toggle("on", b.dataset.p === panel));
    if (panel === "text") UI.textPanel(root, P, { kind: "post", getImage: () => UI.thumb(stage.gc, 360), tags: () => (P.bg.gen === "mua" ? ["mua"] : P.bg.gen === "den" ? ["den"] : ["dem"]), onChange: changed });
    else if (panel === "look") UI.lookPanel(root, P, changed);
    else bgPanel(root);
  }
  function bgPanel(root) {
    root.innerHTML = `<div class="panel"><h4>Nền có sẵn</h4><div class="chips" id="bgChips"></div>
      <div class="row gap"><button class="ghost-btn grow" id="bgSeed">🎲 Đổi kiểu nền</button></div>
      <h4>Ảnh của bạn</h4>
      <div class="row gap"><label class="ghost-btn grow"><input type="file" accept="image/*" id="bgFile" hidden>⬆︎ Chọn ảnh</label><button class="ghost-btn grow" id="bgFrame">🎞 Lấy khung từ video</button></div>
      <p class="hint" id="bgHint"></p><div id="bgSl"></div></div>`;
    const chips = $("#bgChips", root);
    for (const [k, b] of Object.entries(BG.LIST)) {
      const c = document.createElement("button"); c.className = "chip" + (P.bg.kind === "gen" && P.bg.gen === k ? " on" : "");
      const th = BG.make(k, P.bg.seed, 120, 160).toDataURL("image/jpeg", 0.7);
      c.innerHTML = `<i style="background-image:url(${th})"></i>${UI.esc(b.name)}`;
      c.onclick = () => { P.bg = { kind: "gen", gen: k, seed: P.bg.seed || 1 }; src = null; if (P.look.preset !== "goc") {} bgPanel(root); changed(); };
      chips.append(c);
    }
    $("#bgSeed", root).onclick = () => { if (P.bg.kind !== "gen") P.bg = { kind: "gen", gen: P.bg.gen || "mua", seed: 1 }; P.bg.seed = (P.bg.seed % 999) + 1; src = null; bgPanel(root); changed(); };
    $("#bgFile", root).onchange = async e => {
      const f = e.target.files[0]; e.target.value = ""; if (!f) return;
      try { photo = await loadImg(f); P.bg = { kind: "photo", gen: P.bg.gen }; if (P.look.preset === "goc") P.look = R.lookFrom("demlanh"); src = null; DB.set("postPhoto", f); bgPanel(root); changed(); }
      catch { toast("Không mở được ảnh này"); }
    };
    $("#bgFrame", root).onclick = () => {
      const fr = VID.rawFrame && VID.rawFrame(); if (!fr) return toast("Chưa có video nào ở tab Video");
      P.bg = { kind: "frame", gen: P.bg.gen, frame: fr }; P.look = JSON.parse(JSON.stringify(VID.state.look)); src = null; bgPanel(root); changed(); toast("Đã lấy khung hình đang dừng ở tab Video (kèm tone màu)");
    };
    $("#bgHint", root).textContent = P.bg.kind === "photo" ? "Đang dùng ảnh của bạn. Tone màu đặt sẵn là Đêm lạnh, đổi ở mục Màu." : P.bg.kind === "frame" ? "Đang dùng khung hình từ video." : "";
    const sl = $("#bgSl", root);
    sl.append(UI.slider("Lệch khung", "pan", P, -1, 1, 0.01, v => Math.round(v * 100) + "", changed));
    sl.append(UI.slider("Phóng to", "zoom", P, 1, 1.8, 0.01, v => Math.round(v * 100) + "%", changed));
  }
  function loadImg(file) { return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = URL.createObjectURL(file); }); }

  async function doExport() {
    if (!P.text.content.trim() && !confirm("Ảnh chưa có chữ. Vẫn lưu?")) return;
    await R.loadFonts(); draw();
    const blob = await new Promise(r => stage.out.toBlob(r, "image/png"));
    const name = `dieu-suy-nghi-${UI.stamp()}.png`, cap = UI.caption(P), url = URL.createObjectURL(blob);
    UI.openSheet("#resultSheet"); $("#resTitle").textContent = "Ảnh xong rồi"; $("#resProgress").hidden = true; $("#resDone").hidden = false;
    $("#resMedia").innerHTML = `<img src="${url}" alt="Ảnh post">`;
    $("#resNote").textContent = `${name} · ${SIZES[P.aspect].join("×")}`;
    $("#resCaption").value = cap;
    $("#resSave").onclick = async () => { const r = await UI.saveFile(blob, name); if (r === "download") toast("Đã tải ảnh về máy"); };
    $("#resCopy").onclick = () => UI.copy($("#resCaption").value);
    DB.addHist({ id: Date.now(), type: "post", thumb: UI.thumb(stage.out, 180), caption: cap, text: P.text.content, look: P.look.preset });
  }

  async function init() {
    stage = new R.Stage($("#pCanvas"));
    const saved = await DB.get("postState");
    P = Object.assign(fresh(), saved || {});
    if (P.bg.kind === "photo") { const f = await DB.get("postPhoto"); if (f) { try { photo = await loadImg(f); } catch { P.bg.kind = "gen"; } } else P.bg.kind = "gen"; }
    document.querySelectorAll("#pAspect button").forEach(b => (b.onclick = () => setAspect(b.dataset.a)));
    document.querySelectorAll("#pTools button").forEach(b => (b.onclick = () => { panel = b.dataset.p; renderPanel(); }));
    $("#pExport").onclick = doExport;
    const [w, h] = SIZES[P.aspect]; stage.size(w, h); document.querySelectorAll("#pAspect button").forEach(b => b.classList.toggle("on", b.dataset.a === P.aspect));
    draw(); renderPanel();
    R.loadFonts().then(draw);
  }
  return { init, redraw: () => P && draw() };
})();
