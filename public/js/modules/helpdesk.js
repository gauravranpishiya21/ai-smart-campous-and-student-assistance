/**
 * Smart Campus AI - AI Helpdesk & Grievance Module
 * Handles grievance submission with AI department auto-routing, SLA determination, and tickets list.
 */

(function (window) {
  'use strict';

  async function renderHelpdesk() {
    const list = document.getElementById('helpTicketsList');
    if (!list) return;

    if (window.skeleton) {
      list.innerHTML = window.skeleton.lines(3);
    }

    try {
      const tickets = window.api ? await window.api('/helpdesk') : [];
      if (!tickets.length) {
        list.innerHTML = window.emptyState ? window.emptyState('No active grievances', 'Submit a grievance ticket above and the AI desk will triage and assign an SLA.', 'fa-headset') : '<p class="p-6 text-xs text-slate-400">No tickets found.</p>';
        return;
      }

      list.innerHTML = tickets.map((t) => `
        <div class="p-4 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                ${escapeHtml(t.dept || 'General Desk')}
              </span>
              <span class="text-[9px] font-bold px-2 py-0.5 rounded ${t.priority === 'High' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}">
                ${escapeHtml(t.priority || 'Normal')}
              </span>
              <span class="text-[10px] text-slate-400 font-mono">SLA: ${escapeHtml(t.sla || '24-48 hrs')}</span>
            </div>
            <h5 class="text-xs font-bold text-slate-900 dark:text-white mb-0.5">${escapeHtml(t.title)}</h5>
            <p class="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">${escapeHtml(t.desc || '')}</p>
          </div>
          <span class="text-[10px] font-bold px-2.5 py-1 rounded-full ${t.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'}">
            ${escapeHtml(t.status || 'In Progress')}
          </span>
        </div>
      `).join('');
    } catch (err) {
      console.warn('[helpdesk] Failed to render tickets:', err);
    }
  }

  function escapeHtml(s) {
    return window.escapeHtml ? window.escapeHtml(s) : String(s || '');
  }

  window.module_helpdesk = {
    render: renderHelpdesk
  };

  if (window.loaders) {
    const orig = window.loaders.helpdesk;
    window.loaders.helpdesk = async function () {
      if (typeof orig === 'function') await orig();
      await renderHelpdesk();
    };
  }
})(window);

