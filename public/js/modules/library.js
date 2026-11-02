/**
 * Smart Campus AI - Digital Library Module
 */

(function (window) {
  'use strict';

  async function renderLibrary() {
    const tableBody = document.getElementById('libraryHistoryTableBody');
    if (!tableBody) return;

    try {
      const history = window.api ? await window.api('/library/history') : [];
      if (!history.length) {
        tableBody.innerHTML = '<tr><td colspan="5" class="p-6 text-center text-xs text-slate-400">No borrow history recorded.</td></tr>';
        return;
      }

      tableBody.innerHTML = history.map((b) => {
        const isOverdue = b.status === 'Borrowed' && new Date(b.due) < new Date();
        const statusLabel = isOverdue ? 'Overdue' : b.status;
        const tone = isOverdue ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' : (b.status === 'Returned' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300');

        return `
          <tr class="border-b border-slate-100 dark:border-slate-800 text-xs">
            <td class="p-3.5 font-bold text-slate-800 dark:text-white">${escapeHtml(b.title)}</td>
            <td class="p-3.5 text-slate-500 dark:text-slate-400">${b.borrowed || '—'}</td>
            <td class="p-3.5 text-slate-500 dark:text-slate-400">${b.due || '—'}</td>
            <td class="p-3.5"><span class="px-2 py-0.5 rounded text-[10px] font-bold ${tone}">${statusLabel}</span></td>
            <td class="p-3.5 text-right">
              ${b.status === 'Borrowed' ? `<button class="text-indigo-600 dark:text-indigo-400 font-bold hover:underline" onclick="window.returnBook(${b.id})">Return</button>` : '—'}
            </td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      console.warn('[library] Failed to render library:', err);
    }
  }

  function escapeHtml(s) {
    return window.escapeHtml ? window.escapeHtml(s) : String(s || '');
  }

  window.module_library = {
    render: renderLibrary
  };

  if (window.loaders) {
    const orig = window.loaders.library;
    window.loaders.library = async function () {
      if (typeof orig === 'function') await orig();
      await renderLibrary();
    };
  }
})(window);

