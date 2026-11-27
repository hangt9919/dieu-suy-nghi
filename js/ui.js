"use strict";
// Phần giao diện dùng chung cho Video và Ảnh post: bảng Chữ, bảng Màu, thông báo, lưu file, caption.
window.UI = (() => {
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  let toastT;
  function toast(msg, ms = 2600) { const t = $("#toast"); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), ms); }
  function slider(label, key, obj, min, max, step, fmt, onInput) {
    const row = document.createElement("label"); row.className = "slider";
    row.innerHTML = `<span>${label}</span><input type="range" min="${min}" max="${max}" step="${step}"><span></span>`;
    const inp = row.querySelector("input"), out = row.lastElementChild; inp.value = obj[key];
    const show = () => (out.textContent = fmt ? fmt(+inp.value) : (+inp.value).toFixed(2));
    show(); inp.addEventListener("input", () => { obj[key] = +inp.value; show(); onInput && onInput(key); });
    return row;
  }
  function seg(items, cur, onPick, cls = "small-btn") {
    const d = document.createElement("div"); d.className = "row wrap";
    for (const [v, label] of items) { const b = document.createElement("button"); b.className = cls + (v === cur ? " on" : ""); b.textContent = label; b.onclick = () => { d.querySelectorAll("button").forEach(x => x.classList.remove("on")); b.classList.add("on"); onPick(v); }; d.append(b); }
    return d;
  }
  const pct = v => Math.round(v * 100) + "";

  // ---------- Bảng chữ
  // st: { text, suggestions, caption, sugNote } ; opt: { kind, getImage(), tags(), onChange() }
  function textPanel(root, st, opt) {
    const T = st.text;
    root.innerHTML = `<div class="panel">
      <h4>Câu chữ</h4>
      <textarea id="tpText" rows="4" placeholder="Gõ câu tâm trạng, hoặc bấm Gợi ý bên dưới…"></textarea>
      <div class="row gap"><button class="main-btn grow" id="tpSug">✨ Gợi ý câu mới</button></div>
      <div class="row gap"><input type="text" id="tpIdea" class="grow" placeholder="Ý của bạn, vd: buồn vì bị hiểu lầm"><button class="ghost-btn" id="tpRe">Viết lại</button></div>
      <p class="hint" id="tpNote"></p>
      <div class="sug" id="tpList"></div>
      <h4>Kiểu chữ</h4>
      <div id="tpFont"></div>
      <div id="tpSl"></div>
      <div id="tpAlign" style="margin-top:8px"></div>
      ${opt.kind === "video" ? '<h4>Cách hiện chữ</h4><div id="tpAnim"></div>' : ""}
      <h4>Ký tên page</h4><div id="tpSign"></div>
    </div>`;
    const ta = $("#tpText", root); ta.value = T.content;
    ta.addEventListener("input", () => { T.content = ta.value; st.caption = ""; markSel(); opt.onChange(); });
    const list = $("#tpList", root), note = $("#tpNote", root);
    function markSel() { list.querySelectorAll("button").forEach((b, i) => b.classList.toggle("on", (st.suggestions[i] || {}).text === T.content)); }
    function drawList() {
      list.innerHTML = ""; note.textContent = st.sugNote || "";
      st.suggestions.forEach(s => { const b = document.createElement("button"); b.innerHTML = esc(s.text) + (s.caption ? `<span class="cap">Caption: ${esc(s.caption)}</span>` : "");
        b.onclick = () => { T.content = s.text; st.caption = s.caption || ""; ta.value = s.text; markSel(); opt.onChange(); }; list.append(b); });
      markSel();
    }
    async function ask(withIdea) {
      const idea = withIdea ? $("#tpIdea", root).value.trim() : "";
      if (withIdea && !idea && !T.content.trim()) return toast("Gõ ý tưởng hoặc câu muốn viết lại trước đã");
      const btn = withIdea ? $("#tpRe", root) : $("#tpSug", root), old = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="spin"></span> Đang nghĩ…';
      try {
        let image = null; try { image = opt.getImage(); } catch {}
        const r = await AI.suggest({ n: 5, idea, current: withIdea ? T.content.trim() : "", image, kind: opt.kind, tags: opt.tags() });
        st.suggestions = r.items; st.sugNote = (r.note || (r.source !== "kho" ? `Gợi ý bởi ${r.source} — bấm vào một câu để dùng.` : "Bấm vào một câu để dùng."));
        if (!T.content.trim() && r.items[0]) { T.content = r.items[0].text; st.caption = r.items[0].caption; ta.value = T.content; opt.onChange(); }
        drawList();
      } catch (e) { toast(e.message || "Lỗi gợi ý"); }
      finally { btn.disabled = false; btn.innerHTML = old; }
    }
    $("#tpSug", root).onclick = () => ask(false);
    $("#tpRe", root).onclick = () => ask(true);
    drawList();
    $("#tpFont", root).append(seg(Object.entries(R.FONTS).map(([k, f]) => [k, f.name]), T.font, v => { T.font = v; opt.onChange(); }));
    const sl = $("#tpSl", root);
    sl.append(slider("Cỡ chữ", "size", T, 0.6, 2.2, 0.05, pct, opt.onChange));
    sl.append(slider("Vị trí dọc", "y", T, 0.15, 0.85, 0.01, v => (v < 0.4 ? "trên " : v > 0.6 ? "dưới " : "giữa ") , opt.onChange));
    sl.append(slider("Độ rộng", "width", T, 0.4, 0.9, 0.01, pct, opt.onChange));
    $("#tpAlign", root).append(seg([["center", "Căn giữa"], ["left", "Căn trái"]], T.align, v => { T.align = v; opt.onChange(); }));
    const q = seg([[true, "Có ngoặc kép"], [false, "Không ngoặc"]], T.quotes, v => { T.quotes = v; opt.onChange(); }); $("#tpAlign", root).append(q); q.style.marginTop = "6px";
    if (opt.kind === "video") $("#tpAnim", root).append(seg([["fade", "Mờ dần vào"], ["lines", "Từng dòng"], ["none", "Hiện ngay"]], T.anim, v => { T.anim = v; opt.onChange(true); }));
    $("#tpSign", root).append(seg([[false, "Không"], [true, "Có (chữ nhỏ cuối khung)"]], T.sign, v => { T.sign = v; opt.onChange(); }));
  }

  // ---------- Bảng màu
  function lookPanel(root, st, onChange) {
    root.innerHTML = `<div class="panel"><h4>Tone màu</h4><div class="chips" id="lpChips"></div><h4>Chỉnh tay</h4><div id="lpSl"></div>
      <div class="row gap"><button class="ghost-btn" id="lpReset">Về mặc định của tone</button></div></div>`;
    const chips = $("#lpChips", root);
    for (const [k, L] of Object.entries(R.LOOKS)) {
      const b = document.createElement("button"); b.className = "chip" + (st.look.preset === k ? " on" : "");
      b.innerHTML = `<i style="background:linear-gradient(160deg, ${L.sw}, #050507)"></i>${esc(L.name)}`;
      b.onclick = () => { st.look = R.lookFrom(k); lookPanel(root, st, onChange); onChange(); };
      chips.append(b);
    }
    const L = st.look, sl = $("#lpSl", root), sgn = v => (v > 0 ? "+" : "") + Math.round(v * 100);
    sl.append(slider("Độ sáng", "exposure", L, -1.2, 0.6, 0.01, sgn, onChange));
    sl.append(slider("Tương phản", "contrast", L, 0.6, 1.5, 0.01, pct, onChange));
    sl.append(slider("Độ đậm màu", "saturation", L, 0, 1.4, 0.01, pct, onChange));
    sl.append(slider("Ấm / lạnh", "temp", L, -0.7, 0.7, 0.01, v => (v < -0.02 ? "lạnh" : v > 0.02 ? "ấm" : "0"), onChange));
    sl.append(slider("Mờ đen", "fade", L, 0, 0.45, 0.01, pct, onChange));
    sl.append(slider("Viền tối", "vignette", L, 0, 1, 0.01, pct, onChange));
    sl.append(slider("Hạt phim", "grain", L, 0, 0.3, 0.005, pct, onChange));
    $("#lpReset", root).onclick = () => { st.look = R.lookFrom(st.look.preset); lookPanel(root, st, onChange); onChange(); };
  }

  // ---------- caption & lưu file
  function tags() { try { return (localStorage.getItem("dsn.tags") || "#tamtrang #dieusuynghi").trim(); } catch { return "#tamtrang #dieusuynghi"; } }
  function caption(st) {
    let main = (st.caption || "").trim();
    if (!main) { const t = (st.text.content || "").replace(/\s+/g, " ").trim(); const m = t.match(/^.+?[.!?…](\s|$)/); main = (m ? m[0] : t).trim(); if (main.length > 160) main = main.slice(0, 157).replace(/\s\S*$/, "") + "…"; }
    return (main ? main + "\n\n" : "") + tags();
  }
  function stamp() { const d = new Date(), p = n => String(n).padStart(2, "0"); return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`; }
  async function saveFile(blob, name) {
    const file = new File([blob], name, { type: blob.type });
    const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (mobile && navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file] }); return "shared"; } catch (e) { if (e.name === "AbortError") return "cancel"; }
    }
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 60000); return "download";
  }
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); toast("Đã sao chép caption"); }
    catch { const ta = document.createElement("textarea"); ta.value = text; document.body.append(ta); ta.select(); document.execCommand("copy"); ta.remove(); toast("Đã sao chép caption"); }
  }
  function openSheet(id) { const s = $(id); s.hidden = false; return s; }
  document.addEventListener("click", e => { const c = e.target.closest("[data-close]"); if (c) c.closest(".sheet").hidden = true; });
  function thumb(canvas, w = 240) { const c = document.createElement("canvas"); c.width = w; c.height = Math.round(w * canvas.height / canvas.width); c.getContext("2d").drawImage(canvas, 0, 0, c.width, c.height); return c.toDataURL("image/jpeg", 0.75); }
  function fmtTime(s) { s = Math.max(0, s || 0); return Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0"); }
  return { $, esc, toast, slider, seg, textPanel, lookPanel, caption, stamp, saveFile, copy, openSheet, thumb, fmtTime, tags };
})();
