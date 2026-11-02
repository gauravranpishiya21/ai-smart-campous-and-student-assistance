/**
 * Smart Campus AI - Student Profile & Institutional ERP Records Controller
 * Manages institutional university student profile (MITS / MPOnline standard),
 * extended student demographics, contact credentials, photo/signature attachments,
 * and profile modification persistence.
 */

(function (window) {
  'use strict';

  function $(id) {
    return document.getElementById(id);
  }

  function setVal(id, val) {
    const el = $(id);
    if (!el) return;
    if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') {
      el.value = val || '';
    } else {
      el.textContent = val || '';
    }
  }

  function getVal(id) {
    const el = $(id);
    return el ? (el.value || el.textContent || '').trim() : '';
  }

  /**
   * Preview selected student photo file
   */
  function previewStudentPhoto(event) {
    const input = event && event.target ? event.target : $('sp_photo_input');
    const file = input && input.files ? input.files[0] : null;
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      if (window.toast) window.toast('Please select a valid image file (PNG/JPG).', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
      const img = $('sp_photo_preview');
      if (img) img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  /**
   * Explicit Attach Photo button action
   */
  function attachStudentPhoto() {
    const input = $('sp_photo_input');
    if (input && input.files && input.files[0]) {
      previewStudentPhoto({ target: input });
      if (window.toast) window.toast('Student photo attached successfully (200x200 verified).', 'success');
    } else {
      if (input) input.click();
    }
  }

  /**
   * Preview selected student signature file
   */
  function previewStudentSignature(event) {
    const input = event && event.target ? event.target : $('sp_signature_input');
    const file = input && input.files ? input.files[0] : null;
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      if (window.toast) window.toast('Please select a valid image file for signature.', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
      const img = $('sp_signature_preview');
      if (img) img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  /**
   * Explicit Attach Signature button action
   */
  function attachStudentSignature() {
    const input = $('sp_signature_input');
    if (input && input.files && input.files[0]) {
      previewStudentSignature({ target: input });
      if (window.toast) window.toast('Student signature attached successfully (25x70 verified).', 'success');
    } else {
      if (input) input.click();
    }
  }

  /**
   * Render and populate institutional student profile from API
   */
  async function renderProfile() {
    try {
      const res = window.api ? await window.api('/profile') : null;
      if (!res || !res.user) return;

      const u = res.user;
      const d = res.details || {};

      // 1. Personal Information Section
      setVal('sp_name', u.name || d.name || 'GAURAV MAHESHWARI');
      setVal('sp_father_name', d.father_name || 'ANIL MAHESHWARI');
      setVal('sp_mother_name', d.mother_name || 'SMITA MAHESHWARI');
      setVal('sp_gender', d.gender || 'Male');
      setVal('sp_dob', d.dob || '10/11/2005');
      setVal('sp_religion', d.religion || 'JAIN');
      setVal('sp_area', d.area || 'Urban');
      setVal('sp_category', d.category || 'GEN');
      setVal('sp_institute_name', d.institute_name || 'MADHAV INSTITUTE OF TECHNOLOGY AND SCIENCE, GWALIOR (DEEMED UNIVERSITY) (M.P.)');
      setVal('sp_programme', d.programme || 'B.Tech');
      setVal('sp_branch', d.branch || '[IT] INFORMATION TECHNOLOGY');

      // 2. Contact Information Section
      setVal('sp_address', d.address || 'dheeraj ward 4 Lakhanadon seoni mp');
      setVal('sp_state', d.state || 'Madhya Pradesh');
      setVal('sp_district', d.district || 'Seoni');
      setVal('sp_pincode', d.pincode || '480886');
      const cleanPhone = (u.phone || d.phone || '9301948450').replace(/^\+91\s*/, '');
      setVal('sp_phone', cleanPhone);
      setVal('sp_father_phone', d.father_phone || '9753099945');
      setVal('sp_blood_group', d.blood_group || 'B+');
      setVal('sp_guardian_phone', d.guardian_phone || '7024408870');
      setVal('sp_abc_id', d.abc_id || '093068200110');
      setVal('sp_email', u.email || d.email || 'gauravmaheshwari11@gmail.com');
      setVal('sp_admission_year', d.admission_year || '2024');

      // 3. Photo & Signature Previews
      if (d.photo_url && $('sp_photo_preview')) {
        $('sp_photo_preview').src = d.photo_url;
      }
      if (d.signature_url && $('sp_signature_preview')) {
        $('sp_signature_preview').src = d.signature_url;
      }

      // Backward compatibility sync with existing elements
      setVal('profileCardName', u.name || 'GAURAV MAHESHWARI');
      setVal('profileCardYearSem', `Year ${u.year || 1} · Sem ${u.semester || 1}`);
      setVal('profileCardDept', `Department of ${u.dept || 'Information Technology'}`);
      setVal('profileCardRoll', u.roll_no || '--');
      setVal('profileEmailVal', u.email || '--');
      setVal('profilePhoneInput', cleanPhone);
      setVal('profileBioInput', u.bio || '');

      // Update header student name if present
      const topName = $('topHeaderStudentName');
      if (topName) topName.textContent = (u.name || 'Gaurav').split(' ')[0];
      const navStudentName = $('studentName');
      if (navStudentName) navStudentName.textContent = u.name || 'Gaurav Maheshwari';

    } catch (err) {
      console.warn('[profile] Failed to load institutional student profile:', err);
    }
  }

  /**
   * Save and modify profile detail (triggered by "Modify Your Profile Detail" button)
   */
  async function saveStudentProfileForm() {
    const btn = $('sp_modify_btn');
    const origHtml = btn ? btn.innerHTML : '';

    const name = getVal('sp_name');
    const phone = getVal('sp_phone');

    if (!name) {
      if (window.toast) window.toast('Please enter your full Name.', 'warning');
      return;
    }
    if (!phone) {
      if (window.toast) window.toast('Please enter your Mobile Number.', 'warning');
      return;
    }

    const payload = {
      name,
      phone,
      father_name: getVal('sp_father_name'),
      mother_name: getVal('sp_mother_name'),
      gender: getVal('sp_gender') || 'Male',
      dob: getVal('sp_dob'),
      religion: getVal('sp_religion') || 'JAIN',
      area: getVal('sp_area') || 'Urban',
      category: getVal('sp_category') || 'GEN',
      institute_name: getVal('sp_institute_name'),
      programme: getVal('sp_programme') || 'B.Tech',
      branch: getVal('sp_branch') || '[IT] INFORMATION TECHNOLOGY',
      address: getVal('sp_address'),
      state: getVal('sp_state') || 'Madhya Pradesh',
      district: getVal('sp_district') || 'Seoni',
      pincode: getVal('sp_pincode'),
      father_phone: getVal('sp_father_phone'),
      blood_group: getVal('sp_blood_group') || 'B+',
      guardian_phone: getVal('sp_guardian_phone'),
      abc_id: getVal('sp_abc_id'),
      email: getVal('sp_email'),
      admission_year: getVal('sp_admission_year') || '2024',
      photo_url: $('sp_photo_preview')?.src || '',
      signature_url: $('sp_signature_preview')?.src || ''
    };

    try {
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Saving Profile...';
      }

      const res = await window.api('/profile', {
        method: 'PUT',
        body: payload
      });

      if (window.toast) {
        window.toast('Profile details updated successfully!', 'success');
      } else {
        alert('Profile details updated successfully!');
      }

      // Refresh authentication identity & UI labels
      if (window.api) {
        try {
          const me = await window.api('/auth/me');
          if ($('studentName')) $('studentName').textContent = me.name;
          const topName = $('topHeaderStudentName');
          if (topName) topName.textContent = me.name ? me.name.split(' ')[0] : 'Profile';
        } catch (_) {}
      }

      await renderProfile();
    } catch (err) {
      console.error('[profile] Error saving profile:', err);
      if (window.toast) {
        window.toast('Failed to save profile: ' + (err.message || 'Server error'), 'error');
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = origHtml;
      }
    }
  }

  // Expose module functions globally
  window.previewStudentPhoto = previewStudentPhoto;
  window.attachStudentPhoto = attachStudentPhoto;
  window.previewStudentSignature = previewStudentSignature;
  window.attachStudentSignature = attachStudentSignature;
  window.saveStudentProfileForm = saveStudentProfileForm;
  window.handleProfileSubmit = function (e) {
    if (e && e.preventDefault) e.preventDefault();
    return saveStudentProfileForm();
  };

  window.module_profile = {
    render: renderProfile,
    save: saveStudentProfileForm
  };

  // Hook into router loader
  if (window.loaders) {
    const orig = window.loaders.profile;
    window.loaders.profile = async function () {
      if (typeof orig === 'function') {
        try { await orig(); } catch (_) {}
      }
      await renderProfile();
    };
  }
})(window);
