/**
 * Smart Campus AI - Academic Calendar Module
 * Connects to /calendar/annual, initializes the 10-stage working mechanism,
 * and renders month grid and agenda schedule.
 */

(function (window) {
  'use strict';

  async function initCalendarModule() {
    if (typeof window.loadAcademicCalendar === 'function') {
      try {
        await window.loadAcademicCalendar();
      } catch (err) {
        console.warn('[calendar module] Failed to initialize academic calendar:', err);
      }
    }
  }

  window.module_calendar = {
    render: initCalendarModule
  };

  if (window.loaders) {
    const orig = window.loaders['academic-calendar'];
    window.loaders['academic-calendar'] = async function (...args) {
      if (typeof orig === 'function') await orig(...args);
      await initCalendarModule();
    };
  }
})(window);

