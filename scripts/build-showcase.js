// Generates the showcase illustrations in public/assets/showcase/*.svg
// Run: node scripts/build-showcase.js
const fs = require('fs'), path = require('path');
const out = path.join(__dirname, '..', 'public', 'assets', 'showcase');
fs.mkdirSync(out, { recursive: true });
const W = 1280, H = 800;
const F = "font-family=\"'Plus Jakarta Sans','Segoe UI',system-ui,sans-serif\"";
const esc = (s) => String(s).replace(/&(?!amp;)/g, '&amp;');
const t = (x, y, s, size = 14, fill = '#e2e8f0', w = 600, extra = '') => `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" font-weight="${w}" ${F} ${extra}>${esc(s)}</text>`;
const rr = (x, y, w, h, r, fill, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" ${extra}/>`;

function frame(id, a, b, title, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(title)}">
<defs>
<linearGradient id="bg-${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0b1020"/><stop offset="1" stop-color="#050816"/></linearGradient>
<linearGradient id="ac-${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>
<radialGradient id="gl1-${id}" cx=".15" cy=".1" r=".7"><stop offset="0" stop-color="${a}" stop-opacity=".45"/><stop offset="1" stop-color="${a}" stop-opacity="0"/></radialGradient>
<radialGradient id="gl2-${id}" cx=".95" cy=".95" r=".6"><stop offset="0" stop-color="${b}" stop-opacity=".35"/><stop offset="1" stop-color="${b}" stop-opacity="0"/></radialGradient>
<filter id="sh-${id}" x="-10%" y="-10%" width="120%" height="125%"><feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#000" flood-opacity=".5"/></filter>
<clipPath id="cp-${id}"><rect x="60" y="56" width="1160" height="688" rx="22"/></clipPath>
</defs>
<rect width="${W}" height="${H}" fill="url(#bg-${id})"/><rect width="${W}" height="${H}" fill="url(#gl1-${id})"/><rect width="${W}" height="${H}" fill="url(#gl2-${id})"/>
<g filter="url(#sh-${id})"><rect x="60" y="56" width="1160" height="688" rx="22" fill="#0f172a" stroke="#ffffff" stroke-opacity=".12"/></g>
<g clip-path="url(#cp-${id})">
<rect x="60" y="56" width="1160" height="44" fill="#111a30"/>
<circle cx="86" cy="78" r="6" fill="#fb7185"/><circle cx="106" cy="78" r="6" fill="#fbbf24"/><circle cx="126" cy="78" r="6" fill="#34d399"/>
${rr(430, 66, 420, 24, 12, '#0b1224')}${t(640, 83, 'smartcampus.edu / ' + title.toLowerCase().replace(/ /g, '-'), 11, '#64748b', 600, 'text-anchor="middle"')}
<rect x="60" y="100" width="190" height="644" fill="#0c1426"/>
${rr(80, 120, 34, 34, 10, `url(#ac-${id})`)}${t(92, 143, '🎓', 16)}${t(124, 134, 'Smart Campus', 14, '#f1f5f9', 800)}${t(124, 149, 'AI Assistant', 11, '#64748b', 600)}
${['Dashboard', 'AI Planner', 'Attendance', 'Campus Map', 'Analytics', 'Safety & SOS', 'Community'].map((n, i) => (title.toLowerCase().startsWith(n.split(' ')[0].toLowerCase()) ? rr(72, 186 + i * 44, 166, 36, 10, `url(#ac-${id})`, 'opacity=".9"') : '') + rr(86, 197 + i * 44, 14, 14, 4, '#94a3b8', 'opacity=".5"') + t(112, 209 + i * 44, n, 13, title.toLowerCase().startsWith(n.split(' ')[0].toLowerCase()) ? '#fff' : '#94a3b8', 700)).join('')}
${rr(72, 676, 166, 56, 12, '#111c36')}<circle cx="98" cy="704" r="14" fill="url(#ac-${id})"/>${t(120, 700, 'Gaurav Sharma', 12, '#e2e8f0', 700)}${t(120, 716, '2024CS0042 · Sem 4', 10, '#64748b', 600)}
${body}
</g>
<rect x="60" y="56" width="1160" height="688" rx="22" fill="none" stroke="#fff" stroke-opacity=".08"/>
</svg>`;
}
const card = (x, y, w, h, inner = '', fill = '#111c36') => `${rr(x, y, w, h, 16, fill, 'stroke="#ffffff" stroke-opacity=".07"')}${inner}`;
const head = (id, title, sub) => `${t(280, 150, title, 26, '#f8fafc', 800)}${t(280, 174, sub, 13, '#64748b', 600)}${rr(1010, 128, 180, 40, 20, `url(#ac-${id})`)}${t(1100, 153, '● Live', 13, '#fff', 800, 'text-anchor="middle"')}`;
const kpi = (id, x, y, label, val, delta, col) => card(x, y, 210, 104, `${t(x + 18, y + 30, label, 12, '#94a3b8', 700)}${t(x + 18, y + 70, val, 32, '#f8fafc', 800)}${t(x + 18, y + 92, delta, 12, col, 700)}${rr(x + 150, y + 18, 42, 42, 12, col, 'opacity=".16"')}<circle cx="${x + 171}" cy="${y + 39}" r="7" fill="${col}"/>`);

// ---- 1 dashboard
(() => {
  const id = 'd'; const pts = [210, 190, 200, 160, 170, 130, 140, 100, 120, 80];
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${300 + i * 56},${p + 380}`).join(' ');
  const body = head(id, 'Student Command Dashboard', 'Everything about your semester in one live view') +
    kpi(id, 280, 196, 'ATTENDANCE', '91.4%', '▲ 2.1% this week', '#34d399') + kpi(id, 513, 196, 'CGPA', '8.74', '▲ 0.12 vs last sem', '#818cf8') + kpi(id, 746, 196, 'FEES DUE', '₹ 0', '✓ All cleared', '#22d3ee') + kpi(id, 979, 196, 'XP LEVEL', 'Lv 5', '1,260 XP · 78%', '#f472b6') +
    card(280, 320, 560, 400, `${t(302, 354, 'Performance trend', 15, '#f1f5f9', 800)}${t(302, 374, 'Internal marks · last 10 assessments', 12, '#64748b', 600)}${[0, 1, 2, 3].map(i => `<line x1="300" x2="820" y1="${420 + i * 70}" y2="${420 + i * 70}" stroke="#fff" stroke-opacity=".06"/>`).join('')}<path d="${path} L804,650 L300,650 Z" fill="url(#ac-${id})" opacity=".18"/><path d="${path}" fill="none" stroke="url(#ac-${id})" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>${pts.map((p, i) => `<circle cx="${300 + i * 56}" cy="${p + 380}" r="5" fill="#0f172a" stroke="${i === 9 ? '#22d3ee' : '#818cf8'}" stroke-width="3"/>`).join('')}`) +
    card(860, 320, 330, 400, `${t(882, 354, "Today's timetable", 15, '#f1f5f9', 800)}${[['09:00', 'Operating Systems', 'Lab 3 · Dr. Sharma', '#818cf8'], ['11:00', 'Machine Learning', 'Room 204 · Dr. Rao', '#22d3ee'], ['13:30', 'Database Systems', 'Room 108 · Prof. Nair', '#34d399'], ['15:30', 'Cloud Computing', 'Seminar Hall', '#f472b6']].map((r, i) => `${rr(882, 380 + i * 80, 286, 68, 12, '#0b1224')}${rr(882, 380 + i * 80, 5, 68, 3, r[3])}${t(900, 405 + i * 80, r[0], 12, r[3], 800)}${t(900, 427 + i * 80, r[1], 14, '#f1f5f9', 700)}${t(900, 445 + i * 80, r[2], 11, '#64748b', 600)}`).join('')}`);
  fs.writeFileSync(path_('dashboard'), frame(id, '#6366f1', '#22d3ee', 'Dashboard', body));
})();
function path_(n) { return require('path').join(out, n + '.svg'); }

// ---- 2 AI assistant
(() => {
  const id = 'a';
  const bub = (x, y, w, h, txt, me) => `${rr(x, y, w, h, 16, me ? `url(#ac-${id})` : '#16213f', me ? '' : 'stroke="#ffffff" stroke-opacity=".08"')}${txt.map((l, i) => t(x + 18, y + 28 + i * 22, l, 13.5, me ? '#fff' : '#e2e8f0', 600)).join('')}`;
  const body = head(id, 'AI Study Planner & Doubt Solver', 'Ask anything — get a personalised plan instantly') +
    card(280, 196, 600, 524, `${bub(520, 222, 330, 66, ['My exams start in 3 weeks. I am weak in', 'Deep Learning. Target CGPA is 9.2.'], true)}${bub(302, 312, 470, 132, ['Here is your 21-day plan 🎯', '• Mon–Sat 9–4:30 college, 4h self-study', '• Deep Learning: 90 min daily, weeks 1–2', '• Mock test every Sunday · revision week 3'], false)}${bub(560, 468, 290, 44, ['Explain backpropagation simply'], true)}${bub(302, 536, 500, 112, ['Think of it as blame assignment: the network', 'guesses, measures its error, then walks backward', 'nudging each weight by how much it contributed.'], false)}${rr(302, 664, 556, 40, 20, '#0b1224', 'stroke="#ffffff" stroke-opacity=".1"')}${t(324, 689, 'Ask the AI…', 13, '#64748b', 600)}<circle cx="836" cy="684" r="14" fill="url(#ac-${id})"/>`) +
    card(900, 196, 290, 250, `${t(920, 230, 'This week’s plan', 15, '#f1f5f9', 800)}${['Deep Learning', 'Cyber Security', 'Algorithms', 'Revision'].map((n, i) => `${t(920, 266 + i * 44, n, 12, '#cbd5e1', 700)}${rr(920, 276 + i * 44, 250, 10, 5, '#0b1224')}${rr(920, 276 + i * 44, [210, 150, 180, 90][i], 10, 5, `url(#ac-${id})`)}`).join('')}`) +
    card(900, 466, 290, 254, `${t(920, 500, 'Weak-topic radar', 15, '#f1f5f9', 800)}${['Neural Nets', 'Encryption', 'Graphs'].map((n, i) => `${rr(920, 522 + i * 62, 250, 50, 12, '#0b1224')}<circle cx="946" cy="${547 + i * 62}" r="12" fill="${['#f472b6', '#22d3ee', '#34d399'][i]}" opacity=".85"/>${t(970, 543 + i * 62, n, 13, '#f1f5f9', 700)}${t(970, 561 + i * 62, ['Priority · 4 sessions', 'Review · 2 sessions', 'On track'][i], 11, '#64748b', 600)}`).join('')}`);
  fs.writeFileSync(path_('ai-assistant'), frame(id, '#8b5cf6', '#ec4899', 'AI Planner', body));
})();

// ---- 3 attendance
(() => {
  const id = 't'; let qr = '';
  const fin = (i, j) => { const f = (a, b) => (a < 7 && b < 7) ? [a, b] : null; return null; };
  const inFinder = (i, j) => (i < 7 && j < 7) || (i > 13 && j < 7) || (i < 7 && j > 13);
  for (let i = 0; i < 21; i++) for (let j = 0; j < 21; j++) if (!inFinder(i, j) && ((i * 7 + j * 13 + i * j * 3) % 5) < 2) qr += `<rect x="${941 + i * 8}" y="${520 + j * 8}" width="7" height="7" rx="1.5" fill="#e2e8f0"/>`;
  for (const [fx, fy] of [[0, 0], [14, 0], [0, 14]]) qr += `<rect x="${941 + fx * 8}" y="${520 + fy * 8}" width="55" height="55" rx="6" fill="#e2e8f0"/><rect x="${941 + fx * 8 + 8}" y="${520 + fy * 8 + 8}" width="39" height="39" rx="3" fill="#111c36"/><rect x="${941 + fx * 8 + 16}" y="${520 + fy * 8 + 16}" width="23" height="23" rx="3" fill="#e2e8f0"/>`;
  const body = head(id, 'Smart Attendance', 'Face recognition · rolling QR · RFID — verified in seconds') +
    card(280, 196, 560, 524, `${rr(304, 220, 512, 340, 16, '#050816')}<circle cx="560" cy="360" r="86" fill="#1e293b"/><circle cx="560" cy="338" r="34" fill="#334155"/><path d="M490 430 q70-70 140 0 v20 h-140z" fill="#334155"/>${[[470, 270], [650, 270], [470, 450], [650, 450]].map(([x, y], i) => `<path d="M${x} ${y + (i > 1 ? 0 : 0)} h${i % 2 ? -34 : 34} M${x} ${y} v${i > 1 ? -34 : 34}" stroke="#34d399" stroke-width="4" stroke-linecap="round" fill="none"/>`).join('')}<line x1="470" x2="650" y1="360" y2="360" stroke="#34d399" stroke-width="2" opacity=".8"/><rect x="470" y="340" width="180" height="40" fill="#34d399" opacity=".1"/>${rr(420, 506, 280, 34, 17, '#064e3b', 'stroke="#34d399" stroke-opacity=".6"')}${t(560, 528, '✓ Gaurav Sharma · 98.7% match', 13, '#6ee7b7', 800, 'text-anchor="middle"')}${t(304, 596, 'Today’s sessions', 15, '#f1f5f9', 800)}${['OS Lab · 09:00', 'ML · 11:00', 'DBMS · 13:30'].map((s, i) => `${rr(304 + i * 172, 612, 164, 84, 12, '#0b1224')}${t(320 + i * 172, 642, s, 12, '#cbd5e1', 700)}${t(320 + i * 172, 676, ['Present', 'Present', 'Upcoming'][i], 16, ['#34d399', '#34d399', '#fbbf24'][i], 800)}`).join('')}`) +
    card(860, 196, 330, 250, `${t(880, 230, 'Semester attendance', 15, '#f1f5f9', 800)}<circle cx="1025" cy="335" r="62" fill="none" stroke="#0b1224" stroke-width="16"/><circle cx="1025" cy="335" r="62" fill="none" stroke="url(#ac-${id})" stroke-width="16" stroke-linecap="round" stroke-dasharray="355 390" transform="rotate(-90 1025 335)"/>${t(1025, 344, '91%', 28, '#f8fafc', 800, 'text-anchor="middle"')}${t(1025, 424, 'Above 75% requirement', 12, '#34d399', 700, 'text-anchor="middle"')}`) +
    card(860, 466, 330, 254, `${t(880, 498, 'Rolling QR · refreshes in 12s', 13, '#f1f5f9', 800)}${qr}`);
  fs.writeFileSync(path_('attendance'), frame(id, '#10b981', '#06b6d4', 'Attendance', body));
})();

// ---- 4 campus map
(() => {
  const id = 'm';
  const b = (x, y, w, h, n, c) => `${rr(x, y, w, h, 12, c, 'opacity=".28"')}${rr(x, y, w, h, 12, 'none', `stroke="${c}" stroke-width="2" opacity=".9"`)}${t(x + w / 2, y + h / 2 + 5, n, 13, '#f1f5f9', 800, 'text-anchor="middle"')}`;
  const body = head(id, 'Campus Navigation & Resources', 'Find rooms, labs, buses and free slots in real time') +
    card(280, 196, 910, 524, `<g opacity=".8">${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(i => `<line x1="${300 + i * 70}" x2="${300 + i * 70}" y1="216" y2="700" stroke="#fff" stroke-opacity=".04"/>`).join('')}${[0, 1, 2, 3, 4, 5, 6].map(i => `<line y1="${216 + i * 80}" y2="${216 + i * 80}" x1="300" x2="1170" stroke="#fff" stroke-opacity=".04"/>`).join('')}</g>${rr(300, 440, 870, 34, 6, '#16213f')}${rr(690, 216, 34, 484, 6, '#16213f')}${b(330, 240, 170, 120, 'Main Block', '#6366f1')}${b(530, 240, 130, 120, 'Library', '#a855f7')}${b(750, 240, 160, 120, 'CSE Dept', '#22d3ee')}${b(940, 240, 200, 120, 'Innovation Hub', '#f472b6')}${b(330, 510, 170, 100, 'Hostel A', '#34d399')}${b(530, 510, 130, 100, 'Cafeteria', '#fbbf24')}${b(750, 510, 160, 100, 'Sports Arena', '#10b981')}${b(940, 510, 200, 100, 'Robotics Lab', '#fb7185')}<path d="M415 360 V457 H707 V380 H830 V360" fill="none" stroke="url(#ac-${id})" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="2 14"/><circle cx="415" cy="360" r="11" fill="#22d3ee"/><circle cx="415" cy="360" r="22" fill="#22d3ee" opacity=".25"/><path d="M830 340 a14 14 0 1 1 .01 0z" fill="#f472b6"/><circle cx="830" cy="334" r="5" fill="#fff"/><g transform="translate(560 438)">${rr(0, 0, 54, 22, 8, '#fbbf24')}${t(27, 16, '🚌 B2', 11, '#0f172a', 800, 'text-anchor="middle"')}</g>${rr(310, 224, 0, 0, 0, 'none')}`) +
    card(310, 630, 860, 72, `${t(334, 660, 'Route · 4 min walk', 15, '#f1f5f9', 800)}${t(334, 682, 'Main Block → CSE Dept · Room 204 · 1 bus stop avoided', 12, '#94a3b8', 600)}${rr(940, 644, 206, 44, 12, `url(#ac-${id})`)}${t(1043, 672, 'Start navigation', 14, '#fff', 800, 'text-anchor="middle"')}`, '#0f1a33');
  fs.writeFileSync(path_('campus-map'), frame(id, '#3b82f6', '#a855f7', 'Campus Map', body));
})();

// ---- 5 analytics
(() => {
  const id = 'r'; const cx = 520, cy = 470, R = 150;
  const ax = ['Attendance', 'Internals', 'Assignments', 'Engagement', 'Fees', 'Behaviour'];
  const pt = (i, k) => { const a = -Math.PI / 2 + i * 2 * Math.PI / 6; return [cx + Math.cos(a) * R * k, cy + Math.sin(a) * R * k]; };
  const poly = (vals) => vals.map((v, i) => pt(i, v).join(',')).join(' ');
  const body = head(id, 'Early-Warning Analytics', 'ML model flags at-risk students before results do') +
    card(280, 196, 480, 524, `${t(302, 230, 'Risk radar · Cohort CSE-4', 15, '#f1f5f9', 800)}${[.25, .5, .75, 1].map(k => `<polygon points="${poly([k, k, k, k, k, k])}" fill="none" stroke="#fff" stroke-opacity=".09"/>`).join('')}${ax.map((n, i) => { const [x, y] = pt(i, 1); const [lx, ly] = pt(i, 1.25); return `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#fff" stroke-opacity=".07"/>${t(lx, ly + 4, n, 11.5, '#94a3b8', 700, 'text-anchor="middle"')}`; }).join('')}<polygon points="${poly([.9, .8, .7, .85, 1, .9])}" fill="#34d399" fill-opacity=".18" stroke="#34d399" stroke-width="3"/><polygon points="${poly([.45, .35, .5, .3, .8, .4])}" fill="#fb7185" fill-opacity=".22" stroke="#fb7185" stroke-width="3"/>${rr(310, 668, 12, 12, 4, '#34d399')}${t(330, 679, 'Healthy profile', 12, '#cbd5e1', 700)}${rr(480, 668, 12, 12, 4, '#fb7185')}${t(500, 679, 'At-risk profile', 12, '#cbd5e1', 700)}`) +
    card(780, 196, 410, 120, `${t(802, 230, 'Model accuracy', 13, '#94a3b8', 700)}${t(802, 282, '94.2%', 44, '#f8fafc', 800)}${rr(1040, 222, 130, 36, 18, '#064e3b')}${t(1105, 246, '▲ Precision 0.91', 12, '#6ee7b7', 800, 'text-anchor="middle"')}`) +
    card(780, 336, 410, 384, `${t(802, 370, 'Students needing attention', 15, '#f1f5f9', 800)}${[['Aarav Mehta', 'Attendance 62%', 'HIGH', '#fb7185'], ['Sneha Kulkarni', 'Internals dropping', 'MED', '#fbbf24'], ['Rohan Das', 'Assignments late', 'MED', '#fbbf24'], ['Isha Patel', 'Fee reminder', 'LOW', '#22d3ee']].map((r, i) => `${rr(802, 392 + i * 76, 366, 64, 12, '#0b1224')}<circle cx="832" cy="${424 + i * 76}" r="16" fill="${r[3]}" opacity=".25"/>${t(832, 429 + i * 76, r[0][0], 14, r[3], 800, 'text-anchor="middle"')}${t(860, 418 + i * 76, r[0], 13.5, '#f1f5f9', 700)}${t(860, 438 + i * 76, r[1], 11.5, '#64748b', 600)}${rr(1100, 412 + i * 76, 56, 24, 12, r[3], 'opacity=".2"')}${t(1128, 429 + i * 76, r[2], 11, r[3], 800, 'text-anchor="middle"')}`).join('')}`);
  fs.writeFileSync(path_('analytics'), frame(id, '#f43f5e', '#f59e0b', 'Analytics', body));
})();

// ---- 6 safety
(() => {
  const id = 's';
  const zones = ['Main Gate', 'Library', 'Hostel A', 'Parking', 'Cafeteria', 'Labs'];
  const body = head(id, 'Campus Safety & Security', 'One-tap SOS, live zone telemetry and digital visitor passes') +
    card(280, 196, 570, 330, `${t(302, 230, 'CCTV zone telemetry', 15, '#f1f5f9', 800)}${zones.map((z, i) => { const x = 302 + (i % 3) * 180, y = 252 + Math.floor(i / 3) * 132; const lv = [34, 58, 22, 71, 46, 28][i]; return `${rr(x, y, 168, 120, 12, '#0b1224')}${rr(x + 10, y + 10, 148, 62, 8, '#050816')}<circle cx="${x + 24}" cy="${y + 24}" r="4" fill="#fb7185"/>${t(x + 150, y + 26, 'LIVE', 9, '#94a3b8', 800, 'text-anchor="end"')}<path d="M${x + 20} ${y + 62} l22-18 l18 10 l24-22 l26 20 l22-8 l16 14" fill="none" stroke="#22d3ee" stroke-opacity=".5" stroke-width="2"/>${t(x + 12, y + 92, z, 12, '#f1f5f9', 700)}${rr(x + 12, y + 100, 144, 6, 3, '#1e293b')}${rr(x + 12, y + 100, lv * 1.44, 6, 3, lv > 65 ? '#fbbf24' : '#34d399')}`; }).join('')}`) +
    card(870, 196, 320, 330, `${t(890, 230, 'Emergency SOS', 15, '#f1f5f9', 800)}<circle cx="1030" cy="372" r="92" fill="#fb7185" opacity=".08"/><circle cx="1030" cy="372" r="68" fill="#fb7185" opacity=".16"/><circle cx="1030" cy="372" r="46" fill="#e11d48"/>${t(1030, 380, 'SOS', 22, '#fff', 800, 'text-anchor="middle"')}${t(1030, 486, 'Security + campus medic', 12, '#94a3b8', 700, 'text-anchor="middle"')}${t(1030, 504, 'alerted with your live location', 12, '#94a3b8', 700, 'text-anchor="middle"')}`) +
    card(280, 546, 570, 174, `${t(302, 580, 'Visitor gate pass', 15, '#f1f5f9', 800)}${rr(302, 598, 526, 98, 14, `url(#ac-${id})`, 'opacity=".95"')}${t(326, 632, 'VIS-20481', 22, '#fff', 800)}${t(326, 656, 'Dr. K. S. Murthy · External Viva Review', 13, '#ffe4e6', 700)}${t(326, 678, 'Valid today · Host: Dr. Rajesh Sharma', 12, '#ffe4e6', 600)}${rr(724, 612, 80, 70, 10, '#fff', 'opacity=".95"')}${Array.from({ length: 36 }, (_, k) => ((k * 5 + (k >> 2)) % 3 === 0) ? `<rect x="${734 + (k % 6) * 10}" y="${620 + Math.floor(k / 6) * 10}" width="8" height="8" fill="#0f172a"/>` : '').join('')}`) +
    card(870, 546, 320, 174, `${t(890, 580, 'Alerts today', 15, '#f1f5f9', 800)}${[['Gate 2 · visitor checked in', '#34d399'], ['Parking · crowd moderate', '#fbbf24'], ['Hostel A · all quiet', '#22d3ee']].map((r, i) => `<circle cx="900" cy="${610 + i * 36}" r="5" fill="${r[1]}"/>${t(916, 615 + i * 36, r[0], 12.5, '#cbd5e1', 600)}`).join('')}`);
  fs.writeFileSync(path_('safety'), frame(id, '#e11d48', '#f97316', 'Safety & SOS', body));
})();
console.log('showcase written to', out);
