/**
 * Smart Campus AI - Timetable & Schedule Module
 * Displays weekly schedules, periods, room assignments, and professor details.
 */

(function (window) {
  'use strict';

  async function renderTimetable() {
    const container = document.getElementById('timetableGrid') || document.getElementById('timetableSlots');
    if (!container) return;

    if (window.skeleton) {
      container.innerHTML = window.skeleton.table(4, 5);
    }

    try {
      const snap = window.api ? await window.api('/dashboard') : null;
      const sem = snap?.user?.semester || 4;
      const subs = snap?.subjects || [];

      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      const times = [
        { slot: '09:00 - 10:30', room: sem <= 2 ? 'Hall 101' : 'Hall 201' },
        { slot: '10:45 - 12:15', room: sem <= 2 ? 'Hall 102' : 'Hall 202' },
        { slot: '01:30 - 03:00', room: sem <= 2 ? 'Computing Lab 1' : 'Networks Lab' },
        { slot: '03:15 - 04:45', room: sem <= 2 ? 'Physics Lab' : 'Systems Lab' }
      ];

      container.innerHTML = `
        <div class="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <table class="w-full text-left text-xs" role="table" aria-label="Semester Timetable">
            <thead class="bg-slate-50 dark:bg-slate-800/80 text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th class="p-3.5">Time Slot</th>
                ${days.map(d => `<th class="p-3.5">${d}</th>`).join('')}
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              ${times.map((t, idx) => `
                <tr>
                  <td class="p-3.5 font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap bg-slate-50/50 dark:bg-slate-800/30">
                    <i class="fas fa-clock text-indigo-500 mr-1 text-[10px]"></i> ${t.slot}
                  </td>
                  ${days.map((d, dIdx) => {
                    const sub = subs[(idx + dIdx) % (subs.length || 1)] || { name: 'Elective Lecture', code: 'CS301' };
                    return `
                      <td class="p-3.5">
                        <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 hover:border-indigo-400 transition">
                          <span class="text-[9px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">${sub.code || 'CS301'}</span>
                          <h5 class="font-bold text-slate-800 dark:text-white truncate">${escapeHtml(sub.name)}</h5>
                          <span class="text-[10px] text-slate-400"><i class="fas fa-location-dot mr-1"></i> ${t.room}</span>
                        </div>
                      </td>
                    `;
                  }).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } catch (err) {
      console.warn('[timetable] Failed to render timetable:', err);
    }
  }

  function escapeHtml(s) {
    return window.escapeHtml ? window.escapeHtml(s) : String(s || '');
  }

  window.module_timetable = {
    render: renderTimetable
  };

  if (window.loaders) {
    const orig = window.loaders.timetable;
    window.loaders.timetable = async function () {
      if (typeof orig === 'function') await orig();
      await renderTimetable();
    };
  }
})(window);

