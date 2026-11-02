/**
 * Smart Campus AI - Hash Router & Lazy Module Loader
 * Handles hash routes (e.g. #/attendance, #/dashboard), lazy loading of section modules,
 * skeleton placeholders during loading, recent/pinned items tracking, and mobile navigation sync.
 */

(function (window) {
  'use strict';

  // Route alias table mapping clean hash paths to DOM section IDs
  const ROUTE_MAP = {
    '': 'dashboard',
    'dashboard': 'dashboard',
    'attendance': 'attendance-hub',
    'attendance-hub': 'attendance-hub',
    'calendar': 'academic-calendar',
    'academic-calendar': 'academic-calendar',
    'timetable': 'timetable',
    'chat': 'chat',
    'ai-chat': 'chat',
    'planner': 'planner',
    'study-tools': 'study-tools',
    'doubt-engine': 'doubt-engine',
    'library': 'library',
    'placement': 'placement',
    'fees': 'fees',
    'helpdesk': 'helpdesk',
    'curriculum': 'curriculum',
    'study-materials': 'study-materials',
    'materials': 'study-materials',
    'projects': 'projects',
    'group-chat': 'group-chat',
    'syllabus-roadmap': 'syllabus-roadmap',
    'roadmap': 'syllabus-roadmap',
    'virtual-campus-map': 'virtual-campus-map',
    'map': 'virtual-campus-map',
    'parking': 'parking',
    'bus-tracking': 'bus-tracking',
    'bus': 'bus-tracking',
    'cafeteria': 'cafeteria',
    'sos': 'sos',
    'hostel': 'hostel',
    'profile': 'profile'
  };

  const RECENT_KEY = 'campus_recent_sections';
  const PINNED_KEY = 'campus_pinned_sections';
  const DEFAULT_PINNED = ['dashboard', 'attendance-hub', 'timetable', 'chat'];

  // Cache of loaded module promises to prevent duplicate fetches
  const loadedModules = new Map();
  let currentSectionId = 'dashboard';

  // -------------------------------------------------------------------------
  // Hash Routing Core
  // -------------------------------------------------------------------------
  function parseHash() {
    let hash = window.location.hash || '';
    if (hash.startsWith('#/')) hash = hash.slice(2);
    else if (hash.startsWith('#')) hash = hash.slice(1);
    const clean = hash.split('?')[0].trim().toLowerCase();
    return ROUTE_MAP[clean] || (document.getElementById(clean) ? clean : 'dashboard');
  }

  async function navigate(sectionId, pushState = true) {
    if (!sectionId) sectionId = 'dashboard';
    const targetEl = document.getElementById(sectionId);
    if (!targetEl) return;

    currentSectionId = sectionId;

    // 1. Hide all content sections and show target section
    document.querySelectorAll('.content-section').forEach((s) => {
      s.classList.add('hidden');
    });
    targetEl.classList.remove('hidden');

    // 2. Update URL hash if requested
    if (pushState) {
      const canonicalRoute = Object.keys(ROUTE_MAP).find((k) => ROUTE_MAP[k] === sectionId) || sectionId;
      try {
        history.replaceState(null, '', '#/' + canonicalRoute);
      } catch {}
    }

    // 3. Highlight sidebar active item and update accessibility attributes
    document.querySelectorAll('.sidebar-item').forEach((a) => {
      const target = a.dataset.sec || a.getAttribute('data-sec');
      const isActive = target === sectionId || (a.getAttribute('onclick') || '').includes(`'${sectionId}'`);
      a.classList.toggle('active', !!isActive);
      if (isActive) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });

    // 4. Update mobile bottom bar active icons
    document.querySelectorAll('.mobile-nav-btn').forEach((btn) => {
      const sec = btn.dataset.sec;
      const isActive = sec === sectionId;
      btn.classList.toggle('text-indigo-600', isActive);
      btn.classList.toggle('dark:text-indigo-400', isActive);
      btn.classList.toggle('text-slate-400', !isActive);
    });

    // 5. Close mobile navigation drawer if open
    document.body.classList.remove('nav-open');
    window.scrollTo({ top: 0, behavior: 'instant' });

    // 6. Record in Recent Sections
    recordRecentSection(sectionId);

    // 7. Lazy Load the section module if registered
    await loadSectionModule(sectionId);

    // 8. Execute legacy loader if registered on window.loaders
    if (window.loaders && typeof window.loaders[sectionId] === 'function') {
      try {
        await window.loaders[sectionId]();
      } catch (err) {
        console.warn(`[router] Loader for ${sectionId} failed:`, err);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Lazy Module Loader (Loads specific JS for the section on demand)
  // -------------------------------------------------------------------------
  async function loadSectionModule(sectionId) {
    // Map of section IDs to modular JS files
    const moduleMap = {
      'dashboard': 'js/modules/dashboard.js',
      'attendance-hub': 'js/modules/attendance.js',
      'academic-calendar': 'js/modules/calendar.js',
      'timetable': 'js/modules/timetable.js',
      'chat': 'js/modules/chat.js',
      'study-tools': 'js/modules/study-tools.js',
      'planner': 'js/modules/planner.js',
      'library': 'js/modules/library.js',
      'fees': 'js/modules/fees.js',
      'helpdesk': 'js/modules/helpdesk.js',
      'profile': 'js/modules/profile.js'
    };

    const moduleScriptPath = moduleMap[sectionId];
    if (!moduleScriptPath) return;

    if (loadedModules.has(sectionId)) {
      const mod = loadedModules.get(sectionId);
      if (mod && typeof mod.render === 'function') mod.render();
      return;
    }

    const targetEl = document.getElementById(sectionId);

    // Show temporary skeleton if container is empty
    let hasLoadedContent = targetEl && targetEl.children.length > 2 && targetEl.dataset.initialized === '1';
    if (!hasLoadedContent && targetEl) {
      // Injects a skeleton shimmer wrapper so screen is never blank
      const skeletonWrap = document.createElement('div');
      skeletonWrap.className = 'section-skeleton-loader p-4';
      skeletonWrap.innerHTML = window.skeleton ? window.skeleton.lines(4) : '<div class="p-6 text-sm text-slate-400">Loading module...</div>';
      targetEl.prepend(skeletonWrap);
    }

    try {
      await loadScript(moduleScriptPath);
      loadedModules.set(sectionId, window[`module_${sectionId.replace(/-/g, '_')}`] || true);
      if (targetEl) {
        targetEl.dataset.initialized = '1';
        const sk = targetEl.querySelector('.section-skeleton-loader');
        if (sk) sk.remove();
      }
    } catch (err) {
      console.warn(`[router] Module load error for ${sectionId}:`, err);
      if (targetEl) {
        const sk = targetEl.querySelector('.section-skeleton-loader');
        if (sk) sk.remove();
      }
    }
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) return resolve();
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = (e) => reject(new Error(`Failed to load script ${src}`));
      document.body.appendChild(s);
    });
  }

  // -------------------------------------------------------------------------
  // Recent & Pinned Sections Manager
  // -------------------------------------------------------------------------
  function recordRecentSection(secId) {
    if (!secId || secId === 'login') return;
    try {
      let recents = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
      recents = recents.filter((s) => s !== secId);
      recents.unshift(secId);
      recents = recents.slice(0, 4);
      localStorage.setItem(RECENT_KEY, JSON.stringify(recents));
      renderRecentItems();
    } catch {}
  }

  function getPinnedSections() {
    try {
      const val = localStorage.getItem(PINNED_KEY);
      return val ? JSON.parse(val) : DEFAULT_PINNED;
    } catch {
      return DEFAULT_PINNED;
    }
  }

  function togglePinSection(secId) {
    let pinned = getPinnedSections();
    if (pinned.includes(secId)) {
      pinned = pinned.filter((s) => s !== secId);
      if (window.toast) window.toast(`Unpinned from quick access`, 'info', 2000);
    } else {
      pinned.push(secId);
      if (window.toast) window.toast(`Pinned to quick access`, 'success', 2000);
    }
    localStorage.setItem(PINNED_KEY, JSON.stringify(pinned));
    renderPinnedItems();
  }

  function renderPinnedItems() {
    const container = document.getElementById('sidebarPinnedList');
    if (!container) return;
    const pinned = getPinnedSections();
    if (!pinned.length) {
      container.innerHTML = '<span class="text-[11px] text-slate-400 italic px-2">No pinned pages</span>';
      return;
    }
    container.innerHTML = pinned.map((sec) => {
      const title = formatSectionTitle(sec);
      const icon = getSectionIcon(sec);
      return `
        <button class="pinned-btn px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm" style="background-color: #ffffff; color: #0f172a;" onclick="window.showSection('${sec}')" title="Quick access to ${escapeHtml(title)}">
          <i class="fas ${icon} text-[11px]" style="color: #4f46e5;"></i>
          <span class="pinned-btn-text" style="color: #0f172a; font-weight: 700;">${escapeHtml(title)}</span>
        </button>
      `;
    }).join('');
  }

  function renderRecentItems() {
    const container = document.getElementById('sidebarRecentList');
    if (!container) return;
    let recents = [];
    try {
      recents = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    } catch {}
    if (!recents.length) {
      container.innerHTML = '<span class="text-[11px] text-slate-400 italic px-2">None yet</span>';
      return;
    }
    container.innerHTML = recents.map((sec) => {
      const title = formatSectionTitle(sec);
      return `
        <button class="recent-btn px-2 py-0.5 rounded text-[11px] font-semibold transition truncate max-w-[140px]" style="color: #cbd5e1; background: rgba(255, 255, 255, 0.06);" onclick="window.showSection('${sec}')" title="Go to ${escapeHtml(title)}">
          • <span style="color: #cbd5e1;">${escapeHtml(title)}</span>
        </button>
      `;
    }).join('');
  }

  function formatSectionTitle(secId) {
    const names = {
      'dashboard': 'Dashboard',
      'attendance-hub': 'Attendance',
      'academic-calendar': 'Calendar',
      'timetable': 'Timetable',
      'chat': 'AI Assistant',
      'planner': 'Study Planner',
      'study-tools': 'Quiz & Flashcards',
      'doubt-engine': 'Doubt Solver',
      'library': 'Digital Library',
      'fees': 'Fees & Dues',
      'helpdesk': 'AI Helpdesk',
      'profile': 'My Profile',
      'placement': 'Placements',
      'curriculum': 'Curriculum',
      'study-materials': 'Materials'
    };
    return names[secId] || secId.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function getSectionIcon(secId) {
    const icons = {
      'dashboard': 'fa-house',
      'attendance-hub': 'fa-calendar-check',
      'academic-calendar': 'fa-calendar-days',
      'timetable': 'fa-clock',
      'chat': 'fa-robot',
      'planner': 'fa-brain',
      'study-tools': 'fa-bolt',
      'library': 'fa-book-open',
      'fees': 'fa-receipt',
      'helpdesk': 'fa-headset',
      'profile': 'fa-user'
    };
    return icons[secId] || 'fa-layer-group';
  }

  function escapeHtml(str) {
    return window.escapeHtml ? window.escapeHtml(str) : String(str || '');
  }

  // -------------------------------------------------------------------------
  // Event Listeners & Global Registrations
  // -------------------------------------------------------------------------
  window.addEventListener('hashchange', () => {
    const sec = parseHash();
    navigate(sec, false);
  });

  // Expose global showSection (drops-in replaces existing showSection cleanly)
  window.showSection = function (id) {
    navigate(id, true);
  };
  window.togglePinSection = togglePinSection;
  window.renderPinnedItems = renderPinnedItems;
  window.renderRecentItems = renderRecentItems;

  // Initialize router when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    renderPinnedItems();
    renderRecentItems();
    const initialSec = parseHash();
    navigate(initialSec, false);
  });
})(window);

