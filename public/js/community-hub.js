/* Smart Campus AI - Community Hub (WhatsApp-style Community + AI channel)
 * Replaces the body of #group-chat. Keeps the legacy element IDs/functions alive so student.js does not break.
 * Storage: browser localStorage only (no backend). Seed conversations are demo content.
 * The "Campus AI" channel is a local rule-based assistant, not a hosted language model.
 */
(function () {
  'use strict';
  if (window.__wcInit) return;
  window.__wcInit = true;

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var KEY = 'scCommunityV1';
  var AI_NAME = 'Campus AI';
  var REACTS = ['👍', '❤️', '😂', '😮', '🙏', '🔥'];
  var COLORS = ['#53bdeb', '#e9a94f', '#c987e8', '#6ee7b7', '#f472b6', '#fb923c', '#a5b4fc', '#f87171'];

  var CHANNELS = [
    { id: 'announcements', name: 'Announcements', icon: 'fa-bullhorn', bg: '#0e7490', desc: 'Official updates from college · only admins & faculty can post', adminOnly: true, members: 312 },
    { id: 'general', name: 'General Lounge', icon: 'fa-hashtag', bg: '#4f46e5', desc: 'Batch-wide chat and campus life', members: 48 },
    { id: 'study-group', name: 'Study Group CSE', icon: 'fa-book-open', bg: '#2563eb', desc: 'Notes, revision plans and peer teaching', members: 36 },
    { id: 'projects', name: 'Project Collab', icon: 'fa-code-branch', bg: '#9333ea', desc: 'Find teammates and share project updates', members: 27 },
    { id: 'doubts', name: 'Doubt Clearing', icon: 'fa-circle-question', bg: '#d97706', desc: 'Ask questions. Faculty and seniors help out', members: 41 },
    { id: 'ai', name: AI_NAME, icon: 'fa-robot', bg: 'linear-gradient(135deg,#6366f1,#06b6d4)', desc: 'Ask about attendance, exams, doubts, or say "summarize"', members: 1, ai: true }
  ];
  var MEMBERS = [
    { n: 'Dr. Rajesh Sharma', r: 'Faculty · Mentor', on: true },
    { n: 'Pooja Verma', r: 'CSE 4', on: true },
    { n: 'Rahul Nair', r: 'CSE 4', on: true },
    { n: 'Aarav Mehta', r: 'CSE 4', on: true },
    { n: 'Ishita Rao', r: 'CSE 4', on: false },
    { n: AI_NAME, r: 'Assistant bot', on: true, ai: true }
  ];

  /* ---------- state ---------- */
  var state = { active: 'general', msgs: {}, unread: {}, typing: {}, replyTo: null, picker: null, filter: '', info: false };
  function meName() {
    var el = $('#studentName'), t = el && el.textContent.trim();
    return (t && t !== 'Loading...') ? t : 'Gaurav Sharma';
  }
  function role() { var el = $('#activeRoleLabel'); return (el && el.textContent || 'student').trim().toLowerCase(); }
  function canPostAnnouncement() { return role() === 'admin' || role() === 'faculty'; }
  function displayMe() { var r = role(); return r === 'faculty' ? 'Dr. Rajesh Sharma' : r === 'admin' ? 'Admin Office' : meName(); }
  function ch(id) { return CHANNELS.filter(function (c) { return c.id === id; })[0]; }
  function uid() { return 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function colorOf(name) { var h = 0; for (var i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0; return COLORS[h % COLORS.length]; }
  function short(n) { return String(n).replace(/^(Dr|Prof)\.?\s+/i, '').split(' ')[0]; }
  function initials(n) { return n.split(/\s+/).filter(Boolean).slice(0, 2).map(function (w) { return w[0]; }).join('').toUpperCase(); }
  function tm(ts) { return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }); }
  function dayLabel(ts) {
    var d = new Date(ts), n = new Date();
    var a = new Date(d.getFullYear(), d.getMonth(), d.getDate()), b = new Date(n.getFullYear(), n.getMonth(), n.getDate());
    var diff = Math.round((b - a) / 864e5);
    if (diff === 0) return 'Today'; if (diff === 1) return 'Yesterday';
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  function lastOf(id) { var a = state.msgs[id] || []; return a[a.length - 1]; }

  function seed() {
    var now = Date.now(), M = 60000, H = 60 * M, D = 24 * H;
    function m(c, name, text, ago, extra) { var o = { id: uid(), ch: c, from: name === 'me' ? 'me' : name, name: name === 'me' ? meName() : name, text: text, ts: now - ago, status: 'read', reactions: {} }; if (extra) for (var k in extra) o[k] = extra[k]; return o; }
    state.msgs = {
      announcements: [
        m('announcements', 'Admin Office', '📢 **Odd-semester CIE-2** begins 23 Nov. Hall tickets will be available in Certificates & Hall Ticket from 16 Nov.', 2 * D + 3 * H),
        m('announcements', 'Admin Office', 'Reminder: the 75% attendance audit cutoff is 25 Nov. Shortage will lead to exam debarment.', D + 5 * H),
        m('announcements', 'Placement Cell', 'Tier-1 placement drive registration closes this week. Update your resume in the Resume Builder.', 3 * H)
      ],
      general: [
        m('general', 'Pooja Verma', 'Anyone going to the tech hackathon on the 24th?', 4 * H + 12 * M),
        m('general', 'Rahul Nair', 'Yes! Looking for one more teammate 🙌', 4 * H),
        m('general', 'Dr. Rajesh Sharma', 'Good initiative. Register on the Notice Board before Friday.', 3 * H + 40 * M),
        m('general', 'Aarav Mehta', 'Count me in 🔥', 3 * H + 30 * M)
      ],
      'study-group': [
        m('study-group', 'Aarav Mehta', 'Uploaded my OS unit 3 notes (deadlock + memory mgmt).', D + 2 * H),
        m('study-group', 'Pooja Verma', 'Thanks! Can we do a joint revision on Sunday evening?', D + H),
        m('study-group', 'me', 'Sunday 6 PM works for me 👍', 20 * H)
      ],
      projects: [
        m('projects', 'Rahul Nair', 'Our mini-project review 1 is on 11 Nov. Schema and REST API must be ready.', 6 * H),
        m('projects', 'Dr. Rajesh Sharma', 'Keep your Git logs clean. Reviewers will check commit history.', 5 * H)
      ],
      doubts: [
        m('doubts', 'Ishita Rao', 'What is the difference between a process and a thread?', 8 * H),
        m('doubts', 'Dr. Rajesh Sharma', 'A process has its own address space; threads share the process memory. Try writing a small example with pthreads.', 7 * H)
      ],
      ai: [
        m('ai', AI_NAME, 'Hi! I\'m the Campus AI. Ask me about your **attendance**, **exam dates**, **study plan** or a **doubt** (DFA vs NFA, OSI model…). Say **summarize** for a recap of any group.', 30 * M, { ai: true, html: true })
      ]
    };
    state.unread = { announcements: 3, general: 2, projects: 1 };
  }
  function load() {
    try { var s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && s.msgs) { state.msgs = s.msgs; state.unread = s.unread || {}; state.active = s.active || 'general'; return; } } catch (e) {}
    seed();
  }
  function save() {
    try {
      var trimmed = {}; Object.keys(state.msgs).forEach(function (k) { trimmed[k] = state.msgs[k].slice(-200); });
      localStorage.setItem(KEY, JSON.stringify({ msgs: trimmed, unread: state.unread, active: state.active }));
    } catch (e) {}
  }

  /* ---------- styles ---------- */
  function injectStyle() {
    if ($('#wc-style')) return;
    var s = document.createElement('style'); s.id = 'wc-style';
    s.textContent = [
      '#group-chat .wc-app{display:grid;grid-template-columns:340px minmax(0,1fr);height:calc(100vh - 190px);min-height:560px;border-radius:18px;overflow:hidden;border:1px solid rgba(255,255,255,.08);background:#0b141a;box-shadow:0 24px 60px -28px #000;position:relative;color:#e9edef}',
      '.wc-app.info-open{grid-template-columns:340px minmax(0,1fr) 300px}',
      '.wc-side{background:#111b21;border-right:1px solid rgba(255,255,255,.07);display:flex;flex-direction:column;min-height:0}',
      '.wc-side-head{padding:12px 14px;background:#202c33;display:flex;align-items:center;gap:10px;justify-content:space-between}',
      '.wc-comm{display:flex;gap:10px;align-items:center;min-width:0}',
      '.wc-comm b{display:block;font-size:14px;color:#e9edef;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.wc-comm small{font-size:11px;color:#8696a0}',
      '.wc-comm-ico{width:42px;height:42px;border-radius:14px;display:grid;place-items:center;color:#fff;background:linear-gradient(135deg,#00a884,#0e7490);flex:none;font-size:18px}',
      '.wc-iconbtn{width:34px;height:34px;border-radius:50%;border:0;background:transparent;color:#aebac1;display:grid;place-items:center;flex:none}',
      '.wc-iconbtn:hover{background:rgba(255,255,255,.08)}',
      '.wc-search{margin:8px 12px;display:flex;align-items:center;gap:10px;background:#202c33;border-radius:10px;padding:0 12px}',
      '.wc-search input{flex:1;background:transparent;border:0;outline:0;color:#e9edef;font-size:13px;padding:9px 0}',
      '.wc-search i{color:#8696a0;font-size:12px}',
      '.wc-list{overflow-y:auto;flex:1;min-height:0}',
      '.wc-sec{font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#00a884;padding:12px 16px 4px}',
      '.wc-row{width:100%;display:flex;gap:12px;align-items:center;padding:10px 14px;border:0;background:transparent;text-align:left;color:inherit;border-bottom:1px solid rgba(255,255,255,.04)}',
      '.wc-row:hover{background:#202c33}.wc-row.active{background:#2a3942}',
      '.wc-av{width:46px;height:46px;border-radius:50%;display:grid;place-items:center;color:#fff;font-weight:800;font-size:15px;flex:none}',
      '.wc-av.sq{border-radius:14px}',
      '.wc-row-main{flex:1;min-width:0}',
      '.wc-row-top{display:flex;justify-content:space-between;gap:8px;align-items:baseline}',
      '.wc-row-top b{font-size:14px;color:#e9edef;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.wc-row-top span{font-size:11px;color:#8696a0;flex:none}',
      '.wc-row-bot{display:flex;justify-content:space-between;gap:8px;align-items:center;margin-top:3px}',
      '.wc-prev{font-size:12px;color:#8696a0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.wc-badge{min-width:19px;height:19px;border-radius:99px;background:#00a884;color:#0b141a;font-size:11px;font-weight:800;display:grid;place-items:center;padding:0 5px;flex:none}',
      '.wc-main{display:flex;flex-direction:column;min-width:0;min-height:0;background:#0b141a;background-image:radial-gradient(rgba(255,255,255,.03) 1px,transparent 1px);background-size:18px 18px}',
      '.wc-head{display:flex;align-items:center;gap:12px;padding:10px 14px;background:#202c33;cursor:pointer}',
      '.wc-head .t{min-width:0;flex:1}',
      '.wc-head b{display:block;font-size:15px;color:#e9edef;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.wc-head small{font-size:12px;color:#8696a0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block}',
      '.wc-back{display:none}',
      '.wc-msgs{flex:1;min-height:0;overflow-y:auto;padding:14px 8% 10px;display:flex;flex-direction:column;gap:3px}',
      '.wc-day{align-self:center;background:#182229;color:#8696a0;font-size:11px;font-weight:700;padding:4px 12px;border-radius:8px;margin:10px 0}',
      '.wc-row-msg{display:flex;position:relative}',
      '.wc-row-msg.me{justify-content:flex-end}',
      '.wc-bub{max-width:min(520px,78%);background:#202c33;border-radius:10px;border-top-left-radius:2px;padding:6px 9px 5px;position:relative;font-size:13.5px;line-height:1.45;word-wrap:break-word;overflow-wrap:anywhere;box-shadow:0 1px 1px rgba(0,0,0,.25)}',
      '.me .wc-bub{background:#005c4b;border-top-left-radius:10px;border-top-right-radius:2px}',
      '.wc-bub.ai{background:linear-gradient(145deg,#1e1b4b,#17213a);border:1px solid rgba(129,140,248,.35)}',
      '.wc-bub.ann{background:#16303a;border:1px solid rgba(6,182,212,.35)}',
      '.wc-name{font-size:12px;font-weight:700;margin-bottom:2px;display:flex;gap:6px;align-items:center}',
      '.wc-tag{font-size:9px;font-weight:800;padding:1px 6px;border-radius:99px;background:rgba(99,102,241,.3);color:#c7d2fe}',
      '.wc-txt{white-space:pre-wrap}',
      '.wc-txt b{color:#fff}',
      '.wc-meta{float:right;margin:6px 0 -2px 12px;font-size:10.5px;color:#8696a0;display:flex;gap:4px;align-items:center}',
      '.wc-tick{font-size:10px}.wc-tick.read{color:#53bdeb}',
      '.wc-quote{background:rgba(0,0,0,.25);border-left:3px solid #00a884;border-radius:6px;padding:5px 8px;margin-bottom:5px;font-size:12px;color:#aebac1}',
      '.wc-quote b{display:block;font-size:11px;color:#00a884}',
      '.wc-react{clear:both;display:flex;gap:4px;flex-wrap:wrap;margin-top:4px}',
      '.wc-react button{border:1px solid rgba(255,255,255,.12);background:#111b21;color:#e9edef;border-radius:99px;font-size:12px;padding:1px 8px}',
      '.wc-react button.mine{border-color:#00a884;background:rgba(0,168,132,.2)}',
      '.wc-acts{position:absolute;top:-10px;display:none;gap:2px;background:#233138;border-radius:99px;padding:2px 4px;box-shadow:0 4px 10px rgba(0,0,0,.4);z-index:2}',
      '.wc-row-msg:not(.me) .wc-acts{right:6px}.wc-row-msg.me .wc-acts{left:6px}',
      '.wc-row-msg:hover .wc-acts,.wc-row-msg:focus-within .wc-acts{display:flex}',
      '.wc-acts button{border:0;background:transparent;color:#aebac1;width:26px;height:26px;border-radius:50%;font-size:12px}',
      '.wc-acts button:hover{background:rgba(255,255,255,.1);color:#fff}',
      '.wc-picker{display:flex;gap:2px;background:#233138;border-radius:99px;padding:4px 6px;margin-top:6px;width:max-content}',
      '.wc-picker button{border:0;background:transparent;font-size:18px;border-radius:50%;width:30px;height:30px}',
      '.wc-picker button:hover{background:rgba(255,255,255,.1)}',
      '.wc-typing{align-self:flex-start;background:#202c33;border-radius:10px;padding:9px 12px;display:flex;gap:4px;margin-top:4px}',
      '.wc-typing i{width:6px;height:6px;border-radius:50%;background:#8696a0;animation:wcdot 1s infinite}',
      '.wc-typing i:nth-child(2){animation-delay:.15s}.wc-typing i:nth-child(3){animation-delay:.3s}',
      '@keyframes wcdot{0%,60%,100%{opacity:.3;transform:none}30%{opacity:1;transform:translateY(-3px)}}',
      '.wc-reply-bar{display:none;align-items:center;gap:10px;background:#1a252b;padding:8px 14px;border-left:4px solid #00a884}',
      '.wc-reply-bar.on{display:flex}',
      '.wc-reply-bar div{flex:1;min-width:0;font-size:12px;color:#aebac1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.wc-reply-bar b{color:#00a884;display:block}',
      '.wc-chips{display:flex;gap:6px;flex-wrap:wrap;padding:8px 14px 0;background:#202c33}',
      '.wc-chips button{border:1px solid rgba(129,140,248,.4);background:rgba(99,102,241,.12);color:#c7d2fe;border-radius:99px;font-size:11px;font-weight:700;padding:5px 10px}',
      '.wc-chips button:hover{background:rgba(99,102,241,.3)}',
      '.wc-emoji{display:none;gap:4px;padding:6px 14px;background:#202c33;flex-wrap:wrap}',
      '.wc-emoji.on{display:flex}',
      '.wc-emoji button{border:0;background:transparent;font-size:20px;border-radius:8px;width:34px;height:34px}',
      '.wc-emoji button:hover{background:rgba(255,255,255,.1)}',
      '.wc-comp{display:flex;align-items:flex-end;gap:8px;padding:10px 12px;background:#202c33}',
      '.wc-comp textarea{flex:1;resize:none;max-height:120px;background:#2a3942;border:0;outline:0;color:#e9edef;border-radius:10px;padding:10px 14px;font-size:14px;font-family:inherit;line-height:1.4}',
      '.wc-comp textarea::placeholder{color:#8696a0}',
      '.wc-send{width:42px;height:42px;border-radius:50%;border:0;background:#00a884;color:#0b141a;flex:none;display:grid;place-items:center;font-size:15px}',
      '.wc-send:hover{filter:brightness(1.1)}',
      '.wc-ro{padding:14px;text-align:center;background:#202c33;color:#8696a0;font-size:12px}',
      '.wc-info{display:none;background:#111b21;border-left:1px solid rgba(255,255,255,.07);overflow-y:auto;min-height:0}',
      '.info-open .wc-info{display:block}',
      '.wc-info-top{padding:22px 16px;text-align:center;background:#202c33;margin-bottom:8px}',
      '.wc-info-top .wc-av{margin:0 auto 10px;width:76px;height:76px;font-size:28px}',
      '.wc-info-top b{display:block;color:#fff;font-size:16px}.wc-info-top small{color:#8696a0;font-size:12px}',
      '.wc-mem{display:flex;gap:10px;align-items:center;padding:8px 16px;font-size:13px}',
      '.wc-mem small{display:block;color:#8696a0;font-size:11px}',
      '.wc-dot{width:8px;height:8px;border-radius:50%;background:#00a884;margin-left:auto}.wc-dot.off{background:#475569}',
      '.wc-empty{margin:auto;color:#8696a0;font-size:13px;text-align:center}',
      '@media(max-width:1100px){.wc-app.info-open{grid-template-columns:300px minmax(0,1fr)}.wc-info{position:absolute;right:0;top:0;bottom:0;width:290px;z-index:5;box-shadow:-12px 0 30px rgba(0,0,0,.5)}.wc-app{grid-template-columns:300px minmax(0,1fr)}}',
      '@media(max-width:820px){#group-chat .wc-app,#group-chat .wc-app.info-open{grid-template-columns:1fr}.wc-app[data-view="list"] .wc-main{display:none}.wc-app[data-view="chat"] .wc-side{display:none}.wc-back{display:grid}.wc-msgs{padding:12px 10px}.wc-bub{max-width:88%}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  /* ---------- markup ---------- */
  function build() {
    var sec = $('#group-chat'); if (!sec) return false;
    sec.innerHTML =
      '<div class="flex flex-wrap items-center justify-between gap-3 mb-4"><div><h2 class="text-3xl font-extrabold text-gray-800">Community Hub</h2>' +
      '<p class="text-sm text-gray-500 mt-1">One community, many groups. Announcements, study circles and a built-in Campus AI channel.</p></div>' +
      '<div class="flex items-center gap-2 text-xs text-emerald-600 font-bold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200"><span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span><span>Saved on this device</span></div></div>' +
      '<div class="wc-app" id="wcApp" data-view="list">' +
      '<aside class="wc-side"><div class="wc-side-head"><div class="wc-comm"><span class="wc-comm-ico"><i class="fas fa-people-group"></i></span><div><b>Smart Campus Community</b><small>CSE · Batch 2024 · ' + (CHANNELS.length) + ' channels</small></div></div>' +
      '<button class="wc-iconbtn" id="wcInfoBtn" type="button" title="Community info" aria-label="Community info"><i class="fas fa-circle-info"></i></button></div>' +
      '<label class="wc-search"><i class="fas fa-search"></i><input id="wcSearch" placeholder="Search channels" autocomplete="off"></label><div class="wc-list" id="wcList"></div></aside>' +
      '<section class="wc-main"><div class="wc-head" id="wcHead"></div><div class="wc-msgs" id="wcMsgs" aria-live="polite"></div>' +
      '<div class="wc-reply-bar" id="wcReplyBar"><div id="wcReplyText"></div><button class="wc-iconbtn" id="wcReplyX" type="button" aria-label="Cancel reply"><i class="fas fa-times"></i></button></div>' +
      '<div class="wc-chips" id="wcChips" style="display:none"></div><div class="wc-emoji" id="wcEmoji"></div><div id="wcComposerHost"></div></section>' +
      '<aside class="wc-info" id="wcInfo"></aside></div>' +
      /* hidden stubs keep legacy student.js code from throwing */
      '<div hidden aria-hidden="true"><div id="chatMessagesStream"></div><h4 id="activeChatChannelTitle"></h4><input id="chatInputMessage">' +
      ['general', 'study-group', 'projects', 'doubts'].map(function (c) { return '<button id="chatChan-' + c + '"></button>'; }).join('') + '</div>';
    $('#wcEmoji').innerHTML = ['😀', '😂', '😍', '👍', '👏', '🙏', '🔥', '💡', '❓', '🎉', '📚', '🚀'].map(function (e) { return '<button type="button" data-e="' + e + '">' + e + '</button>'; }).join('');
    return true;
  }

  /* ---------- rendering ---------- */
  function fmtText(t, html) {
    var s = html ? String(t) : esc(t);
    return s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  }
  function plain(t) { return String(t || '').replace(/<[^>]+>/g, '').replace(/\*\*/g, ''); }

  function renderList() {
    var f = state.filter.toLowerCase();
    function row(c) {
      var last = lastOf(c.id), un = state.unread[c.id] || 0;
      var pv = last ? (last.from === 'me' ? 'You: ' : (c.id !== 'ai' && !c.adminOnly ? esc(short(last.name)) + ': ' : '')) + esc(plain(last.text)) : esc(c.desc);
      return '<button class="wc-row' + (state.active === c.id ? ' active' : '') + '" data-ch="' + c.id + '" type="button">' +
        '<span class="wc-av sq" style="background:' + c.bg + '"><i class="fas ' + c.icon + '"></i></span>' +
        '<span class="wc-row-main"><span class="wc-row-top"><b>' + esc(c.name) + '</b><span style="' + (un ? 'color:#00a884' : '') + '">' + (last ? tm(last.ts) : '') + '</span></span>' +
        '<span class="wc-row-bot"><span class="wc-prev">' + pv + '</span>' + (un ? '<span class="wc-badge">' + un + '</span>' : '') + '</span></span></button>';
    }
    var vis = CHANNELS.filter(function (c) { return !f || c.name.toLowerCase().indexOf(f) > -1 || c.desc.toLowerCase().indexOf(f) > -1; });
    var out = '';
    var ann = vis.filter(function (c) { return c.adminOnly; }), grp = vis.filter(function (c) { return !c.adminOnly && !c.ai; }), ai = vis.filter(function (c) { return c.ai; });
    if (ann.length) out += '<div class="wc-sec">Announcements</div>' + ann.map(row).join('');
    if (grp.length) out += '<div class="wc-sec">Groups</div>' + grp.map(row).join('');
    if (ai.length) out += '<div class="wc-sec">AI channel</div>' + ai.map(row).join('');
    $('#wcList').innerHTML = out || '<p class="wc-empty" style="padding:24px">No channels match.</p>';
  }

  function renderHead() {
    var c = ch(state.active);
    var sub = c.ai ? 'Always online · local assistant' : (c.adminOnly ? 'Admins & faculty can post · ' + c.members + ' members' : c.members + ' members · ' + (c.members > 4 ? '4 online' : 'online'));
    $('#wcHead').innerHTML = '<button class="wc-iconbtn wc-back" id="wcBack" type="button" aria-label="Back to channels"><i class="fas fa-arrow-left"></i></button>' +
      '<span class="wc-av sq" style="background:' + c.bg + ';width:42px;height:42px"><i class="fas ' + c.icon + '"></i></span>' +
      '<div class="t"><b>' + esc(c.name) + '</b><small>' + esc(sub) + '</small></div>' +
      '<button class="wc-iconbtn" id="wcInfoBtn2" type="button" aria-label="Channel info"><i class="fas fa-ellipsis-vertical"></i></button>';
    var chips = $('#wcChips');
    if (c.ai) {
      var q = ['Check my attendance', 'When is my next exam?', 'Summarize general lounge', 'What should I study this week?', 'Explain DFA vs NFA'];
      chips.innerHTML = q.map(function (x) { return '<button type="button" data-q="' + esc(x) + '">' + esc(x) + '</button>'; }).join('');
      chips.style.display = 'flex';
    } else chips.style.display = 'none';
    var host = $('#wcComposerHost');
    if (c.adminOnly && !canPostAnnouncement()) {
      host.innerHTML = '<div class="wc-ro"><i class="fas fa-lock mr-1"></i> Only admins and faculty can send messages to this channel. Switch persona to try it.</div>';
    } else {
      host.innerHTML = '<div class="wc-comp"><button class="wc-iconbtn" id="wcEmojiBtn" type="button" aria-label="Emoji"><i class="far fa-face-smile"></i></button>' +
        '<textarea id="wcInput" rows="1" placeholder="' + (c.ai ? 'Ask Campus AI…' : 'Type a message · use @ai to ask the assistant') + '"></textarea>' +
        '<button class="wc-send" id="wcSend" type="button" aria-label="Send"><i class="fas fa-paper-plane"></i></button></div>';
    }
  }

  function renderInfo() {
    var c = ch(state.active), mem = c.ai ? MEMBERS.filter(function (m) { return m.ai; }) : MEMBERS;
    $('#wcInfo').innerHTML = '<div class="wc-info-top"><span class="wc-av sq" style="background:' + c.bg + '"><i class="fas ' + c.icon + '"></i></span><b>' + esc(c.name) + '</b><small>' + esc(c.desc) + '</small></div>' +
      '<div class="wc-sec">' + (c.ai ? 'About' : mem.length + ' participants (sample)') + '</div>' +
      (c.ai ? '<p style="padding:6px 16px;font-size:12px;color:#aebac1;line-height:1.6">Campus AI reads your attendance and calendar from this page and answers common doubts. It runs locally in your browser and does not send messages anywhere. Mention <b>@ai</b> in any group to get its help.</p>' :
        mem.map(function (m) { return '<div class="wc-mem"><span class="wc-av" style="width:34px;height:34px;font-size:12px;background:' + (m.ai ? 'linear-gradient(135deg,#6366f1,#06b6d4)' : colorOf(m.n)) + '">' + (m.ai ? '<i class="fas fa-robot"></i>' : initials(m.n)) + '</span><span>' + esc(m.n) + '<small>' + esc(m.r) + '</small></span><span class="wc-dot' + (m.on ? '' : ' off') + '"></span></div>'; }).join(''));
  }

  function renderMsgs(keepScroll) {
    var box = $('#wcMsgs'); if (!box) return;
    var list = state.msgs[state.active] || [], c = ch(state.active), out = '', prevDay = '', prevFrom = '';
    var atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
    list.forEach(function (m) {
      var dl = dayLabel(m.ts);
      if (dl !== prevDay) { out += '<div class="wc-day">' + esc(dl) + '</div>'; prevDay = dl; prevFrom = ''; }
      var me = m.from === 'me', showName = !me && prevFrom !== m.name;
      prevFrom = m.name;
      var cls = 'wc-bub' + (m.ai ? ' ai' : '') + (c.adminOnly ? ' ann' : '');
      var rx = Object.keys(m.reactions || {}).filter(function (e) { return m.reactions[e].length; });
      out += '<div class="wc-row-msg' + (me ? ' me' : '') + '" data-id="' + m.id + '"><div class="' + cls + '">' +
        '<div class="wc-acts"><button data-a="react" title="React" type="button"><i class="far fa-face-smile"></i></button><button data-a="reply" title="Reply" type="button"><i class="fas fa-reply"></i></button>' +
        (me ? '<button data-a="del" title="Delete" type="button"><i class="far fa-trash-can"></i></button>' : '') + '</div>' +
        (showName ? '<div class="wc-name" style="color:' + (m.ai ? '#a5b4fc' : colorOf(m.name)) + '">' + esc(m.name) + (m.ai ? '<span class="wc-tag">AI</span>' : '') + '</div>' : '') +
        (m.reply ? '<div class="wc-quote"><b>' + esc(m.reply.name) + '</b>' + esc(m.reply.text.slice(0, 90)) + '</div>' : '') +
        '<span class="wc-txt">' + fmtText(m.text, m.html) + '</span>' +
        '<span class="wc-meta">' + tm(m.ts) + (me ? '<i class="fas fa-check-double wc-tick' + (m.status === 'read' ? ' read' : '') + '"></i>' : '') + '</span>' +
        (rx.length ? '<div class="wc-react">' + rx.map(function (e) { return '<button type="button" data-a="rx" data-e="' + e + '" class="' + (m.reactions[e].indexOf('me') > -1 ? 'mine' : '') + '">' + e + ' ' + m.reactions[e].length + '</button>'; }).join('') + '</div>' : '') +
        (state.picker === m.id ? '<div class="wc-picker">' + REACTS.map(function (e) { return '<button type="button" data-a="rx" data-e="' + e + '">' + e + '</button>'; }).join('') + '</div>' : '') +
        '</div></div>';
      void showName;
    });
    if (state.typing[state.active]) out += '<div class="wc-typing" aria-label="typing"><i></i><i></i><i></i></div>';
    if (!list.length) out = '<p class="wc-empty">No messages yet. Say hi 👋</p>';
    box.innerHTML = out;
    if (!keepScroll || atBottom) box.scrollTop = box.scrollHeight;
  }

  function renderAll() { renderList(); renderHead(); renderMsgs(); renderInfo(); renderReply(); }
  function renderReply() {
    var b = $('#wcReplyBar'); if (!b) return;
    if (state.replyTo) { b.classList.add('on'); $('#wcReplyText').innerHTML = '<b>Replying to ' + esc(state.replyTo.name) + '</b>' + esc(state.replyTo.text.slice(0, 100)); }
    else b.classList.remove('on');
  }

  /* ---------- actions ---------- */
  function open(id, view) {
    if (!ch(id)) id = 'general';
    state.active = id; state.unread[id] = 0; state.replyTo = null; state.picker = null;
    (state.msgs[id] || []).forEach(function (m) { if (m.from === 'me') m.status = 'read'; });
    var app = $('#wcApp'); if (app && view) app.setAttribute('data-view', view);
    save(); renderAll();
    var el = $('#activeChatChannelTitle'); if (el) el.textContent = ch(id).name;
  }
  function addMsg(chId, o) {
    var m = { id: uid(), ch: chId, from: o.from, name: o.name, text: o.text, ts: Date.now(), status: o.from === 'me' ? 'sent' : 'read', reactions: {}, reply: o.reply || null, ai: !!o.ai, html: !!o.html };
    (state.msgs[chId] = state.msgs[chId] || []).push(m);
    if (chId !== state.active) state.unread[chId] = (state.unread[chId] || 0) + 1;
    save();
    if (chId === state.active) renderMsgs(true);
    renderList();
    return m;
  }
  function send(text) {
    var inp = $('#wcInput');
    text = String(text != null ? text : (inp ? inp.value : '')).trim();
    if (!text) return;
    var c = ch(state.active);
    if (c.adminOnly && !canPostAnnouncement()) return;
    var rp = state.replyTo ? { name: state.replyTo.name, text: state.replyTo.text } : null;
    var m = addMsg(state.active, { from: 'me', name: displayMe(), text: text, reply: rp });
    state.replyTo = null; renderReply();
    if (inp) { inp.value = ''; inp.style.height = ''; inp.focus(); }
    setTimeout(function () { m.status = 'read'; save(); if (state.active === m.ch) renderMsgs(true); }, 900);
    if (c.ai || /(^|\s)@ai\b/i.test(text)) askAI(text, state.active);
  }
  function askAI(text, chId) {
    state.typing[chId] = true; if (chId === state.active) renderMsgs();
    setTimeout(function () {
      var ans; try { ans = aiAnswer(text, chId); } catch (e) { ans = 'Sorry, I could not work that out. Try rephrasing.'; }
      state.typing[chId] = false;
      addMsg(chId, { from: AI_NAME, name: AI_NAME, text: ans, ai: true, html: true });
      if (chId === state.active) renderMsgs();
    }, 650 + Math.random() * 500);
  }

  /* ---------- AI (local rules) ---------- */
  var KB = [
    [/dfa|nfa|automata/, '**DFA vs NFA:** a DFA has exactly one next state for each symbol; an NFA may have several (or ε-moves). Both recognise the same regular languages, but converting an NFA to a DFA can blow up the state count to 2ⁿ.'],
    [/osi/, '**OSI model (7 layers, top to bottom):** Application, Presentation, Session, Transport, Network, Data Link, Physical. Memory trick: <i>All People Seem To Need Data Processing</i>.'],
    [/neural|deep learning/, '**Neural network:** layers of weighted neurons. Each applies weights, a bias and an activation. Training uses backpropagation with gradient descent to reduce a loss function.'],
    [/deadlock/, '**Deadlock** needs four conditions together: mutual exclusion, hold and wait, no pre-emption, circular wait. Break any one to prevent it (e.g. impose a resource ordering).'],
    [/normali[sz]ation|1nf|2nf|3nf|bcnf/, '**Normalisation:** 1NF atomic values, 2NF no partial dependency on part of a key, 3NF no transitive dependency, BCNF every determinant is a candidate key.'],
    [/tcp.*udp|udp.*tcp/, '**TCP vs UDP:** TCP is connection-oriented, reliable and ordered (handshake, retransmission). UDP is connectionless and faster but gives no delivery guarantee. Used for DNS, streaming and games.'],
    [/process.*thread|thread.*process/, '**Process vs thread:** a process owns its address space; threads inside it share code, heap and globals but have separate stacks. Thread switches are cheaper.']
  ];
  function domNum(sel) { var el = $(sel); if (!el) return null; var v = parseFloat((el.textContent || '').replace(/[^\d.]/g, '')); return isFinite(v) ? v : null; }
  function aiAnswer(text, chId) {
    var s = text.toLowerCase().replace(/@ai/g, '').trim(), i;
    if (/^(hi|hello|hey|namaste)\b/.test(s) || !s) return 'Hello ' + esc(meName().split(' ')[0]) + '! 👋 I can check your <b>attendance</b>, tell you about <b>exams & deadlines</b>, suggest a <b>study plan</b>, explain a <b>topic</b>, or <b>summarize</b> a group.';
    if (/summar|recap|catch me up|what did i miss/.test(s)) return summarize(s, chId);
    if (/attendance|bunk|miss.*class|75/.test(s)) {
      var p = domNum('#attendanceRate'); if (p == null) p = domNum('#hubAttPercent');
      var A = domNum('#hubTotalAttended'), T = domNum('#hubTotalClasses');
      if (p == null && !(A && T)) return 'I could not read your attendance yet. Open the Attendance Hub once and ask me again.';
      var pct = (A && T) ? (A / T * 100) : p, msg = '📋 Your attendance is <b>' + pct.toFixed(1) + '%</b>.';
      if (A && T) msg += pct >= 75 ? ' You can miss about <b>' + Math.floor((A - 0.75 * T) / 0.75) + '</b> more class(es) and stay at 75%.' : ' Attend the next <b>' + Math.ceil((0.75 * T - A) / 0.25) + '</b> classes in a row to reach 75%.';
      return msg;
    }
    if (/exam|cie|deadline|calendar|holiday|working days|schedule|heavy|busy|placement/.test(s) && window.AcademicCalendarAI) {
      try {
        window.AcademicCalendarAI.ask(s);
        var a = $('#acaiAnswer');
        if (a && a.textContent && !/^I can answer about/.test(a.textContent) && !/^Ask anything/.test(a.textContent)) return '📅 ' + a.innerHTML;
      } catch (e) {}
    }
    if (/exam|cie|deadline|calendar|schedule/.test(s)) return '📅 Open <b>Academic Calendar & Schedule</b> from the menu to see exam dates. Once that page has loaded I can answer date questions directly.';
    for (i = 0; i < KB.length; i++) if (KB[i][0].test(s)) return KB[i][1];
    if (/study|plan|revise|prepare|routine/.test(s)) return '📚 A simple plan: <b>1)</b> revise the topic with the nearest exam first, <b>2)</b> do 2 focused blocks of 90 min after classes, <b>3)</b> end each day with 10 min of recall, <b>4)</b> use <b>AI Study Planner</b> in the menu to turn this into a timetable.';
    if (/help|what can you|menu/.test(s)) return 'Try: <b>"Check my attendance"</b>, <b>"When is my next exam?"</b>, <b>"Summarize general lounge"</b>, <b>"Explain deadlock"</b>, or <b>"Study plan"</b>.';
    return 'I\'m not sure about that one yet. I can help with <b>attendance</b>, <b>exam dates</b>, <b>study plans</b>, <b>group summaries</b> and topics like <b>DFA/NFA, OSI, deadlock, normalisation, TCP vs UDP</b>. For anything else, post in <b>Doubt Clearing</b> so faculty can help.';
  }
  function summarize(s, chId) {
    var target = null;
    CHANNELS.forEach(function (c) { if (!c.ai && (s.indexOf(c.name.toLowerCase()) > -1 || s.indexOf(c.id.replace('-', ' ')) > -1 || (c.id === 'general' && /general|lounge/.test(s)))) target = c.id; });
    if (!target) target = (chId && chId !== 'ai') ? chId : 'general';
    var c = ch(target), list = (state.msgs[target] || []).filter(function (m) { return !m.ai; }).slice(-12);
    if (!list.length) return 'There is nothing to summarize in <b>' + esc(c.name) + '</b> yet.';
    var who = {}; list.forEach(function (m) { who[m.name] = (who[m.name] || 0) + 1; });
    var names = Object.keys(who).sort(function (a, b) { return who[b] - who[a]; }).slice(0, 4);
    return '📝 <b>' + esc(c.name) + '</b> · last ' + list.length + ' messages from ' + names.map(esc).join(', ') + '.<br>' +
      list.slice(-3).map(function (m) { return '• <b>' + esc(short(m.name)) + ':</b> ' + esc(plain(m.text).slice(0, 110)); }).join('<br>');
  }

  /* ---------- events ---------- */
  function bind() {
    var app = $('#wcApp');
    app.addEventListener('click', function (e) {
      var t = e.target, el;
      if ((el = t.closest('[data-ch]'))) { open(el.getAttribute('data-ch'), 'chat'); return; }
      if (t.closest('#wcBack')) { app.setAttribute('data-view', 'list'); return; }
      if (t.closest('#wcInfoBtn') || t.closest('#wcInfoBtn2') || t.closest('#wcHead') && !t.closest('#wcBack')) { state.info = !state.info; app.classList.toggle('info-open', state.info); return; }
      if (t.closest('#wcSend')) { send(); return; }
      if (t.closest('#wcEmojiBtn')) { $('#wcEmoji').classList.toggle('on'); return; }
      if ((el = t.closest('#wcEmoji [data-e]'))) { var i = $('#wcInput'); if (i) { i.value += el.getAttribute('data-e'); i.focus(); } return; }
      if ((el = t.closest('#wcChips [data-q]'))) { send(el.getAttribute('data-q')); return; }
      if (t.closest('#wcReplyX')) { state.replyTo = null; renderReply(); return; }
      var act = t.closest('[data-a]'), row = t.closest('.wc-row-msg');
      if (act && row) {
        var id = row.getAttribute('data-id'), list = state.msgs[state.active], m = list.filter(function (x) { return x.id === id; })[0]; if (!m) return;
        var a = act.getAttribute('data-a');
        if (a === 'reply') { state.replyTo = { name: m.name, text: plain(m.text) }; renderReply(); var inp = $('#wcInput'); if (inp) inp.focus(); }
        else if (a === 'react') { state.picker = state.picker === id ? null : id; renderMsgs(true); }
        else if (a === 'rx') {
          var em = act.getAttribute('data-e'); m.reactions = m.reactions || {}; var arr = m.reactions[em] = m.reactions[em] || [];
          var k = arr.indexOf('me'); if (k > -1) arr.splice(k, 1); else arr.push('me');
          state.picker = null; save(); renderMsgs(true);
        } else if (a === 'del') { state.msgs[state.active] = list.filter(function (x) { return x.id !== id; }); save(); renderMsgs(true); renderList(); }
      }
    });
    app.addEventListener('keydown', function (e) {
      if (e.target.id === 'wcInput' && e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    });
    app.addEventListener('input', function (e) {
      if (e.target.id === 'wcInput') { e.target.style.height = 'auto'; e.target.style.height = Math.min(120, e.target.scrollHeight) + 'px'; }
      if (e.target.id === 'wcSearch') { state.filter = e.target.value || ''; renderList(); }
    });
  }

  /* legacy API overrides so old buttons/calls keep working */
  window.switchChatChannel = function (id) { open(id, 'chat'); };
  window.sendChatMessage = function () { send(); };
  window.insertChatEmoji = function (e) { var i = $('#wcInput'); if (i) { i.value += e; i.focus(); } };
  window.CommunityHub = { open: open, send: send, state: state };

  function boot() {
    load(); injectStyle();
    if (!build()) return;
    bind(); renderAll();
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a.sidebar-item');
      if (a && /group-chat/.test(a.getAttribute('onclick') || '')) setTimeout(function () { renderHead(); renderMsgs(); }, 60);
      if (e.target.closest('#roleSwitcherDropdown button')) setTimeout(renderHead, 80);
    });
    var sec = $('#group-chat');
    if (sec && 'IntersectionObserver' in window) new IntersectionObserver(function (en) { if (en[0].isIntersecting) renderMsgs(); }, { threshold: 0.05 }).observe(sec);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
