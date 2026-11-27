"use strict";
// Khởi động app: chuyển tab, cài đặt khoá AI, danh sách đã làm, service worker.
(() => {
  const { $, toast } = UI;
  const VERSION = "1.0.0";
  $("#ver").textContent = VERSION;

  function showTab(t) {
    document.querySelectorAll("#tabs button").forEach(b => b.classList.toggle("on", b.dataset.tab === t));
    document.querySelectorAll(".tab").forEach(s => s.classList.toggle("on", s.id === "tab-" + t));
    if (t !== "video") VID.pause();
    if (t === "history") drawHist();
    if (t === "post") POST.redraw();
    try { localStorage.setItem("dsn.tab", t); } catch {}
  }
  document.querySelectorAll("#tabs button").forEach(b => (b.onclick = () => showTab(b.dataset.tab)));

  async function drawHist() {
    const list = await DB.listHist(), root = $("#histList");
    if (!list.length) { root.innerHTML = '<p class="hint" style="text-align:center;padding:40px 0">Chưa có gì. Video và ảnh bạn xuất sẽ hiện ở đây kèm caption.</p>'; return; }
    root.innerHTML = "";
    for (const it of list) {
      const d = new Date(it.id), el = document.createElement("div"); el.className = "hist-item";
      el.innerHTML = `<img src="${it.thumb}" alt=""><div><p>${UI.esc(it.caption)}</p><small>${it.type === "video" ? "Video" : "Ảnh post"} · ${d.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}</small>
        <div class="row"><button class="small-btn" data-copy>Sao chép caption</button><button class="small-btn" data-del>Xoá</button></div></div>`;
      el.querySelector("[data-copy]").onclick = () => UI.copy(it.caption);
      el.querySelector("[data-del]").onclick = async () => { await DB.delHist(it.id); drawHist(); };
      root.append(el);
    }
  }

  // cài đặt
  $("#btnSettings").onclick = () => {
    const k = AI.keys(); $("#kGemini").value = k.gemini; $("#kGroq").value = k.groq; $("#kMsg").textContent = k.gemini || k.groq ? "Đã có khoá." : "Chưa có khoá — app vẫn gợi ý được bằng kho câu có sẵn.";
    $("#sTags").value = UI.tags(); UI.openSheet("#setSheet");
  };
  const saveKeys = () => { AI.setKeys($("#kGemini").value.trim(), $("#kGroq").value.trim()); try { localStorage.setItem("dsn.tags", $("#sTags").value.trim() || "#tamtrang #dieusuynghi"); } catch {} };
  $("#kSave").onclick = () => { saveKeys(); $("#kMsg").textContent = "Đã lưu."; toast("Đã lưu cài đặt"); };
  $("#kTest").onclick = async () => {
    saveKeys(); $("#kMsg").innerHTML = '<span class="spin"></span> Đang thử…';
    try { const r = await AI.test(); $("#kMsg").textContent = `${r.source} chạy tốt. Ví dụ: “${r.items[0].text}”`; }
    catch (e) { $("#kMsg").textContent = "Chưa được: " + e.message; }
  };

  (async () => {
    try { await VID.init(); } catch (e) { console.error(e); toast(e.message, 6000); }
    try { await POST.init(); } catch (e) { console.error(e); }
    let t = "video"; try { t = localStorage.getItem("dsn.tab") || "video"; } catch {}
    showTab(t);
  })();

  if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
})();
