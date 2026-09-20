/**
 * SMART UTILITY BILLING & METER MANAGEMENT SYSTEM
 * Client-side dynamic interactions and helpers
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Auto-dismiss alerts or manual close
  const alertCloseButtons = document.querySelectorAll('.alert-close');
  alertCloseButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const alert = e.target.closest('.alert');
      if (alert) alert.style.display = 'none';
    });
  });

  // 2. Demo credentials quick filler on login page
  const demoButtons = document.querySelectorAll('.btn-demo');
  const emailInput = document.getElementById('loginEmail');
  const passwordInput = document.getElementById('loginPassword');

  demoButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const email = btn.getAttribute('data-email');
      const pass = btn.getAttribute('data-pass');
      if (emailInput && passwordInput) {
        emailInput.value = email;
        passwordInput.value = pass;
      }
    });
  });

  // 3. Dynamic Meter Reading form handling (for Meter Reader)
  const meterSelect = document.getElementById('meterSelect');
  const prevReadingDisplay = document.getElementById('prevReadingDisplay');
  const prevReadingInput = document.getElementById('prevReadingInput');
  const currentReadingInput = document.getElementById('currentReadingInput');
  const unitsConsumedDisplay = document.getElementById('unitsConsumedDisplay');
  const validationAlert = document.getElementById('readingValidationAlert');
  const submitReadingBtn = document.getElementById('submitReadingBtn');
  const consumerNameDisplay = document.getElementById('consumerNameDisplay');

  async function fetchMeterDetails(meterId) {
    if (!meterId) {
      if (prevReadingDisplay) prevReadingDisplay.textContent = '--';
      if (prevReadingInput) prevReadingInput.value = '0';
      if (consumerNameDisplay) consumerNameDisplay.textContent = 'None';
      return;
    }

    try {
      const res = await fetch(`/meters/api/${meterId}/details`);
      const data = await res.json();
      if (data.success) {
        const prev = Number(data.lastReading) || 0;
        if (prevReadingDisplay) prevReadingDisplay.textContent = prev;
        if (prevReadingInput) prevReadingInput.value = prev;
        if (consumerNameDisplay) {
          consumerNameDisplay.textContent = data.consumer
            ? `${data.consumer.name} (${data.consumer.consumerId})`
            : 'Unassigned';
        }
        validateLiveReading();
      }
    } catch (err) {
      console.error('Error fetching meter info:', err);
    }
  }

  function validateLiveReading() {
    if (!currentReadingInput || !prevReadingInput) return;

    const prev = Number(prevReadingInput.value) || 0;
    const currentVal = currentReadingInput.value.trim();

    if (currentVal === '') {
      if (unitsConsumedDisplay) unitsConsumedDisplay.textContent = '--';
      if (validationAlert) validationAlert.style.display = 'none';
      if (submitReadingBtn) submitReadingBtn.disabled = false;
      return;
    }

    const curr = Number(currentVal);

    if (curr < prev) {
      // Reject lower reading rule
      if (validationAlert) {
        validationAlert.style.display = 'block';
        validationAlert.textContent = 'Invalid reading: New meter reading cannot be lower than the previous reading (' + prev + ').';
      }
      if (submitReadingBtn) submitReadingBtn.disabled = true;
      if (unitsConsumedDisplay) unitsConsumedDisplay.textContent = 'Invalid';
    } else {
      if (validationAlert) validationAlert.style.display = 'none';
      if (submitReadingBtn) submitReadingBtn.disabled = false;
      const units = curr - prev;
      if (unitsConsumedDisplay) unitsConsumedDisplay.textContent = units + ' units';
    }
  }

  if (meterSelect) {
    meterSelect.addEventListener('change', (e) => {
      fetchMeterDetails(e.target.value);
    });

    // Initial load if selected
    if (meterSelect.value) {
      fetchMeterDetails(meterSelect.value);
    }
  }

  if (currentReadingInput) {
    currentReadingInput.addEventListener('input', validateLiveReading);
  }

  // 4. Modal Open / Close handlers
  const openModalBtns = document.querySelectorAll('[data-modal-target]');
  const closeModalBtns = document.querySelectorAll('[data-modal-close]');

  openModalBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.getAttribute('data-modal-target');
      const modal = document.getElementById(modalId);
      if (modal) modal.classList.add('active');
    });
  });

  closeModalBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal-overlay');
      if (modal) modal.classList.remove('active');
    });
  });

  // Close modal when clicking on overlay background
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('active');
      }
    });
  });

  // 5. Mobile sidebar toggle
  const mobileToggle = document.getElementById('sidebarMobileToggle');
  const sidebar = document.querySelector('.app-sidebar');
  if (mobileToggle && sidebar) {
    mobileToggle.addEventListener('click', () => {
      sidebar.classList.toggle('mobile-open');
    });
  }
});
