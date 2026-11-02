/**
 * Smart Campus AI - Fees & Receipts Module
 */

(function (window) {
  'use strict';

  async function renderFees() {
    const list = document.getElementById('feeReceipts') || document.getElementById('hubFeeReceiptsList');
    if (!list) return;

    try {
      const fees = window.api ? await window.api('/fee') : [];
      const totalAssessed = fees.reduce((acc, f) => acc + (f.assessed || 0), 0);
      const totalPaid = fees.reduce((acc, f) => acc + (f.paid || 0), 0);
      const dues = Math.max(0, totalAssessed - totalPaid);

      const assessedEl = document.getElementById('feeAssessed');
      const paidEl = document.getElementById('feePaid');
      const duesEl = document.getElementById('feeDues');

      if (assessedEl) assessedEl.textContent = '₹' + totalAssessed.toLocaleString('en-IN');
      if (paidEl) paidEl.textContent = '₹' + totalPaid.toLocaleString('en-IN');
      if (duesEl) duesEl.textContent = '₹' + dues.toLocaleString('en-IN');
    } catch (err) {
      console.warn('[fees] Failed to render fees:', err);
    }
  }

  window.module_fees = {
    render: renderFees
  };

  if (window.loaders) {
    const orig = window.loaders.fees;
    window.loaders.fees = async function () {
      if (typeof orig === 'function') await orig();
      await renderFees();
    };
  }
})(window);

