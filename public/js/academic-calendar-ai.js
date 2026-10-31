/* Smart Campus AI - Academic Calendar AI Optimizer
 * Add-on for the "Annual Academic Calendar & Institutional Working Mechanism" section (#academic-calendar).
 * Self-contained: no backend calls. Reads the page's own DOM (attendance, tasks, selected year/term),
 * runs a rule-based scoring engine on a milestone model, and renders an AI advisor panel.
 * NOTE: dates/holidays below are sample data - replace with your institution's official notice.
 */
(function () {
  'use strict';
  if (window.__acAiInit) return;
  window.__acAiInit = true;

  /* ---------- helpers ---------- */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var pad = function (n) { return String(n).padStart(2, '0'); };
  var iso = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  var D = function (s) { var p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); };
  var D0 = function (d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); };
  var DAY = 864e5;
  var diffDays = function (a, b) { return Math.round((D0(b) - D0(a)) / DAY); };
  var addDays = function (d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return D0(x); };
  var fmt = function (d) { return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); };
  var fmtFull = function (d) { return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); };
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var esc = function (v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  function num(sel) {
    var el = $(sel); if (!el) return null;
    var v = parseFloat((el.textContent || '').replace(/[^\d.]/g, ''));
    return isFinite(v) ? v : null;
  }

  /* ---------- calendar model (sample data - verify against official notice) ---------- */
  var REQUIRED_DAYS = 90;
  var TERMS = {
    odd:  { label: 'Odd Sem',  start: '2026-08-17', last: '2026-12-11', see: '2026-12-14' },
    even: { label: 'Even Sem', start: '2027-01-18', last: '2027-04-30', see: '2027-05-03' }
  };
  var HOLIDAYS = {
    '2026-09-14': 'Ganesh Chaturthi', '2026-10-02': 'Gandhi Jayanti', '2026-10-20': 'Dussehra',
    '2026-11-08': 'Diwali', '2026-11-24': 'Guru Nanak Jayanti', '2026-12-25': 'Christmas',
    '2027-01-26': 'Republic Day', '2027-03-22': 'Holi'
  };
  /* type: exam | assignment | class | placement ; w = effort/stress weight 1-5 ; prep = ideal prep days */
  var COMMON = [
    { d: '2026-09-21', t: 'CIE-1 (Internal Test 1)', type: 'exam', w: 4, prep: 10 },
    { d: '2026-11-23', t: 'CIE-2 / Model Pre-SEE', type: 'exam', w: 5, prep: 14 },
    { d: '2026-11-25', t: 'Attendance audit cutoff (75%)', type: 'class', w: 2, prep: 0, audit: true },
    { d: '2026-12-14', t: 'University SEE begins', type: 'exam', w: 5, prep: 21 },
    { d: '2027-03-01', t: 'CIE-1 (Even Sem)', type: 'exam', w: 4, prep: 10 },
    { d: '2027-04-12', t: 'CIE-2 / Model Pre-SEE (Even Sem)', type: 'exam', w: 5, prep: 14 },
    { d: '2027-04-14', t: 'Attendance audit cutoff (75%)', type: 'class', w: 2, prep: 0, audit: true },
    { d: '2027-05-03', t: 'University SEE begins (Even Sem)', type: 'exam', w: 5, prep: 21 }
  ];
  var BY_YEAR = {
    1: [
      { d: '2026-09-05', t: 'Diagnostic audit (Maths / Physics)', type: 'exam', w: 3, prep: 7 },
      { d: '2026-11-16', t: 'C Programming lab internal', type: 'assignment', w: 3, prep: 7 },
      { d: '2027-02-20', t: 'Engineering Graphics practical', type: 'assignment', w: 3, prep: 7 }
    ],
    2: [
      { d: '2026-10-24', t: 'Tech hackathon (college)', type: 'placement', w: 3, prep: 5 },
      { d: '2026-11-11', t: 'Mini-Project Review 1', type: 'assignment', w: 4, prep: 10 },
      { d: '2026-11-14', t: 'Industrial visit', type: 'class', w: 1, prep: 0 },
      { d: '2026-12-02', t: 'Mini-Project Review 2', type: 'assignment', w: 4, prep: 10 },
      { d: '2027-03-15', t: 'Mini-Project final demo & viva', type: 'assignment', w: 5, prep: 14 }
    ],
    3: [
      { d: '2026-11-05', t: 'Pre-placement aptitude test', type: 'placement', w: 3, prep: 10 },
      { d: '2026-11-09', t: 'Specialization lab practical', type: 'assignment', w: 3, prep: 7 },
      { d: '2026-12-04', t: 'Summer-internship application deadline', type: 'placement', w: 3, prep: 7 },
      { d: '2027-03-10', t: 'Internship project review', type: 'assignment', w: 4, prep: 10 }
    ],
    4: [
      { d: '2026-11-04', t: 'Capstone Review 1', type: 'assignment', w: 4, prep: 10 },
      { d: '2026-11-12', t: 'Tier-1 placement drive', type: 'placement', w: 5, prep: 14 },
      { d: '2026-11-30', t: 'IEEE paper submission', type: 'assignment', w: 4, prep: 14 },
      { d: '2027-04-05', t: 'Capstone thesis defence', type: 'assignment', w: 5, prep: 21 }
    ]
  };

  function termOf(d) { return d <= D('2026-12-31') ? 'odd' : 'even'; }
  function isTeaching(d) { return d.getDay() !== 0 && !HOLIDAYS[iso(d)]; }
  function teachingDays(a, b) {
    var n = 0, c = D0(a), end = D0(b);
    while (c <= end) { if (isTeaching(c)) n++; c = addDays(c, 1); }
    return n;
  }

  /* ---------- state ---------- */
  var state = { year: 2, scope: 'all' };
  (function initYear() {
    var b = $('#calEnrolledYearBadge');
    var m = b && /Year\s*(\d)/i.exec(b.textContent || '');
    if (m) state.year = Number(m[1]);
  })();

  /* ---------- AI engine ---------- */
  function buildModel() {
    var today = D0(new Date());
    var all = COMMON.concat(BY_YEAR[state.year] || []);
    var evs = all.filter(function (e) { return state.scope === 'all' || termOf(D(e.d)) === state.scope; })
                 .sort(function (a, b) { return a.d < b.d ? -1 : 1; });
    var upcoming = evs.filter(function (e) { return D(e.d) >= today; });
    var termKey = state.scope === 'all' ? (today > D(TERMS.odd.see) ? 'even' : 'odd') : state.scope;
    var m = {
      today: today, evs: evs, all: all, upcoming: upcoming, termKey: termKey,
      att: num('#attendanceRate') != null ? num('#attendanceRate') : num('#hubAttPercent'),
      attended: num('#hubTotalAttended'), totalClasses: num('#hubTotalClasses'),
      pending: num('#pendingTasks')
    };
    m.comp = compliance(termKey, today);
    m.weeks = weeklyLoad(all, today);
    m.warnings = detectWarnings(m);
    m.ready = readiness(m);
    m.plan = buildPlan(m);
    return m;
  }

  function compliance(termKey, today) {
    var T = TERMS[termKey], s = D(T.start), l = D(T.last);
    var total = teachingDays(s, l);
    var done = today < s ? 0 : teachingDays(s, today < l ? today : l);
    var remain = today >= l ? 0 : (today < s ? total : teachingDays(addDays(today, 1), l));
    var need = Math.max(0, REQUIRED_DAYS - done);
    var upcomingHols = Object.keys(HOLIDAYS).filter(function (k) { var d = D(k); return d > today && d <= l && d.getDay() !== 0; })
      .map(function (k) { return { d: D(k), n: HOLIDAYS[k] }; });
    return { term: T, total: total, done: done, remain: remain, need: need, spare: remain - need, hols: upcomingHols, over: today >= l };
  }

  function weeklyLoad(all, today) {
    var mon = addDays(today, -((today.getDay() + 6) % 7));
    var weeks = [];
    for (var i = 0; i < 8; i++) {
      var s = addDays(mon, i * 7), e = addDays(s, 6);
      var inWeek = all.filter(function (x) { var d = D(x.d); return d >= s && d <= e; });
      weeks.push({ start: s, load: inWeek.reduce(function (a, x) { return a + x.w; }, 0), evs: inWeek });
    }
    return weeks;
  }

  function detectWarnings(m) {
    var out = [], ev = m.all.slice().sort(function (a, b) { return a.d < b.d ? -1 : 1; });
    for (var i = 0; i < ev.length - 1; i++) {
      var a = ev[i], b = ev[i + 1], gap = diffDays(D(a.d), D(b.d));
      if (D(b.d) >= m.today && a.w >= 3 && b.w >= 3 && gap <= 2 && !a.audit && !b.audit) {
        out.push({ sev: 'high', text: '<b>' + esc(a.t) + '</b> and <b>' + esc(b.t) + '</b> fall only ' + (gap === 0 ? 'on the same day' : gap + ' day(s) apart') + '. Pull prep for the second one forward.' });
      }
    }
    m.weeks.forEach(function (w) {
      if (w.load >= 9) out.push({ sev: 'high', text: 'Week of <b>' + fmt(w.start) + '</b> is overloaded (load ' + w.load + '): ' + w.evs.map(function (x) { return esc(x.t); }).join(', ') + '.' });
    });
    if (m.att != null && m.att < 75) out.push({ sev: 'high', text: 'Attendance is <b>' + m.att + '%</b>, below the 75% gate. Exam debarment risk until it recovers.' });
    else if (m.att != null && m.att < 80) out.push({ sev: 'med', text: 'Attendance is <b>' + m.att + '%</b>, only ' + (m.att - 75).toFixed(1) + ' points above the 75% gate.' });
    if (m.comp.spare < 0 && !m.comp.over) out.push({ sev: 'high', text: 'Only ' + m.comp.remain + ' teaching days remain but ' + m.comp.need + ' are needed to reach ' + REQUIRED_DAYS + '. Shortfall of <b>' + (-m.comp.spare) + ' days</b>.' });
    else if (m.comp.spare >= 0 && m.comp.spare <= 3 && !m.comp.over) out.push({ sev: 'med', text: 'Instructional buffer is just <b>' + m.comp.spare + ' day(s)</b>. Any extra holiday breaks the ' + REQUIRED_DAYS + '-day rule.' });
    return out;
  }

  function readiness(m) {
    var score = 100, f = [];
    if (m.att != null) {
      if (m.att < 75) { score -= 30; f.push({ ok: false, t: 'Attendance below 75% (' + m.att + '%)' }); }
      else if (m.att < 80) { score -= 12; f.push({ ok: false, t: 'Attendance close to the limit (' + m.att + '%)' }); }
      else f.push({ ok: true, t: 'Attendance healthy (' + m.att + '%)' });
    } else f.push({ ok: true, t: 'Attendance not loaded yet (skipped)' });
    var n14 = m.upcoming.filter(function (e) { return diffDays(m.today, D(e.d)) <= 14; });
    var load = n14.reduce(function (a, e) { return a + e.w; }, 0);
    var lp = Math.min(25, load * 2.5);
    score -= lp;
    f.push({ ok: lp < 12, t: 'Next 14 days: ' + n14.length + ' milestone(s), load ' + load });
    if (m.pending != null) {
      var pp = Math.min(15, m.pending * 3); score -= pp;
      f.push({ ok: pp < 6, t: m.pending + ' pending task(s)' });
    }
    if (m.comp.spare < 0 && !m.comp.over) { score -= 10; f.push({ ok: false, t: 'Instructional-day shortfall' }); }
    score = Math.max(0, Math.min(100, Math.round(score)));
    return { score: score, band: score >= 75 ? 'Strong' : score >= 50 ? 'Watch' : 'At risk', factors: f };
  }

  function buildPlan(m) {
    var out = [];
    m.upcoming.forEach(function (e) {
      var days = diffDays(m.today, D(e.d));
      if (e.prep > 0 && days <= 35) {
        var startBy = addDays(D(e.d), -e.prep), hrs = Math.min(4.5, 1 + e.w * 0.6);
        out.push({
          key: e.d + '|' + e.t, title: 'Prepare: ' + e.t, date: e.d, days: days,
          priority: (days <= 7 || e.w >= 5) ? 'High' : 'Medium', hours: hrs,
          when: startBy <= m.today ? 'Start now' : 'Start by ' + fmt(startBy)
        });
      }
    });
    var audit = m.upcoming.filter(function (e) { return e.audit; })[0];
    if (audit && m.att != null && m.att < 80) {
      out.push({ key: audit.d + '|attendance-recovery', title: 'Attendance recovery before audit', date: audit.d, days: diffDays(m.today, D(audit.d)), priority: 'High', hours: 0, when: 'Attend every class' });
    }
    out.sort(function (a, b) { return a.days - b.days; });
    return out.slice(0, 6);
  }

  function attendanceMath(m) {
    if (m.attended == null || m.totalClasses == null || !m.totalClasses) return null;
    var A = m.attended, T = m.totalClasses;
    if (A / T >= 0.75) return { safe: true, k: Math.floor((A - 0.75 * T) / 0.75) };
    return { safe: false, k: Math.ceil((0.75 * T - A) / 0.25) };
  }

  /* ---------- UI ---------- */
  function injectStyle() {
    if ($('#ac-ai-style')) return;
    var s = document.createElement('style'); s.id = 'ac-ai-style';
    s.textContent = [
      '.acai{margin-bottom:2rem;border:1px solid rgba(129,140,248,.3);border-radius:20px;padding:20px;background:linear-gradient(145deg,rgba(30,27,75,.55),rgba(15,23,42,.8));color:#e2e8f0;box-shadow:0 18px 44px -24px rgba(0,0,0,.8)}',
      '.acai-head{display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;margin-bottom:14px}',
      '.acai-title{display:flex;gap:12px;align-items:center}',
      '.acai-title h3{font-size:18px;font-weight:800;color:#fff;margin:0}',
      '.acai-title p{font-size:11px;color:#94a3b8;margin:2px 0 0}',
      '.acai-orb{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;color:#fff;background:linear-gradient(135deg,#6366f1,#06b6d4);box-shadow:0 8px 20px -6px rgba(99,102,241,.7)}',
      '.acai-btn{border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);color:#e2e8f0;border-radius:10px;padding:8px 12px;font-size:11px;font-weight:700;transition:.15s}',
      '.acai-btn:hover{background:rgba(99,102,241,.28);border-color:rgba(129,140,248,.6)}',
      '.acai-btn.primary{background:linear-gradient(135deg,#6366f1,#4f46e5);border-color:transparent;color:#fff}',
      '.acai-steps{display:flex;flex-wrap:wrap;gap:8px;list-style:none;margin:0 0 14px;padding:0}',
      '.acai-steps li{font-size:10px;font-weight:700;padding:5px 10px;border-radius:99px;border:1px solid rgba(255,255,255,.1);color:#64748b;display:flex;gap:6px;align-items:center}',
      '.acai-steps li.run{color:#a5b4fc;border-color:rgba(129,140,248,.5)}',
      '.acai-steps li.done{color:#6ee7b7;border-color:rgba(16,185,129,.35)}',
      '.acai-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-bottom:12px}',
      '.acai-grid2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-bottom:12px}',
      '@media(max-width:1100px){.acai-grid{grid-template-columns:1fr}.acai-grid2{grid-template-columns:1fr}}',
      '.acai-card{background:rgba(2,6,23,.45);border:1px solid rgba(148,163,184,.16);border-radius:14px;padding:14px}',
      '.acai-card h4{font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#94a3b8;margin:0 0 10px}',
      '.acai-ring{display:flex;gap:14px;align-items:center}',
      '.acai-ring svg{width:92px;height:92px;flex:none}',
      '.acai-score{font-size:26px;font-weight:900;color:#fff}',
      '.acai-band{font-size:11px;font-weight:800;padding:2px 8px;border-radius:99px;display:inline-block}',
      '.acai-band.Strong{background:rgba(16,185,129,.18);color:#6ee7b7}.acai-band.Watch{background:rgba(245,158,11,.18);color:#fcd34d}.acai-band.At{background:rgba(244,63,94,.18);color:#fda4af}',
      '.acai-list{list-style:none;margin:10px 0 0;padding:0;font-size:11px;color:#cbd5e1;display:grid;gap:5px}',
      '.acai-list i{width:14px}',
      '.acai-bars{display:flex;gap:6px;align-items:flex-end;height:96px}',
      '.acai-bar{flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:4px;height:100%}',
      '.acai-bar span.b{width:100%;border-radius:6px 6px 2px 2px;min-height:4px}',
      '.acai-bar small{font-size:9px;color:#94a3b8}',
      '.lv-low{background:#10b981}.lv-med{background:#f59e0b}.lv-high{background:#f43f5e}',
      '.acai-kv{display:grid;gap:8px;font-size:12px}',
      '.acai-kv div{display:flex;justify-content:space-between;gap:10px;border-bottom:1px solid rgba(148,163,184,.12);padding-bottom:6px}',
      '.acai-kv span:first-child{color:#94a3b8}.acai-kv b{color:#fff;text-align:right}',
      '.acai-warn{font-size:12px;line-height:1.5;padding:9px 11px;border-radius:10px;margin-bottom:7px;border:1px solid}',
      '.acai-warn.high{background:rgba(244,63,94,.1);border-color:rgba(244,63,94,.3);color:#fecdd3}',
      '.acai-warn.med{background:rgba(245,158,11,.1);border-color:rgba(245,158,11,.3);color:#fde68a}',
      '.acai-warn.ok{background:rgba(16,185,129,.1);border-color:rgba(16,185,129,.3);color:#a7f3d0}',
      '.acai-item{display:flex;gap:10px;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid rgba(148,163,184,.12);font-size:12px}',
      '.acai-item:last-child{border-bottom:0}',
      '.acai-pill{font-size:9px;font-weight:800;padding:2px 7px;border-radius:99px;white-space:nowrap}',
      '.acai-pill.High{background:rgba(244,63,94,.18);color:#fda4af}.acai-pill.Medium{background:rgba(245,158,11,.18);color:#fcd34d}',
      '.acai-ask{display:flex;gap:8px;margin-bottom:8px}',
      '.acai-ask input{flex:1;background:#0b1425;border:1px solid rgba(148,163,184,.25);color:#fff;border-radius:10px;padding:9px 12px;font-size:12px;outline:none}',
      '.acai-ask input:focus{border-color:#6366f1}',
      '.acai-chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}',
      '.acai-answer{font-size:12px;line-height:1.6;color:#e2e8f0;background:rgba(99,102,241,.1);border:1px solid rgba(129,140,248,.25);border-radius:10px;padding:10px 12px;min-height:40px}',
      '.acai-foot{font-size:10px;color:#64748b;margin:10px 0 0}',
      '.acai-stage{margin-top:8px;font-size:9px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;display:inline-flex;gap:5px;align-items:center;padding:2px 8px;border-radius:99px}',
      '.acai-stage.done{background:rgba(16,185,129,.15);color:#6ee7b7}.acai-stage.active{background:rgba(99,102,241,.25);color:#c7d2fe}.acai-stage.next{background:rgba(148,163,184,.12);color:#94a3b8}',
      '.acai-toast{position:fixed;right:18px;bottom:18px;z-index:3000;background:#0f172a;border:1px solid rgba(129,140,248,.5);color:#fff;padding:10px 14px;border-radius:12px;font-size:12px;font-weight:600;box-shadow:0 14px 30px -12px #000}'
    ].join('\n');
    document.head.appendChild(s);
  }

  var STEPS = ['Reading calendar & term dates', 'Reading attendance & tasks', 'Scanning clashes & heavy weeks', 'Forecasting 90-day compliance', 'Building action plan'];
  var runId = 0, lastModel = null;

  function buildPanel() {
    if ($('#acAiPanel')) return $('#acAiPanel');
    var host = $('#calKpiContainer');
    if (!host) return null;
    var p = document.createElement('section');
    p.id = 'acAiPanel'; p.className = 'acai'; p.setAttribute('aria-live', 'polite');
    p.innerHTML =
      '<div class="acai-head"><div class="acai-title"><span class="acai-orb"><i class="fas fa-wand-magic-sparkles"></i></span>' +
      '<div><h3>AI Calendar Optimizer</h3><p id="acaiContext"></p></div></div>' +
      '<div class="flex flex-wrap gap-2"><button class="acai-btn" id="acaiRun" type="button"><i class="fas fa-rotate mr-1"></i> Re-run analysis</button>' +
      '<button class="acai-btn primary" id="acaiPush" type="button"><i class="fas fa-list-check mr-1"></i> Send plan to Study Planner</button></div></div>' +
      '<ol class="acai-steps" id="acaiSteps"></ol>' +
      '<div class="acai-grid"><div class="acai-card" id="acaiReady"></div><div class="acai-card" id="acaiLoad"></div><div class="acai-card" id="acaiComp"></div></div>' +
      '<div class="acai-grid2"><div class="acai-card" id="acaiWarn"></div><div class="acai-card" id="acaiPlan"></div></div>' +
      '<div class="acai-card"><h4>Ask the calendar AI</h4>' +
      '<div class="acai-chips" id="acaiChips"></div>' +
      '<form class="acai-ask" id="acaiAskForm"><input id="acaiAskInput" autocomplete="off" placeholder="e.g. When is my next exam? Can I skip class tomorrow? Which week is heaviest?"><button class="acai-btn primary" type="submit"><i class="fas fa-paper-plane"></i></button></form>' +
      '<div class="acai-answer" id="acaiAnswer">Ask anything about your dates, workload or attendance.</div></div>' +
      '<p class="acai-foot"><i class="fas fa-circle-info mr-1"></i>Runs locally in your browser using rule-based scoring on the milestone model. Dates and holidays are sample data; confirm against the official academic notice.</p>';
    host.insertAdjacentElement('afterend', p);
    $('#acaiRun').addEventListener('click', function () { run(true); });
    $('#acaiPush').addEventListener('click', pushPlan);
    $('#acaiAskForm').addEventListener('submit', function (e) { e.preventDefault(); ask($('#acaiAskInput').value); });
    var chips = ['When is my next exam?', 'Which week is heaviest?', 'Can I miss classes?', 'Working days left?', 'What should I do this week?'];
    $('#acaiChips').innerHTML = chips.map(function (c) { return '<button type="button" class="acai-btn" data-q="' + esc(c) + '">' + esc(c) + '</button>'; }).join('');
    $('#acaiChips').addEventListener('click', function (e) {
      var b = e.target.closest('[data-q]'); if (!b) return;
      $('#acaiAskInput').value = b.dataset.q; ask(b.dataset.q);
    });
    return p;
  }

  function paintSteps(done, running) {
    var el = $('#acaiSteps'); if (!el) return;
    el.innerHTML = STEPS.map(function (s, i) {
      var cls = i < done ? 'done' : (i === running ? 'run' : '');
      var ic = i < done ? 'fa-check' : (i === running ? 'fa-spinner fa-spin' : 'fa-circle');
      return '<li class="' + cls + '"><i class="fas ' + ic + '"></i>' + esc(s) + '</li>';
    }).join('');
  }

  function render(m) {
    var yearLbl = 'Year ' + state.year, scopeLbl = state.scope === 'all' ? 'Full year 2026-27' : TERMS[state.scope].label;
    $('#acaiContext').textContent = yearLbl + ' · ' + scopeLbl + ' · analysed ' + fmtFull(m.today);

    var r = m.ready, C = 264, off = C - (C * r.score / 100);
    var col = r.score >= 75 ? '#10b981' : r.score >= 50 ? '#f59e0b' : '#f43f5e';
    $('#acaiReady').innerHTML = '<h4>Readiness score</h4><div class="acai-ring"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="42" fill="none" stroke="#1e293b" stroke-width="9"/>' +
      '<circle cx="50" cy="50" r="42" fill="none" stroke="' + col + '" stroke-width="9" stroke-linecap="round" stroke-dasharray="' + C + '" stroke-dashoffset="' + off + '" transform="rotate(-90 50 50)"/>' +
      '<text x="50" y="56" text-anchor="middle" fill="#fff" font-size="22" font-weight="800">' + r.score + '</text></svg>' +
      '<div><span class="acai-band ' + r.band.split(' ')[0] + '">' + r.band + '</span><p style="font-size:11px;color:#94a3b8;margin-top:6px">Composite of attendance, next-14-day load and pending tasks.</p></div></div>' +
      '<ul class="acai-list">' + r.factors.map(function (f) { return '<li><i class="fas ' + (f.ok ? 'fa-circle-check" style="color:#34d399' : 'fa-triangle-exclamation" style="color:#fbbf24') + '"></i> ' + esc(f.t) + '</li>'; }).join('') + '</ul>';

    var maxL = Math.max.apply(null, m.weeks.map(function (w) { return w.load; }).concat([9]));
    $('#acaiLoad').innerHTML = '<h4>Workload forecast · next 8 weeks</h4><div class="acai-bars">' + m.weeks.map(function (w) {
      var lv = w.load >= 9 ? 'high' : w.load >= 5 ? 'med' : 'low';
      return '<div class="acai-bar" title="' + esc(w.evs.map(function (x) { return x.t; }).join(', ') || 'No milestones') + '"><span class="b lv-' + lv + '" style="height:' + Math.max(4, Math.round(w.load / maxL * 100)) + '%"></span><small>' + fmt(w.start) + '</small></div>';
    }).join('') + '</div><p style="font-size:10px;color:#64748b;margin-top:8px">Green light · amber medium · red overloaded (hover a bar for details)</p>';

    var c = m.comp, am = attendanceMath(m);
    var buffer = c.over ? 'Term complete' : (c.spare >= 0 ? '+' + c.spare + ' day buffer' : (-c.spare) + ' day shortfall');
    $('#acaiComp').innerHTML = '<h4>' + esc(c.term.label) + ' · ' + REQUIRED_DAYS + '-day compliance</h4><div class="acai-kv">' +
      '<div><span>Teaching days done</span><b>' + c.done + ' / ' + REQUIRED_DAYS + '</b></div>' +
      '<div><span>Remaining before ' + fmt(D(c.term.last)) + '</span><b>' + c.remain + '</b></div>' +
      '<div><span>Projected buffer</span><b style="color:' + (c.spare < 0 && !c.over ? '#fda4af' : '#6ee7b7') + '">' + buffer + '</b></div>' +
      '<div><span>Upcoming holidays</span><b>' + (c.hols.length ? c.hols.slice(0, 3).map(function (h) { return fmt(h.d); }).join(', ') : 'None') + '</b></div>' +
      (am ? '<div><span>' + (am.safe ? 'Safe to miss' : 'Must attend in a row') + '</span><b>' + am.k + ' class' + (am.k === 1 ? '' : 'es') + '</b></div>' : '') + '</div>';

    $('#acaiWarn').innerHTML = '<h4>Clashes & risks</h4>' + (m.warnings.length ?
      m.warnings.slice(0, 6).map(function (w) { return '<div class="acai-warn ' + w.sev + '">' + w.text + '</div>'; }).join('') :
      '<div class="acai-warn ok"><i class="fas fa-circle-check mr-1"></i> No clashes, overloaded weeks or compliance risks detected.</div>');

    $('#acaiPlan').innerHTML = '<h4>AI action plan</h4>' + (m.plan.length ?
      m.plan.map(function (p) {
        return '<div class="acai-item"><div><b style="color:#fff">' + esc(p.title) + '</b><div style="color:#94a3b8;font-size:11px">' + esc(p.when) + ' · due ' + fmt(D(p.date)) + (p.hours ? ' · ~' + p.hours.toFixed(1) + ' h/day' : '') + '</div></div><span class="acai-pill ' + p.priority + '">' + p.priority + '</span></div>';
      }).join('') : '<p style="font-size:12px;color:#94a3b8">Nothing needs preparation in the next 5 weeks.</p>');

    decoratePipeline(m);
    syncKpis(m);
  }

  /* Stage chips on the existing 10-stage working-mechanism pipeline */
  var pipeObs = null;
  function decoratePipeline(m) {
    var pipe = $('#calMechanismPipeline'); if (!pipe) return;
    function apply() {
      var T = TERMS[m.termKey], s = D(T.start), l = D(T.see);
      var p = m.today < s ? 0 : m.today >= l ? 1 : (m.today - s) / (l - s);
      var kids = Array.prototype.slice.call(pipe.children), N = kids.length || 1;
      if (pipeObs) pipeObs.disconnect();
      kids.forEach(function (k, i) {
        var old = k.querySelector('.acai-stage'); if (old) old.remove();
        var st = m.today >= l ? 'done' : (i < Math.floor(p * N) ? 'done' : (i === Math.min(N - 1, Math.floor(p * N)) && m.today >= s ? 'active' : 'next'));
        var chip = document.createElement('span');
        chip.className = 'acai-stage ' + st;
        chip.innerHTML = '<i class="fas ' + (st === 'done' ? 'fa-check' : st === 'active' ? 'fa-bolt' : 'fa-clock') + '"></i> AI: ' + (st === 'done' ? 'completed' : st === 'active' ? 'in progress' : 'upcoming');
        k.appendChild(chip);
      });
      if (pipeObs) pipeObs.observe(pipe, { childList: true });
    }
    if (!pipeObs) pipeObs = new MutationObserver(function () { if (lastModel) decoratePipeline(lastModel); });
    apply();
  }

  /* Make the top KPI cards live (derived from today's date) */
  function syncKpis(m) {
    var c = m.comp;
    var v = $('#kpiWorkingDaysVal'); if (v) v.innerHTML = c.done + ' <span class="text-sm font-bold text-slate-400">/ ' + REQUIRED_DAYS + ' Days</span>';
    var b = $('#kpiWorkingDaysBar'); if (b) b.style.width = Math.min(100, Math.round(c.done / REQUIRED_DAYS * 100)) + '%';
    var r = $('#kpiWorkingDaysRemain'); if (r) r.textContent = Math.max(0, REQUIRED_DAYS - c.done) + ' left';
    var nx = m.upcoming.filter(function (e) { return e.type === 'exam'; })[0];
    if (nx) {
      var n = diffDays(m.today, D(nx.d));
      var cd = $('#kpiExamCountdown'); if (cd) cd.textContent = n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : 'In ' + n + ' Days';
      var t = $('#kpiExamTitle'); if (t) t.textContent = nx.t;
      var dt = $('#kpiExamDate'); if (dt) dt.textContent = fmtFull(D(nx.d));
    }
    var au = m.upcoming.filter(function (e) { return e.audit; })[0];
    var ad = $('#kpiAttendanceAuditDate'); if (au && ad) ad.textContent = 'Cutoff: ' + fmtFull(D(au.d));
  }

  async function run(animate) {
    var id = ++runId;
    if (!buildPanel()) return;
    if (animate) {
      for (var i = 0; i < STEPS.length; i++) {
        paintSteps(i, i);
        await sleep(320);
        if (id !== runId) return;
      }
    }
    paintSteps(STEPS.length, -1);
    lastModel = buildModel();
    render(lastModel);
  }

  /* ---------- Ask AI (intent parser over the same model) ---------- */
  function ask(q) {
    q = String(q || '').trim(); if (!q) return;
    var m = lastModel || buildModel(), s = q.toLowerCase(), out, el = $('#acaiAnswer');
    var exams = m.upcoming.filter(function (e) { return e.type === 'exam'; });
    var am = attendanceMath(m);
    if (/next.*(exam|test|cie)|(exam|test|cie).*(when|next)|when.*(exam|test)/.test(s)) {
      var e = exams[0];
      out = e ? '<b>' + esc(e.t) + '</b> is on <b>' + fmtFull(D(e.d)) + '</b> (' + diffDays(m.today, D(e.d)) + ' days away). Ideal prep start: <b>' + fmt(addDays(D(e.d), -e.prep)) + '</b>.' : 'No upcoming exams in the selected scope.';
    } else if (/heav|busy|load|stress|clash|overload/.test(s)) {
      var w = m.weeks.slice().sort(function (a, b) { return b.load - a.load; })[0];
      out = w && w.load ? 'The heaviest week is the one starting <b>' + fmt(w.start) + '</b> (load ' + w.load + '): ' + w.evs.map(function (x) { return esc(x.t); }).join(', ') + '. ' + (m.warnings.length ? m.warnings.length + ' risk(s) flagged above.' : 'No clashes detected.') : 'The next 8 weeks look light.';
    } else if (/miss|skip|bunk|absent|attendance|75/.test(s)) {
      out = am ? (am.safe ? 'You can safely miss about <b>' + am.k + '</b> more class(es) and stay at or above 75%.' : 'You are below 75%. Attend the next <b>' + am.k + '</b> classes in a row to recover.') : (m.att != null ? 'Your attendance is <b>' + m.att + '%</b>; open the Attendance Hub for the exact margin.' : 'Attendance data has not loaded yet.');
    } else if (/working|instruction|teaching|90|days left|remaining/.test(s)) {
      var c = m.comp;
      out = c.over ? 'This term\'s teaching period is complete.' : '<b>' + c.done + '</b> of ' + REQUIRED_DAYS + ' teaching days done, <b>' + c.remain + '</b> remaining before ' + fmt(D(c.term.last)) + '. ' + (c.spare >= 0 ? 'Buffer: ' + c.spare + ' day(s).' : 'Shortfall: ' + (-c.spare) + ' day(s).');
    } else if (/holiday|break|leave/.test(s)) {
      out = m.comp.hols.length ? 'Upcoming holidays: ' + m.comp.hols.slice(0, 5).map(function (h) { return '<b>' + fmt(h.d) + '</b> ' + esc(h.n); }).join(', ') + '.' : 'No holidays left in this term.';
    } else if (/placement|internship|drive|hackathon/.test(s)) {
      var pl = m.upcoming.filter(function (e) { return e.type === 'placement'; });
      out = pl.length ? pl.slice(0, 4).map(function (e) { return '<b>' + fmt(D(e.d)) + '</b> ' + esc(e.t); }).join('<br>') : 'No placement events upcoming for your year.';
    } else if (/plan|prepare|study|this week|what should|todo|do now/.test(s)) {
      out = m.plan.length ? m.plan.slice(0, 3).map(function (p) { return '• <b>' + esc(p.title) + '</b> – ' + esc(p.when) + ', due ' + fmt(D(p.date)); }).join('<br>') : 'Nothing urgent. Use the time to revise or get ahead on assignments.';
    } else {
      out = 'I can answer about your <b>next exam</b>, <b>heavy weeks</b>, <b>attendance margin</b>, <b>teaching days left</b>, <b>holidays</b>, <b>placements</b> or your <b>study plan</b>.';
    }
    el.innerHTML = out;
  }

  /* ---------- push plan into the existing Study Planner form ---------- */
  function toast(msg) {
    var t = document.createElement('div'); t.className = 'acai-toast'; t.textContent = msg;
    document.body.appendChild(t); setTimeout(function () { t.remove(); }, 3200);
  }
  function pushPlan() {
    var m = lastModel || buildModel();
    if (typeof window.plannerSaveTask !== 'function') { toast('Study Planner module is not loaded yet.'); return; }
    var added = {}; try { added = JSON.parse(localStorage.getItem('acAiAdded') || '{}'); } catch (e) {}
    var n = 0;
    m.plan.forEach(function (p) {
      if (added[p.key]) return;
      var set = function (id, v) { var el = document.getElementById(id); if (el) el.value = v; };
      var endH = 18 + (p.hours || 1.5), endStr = pad(Math.floor(endH)) + ':' + pad(Math.round((endH % 1) * 60));
      set('plannerTaskName', p.title); set('plannerTaskPriority', p.priority); set('plannerTaskStatus', 'Pending');
      set('plannerTaskDate', p.date); set('plannerTaskTime', '18:00 - ' + endStr);
      try { window.plannerSaveTask(); added[p.key] = 1; n++; } catch (e) {}
    });
    try { localStorage.setItem('acAiAdded', JSON.stringify(added)); } catch (e) {}
    toast(n ? n + ' AI task(s) added to your Study Planner.' : 'All AI tasks are already in your planner.');
  }

  /* ---------- wire up to existing year / term selectors ---------- */
  var deb;
  document.addEventListener('click', function (e) {
    var y = e.target.closest('[id^="calYearCard-"]'), sc = e.target.closest('[id^="calScope-"]');
    if (!y && !sc) return;
    if (y) state.year = Number(y.id.split('-')[1]) || state.year;
    if (sc) state.scope = sc.id.split('-')[1] || 'all';
    clearTimeout(deb); deb = setTimeout(function () { run(true); }, 120);
  });

  function boot() {
    injectStyle();
    if (!buildPanel()) return;
    run(false);
    var sec = $('#academic-calendar');
    if (sec && 'IntersectionObserver' in window) {
      var seen = false;
      new IntersectionObserver(function (en) {
        if (en[0].isIntersecting && !seen) { seen = true; run(true); }
        else if (en[0].isIntersecting) run(false);
      }, { threshold: 0.05 }).observe(sec);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  window.AcademicCalendarAI = { run: run, ask: ask, state: state };
})();
