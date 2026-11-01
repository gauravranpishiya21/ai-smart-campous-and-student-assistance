/* AI-Powered Smart Campus: feature sections (AI tools, placement, campus services, projects ...).
   Depends on helpers exported by student.js ($, api, act, esc, pill, toast ...). */
const L = window.loaders;
const md = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
const card = (inner, cls = '') => `<div class="bg-white border rounded-2xl p-4 ${cls}">${inner}</div>`;
const sel = (id) => document.getElementById(id);

// ---------- library ----------
L.library = async () => { window.loadDigitalStudyMaterials?.(); await loadBorrowHistory(); };
async function loadBorrowHistory() {
  const h = await api('/library/history');
  sel('libraryHistoryTableBody').innerHTML = h.length ? h.map((b) => `<tr class="border-b"><td class="p-3 font-bold">${esc(b.title)}</td><td class="p-3">${fdate(b.borrowed)}</td><td class="p-3">${fdate(b.due)}</td><td class="p-3">${pill(b.status === 'Borrowed' && new Date(b.due) < new Date() ? 'Overdue' : b.status, statusTone(b.status === 'Borrowed' && new Date(b.due) < new Date() ? 'Overdue' : b.status))}</td><td class="p-3">${b.status === 'Borrowed' ? `<button class="text-indigo-600 font-bold text-xs" onclick="returnBook(${b.id})">Return</button>` : ''}</td></tr>`).join('') : '<tr><td colspan="5" class="p-4 text-center text-gray-400">No borrow history.</td></tr>';
}
window.returnBook = (id) => act(async () => { const r = await api('/library/return/' + id, { method: 'POST' }); await loadBorrowHistory(); return r; });
window.toggleLibraryView = () => {
  const v = sel('libraryHistoryView'), hidden = v.classList.toggle('hidden');
  sel('libraryViewBtn').innerHTML = hidden ? '<i class="fas fa-clock-rotate-left mr-2"></i> Borrow History' : '<i class="fas fa-book-open mr-2"></i> Hide History';
};

// ---------- placement ----------
let placeData = null, placeFilter = 'full-time';
L.placement = async () => { placeData = await api('/placement'); renderPlacement(); };
function renderPlacement() {
  const d = placeData, s = d.summary;
  sel('placementSummary').innerHTML = `<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">${[['Applications', s.applied, 'fa-paper-plane'], ['Interviews', s.interviews, 'fa-user-tie'], ['Certificates', s.certificates, 'fa-certificate'], ['AI resume score', s.resumeScore + '%', 'fa-robot']].map(([k, v, i]) => card(`<i class="fas ${i} text-indigo-500"></i><p class="text-2xl font-black mt-1">${v}</p><p class="text-xs text-gray-400 font-bold uppercase">${k}</p>`)).join('')}</div>`;
  sel('btnJobFT').classList.toggle('bg-indigo-600', placeFilter === 'full-time'); sel('btnJobFT').classList.toggle('text-white', placeFilter === 'full-time');
  sel('btnJobIntern').classList.toggle('bg-indigo-600', placeFilter === 'internship'); sel('btnJobIntern').classList.toggle('text-white', placeFilter === 'internship');
  const jobs = d.jobs.filter((j) => j.type === placeFilter);
  sel('placementJobsList').innerHTML = jobs.map((j) => card(`<div class="flex justify-between gap-3"><div><h4 class="font-bold">${esc(j.title)}</h4><p class="text-sm text-gray-500">${esc(j.company)} · ${esc(j.pay)}</p></div>${pill(j.match + '% match', j.match >= 60 ? 'green' : j.match >= 30 ? 'amber' : 'gray')}</div>
    <p class="text-xs text-gray-500 mt-2">${esc(j.desc)}</p><p class="text-xs mt-2"><b>Skills:</b> ${esc(j.skills)}</p>
    <button class="mt-3 px-4 py-2 rounded-lg text-xs font-bold ${j.applied ? 'bg-gray-100 text-gray-400' : 'bg-indigo-600 text-white'}" ${j.applied ? 'disabled' : ''} onclick="applyJob(${j.id})">${j.applied ? 'Applied' : 'Apply now'}</button>`, 'mb-3')).join('') || empty('No openings.');
  sel('placementApplicationsList').innerHTML = d.applications.map((a) => `<div class="flex justify-between text-sm py-2 border-b"><span><b>${esc(a.title)}</b> · ${esc(a.company)}</span>${pill(a.status, 'amber')}</div>`).join('') || empty('No applications yet.');
  sel('placementInterviewsList').innerHTML = d.interviews.map((i) => `<div class="text-sm py-2 border-b"><b>${esc(i.company)}</b> · ${esc(i.role)}<br><span class="text-xs text-gray-400">${fdate(i.date)} · ${esc(i.mode)}</span></div>`).join('') || empty('None scheduled.');
  sel('placementCertificatesList').innerHTML = d.certificates.map((c) => `<div class="text-sm py-2 border-b"><b>${esc(c.title)}</b><br><span class="text-xs text-gray-400">${esc(c.issuer)} · ${esc(c.category)}</span></div>`).join('') || empty('No certificates added.');
}
window.filterPlacements = (t) => { placeFilter = t; if (placeData) renderPlacement(); };
window.applyJob = (id) => act(async () => { const r = await api('/placement/apply/' + id, { method: 'POST' }); await L.placement(); return r; });
window.addPlacementCertificate = () => act(async () => {
  const r = await api('/placement/certificates', { body: { title: val('certificateTitle'), issuer: val('certificateIssuer'), category: val('certificateCategory'), date: val('certificateDate'), url: val('certificateUrl') } });
  closeModal('addCertificateModal'); await L.placement(); return r;
});

// ---------- AI advisor chat ----------
const aiHistory = [];
function aiBubble(role, html) {
  const box = sel('aiChatMessages');
  if (!box) return;
  const bot = role === 'assistant';
  box.insertAdjacentHTML('beforeend', `<div class="flex ${bot ? '' : 'justify-end'} gap-3 mb-3">${bot ? '<div class="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0"><i class="fas fa-robot"></i></div>' : ''}<div class="max-w-[80%] rounded-2xl px-4 py-3 text-sm ${bot ? 'bg-indigo-50 text-gray-800' : 'bg-indigo-600 text-white'}">${html}</div></div>`);
  box.scrollTop = box.scrollHeight;
}
window.sendAIChatMessage = async () => {
  const inp = sel('aiChatInput');
  if (!inp) return;
  const text = inp.value.trim(); if (!text) return;
  inp.value = ''; aiBubble('user', esc(text));
  const box = sel('aiChatMessages');
  if (!box) return;
  aiBubble('assistant', '<i class="fas fa-ellipsis fa-fade"></i>');
  const typing = box.lastElementChild;
  try {
    const r = await api('/ai/chat', { body: { message: text, history: aiHistory } });
    aiHistory.push({ role: 'user', content: text }, { role: 'assistant', content: r.reply });
    if (typing) typing.remove();
    aiBubble('assistant', md(r.reply) + `<p class="text-[10px] text-gray-400 mt-1">${(r.engine === 'gemini') ? 'Google Gemini (' + (r.model || 'Active') + ')' : 'Offline engine'}</p>`);
  } catch (e) {
    if (typing) typing.remove();
    aiBubble('assistant', esc(e.message));
  }
};
L['ai-assistant'] = () => {
  const inp = sel('aiChatInput');
  const box = sel('aiChatMessages');
  if (!inp || !box) return;
  if (!inp.dataset.bound) {
    inp.dataset.bound = 1;
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') window.sendAIChatMessage(); });
  }
  if (!sel('aiChips')) {
    box.insertAdjacentHTML('afterend', `<div id="aiChips" class="flex flex-wrap gap-2 px-4 pb-3">${['Can I bunk classes?', 'How is my CGPA?', 'What is my next class?', 'Am I at risk of backlogs?', 'Give me a study plan'].map((q) => `<button class="text-xs font-bold px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 hover:bg-indigo-100" onclick="const input=sel('aiChatInput');if(input){input.value='${q}';sendAIChatMessage();}">${q}</button>`).join('')}</div>`);
  }
};
window.sel = sel;

// ---------- doubt solver ----------
L['doubt-solver'] = () => {};
window.solveDoubt = async () => {
  const btn = sel('solveDoubtBtn'), old = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Thinking...';
  try {
    const r = await api('/ai/doubt', { body: { subject: val('doubtSubject'), text: val('doubtText') } });
    sel('doubtExplanation').innerHTML = md(r.explanation) + `<p class="text-[10px] text-gray-400 mt-3">Source: ${(r.source === 'gemini' || r.source === 'claude') ? 'Google Gemini' : 'built-in knowledge base'}</p>`;
    sel('doubtNotes').innerHTML = (r.notes || []).map((n) => `<li class="text-sm mb-1 list-disc ml-4">${esc(n)}</li>`).join('');
    sel('doubtTopics').innerHTML = (r.topics || []).map((t) => `<span class="inline-block text-xs font-bold px-3 py-1 m-1 rounded-full bg-indigo-50 text-indigo-700">${esc(t)}</span>`).join('');
    sel('doubtResponse').classList.remove('hidden');
  } catch (e) { toast(e.message, 'err'); }
  btn.disabled = false; btn.innerHTML = old;
};

// ---------- competitive exams ----------
L.exams = () => window.loadMockTests();
window.loadMockTests = async () => {
  const t = await api('/mocktests?exam=' + val('examTypeFilter'));
  sel('mockTestsGrid').innerHTML = `<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">${t.map((x) => card(`<p class="text-[10px] font-black text-indigo-600 uppercase">${esc(x.exam)}</p><h4 class="font-bold mt-1">${esc(x.title)}</h4><p class="text-xs text-gray-500 mt-2"><i class="fas fa-clock mr-1"></i>${x.mins} min · ${x.qs} questions</p>`)).join('')}</div>`;
};
window.getAIExamAdvice = () => act(async () => {
  const r = await api('/ai/exam-advice');
  sel('aiExamAdvice').innerHTML = `<div class="mt-3 p-4 rounded-xl bg-indigo-50 text-indigo-900 text-sm"><b>Recommended difficulty: ${esc(r.level)}</b> <span class="text-xs">(performance index ${r.score}%)</span><br>${esc(r.advice)}</div>`; return r;
}, false);

// ---------- exam schedule ----------
L['exam-schedule'] = async () => {
  const d = await api('/exam-schedule');
  sel('examScheduleTable').innerHTML = d.exams.map((e) => `<tr class="border-b"><td class="p-3 font-bold">${esc(e.subject)}</td><td class="p-3">${esc(e.type)}</td><td class="p-3">${fdate(e.date)}</td><td class="p-3">${esc(e.time)}</td><td class="p-3">${esc(e.room)}</td><td class="p-3">${pill(new Date(e.date) < new Date(new Date().toDateString()) ? 'Done' : 'Scheduled', 'blue')}</td></tr>`).join('');
  sel('nextExamCountdown').textContent = d.nextInDays == null ? 'None' : d.nextInDays + ' Days';
  const sec = sel('exam-schedule'), bar = sec.querySelector('.bg-white.w-3\\/4, .w-3\\/4');
  if (bar) { bar.classList.remove('w-3/4'); bar.style.width = d.ready + '%'; }
  const lab = [...sec.querySelectorAll('p')].find((p) => /% Ready/.test(p.textContent)); if (lab) lab.textContent = d.ready + '% Ready';
  const dl = sec.querySelector('button.bg-white, .bg-emerald-500 button'); if (dl) dl.onclick = () => { showSection('certificates'); loadHallTicket(); };
};

// ---------- planner ----------
let plannerData = null;
let plannerTasks = [];
let plannerShownDate = new Date();
plannerShownDate.setDate(1);
let plannerSelectedDate = new Date();

const plannerIso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const plannerPretty = (d) => new Date(d + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

L.planner = async () => {
  const [pData, tData] = await Promise.all([
    api('/planner'),
    api('/planner/tasks').catch(() => [])
  ]);
  plannerData = pData;
  plannerTasks = Array.isArray(tData) ? tData : [];

  if (sel('targetCgpa')) sel('targetCgpa').value = plannerData.goals?.targetCgpa ?? '9.0';
  if (sel('studyHoursGoal')) sel('studyHoursGoal').value = plannerData.goals?.studyHours ?? '3.5';

  renderPlannerSchedule(plannerData.plan);
  drawPlannerCalendar();
  drawPlannerTasks();
};

function renderPlannerSchedule(plan) {
  if (!plan || !plan.alloc || !plan.schedule) return;
  const max = Math.max(...plan.alloc.map((a) => a.hours), 1);

  // 1. Subject weekly hours progress bars (matching Image 1)
  const barsContainer = sel('plannerSubjectBars');
  if (barsContainer) {
    barsContainer.innerHTML = plan.alloc.map((a) => `
      <div>
        <div class="flex justify-between items-center text-xs font-bold mb-1">
          <span class="text-white">${esc(a.name)}</span>
          <span class="text-indigo-300 font-extrabold">${a.hours}h/wk</span>
        </div>
        <div class="h-2.5 w-full bg-white/10 rounded-full overflow-hidden p-0.5 border border-white/5">
          <div class="h-full rounded-full bg-gradient-to-r from-indigo-500 via-indigo-400 to-purple-500 shadow-sm shadow-indigo-500/50 transition-all duration-500" style="width: ${Math.min(100, Math.max(15, (a.hours / max) * 100))}%;"></div>
        </div>
      </div>
    `).join('');
  }

  // 2. 7-Day Schedule Blocks (Mon - Sun) (matching Image 1)
  const blocksContainer = sel('plannerDayBlocks');
  if (blocksContainer) {
    blocksContainer.innerHTML = plan.schedule.map((s) => `
      <div class="planner-sched-row">
        <b>${esc(s.day)}</b>
        <span>·</span>
        <span>${s.blocks.map(b => esc(b)).join(' · ')}</span>
      </div>
    `).join('');
  }
}

// Interactive Study Planner Chatbot
window.sendPlannerChatMessage = async (presetText = null) => {
  const input = sel('plannerChatInput');
  const text = presetText || input?.value?.trim();
  if (!text) return;
  if (input) input.value = '';

  const messagesBox = sel('plannerChatMessages');
  if (messagesBox) {
    messagesBox.innerHTML += `
      <div class="flex items-start justify-end gap-2.5">
        <div class="bg-indigo-600 text-white rounded-2xl rounded-tr-sm p-3 text-xs max-w-[88%] leading-relaxed shadow-md">
          ${esc(text)}
        </div>
      </div>
    `;
    messagesBox.scrollTop = messagesBox.scrollHeight;
  }

  const typingId = 'typing_' + Date.now();
  if (messagesBox) {
    messagesBox.innerHTML += `
      <div class="flex items-start gap-2.5" id="${typingId}">
        <div class="w-7 h-7 rounded-lg bg-indigo-600/80 flex items-center justify-center text-white text-xs shrink-0 mt-0.5">
          <i class="fas fa-robot animate-pulse"></i>
        </div>
        <div class="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm p-3 text-xs text-indigo-300 italic">
          AI is analyzing your 6-day college schedule and recalibrating timetable...
        </div>
      </div>
    `;
    messagesBox.scrollTop = messagesBox.scrollHeight;
  }

  try {
    const res = await api('/ai/planner-chat', {
      method: 'POST',
      body: { message: text }
    });

    const typingElem = sel(typingId);
    if (typingElem) typingElem.remove();

    if (res.reply && messagesBox) {
      messagesBox.innerHTML += `
        <div class="flex items-start gap-2.5">
          <div class="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-xs shrink-0 mt-0.5">
            <i class="fas fa-robot"></i>
          </div>
          <div class="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm p-3 text-xs text-gray-200 max-w-[92%] leading-relaxed shadow-sm">
            ${md(res.reply)}
          </div>
        </div>
      `;
      messagesBox.scrollTop = messagesBox.scrollHeight;
    }

    if (res.plan) {
      plannerData = { ...plannerData, plan: res.plan, goals: res.goals };
      renderPlannerSchedule(res.plan);
    }
  } catch (err) {
    const typingElem = sel(typingId);
    if (typingElem) typingElem.remove();
    if (messagesBox) {
      messagesBox.innerHTML += `<div class="text-xs text-rose-400 p-2">Error connecting to planner bot: ${esc(err.message)}</div>`;
    }
  }
};

window.plannerUseChip = (chipText) => {
  sendPlannerChatMessage(chipText);
};

window.savePlannerGoals = () => act(async () => {
  const r = await api('/planner', {
    method: 'POST',
    body: {
      targetCgpa: val('targetCgpa'),
      studyHours: val('studyHoursGoal')
    }
  });
  await L.planner();
  return r;
});

// Sync generated timetable to calendar
window.syncPlannerToCalendar = () => act(async () => {
  const currentIso = plannerIso(plannerSelectedDate);
  const r = await api('/planner/sync-schedule', {
    method: 'POST',
    body: { weekStart: currentIso }
  });
  const tData = await api('/planner/tasks');
  plannerTasks = Array.isArray(tData) ? tData : [];
  drawPlannerCalendar();
  drawPlannerTasks();
  return r;
});

// Month navigation
window.plannerMoveMonth = (delta) => {
  plannerShownDate.setMonth(plannerShownDate.getMonth() + delta);
  drawPlannerCalendar();
};

// Date selection
window.plannerSelectDate = (dateStr) => {
  plannerSelectedDate = new Date(dateStr + 'T00:00:00');
  plannerShownDate = new Date(plannerSelectedDate.getFullYear(), plannerSelectedDate.getMonth(), 1);
  drawPlannerCalendar();
  drawPlannerTasks();
};

// Calendar Rendering (Image 2 style)
function drawPlannerCalendar() {
  const grid = sel('plannerCalendarGrid');
  const monthLabel = sel('plannerMonthLabel');
  if (!grid || !monthLabel) return;

  const y = plannerShownDate.getFullYear();
  const m = plannerShownDate.getMonth();
  const first = new Date(y, m, 1);
  const offset = (first.getDay() + 6) % 7; // Mon = 0 ... Sun = 6

  monthLabel.textContent = plannerShownDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  let html = '';
  const selectedIso = plannerIso(plannerSelectedDate);
  const todayIso = plannerIso(new Date());

  for (let i = 0; i < 42; i++) {
    const d = new Date(y, m, 1 - offset + i);
    const dIso = plannerIso(d);
    const inMonth = d.getMonth() === m;

    const dayTasks = plannerTasks.filter((t) => t.date === dIso);
    let dotClass = '';
    if (dayTasks.length >= 3 || dayTasks.some((t) => !t.done && t.priority === 'High')) {
      dotClass = 'high';
    } else if (dayTasks.length >= 2 || dayTasks.some((t) => !t.done && t.priority === 'Medium')) {
      dotClass = 'medium';
    } else if (dayTasks.length >= 1) {
      dotClass = 'low';
    }

    const isSelected = dIso === selectedIso;
    const isToday = dIso === todayIso;

    html += `
      <button type="button" class="cal-day ${inMonth ? '' : 'outside'} ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}" onclick="plannerSelectDate('${dIso}')">
        <span>${d.getDate()}</span>
        ${dotClass ? `<i class="cal-dot ${dotClass}"></i>` : ''}
      </button>
    `;
  }
  grid.innerHTML = html;
}

// Tasks Rendering (Image 2 style)
function drawPlannerTasks() {
  const list = sel('plannerTaskList');
  if (!list) return;

  const selectedIso = plannerIso(plannerSelectedDate);
  const items = plannerTasks.filter((t) => t.date === selectedIso);

  if (!items.length) {
    list.innerHTML = `
      <div class="task-empty">
        <i class="fas fa-clipboard-list"></i>
        <p>There are no tasks for the chosen day yet.</p>
      </div>
    `;
    return;
  }

  list.innerHTML = items.map((t, idx) => {
    const isDone = Boolean(t.done || t.status === 'Done');
    const priority = t.priority || 'Medium';
    const priBadge = priority === 'High'
      ? '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-600">High</span>'
      : priority === 'Medium'
      ? '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">Medium</span>'
      : '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">Low</span>';

    const statusBtn = isDone
      ? `<button type="button" class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-300 flex items-center gap-1" onclick="plannerToggleTask(${t.id})"><i class="fas fa-check text-[9px]"></i> Done</button>`
      : `<button type="button" class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition flex items-center gap-1" onclick="plannerToggleTask(${t.id})"><i class="fas fa-clock text-[9px]"></i> Pending</button>`;

    return `
      <div class="task-table-row">
        <span class="font-bold text-gray-500">${idx + 1}</span>
        <span class="planner-task-title font-bold ${isDone ? 'line-through text-slate-400' : 'text-slate-900'}">${esc(t.name)}</span>
        <span>${priBadge}</span>
        <span>${statusBtn}</span>
        <span class="text-xs text-gray-500">${plannerPretty(t.deadline || t.date)}</span>
        <span class="text-xs text-gray-600 font-medium">${esc(t.time || '18:00')}</span>
        <div class="text-right">
          <button type="button" class="text-gray-400 hover:text-red-500 text-xs transition" title="Delete Task" onclick="plannerDeleteTask(${t.id})">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// Task modal controls
window.plannerOpenTaskForm = () => {
  const modal = sel('plannerTaskModal');
  if (!modal) return;
  modal.classList.remove('hidden');
  modal.style.display = 'block';
  if (sel('plannerTaskDate')) sel('plannerTaskDate').value = plannerIso(plannerSelectedDate);
  if (sel('plannerTaskName')) {
    sel('plannerTaskName').value = '';
    sel('plannerTaskName').focus();
  }
};

window.plannerCloseTaskForm = () => {
  const modal = sel('plannerTaskModal');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.style.display = 'none';
};

window.plannerSaveTask = () => act(async () => {
  const name = val('plannerTaskName')?.trim();
  const date = val('plannerTaskDate');
  const priority = val('plannerTaskPriority') || 'Medium';
  const status = val('plannerTaskStatus') || 'Pending';
  const time = val('plannerTaskTime') || '18:00 - 19:30';

  if (!name || !date) {
    alert('Please enter a task name and deadline date.');
    return;
  }

  const created = await api('/planner/tasks', {
    method: 'POST',
    body: { name, date, priority, status, deadline: date, time, done: status === 'Done' }
  });

  plannerTasks.push(created);
  plannerSelectedDate = new Date(date + 'T00:00:00');
  plannerShownDate = new Date(plannerSelectedDate.getFullYear(), plannerSelectedDate.getMonth(), 1);
  drawPlannerCalendar();
  drawPlannerTasks();
  plannerCloseTaskForm();
  return { message: 'Task added successfully.' };
});

window.plannerToggleTask = (id) => act(async () => {
  const updated = await api(`/planner/tasks/${id}/toggle`, { method: 'POST' });
  plannerTasks = plannerTasks.map((t) => (t.id === id ? updated : t));
  drawPlannerCalendar();
  drawPlannerTasks();
  return { message: 'Task status updated.' };
});

window.plannerDeleteTask = (id) => act(async () => {
  await api(`/planner/tasks/${id}`, { method: 'DELETE' });
  plannerTasks = plannerTasks.filter((t) => t.id !== id);
  drawPlannerCalendar();
  drawPlannerTasks();
  return { message: 'Task deleted.' };
});

// ---------- CGPA predictor ----------
L.cgpa = window.runCgpaPrediction = async () => {
  const d = await api('/ai/cgpa');
  sel('recordedCgpaVal').textContent = d.recorded.cgpa?.toFixed(2) ?? '--'; sel('gpaCreditsEarned').textContent = d.recorded.credits; sel('gpaBacklogCount').textContent = d.recorded.backlogs;
  sel('predictedCgpaVal').textContent = d.predicted.toFixed(2); sel('cgpaFeedback').textContent = d.feedback;
  sel('gpaGradesList').innerHTML = `<table class="w-full text-sm"><tbody>${d.grades.map((g) => `<tr class="border-b"><td class="p-2">${esc(g.name)}</td><td class="p-2">${g.credits} cr</td><td class="p-2 font-black text-indigo-600">${g.grade}</td><td class="p-2">${g.gp}</td></tr>`).join('')}</tbody></table>`;
  sel('cgpaFactors').innerHTML = `<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">${d.factors.map((f) => card(`<p class="text-[10px] uppercase font-black text-gray-400">${esc(f.label)}</p><p class="font-bold mt-1">${esc(f.value)}</p>${pill(f.impact, f.impact === 'positive' ? 'green' : f.impact === 'negative' ? 'red' : 'gray')}`)).join('')}</div>`;
};

// ---------- resume + ATS ----------
function renderResume(r, ats) {
  sel('resumePreview').innerHTML = `<div class="p-2"><h2 class="text-2xl font-extrabold">${esc(r.name)}</h2><p class="text-sm text-gray-500">${esc(r.email)}</p><hr class="my-3"><h4 class="font-bold text-xs uppercase text-gray-400">Summary</h4><p class="text-sm mt-1">${esc(r.summary)}</p>${ats ? `<h4 class="font-bold text-xs uppercase text-gray-400 mt-4">Detected skills</h4><div>${ats.skills.map((s) => `<span class="inline-block text-xs font-bold px-2 py-1 m-0.5 rounded bg-indigo-50 text-indigo-700">${esc(s)}</span>`).join('') || '<span class="text-xs text-gray-400">None detected</span>'}</div>` : ''}</div>`;
}
L.resume = async () => { const r = await api('/resume'); sel('resumeName').value = r.name || ''; sel('resumeEmail').value = r.email || ''; sel('resumeSummary').value = r.summary || ''; renderResume(r); };
window.saveResumeData = () => act(async () => { const r = await api('/resume', { body: { name: val('resumeName'), email: val('resumeEmail'), summary: val('resumeSummary') } }); renderResume({ name: val('resumeName'), email: val('resumeEmail'), summary: val('resumeSummary') }); return r; });
window.analyzeResumeATS = () => act(async () => {
  await api('/resume', { body: { name: val('resumeName'), email: val('resumeEmail'), summary: val('resumeSummary') } });
  const a = await api('/ai/ats', { method: 'POST' });
  sel('atsScoreVal').textContent = a.score + '%';
  sel('atsFeedback').innerHTML = a.tips.map((t) => `<p class="text-xs mt-1"><i class="fas fa-lightbulb mr-1"></i>${esc(t)}</p>`).join('');
  renderResume({ name: val('resumeName'), email: val('resumeEmail'), summary: val('resumeSummary') }, a); return { message: `ATS score: ${a.score}%` };
});
window.exportResumePDF = () => printHtml('Resume', sel('resumePreview').innerHTML);

// ---------- campus services & helpdesk ----------
const ticketRow = (t) => `<div class="border rounded-xl p-3 mb-2 text-sm"><div class="flex justify-between gap-2"><b>${esc(t.title)}</b>${pill(t.priority || 'Low', statusTone(t.priority === 'High' ? 'high' : t.priority === 'Medium' ? 'medium' : 'low'))}</div><p class="text-xs text-gray-500 mt-1">${esc(t.description || '')}</p><p class="text-[11px] mt-2 text-indigo-600 font-bold"><i class="fas fa-route mr-1"></i>AI routed to ${esc(t.department)} · SLA ${esc(t.sla)} · ${esc(t.status)}</p></div>`;
L.campus = async () => {
  const d = await api('/campus');
  const h = d.hostel, t = d.transport;
  sel('hostelStatus').innerHTML = pill(h?.status || 'Not booked', statusTone(h?.status || 'x'));
  sel('hostelInfo').innerHTML = h?.room ? `<p class="text-sm"><b>${esc(h.block)} · Room ${esc(h.room)}</b><br>Warden: ${esc(h.warden)}<br>Mess: ${esc(h.mess)}</p>` : `<button class="btn-primary text-sm" onclick="act(()=>api('/hostel/book',{method:'POST'})).then(L.campus)">Request hostel booking</button>`;
  sel('transportStatus').innerHTML = pill(t?.status || 'Not registered', statusTone(t?.status || 'x'));
  sel('transportInfo').innerHTML = t?.route ? `<p class="text-sm"><b>${esc(t.route)}</b><br>Stop: ${esc(t.stop)}<br>${esc(t.timing)}</p>` : `<button class="btn-primary text-sm" onclick="act(()=>api('/transport/register',{method:'POST'})).then(L.campus)">Register for bus</button>`;
  sel('complaintsList').innerHTML = d.complaints.map(ticketRow).join('') || empty('No tickets yet.');
  sel('maintList').innerHTML = d.maintenance.map(ticketRow).join('') || empty('No requests yet.');
};
window.submitCampusComplaint = () => act(async () => { const r = await api('/complaints', { body: { category: val('complaintCategory'), subject: val('complaintSubject'), description: val('complaintDescription') } }); sel('complaintSubject').value = sel('complaintDescription').value = ''; await L.campus(); return { message: 'Ticket submitted and auto-routed by AI.' }; });
window.submitMaintenanceRequest = () => act(async () => { await api('/maintenance', { body: { category: val('maintCategory'), location: val('maintLocation'), description: val('maintDescription') } }); sel('maintLocation').value = sel('maintDescription').value = ''; await L.campus(); return { message: 'Request logged and auto-routed by AI.' }; });
L.helpdesk = async () => { const t = await api('/helpdesk'); sel('helpTicketsList').innerHTML = t.map(ticketRow).join('') || empty('No tickets yet.'); };
window.raiseGrievance = () => act(async () => { const r = await api('/helpdesk', { body: { title: val('helpTitle'), description: val('helpDesc') } }); sel('helpTitle').value = sel('helpDesc').value = ''; await L.helpdesk(); return r; });

// ---------- forum ----------
let topicId = null;
L.forum = async () => {
  const t = await api('/forum');
  sel('forumTopicsList').innerHTML = t.map((x) => card(`<div class="flex justify-between gap-2"><h4 class="font-bold">${esc(x.title)}</h4>${pill(x.replies + ' replies', 'blue')}</div><p class="text-sm text-gray-500 mt-1">${esc(x.desc)}</p><p class="text-xs text-gray-400 mt-2">${esc(x.author)} · ${fdate(x.created_at)}</p>`, 'mb-3 cursor-pointer hover:border-indigo-400" onclick="openTopic(' + x.id + ')')).join('') || empty('No discussions yet.');
};
window.openTopic = async (id) => {
  topicId = id; const d = await api('/forum/' + id);
  sel('modalTopicTitle').textContent = d.topic.title; sel('modalTopicDesc').textContent = d.topic.desc;
  sel('modalRepliesList').innerHTML = d.replies.map((r) => `<div class="bg-gray-50 rounded-lg p-3 mb-2 text-sm"><b>${esc(r.author)}</b><br>${esc(r.content)}</div>`).join('') || empty('No replies yet.');
  openModal('topicDetailsModal');
};
window.createForumTopic = () => act(async () => { const r = await api('/forum', { body: { title: val('newTopicTitle'), desc: val('newTopicDesc') } }); closeModal('newTopicModal'); sel('newTopicTitle').value = sel('newTopicDesc').value = ''; await L.forum(); return { message: 'Discussion posted. +5 XP' }; });
window.postForumReply = () => act(async () => { await api(`/forum/${topicId}/reply`, { body: { content: val('newReplyContent') } }); sel('newReplyContent').value = ''; await window.openTopic(topicId); await L.forum(); return { message: 'Reply posted.' }; });

// ---------- social feed, faculty ----------
L['social-feed'] = async () => {
  const p = await api('/social');
  sel('socialFeedList').innerHTML = p.map((x) => card(`<p class="text-xs font-black text-indigo-600">${esc(x.author)} <span class="text-gray-400 font-medium">· ${fdate(x.created_at)}</span></p><p class="text-sm mt-1">${esc(x.content)}</p>`, 'mb-3')).join('');
};
window.submitSocialPost = () => act(async () => { const r = await api('/social', { body: { content: val('socialPostContent') } }); sel('socialPostContent').value = ''; await L['social-feed'](); return { message: 'Posted. +5 XP' }; });
L.faculty = async () => {
  const f = await api('/faculty');
  sel('facultyProfilesGrid').innerHTML = `<div class="grid grid-cols-1 md:grid-cols-3 gap-4">${f.map((x) => card(`<div class="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-black mb-2">${esc(x.name.replace(/^(Dr|Prof)\.? /, '')[0])}</div><h4 class="font-bold">${esc(x.name)}</h4><p class="text-xs text-gray-500">${esc(x.role)} · ${esc(x.dept)}</p><p class="text-xs mt-2"><b>Expertise:</b> ${esc(x.expertise)}</p><a class="text-xs text-indigo-600 font-bold" href="mailto:${esc(x.email)}">${esc(x.email)}</a>`)).join('')}</div>`;
};

// ---------- cafeteria / wallet / store / parking / live ----------
let cart = [], menu = [];
const renderCart = () => {
  sel('cartCount').textContent = cart.length;
  sel('cartItems').innerHTML = cart.length ? cart.map((c, i) => `<div class="flex justify-between text-sm py-1"><span>${esc(c.name)}</span><span>${inr(c.price)} <button class="text-rose-500 ml-2" onclick="removeCart(${i})">×</button></span></div>`).join('') : '<p class="text-sm text-gray-400">Cart is empty</p>';
  sel('cartTotal').textContent = cart.reduce((x, c) => x + c.price, 0);
};
L.cafeteria = async () => {
  menu = await api('/cafeteria');
  sel('cafeteriaMenuGrid').innerHTML = `<div class="grid grid-cols-2 md:grid-cols-3 gap-3">${menu.map((m) => card(`<p class="font-bold text-sm">${esc(m.name)}</p><p class="text-indigo-600 font-black">${inr(m.price)}</p><button class="mt-2 text-xs font-bold px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700" onclick="addCart(${m.id})">Add</button>`)).join('')}</div>`; renderCart();
};
window.addCart = (id) => { cart.push(menu.find((m) => m.id === id)); renderCart(); };
window.removeCart = (i) => { cart.splice(i, 1); renderCart(); };
window.placeCafeteriaOrder = () => act(async () => { const r = await api('/cafeteria/order', { body: { items: cart.map((c) => c.id) } }); cart = []; renderCart(); return r; });
L.finance = async () => {
  const w = await api('/wallet'); sel('walletBalance').textContent = w.balance.toFixed(2);
  sel('walletTransactions').innerHTML = w.transactions.map((t) => `<div class="flex justify-between text-sm py-1 border-b"><span>${esc(t.text)}</span><b class="${t.amount < 0 ? 'text-rose-600' : 'text-emerald-600'}">${t.amount < 0 ? '-' : '+'}${inr(Math.abs(t.amount))}</b></div>`).join('') || empty('No transactions.');
  await window.loadStoreItems();
};
window.loadStoreItems = async (cat) => {
  const items = await api('/store' + (cat ? '?category=' + cat : ''));
  sel('storeItemsGrid').innerHTML = `<div class="grid grid-cols-2 md:grid-cols-3 gap-3">${items.map((i) => card(`<p class="text-[10px] font-black uppercase text-gray-400">${esc(i.category)}</p><p class="font-bold text-sm">${esc(i.name)}</p><p class="text-indigo-600 font-black">${inr(i.price)}</p><button class="mt-2 text-xs font-bold px-3 py-1.5 rounded-lg bg-indigo-600 text-white" onclick="buyItem(${i.id})">Buy with wallet</button>`)).join('')}</div>`;
};
window.buyItem = (id) => act(async () => { const r = await api('/store/buy', { body: { id } }); await L.finance(); return r; });
window.submitWalletTopup = () => act(async () => { const r = await api('/wallet/topup', { body: { amount: val('topupAmount') } }); closeModal('topupModal'); await L.finance(); return r; });
L.parking = async () => {
  const d = await api('/parking');
  sel('parkingSlotsGrid').innerHTML = `<div class="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">${d.slots.map((s) => `<div class="rounded-xl p-3 text-center text-xs font-black ${s.taken ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}">${esc(s.slot)}<br><span class="font-medium">${esc(s.type)}</span><br>${s.taken ? 'Taken' : 'Free'}</div>`).join('')}</div>`
    + (d.vehicles.length ? `<h4 class="font-bold text-sm mb-2">My vehicles</h4>` + d.vehicles.map((v) => `<p class="text-sm">${esc(v.number)} · ${esc(v.type)}</p>`).join('') : '');
};
window.registerVehicle = () => act(async () => { const r = await api('/parking/vehicle', { body: { plate_number: val('vehicleNumber'), vehicle_type: val('vehicleType') } }); closeModal('registerVehicleModal'); if (window.loadParkingOverview) await window.loadParkingOverview(); return { message: 'Vehicle registered successfully.' }; });
L.streaming = async () => {
  const e = await api('/live');
  sel('liveEventsGrid').innerHTML = `<div class="grid grid-cols-1 md:grid-cols-3 gap-4">${e.map((x) => card(`${pill(x.status, x.status === 'Live' ? 'red' : 'blue')}<h4 class="font-bold mt-2">${esc(x.title)}</h4><p class="text-xs text-gray-400">${fdate(x.date)}</p>`)).join('')}</div>`;
};

// ---------- health, security ----------
const hf = { healthBloodGroup: 'bloodGroup', healthAllergies: 'allergies', healthHistory: 'history', healthEmergencyName: 'emergencyName', healthEmergencyPhone: 'emergencyPhone' };
L.health = async () => { const h = await api('/health'); for (const [id, k] of Object.entries(hf)) sel(id).value = h[k] || ''; };
window.saveHealthRecords = () => act(() => api('/health', { body: Object.fromEntries(Object.entries(hf).map(([id, k]) => [k, val(id)])) }));
window.loadLoginHistory = L.security = async () => {
  const l = await api('/auth/logins');
  sel('loginHistoryTable').innerHTML = l.map((x) => `<tr class="border-b"><td class="p-3 text-xs">${esc(x.device)}</td><td class="p-3">${esc(x.ip)}</td><td class="p-3">${esc(x.created_at)}</td><td class="p-3">${pill(x.status, statusTone(x.status))}</td></tr>`).join('');
};

// ---------- certificates, revaluation, hall ticket ----------
L.certificates = async () => { await Promise.all([loadCertRequests(), loadHallTicket()]); };
async function loadCertRequests() {
  const d = await api('/certificates');
  window._certs = d.requests;
  sel('certRequestsList').innerHTML = d.requests.map((r, i) => `<div class="flex items-center justify-between border rounded-xl p-3 mb-2 text-sm"><div><b>${esc(r.label)}</b><p class="text-xs text-gray-400">${esc(r.ref)} · ${fdate(r.date)}</p></div><div class="flex items-center gap-2">${pill(r.status, statusTone(r.status))}${r.status === 'Issued' ? `<button class="text-indigo-600 font-bold text-xs" onclick="downloadCert(${i})"><i class="fas fa-download"></i></button>` : ''}</div></div>`).join('') || empty('No requests yet.');
}
window.requestCertificate = () => act(async () => { const r = await api('/certificates/request', { body: { type: val('certDocType'), details: val('certDetails') } }); await loadCertRequests(); return r; });
window.requestRevaluation = () => act(() => api('/revaluation', { body: { subject: val('rvSubject'), exam: val('rvExam'), reason: val('rvReason') } }));
window.downloadCert = async (i) => {
  const r = window._certs[i], me = await api('/auth/me');
  if (r.type === 'id_card') {
    let qr = ''; try { const q = qrcode(0, 'M'); q.addData(`SMARTCAMPUS|${me.roll_no}|${me.name}|${r.ref}`); q.make(); qr = q.createSvgTag(4); } catch { /* ignore */ }
    return printHtml('ID Card', `<div style="width:340px;border:2px solid #4f46e5;border-radius:16px;padding:20px;text-align:center"><h3 style="color:#4f46e5;margin:0">Smart Campus AI</h3><p style="font-size:12px;color:#666">STUDENT ID CARD</p><div style="margin:12px auto;width:110px">${qr}</div><h2 style="margin:4px">${esc(me.name)}</h2><p>${esc(me.roll_no)}<br>${esc(me.dept)}<br>Semester ${me.semester}</p></div>`);
  }
  printHtml(r.label, `<h2 style="text-align:center;color:#4f46e5">Smart Campus AI</h2><h3 style="text-align:center">${esc(r.label.toUpperCase())}</h3><p style="margin-top:32px;line-height:2">This is to certify that <b>${esc(me.name)}</b> (Roll No. <b>${esc(me.roll_no)}</b>) is a bonafide student of the <b>${esc(me.dept)}</b> department, currently in semester ${me.semester}. This certificate is issued for: ${esc(r.details || 'general purpose')}.</p><p style="margin-top:48px">Ref: ${esc(r.ref)} · Date: ${fdate(r.date)}<br><i>System-generated and digitally issued.</i></p>`);
};
window.loadHallTicket = async () => {
  const h = await api('/hall-ticket');
  sel('hallTicketBox').innerHTML = `<div class="flex justify-between items-start mb-3"><div><h4 class="font-extrabold">${esc(h.student.name)}</h4><p class="text-xs text-gray-500">${esc(h.student.roll_no)} · ${esc(h.student.dept)}</p></div>${pill(h.eligible ? 'Eligible' : 'Shortage', h.eligible ? 'green' : 'red')}</div>
    <table class="w-full text-xs"><thead><tr class="text-left text-gray-400"><th class="p-1">Subject</th><th>Date</th><th>Time</th><th>Room</th></tr></thead><tbody>${h.exams.map((e) => `<tr class="border-t"><td class="p-1 font-bold">${esc(e.subject)}</td><td>${fdate(e.date)}</td><td>${esc(e.time)}</td><td>${esc(e.room)}</td></tr>`).join('')}</tbody></table>
    <p class="text-xs mt-3 ${h.eligible ? 'text-emerald-600' : 'text-rose-600'}">${esc(h.note)}</p>${h.eligible ? '<button class="mt-3 text-xs font-bold px-3 py-2 rounded-lg bg-indigo-600 text-white" onclick="printHtml(\'Hall Ticket\', sel(\'hallTicketBox\').innerHTML)"><i class="fas fa-print mr-1"></i>Print hall ticket</button>' : ''}`;
};

// ---------- projects ----------
let projId = null;
L.projects = async () => {
  const d = await api('/projects');
  sel('newProjectGuide').innerHTML = '<option value="">Request a faculty guide (optional)</option>' + d.guides.map((g) => `<option>${esc(g)}</option>`).join('');
  sel('projectsList').innerHTML = d.projects.map((p) => card(`<div class="flex justify-between gap-2"><h4 class="font-bold">${esc(p.title)}</h4>${pill(p.status, statusTone(p.status === 'Active' ? 'pending' : 'paid'))}</div><p class="text-sm text-gray-500 mt-1">${esc(p.desc)}</p><p class="text-xs text-gray-400 mt-2">Guide: ${esc(p.guide)}</p><div class="h-2 bg-gray-100 rounded-full mt-3"><div class="h-full bg-indigo-500 rounded-full" style="width:${p.progress}%"></div></div><p class="text-[11px] font-bold mt-1">${p.progress}% complete</p>`, 'mb-3 cursor-pointer hover:border-indigo-400" onclick="openProject(' + p.id + ')')).join('') || empty('No projects yet. Create your first one.');
};
window.toggleNewProjectForm = () => sel('newProjectForm').classList.toggle('hidden');
window.createProject = () => act(async () => { const r = await api('/projects', { body: { title: val('newProjectTitle'), desc: val('newProjectDesc'), guide: val('newProjectGuide') } }); sel('newProjectTitle').value = sel('newProjectDesc').value = ''; toggleNewProjectForm(); await L.projects(); return { message: 'Project created.' }; });
window.openProject = async (id) => {
  projId = id; const d = await api('/projects/' + id), p = d.project;
  sel('projectsList').classList.add('hidden'); sel('projectsDetail').classList.remove('hidden');
  sel('projectDetailMain').innerHTML = `<h3 class="text-xl font-extrabold">${esc(p.title)}</h3><p class="text-sm text-gray-500 mt-1">${esc(p.desc)}</p><p class="text-xs mt-2">Guide: <b>${esc(p.guide)}</b> · ${pill(p.status, 'blue')}</p><div class="h-2 bg-gray-100 rounded-full mt-3"><div class="h-full bg-indigo-500 rounded-full" style="width:${p.progress}%"></div></div><p class="text-xs font-bold mt-1">${p.progress}% complete</p>`;
  sel('projectMilestones').innerHTML = d.milestones.map((m) => `<label class="flex items-center gap-3 text-sm py-2 border-b cursor-pointer"><input type="checkbox" ${m.done ? 'checked' : ''} onchange="toggleMilestone(${m.id})"><span class="${m.done ? 'line-through text-gray-400' : ''}">${esc(m.title)}</span><span class="ml-auto text-xs text-gray-400">${fdate(m.due)}</span></label>`).join('') || empty('No milestones yet.');
  sel('projectUpdates').innerHTML = d.updates.map((u) => `<div class="text-sm py-2 border-b"><b>${u.value}%</b> · ${esc(u.note)}<br><span class="text-xs text-gray-400">${fdate(u.created_at)}</span></div>`).join('') || empty('No updates yet.');
  sel('projectDiscussion').innerHTML = d.discussion.map((m) => `<div class="text-sm py-1"><b>${esc(m.author)}:</b> ${esc(m.message)}</div>`).join('') || empty('No messages yet.');
};
window.closeProjectDetail = () => { sel('projectsDetail').classList.add('hidden'); sel('projectsList').classList.remove('hidden'); L.projects(); };
window.toggleMilestoneForm = () => sel('milestoneForm').classList.toggle('hidden');
window.toggleMilestone = (mid) => act(() => api(`/projects/${projId}/milestones/${mid}/toggle`, { method: 'POST' }), false).then(() => openProject(projId));
window.addMilestoneFromDetail = () => act(async () => { await api(`/projects/${projId}/milestones`, { body: { title: val('newMilestoneTitle'), due: val('newMilestoneDue') } }); sel('newMilestoneTitle').value = ''; toggleMilestoneForm(); await openProject(projId); return { message: 'Milestone added.' }; });
window.postProgressFromDetail = () => act(async () => { await api(`/projects/${projId}/updates`, { body: { value: val('detailProgressValue'), note: val('detailProgressNote') } }); sel('detailProgressNote').value = ''; await openProject(projId); return { message: 'Progress posted. +10 XP' }; });
window.postDiscussionFromDetail = () => act(async () => { await api(`/projects/${projId}/discussion`, { body: { message: val('discussionMessage') } }); sel('discussionMessage').value = ''; await openProject(projId); return false; }, false);

// ---------- study materials (stream > department > subject > material) ----------
const streams = { engineering: ['Computer Science & Engineering', 'Electronics & Communication', 'Mechanical Engineering', 'Civil Engineering'], medical: ['MBBS', 'Nursing', 'Pharmacy'], commerce: ['B.Com', 'BBA', 'MBA'] };
let learnState = { level: 0 };
const learnShow = (lv) => { learnState.level = lv; ['deptContainer', 'subjectContainer', 'materialContainer'].forEach((id, i) => sel(id).classList.toggle('hidden', i !== lv - 1)); sel('streamGrid').classList.toggle('hidden', lv > 0); sel('learningBackBtn').classList.toggle('hidden', lv === 0); };
L.learning = () => { if (window.loadStudyMaterials) return window.loadStudyMaterials(); };
window.filterDepartments = (s) => { sel('currentStreamTitle').textContent = s[0].toUpperCase() + s.slice(1); sel('deptGrid').innerHTML = `<div class="grid grid-cols-1 md:grid-cols-3 gap-4">${streams[s].map((d) => card(`<b>${esc(d)}</b>`, 'cursor-pointer hover:border-indigo-400" onclick="loadDeptSubjects(\'' + esc(d) + '\')')).join('')}</div>`; learnShow(1); };
window.loadDeptSubjects = async (dept) => {
  sel('currentDeptTitle').textContent = dept; const s = await api('/syllabus');
  const subs = dept.startsWith('Computer') ? s.semesters.flatMap((x) => x.subjects) : [];
  sel('subjectCollegeHint').textContent = subs.length ? 'Subjects from the college catalog.' : 'Catalog for this department has not been uploaded yet.';
  sel('subjectList').innerHTML = subs.map((x) => card(`<b>${esc(x.code)} · ${esc(x.name)}</b>`, 'mb-2 cursor-pointer hover:border-indigo-400" onclick="loadSubjectMaterial(\'' + esc(x.name) + '\')')).join(''); learnShow(2);
};
window.loadSubjectMaterial = async (name) => {
  sel('currentSubjectTitle').textContent = name; const f = (await api('/digital-library/files')).items.filter((x) => name.toLowerCase().split(' ').some((w) => w.length > 3 && (x.title + x.subject).toLowerCase().includes(w)));
  sel('materialGrid').innerHTML = f.length ? f.map((x) => card(`<b>${esc(x.title)}</b><p class="text-xs text-gray-500">${esc(x.description)}</p><button class="mt-2 text-xs font-bold text-indigo-600" onclick="openDigitalStudyPdf(${x.id},'view')">Open PDF</button>`, 'mb-2')).join('') : empty('No material uploaded for this subject yet.'); learnShow(3);
};
window.learningGoBack = () => learnShow(Math.max(0, learnState.level - 1));

// ---------- automation centre ----------
const jobInfo = { attendanceGuardian: ['fa-user-clock', 'Warns students below the 75% rule'], feeReminder: ['fa-indian-rupee-sign', 'Sends fee-due reminders'], examCountdown: ['fa-hourglass-half', 'Exam countdown alerts'], riskScan: ['fa-triangle-exclamation', 'Flags backlog-risk students for mentoring'], ticketTriage: ['fa-route', 'Classifies and routes helpdesk tickets'], noticeDigest: ['fa-wand-magic-sparkles', 'Summarises notices with AI'], leaveAutoReview: ['fa-file-signature', 'Auto-decides leave requests'], wellnessWatch: ['fa-heart-pulse', 'Detects sustained stress or low sleep'], deadlineNudge: ['fa-flag-checkered', 'Project milestone reminders'], xpRewards: ['fa-trophy', 'Rewards attendance streaks'] };
window.loadAutomation = L.automation = async () => {
  const d = await api('/automation/log');
  const b = sel('aiEngineBadge'); b.textContent = d.llm ? 'Engine: Gemini + analytics' : 'Engine: offline analytics'; b.className = 'text-xs font-bold px-3 py-1.5 rounded-full ' + (d.llm ? tone.green : tone.amber);
  sel('automationJobs').innerHTML = d.jobs.map((j) => `<div class="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50"><i class="fas ${jobInfo[j]?.[0] || 'fa-gear'} text-indigo-500 w-5"></i><div class="flex-1"><p class="font-bold text-xs">${j}</p><p class="text-[11px] text-gray-400">${esc(jobInfo[j]?.[1] || '')}</p></div><button class="text-[11px] font-bold text-indigo-600" onclick="runAutomation('${j}')">Run</button></div>`).join('');
  sel('automationLog').innerHTML = d.log.map((l) => `<div class="p-3 text-sm flex gap-3"><span class="text-[10px] font-black text-indigo-600 w-32 shrink-0">${esc(l.job)}</span><span class="flex-1 ${/ERROR/.test(l.detail) ? 'text-rose-600' : ''}">${esc(l.detail)}</span><span class="text-[10px] text-gray-400">${esc(l.created_at)}</span></div>`).join('') || empty('No runs yet.');
};
window.runAutomation = (job) => act(async () => { const r = await api('/automation/run', { body: job ? { job } : {} }); await L.automation(); return { message: `Ran ${r.results.length} job(s).` }; });
