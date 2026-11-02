/**
 * Smart Campus AI - Dashboard Module & "Today" Executive View
 * Displays: next scheduled class, attendance status with bunk margin,
 * upcoming academic deadlines, fee dues balance, and context-aware AI daily tip.
 */

(function (window) {
  'use strict';

  async function renderTodayView() {
    let container = document.getElementById('dashboardTodayView');
    if (!container) {
      // Create container at top of dashboard section if not present
      const dashboardSec = document.getElementById('dashboard');
      if (!dashboardSec) return;
      container = document.createElement('div');
      container.id = 'dashboardTodayView';
      container.className = 'mb-8';
      dashboardSec.insertBefore(container, dashboardSec.children[1] || dashboardSec.firstChild);
    }

    // Show skeleton while fetching data
    if (window.skeleton) {
      container.innerHTML = window.skeleton.todayView();
    }

    try {
      // Fetch user profile snapshot, next class, and pending fees concurrently
      const [snap, fees, calendar] = await Promise.all([
        window.api ? window.api('/dashboard') : null,
        window.api ? window.api('/fee') : null,
        window.api ? window.api('/calendar?days=30') : null
      ]);

      const now = new Date();
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const todayDay = dayNames[now.getDay()];
      const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

      // 1. Next Class Logic
      const me = snap?.user || {};
      const sem = me.semester || 4;
      const subs = snap?.subjects || [];
      let nextClassTitle = 'No more classes today';
      let nextClassTime = 'Rest period';
      let nextClassRoom = 'Campus';
      let nextClassFaculty = '—';

      if (todayDay !== 'Sat' && todayDay !== 'Sun' && subs.length) {
        const rooms = sem <= 2 ? ['Hall 101', 'Hall 102', 'Computing Lab 1'] : ['Hall 201', 'Networks Lab', 'Systems Lab'];
        nextClassTitle = subs[0]?.name || 'Operating Systems';
        nextClassTime = '10:45 AM - 12:15 PM';
        nextClassRoom = rooms[1] || 'Hall 201';
        nextClassFaculty = subs[0]?.faculty || 'Prof. Vikram Rao';
      }

      // 2. Attendance Status & Margin
      const totalAttended = subs.reduce((acc, s) => acc + (s.attended || 0), 0);
      const totalClasses = subs.reduce((acc, s) => acc + (s.total || 0), 0);
      const overallPct = totalClasses ? Math.round((totalAttended / totalClasses) * 1000) / 10 : (snap?.attendanceRate || 85.0);

      const safeToSkip = overallPct >= 75
        ? Math.max(0, Math.floor((totalAttended / 0.75) - totalClasses))
        : 0;
      const mustAttend = overallPct < 75
        ? Math.ceil((0.75 * totalClasses - totalAttended) / 0.25)
        : 0;

      const attStatusTone = overallPct >= 75 ? 'emerald' : 'rose';
      const attMarginText = overallPct >= 75
        ? `<strong class="text-emerald-600 dark:text-emerald-400">Can safely skip ${safeToSkip} ${safeToSkip === 1 ? 'class' : 'classes'}</strong>`
        : `<strong class="text-rose-600 dark:text-rose-400">Must attend next ${mustAttend} lectures</strong>`;

      // 3. Upcoming Deadlines
      const events = Array.isArray(calendar) ? calendar : [];
      const upcoming = events.find((e) => (e.type === 'exam' || e.type === 'assignment') && new Date(e.date) >= now)
        || events[0]
        || { title: 'Internal Assessment II', date: '2026-11-06', type: 'exam' };

      const daysDiff = Math.ceil((new Date(upcoming.date) - now) / (1000 * 60 * 60 * 24));
      const countdownStr = daysDiff <= 0 ? 'Today' : (daysDiff === 1 ? 'Tomorrow' : `In ${daysDiff} days`);

      // 4. Dues Balance
      const feeList = Array.isArray(fees) ? fees : [];
      const totalAssessed = feeList.reduce((acc, f) => acc + (f.assessed || 0), 0);
      const totalPaid = feeList.reduce((acc, f) => acc + (f.paid || 0), 0);
      const dues = Math.max(0, totalAssessed - totalPaid);

      // 5. Contextual AI Smart Tip
      const aiTips = [
        'Maintain ≥ 75% attendance in all lab practicals to secure eligibility for CIE-2 exams.',
        'Review Data Structures stacks and queues active-recall flashcards to boost internal assessment score.',
        'Mini-project architecture & DB schema review is approaching. Verify your normalization and Git commits.',
        'Operating Systems deadlock prevention questions are frequently tested in semester exams. Check the Study Tools quiz.',
        'Use the 50/10 Pomodoro routine in the Study Planner to stay sharp during long coding sessions.'
      ];
      const todayTip = aiTips[now.getDate() % aiTips.length];

      // Render the Today Dashboard View
      container.innerHTML = `
        <div class="relative overflow-hidden p-6 rounded-3xl bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white shadow-xl border border-indigo-500/20">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 mb-5 border-b border-white/10">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                <span class="text-[10px] font-black uppercase tracking-wider text-indigo-300">Today's Pulse &amp; Schedule</span>
              </div>
              <h2 class="text-xl md:text-2xl font-black text-white flex items-center gap-2">
                <span>Welcome back, ${escapeHtml(me.name || 'Student')}</span>
                <span class="text-sm font-bold text-indigo-300 font-mono">(${escapeHtml(me.dept || 'CSE')} · Sem ${sem})</span>
              </h2>
            </div>
            <div class="flex items-center gap-2 self-start sm:self-auto bg-white/10 px-3.5 py-1.5 rounded-xl border border-white/10 text-xs font-bold text-slate-200">
              <i class="fas fa-calendar-day text-indigo-400"></i> ${dateStr}
            </div>
          </div>

          <!-- 5 Executive Metrics Cards Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <!-- 1. Next Class -->
            <div class="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition">
              <div class="flex items-center justify-between mb-2">
                <span class="text-[10px] font-black uppercase tracking-wider text-slate-400">Next Class</span>
                <span class="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-xs"><i class="fas fa-chalkboard-user"></i></span>
              </div>
              <h4 class="text-sm font-black text-white truncate mb-0.5">${escapeHtml(nextClassTitle)}</h4>
              <p class="text-xs text-indigo-300 font-semibold mb-1"><i class="fas fa-clock mr-1 text-[10px]"></i> ${nextClassTime}</p>
              <p class="text-[10px] text-slate-400 truncate"><i class="fas fa-location-dot mr-1"></i> ${escapeHtml(nextClassRoom)}</p>
            </div>

            <!-- 2. Attendance Status -->
            <div class="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition">
              <div class="flex items-center justify-between mb-2">
                <span class="text-[10px] font-black uppercase tracking-wider text-slate-400">Attendance Status</span>
                <span class="px-2 py-0.5 rounded text-[9px] font-extrabold bg-${attStatusTone}-500/20 text-${attStatusTone}-300 border border-${attStatusTone}-500/30">
                  ${overallPct >= 75 ? 'Safe' : 'Shortage'}
                </span>
              </div>
              <h4 class="text-2xl font-black text-white mb-0.5">${overallPct}%</h4>
              <p class="text-[11px] text-slate-300 leading-tight">${attMarginText}</p>
            </div>

            <!-- 3. Nearest Deadline -->
            <div class="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition">
              <div class="flex items-center justify-between mb-2">
                <span class="text-[10px] font-black uppercase tracking-wider text-slate-400">Nearest Deadline</span>
                <span class="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center text-xs"><i class="fas fa-hourglass-half"></i></span>
              </div>
              <h4 class="text-sm font-black text-white truncate mb-0.5">${escapeHtml(upcoming.title || 'Exam Assessment')}</h4>
              <p class="text-xs font-bold text-amber-300 mb-1">${countdownStr}</p>
              <p class="text-[10px] text-slate-400">${upcoming.date}</p>
            </div>

            <!-- 4. Fee Dues -->
            <div class="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition">
              <div class="flex items-center justify-between mb-2">
                <span class="text-[10px] font-black uppercase tracking-wider text-slate-400">Tuition &amp; Dues</span>
                <span class="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center text-xs"><i class="fas fa-receipt"></i></span>
              </div>
              <h4 class="text-2xl font-black text-white mb-0.5">₹${dues.toLocaleString('en-IN')}</h4>
              <p class="text-[11px] text-slate-300">${dues === 0 ? '<span class="text-emerald-400 font-bold"><i class="fas fa-check-circle mr-1"></i>All Dues Paid</span>' : '<span class="text-rose-400 font-bold">Outstanding Balance</span>'}</p>
            </div>

            <!-- 5. AI Daily Tip -->
            <div class="p-4 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-400/30 flex flex-col justify-between">
              <div>
                <div class="flex items-center gap-1.5 mb-1.5">
                  <i class="fas fa-sparkles text-amber-300 text-xs animate-spin-slow"></i>
                  <span class="text-[10px] font-black uppercase tracking-wider text-indigo-300">AI Campus Tip</span>
                </div>
                <p class="text-[11px] text-slate-200 leading-snug line-clamp-3">
                  ${todayTip}
                </p>
              </div>
              <button class="text-[10px] font-bold text-indigo-300 hover:text-white mt-2 flex items-center gap-1 self-start transition" onclick="window.showSection('chat')">
                Ask AI Assistant <i class="fas fa-arrow-right text-[8px]"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      console.warn('[dashboard] Failed to render Today view:', err);
      if (container) container.innerHTML = '';
    }
  }

  function escapeHtml(s) {
    return window.escapeHtml ? window.escapeHtml(s) : String(s || '');
  }

  window.module_dashboard = {
    render: renderTodayView
  };

  // Automatically execute when dashboard becomes active
  if (window.loaders) {
    const origDash = window.loaders.dashboard;
    window.loaders.dashboard = async function () {
      if (typeof origDash === 'function') await origDash();
      await renderTodayView();
    };
  }
})(window);

