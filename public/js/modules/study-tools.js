/* Smart Campus AI – AI Quiz Maker & Performance Analyzer (Practice + Exam modes, analysis, weak topics, history). */
(function (window) {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const L = 'ABCD';
  const S = { tab: 'new', quiz: null, ans: [], idx: 0, fb: {}, marks: {}, left: 0, t0: 0, timer: null, busy: false };
  const root = () => $('studyToolsContainer');
  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const toast = (m, t) => (window.toast ? window.toast(m, t === 'err' ? 'err' : 'ok') : alert(m));

  const css = `.qz{--b:var(--border-color,#e2e8f0);--c:var(--card-bg,#fff);--t:var(--text-main,#0f172a);--p:var(--p1,#6366f1);color:var(--t)}
.qz *{box-sizing:border-box}.qz .card2{background:var(--c);border:1px solid var(--b);border-radius:18px;padding:1.25rem;margin-bottom:1rem}
.qz h3{font-weight:800;font-size:1.05rem}.qz .mut{color:#64748b;font-size:.78rem}
.qz .tabs{display:flex;gap:.4rem;margin-bottom:1rem;flex-wrap:wrap}.qz .tab{padding:.55rem 1rem;border-radius:12px;font-weight:700;font-size:.8rem;border:1px solid var(--b);background:var(--c);cursor:pointer}
.qz .tab.on{background:var(--p);color:#fff;border-color:var(--p)}
.qz .grid{display:grid;gap:.8rem;grid-template-columns:repeat(auto-fit,minmax(190px,1fr))}
.qz label{font-size:.7rem;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:#64748b;display:block;margin-bottom:.3rem}
.qz input,.qz select,.qz textarea{width:100%;padding:.65rem .8rem;border:1px solid var(--b);border-radius:12px;background:transparent;color:var(--t);font-size:.85rem}
.qz .btn{padding:.65rem 1.2rem;border-radius:12px;font-weight:700;font-size:.82rem;border:1px solid var(--b);background:var(--c);color:var(--t);cursor:pointer}
.qz .btn.pri{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:0}.qz .btn:disabled{opacity:.45;cursor:not-allowed}.qz .btn.red{background:#e11d48;color:#fff;border:0}
.qz .seg{display:flex;border:1px solid var(--b);border-radius:12px;overflow:hidden}.qz .seg button{flex:1;padding:.6rem;font-weight:700;font-size:.8rem;background:transparent;color:var(--t);cursor:pointer;border:0}.qz .seg .on{background:var(--p);color:#fff}
.qz .opt{display:flex;gap:.7rem;align-items:flex-start;width:100%;text-align:left;padding:.8rem 1rem;margin:.45rem 0;border:1.5px solid var(--b);border-radius:14px;background:transparent;color:var(--t);cursor:pointer;font-size:.88rem;transition:.15s}
.qz .opt:hover:not(:disabled){border-color:var(--p);transform:translateX(2px)}.qz .opt.sel{border-color:var(--p);background:rgba(99,102,241,.12)}
.qz .opt.ok{border-color:#10b981;background:rgba(16,185,129,.14)}.qz .opt.no{border-color:#e11d48;background:rgba(225,29,72,.12)}
.qz .opt b{min-width:1.6rem;height:1.6rem;border-radius:8px;background:rgba(99,102,241,.15);display:inline-flex;align-items:center;justify-content:center;font-size:.75rem}
.qz .bar{height:8px;border-radius:99px;background:rgba(148,163,184,.25);overflow:hidden}.qz .bar i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#6366f1,#8b5cf6);transition:width .4s}
.qz .pal{display:grid;grid-template-columns:repeat(auto-fill,minmax(38px,1fr));gap:.4rem}.qz .pal button{height:38px;border-radius:10px;border:1.5px solid var(--b);background:transparent;color:var(--t);font-weight:700;font-size:.78rem;cursor:pointer}
.qz .pal .ans{background:#10b981;color:#fff;border-color:#10b981}.qz .pal .mk{background:#f59e0b;color:#fff;border-color:#f59e0b}.qz .pal .cur{outline:3px solid var(--p);outline-offset:1px}
.qz .exam{display:grid;gap:1rem;grid-template-columns:1fr 280px}@media(max-width:860px){.qz .exam{grid-template-columns:1fr}}
.qz .stat{background:rgba(99,102,241,.08);border-radius:14px;padding:.9rem;text-align:center}.qz .stat b{display:block;font-size:1.5rem;font-weight:800}.qz .stat span{font-size:.68rem;font-weight:700;text-transform:uppercase;color:#64748b}
.qz .chip{display:inline-block;padding:.2rem .6rem;border-radius:99px;font-size:.7rem;font-weight:800;margin:.15rem}.qz .g{background:rgba(16,185,129,.16);color:#059669}.qz .r{background:rgba(225,29,72,.14);color:#e11d48}.qz .a{background:rgba(245,158,11,.16);color:#b45309}
.qz .timer{font-variant-numeric:tabular-nums;font-weight:800;font-size:1.3rem;padding:.3rem .9rem;border-radius:12px;background:rgba(99,102,241,.12)}.qz .timer.low{background:rgba(225,29,72,.15);color:#e11d48;animation:qzp 1s infinite}
@keyframes qzp{50%{opacity:.55}}.qz .ring{width:120px;height:120px;border-radius:50%;display:grid;place-items:center;margin:auto}.qz .ring div{width:92px;height:92px;border-radius:50%;background:var(--c);display:grid;place-items:center;font-weight:800;font-size:1.4rem}
.qz .row{display:flex;justify-content:space-between;align-items:center;gap:.6rem;flex-wrap:wrap}.qz .hist{cursor:pointer;transition:.15s}.qz .hist:hover{border-color:var(--p)}.qz ul{padding-left:1.1rem;list-style:disc;font-size:.85rem}`;

  function shell(inner) {
    root().innerHTML = `<style>${css}</style><div class="qz">${inner}</div>`;
  }
  const tabs = () => `<div class="tabs">${[['new', 'AI Quiz Generator'], ['weak', 'Weak Topics'], ['hist', 'History']].map(([k, n]) => `<button class="tab ${S.tab === k ? 'on' : ''}" data-tab="${k}">${n}</button>`).join('')}</div>`;
  function bindTabs() { root().querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => { S.tab = b.dataset.tab; home(); })); }
  const busy = (msg) => {
    shell(`<div class="card2" style="text-align:center;padding:3rem 1rem">
      <i class="fas fa-wand-magic-sparkles fa-beat" style="font-size:2rem;color:#8b5cf6"></i>
      <h3 style="margin-top:1rem">${esc(msg)}</h3>
      <p class="mut" style="margin-top:0.4rem">AI is preparing your questions. This usually takes just a few seconds.</p>
      <button class="btn" id="qzCancelBusy" style="margin-top:1.2rem;font-size:0.85rem"><i class="fas fa-arrow-left mr-1"></i> Cancel</button>
    </div>`);
    const cancelBtn = $('qzCancelBusy');
    if (cancelBtn) cancelBtn.onclick = () => { S.busy = false; home(); };
  };

  // ---------------- home / generator ----------------
  async function home() {
    clearInterval(S.timer); S.quiz = null;
    if (S.tab === 'hist') return history();
    if (S.tab === 'weak') return weak();
    shell(`${tabs()}<div class="card2"><div class="row"><div><h3><i class="fas fa-brain" style="color:#8b5cf6"></i> AI Quiz Generator</h3><p class="mut">Type any subject or topic. Fresh university-level MCQs are generated by Gemini every time.</p></div></div>
    <div class="grid" style="margin-top:1rem">
      <div><label>Subject</label><input id="qzSub" list="qzSubs" maxlength="80" placeholder="e.g. DBMS, Computer Networks, Java"><datalist id="qzSubs">${['DBMS', 'Computer Networks', 'Operating Systems', 'Java', 'Python', 'Data Structures and Algorithms', 'Cybersecurity', 'Software Engineering'].map((s) => `<option>${s}</option>`).join('')}</datalist></div>
      <div><label>Topic / chapter (optional)</label><input id="qzTopic" maxlength="120" placeholder="e.g. Normalization"></div>
      <div><label>Difficulty</label><select id="qzDiff"><option>Mixed</option><option>Easy</option><option>Medium</option><option>Hard</option></select></div>
      <div><label>Questions</label><select id="qzCount"><option>10</option><option>20</option><option>30</option><option>50</option></select></div>
    </div>
    <div class="grid" style="margin-top:.8rem"><div><label>Mode</label><div class="seg" id="qzMode"><button class="on" data-m="practice">Practice</button><button data-m="exam">Exam</button></div></div>
      <div id="qzMinW" style="display:none"><label>Exam time (minutes)</label><input id="qzMin" type="number" min="5" max="180" placeholder="auto"></div></div>
    <div style="margin-top:.8rem"><label>Custom instructions (optional)</label><textarea id="qzIns" rows="2" maxlength="300" placeholder="e.g. focus on SQL queries and numericals"></textarea></div>
    <button class="btn pri" id="qzGo" style="margin-top:1rem;width:100%"><i class="fas fa-bolt"></i> Generate Quiz</button></div>`);
    bindTabs();
    let mode = 'practice';
    $('qzMode').querySelectorAll('button').forEach((b) => (b.onclick = () => { mode = b.dataset.m; $('qzMode').querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); $('qzMinW').style.display = mode === 'exam' ? '' : 'none'; }));
    $('qzGo').onclick = () => {
      const subject = $('qzSub').value.trim();
      if (subject.length < 2) return toast('Enter a subject first.', 'err');
      start('/quiz/generate', { subject, topic: $('qzTopic').value.trim(), difficulty: $('qzDiff').value, count: +$('qzCount').value, mode, minutes: +$('qzMin').value || undefined, instructions: $('qzIns').value.trim() });
    };
  }

  async function start(path, body) {
    if (S.busy) return; S.busy = true; busy('Generating your quiz…');
    try { begin(await window.api(path, { body })); } catch (e) { toast(e.message, 'err'); home(); } finally { S.busy = false; }
  }
  function begin(q) {
    S.quiz = q; S.ans = q.questions.map(() => null); S.idx = 0; S.fb = {}; S.marks = {}; S.t0 = Date.now();
    if (q.mode === 'exam') { S.left = q.duration; S.timer = setInterval(tick, 1000); exam(); } else practice();
  }

  // ---------------- practice ----------------
  function practice() {
    const q = S.quiz, i = S.idx, Q = q.questions[i], fb = S.fb[i], last = i === q.total - 1, done = Object.keys(S.fb).length;
    shell(`<div class="card2"><div class="row"><b>${esc(q.subject)}</b><span class="mut">Question ${i + 1} of ${q.total} · ${done} answered</span></div><div class="bar" style="margin:.7rem 0"><i style="width:${(done / q.total) * 100}%"></i></div>
      <span class="chip a">${esc(Q.topic)}</span><span class="chip g">${esc(Q.difficulty)}</span>
      <p style="font-weight:700;margin:.8rem 0">${esc(Q.question)}</p>
      ${Q.options.map((o, k) => `<button class="opt ${fb ? (k === fb.correct_index ? 'ok' : k === S.ans[i] ? 'no' : '') : S.ans[i] === k ? 'sel' : ''}" data-k="${k}" ${fb ? 'disabled' : ''}><b>${L[k]}</b><span>${esc(o)}</span></button>`).join('')}
      ${fb ? `<div class="card2" style="margin-top:.8rem;background:${fb.correct ? 'rgba(16,185,129,.1)' : 'rgba(225,29,72,.08)'}"><b>${fb.correct ? '✅ Correct!' : `❌ Incorrect. Correct answer: ${L[fb.correct_index]}`}</b><p style="font-size:.85rem;margin-top:.4rem">${esc(fb.explanation)}</p></div>` : ''}
      <div class="row" style="margin-top:1rem"><button class="btn" id="qzPrev" ${i ? '' : 'disabled'}>← Previous</button>
        ${fb ? '' : '<button class="btn pri" id="qzSubmit">Submit Answer</button>'}
        ${last ? '<button class="btn pri" id="qzFinish">Finish Quiz</button>' : '<button class="btn" id="qzNext">Next →</button>'}</div></div>`);
    root().querySelectorAll('.opt').forEach((b) => (b.onclick = () => { S.ans[i] = +b.dataset.k; practice(); }));
    $('qzPrev').onclick = () => { S.idx--; practice(); };
    if ($('qzNext')) $('qzNext').onclick = () => { S.idx++; practice(); };
    if ($('qzSubmit')) $('qzSubmit').onclick = async () => {
      if (S.ans[i] === null) return toast('Select an option first.', 'err');
      try { S.fb[i] = await window.api(`/quiz/attempts/${q.id}/check`, { body: { index: i, choice: S.ans[i] } }); practice(); } catch (e) { toast(e.message, 'err'); }
    };
    if ($('qzFinish')) $('qzFinish').onclick = () => { const miss = q.total - done; if (!miss || confirm(`${miss} question(s) not submitted yet and will count as unanswered. Finish anyway?`)) finish(); };
  }

  // ---------------- exam ----------------
  function tick() { S.left--; const t = $('qzTimer'); if (t) { t.textContent = fmt(Math.max(0, S.left)); t.classList.toggle('low', S.left <= 60); } if (S.left <= 0) { toast("Time's up. Submitting your test…"); finish(); } }
  function exam() {
    const q = S.quiz, i = S.idx, Q = q.questions[i], answered = S.ans.filter((a) => a !== null).length;
    shell(`<div class="exam"><div class="card2"><div class="row"><b>${esc(q.subject)} · Exam</b><span class="timer ${S.left <= 60 ? 'low' : ''}" id="qzTimer">${fmt(Math.max(0, S.left))}</span></div>
      <p class="mut" style="margin-top:.6rem">Question ${i + 1} of ${q.total}</p><p style="font-weight:700;margin:.6rem 0 1rem">${esc(Q.question)}</p>
      ${Q.options.map((o, k) => `<button class="opt ${S.ans[i] === k ? 'sel' : ''}" data-k="${k}"><b>${L[k]}</b><span>${esc(o)}</span></button>`).join('')}
      <div class="row" style="margin-top:1rem"><div><button class="btn" id="qzPrev" ${i ? '' : 'disabled'}>← Previous</button> <button class="btn" id="qzNext" ${i < q.total - 1 ? '' : 'disabled'}>Next →</button></div>
        <div><button class="btn" id="qzMark">${S.marks[i] ? '★ Unmark' : '☆ Mark for Review'}</button> <button class="btn" id="qzClear">Clear Response</button></div></div></div>
      <div class="card2"><h3>Question Palette</h3><div class="pal" style="margin:.7rem 0">${q.questions.map((_, k) => `<button data-q="${k}" class="${S.marks[k] ? 'mk' : S.ans[k] !== null ? 'ans' : ''} ${k === i ? 'cur' : ''}">${k + 1}</button>`).join('')}</div>
      <p class="mut"><span class="chip g">Answered ${answered}</span><span class="chip a">Marked ${Object.values(S.marks).filter(Boolean).length}</span><span class="chip r">Unanswered ${q.total - answered}</span></p>
      <button class="btn red" id="qzEnd" style="width:100%;margin-top:.8rem">Submit Test</button></div></div>`);
    root().querySelectorAll('.opt').forEach((b) => (b.onclick = () => { S.ans[i] = +b.dataset.k; exam(); }));
    root().querySelectorAll('[data-q]').forEach((b) => (b.onclick = () => { S.idx = +b.dataset.q; exam(); }));
    $('qzPrev').onclick = () => { S.idx--; exam(); }; $('qzNext').onclick = () => { S.idx++; exam(); };
    $('qzMark').onclick = () => { S.marks[i] = !S.marks[i]; exam(); }; $('qzClear').onclick = () => { S.ans[i] = null; exam(); };
    $('qzEnd').onclick = () => { const m = Object.values(S.marks).filter(Boolean).length; if (confirm(`Submit test?\nAnswered: ${answered}/${q.total}\nUnanswered: ${q.total - answered}${m ? `\nMarked for review: ${m}` : ''}\n\nYou cannot change answers after submitting.`)) finish(); };
  }

  // ---------------- submit & results ----------------
  async function finish() {
    if (S.busy || !S.quiz) return; S.busy = true; clearInterval(S.timer); busy('Grading and analysing your performance…');
    const q = S.quiz, taken = Math.round((Date.now() - S.t0) / 1000);
    try { S.quiz = null; result(await window.api(`/quiz/attempts/${q.id}/submit`, { body: { answers: S.ans, time_taken: taken } })); }
    catch (e) { toast(e.message, 'err'); S.quiz = q; q.mode === 'exam' ? exam() : practice(); } finally { S.busy = false; }
  }
  const barRow = (t) => `<div style="margin:.55rem 0"><div class="row"><span style="font-size:.82rem;font-weight:700">${esc(t.topic)}</span><span class="mut">${t.correct}/${t.total} · ${t.accuracy}%</span></div><div class="bar"><i style="width:${t.accuracy}%;background:${t.accuracy >= 75 ? '#10b981' : t.accuracy >= 60 ? '#f59e0b' : '#e11d48'}"></i></div></div>`;
  function result(r) {
    const a = r.analysis || {}, topics = a.topics || [], col = r.accuracy >= 75 ? '#10b981' : r.accuracy >= 50 ? '#f59e0b' : '#e11d48';
    shell(`${tabs()}<div class="card2"><div class="row"><div><h3>${esc(r.subject)} — ${r.mode === 'exam' ? 'Exam' : 'Practice'} Result</h3><p class="mut">${esc(r.topic || 'All topics')} · ${esc(r.difficulty)}</p></div>
      <div class="ring" style="background:conic-gradient(${col} ${r.accuracy * 3.6}deg,rgba(148,163,184,.25) 0)"><div>${r.accuracy}%</div></div></div>
      <div class="grid" style="margin-top:1rem;grid-template-columns:repeat(auto-fit,minmax(110px,1fr))">${[['Total', r.total], ['Correct', r.correct], ['Incorrect', r.incorrect], ['Unanswered', r.unanswered], ['Marks', `${r.correct}/${r.total}`], ['Accuracy', r.accuracy + '%'], ['Time', fmt(r.time_taken)]].map(([n, v]) => `<div class="stat"><b>${v}</b><span>${n}</span></div>`).join('')}</div></div>
      <div class="card2"><h3>Topic-wise Performance</h3>${topics.map(barRow).join('')}<p style="margin-top:.8rem"><b class="mut">STRONG</b> ${(a.strong_topics || []).map((t) => `<span class="chip g">${esc(t)}</span>`).join('') || '<span class="mut">none yet</span>'}<br><b class="mut">WEAK</b> ${(a.weak_topics || []).map((t) => `<span class="chip r">${esc(t)}</span>`).join('') || '<span class="mut">none 🎉</span>'}</p></div>
      <div class="card2"><h3><i class="fas fa-user-graduate" style="color:#8b5cf6"></i> AI Feedback ${a.engine === 'gemini' ? '' : '<span class="mut">(computed from your results)</span>'}</h3><p style="margin:.5rem 0;font-size:.88rem">${esc(a.summary)}</p>
      ${(a.weak_reasons || []).length ? `<b class="mut">WHY YOU LOST MARKS</b><ul>${a.weak_reasons.map((w) => `<li><b>${esc(w.topic)}:</b> ${esc(w.why)}</li>`).join('')}</ul>` : ''}
      ${(a.revise || []).length ? `<b class="mut">REVISE</b><ul>${a.revise.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      ${(a.practice_next || []).length ? `<b class="mut">PRACTISE NEXT</b><ul>${a.practice_next.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      ${(a.plan || []).length ? `<b class="mut">REVISION PLAN</b><ul>${a.plan.map((p) => `<li><b>${esc(p.day)}:</b> ${esc(p.task)}</li>`).join('')}</ul>` : ''}</div>
      <div class="row"><button class="btn pri" id="qzRev">Review all answers</button><button class="btn" id="qzWk">Practice weak topics</button><button class="btn" id="qzNew">New quiz</button></div>`);
    bindTabs(); $('qzNew').onclick = () => { S.tab = 'new'; home(); }; $('qzWk').onclick = () => start('/quiz/weak-practice', { count: 10 }); $('qzRev').onclick = () => review(r);
  }
  function review(r) {
    shell(`<div class="row" style="margin-bottom:1rem"><h3>Answer Review · ${esc(r.subject)}</h3><button class="btn" id="qzBack">← Back to result</button></div>${r.questions.map((Q, i) => {
      const a = r.answers[i];
      return `<div class="card2"><span class="chip ${a === Q.correct ? 'g' : 'r'}">${a === null ? 'Unanswered' : a === Q.correct ? 'Correct' : 'Incorrect'}</span><span class="chip a">${esc(Q.topic)}</span><p style="font-weight:700;margin:.5rem 0">${i + 1}. ${esc(Q.question)}</p>
      ${Q.options.map((o, k) => `<div class="opt ${k === Q.correct ? 'ok' : k === a ? 'no' : ''}" style="cursor:default"><b>${L[k]}</b><span>${esc(o)}</span></div>`).join('')}<p style="font-size:.84rem;margin-top:.5rem"><b>Explanation:</b> ${esc(Q.explanation)}</p></div>`;
    }).join('')}`);
    $('qzBack').onclick = () => result(r);
  }

  // ---------------- history & weak topics ----------------
  async function history() {
    shell(`${tabs()}<div class="card2 mut">Loading history…</div>`); bindTabs();
    try {
      const h = await window.api('/quiz/history'), pts = h.slice(0, 12).reverse();
      const delta = h.length > 1 ? Math.round((h[0].accuracy - h[1].accuracy) * 10) / 10 : null;
      const spark = pts.length > 1 ? `<svg viewBox="0 0 200 50" style="width:100%;height:60px"><polyline fill="none" stroke="#8b5cf6" stroke-width="2.5" points="${pts.map((p, i) => `${(i / (pts.length - 1)) * 196 + 2},${48 - (p.accuracy / 100) * 44}`).join(' ')}"/></svg>` : '';
      shell(`${tabs()}${h.length ? `<div class="card2"><div class="row"><h3>Improvement Over Time</h3>${delta === null ? '' : `<span class="chip ${delta >= 0 ? 'g' : 'r'}">${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta)}% vs previous attempt</span>`}</div>${spark}<p class="mut">Average of last ${Math.min(5, h.length)}: ${Math.round((h.slice(0, 5).reduce((s, x) => s + x.accuracy, 0) / Math.min(5, h.length)) * 10) / 10}%</p></div>` : ''}
        ${h.map((x) => `<div class="card2 hist" data-id="${x.id}"><div class="row"><div><b>${esc(x.subject)}</b> <span class="chip a">${x.mode}</span><p class="mut">${esc(x.topic || 'All topics')} · ${esc(x.difficulty)} · ${esc(x.created_at)}</p></div><div style="text-align:right"><b style="font-size:1.2rem">${x.correct}/${x.total}</b><p class="mut">${x.accuracy}% · ${fmt(x.time_taken)}</p></div></div></div>`).join('') || '<div class="card2 mut">No completed quizzes yet. Generate one to get started.</div>'}`);
      bindTabs(); root().querySelectorAll('.hist').forEach((c) => (c.onclick = async () => { try { result(await window.api('/quiz/attempts/' + c.dataset.id)); } catch (e) { toast(e.message, 'err'); } }));
    } catch (e) { toast(e.message, 'err'); }
  }
  async function weak() {
    shell(`${tabs()}<div class="card2 mut">Analysing your attempts…</div>`); bindTabs();
    try {
      const w = await window.api('/quiz/weak-topics'), wk = w.topics.filter((t) => t.weak);
      shell(`${tabs()}<div class="card2"><div class="row"><div><h3>Weak Topics</h3><p class="mut">Calculated from your real quiz attempts. A topic is weak below 60% accuracy.</p></div><button class="btn pri" id="qzWk" ${wk.length ? '' : 'disabled'}>Practice Weak Topics</button></div>
        ${wk.map((t) => `${barRow(t)}<p class="mut" style="margin:-.2rem 0 .4rem">${esc(t.subject)}${t.improving === null ? '' : ` · ${t.improving >= 0 ? '▲ improving' : '▼ declining'} ${Math.abs(t.improving)}% since first attempt`}</p>`).join('') || '<p class="mut" style="margin-top:.8rem">No weak topics detected yet. Complete a few quizzes and they will appear here.</p>'}</div>
        ${w.subjects.length ? `<div class="card2"><h3>Subject-wise Performance</h3>${w.subjects.map((s) => barRow({ topic: s.subject, ...s })).join('')}</div>` : ''}`);
      bindTabs(); if ($('qzWk')) $('qzWk').onclick = () => start('/quiz/weak-practice', { count: 10 });
    } catch (e) { toast(e.message, 'err'); }
  }

  window.addEventListener('beforeunload', (e) => { if (S.quiz && S.quiz.mode === 'exam') { e.preventDefault(); e.returnValue = ''; } });
  window.module_study_tools = { render: home };
  if (window.loaders) window.loaders['study-tools'] = async () => { if (!S.quiz) { S.tab = 'new'; home(); } };
})(window);
