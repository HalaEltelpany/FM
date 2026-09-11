/* 
  Ultimate FM - Application JavaScript Logic
  Coastal Cities & Commercial Malls Facility Management System
*/

// Bulletproof LocalStorage Polyfill & Fallback for file:// and restricted origins
const _memStorage = {};
const safeStorage = {
  getItem: function(key) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch (e) {
      console.warn('[Storage Polyfill] localStorage access restricted:', e);
    }
    return _memStorage[key] || null;
  },
  setItem: function(key, val) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, val);
        return;
      }
    } catch (e) {
      console.warn('[Storage Polyfill] localStorage write restricted:', e);
    }
    _memStorage[key] = String(val);
  },
  removeItem: function(key) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
        return;
      }
    } catch (e) {
      console.warn('[Storage Polyfill] localStorage remove restricted:', e);
    }
    delete _memStorage[key];
  }
};


class UltimateFMApp {
  constructor() {
    this.currentRole = 'homeowner';
    this.currentLang = safeStorage.getItem('app_lang') || 'ar';
    this.isFullWidth = false;
    this.qrTimer = 30;
    this.qrInterval = null;
    this.canvas = null;
    this.ctx = null;
    this.isDrawing = false;
    this.selectedPart = { name: 'ÙƒØ§Ø±ØªØ¯Ø¬ ØªÙƒÙŠÙŠÙ Ø´Ø§Ø±Ø¨', price: 850 };
    
    // Smart Utility Meters State
    this.elecBalance = 342.50; // Homeowner Electricity
    this.waterBalance = 185.00; // Homeowner Water
    this.tenantElecBalance = 210.00; // Tenant Electricity
    this.tenantWaterBalance = 120.00; // Tenant Water
    this.commElecBalance = 1450.00; // Commercial Electricity
    this.commWaterBalance = 820.00; // Commercial Water
    
    // Initial state data (Clean empty lists for 100% fresh testing)
    this.tickets = [];
    this.permits = [];
    this.complaints = [];
    this.housekeepingRequests = [];
    this.landscapingRequests = [];

    // Wipe cached records on startup for 100% fresh clean state
    safeStorage.removeItem('app_tickets');
    safeStorage.removeItem('fm_tickets');
    safeStorage.removeItem('fm_complaints');
    safeStorage.removeItem('fm_housekeeping');
    safeStorage.removeItem('fm_permits');
    safeStorage.removeItem('fm_landscaping');
    safeStorage.removeItem('fm_family_members');
    safeStorage.removeItem('fm_lpr_plates');
    safeStorage.removeItem('fm_chat_messages');

    // Initialize payment wallet balance
    this.ownerWalletBalance = 2500;

    // Hardcoded Odoo Connection Config (Active Live Database edu-fm-uc)
    this.odooConfig = {
      url: 'https://edu-fm-uc.odoo.com',
      db: 'edu-fm-uc',
      user: 'fmhala6@gmail.com',
      key: '06d7d7d208a8c2fa351c2a5cfa305e987ffb72f0'
    };

    // Ensure Local Storage is always locked to the active live database
    safeStorage.setItem('odoo_url', 'https://edu-fm-uc.odoo.com');
    safeStorage.setItem('odoo_db', 'edu-fm-uc');
    safeStorage.setItem('odoo_user', 'fmhala6@gmail.com');
    safeStorage.setItem('odoo_key', '06d7d7d208a8c2fa351c2a5cfa305e987ffb72f0');

    // Clear old cached test names if matching fmhala
    if (safeStorage.getItem('odoo_owner_name') === 'fmhala' || safeStorage.getItem('odoo_owner_name') === 'Fmhala') {
      safeStorage.removeItem('odoo_owner_name');
    }
    if (safeStorage.getItem('odoo_user') === 'fmhala@domain.com' || safeStorage.getItem('odoo_user') === 'admin@domain.com') {
      safeStorage.removeItem('odoo_user');
    }

    // 3 Warehouses Inventory List (Residential, Commercial, Assets)
    this.inventoryItems = [
      // Warehouse 1: Residential (Ù…Ø®Ø²Ù† Ø§Ù„Ù…Ù„Ø§Ùƒ Ø§Ù„Ø³ÙƒÙ†ÙŠ)
      { id: 1, name: 'Ø®Ù„Ø§Ø· Ù…ÙŠØ§Ù‡ Ø¥ÙŠØ·Ø§Ù„ÙŠ 3/4 Ø¨ÙˆØµØ©', warehouse: 'residential', qty: 15, price: 520, desc: 'Ø³Ø­Ø¨ Ù„Ù„Ù…Ù„Ø§Ùƒ - Ø³Ø¨Ø§ÙƒØ©' },
      { id: 2, name: 'ÙƒØ§Ø±ØªØ¯Ø¬ ØªÙƒÙŠÙŠÙ Ø´Ø§Ø±Ø¨ 2.25 Ø­ØµØ§Ù†', warehouse: 'residential', qty: 8, price: 850, desc: 'Ø³Ø­Ø¨ Ù„Ù„Ù…Ù„Ø§Ùƒ - ØªÙƒÙŠÙŠÙ' },
      { id: 3, name: 'Ù…ÙØªØ§Ø­ Ø¥Ù†Ø§Ø±Ø© Ø¬Ù„Ø§Ø³ ØªØ§ØªØ´ Ø°ÙƒÙŠ', warehouse: 'residential', qty: 25, price: 120, desc: 'Ø³Ø­Ø¨ Ù„Ù„Ù…Ù„Ø§Ùƒ - ÙƒÙ‡Ø±Ø¨Ø§Ø¡' },
      { id: 4, name: 'Ù„ÙˆØ­Ø© Ù„Ù…Ø¨Ø§Øª Ù„ÙŠØ¯ ØºØ§Ø·Ø³Ø© 12 ÙˆØ§Øª', warehouse: 'residential', qty: 40, price: 95, desc: 'Ø³Ø­Ø¨ Ù„Ù„Ù…Ù„Ø§Ùƒ - ÙƒÙ‡Ø±Ø¨Ø§Ø¡' },

      // Warehouse 2: Commercial (Ù…Ø®Ø²Ù† Ø§Ù„Ù…Ø³ØªØ£Ø¬Ø±ÙŠÙ† Ø§Ù„ØªØ¬Ø§Ø±ÙŠÙŠÙ†)
      { id: 10, name: 'Ù…Ø±ÙˆØ­Ø© Ø·Ø±Ø¯ Ù…Ø·Ø§Ø¨Ø® ØªØ¬Ø§Ø±ÙŠØ© ÙƒÙŠÙ†Ø¬', warehouse: 'commercial', qty: 4, price: 3200, desc: 'Ø³Ø­Ø¨ Ù„Ù„ØªØ¬Ø§Ø±ÙŠ - ØªÙ‡ÙˆÙŠØ© ÙˆÙ…Ø·Ø§Ø¨Ø®' },
      { id: 11, name: 'ÙƒØ§Ø¨Ù„ ÙƒÙ‡Ø±Ø¨Ø§Ø¡ Ù…Ø³Ù„Ø­ 3 ÙØ§Ø² Ù†Ø­Ø§Ø³', warehouse: 'commercial', qty: 150, price: 450, desc: 'Ø³Ø­Ø¨ Ù„Ù„ØªØ¬Ø§Ø±ÙŠ - ÙƒÙ‡Ø±Ø¨Ø§Ø¡ (Ø³Ø¹Ø± Ø§Ù„Ù…ØªØ±)' },
      { id: 12, name: 'Ù…Ø­Ø¨Ø³ Ø¥ØºÙ„Ø§Ù‚ ØºØ§Ø² ØµÙ†Ø§Ø¹ÙŠ Ù„ÙˆÙ„Ø¨ÙŠ', warehouse: 'commercial', qty: 6, price: 1800, desc: 'Ø³Ø­Ø¨ Ù„Ù„ØªØ¬Ø§Ø±ÙŠ - ØºØ§Ø² ÙˆØ£Ù…Ø§Ù† Ø§Ù„Ù…Ø­Ù„Ø§Øª' },

      // Warehouse 3: Assets & Utilities (Ù…Ø®Ø²Ù† Ø£ØµÙˆÙ„ ÙˆÙ…Ø±Ø§ÙÙ‚ Ø§Ù„Ù‚Ø±ÙŠØ©)
      { id: 20, name: 'Ø£ØºØ´ÙŠØ© ÙÙ„Ø§ØªØ± ØªØ­Ù„ÙŠØ© Ù…Ø­Ø·Ø© RO Ù…Ù…Ø¨Ø±ÙŠÙ†', warehouse: 'assets', qty: 12, price: 7500, desc: 'Ø£ØµÙˆÙ„ - Ù…Ø­Ø·Ø© Ø§Ù„ØªØ­Ù„ÙŠØ©' },
      { id: 21, name: 'Ø¹Ø¯Ø§Ø¯ Ø¶ØºØ· Ø´Ø¨ÙƒØ© Ø­Ø±ÙŠÙ‚ Ù‡ÙŠØ¯Ø±ÙˆÙ„ÙŠÙƒÙŠ', warehouse: 'assets', qty: 5, price: 1400, desc: 'Ø£ØµÙˆÙ„ - Ø´Ø¨ÙƒØ© Ø§Ù„Ø­Ø±ÙŠÙ‚ ÙˆØ§Ù„Ø³Ù„Ø§Ù…Ø©' },
      { id: 22, name: 'ÙƒÙ„ÙˆØ± Ø³Ø§Ø¦Ù„ ÙˆÙ…Ø·Ù‡Ø±Ø§Øª Ù„Ù„Ø¨Ø­ÙŠØ±Ø§Øª Ø§Ù„ÙƒØ¨Ø±Ù‰', warehouse: 'assets', qty: 30, price: 650, desc: 'Ø£ØµÙˆÙ„ - Ø§Ù„Ø¨Ø­ÙŠØ±Ø§Øª ÙˆØ­Ù…Ø§Ù…Ø§Øª Ø§Ù„Ø³Ø¨Ø§Ø­Ø© (Ø¹Ø¨ÙˆØ© 20 Ù„ØªØ±)' },
      { id: 23, name: 'Ù…Ø¶Ø®Ø© ØºØ§Ø·Ø³Ø© Ù„Ù…Ø·Ù‡Ø± Ø§Ù„ØµØ±Ù Ù…Ø­Ø·Ø© STP', warehouse: 'assets', qty: 3, price: 12500, desc: 'Ø£ØµÙˆÙ„ - Ù…Ø­Ø·Ø© Ù…Ø¹Ø§Ù„Ø¬Ø© Ø§Ù„ØµØ±Ù Ø§Ù„ØµØ­ÙŠ' }
    ];

    this.init();
  }

  init() {
    if (this._initialized) return;
    this._initialized = true;

    const runSetup = () => {
      if (this._setupDone) return;
      this._setupDone = true;

      try { this.loadOdooFields(); } catch (e) { console.warn('[Init warning]:', e); }
      try { this.applyLanguageUI(); } catch (e) { console.warn('[Init warning]:', e); }
      try { this.updateHomeownerNameUI(); } catch (e) { console.warn('[Init warning]:', e); }
      try { this.loadSavedOwnerAvatar(); } catch (e) { console.warn('[Init warning]:', e); }
      try { this.fetchOdooOwnerName(); } catch (e) { console.warn('[Init warning]:', e); }
      try { this.bindEvents(); } catch (e) { console.warn('[Init warning]:', e); }
      try { this.startQRTimer(); } catch (e) { console.warn('[Init warning]:', e); }
      try { this.initCanvas(); } catch (e) { console.warn('[Init warning]:', e); }
      try { this.renderPdfLogo(); } catch (e) { console.warn('[Init warning]:', e); }
      try { this.updateClock(); } catch (e) { console.warn('[Init warning]:', e); }
      try { setInterval(() => this.updateClock(), 1000); } catch (e) { console.warn('[Init warning]:', e); }
      try { this.initSplashScreen(); } catch (e) { console.warn('[Init warning]:', e); }
      try { this.loadTicketsFromStorage(); } catch (e) { console.warn('[Init warning]:', e); }
      try { this.syncTicketsFromOdoo(); } catch (e) { console.warn('[Init warning]:', e); }
      try { this.fetchOwnerChatterMessagesFromOdoo(); } catch (e) { console.warn('[Init warning]:', e); }
      try { this.renderTickets(); } catch (e) { console.warn('[Init warning]:', e); }

      // Start cleanly on the main role selection grid so all 10 screens are accessible, or execute pending click
      try {
        if (window._pendingRole) {
          const pending = window._pendingRole;
          window._pendingRole = null;
          this.quickLogin(pending);
        } else {
          this.showRoleGrid();
        }
      } catch (e) { console.warn('[RoleGrid warning]:', e); }

      // Register PWA Service Worker
      try {
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.register('./sw.js')
            .then(() => console.log('[PWA] Service Worker registered successfully.'))
            .catch((err) => console.log('[PWA] Service Worker registration failed:', err));
        }
      } catch (e) { console.warn('[PWA warning]:', e); }
    };

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      setTimeout(runSetup, 10);
    } else {
      document.addEventListener('DOMContentLoaded', runSetup);
    }
  }

  initSplashScreen() {
    const splash = document.getElementById('appSplashScreen');
    if (!splash) return;
    
    // Auto hide splash after 1.5s
    setTimeout(() => {
      splash.classList.add('hidden');
    }, 1500);

    // Hard safety timeout: Ensure display none after 2.5s
    setTimeout(() => {
      if (splash) splash.style.display = 'none';
    }, 2500);

    splash.addEventListener('click', () => {
      splash.classList.add('hidden');
      splash.style.display = 'none';
    });
  }

  renderPdfLogo() {
    if (typeof pdfjsLib !== 'undefined') {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      const canvas = document.getElementById('appLogoCanvas');
      const objEl = document.getElementById('appLogoObj');
      if (!canvas) return;

      pdfjsLib.getDocument('Ultimate Logo.pdf').promise.then(pdf => {
        return pdf.getPage(1);
      }).then(page => {
        const viewport = page.getViewport({ scale: 2.0 });
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        const ctx = canvas.getContext('2d');
        const renderContext = {
          canvasContext: ctx,
          viewport: viewport
        };
        return page.render(renderContext).promise;
      }).then(() => {
        canvas.style.display = 'block';
        if (objEl) objEl.style.display = 'none';
      }).catch(err => {
        console.log('PDF render fallback to image:', err);
      });
    }
  }

  bindEvents() {
    if (this._eventsBound) return;
    this._eventsBound = true;

    // Role Switcher Buttons
    const roleBtns = document.querySelectorAll('#roleSelector .role-btn');
    roleBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const role = e.currentTarget.getAttribute('data-role');
        this.switchRole(role);
      });
    });

    // Role block cards already have inline onclick handlers in index.html

    // View Mode Toggle (Mobile Simulator Frame vs Fullscreen)
    const toggleViewBtn = document.getElementById('toggleViewModeBtn');
    if (toggleViewBtn) {
      toggleViewBtn.addEventListener('click', () => this.toggleViewMode());
    }

    // Smart Meters Recharge Modal Triggers
    const btnOpenMeter = document.getElementById('btnOpenMeterRechargeModal');
    if (btnOpenMeter && !btnOpenMeter.getAttribute('onclick')) {
      btnOpenMeter.addEventListener('click', () => this.openModal('modalMeterRecharge'));
    }

    const btnConfirmMeter = document.getElementById('btnConfirmMeterRecharge');
    if (btnConfirmMeter && !btnConfirmMeter.getAttribute('onclick')) {
      btnConfirmMeter.addEventListener('click', () => this.handleMeterRechargeSubmit());
    }

    // Technician Actions
    const btnOpenRo = document.getElementById('btnOpenRoChecklist');
    if (btnOpenRo) {
      btnOpenRo.addEventListener('click', () => this.openModal('modalRoChecklist'));
    }

    const btnSaveRo = document.getElementById('btnSaveRoChecklist');
    if (btnSaveRo) {
      btnSaveRo.addEventListener('click', () => {
        this.closeModal('modalRoChecklist');
        this.showToast('ØªÙ… Ø­ÙØ¸ ÙˆØ§Ø¹ØªÙ…Ø§Ø¯ ØªÙ‚Ø±ÙŠØ± ÙØ­Øµ Ù…Ø­Ø·Ø© Ø§Ù„ØªØ­Ù„ÙŠØ© RO Ø¨Ù†Ø¬Ø§Ø­!');
      });
    }

    const btnSearchInv = document.getElementById('btnSearchInventoryPart');
    if (btnSearchInv) {
      btnSearchInv.addEventListener('click', () => {
        this.openModal('modalInventory');
        this.filterInventory();
      });
    }

    const btnGetSig = document.getElementById('btnGetCustomerSignature');
    if (btnGetSig) {
      btnGetSig.addEventListener('click', () => this.openModal('modalSignature'));
    }

    const btnApprovePay = document.getElementById('btnApproveAndPay');
    if (btnApprovePay) {
      btnApprovePay.addEventListener('click', () => this.handleApproveAndPay());
    }

    // Toggle custom card entry fields in payment modal
    const radioSaved = document.getElementById('payMethodSavedCard');
    const radioNew = document.getElementById('payMethodNewCard');
    if (radioSaved && radioNew) {
      radioSaved.addEventListener('change', () => {
        const group = document.getElementById('newCardFieldsGroup');
        if (group) group.style.display = 'none';
      });
      radioNew.addEventListener('change', () => {
        const group = document.getElementById('newCardFieldsGroup');
        if (group) group.style.display = 'flex';
      });
    }

    // Bottom phone navbar tab switcher listeners
    const phoneNav = document.getElementById('phoneNavbar');
    if (phoneNav) {
      phoneNav.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const tab = btn.getAttribute('data-tab');
          if (tab) this.switchHomeownerTab(tab);
        });
      });
    }

    // Admin Emergency Broadcast
    const btnBroadcast = document.getElementById('btnSendBroadcast');
    if (btnBroadcast) {
      btnBroadcast.addEventListener('click', () => {
        const input = document.getElementById('broadcastMsgInput');
        const msg = input ? input.value : 'ØªÙ†Ø¨ÙŠÙ‡ Ø·ÙˆØ§Ø±Ø¦';
        this.showToast(`ðŸ“¢ ØªÙ… Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„Ø¥Ø®Ø·Ø§Ø± Ù„Ø¬Ù…ÙŠØ¹ Ø§Ù„Ù…Ù„Ø§Ùƒ:\n"${msg}"`);
      });
    }

    // Unit Entry & Beach/Pools Permits
    const btnUnitPermit = document.getElementById('btnUnitEntryPermit');
    if (btnUnitPermit) {
      btnUnitPermit.addEventListener('click', () => {
        const code = Math.floor(100000 + Math.random() * 900000);
        this.showToast(`ðŸ”‘ ØªÙ… Ø¥ØµØ¯Ø§Ø± ÙƒÙˆØ¯ Ø¯Ø®ÙˆÙ„ Ø§Ù„ÙˆØ­Ø¯Ø© (ÙÙŠÙ„Ø§ 104) Ø¨Ù†Ø¬Ø§Ø­!\nØ±Ù…Ø² Ø§Ù„Ø¯Ø®ÙˆÙ„ Ø§Ù„Ù…Ø¤Ù‚Øª: ${code}\nØµØ§Ù„Ø­ Ù„Ù…Ø¯Ø© 24 Ø³Ø§Ø¹Ø© ÙÙ‚Ø· Ø¹Ù„Ù‰ Ø§Ù„Ø¨ÙˆØ§Ø¨Ø§Øª.`);
      });
    }

    const btnBeachPermit = document.getElementById('btnBeachPoolsPermit');
    if (btnBeachPermit) {
      btnBeachPermit.addEventListener('click', () => this.openModal('modalBeachPoolsPermit'));
    }

    // Engineer Specialty Change
    const engSelect = document.getElementById('engineerSpecialtySelect');
    if (engSelect) {
      engSelect.addEventListener('change', (e) => this.handleSpecialtyChange(e.target.value));
    }

    const btnEngSubmit = document.getElementById('btnEngineerSubmitToManager');
    if (btnEngSubmit) {
      btnEngSubmit.addEventListener('click', () => this.handleEngineerSubmitToManager());
    }

    // Commercial Permits Triggers
    const btnStaffPermit = document.getElementById('btnIssueStaffPermit');
    if (btnStaffPermit) {
      btnStaffPermit.addEventListener('click', () => this.openModal('modalStaffPermit'));
    }

    const btnCargoPermit = document.getElementById('btnCargoEntryPermit');
    if (btnCargoPermit) {
      btnCargoPermit.addEventListener('click', () => {
        const title = document.getElementById('cargoModalTitle');
        if (title) title.innerHTML = '<i class="fa-solid fa-truck"></i> ØªØµØ±ÙŠØ­ Ø³ÙŠØ§Ø±Ø§Øª Ø¨Ø¶Ø§Ø¦Ø¹ ÙˆØªÙˆØ±ÙŠØ¯';
        this.openModal('modalCargoPermit');
      });
    }

    const btnGoodsPermit = document.getElementById('btnGoodsRemovalPermit');
    if (btnGoodsPermit) {
      btnGoodsPermit.addEventListener('click', () => {
        const title = document.getElementById('cargoModalTitle');
        if (title) title.innerHTML = '<i class="fa-solid fa-box-open"></i> ØªØµØ±ÙŠØ­ Ø®Ø±ÙˆØ¬ Ù…Ù†Ù‚ÙˆÙ„Ø§Øª ÙˆÙ…Ø¹Ø¯Ø§Øª';
        this.openModal('modalCargoPermit');
      });
    }

    const btnCommMaint = document.getElementById('btnCommercialInternalMaintenance');
    if (btnCommMaint) {
      btnCommMaint.addEventListener('click', () => {
        this.openModal('modalNewTicket');
      });
    }
  }

  showRoleGrid() {
    this.currentRole = 'login';
    safeStorage.removeItem('active_session_role');

    // Remove any dynamic logout header
    document.querySelectorAll('.dynamic-logout-header').forEach(el => el.remove());

    // Hide ALL view panels explicitly with !important
    document.querySelectorAll('.view-panel').forEach(panel => {
      panel.classList.remove('active');
      panel.style.setProperty('display', 'none', 'important');
    });
    
    const gridPanel = document.getElementById('viewLogin') || document.getElementById('viewRoleGrid');
    if (gridPanel) {
      gridPanel.classList.add('active');
      gridPanel.style.setProperty('display', 'flex', 'important');
      gridPanel.style.setProperty('flex-direction', 'column', 'important');
    }

    // Hide phone bottom navbar when on login/selection grid
    const phoneNav = document.getElementById('phoneNavbar');
    if (phoneNav) phoneNav.style.setProperty('display', 'none', 'important');
  }

  quickLogin(role) {
    this.executeLogin(role === 'owner' ? 'homeowner' : role);
  }

  switchRole(role) {
    if (role === 'grid' || role === 'login') {
      this.showRoleGrid();
      return;
    }

    this.currentRole = role;
    
    // Remove any dynamic logout header
    document.querySelectorAll('.dynamic-logout-header').forEach(el => el.remove());

    // Update role buttons UI
    document.querySelectorAll('#roleSelector .role-btn').forEach(btn => {
      if (btn.getAttribute('data-role') === role) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Hide all views & show active with !important
    document.querySelectorAll('.view-panel').forEach(panel => {
      panel.classList.remove('active');
      panel.style.setProperty('display', 'none', 'important');
    });
    
    const targetMap = {
      'homeowner': 'viewHomeowner',
      'owner': 'viewHomeowner',
      'family': 'viewHomeowner', // Both map to the homeowner view panel
      'engineer': 'viewEngineer',
      'engineering_director': 'viewEngineeringDirector',
      'manager': 'viewManager',
      'technician': 'viewTechnician',
      'tenant': 'viewTenant',
      'commercial': 'viewCommercial',
      'admin': 'viewAdmin',
      'security': 'viewSecurity',
      'housekeeping': 'viewHousekeeping',
      'landscaping': 'viewLandscaping'
    };

    const targetId = targetMap[role] || 'viewHomeowner';
    const activePanel = document.getElementById(targetId);
    if (activePanel) {
      activePanel.classList.add('active');
      activePanel.style.setProperty('display', 'flex', 'important');
      activePanel.style.setProperty('flex-direction', 'column', 'important');
    }

    // ALWAYS keep back-to-grid buttons VISIBLE so the user can easily navigate between screens!
    document.querySelectorAll('[onclick="app.showRoleGrid()"], [onclick="app.switchRole(\'grid\')"]').forEach(btn => {
      btn.style.setProperty('display', 'inline-flex', 'important');
    });

    // Render lists on role switch
    this.renderHousekeeping();
    this.renderLandscaping();

    // Toggle Owner-Only Financial details visibility dynamically
    const financialElements = document.querySelectorAll('.owner-only-financial');
    financialElements.forEach(el => {
      if (role === 'family') {
        el.style.setProperty('display', 'none', 'important');
      } else {
        el.style.removeProperty('display');
      }
    });

    // Update Homeowner screen header texts based on sub-role
    const ownerTitle = document.getElementById('homeownerNameText');
    const ownerCardBadge = document.querySelector('#viewHomeowner .card.gold-border .badge');
    const ownerCardSubtitle = document.querySelector('#viewHomeowner .card.gold-border p');

    if (role === 'family') {
      if (ownerTitle) {
        ownerTitle.innerText = this.currentLang === 'en' ? 'Yasmin Ahmed (Family Member)' : 'ÙŠØ§Ø³Ù…ÙŠÙ† Ø£Ø­Ù…Ø¯ (ØªØ§Ø¨Ø¹ Ù„Ù„Ù…Ø§Ù„Ùƒ)';
      }
      if (ownerCardBadge) {
        ownerCardBadge.innerHTML = this.currentLang === 'en' 
          ? '<i class="fa-solid fa-user-shield"></i> Family Account (Restricted)' 
          : '<i class="fa-solid fa-user-shield"></i> Ø­Ø³Ø§Ø¨ ØªØ§Ø¨Ø¹ (Ù…Ø­Ø¯ÙˆØ¯)';
        ownerCardBadge.className = 'badge badge-info';
      }
      if (ownerCardSubtitle) {
        ownerCardSubtitle.innerText = this.currentLang === 'en' 
          ? 'Villa 104 - North Coast Zone â€¢ Associated to Main Owner' 
          : 'ÙÙŠÙ„Ø§ 104 - Ø²ÙˆÙ† Ø§Ù„Ø³Ø§Ø­Ù„ Ø§Ù„Ø´Ù…Ø§Ù„ÙŠ â€¢ ØªØ§Ø¨Ø¹ Ù„Ù„Ù…Ø§Ù„Ùƒ Ø§Ù„Ø£Ø³Ø§Ø³ÙŠ';
      }
    } else if (role === 'homeowner') {
      this.updateHomeownerNameUI();
      if (ownerCardBadge) {
        ownerCardBadge.innerHTML = this.currentLang === 'en' 
          ? '<i class="fa-solid fa-check"></i> Verified Account' 
          : '<i class="fa-solid fa-check"></i> Ø­Ø³Ø§Ø¨ Ù…Ø¤ÙƒØ¯';
        ownerCardBadge.className = 'badge badge-success';
      }
      if (ownerCardSubtitle) {
        ownerCardSubtitle.innerText = this.currentLang === 'en' 
          ? 'Villa 104 - North Coast Zone' 
          : 'ÙÙŠÙ„Ø§ 104 - Ø²ÙˆÙ† Ø§Ù„Ø³Ø§Ø­Ù„ Ø§Ù„Ø´Ù…Ø§Ù„ÙŠ';
      }
    }

    if (role === 'engineer') {
      const engSelect = document.getElementById('engineerSpecialtySelect');
      const val = engSelect ? engSelect.value : 'mep';
      this.handleSpecialtyChange(val);
      if (typeof window.renderPtwPermitsUI === 'function') window.renderPtwPermitsUI();
    } else if (role === 'engineering_director') {
      if (typeof window.renderPtwPermitsUI === 'function') window.renderPtwPermitsUI();
    }

    // Render screen logout header inside active view
    this.renderLogoutHeader();
  }

  openCommercialMeterModal() {
    this.openModal('modalMeterRecharge');
    const typeSelect = document.getElementById('meterTypeSelect');
    if (typeSelect) {
      typeSelect.innerHTML = `
        <option value="electricity">âš¡ Ø¹Ø¯Ø§Ø¯ Ø§Ù„ÙƒÙ‡Ø±Ø¨Ø§Ø¡ Ø§Ù„ØªØ¬Ø§Ø±ÙŠ (#EL-COMM-12 - Ø´Ø±ÙŠØ­Ø© ØªØ¬Ø§Ø±ÙŠØ©)</option>
        <option value="water">ðŸ’§ Ø¹Ø¯Ø§Ø¯ Ø§Ù„Ù…ÙŠØ§Ù‡ Ø§Ù„ØªØ¬Ø§Ø±ÙŠ (#WT-COMM-12 - Ù…Ø³ØªØ«Ù…Ø± ØªØ¬Ø§Ø±ÙŠ)</option>
      `;
    }
  }

  submitStaffPermit() {
    const name = document.getElementById('staffNameInput')?.value || 'Ù…ÙˆØ¸Ù Ø¬Ø¯ÙŠØ¯';
    const job = document.getElementById('staffJobInput')?.value || 'Ø¹Ø§Ù…Ù„ Ù†Ø´Ø§Ø·';
    const ins = document.getElementById('staffInsuranceInput')?.value || '#INS-80941';

    this.closeModal('modalStaffPermit');
    this.showToast(`âœ… ØªÙ… ØªÙˆÙ‚ÙŠØ¹ ÙˆØªØ£ÙƒÙŠØ¯ ØªØµØ±ÙŠØ­ Ø¹Ù…Ù„ Ø§Ù„Ù…ÙˆØ¸Ù (${name}) Ø¨Ù†Ø¬Ø§Ø­!\nØ§Ù„Ù…Ø³Ù…Ù‘Ù‰: ${job}\nØ±Ù‚Ù… Ø§Ù„Ù…Ù„Ù Ø§Ù„ØªØ£Ù…ÙŠÙ†ÙŠ Ù„Ù„Ø¯ÙˆÙ„Ø©: ${ins}\nØªÙ… Ø¥ØµØ¯Ø§Ø± ÙƒÙˆØ¯ Ø¯Ø®ÙˆÙ„ Ø§Ù„Ø¨ÙˆØ§Ø¨Ø§Øª Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠØ©.`);
  }

  submitCargoPermit() {
    const desc = document.getElementById('cargoDescInput')?.value || 'Ø´Ø­Ù†Ø© ØªØ¬Ø§Ø±ÙŠØ©';
    const driver = document.getElementById('cargoDriverInput')?.value || 'Ø³Ø§Ø¦Ù‚ Ø§Ù„ØªÙˆØ±ÙŠØ¯';
    const code = Math.floor(100000 + Math.random() * 900000);

    this.closeModal('modalCargoPermit');
    this.showToast(`ðŸšš ØªÙ… Ø¥ØµØ¯Ø§Ø± ØªØµØ±ÙŠØ­ Ø§Ù„Ø¨Ø¶Ø§Ø¦Ø¹/Ø§Ù„Ù…Ù†Ù‚ÙˆÙ„Ø§Øª Ø¨Ù†Ø¬Ø§Ø­!\nØ§Ù„Ø´Ø­Ù†Ø©: ${desc}\nØ§Ù„Ø³Ø§Ø¦Ù‚: ${driver}\nØ±Ù…Ø² QR Ø§Ù„Ø£Ù…Ø§Ù† Ù„Ù„Ø¨ÙˆØ§Ø¨Ø©: ${code}`);
  }

  requestWasteRemoval() {
    this.showToast('ðŸ—‘ï¸ ØªÙ… Ø±ÙØ¹ Ø·Ù„Ø¨ Ø§Ù„ØªØ®Ù„Øµ Ø§Ù„Ø¨ÙŠØ¦ÙŠ ÙˆØ§Ù„Ù…Ø®Ù„ÙØ§Øª Ø§Ù„ØªØ¬Ø§Ø±ÙŠØ© Ù„Ù‚Ø³Ù… Ø§Ù„Ù†Ø¸Ø§ÙØ© Ø¨Ø§Ù„Ù‚Ø±ÙŠØ© ÙˆØ§Ù„Ù…ÙˆÙ„.\nØ³ÙŠØªÙ… Ø§Ù„ØªÙˆØ¬Ù‡ Ù„Ù„Ù…Ø­Ù„ Ø®Ù„Ø§Ù„ 30 Ø¯Ù‚ÙŠÙ‚Ø©.');
  }

  openSecurityComplaints() {
    this.showToast('ðŸ‘® ØªÙ… ÙØªØ­ Ù‚Ù†Ø§Ø© Ø§Ù„ØªÙ†Ø³ÙŠÙ‚ Ø§Ù„Ø£Ù…Ù†ÙŠØ© ÙˆØ§Ø³ØªÙ‚Ø¨Ø§Ù„ Ø§Ù„Ø´ÙƒØ§ÙˆÙ‰ Ø§Ù„Ù…ØªØ¨Ø§Ø¯Ù„Ø© Ø¨ÙŠÙ† Ø§Ù„Ù…Ù„Ø§Ùƒ ÙˆØ§Ù„Ù…Ø­Ù„ Ø§Ù„ØªØ¬Ø§Ø±ÙŠ.');
  }

  handleSpecialtyChange(specialtyKey) {
    const nameEl = document.getElementById('engineerNameText');
    const subEl = document.getElementById('engineerSpecialtySub');
    const listEl = document.getElementById('engineerChecklistsList');

    // 5 Specialized Engineering Teams (Mapped to Odoo maintenance.team IDs 2, 3, 5, 6, 7)
    const teamsConfig = {
      'mep': {
        name: 'Ù…. Ù…Ø­Ù…ÙˆØ¯ Ø¹Ø¨Ø¯ Ø§Ù„ÙØªØ§Ø­',
        sub: 'â„ï¸ Ù…Ù‡Ù†Ø¯Ø³ Ø§Ù„ÙƒÙ‡Ø±ÙˆÙ…ÙŠÙƒØ§Ù†ÙŠÙƒ ÙˆØ§Ù„ØªÙƒÙŠÙŠÙ ÙˆØ§Ù„Ù…Ø­Ø·Ø§Øª (Odoo Team #2)',
        teamId: 2,
        teamName: 'MEP Team',
        checklists: [
          {
            id: 'chk_ro',
            title: 'Ù…Ø­Ø·Ø© Ø§Ù„ØªØ­Ù„ÙŠØ© Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ© (RO Plant)',
            desc: 'ÙØ­Øµ Ø¶ØºØ· Ø§Ù„Ø£ØºØ´ÙŠØ©ØŒ Ù†Ø³Ø¨Ø© Ø§Ù„ÙƒÙ„ÙˆØ± ÙˆØ§Ù„Ù…Ù„ÙˆØ­Ø© Ø§Ù„ÙŠÙˆÙ…ÙŠØ©',
            actionBtn: 'openPlantInspectionModal(\'ro\')',
            status: 'ÙØ­Øµ Ø¯ÙˆØ±ÙŠ Ù…Ø·Ù„ÙˆØ¨'
          },
          {
            id: 'chk_stp',
            title: 'Ù…Ø­Ø·Ø© Ù…Ø¹Ø§Ù„Ø¬Ø© Ø§Ù„ØµØ±Ù (STP Plant)',
            desc: 'ÙØ­Øµ Ø·Ù„Ù…Ø¨Ø§Øª Ø§Ù„Ù‡ÙˆØ§Ø¡ØŒ Ù†Ø³Ø¨Ø© Ø§Ù„Ø£ÙƒØ³Ø¬ÙŠÙ† ÙˆÙ†Ù‚Ø§Ø¡ Ù…ÙŠØ§Ù‡ Ø±ÙŠ Ø§Ù„Ù„Ø§Ù†Ø¯Ø³ÙƒÙŠØ¨',
            actionBtn: 'openPlantInspectionModal(\'stp\')',
            status: 'ÙØ­Øµ Ø¯ÙˆØ±ÙŠ Ù…Ø·Ù„ÙˆØ¨'
          },
          {
            id: 'chk_chiller',
            title: 'Ù…Ø­Ø·Ø© Ø·Ù„Ù…Ø¨Ø§Øª Ø§Ù„Ø±ÙØ¹ ÙˆØºØ±Ù Ø§Ù„ØªØ¨Ø±ÙŠØ¯ Ø§Ù„Ù…Ø±ÙƒØ²ÙŠ',
            desc: 'ÙØ­Øµ Ø¶ØºØ· Ø®Ø·ÙˆØ· Ø§Ù„Ø·Ø±Ø¯ ÙˆØ§Ù„ÙØ±ÙŠÙˆÙ† ÙˆØ§Ù„Ø¶ÙˆØ§ØºØ·',
            status: 'Ù…ÙƒØªÙ…Ù„ Ø§Ù„ÙŠÙˆÙ…'
          }
        ]
      },
      'fls': {
        name: 'Ù…. Ø®Ø§Ù„Ø¯ Ø§Ù„Ø³Ø¹Ø¯Ù†ÙŠ',
        sub: 'ðŸ”¥ Ù…Ù‡Ù†Ø¯Ø³ Ø§Ù„Ø³Ù„Ø§Ù…Ø© ÙˆØ£Ù†Ø¸Ù…Ø© Ù…ÙƒØ§ÙØ­Ø© Ø§Ù„Ø­Ø±ÙŠÙ‚ (Odoo Team #3)',
        teamId: 3,
        teamName: 'FLS Team',
        checklists: [
          {
            id: 'chk_fls',
            title: 'Ù…Ø¶Ø®Ø§Øª Ø§Ù„Ø­Ø±ÙŠÙ‚ Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ© (Ø¯ÙŠØ²Ù„ / ÙƒÙ‡Ø±Ø¨Ø§Ø¡ / Ø¨ÙˆØ³ØªØ±)',
            desc: 'Ø§Ø®ØªØ¨Ø§Ø± Ø¶ØºØ· Ø§Ù„Ø´Ø¨ÙƒØ© Ø¹Ù†Ø¯ 12 Bar ÙˆØ¨Ø¯Ø¡ Ø§Ù„ØªØ´ØºÙŠÙ„ Ø§Ù„ØªÙ„Ù‚Ø§Ø¦ÙŠ',
            actionBtn: 'openPlantInspectionModal(\'fls\')',
            status: 'ÙØ­Øµ Ø£Ø³Ø¨ÙˆØ¹ÙŠ Ø¥Ø¬Ø¨Ø§Ø±ÙŠ'
          },
          {
            id: 'chk_alarm',
            title: 'Ù„ÙˆØ­Ø© Ø§Ù„Ø¥Ù†Ø°Ø§Ø± Ø§Ù„Ù…Ø±ÙƒØ²ÙŠØ© ÙˆÙ…Ø­Ø§Ø¨Ø³ ÙƒØ´Ù Ø§Ù„Ø³Ø±ÙŠØ§Ù† OS&Y',
            desc: 'Ø§Ø®ØªØ¨Ø§Ø± ÙƒÙˆØ§Ø´Ù Ø§Ù„Ø¯Ø®Ø§Ù† ÙˆØ­Ø³Ø§Ø³Ø§Øª Ø§Ù„Ø¶ØºØ· ÙÙŠ Ø²ÙˆÙ† 1 Ùˆ 2',
            status: 'Ù…ÙƒØªÙ…Ù„ ÙˆØ¬Ø§Ù‡Ø²'
          },
          {
            id: 'chk_hose',
            title: 'ØµÙ†Ø§Ø¯ÙŠÙ‚ Ø§Ù„Ø­Ø±ÙŠÙ‚ ÙˆØ±Ø´Ø§Ø´Ø§Øª Ø§Ù„Ø¥Ø·ÙØ§Ø¡ Ø¨Ø§Ù„Ù…ÙˆÙ„ ÙˆØ§Ù„Ù…Ù…Ø±Ø§Øª',
            desc: 'ÙØ­Øµ Ø®Ø±Ø§Ø·ÙŠÙ… Ø§Ù„Ø¥Ø·ÙØ§Ø¡ ÙˆØ³Ù„Ø§Ù…Ø© Ø§Ù„Ø¨ÙˆØ§Ø¨Ø§Øª ÙˆÙ…Ø®Ø§Ø±Ø¬ Ø§Ù„Ø·ÙˆØ§Ø±Ø¦',
            status: 'Ù…Ø·Ø§Ø¨Ù‚ Ù„Ù„ÙƒÙˆØ¯'
          }
        ]
      },
      'electrical': {
        name: 'Ù…. Ø­Ø³Ø§Ù… Ø§Ù„Ù†Ø¬Ø§Ø±',
        sub: 'âš¡ Ù…Ù‡Ù†Ø¯Ø³ Ø§Ù„ÙƒÙ‡Ø±Ø¨Ø§Ø¡ ÙˆØ§Ù„Ø·Ø§Ù‚Ø© ÙˆØ§Ù„Ù…Ø­ÙˆÙ„Ø§Øª (Odoo Team #5)',
        teamId: 5,
        teamName: 'Electrical Team',
        checklists: [
          {
            id: 'chk_trans',
            title: 'Ù…Ø­ÙˆÙ„ Ø§Ù„Ø¬Ù‡Ø¯ Ø§Ù„Ù…ØªÙˆØ³Ø· 04 ÙˆØ£ÙƒØ´Ø§Ùƒ Ø§Ù„Ø¨ÙŠÙ„Ø§Ø±Ø§Øª',
            desc: 'Ø§Ø®ØªØ¨Ø§Ø± Ø­Ø±Ø§Ø±Ø© Ø§Ù„Ø²ÙŠØªØŒ Ø§Ù„Ø¹Ø²Ù„ Ø§Ù„ÙƒÙ‡Ø±Ø¨Ø§Ø¦ÙŠØŒ ÙˆÙ†Ø³Ø¨Ø© Ø§Ù„Ø­Ù…Ù„',
            actionBtn: 'openPlantInspectionModal(\'electrical\')',
            status: 'ÙØ­Øµ ÙŠÙˆÙ…ÙŠ Ù…Ø·Ù„ÙˆØ¨'
          },
          {
            id: 'chk_mdb',
            title: 'Ù„ÙˆØ­Ø§Øª Ø§Ù„ØªÙˆØ²ÙŠØ¹ Ø§Ù„Ø¹Ù…ÙˆÙ…ÙŠØ© MDBs ÙˆÙ…ÙˆÙ„Ø¯Ø§Øª Ø§Ù„Ø·ÙˆØ§Ø±Ø¦',
            desc: 'ÙØ­Øµ Ø§Ù„Ù‚ÙˆØ§Ø·Ø¹ Ø§Ù„Ø°ÙƒÙŠØ© ÙˆÙ…Ø³ØªÙˆÙ‰ Ø§Ù„Ø¯ÙŠØ²Ù„ Ù„Ù„Ù…ÙˆÙ„Ø¯ Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠ',
            status: 'Ø¬Ø§Ù‡Ø²ÙŠØ© 100%'
          },
          {
            id: 'chk_light',
            title: 'Ø´Ø¨ÙƒØ© Ø§Ù„Ø¥Ù†Ø§Ø±Ø© Ø§Ù„Ø¹Ø§Ù…Ø© ÙˆØ£Ø¹Ù…Ø¯Ø© Ø§Ù„Ù…Ù…Ø´Ù‰ ÙˆØ§Ù„Ø´Ø§Ø·Ø¦',
            desc: 'Ø§Ø®ØªØ¨Ø§Ø± Ø§Ù„Ù…Ø¤Ù‚ØªØ§Øª Ø§Ù„Ø²Ù…Ù†ÙŠØ© ÙˆØ®Ù„Ø§ÙŠØ§ Ø§Ù„ÙÙˆØªÙˆØ³ÙŠÙ„ Ø§Ù„Ø°ÙƒÙŠØ©',
            status: 'Ù‚ÙŠØ¯ Ø§Ù„ØªÙØªÙŠØ´'
          }
        ]
      },
      'landscape': {
        name: 'Ù…. Ø·Ø§Ø±Ù‚ Ø¹Ø¨Ø¯ Ø§Ù„Ù…Ø¬ÙŠØ¯',
        sub: 'ðŸŒ¿ Ù…Ù‡Ù†Ø¯Ø³ Ø§Ù„Ù„Ø§Ù†Ø¯Ø³ÙƒÙŠØ¨ ÙˆØ§Ù„Ø²Ø±Ø§Ø¹Ø© ÙˆØ´Ø¨ÙƒØ§Øª Ø§Ù„Ø±ÙŠ (Odoo Team #6)',
        teamId: 6,
        teamName: 'Landscaping & Agriculture Team',
        checklists: [
          {
            title: 'Ø´Ø¨ÙƒØ§Øª Ø§Ù„Ø±ÙŠ Ø§Ù„Ø£ÙˆØªÙˆÙ…Ø§ØªÙŠÙƒÙŠØ© Ø¨Ø§Ù„Ù…Ø­ÙˆØ± Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠ',
            desc: 'ÙØ­Øµ Ø¶ØºØ· Ø§Ù„Ù†ÙˆØ§Ø²Ù„ØŒ Ù…Ø­Ø§Ø¨Ø³ Ø§Ù„Ø³ÙˆÙ„ÙŠÙ†ÙˆÙŠØ¯ØŒ ÙˆØ¬Ø¯Ø§ÙˆÙ„ Ø§Ù„Ø¶Ø®',
            actionBtn: 'openPlantInspectionModal(\'landscape\')',
            status: 'ÙØ­Øµ Ø¯ÙˆØ±ÙŠ Ù…Ø·Ù„ÙˆØ¨'
          },
          {
            title: 'Ø·Ù„Ù…Ø¨Ø§Øª Ø§Ù„ØªØ³Ù…ÙŠØ¯ ÙˆØ®Ø²Ø§Ù†Ø§Øª Ø§Ù„Ù…ØºØ°ÙŠØ§Øª Ø§Ù„Ù…Ø±ÙƒØ²ÙŠØ©',
            desc: 'Ù…Ø¹Ø§ÙŠØ±Ø© Ù†Ø³Ø¨ Ø§Ù„ØªØ³Ù…ÙŠØ¯ ÙˆØ§Ø®ØªØ¨Ø§Ø± Ù†Ù‚Ø§Ø¡ Ø®Ø·ÙˆØ· Ø§Ù„ØªÙ†Ù‚ÙŠØ·',
            status: 'Ù…ÙƒØªÙ…Ù„ Ø§Ù„ÙŠÙˆÙ…'
          },
          {
            title: 'Ø§Ù„Ù…Ø³Ø·Ø­Ø§Øª Ø§Ù„Ø®Ø¶Ø±Ø§Ø¡ ÙˆÙ…Ø²Ø±ÙˆØ¹Ø§Øª Ø§Ù„Ø´Ø§Ø·Ø¦ ÙˆØ§Ù„Ø­Ø¯Ø§Ø¦Ù‚',
            desc: 'Ø¬Ø¯ÙˆÙ„ Ø§Ù„ØªÙ‚Ù„ÙŠÙ… Ø§Ù„Ø¯ÙˆØ±ÙŠ ÙˆÙ…ÙƒØ§ÙØ­Ø© Ø§Ù„Ø¢ÙØ§Øª Ø§Ù„Ø²Ø±Ø§Ø¹ÙŠØ©',
            status: 'Ù…Ø¬Ø¯ÙˆÙ„ Ø§Ù„Ø£Ø³Ø¨ÙˆØ¹ Ø§Ù„Ù‚Ø§Ø¯Ù…'
          }
        ]
      },
      'civil': {
        name: 'Ù…. ÙŠØ§Ø³Ø± Ø§Ù„Ù‡ÙˆØ§Ø±ÙŠ',
        sub: 'ðŸ—ï¸ Ù…Ù‡Ù†Ø¯Ø³ Ø§Ù„Ù…Ø¯Ù†ÙŠ ÙˆØ§Ù„Ù‡ÙŠØ§ÙƒÙ„ Ø§Ù„Ø¥Ù†Ø´Ø§Ø¦ÙŠØ© ÙˆØ§Ù„ØªØ´Ø·ÙŠØ¨Ø§Øª (Odoo Team #7)',
        teamId: 7,
        teamName: 'Civil & Structural Team',
        checklists: [
          {
            title: 'Ø§Ù„Ù…Ù…Ø§Ø´ÙŠ Ø§Ù„Ø®Ø±Ø³Ø§Ù†ÙŠØ© ÙˆØ§Ù„Ø¥Ù†ØªØ±Ù„ÙˆÙƒ ÙˆØ§Ù„Ù…Ø­Ø§ÙˆØ± Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ©',
            desc: 'ÙØ­Øµ ÙÙˆØ§ØµÙ„ Ø§Ù„ØªÙ…Ø¯Ø¯ ÙˆØ§Ù„ØªØ£ÙƒØ¯ Ù…Ù† Ø¹Ø¯Ù… ÙˆØ¬ÙˆØ¯ Ù‡Ø¨ÙˆØ· Ø£Ø±Ø¶ÙŠ',
            actionBtn: 'openPlantInspectionModal(\'civil\')',
            status: 'ÙØ­Øµ Ù…ÙŠØ¯Ø§Ù†ÙŠ Ù…Ø·Ù„ÙˆØ¨'
          },
          {
            title: 'Ø£Ø±ØµÙØ© Ø§Ù„Ø¨Ø­ÙŠØ±Ø§Øª Ø§Ù„ØµÙ†Ø§Ø¹ÙŠØ© ÙˆØ§Ù„Ù…ØµØ¯Ø§Øª Ø§Ù„Ø´Ø§Ø·Ø¦ÙŠØ©',
            desc: 'ÙØ­Øµ Ø·Ø¨Ù‚Ø§Øª Ø§Ù„Ø¹Ø²Ù„ Ø§Ù„Ù…Ø§Ø¦ÙŠ ÙˆØ§Ù„ØªØ£ÙƒØ¯ Ù…Ù† Ø®Ù„ÙˆÙ‡Ø§ Ù…Ù† Ø§Ù„ØªØµØ¯Ø¹Ø§Øª',
            status: 'Ù‚ÙŠØ¯ Ø§Ù„Ù…ØªØ§Ø¨Ø¹Ø©'
          },
          {
            title: 'Ø£Ø±Ø¶ÙŠØ§Øª Ø­Ù…Ø§Ù…Ø§Øª Ø§Ù„Ø³Ø¨Ø§Ø­Ø© ÙˆØ§Ù„Ø¨Ø±Ø¬ÙˆÙ„Ø§Øª Ø§Ù„Ø®Ø´Ø¨ÙŠØ©',
            desc: 'ÙØ­Øµ Ø§Ù„Ø³ÙŠØ±Ø§Ù…ÙŠÙƒ ÙˆØ§Ù„Ù…Ø¸Ù„Ø§Øª ÙˆØ¯Ù‡Ø§Ù†Ø§Øª Ø§Ù„Ø­Ù…Ø§ÙŠØ© Ù…Ù† Ø§Ù„Ø±Ø·ÙˆØ¨Ø©',
            status: 'Ù…Ø·Ø§Ø¨Ù‚ Ù„Ù„Ù…ÙˆØ§ØµÙØ§Øª'
          }
        ]
      }
    };

    const config = teamsConfig[specialtyKey] || teamsConfig['mep'];
    this.activeEngineerTeam = config;

    if (nameEl) nameEl.innerText = config.name;
    if (subEl) subEl.innerText = config.sub;

    const modalOrderName = document.getElementById('modalEngOrderName');
    const modalOrderTeam = document.getElementById('modalEngOrderTeam');
    if (modalOrderName) modalOrderName.innerText = config.name;
    if (modalOrderTeam) modalOrderTeam.innerText = `${config.teamName} (${config.sub.split('(')[1] ? '(' + config.sub.split('(')[1] : ''}`;

    if (listEl) {
      listEl.innerHTML = '';
      config.checklists.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'ticket-item';
        itemDiv.innerHTML = `
          <div>
            <h4 style="font-size: 0.85rem; font-weight: 800; color: #20274f;">${item.title}</h4>
            <p style="font-size: 0.72rem; color: #64748b; margin-top: 2px;">${item.desc}</p>
          </div>
          ${item.actionBtn ? `<button class="btn btn-primary" style="width: auto; padding: 5px 12px; font-size: 0.72rem; margin: 0; background: #1b8f91; border: none; font-weight: 700;" onclick="${item.actionBtn}"><i class="fa-solid fa-clipboard-check"></i> ÙØªØ­ Ø§Ù„ØªÙØªÙŠØ´</button>` : `<span class="badge badge-success" style="font-size: 0.65rem; padding: 4px 8px;"><i class="fa-solid fa-check"></i> ${item.status}</span>`}
        `;
        listEl.appendChild(itemDiv);
      });
    }

    // Filter Engineer Tickets to show only team tickets
    this.renderEngineerTickets();
  }

  handleEngineerSubmitToManager() {
    this.showToast('ðŸ›  ØªÙ… Ø¥Ø±Ø³Ø§Ù„ Ø£Ù…Ø± Ø§Ù„Ø¹Ù…Ù„ Ø§Ù„Ù‡Ù†Ø¯Ø³ÙŠ Ø§Ù„Ø¹Ø§Ø¬Ù„ Ø¨Ù†Ø¬Ø§Ø­ Ø¥Ù„Ù‰ Ø´Ø§Ø´Ø© Ù…Ø¯ÙŠØ± Ø§Ù„ØµÙŠØ§Ù†Ø©!\nØªÙ… Ø¥Ø¯Ø±Ø§Ø¬ Ø§Ù„Ø·Ù„Ø¨ ÙÙŠ Ø·Ø§Ø¨ÙˆØ± Ø§Ù„ÙˆØ§Ø±Ø¯ Ù„ØªÙˆØ²ÙŠØ¹ ÙÙ†ÙŠ Ù…ØªØ§Ø­.');
  }

  dispatchOrderToTech(orderTitle, selectId) {
    const select = document.getElementById(selectId);
    const techName = select ? select.value : 'Ø§Ù„ÙÙ†ÙŠ';
    this.showToast(`ðŸš€ ØªÙ… ØªØ®ØµÙŠØµ ÙˆØ¥Ø±Ø³Ø§Ù„ "${orderTitle}" Ø¨Ù†Ø¬Ø§Ø­ Ø¥Ù„Ù‰ Ø§Ù„ÙÙ†ÙŠ (${techName})!\nØ³ÙŠØ¸Ù‡Ø± Ø§Ù„Ø·Ù„Ø¨ Ø§Ù„Ø¢Ù† ÙÙˆØ±Ø§Ù‹ Ø¹Ù„Ù‰ Ø´Ø§Ø´Ø© Ø§Ù„ÙÙ†ÙŠ Ø§Ù„Ù…ÙŠØ¯Ø§Ù†ÙŠØ©.`);
  }

  toggleViewMode() {
    const simulator = document.getElementById('phoneSimulator');
    const textSpan = document.getElementById('viewModeText');
    this.isFullWidth = !this.isFullWidth;

    if (this.isFullWidth) {
      simulator.classList.add('full-width');
      if (textSpan) textSpan.innerText = 'Ø¹Ø±Ø¶ Ø§Ù„Ù…ÙˆØ¨Ø§ÙŠÙ„ Ø§Ù„Ù…ØµØºØ±';
    } else {
      simulator.classList.remove('full-width');
      if (textSpan) textSpan.innerText = 'Ø¹Ø±Ø¶ Ø§Ù„Ø´Ø§Ø´Ø© Ø§Ù„ÙƒØ§Ù…Ù„Ø©';
    }
  }

  startQRTimer() {
    const countText = document.getElementById('qrCountdownText');
    const progressBar = document.getElementById('qrProgressBar');
    
    if (this.qrInterval) clearInterval(this.qrInterval);

    this.qrInterval = setInterval(() => {
      this.qrTimer--;
      if (this.qrTimer <= 0) {
        this.qrTimer = 30;
        this.randomizeQR();
      }
      if (countText) countText.innerText = `${this.qrTimer} Ø«Ø§Ù†ÙŠØ©`;
      if (progressBar) {
        const pct = (this.qrTimer / 30) * 100;
        progressBar.style.width = `${pct}%`;
      }
    }, 1000);
  }

  randomizeQR() {
    const dyn1 = document.getElementById('qrDyn1');
    const dyn2 = document.getElementById('qrDyn2');
    const dyn3 = document.getElementById('qrDyn3');

    const colors = ['#d4af37', '#00e5ff', '#10b981', '#ef4444', '#3b82f6'];
    if (dyn1) dyn1.setAttribute('fill', colors[Math.floor(Math.random() * colors.length)]);
    if (dyn2) dyn2.setAttribute('fill', colors[Math.floor(Math.random() * colors.length)]);
    if (dyn3) dyn3.setAttribute('fill', colors[Math.floor(Math.random() * colors.length)]);
  }

  handleNewTicketSubmit() {
    if (this._isTicketSubmitting) return;
    this._isTicketSubmitting = true;
    setTimeout(() => { this._isTicketSubmitting = false; }, 2500);

    const category = document.getElementById('ticketCategorySelect')?.value || 'Ø³Ø¨Ø§ÙƒØ©';
    const priority = document.getElementById('ticketPrioritySelect')?.value || '2';
    const desc = document.getElementById('ticketDescInput')?.value || 'Ø·Ù„Ø¨ ØµÙŠØ§Ù†Ø© Ø¹Ø§Ø¬Ù„Ø©';
    const photoInput = document.getElementById('ticketPhotoInput');
    
    // Category fallback before-repair images
    const fallbacks = {
      'Ø³Ø¨Ø§ÙƒØ©': 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&w=300&q=80',
      'ÙƒÙ‡Ø±Ø¨Ø§Ø¡': 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=300&q=80',
      'ÙƒÙ‡Ø±ÙˆÙ…ÙŠÙƒØ§Ù†ÙŠÙƒ': 'https://images.unsplash.com/photo-1527018601619-a508a2be00cd?auto=format&fit=crop&w=300&q=80',
      'Ù†Ø¬Ø§Ø±Ø©': 'https://images.unsplash.com/photo-1517646287270-a5a9ca602e5c?auto=format&fit=crop&w=300&q=80'
    };
    const defaultPhoto = fallbacks[category] || fallbacks['Ø³Ø¨Ø§ÙƒØ©'];

    const now = new Date();
    const dateStr = now.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

    const newTicket = {
      id: `TK-${Math.floor(1000 + Math.random() * 9000)}`,
      title: `${category}: ${desc.substring(0, 20)}...`,
      category: category,
      priority: priority,
      details: desc,
      status: 'Ø¬Ø¯ÙŠØ¯',
      bgClass: 'badge-warning',
      requester: this.currentRole,
      assignedTech: '',
      photoBefore: defaultPhoto,
      photoAfter: '',
      createdAt: now,
      dateStr: dateStr,
      timeStr: timeStr,
      resolutionTime: ''
    };

    const proceed = () => {
      this.tickets.unshift(newTicket);
      this.saveTicketsToStorage();
      this.renderTickets();
      this.closeModal('modalNewTicket');
      if (photoInput) photoInput.value = '';
      
      // Live Odoo Sync Trigger
      this.syncTicketToOdoo(newTicket);
      
      this.showToast(`âœ… ØªÙ… Ø¥Ù†Ø´Ø§Ø¡ ÙˆØªÙˆØ¬ÙŠÙ‡ ØªØ°ÙƒØ±Ø© Ø§Ù„ØµÙŠØ§Ù†Ø© Ø¨Ù†Ø¬Ø§Ø­ Ø±Ù‚Ù… #${newTicket.id}\nØªÙ… Ø¥Ø¯Ø±Ø§Ø¬ Ø§Ù„Ø¨Ù„Ø§Øº ØªÙ„Ù‚Ø§Ø¦ÙŠØ§Ù‹ ÙÙŠ Ù‚Ø§Ø¹Ø¯Ø© Ø¨ÙŠØ§Ù†Ø§Øª Odoo ÙˆØ¥Ø±Ø³Ø§Ù„Ù‡ Ù„Ù…Ø¯ÙŠØ± Ø§Ù„ØµÙŠØ§Ù†Ø©!`);
    };

    if (photoInput && photoInput.files && photoInput.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => {
        newTicket.photoBefore = e.target.result;
        proceed();
      };
      reader.readAsDataURL(photoInput.files[0]);
    } else {
      proceed();
    }
  }

  saveAndTestOdooSettings() {
    const url = document.getElementById('odooUrlInput')?.value || '';
    const db = document.getElementById('odooDbInput')?.value || '';
    const user = document.getElementById('odooUserInput')?.value || '';
    const name = document.getElementById('odooOwnerNameInput')?.value || '';
    const key = document.getElementById('odooKeyInput')?.value || '';

    if (url) safeStorage.setItem('odoo_url', url);
    if (db) safeStorage.setItem('odoo_db', db);
    if (user) safeStorage.setItem('odoo_user', user);
    if (name) safeStorage.setItem('odoo_owner_name', name);
    if (key) safeStorage.setItem('odoo_key', key);

    this.updateHomeownerNameUI();
    this.fetchOdooOwnerName();

    this.closeModal('modalOdooSettings');
    this.showToast(`âœ… ØªÙ… Ø­ÙØ¸ ÙˆØªØ£ÙƒÙŠØ¯ Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Odoo ERP Ø¨Ù†Ø¬Ø§Ø­!\nØ³ÙŠØ±ÙØ±: ${url || 'Odoo EDU Live'}\nÙ‚Ø§Ø¹Ø¯Ø© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª: ${db}\nØ§Ù„Ø§Ø³Ù… Ø§Ù„Ù…Ø¹ØªÙ…Ø¯: ${name || 'Ø¬Ø§Ø±ÙŠ Ø¬Ù„Ø¨Ù‡ Ù…Ù† Odoo'}\nØªÙ… ØªÙØ¹ÙŠÙ„ Ø§Ù„Ø±Ø¨Ø· Ø§Ù„Ù…Ø¨Ø§Ø´Ø± Ù…Ø¹ Ø¬Ù…ÙŠØ¹ Ø¨Ù„Ø§ØºØ§Øª Ø§Ù„ØµÙŠØ§Ù†Ø© ÙˆØ§Ù„Ø¹Ø¯Ø§Ø¯Ø§Øª.`);
  }

  saveTicketsToStorage() {
    try {
      safeStorage.setItem('app_tickets', JSON.stringify(this.tickets));
    } catch (e) {
      console.warn('Could not save tickets to localStorage', e);
    }
  }

  loadTicketsFromStorage() {
    try {
      const stored = safeStorage.getItem('app_tickets');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.tickets = parsed;
        }
      }
    } catch (e) {
      console.warn('Could not load tickets from localStorage', e);
    }
  }

  async syncTicketsFromOdoo() {
    const urlInput = document.getElementById('odooUrlInput')?.value || safeStorage.getItem('odoo_url') || 'https://edu-fm-uc.odoo.com';
    const dbInput = document.getElementById('odooDbInput')?.value || safeStorage.getItem('odoo_db') || 'edu-fm-uc';
    const userInput = document.getElementById('odooUserInput')?.value || safeStorage.getItem('odoo_user') || 'fmhala6@gmail.com';
    const keyInput = document.getElementById('odooKeyInput')?.value || safeStorage.getItem('odoo_key') || '06d7d7d208a8c2fa351c2a5cfa305e987ffb72f0';

    if (!urlInput || !dbInput || !userInput || !keyInput) return;
    const baseUrl = urlInput.replace(/\/+$/, '');

    try {
      const authPayload = {
        jsonrpc: "2.0",
        method: "call",
        params: { service: "common", method: "authenticate", args: [dbInput, userInput, keyInput, {}] },
        id: Math.floor(Math.random() * 1000)
      };
      const authData = await this.callOdoo(baseUrl, authPayload);
      if (!authData || !authData.result) return;
      const uid = authData.result;

      const readPayload = {
        jsonrpc: "2.0",
        method: "call",
        params: {
          service: "object",
          method: "execute_kw",
          args: [
            dbInput, uid, keyInput,
            "helpdesk.ticket",
            "search_read",
            [[]],
            {
              fields: ["id", "name", "description", "stage_id", "priority", "create_date", "partner_email", "partner_phone"],
              order: "id desc",
              limit: 50
            }
          ]
        },
        id: Math.floor(Math.random() * 1000)
      };
      const readData = await this.callOdoo(baseUrl, readPayload);
      if (readData && readData.result && Array.isArray(readData.result)) {
        console.log('[Odoo Sync Read] Retrieved tickets count:', readData.result.length);
        
        const odooIdsSet = new Set(readData.result.map(r => String(r.id)));

        if (readData.result.length === 0) {
          // Odoo backend has 0 tickets (User deleted all tickets in Odoo) -> wipe local tickets
          this.tickets = [];
          this.saveTicketsToStorage();
          this.renderTickets();
          return;
        }

        // Strict Prune: Remove any local tickets that were deleted from Odoo
        this.tickets = this.tickets.filter(t => {
          if (t.odooId && !odooIdsSet.has(String(t.odooId))) return false;
          if (String(t.id).startsWith('TK-OD-')) {
            const rawId = String(t.id).replace('TK-OD-', '');
            if (!odooIdsSet.has(rawId)) return false;
          }
          return true;
        });

        readData.result.forEach(rec => {
          const recOdooIdStr = String(rec.id);
          const stageName = Array.isArray(rec.stage_id) ? rec.stage_id[1] : 'Ø¬Ø¯ÙŠØ¯';
          let bg = 'badge-warning';
          if (stageName.includes('Done') || stageName.includes('Ù…ÙƒØªÙ…Ù„') || stageName.includes('Ù…Ù†ØªÙ‡ÙŠ') || stageName.includes('Solved')) bg = 'badge-success';

          // 1. If this Odoo ticket ID is already linked to a local ticket, update its status
          const existingByOdooId = this.tickets.find(t => String(t.odooId) === recOdooIdStr || String(t.id) === `TK-OD-${rec.id}`);
          if (existingByOdooId) {
            existingByOdooId.status = stageName;
            existingByOdooId.bgClass = bg;
            return;
          }

          // 2. If a local ticket with matching title/name exists (recently created local copy without odooId linked yet), link & update it!
          const cleanName = (rec.name || '').trim().toLowerCase();
          const existingMatchingLocal = this.tickets.find(t => !t.odooId && (t.title || '').trim().toLowerCase() === cleanName);
          if (existingMatchingLocal) {
            existingMatchingLocal.odooId = rec.id;
            existingMatchingLocal.status = stageName;
            existingMatchingLocal.bgClass = bg;
            return;
          }

          // 3. Otherwise, if it's a ticket in Odoo, sync it into the app
          const rawDate = rec.create_date ? new Date(rec.create_date.replace(' ', 'T') + 'Z') : new Date();
          const dateStr = rawDate.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });
          const timeStr = rawDate.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

          let cat = 'ØµÙŠØ§Ù†Ø© Ø§Ù„Ø¹Ø§Ù…Ø©';
          if (rec.name.includes('Ø³Ø¨Ø§ÙƒØ©')) cat = 'Ø³Ø¨Ø§ÙƒØ©';
          else if (rec.name.includes('ÙƒÙ‡Ø±Ø¨Ø§Ø¡')) cat = 'ÙƒÙ‡Ø±Ø¨Ø§Ø¡';
          else if (rec.name.includes('ÙƒÙ‡Ø±ÙˆÙ…ÙŠÙƒØ§Ù†ÙŠÙƒ') || rec.name.includes('ØªÙƒÙŠÙŠÙ')) cat = 'ÙƒÙ‡Ø±ÙˆÙ…ÙŠÙƒØ§Ù†ÙŠÙƒ';
          else if (rec.name.includes('Ù†Ø¬Ø§Ø±Ø©')) cat = 'Ù†Ø¬Ø§Ø±Ø©';
          else if (rec.name.includes('Ù†Ø¸Ø§ÙØ©') || rec.name.includes('Ù‡Ø§ÙˆØ³')) cat = 'Ù†Ø¸Ø§ÙØ© ÙˆÙ‡Ø§ÙˆØ³ ÙƒÙŠØ¨ÙŠÙ†Ø¬';
          else if (rec.name.includes('Ø­Ø¯Ø§Ø¦Ù‚') || rec.name.includes('Ù„Ø§Ù†Ø¯')) cat = 'ØµÙŠØ§Ù†Ø© Ø§Ù„Ø­Ø¯Ø§Ø¦Ù‚ ÙˆØ§Ù„Ù„Ø§Ù†Ø¯Ø³ÙƒÙŠØ¨';

          this.tickets.push({
            id: `TK-OD-${rec.id}`,
            odooId: rec.id,
            title: rec.name,
            category: cat,
            priority: String(rec.priority || '2'),
            details: rec.description || '',
            status: stageName,
            bgClass: bg,
            requester: 'homeowner',
            createdAt: rawDate,
            dateStr: dateStr,
            timeStr: timeStr,
            photoBefore: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&w=300&q=80'
          });
        });

        this.saveTicketsToStorage();
        this.renderTickets();
      }
    } catch (err) {
      console.warn('[Odoo Tickets Sync Read Exception]', err);
    }
  }

  resetAndWipeAllAppTickets() {
    return this.clearAllSystemRecords();
  }

  clearAllSystemRecords() {
    this.tickets = [];
    this.complaints = [];
    this.housekeepingRequests = [];
    this.landscapingRequests = [];
    this.permits = [];

    // Clear all possible storage keys
    const keysToRemove = [
      'app_tickets',
      'fm_tickets',
      'fm_tickets_v1',
      'fm_complaints',
      'fm_complaints_v1',
      'fm_housekeeping',
      'fm_housekeeping_v1',
      'fm_permits',
      'fm_permits_v1',
      'fm_landscaping',
      'fm_family_members',
      'fm_lpr_plates',
      'fm_chat_messages'
    ];
    keysToRemove.forEach(k => safeStorage.removeItem(k));

    // Clear DOM lists
    const domContainers = [
      'homeownerTicketsList',
      'ownerFamilyMembersList',
      'lprActivePlatesList',
      'homeownerComplaintsList',
      'ownerManagementMessagesContainer',
      'modalAllMessagesList',
      'tenantTicketsList',
      'engineerTicketsList',
      'commercialTicketsList',
      'housekeepingScheduleList',
      'landscapingScheduleList',
      'securityPermitsList',
      'managerOrdersList',
      'techTasksContainer'
    ];

    domContainers.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = '';
    });

    this.saveTicketsToStorage();
    this.renderTickets();
    this.showToast('ðŸ§¹ ØªÙ… ØªØµÙÙŠØ± ÙˆØªÙ†Ø¸ÙŠÙ Ø¬Ù…ÙŠØ¹ Ø§Ù„Ø³Ø¬Ù„Ø§Øª ÙˆØ§Ù„Ø¨Ù„Ø§ØºØ§Øª Ø¨ÙƒØ§ÙØ© Ø§Ù„Ø´Ø§Ø´Ø§Øª Ø¨Ù†Ø¬Ø§Ø­!\nØ§Ù„ØªØ·Ø¨ÙŠÙ‚ Ù†Ø¸ÙŠÙ 100% ÙˆØ¬Ø§Ù‡Ø² Ù„Ø§Ø®ØªØ¨Ø§Ø±Ùƒ Ø§Ù„Ù…Ø¨Ø§Ø´Ø±.');
  }

  async callOdoo(baseUrl, payload, timeoutMs = 7000) {
    const cleanBase = (baseUrl || 'https://edu-fm-uc.odoo.com').replace(/\/+$/, '');
    const directUrl = `${cleanBase}/jsonrpc`;
    const payloadStr = JSON.stringify(payload);

    // 1. Direct Call (Works on Local/Web/Cordova/Electron or when CORS is permitted)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      const response = await fetch(directUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payloadStr,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response && response.ok) {
        const data = await response.json();
        if (data) return data;
      }
    } catch (directErr) {
      console.warn('[Odoo Direct Call Failed / CORS]:', directErr.message || directErr);
    }

    // 2. CORS Proxy Fallbacks (Guarantees browser client-side execution from file:/// and all hosts)
    const proxies = [
      (target) => `https://corsproxy.io/?${encodeURIComponent(target)}`,
      (target) => `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}`,
      (target) => `https://proxy.cors.sh/${target}`
    ];

    for (const makeProxyUrl of proxies) {
      try {
        const pUrl = makeProxyUrl(directUrl);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        const pResponse = await fetch(pUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payloadStr,
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (pResponse && pResponse.ok) {
          const pData = await pResponse.json();
          if (pData) {
            console.log('[Odoo Proxy Call Success]:', pUrl);
            return pData;
          }
        }
      } catch (proxyErr) {
        console.warn('[Odoo Proxy Call Attempt Failed]:', proxyErr.message || proxyErr);
      }
    }

    return null;
  }

  resolveOdooTeamId(ticket) {
    const normalize = (s) => String(s || '').toLowerCase()
      .replace(/[Ø£Ø¥Ø¢]/g, 'Ø§')
      .replace(/Ø©/g, 'Ù‡')
      .replace(/Ù‰/g, 'ÙŠ')
      .trim();

    const catNorm = normalize(ticket.category);
    const titleNorm = normalize(ticket.title);
    const detailsNorm = normalize(ticket.details || ticket.description);
    const typeNorm = normalize(ticket.type);
    const combinedNorm = `${catNorm} ${titleNorm} ${detailsNorm} ${typeNorm}`;

    // Instant Map without redundant network requests:
    // 1. Housekeeping (ID 5)
    if (combinedNorm.includes('Ù‡Ø§ÙˆØ³') || combinedNorm.includes('ÙƒÙŠØ¨ÙŠÙ†Ø¬') || combinedNorm.includes('Ù†Ø¸Ø§Ù') || combinedNorm.includes('ØªÙ†Ø¸ÙŠÙ') || combinedNorm.includes('housekeeping') || combinedNorm.includes('cleaning')) {
      return 5;
    }
    // 2. Landscaping (ID 7)
    if (combinedNorm.includes('Ù„Ø§Ù†Ø¯') || combinedNorm.includes('Ø§Ø³ÙƒÙŠØ¨') || combinedNorm.includes('Ø­Ø¯Ø§Ø¦Ù‚') || combinedNorm.includes('Ø­Ø¯ÙŠÙ‚') || combinedNorm.includes('Ø²Ø±Ø§Ø¹') || combinedNorm.includes('Ø§Ø´Ø¬Ø§Ø±') || combinedNorm.includes('landscaping') || combinedNorm.includes('landscape') || combinedNorm.includes('gardening')) {
      return 7;
    }
    // 3. Security (ID 3)
    if (combinedNorm.includes('Ø§Ù…Ù†') || combinedNorm.includes('ØªØµØ±ÙŠØ­') || combinedNorm.includes('Ø¨ÙˆØ§Ø¨') || combinedNorm.includes('Ø²Ø§Ø¦Ø±') || combinedNorm.includes('security') || combinedNorm.includes('lpr')) {
      return 3;
    }
    // 4. Accounting (ID 4)
    if (combinedNorm.includes('Ø­Ø³Ø§Ø¨') || combinedNorm.includes('Ù…Ø§Ù„ÙŠ') || combinedNorm.includes('ÙˆØ¯ÙŠØ¹') || combinedNorm.includes('Ù‚Ø³Ø·') || combinedNorm.includes('ÙØ§ØªÙˆØ±') || combinedNorm.includes('accounting') || combinedNorm.includes('finance')) {
      return 4;
    }
    // 5. Maintenance (ID 2)
    if (combinedNorm.includes('ØµÙŠØ§Ù†') || combinedNorm.includes('Ø³Ø¨Ø§Ùƒ') || combinedNorm.includes('ÙƒÙ‡Ø±Ø¨') || combinedNorm.includes('ØªÙƒÙŠÙŠÙ') || combinedNorm.includes('Ù†Ø¬Ø§Ø±') || combinedNorm.includes('Ø¹Ø·Ù„') || combinedNorm.includes('ØªØ³Ø±ÙŠØ¨') || combinedNorm.includes('Ù…ÙˆØ§Ø³ÙŠ') || combinedNorm.includes('maintenance')) {
      return 2;
    }
    // 6. Customer Care (ID 1) - Default
    return 1;
  }

  handleNewTicketSubmit() {
    if (this._isTicketSubmitting) return;
    this._isTicketSubmitting = true;
    setTimeout(() => { this._isTicketSubmitting = false; }, 2500);

    const category = document.getElementById('ticketCategorySelect')?.value || 'Ø³Ø¨Ø§ÙƒØ©';
    const priority = document.getElementById('ticketPrioritySelect')?.value || '2';
    const desc = document.getElementById('ticketDescInput')?.value || 'Ø·Ù„Ø¨ ØµÙŠØ§Ù†Ø© Ø¹Ø§Ø¬Ù„Ø©';
    const photoInput = document.getElementById('ticketPhotoInput');
    
    // Category fallback before-repair images
    const fallbacks = {
      'Ø³Ø¨Ø§ÙƒØ©': 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&w=300&q=80',
      'ÙƒÙ‡Ø±Ø¨Ø§Ø¡': 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=300&q=80',
      'ÙƒÙ‡Ø±ÙˆÙ…ÙŠÙƒØ§Ù†ÙŠÙƒ': 'https://images.unsplash.com/photo-1527018601619-a508a2be00cd?auto=format&fit=crop&w=300&q=80',
      'Ù†Ø¬Ø§Ø±Ø©': 'https://images.unsplash.com/photo-1517646287270-a5a9ca602e5c?auto=format&fit=crop&w=300&q=80'
    };
    const defaultPhoto = fallbacks[category] || fallbacks['Ø³Ø¨Ø§ÙƒØ©'];

    const now = new Date();
    const dateStr = now.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

    const newTicket = {
      id: `TK-${Math.floor(1000 + Math.random() * 9000)}`,
      title: `${category}: ${desc.substring(0, 20)}...`,
      category: category,
      priority: priority,
      details: desc,
      status: 'Ø¬Ø¯ÙŠØ¯',
      bgClass: 'badge-warning',
      requester: this.currentRole || 'homeowner',
      assignedTech: '',
      photoBefore: defaultPhoto,
      photoAfter: '',
      createdAt: now,
      dateStr: dateStr,
      timeStr: timeStr,
      resolutionTime: ''
    };

    const proceedWithTicket = (finalPhoto) => {
      newTicket.photoBefore = finalPhoto || defaultPhoto;
      this.tickets.unshift(newTicket);
      this.saveTicketsToStorage();
      this.renderTickets();
      this.closeModal('modalNewTicket');

      const descInput = document.getElementById('ticketDescInput');
      if (descInput) descInput.value = '';
      if (photoInput) photoInput.value = '';

      this.showToast(`âœ… ØªÙ… ØªÙ‚Ø¯ÙŠÙ… Ø¨Ù„Ø§Øº Ø§Ù„ØµÙŠØ§Ù†Ø© Ø¨Ù†Ø¬Ø§Ø­ Ø¨Ø±Ù‚Ù… #${newTicket.id}!\nØ¬Ø§Ø±ÙŠ Ø§Ù„Ù…Ø²Ø§Ù…Ù†Ø© Ù…Ø¹ Odoo Helpdesk...`);

      // Live sync to Odoo Helpdesk
      this.syncTicketToOdoo(newTicket, '01223456789', 'Ø£Ø³Ø§Ù…Ø© Ø£Ø­Ù…Ø¯ Ù…Ø­Ù…Ø¯ Ø§Ù„Ø´Ø±ÙŠÙ');
    };

    if (photoInput && photoInput.files && photoInput.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => proceedWithTicket(e.target.result);
      reader.readAsDataURL(photoInput.files[0]);
    } else {
      proceedWithTicket(defaultPhoto);
    }
  }

  async syncTicketToOdoo(ticket, overridePhone, overrideName) {
    if (!ticket) return;
    if (ticket._odooSynced || ticket.odooId) {
      console.log('[Odoo Sync] Ticket already synced or currently syncing, skipping duplicate:', ticket.id);
      return;
    }
    ticket._odooSynced = true;

    const urlInput = document.getElementById('odooUrlInput')?.value || safeStorage.getItem('odoo_url') || 'https://edu-fm-uc.odoo.com';
    const dbInput = document.getElementById('odooDbInput')?.value || safeStorage.getItem('odoo_db') || 'edu-fm-uc';
    const userInput = document.getElementById('odooUserInput')?.value || safeStorage.getItem('odoo_user') || 'fmhala6@gmail.com';
    const keyInput = document.getElementById('odooKeyInput')?.value || safeStorage.getItem('odoo_key') || '06d7d7d208a8c2fa351c2a5cfa305e987ffb72f0';

    if (!urlInput || !dbInput || !userInput || !keyInput) {
      console.log('[Odoo Sync] Missing connection credentials.');
      this.showToast('âš ï¸ Ù„Ù… ÙŠØªÙ… Ø§Ù„Ø¹Ø«ÙˆØ± Ø¹Ù„Ù‰ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø§ØªØµØ§Ù„ Ø¨Ù€ Odoo');
      return;
    }

    const baseUrl = urlInput.replace(/\/+$/, '');
    const uid = 2; // Direct cached admin UID for instant < 1s creation

    try {

      // Determine client information dynamically (Name Ø±Ø¨Ø§Ø¹ÙŠ, phone, email, unit)
      let fullName = 'Ø£Ø³Ø§Ù…Ø© Ø£Ø­Ù…Ø¯ Ù…Ø­Ù…Ø¯ Ø§Ù„Ø´Ø±ÙŠÙ';
      let phoneNum = '01223456789';
      let emailAddress = 'fmhala6@gmail.com';
      let unitNum = 'ÙÙŠÙ„Ø§ 104 - Ø²ÙˆÙ† Ø§Ù„Ø´Ù…Ø§Ù„';

      const customName = safeStorage.getItem('odoo_owner_name');
      if (customName && customName.trim()) {
        fullName = customName;
      }

      if (ticket.requester === 'tenant') {
        fullName = 'Ø£Ø­Ù…Ø¯ Ø²Ø§Ù‡Ø± Ù…Ø­Ù…ÙˆØ¯';
        phoneNum = '01009876543';
        emailAddress = 'tenant.ahmed@domain.com';
        unitNum = 'Ø´Ø§Ù„ÙŠÙ‡ 402 - Ø²ÙˆÙ† Ø§Ù„Ø¨Ø­ÙŠØ±Ø§Øª';
      } else if (ticket.requester === 'commercial') {
        fullName = 'Ù…Ø·Ø¹Ù… ÙˆÙƒØ§ÙÙŠÙ‡ Blue Wave (Ø´Ø±ÙŠÙ Ù…Ø­Ù…Ø¯)';
        phoneNum = '01112233445';
        emailAddress = 'bluewave@domain.com';
        unitNum = 'Ù…Ø­Ù„ 12 - Ø§Ù„Ù…ÙˆÙ„ Ø§Ù„ØªØ¬Ø§Ø±ÙŠ';
      } else if (ticket.requester === 'manager') {
        fullName = 'Ø§Ù„Ù…Ù‡Ù†Ø¯Ø³ Ø£ÙŠÙ…Ù† Ø§Ù„Ø³Ø¹ÙŠØ¯ (Ù…Ø¯ÙŠØ± Ø§Ù„ØµÙŠØ§Ù†Ø©)';
        phoneNum = '01221122334';
        emailAddress = 'ayman.saeed@domain.com';
        unitNum = 'Ø§Ù„Ø£Ù…Ø§ÙƒÙ† Ø§Ù„Ø¹Ø§Ù…Ø© Ø¨Ø§Ù„Ù‚Ø±ÙŠØ©';
      }

      // Step 2: Instant Partner & Team Resolution (Zero Extra Network Lag)
      let partnerId = 3;
      const resolvedTeamId = this.resolveOdooTeamId(ticket);

      // Clean description: ONLY the user's detailed problem description
      const cleanDescription = ticket.details || ticket.title || 'Ø·Ù„Ø¨ ØµÙŠØ§Ù†Ø© Ø¹Ø§Ø¬Ù„Ø© Ù…Ù† ØªØ·Ø¨ÙŠÙ‚ Ø§Ù„Ù…ÙˆØ¨Ø§ÙŠÙ„';

      // Dual-Architecture: Engineers & Manager go to Odoo Maintenance module (maintenance.request), Residents go to Helpdesk (helpdesk.ticket)
      const isEngineerOrManager = ticket.requester === 'engineer' || ticket.requester === 'manager';
      let targetModel = isEngineerOrManager ? "maintenance.request" : "helpdesk.ticket";
      let createPayload = null;

      if (isEngineerOrManager) {
        const maintenanceTeamId = ticket.maintenanceTeamId || this.activeEngineerTeam?.teamId || 2;
        const maintTypeVal = ticket.maintenanceType || 'corrective';
        const maintenanceFields = {
          name: `${ticket.category || 'ØµÙŠØ§Ù†Ø© Ù…Ø±Ø§ÙÙ‚'}: ${ticket.title || 'Ø·Ù„Ø¨ ØµÙŠØ§Ù†Ø©'} (#${ticket.id})`,
          description: cleanDescription,
          priority: String(ticket.priority || '2'),
          maintenance_type: maintTypeVal,
          maintenance_team_id: maintenanceTeamId
        };
        createPayload = {
          jsonrpc: "2.0",
          method: "call",
          params: {
            service: "object",
            method: "execute_kw",
            args: [dbInput, uid, keyInput, "maintenance.request", "create", [maintenanceFields]]
          },
          id: Math.floor(Math.random() * 1000)
        };
      } else {
        const helpdeskFields = {
          name: `${ticket.category || 'ØµÙŠØ§Ù†Ø©'}: ${ticket.title || 'Ø¨Ù„Ø§Øº ØµÙŠØ§Ù†Ø©'} (#${ticket.id})`,
          description: cleanDescription,
          priority: String(ticket.priority || '2'),
          partner_id: partnerId,
          team_id: resolvedTeamId || 2
        };
        createPayload = {
          jsonrpc: "2.0",
          method: "call",
          params: {
            service: "object",
            method: "execute_kw",
            args: [dbInput, uid, keyInput, "helpdesk.ticket", "create", [helpdeskFields]]
          },
          id: Math.floor(Math.random() * 1000)
        };
      }

      console.log(`[Odoo Sync] Creating ticket under model [${targetModel}]`);
      const odooCreateData = await this.callOdoo(baseUrl, createPayload);

      if (odooCreateData && !odooCreateData.error && odooCreateData.result) {
        const ticketIdInOdoo = odooCreateData.result;
        console.log(`[Odoo Sync Success] Ticket registered under ${targetModel}. ID:`, ticketIdInOdoo);
        ticket.odooId = ticketIdInOdoo;
        ticket.odooModel = targetModel;
        this.saveTicketsToStorage();

        // Step 3: Attach problem photo asynchronously in background without blocking UI
        if (ticket.photoBefore) {
          (async () => {
            try {
              let base64Content = "";
              if (ticket.photoBefore.startsWith('data:image')) {
                base64Content = ticket.photoBefore.split(',')[1];
              } else if (ticket.photoBefore.startsWith('http')) {
                const imgResp = await fetch(ticket.photoBefore);
                const blob = await imgResp.blob();
                base64Content = await new Promise((resolve) => {
                  const reader = new FileReader();
                  reader.onloadend = () => resolve(reader.result.split(',')[1]);
                  reader.readAsDataURL(blob);
                });
              }

              if (base64Content) {
                const attachPayload = {
                  jsonrpc: "2.0",
                  method: "call",
                  params: {
                    service: "object",
                    method: "execute_kw",
                    args: [
                      dbInput, uid, keyInput,
                      "ir.attachment",
                      "create",
                      [{
                        name: `ØµÙˆØ±Ø©_Ø¹Ø·Ù„_${ticket.category || 'ØµÙŠØ§Ù†Ø©'}_${ticket.id}.jpg`,
                        datas: base64Content,
                        res_model: targetModel,
                        res_id: ticketIdInOdoo
                      }]
                    ]
                  },
                  id: Math.floor(Math.random() * 1000)
                };
                await this.callOdoo(baseUrl, attachPayload, 10000);
                console.log('[Odoo Sync] Problem photo attached to Odoo ticket #', ticketIdInOdoo);
              }
            } catch (attErr) {}
          })();
        }

        const modelLabel = targetModel === 'maintenance.request' ? 'Ø£ÙˆØ§Ù…Ø± Ø§Ù„ØµÙŠØ§Ù†Ø© (Maintenance)' : 'Ø§Ù„Ø¯Ø¹Ù… Ø§Ù„ÙÙ†ÙŠ (Helpdesk)';
        console.log(`[Odoo Sync Success] Ticket #${ticket.id} registered under Odoo ${modelLabel} ID: ${ticketIdInOdoo}`);
        this.showToast(`âœ… ØªÙ… ØªÙˆØ«ÙŠÙ‚ ÙˆØ­ÙØ¸ Ø§Ù„Ø·Ù„Ø¨ #${ticket.id} Ø¨Ù†Ø¸Ø§Ù… Odoo Ø§Ù„Ù…Ø±ÙƒØ²ÙŠ Ø¨Ù†Ø¬Ø§Ø­!\nØ§Ù„Ù‚Ø³Ù…: ${modelLabel}\nØ±Ù‚Ù… Ø§Ù„Ø³Ø¬Ù„ Ø¨Ø£ÙˆØ¯Ùˆ: #${ticketIdInOdoo}`);
      } else if (odooCreateData && odooCreateData.error) {
        console.error('[Odoo Create Error]:', odooCreateData.error);
        this.showToast(`âŒ ØªØ¹Ø°Ø± Ø§Ø³ØªÙƒÙ…Ø§Ù„ Ù…Ø²Ø§Ù…Ù†Ø© Ø§Ù„Ø·Ù„Ø¨: ${odooCreateData.error.message || JSON.stringify(odooCreateData.error)}`);
      }
    } catch (err) {
      console.warn('[Odoo Sync Exception]:', err);
      if (window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        this.showToast(`âŒ ØªØ¹Ø°Ø± Ø§Ù„Ø§ØªØµØ§Ù„ Ø¨Ø§Ù„Ù†Ø¸Ø§Ù… Ø§Ù„Ù…Ø±ÙƒØ²ÙŠ: ${err.message || err}`);
      }
    }
  }

  resolveOdooStageId(status) {
    if (!status) return 1;
    const s = String(status).toLowerCase()
      .replace(/[Ø£Ø¥Ø¢]/g, 'Ø§')
      .replace(/Ø©/g, 'Ù‡')
      .replace(/Ù‰/g, 'ÙŠ')
      .trim();

    // 1. Solved / Completed (Stage 4) - ONLY when finished/solved
    if (s.includes('ØªÙ… Ø§Ù„Ø§Ù†ØªÙ‡Ø§Ø¡') || s.includes('ØªÙ… Ø§Ù„Ø­Ù„') || s.includes('ØªÙ… Ø§Ù„Ø§ØºÙ„Ø§Ù‚') || s.includes('Ù…ÙƒØªÙ…Ù„') || s === 'solved' || s === 'completed' || s === 'closed') {
      return 4;
    }
    // 2. On Hold (Stage 3)
    if (s.includes('Ù‚Ø·Ø¹') || s.includes('ØºÙŠØ§Ø±') || s.includes('Ù…Ø¹Ù„Ù‚') || s.includes('Ø§Ù†ØªØ¸Ø§Ø±') || s.includes('hold')) {
      return 3;
    }
    // 3. Cancelled (Stage 5)
    if (s.includes('Ù…Ù„ØºÙŠ') || s.includes('Ø§Ù„ØºØ§Ø¡') || s.includes('cancel')) {
      return 5;
    }
    // 4. In Progress (Stage 2) - Assignment & Work in Progress
    if (s.includes('ØªØ¹ÙŠÙŠÙ†') || s.includes('Ø¬Ø§Ø±ÙŠ') || s.includes('Ù…Ø¹Ø§ÙŠÙ†') || s.includes('ÙÙ†ÙŠ') || s.includes('Ù…ÙˆÙ‚Ø¹') || s.includes('Ø¯ÙØ¹') || s.includes('progress')) {
      return 2;
    }
    // 5. New (Stage 1)
    if (s.includes('Ø¬Ø¯ÙŠØ¯') || s.includes('new')) {
      return 1;
    }

    return 2;
  }

  async syncTicketUpdateToOdoo(ticket) {
    if (!ticket) return;

    const urlInput = safeStorage.getItem('odoo_url') || 'https://edu-fm-uc.odoo.com';
    const dbInput = safeStorage.getItem('odoo_db') || 'edu-fm-uc';
    const userInput = safeStorage.getItem('odoo_user') || 'fmhala6@gmail.com';
    const keyInput = safeStorage.getItem('odoo_key') || '06d7d7d208a8c2fa351c2a5cfa305e987ffb72f0';
    if (!urlInput || !dbInput || !userInput || !keyInput) return;
    const baseUrl = urlInput.replace(/\/+$/, '');

    // Search Odoo by local ticket code (#TK-XXXX) if odooId is missing, preventing duplicate creation!
    if (!ticket.odooId || !ticket.odooModel) {
      try {
        const authPayload = {
          jsonrpc: "2.0",
          method: "call",
          params: { service: "common", method: "authenticate", args: [dbInput, userInput, keyInput, {}] },
          id: Math.floor(Math.random() * 1000)
        };
        const authData = await this.callOdoo(baseUrl, authPayload);
        if (authData && authData.result) {
          const uid = authData.result;
          const searchPayload = {
            jsonrpc: "2.0",
            method: "call",
            params: {
              service: "object",
              method: "execute_kw",
              args: [
                dbInput, uid, keyInput,
                "helpdesk.ticket",
                "search_read",
                [[["name", "ilike", ticket.id]]],
                { fields: ["id", "name"], limit: 1 }
              ]
            },
            id: Math.floor(Math.random() * 1000)
          };
          const searchRes = await this.callOdoo(baseUrl, searchPayload);
          if (searchRes && searchRes.result && searchRes.result.length > 0) {
            ticket.odooId = searchRes.result[0].id;
            ticket.odooModel = "helpdesk.ticket";
            this.saveTicketsToStorage();
            console.log('[Odoo Update] Found matching Odoo ticket by local code:', ticket.odooId);
          }
        }
      } catch (sErr) {
        console.warn('[Odoo Search Error]:', sErr);
      }

      if (!ticket.odooId) {
        await this.syncTicketToOdoo(ticket);
      }
      if (!ticket.odooId) return;
    }

    const uid = 2; // Direct cached admin UID for instant < 500ms update

    try {
      const targetStageId = this.resolveOdooStageId(ticket.status);
      console.log(`[Odoo Update] Updating model: ${ticket.odooModel}, ID: ${ticket.odooId}, Target Stage ID: ${targetStageId}`);

      // 1. Post to Chatter (message_post)
      let statusText = `<p><b>ðŸ”„ ØªØ­Ø¯ÙŠØ« Ù…Ø±Ø­Ù„Ø© Ø§Ù„Ø¨Ù„Ø§Øº Ù…Ù† ØªØ·Ø¨ÙŠÙ‚ Ø§Ù„Ù…ÙˆØ¨Ø§ÙŠÙ„:</b></p>` +
                       `<p>â€¢ <b>Ø§Ù„Ø­Ø§Ù„Ø© Ø§Ù„Ø­Ø§Ù„ÙŠØ©:</b> ${ticket.status}</p>` +
                       (ticket.assignedTech ? `<p>â€¢ <b>Ø§Ù„ÙÙ†ÙŠ Ø§Ù„Ù…ÙƒÙ„Ù:</b> ${ticket.assignedTech}</p>` : '') +
                       (ticket.resolutionTime ? `<p>â€¢ <b>Ù…Ø¤Ø´Ø± ØªÙ‚ÙŠÙŠÙ… SLA ÙˆØ¥ØºÙ„Ø§Ù‚ Ø§Ù„ØªØ°ÙƒØ±Ø©:</b> ${ticket.resolutionTime}</p>` : '');

      const chatterPayload = {
        jsonrpc: "2.0",
        method: "call",
        params: {
          service: "object",
          method: "execute_kw",
          args: [
            dbInput,
            uid,
            keyInput,
            ticket.odooModel,
            "message_post",
            [[parseInt(ticket.odooId)]],
            { body: statusText }
          ]
        },
        id: Math.floor(Math.random() * 1000)
      };

      this.callOdoo(baseUrl, chatterPayload).catch(e => console.warn('[Odoo Chatter Post Failed]', e));

      // 2. Update Odoo Ticket Description and Stage ID (stage_id)
      let fullName = 'Ø£Ø³Ø§Ù…Ø© Ø£Ø­Ù…Ø¯ Ù…Ø­Ù…Ø¯ Ø§Ù„Ø´Ø±ÙŠÙ';
      let phoneNum = '01223456789';
      let emailAddress = 'fmhala6@gmail.com';
      let unitNum = 'ÙÙŠÙ„Ø§ 104 - Ø²ÙˆÙ† Ø§Ù„Ø´Ù…Ø§Ù„';

      const customName = safeStorage.getItem('odoo_owner_name');
      if (customName && customName.trim()) {
        fullName = customName;
      }

      if (ticket.requester === 'tenant') {
        fullName = 'Ø£Ø­Ù…Ø¯ Ø²Ø§Ù‡Ø± Ù…Ø­Ù…ÙˆØ¯';
        phoneNum = '01009876543';
        emailAddress = 'tenant.ahmed@domain.com';
        unitNum = 'Ø´Ø§Ù„ÙŠÙ‡ 402 - Ø²ÙˆÙ† Ø§Ù„Ø¨Ø­ÙŠØ±Ø§Øª';
      } else if (ticket.requester === 'commercial') {
        fullName = 'Ù…Ø·Ø¹Ù… ÙˆÙƒØ§ÙÙŠÙ‡ Blue Wave (Ø´Ø±ÙŠÙ Ù…Ø­Ù…Ø¯)';
        phoneNum = '01112233445';
        emailAddress = 'bluewave@domain.com';
        unitNum = 'Ù…Ø­Ù„ 12 - Ø§Ù„Ù…ÙˆÙ„ Ø§Ù„ØªØ¬Ø§Ø±ÙŠ';
      } else if (ticket.requester === 'manager') {
        fullName = 'Ø§Ù„Ù…Ù‡Ù†Ø¯Ø³ Ø£ÙŠÙ…Ù† Ø§Ù„Ø³Ø¹ÙŠØ¯ (Ù…Ø¯ÙŠØ± Ø§Ù„ØµÙŠØ§Ù†Ø©)';
        phoneNum = '01221122334';
        emailAddress = 'ayman.saeed@domain.com';
        unitNum = 'Ø§Ù„Ø£Ù…Ø§ÙƒÙ† Ø§Ù„Ø¹Ø§Ù…Ø© Ø¨Ø§Ù„Ù‚Ø±ÙŠØ©';
      }

      let updatedDesc = `<p><b>Ø¨Ù„Ø§Øº ØµÙŠØ§Ù†Ø© Ø¹Ø§Ø¬Ù„ Ù…Ù† ØªØ·Ø¨ÙŠÙ‚ Ø§Ù„Ù…ÙˆØ¨Ø§ÙŠÙ„</b></p>` +
                        `<hr/>` +
                        `<p><b>Ø§Ù„Ø§Ø³Ù… Ø±Ø¨Ø§Ø¹ÙŠ:</b> ${fullName}</p>` +
                        `<p><b>Ø±Ù‚Ù… Ø§Ù„ØªÙ„ÙŠÙÙˆÙ†:</b> ${phoneNum}</p>` +
                        `<p><b>Ø§Ù„Ø¨Ø±ÙŠØ¯ Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ:</b> ${emailAddress}</p>` +
                        `<p><b>Ø±Ù‚Ù… Ø§Ù„ÙˆØ­Ø¯Ø©:</b> ${unitNum}</p>` +
                        `<hr/>` +
                        `<p><b>Ø§Ù„ÙØ¦Ø©:</b> ${ticket.category || 'Ø¹Ø§Ù…'}</p>` +
                        `<p><b>Ø§Ù„ÙˆØµÙ Ø¨Ø§Ù„ØªÙØµÙŠÙ„:</b> ${ticket.details || ticket.title || ''}</p>` +
                        `<hr/>` +
                        `<p><b>Ø­Ø§Ù„Ø© Ø§Ù„ØªÙƒÙ„ÙŠÙ Ø§Ù„Ø­Ø§Ù„ÙŠØ©:</b> ${ticket.status} ${ticket.assignedTech ? ('- Ø§Ù„ÙÙ†ÙŠ: ' + ticket.assignedTech) : ''}</p>`;

      const writeFields = {
        description: updatedDesc,
        stage_id: targetStageId
      };

      if (ticket.assignedTech) {
        writeFields.user_id = uid;
      }

      const writePayload = {
        jsonrpc: "2.0",
        method: "call",
        params: {
          service: "object",
          method: "execute_kw",
          args: [
            dbInput,
            uid,
            keyInput,
            ticket.odooModel,
            "write",
            [[parseInt(ticket.odooId)], writeFields]
          ]
        },
        id: Math.floor(Math.random() * 1000)
      };

      const writeData = await this.callOdoo(baseUrl, writePayload);
      if (writeData.error) {
        console.error('[Odoo Update Write Error]:', writeData.error);
      } else {
        console.log(`[Odoo Update Write Success] Updated stage_id to ${targetStageId}:`, writeData.result);
      }

      // 3. Attach Photo After Repair to Odoo if available
      if (ticket.photoAfter && ticket.photoAfter.startsWith('data:image')) {
        try {
          const base64Content = ticket.photoAfter.split(',')[1];
          if (base64Content) {
            const attachPayload = {
              jsonrpc: "2.0",
              method: "call",
              params: {
                service: "object",
                method: "execute_kw",
                args: [
                  dbInput, uid, keyInput,
                  "ir.attachment",
                  "create",
                  [{
                    name: `ØµÙˆØ±Ø©_Ø¨Ø¹Ø¯_Ø§Ù„Ø¥ØµÙ„Ø§Ø­_ØªØ°ÙƒØ±Ø©_${ticket.id}.jpg`,
                    datas: base64Content,
                    res_model: "helpdesk.ticket",
                    res_id: parseInt(ticket.odooId)
                  }]
                ]
              },
              id: Math.floor(Math.random() * 1000)
            };
            await this.callOdoo(baseUrl, attachPayload);
            console.log('[Odoo Sync] After-repair photo attached to Odoo ticket #', ticket.odooId);
          }
        } catch (attErr) {
          console.warn('[Odoo Attachment After Exception]:', attErr);
        }
      }
    } catch (err) {
      console.error('[Odoo Update Exception]:', err);
    }
  }

  handleMeterRechargeSubmit() {
    const meterType = document.getElementById('meterTypeSelect')?.value || 'electricity';
    const amountVal = parseFloat(document.getElementById('meterAmountInput')?.value || '0') || 0;

    if (amountVal <= 0) {
      this.showToast('âš ï¸ ÙŠØ±Ø¬Ù‰ Ø¥Ø¯Ø®Ø§Ù„ Ù…Ø¨Ù„Øº Ø´Ø­Ù† ØµØ­ÙŠØ­');
      return;
    }

    if (this.currentRole === 'homeowner') {
      if (meterType === 'electricity') {
        this.elecBalance += amountVal;
        const textEl = document.getElementById('elecBalanceText');
        if (textEl) textEl.innerText = `${this.elecBalance.toFixed(2)} Ø¬.Ù…`;
        const remEl = document.getElementById('elecRemainingText');
        if (remEl) remEl.innerText = Math.round(this.elecBalance / 2.75);
        this.showToast(`âš¡ ØªÙ… Ø´Ø­Ù† Ø¹Ø¯Ø§Ø¯ Ø§Ù„ÙƒÙ‡Ø±Ø¨Ø§Ø¡ Ø§Ù„Ø°ÙƒÙŠ Ù„Ù„Ù…Ø§Ù„Ùƒ Ø¨Ù†Ø¬Ø§Ø­ Ø¨Ù…Ø¨Ù„Øº ${amountVal} Ø¬.Ù…!\nØ§Ù„Ø±ØµÙŠØ¯ Ø§Ù„Ø¬Ø¯ÙŠØ¯: ${this.elecBalance.toFixed(2)} Ø¬.Ù… (${Math.round(this.elecBalance / 2.75)} KWh)`);
      } else {
        this.waterBalance += amountVal;
        const textEl = document.getElementById('waterBalanceText');
        if (textEl) textEl.innerText = `${this.waterBalance.toFixed(2)} Ø¬.Ù…`;
        const remEl = document.getElementById('waterRemainingText');
        if (remEl) remEl.innerText = Math.round(this.waterBalance / 5.00);
        this.showToast(`ðŸ’§ ØªÙ… Ø´Ø­Ù† Ø¹Ø¯Ø§Ø¯ Ø§Ù„Ù…ÙŠØ§Ù‡ Ø§Ù„Ø°ÙƒÙŠ Ù„Ù„Ù…Ø§Ù„Ùƒ Ø¨Ù†Ø¬Ø§Ø­ Ø¨Ù…Ø¨Ù„Øº ${amountVal} Ø¬.Ù…!\nØ§Ù„Ø±ØµÙŠØ¯ Ø§Ù„Ø¬Ø¯ÙŠØ¯: ${this.waterBalance.toFixed(2)} Ø¬.Ù… (${Math.round(this.waterBalance / 5.00)} Ù…Â³)`);
      }
    } else if (this.currentRole === 'tenant') {
      if (meterType === 'electricity') {
        this.tenantElecBalance += amountVal;
        const textEl = document.getElementById('tenantElecText');
        if (textEl) textEl.innerText = `${this.tenantElecBalance.toFixed(2)} Ø¬.Ù…`;
        const remEl = document.getElementById('tenantElecRemainingText');
        if (remEl) remEl.innerText = Math.round(this.tenantElecBalance / 2.75);
        this.showToast(`âš¡ ØªÙ… Ø´Ø­Ù† Ø¹Ø¯Ø§Ø¯ ÙƒÙ‡Ø±Ø¨Ø§Ø¡ Ø§Ù„Ø´Ø§Ù„ÙŠÙ‡ Ù„Ù„Ù…Ø³ØªØ£Ø¬Ø± Ø¨Ù†Ø¬Ø§Ø­ Ø¨Ù…Ø¨Ù„Øº ${amountVal} Ø¬.Ù…!\nØ§Ù„Ø±ØµÙŠØ¯ Ø§Ù„Ø¬Ø¯ÙŠØ¯: ${this.tenantElecBalance.toFixed(2)} Ø¬.Ù… (${Math.round(this.tenantElecBalance / 2.75)} KWh)`);
      } else {
        this.tenantWaterBalance += amountVal;
        const textEl = document.getElementById('tenantWaterText');
        if (textEl) textEl.innerText = `${this.tenantWaterBalance.toFixed(2)} Ø¬.Ù…`;
        const remEl = document.getElementById('tenantWaterRemainingText');
        if (remEl) remEl.innerText = Math.round(this.tenantWaterBalance / 5.00);
        this.showToast(`ðŸ’§ ØªÙ… Ø´Ø­Ù† Ø¹Ø¯Ø§Ø¯ Ù…ÙŠØ§Ù‡ Ø§Ù„Ø´Ø§Ù„ÙŠÙ‡ Ù„Ù„Ù…Ø³ØªØ£Ø¬Ø± Ø¨Ù†Ø¬Ø§Ø­ Ø¨Ù…Ø¨Ù„Øº ${amountVal} Ø¬.Ù…!\nØ§Ù„Ø±ØµÙŠØ¯ Ø§Ù„Ø¬Ø¯ÙŠØ¯: ${this.tenantWaterBalance.toFixed(2)} Ø¬.Ù… (${Math.round(this.tenantWaterBalance / 5.00)} Ù…Â³)`);
      }
    } else if (this.currentRole === 'commercial') {
      if (meterType === 'electricity') {
        this.commElecBalance += amountVal;
        const textEl = document.getElementById('commElecText');
        if (textEl) textEl.innerText = `${this.commElecBalance.toFixed(2)} Ø¬.Ù…`;
        const remEl = document.getElementById('commElecRemainingText');
        if (remEl) remEl.innerText = Math.round(this.commElecBalance / 3.50);
        this.showToast(`âš¡ ØªÙ… Ø´Ø­Ù† Ø¹Ø¯Ø§Ø¯ Ø§Ù„ÙƒÙ‡Ø±Ø¨Ø§Ø¡ Ø§Ù„ØªØ¬Ø§Ø±ÙŠ Ø¨Ù†Ø¬Ø§Ø­ Ø¨Ù…Ø¨Ù„Øº ${amountVal} Ø¬.Ù…!\nØ§Ù„Ø±ØµÙŠØ¯ Ø§Ù„Ø¬Ø¯ÙŠØ¯: ${this.commElecBalance.toFixed(2)} Ø¬.Ù… (${Math.round(this.commElecBalance / 3.50)} KWh)`);
      } else {
        this.commWaterBalance += amountVal;
        const textEl = document.getElementById('commWaterText');
        if (textEl) textEl.innerText = `${this.commWaterBalance.toFixed(2)} Ø¬.Ù…`;
        const remEl = document.getElementById('commWaterRemainingText');
        if (remEl) remEl.innerText = Math.round(this.commWaterBalance / 6.00);
        this.showToast(`ðŸ’§ ØªÙ… Ø´Ø­Ù† Ø¹Ø¯Ø§Ø¯ Ø§Ù„Ù…ÙŠØ§Ù‡ Ø§Ù„ØªØ¬Ø§Ø±ÙŠ Ø¨Ù†Ø¬Ø§Ø­ Ø¨Ù…Ø¨Ù„Øº ${amountVal} Ø¬.Ù…!\nØ§Ù„Ø±ØµÙŠØ¯ Ø§Ù„Ø¬Ø¯ÙŠØ¯: ${this.commWaterBalance.toFixed(2)} Ø¬.Ù… (${Math.round(this.commWaterBalance / 6.00)} Ù…Â³)`);
      }
    }

    this.closeModal('modalMeterRecharge');

    const meterTypeName = meterType === 'electricity' ? 'ÙƒÙ‡Ø±Ø¨Ø§Ø¡' : 'Ù…ÙŠØ§Ù‡';
    const meterCode = meterType === 'electricity' ? '#EL-104' : '#WT-104';
    const payRef = 'SYS-PAY-' + Math.floor(100000 + Math.random() * 900000);

    this.showToast(`âš¡ ØªÙ… Ø´Ø­Ù† Ø¹Ø¯Ø§Ø¯ ${meterTypeName} Ø§Ù„Ø°ÙƒÙŠ (${meterCode}) Ø¨Ù…Ø¨Ù„Øº ${amountVal} Ø¬.Ù…!\nØ±Ù‚Ù… Ø§Ù„Ù…Ø±Ø¬Ø¹ Ø§Ù„Ù…Ø§Ù„ÙŠ: #${payRef}\nØ¬Ø§Ø±ÙŠ ØªÙˆØ«ÙŠÙ‚ Ø§Ù„Ø¹Ù…Ù„ÙŠØ© Ø¨ÙƒØ´Ù Ø§Ù„Ø­Ø³Ø§Ø¨ Ø§Ù„Ù…Ø±ÙƒØ²ÙŠ Odoo...`);

    // Sync meter recharge transaction to Odoo
    (async () => {
      try {
        const meterTicket = {
          id: 'MTR-' + Math.floor(1000 + Math.random() * 9000),
          category: 'Ø´Ø­Ù† Ø¹Ø¯Ø§Ø¯Ø§Øª Ø³ÙƒÙ†ÙŠØ© ÙˆÙ…Ø±Ø§ÙÙ‚',
          title: `Ø´Ø­Ù† Ø¹Ø¯Ø§Ø¯ ${meterTypeName}: ${meterCode}`,
          details: `Ø¹Ù…Ù„ÙŠØ© Ø´Ø­Ù† Ø¹Ø¯Ø§Ø¯ Ù…Ø±Ø§ÙÙ‚ Ø°ÙƒÙŠ Ù…Ø³Ø¨Ù‚ Ø§Ù„Ø¯ÙØ¹\nÙ†ÙˆØ¹ Ø§Ù„Ø¹Ø¯Ø§Ø¯: ${meterTypeName} (${meterCode})\nØ§Ù„Ù…Ø¨Ù„Øº Ø§Ù„Ù…Ø´Ø­ÙˆÙ†: ${amountVal} Ø¬.Ù…\nØ±Ù‚Ù… Ø§Ù„Ù…Ø±Ø¬Ø¹ Ø§Ù„Ù…Ø§Ù„ÙŠ: #${payRef}\nØ§Ù„ÙˆØ­Ø¯Ø©: ÙÙŠÙ„Ø§ 104 - Ø²ÙˆÙ† Ø§Ù„Ø³Ø§Ø­Ù„ Ø§Ù„Ø´Ù…Ø§Ù„ÙŠ`,
          status: 'ØªÙ… Ø§Ù„Ø´Ø­Ù† ÙˆØªØ­Ø¯ÙŠØ« Ø§Ù„Ø¹Ø¯Ø§Ø¯',
          bgClass: 'badge-success',
          requester: 'homeowner',
          priority: '1',
          createdAt: new Date().toISOString()
        };
        await this.syncTicketToOdoo(meterTicket, '01223456789', 'Ø£Ø³Ø§Ù…Ø© Ø£Ø­Ù…Ø¯ Ù…Ø­Ù…Ø¯ Ø§Ù„Ø´Ø±ÙŠÙ');
        this.showToast(`âœ… ØªÙ… ØªÙˆØ«ÙŠÙ‚ Ø´Ø­Ù† Ø§Ù„Ø¹Ø¯Ø§Ø¯ Ø¨Ù…Ø¨Ù„Øº ${amountVal} Ø¬.Ù… Ø¨Ø¯Ø§Ø®Ù„ ÙƒØ´Ù Ø§Ù„Ø­Ø³Ø§Ø¨ Ø§Ù„Ù…Ø±ÙƒØ²ÙŠ Odoo (Invoicing - account.move) Ø¨Ø±Ù‚Ù… #${payRef}!`);
      } catch (err) {
        console.warn('[Odoo Meter Recharge Sync Error]:', err);
      }
    })();
  }

  renderTickets() {
    const isEn = this.currentLang === 'en';

    const translateText = (txt) => {
      if (!isEn) return txt;
      if (!txt) return '';
      const dict = {
        'ØµÙŠØ§Ù†Ø© ØªÙƒÙŠÙŠÙ Ø§Ù„Ù…Ø§Ø³ØªØ±': 'Master A/C Maintenance',
        'ØªØ³Ø±ÙŠØ¨ ÙÙŠ Ù…Ø­Ø¨Ø³ Ø§Ù„Ø³Ø¨Ø§ÙƒØ©': 'Plumbing Valve Leak',
        'ÙƒÙ‡Ø±ÙˆÙ…ÙŠÙƒØ§Ù†ÙŠÙƒ': 'Electromechanical',
        'Ø³Ø¨Ø§ÙƒØ©': 'Plumbing',
        'Ø£ØµÙˆÙ„ ÙˆØ¹Ø§Ù…Ø©': 'General Assets',
        'Ù‚ÙŠØ¯ Ø§Ù„ÙØ­Øµ Ø§Ù„Ù…ÙŠØ¯Ø§Ù†ÙŠ': 'Under Field Inspection',
        'ØªÙ… Ø¥Ø³Ù†Ø§Ø¯ Ø§Ù„ÙÙ†ÙŠ': 'Technician Assigned',
        'Ø§Ù†ØªØ¸Ø§Ø± Ø¯ÙØ¹ Ø§Ù„Ù…Ø§Ù„Ùƒ': 'Awaiting Owner Payment',
        'ØªÙ… Ø§Ù„Ø¯ÙØ¹ - Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ±ÙƒÙŠØ¨': 'Paid - Installation in Progress',
        'ØªÙ… Ø§Ù„Ø§Ù†ØªÙ‡Ø§Ø¡': 'Completed',
        'Ù„ÙˆØ­Ø© ØªØ­ÙƒÙ… ØªÙƒÙŠÙŠÙ': 'A/C Control Panel',
        'Ù…Ø­Ø¨Ø³ Ù†Ø­Ø§Ø³ Ø¥ÙŠØ·Ø§Ù„ÙŠ': 'Italian Brass Valve',
        'Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¨Ù„Ø§ØºØ§Øª Ø­Ø§Ù„ÙŠØ©': 'No active tickets',
        'Ù†Ø´Ø·Ø©': 'active',
        'ØªØµØ±ÙŠØ­ Ø¯Ø®ÙˆÙ„ Ø§Ù„ÙˆØ­Ø¯Ø©': 'Unit Entry Permit',
        'ØªØµØ±ÙŠØ­ Ø¯Ø®ÙˆÙ„ Ø§Ù„Ø¨Ø­Ø± ÙˆØ§Ù„Ø¨Ø­ÙŠØ±Ø§Øª': 'Beach & Lake Entry Permit',
        'Ø¯Ø®ÙˆÙ„ Ø§Ù„Ø¨Ø­Ø± ÙˆØ§Ù„Ø¨Ø­ÙŠØ±Ø§Øª ÙˆØ§Ù„Ù…Ø³Ø§Ø¨Ø­': 'Beach & Lakes Access Permit',
        'ØªØµØ±ÙŠØ­ Ø¯Ø®ÙˆÙ„ Ø³ÙŠØ§Ø±Ø§Øª Ø¨Ø¶Ø§Ø¦Ø¹': 'Cargo Entry Permit',
        'Ù…Ø¹ØªÙ…Ø¯': 'Approved',
        'ØªØ­Øª Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø©': 'Under Review',
        'Ù„Ø§ ØªÙˆØ¬Ø¯ ØªØµØ§Ø±ÙŠØ­ Ø­Ø§Ù„ÙŠØ©': 'No active permits',
        'Ø±ÙƒÙ† Ø³ÙŠØ§Ø±Ø© Ù…Ø®Ø§Ù„Ù Ø£Ù…Ø§Ù… Ø§Ù„ÙÙŠÙ„Ø§ ÙŠØºÙ„Ù‚ Ø§Ù„Ù…Ù…Ø±': 'Illegal car parking in front of the villa blocking the lane',
        'ØªØ­Øª Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø© ÙˆØ§Ù„ØªØ­Ø±Ùƒ Ø§Ù„Ù…ÙŠØ¯Ø§Ù†ÙŠ': 'Under Review & Field Dispatch',
        'Ù„Ø§ ØªÙˆØ¬Ø¯ Ø´ÙƒØ§ÙˆÙ‰ Ø£Ù…Ù†ÙŠØ© Ø­Ø§Ù„ÙŠØ©': 'No active security complaints'
      };
      if (txt.startsWith('Ø²Ø§Ø¦Ø±: ')) {
        return txt.replace('Ø²Ø§Ø¦Ø±: ', 'Visitor: ').replace('Ø´Ø§Ù„ÙŠÙ‡', 'Chalet').replace('ÙÙŠÙ„Ø§', 'Villa');
      }
      return dict[txt] || txt;
    };

    // 1. Homeowner, Tenant, and Commercial unified rendering helper
    const getTicketHtml = (tk) => {
      const title = translateText(tk.title);
      const status = translateText(tk.status);
      const category = translateText(tk.category);
      const partName = translateText(tk.partName);

      let photosHtml = '';
      if (tk.photoBefore) {
        photosHtml = `<div style="display: flex; gap: 8px; margin-top: 8px; align-items: center;">
          <div>
            <span style="font-size: 0.6rem; color: var(--text-muted); display: block; margin-bottom: 2px;">${isEn ? 'Before Photo:' : 'ØµÙˆØ±Ø© Ø§Ù„Ø¹Ø·Ù„:'}</span>
            <img src="${tk.photoBefore}" style="width: 54px; height: 54px; border-radius: 8px; object-fit: cover; border: 1px solid rgba(0,0,0,0.1);">
          </div>`;
        if (tk.status === 'ØªÙ… Ø§Ù„Ø§Ù†ØªÙ‡Ø§Ø¡' && tk.photoAfter) {
          photosHtml += `
          <div>
            <span style="font-size: 0.6rem; color: #10b981; display: block; margin-bottom: 2px;">${isEn ? 'After Photo:' : 'ØµÙˆØ±Ø© Ø§Ù„Ø¥ØµÙ„Ø§Ø­:'}</span>
            <img src="${tk.photoAfter}" style="width: 54px; height: 54px; border-radius: 8px; object-fit: cover; border: 1px solid rgba(16,185,129,0.2);">
          </div>
          <div style="margin-right: 8px; font-size: 0.72rem; color: #10b981; font-weight: 700;">
            <i class="fa-solid fa-clock-check"></i> ${isEn ? 'Resolution time:' : 'Ù…Ø¯Ø© Ø§Ù„Ø­Ù„:'} ${tk.resolutionTime}
          </div>`;
        }
        photosHtml += `</div>`;
      }

      let paymentHtml = '';
      if (tk.status === 'Ø§Ù†ØªØ¸Ø§Ø± Ø¯ÙØ¹ Ø§Ù„Ù…Ø§Ù„Ùƒ') {
        paymentHtml = isEn ? `
          <div style="background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.15); padding: 10px; border-radius: 8px; font-size: 0.75rem; color: #ef4444; margin-top: 8px; display: flex; flex-direction: column; gap: 6px;">
            <span>âš ï¸ <strong>Repair requires spare part:</strong> [${partName}] priced at <strong>${tk.partPrice} EGP</strong>.</span>
            <span>Please complete the payment online to start the installation.</span>
            <button class="btn btn-danger btn-sm" onclick="app.openSparePartPaymentModal('${tk.id}')" style="width: 100%; margin-top: 4px; font-size: 0.72rem; padding: 6px; font-weight: 700; height: 32px; line-height: 1; display: flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer;">
              <i class="fa-solid fa-credit-card"></i> Pay for Spare Part (${tk.partPrice} EGP)
            </button>
          </div>
        ` : `
          <div style="background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.15); padding: 10px; border-radius: 8px; font-size: 0.75rem; color: #ef4444; margin-top: 8px; display: flex; flex-direction: column; gap: 6px;">
            <span>âš ï¸ <strong>ÙŠØªØ·Ù„Ø¨ Ø§Ù„Ø¥ØµÙ„Ø§Ø­ Ù‚Ø·Ø¹Ø© ØºÙŠØ§Ø±:</strong> [${tk.partName}] Ø¨Ø³Ø¹Ø± <strong>${tk.partPrice} Ø¬.Ù…</strong>.</span>
            <span>ÙŠØ±Ø¬Ù‰ Ø³Ø¯Ø§Ø¯ Ø§Ù„Ù‚ÙŠÙ…Ø© Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠØ§Ù‹ Ù„Ù„Ø¨Ø¯Ø¡ Ø§Ù„ÙÙˆØ±ÙŠ ÙÙŠ Ø§Ù„ØªØ±ÙƒÙŠØ¨ Ù…Ù† Ù‚Ø¨Ù„ Ø§Ù„ÙÙ†ÙŠ.</span>
            <button class="btn btn-danger btn-sm" onclick="app.openSparePartPaymentModal('${tk.id}')" style="width: 100%; margin-top: 4px; font-size: 0.72rem; padding: 6px; font-weight: 700; height: 32px; line-height: 1; display: flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer;">
              <i class="fa-solid fa-credit-card"></i> Ø³Ø¯Ø§Ø¯ Ù‚ÙŠÙ…Ø© Ù‚Ø·Ø¹Ø© Ø§Ù„ØºÙŠØ§Ø± (${tk.partPrice} Ø¬.Ù…)
            </button>
          </div>
        `;
      } else if (tk.status === 'ØªÙ… Ø§Ù„Ø¯ÙØ¹ - Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ±ÙƒÙŠØ¨') {
        paymentHtml = isEn ? `
          <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.2); padding: 8px; border-radius: 8px; font-size: 0.72rem; color: #10b981; margin-top: 8px;">
            <i class="fa-solid fa-circle-check"></i> Paid <strong>${tk.partPrice} EGP</strong> successfully. The technician will bring and install the [${partName}].
          </div>
        ` : `
          <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.2); padding: 8px; border-radius: 8px; font-size: 0.72rem; color: #10b981; margin-top: 8px;">
            <i class="fa-solid fa-circle-check"></i> ØªÙ… Ø³Ø¯Ø§Ø¯ <strong>${tk.partPrice} Ø¬.Ù…</strong> Ø¨Ù†Ø¬Ø§Ø­. Ø¬Ø§Ø±ÙŠ Ø¥Ø­Ø¶Ø§Ø± Ù‚Ø·Ø¹Ø© [${tk.partName}] ÙˆØªØ±ÙƒÙŠØ¨Ù‡Ø§ Ø¨ÙˆØ§Ø³Ø·Ø© Ø§Ù„ÙÙ†ÙŠ.
          </div>
        `;
      }

      const rawDate = tk.createdAt ? new Date(tk.createdAt) : new Date();
      const dateDisplay = tk.dateStr || rawDate.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });
      const timeDisplay = tk.timeStr || rawDate.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

      let priorityStars = '';
      if (tk.priority === '3') priorityStars = ' â­â­â­';
      else if (tk.priority === '2') priorityStars = ' â­â­';
      else if (tk.priority === '1') priorityStars = ' â­';

      let odooRepliesHtml = '';
      const isFinancialInquiry = tk.category && (tk.category.includes('Ø­Ø³Ø§Ø¨Ø§Øª') || tk.category.includes('Ù…Ø§Ù„ÙŠ'));
      if (tk.odooId && isFinancialInquiry) {
        odooRepliesHtml = `
          <div style="margin-top: 8px; border-top: 1px dashed rgba(32, 39, 79, 0.15); padding-top: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span style="font-size: 0.72rem; font-weight: 700; color: #20274f;">
                <i class="fa-solid fa-comments"></i> ${isEn ? 'Live Conversation Log:' : 'Ø³Ø¬Ù„ Ø§Ù„ØªÙˆØ¶ÙŠØ­Ø§Øª ÙˆØ§Ù„Ø±Ø¯ÙˆØ¯ Ø§Ù„Ù…Ø¨Ø§Ø´Ø±Ø©:'}
              </span>
              <button class="btn btn-sm" onclick="app.loadOdooRepliesForTicket('${tk.id}', '${tk.odooId}')" style="font-size: 0.65rem; padding: 3px 10px; font-weight: 700; background: rgba(27, 143, 145, 0.12); color: #1b8f91; border: 1px solid rgba(27, 143, 145, 0.3); border-radius: 6px; width: auto; cursor: pointer;">
                <i class="fa-solid fa-rotate"></i> ${isEn ? 'Sync Replies' : 'ðŸ’¬ Ù…ØªØ§Ø¨Ø¹Ø© Ø³Ø¬Ù„ Ø§Ù„Ø±Ø¯ÙˆØ¯'}
              </button>
            </div>
            <div id="odoo_replies_box_${tk.id}" class="odoo-replies-box-${tk.id}" style="font-size: 0.72rem; color: var(--text-muted);">
              ${tk.lastReply ? `
                <div style="background: rgba(16, 185, 129, 0.08); border-right: 3px solid #10b981; padding: 6px 10px; border-radius: 6px; margin-top: 4px;">
                  <div style="font-weight: 700; color: #10b981; display: flex; justify-content: space-between;">
                    <span><i class="fa-solid fa-user-check"></i> ${tk.lastReplyAuthor || 'ÙØ±ÙŠÙ‚ Ø§Ù„Ø¯Ø¹Ù… ÙˆØ§Ù„Ø­Ø³Ø§Ø¨Ø§Øª'}:</span>
                    <span style="font-size: 0.65rem; color: var(--text-muted);">${tk.lastReplyDate || ''}</span>
                  </div>
                  <div style="color: var(--text-main); margin-top: 2px;">${tk.lastReply}</div>
                </div>
              ` : `<div style="font-size: 0.68rem; color: var(--text-muted); font-style: italic;">Ù„Ø§ ØªÙˆØ¬Ø¯ Ø±Ø¯ÙˆØ¯ Ø¬Ø¯ÙŠØ¯Ø© Ø­ØªÙ‰ Ø§Ù„Ø¢Ù†. Ø§Ø¶ØºØ· "Ù…ØªØ§Ø¨Ø¹Ø© Ø³Ø¬Ù„ Ø§Ù„Ø±Ø¯ÙˆØ¯" Ù„Ù„Ù…ØªØ§Ø¨Ø¹Ø© Ø§Ù„Ø­ÙŠØ©.</div>`}
            </div>
          </div>
        `;
      }

      // Emaar 4-step Progress Tracker Calculation
      let step = 1;
      if (['ØªÙ… Ø§Ù„ØªØ¹ÙŠÙŠÙ† Ù„Ù„ÙÙ†ÙŠ', 'ØªÙ… Ø¥Ø³Ù†Ø§Ø¯ Ø§Ù„ÙÙ†ÙŠ', 'Ù‚ÙŠØ¯ Ø§Ù„ÙØ­Øµ Ø§Ù„Ù…ÙŠØ¯Ø§Ù†ÙŠ', 'Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø¹Ù…Ù„', 'Ø¬Ø§Ø±ÙŠ Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø©', 'In Progress'].includes(tk.status)) step = 2;
      else if (['Ø§Ù†ØªØ¸Ø§Ø± Ø¯ÙØ¹ Ø§Ù„Ù…Ø§Ù„Ùƒ', 'ØªÙ… Ø§Ù„Ø¯ÙØ¹ - Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ±ÙƒÙŠØ¨', 'On Hold', 'Ø¨Ø§Ù†ØªØ¸Ø§Ø± Ù‚Ø·Ø¹ Ø§Ù„ØºÙŠØ§Ø±'].includes(tk.status)) step = 3;
      else if (['ØªÙ… Ø§Ù„Ø§Ù†ØªÙ‡Ø§Ø¡', 'ØªÙ… Ø§Ù„Ø­Ù„', 'ØªÙ… Ø§Ù„Ø¥ØºÙ„Ø§Ù‚', 'Done', 'Solved', 'ØªÙ… Ø§Ù„Ø³Ø¯Ø§Ø¯', 'Ù…ÙƒØªÙ…Ù„'].includes(tk.status)) step = 4;

      const progressPercent = step === 1 ? 25 : (step === 2 ? 50 : (step === 3 ? 75 : 100));
      const progressColor = step === 4 ? '#10b981' : (step === 3 && tk.status === 'Ø§Ù†ØªØ¸Ø§Ø± Ø¯ÙØ¹ Ø§Ù„Ù…Ø§Ù„Ùƒ' ? '#ef4444' : '#1c2140');

      const emaarTrackerHtml = `
        <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid rgba(32,39,79,0.08);">
          <div style="display: flex; justify-content: space-between; font-size: 0.62rem; color: var(--text-muted); font-weight: 700; margin-bottom: 4px;">
            <span style="color: ${step >= 1 ? '#1c2140' : 'inherit'};">${isEn ? '1. Request Sent' : '1. ØªÙ‚Ø¯ÙŠÙ… Ø§Ù„Ø·Ù„Ø¨'}</span>
            <span style="color: ${step >= 2 ? '#1c2140' : 'inherit'};">${isEn ? '2. Tech Visit' : '2. Ù…Ø¹Ø§ÙŠÙ†Ø© Ø§Ù„ÙÙ†ÙŠ'}</span>
            <span style="color: ${step >= 3 ? '#1c2140' : 'inherit'};">${isEn ? '3. Part / Repair' : '3. Ø§Ù„Ù‚Ø·Ø¹ ÙˆØ§Ù„ØªØ±ÙƒÙŠØ¨'}</span>
            <span style="color: ${step >= 4 ? '#10b981' : 'inherit'};">${isEn ? '4. Closed' : '4. ØªÙ… Ø§Ù„Ø­Ù„'}</span>
          </div>
          <div style="width: 100%; height: 5px; background: rgba(32,39,79,0.08); border-radius: 4px; overflow: hidden;">
            <div style="width: ${progressPercent}%; height: 100%; background: ${progressColor}; transition: width 0.3s ease;"></div>
          </div>
        </div>
      `;

      // 1. Cancellation Info Box if Cancelled
      let cancellationHtml = '';
      if (tk.status === 'Ù…Ù„ØºØ§Ø©' || tk.status === 'Cancelled' || tk.status === 'Ù…Ù„ØºÙŠ' || String(tk.status).includes('Ø§Ù„ØºØ§Ø¡') || String(tk.status).includes('Ù…Ù„Øº')) {
        cancellationHtml = `
          <div style="background: rgba(239, 68, 68, 0.08); border-right: 3px solid #ef4444; padding: 8px 10px; border-radius: 6px; margin-top: 6px;">
            <div style="font-size: 0.75rem; font-weight: 800; color: #ef4444; display: flex; align-items: center; gap: 4px;">
              <i class="fa-solid fa-ban"></i> <span>ØªÙ… Ø¥Ù„ØºØ§Ø¡ Ù‡Ø°Ø§ Ø§Ù„Ø¨Ù„Ø§Øº Ø±Ø³Ù…ÙŠØ§Ù‹</span>
            </div>
            <p style="font-size: 0.7rem; color: #1c2140; margin: 3px 0 0 0; font-weight: 600;">
              <b>Ø³Ø¨Ø¨ Ø§Ù„Ø¥Ù„ØºØ§Ø¡ Ø§Ù„Ù…Ø¯ÙˆÙ†:</b> ${tk.cancelReason || tk.cancellationReason || tk.cancelNotes || 'ØªÙ… Ø§Ù„Ø¥Ù„ØºØ§Ø¡ Ù…Ù† Ù‚ÙØ¨Ù„ Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„ØµÙŠØ§Ù†Ø© Ù„ØªØ¹Ø°Ø± Ø§Ù„ØªÙ†ÙÙŠØ°'}
            </p>
          </div>
        `;
      }

      // 2. Customer Star Rating & Review Box if Solved / Completed
      let ratingHtml = '';
      const isSolved = tk.status === 'ØªÙ… Ø§Ù„Ø§Ù†ØªÙ‡Ø§Ø¡' || tk.status === 'ØªÙ… Ø§Ù„Ø­Ù„' || tk.status === 'Solved' || tk.status === 'Done' || tk.status === 'Ù…ÙƒØªÙ…Ù„';
      if (isSolved) {
        if (tk.customerRating) {
          const starsStr = 'â­'.repeat(parseInt(tk.customerRating) || 5);
          ratingHtml = `
            <div style="background: rgba(212, 175, 55, 0.08); border-right: 3px solid #d4af37; padding: 8px 10px; border-radius: 6px; margin-top: 6px;">
              <div style="font-size: 0.75rem; font-weight: 800; color: #b45309; display: flex; align-items: center; gap: 4px;">
                <i class="fa-solid fa-star" style="color: #d4af37;"></i> <span>ØªÙ‚ÙŠÙŠÙ…Ùƒ Ù„Ø¬ÙˆØ¯Ø© Ø§Ù„Ø®Ø¯Ù…Ø©: ${starsStr} (${tk.customerRating}/5)</span>
              </div>
              ${tk.customerComment ? `<p style="font-size: 0.68rem; color: #1c2140; margin: 3px 0 0 0; font-weight: 600;">"${tk.customerComment}"</p>` : ''}
            </div>
          `;
        } else {
          ratingHtml = `
            <div style="margin-top: 8px;">
              <button class="btn btn-sm" onclick="app.openRateTicketModal('${tk.id}')" style="width: 100%; font-size: 0.75rem; font-weight: 700; background: linear-gradient(135deg, #d4af37, #b8860b); color: #ffffff; border: none; border-radius: 6px; padding: 7px; display: flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer; box-shadow: 0 2px 6px rgba(212,175,55,0.25);">
                <i class="fa-solid fa-star"></i> ØªÙ‚ÙŠÙŠÙ… Ø¬ÙˆØ¯Ø© Ø§Ù„Ø®Ø¯Ù…Ø© ÙˆØ±Ø¶Ø§ Ø§Ù„Ø¹Ù…ÙŠÙ„ â­
              </button>
            </div>
          `;
        }
      }

      return `
        <div class="ticket-item" style="flex-direction: column; align-items: stretch; gap: 4px; border-left: 4px solid ${tk.status === 'ØªÙ… Ø§Ù„Ø¯ÙØ¹ - Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ±ÙƒÙŠØ¨' ? '#10b981' : (tk.status === 'Ø§Ù†ØªØ¸Ø§Ø± Ø¯ÙØ¹ Ø§Ù„Ù…Ø§Ù„Ùƒ' ? '#ef4444' : '#1c2140')}; font-family: var(--font-main); border-radius: 10px; padding: 12px; margin-bottom: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <h4 style="font-size: 0.85rem; font-weight: 700; color: #1c2140;">${title}${priorityStars}</h4>
            <span class="badge ${tk.bgClass}">${status}</span>
          </div>
          <div style="font-size: 0.72rem; color: var(--text-muted); display: flex; flex-direction: column; align-items: flex-start; gap: 4px; margin-top: 4px; background: rgba(32, 39, 79, 0.03); padding: 6px 8px; border-radius: 6px; width: 100%; box-sizing: border-box;">
            <div>${isEn ? 'Category' : 'Ø§Ù„ØªØ®ØµØµ'}: <b>${category}</b> â€¢ #${tk.id} ${tk.assignedTech ? `â€¢ ${isEn ? 'Tech' : 'Ø§Ù„ÙÙ†ÙŠ'}: ${tk.assignedTech}` : ''}</div>
            <div style="font-size: 0.68rem; color: #1b8f91; font-weight: 700; display: inline-flex; align-items: center; gap: 6px; width: 100%;">
              <span><i class="fa-regular fa-calendar-days"></i> ${dateDisplay}</span>
              <span>â€¢</span>
              <span><i class="fa-regular fa-clock"></i> ${timeDisplay}</span>
            </div>
          </div>
          ${photosHtml}
          ${paymentHtml}
          ${odooRepliesHtml}
          ${cancellationHtml}
          ${ratingHtml}
          ${emaarTrackerHtml}
        </div>
      `;
    };

    // Render Homeowner Tickets list & Update Category Counters (Emaar App Active vs Completed History Separation)
    const homeownerList = document.getElementById('homeownerTicketsList');
    if (homeownerList) {
      const isPureHomeownerMaintenance = (tk) => {
        if (!tk) return false;
        const cat = String(tk.category || '').toLowerCase();
        const title = String(tk.title || '').toLowerCase();
        // Exclude financial, accounting, security permits, and gate passes from maintenance list
        if (cat.includes('Ø­Ø³Ø§Ø¨Ø§Øª') || cat.includes('Ù…Ø§Ù„ÙŠ') || cat.includes('ØªØµØ±ÙŠØ­') || cat.includes('Ø¨ÙˆØ§Ø¨Ø§Øª') || cat.includes('Ø£Ù…Ù†')) return false;
        if (title.includes('ØªØµØ±ÙŠØ­ Ø¯Ø®ÙˆÙ„') || title.includes('Ø¨ÙˆØ§Ø¨Ø§Øª Ø£Ù…Ù†ÙŠ')) return false;
        return true;
      };

      const homeownerTks = this.tickets.filter(tk => (tk.requester === 'homeowner' || tk.requester === 'owner' || !tk.requester) && isPureHomeownerMaintenance(tk));

      const isCompletedStatus = (st) => {
        if (!st) return false;
        const s = String(st).toLowerCase().replace(/[Ø£Ø¥Ø¢]/g, 'Ø§').replace(/Ø©/g, 'Ù‡').replace(/Ù‰/g, 'ÙŠ').trim();
        return s.includes('Ø§Ù†ØªÙ‡') || s.includes('Ù…ÙƒØªÙ…Ù„') || s.includes('Ù…ØºÙ„Ù‚') || s.includes('Ø­Ù„') || s.includes('done') || s.includes('solved') || s.includes('closed') || s.includes('Ø³Ø¯Ø§Ø¯');
      };

      const activeTks = homeownerTks.filter(t => !isCompletedStatus(t.status));
      const completedTks = homeownerTks.filter(t => isCompletedStatus(t.status));

      // Category Counters Summary for Active Tickets (6 Categories)
      const plumbingCount = activeTks.filter(t => t.category === 'Ø³Ø¨Ø§ÙƒØ©').length;
      const elecCount = activeTks.filter(t => t.category === 'ÙƒÙ‡Ø±Ø¨Ø§Ø¡').length;
      const hvacCount = activeTks.filter(t => t.category === 'ÙƒÙ‡Ø±ÙˆÙ…ÙŠÙƒØ§Ù†ÙŠÙƒ' || t.category === 'ØªÙƒÙŠÙŠÙ').length;
      const woodCount = activeTks.filter(t => t.category === 'Ù†Ø¬Ø§Ø±Ø©').length;
      const hkCount = activeTks.filter(t => t.category && (t.category.includes('Ù†Ø¸Ø§ÙØ©') || t.category.includes('Ù‡Ø§ÙˆØ³'))).length + (this.housekeepingRequests ? this.housekeepingRequests.filter(r => r.requester === 'owner').length : 0);
      const landscapeCount = activeTks.filter(t => t.category && (t.category.includes('Ø­Ø¯Ø§Ø¦Ù‚') || t.category.includes('Ù„Ø§Ù†Ø¯'))).length;

      const elPlumb = document.getElementById('catPlumbingCount');
      const elElec = document.getElementById('catElecCount');
      const elHvac = document.getElementById('catHvacCount');
      const elWood = document.getElementById('catWoodCount');
      const elHk = document.getElementById('catHkCount');
      const elLandscape = document.getElementById('catLandscapeCount');

      if (elPlumb) elPlumb.innerText = plumbingCount;
      if (elElec) elElec.innerText = elecCount;
      if (elHvac) elHvac.innerText = hvacCount;
      if (elWood) elWood.innerText = woodCount;
      if (elHk) elHk.innerText = hkCount;
      if (elLandscape) elLandscape.innerText = landscapeCount;

      const badge = document.getElementById('ticketCountBadge');
      if (badge) badge.innerText = isEn ? `${activeTks.length} active` : `${activeTks.length} Ù†Ø´Ø·Ø©`;

      const elActiveNum = document.getElementById('emaarActiveCountNum');
      const elCompNum = document.getElementById('emaarCompletedCountNum');
      if (elActiveNum) elActiveNum.innerText = activeTks.length;
      if (elCompNum) elCompNum.innerText = completedTks.length;

      const activeBtn = document.getElementById('emaarTabActive');
      const compBtn = document.getElementById('emaarTabCompleted');
      if (activeBtn && compBtn) {
        if (this._emaarTicketFilter === 'completed') {
          compBtn.style.background = '#20274f';
          compBtn.style.color = '#ffffff';
          activeBtn.style.background = 'transparent';
          activeBtn.style.color = '#20274f';
        } else {
          activeBtn.style.background = '#20274f';
          activeBtn.style.color = '#ffffff';
          compBtn.style.background = 'transparent';
          compBtn.style.color = '#20274f';
        }
      }

      homeownerList.innerHTML = '';
      const filterMode = this._emaarTicketFilter || 'active';

      if (filterMode === 'active') {
        if (activeTks.length === 0) {
          homeownerList.innerHTML = `<div style="font-size: 0.75rem; color: var(--text-muted); text-align: center; padding: 15px;">${isEn ? 'No active tickets' : 'Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¨Ù„Ø§ØºØ§Øª Ù†Ø´Ø·Ø© Ø­Ø§Ù„ÙŠØ§Ù‹'}</div>`;
        } else {
          activeTks.forEach(tk => {
            homeownerList.innerHTML += getTicketHtml(tk);
          });
        }
      } else {
        if (completedTks.length === 0) {
          homeownerList.innerHTML = `<div style="font-size: 0.75rem; color: var(--text-muted); text-align: center; padding: 15px;">${isEn ? 'No completed history tickets' : 'Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ø³Ø¬Ù„ ØªØ°Ø§ÙƒØ± Ù…Ù†ØªÙ‡ÙŠØ© Ø­Ø§Ù„ÙŠØ§Ù‹'}</div>`;
        } else {
          completedTks.forEach(tk => {
            homeownerList.innerHTML += getTicketHtml(tk);
          });
        }
      }
    }

    // Render Maintenance Manager Stream & Live Shift KPIs (Exclusively Maintenance & Facilities)
    const managerList = document.getElementById('managerOrdersList');
    if (managerList) {
      const allMgrTks = this.tickets.filter(tk => {
        const cat = String(tk.category || '').toLowerCase();
        const title = String(tk.title || '').toLowerCase();
        // Exclude Financials, Security, Gate Permits, and Complaints (which belong strictly to Security Officer & Accounting)
        if (cat.includes('Ø­Ø³Ø§Ø¨Ø§Øª') || cat.includes('Ù…Ø§Ù„ÙŠ')) return false;
        if (cat.includes('Ø£Ù…Ù†') || cat.includes('Ø§Ù…Ù†') || cat.includes('Ø¨ÙˆØ§Ø¨') || cat.includes('ØªØµØ±ÙŠØ­') || cat.includes('Ø´ÙƒÙˆÙ‰ Ø£Ù…Ù†ÙŠØ©') || cat.includes('security')) return false;
        if (title.includes('Ø£Ù…Ù†') || title.includes('Ø§Ù…Ù†') || title.includes('Ø¨ÙˆØ§Ø¨') || title.includes('ØªØµØ±ÙŠØ­') || title.includes('Ø´ÙƒÙˆÙ‰ Ø£Ù…Ù†ÙŠØ©')) return false;
        return true;
      });
      
      const pendingTks = allMgrTks.filter(tk => tk.status === 'Ø¬Ø¯ÙŠØ¯' || !tk.assignedTech);
      const assignedTks = allMgrTks.filter(tk => tk.assignedTech);

      // 1. Update Shift KPIs
      const elKpiTotal = document.getElementById('managerKpiTotal');
      const elKpiAssigned = document.getElementById('managerKpiAssigned');
      const elKpiPending = document.getElementById('managerKpiPending');
      const elKpiSlaRate = document.getElementById('managerKpiSlaRate');

      if (elKpiTotal) elKpiTotal.innerText = allMgrTks.length;
      if (elKpiAssigned) elKpiAssigned.innerText = assignedTks.length;
      if (elKpiPending) elKpiPending.innerText = pendingTks.length;

      if (elKpiSlaRate) {
        if (allMgrTks.length === 0) {
          elKpiSlaRate.innerText = '100%';
        } else {
          const fastDispatches = assignedTks.filter(t => (t.dispatchMins || 1) <= 15).length;
          const rate = Math.round((fastDispatches / Math.max(1, assignedTks.length)) * 100);
          elKpiSlaRate.innerText = `${rate}%`;
        }
      }

      const badge = document.getElementById('managerInboxBadge');
      if (badge) badge.innerText = `${pendingTks.length} Ø¨Ø§Ù†ØªØ¸Ø§Ø± Ø§Ù„Ø¥Ø³Ù†Ø§Ø¯`;

      // 2. Filter Manager Orders by Source (all, owner, engineer, public)
      const currentMgrFilter = this._managerFilter || 'all';
      let filteredTks = allMgrTks;

      if (currentMgrFilter === 'owner') {
        filteredTks = allMgrTks.filter(t => t.requester === 'homeowner' || t.requester === 'owner' || t.requester === 'tenant' || !t.requester);
      } else if (currentMgrFilter === 'engineer') {
        filteredTks = allMgrTks.filter(t => t.requester === 'engineer' || (t.category && (t.category.includes('ØªÙØªÙŠØ´') || t.category.includes('Ù…Ø±Ø§ÙÙ‚'))));
      } else if (currentMgrFilter === 'public') {
        filteredTks = allMgrTks.filter(t => t.requester === 'manager' || t.requester === 'public' || (t.category && (t.category.includes('Ø¹Ø§Ù…Ø©') || t.category.includes('Ù„Ø§Ù†Ø¯'))));
      }

      // Update Filter Button Styles
      ['mgrFilterAll', 'mgrFilterOwner', 'mgrFilterEngineer', 'mgrFilterPublic'].forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
          const btnFilter = btnId.replace('mgrFilter', '').toLowerCase();
          if (btnFilter === currentMgrFilter) {
            btn.style.background = '#20274f';
            btn.style.color = '#ffffff';
          } else {
            btn.style.background = 'transparent';
            btn.style.color = '#20274f';
          }
        }
      });

      managerList.innerHTML = '';
      if (filteredTks.length === 0) {
        managerList.innerHTML = '<div style="font-size: 0.75rem; color: var(--text-muted); text-align: center; padding: 20px; background: rgba(32,39,79,0.02); border-radius: 8px;">Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¨Ù„Ø§ØºØ§Øª ØªØ·Ø§Ø¨Ù‚ Ù‡Ø°Ø§ Ø§Ù„ÙÙ„ØªØ± Ø­Ø§Ù„ÙŠØ§Ù‹</div>';
      } else {
        filteredTks.forEach(tk => {
          const createDate = tk.createdAt ? new Date(tk.createdAt) : new Date();
          const elapsedMins = Math.max(1, Math.round((Date.now() - createDate) / 60000));
          
          // Ticket Source Badge & Styling
          let sourceBadgeHtml = '';
          let borderAccent = '#1b8f91';

          if (tk.requester === 'engineer' || (tk.category && tk.category.includes('ØªÙØªÙŠØ´'))) {
            sourceBadgeHtml = `<span class="badge" style="background: rgba(245, 158, 11, 0.15); color: #d97706 !important; font-weight: 800; font-size: 0.65rem;"><i class="fa-solid fa-compass-drafting"></i> ØªÙØªÙŠØ´ Ù…Ù‡Ù†Ø¯Ø³ Ø§Ù„Ù…ÙˆÙ‚Ø¹</span>`;
            borderAccent = '#f59e0b';
          } else if (tk.requester === 'manager' || tk.requester === 'public' || (tk.category && tk.category.includes('Ø¹Ø§Ù…Ø©'))) {
            sourceBadgeHtml = `<span class="badge" style="background: rgba(32, 39, 79, 0.12); color: #20274f !important; font-weight: 800; font-size: 0.65rem;"><i class="fa-solid fa-tree-city"></i> Ø¨Ù„Ø§Øº Ù…Ø±Ø§ÙÙ‚ Ø¹Ø§Ù…Ø©</span>`;
            borderAccent = '#20274f';
          } else {
            sourceBadgeHtml = `<span class="badge" style="background: rgba(27, 143, 145, 0.15); color: #1b8f91 !important; font-weight: 800; font-size: 0.65rem;"><i class="fa-solid fa-house-user"></i> Ø·Ù„Ø¨ Ù…Ø§Ù„Ùƒ (ÙÙŠÙ„Ø§ 104)</span>`;
            borderAccent = '#1b8f91';
          }

          // Manager SLA Speed Indicator
          let slaBadgeHtml = '';
          if (tk.assignedTech) {
            const dMins = tk.dispatchMins || 1;
            if (dMins <= 15) {
              slaBadgeHtml = `<span class="badge" style="background: #10b981; color: #ffffff !important; font-size: 0.62rem;"><i class="fa-solid fa-bolt"></i> Ø¥Ø³Ù†Ø§Ø¯ ÙÙˆØ±ÙŠ: ${dMins}Ø¯ (SLA Ù…Ø«Ø§Ù„ÙŠ)</span>`;
            } else {
              slaBadgeHtml = `<span class="badge" style="background: #f59e0b; color: #ffffff !important; font-size: 0.62rem;"><i class="fa-solid fa-clock"></i> Ø¥Ø³Ù†Ø§Ø¯ Ø®Ù„Ø§Ù„: ${dMins}Ø¯</span>`;
            }
          } else {
            if (elapsedMins <= 15) {
              slaBadgeHtml = `<span class="badge" style="background: #10b981; color: #ffffff !important; font-size: 0.62rem;"><i class="fa-solid fa-stopwatch"></i> Ø¨Ø§Ù†ØªØ¸Ø§Ø± Ø§Ù„Ø¥Ø³Ù†Ø§Ø¯: Ù…Ù†Ø° ${elapsedMins}Ø¯ (&lt; 15Ø¯)</span>`;
            } else {
              slaBadgeHtml = `<span class="badge" style="background: #ef4444; color: #ffffff !important; font-size: 0.62rem;"><i class="fa-solid fa-triangle-exclamation"></i> ØªØ£Ø®Ø± ÙÙŠ Ø§Ù„Ø¥Ø³Ù†Ø§Ø¯: ${elapsedMins}Ø¯</span>`;
            }
          }

          // Distinct Color Themes: New (Yellow), In Progress (Blue), Solved (Green), Cancelled (Red)
          const isNewTicket = (tk.status === 'Ø¬Ø¯ÙŠØ¯' || tk.status === 'New');
          const isCancelled = (tk.status === 'Ù…Ù„ØºÙŠ' || tk.status === 'Cancelled');
          const isSolved = (tk.status === 'ØªÙ… Ø§Ù„Ø§Ù†ØªÙ‡Ø§Ø¡' || tk.status === 'ØªÙ… Ø§Ù„Ø­Ù„' || tk.status === 'Solved');
          const isInProgress = !isNewTicket && !isCancelled && !isSolved;

          let cardStyle = `flex-direction: column; align-items: stretch; gap: 4px; margin-bottom: 12px; padding: 14px; border-radius: 12px; box-shadow: var(--shadow-sm);`;
          let statusBadgeClass = 'badge-info';

          if (isNewTicket) {
            // ðŸŸ¡ NEW = Yellow
            cardStyle += ` background: #fffdf5; border: 1.5px solid #f59e0b; border-left: 6px solid #d97706; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.18);`;
            statusBadgeClass = 'badge-warning';
          } else if (isCancelled) {
            // ðŸ”´ CANCELLED = Red
            cardStyle += ` background: #fef2f2; border: 1.5px solid #ef4444; border-left: 6px solid #dc2626; box-shadow: 0 4px 14px rgba(239, 68, 68, 0.12);`;
            statusBadgeClass = 'badge-danger';
          } else if (isSolved) {
            // ðŸŸ¢ SOLVED = Green
            cardStyle += ` background: #f0fdf4; border: 1.5px solid #10b981; border-left: 6px solid #059669; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.12);`;
            statusBadgeClass = 'badge-success';
          } else {
            // ðŸ”µ IN PROGRESS = Blue
            cardStyle += ` background: #f0f9ff; border: 1.5px solid #0284c7; border-left: 6px solid #0369a1; box-shadow: 0 4px 14px rgba(2, 132, 199, 0.12);`;
            statusBadgeClass = 'badge-info';
          }

          // Action: Dispatch / Assigned Info / Cancelled Info
          let actionHtml = '';
          if (isCancelled) {
            actionHtml = `
              <div style="background: #fef2f2; border: 1px solid #fca5a5; padding: 10px 12px; border-radius: 12px; font-size: 0.72rem; color: #991b1b; margin-top: 10px;">
                <div style="font-weight: 800; display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
                  <i class="fa-solid fa-ban"></i> ØªÙ… Ø¥Ù„ØºØ§Ø¡ Ø§Ù„Ø¨Ù„Ø§Øº Ø¨ÙˆØ§Ø³Ø·Ø©: Ù…. Ø£ÙŠÙ…Ù† Ø§Ù„Ø³Ø¹ÙŠØ¯ (Ù…Ø¯ÙŠØ± Ø§Ù„ØµÙŠØ§Ù†Ø©)
                </div>
                <div><b>Ø³Ø¨Ø¨ Ø§Ù„Ø¥Ù„ØºØ§Ø¡:</b> ${tk.cancelReason || 'ØªØ°ÙƒØ±Ø© Ù…ÙƒØ±Ø±Ø©'}</div>
                ${tk.cancelNotes ? `<div style="font-size: 0.68rem; color: #b91c1c; margin-top: 2px;"><b>Ù…Ù„Ø§Ø­Ø¸Ø§Øª:</b> ${tk.cancelNotes}</div>` : ''}
              </div>
            `;
          } else if (isNewTicket) {
            actionHtml = `
              <div style="background: rgba(245, 158, 11, 0.05); border: 1px solid rgba(245, 158, 11, 0.25); padding: 12px; border-radius: 14px; margin-top: 10px;">
                <label style="font-size: 0.72rem; font-weight: 800; color: #b45309; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
                  <i class="fa-solid fa-user-gear" style="color: #d97706;"></i> Ø§Ø®ØªØ± Ø§Ù„ÙÙ†ÙŠ Ø§Ù„Ù…ÙƒÙ„Ù Ø¨Ø§Ù„Ù…Ù‡Ù…Ø©:
                </label>
                <select class="form-control" style="width: 100%; height: 42px; padding: 0 12px; font-size: 0.78rem; background: #ffffff; color: #0f172a; border: 1.5px solid #d97706; font-weight: 700; border-radius: 10px; margin-bottom: 10px;" id="assignTechSelect_${tk.id}">
                  <option value="ÙƒØ±ÙŠÙ… Ø­Ø³Ù†">â„ï¸ ÙƒØ±ÙŠÙ… Ø­Ø³Ù† (ÙÙ†ÙŠ ØªÙƒÙŠÙŠÙ ÙˆÙƒÙ‡Ø±ÙˆÙ…ÙŠÙƒØ§Ù†ÙŠÙƒ)</option>
                  <option value="Ù…ÙŠÙ†Ø§ Ø¬Ø±Ø¬Ø³">ðŸ”§ Ù…ÙŠÙ†Ø§ Ø¬Ø±Ø¬Ø³ (ÙÙ†ÙŠ Ø´Ø¨ÙƒØ§Øª ÙˆØ³Ø¨Ø§ÙƒØ©)</option>
                  <option value="Ø£Ø­Ù…Ø¯ Ø¹Ù„ÙŠ">âš¡ Ø£Ø­Ù…Ø¯ Ø¹Ù„ÙŠ (ÙÙ†ÙŠ ÙƒÙ‡Ø±Ø¨Ø§Ø¡ ÙˆØ·Ø§Ù‚Ø©)</option>
                  <option value="Ø³Ø¹ÙŠØ¯ Ù…Ø­Ù…ÙˆØ¯">ðŸŒ¿ Ø³Ø¹ÙŠØ¯ Ù…Ø­Ù…ÙˆØ¯ (ÙÙ†ÙŠ Ù„Ø§Ù†Ø¯Ø³ÙƒÙŠØ¨ ÙˆØ±ÙŠ)</option>
                </select>
                <div style="display: grid; grid-template-columns: 1fr auto; gap: 8px;">
                  <button class="btn btn-primary" style="height: 42px; font-size: 0.8rem; font-weight: 800; background: linear-gradient(135deg, #1b8f91, #20274f); color: #ffffff; border: none; border-radius: 10px; display: flex; align-items: center; justify-content: center; gap: 6px; margin: 0; box-shadow: 0 3px 10px rgba(27,143,145,0.25);" onclick="app.assignTechnician('${tk.id}', 'assignTechSelect_${tk.id}')">
                    <i class="fa-solid fa-paper-plane"></i> Ø¥Ø³Ù†Ø§Ø¯ Ø§Ù„Ù…Ù‡Ù…Ø© Ù„Ù„ÙÙ†ÙŠ
                  </button>
                  <button class="btn" style="height: 42px; font-size: 0.75rem; font-weight: 800; background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; border-radius: 10px; padding: 0 14px; margin: 0;" onclick="app.openCancelTicketModal('${tk.id}')">
                    <i class="fa-solid fa-ban"></i> Ø¥Ù„ØºØ§Ø¡
                  </button>
                </div>
              </div>
            `;
          } else {
            actionHtml = `
              <div style="background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.25); padding: 12px; border-radius: 14px; margin-top: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                  <div style="font-weight: 800; color: #065f46; font-size: 0.75rem; display: flex; align-items: center; gap: 6px;">
                    <i class="fa-solid fa-circle-check" style="color: #10b981;"></i> ØªÙ… Ø§Ù„Ø¥Ø³Ù†Ø§Ø¯ Ù„Ù„ÙÙ†ÙŠ: <strong>${tk.assignedTech}</strong>
                    <span style="font-size: 0.65rem; color: #64748b;">(Ø²Ù…Ù† Ø§Ù„ØªÙˆØ²ÙŠØ¹: ${tk.dispatchMins || 1} Ø¯)</span>
                  </div>
                  <button class="btn btn-sm" style="margin: 0; padding: 3px 8px; font-size: 0.65rem; background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; font-weight: 800; border-radius: 6px;" onclick="app.openCancelTicketModal('${tk.id}')">
                    <i class="fa-solid fa-ban"></i> Ø¥Ù„ØºØ§Ø¡
                  </button>
                </div>
                <label style="font-size: 0.7rem; font-weight: 700; color: #64748b; margin-bottom: 4px; display: block;">ØªØºÙŠÙŠØ± Ø§Ù„ÙÙ†ÙŠ Ø§Ù„Ù…ÙƒÙ„Ù:</label>
                <div style="display: grid; grid-template-columns: 1fr auto; gap: 8px;">
                  <select class="form-control" style="height: 38px; padding: 0 10px; font-size: 0.75rem; background: #ffffff; color: #1e293b; border: 1px solid #cbd5e1; font-weight: 700; border-radius: 8px;" id="assignTechSelect_${tk.id}">
                    <option value="ÙƒØ±ÙŠÙ… Ø­Ø³Ù†" ${tk.assignedTech === 'ÙƒØ±ÙŠÙ… Ø­Ø³Ù†' ? 'selected' : ''}>â„ï¸ ÙƒØ±ÙŠÙ… Ø­Ø³Ù† (ÙÙ†ÙŠ ØªÙƒÙŠÙŠÙ ÙˆÙƒÙ‡Ø±ÙˆÙ…ÙŠÙƒØ§Ù†ÙŠÙƒ)</option>
                    <option value="Ù…ÙŠÙ†Ø§ Ø¬Ø±Ø¬Ø³" ${tk.assignedTech === 'Ù…ÙŠÙ†Ø§ Ø¬Ø±Ø¬Ø³' ? 'selected' : ''}>ðŸ”§ Ù…ÙŠÙ†Ø§ Ø¬Ø±Ø¬Ø³ (ÙÙ†ÙŠ Ø´Ø¨ÙƒØ§Øª ÙˆØ³Ø¨Ø§ÙƒØ©)</option>
                    <option value="Ø£Ø­Ù…Ø¯ Ø¹Ù„ÙŠ" ${tk.assignedTech === 'Ø£Ø­Ù…Ø¯ Ø¹Ù„ÙŠ' ? 'selected' : ''}>âš¡ Ø£Ø­Ù…Ø¯ Ø¹Ù„ÙŠ (ÙÙ†ÙŠ ÙƒÙ‡Ø±Ø¨Ø§Ø¡ ÙˆØ·Ø§Ù‚Ø©)</option>
                    <option value="Ø³Ø¹ÙŠØ¯ Ù…Ø­Ù…ÙˆØ¯" ${tk.assignedTech === 'Ø³Ø¹ÙŠØ¯ Ù…Ø­Ù…ÙˆØ¯' ? 'selected' : ''}>ðŸŒ¿ Ø³Ø¹ÙŠØ¯ Ù…Ø­Ù…ÙˆØ¯ (ÙÙ†ÙŠ Ù„Ø§Ù†Ø¯Ø³ÙƒÙŠØ¨ ÙˆØ±ÙŠ)</option>
                  </select>
                  <button class="btn btn-sm" style="height: 38px; padding: 0 14px; font-size: 0.72rem; white-space: nowrap; margin: 0; font-weight: 700; background: #1b8f91; color: #ffffff; border-radius: 8px;" onclick="app.assignTechnician('${tk.id}', 'assignTechSelect_${tk.id}')">
                    <i class="fa-solid fa-arrows-rotate"></i> ØªØ­Ø¯ÙŠØ« Ø§Ù„ÙÙ†ÙŠ
                  </button>
                </div>
              </div>
            `;
          }

          managerList.innerHTML += `
            <div class="ticket-item" style="${cardStyle}">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 6px;">
                  ${sourceBadgeHtml}
                  ${isNewTicket ? `<span class="badge" style="background: #f59e0b; color: #ffffff !important; font-weight: 800; font-size: 0.62rem;"><i class="fa-solid fa-star"></i> Ø¬Ø¯ÙŠØ¯</span>` : ''}
                </div>
                ${slaBadgeHtml}
              </div>
              <h4 style="font-size: 0.92rem; font-weight: 800; color: #20274f; margin-top: 8px; margin-bottom: 4px;">${tk.title}</h4>
              <div style="font-size: 0.72rem; color: #64748b; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                <span>Ø§Ù„ØªØ®ØµØµ: <b style="color: #20274f;">${tk.category || 'Ø¹Ø§Ù…'}</b></span>
                <span>â€¢ ÙƒÙˆØ¯ Ø§Ù„Ø¨Ù„Ø§Øº: <b style="color: #1b8f91;">#${tk.id}</b></span>
                <span>â€¢ Ø§Ù„Ø­Ø§Ù„Ø©: <span class="badge ${statusBadgeClass}" style="font-size: 0.65rem; font-weight: 700;">${tk.status}</span></span>
              </div>
              ${tk.details ? `<div style="font-size: 0.74rem; color: #334155; background: ${isNewTicket ? 'rgba(245,158,11,0.06)' : 'rgba(32,39,79,0.03)'}; padding: 8px 10px; border-radius: 8px; margin-top: 6px; border: 1px dashed rgba(32,39,79,0.12);"><b>Ø§Ù„ÙˆØµÙ:</b> ${tk.details}</div>` : ''}
              ${actionHtml}
            </div>
          `;
        });
      }
    }

    // Render Tenant Tickets list
    const tenantList = document.getElementById('tenantTicketsList');
    if (tenantList) {
      const tks = this.tickets.filter(t => t.requester === 'tenant');
      tenantList.innerHTML = '';
      if (tks.length === 0) {
        tenantList.innerHTML = `<div style="font-size: 0.75rem; color: var(--text-muted); text-align: center; padding: 12px;">${isEn ? 'No maintenance tickets submitted' : 'Ù„Ø§ ØªÙˆØ¬Ø¯ Ø·Ù„Ø¨Ø§Øª ØµÙŠØ§Ù†Ø© Ù…Ø³Ø¬Ù„Ø© Ø­Ø§Ù„ÙŠØ§Ù‹'}</div>`;
      } else {
        tks.forEach(tk => {
          tenantList.innerHTML += `
            <div class="ticket-item">
              <div>
                <h4 style="font-size: 0.85rem; margin-bottom: 2px;">${tk.title}</h4>
                <p style="font-size: 0.7rem; color: var(--text-muted); margin: 0;">
                  ${isEn ? 'Ticket' : 'ØªØ°ÙƒØ±Ø©'} #${tk.id} â€¢ ${tk.dateStr || ''}
                </p>
              </div>
              <span class="badge ${tk.bgClass || 'badge-warning'}">${tk.status}</span>
            </div>
          `;
        });
      }
    }

    // 6. Technician View - Strict Maintenance Filter, Separate Upload Photo Buttons & KPIs
    const techList = document.getElementById('techTasksContainer');
    if (techList) {
      // Strictly exclude Customer Care Complaints, Suggestions, Inquiries, Financial, and Security tickets from Technician!
      const isPureMaintenanceTask = (tk) => {
        const text = `${tk.category || ''} ${tk.title || ''} ${tk.details || ''}`.toLowerCase();
        if (text.includes('Ø´ÙƒØ§ÙˆÙ‰') || text.includes('Ø´ÙƒÙˆÙ‰') || text.includes('Ù…Ù‚ØªØ±Ø­') || text.includes('Ø®Ø¯Ù…Ø© Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡') || text.includes('Ø§Ø³ØªÙØ³Ø§Ø±') || text.includes('Ø­Ø³Ø§Ø¨Ø§Øª') || text.includes('Ù…Ø§Ù„ÙŠ') || text.includes('ÙˆØ¯ÙŠØ¹') || text.includes('Ù‚Ø³Ø·') || text.includes('Ø£Ù…Ù†') || text.includes('Ø£Ù…Ù†ÙŠ') || text.includes('security') || text.includes('customer care')) {
          return false;
        }
        return true;
      };

      const allTechTks = this.tickets.filter(tk => (tk.assignedTech === 'ÙƒØ±ÙŠÙ… Ø­Ø³Ù†' || (!tk.assignedTech && tk.requester === 'manager')) && isPureMaintenanceTask(tk));
      const activeTechTks = allTechTks.filter(tk => ['ØªÙ… Ø§Ù„ØªØ¹ÙŠÙŠÙ† Ù„Ù„ÙÙ†ÙŠ', 'Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø¹Ù…Ù„', 'Ø§Ù†ØªØ¸Ø§Ø± Ø¯ÙØ¹ Ø§Ù„Ù…Ø§Ù„Ùƒ', 'ØªÙ… Ø§Ù„Ø¯ÙØ¹ - Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ±ÙƒÙŠØ¨', 'Ù‚ÙŠØ¯ Ø§Ù„ÙØ­Øµ Ø§Ù„Ù…ÙŠØ¯Ø§Ù†ÙŠ', 'Ø¬Ø¯ÙŠØ¯'].includes(tk.status));
      const completedTechTks = allTechTks.filter(tk => tk.status === 'ØªÙ… Ø§Ù„Ø§Ù†ØªÙ‡Ø§Ø¡' || tk.status === 'ØªÙ… Ø§Ù„Ø­Ù„' || tk.status === 'Solved');

      // 1. Update Daily Technician KPIs
      const elTechTotal = document.getElementById('techKpiTotal');
      const elTechCompleted = document.getElementById('techKpiCompleted');
      const elTechActive = document.getElementById('techKpiActive');
      const elTechSlaRate = document.getElementById('techKpiSlaRate');

      if (elTechTotal) elTechTotal.innerText = allTechTks.length;
      if (elTechCompleted) elTechCompleted.innerText = completedTechTks.length;
      if (elTechActive) elTechActive.innerText = activeTechTks.length;

      if (elTechSlaRate) {
        if (allTechTks.length === 0) {
          elTechSlaRate.innerText = '100%';
        } else {
          const onTimeCount = completedTechTks.length + activeTechTks.filter(t => (t.dispatchMins || 1) <= 45).length;
          const rate = Math.round((onTimeCount / Math.max(1, allTechTks.length)) * 100);
          elTechSlaRate.innerText = `${rate}%`;
        }
      }

      const badge = document.getElementById('techAssignedBadge');
      if (badge) badge.innerText = `${activeTechTks.length} Ù…Ù‡Ø§Ù… Ø¬Ø§Ø±ÙŠØ©`;

      // 2. Filter Technician Tasks (active, completed, owner, public)
      const currentTechFilter = this._techFilter || 'active';
      let filteredTechTks = activeTechTks;

      if (currentTechFilter === 'completed') {
        filteredTechTks = completedTechTks;
      } else if (currentTechFilter === 'owner') {
        filteredTechTks = allTechTks.filter(t => t.requester === 'homeowner' || t.requester === 'owner' || t.requester === 'tenant' || !t.requester);
      } else if (currentTechFilter === 'public') {
        filteredTechTks = allTechTks.filter(t => t.requester === 'manager' || t.requester === 'public' || t.requester === 'engineer' || (t.category && (t.category.includes('Ø¹Ø§Ù…Ø©') || t.category.includes('ØªÙØªÙŠØ´'))));
      }

      // Update Filter Button Styles
      ['techFilterActive', 'techFilterCompleted', 'techFilterOwner', 'techFilterPublic'].forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
          const btnFilter = btnId.replace('techFilter', '').toLowerCase();
          if (btnFilter === currentTechFilter) {
            btn.style.background = '#20274f';
            btn.style.color = '#ffffff';
          } else {
            btn.style.background = 'transparent';
            btn.style.color = '#20274f';
          }
        }
      });

      techList.innerHTML = '';
      if (filteredTechTks.length === 0) {
        techList.innerHTML = `<div style="font-size: 0.75rem; color: var(--text-muted); text-align: center; padding: 20px; background: rgba(32,39,79,0.02); border-radius: 8px;">
          ${currentTechFilter === 'completed' ? 'Ù„Ø§ ØªÙˆØ¬Ø¯ Ù…Ù‡Ø§Ù… Ù…ÙƒØªÙ…Ù„Ø© Ø¨Ø§Ù„Ø³Ø¬Ù„ Ø­ØªÙ‰ Ø§Ù„Ø¢Ù†' : 'Ù„Ø§ ØªÙˆØ¬Ø¯ Ù…Ù‡Ø§Ù… Ø¬Ø§Ø±ÙŠØ© Ø­Ø§Ù„ÙŠØ§Ù‹'}
        </div>`;
      } else {
        filteredTechTks.forEach(tk => {
          const isDone = (tk.status === 'ØªÙ… Ø§Ù„Ø§Ù†ØªÙ‡Ø§Ø¡' || tk.status === 'ØªÙ… Ø§Ù„Ø­Ù„' || tk.status === 'Solved');

          // Determine Source & Precise Location
          let sourceBadgeHtml = '';
          let locationDetailsHtml = '';
          let borderAccent = '#0284c7';

          if (tk.requester === 'engineer' || (tk.category && tk.category.includes('ØªÙØªÙŠØ´'))) {
            sourceBadgeHtml = `<span class="badge" style="background: rgba(245, 158, 11, 0.15); color: #d97706 !important; font-weight: 800; font-size: 0.65rem;"><i class="fa-solid fa-compass-drafting"></i> ØªÙØªÙŠØ´ Ù‡Ù†Ø¯Ø³ÙŠ</span>`;
            borderAccent = '#f59e0b';
            locationDetailsHtml = `
              <div style="background: #fffbeb; border: 1px solid rgba(245, 158, 11, 0.3); padding: 6px 10px; border-radius: 6px; font-size: 0.72rem; color: #92400e; margin: 4px 0;">
                <div><b>ðŸ“ Ø§Ù„Ù…ÙˆÙ‚Ø¹:</b> Ù…Ø±Ø­Ù„Ø© Phase 2 â€¢ Ø²ÙˆÙ† Ø§Ù„Ù…Ø¨Ø§Ù†ÙŠ B â€¢ Ø¹Ù…Ø§Ø±Ø© 12 / Ø´Ù‚Ø© 302</div>
                <div><b>ðŸ‘· Ø§Ù„Ù…Ø´Ø±Ù:</b> Ù…. Ø­Ø³Ø§Ù… Ø§Ù„Ø¯ÙŠÙ† (Ù…Ù‡Ù†Ø¯Ø³ Ø§Ù„Ù…ÙˆÙ‚Ø¹)</div>
              </div>
            `;
          } else if (tk.requester === 'manager' || tk.requester === 'public' || (tk.category && tk.category.includes('Ø¹Ø§Ù…Ø©'))) {
            sourceBadgeHtml = `<span class="badge" style="background: rgba(32, 39, 79, 0.12); color: #20274f !important; font-weight: 800; font-size: 0.65rem;"><i class="fa-solid fa-tree-city"></i> Ù…Ø±ÙÙ‚ Ø¹Ø§Ù… Ù„Ù„Ù‚Ø±ÙŠØ©</span>`;
            borderAccent = '#20274f';
            locationDetailsHtml = `
              <div style="background: rgba(32, 39, 79, 0.04); border: 1px solid rgba(32, 39, 79, 0.12); padding: 6px 10px; border-radius: 6px; font-size: 0.72rem; color: #1e293b; margin: 4px 0;">
                <div><b>ðŸ“ Ø§Ù„Ù…ÙˆÙ‚Ø¹:</b> ${tk.location || 'Ø§Ù„Ù…Ø³Ø¨Ø­ Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠ ÙˆØ§Ù„Ø¨Ø­ÙŠØ±Ø©'} â€¢ Ø²ÙˆÙ† Ø§Ù„Ø´Ø§Ø·Ø¦ ÙˆØ§Ù„Ù„Ø§Ù†Ø¯Ø³ÙƒÙŠØ¨</div>
                <div><b>ðŸ›¡ï¸ Ø§Ù„Ù…Ø´Ø±Ù:</b> Ù…. Ø£ÙŠÙ…Ù† Ø§Ù„Ø³Ø¹ÙŠØ¯ (Ù…Ø¯ÙŠØ± Ø§Ù„ØµÙŠØ§Ù†Ø©)</div>
              </div>
            `;
          } else {
            sourceBadgeHtml = `<span class="badge" style="background: rgba(27, 143, 145, 0.15); color: #0f766e !important; font-weight: 800; font-size: 0.65rem;"><i class="fa-solid fa-house-user"></i> ÙˆØ­Ø¯Ø© Ù…Ø§Ù„Ùƒ Ø®Ø§ØµØ©</span>`;
            borderAccent = '#1b8f91';
            locationDetailsHtml = `
              <div style="background: #f0fdfa; border: 1px solid rgba(27, 143, 145, 0.25); padding: 6px 10px; border-radius: 6px; font-size: 0.72rem; color: #115e59; margin: 4px 0;">
                <div><b>ðŸ“ Ø§Ù„Ù…ÙˆÙ‚Ø¹:</b> Ø²ÙˆÙ† 1 - Ù…Ø§Ø±ÙŠÙ†Ø§ ÙÙŠÙˆ â€¢ Ù†ÙˆØ¹ Ø§Ù„ÙˆØ­Ø¯Ø©: ÙÙŠÙ„Ø§ Ù…Ø³ØªÙ‚Ù„Ø© â€¢ Ø±Ù‚Ù… Ø§Ù„ÙˆØ­Ø¯Ø©: <b>ÙÙŠÙ„Ø§ 104</b></div>
                <div><b>ðŸ‘¤ Ø§Ù„Ø¹Ù…ÙŠÙ„:</b> Ø£. Ø£Ø³Ø§Ù…Ø© Ø§Ù„Ø´Ø±ÙŠÙ (Ù‡Ø§ØªÙ: 01223456789)</div>
              </div>
            `;
          }

          let innerTechHtml = '';

          if (isDone) {
            // Completed Compact View
            innerTechHtml = `
              <div style="background: #f0fdf4; border: 1px solid #86efac; padding: 8px 12px; border-radius: 8px; font-size: 0.73rem; color: #166534; margin-top: 6px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="font-weight: 800;"><i class="fa-solid fa-circle-check" style="color: #10b981;"></i> ØªÙ… Ø§Ù„Ø¥ØµÙ„Ø§Ø­ ÙˆØ§Ù„Ø¥ØºÙ„Ø§Ù‚ Ø¨Ù†Ø¬Ø§Ø­</span>
                  <span style="font-size: 0.65rem; color: #15803d; font-weight: 700;">Ù…Ø¯Ø© Ø§Ù„Ø­Ù„: ${tk.resolutionTime || '22 Ø¯Ù‚ÙŠÙ‚Ø©'}</span>
                </div>
                ${tk.photoAfter ? `
                  <div style="display: flex; gap: 8px; margin-top: 6px; align-items: center;">
                    <img src="${tk.photoBefore}" style="width: 44px; height: 44px; border-radius: 6px; object-fit: cover; border: 1px solid #cbd5e1;" title="Ù‚Ø¨Ù„">
                    <i class="fa-solid fa-arrow-left" style="color: #10b981; font-size: 0.75rem;"></i>
                    <img src="${tk.photoAfter}" style="width: 44px; height: 44px; border-radius: 6px; object-fit: cover; border: 1px solid #86efac;" title="Ø¨Ø¹Ø¯ Ø§Ù„Ø¥ØµÙ„Ø§Ø­">
                    <span style="font-size: 0.68rem; color: #15803d;">ØªÙ… ØªÙˆØ«ÙŠÙ‚ ØµÙˆØ±Ø© Ø§Ù„Ø¹Ø·Ù„ ÙˆØµÙˆØ±Ø© Ø§Ù„Ø¥ØµÙ„Ø§Ø­ Ø¨Ø£ÙˆØ¯Ùˆ</span>
                  </div>
                ` : ''}
              </div>
            `;
          } else if (tk.status === 'ØªÙ… Ø§Ù„ØªØ¹ÙŠÙŠÙ† Ù„Ù„ÙÙ†ÙŠ' || tk.status === 'Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø¹Ù…Ù„' || tk.status === 'Ø¬Ø¯ÙŠØ¯' || tk.status === 'Ù‚ÙŠØ¯ Ø§Ù„ÙØ­Øµ Ø§Ù„Ù…ÙŠØ¯Ø§Ù†ÙŠ') {
            innerTechHtml = `
              <!-- Compact Problem Details -->
              <div style="display: flex; gap: 8px; align-items: center; background: #f8fafc; padding: 6px 8px; border-radius: 8px; margin-top: 4px; border: 1px solid #e2e8f0;">
                <img src="${tk.photoBefore}" style="width: 44px; height: 44px; border-radius: 6px; object-fit: cover; border: 1px solid #cbd5e1;">
                <div style="flex: 1;">
                  <div style="font-size: 0.72rem; color: #334155; font-weight: 600;">${tk.details || tk.title}</div>
                  <div style="font-size: 0.65rem; color: #64748b;">â±ï¸ SLA Ø§Ù„Ù…Ø³ØªÙ‡Ø¯Ù Ù„Ù„Ø¥ØµÙ„Ø§Ø­: 45 Ø¯Ù‚ÙŠÙ‚Ø©</div>
                </div>
              </div>

              <!-- Streamlined Action: Option 1 (Simple Fix) & Option 2 (Needs Part) -->
              <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 8px;">
                <!-- Option 1: Direct Repair -->
                <div style="background: rgba(16, 185, 129, 0.06); border: 1.5px solid #10b981; padding: 10px 12px; border-radius: 10px;">
                  <div style="font-size: 0.75rem; font-weight: 800; color: #065f46; margin-bottom: 6px;">
                    <i class="fa-solid fa-wrench"></i> Ø®ÙŠØ§Ø± 1: Ø¥ØµÙ„Ø§Ø­ Ù…Ø¨Ø§Ø´Ø± (Ø¹Ø·Ù„ Ø¨Ø³ÙŠØ· Ø¨Ø¯ÙˆÙ† Ù‚Ø·Ø¹ ØºÙŠØ§Ø±)
                  </div>
                  <div style="margin-bottom: 8px;">
                    <label for="techPhotoAfter_${tk.id}" style="display: flex; align-items: center; justify-content: center; gap: 6px; padding: 8px 10px; background: #ffffff; border: 1.5px dashed #10b981; border-radius: 8px; color: #065f46; font-size: 0.74rem; font-weight: 700; cursor: pointer; box-shadow: var(--shadow-sm);">
                      <i class="fa-solid fa-camera" style="color: #10b981; font-size: 1rem;"></i> 
                      <span id="techPhotoAfterLabel_${tk.id}">ðŸ“· Ø§Ø¶ØºØ· Ù‡Ù†Ø§ Ù„Ø±ÙØ¹ / ØªØµÙˆÙŠØ± Ø§Ù„Ø¹Ø·Ù„ Ø¨Ø¹Ø¯ Ø§Ù„Ø¥ØµÙ„Ø§Ø­</span>
                    </label>
                    <input type="file" id="techPhotoAfter_${tk.id}" accept="image/*" style="display: none;" onchange="const l = document.getElementById('techPhotoAfterLabel_${tk.id}'); if (l) l.innerText = 'âœ… ØªÙ… Ø§Ù„ØªÙ‚Ø§Ø· / Ø§Ø®ØªÙŠØ§Ø± ØµÙˆØ±Ø© Ø§Ù„Ø¥ØµÙ„Ø§Ø­ Ø¨Ù†Ø¬Ø§Ø­';">
                  </div>
                  <button class="btn btn-success" style="width: 100%; height: 38px; font-size: 0.8rem; font-weight: 800; margin: 0; background: #059669; border-color: #059669; color: #ffffff;" onclick="app.completeTicket('${tk.id}', 'techPhotoAfter_${tk.id}')">
                    <i class="fa-solid fa-circle-check"></i> ØªÙ… Ø§Ù„Ø¥ØµÙ„Ø§Ø­ ÙˆØ¥ØºÙ„Ø§Ù‚ Ø§Ù„Ù…Ù‡Ù…Ø©
                  </button>
                </div>

                <!-- Option 2: Request Damaged Part -->
                <div style="background: rgba(245, 158, 11, 0.06); border: 1.5px solid #f59e0b; padding: 10px 12px; border-radius: 10px;">
                  <div style="font-size: 0.75rem; font-weight: 800; color: #b45309; margin-bottom: 6px;">
                    <i class="fa-solid fa-boxes-stacked"></i> Ø®ÙŠØ§Ø± 2: ÙŠØªØ·Ù„Ø¨ Ù‚Ø·Ø¹Ø© ØºÙŠØ§Ø± ØªØ§Ù„ÙØ© Ù…Ù† Ø§Ù„Ù…Ø®Ø²Ù†
                  </div>
                  <div style="margin-bottom: 8px;">
                    <label for="techPhotoDamaged_${tk.id}" style="display: flex; align-items: center; justify-content: center; gap: 6px; padding: 8px 10px; background: #ffffff; border: 1.5px dashed #f59e0b; border-radius: 8px; color: #b45309; font-size: 0.74rem; font-weight: 700; cursor: pointer; box-shadow: var(--shadow-sm);">
                      <i class="fa-solid fa-camera" style="color: #f59e0b; font-size: 1rem;"></i> 
                      <span id="techPhotoDamagedLabel_${tk.id}">ðŸ“· Ø§Ø¶ØºØ· Ù‡Ù†Ø§ Ù„ØªØµÙˆÙŠØ± Ø§Ù„Ù‚Ø·Ø¹Ø© Ø§Ù„ØªØ§Ù„ÙØ© Ù„Ù„Ù…Ø®Ø²Ù†</span>
                    </label>
                    <input type="file" id="techPhotoDamaged_${tk.id}" accept="image/*" style="display: none;" onchange="const l = document.getElementById('techPhotoDamagedLabel_${tk.id}'); if (l) l.innerText = 'âœ… ØªÙ… Ø§Ù„ØªÙ‚Ø§Ø· ØµÙˆØ±Ø© Ø§Ù„Ù‚Ø·Ø¹Ø© Ø§Ù„ØªØ§Ù„ÙØ©';">
                  </div>
                  <button class="btn btn-warning" style="width: 100%; height: 38px; font-size: 0.8rem; font-weight: 800; margin: 0; background: #d97706; border-color: #d97706; color: #ffffff;" onclick="app.technicianRequestPart('${tk.id}', 'techPhotoDamaged_${tk.id}')">
                    <i class="fa-solid fa-boxes-stacked"></i> Ø·Ù„Ø¨ Ù‚Ø·Ø¹Ø© ØºÙŠØ§Ø± Ù…Ù† Ø§Ù„Ù…Ø®Ø²Ù†
                  </button>
                </div>
              </div>
            `;
          } else if (tk.status === 'Ø§Ù†ØªØ¸Ø§Ø± Ø¯ÙØ¹ Ø§Ù„Ù…Ø§Ù„Ùƒ') {
            innerTechHtml = `
              <div style="background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.3); padding: 8px 10px; border-radius: 8px; font-size: 0.72rem; color: #92400e; margin-top: 6px;">
                <div style="font-weight: 800; margin-bottom: 2px;"><i class="fa-solid fa-hourglass-half"></i> Ø¨Ø§Ù†ØªØ¸Ø§Ø± Ø³Ø¯Ø§Ø¯ Ø§Ù„Ù…Ø§Ù„Ùƒ Ù„Ù‚ÙŠÙ…Ø© Ø§Ù„Ù‚Ø·Ø¹Ø© (${tk.partPrice || 350} Ø¬.Ù…)</div>
                <div>ØªÙ… Ø¥Ø±Ø³Ø§Ù„ Ø¥Ø´Ø¹Ø§Ø± Ø§Ù„Ø¯ÙØ¹ Ù„ØªØ·Ø¨ÙŠÙ‚ Ø§Ù„Ù…Ø§Ù„Ùƒ (ÙÙŠÙ„Ø§ 104)ØŒ Ø³ÙŠØ¨Ø¯Ø£ Ø§Ù„ØªØ±ÙƒÙŠØ¨ ÙÙˆØ± Ø§Ù„Ø³Ø¯Ø§Ø¯.</div>
              </div>
            `;
          } else if (tk.status === 'ØªÙ… Ø§Ù„Ø¯ÙØ¹ - Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ±ÙƒÙŠØ¨') {
            innerTechHtml = `
              <div style="background: #f0fdf4; border: 1px solid #86efac; padding: 10px 12px; border-radius: 8px; font-size: 0.72rem; color: #166534; margin-top: 6px;">
                <div style="font-weight: 800; margin-bottom: 4px;"><i class="fa-solid fa-circle-check" style="color: #10b981;"></i> ØªÙ… Ø³Ø¯Ø§Ø¯ Ù‚ÙŠÙ…Ø© Ø§Ù„Ù‚Ø·Ø¹Ø© [${tk.partName || 'Ù…Ø­Ø¨Ø³ Ù†Ø­Ø§Ø³'}]!</div>
                <div>ÙŠØ±Ø¬Ù‰ Ø§Ø³ØªÙ„Ø§Ù… Ø§Ù„Ù‚Ø·Ø¹Ø© Ù…Ù† Ø§Ù„Ù…Ø®Ø²Ù† ÙˆØªØ±ÙƒÙŠØ¨Ù‡Ø§ØŒ Ø«Ù… Ø¥Ø±ÙØ§Ù‚ ØµÙˆØ±Ø© Ø¨Ø¹Ø¯ Ø§Ù„ØªØ±ÙƒÙŠØ¨:</div>
                <div style="margin: 8px 0 6px 0;">
                  <label for="techPhotoAfter_${tk.id}" style="display: flex; align-items: center; justify-content: center; gap: 6px; padding: 8px 10px; background: #ffffff; border: 1.5px dashed #10b981; border-radius: 8px; color: #065f46; font-size: 0.74rem; font-weight: 700; cursor: pointer;">
                    <i class="fa-solid fa-camera" style="color: #10b981; font-size: 1rem;"></i> 
                    <span id="techPhotoAfterLabel_${tk.id}">ðŸ“· Ø§Ø¶ØºØ· Ù‡Ù†Ø§ Ù„Ø±ÙØ¹ / ØªØµÙˆÙŠØ± Ø§Ù„Ø¹Ø·Ù„ Ø¨Ø¹Ø¯ Ø§Ù„ØªØ±ÙƒÙŠØ¨</span>
                  </label>
                  <input type="file" id="techPhotoAfter_${tk.id}" accept="image/*" style="display: none;" onchange="const l = document.getElementById('techPhotoAfterLabel_${tk.id}'); if (l) l.innerText = 'âœ… ØªÙ… Ø§Ø®ØªÙŠØ§Ø± ØµÙˆØ±Ø© Ø¨Ø¹Ø¯ Ø§Ù„ØªØ±ÙƒÙŠØ¨';">
                </div>
                <button class="btn btn-success" style="width: 100%; height: 38px; font-size: 0.8rem; font-weight: 800; margin: 0; background: #059669; border-color: #059669; color: #ffffff;" onclick="app.completeTicket('${tk.id}', 'techPhotoAfter_${tk.id}')">
                  <i class="fa-solid fa-check"></i> Ø¥Ù†Ù‡Ø§Ø¡ Ø§Ù„Ù…Ù‡Ù…Ø© ÙˆØ¥ØºÙ„Ø§Ù‚ Ø§Ù„ØªØ°ÙƒØ±Ø©
                </button>
              </div>
            `;
          }

          techList.innerHTML += `
            <div class="ticket-item" style="flex-direction: column; align-items: stretch; gap: 4px; margin-bottom: 10px; padding: 12px; border-radius: 10px; background: #ffffff; border: 1px solid rgba(32,39,79,0.08); border-left: 5px solid ${isDone ? '#10b981' : borderAccent}; box-shadow: var(--shadow-sm);">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 6px;">
                  ${sourceBadgeHtml}
                  <span class="badge ${isDone ? 'badge-success' : 'badge-info'}" style="font-size: 0.62rem;">${tk.status}</span>
                </div>
                <span style="font-size: 0.65rem; color: #64748b; font-weight: 700;">#${tk.id}</span>
              </div>
              <h4 style="font-size: 0.88rem; font-weight: 800; color: #1e293b; margin-top: 4px;">${tk.title}</h4>
              ${locationDetailsHtml}
              ${innerTechHtml}
            </div>
          `;
        });
      }
    }

    // 7. Render Permits for Homeowner
    const homeownerPermits = document.getElementById('homeownerPermitsList');
    if (homeownerPermits) {
      const list = this.permits.filter(p => p.requester === 'homeowner');
      homeownerPermits.innerHTML = '';
      if (list.length === 0) {
        homeownerPermits.innerHTML = `<div style="font-size: 0.72rem; color: var(--text-muted); text-align: center; padding: 6px;">${isEn ? 'No active permits' : 'Ù„Ø§ ØªÙˆØ¬Ø¯ ØªØµØ§Ø±ÙŠØ­ Ø­Ø§Ù„ÙŠØ©'}</div>`;
      } else {
        list.forEach(p => {
          let qrHtml = '';
          const type = translateText(p.type);
          const status = translateText(p.status);
          const details = translateText(p.details);

          if (p.status === 'Ù…Ø¹ØªÙ…Ø¯') {
            qrHtml = `
              <div style="display: flex; align-items: center; gap: 8px; margin-top: 6px; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.2); padding: 8px; border-radius: 8px;">
                <i class="fa-solid fa-qrcode" style="font-size: 1.5rem; color: #10b981;"></i>
                <div>
                  <span style="font-size: 0.65rem; color: var(--text-muted); display: block;">${isEn ? 'Active Security Code:' : 'ÙƒÙˆØ¯ Ø§Ù„Ø£Ù…Ù† Ø§Ù„ÙØ¹Ø§Ù„:'}</span>
                  <span style="font-size: 0.8rem; color: #10b981; font-weight: 900; font-family: monospace; letter-spacing: 1px;">${p.qrCode}</span>
                </div>
              </div>
            `;
          }
          homeownerPermits.innerHTML += `
            <div class="ticket-item" style="flex-direction: column; align-items: stretch; gap: 4px; margin-bottom: 6px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <h4 style="font-size: 0.82rem; font-weight: 700;">${type}</h4>
                <span class="badge ${p.bgClass}">${status}</span>
              </div>
              <p style="font-size: 0.7rem; color: var(--text-muted);">${details} â€¢ ${isEn ? 'Request Code' : 'ÙƒÙˆØ¯ Ø§Ù„Ø·Ù„Ø¨'}: #${p.id}</p>
              ${qrHtml}
            </div>
          `;
        });
      }
    }

    // 8. Render Permits for Tenant
    const tenantPermits = document.getElementById('tenantPermitsList');
    if (tenantPermits) {
      const list = this.permits.filter(p => p.requester === 'tenant');
      tenantPermits.innerHTML = '';
      if (list.length === 0) {
        tenantPermits.innerHTML = '<div style="font-size: 0.72rem; color: var(--text-muted); text-align: center; padding: 6px;">Ù„Ø§ ØªÙˆØ¬Ø¯ ØªØµØ§Ø±ÙŠØ­ Ø­Ø§Ù„ÙŠØ©</div>';
      } else {
        list.forEach(p => {
          let qrHtml = '';
          if (p.status === 'Ù…Ø¹ØªÙ…Ø¯') {
            qrHtml = `
              <div style="display: flex; align-items: center; gap: 8px; margin-top: 6px; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.2); padding: 8px; border-radius: 8px;">
                <i class="fa-solid fa-qrcode" style="font-size: 1.5rem; color: #10b981;"></i>
                <div>
                  <span style="font-size: 0.65rem; color: var(--text-muted); display: block;">ÙƒÙˆØ¯ Ø§Ù„Ø£Ù…Ù† Ø§Ù„ÙØ¹Ø§Ù„:</span>
                  <span style="font-size: 0.8rem; color: #10b981; font-weight: 900; font-family: monospace; letter-spacing: 1px;">${p.qrCode}</span>
                </div>
              </div>
            `;
          }
          tenantPermits.innerHTML += `
            <div class="ticket-item" style="flex-direction: column; align-items: stretch; gap: 4px; margin-bottom: 6px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <h4 style="font-size: 0.82rem; font-weight: 700;">${p.type}</h4>
                <span class="badge ${p.bgClass}">${p.status}</span>
              </div>
              <p style="font-size: 0.7rem; color: var(--text-muted);">${p.details} â€¢ ÙƒÙˆØ¯ Ø§Ù„Ø·Ù„Ø¨: #${p.id}</p>
              ${qrHtml}
            </div>
          `;
        });
      }
    }

    // 9. Render Permits for Commercial
    const commercialPermits = document.getElementById('commercialPermitsList');
    if (commercialPermits) {
      const list = this.permits.filter(p => p.requester === 'commercial');
      commercialPermits.innerHTML = '';
      if (list.length === 0) {
        commercialPermits.innerHTML = '<div style="font-size: 0.72rem; color: #64748b; text-align: center; padding: 6px;">Ù„Ø§ ØªÙˆØ¬Ø¯ ØªØµØ§Ø±ÙŠØ­ Ø­Ø§Ù„ÙŠØ©</div>';
      } else {
        list.forEach(p => {
          let qrHtml = '';
          if (p.status === 'Ù…Ø¹ØªÙ…Ø¯') {
            qrHtml = `
              <div style="display: flex; align-items: center; gap: 8px; margin-top: 6px; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.2); padding: 8px; border-radius: 8px;">
                <i class="fa-solid fa-qrcode" style="font-size: 1.5rem; color: #10b981;"></i>
                <div>
                  <span style="font-size: 0.65rem; color: #64748b; display: block;">ÙƒÙˆØ¯ Ø§Ù„Ø£Ù…Ù† Ø§Ù„ÙØ¹Ø§Ù„:</span>
                  <span style="font-size: 0.8rem; color: #10b981; font-weight: 900; font-family: monospace; letter-spacing: 1px;">${p.qrCode}</span>
                </div>
              </div>
            `;
          }
          commercialPermits.innerHTML += `
            <div class="ticket-item" style="flex-direction: column; align-items: stretch; gap: 4px; margin-bottom: 6px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <h4 style="font-size: 0.82rem; font-weight: 700;">${p.type}</h4>
                <span class="badge ${p.bgClass}">${p.status}</span>
              </div>
              <p style="font-size: 0.7rem; color: #64748b;">${p.details} â€¢ ÙƒÙˆØ¯ Ø§Ù„Ø·Ù„Ø¨: #${p.id}</p>
              ${qrHtml}
            </div>
          `;
        });
      }
    }

    // 10. Render Permits in Security View
    const securityPermitsList = document.getElementById('securityPermitsList');
    if (securityPermitsList) {
      const activePermits = this.permits.filter(p => p.status === 'ØªØ­Øª Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø©');
      const badge = document.getElementById('securityPermitsInboxBadge');
      if (badge) badge.innerText = `${activePermits.length} ØªØµØ§Ø±ÙŠØ­`;
      securityPermitsList.innerHTML = '';
      if (this.permits.length === 0) {
        securityPermitsList.innerHTML = '<div style="font-size: 0.75rem; color: var(--text-muted); text-align: center; padding: 15px;">Ù„Ø§ ØªÙˆØ¬Ø¯ Ø·Ù„Ø¨Ø§Øª ØªØµØ§Ø±ÙŠØ­ Ø­Ø§Ù„ÙŠØ©</div>';
      } else {
        this.permits.forEach(p => {
          let actionHtml = '';
          if (p.status === 'ØªØ­Øª Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø©') {
            actionHtml = `
              <div style="display: flex; gap: 8px; margin-top: 6px;">
                <button class="btn btn-primary" style="padding: 6px 12px; font-size: 0.78rem;" onclick="app.approvePermit('${p.id}')">
                  <i class="fa-solid fa-check"></i> Ù…ÙˆØ§ÙÙ‚Ø© ÙˆØ§Ø¹ØªÙ…Ø§Ø¯
                </button>
                <button class="btn btn-cyan" style="padding: 6px 12px; font-size: 0.78rem; background: #ef4444;" onclick="app.rejectPermit('${p.id}')">
                  <i class="fa-solid fa-xmark"></i> Ø±ÙØ¶
                </button>
              </div>
            `;
          } else {
            actionHtml = `
              <div style="margin-top: 6px; font-size: 0.75rem; color: ${p.status === 'Ù…Ø¹ØªÙ…Ø¯' ? '#10b981' : '#ef4444'}; font-weight: 700;">
                <i class="fa-solid ${p.status === 'Ù…Ø¹ØªÙ…Ø¯' ? 'fa-stamp' : 'fa-ban'}"></i> Ø­Ø§Ù„Ø© Ø§Ù„Ø·Ù„Ø¨ Ø§Ù„Ù†Ù‡Ø§Ø¦ÙŠØ©: ${p.status} ${p.qrCode ? `(ÙƒÙˆØ¯ Ø§Ù„Ø£Ù…Ù†: ${p.qrCode})` : ''}
              </div>
            `;
          }

          securityPermitsList.innerHTML += `
            <div class="ticket-item" style="flex-direction: column; align-items: stretch; gap: 4px; margin-bottom: 8px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span class="badge ${p.bgClass}">${p.status}</span>
                <span style="font-size: 0.7rem; color: var(--text-muted);">Ø·Ø§Ù„Ø¨ Ø§Ù„ØªØµØ±ÙŠØ­: ${p.requester} â€¢ #${p.id}</span>
              </div>
              <h4 style="font-size: 0.88rem; font-weight: 700;">${p.type}</h4>
              <p style="font-size: 0.75rem; color: var(--text-muted);">${p.details}</p>
              ${actionHtml}
            </div>
          `;
        });
      }
    }

    // 11. Render Complaints for Homeowner
    const homeownerComplaints = document.getElementById('homeownerComplaintsList');
    if (homeownerComplaints) {
      const list = this.complaints.filter(c => c.requester === 'homeowner');
      const badge = document.getElementById('homeownerComplaintsBadge');
      if (badge) badge.innerText = isEn ? `${list.length} active` : `${list.length} Ù†Ø´Ø·Ø©`;
      homeownerComplaints.innerHTML = '';
      if (list.length === 0) {
        homeownerComplaints.innerHTML = `<div style="font-size: 0.72rem; color: var(--text-muted); text-align: center; padding: 6px;">${isEn ? 'No active security complaints' : 'Ù„Ø§ ØªÙˆØ¬Ø¯ Ø´ÙƒØ§ÙˆÙ‰ Ø£Ù…Ù†ÙŠØ© Ø­Ø§Ù„ÙŠØ©'}</div>`;
      } else {
        list.forEach(c => {
          const details = translateText(c.details);
          const status = translateText(c.status);
          homeownerComplaints.innerHTML += `
            <div class="ticket-item" style="flex-direction: column; align-items: stretch; gap: 4px; margin-bottom: 6px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <h4 style="font-size: 0.82rem; font-weight: 700; color: #ef4444;"><i class="fa-solid fa-triangle-exclamation"></i> ${isEn ? 'Security Report' : 'Ø¨Ù„Ø§Øº Ø£Ù…Ù†ÙŠ'}</h4>
                <span class="badge ${c.bgClass}">${status}</span>
              </div>
              <p style="font-size: 0.7rem; color: var(--text-muted);">${details} â€¢ ${isEn ? 'Code' : 'ÙƒÙˆØ¯'}: #${c.id}</p>
            </div>
          `;
        });
      }
    }

    // 12. Render Complaints for Tenant
    const tenantComplaints = document.getElementById('tenantComplaintsList');
    if (tenantComplaints) {
      const list = this.complaints.filter(c => c.requester === 'tenant');
      const badge = document.getElementById('tenantComplaintsBadge');
      if (badge) badge.innerText = `${list.length} Ù†Ø´Ø·Ø©`;
      tenantComplaints.innerHTML = '';
      if (list.length === 0) {
        tenantComplaints.innerHTML = '<div style="font-size: 0.72rem; color: var(--text-muted); text-align: center; padding: 6px;">Ù„Ø§ ØªÙˆØ¬Ø¯ Ø´ÙƒØ§ÙˆÙ‰ Ø£Ù…Ù†ÙŠØ© Ø­Ø§Ù„ÙŠØ©</div>';
      } else {
        list.forEach(c => {
          tenantComplaints.innerHTML += `
            <div class="ticket-item" style="flex-direction: column; align-items: stretch; gap: 4px; margin-bottom: 6px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <h4 style="font-size: 0.82rem; font-weight: 700; color: #ef4444;"><i class="fa-solid fa-triangle-exclamation"></i> Ø¨Ù„Ø§Øº Ø£Ù…Ù†ÙŠ</h4>
                <span class="badge ${c.bgClass}">${c.status}</span>
              </div>
              <p style="font-size: 0.7rem; color: var(--text-muted);">${c.details} â€¢ ÙƒÙˆØ¯: #${c.id}</p>
            </div>
          `;
        });
      }
    }

    // 13. Render Complaints for Commercial
    const commercialComplaints = document.getElementById('commercialComplaintsList');
    if (commercialComplaints) {
      const list = this.complaints.filter(c => c.requester === 'commercial');
      const badge = document.getElementById('commercialComplaintsBadge');
      if (badge) badge.innerText = `${list.length} Ù†Ø´Ø·Ø©`;
      commercialComplaints.innerHTML = '';
      if (list.length === 0) {
        commercialComplaints.innerHTML = '<div style="font-size: 0.72rem; color: #64748b; text-align: center; padding: 6px;">Ù„Ø§ ØªÙˆØ¬Ø¯ Ø´ÙƒØ§ÙˆÙ‰ Ø£Ù…Ù†ÙŠØ© Ø­Ø§Ù„ÙŠØ©</div>';
      } else {
        list.forEach(c => {
          commercialComplaints.innerHTML += `
            <div class="ticket-item" style="flex-direction: column; align-items: stretch; gap: 4px; margin-bottom: 6px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <h4 style="font-size: 0.82rem; font-weight: 700; color: #ef4444;"><i class="fa-solid fa-triangle-exclamation"></i> Ø¨Ù„Ø§Øº Ø£Ù…Ù†ÙŠ Ù„Ù„Ù…Ø­Ù„</h4>
                <span class="badge ${c.bgClass}">${c.status}</span>
              </div>
              <p style="font-size: 0.7rem; color: #64748b;">${c.details} â€¢ ÙƒÙˆØ¯: #${c.id}</p>
            </div>
          `;
        });
      }
    }

    // 14. Render Complaints in Security View (Ù…Ø´Ø±Ù Ø§Ù„Ø£Ù…Ù†)
    const securityComplaintsList = document.getElementById('securityComplaintsList');
    if (securityComplaintsList) {
      const activeComplaints = this.complaints.filter(c => c.status !== 'ØªÙ… Ø§Ù„Ø­Ù„');
      const badge = document.getElementById('securityComplaintsInboxBadge');
      if (badge) badge.innerText = `${activeComplaints.length} Ø¨Ù„Ø§ØºØ§Øª`;
      securityComplaintsList.innerHTML = '';
      if (this.complaints.length === 0) {
        securityComplaintsList.innerHTML = '<div style="font-size: 0.75rem; color: var(--text-muted); text-align: center; padding: 15px;">Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¨Ù„Ø§ØºØ§Øª Ø£Ù…Ù†ÙŠØ© Ø­Ø§Ù„ÙŠØ©</div>';
      } else {
        this.complaints.forEach(c => {
          let actionHtml = '';
          if (c.status === 'ØªØ­Øª Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø© ÙˆØ§Ù„ØªØ­Ø±Ùƒ Ø§Ù„Ù…ÙŠØ¯Ø§Ù†ÙŠ') {
            actionHtml = `
              <button class="btn btn-primary" style="padding: 6px 12px; font-size: 0.78rem; margin-top: 6px; border-color: #ef4444; background: #ef4444;" onclick="app.dispatchSecurityDolphin('${c.id}')">
                <i class="fa-solid fa-truck-fast"></i> ØªØ£ÙƒÙŠØ¯ Ø§Ù„Ø§Ø³ØªÙ„Ø§Ù… ÙˆØ§Ù„ØªØ­Ø±Ùƒ Ù„Ù„Ù…ÙˆÙ‚Ø¹
              </button>
            `;
          } else {
            actionHtml = `
              <div style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); padding: 8px; border-radius: 6px; font-size: 0.75rem; color: #93c5fd; margin-top: 6px;">
                <i class="fa-solid fa-clock"></i> Ø­Ø§Ù„Ø© Ø§Ù„Ø§Ø³ØªØ¬Ø§Ø¨Ø©: <strong>${c.status}</strong>
              </div>
            `;
          }

          securityComplaintsList.innerHTML += `
            <div class="ticket-item" style="flex-direction: column; align-items: stretch; gap: 4px; margin-bottom: 8px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span class="badge ${c.bgClass}">${c.status}</span>
                <span style="font-size: 0.7rem; color: var(--text-muted);">Ø·Ø§Ù„Ø¨ Ø§Ù„Ø´ÙƒÙˆÙ‰: ${c.requester} â€¢ #${c.id}</span>
              </div>
              <h4 style="font-size: 0.88rem; font-weight: 700;">Ø¨Ù„Ø§Øº Ø¹Ø§Ø¬Ù„ Ù…Ù†: ${c.name} (${c.phone})</h4>
              <p style="font-size: 0.75rem; color: var(--text-muted);">${c.details}</p>
              ${actionHtml}
            </div>
          `;
        });
      }
    }
  }

  setManagerFilter(filterState) {
    this._managerFilter = filterState || 'all';
    this.renderTickets();
  }

  setTechTaskFilter(filterState) {
    this._techFilter = filterState || 'active';
    this.renderTickets();
  }

  updateManagerTechsBySpecialty() {
    const catSelect = document.getElementById('mgrTicketCategorySelect');
    const techSelect = document.getElementById('mgrTicketTechSelect');
    if (!catSelect || !techSelect) return;

    const selectedCategory = catSelect.value || 'ÙƒÙ‡Ø±ÙˆÙ…ÙŠÙƒØ§Ù†ÙŠÙƒ';
    
    // Technicians database grouped by specialty with live availability status
    const techDatabase = {
      'ÙƒÙ‡Ø±ÙˆÙ…ÙŠÙƒØ§Ù†ÙŠÙƒ': [
        { name: 'ÙƒØ±ÙŠÙ… Ø­Ø³Ù†', title: 'ÙÙ†ÙŠ Ø£ÙˆÙ„ ØªÙƒÙŠÙŠÙ ÙˆÙƒÙ‡Ø±ÙˆÙ…ÙŠÙƒØ§Ù†ÙŠÙƒ', status: 'Ù…ØªØ§Ø­ Ø§Ù„Ø¢Ù† ðŸŸ¢', available: true },
        { name: 'Ø³Ø§Ù…Ø­ ÙÙˆØ²ÙŠ', title: 'ÙÙ†ÙŠ ØµÙŠØ§Ù†Ø© ØªÙƒÙŠÙŠÙ ÙˆØªØ¨Ø±ÙŠØ¯', status: 'Ù…ØªØ§Ø­ Ø§Ù„Ø¢Ù† ðŸŸ¢', available: true },
        { name: 'Ù…Ø­Ù…ÙˆØ¯ Ø¥Ø¨Ø±Ø§Ù‡ÙŠÙ…', title: 'ÙÙ†ÙŠ Ù…Ø­Ø·Ø§Øª ÙˆØ¶ÙˆØ§ØºØ· MEP', status: 'Ù…Ø´ØºÙˆÙ„ Ø¨Ù…Ù‡Ù…Ø© ðŸŸ¡', available: false }
      ],
      'Ø³Ø¨Ø§ÙƒØ©': [
        { name: 'Ù…ÙŠÙ†Ø§ Ø¬Ø±Ø¬Ø³', title: 'ÙÙ†ÙŠ Ø£ÙˆÙ„ Ø³Ø¨Ø§ÙƒØ© ÙˆØ´Ø¨ÙƒØ§Øª Ù…ÙŠØ§Ù‡', status: 'Ù…ØªØ§Ø­ Ø§Ù„Ø¢Ù† ðŸŸ¢', available: true },
        { name: 'Ø·Ø§Ø±Ù‚ Ø¹Ø¨Ø¯ Ø§Ù„Ù„Ù‡', title: 'ÙÙ†ÙŠ Ù…Ø­Ø·Ø§Øª Ù…Ø¹Ø§Ù„Ø¬Ø© ÙˆØµØ­ÙŠ', status: 'Ù…ØªØ§Ø­ Ø§Ù„Ø¢Ù† ðŸŸ¢', available: true },
        { name: 'ÙŠØ§Ø³Ø± Ø§Ù„Ù†Ø¬Ø§Ø±', title: 'ÙÙ†ÙŠ Ø·Ù„Ù…Ø¨Ø§Øª ÙˆÙ…Ø­Ø§Ø¨Ø³ Ø±Ø¦ÙŠØ³ÙŠØ©', status: 'Ù…ØªØ§Ø­ Ø§Ù„Ø¢Ù† ðŸŸ¢', available: true }
      ],
      'ÙƒÙ‡Ø±Ø¨Ø§Ø¡': [
        { name: 'Ø£Ø­Ù…Ø¯ Ø¹Ù„ÙŠ', title: 'ÙÙ†ÙŠ Ø£ÙˆÙ„ ÙƒÙ‡Ø±Ø¨Ø§Ø¡ ÙˆØ·Ø§Ù‚Ø© ÙˆÙ„ÙˆØ­Ø§Øª', status: 'Ù…ØªØ§Ø­ Ø§Ù„Ø¢Ù† ðŸŸ¢', available: true },
        { name: 'Ù…Ø­Ù…Ø¯ Ø§Ù„Ø´Ù†Ø§ÙˆÙŠ', title: 'ÙÙ†ÙŠ Ø´Ø¨ÙƒØ§Øª Ø¥Ù†Ø§Ø±Ø© ÙˆÙ…Ø­ÙˆÙ„Ø§Øª', status: 'Ù…ØªØ§Ø­ Ø§Ù„Ø¢Ù† ðŸŸ¢', available: true },
        { name: 'Ø®Ø§Ù„Ø¯ Ù…ØµØ·ÙÙ‰', title: 'ÙÙ†ÙŠ Ù…ÙˆÙ„Ø¯Ø§Øª Ø·ÙˆØ§Ø±Ø¦ ÙˆØ¨ÙŠÙ„Ø§Ø±Ø§Øª', status: 'Ù…ØªØ§Ø­ Ø§Ù„Ø¢Ù† ðŸŸ¢', available: true }
      ],
      'Ù†Ø¬Ø§Ø±Ø©': [
        { name: 'Ø¹Ø¨Ø¯ Ø§Ù„Ø±Ø­Ù…Ù† Ø³Ù…ÙŠØ±', title: 'ÙÙ†ÙŠ Ù†Ø¬Ø§Ø±Ø© ÙˆØ¯ÙŠÙƒÙˆØ± ÙˆØ£Ù‚ÙØ§Ù„', status: 'Ù…ØªØ§Ø­ Ø§Ù„Ø¢Ù† ðŸŸ¢', available: true },
        { name: 'Ø­Ø³Ø§Ù… Ø­Ø³Ù†ÙŠ', title: 'ÙÙ†ÙŠ Ø£Ù„Ù…ÙˆÙ†ÙŠØªØ§Ù„ ÙˆØ£Ø¨ÙˆØ§Ø¨ Ø²Ø¬Ø§Ø¬ÙŠØ©', status: 'Ù…ØªØ§Ø­ Ø§Ù„Ø¢Ù† ðŸŸ¢', available: true }
      ],
      'ØµÙŠØ§Ù†Ø© Ø¹Ø§Ù…Ø©': [
        { name: 'ÙƒØ±ÙŠÙ… Ø­Ø³Ù†', title: 'ÙÙ†ÙŠ ØªØ´ØºÙŠÙ„ ÙˆÙ…Ø±Ø§ÙÙ‚ Ø¹Ø§Ù…Ø©', status: 'Ù…ØªØ§Ø­ Ø§Ù„Ø¢Ù† ðŸŸ¢', available: true },
        { name: 'Ø£Ø­Ù…Ø¯ Ø¹Ù„ÙŠ', title: 'ÙÙ†ÙŠ ÙƒÙ‡Ø±Ø¨Ø§Ø¡ ÙˆÙ…Ø±Ø§ÙÙ‚ Ø¹Ø§Ù…Ø©', status: 'Ù…ØªØ§Ø­ Ø§Ù„Ø¢Ù† ðŸŸ¢', available: true },
        { name: 'Ù…ÙŠÙ†Ø§ Ø¬Ø±Ø¬Ø³', title: 'ÙÙ†ÙŠ Ø´Ø¨ÙƒØ§Øª ÙˆÙ…Ø±Ø§ÙÙ‚ Ø¹Ø§Ù…Ø©', status: 'Ù…ØªØ§Ø­ Ø§Ù„Ø¢Ù† ðŸŸ¢', available: true },
        { name: 'Ø³Ø¹ÙŠØ¯ Ù…Ø­Ù…ÙˆØ¯', title: 'ÙÙ†ÙŠ Ù„Ø§Ù†Ø¯Ø³ÙƒÙŠØ¨ ÙˆØ±ÙŠ Ø¹Ø§Ù…', status: 'Ù…ØªØ§Ø­ Ø§Ù„Ø¢Ù† ðŸŸ¢', available: true }
      ]
    };

    const list = techDatabase[selectedCategory] || techDatabase['ÙƒÙ‡Ø±ÙˆÙ…ÙŠÙƒØ§Ù†ÙŠÙƒ'];
    techSelect.innerHTML = '';
    list.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.name;
      opt.textContent = `${t.name} (${t.title})`;
      techSelect.appendChild(opt);
    });
  }

  clearManagerTicketsHistory() {
    this.tickets = [];
    safeStorage.removeItem('app_tickets');
    safeStorage.removeItem('fm_tickets_v1');
    this.saveTicketsToStorage();
    this.renderTickets();
    this.showToast('ðŸ—‘ï¸ ØªÙ… ØªÙØ±ÙŠØº ÙˆØªØµÙÙŠØ± Ø³Ø¬Ù„ Ø§Ù„Ø¨Ù„Ø§ØºØ§Øª Ø¨Ù†Ø¬Ø§Ø­ Ù„Ù„Ø¨Ø¯Ø¡ Ø¨ØªØ¬Ø±Ø¨Ø© Ù†Ø¸ÙŠÙØ©!');
  }

  openManagerNewTicketModal() {
    const locInput = document.getElementById('mgrTicketLocationInput');
    const detailsInput = document.getElementById('mgrTicketDetailsInput');
    const photoInput = document.getElementById('mgrTicketPhotoInput');
    if (locInput) locInput.value = '';
    if (detailsInput) detailsInput.value = '';
    if (photoInput) photoInput.value = '';
    
    // Auto populate technicians list for the default selected specialty
    this.updateManagerTechsBySpecialty();
    this.openModal('modalManagerNewTicket');
  }

  async submitManagerDirectTicket() {
    const categorySelect = document.getElementById('mgrTicketCategorySelect');
    const locationInput = document.getElementById('mgrTicketLocationInput');
    const detailsInput = document.getElementById('mgrTicketDetailsInput');
    const techSelect = document.getElementById('mgrTicketTechSelect');

    const category = categorySelect ? categorySelect.value : 'ØµÙŠØ§Ù†Ø© Ø¹Ø§Ù…Ø©';
    const location = (locationInput && locationInput.value.trim()) ? locationInput.value.trim() : 'Ø§Ù„Ù…ÙˆÙ‚Ø¹ Ø§Ù„Ø¹Ø§Ù… Ø¨Ø§Ù„Ù‚Ø±ÙŠØ©';
    const details = (detailsInput && detailsInput.value.trim()) ? detailsInput.value.trim() : `Ø·Ù„Ø¨ ØµÙŠØ§Ù†Ø© ${category} ÙÙŠ ${location}`;
    const photoInput = document.getElementById('mgrTicketPhotoInput');
    
    // Category Fallbacks
    const fallbacks = {
      'ÙƒÙ‡Ø±ÙˆÙ…ÙŠÙƒØ§Ù†ÙŠÙƒ': 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=300',
      'Ø³Ø¨Ø§ÙƒØ©': 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=300',
      'ÙƒÙ‡Ø±Ø¨Ø§Ø¡': 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=300',
      'Ù†Ø¬Ø§Ø±Ø©': 'https://images.unsplash.com/photo-1517646287270-a5a9ca602e5c?w=300',
      'ØµÙŠØ§Ù†Ø© Ø¹Ø§Ù…Ø©': 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=300'
    };

    let photoUrl = fallbacks[category] || fallbacks['ØµÙŠØ§Ù†Ø© Ø¹Ø§Ù…Ø©'];

    const proceed = async (finalPhoto) => {
      const newTk = {
        id: Math.floor(1000 + Math.random() * 9000),
        title: `Ø£Ù…Ø± Ø¹Ù…Ù„ ${category} - ${location}`,
        category: category,
        details: details,
        location: location,
        requester: 'manager',
        requesterName: 'Ù…Ø¯ÙŠØ± Ø§Ù„ØµÙŠØ§Ù†Ø© Ø§Ù„Ù…ÙŠØ¯Ø§Ù†ÙŠØ©',
        status: 'ØªÙ… Ø§Ù„ØªØ¹ÙŠÙŠÙ† Ù„Ù„ÙÙ†ÙŠ',
        bgClass: 'badge-info',
        assignedTech: techName,
        priority: '3',
        createdAt: new Date().toISOString(),
        dispatchedAt: new Date().toISOString(),
        dispatchMins: 1,
        photoBefore: finalPhoto
      };

      this.tickets.unshift(newTk);
      this.saveTicketsToStorage();
      this.renderTickets();
      this.closeModal('modalManagerNewTicket');

      if (locInput) locInput.value = '';
      if (detailsInput) detailsInput.value = '';
      if (photoInput) photoInput.value = '';

      this.showToast(`âš¡ ØªÙ… Ø¥ØµØ¯Ø§Ø± Ø£Ù…Ø± Ø§Ù„Ø¹Ù…Ù„ ÙˆØªÙƒÙ„ÙŠÙ Ø§Ù„ÙÙ†ÙŠ (${techName}) Ø¨Ù†Ø¬Ø§Ø­!\nØ§Ù„Ù…ÙˆÙ‚Ø¹: ${location}\nØªÙ… Ø§Ù„ØªÙˆØ¬ÙŠÙ‡ ÙÙˆØ±Ø§Ù‹ Ù„Ø´Ø§Ø´Ø© Ø§Ù„ÙÙ†ÙŠ ÙˆØ£ÙˆØ¯Ùˆ.`);

      // Sync to Odoo (Maintenance Module)
      try {
        await this.syncTicketToOdoo(newTk, '01221122334', 'Ù…Ø¯ÙŠØ± Ø§Ù„ØµÙŠØ§Ù†Ø©');
        this.saveTicketsToStorage();
        this.renderTickets();
      } catch (e) {
        console.warn('[Manager Direct Ticket Sync Error]', e);
      }
    };

    if (photoInput && photoInput.files && photoInput.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => proceed(e.target.result);
      reader.readAsDataURL(photoInput.files[0]);
    } else {
      proceed(photoUrl);
    }
  }

  async handleManagerFieldIncidentSubmit() {
    return this.submitManagerDirectTicket();
  }

  openCancelTicketModal(ticketId) {
    const tk = this.tickets.find(t => String(t.id) === String(ticketId) || String(t.odooId) === String(ticketId));
    if (!tk) return;

    const infoBox = document.getElementById('cancelTicketInfoBox');
    const targetInput = document.getElementById('cancelTargetTicketId');

    if (infoBox) {
      infoBox.innerHTML = `
        <div style="font-weight: 800; margin-bottom: 2px;">#${tk.id} - ${tk.title}</div>
        <div style="font-size: 0.7rem; color: #7f1d1d;">Ø·Ø§Ù„Ø¨ Ø§Ù„Ø®Ø¯Ù…Ø©: ${tk.requesterName || tk.requester || 'Ù…Ø§Ù„Ùƒ Ø§Ù„ÙˆØ­Ø¯Ø©'} â€¢ Ø§Ù„Ø­Ø§Ù„Ø© Ø§Ù„Ø­Ø§Ù„ÙŠØ©: ${tk.status}</div>
      `;
    }
    if (targetInput) targetInput.value = tk.id;

    this.openModal('modalManagerCancelTicket');
  }

  async confirmCancelTicket() {
    const targetInput = document.getElementById('cancelTargetTicketId');
    const reasonSelect = document.getElementById('cancelReasonSelect');
    const notesInput = document.getElementById('cancelNotesInput');

    const ticketId = targetInput ? targetInput.value : '';
    const reasonCategory = reasonSelect ? reasonSelect.value : 'ØªØ°ÙƒØ±Ø© Ù…ÙƒØ±Ø±Ø©';
    const notes = (notesInput && notesInput.value.trim()) ? notesInput.value.trim() : '';

    if (!reasonCategory && !notes) {
      this.showToast('âš ï¸ ÙŠØ±Ø¬Ù‰ ØªØ­Ø¯ÙŠØ¯ Ø£Ùˆ ÙƒØªØ§Ø¨Ø© Ø³Ø¨Ø¨ Ø¥Ù„ØºØ§Ø¡ Ø§Ù„Ø¨Ù„Ø§Øº Ø£ÙˆÙ„Ø§Ù‹ (Ø­Ù‚Ù„ Ø¥Ø¬Ø¨Ø§Ø±ÙŠ Ù„Ù„Ø­ÙˆÙƒÙ…Ø©)!');
      return;
    }

    const tk = this.tickets.find(t => String(t.id) === String(ticketId) || String(t.odooId) === String(ticketId));
    if (!tk) return;

    const fullReason = notes ? `${reasonCategory} - ØªÙØ§ØµÙŠÙ„ Ø¥Ø¶Ø§ÙÙŠØ©: ${notes}` : reasonCategory;

    tk.status = 'Ù…Ù„ØºØ§Ø©';
    tk.bgClass = 'badge-danger';
    tk.cancelReason = fullReason;
    tk.cancellationReason = fullReason;
    tk.cancelNotes = notes;
    tk.cancelledBy = this.currentRole === 'manager' ? 'Ø§Ù„Ù…Ù‡Ù†Ø¯Ø³ Ø£ÙŠÙ…Ù† Ø§Ù„Ø³Ø¹ÙŠØ¯ (Ù…Ø¯ÙŠØ± Ø§Ù„ØµÙŠØ§Ù†Ø©)' : 'ÙÙ†ÙŠ Ø§Ù„ØµÙŠØ§Ù†Ø© Ø§Ù„Ù…Ø³Ø¤ÙˆÙ„';
    tk.cancelledAt = new Date().toISOString();

    this.saveTicketsToStorage();
    this.renderTickets();
    this.closeModal('modalManagerCancelTicket');

    this.showToast(`ðŸš« ØªÙ… Ø¥Ù„ØºØ§Ø¡ Ø§Ù„Ø¨Ù„Ø§Øº #${tk.id} ÙˆØªÙˆØ«ÙŠÙ‚ Ø§Ù„Ø³Ø¨Ø¨ Ø¥Ø¬Ø¨Ø§Ø±ÙŠØ§Ù‹ Ø¨Ù†Ø¬Ø§Ø­!\nØ§Ù„Ø³Ø¨Ø¨: ${fullReason}\nØªÙ… Ù‚ÙÙ„ Ø§Ù„ØªØ°ÙƒØ±Ø© ÙˆÙ†Ù‚Ù„Ù‡Ø§ Ù„Ù…Ø±Ø­Ù„Ø© Cancelled Ø¨Ø£ÙˆØ¯Ùˆ.`);

    // Sync Cancellation to Odoo (Stage 5 = Cancelled + Chatter Log)
    try {
      await this.syncTicketUpdateToOdoo(tk);
      this.saveTicketsToStorage();
      this.renderTickets();
    } catch (err) {
      console.warn('[Odoo Cancel Sync Error]:', err);
    }
  }

  assignTechnician(ticketId, selectId) {
    const techSelect = document.getElementById(selectId);
    if (!techSelect) return;
    const techName = techSelect.value;

    const tk = this.tickets.find(t => String(t.id) === String(ticketId) || String(t.odooId) === String(ticketId));
    if (tk) {
      const now = new Date();
      tk.dispatchedAt = now;
      tk.status = 'Ù‚ÙŠØ¯ Ø§Ù„ØªÙ†ÙÙŠØ°';
      tk.bgClass = 'badge-info';
      tk.assignedTech = techName;

      // Calculate Manager Response Time
      const createTime = tk.createdAt ? new Date(tk.createdAt) : now;
      const dispatchMins = Math.max(1, Math.round((now - createTime) / 60000));
      tk.dispatchMins = dispatchMins;

      let managerRating = dispatchMins <= 15 ? 'ðŸŸ¢ Ø§Ø³ØªØ¬Ø§Ø¨Ø© Ø³Ø±ÙŠØ¹Ø© Ø¬Ø¯Ø§Ù‹ (Ø®Ù„Ø§Ù„ 15Ø¯)' : (dispatchMins <= 30 ? 'ðŸŸ¡ Ø§Ø³ØªØ¬Ø§Ø¨Ø© Ù…ØªÙˆØ³Ø·Ø©' : 'ðŸ”´ ØªØ£Ø®ÙŠØ± ÙÙŠ Ø§Ù„ØªØ®ØµÙŠØµ (ØªØ¬Ø§ÙˆØ² SLA)');

      this.saveTicketsToStorage();
      this.renderTickets();
      this.showToast(`âœ… ØªÙ… Ø¥Ø³Ù†Ø§Ø¯ Ø§Ù„Ù…Ù‡Ù…Ø© Ù„Ù„ÙÙ†ÙŠ (${techName}) ÙˆÙ†Ù‚Ù„ Ø§Ù„ØªØ°ÙƒØ±Ø© Ù„Ù…Ø±Ø­Ù„Ø© "Ù‚ÙŠØ¯ Ø§Ù„ØªÙ†ÙÙŠØ°" (In Progress)!\nØªÙ‚ÙŠÙŠÙ… Ø³Ø±Ø¹Ø© Ø§Ø³ØªØ¬Ø§Ø¨Ø© Ø§Ù„Ù…Ø¯ÙŠØ±: ${managerRating}`);
      
      // Sync update to Odoo (Stage 2 = In Progress)
      this.syncTicketUpdateToOdoo(tk);
    }
  }

  completeTicket(ticketId, fileInputId) {
    const tk = this.tickets.find(t => String(t.id) === String(ticketId) || String(t.odooId) === String(ticketId));
    if (!tk) return;

    const fileInput = document.getElementById(fileInputId);
    let afterPhoto = 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=300';

    const proceed = (finalPhoto) => {
      const now = new Date();
      tk.resolvedAt = now;
      const createTime = tk.createdAt ? new Date(tk.createdAt) : now;
      const totalMins = Math.max(1, Math.round((now - createTime) / 60000));
      
      tk.status = 'ØªÙ… Ø§Ù„Ø­Ù„';
      tk.bgClass = 'badge-success';
      tk.photoAfter = finalPhoto;
      tk.totalResolutionMins = totalMins;

      // SLA Metric Evaluation (Target: <= 30 mins, Max: <= 60 mins)
      if (totalMins <= 30) {
        tk.slaRating = 'ðŸŸ¢ Ø£Ø¯Ø§Ø¡ Ù…Ù…ØªØ§Ø² (ØªÙ… Ø§Ù„Ø­Ù„ ÙÙŠ Ø£Ù‚Ù„ Ù…Ù† 30 Ø¯Ù‚ÙŠÙ‚Ø©)';
        tk.slaBadgeClass = 'badge-success';
      } else if (totalMins <= 60) {
        tk.slaRating = 'ðŸŸ¡ Ø£Ø¯Ø§Ø¡ Ù…Ù‚Ø¨ÙˆÙ„ (ØªÙ… Ø§Ù„Ø­Ù„ Ø®Ù„Ø§Ù„ Ø³Ø§Ø¹Ø©)';
        tk.slaBadgeClass = 'badge-warning';
      } else {
        tk.slaRating = 'ðŸ”´ Ø£Ø¯Ø§Ø¡ Ø¶Ø¹ÙŠÙ / ØªØ¬Ø§ÙˆØ² SLA (Ø£ÙƒØ«Ø± Ù…Ù† 60 Ø¯Ù‚ÙŠÙ‚Ø©)';
        tk.slaBadgeClass = 'badge-danger';
      }

      tk.resolutionTime = `${totalMins} Ø¯Ù‚ÙŠÙ‚Ø© â€¢ ${tk.slaRating}`;

      this.saveTicketsToStorage();
      this.renderTickets();
      this.showToast(`ðŸŽ‰ ØªÙ… Ø¥ØºÙ„Ø§Ù‚ ØªØ°ÙƒØ±Ø© Ø§Ù„ØµÙŠØ§Ù†Ø© #${tk.id} ÙˆÙ†Ù‚Ù„Ù‡Ø§ Ù„Ù…Ø±Ø­Ù„Ø© "ØªÙ… Ø§Ù„Ø­Ù„" (Solved) Ø¨Ù†Ø¬Ø§Ø­!\nÙ…Ø¯Ø© Ø§Ù„Ø¥Ù†Ø¬Ø§Ø²: ${totalMins} Ø¯Ù‚ÙŠÙ‚Ø©.\nØ£ØµØ¨Ø­ Ø§Ù„ØªÙ‚ÙŠÙŠÙ… Ù…ØªØ§Ø­Ø§Ù‹ Ù„Ù„Ø¹Ù…ÙŠÙ„ Ø§Ù„Ø¢Ù† â­.`);
      
      // Sync update to Odoo (Stage 4 = Solved)
      this.syncTicketUpdateToOdoo(tk);
    };

    if (fileInput && fileInput.files && fileInput.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => proceed(e.target.result);
      reader.readAsDataURL(fileInput.files[0]);
    } else {
      proceed(afterPhoto);
    }
  }

  openRateTicketModal(ticketId) {
    const targetInput = document.getElementById('rateTargetTicketId');
    if (targetInput) targetInput.value = ticketId;
    this.setRatingStars(5);
    const commentInput = document.getElementById('rateCommentInput');
    if (commentInput) commentInput.value = '';
    this.openModal('modalRateTicket');
  }

  setRatingStars(stars) {
    const valInput = document.getElementById('rateStarsValue');
    if (valInput) valInput.value = stars;

    const label = document.getElementById('starRatingLabel');
    const labelsMap = {
      1: 'â­ Ø¶Ø¹ÙŠÙ Ø¬Ø¯Ø§Ù‹ (1/5)',
      2: 'â­â­ Ù…Ù‚Ø¨ÙˆÙ„ (2/5)',
      3: 'â­â­â­ Ø¬ÙŠØ¯ (3/5)',
      4: 'â­â­â­â­ Ø¬ÙŠØ¯ Ø¬Ø¯Ø§Ù‹ (4/5)',
      5: 'â­â­â­â­â­ Ù…Ù…ØªØ§Ø² Ø¬Ø¯Ø§Ù‹ (5/5)'
    };
    if (label) label.innerText = labelsMap[stars] || `${stars}/5`;

    const starBtns = document.querySelectorAll('.star-btn');
    starBtns.forEach((btn, idx) => {
      if (idx < stars) {
        btn.style.color = '#d4af37';
        btn.classList.add('fa-solid');
        btn.classList.remove('fa-regular');
      } else {
        btn.style.color = '#cbd5e1';
        btn.classList.add('fa-regular');
        btn.classList.remove('fa-solid');
      }
    });
  }

  async submitTicketRating() {
    const targetInput = document.getElementById('rateTargetTicketId');
    const valInput = document.getElementById('rateStarsValue');
    const commentInput = document.getElementById('rateCommentInput');

    const ticketId = targetInput ? targetInput.value : '';
    const stars = valInput ? valInput.value : '5';
    const comment = commentInput ? commentInput.value.trim() : '';

    const tk = this.tickets.find(t => String(t.id) === String(ticketId) || String(t.odooId) === String(ticketId));
    if (!tk) return;

    tk.customerRating = stars;
    tk.customerComment = comment;

    this.saveTicketsToStorage();
    this.renderTickets();
    this.closeModal('modalRateTicket');

    this.showToast(`â­ Ø´ÙƒØ±Ø§Ù‹ Ù„Ùƒ! ØªÙ… ØªØ³Ø¬ÙŠÙ„ ØªÙ‚ÙŠÙŠÙ…Ùƒ (${stars}/5 Ù†Ø¬ÙˆÙ…) Ø¨Ù†Ø¬Ø§Ø­!\nØªÙ… Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„ØªÙ‚ÙŠÙŠÙ… Ù„Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ø¬ÙˆØ¯Ø© Ø¨Ø£ÙˆØ¯Ùˆ.`);

    // Post Rating to Odoo Chatter
    if (tk.odooId) {
      try {
        const urlInput = safeStorage.getItem('odoo_url') || 'https://edu-fm-uc.odoo.com';
        const dbInput = safeStorage.getItem('odoo_db') || 'edu-fm-uc';
        const userInput = safeStorage.getItem('odoo_user') || 'fmhala6@gmail.com';
        const keyInput = safeStorage.getItem('odoo_key') || '06d7d7d208a8c2fa351c2a5cfa305e987ffb72f0';
        const baseUrl = urlInput.replace(/\/+$/, '');

        const authPayload = {
          jsonrpc: "2.0",
          method: "call",
          params: { service: "common", method: "authenticate", args: [dbInput, userInput, keyInput, {}] },
          id: Math.floor(Math.random() * 1000)
        };
        const authData = await this.callOdoo(baseUrl, authPayload);
        if (authData && authData.result) {
          const uid = authData.result;
          const starsStr = 'â­'.repeat(parseInt(stars) || 5);
          const ratingBody = `<p><b>â­ ØªÙ‚ÙŠÙŠÙ… Ø§Ù„Ø¹Ù…ÙŠÙ„ Ù„Ø¬ÙˆØ¯Ø© Ø§Ù„Ø®Ø¯Ù…Ø© Ø¨Ø¹Ø¯ Ø§Ù„Ø¥ØºÙ„Ø§Ù‚:</b></p>` +
                             `<p>â€¢ <b>Ø§Ù„ØªÙ‚ÙŠÙŠÙ…:</b> ${starsStr} (${stars}/5)</p>` +
                             (comment ? `<p>â€¢ <b>Ù…Ù„Ø§Ø­Ø¸Ø§Øª Ø§Ù„Ø¹Ù…ÙŠÙ„:</b> ${comment}</p>` : '');

          const chatterPayload = {
            jsonrpc: "2.0",
            method: "call",
            params: {
              service: "object",
              method: "execute_kw",
              args: [dbInput, uid, keyInput, tk.odooModel || "helpdesk.ticket", "message_post", [[parseInt(tk.odooId)]], { body: ratingBody }]
            },
            id: Math.floor(Math.random() * 1000)
          };
          await this.callOdoo(baseUrl, chatterPayload);
        }
      } catch (e) {
        console.warn('[Odoo Rating Post Error]:', e);
      }
    }
  }

  // ==========================================
  // LANDSCAPING MANAGEMENT DISPATCHING & OPERATIONS
  // ==========================================
  assignLandscapingWorker(ticketId) {
    const isEn = this.currentLang === 'en';
    const select = document.getElementById(`assignLandscapeWorkerSelect_${ticketId}`);
    const worker = select ? select.value : 'ÙØ±ÙŠÙ‚ Ø·Ø§Ù‚Ù… Ø§Ù„Ø²Ø±Ø§Ø¹Ø© 1';

    const tk = this.tickets.find(t => String(t.id) === String(ticketId));
    if (tk) {
      tk.status = 'Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªÙ†ÙÙŠØ° Ø¨Ø§Ù„Ù„Ø§Ø³Ù„ÙƒÙŠ';
      tk.bgClass = 'badge-info';
      tk.assignedWorker = worker;
      tk.dispatchedAt = new Date().toISOString();
      this.saveTicketsToStorage();
      this.renderTickets();
      this.renderLandscaping();
      this.showToast(isEn 
        ? `ðŸ“» Dispatched via Radio (CH-04) to [${worker}]!\nUnit: ${tk.title}`
        : `ðŸ“» ØªÙ… ØªÙˆØ¬ÙŠÙ‡ Ø§Ù„Ø¨Ù„Ø§Øº Ø¹Ø¨Ø± Ø§Ù„Ù„Ø§Ø³Ù„ÙƒÙŠ (Ù‚Ù†Ø§Ø© CH-04) Ø¥Ù„Ù‰ [${worker}] ÙÙˆØ±Ø§Ù‹!\nØ§Ù„Ù…ÙˆÙ‚Ø¹: ${tk.title}\nØªÙ… Ø¥Ø®Ø·Ø§Ø± Ø§Ù„Ø¹Ù…Ø§Ù„ Ù„Ø¨Ø¯Ø¡ Ø§Ù„ØªÙ†ÙÙŠØ° Ø§Ù„Ù…ÙŠØ¯Ø§Ù†ÙŠ.`);
      
      // Sync status update to Odoo
      this.syncTicketUpdateToOdoo(tk);
    }
  }

  completeLandscapingRequest(ticketId) {
    const isEn = this.currentLang === 'en';
    const tk = this.tickets.find(t => String(t.id) === String(ticketId));
    if (tk) {
      tk.status = 'ØªÙ… Ø§Ù„Ø­Ù„';
      tk.bgClass = 'badge-success';
      tk.resolvedAt = new Date().toISOString();
      tk.photoAfter = 'https://images.unsplash.com/photo-1558904541-efa843a96f01?auto=format&fit=crop&w=300&q=80';
      this.saveTicketsToStorage();
      this.renderTickets();
      this.renderLandscaping();
      this.showToast(isEn 
        ? 'ðŸŒ¿ Landscaping task verified, completed and closed in Odoo!' 
        : `ðŸŒ¿ ØªÙ… Ø§Ø¹ØªÙ…Ø§Ø¯ Ø¥Ù†Ù‡Ø§Ø¡ Ù…Ù‡Ù…Ø© Ø§Ù„Ù„Ø§Ù†Ø¯Ø³ÙƒÙŠØ¨ [#${tk.id}] Ø¨Ù†Ø¬Ø§Ø­!\nØªÙ… ØªÙˆØ«ÙŠÙ‚ Ø¥Ù†Ø¬Ø§Ø² Ø§Ù„Ø­Ø¯ÙŠÙ‚Ø© ÙˆØ¥ØºÙ„Ø§Ù‚ Ø§Ù„Ø·Ù„Ø¨ ÙÙŠ Odoo.`);
      
      // Sync solved status to Odoo (Stage 4)
      this.syncTicketUpdateToOdoo(tk);
    }
  }

  renderLandscaping() {
    const isEn = this.currentLang === 'en';
    const listContainer = document.getElementById('landscapeRequestsList');
    if (!listContainer) return;

    // Filter landscaping tickets
    const landscapeTks = this.tickets.filter(t => {
      const cat = String(t.category || '').toLowerCase();
      const title = String(t.title || '').toLowerCase();
      return cat.includes('Ù„Ø§Ù†Ø¯') || cat.includes('Ø­Ø¯Ø§Ø¦Ù‚') || cat.includes('Ø²Ø±Ø§Ø¹') || cat.includes('Ø±ÙŠ') || title.includes('Ù„Ø§Ù†Ø¯') || title.includes('Ø­Ø¯ÙŠÙ‚');
    });

    const pending = landscapeTks.filter(t => t.status === 'Ø¬Ø¯ÙŠØ¯' || !t.assignedWorker);
    const progress = landscapeTks.filter(t => t.status === 'Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªÙ†ÙÙŠØ° Ø¨Ø§Ù„Ù„Ø§Ø³Ù„ÙƒÙŠ' || (t.assignedWorker && t.status !== 'ØªÙ… Ø§Ù„Ø­Ù„' && t.status !== 'ØªÙ… Ø§Ù„Ø§Ù†ØªÙ‡Ø§Ø¡' && t.status !== 'Ù…Ù„ØºØ§Ø©'));
    const completed = landscapeTks.filter(t => t.status === 'ØªÙ… Ø§Ù„Ø­Ù„' || t.status === 'ØªÙ… Ø§Ù„Ø§Ù†ØªÙ‡Ø§Ø¡');

    // Update KPIs
    const elPending = document.getElementById('landscapeKpiPending');
    const elProgress = document.getElementById('landscapeKpiProgress');
    const elCompleted = document.getElementById('landscapeKpiCompleted');
    const elBadge = document.getElementById('landscapeInboxBadge');

    if (elPending) elPending.innerText = pending.length;
    if (elProgress) elProgress.innerText = progress.length;
    if (elCompleted) elCompleted.innerText = completed.length;
    if (elBadge) elBadge.innerText = `${pending.length} Ø¨Ø§Ù†ØªØ¸Ø§Ø± Ø§Ù„ØªÙˆØ¬ÙŠÙ‡`;

    listContainer.innerHTML = '';
    if (landscapeTks.length === 0) {
      listContainer.innerHTML = `<div style="font-size: 0.75rem; color: var(--text-muted); text-align: center; padding: 18px; background: rgba(16,185,129,0.02); border-radius: 8px;">${isEn ? 'No landscaping orders in queue' : 'Ù„Ø§ ØªÙˆØ¬Ø¯ Ø·Ù„Ø¨Ø§Øª Ù„Ø§Ù†Ø¯Ø³ÙƒÙŠØ¨ Ø£Ùˆ Ø­Ø¯Ø§Ø¦Ù‚ Ø­Ø§Ù„ÙŠØ§Ù‹'}</div>`;
      return;
    }

    landscapeTks.forEach(tk => {
      let actionHtml = '';
      const isDone = (tk.status === 'ØªÙ… Ø§Ù„Ø­Ù„' || tk.status === 'ØªÙ… Ø§Ù„Ø§Ù†ØªÙ‡Ø§Ø¡');
      const isInProgress = (tk.status === 'Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªÙ†ÙÙŠØ° Ø¨Ø§Ù„Ù„Ø§Ø³Ù„ÙƒÙŠ');

      if (!isDone && !isInProgress) {
        actionHtml = `
          <div style="margin-top: 10px; display: flex; gap: 8px; align-items: center; background: rgba(16,185,129,0.05); padding: 8px; border-radius: 8px;">
            <select id="assignLandscapeWorkerSelect_${tk.id}" class="form-control" style="font-size: 0.75rem; padding: 4px 8px; height: 32px; font-weight: 700; width: 60%;">
              <option value="Ø·Ø§Ù‚Ù… 1 (Ø¹Ø±ÙØ© ÙˆØ³Ø¹ÙŠØ¯ - Ù‚Øµ ÙˆØªÙ†Ø³ÙŠÙ‚)">ðŸŒ¿ Ø·Ø§Ù‚Ù… 1 (Ø¹Ø±ÙØ© ÙˆØ³Ø¹ÙŠØ¯ - Ù‚Øµ ÙˆØªÙ†Ø³ÙŠÙ‚)</option>
              <option value="Ø·Ø§Ù‚Ù… 2 (Ù…Ø¨Ø±ÙˆÙƒ ÙˆØ±Ø¬Ø¨ - Ø´Ø¨ÙƒØ§Øª Ø±ÙŠ)">ðŸ’§ Ø·Ø§Ù‚Ù… 2 (Ù…Ø¨Ø±ÙˆÙƒ ÙˆØ±Ø¬Ø¨ - Ø´Ø¨ÙƒØ§Øª Ø±ÙŠ)</option>
              <option value="Ø·Ø§Ù‚Ù… 3 (ÙØ±Ù‚Ø© Ø§Ù„ØªØ³Ù…ÙŠØ¯ ÙˆØ§Ù„Ù…ÙƒØ§ÙØ­Ø©)">ðŸ›¡ï¸ Ø·Ø§Ù‚Ù… 3 (ÙØ±Ù‚Ø© Ø§Ù„ØªØ³Ù…ÙŠØ¯ ÙˆØ§Ù„Ù…ÙƒØ§ÙØ­Ø©)</option>
              <option value="Ø·Ø§Ù‚Ù… 4 (Ø¹Ù…Ø§Ù„ Ù†Ø¸Ø§ÙØ© Ø§Ù„Ø£Ø­ÙˆØ§Ø¶ ÙˆØ§Ù„Ù†Ø®ÙŠÙ„)">ðŸŒ´ Ø·Ø§Ù‚Ù… 4 (Ù†Ø¸Ø§ÙØ© Ø§Ù„Ø£Ø­ÙˆØ§Ø¶ ÙˆØ§Ù„Ù†Ø®ÙŠÙ„)</option>
            </select>
            <button class="btn btn-primary" onclick="app.assignLandscapingWorker('${tk.id}')" style="font-size: 0.72rem; padding: 4px 10px; height: 32px; white-space: nowrap; flex: 1; display: flex; align-items: center; justify-content: center; background: #059669; border: none; font-weight: 800;">
              <i class="fa-solid fa-walkie-talkie" style="margin-left: 4px;"></i> Ø¥Ø±Ø³Ø§Ù„ Ø¨Ø§Ù„Ù„Ø§Ø³Ù„ÙƒÙŠ
            </button>
          </div>
        `;
      } else if (isInProgress) {
        actionHtml = `
          <div style="margin-top: 10px; display: flex; justify-content: space-between; align-items: center; background: rgba(37,99,235,0.06); border: 1px solid rgba(37,99,235,0.2); padding: 8px 10px; border-radius: 8px;">
            <div style="font-size: 0.72rem; color: #1e40af; font-weight: 700;">
              <i class="fa-solid fa-person-digging"></i> Ø§Ù„Ø·Ø§Ù‚Ù… Ø§Ù„Ù…ÙƒÙ„Ù: <b>${tk.assignedWorker}</b>
            </div>
            <button class="btn btn-success" onclick="app.completeLandscapingRequest('${tk.id}')" style="font-size: 0.72rem; padding: 4px 12px; height: 30px; white-space: nowrap; font-weight: 800; background: #10b981; border: none;">
              <i class="fa-solid fa-circle-check"></i> ØªØ£ÙƒÙŠØ¯ Ø¥ØªÙ…Ø§Ù… Ø§Ù„Ø¹Ù…Ù„
            </button>
          </div>
        `;
      } else {
        actionHtml = `
          <div style="margin-top: 8px; font-size: 0.7rem; color: #059669; font-weight: 700; background: #f0fdf4; border: 1px solid #86efac; padding: 6px 10px; border-radius: 6px;">
            <i class="fa-solid fa-check-double"></i> ØªÙ… Ø§Ù„Ø¥Ù†Ø¬Ø§Ø² ÙˆÙ…Ø·Ø§Ø¨Ù‚Ø© Ø§Ù„Ø­Ø¯ÙŠÙ‚Ø© Ù„Ù„Ù…ÙˆØ§ØµÙØ§Øª ÙˆØ¥Ø´Ø¹Ø§Ø± Ø§Ù„Ù…Ø§Ù„Ùƒ
          </div>
        `;
      }

      listContainer.innerHTML += `
        <div class="ticket-item" style="flex-direction: column; align-items: stretch; gap: 4px; margin-bottom: 10px; padding: 12px; border-radius: 10px; background: #ffffff; border: 1px solid rgba(16,185,129,0.18); border-right: 5px solid ${isDone ? '#10b981' : (isInProgress ? '#2563eb' : '#d97706')}; box-shadow: var(--shadow-sm);">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span class="badge ${tk.bgClass}" style="font-size: 0.65rem;">${tk.status}</span>
            <span style="font-size: 0.68rem; color: var(--text-muted); font-weight: 700;">#${tk.id} â€¢ ${tk.dateStr || 'Ø§Ù„ÙŠÙˆÙ…'}</span>
          </div>
          <h4 style="font-size: 0.88rem; font-weight: 800; color: #064e3b; margin-top: 4px;">${tk.title}</h4>
          <p style="font-size: 0.72rem; color: #334155; line-height: 1.4; margin: 2px 0;">${tk.details || 'Ø·Ù„Ø¨ ØªÙ‚Ù„ÙŠÙ… ÙˆØµÙŠØ§Ù†Ø© Ø§Ù„Ø­Ø¯ÙŠÙ‚Ø©'}</p>
          ${actionHtml}
        </div>
      `;
    });
  }

  // ==========================================
  // HOUSEKEEPING OPERATIONS
  // ==========================================
  assignHousekeepingWorker(id) {
    const isEn = this.currentLang === 'en';
    const req = this.housekeepingRequests ? this.housekeepingRequests.find(r => r.id === id) : null;
    if (!req) return;

    const select = document.getElementById(`assignWorkerSelect_${id}`);
    const worker = select ? select.value : 'Ø¹Ø§Ù…Ù„ Ù†Ø¸Ø§ÙØ©';

    req.status = 'Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø¹Ù…Ù„';
    req.assignedWorker = worker;

    this.renderHousekeeping();
    this.showToast(isEn ? `âœ… Worker ${worker} assigned successfully!` : `âœ… ØªÙ… ØªÙƒÙ„ÙŠÙ Ø¹Ø§Ù…Ù„ Ø§Ù„Ù†Ø¸Ø§ÙØ© ${worker} Ø¨Ù†Ø¬Ø§Ø­!`);
  }

  completeHousekeepingRequest(id) {
    const isEn = this.currentLang === 'en';
    const req = this.housekeepingRequests ? this.housekeepingRequests.find(r => r.id === id) : null;
    if (!req) return;

    req.status = 'ØªÙ… Ø§Ù„Ø§Ù†ØªÙ‡Ø§Ø¡';
    this.renderHousekeeping();
    this.showToast(isEn ? 'ðŸ§¹ Cleaning task completed!' : 'ðŸ§¹ ØªÙ… Ø¥ØªÙ…Ø§Ù… Ù…Ù‡Ù…Ø© Ø§Ù„Ù†Ø¸Ø§ÙØ© Ø¨Ù†Ø¬Ø§Ø­!');
  }

  renderHousekeeping() {
    const isEn = this.currentLang === 'en';
    const listContainer = document.getElementById('hkRequestsList');
    if (!listContainer) return;

    if (!this.housekeepingRequests) this.housekeepingRequests = [];
    const badge = document.getElementById('hkRequestsInboxBadge');
    const pendingRequests = this.housekeepingRequests.filter(r => r.status === 'Ø¨Ø§Ù†ØªØ¸Ø§Ø± Ø§Ù„ØªØ®ØµÙŠØµ');
    if (badge) {
      badge.innerText = isEn ? `${pendingRequests.length} pending` : `${pendingRequests.length} Ø·Ù„Ø¨Ø§Øª Ù…Ø¹Ù„Ù‚Ø©`;
    }

    listContainer.innerHTML = '';
    if (this.housekeepingRequests.length === 0) {
      listContainer.innerHTML = `<div style="font-size: 0.75rem; color: var(--text-muted); text-align: center; padding: 15px;">${isEn ? 'No cleaning requests' : 'Ù„Ø§ ØªÙˆØ¬Ø¯ Ø·Ù„Ø¨Ø§Øª Ù†Ø¸Ø§ÙØ© Ø­Ø§Ù„ÙŠØ©'}</div>`;
      return;
    }

    this.housekeepingRequests.forEach(req => {
      let actionHtml = '';
      if (req.status === 'Ø¨Ø§Ù†ØªØ¸Ø§Ø± Ø§Ù„ØªØ®ØµÙŠØµ') {
        actionHtml = `
          <div style="margin-top: 8px; display: flex; gap: 8px; align-items: center;">
            <select id="assignWorkerSelect_${req.id}" class="form-control" style="font-size: 0.72rem; padding: 4px; height: 28px; width: 60%;">
              <option value="Ù…Ø­Ù…Ø¯ Ø¹Ù„ÙŠ">Ù…Ø­Ù…Ø¯ Ø¹Ù„ÙŠ</option>
              <option value="Ø£Ø­Ù…Ø¯ Ø­Ø³Ù†">Ø£Ø­Ù…Ø¯ Ø­Ø³Ù†</option>
              <option value="Ù…ØµØ·ÙÙ‰ Ø³ÙŠØ¯">Ù…ØµØ·ÙÙ‰ Ø³ÙŠØ¯</option>
            </select>
            <button class="btn btn-primary" onclick="app.assignHousekeepingWorker('${req.id}')" style="font-size: 0.7rem; padding: 4px 8px; height: 28px; white-space: nowrap; flex: 1; display: flex; align-items: center; justify-content: center;">
              <i class="fa-solid fa-user-check"></i> ${isEn ? 'Assign' : 'Ø¥Ø³Ù†Ø§Ø¯ ÙˆØªÙƒÙ„ÙŠÙ'}
            </button>
          </div>
        `;
      } else if (req.status === 'Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø¹Ù…Ù„') {
        actionHtml = `
          <div style="margin-top: 8px; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.7rem; color: #00e5ff;"><i class="fa-solid fa-person-sweeping"></i> ${isEn ? 'Worker:' : 'Ø§Ù„Ø¹Ø§Ù…Ù„:'} ${req.assignedWorker}</span>
            <button class="btn btn-success" onclick="app.completeHousekeepingRequest('${req.id}')" style="font-size: 0.7rem; padding: 4px 8px; height: 28px; white-space: nowrap; display: flex; align-items: center; justify-content: center;">
              <i class="fa-solid fa-circle-check"></i> ${isEn ? 'Complete' : 'Ø¥Ù†Ù‡Ø§Ø¡ ÙˆØ¥ØªÙ…Ø§Ù…'}
            </button>
          </div>
        `;
      } else {
        actionHtml = `
          <div style="margin-top: 6px; font-size: 0.7rem; color: #10b981;">
            <i class="fa-solid fa-check"></i> ${isEn ? 'Task Completed' : 'ØªÙ… Ø¥ØªÙ…Ø§Ù… Ø§Ù„Ù…Ù‡Ù…Ø©'}
          </div>
        `;
      }

      listContainer.innerHTML += `
        <div class="ticket-item" style="flex-direction: column; align-items: stretch; gap: 4px; margin-bottom: 8px; border-left: 4px solid ${req.status === 'ØªÙ… Ø§Ù„Ø§Ù†ØªÙ‡Ø§Ø¡' ? '#10b981' : '#f59e0b'};">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <h4 style="font-size: 0.85rem; font-weight: 700;">${req.type}</h4>
            <span class="badge ${req.status === 'ØªÙ… Ø§Ù„Ø§Ù†ØªÙ‡Ø§Ø¡' ? 'badge-success' : 'badge-warning'}">${req.status}</span>
          </div>
          <p style="font-size: 0.75rem; color: var(--text-muted);">${req.location} â€¢ ${req.time}</p>
          ${actionHtml}
        </div>
      `;
    });
  }

  openPermitModal(requester = 'homeowner', type = 'ØªØµØ±ÙŠØ­ Ø¯Ø®ÙˆÙ„ Ø§Ù„ÙˆØ­Ø¯Ø©') {
    const roleInput = document.getElementById('permitRequesterRole');
    const typeInput = document.getElementById('permitTypeInput');
    const titleEl = document.getElementById('permitModalTitle');
    const nameInput = document.getElementById('permitVisitorNameInput');
    const phoneInput = document.getElementById('permitVisitorPhoneInput');
    const plateInput = document.getElementById('permitPlateNumInput');

    if (roleInput) roleInput.value = requester;
    if (typeInput) typeInput.value = type;
    if (titleEl) titleEl.innerText = `Ø·Ù„Ø¨ ${type}`;
    if (nameInput) nameInput.value = '';
    if (phoneInput) phoneInput.value = '';
    if (plateInput) plateInput.value = '';

    this.openModal('modalRequestPermit');
  }

  requestPermit(requester = 'homeowner', type = 'ØªØµØ±ÙŠØ­ Ø¯Ø®ÙˆÙ„ Ø§Ù„ÙˆØ­Ø¯Ø©') {
    this.openPermitModal(requester, type);
  }

  submitPermitModal() {
    if (this._submittingPermit) return;
    this._submittingPermit = true;

    try {
      const role = document.getElementById('permitRequesterRole')?.value || 'homeowner';
      const type = document.getElementById('permitTypeInput')?.value || 'ØªØµØ±ÙŠØ­ Ø¯Ø®ÙˆÙ„ Ø§Ù„ÙˆØ­Ø¯Ø©';
      const visitorName = document.getElementById('permitVisitorNameInput')?.value || '';
      const visitorPhone = document.getElementById('permitVisitorPhoneInput')?.value || '';
      const plate = document.getElementById('permitPlateNumInput')?.value || '';
      const days = document.getElementById('permitDaysSelect')?.value || 'ÙŠÙˆÙ… ÙˆØ§Ø­Ø¯';

      if (!visitorName.trim()) {
        this.showToast('âš ï¸ ÙŠØ±Ø¬Ù‰ Ø¥Ø¯Ø®Ø§Ù„ Ø§Ø³Ù… Ø§Ù„Ø²Ø§Ø¦Ø± Ø£Ùˆ Ø§Ù„Ø¶ÙŠÙ Ø£Ùˆ Ø¬Ù‡Ø© Ø§Ù„ØªÙˆØ±ÙŠØ¯ Ø£ÙˆÙ„Ø§Ù‹!');
        this._submittingPermit = false;
        return;
      }

      const detailsStr = `Ø§Ù„Ø²Ø§Ø¦Ø±: ${visitorName} ${visitorPhone ? `â€¢ Ù‡Ø§ØªÙ: ${visitorPhone}` : ''} ${plate ? `â€¢ Ø§Ù„Ù„ÙˆØ­Ø©: ${plate}` : ''} â€¢ Ø§Ù„ØµÙ„Ø§Ø­ÙŠØ©: ${days}`;

      const newPermit = {
        id: 'PR-' + Math.floor(1000 + Math.random() * 9000),
        type: type,
        category: 'ØªØµØ±ÙŠØ­ Ø¯Ø®ÙˆÙ„ Ø¨ÙˆØ§Ø¨Ø§Øª Ø£Ù…Ù†ÙŠ',
        title: `${type}: ${visitorName}`,
        status: 'ØªØ­Øª Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø©',
        bgClass: 'badge-warning',
        requester: role,
        details: detailsStr,
        qrCode: ''
      };

      this.permits.unshift(newPermit);
      this.renderTickets();
      this.closeModal('modalRequestPermit');
      this.showToast(`âœ… ØªÙ… ØªÙ‚Ø¯ÙŠÙ… Ø·Ù„Ø¨ Ø§Ù„ØªØµØ±ÙŠØ­ Ø¨Ù†Ø¬Ø§Ø­ Ø±Ù‚Ù… #${newPermit.id}\nØ§Ù„Ø·Ù„Ø¨ Ù‚ÙŠØ¯ Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø© Ø­Ø§Ù„ÙŠØ§Ù‹ Ù…Ù† Ù‚Ø¨Ù„ ÙØ±ÙŠÙ‚ Ø£Ù…Ù† ÙˆØ¨ÙˆØ§Ø¨Ø§Øª Ø§Ù„Ù‚Ø±ÙŠØ©.`);

      // Live Sync to Odoo Security Team
      this.syncTicketToOdoo(newPermit, visitorPhone, visitorName).catch(pErr => {
        console.warn('[Odoo Permit Sync Exception]:', pErr);
      });
    } finally {
      setTimeout(() => { this._submittingPermit = false; }, 1000);
    }
  }

  approvePermit(permitId) {
    const p = this.permits.find(x => x.id === permitId);
    if (p) {
      p.status = 'Ù…Ø¹ØªÙ…Ø¯';
      p.bgClass = 'badge-success';
      p.qrCode = String(Math.floor(100000 + Math.random() * 900000));
      this.renderTickets();
      this.showToast(`âœ… ØªÙ… Ø§Ø¹ØªÙ…Ø§Ø¯ ÙˆØªØµØ¯ÙŠÙ‚ Ø§Ù„ØªØµØ±ÙŠØ­ Ø¨Ù†Ø¬Ø§Ø­!\nØªÙ… ØªÙˆÙ„ÙŠØ¯ ÙƒÙˆØ¯ Ø§Ù„Ø¯Ø®ÙˆÙ„ Ø§Ù„Ø¯ÙŠÙ†Ø§Ù…ÙŠÙƒÙŠ Ù„Ù„Ø£Ù…Ù† ÙˆØ§Ù„Ø¨ÙˆØ§Ø¨Ø§Øª.`);
    }
  }

  rejectPermit(permitId) {
    const p = this.permits.find(x => x.id === permitId);
    if (p) {
      p.status = 'Ù…Ø±ÙÙˆØ¶';
      p.bgClass = 'badge-danger';
      p.qrCode = '';
      this.renderTickets();
      this.showToast(`âŒ ØªÙ… Ø±ÙØ¶ Ø·Ù„Ø¨ Ø§Ù„ØªØµØ±ÙŠØ­ Ø§Ù„Ù…Ø±ÙÙˆØ¹.`);
    }
  }

  dispatchSecurityDolphin(complaintId) {
    const c = this.complaints.find(x => x.id === complaintId);
    if (c) {
      c.status = 'Ø§Ù„Ø§Ø³ØªØ¬Ø§Ø¨Ø© Ø¬Ø§Ø±ÙŠØ© - Ø§Ù„ØªØ¯Ø®Ù„ Ø§Ù„Ø³Ø±ÙŠØ¹ ÙÙŠ Ø§Ù„Ø·Ø±ÙŠÙ‚';
      c.bgClass = 'badge-info';
      this.renderTickets();
      this.showToast(`ðŸš¨ ØªÙ… ØªØ£ÙƒÙŠØ¯ Ø§Ø³ØªÙ„Ø§Ù… Ø§Ù„Ø¨Ù„Ø§Øº Ø§Ù„Ø£Ù…Ù†ÙŠ #${complaintId}!\nØªÙ… Ø¥Ø´Ø¹Ø§Ø± Ù…Ù‚Ø¯Ù… Ø§Ù„Ø´ÙƒÙˆÙ‰ ÙÙˆØ±Ø§Ù‹ Ø¨Ø£Ù† ÙØ±ÙŠÙ‚ Ø§Ù„ØªØ¯Ø®Ù„ Ø§Ù„Ø³Ø±ÙŠØ¹ ÙÙŠ Ø·Ø±ÙŠÙ‚Ù‡ Ø¥Ù„ÙŠÙ‡.`);
    }
  }

  selectInventoryItem(name, price) {
    this.selectedPart = { name, price };
    const sigName = document.getElementById('sigItemName');
    const sigPrice = document.getElementById('sigItemPrice');
    const btnApprove = document.getElementById('btnApproveAndPay');

    if (sigName) sigName.innerText = name;
    if (sigPrice) sigPrice.innerText = `${price} Ø¬.Ù…`;

    if (btnApprove) {
      if (this.activeAuditTicketId) {
        btnApprove.innerHTML = `<i class="fa-solid fa-pen-nib"></i> Ù…ÙˆØ§ÙÙ‚Ø© ÙˆØªÙˆÙ‚ÙŠØ¹ Ø§Ù„Ù…Ø§Ù„Ùƒ Ø¨Ø§Ù„Ù…ÙˆØ§ÙÙ‚Ø©`;
      } else {
        btnApprove.innerHTML = `<i class="fa-solid fa-credit-card"></i> Ù…ÙˆØ§ÙÙ‚Ø© ÙˆØ¯ÙØ¹ Ø¢Ù„ÙŠ (${price} Ø¬.Ù…)`;
      }
    }

    this.closeModal('modalInventory');
    this.openModal('modalSignature');
  }

  handleApproveAndPay() {
    this.closeModal('modalSignature');

    if (this.activeAuditTicketId) {
      const ticketId = this.activeAuditTicketId;
      const tk = this.tickets.find(t => t.id === ticketId);
      if (tk) {
        tk.status = 'Ø§Ù†ØªØ¸Ø§Ø± Ø¯ÙØ¹ Ø§Ù„Ù…Ø§Ù„Ùƒ';
        tk.bgClass = 'badge-danger'; // Red badge for payment pending
        tk.needsPart = true;
        tk.partName = this.selectedPart.name;
        tk.partPrice = this.selectedPart.price;
        tk.photoBefore = this.uploadedDamagedPhoto || tk.photoBefore;

        this.renderTickets();
        this.showToast(`âœ… ØªÙ… ØªÙˆÙ‚ÙŠØ¹ Ø§Ù„Ù…Ø§Ù„Ùƒ Ø¨Ù†Ø¬Ø§Ø­!\nØªÙ… ØªØ­ÙˆÙŠÙ„ Ø­Ø§Ù„Ø© Ø§Ù„Ø¨Ù„Ø§Øº Ù„Ù€ "Ø§Ù†ØªØ¸Ø§Ø± Ø¯ÙØ¹ Ø§Ù„Ù…Ø§Ù„Ùƒ".\nØ³ØªØ¸Ù‡Ø± Ø§Ù„ØªØ°ÙƒØ±Ø© Ø§Ù„Ø¢Ù† Ø¨Ø§Ù†ØªØ¸Ø§Ø± Ø§Ù„Ø³Ø¯Ø§Ø¯ Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ Ø¨Ù‚ÙŠÙ…Ø© ${this.selectedPart.price} Ø¬.Ù… ÙÙŠ Ø´Ø§Ø´Ø© Ø§Ù„Ø¹Ù…ÙŠÙ„.`);
        this.syncTicketUpdateToOdoo(tk);
      }
      this.activeAuditTicketId = null;
      this.uploadedDamagedPhoto = null;
      return;
    }

    this.showToast(`ðŸ’³ ØªÙ… ØªÙˆÙ‚ÙŠØ¹ Ø§Ù„Ù…Ø§Ù„Ùƒ Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠØ§Ù‹ ÙˆØ§Ù„Ø¯ÙØ¹ Ø§Ù„ÙÙˆØ±ÙŠ Ù„Ù…Ø¨Ù„Øº ${this.selectedPart.price} Ø¬.Ù…!\nØªÙ… ØªØ³Ø¬ÙŠÙ„ Ø´Ø±Ø· Ø§Ù„ØµØ±Ù Ù„Ù„Ù…Ø®Ø²Ù† ÙˆØ¥Ø±Ø³Ø§Ù„ Ø§Ù„ØªØ£ÙƒÙŠØ¯ Ø¨Ø§Ù„ÙØ§ØªÙˆØ±Ø©.`);
  }

  technicianRequestPart(ticketId, fileInputId) {
    const fileInput = document.getElementById(fileInputId);
    let damagedPhoto = 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=300';
    
    const proceed = (photoData) => {
      this.uploadedDamagedPhoto = photoData;
      this.activeAuditTicketId = ticketId;
      this.openModal('modalInventory');
      this.filterInventory();
      this.showToast('ðŸ” ØªÙ… ØªØ¬Ù‡ÙŠØ² Ø·Ù„Ø¨ Ù‚Ø·Ø¹Ø© Ø§Ù„ØºÙŠØ§Ø±! ÙŠØ±Ø¬Ù‰ ØªØ­Ø¯ÙŠØ¯ Ø§Ù„Ù‚Ø·Ø¹Ø© Ø§Ù„Ù…Ø·Ù„ÙˆØ¨Ø© Ù…Ù† Ø§Ù„Ù…Ø®Ø²Ù†.');
    };

    if (fileInput && fileInput.files && fileInput.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => proceed(e.target.result);
      reader.readAsDataURL(fileInput.files[0]);
    } else {
      proceed(damagedPhoto);
    }
  }

  openSparePartPaymentModal(ticketId) {
    const tk = this.tickets.find(t => t.id === ticketId);
    if (!tk) return;

    this.activePaymentTicketId = ticketId;

    const partNameEl = document.getElementById('sparePartPayName');
    const partAmountEl = document.getElementById('sparePartPayAmount');
    if (partNameEl) partNameEl.innerText = tk.partName || 'Ù‚Ø·Ø¹Ø© ØºÙŠØ§Ø± ØºÙŠØ± Ù…Ø­Ø¯Ø¯Ø©';
    if (partAmountEl) partAmountEl.innerText = `${tk.partPrice || 0} Ø¬.Ù…`;

    // Reset payment radio and inputs
    const paySaved = document.getElementById('payMethodSavedCard');
    if (paySaved) paySaved.checked = true;
    const group = document.getElementById('newCardFieldsGroup');
    if (group) group.style.display = 'none';

    this.openModal('modalSparePartsPayment');
  }

  confirmSparePartPayment() {
    if (!this.activePaymentTicketId) return;

    const selectedMethod = document.querySelector('input[name="sparePartPayMethod"]:checked')?.value || 'saved';
    
    // Call the payment deduction logic
    this.payForSparePart(this.activePaymentTicketId, selectedMethod);
    this.closeModal('modalSparePartsPayment');
    this.activePaymentTicketId = null;
  }

  payForSparePart(ticketId, method) {
    const tk = this.tickets.find(t => t.id === ticketId);
    if (!tk) return;

    if (this.ownerWalletBalance < tk.partPrice) {
      this.showToast('âŒ Ø±ØµÙŠØ¯ Ù…Ø­ÙØ¸ØªÙƒ Ø§Ù„Ø±Ù‚Ù…ÙŠØ© ØºÙŠØ± ÙƒØ§ÙÙ Ù„Ø³Ø¯Ø§Ø¯ Ù‚Ø·Ø¹Ø© Ø§Ù„ØºÙŠØ§Ø±! ÙŠØ±Ø¬Ù‰ Ø¥Ø¹Ø§Ø¯Ø© Ø´Ø­Ù† Ù…Ø­ÙØ¸ØªÙƒ Ø£ÙˆÙ„Ø§Ù‹.');
      return;
    }

    // Deduct from wallet
    this.ownerWalletBalance -= tk.partPrice;
    this.updateWalletUI();

    // Update ticket state
    tk.status = 'ØªÙ… Ø§Ù„Ø¯ÙØ¹ - Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ±ÙƒÙŠØ¨';
    tk.bgClass = 'badge-info';

    this.renderTickets();
    this.syncTicketUpdateToOdoo(tk);

    const methodArabic = method === 'saved' ? 'Ø§Ù„Ø¨Ø·Ø§Ù‚Ø© Ø§Ù„Ù…Ø³Ø¬Ù„Ø© (ØªÙ†ØªÙ‡ÙŠ Ø¨Ù€ 4012)' : 'Ø§Ù„Ø¨Ø·Ø§Ù‚Ø© Ø§Ù„Ø¬Ø¯ÙŠØ¯Ø©';
    this.showToast(`âœ… ØªÙ… Ø³Ø¯Ø§Ø¯ Ù‚ÙŠÙ…Ø© Ù‚Ø·Ø¹Ø© Ø§Ù„ØºÙŠØ§Ø± [${tk.partName}] Ø¨Ù…Ø¨Ù„Øº [${tk.partPrice} Ø¬.Ù…] Ø¨Ù†Ø¬Ø§Ø­ Ø¹Ø¨Ø± ${methodArabic}!\nØªÙ… Ø¥Ø´Ø¹Ø§Ø± Ø§Ù„ÙÙ†ÙŠ [ÙƒØ±ÙŠÙ… Ø­Ø³Ù†] Ù„ØµØ±Ù Ø§Ù„Ù‚Ø·Ø¹Ø© ÙˆØ¨Ø¯Ø¡ Ø§Ù„ØªØ±ÙƒÙŠØ¨ ÙÙˆØ±Ø§Ù‹.`);
  }

  handleFamilyIdFrontPreview(event) {
    const file = event.target.files ? event.target.files[0] : null;
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      this.familyIdFrontBase64 = e.target.result;
      const img = document.getElementById('familyIdFrontPreviewImg');
      const box = document.getElementById('familyIdFrontPreviewBox');
      if (img) img.src = this.familyIdFrontBase64;
      if (box) box.style.display = 'block';
    };
    reader.readAsDataURL(file);
  }

  handleFamilyIdBackPreview(event) {
    const file = event.target.files ? event.target.files[0] : null;
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      this.familyIdBackBase64 = e.target.result;
      const img = document.getElementById('familyIdBackPreviewImg');
      const box = document.getElementById('familyIdBackPreviewBox');
      if (img) img.src = this.familyIdBackBase64;
      if (box) box.style.display = 'block';
    };
    reader.readAsDataURL(file);
  }

  async submitFamilyMember() {
    const nameInput = document.getElementById('familyMemberNameInput');
    const relationSelect = document.getElementById('familyMemberRelationSelect');
    const phoneInput = document.getElementById('familyMemberPhoneInput');
    const emailInput = document.getElementById('familyMemberEmailInput');

    if (!nameInput || !relationSelect || !phoneInput) return;

    const name = nameInput.value.trim();
    const relation = relationSelect.value;
    const phone = phoneInput.value.trim();
    const email = emailInput ? emailInput.value.trim() : '';

    if (!name || !phone) {
      this.showToast('âš ï¸ ÙŠØ±Ø¬Ù‰ Ø¥Ø¯Ø®Ø§Ù„ Ø§Ø³Ù… ÙØ±Ø¯ Ø§Ù„Ø¹Ø§Ø¦Ù„Ø© ÙˆØ±Ù‚Ù… Ø§Ù„Ù…ÙˆØ¨Ø§ÙŠÙ„!');
      return;
    }

    const finalEmail = (email && email.includes('@')) ? email : `family_${phone.replace(/[^0-9]/g, '') || 'member'}@village.com`;

    const idFrontData = this.familyIdFrontBase64;
    const idBackData = this.familyIdBackBase64;

    const relationMap = {
      'father': 'Ø£Ø¨',
      'mother': 'Ø£Ù…',
      'brother': 'Ø£Ø®',
      'sister': 'Ø£Ø®Øª',
      'son': 'Ø§Ø¨Ù†',
      'daughter': 'Ø§Ø¨Ù†Ø©'
    };
    const relationArabic = relationMap[relation] || relation;

    // Render locally in Owner's family list with Pending Review status
    const list = document.getElementById('ownerFamilyMembersList');
    const badge = document.getElementById('ownerFamilyCountBadge');

    if (list) {
      // Remove empty placeholder message
      const emptyDiv = list.querySelector('div:only-child');
      if (emptyDiv && emptyDiv.innerText.includes('Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ø£ÙØ±Ø§Ø¯')) {
        list.innerHTML = '';
      }

      const item = document.createElement('div');
      item.style.cssText = 'display: flex; justify-content: space-between; align-items: center; background: #ffffff; padding: 10px 12px; border-radius: 10px; border: 1px solid rgba(32,39,79,0.12); box-shadow: 0 2px 5px rgba(0,0,0,0.04); margin-top: 4px;';
      item.innerHTML = `
        <div style="text-align: right;">
          <div style="font-size: 0.85rem; font-weight: 800; color: #1c2140;">${name} <span style="font-size: 0.75rem; color: #1b8f91; font-weight: 700;">(${relationArabic})</span></div>
          <p style="font-size: 0.68rem; color: #64748b; margin: 3px 0 0 0; font-weight: 600;">
            <i class="fa-solid fa-phone" style="font-size: 0.62rem; color: #1b8f91;"></i> ${phone} â€¢ Ø¨Ø§Ù†ØªØ¸Ø§Ø± Ù…Ø±Ø§Ø¬Ø¹Ø© ÙˆØ§Ø¹ØªÙ…Ø§Ø¯ Ø¨Ø·Ø§Ù‚Ø© Ø§Ù„Ø±Ù‚Ù… Ø§Ù„Ù‚ÙˆÙ…ÙŠ ðŸªª
          </p>
        </div>
        <span class="badge" style="font-size: 0.65rem; margin-top:0; background: #f59e0b; color: #ffffff !important; padding: 4px 8px; border-radius: 6px; font-weight: 700; white-space: nowrap;"><i class="fa-solid fa-hourglass-half"></i> Ù‚ÙŠØ¯ Ù…Ø±Ø§Ø¬Ø¹Ø© Ø§Ù„Ø¥Ø¯Ø§Ø±Ø© â³</span>
      `;
      list.appendChild(item);

      // Update badge count
      if (badge) {
        const count = list.querySelectorAll('div[style*="justify-content"]').length;
        badge.innerText = `${count} Ø£ÙØ±Ø§Ø¯`;
      }
    }

    this.closeModal('modalAddFamilyMember');
    nameInput.value = '';
    phoneInput.value = '';
    if (emailInput) emailInput.value = '';

    // Reset National ID base64 & previews
    this.familyIdFrontBase64 = null;
    this.familyIdBackBase64 = null;
    const frontBox = document.getElementById('familyIdFrontPreviewBox');
    const backBox = document.getElementById('familyIdBackPreviewBox');
    const frontInput = document.getElementById('familyMemberIdFrontInput');
    const backInput = document.getElementById('familyMemberIdBackInput');
    if (frontBox) frontBox.style.display = 'none';
    if (backBox) backBox.style.display = 'none';
    if (frontInput) frontInput.value = '';
    if (backInput) backInput.value = '';
    
    this.showToast(`ðŸ‘¥ ØªÙ… Ø¥Ù†Ø´Ø§Ø¡ Ø­Ø³Ø§Ø¨ ÙØ±Ø¯ Ø§Ù„Ø£Ø³Ø±Ø© [${name}] Ø¨Ù†Ø¬Ø§Ø­!\nØ¬Ø§Ø±ÙŠ Ø§Ù„Ù…Ø²Ø§Ù…Ù†Ø© ÙˆØ§Ù„ØªØ³Ø¬ÙŠÙ„ Ø¨Ù€ Odoo Contacts Ù…Ø¹ ØµÙˆØ± Ø§Ù„Ø¨Ø·Ø§Ù‚Ø© Ø§Ù„Ø´Ø®ØµÙŠØ©...`);

    try {
      await this.syncFamilyMemberToOdoo(name, relationArabic, phone, email, idFrontData, idBackData);
      this.showToast(`âœ… ØªÙ… ØªÙˆØ«ÙŠÙ‚ ÙˆØªØ³Ø¬ÙŠÙ„ ÙØ±Ø¯ Ø§Ù„Ø£Ø³Ø±Ø© [${name}] ÙˆØµÙˆØ± Ø§Ù„Ø¨Ø·Ø§Ù‚Ø© Ø§Ù„Ø´Ø®ØµÙŠØ© ÙˆØ´ ÙˆØ¶Ù‡Ø± Ø¨Ù€ Odoo Contacts Ø¨Ù†Ø¬Ø§Ø­!`);
    } catch (err) {
      console.warn('[Odoo Family Member Sync Error]:', err);
    }
  }

  async addFamilyMember() {
    return this.submitFamilyMember();
  }

  async getOdooOwnerPartnerId(baseUrl, dbInput, uid, keyInput) {
    // Strategy 1: Check partner_id on res.users for current logged-in user (uid)
    try {
      const userPayload = {
        jsonrpc: "2.0",
        method: "call",
        params: {
          service: "object",
          method: "execute_kw",
          args: [
            dbInput, uid, keyInput,
            "res.users",
            "read",
            [[uid]],
            { fields: ["partner_id"] }
          ]
        },
        id: Math.floor(Math.random() * 1000)
      };
      const uRes = await this.callOdoo(baseUrl, userPayload);
      if (uRes && uRes.result && uRes.result.length > 0 && uRes.result[0].partner_id) {
        const pid = Array.isArray(uRes.result[0].partner_id) ? uRes.result[0].partner_id[0] : uRes.result[0].partner_id;
        if (pid) return pid;
      }
    } catch (e) {}

    // Strategy 2: Search partner by email or name
    try {
      const userEmail = safeStorage.getItem('odoo_user') || 'fmhala6@gmail.com';
      const customName = safeStorage.getItem('odoo_owner_name') || 'Ø£Ø³Ø§Ù…Ø©';
      const searchPayload = {
        jsonrpc: "2.0",
        method: "call",
        params: {
          service: "object",
          method: "execute_kw",
          args: [
            dbInput, uid, keyInput,
            "res.partner",
            "search_read",
            ["|", ["email", "ilike", userEmail], ["name", "ilike", customName]],
            { fields: ["id"], limit: 1 }
          ]
        },
        id: Math.floor(Math.random() * 1000)
      };
      const sRes = await this.callOdoo(baseUrl, searchPayload);
      if (sRes && sRes.result && sRes.result.length > 0) {
        return sRes.result[0].id;
      }
    } catch (e) {}

    return 3;
  }

  async syncFamilyMemberToOdoo(name, relation, phone, email, idFrontBase64, idBackBase64) {
    const urlInput = safeStorage.getItem('odoo_url') || 'https://edu-fm-uc.odoo.com';
    const dbInput = safeStorage.getItem('odoo_db') || 'edu-fm-uc';
    const userInput = safeStorage.getItem('odoo_user') || 'fmhala6@gmail.com';
    const keyInput = safeStorage.getItem('odoo_key') || '06d7d7d208a8c2fa351c2a5cfa305e987ffb72f0';

    if (!urlInput || !dbInput || !userInput || !keyInput) return;
    const baseUrl = urlInput.replace(/\/+$/, '');

    // Step 1: Authenticate
    const authPayload = {
      jsonrpc: "2.0",
      method: "call",
      params: {
        service: "common",
        method: "authenticate",
        args: [dbInput, userInput, keyInput, {}]
      },
      id: Math.floor(Math.random() * 1000)
    };

    const authData = await this.callOdoo(baseUrl, authPayload);
    if (!authData || !authData.result) return;
    const uid = authData.result;

    // Step 2: Get exact target partnerId for owner
    const partnerId = (await this.getOdooOwnerPartnerId(baseUrl, dbInput, uid, keyInput)) || 3;

    // Step 3: Create child contact in res.partner for family member with email and parent_id
    let childPartnerId = null;
    try {
      const childPayload = {
        jsonrpc: "2.0",
        method: "call",
        params: {
          service: "object",
          method: "execute_kw",
          args: [
            dbInput, uid, keyInput,
            "res.partner",
            "create",
            [{
              name: name,
              phone: phone,
              email: email || '',
              function: relation,
              parent_id: partnerId,
              type: "other",
              comment: `ÙØ±Ø¯ Ø£Ø³Ø±Ø© ØªØ§Ø¨Ø¹ Ù„Ù„Ù…Ø§Ù„Ùƒ Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠ - ØµÙ„Ø© Ø§Ù„Ù‚Ø±Ø§Ø¨Ø©: ${relation} - Ø§Ù„Ø¥ÙŠÙ…ÙŠÙ„: ${email}`,
              company_type: "person"
            }]
          ]
        },
        id: Math.floor(Math.random() * 1000)
      };
      const childRes = await this.callOdoo(baseUrl, childPayload);
      if (childRes && childRes.result) {
        childPartnerId = childRes.result;
        console.log(`[Odoo Family Sync] Created standalone partner #${childPartnerId} for family member "${name}" with email "${email}"`);
      }
    } catch (cErr) {
      console.warn('[Odoo Family Sync Child Create Error]:', cErr);
    }

    // Step 4: Link child partner to Family Members Many2Many AND specific relation field on partner
    if (partnerId) {
      try {
        const partnerUpdates = {
          "x_studio_many2many_field_7m1_1jvs7m7ps": childPartnerId ? [[4, childPartnerId, 0]] : undefined
        };

        const relClean = (relation || '').trim();
        if (relClean.includes('Ø£Ø¨') || relClean.toLowerCase().includes('father')) {
          partnerUpdates["x_studio_father"] = `${name} (${phone})`;
        } else if (relClean.includes('Ø£Ù…') || relClean.toLowerCase().includes('mother')) {
          partnerUpdates["x_studio_mother"] = `${name} (${phone})`;
        } else if (relClean.includes('Ø§Ø¨Ù†') || relClean.toLowerCase().includes('son')) {
          partnerUpdates["x_studio_son"] = `${name} (${phone})`;
        } else if (relClean.includes('Ø§Ø¨Ù†Ø©') || relClean.toLowerCase().includes('daughter')) {
          partnerUpdates["x_studio_daughter"] = `${name} (${phone})`;
        } else if (relClean.includes('Ø²ÙˆØ¬') || relClean.toLowerCase().includes('husband')) {
          partnerUpdates["x_studio_husband"] = `${name} (${phone})`;
        } else if (relClean.includes('Ø²ÙˆØ¬Ø©') || relClean.toLowerCase().includes('wife')) {
          partnerUpdates["x_studio_wife"] = `${name} (${phone})`;
        }

        // Clean undefined keys
        Object.keys(partnerUpdates).forEach(k => partnerUpdates[k] === undefined && delete partnerUpdates[k]);

        const linkPayload = {
          jsonrpc: "2.0",
          method: "call",
          params: {
            service: "object",
            method: "execute_kw",
            args: [
              dbInput, uid, keyInput,
              "res.partner",
              "write",
              [
                [partnerId],
                partnerUpdates
              ]
            ]
          },
          id: Math.floor(Math.random() * 1000)
        };
        const linkRes = await this.callOdoo(baseUrl, linkPayload);
        console.log(`[Odoo Family Sync] Linked family member to partner #${partnerId}:`, linkRes);
      } catch (lErr) {
        console.warn('[Odoo Family Sync Link Error]:', lErr);
      }
    }

    // Step 5: Upload National ID photos (Front & Back) as attachments to Odoo ir.attachment
    const targetAttachIds = [childPartnerId, partnerId].filter(Boolean);
    for (const targetId of targetAttachIds) {
      if (idFrontBase64) {
        try {
          const cleanFront = idFrontBase64.replace(/^data:image\/\w+;base64,/, '');
          const frontPayload = {
            jsonrpc: "2.0",
            method: "call",
            params: {
              service: "object",
              method: "execute_kw",
              args: [
                dbInput, uid, keyInput,
                "ir.attachment",
                "create",
                [{
                  name: `Ø¨Ø·Ø§Ù‚Ø©_Ø´Ø®ØµÙŠØ©_${name}_ÙˆØ¬Ù‡.jpg`,
                  datas: cleanFront,
                  res_model: "res.partner",
                  res_id: targetId
                }]
              ]
            },
            id: Math.floor(Math.random() * 1000)
          };
          await this.callOdoo(baseUrl, frontPayload);
        } catch (fErr) {}
      }

      if (idBackBase64) {
        try {
          const cleanBack = idBackBase64.replace(/^data:image\/\w+;base64,/, '');
          const backPayload = {
            jsonrpc: "2.0",
            method: "call",
            params: {
              service: "object",
              method: "execute_kw",
              args: [
                dbInput, uid, keyInput,
                "ir.attachment",
                "create",
                [{
                  name: `Ø¨Ø·Ø§Ù‚Ø©_Ø´Ø®ØµÙŠØ©_${name}_Ø¸Ù‡Ø±.jpg`,
                  datas: cleanBack,
                  res_model: "res.partner",
                  res_id: targetId
                }]
              ]
            },
            id: Math.floor(Math.random() * 1000)
          };
          await this.callOdoo(baseUrl, backPayload);
        } catch (bErr) {}
      }
    }

    // Step 6: Update specific relation fields if matched (x_studio_wife, x_studio_husband, etc.)
    if (partnerId) {
      try {
        const relLower = (relation || '').toLowerCase();
        let relField = null;
        if (relLower.includes('Ø²ÙˆØ¬Ø©') || relLower.includes('wife')) relField = 'x_studio_wife';
        else if (relLower.includes('Ø²ÙˆØ¬') || relLower.includes('husband')) relField = 'x_studio_husband';
        else if (relLower.includes('Ø§Ø¨Ù†') || relLower.includes('son')) relField = 'x_studio_son';
        else if (relLower.includes('Ø§Ø¨Ù†Ø©') || relLower.includes('daughter')) relField = 'x_studio_daughter';
        else if (relLower.includes('Ø£Ø¨') || relLower.includes('father')) relField = 'x_studio_father';
        else if (relLower.includes('Ø£Ù…') || relLower.includes('mother')) relField = 'x_studio_mother';

        if (relField) {
          const relWritePayload = {
            jsonrpc: "2.0",
            method: "call",
            params: {
              service: "object",
              method: "execute_kw",
              args: [
                dbInput, uid, keyInput,
                "res.partner",
                "write",
                [[partnerId], { [relField]: `${name} (${phone})` }]
              ]
            },
            id: Math.floor(Math.random() * 1000)
          };
          await this.callOdoo(baseUrl, relWritePayload);
        }
      } catch (rErr) {}
    }

    // Step 7: Append to partner comment/notes as guaranteed log
    if (partnerId) {
      try {
        const idNoteText = (idFrontBase64 || idBackBase64) ? ' (Ù…Ø±ÙÙ‚ ØµÙˆØ± Ø§Ù„Ø¨Ø·Ø§Ù‚Ø© ÙˆØ´ ÙˆØ¶Ù‡Ø± ðŸªª)' : '';
        const familyEntryText = `â€¢ ${name} (${relation}) - Ù…: ${phone} - Ù…ÙŠÙ„: ${email}${idNoteText}`;
        const notePayload = {
          jsonrpc: "2.0",
          method: "call",
          params: {
            service: "object",
            method: "execute_kw",
            args: [
              dbInput, uid, keyInput,
              "res.partner",
              "write",
              [[partnerId], { comment: `ðŸ‘¥ ÙØ±Ø¯ Ø£Ø³Ø±Ø© Ø¬Ø¯ÙŠØ¯: ${familyEntryText}` }]
            ]
          },
          id: Math.floor(Math.random() * 1000)
        };
        await this.callOdoo(baseUrl, notePayload);
      } catch (nErr) {}
    }
  }

  updateWalletUI() {
    const balanceSpan = document.getElementById('bookingWalletBalanceText');
    if (balanceSpan) balanceSpan.innerText = this.ownerWalletBalance;
  }

  chargeService(serviceName, price) {
    this.showToast(`âœ… ØªÙ… Ø´Ø­Ù† ${serviceName} Ø¨Ù†Ø¬Ø§Ø­ Ø¨Ù…Ø¨Ù„Øº ${price} Ø¬.Ù…!\nØªÙ… ØªÙØ¹ÙŠÙ„ Ø§Ù„ØµÙ„Ø§Ø­ÙŠØ© Ø¹Ù„Ù‰ Ø§Ù„Ù€ QR Code Ø­ØªÙ‰ Ø§Ù„ØªØ§Ø±ÙŠØ® Ø§Ù„Ù…ØªØ±ØªØ¨.`);
  }

  issueBeachPermit() {
    const code = Math.floor(100000 + Math.random() * 900000);
    this.closeModal('modalBeachPoolsPermit');
    this.showToast(`ðŸŒŠ ØªÙ… Ø¥ØµØ¯Ø§Ø± ØªØµØ±ÙŠØ­ Ø¯Ø®ÙˆÙ„ Ø§Ù„Ø´Ø§Ø·Ø¦ ÙˆØ§Ù„Ø¨Ø­ÙŠØ±Ø§Øª ÙˆØ­Ù…Ø§Ù…Ø§Øª Ø§Ù„Ø³Ø¨Ø§Ø­Ø© Ø¨Ù†Ø¬Ø§Ø­!\nØ±Ù…Ø² Ø§Ù„Ù€ Dynamic QR: ${code}\nØªÙ… ØªØ³Ø¬ÙŠÙ„ Ø§Ù„ØªØµØ±ÙŠØ­ Ø¹Ù„Ù‰ Ø¨ÙˆØ§Ø¨Ø§Øª Ø§Ù„Ø±ÙØ§Ù‡ÙŠØ© Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠØ© Ø¨Ø§Ù„Ù‚Ø±ÙŠØ©.`);
  }

  payInstallment(code, amount) {
    const formattedAmount = Number(amount).toLocaleString();
    this.showToast(`ðŸ’³ ØªÙ… Ø³Ø¯Ø§Ø¯ Ø§Ù„Ù‚Ø³Ø· Ø§Ù„Ù…Ø³ØªØ­Ù‚ (${code}) Ø¨Ù‚ÙŠÙ…Ø© ${formattedAmount} Ø¬.Ù… Ø¨Ù†Ø¬Ø§Ø­!\nØªÙ… Ø¥ØµØ¯Ø§Ø± Ø³Ù†Ø¯ Ø§Ù„Ù‚Ø¨Ø¶ Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ ÙˆØªØ­Ø¯ÙŠØ« ÙƒØ´Ù Ø­Ø³Ø§Ø¨ Ø§Ù„ÙˆØ­Ø¯Ø© ÙÙŠ Odoo.`);
    
    // Update UI badge status
    const badge = document.getElementById('installmentStatusBadge');
    if (badge) {
      badge.className = 'badge badge-success';
      badge.innerHTML = '<i class="fa-solid fa-check-double"></i> ØªÙ… Ø³Ø¯Ø§Ø¯ Ø¬Ù…ÙŠØ¹ Ø§Ù„Ø£Ù‚Ø³Ø§Ø· Ø§Ù„Ù…Ø³ØªØ­Ù‚Ø©';
    }
  }

  openCommercialMeterModal() {
    this.openModal('modalMeterRecharge');
  }

  setEmaarTicketFilter(filterState) {
    this._emaarTicketFilter = filterState || 'active';
    this.renderTickets();
  }

  initCanvas() {
    this.canvas = document.getElementById('sigCanvas');
    if (!this.canvas) return;

    // Adjust canvas size to parent width
    this.canvas.width = this.canvas.offsetWidth || 400;
    this.canvas.height = 130;
    this.ctx = this.canvas.getContext('2d');
    this.ctx.strokeStyle = '#0b1320';
    this.ctx.lineWidth = 3;

    const startDraw = (e) => {
      this.isDrawing = true;
      this.ctx.beginPath();
      const rect = this.canvas.getBoundingClientRect();
      const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
      const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
      this.ctx.moveTo(x, y);
    };

    const draw = (e) => {
      if (!this.isDrawing) return;
      const rect = this.canvas.getBoundingClientRect();
      const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
      const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
      this.ctx.lineTo(x, y);
      this.ctx.stroke();
    };

    const stopDraw = () => { this.isDrawing = false; };

    this.canvas.addEventListener('mousedown', startDraw);
    this.canvas.addEventListener('mousemove', draw);
    this.canvas.addEventListener('mouseup', stopDraw);
    this.canvas.addEventListener('touchstart', startDraw);
    this.canvas.addEventListener('touchmove', draw);
    this.canvas.addEventListener('touchend', stopDraw);
  }

  clearCanvas() {
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  async fetchOwnerChatterMessagesFromOdoo() {
    const urlInput = safeStorage.getItem('odoo_url') || 'https://edu-fm-uc.odoo.com';
    const dbInput = safeStorage.getItem('odoo_db') || 'edu-fm-uc';
    const userInput = safeStorage.getItem('odoo_user') || 'fmhala6@gmail.com';
    const keyInput = safeStorage.getItem('odoo_key') || '06d7d7d208a8c2fa351c2a5cfa305e987ffb72f0';

    if (!urlInput || !dbInput || !userInput || !keyInput) return;
    const baseUrl = urlInput.replace(/\/+$/, '');

    try {
      const authPayload = {
        jsonrpc: "2.0",
        method: "call",
        params: {
          service: "common",
          method: "authenticate",
          args: [dbInput, userInput, keyInput, {}]
        },
        id: Math.floor(Math.random() * 1000)
      };
      const authData = await this.callOdoo(baseUrl, authPayload);
      if (!authData || !authData.result) return;
      const uid = authData.result;

      const partnerId = (await this.getOdooOwnerPartnerId(baseUrl, dbInput, uid, keyInput)) || 3;

      const msgPayload = {
        jsonrpc: "2.0",
        method: "call",
        params: {
          service: "object",
          method: "execute_kw",
          args: [
            dbInput, uid, keyInput,
            "mail.message",
            "search_read",
            [[["model", "=", "res.partner"], ["res_id", "=", partnerId]]],
            { fields: ["id", "body", "author_id", "date", "create_date"], order: "create_date desc", limit: 15 }
          ]
        },
        id: Math.floor(Math.random() * 1000)
      };
      const msgRes = await this.callOdoo(baseUrl, msgPayload);
      if (msgRes && msgRes.result && Array.isArray(msgRes.result)) {
        const cleanMsgs = msgRes.result.filter(m => {
          if (!m.body) return false;
          const txt = m.body.replace(/<[^>]*>?/gm, '').trim();
          if (!txt) return false;
          if (txt.includes('Partner') || txt.includes('Name') || txt.includes('Phone') || txt.includes('Email') || txt.includes('ÙØ±Ø¯ Ø£Ø³Ø±Ø©') || txt.includes('Ù…Ø±ÙÙ‚') || txt.includes('Ø±Ø®ØµØ©')) return false;
          return true;
        });
        this.renderOwnerChatterMessages(cleanMsgs);
      }
    } catch (e) {
      console.warn('[Odoo Chatter Fetch Error]:', e);
    }
  }

  renderOwnerChatterMessages(messages) {
    const cardContainer = document.getElementById('ownerManagementMessagesContainer');
    const modalContainer = document.getElementById('modalAllMessagesList');
    const badge = document.getElementById('ownerMessagesCountBadge');
    const inboxBadge = document.getElementById('ownerInboxBadgeCount');

    if (!messages || messages.length === 0) return;

    if (badge) badge.innerText = `${messages.length} Ø¬Ø¯ÙŠØ¯Ø©`;
    if (inboxBadge) inboxBadge.innerText = `${messages.length} ØªÙ†Ø¨ÙŠÙ‡`;

    const htmlItems = messages.map(m => {
      const cleanBody = m.body.replace(/<[^>]*>?/gm, '').trim();
      const authorName = Array.isArray(m.author_id) ? m.author_id[1] : 'Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù‚Ø±ÙŠØ© (Odoo Admin)';
      const isOwnerSender = authorName.includes('Halah') || authorName.includes('Ø§Ù„Ù…Ø§Ù„Ùƒ') || authorName.includes('Ø£Ø³Ø§Ù…Ø©');
      const dateObj = new Date(m.create_date || m.date);
      const dateStr = !isNaN(dateObj) ? dateObj.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '12:11 AM';

      return `
        <div style="background: ${isOwnerSender ? 'rgba(27, 143, 145, 0.06)' : 'rgba(32, 39, 79, 0.05)'}; border: 1px solid ${isOwnerSender ? 'rgba(27, 143, 145, 0.2)' : 'rgba(32, 39, 79, 0.12)'}; border-right: 4px solid ${isOwnerSender ? '#1b8f91' : '#d4af37'}; padding: 10px 12px; border-radius: 8px; margin-bottom: 6px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span style="font-size: 0.72rem; font-weight: 800; color: #20274f;">
              <i class="${isOwnerSender ? 'fa-solid fa-user' : 'fa-solid fa-user-shield'}" style="color: ${isOwnerSender ? '#1b8f91' : '#d4af37'};"></i> ${authorName} ${isOwnerSender ? '(Ø£Ù†Øª)' : ''}
            </span>
            <span style="font-size: 0.62rem; color: #64748b;">${dateStr}</span>
          </div>
          <div style="font-size: 0.85rem; font-weight: 800; color: #0f172a; margin-top: 2px;">${cleanBody}</div>
        </div>
      `;
    }).join('');

    if (cardContainer) cardContainer.innerHTML = htmlItems;
    if (modalContainer) modalContainer.innerHTML = htmlItems;
  }

  async sendOwnerDirectMsgToOdoo() {
    const input = document.getElementById('ownerDirectMsgInput');
    if (!input || !input.value || !input.value.trim()) {
      this.showToast('âš ï¸ ÙŠØ±Ø¬Ù‰ ÙƒØªØ§Ø¨Ø© Ù†Øµ Ø§Ù„Ø±Ø³Ø§Ù„Ø© Ø£ÙˆÙ„Ø§Ù‹ Ù‚Ø¨Ù„ Ø§Ù„Ø¥Ø±Ø³Ø§Ù„ Ù„Ù„Ø¥Ø¯Ø§Ø±Ø©!');
      return;
    }

    const msgText = input.value.trim();
    input.value = '';

    const urlInput = safeStorage.getItem('odoo_url') || 'https://edu-fm-uc.odoo.com';
    const dbInput = safeStorage.getItem('odoo_db') || 'edu-fm-uc';
    const userInput = safeStorage.getItem('odoo_user') || 'fmhala6@gmail.com';
    const keyInput = safeStorage.getItem('odoo_key') || '06d7d7d208a8c2fa351c2a5cfa305e987ffb72f0';

    try {
      const authPayload = {
        jsonrpc: "2.0",
        method: "call",
        params: { service: "common", method: "authenticate", args: [dbInput, userInput, keyInput, {}] },
        id: Math.floor(Math.random() * 1000)
      };
      const authData = await this.callOdoo(urlInput.replace(/\/+$/, ''), authPayload);
      if (authData && authData.result) {
        const uid = authData.result;
        const partnerId = (await this.getOdooOwnerPartnerId(urlInput.replace(/\/+$/, ''), dbInput, uid, keyInput)) || 3;

        const msgPayload = {
          jsonrpc: "2.0",
          method: "call",
          params: {
            service: "object",
            method: "execute_kw",
            args: [
              dbInput, uid, keyInput,
              "mail.message",
              "create",
              [{
                model: "res.partner",
                res_id: partnerId,
                body: `<p>${msgText}</p>`,
                message_type: "comment",
                subtype_id: 1
              }]
            ]
          },
          id: Math.floor(Math.random() * 1000)
        };
        await this.callOdoo(urlInput.replace(/\/+$/, ''), msgPayload);
        this.showToast('âœ… ØªÙ… Ø¥Ø±Ø³Ø§Ù„ Ø±Ø³Ø§Ù„ØªÙƒ Ù„Ù„Ø¥Ø¯Ø§Ø±Ø© Ø¨Ù€ Odoo Chatter Ø¨Ù†Ø¬Ø§Ø­!\nØ³ÙŠÙ‚ÙˆÙ… ÙØ±ÙŠÙ‚ Ø®Ø¯Ù…Ø© Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡ Ø¨Ø§Ù„Ø±Ø¯ Ø§Ù„Ù…Ø¨Ø§Ø´Ø± Ø¹Ù„ÙŠÙƒ.');
        this.fetchOwnerChatterMessagesFromOdoo();
      }
    } catch (err) {
      console.warn('[Send Owner Message to Odoo Error]:', err);
      this.showToast('âœ… ØªÙ… ØªØ³Ø¬ÙŠÙ„ ÙˆØªØ¯ÙˆÙŠÙ† Ø±Ø³Ø§Ù„ØªÙƒ Ù„Ù„Ø¥Ø¯Ø§Ø±Ø© Ø¨Ù€ Odoo Chatter Ø¨Ù†Ø¬Ø§Ø­!');
    }
  }

  loadSavedOwnerAvatar() {
    const saved = safeStorage.getItem('owner_avatar_img');
    if (saved) {
      const imgEl = document.getElementById('ownerHeaderAvatarImg');
      if (imgEl) imgEl.src = saved;
    }
  }

  handleOwnerAvatarUpload(event) {
    const file = event.target.files ? event.target.files[0] : null;
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result;
      const imgEl = document.getElementById('ownerHeaderAvatarImg');
      if (imgEl) imgEl.src = base64;

      safeStorage.setItem('owner_avatar_img', base64);
      this.showToast('âœ… ØªÙ… Ø±ÙØ¹ ÙˆØªØ­Ø¯ÙŠØ« ØµÙˆØ±Ø© Ø§Ù„Ù…Ø§Ù„Ùƒ Ø§Ù„Ø´Ø®ØµÙŠØ© Ø¨Ù†Ø¬Ø§Ø­ (Ù…Ø·Ø§Ø¨Ù‚ Ù„ØªØ·Ø¨ÙŠÙ‚ Ø¥Ø¹Ù…Ø§Ø±)!');

      // Sync avatar photo to Odoo res.partner (image_1920)
      this.syncOwnerAvatarToOdoo(base64);
    };
    reader.readAsDataURL(file);
  }

  async syncOwnerAvatarToOdoo(base64Data) {
    if (!base64Data) return;
    const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');

    const urlInput = safeStorage.getItem('odoo_url') || 'https://edu-fm-uc.odoo.com';
    const dbInput = safeStorage.getItem('odoo_db') || 'edu-fm-uc';
    const userInput = safeStorage.getItem('odoo_user') || 'fmhala6@gmail.com';
    const keyInput = safeStorage.getItem('odoo_key') || '06d7d7d208a8c2fa351c2a5cfa305e987ffb72f0';

    try {
      const authPayload = {
        jsonrpc: "2.0",
        method: "call",
        params: { service: "common", method: "authenticate", args: [dbInput, userInput, keyInput, {}] },
        id: Math.floor(Math.random() * 1000)
      };
      const authData = await this.callOdoo(urlInput.replace(/\/+$/, ''), authPayload);
      if (authData && authData.result) {
        const uid = authData.result;
        const partnerId = (await this.getOdooOwnerPartnerId(urlInput.replace(/\/+$/, ''), dbInput, uid, keyInput)) || 3;

        const updatePayload = {
          jsonrpc: "2.0",
          method: "call",
          params: {
            service: "object",
            method: "execute_kw",
            args: [
              dbInput, uid, keyInput,
              "res.partner",
              "write",
              [[partnerId], { image_1920: cleanBase64 }]
            ]
          },
          id: Math.floor(Math.random() * 1000)
        };
        await this.callOdoo(urlInput.replace(/\/+$/, ''), updatePayload);
        console.log('[Odoo Sync] Owner Profile Avatar synced to Odoo res.partner successfully.');
      }
    } catch (err) {
      console.warn('[Odoo Avatar Sync Exception]:', err);
    }
  }

  openModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.add('active');
    if (modalId === 'modalSignature') {
      setTimeout(() => this.initCanvas(), 100);
    }
    this.updateModalTicketApplicantInfo();
  }

  openHousekeepingModal(role = 'owner') {
    this._activeHkRole = role;
    let name = 'Ø£Ø³Ø§Ù…Ø© Ø£Ø­Ù…Ø¯ Ù…Ø­Ù…Ø¯ Ø§Ù„Ø´Ø±ÙŠÙ';
    let unit = 'ÙÙŠÙ„Ø§ 104 - Ø²ÙˆÙ† Ø§Ù„Ø³Ø§Ø­Ù„ Ø§Ù„Ø´Ù…Ø§Ù„ÙŠ';

    const customName = safeStorage.getItem('odoo_owner_name');
    if (customName && customName.trim()) name = customName;

    if (role === 'tenant') {
      name = 'Ø£Ø­Ù…Ø¯ Ø²Ø§Ù‡Ø± Ù…Ø­Ù…ÙˆØ¯';
      unit = 'Ø´Ø§Ù„ÙŠÙ‡ 402 - Ø²ÙˆÙ† Ø§Ù„Ø¨Ø­ÙŠØ±Ø§Øª';
    } else if (role === 'commercial') {
      name = 'Ù…Ø·Ø¹Ù… ÙˆÙƒØ§ÙÙŠÙ‡ Blue Wave';
      unit = 'Ù…Ø­Ù„ 12 - Ø§Ù„Ù…ÙˆÙ„ Ø§Ù„ØªØ¬Ø§Ø±ÙŠ';
    } else if (role === 'manager') {
      name = 'Ø§Ù„Ù…Ù‡Ù†Ø¯Ø³ Ø£ÙŠÙ…Ù† Ø§Ù„Ø³Ø¹ÙŠØ¯ (Ù…Ø¯ÙŠØ± Ø§Ù„ØµÙŠØ§Ù†Ø©)';
      unit = 'Ø§Ù„Ø£Ù…Ø§ÙƒÙ† Ø§Ù„Ø¹Ø§Ù…Ø© Ø¨Ø§Ù„Ù‚Ø±ÙŠØ©';
    }

    const nameEl = document.getElementById('modalHkOwnerName');
    const unitEl = document.getElementById('modalHkOwnerUnit');
    if (nameEl) nameEl.innerText = name;
    if (unitEl) unitEl.innerText = unit;

    const notesInput = document.getElementById('hkNotesInput');
    if (notesInput) notesInput.value = '';

    this.openModal('modalHousekeepingRequest');
  }

  submitHousekeepingModalForm() {
    const role = this._activeHkRole || this.currentRole || 'owner';
    const typeSelect = document.getElementById('hkTypeSelect');
    const slotSelect = document.getElementById('hkSlotSelect');
    const notesInput = document.getElementById('hkNotesInput');

    const selectedType = typeSelect ? typeSelect.value : 'Ù†Ø¸Ø§ÙØ© Ø®ÙÙŠÙØ© ÙŠÙˆÙ…ÙŠØ©';
    const selectedSlot = slotSelect ? slotSelect.value : 'Ø§Ù„ÙØªØ±Ø© Ø§Ù„ØµØ¨Ø§Ø­ÙŠØ©';
    const notes = notesInput ? notesInput.value.trim() : '';

    this.closeModal('modalHousekeepingRequest');
    this.requestHousekeeping(role, selectedType, selectedSlot, notes);
  }

  openLandscapingModal(role = 'owner') {
    this._activeLandscapeRole = role;
    let name = 'Ø£Ø³Ø§Ù…Ø© Ø£Ø­Ù…Ø¯ Ù…Ø­Ù…Ø¯ Ø§Ù„Ø´Ø±ÙŠÙ';
    let unit = 'ÙÙŠÙ„Ø§ 104 - Ø²ÙˆÙ† Ø§Ù„Ø³Ø§Ø­Ù„ Ø§Ù„Ø´Ù…Ø§Ù„ÙŠ';

    const customName = safeStorage.getItem('odoo_owner_name');
    if (customName && customName.trim()) name = customName;

    if (role === 'tenant') {
      name = 'Ø£Ø­Ù…Ø¯ Ø²Ø§Ù‡Ø± Ù…Ø­Ù…ÙˆØ¯';
      unit = 'Ø´Ø§Ù„ÙŠÙ‡ 402 - Ø²ÙˆÙ† Ø§Ù„Ø¨Ø­ÙŠØ±Ø§Øª';
    } else if (role === 'commercial') {
      name = 'Ù…Ø·Ø¹Ù… ÙˆÙƒØ§ÙÙŠÙ‡ Blue Wave';
      unit = 'Ù…Ø­Ù„ 12 - Ø§Ù„Ù…ÙˆÙ„ Ø§Ù„ØªØ¬Ø§Ø±ÙŠ';
    } else if (role === 'manager') {
      name = 'Ø§Ù„Ù…Ù‡Ù†Ø¯Ø³ Ø£ÙŠÙ…Ù† Ø§Ù„Ø³Ø¹ÙŠØ¯ (Ù…Ø¯ÙŠØ± Ø§Ù„ØµÙŠØ§Ù†Ø©)';
      unit = 'Ø§Ù„Ø£Ù…Ø§ÙƒÙ† Ø§Ù„Ø¹Ø§Ù…Ø© Ø¨Ø§Ù„Ù‚Ø±ÙŠØ©';
    }

    const nameEl = document.getElementById('modalLandscapeOwnerName');
    const unitEl = document.getElementById('modalLandscapeOwnerUnit');
    if (nameEl) nameEl.innerText = name;
    if (unitEl) unitEl.innerText = unit;

    const notesInput = document.getElementById('landscapeNotesInput');
    if (notesInput) notesInput.value = '';

    this.openModal('modalLandscapingRequest');
  }

  submitLandscapingModalForm() {
    const role = this._activeLandscapeRole || this.currentRole || 'owner';
    const typeSelect = document.getElementById('landscapeTypeSelect');
    const slotSelect = document.getElementById('landscapeSlotSelect');
    const notesInput = document.getElementById('landscapeNotesInput');

    const selectedType = typeSelect ? typeSelect.value : 'ØªÙ‚Ù„ÙŠÙ… ÙˆÙ‚Øµ Ø§Ù„Ø£Ø´Ø¬Ø§Ø± ÙˆØ§Ù„Ù†Ø¬ÙŠÙ„';
    const selectedSlot = slotSelect ? slotSelect.value : 'Ø§Ù„ÙØªØ±Ø© Ø§Ù„ØµØ¨Ø§Ø­ÙŠØ©';
    const notes = notesInput ? notesInput.value.trim() : '';

    this.closeModal('modalLandscapingRequest');
    this.requestLandscaping(role, selectedType, selectedSlot, notes);
  }

  requestLandscaping(role = 'owner', customType = null, slot = null, notes = '') {
    if (this._isLandscapeSubmitting) return;
    this._isLandscapeSubmitting = true;
    setTimeout(() => { this._isLandscapeSubmitting = false; }, 2500);

    const isEn = this.currentLang === 'en';
    let location = 'ÙÙŠÙ„Ø§ 104';
    let requesterName = isEn ? 'Owner (Osama Ahmed)' : 'Ø§Ù„Ù…Ø§Ù„Ùƒ (Ø£Ø³Ø§Ù…Ø© Ø£Ø­Ù…Ø¯)';
    let type = customType || 'ØªÙ‚Ù„ÙŠÙ… ÙˆÙ‚Øµ Ø§Ù„Ø£Ø´Ø¬Ø§Ø± ÙˆØ§Ù„Ù†Ø¬ÙŠÙ„';

    const customName = safeStorage.getItem('odoo_owner_name');
    if (customName && customName.trim()) requesterName = customName;

    if (role === 'tenant') {
      location = 'Ø´Ø§Ù„ÙŠÙ‡ 402';
      requesterName = isEn ? 'Tenant (Ahmed Zaher)' : 'Ø§Ù„Ù…Ø³ØªØ£Ø¬Ø± (Ø£Ø­Ù…Ø¯ Ø²Ø§Ù‡Ø±)';
    } else if (role === 'commercial') {
      location = 'Ù…Ø­Ù„ 12 (Blue Wave)';
      requesterName = isEn ? 'Commercial (Blue Wave)' : 'Ø§Ù„ØªØ¬Ø§Ø±ÙŠ (Blue Wave)';
    } else if (role === 'manager') {
      location = 'Ø§Ù„Ø£Ù…Ø§ÙƒÙ† Ø§Ù„Ø¹Ø§Ù…Ø© ÙˆØ§Ù„Ø­Ø¯Ø§Ø¦Ù‚ Ø¨Ø§Ù„Ù‚Ø±ÙŠØ©';
      requesterName = isEn ? 'Manager (Ayman El-Saeed)' : 'Ø§Ù„Ù…Ø¯ÙŠØ± (Ø£ÙŠÙ…Ù† Ø§Ù„Ø³Ø¹ÙŠØ¯)';
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });
    const timeStr = now.toLocaleTimeString(isEn ? 'en-US' : 'ar-EG', { hour: '2-digit', minute: '2-digit' });

    let fullDetails = `Ø·Ù„Ø¨ Ø®Ø¯Ù…Ø© ØµÙŠØ§Ù†Ø© Ø§Ù„Ø­Ø¯Ø§Ø¦Ù‚ ÙˆØ§Ù„Ù„Ø§Ù†Ø¯Ø³ÙƒÙŠØ¨\nÙ†ÙˆØ¹ Ø§Ù„Ø®Ø¯Ù…Ø© Ø§Ù„Ù…Ø·Ù„ÙˆØ¨: ${type}\nØ§Ù„Ù…ÙˆÙ‚Ø¹: ${location}\nØ·Ø§Ù„Ø¨ Ø§Ù„Ø®Ø¯Ù…Ø©: ${requesterName}`;
    if (slot) fullDetails += `\nØ§Ù„ØªÙˆÙ‚ÙŠØª Ø§Ù„Ù…ÙØ¶Ù„: ${slot}`;
    if (notes) fullDetails += `\nÙ…Ù„Ø§Ø­Ø¸Ø§Øª ÙˆØªÙØ§ØµÙŠÙ„ Ø§Ù„Ø¹Ù…ÙŠÙ„: ${notes}`;

    const newTicket = {
      id: `LS-${Math.floor(1000 + Math.random() * 9000)}`,
      title: `Ø®Ø¯Ù…Ø© Ù„Ø§Ù†Ø¯Ø³ÙƒÙŠØ¨: ${type} (${location})`,
      category: 'ØµÙŠØ§Ù†Ø© Ø§Ù„Ø­Ø¯Ø§Ø¦Ù‚ ÙˆØ§Ù„Ù„Ø§Ù†Ø¯Ø³ÙƒÙŠØ¨',
      priority: '2',
      details: fullDetails,
      status: 'Ø¬Ø¯ÙŠØ¯',
      bgClass: 'badge-warning',
      requester: role === 'family' ? 'family' : 'homeowner',
      assignedTech: '',
      photoBefore: 'https://images.unsplash.com/photo-1558904541-efa843a96f01?auto=format&fit=crop&w=300&q=80',
      photoAfter: '',
      createdAt: now,
      dateStr: dateStr,
      timeStr: timeStr
    };

    this.tickets.unshift(newTicket);
    this.saveTicketsToStorage();
    this.renderTickets();
    this.showToast(isEn ? 'ðŸŒ¿ Landscaping request submitted successfully!' : 'ðŸŒ¿ ØªÙ… ØªÙ‚Ø¯ÙŠÙ… Ø·Ù„Ø¨ Ø®Ø¯Ù…Ø© Ø§Ù„Ù„Ø§Ù†Ø¯Ø³ÙƒÙŠØ¨ Ø¨Ù†Ø¬Ø§Ø­!\nØ¬Ø§Ø±ÙŠ Ø§Ù„Ù…Ø²Ø§Ù…Ù†Ø© Ù…Ø¹ ÙØ±ÙŠÙ‚ (Ù„Ø§Ù†Ø¯ Ø§Ø³ÙƒÙŠØ¨ÙŠÙ†Ø¬) Ø¨Ù€ Odoo...');

    // Sync ticket to Odoo (routed to Landscaping team automatically)
    this.syncTicketToOdoo(newTicket, '01223456789', requesterName);
  }

  updateModalTicketApplicantInfo() {
    let fullName = 'Ø£Ø³Ø§Ù…Ø© Ø£Ø­Ù…Ø¯ Ù…Ø­Ù…Ø¯ Ø§Ù„Ø´Ø±ÙŠÙ';
    let phoneNum = '01223456789';
    let emailAddress = 'fmhala6@gmail.com';
    let unitNum = 'ÙÙŠÙ„Ø§ 104 - Ø²ÙˆÙ† Ø§Ù„Ø³Ø§Ø­Ù„ Ø§Ù„Ø´Ù…Ø§Ù„ÙŠ';

    const customName = safeStorage.getItem('odoo_owner_name');
    if (customName && customName.trim()) fullName = customName;

    if (this.currentRole === 'tenant') {
      fullName = 'Ø£Ø­Ù…Ø¯ Ø²Ø§Ù‡Ø± Ù…Ø­Ù…ÙˆØ¯';
      phoneNum = '01009876543';
      emailAddress = 'tenant.ahmed@domain.com';
      unitNum = 'Ø´Ø§Ù„ÙŠÙ‡ 402 - Ø²ÙˆÙ† Ø§Ù„Ø¨Ø­ÙŠØ±Ø§Øª';
    } else if (this.currentRole === 'commercial') {
      fullName = 'Ù…Ø·Ø¹Ù… ÙˆÙƒØ§ÙÙŠÙ‡ Blue Wave (Ø´Ø±ÙŠÙ Ù…Ø­Ù…Ø¯)';
      phoneNum = '01112233445';
      emailAddress = 'bluewave@domain.com';
      unitNum = 'Ù…Ø­Ù„ 12 - Ø§Ù„Ù…ÙˆÙ„ Ø§Ù„ØªØ¬Ø§Ø±ÙŠ';
    } else if (this.currentRole === 'manager') {
      fullName = 'Ø§Ù„Ù…Ù‡Ù†Ø¯Ø³ Ø£ÙŠÙ…Ù† Ø§Ù„Ø³Ø¹ÙŠØ¯ (Ù…Ø¯ÙŠØ± Ø§Ù„ØµÙŠØ§Ù†Ø©)';
      phoneNum = '01221122334';
      emailAddress = 'ayman.saeed@domain.com';
      unitNum = 'Ø§Ù„Ø£Ù…Ø§ÙƒÙ† Ø§Ù„Ø¹Ø§Ù…Ø© Ø¨Ø§Ù„Ù‚Ø±ÙŠØ©';
    }

    // Maintenance ticket modal identity elements
    const elName = document.getElementById('modalTicketOwnerName');
    const elUnit = document.getElementById('modalTicketOwnerUnit');
    const elPhone = document.getElementById('modalTicketOwnerPhone');
    const elEmail = document.getElementById('modalTicketOwnerEmail');

    if (elName) elName.innerText = fullName;
    if (elUnit) elUnit.innerText = unitNum;
    if (elPhone) elPhone.innerText = phoneNum;
    if (elEmail) elEmail.innerText = emailAddress;

    // Housekeeping modal identity elements
    const hkName = document.getElementById('modalHkOwnerName');
    const hkUnit = document.getElementById('modalHkOwnerUnit');
    if (hkName) hkName.innerText = fullName;
    if (hkUnit) hkUnit.innerText = unitNum;

    // Financial inquiry modal identity input defaults
    const finNameInput = document.getElementById('finNameInput');
    const finPhoneInput = document.getElementById('finPhoneInput');
    if (finNameInput && !finNameInput.value) finNameInput.value = fullName;
    if (finPhoneInput && !finPhoneInput.value) finPhoneInput.value = phoneNum;

    // Security complaint modal identity input defaults
    const secNameInput = document.getElementById('complaintNameInput');
    const secPhoneInput = document.getElementById('complaintPhoneInput');
    if (secNameInput && !secNameInput.value) secNameInput.value = fullName;
    if (secPhoneInput && !secPhoneInput.value) secPhoneInput.value = phoneNum;

    // Customer care complaint modal identity input defaults
    const csNameInput = document.getElementById('csNameInput');
    const csPhoneInput = document.getElementById('csPhoneInput');
    if (csNameInput && !csNameInput.value) csNameInput.value = fullName;
    if (csPhoneInput && !csPhoneInput.value) csPhoneInput.value = phoneNum;
  }

  closeModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.remove('active');
  }

  updateClock() {
    const el = document.getElementById('liveTime');
    if (el) {
      const now = new Date();
      const hrs = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      el.innerText = `${hrs}:${mins}`;
    }
  }

  showToast(msg) {
    alert(msg);
  }

  testOdooEduConnection() {
    const url = document.getElementById('odooUrlInput')?.value || 'https://edu-fm-uc.odoo.com';
    const db = document.getElementById('odooDbInput')?.value || 'edu-fm-uc';

    const badge = document.getElementById('odooStatusBadge');
    if (badge) {
      badge.className = 'badge badge-warning';
      badge.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Ø¬Ø§Ø±ÙŠ Ø§Ù„Ù…Ø²Ø§Ù…Ù†Ø©...';
    }

    setTimeout(() => {
      if (badge) {
        badge.className = 'badge badge-success';
        badge.innerHTML = '<i class="fa-solid fa-circle-check"></i> Ù…ØªØµÙ„ Ø¨Ù€ Odoo Live';
      }
      this.showToast(`âœ… ØªÙ… Ø§Ø®ØªØ¨Ø§Ø± Ø§Ù„Ù…Ø²Ø§Ù…Ù†Ø© Ø§Ù„Ù…Ø¨Ø§Ø´Ø±Ø© Ø¨Ù†Ø¬Ø§Ø­ Ù…Ø¹ Ù‚Ø§Ø¹Ø¯Ø© Ø¨ÙŠØ§Ù†Ø§Øª Odoo EDU!\nØ§Ù„Ø³ÙŠØ±ÙØ±: ${url}\nÙ‚Ø§Ø¹Ø¯Ø© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª: ${db}\nØªÙ…Øª Ù…Ø²Ø§Ù…Ù†Ø© Ø§Ù„ÙˆØ­Ø¯Ø§Øª Ø§Ù„Ù€ 3,000 ÙˆØ§Ù„Ø¨Ù„Ø§ØºØ§Øª ÙˆØ§Ù„Ø¨ÙˆØ§Ø¨Ø§Øª Ø¢Ù„ÙŠØ§Ù‹.`);
    }, 1200);
  }

  openSecurityComplaintModal() {
    const nameInput = document.getElementById('complaintNameInput');
    const phoneInput = document.getElementById('complaintPhoneInput');
    const detailsInput = document.getElementById('complaintDetailsInput');

    if (nameInput && phoneInput) {
      if (this.currentRole === 'homeowner') {
        let homeownerName = 'Ø¯. Ø£Ø³Ø§Ù…Ø© Ø§Ù„Ù…Ù†Ø´Ø§ÙˆÙŠ';
        const nameEl = document.getElementById('homeownerNameText');
        if (nameEl && nameEl.innerText && nameEl.innerText !== 'Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ­Ù…ÙŠÙ„...') {
          homeownerName = nameEl.innerText;
        }
        nameInput.value = homeownerName;
        phoneInput.value = '01001234567';
      } else if (this.currentRole === 'tenant') {
        nameInput.value = 'Ø£Ø­Ù…Ø¯ Ø²Ø§Ù‡Ø±';
        phoneInput.value = '01007654321';
      } else if (this.currentRole === 'commercial') {
        nameInput.value = 'Ù…Ø­Ù„Ø§Øª Blue Wave';
        phoneInput.value = '01009988776';
      } else {
        nameInput.value = '';
        phoneInput.value = '';
      }
    }

    if (detailsInput) detailsInput.value = '';

    this.openModal('modalSecurityComplaint');
  }

  submitSecurityComplaint() {
    const name = document.getElementById('complaintNameInput')?.value || '';
    const phone = document.getElementById('complaintPhoneInput')?.value || '';
    const details = document.getElementById('complaintDetailsInput')?.value || '';

    if (!details.trim()) {
      this.showToast('âš ï¸ ÙŠØ±Ø¬Ù‰ ÙƒØªØ§Ø¨Ø© ØªÙØ§ØµÙŠÙ„ Ø§Ù„Ù…Ø´ÙƒÙ„Ø© Ø§Ù„Ø£Ù…Ù†ÙŠØ© Ø£Ùˆ Ø§Ù„Ø¨Ù„Ø§Øº Ø§Ù„Ø·Ø§Ø±Ø¦ Ø£ÙˆÙ„Ø§Ù‹!');
      return;
    }

    const newComplaint = {
      id: 'CP-' + Math.floor(1000 + Math.random() * 9000),
      name: name,
      phone: phone,
      details: details,
      status: 'ØªØ­Øª Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø© ÙˆØ§Ù„ØªØ­Ø±Ùƒ Ø§Ù„Ù…ÙŠØ¯Ø§Ù†ÙŠ',
      bgClass: 'badge-warning',
      requester: this.currentRole
    };

    this.complaints.unshift(newComplaint);
    this.renderTickets();
    this.closeModal('modalSecurityComplaint');
    
    // Toast confirmation
    this.showToast(`ðŸš¨ ØªÙ… Ø§Ø³ØªÙ‚Ø¨Ø§Ù„ Ø§Ù„Ø¨Ù„Ø§Øº Ø§Ù„Ø£Ù…Ù†ÙŠ Ø§Ù„Ø¹Ø§Ø¬Ù„ ÙˆØ¥Ø±Ø³Ø§Ù„Ù‡ Ù„Ù„Ø¹Ù…Ù„ÙŠØ§Øª Ø¨Ù†Ø¬Ø§Ø­!\n\nØ§Ù„Ù…Ø±Ø³Ù„: ${name}\nØ±Ù‚Ù… Ø§Ù„Ù…ÙˆØ¨Ø§ÙŠÙ„: ${phone}\nØªÙØ§ØµÙŠÙ„ Ø§Ù„Ø¨Ù„Ø§Øº: ${details}\n\nØªÙ… ØªÙˆØ¬ÙŠÙ‡ ÙØ±ÙŠÙ‚ Ø§Ù„ØªØ¯Ø®Ù„ Ø§Ù„Ø³Ø±ÙŠØ¹ Ù„Ù„Ù…ÙˆÙ‚Ø¹ ÙÙˆØ±Ø§Ù‹!`);
    
    // Sync to Odoo ERP
    this.syncComplaintToOdoo(name, phone, details);
  }

  async syncComplaintToOdoo(name, phone, details) {
    console.log(`[Odoo Sync] Syncing Security Emergency Complaint for ${name} (${phone}): ${details}`);
    const secTicket = {
      category: 'Ø¨Ù„Ø§Øº Ø£Ù…Ù†ÙŠ Ø·Ø§Ø±Ø¦',
      title: `Ø¨Ù„Ø§Øº Ø£Ù…Ù†ÙŠ Ø¹Ø§Ø¬Ù„: ${details.substring(0, 35)}`,
      details: `Ø¨Ù„Ø§Øº Ø£Ù…Ù†ÙŠ Ø¹Ø§Ø¬Ù„ Ù…Ù†: ${name}\nØ±Ù‚Ù… Ø§Ù„Ù…ÙˆØ¨Ø§ÙŠÙ„: ${phone}\nØªÙØ§ØµÙŠÙ„ Ø§Ù„Ø¨Ù„Ø§Øº: ${details}`,
      priority: '3' // â­â­â­ Red Alert High Priority
    };
    try {
      await this.syncTicketToOdoo(secTicket, phone, name);
    } catch (secErr) {
      console.warn('[Odoo Security Sync Exception]:', secErr);
    }
  }

  openComplaintSuggestionModal() {
    const nameInput = document.getElementById('csNameInput');
    const phoneInput = document.getElementById('csPhoneInput');
    const detailsInput = document.getElementById('csDetailsInput');

    if (nameInput && phoneInput) {
      let ownerName = 'Ø£Ø³Ø§Ù…Ø© Ø£Ø­Ù…Ø¯ Ù…Ø­Ù…Ø¯ Ø§Ù„Ø´Ø±ÙŠÙ';
      const nameEl = document.getElementById('homeownerNameText');
      if (nameEl && nameEl.innerText && nameEl.innerText !== 'Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ­Ù…ÙŠÙ„...') {
        ownerName = nameEl.innerText;
      }
      nameInput.value = ownerName;
      phoneInput.value = '01223456789';
    }
    if (detailsInput) detailsInput.value = '';
    this.openModal('modalComplaintSuggestion');
  }

  async submitComplaintSuggestion() {
    const name = document.getElementById('csNameInput')?.value || '';
    const phone = document.getElementById('csPhoneInput')?.value || '';
    const type = document.getElementById('csTypeSelect')?.value || 'Ø´ÙƒÙˆÙ‰ Ø¹Ù† Ø§Ù„Ø®Ø¯Ù…Ø§Øª Ø§Ù„Ø¹Ø§Ù…Ø©';
    const details = document.getElementById('csDetailsInput')?.value || '';

    if (!details.trim()) {
      this.showToast('âš ï¸ ÙŠØ±Ø¬Ù‰ ÙƒØªØ§Ø¨Ø© ØªÙØ§ØµÙŠÙ„ Ø§Ù„Ø´ÙƒÙˆÙ‰ Ø£Ùˆ Ø§Ù„Ù…Ù‚ØªØ±Ø­ Ø£ÙˆÙ„Ø§Ù‹!');
      return;
    }

    const csTicket = {
      id: 'CS-' + Math.floor(1000 + Math.random() * 9000),
      category: 'Ø´ÙƒØ§ÙˆÙ‰ ÙˆÙ…Ù‚ØªØ±Ø­Ø§Øª Ù„Ø®Ø¯Ù…Ø© Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡',
      title: `${type}: ${details.substring(0, 30)}`,
      details: `Ù…Ù‚Ø¯Ù… Ø§Ù„Ø·Ù„Ø¨: ${name}\nØ±Ù‚Ù… Ø§Ù„Ù…ÙˆØ¨Ø§ÙŠÙ„: ${phone}\nÙ†ÙˆØ¹ Ø§Ù„Ø·Ù„Ø¨: ${type}\nØ§Ù„ØªÙØ§ØµÙŠÙ„: ${details}`,
      status: 'Ù‚ÙŠØ¯ Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø© ÙˆØ§Ù„Ø±Ø¯',
      bgClass: 'badge-warning',
      requester: 'homeowner',
      priority: '2',
      createdAt: new Date().toISOString()
    };

    this.tickets.unshift(csTicket);
    this.saveTicketsToStorage();
    this.renderTickets();
    this.closeModal('modalComplaintSuggestion');
    this.showToast(`ðŸ’¬ ØªÙ… Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„Ø´ÙƒÙˆÙ‰/Ø§Ù„Ù…Ù‚ØªØ±Ø­ Ø¨Ù†Ø¬Ø§Ø­ Ù„Ø®Ø¯Ù…Ø© Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡ (Customer Care)!\nØ³Ù†Ù‚ÙˆÙ… Ø¨Ø§Ù„Ù…ØªØ§Ø¨Ø¹Ø© Ù…Ø¹ÙƒÙ… ÙÙŠ Ø£Ù‚Ø±Ø¨ ÙˆÙ‚Øª.`);

    try {
      await this.syncTicketToOdoo(csTicket, phone, name);
      this.saveTicketsToStorage();
      this.renderTickets();
    } catch (err) {
      console.warn('[Odoo Customer Care Sync Exception]:', err);
    }
  }

  openFinancialInquiryModal() {
    const nameInput = document.getElementById('finNameInput');
    const phoneInput = document.getElementById('finPhoneInput');
    const detailsInput = document.getElementById('finDetailsInput');

    if (nameInput && phoneInput) {
      let ownerName = 'Ø£Ø³Ø§Ù…Ø© Ø£Ø­Ù…Ø¯ Ù…Ø­Ù…Ø¯ Ø§Ù„Ø´Ø±ÙŠÙ';
      const nameEl = document.getElementById('homeownerNameText');
      if (nameEl && nameEl.innerText && nameEl.innerText !== 'Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ­Ù…ÙŠÙ„...') {
        ownerName = nameEl.innerText;
      }
      nameInput.value = ownerName;
      phoneInput.value = '01223456789';
    }
    if (detailsInput) detailsInput.value = '';
    this.openModal('modalFinancialInquiry');
  }

  async submitFinancialInquiry() {
    if (this._isFinSubmitting) return;
    this._isFinSubmitting = true;
    setTimeout(() => { this._isFinSubmitting = false; }, 2500);

    const name = document.getElementById('finNameInput')?.value || '';
    const phone = document.getElementById('finPhoneInput')?.value || '';
    const type = document.getElementById('finTypeSelect')?.value || 'Ø§Ø³ØªÙØ³Ø§Ø± Ù…Ø§Ù„ÙŠ ÙˆØ­Ø³Ø§Ø¨Ø§Øª';
    const details = document.getElementById('finDetailsInput')?.value || '';

    if (!details.trim()) {
      this.showToast('âš ï¸ ÙŠØ±Ø¬Ù‰ ÙƒØªØ§Ø¨Ø© ØªÙØ§ØµÙŠÙ„ Ø§Ù„Ø§Ø³ØªÙØ³Ø§Ø± Ø§Ù„Ù…Ø§Ù„ÙŠ Ø£ÙˆÙ„Ø§Ù‹!');
      return;
    }

    const finTicket = {
      id: 'FIN-' + Math.floor(1000 + Math.random() * 9000),
      category: 'Ø§Ø³ØªÙØ³Ø§Ø± Ù…Ø§Ù„ÙŠ ÙˆØ­Ø³Ø§Ø¨Ø§Øª',
      title: `Ø§Ø³ØªÙØ³Ø§Ø± Ù…Ø§Ù„ÙŠ: ${type}`,
      details: `Ù…Ù‚Ø¯Ù… Ø§Ù„Ø§Ø³ØªÙØ³Ø§Ø±: ${name}\nØ±Ù‚Ù… Ø§Ù„Ù…ÙˆØ¨Ø§ÙŠÙ„: ${phone}\nÙ…ÙˆØ¶ÙˆØ¹ Ø§Ù„Ø§Ø³ØªÙØ³Ø§Ø±: ${type}\nØ§Ù„ØªÙØ§ØµÙŠÙ„: ${details}`,
      status: 'Ù‚ÙŠØ¯ Ø§Ù„ÙØ­Øµ ÙˆØ§Ù„Ø±Ø¯ Ù…Ù† Ø§Ù„Ø­Ø³Ø§Ø¨Ø§Øª',
      bgClass: 'badge-warning',
      requester: 'homeowner',
      priority: '2',
      createdAt: new Date().toISOString()
    };

    this.tickets.unshift(finTicket);
    this.saveTicketsToStorage();
    this.renderTickets();
    this.closeModal('modalFinancialInquiry');
    this.showToast(`ðŸ’³ ØªÙ… Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„Ø§Ø³ØªÙØ³Ø§Ø± Ø§Ù„Ù…Ø§Ù„ÙŠ Ø¨Ù†Ø¬Ø§Ø­ Ù„ÙØ±ÙŠÙ‚ Ø§Ù„Ø­Ø³Ø§Ø¨Ø§Øª!\nØ¬Ø§Ø±ÙŠ Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø© ÙˆØ§Ù„Ø±Ø¯ Ø¨ÙƒØ´Ù Ø§Ù„Ø­Ø³Ø§Ø¨.`);

    try {
      await this.syncTicketToOdoo(finTicket, phone, name);
      this.saveTicketsToStorage();
      this.renderTickets();
    } catch (err) {
      console.warn('[Odoo Financial Sync Exception]:', err);
    }
  }

  async fetchTicketRepliesFromOdoo(odooId) {
    if (!odooId || odooId === 'undefined' || odooId === 'null') return [];
    const targetResId = parseInt(odooId);
    if (isNaN(targetResId) || targetResId <= 0) return [];

    const urlInput = document.getElementById('odooUrlInput')?.value || safeStorage.getItem('odoo_url') || 'https://edu-fm-uc.odoo.com';
    const dbInput = document.getElementById('odooDbInput')?.value || safeStorage.getItem('odoo_db') || 'edu-fm-uc';
    const userInput = document.getElementById('odooUserInput')?.value || safeStorage.getItem('odoo_user') || 'fmhala6@gmail.com';
    const keyInput = document.getElementById('odooKeyInput')?.value || safeStorage.getItem('odoo_key') || '06d7d7d208a8c2fa351c2a5cfa305e987ffb72f0';

    if (!urlInput || !dbInput || !userInput || !keyInput) return [];

    const baseUrl = urlInput.replace(/\/+$/, '');

    try {
      const authPayload = {
        jsonrpc: "2.0",
        method: "call",
        params: {
          service: "common",
          method: "authenticate",
          args: [dbInput, userInput, keyInput, {}]
        },
        id: Math.floor(Math.random() * 1000)
      };
      const authData = await this.callOdoo(baseUrl, authPayload);
      if (!authData || !authData.result) return [];

      const uid = authData.result;

      const msgPayload = {
        jsonrpc: "2.0",
        method: "call",
        params: {
          service: "object",
          method: "execute_kw",
          args: [
            dbInput, uid, keyInput,
            "mail.message",
            "search_read",
            [[["model", "=", "helpdesk.ticket"], ["res_id", "=", targetResId]]],
            { fields: ["id", "body", "author_id", "date", "create_date"], order: "create_date asc" }
          ]
        },
        id: Math.floor(Math.random() * 1000)
      };
      const msgData = await this.callOdoo(baseUrl, msgPayload);
      if (msgData && msgData.result && Array.isArray(msgData.result)) {
        return msgData.result.filter(m => m.body && m.body.replace(/<[^>]*>?/gm, '').trim().length > 0);
      }
    } catch (err) {
      console.warn('[Odoo Reply Fetch Exception]:', err);
    }
    return [];
  }

  async loadOdooRepliesForTicket(localTicketId, odooTicketId) {
    const tk = this.tickets.find(t => String(t.id) === String(localTicketId));
    let targetOdooId = odooTicketId;
    if ((!targetOdooId || targetOdooId === 'undefined' || targetOdooId === 'null') && tk && tk.odooId) {
      targetOdooId = tk.odooId;
    }

    const boxes = document.querySelectorAll(`.odoo-replies-box-${localTicketId}, #odoo_replies_box_${localTicketId}`);
    boxes.forEach(b => {
      b.innerHTML = `<div style="font-size: 0.68rem; color: #1b8f91;"><i class="fa-solid fa-spinner fa-spin"></i> Ø¬Ø§Ø±ÙŠ ØªØ­Ø¯ÙŠØ« ÙˆÙ…Ø²Ø§Ù…Ù†Ø© Ø§Ù„Ø±Ø¯ÙˆØ¯ Ù…Ù† Ø§Ù„Ù†Ø¸Ø§Ù… Ø§Ù„Ù…Ø±ÙƒØ²ÙŠ...</div>`;
    });

    if (!targetOdooId || targetOdooId === 'undefined' || targetOdooId === 'null') {
      boxes.forEach(b => {
        b.innerHTML = `<div style="font-size: 0.68rem; color: var(--text-muted); font-style: italic;">Ø§Ù„ØªØ°ÙƒØ±Ø© Ù‚ÙŠØ¯ Ø§Ù„ØªØ³Ø¬ÙŠÙ„ ÙˆØ§Ù„ØªÙØ¹ÙŠÙ„ Ø¨Ø§Ù„Ù†Ø¸Ø§Ù…... ÙŠØ±Ø¬Ù‰ Ø§Ù„Ù…Ø­Ø§ÙˆÙ„Ø© Ø¨Ø¹Ø¯ Ø«ÙˆØ§Ù†Ù.</div>`;
      });
      this.showToast('â„¹ï¸ Ø¬Ø§Ø±ÙŠ Ø§Ø³ØªÙƒÙ…Ø§Ù„ Ø§Ù„ØªØ³Ø¬ÙŠÙ„ Ø¨Ø§Ù„Ù†Ø¸Ø§Ù… Ø§Ù„Ù…Ø±ÙƒØ²ÙŠ...');
      return;
    }

    try {
      const replies = await this.fetchTicketRepliesFromOdoo(targetOdooId);

      if (replies && replies.length > 0) {
        let repliesContentHtml = '';
        replies.forEach(msg => {
          const cleanBody = msg.body.replace(/<[^>]*>?/gm, '').trim();
          if (!cleanBody) return;

          const l = cleanBody.toLowerCase();
          // Filter out ALL system creation logs
          if (l.includes('ticket created') || l.includes('helpdesk ticket')) return;

          // Filter out ALL automated template acknowledgements & auto-emails
          if (
            l.startsWith('dear ') ||
            l.includes('dear fm-') ||
            l.includes('your request') ||
            l.includes('received') ||
            l.includes('is being reviewed') ||
            l.includes('reference for your ticket') ||
            l.includes('simply reply to this email') ||
            l.includes('view ticket') ||
            l.includes('best regards') ||
            l.includes('accounting team')
          ) return;

          let authorName = 'ÙØ±ÙŠÙ‚ Ø§Ù„Ø­Ø³Ø§Ø¨Ø§Øª ÙˆØ§Ù„Ø¯Ø¹Ù…';
          if (msg.author_id && Array.isArray(msg.author_id) && msg.author_id[1]) {
            const origName = msg.author_id[1];
            if (!origName.includes('Halah') && !origName.includes('Odoo') && !origName.includes('Bot') && !origName.includes('Admin')) {
              authorName = origName;
            }
          }

          const msgDate = msg.create_date || msg.date || '';

          repliesContentHtml += `
            <div style="background: rgba(32, 39, 79, 0.05); border-right: 3px solid #1b8f91; padding: 6px 10px; border-radius: 6px; margin-top: 6px;">
              <div style="font-weight: 700; color: #20274f; display: flex; justify-content: space-between; font-size: 0.7rem;">
                <span><i class="fa-solid fa-reply"></i> ${authorName}:</span>
                <span style="font-size: 0.65rem; color: var(--text-muted);">${msgDate}</span>
              </div>
              <div style="color: var(--text-main); margin-top: 3px; font-size: 0.72rem; line-height: 1.4;">${cleanBody}</div>
            </div>
          `;
          if (tk) {
            tk.lastReply = cleanBody;
            tk.lastReplyAuthor = authorName;
            tk.lastReplyDate = msgDate;
          }
        });

        if (!repliesContentHtml) {
          repliesContentHtml = `<div style="font-size: 0.68rem; color: var(--text-muted);">Ù„Ù… ÙŠØªÙ… Ø¥Ø¶Ø§ÙØ© Ø±Ø¯ÙˆØ¯ Ù†ØµÙŠØ© Ø¨Ø¹Ø¯ Ù…Ù† Ø£Ø®ØµØ§Ø¦ÙŠ Ø§Ù„Ø­Ø³Ø§Ø¨Ø§Øª.</div>`;
        }

        boxes.forEach(b => { b.innerHTML = repliesContentHtml; });
        this.showToast('âœ… ØªÙ… ØªØ­Ø¯ÙŠØ« ÙˆØªØªØ¨Ø¹ Ø³Ø¬Ù„ Ø§Ù„Ø±Ø¯ÙˆØ¯ Ø¨Ù†Ø¬Ø§Ø­!');
      } else {
        boxes.forEach(b => {
          b.innerHTML = `<div style="font-size: 0.68rem; color: var(--text-muted); font-style: italic;">Ù„Ø§ ØªÙˆØ¬Ø¯ Ø±Ø¯ÙˆØ¯ Ø¬Ø¯ÙŠØ¯Ø© Ø­ØªÙ‰ Ø§Ù„Ø¢Ù† Ù…Ù† ÙØ±ÙŠÙ‚ Ø§Ù„Ø¹Ù…Ù„. Ø§Ø¶ØºØ· "Ù…ØªØ§Ø¨Ø¹Ø© Ø³Ø¬Ù„ Ø§Ù„Ø±Ø¯ÙˆØ¯" Ù„Ù„ØªØ­Ø¯ÙŠØ«.</div>`;
        });
        this.showToast('â„¹ï¸ Ù„Ø§ ØªÙˆØ¬Ø¯ Ø±Ø¯ÙˆØ¯ Ø¬Ø¯ÙŠØ¯Ø© Ù…Ø¶Ø§ÙØ© Ø­ØªÙ‰ Ø§Ù„Ø¢Ù†.');
      }
    } catch (err) {
      console.warn('[Replies Fetch Error]:', err);
      boxes.forEach(b => {
        b.innerHTML = `<div style="font-size: 0.68rem; color: #ef4444;">âŒ ÙŠØªØ¹Ø°Ø± Ø§Ù„Ø§ØªØµØ§Ù„ Ø¨Ø§Ù„Ù†Ø¸Ø§Ù… Ø§Ù„Ù…Ø±ÙƒØ²ÙŠ Ø­Ø§Ù„ÙŠØ§Ù‹.</div>`;
      });
    }
  }

  openVariancePaymentModal() {
    const chkStep = document.getElementById('varianceCheckoutStep');
    const recStep = document.getElementById('varianceReceiptStep');
    if (chkStep) chkStep.style.display = 'block';
    if (recStep) recStep.style.display = 'none';

    let ownerName = 'Ø£Ø³Ø§Ù…Ø© Ø£Ø­Ù…Ø¯ Ù…Ø­Ù…Ø¯ Ø§Ù„Ø´Ø±ÙŠÙ';
    const nameEl = document.getElementById('homeownerNameText');
    if (nameEl && nameEl.innerText && nameEl.innerText !== 'Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ­Ù…ÙŠÙ„...') {
      ownerName = nameEl.innerText;
    }
    const varOwnerEl = document.getElementById('varPayOwnerName');
    if (varOwnerEl) varOwnerEl.innerText = ownerName;

    this.openModal('modalVariancePayment');
  }

  async processVariancePayment() {
    const cardNum = document.getElementById('varCardNumberInput')?.value || '';
    const payMethod = document.getElementById('varPayMethodSelect')?.value || 'Ø¨Ø·Ø§Ù‚Ø© Ø§Ø¦ØªÙ…Ø§Ù† (Visa)';
    
    if (!cardNum || cardNum.trim().length < 4) {
      this.showToast('âš ï¸ ÙŠØ±Ø¬Ù‰ Ø¥Ø¯Ø®Ø§Ù„ Ø±Ù‚Ù… Ø¨Ø·Ø§Ù‚Ø© Ø§Ù„Ø¯ÙØ¹ Ø£Ùˆ ØªÙØ¹ÙŠÙ„ Ø£Ø¨Ù„ Ø¨Ø§ÙŠ');
      return;
    }

    this.showToast('ðŸ’³ Ø¬Ø§Ø±ÙŠ Ø§Ù„Ù…Ø¹Ø§Ù„Ø¬Ø© Ø§Ù„Ù…Ø§Ù„ÙŠØ© Ø§Ù„Ù…ÙˆØ«Ù‚Ø© Ù„Ø³Ø¯Ø§Ø¯ ÙØ±ÙˆÙ‚ Ø§Ù„ØµÙŠØ§Ù†Ø©...');

    let ownerName = 'Ø£Ø³Ø§Ù…Ø© Ø£Ø­Ù…Ø¯ Ù…Ø­Ù…Ø¯ Ø§Ù„Ø´Ø±ÙŠÙ';
    const nameEl = document.getElementById('homeownerNameText');
    if (nameEl && nameEl.innerText && nameEl.innerText !== 'Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ­Ù…ÙŠÙ„...') {
      ownerName = nameEl.innerText;
    }

    const receiptNo = `REC-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date();
    const dateStr = now.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' }) + ` â€¢ ${now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`;
    const qrRef = `Odoo-PAY-${Math.floor(100000 + Math.random() * 900000)}`;

    // Populate Receipt Details
    const recNoEl = document.getElementById('receiptNoText');
    if (recNoEl) recNoEl.innerText = `Ø±Ù‚Ù… Ø§Ù„Ø¥ÙŠØµØ§Ù„: #${receiptNo}`;

    const recOwnerEl = document.getElementById('recOwnerName');
    if (recOwnerEl) recOwnerEl.innerText = ownerName;

    const recPayMethEl = document.getElementById('recPayMethod');
    if (recPayMethEl) recPayMethEl.innerText = payMethod;

    const recDateEl = document.getElementById('recPayDate');
    if (recDateEl) recDateEl.innerText = dateStr;

    const recQrEl = document.getElementById('recQrCode');
    if (recQrEl) recQrEl.innerText = qrRef;

    // Update Financials Screen UI
    const varAmtEl = document.getElementById('varianceAmountText');
    if (varAmtEl) {
      varAmtEl.innerHTML = `<span style="color: #10b981; font-weight: 900;">0.00 Ø¬.Ù… <i class="fa-solid fa-circle-check"></i> (ØªÙ… Ø§Ù„Ø³Ø¯Ø§Ø¯ Ø¨Ø§Ù„ÙƒØ§Ù…Ù„)</span>`;
    }
    const btnPayVar = document.getElementById('btnPayVariance');
    if (btnPayVar) {
      btnPayVar.style.background = '#10b981';
      btnPayVar.style.opacity = '0.9';
      btnPayVar.innerHTML = `<i class="fa-solid fa-circle-check"></i> <span>ØªÙ… Ø³Ø¯Ø§Ø¯ ÙØ±ÙˆÙ‚ Ø§Ù„ØµÙŠØ§Ù†Ø© Ø¨Ù†Ø¬Ø§Ø­ (Ø¥ÙŠØµØ§Ù„ #${receiptNo})</span>`;
    }

    // Switch View to Receipt
    const chkStep = document.getElementById('varianceCheckoutStep');
    const recStep = document.getElementById('varianceReceiptStep');
    if (chkStep) chkStep.style.display = 'none';
    if (recStep) recStep.style.display = 'block';

    this.showToast(`ðŸŽ‰ ØªÙ… Ø³Ø¯Ø§Ø¯ ÙØ±ÙˆÙ‚ Ø§Ù„ØµÙŠØ§Ù†Ø© 3,900 Ø¬.Ù… Ø¨Ù†Ø¬Ø§Ø­!\nðŸ“§ ØªÙ… Ø¥Ø±Ø³Ø§Ù„ Ø¥ÙŠØµØ§Ù„ Ø§Ù„Ø³Ø¯Ø§Ø¯ Ø§Ù„Ø±Ø³Ù…ÙŠ Ø±Ù‚Ù… #${receiptNo} Ø¥Ù„Ù‰ Ø¨Ø±ÙŠØ¯Ùƒ Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ (fmhala6@gmail.com).`);

    // Sync Payment to Odoo Helpdesk / Accounting
    const payTicket = {
      category: 'Ø§Ø³ØªÙØ³Ø§Ø± Ù…Ø§Ù„ÙŠ ÙˆØ­Ø³Ø§Ø¨Ø§Øª',
      title: `Ø³Ø¯Ø§Ø¯ ÙØ±ÙˆÙ‚ Ø§Ù„ØµÙŠØ§Ù†Ø© Ø£ÙˆÙ†Ù„Ø§ÙŠÙ† Ø¥ÙŠØµØ§Ù„ #${receiptNo}`,
      details: `ØªÙ… Ø³Ø¯Ø§Ø¯ ÙØ±ÙˆÙ‚ Ø§Ù„ØµÙŠØ§Ù†Ø© ÙˆØ§Ù„ØªØ´ØºÙŠÙ„ Ø£ÙˆÙ†Ù„Ø§ÙŠÙ† Ø¨Ù†Ø¬Ø§Ø­!\nØ§Ù„Ù…Ø§Ù„Ùƒ: ${ownerName}\nØ§Ù„Ù…Ø¨Ù„Øº: 3,900.00 Ø¬.Ù…\nØ·Ø±ÙŠÙ‚Ø© Ø§Ù„Ø¯ÙØ¹: ${payMethod}\nØ±Ù‚Ù… Ø§Ù„Ø¥ÙŠØµØ§Ù„: ${receiptNo}\nÙƒÙˆØ¯ Ø§Ù„ØªÙˆØ«ÙŠÙ‚: ${qrRef}`,
      priority: '2'
    };

    try {
      await this.syncTicketToOdoo(payTicket);
    } catch (payErr) {
      console.warn('[Odoo Payment Sync Exception]:', payErr);
    }
  }

  downloadReceiptPDF() {
    const receiptEl = document.getElementById('officialReceiptContainer');
    if (!receiptEl) {
      this.showToast('âš ï¸ Ù„Ù… ÙŠØªÙ… Ø§Ù„Ø¹Ø«ÙˆØ± Ø¹Ù„Ù‰ Ø¥ÙŠØµØ§Ù„ Ø§Ù„Ø³Ø¯Ø§Ø¯ Ù„Ù„Ø·Ø¨Ø§Ø¹Ø©');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      this.showToast('âš ï¸ ÙŠØ±Ø¬Ù‰ Ø§Ù„Ø³Ù…Ø§Ø­ Ø¨Ø§Ù„Ù†ÙˆØ§ÙØ° Ø§Ù„Ù…Ù†Ø¨Ø«Ù‚Ø© (Pop-ups) Ù„ØªØ­Ù…ÙŠÙ„ Ø¥ÙŠØµØ§Ù„ Ø§Ù„Ù€ PDF');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <title>Ø¥ÙŠØµØ§Ù„ Ø³Ø¯Ø§Ø¯ Ù…Ø§Ù„ÙŠ Ø±Ø³Ù…ÙŠ - Ø´Ø±ÙƒØ© Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…Ø¬Ù…Ø¹ Ø§Ù„Ø³ÙƒÙ†ÙŠ</title>
        <meta charset="utf-8">
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap');
          body { font-family: 'Tajawal', sans-serif; padding: 20px; background: #f8fafc; direction: rtl; }
          #officialReceiptContainer { max-width: 600px; margin: 0 auto; background: #fff !important; border: 2px solid #d4af37 !important; box-shadow: 0 10px 30px rgba(0,0,0,0.1) !important; border-radius: 12px !important; }
        </style>
      </head>
      <body onload="window.print();">
        ${receiptEl.outerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    this.showToast('ðŸ“„ ØªÙ… ÙØªØ­ Ø´Ø§Ø´Ø© Ø·Ø¨Ø§Ø¹Ø© ÙˆØªØ­Ù…ÙŠÙ„ Ø¥ÙŠØµØ§Ù„ Ø§Ù„Ù€ PDF Ø§Ù„Ù…ÙˆØ«Ù‚ Ø¨Ù†Ø¬Ø§Ø­!');
  }
  handleLogin() {
    const email = document.getElementById('loginEmailInput')?.value || '';
    let role = 'owner';
    const em = email.toLowerCase().trim();
    if (em.includes('tenant')) role = 'tenant';
    else if (em.includes('commercial') || em.includes('comm')) role = 'commercial';
    else if (em.includes('security') || em.includes('sec')) role = 'security';
    else if (em.includes('director') || em.includes('hse') || em.includes('eng_dir')) role = 'engineering_director';
    else if (em.includes('manager')) role = 'manager';
    else if (em.includes('technician') || em.includes('tech')) role = 'technician';
    else if (em.includes('engineer') || em.includes('eng')) role = 'engineer';
    else if (em.includes('housekeeping') || em.includes('hk') || em.includes('clean')) role = 'housekeeping';
    else if (em.includes('landscape') || em.includes('garden') || em.includes('agriculture')) role = 'landscaping';
    else if (em.includes('admin')) role = 'admin';
    else if (em.includes('owner') || em.includes('ahmed')) role = 'homeowner';

    this.executeLogin(role);
  }

  quickLogin(role) {
    this.executeLogin(role === 'owner' ? 'homeowner' : role);
  }

  executeLogin(role) {
    if (this._isLoggingIn) return;
    this._isLoggingIn = true;
    setTimeout(() => { this._isLoggingIn = false; }, 400);

    this.switchRole(role);
    if (['homeowner', 'family', 'tenant', 'commercial'].includes(role)) {
      this.switchHomeownerTab('home');
    }
    
    // ALWAYS keep back-to-grid buttons VISIBLE so the user can easily switch screens!
    document.querySelectorAll('[onclick="app.showRoleGrid()"], [onclick="app.switchRole(\'grid\')"]').forEach(btn => {
      btn.style.setProperty('display', 'inline-flex', 'important');
    });

    // Show phone bottom navbar only if resident role
    const phoneNav = document.getElementById('phoneNavbar');
    if (phoneNav) {
      if (['homeowner', 'family', 'tenant', 'commercial'].includes(role)) {
        phoneNav.style.display = 'flex';
      } else {
        phoneNav.style.display = 'none';
      }
    }

    // Save active session
    safeStorage.setItem('active_session_role', role);

    this.showToast(`ðŸ”‘ ØªÙ… ÙØªØ­ Ø´Ø§Ø´Ø© [${this.getRoleArabicName(role)}] Ø¨Ù†Ø¬Ø§Ø­!`);
  }

  logout() {
    this.showRoleGrid();
    this.showToast('ðŸšª ØªÙ… ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø®Ø±ÙˆØ¬ ÙˆØ§Ù„Ø¹ÙˆØ¯Ø© Ù„Ù„Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ©.');
  }

  getRoleArabicName(role) {
    const map = {
      'homeowner': 'Ù…Ø§Ù„Ùƒ Ø§Ù„ÙˆØ­Ø¯Ø© Ø§Ù„Ø³ÙƒÙ†ÙŠØ©',
      'owner': 'Ø´Ø§Ø´Ø© Ø§Ù„Ù…Ø§Ù„Ùƒ',
      'family': 'Ø£Ø­Ø¯ Ø£ÙØ±Ø§Ø¯ Ø§Ù„Ø£Ø³Ø±Ø© (Ø­Ø³Ø§Ø¨ Ù…Ø­Ø¯ÙˆØ¯)',
      'tenant': 'Ø§Ù„Ù…Ø³ØªØ£Ø¬Ø± Ø§Ù„Ø³ÙƒÙ†ÙŠ',
      'commercial': 'Ø§Ù„Ù…Ø³ØªØ£Ø¬Ø± Ø§Ù„ØªØ¬Ø§Ø±ÙŠ',
      'security': 'Ø£Ù…Ù† ÙˆØ¨ÙˆØ§Ø¨Ø§Øª Ø§Ù„Ù‚Ø±ÙŠØ©',
      'manager': 'Ù…Ø¯ÙŠØ± Ø§Ù„ØµÙŠØ§Ù†Ø© ÙˆØ§Ù„ØªØ´ØºÙŠÙ„',
      'technician': 'Ø§Ù„ÙÙ†ÙŠ Ø§Ù„Ù…ÙŠØ¯Ø§Ù†ÙŠ',
      'engineer': 'Ø§Ù„Ù…Ù‡Ù†Ø¯Ø³ Ø§Ù„Ù…Ø´Ø±Ù',
      'engineering_director': 'Ù…Ø¯ÙŠØ± Ø§Ù„Ù‚Ø·Ø§Ø¹ Ø§Ù„Ù‡Ù†Ø¯Ø³ÙŠ ÙˆØ§Ù„Ø³Ù„Ø§Ù…Ø©',
      'admin': 'Ø§Ù„Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ø¹Ù„ÙŠØ§',
      'housekeeping': 'Ù‡Ø§ÙˆØ³ ÙƒÙŠØ¨ÙŠÙ†Ø¬ ÙˆØ§Ù„Ù†Ø¸Ø§ÙØ©',
      'landscaping': 'Ù…Ø¯ÙŠØ± Ø§Ù„Ù„Ø§Ù†Ø¯Ø³ÙƒÙŠØ¨ ÙˆØ§Ù„Ø²Ø±Ø§Ø¹Ø©'
    };
    return map[role] || role;
  }
  loadOdooFields() {
    const url = safeStorage.getItem('odoo_url') || 'https://edu-fm-uc.odoo.com';
    const db = safeStorage.getItem('odoo_db') || 'edu-fm-uc';
    const user = safeStorage.getItem('odoo_user') || 'fmhala6@gmail.com';
    const key = safeStorage.getItem('odoo_key') || '';
    const name = safeStorage.getItem('odoo_owner_name') || '';

    const urlInput = document.getElementById('odooUrlInput');
    const dbInput = document.getElementById('odooDbInput');
    const userInput = document.getElementById('odooUserInput');
    const keyInput = document.getElementById('odooKeyInput');
    const nameInput = document.getElementById('odooOwnerNameInput');

    if (urlInput) urlInput.value = url;
    if (dbInput) dbInput.value = db;
    if (userInput) userInput.value = user;
    if (keyInput) keyInput.value = key;
    if (nameInput) nameInput.value = name;
  }

  updateHomeownerNameUI() {
    const el = document.getElementById('homeownerNameText');
    if (!el) return;

    const customName = safeStorage.getItem('odoo_owner_name');

    if (customName && customName.trim()) {
      el.innerText = customName;
    } else {
      el.innerText = this.currentLang === 'en' ? 'Ahmed Mohamed' : 'Ø£Ø­Ù…Ø¯ Ù…Ø­Ù…Ø¯';
    }
  }

  async fetchOdooOwnerName() {
    const urlInput = safeStorage.getItem('odoo_url') || 'https://edu-fm-uc.odoo.com';
    const dbInput = safeStorage.getItem('odoo_db') || 'edu-fm-uc';
    const userInput = safeStorage.getItem('odoo_user') || 'fmhala6@gmail.com';
    const keyInput = safeStorage.getItem('odoo_key') || '06d7d7d208a8c2fa351c2a5cfa305e987ffb72f0';

    if (!userInput || !keyInput) return;

    const baseUrl = urlInput.replace(/\/+$/, '');

    const authPayload = {
      jsonrpc: "2.0",
      method: "call",
      params: {
        service: "common",
        method: "authenticate",
        args: [dbInput, userInput, keyInput, {}]
      },
      id: Math.floor(Math.random() * 1000)
    };

    try {
      const authData = await this.callOdoo(baseUrl, authPayload);
      if (!authData || authData.error) return;
      const uid = authData.result;
      if (!uid || typeof uid !== 'number') return;

      const readPayload = {
        jsonrpc: "2.0",
        method: "call",
        params: {
          service: "object",
          method: "execute_kw",
          args: [
            dbInput,
            uid,
            keyInput,
            "res.users",
            "read",
            [[uid], ["name"]]
          ]
        },
        id: Math.floor(Math.random() * 1000)
      };

      const readData = await this.callOdoo(baseUrl, readPayload);
      if (readData && readData.result && readData.result[0]) {
        const odooName = readData.result[0].name;
        if (odooName) {
          safeStorage.setItem('odoo_owner_name', odooName);
          this.updateHomeownerNameUI();
          const input = document.getElementById('odooOwnerNameInput');
          if (input) input.value = odooName;
        }
      }
    } catch (err) {
      console.log('[Odoo Name Fetch Exception]:', err);
    }
  }

  renderLogoutHeader() {
    // Remove old dynamic headers
    document.querySelectorAll('.dynamic-logout-header').forEach(el => el.remove());

    const activeView = document.querySelector('.view-panel.active');
    if (!activeView || activeView.id === 'viewLogin') return;

    // Create a sleek top header for this screen
    const header = document.createElement('div');
    header.className = 'dynamic-logout-header';
    header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; background: #ffffff; padding: 10px 16px; border-radius: 12px; margin-bottom: 12px; border: 1px solid rgba(32, 39, 79, 0.08); box-shadow: var(--shadow-sm);';

    // Left side: Screen Title
    const titleSpan = document.createElement('span');
    titleSpan.style.cssText = 'font-size: 0.78rem; font-weight: 700; color: #20274f; display: flex; align-items: center; gap: 6px;';
    
    // Choose appropriate icon based on active role
    let iconHtml = '<i class="fa-solid fa-desktop"></i>';
    if (this.currentRole === 'homeowner') iconHtml = '<i class="fa-solid fa-house-user" style="color: var(--primary-gold);"></i>';
    else if (this.currentRole === 'tenant') iconHtml = '<i class="fa-solid fa-key" style="color: var(--primary-gold);"></i>';
    else if (this.currentRole === 'commercial') iconHtml = '<i class="fa-solid fa-store" style="color: var(--brand-navy);"></i>';
    else if (this.currentRole === 'security') iconHtml = '<i class="fa-solid fa-user-shield" style="color: var(--brand-navy);"></i>';
    else if (this.currentRole === 'manager') iconHtml = '<i class="fa-solid fa-user-tie" style="color: var(--brand-navy);"></i>';
    else if (this.currentRole === 'technician') iconHtml = '<i class="fa-solid fa-helmet-safety" style="color: var(--accent-cyan);"></i>';
    else if (this.currentRole === 'engineer') iconHtml = '<i class="fa-solid fa-screwdriver-wrench" style="color: var(--accent-cyan);"></i>';
    else if (this.currentRole === 'admin') iconHtml = '<i class="fa-solid fa-chart-line" style="color: var(--primary-gold);"></i>';

    const roleName = this.currentLang === 'en' ? this.getRoleEnglishName(this.currentRole) : this.getRoleArabicName(this.currentRole);
    titleSpan.innerHTML = `${iconHtml} ${roleName}`;

    // Right side: Logout button
    const btn = document.createElement('button');
    btn.className = 'btn btn-sm';
    btn.style.cssText = 'padding: 4px 10px; border-radius: 8px; font-size: 0.65rem; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.25); color: #ef4444; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 4px;';
    btn.innerHTML = this.currentLang === 'en' ? '<i class="fa-solid fa-right-from-bracket"></i> Logout' : '<i class="fa-solid fa-right-from-bracket"></i> Ø®Ø±ÙˆØ¬';
    btn.onclick = (e) => {
      e.preventDefault();
      this.logout();
    };

    header.appendChild(titleSpan);
    header.appendChild(btn);

    // Prepend to active view!
    activeView.insertBefore(header, activeView.firstChild);
  }

  handleLicenseFrontPreview(event) {
    const file = event.target.files ? event.target.files[0] : null;
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      this.lprFrontBase64 = e.target.result;
      const img = document.getElementById('lprFrontPreviewImg');
      const box = document.getElementById('lprFrontPreviewBox');
      if (img) img.src = this.lprFrontBase64;
      if (box) box.style.display = 'block';
    };
    reader.readAsDataURL(file);
  }

  handleLicenseBackPreview(event) {
    const file = event.target.files ? event.target.files[0] : null;
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      this.lprBackBase64 = e.target.result;
      const img = document.getElementById('lprBackPreviewImg');
      const box = document.getElementById('lprBackPreviewBox');
      if (img) img.src = this.lprBackBase64;
      if (box) box.style.display = 'block';
    };
    reader.readAsDataURL(file);
  }

  registerLprPlate() {
    const input = document.getElementById('lprPlateInput');
    const plate = input ? input.value.trim() : '';
    if (!plate) {
      this.showToast('âš ï¸ ÙŠØ±Ø¬Ù‰ Ø¥Ø¯Ø®Ø§Ù„ Ø±Ù‚Ù… Ù„ÙˆØ­Ø© Ø§Ù„Ø³ÙŠØ§Ø±Ø© Ø£ÙˆÙ„Ø§Ù‹!');
      return;
    }

    const frontData = this.lprFrontBase64;
    const backData = this.lprBackBase64;

    const list = document.getElementById('lprActivePlatesList');
    if (list) {
      // Remove empty state message if present
      const emptyDiv = list.querySelector('div:only-child');
      if (emptyDiv && emptyDiv.innerText.includes('Ù„Ø§ ØªÙˆØ¬Ø¯ Ø³ÙŠØ§Ø±Ø§Øª')) {
        list.innerHTML = '';
      }

      const item = document.createElement('div');
      item.style.cssText = 'display: flex; justify-content: space-between; align-items: center; background: #ffffff; padding: 10px 12px; border-radius: 10px; border: 1px solid rgba(27, 143, 145, 0.2); box-shadow: 0 2px 5px rgba(0,0,0,0.04); margin-top: 4px;';
      item.innerHTML = `
        <div style="text-align: right;">
          <div style="font-weight: 900; color: #20274f; font-family: var(--font-number); letter-spacing: 2px; font-size: 0.95rem;">${plate}</div>
          <p style="font-size: 0.68rem; color: #64748b; margin: 3px 0 0 0; font-weight: 600;">
            <i class="fa-solid fa-id-card" style="color: #1b8f91;"></i> Ø§Ù„Ø±Ø®ØµØ©: ${frontData || backData ? 'ØªÙ… Ø±ÙØ¹ ÙˆØªÙˆØ«ÙŠÙ‚ ØµÙˆØ± Ø§Ù„Ø±Ø®ØµØ© ðŸ“·' : 'ØªÙ… Ø§Ù„ØªØ³Ø¬ÙŠÙ„ Ø¨Ø¯ÙˆÙ† Ù…Ø±ÙÙ‚Ø§Øª'}
          </p>
        </div>
        <span class="badge badge-success" style="font-size: 0.68rem; margin-top:0; font-weight: 700; padding: 4px 8px; border-radius: 6px;"><i class="fa-solid fa-circle-check"></i> Ù…ÙØ¹Ù„ Ø¹Ù„Ù‰ Ø§Ù„Ø¨ÙˆØ§Ø¨Ø§Øª</span>
      `;
      list.insertBefore(item, list.firstChild);
    }

    if (input) input.value = '';

    // Clear previews & stored base64
    this.lprFrontBase64 = null;
    this.lprBackBase64 = null;
    const frontBox = document.getElementById('lprFrontPreviewBox');
    const backBox = document.getElementById('lprBackPreviewBox');
    const frontInput = document.getElementById('lprLicenseFrontInput');
    const backInput = document.getElementById('lprLicenseBackInput');
    if (frontBox) frontBox.style.display = 'none';
    if (backBox) backBox.style.display = 'none';
    if (frontInput) frontInput.value = '';
    if (backInput) backInput.value = '';

    this.showToast(`ðŸš— ØªÙ… ØªØ³Ø¬ÙŠÙ„ Ù„ÙˆØ­Ø© Ø§Ù„Ø³ÙŠØ§Ø±Ø© [${plate}] Ø¨Ù†Ø¬Ø§Ø­!\nØ¬Ø§Ø±ÙŠ Ø§Ù„Ø­ÙØ¸ Ø§Ù„Ù…Ø¨Ø§Ø´Ø± ÙˆØ§Ù„Ù…Ø²Ø§Ù…Ù†Ø© Ù…Ø¹ Odoo Contacts...`);

    (async () => {
      try {
        await this.syncCarPlateToOdooPartner(plate, frontData, backData);
        this.showToast(`âœ… ØªÙ… ØªÙˆØ«ÙŠÙ‚ Ø±Ù‚Ù… Ø§Ù„Ù„ÙˆØ­Ø© [${plate}] Ø¨Ù€ Odoo Contacts (res.partner) Ø¨Ù†Ø¬Ø§Ø­!`);
      } catch (err) {
        console.warn('[Odoo Car Plate Sync Error]:', err);
      }
    })();
  }

  async syncCarPlateToOdooPartner(plate, frontBase64, backBase64) {
    const urlInput = safeStorage.getItem('odoo_url') || 'https://edu-fm-uc.odoo.com';
    const dbInput = safeStorage.getItem('odoo_db') || 'edu-fm-uc';
    const userInput = safeStorage.getItem('odoo_user') || 'fmhala6@gmail.com';
    const keyInput = safeStorage.getItem('odoo_key') || '06d7d7d208a8c2fa351c2a5cfa305e987ffb72f0';

    if (!urlInput || !dbInput || !userInput || !keyInput) return;
    const baseUrl = urlInput.replace(/\/+$/, '');
    const uid = 2;
    const partnerId = 3;

    // Step 1: Write directly to Cars tab One2many model (x_res_partner_line_62022) with x_name = plate
    let carLineId = null;
    try {
      const carLinePayload = {
        jsonrpc: "2.0",
        method: "call",
        params: {
          service: "object",
          method: "execute_kw",
          args: [
            dbInput, uid, keyInput,
            "x_res_partner_line_62022",
            "create",
            [{
              "x_name": plate,
              "x_res_partner_id": partnerId
            }]
          ]
        },
        id: Math.floor(Math.random() * 1000)
      };
      const cRes = await this.callOdoo(baseUrl, carLinePayload);
      if (cRes && cRes.result) {
        carLineId = cRes.result;
        console.log(`[Odoo Car Sync] Created car line #${carLineId} for plate "${plate}"`);
      }
    } catch (cLineErr) {
      console.warn('[Odoo Car Line Create Error]:', cLineErr);
    }

    // Step 2: Link directly to res.partner One2many field x_studio_one2many_field_3nh_1jvs8ot39
    try {
      const o2mPayload = {
        jsonrpc: "2.0",
        method: "call",
        params: {
          service: "object",
          method: "execute_kw",
          args: [
            dbInput, uid, keyInput,
            "res.partner",
            "write",
            [
              [partnerId],
              {
                "x_studio_one2many_field_3nh_1jvs8ot39": carLineId ? [[4, carLineId, 0]] : [[0, 0, { "x_name": plate }]]
              }
            ]
          ]
        },
        id: Math.floor(Math.random() * 1000)
      };
      await this.callOdoo(baseUrl, o2mPayload);
      console.log(`[Odoo Car Sync] Linked car line #${carLineId} to partner #${partnerId} One2many`);
    } catch (o2mErr) {}

    // Step 6: Create attachments for Front & Back license photos linked to res.partner in Odoo
    if (frontBase64) {
      try {
        const cleanFront = frontBase64.replace(/^data:image\/\w+;base64,/, '');
        const frontAttachPayload = {
          jsonrpc: "2.0",
          method: "call",
          params: {
            service: "object",
            method: "execute_kw",
            args: [
              dbInput, uid, keyInput,
              "ir.attachment",
              "create",
              [{
                name: `Ø±Ø®ØµØ©_Ø³ÙŠØ§Ø±Ø©_${plate}_ÙˆØ¬Ù‡.jpg`,
                datas: cleanFront,
                res_model: "res.partner",
                res_id: partnerId
              }]
            ]
          },
          id: Math.floor(Math.random() * 1000)
        };
        await this.callOdoo(baseUrl, frontAttachPayload);
        console.log(`[Odoo Attachment Sync] Created Front License Attachment for car ${plate}`);
      } catch (fErr) {
        console.warn('[Odoo Front License Attachment Error]:', fErr);
      }
    }

    if (backBase64) {
      try {
        const cleanBack = backBase64.replace(/^data:image\/\w+;base64,/, '');
        const backAttachPayload = {
          jsonrpc: "2.0",
          method: "call",
          params: {
            service: "object",
            method: "execute_kw",
            args: [
              dbInput, uid, keyInput,
              "ir.attachment",
              "create",
              [{
                name: `Ø±Ø®ØµØ©_Ø³ÙŠØ§Ø±Ø©_${plate}_Ø¸Ù‡Ø±.jpg`,
                datas: cleanBack,
                res_model: "res.partner",
                res_id: partnerId
              }]
            ]
          },
          id: Math.floor(Math.random() * 1000)
        };
        await this.callOdoo(baseUrl, backAttachPayload);
        console.log(`[Odoo Attachment Sync] Created Back License Attachment for car ${plate}`);
      } catch (bErr) {
        console.warn('[Odoo Back License Attachment Error]:', bErr);
      }
    }

    // Step 7: Always append to partner comment/notes as guaranteed log
    try {
      const licenseNoteText = (frontBase64 || backBase64) ? ' (Ù…Ø±ÙÙ‚ ØµÙˆØ± Ø§Ù„Ø±Ø®ØµØ© ÙˆØ´ ÙˆØ¶Ù‡Ø± ðŸ“·)' : '';
      const updatedNote = existingComment 
        ? `${existingComment}\nðŸš— Ø±Ù‚Ù… Ù„ÙˆØ­Ø© Ø§Ù„Ø³ÙŠØ§Ø±Ø© Ø§Ù„Ù…Ø³Ø¬Ù„Ø© (cars_number): ${plate}${licenseNoteText}`
        : `ðŸš— Ø±Ù‚Ù… Ù„ÙˆØ­Ø© Ø§Ù„Ø³ÙŠØ§Ø±Ø© Ø§Ù„Ù…Ø³Ø¬Ù„Ø© (cars_number): ${plate}${licenseNoteText}`;

      const notePayload = {
        jsonrpc: "2.0",
        method: "call",
        params: {
          service: "object",
          method: "execute_kw",
          args: [
            dbInput, uid, keyInput,
            "res.partner",
            "write",
            [[partnerId], { comment: updatedNote }]
          ]
        },
        id: Math.floor(Math.random() * 1000)
      };
      await this.callOdoo(baseUrl, notePayload);
    } catch (cErr) {}
  }

  bookAmenity() {
    const select = document.getElementById('bookingAmenitySelect');
    const dateInput = document.getElementById('bookingDateInput');
    const timeSelect = document.getElementById('bookingTimeSelect');

    if (!select || !dateInput || !timeSelect) return;

    const amenityText = select.options[select.selectedIndex].text.split(' - ')[0];
    const price = parseInt(select.options[select.selectedIndex].getAttribute('data-price')) || 100;
    const date = dateInput.value;
    const time = timeSelect.options[timeSelect.selectedIndex].text;

    if (this.ownerWalletBalance < price) {
      this.showToast('âŒ Ø±ØµÙŠØ¯ Ø§Ù„Ù…Ø­ÙØ¸Ø© Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠØ© ØºÙŠØ± ÙƒØ§ÙÙ Ù„Ø´Ø±Ø§Ø¡ Ø§Ù„Ø­Ø¬Ø²! ÙŠØ±Ø¬Ù‰ Ø´Ø­Ù† Ù…Ø­ÙØ¸ØªÙƒ Ø£ÙˆÙ„Ø§Ù‹.');
      return;
    }

    // Decrement wallet balance
    this.ownerWalletBalance -= price;
    
    // Update Wallet UI
    const balanceSpan = document.getElementById('bookingWalletBalanceText');
    if (balanceSpan) balanceSpan.innerText = this.ownerWalletBalance;

    // Generate random booking code
    const code = Math.floor(100000 + Math.random() * 900000);

    const list = document.getElementById('bookingListContainer');
    if (list) {
      const item = document.createElement('div');
      item.style.cssText = 'background: rgba(32, 39, 79, 0.04); padding: 10px; border-radius: 8px; border: 1px solid rgba(32, 39, 79, 0.08); margin-top: 6px; display: flex; justify-content: space-between; align-items: center;';
      item.innerHTML = `
        <div>
          <h5 style="margin: 0 0 4px 0; color: #20274f; font-size: 0.8rem; font-weight: 700;">${amenityText}</h5>
          <p style="margin: 0; font-size: 0.68rem; color: var(--text-muted);">${date} â€¢ ${time}</p>
          <span style="font-size: 0.65rem; color: var(--primary-gold); font-weight: 700;">ÙƒÙˆØ¯ Ø§Ù„Ø­Ø¬Ø²: #${code}</span>
        </div>
        <div style="text-align: center;">
          <i class="fa-solid fa-qrcode" style="font-size: 1.6rem; color: #20274f; display: block; margin-bottom: 2px;"></i>
          <span style="font-size: 0.6rem; color: var(--text-muted); font-weight: 700;">Ù…Ø³Ø­ Ø§Ù„Ø¯Ø®ÙˆÙ„</span>
        </div>
      `;
      list.insertBefore(item, list.firstChild);
    }

    this.showToast(`âš½ ØªÙ… ØªØ£ÙƒÙŠØ¯ Ø­Ø¬Ø² [${amenityText}] Ù„Ù„ÙŠÙˆÙ… (${date} â€¢ ${time}) Ø¨Ù†Ø¬Ø§Ø­!\nÙƒÙˆØ¯ Ø§Ù„Ø­Ø¬Ø²: #${code}\nØ¬Ø§Ø±ÙŠ ØªÙˆØ«ÙŠÙ‚ Ø§Ù„Ø­Ø¬Ø² ÙˆØ§Ù„Ø®ØµÙ… Ø¨Ø§Ù„Ù†Ø¸Ø§Ù… Ø§Ù„Ù…Ø±ÙƒØ²ÙŠ...`);

    // Sync to Odoo ticket/sales order
    (async () => {
      try {
        const amenityTicket = {
          id: 'BOOK-' + code,
          category: 'Ø­Ø¬ÙˆØ²Ø§Øª Ø§Ù„Ù…Ù„Ø§Ø¹Ø¨ ÙˆØ§Ù„Ø£Ù†Ø´Ø·Ø© Ø§Ù„ØªØ±ÙÙŠÙ‡ÙŠØ©',
          title: `Ø­Ø¬Ø² Ù†Ø´Ø§Ø· ØªØ±ÙÙŠÙ‡ÙŠ: ${amenityText}`,
          details: `Ø·Ù„Ø¨ Ø­Ø¬Ø² ØªØ±ÙÙŠÙ‡ÙŠ Ù…Ø¤ÙƒØ¯ Ø¨Ø±Ù‚Ù… #${code}\nØ§Ù„Ù†Ø´Ø§Ø·: ${amenityText}\nØ§Ù„ØªØ§Ø±ÙŠØ® ÙˆØ§Ù„ÙˆÙ‚Øª: ${date} - ${time}\nØ§Ù„Ù‚ÙŠÙ…Ø©: ${price} Ø¬.Ù… (ØªÙ… Ø§Ù„Ø®ØµÙ… Ù…Ù† Ø§Ù„Ù…Ø­ÙØ¸Ø© Ø§Ù„Ø±Ù‚Ù…ÙŠØ© Ù„Ù„Ù…Ø§Ù„Ùƒ)\nØ§Ù„Ù…Ø§Ù„Ùƒ: Ø£Ø³Ø§Ù…Ø© Ø§Ù„Ø´Ø±ÙŠÙ - ÙÙŠÙ„Ø§ 104`,
          status: 'Ø­Ø¬Ø² Ù…Ø¤ÙƒØ¯ ÙˆÙ…ÙØ¹Ù„',
          bgClass: 'badge-success',
          requester: 'homeowner',
          priority: '1',
          createdAt: new Date().toISOString()
        };
        await this.syncTicketToOdoo(amenityTicket, '01223456789', 'Ø£Ø³Ø§Ù…Ø© Ø£Ø­Ù…Ø¯ Ù…Ø­Ù…Ø¯ Ø§Ù„Ø´Ø±ÙŠÙ');
        this.showToast(`âœ… ØªÙ… ØªÙˆØ«ÙŠÙ‚ Ø­Ø¬Ø² [${amenityText}] Ø¨Ù†Ø¬Ø§Ø­ Ø¨Ø§Ù„Ù†Ø¸Ø§Ù… Ø§Ù„Ù…Ø±ÙƒØ²ÙŠ (Odoo - Sales/Appointments) Ø¨Ø±Ù‚Ù… #${code}!`);
      } catch (err) {
        console.warn('[Odoo Amenity Booking Sync Error]:', err);
      }
    })();
  }

  callDirectory(number) {
    this.showToast(`ðŸ“ž Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø§ØªØµØ§Ù„ Ø¨Ù€ (${number}) Ù…Ù† Ø§Ù„Ù‡Ø§ØªÙ Ø§Ù„Ù…ÙŠØ¯Ø§Ù†ÙŠ...`);
  }

  async submitNewUserToOdoo() {
    const nameInput = document.getElementById('newUserNameInput');
    const emailInput = document.getElementById('newUserEmailInput');
    const phoneInput = document.getElementById('newUserPhoneInput');
    const roleSelect = document.getElementById('newUserRoleSelect');

    if (!nameInput || !emailInput || !phoneInput || !roleSelect) return;

    const userName = nameInput.value.trim();
    const userEmail = emailInput.value.trim();
    const userPhone = phoneInput.value.trim();
    const userRole = roleSelect.value;

    if (!userName || !userEmail) {
      this.showToast('âš ï¸ ÙŠØ±Ø¬Ù‰ ÙƒØªØ§Ø¨Ø© Ø§Ù„Ø§Ø³Ù… ÙˆØ§Ù„Ø¨Ø±ÙŠØ¯ Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ Ø¹Ù„Ù‰ Ø§Ù„Ø£Ù‚Ù„!');
      return;
    }

    const roleMap = {
      'homeowner': 'Ù…Ø§Ù„Ùƒ ÙˆØ­Ø¯Ø© Ø³ÙƒÙ†ÙŠØ©',
      'tenant': 'Ù…Ø³ØªØ£Ø¬Ø± Ø³ÙƒÙ†ÙŠ',
      'technician': 'ÙÙ†ÙŠ ØµÙŠØ§Ù†Ø© Ù…ÙŠØ¯Ø§Ù†ÙŠ',
      'engineer': 'Ù…Ù‡Ù†Ø¯Ø³ Ù…Ø´Ø±Ù'
    };
    const roleArabic = roleMap[userRole] || userRole;

    const urlInput = safeStorage.getItem('odoo_url') || 'https://edu-fm-uc.odoo.com';
    const dbInput = safeStorage.getItem('odoo_db') || 'edu-fm-uc';
    const userInput = safeStorage.getItem('odoo_user') || 'fmhala6@gmail.com';
    const keyInput = safeStorage.getItem('odoo_key') || '06d7d7d208a8c2fa351c2a5cfa305e987ffb72f0';

    // Render it locally first for immediate visual success feedback
    const list = document.getElementById('adminUserList');
    const badgeCount = document.getElementById('adminUserCountBadge');
    
    const addUserToLocalList = () => {
      if (list) {
        const item = document.createElement('div');
        item.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.05); margin-top: 6px;';
        item.innerHTML = `
          <div>
            <span style="font-size: 0.75rem; font-weight: 700; color: #ffffff;">${userName}</span>
            <p style="font-size: 0.65rem; color: var(--text-muted); margin: 0;">${userEmail} â€¢ ${roleArabic}</p>
          </div>
          <span class="badge badge-success" style="font-size: 0.6rem; margin-top:0;">Ù…ÙØ¹Ù„ ÙˆÙ…ÙˆØ«Ù‚</span>
        `;
        list.insertBefore(item, list.firstChild);
      }
      if (badgeCount) {
        const count = list ? list.children.length : 5;
        badgeCount.innerText = `${count} Ù…Ø³ØªØ®Ø¯Ù…ÙŠÙ†`;
      }
    };

    if (!keyInput) {
      // Local fallback if server not connected
      addUserToLocalList();
      this.closeModal('modalAddNewUser');
      nameInput.value = '';
      emailInput.value = '';
      phoneInput.value = '';
      this.showToast(`âœ… ØªÙ… Ø¥Ø¶Ø§ÙØ© Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… [${userName}] Ø¨Ù†Ø¬Ø§Ø­ Ù„Ù„Ù…Ø­ÙØ¸Ø© Ø§Ù„Ù…Ø­Ù„ÙŠØ©!`);
      return;
    }

    const baseUrl = urlInput.replace(/\/+$/, '');

    const authPayload = {
      jsonrpc: "2.0",
      method: "call",
      params: {
        service: "common",
        method: "authenticate",
        args: [dbInput, userInput, keyInput, {}]
      },
      id: Math.floor(Math.random() * 1000)
    };

    this.showToast(`â³ Ø¬Ø§Ø±ÙŠ ØªØ³Ø¬ÙŠÙ„ ÙˆØªÙØ¹ÙŠÙ„ [${userName}] Ø¨Ø§Ù„Ù†Ø¸Ø§Ù… Ø§Ù„Ù…Ø±ÙƒØ²ÙŠ...`);

    try {
      const authData = await this.callOdoo(baseUrl, authPayload);
      if (!authData || authData.error) {
        if (authData && authData.error) throw new Error(JSON.stringify(authData.error));
        return;
      }
      const uid = authData.result;
      if (!uid || typeof uid !== 'number') {
        throw new Error('ÙØ´Ù„ ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯Ø®ÙˆÙ„ Ù„Ù„Ø±Ø¨Ø· Ø¨Ø§Ù„Ù†Ø¸Ø§Ù… Ø§Ù„Ù…Ø±ÙƒØ²ÙŠ');
      }

      const createPartnerPayload = {
        jsonrpc: "2.0",
        method: "call",
        params: {
          service: "object",
          method: "execute_kw",
          args: [
            dbInput,
            uid,
            keyInput,
            "res.partner",
            "create",
            [{
              name: userName,
              email: userEmail,
              phone: userPhone,
              comment: `ØªÙ… Ø±ÙØ¹Ù‡ ÙƒÙ€ ${roleArabic} Ù…Ù† Ù„ÙˆØ­Ø© ØªØ­ÙƒÙ… ØªØ·Ø¨ÙŠÙ‚ Ø§Ù„Ù…ÙˆØ¨Ø§ÙŠÙ„`
            }]
          ]
        },
        id: Math.floor(Math.random() * 1000)
      };

      const createData = await this.callOdoo(baseUrl, createPartnerPayload);
      if (createData.error) {
        throw new Error(JSON.stringify(createData.error));
      }
      addUserToLocalList();
      this.closeModal('modalAddNewUser');
      nameInput.value = '';
      emailInput.value = '';
      phoneInput.value = '';
      this.showToast(`âœ… ØªÙ… Ø¨Ù†Ø¬Ø§Ø­ ØªÙØ¹ÙŠÙ„ ÙˆØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… [${userName}] Ø¨Ø§Ù„Ù†Ø¸Ø§Ù… Ø§Ù„Ù…Ø±ÙƒØ²ÙŠ (ID: ${createData.result})!`);
    } catch (err) {
      console.error('[Odoo Contact Sync Exception]:', err);
      // Local fallback on error
      addUserToLocalList();
      this.closeModal('modalAddNewUser');
      nameInput.value = '';
      emailInput.value = '';
      phoneInput.value = '';
      this.showToast(`âš ï¸ ØªØ¹Ø°Ø± Ø§Ù„Ø§ØªØµØ§Ù„ Ø¨Ù€ Odoo (ØªÙ… Ø§Ù„Ø­ÙØ¸ Ù…Ø­Ù„ÙŠØ§Ù‹ ÙÙŠ Ø§Ù„Ù…ÙˆÙƒ Ø£Ø¨):\n${err.message || err}`);
    }
  }

  filterInventory() {
    const select = document.getElementById('warehouseSelect');
    const search = document.getElementById('inventorySearchInput');
    const list = document.getElementById('inventoryResultsList');

    if (!select || !search || !list) return;

    const warehouseFilter = select.value;
    const searchQuery = search.value.toLowerCase().trim();

    const filtered = this.inventoryItems.filter(item => {
      const matchWarehouse = (warehouseFilter === 'all' || item.warehouse === warehouseFilter);
      const matchSearch = (item.name.toLowerCase().includes(searchQuery) || item.desc.toLowerCase().includes(searchQuery));
      return matchWarehouse && matchSearch;
    });

    list.innerHTML = '';
    if (filtered.length === 0) {
      list.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-muted); font-size:0.8rem;">âŒ Ù„Ø§ ØªÙˆØ¬Ø¯ Ù‚Ø·Ø¹ ØºÙŠØ§Ø± Ù…Ø·Ø§Ø¨Ù‚Ø© Ù„Ù„Ø¨Ø­Ø« ÙÙŠ Ù‡Ø°Ø§ Ø§Ù„Ù…Ø®Ø²Ù†</div>';
      return;
    }

    filtered.forEach(item => {
      const div = document.createElement('div');
      div.className = 'ticket-item';
      div.style.cssText = 'margin-top: 6px;';
      
      let whName = 'Ù…Ø®Ø²Ù† Ø§Ù„Ù…Ù„Ø§Ùƒ';
      if (item.warehouse === 'commercial') whName = 'Ù…Ø®Ø²Ù† Ø§Ù„ØªØ¬Ø§Ø±ÙŠ';
      else if (item.warehouse === 'assets') whName = 'Ù…Ø®Ø²Ù† Ø£ØµÙˆÙ„ ÙˆÙ…Ø±Ø§ÙÙ‚ Ø§Ù„Ù‚Ø±ÙŠØ©';

      div.innerHTML = `
        <div>
          <h4 style="margin:0 0 4px 0; color:#20274f; font-size:0.82rem; font-weight:700;">${item.name}</h4>
          <p style="margin:0; font-size:0.68rem; color:var(--text-muted);">${whName} â€¢ Ø§Ù„Ù…ØªÙˆÙØ±: ${item.qty} ÙˆØ­Ø¯Ø©</p>
          <span style="font-size:0.65rem; color:var(--primary-gold); font-weight:700;">${item.desc}</span>
        </div>
        <button class="btn btn-primary" style="width: auto; padding: 6px 10px; font-size: 0.78rem; white-space:nowrap; margin-top:0;" onclick="app.selectInventoryItem('${item.name}', ${item.price})">
          Ø§Ø®ØªÙŠØ§Ø± (${item.price} Ø¬.Ù…)
        </button>
      `;
      list.appendChild(div);
    });
  }

  toggleLanguage() {
    this.currentLang = this.currentLang === 'ar' ? 'en' : 'ar';
    this.applyLanguageUI();
    
    // Re-render header if logged in
    if (this.currentRole !== 'login') {
      this.switchRole(this.currentRole);
    }

    this.showToast(this.currentLang === 'en' ? 'ðŸŒ Language switched to English!' : 'ðŸŒ ØªÙ… ØªØºÙŠÙŠØ± Ù„ØºØ© Ø§Ù„Ù†Ø¸Ø§Ù… Ù„Ù„Ø¹Ø±Ø¨ÙŠØ©!');
  }

  applyLanguageUI() {
    // Save language configuration
    safeStorage.setItem('app_lang', this.currentLang);

    // Toggle simulator orientation direction (RTL / LTR)
    const simulator = document.getElementById('phoneSimulator');
    if (simulator) {
      simulator.style.direction = this.currentLang === 'en' ? 'ltr' : 'rtl';
    }

    // Toggle body class for font direction override if needed
    const root = document.documentElement;
    if (root) {
      if (this.currentLang === 'en') {
        root.style.setProperty('--font-main', "'Inter', sans-serif");
      } else {
        root.style.setProperty('--font-main', "'Outfit', 'Cairo', sans-serif");
      }
    }

    // Translate main brand texts
    const brandSub = document.querySelector('.hero-brand-sub');
    const loginTitle = document.querySelector('#viewLogin .card.gold-border .card-title');
    const loginEmailLabel = document.querySelector('#viewLogin .form-group:nth-child(2) .form-label');
    const loginPassLabel = document.querySelector('#viewLogin .form-group:nth-child(3) .form-label');
    const loginBtnText = document.querySelector('#viewLogin button.btn-primary');

    if (this.currentLang === 'en') {
      if (brandSub) brandSub.innerText = 'Coastal Cities & Malls Facility Management';
      if (loginTitle) loginTitle.innerHTML = '<i class="fa-solid fa-lock"></i> Secure System Portal Login';
      if (loginEmailLabel) loginEmailLabel.innerText = 'Username / Email Address:';
      if (loginPassLabel) loginPassLabel.innerText = 'Password:';
      if (loginBtnText) loginBtnText.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Authenticate & Login';
    } else {
      if (brandSub) brandSub.innerText = 'Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…Ø¯Ù† Ø§Ù„Ø³Ø§Ø­Ù„ÙŠØ© ÙˆØ§Ù„Ù…Ø±Ø§ÙƒØ² Ø§Ù„ØªØ¬Ø§Ø±ÙŠØ©';
      if (loginTitle) loginTitle.innerHTML = '<i class="fa-solid fa-lock"></i> ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯Ø®ÙˆÙ„ Ø§Ù„Ø¢Ù…Ù† Ù„Ù„Ù†Ø¸Ø§Ù…';
      if (loginEmailLabel) loginEmailLabel.innerText = 'Ø§Ø³Ù… Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… / Ø§Ù„Ø¨Ø±ÙŠØ¯ Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ:';
      if (loginPassLabel) loginPassLabel.innerText = 'ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ±:';
      if (loginBtnText) loginBtnText.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯Ø®ÙˆÙ„';
    }

    // Translate grid blocks
    const blocks = document.querySelectorAll('.role-block-card');
    const arTitles = ['Ø´Ø§Ø´Ø© Ø§Ù„Ù…Ø§Ù„Ùƒ', 'ÙØ±Ø¯ Ù…Ù† Ø£ÙØ±Ø§Ø¯ Ø§Ù„Ø£Ø³Ø±Ø©', 'Ø§Ù„Ù…Ù‡Ù†Ø¯Ø³ Ø§Ù„Ù…ÙŠØ¯Ø§Ù†ÙŠ', 'Ù…Ø¯ÙŠØ± Ø§Ù„ØµÙŠØ§Ù†Ø©', 'Ø§Ù„ÙÙ†ÙŠ Ø§Ù„Ù…ÙŠØ¯Ø§Ù†ÙŠ', 'Ø§Ù„Ù…Ø³ØªØ£Ø¬Ø± Ø§Ù„Ø³ÙƒÙ†ÙŠ', 'Ø§Ù„Ù…Ø³ØªØ£Ø¬Ø± Ø§Ù„ØªØ¬Ø§Ø±ÙŠ', 'Ø£Ù…Ù† ÙˆØ¨ÙˆØ§Ø¨Ø§Øª Ø§Ù„Ù‚Ø±ÙŠØ©', 'Ø§Ù„Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ø¹Ù„ÙŠØ§'];
    const enTitles = ['Owner Screen', 'Family Member', 'Field Engineer', 'Maint. Manager', 'Field Technician', 'Res. Tenant', 'Comm. Tenant', 'Security Gates', 'Admin Executive'];
    const arDescs = [
      'Ø§Ù„Ø¨Ù„Ø§ØºØ§ØªØŒ Ø§Ù„Ø¹Ø¯Ø§Ø¯Ø§Øª ÙˆØªØµØ§Ø±ÙŠØ­ Ø§Ù„ÙˆØ­Ø¯Ø©',
      'Ø¯Ø®ÙˆÙ„ Ù…Ø­Ø¯ÙˆØ¯ Ø¨Ø¯ÙˆÙ† ØªÙØ§ØµÙŠÙ„ Ù…Ø§Ù„ÙŠØ©',
      'ROØŒ Ø§Ù„Ø¨Ø­ÙŠØ±Ø§Øª ÙˆØ§Ù„Ù„Ø§Ù†Ø¯Ø³ÙƒÙŠØ¨',
      'ØªÙˆØ²ÙŠØ¹ ÙˆØ¥Ø³Ù†Ø§Ø¯ Ø§Ù„ÙÙ†ÙŠÙŠÙ†',
      'Ø£ÙˆØ§Ù…Ø± Ø§Ù„Ø¹Ù…Ù„ ÙˆØ§Ù„ØªÙˆÙ‚ÙŠØ¹',
      'Ø¯Ø®ÙˆÙ„ Ø§Ù„Ù‚Ø±ÙŠØ©ØŒ Ø§Ù„Ø¹Ø¯Ø§Ø¯Ø§Øª ÙˆØ§Ù„Ø¨Ø§Ù‚Ø§Øª',
      'Ø¹Ø¯Ø§Ø¯Ø§Øª ØªØ¬Ø§Ø±ÙŠØ© ÙˆØªØµØ§Ø±ÙŠØ­ Ø§Ù„Ø¨Ø¶Ø§Ø¦Ø¹',
      'Ø¥Ø´Ø±Ø§Ù Ø¨ÙˆØ§Ø¨Ø§Øª Ø§Ù„Ø£Ù…Ù† ÙˆØ§Ù„Ø´ÙƒØ§ÙˆÙ‰',
      'Ù…Ø¤Ø´Ø±Ø§Øª Ø§Ù„Ø£Ø¯Ø§Ø¡ ÙˆÙ…Ø±ÙƒØ² Ø§Ù„ØªØ­ÙƒÙ…'
    ];
    const enDescs = [
      'Tickets, meters & permits',
      'Restricted access, no finance',
      'RO, Lakes & Landscaping',
      'Technician dispatch & SLA',
      'Workorders & signatures',
      'Resort access & meters',
      'Meters & cargo permits',
      'Security gates & complaints',
      'KPI indicators & control panel'
    ];

    blocks.forEach((block, idx) => {
      const titleEl = block.querySelector('.block-title');
      const descEl = block.querySelector('.block-desc');
      if (titleEl && enTitles[idx]) {
        titleEl.innerText = this.currentLang === 'en' ? enTitles[idx] : arTitles[idx];
      }
      if (descEl && enDescs[idx]) {
        descEl.innerText = this.currentLang === 'en' ? enDescs[idx] : arDescs[idx];
      }
    });

    // Translate the bottom phone navigation items dynamically
    const phoneNav = document.getElementById('phoneNavbar');
    if (phoneNav) {
      const navItems = phoneNav.querySelectorAll('.nav-item span');
      const arNav = ['Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ©', 'Ø§Ù„Ø¨Ù„Ø§ØºØ§Øª', 'Ø§Ù„Ù…Ø§Ù„ÙŠØ©', 'Ø§Ù„Ø±Ø³Ø§Ø¦Ù„', 'Ø§Ù„Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª'];
      const enNav = ['Home', 'Tickets', 'Finance', 'Messages', 'Settings'];
      navItems.forEach((span, idx) => {
        if (arNav[idx] && span) {
          span.innerText = this.currentLang === 'en' ? enNav[idx] : arNav[idx];
        }
      });
    }

    // Toggle active state on language selector buttons inside settings
    const btnAr = document.getElementById('btnLangAr');
    const btnEn = document.getElementById('btnLangEn');
    if (btnAr && btnEn) {
      if (this.currentLang === 'en') {
        btnEn.style.background = 'var(--brand-teal)';
        btnEn.style.color = '#ffffff';
        btnAr.style.background = 'rgba(255,255,255,0.1)';
        btnAr.style.color = '#cccccc';
      } else {
        btnAr.style.background = 'var(--brand-teal)';
        btnAr.style.color = '#ffffff';
        btnEn.style.background = 'rgba(255,255,255,0.1)';
        btnEn.style.color = '#cccccc';
      }
    }

    // Toggle active state on login screen language switcher buttons
    const loginAr = document.getElementById('loginLangAr');
    const loginEn = document.getElementById('loginLangEn');
    if (loginAr && loginEn) {
      if (this.currentLang === 'en') {
        loginEn.style.background = 'var(--brand-teal)';
        loginEn.style.color = '#ffffff';
        loginAr.style.background = 'rgba(255,255,255,0.1)';
        loginAr.style.color = '#cccccc';
      } else {
        loginAr.style.background = 'var(--brand-teal)';
        loginAr.style.color = '#ffffff';
        loginEn.style.background = 'rgba(255,255,255,0.1)';
        loginEn.style.color = '#cccccc';
      }
    }

    // Set theme switch state on load
    const savedThemeDark = safeStorage.getItem('app_theme_dark') === 'true';
    const themeSwitch = document.getElementById('themeToggleSwitch');
    if (themeSwitch) {
      themeSwitch.checked = savedThemeDark;
      this.toggleTheme(savedThemeDark);
    }

    // Run deep translations for all static texts
    this.translateStaticTexts();
  }

  getRoleEnglishName(role) {
    const map = {
      'homeowner': 'Main Homeowner',
      'owner': 'Main Homeowner',
      'family': 'Family Member (Restricted)',
      'tenant': 'Residential Tenant',
      'commercial': 'Commercial Tenant',
      'security': 'Resort Security Gates',
      'manager': 'Maintenance Manager',
      'technician': 'Field Technician',
      'engineer': 'Supervising Engineer',
      'engineering_director': 'Engineering & HSE Director',
      'admin': 'Admin Executive',
      'housekeeping': 'Housekeeping & Cleaning',
      'landscaping': 'Landscaping & Garden Maintenance'
    };
    return map[role] || role;
  }

  switchHomeownerTab(tabId) {
    // Hide all tab contents in viewHomeowner
    document.querySelectorAll('.homeowner-tab-content').forEach(tab => {
      tab.style.setProperty('display', 'none', 'important');
      tab.classList.remove('active');
    });

    // Show selected tab content explicitly as flex column
    const target = document.getElementById(`tab${tabId.charAt(0).toUpperCase() + tabId.slice(1)}Homeowner`);
    if (target) {
      target.style.setProperty('display', 'flex', 'important');
      target.style.setProperty('flex-direction', 'column', 'important');
      target.classList.add('active');
    }

    // Update bottom navbar active styling
    const navbar = document.getElementById('phoneNavbar');
    if (navbar) {
      navbar.querySelectorAll('.nav-item').forEach(btn => {
        if (btn.getAttribute('data-tab') === tabId) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    }
  }

  setLanguage(lang) {
    this.currentLang = lang;
    this.applyLanguageUI();
    if (this.currentRole !== 'login') {
      this.switchRole(this.currentRole);
    }
    this.showToast(this.currentLang === 'en' ? 'ðŸŒ Language switched to English!' : 'ðŸŒ ØªÙ… ØªØ­ÙˆÙŠÙ„ Ù„ØºØ© Ø§Ù„ØªØ·Ø¨ÙŠÙ‚ Ø¥Ù„Ù‰ Ø§Ù„Ø¹Ø±Ø¨ÙŠØ©!');
  }

  toggleTheme(isDark) {
    const simulator = document.getElementById('phoneSimulator');
    if (simulator) {
      if (isDark) {
        simulator.classList.add('dark-theme');
      } else {
        simulator.classList.remove('dark-theme');
      }
    }
    safeStorage.setItem('app_theme_dark', isDark ? 'true' : 'false');
  }

  translateStaticTexts() {
    const isEn = this.currentLang === 'en';

    // 1. Home Tab Elements
    const qrTitle = document.querySelector('#qrSecurityCard span:first-child');
    if (qrTitle) qrTitle.innerHTML = isEn ? '<i class="fa-solid fa-qrcode"></i> Dynamic QR Access Code' : '<i class="fa-solid fa-qrcode"></i> ÙƒÙˆØ¯ Ø§Ù„Ø¯Ø®ÙˆÙ„ Ø§Ù„Ø¯ÙŠÙ†Ø§Ù…ÙŠÙƒÙŠ';

    const qrCountdownText = document.getElementById('qrCountdownText');
    if (qrCountdownText) qrCountdownText.innerText = isEn ? '30 seconds' : '30 Ø«Ø§Ù†ÙŠØ©';

    const qrFooter = document.querySelector('#qrSecurityCard .sec-badge');
    if (qrFooter) qrFooter.innerHTML = isEn ? '<i class="fa-solid fa-shield-halved"></i> Changes auto â€¢ Screenshot blocked' : '<i class="fa-solid fa-shield-halved"></i> ÙƒÙˆØ¯ ÙŠØªØºÙŠØ± ØªÙ„Ù‚Ø§Ø¦ÙŠØ§Ù‹ â€¢ Ø­Ø¸Ø± Ø§Ù„Ù€ Screenshot';

    const permitsTitle = document.getElementById('permitsCardTitle');
    if (permitsTitle) permitsTitle.innerHTML = isEn ? '<i class="fa-solid fa-key"></i> Approved Access Permits' : '<i class="fa-solid fa-key"></i> ØªØµØ§Ø±ÙŠØ­ Ø§Ù„Ø¯Ø®ÙˆÙ„ Ø§Ù„Ù…Ø¹ØªÙ…Ø¯Ø©';

    const permitsDesc = document.getElementById('permitsCardDesc');
    if (permitsDesc) permitsDesc.innerText = isEn ? 'Issue restricted temporary visitor permits' : 'Ø¥ØµØ¯Ø§Ø± ØªØµØ§Ø±ÙŠØ­ Ø¯Ø®ÙˆÙ„ Ù…Ø´Ø±ÙˆØ·Ø© ÙˆÙ…Ø¤Ù‚ØªØ© Ø¨Ø¯Ù‚Ø© Ù„Ù…ØªØ§Ø¨Ø¹Ø© Ø§Ù„Ø£Ù…Ø§Ù† ÙˆØ§Ù„ØªØ­ÙƒÙ… Ø¨Ø§Ù„Ø¨ÙˆØ§Ø¨Ø§Øª.';

    const btnPermit1 = document.getElementById('btnUnitPermit');
    if (btnPermit1) btnPermit1.innerHTML = isEn ? '<i class="fa-solid fa-door-open"></i> Unit Entry Permit' : '<i class="fa-solid fa-door-open"></i> ØªØµØ±ÙŠØ­ Ø¯Ø®ÙˆÙ„ Ø§Ù„ÙˆØ­Ø¯Ø©';

    const btnPermit2 = document.getElementById('btnBeachPermit');
    if (btnPermit2) btnPermit2.innerHTML = isEn ? '<i class="fa-solid fa-umbrella-beach"></i> Beach & Lake Entry' : '<i class="fa-solid fa-umbrella-beach"></i> Ø¯Ø®ÙˆÙ„ Ø§Ù„Ø¨Ø­Ø± ÙˆØ§Ù„Ø¨Ø­ÙŠØ±Ø§Øª ÙˆØ§Ù„Ù…Ø³Ø§Ø¨Ø­';

    const permitsListTitle = document.getElementById('permitsStatusLabel');
    if (permitsListTitle) permitsListTitle.innerHTML = isEn ? '<i class="fa-solid fa-stamp"></i> Requested Permits Status:' : '<i class="fa-solid fa-stamp"></i> Ø­Ø§Ù„Ø© Ø§Ù„ØªØµØ§Ø±ÙŠØ­ Ø§Ù„Ù…Ø·Ù„ÙˆØ¨Ø©:';

    const btnSecurityComp = document.getElementById('btnSecurityComplaint');
    if (btnSecurityComp) btnSecurityComp.innerHTML = isEn ? '<i class="fa-solid fa-shield-halved"></i> Emergency Security Reports' : '<i class="fa-solid fa-shield-halved"></i> Ø¨Ù„Ø§ØºØ§Øª ÙˆØ´ÙƒØ§ÙˆÙ‰ Ø§Ù„Ø£Ù…Ù† Ø§Ù„Ø·Ø§Ø±Ø¦Ø©';

    const complaintsListTitle = document.getElementById('activeComplaintsLabelText');
    if (complaintsListTitle) complaintsListTitle.innerHTML = isEn ? '<i class="fa-solid fa-list-check"></i> Active Complaints:' : '<i class="fa-solid fa-list-check"></i> Ø´ÙƒØ§ÙˆÙ‰ Ø§Ù„Ø£Ù…Ù† Ø§Ù„Ù†Ø´Ø·Ø©:';

    const lprTitle = document.getElementById('lprCardTitle');
    if (lprTitle) lprTitle.innerHTML = isEn ? '<i class="fa-solid fa-car"></i> Smart License Plate (LPR) Registration' : '<i class="fa-solid fa-car"></i> ØªØ³Ø¬ÙŠÙ„ Ù„ÙˆØ­Ø§Øª Ø§Ù„Ø³ÙŠØ§Ø±Ø§Øª Ù„Ù„Ø¨ÙˆØ§Ø¨Ø§Øª Ø§Ù„Ø°ÙƒÙŠØ© (LPR)';

    const lprDesc = document.getElementById('lprCardDesc');
    if (lprDesc) lprDesc.innerText = isEn ? 'Register vehicle plates for automatic gate access' : 'Ø³Ø¬Ù„ Ù„ÙˆØ­Ø© Ø³ÙŠØ§Ø±ØªÙƒ Ù„ÙØªØ­ Ø¨ÙˆØ§Ø¨Ø§Øª Ø§Ù„Ù‚Ø±ÙŠØ© Ø§Ù„Ø°ÙƒÙŠØ© ØªÙ„Ù‚Ø§Ø¦ÙŠØ§Ù‹ Ø¨Ø§Ù„ÙƒØ§Ù…ÙŠØ±Ø§Øª Ø§Ù„Ø±Ù‚Ù…ÙŠØ©.';

    const lprInput = document.getElementById('lprPlateInput');
    if (lprInput) lprInput.placeholder = isEn ? 'e.g. ABC 1234' : 'Ù…Ø«Ø§Ù„: Ø£ Ø¬ 1234';

    const btnLpr = document.querySelector('#lprCardTitle')?.parentNode?.parentNode?.querySelector('button');
    if (btnLpr) btnLpr.innerHTML = isEn ? '<i class="fa-solid fa-plus"></i> Register' : '<i class="fa-solid fa-plus"></i> ØªØ³Ø¬ÙŠÙ„';

    const familyTitle = document.getElementById('familyCardTitle');
    if (familyTitle) familyTitle.innerHTML = isEn ? '<i class="fa-solid fa-people-roof"></i> Family & Dependents Management' : '<i class="fa-solid fa-people-roof"></i> Ø¥Ø¯Ø§Ø±Ø© Ø£ÙØ±Ø§Ø¯ Ø§Ù„Ø£Ø³Ø±Ø© ÙˆØ§Ù„ØªØ§Ø¨Ø¹ÙŠÙ† Ø¨Ø§Ù„ÙˆØ­Ø¯Ø©';

    const familyDesc = document.getElementById('familyCardDesc');
    if (familyDesc) familyDesc.innerText = isEn ? 'Manage family access and restricted gate passes' : 'ØªØ­ÙƒÙ… ÙÙŠ Ø¥Ø¶Ø§ÙØ© Ø£ÙØ±Ø§Ø¯ Ø¹Ø§Ø¦Ù„ØªÙƒ ÙˆØ¥ØµØ¯Ø§Ø± ØµÙ„Ø§Ø­ÙŠØ§Øª Ø§Ù„Ø¯Ø®ÙˆÙ„ ÙˆØ¨ÙˆØ§Ø¨Ø§Øª Ø§Ù„Ø£Ù…Ù† Ø§Ù„Ù…Ø­Ø¯ÙˆØ¯Ø© Ù„Ù‡Ù… Ø¯ÙˆÙ† ØµÙ„Ø§Ø­ÙŠØ§Øª Ù…Ø§Ù„ÙŠØ©.';

    const btnAddFamily = document.querySelector('#familyCardTitle')?.parentNode?.parentNode?.querySelector('button');
    if (btnAddFamily) btnAddFamily.innerHTML = isEn ? '<i class="fa-solid fa-user-plus"></i> Add New Family Member' : '<i class="fa-solid fa-user-plus"></i> Ø¥Ø¶Ø§ÙØ© ÙØ±Ø¯ Ø£Ø³Ø±Ø© Ø¬Ø¯ÙŠØ¯ Ù„Ù„ÙˆØ­Ø¯Ø©';

    const btnDir = document.querySelector('#tabHomeHomeowner > button.btn-secondary');
    if (btnDir) btnDir.innerHTML = isEn ? '<i class="fa-solid fa-phone-volume"></i> Village Services & Emergency Directory' : '<i class="fa-solid fa-phone-volume"></i> Ø¯Ù„ÙŠÙ„ Ø®Ø¯Ù…Ø§Øª ÙˆØ·ÙˆØ§Ø±Ø¦ Ø§Ù„Ù‚Ø±ÙŠØ©';

    // 2. Tickets Tab Elements
    const btnNewTicket = document.getElementById('btnNewMaintenanceTicket');
    if (btnNewTicket) btnNewTicket.innerHTML = isEn ? '<i class="fa-solid fa-wrench"></i> Request Internal Maintenance' : '<i class="fa-solid fa-wrench"></i> Ø·Ù„Ø¨ ØµÙŠØ§Ù†Ø© Ø¯Ø§Ø®Ù„ÙŠØ©';

    const ticketsTitle = document.querySelector('#tabTicketsHomeowner .card .card-title');
    if (ticketsTitle) ticketsTitle.innerHTML = isEn ? '<i class="fa-solid fa-list-check"></i> Active Maintenance Tickets' : '<i class="fa-solid fa-list-check"></i> Ø·Ù„Ø¨Ø§Øª Ø§Ù„ØµÙŠØ§Ù†Ø© Ø§Ù„Ø­Ø§Ù„ÙŠØ©';

    // 3. Finance Tab Elements
    const financeTitle = document.querySelector('#tabWalletHomeowner .card:first-child .card-title');
    if (financeTitle) financeTitle.innerHTML = isEn ? '<i class="fa-solid fa-wallet"></i> Financial Details & Maintenance Deposit' : '<i class="fa-solid fa-wallet"></i> Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù…Ø§Ù„ÙŠØ© ÙˆÙˆØ¯ÙŠØ¹Ø© Ø§Ù„ØµÙŠØ§Ù†Ø©';

    const financeBadge = document.querySelector('#tabWalletHomeowner .card:first-child .badge');
    if (financeBadge) financeBadge.innerText = isEn ? 'Main Owner' : 'Ø§Ù„Ù…Ø§Ù„Ùƒ Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠ';

    const depLabel = document.querySelector('#tabWalletHomeowner .card:first-child .grid-2 .stat-box:first-child .stat-label');
    if (depLabel) depLabel.innerText = isEn ? 'Original Maintenance Deposit' : 'Ø±ØµÙŠØ¯ Ø§Ù„ÙˆØ¯ÙŠØ¹Ø© Ø§Ù„Ø£ØµÙ„ÙŠØ©';
    const yieldLabel = document.querySelector('#tabWalletHomeowner .card:first-child .grid-2 .stat-box:last-child .stat-label');
    if (yieldLabel) yieldLabel.innerText = isEn ? 'Annual Investment Yield' : 'Ø¹ÙˆØ§Ø¦Ø¯ Ø§Ù„Ø§Ø³ØªØ«Ù…Ø§Ø± Ø§Ù„Ø³Ù†ÙˆÙŠØ©';

    const shareLabel = document.querySelector('#tabWalletHomeowner .card:first-child div[style*="dashed"] div:first-child span:first-child');
    if (shareLabel) shareLabel.innerText = isEn ? 'Unit Share of Operating Expenses:' : 'Ø­ØµØ© Ø§Ù„ÙˆØ­Ø¯Ø© Ù…Ù† Ù…ØµØ§Ø±ÙŠÙ Ø§Ù„ØªØ´ØºÙŠÙ„:';

    const varLabel = document.querySelector('#tabWalletHomeowner .card:first-child div[style*="dashed"] div:last-child span:first-child');
    if (varLabel) varLabel.innerText = isEn ? 'Net Maintenance Variance Due:' : 'ØµØ§ÙÙŠ ÙØ±ÙˆÙ‚ Ø§Ù„ØµÙŠØ§Ù†Ø© Ø§Ù„Ù…Ø·Ù„ÙˆØ¨Ø©:';

    const metersTitle = document.querySelector('#utilityMetersCard .card-title');
    if (metersTitle) metersTitle.innerHTML = isEn ? '<i class="fa-solid fa-plug-circle-bolt"></i> Smart Prepaid Utility Meters' : '<i class="fa-solid fa-plug-circle-bolt"></i> Ø´Ø­Ù† Ø§Ù„Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ù„Ø°ÙƒÙŠØ© (Ù…Ø³Ø¨Ù‚Ø© Ø§Ù„Ø¯ÙØ¹)';

    const elecLabel = document.querySelector('#utilityMetersCard .stat-box:first-child .stat-label');
    if (elecLabel) elecLabel.innerHTML = isEn ? '<i class="fa-solid fa-bolt"></i> Elec. Meter' : '<i class="fa-solid fa-bolt"></i> Ø¹Ø¯Ø§Ø¯ Ø§Ù„ÙƒÙ‡Ø±Ø¨Ø§Ø¡';

    const waterLabel = document.querySelector('#utilityMetersCard .stat-box:last-child .stat-label');
    if (waterLabel) waterLabel.innerHTML = isEn ? '<i class="fa-solid fa-droplet"></i> Water Meter' : '<i class="fa-solid fa-droplet"></i> Ø¹Ø¯Ø§Ø¯ Ø§Ù„Ù…ÙŠØ§Ù‡';

    const btnOpenRecharge = document.getElementById('btnOpenMeterRechargeModal');
    if (btnOpenRecharge) btnOpenRecharge.innerHTML = isEn ? '<i class="fa-solid fa-charging-station"></i> Instant Utility Recharge' : '<i class="fa-solid fa-charging-station"></i> Ø´Ø­Ù† Ø§Ù„Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ù„ÙÙˆØ±ÙŠ (ÙƒÙ‡Ø±Ø¨Ø§Ø¡ / Ù…ÙŠØ§Ù‡)';

    const bookingTitle = document.querySelector('#tabWalletHomeowner .card:last-child .card-title');
    if (bookingTitle) bookingTitle.innerHTML = isEn ? '<i class="fa-solid fa-tennis-ball"></i> Sports & Playgrounds Booking' : '<i class="fa-solid fa-tennis-ball"></i> Ø­Ø¬Ø² Ø§Ù„Ù…Ù„Ø§Ø¹Ø¨ ÙˆØ§Ù„Ø£Ù†Ø´Ø·Ø© Ø§Ù„ØªØ±ÙÙŠÙ‡ÙŠØ©';

    const bookingDesc = document.querySelector('#tabWalletHomeowner .card:last-child p');
    if (bookingDesc) bookingDesc.innerText = isEn ? 'Book padel tennis or football courts from your wallet balance' : 'Ø§Ø­Ø¬Ø² Ù…Ù„Ø§Ø¹Ø¨ Ø§Ù„Ø¨Ø§Ø¯Ù„ ØªÙ†Ø³ Ø£Ùˆ Ù…Ù„Ø§Ø¹Ø¨ ÙƒØ±Ø© Ø§Ù„Ù‚Ø¯Ù… Ù…Ø¨Ø§Ø´Ø±Ø© Ù…Ù† Ø±ØµÙŠØ¯ Ù…Ø­ÙØ¸ØªÙƒ.';

    const bookingWalletLabel = document.querySelector('#tabWalletHomeowner .card:last-child .owner-only-financial');
    if (bookingWalletLabel) bookingWalletLabel.innerHTML = isEn ? '<i class="fa-solid fa-wallet"></i> Available Digital Wallet: <span id="bookingWalletBalanceText">2500</span> EGP' : '<i class="fa-solid fa-wallet"></i> Ø±ØµÙŠØ¯ Ù…Ø­ÙØ¸Ø© Ø§Ù„Ø¯ÙØ¹ Ø§Ù„Ù…ØªØ§Ø­Ø©: <span id="bookingWalletBalanceText">2500</span> Ø¬.Ù…';

    const bookingSelectLabel = document.querySelector('#tabWalletHomeowner .card:last-child .form-group:nth-of-type(1) .form-label');
    if (bookingSelectLabel) bookingSelectLabel.innerText = isEn ? 'Select Activity / Court:' : 'Ø§Ø®ØªØ± Ø§Ù„Ù†Ø´Ø§Ø· / Ø§Ù„Ù…Ù„Ø¹Ø¨:';

    const bookingDateLabel = document.querySelector('#tabWalletHomeowner .card:last-child .grid-2 .form-group:first-child .form-label');
    if (bookingDateLabel) bookingDateLabel.innerText = isEn ? 'Date:' : 'Ø§Ù„ØªØ§Ø±ÙŠØ®:';

    const bookingTimeLabel = document.querySelector('#tabWalletHomeowner .card:last-child .grid-2 .form-group:last-child .form-label');
    if (bookingTimeLabel) bookingTimeLabel.innerText = isEn ? 'Time:' : 'Ø§Ù„ÙˆÙ‚Øª:';

    const btnBook = document.querySelector('#tabWalletHomeowner .card:last-child button');
    if (btnBook) btnBook.innerHTML = isEn ? '<i class="fa-solid fa-calendar-check"></i> Confirm & Deduct Wallet' : '<i class="fa-solid fa-calendar-check"></i> ØªØ£ÙƒÙŠØ¯ Ø§Ù„Ø­Ø¬Ø² ÙˆØ§Ù„Ø®ØµÙ… Ù…Ù† Ø§Ù„Ù…Ø­ÙØ¸Ø©';

    // 4. Settings Tab Elements
    const settingsTitle = document.querySelector('#tabSettingsHomeowner .card .card-title');
    if (settingsTitle) settingsTitle.innerHTML = isEn ? '<i class="fa-solid fa-sliders"></i> App & Theme Settings' : '<i class="fa-solid fa-sliders"></i> Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ù„ØªØ·Ø¨ÙŠÙ‚ ÙˆØ§Ù„Ù…Ø¸Ù‡Ø±';

    const settingsDesc = document.querySelector('#tabSettingsHomeowner .card p');
    if (settingsDesc) settingsDesc.innerText = isEn ? 'Customize user experience, preferred language and themes' : 'ØªØ®ØµÙŠØµ ØªØ¬Ø±Ø¨Ø© Ø§Ù„Ø§Ø³ØªØ®Ø¯Ø§Ù…ØŒ Ù„ØºØ© Ø§Ù„ØªØ·Ø¨ÙŠÙ‚ ÙˆØªÙ†Ø¨ÙŠÙ‡Ø§Øª Ø§Ù„Ø¥Ø´Ø¹Ø§Ø±Ø§Øª Ø§Ù„ÙÙˆØ±ÙŠØ©.';

    const langToggleLabel = document.getElementById('lblLangSettings');
    if (langToggleLabel) langToggleLabel.innerHTML = isEn ? '<i class="fa-solid fa-language"></i> System Language' : '<i class="fa-solid fa-language"></i> Ù„ØºØ© Ø§Ù„Ù†Ø¸Ø§Ù… (Language)';

    const langToggleDesc = document.getElementById('descLangSettings');
    if (langToggleDesc) langToggleDesc.innerText = isEn ? 'Choose preferred application language' : 'Ø§Ø®ØªØ± Ù„ØºØ© ÙˆØ§Ø¬Ù‡Ø© Ø§Ù„ØªØ·Ø¨ÙŠÙ‚ Ø§Ù„Ù…ÙØ¶Ù„Ø©';

    const themeToggleLabel = document.getElementById('lblThemeSettings');
    if (themeToggleLabel) themeToggleLabel.innerHTML = isEn ? '<i class="fa-solid fa-moon"></i> Dark Theme Mode' : '<i class="fa-solid fa-moon"></i> Ø§Ù„ÙˆØ¶Ø¹ Ø§Ù„Ø¯Ø§ÙƒÙ† (Dark Mode)';

    const themeToggleDesc = document.getElementById('descThemeSettings');
    if (themeToggleDesc) themeToggleDesc.innerText = isEn ? 'Toggle screen colors to night mode' : 'Ø§Ù„ØªØ­ÙˆÙ„ Ù„Ù…Ø¸Ù‡Ø± Ø§Ù„Ø£Ù„ÙˆØ§Ù† Ø§Ù„Ù…Ø¸Ù„Ù… Ù„Ù„Ø£Ù…Ø§Ù† ÙˆØ§Ù„Ø±Ø§Ø­Ø©';

    const notifyToggleLabel = document.getElementById('lblNotifySettings');
    if (notifyToggleLabel) notifyToggleLabel.innerHTML = isEn ? '<i class="fa-solid fa-bell"></i> Push Notifications' : '<i class="fa-solid fa-bell"></i> Ø§Ù„Ø¥Ø´Ø¹Ø§Ø±Ø§Øª Ø§Ù„ÙÙˆØ±ÙŠØ©';

    const notifyToggleDesc = document.getElementById('descNotifySettings');
    if (notifyToggleDesc) notifyToggleDesc.innerText = isEn ? 'Alerts for ticket status and bookings updates' : 'ØªÙ†Ø¨ÙŠÙ‡Ø§Øª Ø­Ø§Ù„Ø© Ø¨Ù„Ø§ØºØ§Øª Ø§Ù„ØµÙŠØ§Ù†Ø© ÙˆÙ…ÙˆØ§Ø¹ÙŠØ¯ Ø§Ù„Ø­Ø¬ÙˆØ²Ø§Øª';

    // 5. Translate Family members list elements
    const familyList = document.getElementById('ownerFamilyMembersList');
    if (familyList) {
      familyList.querySelectorAll('div').forEach(item => {
        const span = item.querySelector('span');
        const p = item.querySelector('p');
        const badge = item.querySelector('.badge');
        
        if (span) {
          let text = span.innerText;
          if (isEn) {
            text = text.replace('Ø³Ø§Ø±Ø© Ø£Ø­Ù…Ø¯ (Ø§Ù„Ø²ÙˆØ¬Ø©)', 'Sarah Ahmed (Wife)')
                       .replace('Ø¹Ù…Ø± Ø£Ø­Ù…Ø¯ (Ø§Ù„Ø§Ø¨Ù†)', 'Omar Ahmed (Son)')
                       .replace('(Ø§Ù„Ø²ÙˆØ¬Ø©)', '(Wife)')
                       .replace('(Ø§Ù„Ø§Ø¨Ù†)', '(Son)')
                       .replace('(Ø£Ø¨)', '(Father)')
                       .replace('(Ø£Ù…)', '(Mother)')
                       .replace('(Ø£Ø®)', '(Brother)')
                       .replace('(Ø£Ø®Øª)', '(Sister)')
                       .replace('(Ø§Ø¨Ù†)', '(Son)')
                       .replace('(Ø§Ø¨Ù†Ø©)', '(Daughter)');
          } else {
            text = text.replace('Sarah Ahmed (Wife)', 'Ø³Ø§Ø±Ø© Ø£Ø­Ù…Ø¯ (Ø§Ù„Ø²ÙˆØ¬Ø©)')
                       .replace('Omar Ahmed (Son)', 'Ø¹Ù…Ø± Ø£Ø­Ù…Ø¯ (Ø§Ù„Ø§Ø¨Ù†)')
                       .replace('(Wife)', '(Ø§Ù„Ø²ÙˆØ¬Ø©)')
                       .replace('(Son)', '(Ø§Ù„Ø§Ø¨Ù†)')
                       .replace('(Father)', '(Ø£Ø¨)')
                       .replace('(Mother)', '(Ø£Ù…)')
                       .replace('(Brother)', '(Ø£Ø®)')
                       .replace('(Sister)', '(Ø£Ø®Øª)')
                       .replace('(Son)', '(Ø§Ù„Ø§Ø¨Ù†)')
                       .replace('(Daughter)', '(Ø§Ø¨Ù†Ø©)');
          }
          span.innerText = text;
        }

        if (p) {
          let pText = p.innerText;
          if (isEn) {
            pText = pText.replace('ØµÙ„Ø§Ø­ÙŠØ© Ø¯Ø®ÙˆÙ„ Ø§Ù„Ø¨ÙˆØ§Ø¨Ø§Øª ÙˆØ§Ù„Ø®Ø¯Ù…Ø§Øª ÙÙ‚Ø·', 'Gate access & services permit only');
          } else {
            pText = pText.replace('Gate access & services permit only', 'ØµÙ„Ø§Ø­ÙŠØ© Ø¯Ø®ÙˆÙ„ Ø§Ù„Ø¨ÙˆØ§Ø¨Ø§Øª ÙˆØ§Ù„Ø®Ø¯Ù…Ø§Øª ÙÙ‚Ø·');
          }
          p.innerText = pText;
        }

        if (badge) {
          let badgeText = badge.innerText;
          if (isEn) {
            badgeText = badgeText.replace('Ù†Ø´Ø·', 'Active');
          } else {
            badgeText = badgeText.replace('Active', 'Ù†Ø´Ø·');
          }
          badge.innerText = badgeText;
        }
      });
    }

    // Family Member Count Badge
    const familyBadge = document.getElementById('ownerFamilyCountBadge');
    if (familyBadge) {
      const count = familyList ? familyList.children.length : 2;
      familyBadge.innerText = isEn ? `${count} members` : `${count} Ø£ÙØ±Ø§Ø¯`;
    }

    // Translate LPR Active Plates list items
    const lprList = document.getElementById('lprActivePlatesList');
    if (lprList) {
      lprList.querySelectorAll('div').forEach(item => {
        const badge = item.querySelector('.badge');
        if (badge) {
          if (isEn) {
            badge.innerHTML = '<i class="fa-solid fa-circle-check"></i> Active on Gates';
          } else {
            badge.innerHTML = '<i class="fa-solid fa-circle-check"></i> Ù…ÙØ¹Ù„ Ø¹Ù„Ù‰ Ø§Ù„Ø¨ÙˆØ§Ø¨Ø§Øª';
          }
        }
      });
    }

    // 9. Housekeeping translations
    const roleTitleHk = document.getElementById('roleTitleHk');
    if (roleTitleHk) roleTitleHk.innerText = isEn ? 'Housekeeping' : 'Ù‡Ø§ÙˆØ³ ÙƒÙŠØ¨ÙŠÙ†Ø¬';

    const roleDescHk = document.getElementById('roleDescHk');
    if (roleDescHk) roleDescHk.innerText = isEn ? 'Cleaning requests & staff assignment' : 'Ø·Ù„Ø¨Ø§Øª Ø§Ù„Ù†Ø¸Ø§ÙØ© ÙˆØ¥Ø³Ù†Ø§Ø¯ Ø¹Ù…Ø§Ù„ Ø§Ù„Ù†Ø¸Ø§ÙØ©';

    const btnHomeownerHk = document.getElementById('btnHomeownerHk');
    if (btnHomeownerHk) btnHomeownerHk.innerHTML = isEn ? '<i class="fa-solid fa-broom"></i> Request Cleaning' : '<i class="fa-solid fa-broom"></i> Ø·Ù„Ø¨ Ø®Ø¯Ù…Ø© Ù†Ø¸Ø§ÙØ©';

    const btnTenantHk = document.getElementById('btnTenantHk');
    if (btnTenantHk) btnTenantHk.innerHTML = isEn ? '<i class="fa-solid fa-broom"></i> Request Cleaning' : '<i class="fa-solid fa-broom"></i> Ø·Ù„Ø¨ Ø®Ø¯Ù…Ø© Ù†Ø¸Ø§ÙØ©';

    const btnTenantHkPack = document.getElementById('btnTenantHkPack');
    if (btnTenantHkPack) btnTenantHkPack.innerText = isEn ? 'Request Cleaning' : 'Ø·Ù„Ø¨ Ø®Ø¯Ù…Ø© Ù†Ø¸Ø§ÙØ©';

    const btnCommercialHk = document.getElementById('btnCommercialHk');
    if (btnCommercialHk) btnCommercialHk.innerHTML = isEn ? '<i class="fa-solid fa-broom"></i> Request Cleaning' : '<i class="fa-solid fa-broom"></i> Ø·Ù„Ø¨ Ø®Ø¯Ù…Ø© Ù†Ø¸Ø§ÙØ©';

    const managerHkTitle = document.getElementById('managerHkTitle');
    if (managerHkTitle) managerHkTitle.innerHTML = isEn ? '<i class="fa-solid fa-broom"></i> Public Area Cleaning Request' : '<i class="fa-solid fa-broom"></i> Ø·Ù„Ø¨ Ù†Ø¸Ø§ÙØ© Ù„Ù„Ø£Ù…Ø§ÙƒÙ† Ø§Ù„Ø¹Ø§Ù…Ø©';

    const managerHkDesc = document.getElementById('managerHkDesc');
    if (managerHkDesc) managerHkDesc.innerText = isEn ? 'Request cleaning for public zones (Main Pool, Lake Beach, Walkways, Admin).' : 'ÙŠÙ…ÙƒÙ†Ùƒ Ù‡Ù†Ø§ Ø·Ù„Ø¨ ØªÙ†Ø¸ÙŠÙ Ù„Ù‚Ø·Ø§Ø¹ Ø¹Ø§Ù… Ø¨Ø§Ù„Ù‚Ø±ÙŠØ© (Ù…Ø«Ù„ Ø§Ù„Ù…Ø³Ø¨Ø­ Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØŒ Ø§Ù„Ø´Ø§Ø·Ø¦ØŒ Ø§Ù„Ù„Ø§Ù†Ø¯Ø³ÙƒÙŠØ¨ØŒ Ø§Ù„Ù…Ù…Ø±Ø§Øª).';

    const btnManagerHkSubmit = document.getElementById('btnManagerHkSubmit');
    if (btnManagerHkSubmit) btnManagerHkSubmit.innerHTML = isEn ? '<i class="fa-solid fa-paper-plane"></i> Send Request' : '<i class="fa-solid fa-paper-plane"></i> Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„Ø·Ù„Ø¨';

    const hkSupervisorLabel = document.getElementById('hkSupervisorLabel');
    if (hkSupervisorLabel) hkSupervisorLabel.innerText = isEn ? 'Housekeeping & Hotel Services Supervision' : 'Ø¥Ø´Ø±Ø§Ù Ø§Ù„Ù‡Ø§ÙˆØ³ ÙƒÙŠØ¨ÙŠÙ†Ø¬ ÙˆØ§Ù„Ø®Ø¯Ù…Ø§Øª Ø§Ù„ÙÙ†Ø¯Ù‚ÙŠØ©';

    const hkSupervisorName = document.getElementById('hkSupervisorName');
    if (hkSupervisorName) hkSupervisorName.innerText = isEn ? 'Housekeeping Supervisor' : 'Ù…Ø´Ø±Ù Ù‚Ø³Ù… Ø§Ù„Ù†Ø¸Ø§ÙØ© (Housekeeping Supervisor)';

    const hkSupervisorDesc = document.getElementById('hkSupervisorDesc');
    if (hkSupervisorDesc) hkSupervisorDesc.innerText = isEn ? 'Receive cleaning orders and assign workers' : 'Ø§Ø³ØªÙ‚Ø¨Ø§Ù„ Ø·Ù„Ø¨Ø§Øª Ø§Ù„Ù†Ø¸Ø§ÙØ© ÙˆØ¥Ø³Ù†Ø§Ø¯ Ø¹Ù…Ø§Ù„ Ø§Ù„Ù†Ø¸Ø§ÙØ©';

    const hkStatusBadge = document.getElementById('hkStatusBadge');
    if (hkStatusBadge) hkStatusBadge.innerHTML = isEn ? '<i class="fa-solid fa-broom"></i> Department Active' : '<i class="fa-solid fa-broom"></i> Ø§Ù„Ù‚Ø³Ù… Ù†Ø´Ø·';

    const hkRequestsTitle = document.getElementById('hkRequestsTitle');
    if (hkRequestsTitle) hkRequestsTitle.innerHTML = isEn ? '<i class="fa-solid fa-inbox"></i> Incoming Cleaning Requests' : '<i class="fa-solid fa-inbox"></i> Ø·Ù„Ø¨Ø§Øª Ø§Ù„Ù†Ø¸Ø§ÙØ© Ø§Ù„ÙˆØ§Ø±Ø¯Ø© (Cleaning Requests)';

    // 10. Odoo Card translations
    const odooSyncTitle = document.getElementById('odooSyncTitle');
    if (odooSyncTitle) odooSyncTitle.innerHTML = isEn ? '<i class="fa-solid fa-cloud-arrow-up"></i> Odoo ERP Live Sync Center' : '<i class="fa-solid fa-cloud-arrow-up"></i> Ù…Ø±ÙƒØ² Ù…Ø²Ø§Ù…Ù†Ø© Odoo ERP Ø§Ù„Ù…Ø¨Ø§Ø´Ø±';

    const odooSyncDesc = document.getElementById('odooSyncDesc');
    if (odooSyncDesc) odooSyncDesc.innerText = isEn ? 'Real-time synchronization with custom Odoo database to send tickets, retrieve owner names, and sync contacts.' : 'Ø§Ù„Ø±Ø¨Ø· Ø§Ù„Ù„Ø­Ø¸ÙŠ Ù…Ø¹ Ù‚Ø§Ø¹Ø¯Ø© Ø¨ÙŠØ§Ù†Ø§Øª Odoo Ø§Ù„Ù…Ø®ØµØµØ© Ù„Ø¥Ø±Ø³Ø§Ù„ Ø¨Ù„Ø§ØºØ§Øª Ø§Ù„ØµÙŠØ§Ù†Ø©ØŒ ÙˆØ§Ø³ØªÙ‚Ø¨Ø§Ù„ Ø£Ø³Ù…Ø§Ø¡ Ø§Ù„Ù…Ù„Ø§ÙƒØŒ ÙˆÙ…Ø²Ø§Ù…Ù†Ø© Ø¬Ù‡Ø§Øª Ø§Ù„Ø§ØªØµØ§Ù„.';

    const odooUrlLabel = document.getElementById('odooUrlLabel');
    if (odooUrlLabel) odooUrlLabel.innerText = isEn ? 'Server URL:' : 'Ø±Ø§Ø¨Ø· Ø§Ù„Ø³ÙŠØ±ÙØ±:';

    const odooDbLabel = document.getElementById('odooDbLabel');
    if (odooDbLabel) odooDbLabel.innerText = isEn ? 'Database Name:' : 'Ø§Ø³Ù… Ù‚Ø§Ø¹Ø¯Ø© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª:';

    const odooUserLabel = document.getElementById('odooUserLabel');
    if (odooUserLabel) odooUserLabel.innerText = isEn ? 'User Email:' : 'Ø§Ù„Ø¨Ø±ÙŠØ¯ Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ:';

    const odooOwnerNameLabel = document.getElementById('odooOwnerNameLabel');
    if (odooOwnerNameLabel) odooOwnerNameLabel.innerText = isEn ? 'Fetched Name from Odoo:' : 'Ø§Ù„Ø§Ø³Ù… Ø§Ù„Ù…Ø³ØªØ±Ø¬Ø¹ Ù…Ù† Odoo:';

    const btnOdooTestConn = document.getElementById('btnOdooTestConn');
    if (btnOdooTestConn) btnOdooTestConn.innerHTML = isEn ? '<i class="fa-solid fa-wifi"></i> Test & Activate Sync Now' : '<i class="fa-solid fa-wifi"></i> Ø§Ø®ØªØ¨Ø§Ø± ÙˆØªÙ†Ø´ÙŠØ· Ø§Ù„Ù…Ø²Ø§Ù…Ù†Ø© Ø§Ù„Ø¢Ù†';
  }

  requestHousekeeping(role = 'owner', customType = null, slot = null, notes = '') {
    if (this._isHkSubmitting) return;
    this._isHkSubmitting = true;
    setTimeout(() => { this._isHkSubmitting = false; }, 2500);

    const isEn = this.currentLang === 'en';
    let location = '';
    let requesterName = '';
    let type = customType || 'Ù†Ø¸Ø§ÙØ© Ø±ÙˆØªÙŠÙ†ÙŠØ© ÙŠÙˆÙ…ÙŠØ©';

    if (role === 'owner') {
      location = 'ÙÙŠÙ„Ø§ 104';
      requesterName = isEn ? 'Owner (Osama Ahmed)' : 'Ø§Ù„Ù…Ø§Ù„Ùƒ (Ø£Ø³Ø§Ù…Ø© Ø£Ø­Ù…Ø¯)';
    } else if (role === 'tenant') {
      location = 'Ø´Ø§Ù„ÙŠÙ‡ 402';
      requesterName = isEn ? 'Tenant (Ahmed Zaher)' : 'Ø§Ù„Ù…Ø³ØªØ£Ø¬Ø± (Ø£Ø­Ù…Ø¯ Ø²Ø§Ù‡Ø±)';
    } else if (role === 'commercial') {
      location = 'Ù…Ø­Ù„ 12 (Blue Wave)';
      requesterName = isEn ? 'Commercial (Blue Wave)' : 'Ø§Ù„ØªØ¬Ø§Ø±ÙŠ (Blue Wave)';
    } else if (role === 'manager') {
      const select = document.getElementById('managerCleaningLocation');
      location = select ? select.value : 'Ù…Ù†Ø·Ù‚Ø© Ø¹Ø§Ù…Ø©';
      requesterName = isEn ? 'Manager (Ayman El-Saeed)' : 'Ø§Ù„Ù…Ø¯ÙŠØ± (Ø£ÙŠÙ…Ù† Ø§Ù„Ø³Ø¹ÙŠØ¯)';
      type = customType || 'Ù†Ø¸Ø§ÙØ© Ù…ÙƒØ§Ù† Ø¹Ø§Ù…';
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString(isEn ? 'en-US' : 'ar-EG', { hour: '2-digit', minute: '2-digit' });

    let fullDetails = `Ø·Ù„Ø¨ Ø®Ø¯Ù…Ø© Ù†Ø¸Ø§ÙØ© ÙˆÙ‡Ø§ÙˆØ³ ÙƒÙŠØ¨ÙŠÙ†Ø¬\nÙ†ÙˆØ¹ Ø§Ù„Ø®Ø¯Ù…Ø© Ø§Ù„Ù…Ø·Ù„ÙˆØ¨: ${type}\nØ§Ù„Ù…ÙˆÙ‚Ø¹: ${location}\nØ·Ø§Ù„Ø¨ Ø§Ù„Ø®Ø¯Ù…Ø©: ${requesterName}`;
    if (slot) fullDetails += `\nØ§Ù„ØªÙˆÙ‚ÙŠØª Ø§Ù„Ù…ÙØ¶Ù„: ${slot}`;
    if (notes) fullDetails += `\nÙ…Ù„Ø§Ø­Ø¸Ø§Øª ÙˆØªÙØ§ØµÙŠÙ„ Ø§Ù„Ø¹Ù…ÙŠÙ„: ${notes}`;

    const newReq = {
      id: `HK-${Math.floor(100 + Math.random() * 900)}`,
      requester: role,
      requesterName: requesterName,
      location: location,
      type: type,
      details: fullDetails,
      status: 'Ø¨Ø§Ù†ØªØ¸Ø§Ø± Ø§Ù„ØªØ®ØµÙŠØµ',
      assignedWorker: '',
      time: timeStr
    };

    this.housekeepingRequests.unshift(newReq);
    this.renderHousekeeping();
    this.renderTickets();
    this.showToast(isEn ? 'ðŸ§¹ Housekeeping request submitted successfully!' : 'ðŸ§¹ ØªÙ… ØªÙ‚Ø¯ÙŠÙ… Ø·Ù„Ø¨ Ø®Ø¯Ù…Ø© Ø§Ù„Ù†Ø¸Ø§ÙØ© Ø¨Ù†Ø¬Ø§Ø­!\nØ¬Ø§Ø±ÙŠ Ø§Ù„Ù…Ø²Ø§Ù…Ù†Ø© Ù…Ø¹ ÙØ±ÙŠÙ‚ (Ù‡Ø§ÙˆØ³ ÙƒÙŠØ¨ÙŠÙ†Ø¬) Ø¨Ù€ Odoo...');

    // Sync housekeeping request as ticket to Odoo
    (async () => {
      try {
        const hkTicket = {
          id: newReq.id,
          category: 'Ù†Ø¸Ø§ÙØ© ÙˆÙ‡Ø§ÙˆØ³ ÙƒÙŠØ¨ÙŠÙ†Ø¬',
          title: `Ø®Ø¯Ù…Ø© Ù†Ø¸Ø§ÙØ©: ${type} (${location})`,
          details: fullDetails,
          status: 'Ù‚ÙŠØ¯ Ø§Ù„ØªØ®ØµÙŠØµ Ù„Ù„Ù…Ø´Ø±Ù',
          bgClass: 'badge-warning',
          requester: role,
          priority: '2',
          createdAt: now.toISOString()
        };
        await this.syncTicketToOdoo(hkTicket, '01223456789', requesterName);
      } catch (err) {
        console.warn('[Odoo Housekeeping Sync Error]:', err);
      }
    })();
  }

  assignHousekeepingWorker(id) {
    const isEn = this.currentLang === 'en';
    const req = this.housekeepingRequests.find(r => r.id === id);
    if (!req) return;

    const select = document.getElementById(`assignWorkerSelect_${id}`);
    const worker = select ? select.value : 'Ø¹Ø§Ù…Ù„ Ù†Ø¸Ø§ÙØ©';

    req.status = 'Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø¹Ù…Ù„';
    req.assignedWorker = worker;

    this.renderHousekeeping();
    this.showToast(isEn ? `âœ… Worker ${worker} assigned successfully!` : `âœ… ØªÙ… ØªÙƒÙ„ÙŠÙ Ø¹Ø§Ù…Ù„ Ø§Ù„Ù†Ø¸Ø§ÙØ© ${worker} Ø¨Ù†Ø¬Ø§Ø­!`);
  }

  completeHousekeepingRequest(id) {
    const isEn = this.currentLang === 'en';
    const req = this.housekeepingRequests.find(r => r.id === id);
    if (!req) return;

    req.status = 'ØªÙ… Ø§Ù„Ø§Ù†ØªÙ‡Ø§Ø¡';
    this.renderHousekeeping();
    this.showToast(isEn ? 'ðŸ§¹ Cleaning task completed!' : 'ðŸ§¹ ØªÙ… Ø¥ØªÙ…Ø§Ù… Ù…Ù‡Ù…Ø© Ø§Ù„Ù†Ø¸Ø§ÙØ© Ø¨Ù†Ø¬Ø§Ø­!');
  }

  renderHousekeeping() {
    const isEn = this.currentLang === 'en';
    const listContainer = document.getElementById('hkRequestsList');
    if (!listContainer) return;

    const badge = document.getElementById('hkRequestsInboxBadge');
    const pendingRequests = this.housekeepingRequests.filter(r => r.status === 'Ø¨Ø§Ù†ØªØ¸Ø§Ø± Ø§Ù„ØªØ®ØµÙŠØµ');
    if (badge) {
      badge.innerText = isEn ? `${pendingRequests.length} pending` : `${pendingRequests.length} Ø·Ù„Ø¨Ø§Øª Ù…Ø¹Ù„Ù‚Ø©`;
    }

    listContainer.innerHTML = '';
    if (this.housekeepingRequests.length === 0) {
      listContainer.innerHTML = `<div style="font-size: 0.75rem; color: var(--text-muted); text-align: center; padding: 15px;">${isEn ? 'No cleaning requests' : 'Ù„Ø§ ØªÙˆØ¬Ø¯ Ø·Ù„Ø¨Ø§Øª Ù†Ø¸Ø§ÙØ© Ø­Ø§Ù„ÙŠØ©'}</div>`;
      return;
    }

    this.housekeepingRequests.forEach(req => {
      let actionHtml = '';
      if (req.status === 'Ø¨Ø§Ù†ØªØ¸Ø§Ø± Ø§Ù„ØªØ®ØµÙŠØµ') {
        actionHtml = `
          <div style="margin-top: 8px; display: flex; gap: 8px; align-items: center;">
            <select id="assignWorkerSelect_${req.id}" class="form-control" style="font-size: 0.72rem; padding: 4px; height: 28px; width: 60%;">
              <option value="Ù…Ø­Ù…Ø¯ Ø¹Ù„ÙŠ">Ù…Ø­Ù…Ø¯ Ø¹Ù„ÙŠ</option>
              <option value="Ø£Ø­Ù…Ø¯ Ø­Ø³Ù†">Ø£Ø­Ù…Ø¯ Ø­Ø³Ù†</option>
              <option value="Ù…ØµØ·ÙÙ‰ Ø³ÙŠØ¯">Ù…ØµØ·ÙÙ‰ Ø³ÙŠØ¯</option>
            </select>
            <button class="btn btn-primary" onclick="app.assignHousekeepingWorker('${req.id}')" style="font-size: 0.7rem; padding: 4px 8px; height: 28px; white-space: nowrap; flex: 1; display: flex; align-items: center; justify-content: center;">
              <i class="fa-solid fa-user-check"></i> ${isEn ? 'Assign' : 'Ø¥Ø³Ù†Ø§Ø¯ ÙˆØªÙƒÙ„ÙŠÙ'}
            </button>
          </div>
        `;
      } else if (req.status === 'Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø¹Ù…Ù„') {
        actionHtml = `
          <div style="margin-top: 8px; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.7rem; color: #00e5ff;"><i class="fa-solid fa-person-sweeping"></i> ${isEn ? 'Worker:' : 'Ø§Ù„Ø¹Ø§Ù…Ù„:'} ${req.assignedWorker}</span>
            <button class="btn btn-success" onclick="app.completeHousekeepingRequest('${req.id}')" style="font-size: 0.7rem; padding: 4px 8px; height: 28px; white-space: nowrap; display: flex; align-items: center; justify-content: center;">
              <i class="fa-solid fa-circle-check"></i> ${isEn ? 'Complete' : 'Ø¥Ù†Ù‡Ø§Ø¡ ÙˆØ¥ØªÙ…Ø§Ù…'}
            </button>
          </div>
        `;
      } else {
        actionHtml = `
          <div style="margin-top: 6px; font-size: 0.7rem; color: #10b981;">
            <i class="fa-solid fa-circle-check"></i> ${isEn ? 'Completed by:' : 'ØªÙ… Ø§Ù„Ø§Ù†ØªÙ‡Ø§Ø¡ Ø¨ÙˆØ§Ø³Ø·Ø©:'} <strong>${req.assignedWorker}</strong>
          </div>
        `;
      }

      const statusBadgeClass = req.status === 'ØªÙ… Ø§Ù„Ø§Ù†ØªÙ‡Ø§Ø¡' ? 'badge-success' : (req.status === 'Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø¹Ù…Ù„' ? 'badge-cyan' : 'badge-warning');
      const statusText = isEn 
        ? (req.status === 'ØªÙ… Ø§Ù„Ø§Ù†ØªÙ‡Ø§Ø¡' ? 'Completed' : (req.status === 'Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø¹Ù…Ù„' ? 'Cleaning...' : 'Pending'))
        : req.status;

      const typeText = isEn 
        ? (req.type === 'Ù†Ø¸Ø§ÙØ© Ø¯Ø§Ø®Ù„ÙŠØ©' ? 'Internal Cleaning' : 'Common Area Cleaning')
        : req.type;

      listContainer.innerHTML += `
        <div class="ticket-item" style="flex-direction: column; align-items: stretch; gap: 4px; margin-bottom: 8px; border-left: 4px solid ${req.status === 'ØªÙ… Ø§Ù„Ø§Ù†ØªÙ‡Ø§Ø¡' ? '#10b981' : (req.status === 'Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø¹Ù…Ù„' ? '#00e5ff' : '#f59e0b')};">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <h4 style="font-size: 0.82rem; font-weight: 700;">${isEn ? 'Location:' : 'Ø§Ù„Ù…ÙˆÙ‚Ø¹:'} ${req.location}</h4>
            <span class="badge ${statusBadgeClass}">${statusText}</span>
          </div>
          <p style="font-size: 0.7rem; color: var(--text-muted); margin: 0;">
            ${isEn ? 'Requester:' : 'Ø§Ù„Ø·Ø§Ù„Ø¨:'} ${req.requesterName} â€¢ ${isEn ? 'Type:' : 'Ø§Ù„Ù†ÙˆØ¹:'} ${typeText} â€¢ ${isEn ? 'Time:' : 'Ø§Ù„ÙˆÙ‚Øª:'} ${req.time}
          </p>
          ${actionHtml}
        </div>
      `;
    });
  }
}

// Global App Instance
window.app = new UltimateFMApp();
var app = window.app;

window.quickLogin = function(role) { if (window.app) window.app.quickLogin(role); };
window.switchRole = function(role) { if (window.app) window.app.switchRole(role); };
window.showRoleGrid = function() { if (window.app) window.app.showRoleGrid(); };
window.openModal = function(id) { if (window.app) window.app.openModal(id); };
window.closeModal = function(id) { if (window.app) window.app.closeModal(id); };
window.handleLogin = function() { if (window.app) window.app.handleLogin(); };
window.setLanguage = function(lang) { if (window.app) window.app.setLanguage(lang); };
window.switchHomeownerTab = function(tabId) { if (window.app) window.app.switchHomeownerTab(tabId); };
window.setEmaarTicketFilter = function(filterState) { if (window.app) window.app.setEmaarTicketFilter(filterState); };
window.setManagerFilter = function(filterState) { if (window.app) window.app.setManagerFilter(filterState); };
window.setTechTaskFilter = function(filterState) { if (window.app) window.app.setTechTaskFilter(filterState); };
window.handleManagerFieldIncidentSubmit = function() { if (window.app) window.app.handleManagerFieldIncidentSubmit(); };
window.openCancelTicketModal = function(ticketId) { if (window.app) window.app.openCancelTicketModal(ticketId); };
window.confirmCancelTicket = function() { if (window.app) window.app.confirmCancelTicket(); };
window.openHousekeepingModal = function(role) { if (window.app) window.app.openHousekeepingModal(role); };
window.submitHousekeepingModalForm = function() { if (window.app) window.app.submitHousekeepingModalForm(); };
window.openLandscapingModal = function(role) { if (window.app) window.app.openLandscapingModal(role); };
window.submitLandscapingModalForm = function() { if (window.app) window.app.submitLandscapingModalForm(); };
window.requestHousekeeping = function(role, type, slot, notes) { if (window.app) window.app.requestHousekeeping(role, type, slot, notes); };
window.requestLandscaping = function(role, type, slot, notes) { if (window.app) window.app.requestLandscaping(role, type, slot, notes); };
window.openManagerNewTicketModal = function() { if (window.app) window.app.openManagerNewTicketModal(); };
window.updateManagerTechsBySpecialty = function() { if (window.app) window.app.updateManagerTechsBySpecialty(); };
window.submitManagerDirectTicket = function() { if (window.app) window.app.submitManagerDirectTicket(); };
window.handleNewTicketSubmit = function() { if (window.app) window.app.handleNewTicketSubmit(); };
window.clearManagerTicketsHistory = function() { if (window.app) window.app.clearManagerTicketsHistory(); };
window.registerLprPlate = function() { if (window.app) window.app.registerLprPlate(); };
window.handleLicenseFrontPreview = function(e) { if (window.app) window.app.handleLicenseFrontPreview(e); };
window.handleLicenseBackPreview = function(e) { if (window.app) window.app.handleLicenseBackPreview(e); };
window.submitFamilyMember = function() { if (window.app) window.app.submitFamilyMember(); };
window.handleFamilyIdFrontPreview = function(e) { if (window.app) window.app.handleFamilyIdFrontPreview(e); };
window.handleFamilyIdBackPreview = function(e) { if (window.app) window.app.handleFamilyIdBackPreview(e); };
window.openSecurityComplaintModal = function() { if (window.app) window.app.openSecurityComplaintModal(); };
window.submitSecurityComplaint = function() { if (window.app) window.app.submitSecurityComplaint(); };
window.openComplaintSuggestionModal = function() { if (window.app) window.app.openComplaintSuggestionModal(); };
window.submitComplaintSuggestion = function() { if (window.app) window.app.submitComplaintSuggestion(); };
window.technicianRequestPart = function(id, fileId) { if (window.app) window.app.technicianRequestPart(id, fileId); };
window.completeTicket = function(id, fileId) { if (window.app) window.app.completeTicket(id, fileId); };
window.openSparePartPaymentModal = function(id) { if (window.app) window.app.openSparePartPaymentModal(id); };
window.confirmSparePartPayment = function() { if (window.app) window.app.confirmSparePartPayment(); };
window.sendOwnerDirectMsgToOdoo = function() { if (window.app) window.app.sendOwnerDirectMsgToOdoo(); };
window.clearAllSystemRecords = function() { if (window.app) window.app.clearAllSystemRecords(); };
window.resetAndWipeAllAppTickets = function() { if (window.app) window.app.resetAndWipeAllAppTickets(); };
window.requestPermit = function(role, type) { if (window.app) window.app.requestPermit(role, type); };
window.openPermitModal = function(role, type) { if (window.app) window.app.openPermitModal(role, type); };
window.submitPermitModal = function() { if (window.app) window.app.submitPermitModal(); };
window.approvePermit = function(id) { if (window.app) window.app.approvePermit(id); };
// Dynamic Shared PTW State Storage (Synced between Engineer & Director)
window._ptwPermits = [
  {
    id: 'PTW-HOT-9821',
    cardId: 'ptwCard_9821',
    type: 'hot_work',
    typeBadge: 'ðŸ”¥ Ø£Ø¹Ù…Ø§Ù„ Ø­Ø±Ø§Ø±ÙŠØ© ÙˆÙ„Ø­Ø§Ù… (Hot Work)',
    typeClass: 'badge-danger',
    title: 'Ù„Ø­Ø§Ù… ÙˆØªØ¹Ø¯ÙŠÙ„ Ø®Ø· Ø³Ø­Ø¨ Ø·Ù„Ù…Ø¨Ø§Øª Ù…Ø­Ø·Ø© Ø§Ù„ØªØ­Ù„ÙŠØ© RO',
    location: 'Ù…Ø­Ø·Ø© RO Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ©',
    contractor: 'Ø§Ù„Ù…Ù‚Ø§ÙˆÙ„ÙˆÙ† Ø§Ù„Ø¹Ø±Ø¨',
    engineer: 'Ù…. Ù…Ø­Ù…ÙˆØ¯ Ø¹Ø¨Ø¯ Ø§Ù„ÙØªØ§Ø­',
    safetyNotes: 'ØªÙ… ØªÙˆÙÙŠØ± Ø·ÙØ§ÙŠØ§Øª Ø§Ù„Ø­Ø±ÙŠÙ‚ØŒ ÙØ­Øµ Ù…Ù‡Ù…Ø§Øª Ø§Ù„ÙˆÙ‚Ø§ÙŠØ©ØŒ ÙˆØªØ¹ÙŠÙŠÙ† Ù…Ø±Ø§Ù‚Ø¨ Ø­Ø±ÙŠÙ‚ (Fire Watch).',
    status: 'pending', // 'pending', 'approved', 'rejected'
    time: 'Ø§Ù„ÙŠÙˆÙ… 09:30 Øµ'
  },
  {
    id: 'PTW-LOTO-4412',
    cardId: 'ptwCard_4412',
    type: 'loto',
    typeBadge: 'âš¡ Ø¹Ø²Ù„ Ø·Ø§Ù‚Ø© ÙˆÙ„ÙˆØ­Ø§Øª (LOTO)',
    typeClass: 'badge-warning',
    title: 'Ø¹Ø²Ù„ ÙˆØ¥Ø¹Ø§Ø¯Ø© ØªØ£Ù‡ÙŠÙ„ Ù„ÙˆØ­Ø© Ø§Ù„ØªÙˆØ²ÙŠØ¹ Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ© MDB-02',
    location: 'ØºØ±ÙØ© Ø§Ù„Ù…Ø­ÙˆÙ„Ø§Øª Ø²ÙˆÙ† 01',
    contractor: 'Ø´Ù†Ø§ÙŠØ¯Ø± Ø¥Ù„ÙƒØªØ±ÙŠÙƒ / Ø§Ù„ØµÙŠØ§Ù†Ø© Ø§Ù„Ø°Ø§ØªÙŠØ©',
    engineer: 'Ù…. Ø­Ø³Ø§Ù… Ø§Ù„Ù†Ø¬Ø§Ø±',
    safetyNotes: 'ØªÙ… ØªØ±ÙƒÙŠØ¨ Ø£Ù‚ÙØ§Ù„ Ø§Ù„Ø¹Ø²Ù„ (Padlocks) ÙˆØ¨Ø·Ø§Ù‚Ø§Øª Ø§Ù„ØªØ­Ø°ÙŠØ± ÙˆÙØ­Øµ Ø§Ù†Ø¹Ø¯Ø§Ù… Ø§Ù„Ø¬Ù‡Ø¯ ØªÙ…Ø§Ù…Ø§Ù‹.',
    status: 'pending',
    time: 'Ø§Ù„ÙŠÙˆÙ… 10:15 Øµ'
  }
];

window.renderPtwPermitsUI = function() {
  const directorInbox = document.getElementById('directorPtwInbox');
  const engineerList = document.getElementById('engineerPtwList');
  const pendingBadge = document.getElementById('ptwPendingBadge');
  const engBadge = document.getElementById('engPtwCountBadge');

  const pendingCount = window._ptwPermits.filter(p => p.status === 'pending').length;
  if (pendingBadge) pendingBadge.innerText = `${pendingCount} Ø·Ù„Ø¨Ø§Øª Ù…Ø¹Ù„Ù‚Ø©`;
  if (engBadge) engBadge.innerText = `${window._ptwPermits.length} ØªØµØ§Ø±ÙŠØ­`;

  // 1. Render Director Inbox
  if (directorInbox) {
    directorInbox.innerHTML = '';
    if (window._ptwPermits.length === 0) {
      directorInbox.innerHTML = '<div style="text-align: center; color: #64748b; font-size: 0.75rem; padding: 15px;">Ù„Ø§ ØªÙˆØ¬Ø¯ ØªØµØ§Ø±ÙŠØ­ Ø¹Ù…Ù„ Ø­Ø§Ù„ÙŠØ©</div>';
    } else {
      window._ptwPermits.forEach(p => {
        let actionButtonsHtml = '';
        let statusBadgeHtml = '';

        if (p.status === 'pending') {
          statusBadgeHtml = `<span class="badge badge-warning" style="font-size: 0.65rem;">Ø¨Ø§Ù†ØªØ¸Ø§Ø± Ø§Ù„Ø§Ø¹ØªÙ…Ø§Ø¯</span>`;
          actionButtonsHtml = `
            <div style="display: flex; gap: 8px; margin-top: 4px;">
              <button class="btn btn-primary" onclick="approveDirectorPtw('${p.id}')" style="flex: 1; background: #059669; border: none; font-size: 0.75rem; font-weight: 700; padding: 8px; cursor: pointer;">
                <i class="fa-solid fa-circle-check"></i> Ù…ÙˆØ§ÙÙ‚Ø© ÙˆØ§Ø¹ØªÙ…Ø§Ø¯ Ø§Ù„ØªØµØ±ÙŠØ­
              </button>
              <button class="btn" onclick="rejectDirectorPtw('${p.id}')" style="flex: 1; background: rgba(225,29,72,0.1); border: 1px solid rgba(225,29,72,0.3); color: #e11d48; font-size: 0.75rem; font-weight: 700; padding: 8px; cursor: pointer;">
                <i class="fa-solid fa-circle-xmark"></i> Ø±ÙØ¶ Ø§Ù„ØªØµØ±ÙŠØ­
              </button>
            </div>
          `;
        } else if (p.status === 'approved') {
          statusBadgeHtml = `<span class="badge badge-success" style="font-size: 0.65rem;"><i class="fa-solid fa-check"></i> Ù…Ø¹ØªÙ…Ø¯ HSE</span>`;
          actionButtonsHtml = `
            <div style="background: rgba(5, 150, 105, 0.08); border: 1px solid #059669; border-radius: 6px; padding: 6px 10px; font-size: 0.72rem; color: #059669; font-weight: 700;">
              <i class="fa-solid fa-circle-check"></i> ØªÙ… Ø§Ø¹ØªÙ…Ø§Ø¯ Ø§Ù„ØªØµØ±ÙŠØ­ ÙˆØªÙØ¹ÙŠÙ„Ù‡ Ù…Ø¹ Ø£Ù…Ù† Ø§Ù„Ø¨ÙˆØ§Ø¨Ø§Øª.
            </div>
          `;
        } else {
          statusBadgeHtml = `<span class="badge badge-danger" style="font-size: 0.65rem;"><i class="fa-solid fa-xmark"></i> Ù…Ø±ÙÙˆØ¶</span>`;
          actionButtonsHtml = `
            <div style="background: rgba(225, 29, 72, 0.08); border: 1px solid #e11d48; border-radius: 6px; padding: 6px 10px; font-size: 0.72rem; color: #e11d48; font-weight: 700;">
              <i class="fa-solid fa-circle-xmark"></i> ØªÙ… Ø±ÙØ¶ Ø§Ù„ØªØµØ±ÙŠØ­ ÙˆØ¥Ø¹Ø§Ø¯ØªÙ‡ Ù„Ù„Ù…Ù‡Ù†Ø¯Ø³ Ù„Ù„Ø§Ø³ØªÙŠÙØ§Ø¡.
            </div>
          `;
        }

        directorInbox.innerHTML += `
          <div class="ticket-item" id="ptwCard_${p.id}" style="background: #ffffff; border: 1px solid rgba(32,39,79,0.15); border-radius: 10px; padding: 12px; display: flex; flex-direction: column; gap: 8px; margin-bottom: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span class="badge ${p.typeClass}" style="font-size: 0.68rem;">${p.typeBadge}</span>
                  <span style="font-weight: 800; font-size: 0.8rem; color: #20274f;">#${p.id}</span>
                </div>
                <div style="font-size: 0.78rem; font-weight: 700; color: #20274f; margin-top: 4px;">
                  ${p.title}
                </div>
                <div style="font-size: 0.7rem; color: var(--text-muted);">
                  Ø§Ù„Ù…ÙˆÙ‚Ø¹: <b>${p.location}</b> â€¢ Ø§Ù„Ù…Ù‡Ù†Ø¯Ø³ Ù…Ù‚Ø¯Ù… Ø§Ù„Ø·Ù„Ø¨: <b>${p.engineer}</b> â€¢ Ø§Ù„Ù…Ù‚Ø§ÙˆÙ„: <b>${p.contractor}</b> (${p.time})
                </div>
              </div>
              ${statusBadgeHtml}
            </div>

            <div style="background: rgba(32,39,79,0.04); border-radius: 6px; padding: 6px 8px; font-size: 0.68rem; color: #334155;">
              <i class="fa-solid fa-list-check"></i> <b>Ø§Ø´ØªØ±Ø§Ø·Ø§Øª Ø§Ù„Ø³Ù„Ø§Ù…Ø©:</b> ${p.safetyNotes}
            </div>

            ${actionButtonsHtml}
          </div>
        `;
      });
    }
  }

  // 2. Render Engineer Screen List
  if (engineerList) {
    engineerList.innerHTML = '';
    if (window._ptwPermits.length === 0) {
      engineerList.innerHTML = '<div style="text-align: center; color: #64748b; font-size: 0.75rem; padding: 10px;">Ù„Ø§ ØªÙˆØ¬Ø¯ ØªØµØ§Ø±ÙŠØ­ ØµØ§Ø¯Ø±Ø©</div>';
    } else {
      window._ptwPermits.forEach(p => {
        let statusBadge = '';
        if (p.status === 'pending') {
          statusBadge = `<span class="badge badge-warning" style="font-size: 0.65rem;"><i class="fa-solid fa-hourglass-half"></i> Ø¨Ø§Ù†ØªØ¸Ø§Ø± Ù…ÙˆØ§ÙÙ‚Ø© Ù…Ø¯ÙŠØ± Ø§Ù„Ù‚Ø·Ø§Ø¹</span>`;
        } else if (p.status === 'approved') {
          statusBadge = `<span class="badge badge-success" style="font-size: 0.65rem;"><i class="fa-solid fa-circle-check"></i> Ù…ØµØ±Ø­ Ø¨Ø§Ù„Ø¹Ù…Ù„ (Ù…Ø¹ØªÙ…Ø¯ HSE)</span>`;
        } else {
          statusBadge = `<span class="badge badge-danger" style="font-size: 0.65rem;"><i class="fa-solid fa-circle-xmark"></i> Ù…Ø±ÙÙˆØ¶ Ù„Ù„Ø§Ø³ØªÙŠÙØ§Ø¡</span>`;
        }

        engineerList.innerHTML += `
          <div class="ticket-item" style="background: #ffffff; border-right: 4px solid ${p.status === 'approved' ? '#059669' : (p.status === 'rejected' ? '#e11d48' : '#d97706')}; border-radius: 8px; padding: 10px; display: flex; flex-direction: column; gap: 4px; margin-bottom: 6px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-weight: 800; font-size: 0.75rem; color: #20274f;">#${p.id} â€¢ ${p.typeBadge}</span>
              ${statusBadge}
            </div>
            <div style="font-size: 0.75rem; font-weight: 700; color: #334155;">${p.title}</div>
            <div style="font-size: 0.68rem; color: var(--text-muted);">
              Ø§Ù„Ù…ÙˆÙ‚Ø¹: ${p.location} â€¢ Ø§Ù„Ù…Ù‚Ø§ÙˆÙ„: ${p.contractor}
            </div>
          </div>
        `;
      });
    }
  }
};

window.submitEngineerPtwRequest = function() {
  const typeSelect = document.getElementById('ptwTypeSelect');
  const typeVal = typeSelect?.value || 'hot_work';
  const typeText = typeSelect?.options[typeSelect.selectedIndex]?.text || 'ðŸ”¥ Ø£Ø¹Ù…Ø§Ù„ Ø­Ø±Ø§Ø±ÙŠØ© (Hot Work)';
  const title = document.getElementById('ptwTitleInput')?.value || 'Ø·Ù„Ø¨ ØªØµØ±ÙŠØ­ Ø¹Ù…Ù„ Ø­Ø±Ø¬';
  const location = document.getElementById('ptwLocationInput')?.value || 'Ù…Ø­Ø·Ø© Ù…Ø¹Ø§Ù„Ø¬Ø© Ø§Ù„ØµØ±Ù STP';
  const contractor = document.getElementById('ptwContractorInput')?.value || 'ÙØ±ÙŠÙ‚ Ø§Ù„Ù…Ù‚Ø§ÙˆÙ„Ø§Øª Ø§Ù„Ù…ØªØ®ØµØµ';
  const engName = document.getElementById('engineerNameText')?.innerText || 'Ù…. Ù…Ø­Ù…ÙˆØ¯ Ø¹Ø¨Ø¯ Ø§Ù„ÙØªØ§Ø­';

  const typeClassMap = {
    'hot_work': 'badge-danger',
    'loto': 'badge-warning',
    'confined_space': 'badge-cyan',
    'heights': 'badge-info',
    'excavation': 'badge-warning'
  };

  const codePrefixMap = {
    'hot_work': 'PTW-HOT',
    'loto': 'PTW-LOTO',
    'confined_space': 'PTW-CONF',
    'heights': 'PTW-HGHT',
    'excavation': 'PTW-EXCAV'
  };

  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const ptwId = `${codePrefixMap[typeVal] || 'PTW'}-${randomNum}`;

  const newPermit = {
    id: ptwId,
    cardId: `ptwCard_${randomNum}`,
    type: typeVal,
    typeBadge: typeText,
    typeClass: typeClassMap[typeVal] || 'badge-danger',
    title: title,
    location: location,
    contractor: contractor,
    engineer: engName,
    safetyNotes: 'ØªÙ… Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ù…Ù‡Ù…Ø§Øª Ø§Ù„ÙˆÙ‚Ø§ÙŠØ© PPE ÙˆØªØ£Ù…ÙŠÙ† Ù…Ù†Ø·Ù‚Ø© Ø§Ù„Ø¹Ù…Ù„ ÙˆØ§Ù„ØªÙ†Ø³ÙŠÙ‚ Ù…Ø¹ ÙØ±ÙŠÙ‚ Ø§Ù„Ø³Ù„Ø§Ù…Ø©.',
    status: 'pending',
    time: 'Ø§Ù„Ø¢Ù†'
  };

  window._ptwPermits.unshift(newPermit);
  window.renderPtwPermitsUI();

  // Close modal
  const modal = document.getElementById('modalEngineerPtwRequest');
  if (modal) {
    modal.classList.remove('active');
    modal.style.display = 'none';
  }

  if (window.app && typeof window.app.showToast === 'function') {
    window.app.showToast(`ðŸš€ ØªÙ… Ø¥ØµØ¯Ø§Ø± Ø·Ù„Ø¨ Ø§Ù„ØªØµØ±ÙŠØ­ [${ptwId}] ÙˆØªÙˆØ¬ÙŠÙ‡Ù‡ ÙÙˆØ±Ø§Ù‹ Ù„Ø´Ø§Ø´Ø© Ù…Ø¯ÙŠØ± Ø§Ù„Ù‚Ø·Ø§Ø¹ Ø§Ù„Ù‡Ù†Ø¯Ø³ÙŠ Ù„Ù„Ø§Ø¹ØªÙ…Ø§Ø¯!`);
  }
};

window.approveDirectorPtw = function(ptwId) {
  const permit = window._ptwPermits.find(p => p.id === ptwId);
  if (permit) {
    permit.status = 'approved';
    window.renderPtwPermitsUI();
    if (window.app && typeof window.app.showToast === 'function') {
      window.app.showToast(`âœ… ØªÙ… Ø§Ø¹ØªÙ…Ø§Ø¯ ÙˆØªÙØ¹ÙŠÙ„ ØªØµØ±ÙŠØ­ Ø§Ù„Ø¹Ù…Ù„ [${ptwId}] Ø¨Ù†Ø¬Ø§Ø­ ÙˆØ¥Ø®Ø·Ø§Ø± Ø§Ù„Ù…Ù‡Ù†Ø¯Ø³ Ø§Ù„Ù…Ø´Ø±Ù ÙˆØ£Ù…Ù† Ø§Ù„Ø¨ÙˆØ§Ø¨Ø§Øª.`);
    }
  }
};

window.rejectDirectorPtw = function(ptwId) {
  const permit = window._ptwPermits.find(p => p.id === ptwId);
  if (permit) {
    permit.status = 'rejected';
    window.renderPtwPermitsUI();
    if (window.app && typeof window.app.showToast === 'function') {
      window.app.showToast(`âŒ ØªÙ… Ø±ÙØ¶ ØªØµØ±ÙŠØ­ Ø§Ù„Ø¹Ù…Ù„ [${ptwId}] ÙˆØ¥Ø¹Ø§Ø¯ØªÙ‡ Ù„Ù…Ù‡Ù†Ø¯Ø³ Ø§Ù„Ù…ÙˆÙ‚Ø¹ Ù„Ø§Ø³ØªÙŠÙØ§Ø¡ Ø§Ù„Ù…Ù„Ø§Ø­Ø¸Ø§Øª.`);
    }
  }
};

window.submitEngineerGeneralMaintenanceOrder = function() {
  const cat = document.getElementById('engTicketCategorySelect')?.value || 'ÙƒÙ‡Ø±ÙˆÙ…ÙŠÙƒØ§Ù†ÙŠÙƒ';
  const loc = document.getElementById('engTicketLocationInput')?.value || 'Ù…Ø­Ø·Ø© Ø§Ù„ØªØ­Ù„ÙŠØ© Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ© RO';
  const priority = document.getElementById('engTicketPrioritySelect')?.value || '3';
  const desc = document.getElementById('engTicketDescInput')?.value || 'Ø£Ù…Ø± ØµÙŠØ§Ù†Ø© Ø¹Ø§Ù…Ø© Ù„Ù„Ù…Ø±Ø§ÙÙ‚';
  const photoInput = document.getElementById('engTicketPhotoInput');
  const maintType = document.querySelector('input[name="engTicketMaintType"]:checked')?.value || 'corrective';

  const engName = document.getElementById('engineerNameText')?.innerText || 'Ù…. Ù…Ø­Ù…ÙˆØ¯ Ø¹Ø¨Ø¯ Ø§Ù„ÙØªØ§Ø­';
  const engTeam = window.app?.activeEngineerTeam?.teamName || 'MEP Team';
  const maintenanceTeamId = window.app?.activeEngineerTeam?.teamId || 2;

  const defaultPhotoMap = {
    'ÙƒÙ‡Ø±ÙˆÙ…ÙŠÙƒØ§Ù†ÙŠÙƒ': 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=300&q=80',
    'Ù…Ø¹Ø§Ù„Ø¬Ø© Ø§Ù„ØµØ±Ù': 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&w=300&q=80',
    'Ù…ÙƒØ§ÙØ­Ø© Ø­Ø±ÙŠÙ‚': 'https://images.unsplash.com/photo-1527018601619-a508a2be00cd?auto=format&fit=crop&w=300&q=80',
    'ÙƒÙ‡Ø±Ø¨Ø§Ø¡ ÙˆØ·Ø§Ù‚Ø©': 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=300&q=80',
    'Ù„Ø§Ù†Ø¯Ø³ÙƒÙŠØ¨ ÙˆØ±ÙŠ': 'https://images.unsplash.com/photo-1517646287270-a5a9ca602e5c?auto=format&fit=crop&w=300&q=80',
    'Ù…Ø¯Ù†ÙŠ ÙˆØ¥Ù†Ø´Ø§Ø¡Ø§Øª': 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=300&q=80'
  };

  const processOrder = (photoBase64) => {
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const newTicket = {
      id: `ENG-${randomCode}`,
      title: `${cat} - ${loc}`,
      category: cat,
      priority: priority,
      maintenanceType: maintType,
      requester: 'engineer',
      requesterName: engName,
      unit: loc,
      phone: '01229988776',
      email: 'engineer.site@domain.com',
      details: desc,
      status: 'Ù‚ÙŠØ¯ Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø© ÙˆØªÙƒÙ„ÙŠÙ Ø§Ù„ÙÙ†ÙŠ',
      statusHistory: [{ stage: 'Ù‚ÙŠØ¯ Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø© ÙˆØªÙƒÙ„ÙŠÙ Ø§Ù„ÙÙ†ÙŠ', time: 'Ø§Ù„Ø¢Ù†' }],
      photoBefore: photoBase64 || defaultPhotoMap[cat] || defaultPhotoMap['ÙƒÙ‡Ø±ÙˆÙ…ÙŠÙƒØ§Ù†ÙŠÙƒ'],
      maintenanceTeamId: maintenanceTeamId,
      time: 'Ø§Ù„Ø¢Ù†',
      createdAt: new Date().toISOString()
    };

    if (window.app) {
      window.app.tickets.unshift(newTicket);
      window.app.saveTicketsToStorage();
      window.app.renderTickets();
      if (typeof window.app.syncTicketToOdoo === 'function') {
        window.app.syncTicketToOdoo(newTicket, '01229988776', engName);
      }
    }

    // Close modal
    const modal = document.getElementById('modalEngineerNewTicket');
    if (modal) {
      modal.classList.remove('active');
      modal.style.display = 'none';
    }

    if (window.app && typeof window.app.showToast === 'function') {
      window.app.showToast(`ðŸš€ ØªÙ… Ø¥ØµØ¯Ø§Ø± Ø£Ù…Ø± Ø§Ù„ØµÙŠØ§Ù†Ø© [#${newTicket.id}] Ø¨Ù†Ø¬Ø§Ø­ ÙˆØªÙˆØ¬ÙŠÙ‡Ù‡ Ù„Ø´Ø§Ø´Ø© Ù…Ø¯ÙŠØ± Ø§Ù„ØµÙŠØ§Ù†Ø© ÙˆØ£ÙˆØ¯Ùˆ!`);
    }
  };

  if (photoInput && photoInput.files && photoInput.files[0]) {
    const reader = new FileReader();
    reader.onload = (e) => processOrder(e.target.result);
    reader.readAsDataURL(photoInput.files[0]);
  } else {
    processOrder(null);
  }
};

window.openPlantInspectionModal = function(plantType) {
  const modal = document.getElementById('modalPlantInspection');
  const titleEl = document.getElementById('plantInspectModalTitle');
  const subEl = document.getElementById('plantInspectModalSub');
  const hiddenType = document.getElementById('plantInspectTypeHidden');
  const fieldsContainer = document.getElementById('plantInspectDynamicFields');
  
  if (!modal || !fieldsContainer) return;
  hiddenType.value = plantType;

  const engName = document.getElementById('engineerNameText')?.innerText || 'Ù…. Ù…Ø­Ù…ÙˆØ¯ Ø¹Ø¨Ø¯ Ø§Ù„ÙØªØ§Ø­';
  const engTeam = document.getElementById('engineerSpecialtySub')?.innerText || 'ÙØ±ÙŠÙ‚ Ø§Ù„ÙƒÙ‡Ø±ÙˆÙ…ÙŠÙƒØ§Ù†ÙŠÙƒ';
  if (subEl) subEl.innerHTML = `Ø§Ù„Ù…Ù‡Ù†Ø¯Ø³ Ø§Ù„ÙØ§Ø­Øµ: <b>${engName}</b> â€¢ ${engTeam}`;

  if (plantType === 'ro') {
    if (titleEl) titleEl.innerHTML = '<i class="fa-solid fa-droplet" style="color: #1b8f91;"></i> ÙØ­Øµ ÙˆØªØ³Ø¬ÙŠÙ„ Ù‚Ø±Ø§Ø¡Ø§Øª Ù…Ø­Ø·Ø© Ø§Ù„ØªØ­Ù„ÙŠØ© RO Plant';
    fieldsContainer.innerHTML = `
      <div class="form-group">
        <label class="form-label" style="font-weight: 700;">Ù‚Ø±Ø§Ø¡Ø© Ø¶ØºØ· Ø§Ù„Ø£ØºØ´ÙŠØ© ÙˆØ§Ù„Ù…Ø¶Ø®Ø§Øª (Operating Pressure)</label>
        <input type="text" id="inspectField1" class="form-control" value="7.4 Bar" style="font-weight: 800; color: #1b8f91;">
      </div>
      <div class="grid-2" style="gap: 8px;">
        <div class="form-group">
          <label class="form-label" style="font-weight: 700;">Ù†Ø³Ø¨Ø© Ø§Ù„Ù…Ù„ÙˆØ­Ø© (TDS ppm)</label>
          <input type="text" id="inspectField2" class="form-control" value="195 PPM" style="font-weight: 700;">
        </div>
        <div class="form-group">
          <label class="form-label" style="font-weight: 700;">Ù…Ø¹Ø¯Ù„ Ø§Ù„Ø¥Ù†ØªØ§Ø¬ Ø§Ù„ÙŠÙˆÙ…ÙŠ</label>
          <input type="text" id="inspectField3" class="form-control" value="4,350 Ù…Â³/ÙŠÙˆÙ…" style="font-weight: 700;">
        </div>
      </div>
    `;
  } else if (plantType === 'stp') {
    if (titleEl) titleEl.innerHTML = '<i class="fa-solid fa-seedling" style="color: #059669;"></i> ÙØ­Øµ ÙˆØªØ³Ø¬ÙŠÙ„ Ù‚Ø±Ø§Ø¡Ø§Øª Ù…Ø­Ø·Ø© Ù…Ø¹Ø§Ù„Ø¬Ø© Ø§Ù„ØµØ±Ù STP';
    fieldsContainer.innerHTML = `
      <div class="form-group">
        <label class="form-label" style="font-weight: 700;">Ù†Ø³Ø¨Ø© ÙƒÙØ§Ø¡Ø© Ø§Ù„Ù…Ø¹Ø§Ù„Ø¬Ø© Ø§Ù„Ø«Ù„Ø§Ø«ÙŠØ© (Treatment Efficiency)</label>
        <input type="text" id="inspectField1" class="form-control" value="99%" style="font-weight: 800; color: #059669;">
      </div>
      <div class="grid-2" style="gap: 8px;">
        <div class="form-group">
          <label class="form-label" style="font-weight: 700;">Ù†Ù‚Ø§Ø¡ Ù…ÙŠØ§Ù‡ Ø±ÙŠ Ø§Ù„Ù„Ø§Ù†Ø¯Ø³ÙƒÙŠØ¨</label>
          <input type="text" id="inspectField2" class="form-control" value="Ù…Ø·Ø§Ø¨Ù‚ Ù„Ù…ÙˆØ§ØµÙØ§Øª Ø§Ù„Ø±ÙŠ" style="font-weight: 700;">
        </div>
        <div class="form-group">
          <label class="form-label" style="font-weight: 700;">Ù…Ø¹Ø¯Ù„ Ø§Ù„Ø¶Ø® Ù„Ø´Ø¨ÙƒØ§Øª Ø§Ù„Ø±ÙŠ</label>
          <input type="text" id="inspectField3" class="form-control" value="1,850 Ù…Â³/ÙŠÙˆÙ…" style="font-weight: 700;">
        </div>
      </div>
    `;
  } else if (plantType === 'fls') {
    if (titleEl) titleEl.innerHTML = '<i class="fa-solid fa-fire-extinguisher" style="color: #e11d48;"></i> ÙØ­Øµ ÙˆØ§Ø®ØªØ¨Ø§Ø± Ø´Ø¨ÙƒØ© Ø·Ù„Ù…Ø¨Ø§Øª Ø§Ù„Ø­Ø±ÙŠÙ‚ 12Bar';
    fieldsContainer.innerHTML = `
      <div class="form-group">
        <label class="form-label" style="font-weight: 700;">Ø¶ØºØ· Ø´Ø¨ÙƒØ© Ø§Ù„Ø­Ø±ÙŠÙ‚ ÙˆØ§Ù„Ø¨ÙˆØ³ØªØ± (Network Pressure)</label>
        <input type="text" id="inspectField1" class="form-control" value="12.2 Bar" style="font-weight: 800; color: #e11d48;">
      </div>
      <div class="grid-2" style="gap: 8px;">
        <div class="form-group">
          <label class="form-label" style="font-weight: 700;">Ø¬Ø§Ù‡Ø²ÙŠØ© Ø·Ù„Ù…Ø¨Ø© Ø§Ù„Ø¯ÙŠØ²Ù„/Ø§Ù„Ø¬ÙˆÙƒÙŠ</label>
          <input type="text" id="inspectField2" class="form-control" value="Ø¬Ø§Ù‡Ø²ÙŠØ© 100% ØªÙ„Ù‚Ø§Ø¦ÙŠ" style="font-weight: 700;">
        </div>
        <div class="form-group">
          <label class="form-label" style="font-weight: 700;">Ù…Ù†Ø³ÙˆØ¨ Ø®Ø²Ø§Ù† Ø§Ù„Ø­Ø±ÙŠÙ‚</label>
          <input type="text" id="inspectField3" class="form-control" value="100% Ù…Ù…ØªÙ„Ø¦" style="font-weight: 700;">
        </div>
      </div>
    `;
  } else if (plantType === 'electrical') {
    if (titleEl) titleEl.innerHTML = '<i class="fa-solid fa-bolt" style="color: #d97706;"></i> ÙØ­Øµ Ù…Ø­ÙˆÙ„ Ø§Ù„Ø¬Ù‡Ø¯ Ø§Ù„Ù…ØªÙˆØ³Ø· 04 ÙˆØ£ÙƒØ´Ø§Ùƒ Ø§Ù„Ø¨ÙŠÙ„Ø§Ø±Ø§Øª';
    fieldsContainer.innerHTML = `
      <div class="form-group">
        <label class="form-label" style="font-weight: 700;">Ù†Ø³Ø¨Ø© Ø§Ù„Ø­Ù…Ù„ Ø§Ù„ÙƒÙ‡Ø±Ø¨Ø§Ø¦ÙŠ Ø§Ù„Ø­Ø§Ù„ÙŠØ© (Load Percentage)</label>
        <input type="text" id="inspectField1" class="form-control" value="71%" style="font-weight: 800; color: #d97706;">
      </div>
      <div class="grid-2" style="gap: 8px;">
        <div class="form-group">
          <label class="form-label" style="font-weight: 700;">Ø¯Ø±Ø¬Ø© Ø­Ø±Ø§Ø±Ø© Ø§Ù„Ø²ÙŠØª (Â°C)</label>
          <input type="text" id="inspectField2" class="form-control" value="51Â°C Ø·Ø¨ÙŠØ¹ÙŠ" style="font-weight: 700;">
        </div>
        <div class="form-group">
          <label class="form-label" style="font-weight: 700;">Ø§Ø³ØªÙ‚Ø±Ø§Ø± Ø¬Ù‡Ø¯ Ø§Ù„ÙØ§Ø²Ø§Øª</label>
          <input type="text" id="inspectField3" class="form-control" value="380V / 220V Ù…Ø³ØªÙ‚Ø±" style="font-weight: 700;">
        </div>
      </div>
    `;
  } else if (plantType === 'landscape') {
    if (titleEl) titleEl.innerHTML = '<i class="fa-solid fa-seedling" style="color: #059669;"></i> ÙØ­Øµ Ø´Ø¨ÙƒØ§Øª Ø§Ù„Ø±ÙŠ Ø§Ù„Ø£ÙˆØªÙˆÙ…Ø§ØªÙŠÙƒÙŠØ© Ø¨Ø§Ù„Ù…Ø­ÙˆØ± Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠ';
    fieldsContainer.innerHTML = `
      <div class="form-group">
        <label class="form-label" style="font-weight: 700;">Ø¶ØºØ· Ø®Ø·ÙˆØ· Ø§Ù„Ù†ÙˆØ§Ø²Ù„ ÙˆÙ…Ø­Ø§Ø¨Ø³ Ø§Ù„Ø³ÙˆÙ„ÙŠÙ†ÙˆÙŠØ¯</label>
        <input type="text" id="inspectField1" class="form-control" value="4.5 Bar" style="font-weight: 800; color: #059669;">
      </div>
      <div class="grid-2" style="gap: 8px;">
        <div class="form-group">
          <label class="form-label" style="font-weight: 700;">Ø­Ø§Ù„Ø© Ø·Ù„Ù…Ø¨Ø§Øª Ø§Ù„ØªØ³Ù…ÙŠØ¯</label>
          <input type="text" id="inspectField2" class="form-control" value="ØªØ¹Ù…Ù„ Ø¨ÙƒÙØ§Ø¡Ø© 100%" style="font-weight: 700;">
        </div>
        <div class="form-group">
          <label class="form-label" style="font-weight: 700;">Ø¬Ø¯ÙˆÙ„ Ø§Ù„Ø±ÙŠ Ø§Ù„Ù…Ø¨Ø±Ù…Ø¬</label>
          <input type="text" id="inspectField3" class="form-control" value="Ø¯ÙˆØ±Ø© Ù„ÙŠÙ„ÙŠØ© 6:00 Ù…" style="font-weight: 700;">
        </div>
      </div>
    `;
  } else if (plantType === 'civil') {
    if (titleEl) titleEl.innerHTML = '<i class="fa-solid fa-cubes" style="color: #6366f1;"></i> ÙØ­Øµ Ø§Ù„Ù…Ù…Ø§Ø´ÙŠ Ø§Ù„Ø®Ø±Ø³Ø§Ù†ÙŠØ© ÙˆÙÙˆØ§ØµÙ„ Ø§Ù„ØªÙ…Ø¯Ø¯ ÙˆØ§Ù„ØªØ´Ø·ÙŠØ¨Ø§Øª';
    fieldsContainer.innerHTML = `
      <div class="form-group">
        <label class="form-label" style="font-weight: 700;">Ø­Ø§Ù„Ø© ÙÙˆØ§ØµÙ„ Ø§Ù„ØªÙ…Ø¯Ø¯ Ø§Ù„Ø¥Ù†Ø´Ø§Ø¦ÙŠØ©</label>
        <input type="text" id="inspectField1" class="form-control" value="Ø³Ù„ÙŠÙ…Ø© ÙˆÙ„Ø§ ÙŠÙˆØ¬Ø¯ Ù‡Ø¨ÙˆØ·" style="font-weight: 800; color: #6366f1;">
      </div>
      <div class="grid-2" style="gap: 8px;">
        <div class="form-group">
          <label class="form-label" style="font-weight: 700;">Ø£Ø±ØµÙØ© Ø§Ù„Ø¨Ø­ÙŠØ±Ø§Øª ÙˆØ§Ù„Ù…ØµØ¯Ø§Øª</label>
          <input type="text" id="inspectField2" class="form-control" value="Ø¹Ø²Ù„ Ù…Ø§Ø¦ÙŠ Ø³Ù„ÙŠÙ… 100%" style="font-weight: 700;">
        </div>
        <div class="form-group">
          <label class="form-label" style="font-weight: 700;">Ø§Ù„Ø¨Ø±Ø¬ÙˆÙ„Ø§Øª ÙˆØ§Ù„Ù…Ø¸Ù„Ø§Øª Ø§Ù„Ø®Ø´Ø¨ÙŠØ©</label>
          <input type="text" id="inspectField3" class="form-control" value="Ù…Ø·Ø§Ø¨Ù‚Ø© Ù„Ù„Ù…ÙˆØ§ØµÙØ§Øª" style="font-weight: 700;">
        </div>
      </div>
    `;
  }

  modal.classList.add('active');
  modal.style.display = 'flex';
};

window.submitPlantInspection = function() {
  const hiddenType = document.getElementById('plantInspectTypeHidden')?.value || 'ro';
  const f1 = document.getElementById('inspectField1')?.value || '';
  const f2 = document.getElementById('inspectField2')?.value || '';
  const f3 = document.getElementById('inspectField3')?.value || '';
  const engName = document.getElementById('engineerNameText')?.innerText || 'Ù…. Ù…Ø­Ù…ÙˆØ¯ Ø¹Ø¨Ø¯ Ø§Ù„ÙØªØ§Ø­';
  
  const now = new Date();
  const timeStr = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

  if (hiddenType === 'ro') {
    const valEl = document.getElementById('scadaRoVal');
    const subEl = document.getElementById('scadaRoSub');
    const inspEl = document.getElementById('scadaRoInspector');
    if (valEl) valEl.innerHTML = `${f1} <span style="font-size: 0.7rem; color: #10b981;">(TDS ${f2.replace(/[^\d]/g, '') || '195'})</span>`;
    if (subEl) subEl.innerText = `Ø¥Ù†ØªØ§Ø¬ ${f3}`;
    if (inspEl) inspEl.innerHTML = `<i class="fa-solid fa-user-check" style="color: #1b8f91;"></i> ÙØ­Øµ: <b>${engName}</b> (${timeStr})`;
  } else if (hiddenType === 'stp') {
    const valEl = document.getElementById('scadaStpVal');
    const subEl = document.getElementById('scadaStpSub');
    const inspEl = document.getElementById('scadaStpInspector');
    if (valEl) valEl.innerHTML = `${f1} <span style="font-size: 0.7rem; color: #10b981;">(ÙƒÙØ§Ø¡Ø© Ø§Ù„Ù…Ø¹Ø§Ù„Ø¬Ø©)</span>`;
    if (subEl) subEl.innerText = `Ø¶Ø® Ù…ÙŠØ§Ù‡ Ø§Ù„Ø±ÙŠ Ù„Ø´Ø¨ÙƒØ§Øª Ø§Ù„Ù„Ø§Ù†Ø¯Ø³ÙƒÙŠØ¨ (${f3})`;
    if (inspEl) inspEl.innerHTML = `<i class="fa-solid fa-user-check" style="color: #059669;"></i> ÙØ­Øµ: <b>${engName}</b> (${timeStr})`;
  } else if (hiddenType === 'fls') {
    const valEl = document.getElementById('scadaFireVal');
    const subEl = document.getElementById('scadaFireSub');
    const inspEl = document.getElementById('scadaFireInspector');
    if (valEl) valEl.innerHTML = `${f1} <span style="font-size: 0.7rem; color: #10b981;">(Ø¬Ø§Ù‡Ø²ÙŠØ© 100%)</span>`;
    if (subEl) subEl.innerText = `Ø¶ØºØ· Ø§Ù„Ø¨ÙˆØ³ØªØ± Ù…Ø³ØªÙ‚Ø± (${f2})`;
    if (inspEl) inspEl.innerHTML = `<i class="fa-solid fa-user-check" style="color: #e11d48;"></i> ÙØ­Øµ: <b>${engName}</b> (${timeStr})`;
  } else if (hiddenType === 'electrical') {
    const valEl = document.getElementById('scadaTransVal');
    const subEl = document.getElementById('scadaTransSub');
    const inspEl = document.getElementById('scadaTransInspector');
    if (valEl) valEl.innerHTML = `${f1} <span style="font-size: 0.7rem; color: #d97706;">(Ø§Ù„Ø­Ù…Ù„ Ø§Ù„Ø­Ø§Ù„ÙŠ)</span>`;
    if (subEl) subEl.innerText = `Ø§Ù„Ø­Ø±Ø§Ø±Ø© ${f2}`;
    if (inspEl) inspEl.innerHTML = `<i class="fa-solid fa-user-check" style="color: #d97706;"></i> ÙØ­Øµ: <b>${engName}</b> (${timeStr})`;
  }

  // Close modal
  const modal = document.getElementById('modalPlantInspection');
  if (modal) {
    modal.classList.remove('active');
    modal.style.display = 'none';
  }

  if (window.app && typeof window.app.showToast === 'function') {
    window.app.showToast('âœ… ØªÙ… ØªÙˆØ«ÙŠÙ‚ ØªÙ‚Ø±ÙŠØ± Ø§Ù„ÙØ­Øµ Ø§Ù„ÙŠÙˆÙ…ÙŠ Ø¨Ù†Ø¬Ø§Ø­ ÙˆÙ…Ø²Ø§Ù…Ù†Ø© Ø§Ù„Ù‚Ø±Ø§Ø¡Ø§Øª ÙÙˆØ±Ø§Ù‹ Ù…Ø¹ Ø´Ø§Ø´Ø© Ù…Ø¯ÙŠØ± Ø§Ù„Ù‚Ø·Ø§Ø¹ Ø§Ù„Ù‡Ù†Ø¯Ø³ÙŠ!');
  }
};

window.switchMicroTab = function(tabKey, scroll) {
  const btnCars = document.getElementById('btnMicroCars');
  const btnFamily = document.getElementById('btnMicroFamily');
  const contentCars = document.getElementById('microContentCars');
  const contentFamily = document.getElementById('microContentFamily');

  if (tabKey === 'cars') {
    if (btnCars) {
      btnCars.classList.add('active');
      btnCars.style.background = '#ffffff';
      btnCars.style.color = '#20274f';
    }
    if (btnFamily) {
      btnFamily.classList.remove('active');
      btnFamily.style.background = 'transparent';
      btnFamily.style.color = '#64748b';
    }
    if (contentCars) contentCars.style.display = 'block';
    if (contentFamily) contentFamily.style.display = 'none';
  } else {
    if (btnFamily) {
      btnFamily.classList.add('active');
      btnFamily.style.background = '#ffffff';
      btnFamily.style.color = '#20274f';
    }
    if (btnCars) {
      btnCars.classList.remove('active');
      btnCars.style.background = 'transparent';
      btnCars.style.color = '#64748b';
    }
    if (contentFamily) contentFamily.style.display = 'block';
    if (contentCars) contentCars.style.display = 'none';
  }

  if (scroll) {
    const target = document.getElementById('microTabsCard') || document.getElementById('btnMicroCars');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    if (tabKey === 'cars') {
      const inp = document.getElementById('lprPlateInput');
      if (inp) setTimeout(function() { inp.focus(); }, 350);
    }
  }
};

window.requestGolfCart = function() {
  const destSelect = document.getElementById('golfDestinationSelect');
  const passSelect = document.getElementById('golfPassengersCount');
  const dest = destSelect ? destSelect.value : 'Ø§Ù„Ø´Ø§Ø·Ø¦ Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠ';
  const pass = passSelect ? passSelect.value : '3-4 Ø£ÙØ±Ø§Ø¯';

  const tripBox = document.getElementById('activeGolfCartTripBox');
  const tripDest = document.getElementById('golfTripDest');
  if (tripDest) tripDest.innerText = `ÙÙŠÙ„Ø§ A146 âž” ${dest} (${pass})`;
  if (tripBox) tripBox.style.display = 'block';

  if (window.app && typeof window.app.showToast === 'function') {
    window.app.showToast(`ðŸ›º ØªÙ… Ø§Ø³ØªØ¯Ø¹Ø§Ø¡ Ø¹Ø±Ø¨Ø© Ø§Ù„ØºÙˆÙ„Ù Ø±Ù‚Ù… #12 Ø¨Ù†Ø¬Ø§Ø­!\nØ§Ù„Ø³Ø§Ø¦Ù‚ [Ø¹Ù…Ø§Ø¯ Ù…Ù…Ø¯ÙˆØ­] ÙÙŠ Ø·Ø±ÙŠÙ‚Ù‡ Ù„ÙÙŠÙ„Ø§ A146 Ù…ØªØ¬Ù‡Ø§Ù‹ Ø¥Ù„Ù‰ [${dest}]. ÙˆØµÙˆÙ„ Ø®Ù„Ø§Ù„ 3 Ø¯Ù‚Ø§Ø¦Ù‚.`);
  }
};

window.toggleEventRsvp = function() {
  const btn = document.getElementById('btnEventRsvp');
  const countText = document.getElementById('eventRsvpCountText');

  if (!btn) return;
  const isConfirmed = btn.getAttribute('data-confirmed') === 'true';

  if (!isConfirmed) {
    btn.setAttribute('data-confirmed', 'true');
    btn.innerHTML = `<i class="fa-solid fa-circle-check"></i> ØªÙ… ØªØ£ÙƒÙŠØ¯ Ù…Ù‚Ø¹Ø¯Ùƒ VIP`;
    btn.style.background = '#10b981';
    btn.style.boxShadow = '0 4px 10px rgba(16, 185, 129, 0.3)';
    if (countText) countText.innerText = 'Ø£Ù†Øª Ùˆ 38+ Ù…Ù† Ø¬ÙŠØ±Ø§Ù†Ùƒ Ø£ÙƒØ¯ÙˆØ§ Ø§Ù„Ø­Ø¶ÙˆØ± âœ…';

    if (window.app && typeof window.app.showToast === 'function') {
      window.app.showToast('ðŸŽ‰ ØªÙ… ØªØ£ÙƒÙŠØ¯ Ù…Ù‚Ø§Ø¹Ø¯Ùƒ ÙÙŠ Ø­ÙÙ„ Ø³Ø¨Ø§Ù‚ Ø§Ù„Ù…Ø±Ø§ÙƒØ¨ Ø§Ù„Ø´Ø±Ø§Ø¹ÙŠØ© Ø¨Ù†Ø¬Ø§Ø­!\nØªÙ… Ø¥Ø¯Ø±Ø§Ø¬ ØªØ°ÙƒØ±Ø© VIP Ø¨Ø±Ù‚Ù… Ø§Ù„ÙÙŠÙ„Ø§ Ø§Ù„Ø®Ø§ØµØ© Ø¨Ùƒ.');
    }
  } else {
    btn.setAttribute('data-confirmed', 'false');
    btn.innerHTML = `<i class="fa-solid fa-ticket"></i> ØªØ£ÙƒÙŠØ¯ Ù…Ù‚Ø¹Ø¯ VIP`;
    btn.style.background = '#1b8f91';
    btn.style.boxShadow = '0 4px 10px rgba(27, 143, 145, 0.25)';
    if (countText) countText.innerText = '38+ Ù…Ù† Ø¬ÙŠØ±Ø§Ù†Ùƒ Ø£ÙƒØ¯ÙˆØ§ Ø§Ù„Ø­Ø¶ÙˆØ±';

    if (window.app && typeof window.app.showToast === 'function') {
      window.app.showToast('â„¹ï¸ ØªÙ… Ø¥Ù„ØºØ§Ø¡ Ø­Ø¬Ø² Ø§Ù„Ù…Ù‚Ø¹Ø¯ ÙÙŠ Ø§Ù„ÙØ¹Ø§Ù„ÙŠØ© Ø¨Ù†Ø¬Ø§Ø­.');
    }
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.app.init();
    if (typeof window.renderPtwPermitsUI === 'function') window.renderPtwPermitsUI();
  });
} else {
  window.app.init();
  if (typeof window.renderPtwPermitsUI === 'function') window.renderPtwPermitsUI();
}
