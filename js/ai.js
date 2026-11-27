"use strict";
// Gợi ý câu tâm trạng: Gemini (khoá của người dùng) → Groq dự phòng → kho câu có sẵn.
window.AI = (() => {
  const KEY_G = "dsn.key.gemini", KEY_Q = "dsn.key.groq";
  const get = k => { try { return localStorage.getItem(k) || ""; } catch { return ""; } };
  const keys = () => ({ gemini: get(KEY_G).trim(), groq: get(KEY_Q).trim() });
  function setKeys(g, q) { try { localStorage.setItem(KEY_G, g || ""); localStorage.setItem(KEY_Q, q || ""); } catch {} }
  const GEMINI_MODELS = ["gemini-3.6-flash", "gemini-2.5-flash"];

  const SYSTEM = `Bạn viết chữ cho page Facebook "Điều suy nghĩ": video ngắn cảnh đêm/mưa, chữ trắng nhỏ ở giữa khung, hashtag #tamtrang.
Giọng văn: tự sự, ngôi "mình" (thỉnh thoảng "bạn"), nhẹ nhàng, thật lòng, đời thường như người trẻ Việt tâm sự lúc khuya. Không sến, không triết lý sáo rỗng, không khuyên đời, không emoji, không hashtag trong câu.
Độ dài mỗi câu chữ: 1–3 câu, khoảng 15–45 từ. Có thể xuống dòng hoặc chừa 1 dòng trống giữa hai ý. Có thể kết bằng "..." khi lửng lơ.
Ví dụ đúng giọng:
- "Có những chuyện tưởng đã quên, nhưng chỉ cần một khoảnh khắc yên tĩnh là lại ùa về. Muốn tâm sự với ai đó, nhưng rồi lại sợ chẳng ai hiểu, thế là lại chọn im lặng..."
- "Đôi lúc mình cảm thấy sau này bản thân nên ở một mình, vì sợ rằng những suy nghĩ tiêu cực và tính cách của mình sẽ làm phiền đến người khác."
- "Đôi khi cảm thấy buồn nhưng chẳng dám chia sẻ, chỉ vì sợ rằng trong mắt người khác, đó chỉ là chuyện nhỏ, chẳng đáng để bận tâm."
- "Cảm giác thật tệ khi khóc trước mặt nhiều người.\\n\\nCàng tệ hơn khi họ không quan tâm đến. Nhưng khi họ dỗ mình thì lại càng khóc nhiều hơn."
- "Giống như khi trời đổ mưa bất chợt, có những nỗi buồn cũng đến mà mình chẳng kịp chuẩn bị gì cả."
Mỗi gợi ý kèm "caption": 1 câu ngắn (4–14 từ) làm caption bài đăng, khác câu chữ, gợi tò mò hoặc đồng cảm, ví dụ "Có phải bạn cũng đã từng", "Chỉ khoảnh khắc đó", "Tệ thật khi mà khóc ở trường".
Viết tiếng Việt có dấu chuẩn. Chỉ trả JSON: {"items":[{"text":"...","caption":"..."}]}`;

  function userPrompt({ n, idea, current, hasImage, kind }) {
    let s = `Viết ${n} gợi ý khác nhau (khác ý, khác cách mở đầu).`;
    if (hasImage) s += ` Ảnh đính kèm là khung hình của ${kind === "post" ? "ảnh nền bài post" : "video"}: lấy cảm hứng từ khung cảnh (mưa, đèn đường, phố đêm...) nhưng không cần tả cảnh.`;
    if (idea) s += `\nÝ tưởng của người dùng: "${idea}". Bám sát ý này.`;
    if (current) s += `\nCâu hiện tại: "${current}". ${idea ? "Viết lại theo ý tưởng trên." : "Viết các phiên bản khác hay hơn, cùng cảm xúc."}`;
    return s;
  }
  function parse(txt) {
    const t = String(txt).trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
    let j; try { j = JSON.parse(t); } catch { const m = t.match(/\{[\s\S]*\}/); if (m) j = JSON.parse(m[0]); }
    const items = (j && (j.items || j.suggestions)) || (Array.isArray(j) ? j : []);
    return items.map(x => (typeof x === "string" ? { text: x, caption: "" } : { text: String(x.text || "").trim(), caption: String(x.caption || "").trim() })).filter(x => x.text);
  }
  async function gemini(key, sys, user, image) {
    const parts = [{ text: user }]; if (image) { const m = /^data:([^;]+);base64,(.*)$/s.exec(image); parts.push({ inlineData: { mimeType: m[1], data: m[2] } }); }
    const body = JSON.stringify({ systemInstruction: { parts: [{ text: sys }] }, contents: [{ role: "user", parts }], generationConfig: { responseMimeType: "application/json", temperature: 1.0 } });
    let last;
    for (const model of GEMINI_MODELS) {
      let r;
      try { r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key }, body, signal: AbortSignal.timeout ? AbortSignal.timeout(45000) : undefined }); }
      catch (e) { last = new Error("Không kết nối được Gemini"); continue; }
      const j = await r.json().catch(() => ({}));
      if (r.ok) {
        const c = (j.candidates || [])[0] || {}; const txt = ((c.content && c.content.parts) || []).filter(p => p.text && !p.thought).map(p => p.text).join("");
        const items = parse(txt); if (items.length) return items; last = new Error("Gemini không trả câu nào"); continue;
      }
      last = new Error(r.status === 429 ? "Gemini hết lượt miễn phí, đợi một lúc rồi thử lại" : `Gemini báo lỗi: ${(j.error && j.error.message) || r.status}`);
      if (![404, 429, 500, 503].includes(r.status)) throw last;
    }
    throw last;
  }
  async function groq(key, sys, user, image) {
    const content = image ? [{ type: "text", text: user }, { type: "image_url", image_url: { url: image } }] : user;
    const model = image ? "meta-llama/llama-4-scout-17b-16e-instruct" : "llama-3.3-70b-versatile";
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
      body: JSON.stringify({ model, temperature: 0.95, response_format: { type: "json_object" }, messages: [{ role: "system", content: sys }, { role: "user", content }] }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error("Groq báo lỗi: " + ((j.error && j.error.message) || r.status));
    return parse(j.choices[0].message.content);
  }

  // trả { items, source, note }
  async function suggest({ n = 5, idea = "", current = "", image = null, kind = "video", tags = [] } = {}) {
    const k = keys(), user = userPrompt({ n, idea, current, hasImage: !!image, kind }), errs = [];
    if (k.gemini) { try { return { items: (await gemini(k.gemini, SYSTEM, user, image)).slice(0, n), source: "Gemini" }; } catch (e) { errs.push(e.message); } }
    if (k.groq) { try { return { items: (await groq(k.groq, SYSTEM, user, image)).slice(0, n), source: "Groq" }; } catch (e) { errs.push(e.message); } }
    const items = QUOTES.pick(n, tags, current ? [current] : []).map(q => ({ text: q.text, caption: q.caption }));
    return { items, source: "kho", note: errs.length ? errs[0] + " — đang dùng câu có sẵn." : (!k.gemini && !k.groq ? "Chưa có khoá AI (⚙︎ Cài đặt) — đang dùng câu có sẵn." : "") };
  }
  async function test() {
    const k = keys(); if (!k.gemini && !k.groq) throw new Error("Chưa dán khoá nào.");
    const r = await suggest({ n: 1 }); if (r.source === "kho") throw new Error(r.note || "AI không trả lời"); return r;
  }
  return { suggest, keys, setKeys, test };
})();
