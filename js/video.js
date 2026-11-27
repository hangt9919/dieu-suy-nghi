"use strict";
// Tab Video: chọn video → chỉnh màu, nhạc, chữ → xem lại → xuất MP4 9:16 + caption.
window.VID = (() => {
  const { $, toast } = UI;
  const W = 720, H = 1280;
  let stage, video, V = null, panel = "text";
  let ac = null, vidNode = null, origGain, musGain, mix, spk, musSrc = null;
  let playing = false, exporting = false, raf = 0, seed = 0;
  let musicBuf = null, musicKey = "", musicJob = null, userBuf = null;

  const fresh = () => ({
    name: "", dur: 0, text: R.defaultText(), look: R.lookFrom(R.DEFAULT_LOOK), suggestions: [], caption: "", sugNote: "",
    music: { id: "piano", seed: 1, vol: 0.85, orig: 0.2, userName: "", userOffset: 0 },
    trim: { start: 0, len: 13, speed: 1, pan: 0, zoom: 1 },
  });
  const outDur = () => V.trim.len / V.trim.speed;

  /* ---------------- mở video */
  async function openFile(file, state) {
    if (!file) return;
    pause();
    $("#vEmpty").hidden = true; $("#vEditor").hidden = false; $("#vLoading").hidden = false;
    if (video.src) URL.revokeObjectURL(video.src);
    video.src = URL.createObjectURL(file);
    await new Promise((res, rej) => { video.onloadedmetadata = res; video.onerror = () => rej(new Error("Không mở được video này (định dạng lạ?)")); }).catch(e => { toast(e.message, 5000); throw e; });
    const dur = video.duration && isFinite(video.duration) ? video.duration : 15;
    if (state) V = Object.assign(fresh(), state);
    else { const old = V; V = fresh(); if (old) { V.text = old.text; V.look = old.look; V.music = old.music; V.suggestions = old.suggestions; V.caption = old.caption; } V.name = file.name || "video"; }
    V.dur = dur;
    V.trim.start = Math.min(V.trim.start, Math.max(0, dur - 1)); V.trim.len = state ? Math.min(V.trim.len, dur - V.trim.start) : Math.min(dur, dur <= 20 ? dur : 13);
    await seekTo(V.trim.start);
    $("#vLoading").hidden = true;
    draw(); renderPanel(); prepareMusic();
    if (!state) { DB.set("videoFile", file); saveState(); }
  }
  function seekTo(t) {
    return new Promise(res => { const done = () => { video.removeEventListener("seeked", done); res(); }; video.addEventListener("seeked", done); video.currentTime = Math.max(0, Math.min(t, (video.duration || t) - 0.03)); setTimeout(done, 1500); });
  }

  /* ---------------- vẽ */
  function tOut() { return (video.currentTime - V.trim.start) / V.trim.speed; }
  function draw(withAnim) {
    if (!V) return;
    seed = (seed + 1) % 997;
    if (!stage.drawImage(video, V.look, V.trim.pan, V.trim.zoom, seed)) stage.blank();
    stage.drawText(V.text, withAnim ? Math.max(0, tOut()) : null);
    const t = Math.max(0, tOut()), d = outDur();
    $("#vTime").textContent = UI.fmtTime(t) + " / " + UI.fmtTime(d);
    if (!seeking) $("#vSeek").value = Math.round((t / d) * 1000);
  }
  let seeking = false;

  /* ---------------- âm thanh */
  function ensureAudio() {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext; ac = new AC();
      mix = ac.createGain(); spk = ac.createGain(); mix.connect(spk); spk.connect(ac.destination);
      origGain = ac.createGain(); origGain.connect(mix); musGain = ac.createGain(); musGain.connect(mix);
    }
    if (!vidNode) { try { vidNode = ac.createMediaElementSource(video); vidNode.connect(origGain); } catch (e) { console.warn(e); } }
    if (ac.state !== "running") ac.resume();
    video.muted = false;
  }
  function stopMusic() { if (musSrc) { try { musSrc.stop(); } catch {} musSrc.disconnect(); musSrc = null; } }
  function startMusic(at) {
    stopMusic(); if (!ac) return;
    origGain.gain.value = V.music.orig;
    const m = V.music, buf = m.id === "user" ? userBuf : m.id === "none" ? null : musicBuf; if (!buf) return;
    const d = outDur(), off = (m.id === "user" ? m.userOffset : 0) + at; if (off >= buf.duration) return;
    musSrc = ac.createBufferSource(); musSrc.buffer = buf; musSrc.connect(musGain);
    const now = ac.currentTime, g = musGain.gain; g.cancelScheduledValues(now);
    const fadeIn = m.id === "user" ? 0.6 : 0, endAt = now + (d - at);
    g.setValueAtTime(fadeIn && at < fadeIn ? 0 : m.vol, now); if (fadeIn && at < fadeIn) g.linearRampToValueAtTime(m.vol, now + (fadeIn - at));
    if (m.id === "user") { const fs = Math.max(now, endAt - 1.5); g.setValueAtTime(m.vol, fs); g.linearRampToValueAtTime(0, endAt); }
    musSrc.start(now, off, Math.max(0.05, d - at));
  }
  async function prepareMusic() {
    const m = V.music; if (m.id === "none" || m.id === "user") return;
    const key = `${m.id}:${m.seed}:${outDur().toFixed(2)}`; if (key === musicKey && musicBuf) return;
    const job = (musicJob = { key });
    setMusicStatus("Đang soạn nhạc…");
    try { const buf = await MUSIC.render(m.id, outDur() + 0.2, m.seed); if (musicJob !== job) return; musicBuf = buf; musicKey = key; setMusicStatus(""); if (playing) startMusic(Math.max(0, tOut())); }
    catch (e) { console.error(e); setMusicStatus("Không soạn được nhạc: " + e.message); }
  }
  function setMusicStatus(s) { const el = $("#mpStatus"); if (el) el.textContent = s; }
  async function loadUserMusic(file, silent) {
    try {
      ensureAudio(); const ab = await file.arrayBuffer();
      userBuf = await new Promise((res, rej) => ac.decodeAudioData(ab, res, rej));
      V.music.id = "user"; V.music.userName = file.name || "Nhạc của bạn"; if (!silent) { V.music.userOffset = 0; DB.set("userMusic", file); }
      renderPanel(); saveState(); if (playing) startMusic(Math.max(0, tOut()));
    } catch (e) { toast("Không đọc được file nhạc này"); }
  }

  /* ---------------- phát */
  async function play() {
    if (!V || exporting) return;
    ensureAudio();
    if (V.music.id !== "none" && V.music.id !== "user" && !musicBuf) prepareMusic();
    if (video.currentTime < V.trim.start || video.currentTime >= V.trim.start + V.trim.len - 0.05) await seekTo(V.trim.start);
    video.playbackRate = V.trim.speed;
    try { await video.play(); } catch (e) { toast("Không phát được: " + e.message); return; }
    playing = true; $("#vPlayIco").hidden = true; $("#vPlay").textContent = "❚❚";
    startMusic(Math.max(0, tOut())); loop();
  }
  function pause() { if (!video) return; video.pause(); playing = false; stopMusic(); cancelAnimationFrame(raf); if ($("#vPlayIco")) { $("#vPlayIco").hidden = false; $("#vPlay").textContent = "▶"; } if (V) draw(); }
  function loop() {
    cancelAnimationFrame(raf);
    const step = async () => {
      if (!playing) return;
      if (video.currentTime >= V.trim.start + V.trim.len || video.ended) {
        if (exporting) return;
        await seekTo(V.trim.start); if (!playing) return; video.play(); startMusic(0);
      }
      draw(true); raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }

  /* ---------------- bảng chỉnh */
  let saveT;
  function saveState() { clearTimeout(saveT); saveT = setTimeout(() => { if (V) DB.set("videoState", JSON.parse(JSON.stringify(V))); }, 600); }
  function changed(restart) { saveState(); if (!playing) draw(); else if (restart) { seekTo(V.trim.start).then(() => startMusic(0)); } }
  function renderPanel() {
    const root = $("#vPanels");
    document.querySelectorAll("#vTools button").forEach(b => b.classList.toggle("on", b.dataset.p === panel));
    if (panel === "text") UI.textPanel(root, V, { kind: "video", getImage: () => UI.thumb(stage.gc, 360), tags: sceneTags, onChange: changed });
    else if (panel === "look") UI.lookPanel(root, V, () => changed());
    else if (panel === "music") musicPanel(root);
    else trimPanel(root);
  }
  function sceneTags() { const p = V.look.preset; return p === "mua" ? ["mua"] : p === "denduong" ? ["den"] : ["dem"]; }
  function musicPanel(root) {
    const m = V.music;
    root.innerHTML = `<div class="panel"><h4>Nhạc nền</h4><div class="tracks" id="mpList"></div>
      <div class="row gap"><button class="ghost-btn grow" id="mpSeed">🎲 Đổi giai điệu</button><label class="ghost-btn grow"><input type="file" accept="audio/*,.mp3,.m4a,.wav,.aac" id="mpFile" hidden>⬆︎ Tải nhạc của bạn</label></div>
      <p class="hint" id="mpStatus"></p>
      <div id="mpUser"></div>
      <h4>Âm lượng</h4><div id="mpVol"></div>
      <p class="hint">Nhạc tự tải lên nếu có bản quyền, Facebook có thể tắt tiếng reel. Nhạc soạn sẵn trong app thì không vướng.</p></div>`;
    const list = $("#mpList", root);
    const items = [...Object.entries(MUSIC.TRACKS).map(([k, t]) => [k, t.em, t.name, t.desc])];
    if (userBuf) items.push(["user", "🎵", "Nhạc của bạn", m.userName]);
    items.push(["none", "🔇", "Không nhạc", "Chỉ giữ tiếng gốc của video"]);
    for (const [k, em, name, desc] of items) {
      const b = document.createElement("button"); b.className = "track" + (m.id === k ? " on" : "");
      b.innerHTML = `<span class="em">${em}</span><span><b>${UI.esc(name)}</b><small>${UI.esc(desc || "")}</small></span>`;
      b.onclick = () => { m.id = k; musicPanel(root); saveState(); prepareMusic().then(() => {}); if (playing) startMusic(Math.max(0, tOut())); else play(); };
      list.append(b);
    }
    $("#mpSeed", root).onclick = () => { if (m.id === "user" || m.id === "none") m.id = "piano"; m.seed = (m.seed % 999) + 1; musicPanel(root); saveState(); prepareMusic(); if (!playing) play(); };
    $("#mpFile", root).onchange = e => e.target.files[0] && loadUserMusic(e.target.files[0]);
    if (m.id === "user" && userBuf) {
      $("#mpUser", root).append(UI.slider("Bắt đầu nhạc", "userOffset", m, 0, Math.max(0, Math.floor(userBuf.duration - 3)), 0.5, v => UI.fmtTime(v), () => { saveState(); if (playing) startMusic(Math.max(0, tOut())); }));
    }
    const vol = $("#mpVol", root);
    vol.append(UI.slider("Nhạc", "vol", m, 0, 1.2, 0.01, v => Math.round(v * 100) + "", () => { if (musGain && musSrc) musGain.gain.setValueAtTime(m.vol, ac.currentTime); saveState(); }));
    vol.append(UI.slider("Tiếng gốc", "orig", m, 0, 1.2, 0.01, v => Math.round(v * 100) + "", () => { if (origGain) origGain.gain.value = m.orig; saveState(); }));
    if (musicJob && musicJob.key !== musicKey) setMusicStatus("Đang soạn nhạc…");
  }
  function trimPanel(root) {
    const T = V.trim, d = V.dur;
    root.innerHTML = `<div class="panel"><h4>Đoạn dùng</h4><div id="trSl"></div><p class="hint" id="trInfo"></p>
      <h4>Tốc độ</h4><div id="trSp"></div><h4>Khung hình</h4><div id="trFr"></div>
      <p class="hint">Video ngang: kéo "Lệch khung" để chọn phần muốn giữ trong khung dọc 9:16.</p></div>`;
    const info = () => ($("#trInfo", root).textContent = `Video gốc dài ${UI.fmtTime(d)}. Video xuất ra dài ${outDur().toFixed(1)} giây (video #tamtrang mẫu thường 11–14 giây).`);
    const sl = $("#trSl", root), maxStart = Math.max(0, d - 2);
    let lenSl;
    const after = async () => { if (T.start + T.len > d) { T.len = Math.max(2, d - T.start); lenSl.querySelector("input").value = T.len; lenSl.querySelector("span:last-child").textContent = T.len.toFixed(1) + "s"; }
      info(); saveState(); prepareMusic(); if (!playing) { await seekTo(T.start); draw(); } };
    sl.append(UI.slider("Bắt đầu từ", "start", T, 0, maxStart, 0.1, v => v.toFixed(1) + "s", after));
    sl.append((lenSl = UI.slider("Độ dài", "len", T, 2, Math.max(2, Math.min(60, d)), 0.1, v => v.toFixed(1) + "s", after)));
    info();
    $("#trSp", root).append(UI.seg([[1, "Bình thường"], [0.85, "Chậm nhẹ"], [0.7, "Chậm"]], T.speed, v => { T.speed = v; video.playbackRate = v; info(); saveState(); prepareMusic(); if (playing) startMusic(Math.max(0, tOut())); }));
    $("#trFr", root).append(UI.slider("Lệch khung", "pan", T, -1, 1, 0.01, v => Math.round(v * 100) + "", () => changed()));
    $("#trFr", root).append(UI.slider("Phóng to", "zoom", T, 1, 1.6, 0.01, v => Math.round(v * 100) + "%", () => changed()));
  }

  /* ---------------- xuất */
  function pickMime() {
    if (!window.MediaRecorder) return null;
    return ["video/mp4;codecs=avc1.42E01F,mp4a.40.2", "video/mp4;codecs=avc1.640028,mp4a.40.2", "video/mp4;codecs=avc1,mp4a.40.2", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"].find(m => MediaRecorder.isTypeSupported(m)) || "";
  }
  async function doExport() {
    if (!V || exporting) return;
    if (!V.text.content.trim() && !confirm("Video chưa có chữ. Vẫn xuất?")) return;
    const mime = pickMime(); if (mime === null || !HTMLCanvasElement.prototype.captureStream) return toast("Trình duyệt này không ghi được video. Hãy dùng Safari (iPhone) hoặc Chrome bản mới.", 5000);
    ensureAudio(); pause();
    const sheet = UI.openSheet("#resultSheet"); $("#resTitle").textContent = "Đang xuất video"; $("#resProgress").hidden = false; $("#resDone").hidden = true; $("#resBar").style.width = "0%"; $("#resMsg").textContent = "Chuẩn bị…";
    exporting = true;
    let dest, stream, rec;
    try {
      if (V.music.id !== "none" && V.music.id !== "user") { $("#resMsg").textContent = "Đang soạn nhạc…"; await prepareMusic(); }
      if (ac.state !== "running") await ac.resume();
      await R.loadFonts();
      await seekTo(V.trim.start); draw(true);
      dest = ac.createMediaStreamDestination(); mix.connect(dest); spk.gain.value = 0;
      stream = stage.out.captureStream(30);
      dest.stream.getAudioTracks().forEach(t => stream.addTrack(t));
      const opts = { videoBitsPerSecond: 8e6, audioBitsPerSecond: 160000 }; if (mime) opts.mimeType = mime;
      rec = new MediaRecorder(stream, opts); const chunks = [];
      rec.ondataavailable = e => e.data && e.data.size && chunks.push(e.data);
      const stopped = new Promise(r => (rec.onstop = r));
      rec.start(500);
      await new Promise(r => setTimeout(r, 150));
      video.playbackRate = V.trim.speed; await video.play(); playing = true; startMusic(0);
      const total = outDur(), endT = V.trim.start + V.trim.len;
      $("#resMsg").textContent = "Đang dựng video…";
      await new Promise(res => {
        const step = () => {
          if (video.currentTime >= endT || video.ended) return res();
          draw(true); const p = Math.min(1, tOut() / total); $("#resBar").style.width = (p * 100).toFixed(1) + "%"; $("#resMsg").textContent = `Đang dựng video… ${Math.round(p * 100)}%`;
          raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
        setTimeout(res, (total + 8) * 1000); // phòng khi video kẹt
      });
      draw(true); video.pause(); stopMusic(); playing = false;
      await new Promise(r => setTimeout(r, 120));
      rec.stop(); await stopped;
      const type = (rec.mimeType || mime || "video/webm").split(";")[0];
      const blob = new Blob(chunks, { type });
      if (!blob.size) throw new Error("Video xuất ra bị rỗng. Thử lại và giữ màn hình mở.");
      showResult(blob, type);
    } catch (e) {
      console.error(e); $("#resMsg").textContent = "Lỗi: " + e.message; toast("Xuất video lỗi: " + e.message, 5000);
    } finally {
      exporting = false; playing = false; cancelAnimationFrame(raf);
      if (dest) { try { mix.disconnect(dest); } catch {} } spk.gain.value = 1;
      if (stream) stream.getVideoTracks().forEach(t => t.stop());
      $("#vPlayIco").hidden = false; $("#vPlay").textContent = "▶";
      if (sheet.hidden === false && $("#resDone").hidden) { /* giữ thông báo lỗi */ }
    }
  }
  let lastBlobUrl = null;
  function showResult(blob, type) {
    const ext = type.includes("mp4") ? "mp4" : "webm", name = `dieu-suy-nghi-${UI.stamp()}.${ext}`, cap = UI.caption(V);
    if (lastBlobUrl) URL.revokeObjectURL(lastBlobUrl); lastBlobUrl = URL.createObjectURL(blob);
    $("#resTitle").textContent = "Video xong rồi"; $("#resProgress").hidden = true; $("#resDone").hidden = false;
    $("#resMedia").innerHTML = ""; const v = document.createElement("video"); v.src = lastBlobUrl; v.controls = true; v.playsInline = true; v.setAttribute("playsinline", ""); $("#resMedia").append(v);
    $("#resNote").textContent = `${name} · ${(blob.size / 1048576).toFixed(1)} MB` + (ext === "webm" ? " — máy này chỉ xuất được WebM; nên làm trên Safari/Chrome mới để có MP4." : "");
    $("#resCaption").value = cap;
    $("#resSave").onclick = async () => { const r = await UI.saveFile(blob, name); if (r === "download") toast("Đã tải video về máy"); };
    $("#resCopy").onclick = () => UI.copy($("#resCaption").value);
    DB.addHist({ id: Date.now(), type: "video", thumb: UI.thumb(stage.out, 180), caption: cap, text: V.text.content, music: V.music.id, look: V.look.preset });
  }

  /* ---------------- khởi động */
  async function init() {
    stage = new R.Stage($("#vCanvas")); stage.size(W, H); stage.blank();
    video = document.createElement("video"); video.playsInline = true; video.setAttribute("playsinline", ""); video.setAttribute("webkit-playsinline", ""); video.muted = true; video.preload = "auto"; video.crossOrigin = "anonymous";
    video.addEventListener("seeked", () => { if (!playing) draw(); });
    const pick = e => { const f = e.target.files[0]; e.target.value = ""; if (f) openFile(f); };
    $("#vFile").onchange = pick; $("#vFile2").onchange = pick;
    $("#vCanvas").onclick = () => (playing ? pause() : play());
    $("#vPlay").onclick = () => (playing ? pause() : play());
    const seek = $("#vSeek");
    seek.addEventListener("input", () => { if (!V) return; seeking = true; if (playing) pause(); video.currentTime = V.trim.start + (seek.value / 1000) * V.trim.len; });
    seek.addEventListener("change", () => (seeking = false));
    document.querySelectorAll("#vTools button").forEach(b => (b.onclick = () => { panel = b.dataset.p; renderPanel(); }));
    $("#vExport").onclick = doExport;
    document.addEventListener("visibilitychange", () => { if (document.hidden && playing && !exporting) pause(); });
    R.loadFonts().then(() => V && draw());
    // bài đang làm dở
    const [file, state] = await Promise.all([DB.get("videoFile"), DB.get("videoState")]);
    if (file && state) {
      $("#vDraftHint").hidden = false;
      $("#vResume").onclick = async () => { const um = await DB.get("userMusic"); await openFile(file, state); if (state.music && state.music.id === "user" && um) { await loadUserMusic(um, true); } };
    }
  }
  function rawFrame() {
    if (!V || !video.videoWidth) return null;
    const c = document.createElement("canvas"); c.width = video.videoWidth; c.height = video.videoHeight; c.getContext("2d").drawImage(video, 0, 0); return c;
  }
  return { init, pause, rawFrame, get state() { return V; } };
})();
