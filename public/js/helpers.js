/**
 * Smart Campus AI - Shared UI Helpers
 * Provides: toast(), skeleton loaders, empty states, confirm dialog,
 * inline form validation, dark mode toggle, and safe Markdown rendering with DOMPurify.
 */

(function (window) {
  'use strict';

  // -------------------------------------------------------------------------
  // 1. Toast Notification System
  // -------------------------------------------------------------------------
  function toast(msg, type = 'info', duration = 4000) {
    let box = document.getElementById('toastBox');
    if (!box) {
      box = document.createElement('div');
      box.id = 'toastBox';
      box.setAttribute('role', 'region');
      box.setAttribute('aria-live', 'polite');
      box.setAttribute('aria-label', 'Notifications');
      box.style.cssText = 'position:fixed;right:20px;bottom:20px;z-index:9999;display:flex;flex-direction:column;gap:10px;max-width:380px;width:calc(100vw - 40px);pointer-events:none;';
      document.body.appendChild(box);
    }

    const t = document.createElement('div');
    t.className = 'toast-item pointer-events-auto flex items-start gap-3 p-4 rounded-2xl shadow-2xl border text-sm backdrop-blur transition-all duration-300';

    // Normalize type aliases
    const normType = (type === 'err' || type === 'danger') ? 'error'
      : (type === 'ok') ? 'success'
      : (type === 'warn') ? 'warning'
      : type;

    let icon = 'fa-circle-info';
    let styleClasses = 'bg-white/95 dark:bg-slate-900/95 border-indigo-200 dark:border-indigo-900/50 text-slate-800 dark:text-white';
    let iconClass = 'text-indigo-600 dark:text-indigo-400';

    if (normType === 'success') {
      icon = 'fa-circle-check';
      styleClasses = 'bg-emerald-50/95 dark:bg-emerald-950/95 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-100';
      iconClass = 'text-emerald-600 dark:text-emerald-400';
    } else if (normType === 'error') {
      icon = 'fa-circle-exclamation';
      styleClasses = 'bg-rose-50/95 dark:bg-rose-950/95 border-rose-300 dark:border-rose-800 text-rose-950 dark:text-rose-100';
      iconClass = 'text-rose-600 dark:text-rose-400';
      t.setAttribute('role', 'alert');
    } else if (normType === 'warning') {
      icon = 'fa-triangle-exclamation';
      styleClasses = 'bg-amber-50/95 dark:bg-amber-950/95 border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-100';
      iconClass = 'text-amber-600 dark:text-amber-400';
    }

    t.className += ' ' + styleClasses;
    t.innerHTML = `
      <i class="fas ${icon} ${iconClass} text-lg shrink-0 mt-0.5"></i>
      <div class="flex-1 min-w-0 pr-1 leading-snug font-semibold text-xs md:text-sm">
        ${escapeHtml(msg)}
      </div>
      <button class="shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 -mr-1 -mt-1 rounded-lg transition" aria-label="Dismiss notification" onclick="this.parentElement.remove()">
        <i class="fas fa-xmark text-xs"></i>
      </button>
    `;

    box.appendChild(t);

    const timer = setTimeout(() => {
      t.classList.add('leaving');
      setTimeout(() => t.remove(), 260);
    }, duration);

    t.addEventListener('mouseenter', () => clearTimeout(timer));
  }

  // -------------------------------------------------------------------------
  // 2. Skeleton Loaders (No Screen Is Ever Blank)
  // -------------------------------------------------------------------------
  const skeleton = {
    lines(count = 3) {
      let html = '<div class="space-y-3 py-2" role="status" aria-label="Loading content">';
      for (let i = 0; i < count; i++) {
        const w = i === 0 ? 'w-3/4' : (i === count - 1 ? 'w-1/2' : 'w-full');
        html += `<div class="skeleton-shimmer h-4 ${w} rounded-lg"></div>`;
      }
      return html + '</div>';
    },

    card(height = 'h-32') {
      return `
        <div class="skeleton-shimmer p-6 rounded-2xl ${height} w-full flex flex-col justify-between" role="status" aria-label="Loading card">
          <div class="skeleton-shimmer h-4 w-1/3 rounded"></div>
          <div class="skeleton-shimmer h-8 w-2/3 rounded-lg"></div>
          <div class="skeleton-shimmer h-3 w-1/2 rounded"></div>
        </div>
      `;
    },

    table(rows = 4, cols = 4) {
      let html = '<div class="w-full border rounded-2xl overflow-hidden divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900" role="status" aria-label="Loading table">';
      html += '<div class="p-4 bg-slate-50 dark:bg-slate-800/60 flex gap-4">';
      for (let c = 0; c < cols; c++) {
        html += `<div class="skeleton-shimmer h-4 flex-1 rounded"></div>`;
      }
      html += '</div>';
      for (let r = 0; r < rows; r++) {
        html += '<div class="p-4 flex gap-4 items-center">';
        for (let c = 0; c < cols; c++) {
          html += `<div class="skeleton-shimmer h-4 flex-1 rounded"></div>`;
        }
        html += '</div>';
      }
      return html + '</div>';
    },

    todayView() {
      return `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8" role="status" aria-label="Loading today summary">
          ${[1, 2, 3, 4, 5].map(() => `
            <div class="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
              <div class="skeleton-shimmer h-3 w-1/2 rounded"></div>
              <div class="skeleton-shimmer h-7 w-3/4 rounded-lg"></div>
              <div class="skeleton-shimmer h-3 w-5/6 rounded"></div>
            </div>
          `).join('')}
        </div>
      `;
    },

    inject(target, type = 'card', count = 1) {
      const el = typeof target === 'string' ? document.getElementById(target) : target;
      if (!el) return;
      if (type === 'lines') el.innerHTML = skeleton.lines(count);
      else if (type === 'table') el.innerHTML = skeleton.table(count, 4);
      else if (type === 'today') el.innerHTML = skeleton.todayView();
      else el.innerHTML = Array.from({ length: count }, () => skeleton.card()).join('');
    }
  };

  // -------------------------------------------------------------------------
  // 3. Accessible Empty States
  // -------------------------------------------------------------------------
  function emptyState(title, subtitle = '', icon = 'fa-folder-open', actionHtml = '') {
    return `
      <div class="empty-state-card p-8 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 text-center my-4">
        <div class="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/80 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3 text-xl shadow-inner">
          <i class="fas ${icon}"></i>
        </div>
        <h4 class="text-sm font-bold text-slate-800 dark:text-white mb-1">${escapeHtml(title)}</h4>
        ${subtitle ? `<p class="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed mb-3">${escapeHtml(subtitle)}</p>` : ''}
        ${actionHtml ? `<div class="mt-2">${actionHtml}</div>` : ''}
      </div>
    `;
  }

  // -------------------------------------------------------------------------
  // 4. Accessible Confirm Dialog (Promise-based)
  // -------------------------------------------------------------------------
  function confirmDialog({
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    dangerous = false
  } = {}) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'fixed inset-0 z-[10000] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 fade-in';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-labelledby', 'confirmDialogTitle');

      const btnConfirmCls = dangerous
        ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30';

      overlay.innerHTML = `
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 max-w-md w-full scale-100 transition-transform">
          <div class="flex items-center gap-3 mb-3">
            <span class="w-10 h-10 rounded-xl ${dangerous ? 'bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400' : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400'} flex items-center justify-center text-lg shrink-0">
              <i class="fas ${dangerous ? 'fa-triangle-exclamation' : 'fa-circle-question'}"></i>
            </span>
            <h3 id="confirmDialogTitle" class="text-base font-bold text-slate-900 dark:text-white">${escapeHtml(title)}</h3>
          </div>
          <p class="text-xs md:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
            ${escapeHtml(message)}
          </p>
          <div class="flex items-center justify-end gap-3">
            <button id="dialogBtnCancel" class="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition">
              ${escapeHtml(cancelText)}
            </button>
            <button id="dialogBtnConfirm" class="px-4 py-2 rounded-xl text-xs font-bold shadow-lg transition ${btnConfirmCls}">
              ${escapeHtml(confirmText)}
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      const btnConfirm = overlay.querySelector('#dialogBtnConfirm');
      const btnCancel = overlay.querySelector('#dialogBtnCancel');

      btnConfirm.focus();

      function close(result) {
        document.removeEventListener('keydown', handleKey);
        overlay.classList.add('opacity-0');
        setTimeout(() => overlay.remove(), 150);
        resolve(result);
      }

      function handleKey(e) {
        if (e.key === 'Escape') close(false);
      }

      document.addEventListener('keydown', handleKey);
      btnConfirm.addEventListener('click', () => close(true));
      btnCancel.addEventListener('click', () => close(false));
    });
  }

  // -------------------------------------------------------------------------
  // 5. Inline Form Validation Engine
  // -------------------------------------------------------------------------
  function attachInlineValidation(containerOrForm) {
    const root = typeof containerOrForm === 'string' ? document.getElementById(containerOrForm) : (containerOrForm || document);
    if (!root) return;

    const inputs = root.querySelectorAll('input, select, textarea');
    inputs.forEach((input) => {
      if (input.dataset.validationAttached === '1') return;
      input.dataset.validationAttached = '1';

      input.addEventListener('blur', () => validateField(input));
      input.addEventListener('input', () => {
        if (input.getAttribute('aria-invalid') === 'true') {
          validateField(input);
        }
      });
    });
  }

  function validateField(input) {
    if (!input) return true;
    const value = (input.value || '').trim();
    let error = null;

    // Required check
    if (input.hasAttribute('required') && !value) {
      error = (input.dataset.label || input.placeholder || 'This field') + ' is required.';
    }
    // Email check
    else if (input.type === 'email' && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) error = 'Please enter a valid email address.';
    }
    // Number range check
    else if (input.type === 'number' && value) {
      const num = Number(value);
      if (input.min && num < Number(input.min)) error = `Minimum value is ${input.min}.`;
      if (input.max && num > Number(input.max)) error = `Maximum value is ${input.max}.`;
    }
    // Minlength check
    else if (input.minLength > 0 && value.length < input.minLength) {
      error = `Must be at least ${input.minLength} characters.`;
    }

    // Render or clear error message below field
    let errEl = input.parentElement?.querySelector('.field-inline-error');
    if (error) {
      input.setAttribute('aria-invalid', 'true');
      input.classList.add('border-rose-500', 'focus:ring-rose-500');
      if (!errEl) {
        errEl = document.createElement('p');
        errEl.className = 'field-inline-error text-[11px] font-bold text-rose-500 mt-1 flex items-center gap-1';
        errEl.setAttribute('role', 'alert');
        input.parentElement?.appendChild(errEl);
      }
      errEl.innerHTML = `<i class="fas fa-circle-exclamation text-[10px]"></i> ${escapeHtml(error)}`;
      return false;
    } else {
      input.removeAttribute('aria-invalid');
      input.classList.remove('border-rose-500', 'focus:ring-rose-500');
      if (errEl) errEl.remove();
      return true;
    }
  }

  // -------------------------------------------------------------------------
  // 6. Theme & Dark Mode Controller
  // -------------------------------------------------------------------------
  function initTheme() {
    const saved = localStorage.getItem('campus_theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = saved ? saved === 'dark' : prefersDark;

    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    }
    updateThemeIcons(isDark);
  }

  function toggleDarkMode() {
    const isDark = document.documentElement.classList.toggle('dark');
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('campus_theme', isDark ? 'dark' : 'light');
    updateThemeIcons(isDark);
    toast(isDark ? 'Dark mode enabled' : 'Light mode enabled', 'info', 2000);
  }

  function updateThemeIcons(isDark) {
    document.querySelectorAll('.theme-toggle-icon').forEach((icon) => {
      if (isDark) {
        icon.className = 'fas fa-sun text-amber-400 theme-toggle-icon';
      } else {
        icon.className = 'fas fa-moon text-indigo-600 theme-toggle-icon';
      }
    });
  }

  // -------------------------------------------------------------------------
  // 7. Markdown Sanitizer & Renderer (with DOMPurify)
  // -------------------------------------------------------------------------
  function renderMarkdown(raw) {
    if (!raw) return '';
    let text = String(raw);

    // Code blocks
    text = text.replace(/```([a-z0-9]*)\n([\s\S]*?)```/gi, (match, lang, code) => {
      return `<pre class="p-3 my-2 bg-slate-950 text-slate-100 rounded-xl overflow-x-auto text-xs font-mono"><code>${escapeHtml(code.trim())}</code></pre>`;
    });

    // Inline code
    text = text.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-mono text-xs">$1</code>');

    // Bold & italic
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*([^\*]+)\*/g, '<em>$1</em>');

    // Blockquotes
    text = text.replace(/^>\s+(.+)$/gm, '<blockquote class="border-l-4 border-indigo-500 pl-3 py-1 my-1 italic text-slate-600 dark:text-slate-300">$1</blockquote>');

    // Bullet lists
    text = text.replace(/^[-*]\s+(.+)$/gm, '<li class="ml-4 list-disc text-xs leading-relaxed">$1</li>');

    // Paragraphs / linebreaks
    text = text.replace(/\n\n/g, '<br><br>');
    text = text.replace(/\n/g, '<br>');

    // Sanitize with DOMPurify
    if (window.DOMPurify && typeof window.DOMPurify.sanitize === 'function') {
      return window.DOMPurify.sanitize(text);
    }
    return text;
  }

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Register on window
  window.toast = toast;
  window.skeleton = skeleton;
  window.emptyState = emptyState;
  window.confirmDialog = confirmDialog;
  window.attachInlineValidation = attachInlineValidation;
  window.validateField = validateField;
  window.toggleDarkMode = toggleDarkMode;
  window.initTheme = initTheme;
  window.renderMarkdown = renderMarkdown;
  window.escapeHtml = escapeHtml;

  // Initialize theme on DOM load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTheme);
  } else {
    initTheme();
  }
})(window);

