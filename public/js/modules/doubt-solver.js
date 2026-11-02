/* Smart Campus AI – Academic Doubt Solver UI: streaming, answer modes, follow-ups, server-side session memory. */
(function (w) {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const MODES = [['auto', 'Auto'], ['simple', 'Simple'], ['detailed', 'Detailed'], ['exam4', 'Exam · 4 marks'], ['exam6', 'Exam · 6 marks'], ['steps', 'Step-by-step'], ['code', 'Code explained'], ['notes', 'Short notes']];
  const FOLLOW = [['Explain this in simpler language', 'simple'], ['Give another example', 'auto'], ['Give me a short 6-mark answer', 'exam6'], ['Convert this into exam notes', 'notes'], ['Give me important MCQs from this topic', 'auto']];
  let mode = 'auto', busy = false, sid = null;
  try { sid = sessionStorage.getItem('dsSid'); } catch { /* private mode */ }
  const newSid = () => { sid = (w.crypto?.randomUUID ? w.crypto.randomUUID().replace(/-/g, '') : Math.random().toString(36).slice(2) + Date.now().toString(36)); try { sessionStorage.setItem('dsSid', sid); } catch { /* ignore */ } };
  if (!sid) newSid();

  // ---------- Markdown: headings, tables, lists, code blocks (with copy), quotes, bold/italic ----------
  function md(src) {
    const blocks = [];
    let t = String(src || '').replace(/\r/g, '').replace(/```([\w+#.-]*)[^\n]*\n([\s\S]*?)(```|$)/g, (_, l, c) => { blocks.push({ l, c: c.replace(/\n$/, '') }); return `\u0000${blocks.length - 1}\u0000`; });
    t = esc(t);
    const inl = (s) => s.replace(/`([^`\n]+)`/g, '<code>$1</code>').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(^|[^*\w])\*([^*\n]+)\*/g, '$1<i>$2</i>');
    const L = t.split('\n'), out = []; let i = 0;
    const special = (x) => /^\s*(#{1,4}\s|[-*]\s|\d+[.)]\s|&gt;|\||\u0000\d+\u0000)/.test(x);
    while (i < L.length) {
      const x = L[i]; let m;
      if (!x.trim()) { i++; continue; }
      if (/^\u0000\d+\u0000$/.test(x.trim())) { out.push(x.trim()); i++; continue; }
      if ((m = x.match(/^(#{1,4})\s+(.*)$/))) { const n = Math.min(5, m[1].length + 2); out.push(`<h${n}>${inl(m[2])}</h${n}>`); i++; continue; }
      if (/^\s*([-*_]){3,}\s*$/.test(x)) { out.push('<hr>'); i++; continue; }
      if (/^\s*\|.*\|\s*$/.test(x) && /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(L[i + 1] || '')) {
        const cells = (r) => r.trim().replace(/^\||\|$/g, '').split('|').map((c) => inl(c.trim()));
        const head = cells(x); i += 2; const rows = [];
        while (i < L.length && /^\s*\|.*\|\s*$/.test(L[i])) rows.push(cells(L[i++]));
        out.push(`<div class="ds-tbl"><table><thead><tr>${head.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`); continue;
      }
      if (/^\s*([-*]|\d+[.)])\s+/.test(x)) {
        const ord = /^\s*\d+[.)]/.test(x), items = [];
        while (i < L.length && /^\s*([-*]|\d+[.)])\s+/.test(L[i])) { items.push(inl(L[i].replace(/^\s*([-*]|\d+[.)])\s+/, ''))); i++; }
        out.push(`<${ord ? 'ol' : 'ul'}>${items.map((c) => `<li>${c}</li>`).join('')}</${ord ? 'ol' : 'ul'}>`); continue;
      }
      if (/^&gt;/.test(x)) { const q = []; while (i < L.length && /^&gt;/.test(L[i])) q.push(inl(L[i++].replace(/^&gt;\s?/, ''))); out.push(`<blockquote>${q.join('<br>')}</blockquote>`); continue; }
      const p = []; while (i < L.length && L[i].trim() && !(p.length && special(L[i]))) p.push(inl(L[i++]));
      out.push(`<p>${p.join('<br>')}</p>`);
    }
    const html = out.join('').replace(/\u0000(\d+)\u0000/g, (_, n) => { const b = blocks[n]; return `<div class="ds-code"><div class="ds-codebar"><span>${esc(b.l || 'code')}</span><button type="button" class="ds-copy">Copy</button></div><pre><code>${esc(b.c)}</code></pre></div>`; });
    const wrapped = `<div class="ds-md">${html}</div>`;
    return w.DOMPurify ? w.DOMPurify.sanitize(wrapped) : wrapped;
  }
  w.renderAcademicMarkdown = md;

  const css = `.ds-modes{display:flex;flex-wrap:wrap;gap:.4rem;justify-content:center;margin:0 0 .8rem}.ds-modes button{padding:.35rem .8rem;border-radius:99px;font-size:.72rem;font-weight:700;border:1px solid var(--border-color,#e2e8f0);background:var(--card-bg,#fff);color:var(--text-main,#0f172a);cursor:pointer}.ds-modes .on{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border-color:transparent}
.ds-thread{margin-top:1.2rem;display:flex;flex-direction:column;gap:1.1rem;width:100%}.ds-q{align-self:flex-end;max-width:88%;background:#6366f1;color:#fff;padding:.7rem 1rem;border-radius:16px 16px 4px 16px;font-size:.88rem;white-space:pre-wrap}.ds-tag{margin-left:.5rem;font-size:.62rem;background:rgba(255,255,255,.22);padding:.1rem .45rem;border-radius:99px;font-weight:800}
.ds-a{background:var(--card-bg,#fff);color:var(--text-main,#0f172a);border:1px solid var(--border-color,#e2e8f0);border-radius:18px;padding:1.1rem 1.25rem;box-shadow:0 10px 30px -18px rgba(15,23,42,.25)}.ds-think{color:#6366f1;font-weight:700;font-size:.82rem}.ds-err{color:#e11d48;font-weight:700;font-size:.82rem;margin-top:.5rem}
.ds-md{font-size:.9rem;line-height:1.65}.ds-md h3,.ds-md h4,.ds-md h5{font-weight:800;margin:1rem 0 .4rem}.ds-md h3{font-size:1.05rem}.ds-md p{margin:.45rem 0}.ds-md ul{list-style:disc;padding-left:1.3rem}.ds-md ol{list-style:decimal;padding-left:1.3rem}.ds-md li{margin:.2rem 0}.ds-md code{background:rgba(99,102,241,.12);color:#6366f1;padding:.08rem .35rem;border-radius:6px;font-size:.82em}
.ds-md blockquote{border-left:4px solid #6366f1;padding:.2rem .8rem;margin:.6rem 0;color:#64748b}.ds-tbl{overflow-x:auto;margin:.7rem 0}.ds-tbl table{border-collapse:collapse;width:100%;font-size:.82rem}.ds-tbl th,.ds-tbl td{border:1px solid var(--border-color,#e2e8f0);padding:.45rem .7rem;text-align:left}.ds-tbl th{background:rgba(99,102,241,.1)}
.ds-code{margin:.7rem 0;border-radius:12px;overflow:hidden;background:#0b1120}.ds-codebar{display:flex;justify-content:space-between;align-items:center;padding:.35rem .8rem;background:#1e293b;color:#94a3b8;font-size:.7rem;font-weight:700;text-transform:uppercase}.ds-copy{background:transparent;border:1px solid #475569;color:#e2e8f0;border-radius:6px;padding:.1rem .5rem;font-size:.68rem;cursor:pointer}
.ds-code pre{margin:0;padding:.8rem 1rem;overflow-x:auto;color:#e2e8f0;font-size:.8rem;line-height:1.5}.ds-code code{background:none;color:inherit;padding:0}
.ds-foot{display:flex;flex-wrap:wrap;gap:.4rem;margin-top:.9rem;padding-top:.8rem;border-top:1px solid var(--border-color,#e2e8f0)}.ds-foot button{padding:.3rem .75rem;border-radius:99px;font-size:.72rem;font-weight:700;border:1px solid var(--border-color,#e2e8f0);background:transparent;color:var(--text-main,#0f172a);cursor:pointer}.ds-foot button:hover{border-color:#6366f1;color:#6366f1}.ds-foot .rel{background:rgba(99,102,241,.1);color:#6366f1;border-color:transparent}`;
  const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);

  const toast = (m, t) => (w.toast ? w.toast(m, t) : alert(m));
  const label = (m) => (MODES.find((x) => x[0] === m) || [0, m])[1];
  function drawModes() {
    const box = $('dsModes'); if (!box) return;
    box.innerHTML = MODES.map(([k, n]) => `<button type="button" role="radio" aria-checked="${k === mode}" data-m="${k}" class="${k === mode ? 'on' : ''}">${n}</button>`).join('');
    box.querySelectorAll('button').forEach((b) => (b.onclick = () => { mode = b.dataset.m; drawModes(); }));
  }
  function setBusy(on) { busy = on; const b = $('solveDoubtBtn'); if (b) { b.disabled = on; b.querySelector('span').textContent = on ? 'Thinking…' : 'Ask AI'; } }
  function addTurn(q, m) {
    const el = document.createElement('div');
    el.innerHTML = `<div class="ds-q">${esc(q)}${m && m !== 'auto' ? `<span class="ds-tag">${esc(label(m))}</span>` : ''}</div><div class="ds-a" style="margin-top:.6rem"><div class="ds-body"></div><div class="ds-foot"></div></div>`;
    $('dsThread').appendChild(el); el.scrollIntoView({ behavior: 'smooth', block: 'start' }); return el;
  }
  function footer(turn, final, q) {
    const f = turn.querySelector('.ds-foot'); f.innerHTML = '';
    const add = (txt, fn, cls) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = txt; if (cls) b.className = cls; b.onclick = fn; f.appendChild(b); };
    add('Copy answer', () => navigator.clipboard.writeText(turn.querySelector('.ds-body').innerText).then(() => toast('Copied', 'ok')));
    FOLLOW.forEach(([t, m]) => add(t, () => ask(t, m)));
    ((final && final.topics) || []).forEach((t) => add('Explain: ' + t, () => ask('Explain ' + t, 'auto'), 'rel'));
  }

  async function ask(text, m) {
    if (busy) return;
    const ta = $('doubtText'); text = String(text ?? ta.value).trim();
    if (text.length < 2) return toast('Type your question first.', 'err');
    m = m || mode; ta.value = ''; ta.style.height = 'auto'; setBusy(true);
    const turn = addTurn(text, m), body = turn.querySelector('.ds-body');
    body.innerHTML = '<span class="ds-think"><i class="fas fa-circle-notch fa-spin"></i> Thinking…</span>';
    let acc = '', final = null, err = null, raf = 0;
    const paint = () => { raf = 0; body.innerHTML = md(acc.replace(/\n[>\s*_-]*Related topics\**\s*:.*$/i, '')); };
    try {
      const tok = localStorage.getItem('token') || (typeof token === 'function' ? token() : '') || '';
      const res = await fetch('/api/ai/doubt-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(tok ? { Authorization: 'Bearer ' + tok } : {})
        },
        body: JSON.stringify({ text, subject: $('doubtSubject')?.value, mode: m, session_id: sid })
      });
      if (res.status === 401) { if (typeof showLogin === 'function') showLogin(); throw new Error('Please log in again.'); }
      if (!res.ok || !res.body) throw new Error('The tutor service returned status ' + res.status + '.');
      const rd = res.body.getReader(), dec = new TextDecoder(); let buf = '';
      for (;;) {
        const { value, done } = await rd.read();
        if (value) buf += dec.decode(value, { stream: !done });
        const lines = buf.split('\n'); buf = lines.pop();
        for (const ln of lines) {
          if (!ln.startsWith('data:')) continue; const s = ln.slice(5).trim(); if (s === '[DONE]') continue;
          let d; try { d = JSON.parse(s); } catch { continue; }
          if (d.chunk) { acc += d.chunk; if (!raf) raf = requestAnimationFrame(paint); } else if (d.done) final = d; else if (d.error) err = d.error;
        }
        if (done) break;
      }
      if (buf.trim()) {
        const lines = buf.split('\n');
        for (const ln of lines) {
          if (!ln.startsWith('data:')) continue; const s = ln.slice(5).trim(); if (s === '[DONE]') continue;
          try {
            const d = JSON.parse(s);
            if (d.chunk) { acc += d.chunk; } else if (d.done) { final = d; } else if (d.error) { err = d.error; }
          } catch {}
        }
      }
    } catch (e) {
      console.warn('[DoubtSolver]', e);
      err = err || e.message;
    }
    if (raf) cancelAnimationFrame(raf);
    const content = (final && final.explanation) || acc;
    if (content && content.trim().length > 10) {
      body.innerHTML = md(content);
      footer(turn, final || { topics: [] }, text);
    } else {
      body.innerHTML = (content ? md(content) : '') + `<p class="ds-err">⚠ ${esc(err || 'No answer was received.')}</p>`;
      const f = turn.querySelector('.ds-foot');
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = 'Retry';
      b.onclick = () => { turn.remove(); ask(text, m); };
      f.appendChild(b);
    }
    setBusy(false);
  }
  w.solveDoubt = () => ask();
  w.dsNewChat = () => { newSid(); $('dsThread').innerHTML = ''; $('doubtText').focus(); };

  async function restore() {
    const th = $('dsThread'); if (!th || th.children.length || !w.api) return;
    try {
      const rows = await w.api('/ai/doubt/session/' + sid);
      for (let i = 0; i < rows.length; i++) {
        if (rows[i].role !== 'user') continue;
        const turn = addTurn(rows[i].content, null), a = rows[i + 1];
        turn.querySelector('.ds-body').innerHTML = md(a ? a.content : ''); if (a) footer(turn, null, rows[i].content);
      }
      th.firstElementChild?.scrollIntoView({ block: 'start' });
    } catch { /* new session */ }
  }

  function init() {
    drawModes();
    const ta = $('doubtText');
    if (ta && !ta.dataset.ds) {
      ta.dataset.ds = '1';
      ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(); } });
      ta.addEventListener('input', () => { ta.style.height = 'auto'; ta.style.height = Math.min(220, ta.scrollHeight) + 'px'; });
    }
    const sel = $('doubtSubject');   // student.js replaces these options with enrolled subjects: keep "Auto-detect" first
    if (sel && !sel.dataset.ds) {
      sel.dataset.ds = '1';
      const ensure = () => { if (sel.options[0]?.value !== 'Auto') { sel.insertBefore(new Option('Auto-detect subject', 'Auto'), sel.firstChild); sel.value = 'Auto'; } };
      new MutationObserver(ensure).observe(sel, { childList: true }); ensure();
    }
    document.addEventListener('click', (e) => {
      const b = e.target.closest('.ds-copy'); if (!b) return;
      navigator.clipboard.writeText(b.closest('.ds-code').querySelector('code').innerText).then(() => { b.textContent = 'Copied!'; setTimeout(() => (b.textContent = 'Copy'), 1500); });
    });
  }
  w.loaders = w.loaders || {};
  w.loaders['doubt-solver'] = async () => { init(); restore(); };
  if (document.readyState !== 'loading') init(); else document.addEventListener('DOMContentLoaded', init);
})(window);
