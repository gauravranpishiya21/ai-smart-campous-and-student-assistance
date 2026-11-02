/**
 * Smart Campus AI - Attendance Hub Module
 * Features:
 * - Real-time overall percentage calculation and 75% rule audit
 * - Skippable classes calculator and recovery requirements
 * - Subject-by-subject breakdown with progress bars
 * - Self-attendance marking and attendance calendar card
 */

(function (window) {
  'use strict';

  async function renderAttendanceHub() {
    const cardBody = document.getElementById('attendanceRuleBody');
    const badge = document.getElementById('attendanceRuleBadge');
    if (!cardBody) return;

    if (window.skeleton) {
      cardBody.innerHTML = window.skeleton.lines(3);
    }

    try {
      const snap = window.api ? await window.api('/dashboard') : null;
      if (!snap) return;

      const subs = snap.subjects || [];
      const totalAttended = subs.reduce((acc, s) => acc + (s.attended || 0), 0);
      const totalClasses = subs.reduce((acc, s) => acc + (s.total || 0), 0);
      const overallPct = totalClasses ? Math.round((totalAttended / totalClasses) * 1000) / 10 : (snap.attendanceRate || 85.0);

      // Safe to skip vs Must attend math
      const safeToSkip = overallPct >= 75
        ? Math.max(0, Math.floor((totalAttended / 0.75) - totalClasses))
        : 0;
      const mustAttend = overallPct < 75
        ? Math.ceil((0.75 * totalClasses - totalAttended) / 0.25)
        : 0;

      if (badge) {
        badge.textContent = `${overallPct}% · ${overallPct >= 75 ? 'Safe' : 'Shortage'}`;
        badge.className = `text-[10px] font-black px-2.5 py-1 rounded-full ${overallPct >= 75 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'}`;
      }

      cardBody.innerHTML = `
        <div class="space-y-3">
          <div class="flex items-center justify-between text-xs font-bold">
            <span class="text-slate-500 dark:text-slate-400">Total Lectures Attended:</span>
            <span class="text-slate-800 dark:text-white">${totalAttended} / ${totalClasses}</span>
          </div>
          <div class="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
            <div class="h-full rounded-full transition-all duration-500 ${overallPct >= 75 ? 'bg-emerald-500' : 'bg-rose-500'}" style="width: ${Math.min(100, overallPct)}%"></div>
          </div>
          <div class="p-3 rounded-xl border text-xs leading-relaxed ${overallPct >= 75 ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200' : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'}">
            ${overallPct >= 75
              ? `<i class="fas fa-circle-check text-emerald-600 mr-1.5"></i> You are safely above the mandatory 75% threshold. You can miss up to <strong>${safeToSkip} ${safeToSkip === 1 ? 'class' : 'classes'}</strong> without penalty.`
              : `<i class="fas fa-triangle-exclamation text-rose-600 mr-1.5"></i> <strong>Attendance Shortage Alert:</strong> You must attend the next <strong>${mustAttend} consecutive lectures</strong> to recover eligibility.`
            }
          </div>
        </div>
      `;
    } catch (err) {
      console.warn('[attendance] Error loading attendance hub:', err);
    }
  }

  window.module_attendance = {
    render: renderAttendanceHub
  };

  if (window.loaders) {
    const orig = window.loaders['attendance-hub'];
    window.loaders['attendance-hub'] = async function () {
      if (typeof orig === 'function') await orig();
      await renderAttendanceHub();
    };
  }
})(window);

