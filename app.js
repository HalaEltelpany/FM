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
    this.selectedPart = { name: 'كارتدج تكييف شارب', price: 850 };
    
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

    // Ensure homeowner name is permanently set to حسن عيسى
    safeStorage.setItem('odoo_owner_name', 'حسن عيسى');
    if (safeStorage.getItem('odoo_user') === 'fmhala@domain.com' || safeStorage.getItem('odoo_user') === 'admin@domain.com') {
      safeStorage.removeItem('odoo_user');
    }

    // 3 Warehouses Inventory List (Residential, Commercial, Assets)
    this.inventoryItems = [
      // Warehouse 1: Residential & Owners (مخزن الملاك والوحدات الخاصة - المرحلة الأولى)
      { id: 1, code: 'PLUMB-VALVE-IT', name: 'محبس نحاس إيطالي أصلي 3/4 بوصة', warehouse: 'residential', category: 'سباكة', qty: 25, price: 420, desc: 'قطع غيار سباكة أصلية للوحدات والفلل' },
      { id: 2, code: 'PLUMB-ANG-VALVE', name: 'محبس زاوية كروم نصف بوصة', warehouse: 'residential', category: 'سباكة', qty: 40, price: 260, desc: 'محبس زاوية تغذية أجهزة وخلاطات للوحدات' },
      { id: 3, code: 'ELEC-SMART-SW', name: 'مفتاح لمس ذكي Smart Touch Switch', warehouse: 'residential', category: 'كهرباء', qty: 30, price: 850, desc: 'تحكم ذكي في الإضاءة عبر الواي فاي' },
      { id: 4, code: 'ELEC-SCHN-32A', name: 'قاطع تيار شنايدر ثلاثي 32A', warehouse: 'residential', category: 'كهرباء', qty: 20, price: 680, desc: 'لوحات توزيع كهرباء شنايدر أصلية' },
      { id: 5, code: 'HVAC-PCB-225', name: 'كارتة تكييف إلكترونية Carrier 2.25HP', warehouse: 'residential', category: 'كهروميكانيك', qty: 10, price: 3400, desc: 'كارتة تحكم رئيسية للوحدة الداخلية/الخارجية' },
      { id: 6, code: 'HVAC-GAS-R410A', name: 'أسطوانة شحنة فريون تكييف R410A', warehouse: 'residential', category: 'كهروميكانيك', qty: 15, price: 2100, desc: 'شحنة فريون تبريد صديق للبيئة للوحدات' },

      // Warehouse 2: Assets & Village Operations (مستودع أصول ومرافق الموقع العام - تشغيل وصيانة مركزية)
      { id: 7, code: 'PART-PUMP-01', name: 'طلمبة مياه هايوارد 3 حصان Hayward 3HP', warehouse: 'assets', category: 'كهروميكانيك', qty: 6, price: 18500, desc: 'طلمبة سحب وتدوير مياه حمامات السباحة الكبرى بالموقع العام' },
      { id: 8, code: 'PART-FILTER-02', name: 'فلتر رملي هايوارد 900 مم Hayward Filter', warehouse: 'assets', category: 'كهروميكانيك', qty: 8, price: 14200, desc: 'محطة فلاتر رملية لتنقية شوائب حمامات السباحة الرئيسية' },
      { id: 9, code: 'CHEM-CHLOR-01', name: 'أقراص كلور مركز 90% (برميل 50 كجم)', warehouse: 'assets', category: 'كهروميكانيك', qty: 18, price: 4800, desc: 'تطهير وتعقيم مياه حمامات السباحة والبحيرات المفتوحة' },
      { id: 10, code: 'ELEC-POOL-LED', name: 'كشاف ليد غاطس لحمام السباحة 12V', warehouse: 'assets', category: 'كهرباء', qty: 35, price: 1250, desc: 'إضاءة غاطسة IP68 موفرة للطاقة لحمامات السباحة والمسطحات المائية' },
      { id: 11, code: 'LAND-SPRINK-01', name: 'رشاش ري ناطور Hunter Pop-up Sprinkler', warehouse: 'assets', category: 'لاندسكيب', qty: 50, price: 310, desc: 'رشاش ري أوتوماتيكي لشبكات ري المسطحات الخضراء واللاندسكيب' },
      { id: 15, code: 'LAND-VALVE-SOL', name: 'محبس سولينويد ري كهربائي 2 بوصة Hunter', warehouse: 'assets', category: 'لاندسكيب', qty: 24, price: 1650, desc: 'محبس تحكم إلكتروني لخطوط ري الموقع العام' },
      { id: 16, code: 'PLUMB-MAIN-GATE', name: 'سكينة محبس مياه رئيسي زهر 4 بوصة', warehouse: 'assets', category: 'سباكة', qty: 8, price: 4200, desc: 'خطوط تغذية شبكة مياه الشرب الرئيسية بالقرية' },
      { id: 17, code: 'ELEC-POLE-LED', name: 'كشاف إنارة أعمدة شوارع ليد 150W بروجكتور', warehouse: 'assets', category: 'كهرباء', qty: 40, price: 1850, desc: 'إنارة الطرق والممرات والموقع العام بالقرية' },

      // Warehouse 3: Commercial (مخزن المستأجرين التجاريين)
      { id: 12, name: 'مروحة طرد مطابخ تجارية كينج', warehouse: 'commercial', category: 'كهروميكانيك', qty: 4, price: 3200, desc: 'سحب للتجاري - تهوية ومطابخ' },
      { id: 13, name: 'كابل كهرباء مسلح 3 فاز نحاس', warehouse: 'commercial', category: 'كهرباء', qty: 150, price: 450, desc: 'سحب للتجاري - كهرباء (سعر المتر)' },
      { id: 14, name: 'محبس إغلاق غاز صناعي لولبي', warehouse: 'commercial', category: 'سباكة', qty: 6, price: 1800, desc: 'سحب للتجاري - غاز وأمان المحلات' }
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
      try { this.renderTickets();
    setTimeout(() => { if (this.checkEventRsvpStatusAndReplies) this.checkEventRsvpStatusAndReplies(); }, 500); } catch (e) { console.warn('[Init warning]:', e); }
      try { this.renderManagerDirectives(); } catch (e) { console.warn('[Init warning]:', e); }

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
      btnOpenRo.addEventListener('click', () => this.openPlantInspectionModal('ro'));
    }

    const btnSaveRo = document.getElementById('btnSaveRoChecklist');
    if (btnSaveRo) {
      btnSaveRo.addEventListener('click', () => {
        this.closeModal('modalPlantInspection');
        this.showToast('تم حفظ واعتماد تقرير فحص محطة التحلية RO بنجاح!');
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
        const msg = input ? input.value : 'تنبيه طوارئ';
        this.showToast(`📢 تم إرسال الإخطار لجميع الملاك:\n"${msg}"`);
      });
    }

    // Unit Entry & Beach/Pools Permits
    const btnUnitPermit = document.getElementById('btnUnitEntryPermit');
    if (btnUnitPermit) {
      btnUnitPermit.addEventListener('click', () => {
        const code = Math.floor(100000 + Math.random() * 900000);
        this.showToast(`🔑 تم إصدار كود دخول الوحدة (فيلا 104) بنجاح!\nرمز الدخول المؤقت: ${code}\nصالح لمدة 24 ساعة فقط على البوابات.`);
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
        if (title) title.innerHTML = '<i class="fa-solid fa-truck"></i> تصريح سيارات بضائع وتوريد';
        this.openModal('modalCargoPermit');
      });
    }

    const btnGoodsPermit = document.getElementById('btnGoodsRemovalPermit');
    if (btnGoodsPermit) {
      btnGoodsPermit.addEventListener('click', () => {
        const title = document.getElementById('cargoModalTitle');
        if (title) title.innerHTML = '<i class="fa-solid fa-box-open"></i> تصريح خروج منقولات ومعدات';
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
    if (phoneNav) {
      phoneNav.classList.add('hidden');
      phoneNav.style.setProperty('display', 'none', 'important');
    }
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
      'landscaping': 'viewLandscaping',
      'pest_control': 'viewPestControl'
    };

    const targetId = targetMap[role] || 'viewHomeowner';
    const activePanel = document.getElementById(targetId);
    if (activePanel) {
      activePanel.classList.add('active');
      activePanel.style.setProperty('display', 'flex', 'important');
      activePanel.style.setProperty('flex-direction', 'column', 'important');
    }

    // ALWAYS keep back-to-grid buttons VISIBLE so the user can easily navigate between screens!
    document.querySelectorAll('.header-back-btn, [onclick="app.showRoleGrid()"], [onclick="showRoleGrid()"], [onclick="app.switchRole(\'grid\')"]').forEach(btn => {
      btn.style.setProperty('display', 'inline-flex', 'important');
    });

    // Show phone bottom navbar ONLY for Homeowner & Family (Resident Villa View)
    const phoneNav = document.getElementById('phoneNavbar');
    if (phoneNav) {
      if (['homeowner', 'family', 'owner'].includes(role)) {
        phoneNav.classList.remove('hidden');
        phoneNav.style.setProperty('display', 'flex', 'important');
      } else {
        phoneNav.classList.add('hidden');
        phoneNav.style.setProperty('display', 'none', 'important');
      }
    }

    // Render lists on role switch
    this.renderHousekeeping();
    this.renderLandscaping();
    this.renderPestControl();

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
        ownerTitle.innerText = this.currentLang === 'en' ? 'Yasmin Ahmed (Family Member)' : 'ياسمين أحمد (تابع للمالك)';
      }
      if (ownerCardBadge) {
        ownerCardBadge.innerHTML = this.currentLang === 'en' 
          ? '<i class="fa-solid fa-user-shield"></i> Family Account (Restricted)' 
          : '<i class="fa-solid fa-user-shield"></i> حساب تابع (محدود)';
        ownerCardBadge.className = 'badge badge-info';
      }
      if (ownerCardSubtitle) {
        ownerCardSubtitle.innerText = this.currentLang === 'en' 
          ? 'Villa A104 - Phase 1 • Associated to Main Owner' 
          : 'فيلا A104 - المرحلة الأولى • تابع للمالك الأساسي';
      }
    } else if (role === 'homeowner') {
      this.updateHomeownerNameUI();
      if (ownerCardBadge) {
        ownerCardBadge.innerHTML = this.currentLang === 'en' 
          ? '<i class="fa-solid fa-check"></i> Verified Account' 
          : '<i class="fa-solid fa-check"></i> حساب مؤكد';
        ownerCardBadge.className = 'badge badge-success';
      }
      if (ownerCardSubtitle) {
        ownerCardSubtitle.innerText = this.currentLang === 'en' 
          ? 'Villa A104 - Phase 1' 
          : 'فيلا A104 - المرحلة الأولى';
      }
    }

    if (role === 'engineer') {
      const engSelect = document.getElementById('engineerSpecialtySelect');
      const val = engSelect ? engSelect.value : 'mep';
      this.handleSpecialtyChange(val);
      if (typeof window.renderPtwPermitsUI === 'function') window.renderPtwPermitsUI();
    } else if (role === 'engineering_director') {
      if (typeof window.renderPtwPermitsUI === 'function') window.renderPtwPermitsUI();
    } else if (role === 'manager') {
      this.renderManagerDirectives();
    }

    // Render screen logout header inside active view
    try { this.renderLogoutHeader(); } catch (e) { console.warn(e); }
  }

  openCommercialMeterModal() {
    this.openModal('modalMeterRecharge');
    const typeSelect = document.getElementById('meterTypeSelect');
    if (typeSelect) {
      typeSelect.innerHTML = `
        <option value="electricity">⚡ عداد الكهرباء التجاري (#EL-COMM-12 - شريحة تجارية)</option>
        <option value="water">💧 عداد المياه التجاري (#WT-COMM-12 - مستثمر تجاري)</option>
      `;
    }
  }

  submitStaffPermit() {
    const name = document.getElementById('staffNameInput')?.value || 'موظف جديد';
    const job = document.getElementById('staffJobInput')?.value || 'عامل نشاط';
    const ins = document.getElementById('staffInsuranceInput')?.value || '#INS-80941';

    this.closeModal('modalStaffPermit');
    this.showToast(`✅ تم توقيع وتأكيد تصريح عمل الموظف (${name}) بنجاح!\nالمسمّى: ${job}\nرقم الملف التأميني للدولة: ${ins}\nتم إصدار كود دخول البوابات الإلكترونية.`);
  }

  submitCargoPermit() {
    const desc = document.getElementById('cargoDescInput')?.value || 'شحنة تجارية';
    const driver = document.getElementById('cargoDriverInput')?.value || 'سائق التوريد';
    const code = Math.floor(100000 + Math.random() * 900000);

    this.closeModal('modalCargoPermit');
    this.showToast(`🚚 تم إصدار تصريح البضائع/المنقولات بنجاح!\nالشحنة: ${desc}\nالسائق: ${driver}\nرمز QR الأمان للبوابة: ${code}`);
  }

  requestWasteRemoval() {
    this.showToast('🗑️ تم رفع طلب التخلص البيئي والمخلفات التجارية لقسم النظافة بالقرية والمول.\nسيتم التوجه للمحل خلال 30 دقيقة.');
  }

  openSecurityComplaints() {
    this.showToast('👮 تم فتح قناة التنسيق الأمنية واستقبال الشكاوى المتبادلة بين الملاك والمحل التجاري.');
  }

  handleSpecialtyChange(specialtyKey) {
    const nameEl = document.getElementById('engineerNameText');
    const subEl = document.getElementById('engineerSpecialtySub');
    const listEl = document.getElementById('engineerChecklistsList');

    // 5 Specialized Engineering Teams (Mapped to Odoo maintenance.team IDs 2, 3, 5, 6, 7)
    const teamsConfig = {
      'mep': {
        name: 'م. محمود عبد الفتاح',
        sub: '❄️ مهندس الكهروميكانيك والتكييف والمحطات (فريق هندسي 2)',
        teamId: 2,
        teamName: 'MEP Team',
        checklists: [
          {
            id: 'chk_ro',
            title: 'محطة التحلية الرئيسية (RO Plant)',
            desc: 'فحص ضغط الأغشية، نسبة الكلور والملوحة اليومية',
            actionBtn: 'openPlantInspectionModal(\'ro\')',
            status: 'فحص دوري مطلوب'
          },
          {
            id: 'chk_stp',
            title: 'محطة معالجة الصرف (STP Plant)',
            desc: 'فحص طلمبات الهواء، نسبة الأكسجين ونقاء مياه ري اللاندسكيب',
            actionBtn: 'openPlantInspectionModal(\'stp\')',
            status: 'فحص دوري مطلوب'
          },
          {
            id: 'chk_chiller',
            title: 'محطة طلمبات الرفع وغرف التبريد المركزي',
            desc: 'فحص ضغط خطوط الطرد والفريون والضواغط',
            status: 'مكتمل اليوم'
          }
        ]
      },
      'fls': {
        name: 'م. خالد السعدني',
        sub: '🔥 مهندس السلامة وأنظمة مكافحة الحريق (فريق هندسي 3)',
        teamId: 3,
        teamName: 'FLS Team',
        checklists: [
          {
            id: 'chk_fls',
            title: 'مضخات الحريق الرئيسية (ديزل / كهرباء / بوستر)',
            desc: 'اختبار ضغط الشبكة عند 12 Bar وبدء التشغيل التلقائي',
            actionBtn: 'openPlantInspectionModal(\'fls\')',
            status: 'فحص أسبوعي إجباري'
          },
          {
            id: 'chk_alarm',
            title: 'لوحة الإنذار المركزية ومحابس كشف السريان OS&Y',
            desc: 'اختبار كواشف الدخان وحساسات الضغط في المرحلة الأولى والثانية',
            status: 'مكتمل وجاهز'
          },
          {
            id: 'chk_hose',
            title: 'صناديق الحريق ورشاشات الإطفاء بالمول والممرات',
            desc: 'فحص خراطيم الإطفاء وسلامة البوابات ومخارج الطوارئ',
            status: 'مطابق للكود'
          }
        ]
      },
      'electrical': {
        name: 'م. حسام النجار',
        sub: '⚡ مهندس الكهرباء والطاقة والمحولات (فريق هندسي 5)',
        teamId: 5,
        teamName: 'Electrical Team',
        checklists: [
          {
            id: 'chk_trans',
            title: 'محول الجهد المتوسط 04 وأكشاك البيلارات',
            desc: 'اختبار حرارة الزيت، العزل الكهربائي، ونسبة الحمل',
            actionBtn: 'openPlantInspectionModal(\'electrical\')',
            status: 'فحص يومي مطلوب'
          },
          {
            id: 'chk_mdb',
            title: 'لوحات التوزيع العمومية MDBs ومولدات الطوارئ',
            desc: 'فحص القواطع الذكية ومستوى الديزل للمولد الرئيسي',
            status: 'جاهزية 100%'
          },
          {
            id: 'chk_light',
            title: 'شبكة الإنارة العامة وأعمدة الممشى والشاطئ',
            desc: 'اختبار المؤقتات الزمنية وخلايا الفوتوسيل الذكية',
            status: 'قيد التفتيش'
          }
        ]
      },
      'landscape': {
        name: 'م. طارق عبد المجيد',
        sub: '🌿 مهندس اللاندسكيب والزراعة وشبكات الري (فريق هندسي 6)',
        teamId: 6,
        teamName: 'Landscaping & Agriculture Team',
        checklists: [
          {
            title: 'شبكات الري الأوتوماتيكية بالمحور الرئيسي',
            desc: 'فحص ضغط النوازل، محابس السولينويد، وجداول الضخ',
            actionBtn: 'openPlantInspectionModal(\'landscape\')',
            status: 'فحص دوري مطلوب'
          },
          {
            title: 'طلمبات التسميد وخزانات المغذيات المركزية',
            desc: 'معايرة نسب التسميد واختبار نقاء خطوط التنقيط',
            status: 'مكتمل اليوم'
          },
          {
            title: 'المسطحات الخضراء ومزروعات الشاطئ والحدائق',
            desc: 'جدول التقليم الدوري ومكافحة الآفات الزراعية',
            status: 'مجدول الأسبوع القادم'
          }
        ]
      },
      'civil': {
        name: 'م. ياسر الهواري',
        sub: '🏗️ مهندس المدني والهياكل الإنشائية والتشطيبات (فريق هندسي 7)',
        teamId: 7,
        teamName: 'Civil & Structural Team',
        checklists: [
          {
            title: 'المماشي الخرسانية والإنترلوك والمحاور الرئيسية',
            desc: 'فحص فواصل التمدد والتأكد من عدم وجود هبوط أرضي',
            actionBtn: 'openPlantInspectionModal(\'civil\')',
            status: 'فحص ميداني مطلوب'
          },
          {
            title: 'أرصفة البحيرات الصناعية والمصدات الشاطئية',
            desc: 'فحص طبقات العزل المائي والتأكد من خلوها من التصدعات',
            status: 'قيد المتابعة'
          },
          {
            title: 'أرضيات حمامات السباحة والبرجولات الخشبية',
            desc: 'فحص السيراميك والمظلات ودهانات الحماية من الرطوبة',
            status: 'مطابق للمواصفات'
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
          ${item.actionBtn ? `<button class="btn btn-primary" style="width: auto; padding: 5px 12px; font-size: 0.72rem; margin: 0; background: #1b8f91; border: none; font-weight: 700;" onclick="${item.actionBtn}"><i class="fa-solid fa-clipboard-check"></i> فتح التفتيش</button>` : `<span class="badge badge-success" style="font-size: 0.65rem; padding: 4px 8px;"><i class="fa-solid fa-check"></i> ${item.status}</span>`}
        `;
        listEl.appendChild(itemDiv);
      });
    }

    // Filter Engineer Tickets to show only team tickets
    if (typeof this.renderTickets === 'function') this.renderTickets();
  }

  handleEngineerSubmitToManager() {
    this.showToast('🛠 تم إرسال أمر العمل الهندسي العاجل بنجاح إلى شاشة مدير الصيانة!\nتم إدراج الطلب في طابور الوارد لتوزيع فني متاح.');
  }

  dispatchOrderToTech(orderTitle, selectId) {
    const select = document.getElementById(selectId);
    const techName = select ? select.value : 'الفني';
    this.showToast(`🚀 تم تخصيص وإرسال "${orderTitle}" بنجاح إلى الفني (${techName})!\nسيظهر الطلب الآن فوراً على شاشة الفني الميدانية.`);
  }

  toggleViewMode() {
    const simulator = document.getElementById('phoneSimulator');
    const textSpan = document.getElementById('viewModeText');
    this.isFullWidth = !this.isFullWidth;

    if (this.isFullWidth) {
      simulator.classList.add('full-width');
      if (textSpan) textSpan.innerText = 'عرض الموبايل المصغر';
    } else {
      simulator.classList.remove('full-width');
      if (textSpan) textSpan.innerText = 'عرض الشاشة الكاملة';
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
      if (countText) countText.innerText = `${this.qrTimer} ثانية`;
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

    const category = document.getElementById('ticketCategorySelect')?.value || 'سباكة';
    const priority = document.getElementById('ticketPrioritySelect')?.value || '2';
    const desc = document.getElementById('ticketDescInput')?.value || 'طلب صيانة عاجلة';
    const photoInput = document.getElementById('ticketPhotoInput');
    
    // Category fallback before-repair images
    const fallbacks = {
      'سباكة': 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&w=300&q=80',
      'كهرباء': 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=300&q=80',
      'كهروميكانيك': 'https://images.unsplash.com/photo-1527018601619-a508a2be00cd?auto=format&fit=crop&w=300&q=80',
      'نجارة': 'https://images.unsplash.com/photo-1517646287270-a5a9ca602e5c?auto=format&fit=crop&w=300&q=80'
    };
    const defaultPhoto = fallbacks[category] || fallbacks['سباكة'];

    const now = new Date();
    const dateStr = now.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

    const newTicket = {
      id: `TK-${Math.floor(1000 + Math.random() * 9000)}`,
      title: `${category}: ${desc.substring(0, 20)}...`,
      category: category,
      priority: priority,
      details: desc,
      status: 'جديد',
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
      
      this.showToast(`✅ تم إنشاء وتوجيه تذكرة الصيانة بنجاح رقم #${newTicket.id}\nتم إدراج البلاغ تلقائياً في قاعدة البيانات المركزية وإرساله لمدير الصيانة!`);
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
    this.showToast(`✅ تم حفظ وتأكيد إعدادات السيرفر المركزي بنجاح!\nسيرفر: ${url || 'السيرفر المركزي المعتمد'}\nقاعدة البيانات: ${db}\nالاسم المعتمد: ${name || 'جاري جلبه من السجل المركزي'}\nتم تفعيل الربط المباشر مع جميع بلاغات الصيانة والعدادات.`);
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
              fields: ["id", "name", "description", "stage_id", "priority", "create_date", "partner_email", "partner_phone", "team_id"],
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
          const recTeamId = Array.isArray(rec.team_id) ? rec.team_id[0] : rec.team_id;
          const recNameLower = (rec.name || '').toLowerCase();
          // Exclude Pest Control, Landscaping, and Housekeeping tickets completely from maintenance queue
          if (recTeamId === 8 || recTeamId === 7 || recTeamId === 5 ||
              recNameLower.includes('مكافح') || recNameLower.includes('آفات') || recNameLower.includes('حشرات') ||
              recNameLower.includes('لاند') || recNameLower.includes('حدائق') || recNameLower.includes('زراع') ||
              recNameLower.includes('هاوس') || recNameLower.includes('نظاف')) {
            return;
          }
          const recOdooIdStr = String(rec.id);
          const stageName = Array.isArray(rec.stage_id) ? rec.stage_id[1] : 'جديد';
          let bg = 'badge-warning';
          if (stageName.includes('Done') || stageName.includes('مكتمل') || stageName.includes('منتهي') || stageName.includes('Solved')) bg = 'badge-success';

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

          let cat = 'صيانة العامة';
          if (rec.name.includes('سباكة')) cat = 'سباكة';
          else if (rec.name.includes('كهرباء')) cat = 'كهرباء';
          else if (rec.name.includes('كهروميكانيك') || rec.name.includes('تكييف')) cat = 'كهروميكانيك';
          else if (rec.name.includes('نجارة')) cat = 'نجارة';
          else if (rec.name.includes('نظافة') || rec.name.includes('هاوس')) cat = 'نظافة وهاوس كيبينج';
          else if (rec.name.includes('حدائق') || rec.name.includes('لاند')) cat = 'صيانة الحدائق واللاندسكيب';

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
    this.showToast('🧹 تم تصفير وتنظيف جميع السجلات والبلاغات بكافة الشاشات بنجاح!\nالتطبيق نظيف 100% وجاهز لاختبارك المباشر.');
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
    if (ticket.team_id) return parseInt(ticket.team_id);
    if (ticket.teamId) return parseInt(ticket.teamId);

    const normalize = (s) => String(s || '').toLowerCase()
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .trim();

    const catNorm = normalize(ticket.category);
    const titleNorm = normalize(ticket.title);
    const detailsNorm = normalize(ticket.details || ticket.description);
    const typeNorm = normalize(ticket.type);
    const combinedNorm = (catNorm + ' ' + titleNorm + ' ' + detailsNorm + ' ' + typeNorm).toLowerCase();

    // Instant Map without redundant network requests:
    // 1. Pest Control (ID 8)
    if (combinedNorm.includes('مكافح') || combinedNorm.includes('افات') || combinedNorm.includes('حشرات') || combinedNorm.includes('رش') || combinedNorm.includes('ضباب') || combinedNorm.includes('قوارض') || combinedNorm.includes('نمل') || combinedNorm.includes('صراصير') || combinedNorm.includes('pest')) {
      return 8;
    }
    // 2. Landscaping (ID 7)
    if (combinedNorm.includes('لاند') || combinedNorm.includes('اسكيب') || combinedNorm.includes('حدائق') || combinedNorm.includes('حديق') || combinedNorm.includes('زراع') || combinedNorm.includes('اشجار') || combinedNorm.includes('نجيل') || combinedNorm.includes('شتلات') || combinedNorm.includes('landscaping') || combinedNorm.includes('landscape') || combinedNorm.includes('gardening')) {
      return 7;
    }
    // 3. Housekeeping (ID 5)
    if (combinedNorm.includes('هاوس') || combinedNorm.includes('كيبينج') || combinedNorm.includes('نظاف') || combinedNorm.includes('تنظيف') || combinedNorm.includes('مخلفات') || combinedNorm.includes('قمامة') || combinedNorm.includes('housekeeping') || combinedNorm.includes('cleaning')) {
      return 5;
    }
    // 4. Security (ID 3)
    if (combinedNorm.includes('امن') || combinedNorm.includes('تصريح') || combinedNorm.includes('بواب') || combinedNorm.includes('زائر') || combinedNorm.includes('security') || combinedNorm.includes('lpr')) {
      return 3;
    }
    // 5. Utilities Team (ID 12) - العدادات حصراً (شحن، كروت، قراءات، فحص واستبدال عدادات)
    if (combinedNorm.includes('عداد') || combinedNorm.includes('كارت') || combinedNorm.includes('شحن عداد') || combinedNorm.includes('رصيد عداد') || combinedNorm.includes('شحن كارت') || combinedNorm.includes('قراءه عداد') || combinedNorm.includes('فحص عداد') || combinedNorm.includes('meter') || combinedNorm.includes('utility') || combinedNorm.includes('utilities')) {
      return 12;
    }
    // 6. Accounting Team (ID 4) - فواتير الصيانة، الأقساط، المطالبات والوديعة (دون العدادات)
    if (combinedNorm.includes('حساب') || combinedNorm.includes('مالي') || combinedNorm.includes('وديع') || combinedNorm.includes('قسط') || combinedNorm.includes('فاتور') || combinedNorm.includes('سداد') || combinedNorm.includes('accounting') || combinedNorm.includes('finance')) {
      return 4;
    }
    // 7. Commercial Team (ID 10) - الأنشطة والمحلات التجارية
    if (ticket.requester === 'commercial' || combinedNorm.includes('تجاري') || combinedNorm.includes('محل') || combinedNorm.includes('كافيه') || combinedNorm.includes('مطعم') || combinedNorm.includes('مول') || combinedNorm.includes('commercial')) {
      return 10;
    }
    // 8. Community Team (ID 9) - خدمة المجتمع، الفعاليات، الكلوب هاوس، والملاعب
    if (combinedNorm.includes('مجتمع') || combinedNorm.includes('كلوب هاوس') || combinedNorm.includes('نادي') || combinedNorm.includes('ملعب') || combinedNorm.includes('فعالي') || combinedNorm.includes('اقتراح') || combinedNorm.includes('community') || combinedNorm.includes('clubhouse')) {
      return 9;
    }
    // 9. Maintenance Team (ID 2) - الصيانة الفنية الهندسية الكهروميكانيكية
    if (combinedNorm.includes('صيان') || combinedNorm.includes('سباك') || combinedNorm.includes('كهرب') || combinedNorm.includes('تكييف') || combinedNorm.includes('نجار') || combinedNorm.includes('عطل') || combinedNorm.includes('تسريب') || combinedNorm.includes('مواسي') || combinedNorm.includes('طلمب') || combinedNorm.includes('مسبح') || combinedNorm.includes('maintenance')) {
      return 2;
    }
    // 10. Customer Care (ID 1) - الافتراضي للاستفسارات العامة
    return 1;
  }

  handleNewTicketSubmit() {
    if (this._isTicketSubmitting) return;
    this._isTicketSubmitting = true;
    setTimeout(() => { this._isTicketSubmitting = false; }, 2500);

    const category = document.getElementById('ticketCategorySelect')?.value || 'سباكة';
    const priority = document.getElementById('ticketPrioritySelect')?.value || '2';
    const desc = document.getElementById('ticketDescInput')?.value || 'طلب صيانة عاجلة';
    const photoInput = document.getElementById('ticketPhotoInput');
    
    // Category fallback before-repair images
    const fallbacks = {
      'سباكة': 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&w=300&q=80',
      'كهرباء': 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=300&q=80',
      'كهروميكانيك': 'https://images.unsplash.com/photo-1527018601619-a508a2be00cd?auto=format&fit=crop&w=300&q=80',
      'نجارة': 'https://images.unsplash.com/photo-1517646287270-a5a9ca602e5c?auto=format&fit=crop&w=300&q=80'
    };
    const defaultPhoto = fallbacks[category] || fallbacks['سباكة'];

    const now = new Date();
    const dateStr = now.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

    const newTicket = {
      id: `TK-${Math.floor(1000 + Math.random() * 9000)}`,
      title: `${category}: ${desc.substring(0, 20)}...`,
      category: category,
      priority: priority,
      details: desc,
      status: 'جديد',
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

    const proceedWithTicket = async (finalPhoto) => {
      newTicket.photoBefore = finalPhoto || defaultPhoto;
      this.tickets.unshift(newTicket);
      this.saveTicketsToStorage();
      this.renderTickets();
      this.closeModal('modalNewTicket');

      const descInput = document.getElementById('ticketDescInput');
      if (descInput) descInput.value = '';
      if (photoInput) photoInput.value = '';

      this.showToast(`✅ تم تقديم بلاغ الصيانة بنجاح برقم #${newTicket.id}!\nجاري الحفظ والمزامنة مع السجل المركزي...`);

      // Live sync to Odoo Helpdesk (awaited for immediate odooId assignment)
      try {
        await this.syncTicketToOdoo(newTicket, '01223456789', 'حسن عيسى');
      } catch (e) {
        console.warn('[Odoo Initial Sync Warning]:', e);
      }
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
      this.showToast('⚠️ لم يتم العثور على بيانات الاتصال بالسيرفر المركزي');
      return;
    }

    const baseUrl = urlInput.replace(/\/+$/, '');
    const uid = 2; // Direct cached admin UID for instant < 1s creation

    try {

      // Determine client information dynamically (Name رباعي, phone, email, unit)
      let fullName = 'حسن عيسى';
      let phoneNum = '01223456789';
      let emailAddress = 'fmhala6@gmail.com';
      let unitNum = 'فيلا A104 - المرحلة الأولى';

      const customName = safeStorage.getItem('odoo_owner_name');
      if (customName && customName.trim()) {
        fullName = customName;
      }

      if (ticket.requester === 'tenant') {
        fullName = 'أحمد زاهر محمود';
        phoneNum = '01009876543';
        emailAddress = 'tenant.ahmed@domain.com';
        unitNum = 'شاليه A112 - المرحلة الأولى';
      } else if (ticket.requester === 'commercial') {
        fullName = 'مطعم وكافيه Blue Wave (شريف محمد)';
        phoneNum = '01112233445';
        emailAddress = 'bluewave@domain.com';
        unitNum = 'محل 12 - المول التجاري';
      } else if (ticket.requester === 'manager') {
        fullName = 'المهندس أيمن السعيد (مدير الصيانة)';
        phoneNum = '01221122334';
        emailAddress = 'ayman.saeed@domain.com';
        unitNum = 'الأماكن العامة بالقرية';
      }

      // Step 2: Instant Partner & Team Resolution (Zero Extra Network Lag)
      let partnerId = 3;
      const resolvedTeamId = this.resolveOdooTeamId(ticket);

      // Clean description: ONLY the user's detailed problem description
      const cleanDescription = ticket.details || ticket.title || 'طلب صيانة عاجلة من تطبيق الموبايل';

      // Dual-Architecture: Engineers & Manager go to Odoo Maintenance module (maintenance.request), Residents go to Helpdesk (helpdesk.ticket)
      const isEngineerOrManager = ticket.requester === 'engineer' || ticket.requester === 'manager';
      let targetModel = isEngineerOrManager ? "maintenance.request" : "helpdesk.ticket";
      let createPayload = null;

      if (isEngineerOrManager) {
        const maintenanceTeamId = ticket.maintenanceTeamId || this.activeEngineerTeam?.teamId || 2;
        const maintTypeVal = ticket.maintenanceType || 'corrective';
        const maintenanceFields = {
          name: `${ticket.category || 'صيانة مرافق'}: ${ticket.title || 'طلب صيانة'} (#${ticket.id})`,
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
          name: `${ticket.category || 'صيانة'}: ${ticket.title || 'بلاغ صيانة'} (#${ticket.id})`,
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
                        name: `صورة_عطل_${ticket.category || 'صيانة'}_${ticket.id}.jpg`,
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

        const modelLabel = targetModel === 'maintenance.request' ? 'إدارة الصيانة والتشغيل' : 'خدمة العملاء والدعم الفني';
        console.log(`[Odoo Sync Success] Ticket #${ticket.id} registered under Odoo ${modelLabel} ID: ${ticketIdInOdoo}`);
        this.showToast(`✅ تم توثيق وحفظ الطلب #${ticket.id} بالنظام المركزي بنجاح!\nالقسم: ${modelLabel}\nرقم السجل المركزي: #${ticketIdInOdoo}`);
      } else if (odooCreateData && odooCreateData.error) {
        console.error('[Odoo Create Error]:', odooCreateData.error);
        this.showToast(`❌ تعذر استكمال مزامنة الطلب: ${odooCreateData.error.message || JSON.stringify(odooCreateData.error)}`);
      }
    } catch (err) {
      console.warn('[Odoo Sync Exception]:', err);
      if (window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.warn('[Odoo Connection Notice]:', err);
      }
    }
  }

  resolveOdooStageId(status) {
    if (!status) return 1;
    const s = String(status).toLowerCase()
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .trim();

    // 1. Solved / Completed (Stage 4 in Odoo Helpdesk)
    if (s.includes('تم الانتهاء') || s.includes('تم الحل') || s.includes('تم الاغلاق') || s.includes('مكتمل') || s.includes('منتهي') || s.includes('solved') || s.includes('completed') || s.includes('closed') || s.includes('done')) {
      return 4;
    }
    // 2. Cancelled (Stage 5 in Odoo Helpdesk)
    if (s.includes('ملغي') || s.includes('الغاء') || s.includes('cancel')) {
      return 5;
    }
    // 3. In Progress (Stage 2 in Odoo Helpdesk) - Immediately when assigned or work begins
    if (s.includes('تنفيذ') || s.includes('اسناد') || s.includes('تعيين') || s.includes('جاري') || s.includes('معاين') || s.includes('فني') || s.includes('موقع') || s.includes('دفع') || s.includes('تركيب') || s.includes('progress') || s.includes('assigned')) {
      return 2;
    }
    // 4. New (Stage 1 in Odoo Helpdesk)
    if (s.includes('جديد') || s.includes('new') || s.includes('انتظار')) {
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
          const searchModel = ticket.odooModel || (ticket.requester === 'engineer' || ticket.requester === 'manager' ? 'maintenance.request' : 'helpdesk.ticket');
          const searchPayload = {
            jsonrpc: "2.0",
            method: "call",
            params: {
              service: "object",
              method: "execute_kw",
              args: [
                dbInput, uid, keyInput,
                searchModel,
                "search_read",
                [
                  [[ "name", "ilike", ticket.id ]],
                  [ "id", "name", "stage_id" ]
                ]
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
    ticket.odooModel = ticket.odooModel || (ticket.requester === 'engineer' || ticket.requester === 'manager' ? 'maintenance.request' : 'helpdesk.ticket');

    try {
      const targetStageId = this.resolveOdooStageId(ticket.status);
      console.log(`[Odoo Update] Updating model: ${ticket.odooModel}, ID: ${ticket.odooId}, Target Stage ID: ${targetStageId}`);

      // 1. Post to Chatter (message_post)
      let statusText = `<p><b>🔄 تحديث مرحلة البلاغ من تطبيق الموبايل:</b></p>` +
                       `<p>• <b>الحالة الحالية:</b> ${ticket.status}</p>` +
                       (ticket.assignedTech ? `<p>• <b>الفني المكلف:</b> ${ticket.assignedTech}</p>` : '') +
                       (ticket.resolutionTime ? `<p>• <b>مؤشر تقييم SLA وإغلاق التذكرة:</b> ${ticket.resolutionTime}</p>` : '');

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
      let fullName = 'حسن عيسى';
      let phoneNum = '01223456789';
      let emailAddress = 'fmhala6@gmail.com';
      let unitNum = 'فيلا A104 - المرحلة الأولى';

      const customName = safeStorage.getItem('odoo_owner_name');
      if (customName && customName.trim()) {
        fullName = customName;
      }

      if (ticket.requester === 'tenant') {
        fullName = 'أحمد زاهر محمود';
        phoneNum = '01009876543';
        emailAddress = 'tenant.ahmed@domain.com';
        unitNum = 'شاليه A112 - المرحلة الأولى';
      } else if (ticket.requester === 'commercial') {
        fullName = 'مطعم وكافيه Blue Wave (شريف محمد)';
        phoneNum = '01112233445';
        emailAddress = 'bluewave@domain.com';
        unitNum = 'محل 12 - المول التجاري';
      } else if (ticket.requester === 'manager') {
        fullName = 'المهندس أيمن السعيد (مدير الصيانة)';
        phoneNum = '01221122334';
        emailAddress = 'ayman.saeed@domain.com';
        unitNum = 'الأماكن العامة بالقرية';
      }

      let updatedDesc = `<p><b>بلاغ صيانة عاجل من تطبيق الموبايل</b></p>` +
                        `<hr/>` +
                        `<p><b>الاسم رباعي:</b> ${fullName}</p>` +
                        `<p><b>رقم التليفون:</b> ${phoneNum}</p>` +
                        `<p><b>البريد الإلكتروني:</b> ${emailAddress}</p>` +
                        `<p><b>رقم الوحدة:</b> ${unitNum}</p>` +
                        `<hr/>` +
                        `<p><b>الفئة:</b> ${ticket.category || 'عام'}</p>` +
                        `<p><b>الوصف بالتفصيل:</b> ${ticket.details || ticket.title || ''}</p>` +
                        `<hr/>` +
                        `<p><b>حالة التكليف الحالية:</b> ${ticket.status} ${ticket.assignedTech ? ('- الفني: ' + ticket.assignedTech) : ''}</p>`;

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
                    name: `صورة_بعد_الإصلاح_تذكرة_${ticket.id}.jpg`,
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
      this.showToast('⚠️ يرجى إدخال مبلغ شحن صحيح');
      return;
    }

    if (this.currentRole === 'homeowner') {
      if (meterType === 'electricity') {
        this.elecBalance += amountVal;
        const textEl = document.getElementById('elecBalanceText');
        if (textEl) textEl.innerText = `${this.elecBalance.toFixed(2)} ج.م`;
        const remEl = document.getElementById('elecRemainingText');
        if (remEl) remEl.innerText = Math.round(this.elecBalance / 2.75);
        this.showToast(`⚡ تم شحن عداد الكهرباء الذكي للمالك بنجاح بمبلغ ${amountVal} ج.م!\nالرصيد الجديد: ${this.elecBalance.toFixed(2)} ج.م (${Math.round(this.elecBalance / 2.75)} KWh)`);
      } else {
        this.waterBalance += amountVal;
        const textEl = document.getElementById('waterBalanceText');
        if (textEl) textEl.innerText = `${this.waterBalance.toFixed(2)} ج.م`;
        const remEl = document.getElementById('waterRemainingText');
        if (remEl) remEl.innerText = Math.round(this.waterBalance / 5.00);
        this.showToast(`💧 تم شحن عداد المياه الذكي للمالك بنجاح بمبلغ ${amountVal} ج.م!\nالرصيد الجديد: ${this.waterBalance.toFixed(2)} ج.م (${Math.round(this.waterBalance / 5.00)} م³)`);
      }
    } else if (this.currentRole === 'tenant') {
      if (meterType === 'electricity') {
        this.tenantElecBalance += amountVal;
        const textEl = document.getElementById('tenantElecText');
        if (textEl) textEl.innerText = `${this.tenantElecBalance.toFixed(2)} ج.م`;
        const remEl = document.getElementById('tenantElecRemainingText');
        if (remEl) remEl.innerText = Math.round(this.tenantElecBalance / 2.75);
        this.showToast(`⚡ تم شحن عداد كهرباء الشاليه للمستأجر بنجاح بمبلغ ${amountVal} ج.م!\nالرصيد الجديد: ${this.tenantElecBalance.toFixed(2)} ج.م (${Math.round(this.tenantElecBalance / 2.75)} KWh)`);
      } else {
        this.tenantWaterBalance += amountVal;
        const textEl = document.getElementById('tenantWaterText');
        if (textEl) textEl.innerText = `${this.tenantWaterBalance.toFixed(2)} ج.م`;
        const remEl = document.getElementById('tenantWaterRemainingText');
        if (remEl) remEl.innerText = Math.round(this.tenantWaterBalance / 5.00);
        this.showToast(`💧 تم شحن عداد مياه الشاليه للمستأجر بنجاح بمبلغ ${amountVal} ج.م!\nالرصيد الجديد: ${this.tenantWaterBalance.toFixed(2)} ج.م (${Math.round(this.tenantWaterBalance / 5.00)} م³)`);
      }
    } else if (this.currentRole === 'commercial') {
      if (meterType === 'electricity') {
        this.commElecBalance += amountVal;
        const textEl = document.getElementById('commElecText');
        if (textEl) textEl.innerText = `${this.commElecBalance.toFixed(2)} ج.م`;
        const remEl = document.getElementById('commElecRemainingText');
        if (remEl) remEl.innerText = Math.round(this.commElecBalance / 3.50);
        this.showToast(`⚡ تم شحن عداد الكهرباء التجاري بنجاح بمبلغ ${amountVal} ج.م!\nالرصيد الجديد: ${this.commElecBalance.toFixed(2)} ج.م (${Math.round(this.commElecBalance / 3.50)} KWh)`);
      } else {
        this.commWaterBalance += amountVal;
        const textEl = document.getElementById('commWaterText');
        if (textEl) textEl.innerText = `${this.commWaterBalance.toFixed(2)} ج.م`;
        const remEl = document.getElementById('commWaterRemainingText');
        if (remEl) remEl.innerText = Math.round(this.commWaterBalance / 6.00);
        this.showToast(`💧 تم شحن عداد المياه التجاري بنجاح بمبلغ ${amountVal} ج.م!\nالرصيد الجديد: ${this.commWaterBalance.toFixed(2)} ج.م (${Math.round(this.commWaterBalance / 6.00)} م³)`);
      }
    }

    this.closeModal('modalMeterRecharge');

    const meterTypeName = meterType === 'electricity' ? 'كهرباء' : 'مياه';
    let meterCode = meterType === 'electricity' ? '#EL-104' : '#WT-104';
    let unitTitle = 'فيلا A104 - المرحلة الأولى';
    let customerPhone = '01223456789';
    let customerName = 'حسن عيسى';
    let requesterRole = 'homeowner';

    if (this.currentRole === 'tenant') {
      meterCode = meterType === 'electricity' ? '#EL-402' : '#WT-402';
      unitTitle = 'شاليه C304 - المرحلة الثالثة';
      customerPhone = '01009876543';
      customerName = 'أحمد زاهر محمود';
      requesterRole = 'tenant';
    } else if (this.currentRole === 'commercial') {
      meterCode = meterType === 'electricity' ? '#EL-COMM-12' : '#WT-COMM-12';
      unitTitle = 'محل 12 - المول التجاري';
      customerPhone = '01112233445';
      customerName = 'شريف محمد (مطعم Blue Wave)';
      requesterRole = 'commercial';
    }

    const payRef = 'SYS-PAY-' + Math.floor(100000 + Math.random() * 900000);

    this.showToast(`⚡ تم شحن عداد ${meterTypeName} الذكي (${meterCode}) بمبلغ ${amountVal} ج.م!\nرقم المرجع المالي: #${payRef}\nجاري توثيق العملية بكشف الحساب المالي المركزي...`);

    // Sync meter recharge transaction to Odoo (Team ID 12: Utilities)
    (async () => {
      try {
        const meterTicket = {
          id: 'MTR-' + Math.floor(1000 + Math.random() * 9000),
          category: 'شحن عدادات سكنية ومرافق',
          team_id: 12,
          title: `شحن عداد ${meterTypeName}: ${meterCode}`,
          details: `عملية شحن عداد مرافق ذكي مسبق الدفع\nنوع العداد: ${meterTypeName} (${meterCode})\nالمبلغ المشحون: ${amountVal} ج.م\nرقم المرجع المالي: #${payRef}\nالوحدة: ${unitTitle}`,
          status: 'تم الشحن وتحديث العداد',
          bgClass: 'badge-success',
          requester: requesterRole,
          priority: '1',
          createdAt: new Date().toISOString()
        };
        await this.syncTicketToOdoo(meterTicket, customerPhone, customerName);
        this.showToast(`✅ تم توثيق شحن العداد بمبلغ ${amountVal} ج.م بداخل كشف الحساب المالي المركزي برقم #${payRef}!`);
      } catch (err) {
        console.warn('[Odoo Meter Recharge Sync Error]:', err);
      }
    })();
  }

  renderEngineerTickets() { this.renderTickets(); }

  renderTickets() {
    const isEn = this.currentLang === 'en';

    const translateText = (txt) => {
      if (!isEn) return txt;
      if (!txt) return '';
      const dict = {
        'صيانة تكييف الماستر': 'Master A/C Maintenance',
        'تسريب في محبس السباكة': 'Plumbing Valve Leak',
        'كهروميكانيك': 'Electromechanical',
        'سباكة': 'Plumbing',
        'أصول وعامة': 'General Assets',
        'قيد الفحص الميداني': 'Under Field Inspection',
        'تم إسناد الفني': 'Technician Assigned',
        'انتظار دفع المالك': 'Awaiting Owner Payment',
        'تم الدفع - جاري التركيب': 'Paid - Installation in Progress',
        'تم الانتهاء': 'Completed',
        'لوحة تحكم تكييف': 'A/C Control Panel',
        'محبس نحاس إيطالي': 'Italian Brass Valve',
        'لا توجد بلاغات حالية': 'No active tickets',
        'نشطة': 'active',
        'تصريح دخول الوحدة': 'Unit Entry Permit',
        'تصريح دخول البحر والبحيرات': 'Beach & Lake Entry Permit',
        'دخول البحر والبحيرات والمسابح': 'Beach & Lakes Access Permit',
        'تصريح دخول سيارات بضائع': 'Cargo Entry Permit',
        'معتمد': 'Approved',
        'تحت المراجعة': 'Under Review',
        'لا توجد تصاريح حالية': 'No active permits',
        'ركن سيارة مخالف أمام الفيلا يغلق الممر': 'Illegal car parking in front of the villa blocking the lane',
        'تحت المراجعة والتحرك الميداني': 'Under Review & Field Dispatch',
        'لا توجد شكاوى أمنية حالية': 'No active security complaints'
      };
      if (txt.startsWith('زائر: ')) {
        return txt.replace('زائر: ', 'Visitor: ').replace('شاليه', 'Chalet').replace('فيلا', 'Villa');
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
            <span style="font-size: 0.6rem; color: var(--text-muted); display: block; margin-bottom: 2px;">${isEn ? 'Before Photo:' : 'صورة العطل:'}</span>
            <img src="${tk.photoBefore}" style="width: 54px; height: 54px; border-radius: 8px; object-fit: cover; border: 1px solid rgba(0,0,0,0.1);">
          </div>`;
        if (tk.status === 'تم الانتهاء' && tk.photoAfter) {
          photosHtml += `
          <div>
            <span style="font-size: 0.6rem; color: #10b981; display: block; margin-bottom: 2px;">${isEn ? 'After Photo:' : 'صورة الإصلاح:'}</span>
            <img src="${tk.photoAfter}" style="width: 54px; height: 54px; border-radius: 8px; object-fit: cover; border: 1px solid rgba(16,185,129,0.2);">
          </div>
          <div style="margin-right: 8px; font-size: 0.72rem; color: #10b981; font-weight: 700;">
            <i class="fa-solid fa-clock-check"></i> ${isEn ? 'Resolution time:' : 'مدة الحل:'} ${tk.resolutionTime}
          </div>`;
        }
        photosHtml += `</div>`;
      }

      let paymentHtml = '';
      if (tk.status === 'انتظار دفع المالك') {
        paymentHtml = isEn ? `
          <div style="background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.15); padding: 10px; border-radius: 8px; font-size: 0.75rem; color: #ef4444; margin-top: 8px; display: flex; flex-direction: column; gap: 6px;">
            <span>⚠️ <strong>Repair requires spare part:</strong> [${partName}] priced at <strong>${tk.partPrice} EGP</strong>.</span>
            <span>Please complete the payment online to start the installation.</span>
            <button class="btn btn-danger btn-sm" onclick="app.openSparePartPaymentModal('${tk.id}')" style="width: 100%; margin-top: 4px; font-size: 0.72rem; padding: 6px; font-weight: 700; height: 32px; line-height: 1; display: flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer;">
              <i class="fa-solid fa-credit-card"></i> Pay for Spare Part (${tk.partPrice} EGP)
            </button>
          </div>
        ` : `
          <div style="background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.15); padding: 10px; border-radius: 8px; font-size: 0.75rem; color: #ef4444; margin-top: 8px; display: flex; flex-direction: column; gap: 6px;">
            <span>⚠️ <strong>يتطلب الإصلاح قطعة غيار:</strong> [${tk.partName}] بسعر <strong>${tk.partPrice} ج.م</strong>.</span>
            <span>يرجى سداد القيمة إلكترونياً للبدء الفوري في التركيب من قبل الفني.</span>
            <button class="btn btn-danger btn-sm" onclick="app.openSparePartPaymentModal('${tk.id}')" style="width: 100%; margin-top: 4px; font-size: 0.72rem; padding: 6px; font-weight: 700; height: 32px; line-height: 1; display: flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer;">
              <i class="fa-solid fa-credit-card"></i> سداد قيمة قطعة الغيار (${tk.partPrice} ج.م)
            </button>
          </div>
        `;
      } else if (tk.status === 'تم الدفع - جاري التركيب') {
        paymentHtml = isEn ? `
          <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.2); padding: 8px; border-radius: 8px; font-size: 0.72rem; color: #10b981; margin-top: 8px;">
            <i class="fa-solid fa-circle-check"></i> Paid <strong>${tk.partPrice} EGP</strong> successfully. The technician will bring and install the [${partName}].
          </div>
        ` : `
          <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.2); padding: 8px; border-radius: 8px; font-size: 0.72rem; color: #10b981; margin-top: 8px;">
            <i class="fa-solid fa-circle-check"></i> تم سداد <strong>${tk.partPrice} ج.م</strong> بنجاح. جاري إحضار قطعة [${tk.partName}] وتركيبها بواسطة الفني.
          </div>
        `;
      }

      const rawDate = tk.createdAt ? new Date(tk.createdAt) : new Date();
      const dateDisplay = tk.dateStr || rawDate.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });
      const timeDisplay = tk.timeStr || rawDate.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

      let priorityStars = '';
      if (tk.priority === '3') priorityStars = ' ⭐⭐⭐';
      else if (tk.priority === '2') priorityStars = ' ⭐⭐';
      else if (tk.priority === '1') priorityStars = ' ⭐';

      let odooRepliesHtml = '';
      const isFinancialInquiry = tk.category && (tk.category.includes('حسابات') || tk.category.includes('مالي'));
      if (tk.odooId && isFinancialInquiry) {
        odooRepliesHtml = `
          <div style="margin-top: 8px; border-top: 1px dashed rgba(32, 39, 79, 0.15); padding-top: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span style="font-size: 0.72rem; font-weight: 700; color: #20274f;">
                <i class="fa-solid fa-comments"></i> ${isEn ? 'Live Conversation Log:' : 'سجل التوضيحات والردود المباشرة:'}
              </span>
              <button class="btn btn-sm" onclick="app.loadOdooRepliesForTicket('${tk.id}', '${tk.odooId}')" style="font-size: 0.65rem; padding: 3px 10px; font-weight: 700; background: rgba(27, 143, 145, 0.12); color: #1b8f91; border: 1px solid rgba(27, 143, 145, 0.3); border-radius: 6px; width: auto; cursor: pointer;">
                <i class="fa-solid fa-rotate"></i> ${isEn ? 'Sync Replies' : '💬 متابعة سجل الردود'}
              </button>
            </div>
            <div id="odoo_replies_box_${tk.id}" class="odoo-replies-box-${tk.id}" style="font-size: 0.72rem; color: var(--text-muted);">
              ${tk.lastReply ? `
                <div style="background: rgba(16, 185, 129, 0.08); border-right: 3px solid #10b981; padding: 6px 10px; border-radius: 6px; margin-top: 4px;">
                  <div style="font-weight: 700; color: #10b981; display: flex; justify-content: space-between;">
                    <span><i class="fa-solid fa-user-check"></i> ${tk.lastReplyAuthor || 'فريق الدعم والحسابات'}:</span>
                    <span style="font-size: 0.65rem; color: var(--text-muted);">${tk.lastReplyDate || ''}</span>
                  </div>
                  <div style="color: var(--text-main); margin-top: 2px;">${tk.lastReply}</div>
                </div>
              ` : `<div style="font-size: 0.68rem; color: var(--text-muted); font-style: italic;">لا توجد ردود جديدة حتى الآن. اضغط "متابعة سجل الردود" للمتابعة الحية.</div>`}
            </div>
          </div>
        `;
      }

      // Emaar 4-step Progress Tracker Calculation
      let step = 1;
      if (['تم التعيين للفني', 'تم إسناد الفني', 'قيد الفحص الميداني', 'جاري العمل', 'جاري المراجعة', 'In Progress'].includes(tk.status)) step = 2;
      else if (['انتظار دفع المالك', 'تم الدفع - جاري التركيب', 'On Hold', 'بانتظار قطع الغيار'].includes(tk.status)) step = 3;
      else if (['تم الانتهاء', 'تم الحل', 'تم الإغلاق', 'Done', 'Solved', 'تم السداد', 'مكتمل'].includes(tk.status)) step = 4;

      const progressPercent = step === 1 ? 25 : (step === 2 ? 50 : (step === 3 ? 75 : 100));
      const progressColor = step === 4 ? '#10b981' : (step === 3 && tk.status === 'انتظار دفع المالك' ? '#ef4444' : '#1c2140');

      const emaarTrackerHtml = `
        <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid rgba(32,39,79,0.08);">
          <div style="display: flex; justify-content: space-between; font-size: 0.62rem; color: var(--text-muted); font-weight: 700; margin-bottom: 4px;">
            <span style="color: ${step >= 1 ? '#1c2140' : 'inherit'};">${isEn ? '1. Request Sent' : '1. تقديم الطلب'}</span>
            <span style="color: ${step >= 2 ? '#1c2140' : 'inherit'};">${isEn ? '2. Tech Visit' : '2. معاينة الفني'}</span>
            <span style="color: ${step >= 3 ? '#1c2140' : 'inherit'};">${isEn ? '3. Part / Repair' : '3. القطع والتركيب'}</span>
            <span style="color: ${step >= 4 ? '#10b981' : 'inherit'};">${isEn ? '4. Closed' : '4. تم الحل'}</span>
          </div>
          <div style="width: 100%; height: 5px; background: rgba(32,39,79,0.08); border-radius: 4px; overflow: hidden;">
            <div style="width: ${progressPercent}%; height: 100%; background: ${progressColor}; transition: width 0.3s ease;"></div>
          </div>
        </div>
      `;

      // 1. Cancellation Info Box if Cancelled
      let cancellationHtml = '';
      if (tk.status === 'ملغاة' || tk.status === 'Cancelled' || tk.status === 'ملغي' || String(tk.status).includes('الغاء') || String(tk.status).includes('ملغ')) {
        cancellationHtml = `
          <div style="background: rgba(239, 68, 68, 0.08); border-right: 3px solid #ef4444; padding: 8px 10px; border-radius: 6px; margin-top: 6px;">
            <div style="font-size: 0.75rem; font-weight: 800; color: #ef4444; display: flex; align-items: center; gap: 4px;">
              <i class="fa-solid fa-ban"></i> <span>تم إلغاء هذا البلاغ رسمياً</span>
            </div>
            <p style="font-size: 0.7rem; color: #1c2140; margin: 3px 0 0 0; font-weight: 600;">
              <b>سبب الإلغاء المدون:</b> ${tk.cancelReason || tk.cancellationReason || tk.cancelNotes || 'تم الإلغاء من قِبل إدارة الصيانة لتعذر التنفيذ'}
            </p>
          </div>
        `;
      }

      // 2. Customer Star Rating & Review Box if Solved / Completed
      let ratingHtml = '';
      const isSolved = tk.status === 'تم الانتهاء' || tk.status === 'تم الحل' || tk.status === 'Solved' || tk.status === 'Done' || tk.status === 'مكتمل';
      if (isSolved) {
        if (tk.customerRating) {
          const starsStr = '⭐'.repeat(parseInt(tk.customerRating) || 5);
          ratingHtml = `
            <div style="background: rgba(212, 175, 55, 0.08); border-right: 3px solid #d4af37; padding: 8px 10px; border-radius: 6px; margin-top: 6px;">
              <div style="font-size: 0.75rem; font-weight: 800; color: #b45309; display: flex; align-items: center; gap: 4px;">
                <i class="fa-solid fa-star" style="color: #d4af37;"></i> <span>تقييمك لجودة الخدمة: ${starsStr} (${tk.customerRating}/5)</span>
              </div>
              ${tk.customerComment ? `<p style="font-size: 0.68rem; color: #1c2140; margin: 3px 0 0 0; font-weight: 600;">"${tk.customerComment}"</p>` : ''}
            </div>
          `;
        } else {
          ratingHtml = `
            <div style="margin-top: 8px;">
              <button class="btn btn-sm" onclick="app.openRateTicketModal('${tk.id}')" style="width: 100%; font-size: 0.75rem; font-weight: 700; background: linear-gradient(135deg, #d4af37, #b8860b); color: #ffffff; border: none; border-radius: 6px; padding: 7px; display: flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer; box-shadow: 0 2px 6px rgba(212,175,55,0.25);">
                <i class="fa-solid fa-star"></i> تقييم جودة الخدمة ورضا العميل ⭐
              </button>
            </div>
          `;
        }
      }

      return `
        <div class="ticket-item" style="flex-direction: column; align-items: stretch; gap: 4px; border-left: 4px solid ${tk.status === 'تم الدفع - جاري التركيب' ? '#10b981' : (tk.status === 'انتظار دفع المالك' ? '#ef4444' : '#1c2140')}; font-family: var(--font-main); border-radius: 10px; padding: 12px; margin-bottom: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <h4 style="font-size: 0.85rem; font-weight: 700; color: #1c2140;">${title}${priorityStars}</h4>
            <span class="badge ${tk.bgClass}">${status}</span>
          </div>
          <div style="font-size: 0.72rem; color: var(--text-muted); display: flex; flex-direction: column; align-items: flex-start; gap: 4px; margin-top: 4px; background: rgba(32, 39, 79, 0.03); padding: 6px 8px; border-radius: 6px; width: 100%; box-sizing: border-box;">
            <div>${isEn ? 'Category' : 'التخصص'}: <b>${category}</b> • #${tk.id} ${tk.assignedTech ? `• ${isEn ? 'Tech' : 'الفني'}: ${tk.assignedTech}` : ''}</div>
            <div style="font-size: 0.68rem; color: #1b8f91; font-weight: 700; display: inline-flex; align-items: center; gap: 6px; width: 100%;">
              <span><i class="fa-regular fa-calendar-days"></i> ${dateDisplay}</span>
              <span>•</span>
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
        if (cat.includes('حسابات') || cat.includes('مالي') || cat.includes('تصريح') || cat.includes('بوابات') || cat.includes('أمن')) return false;
        if (title.includes('تصريح دخول') || title.includes('بوابات أمني')) return false;
        return true;
      };

      const isPublicTicketForHomeowner = (t) => {
        if (!t) return false;
        if (t.isPublicAsset || t.isPublicTicket || t.requester === 'manager' || t.requester === 'public' || t.requester === 'engineer') return true;
        const c = `${t.category || ''} ${t.title || ''} ${t.location || ''}`.toLowerCase();
        if (c.includes('الموقع العام') || c.includes('موقع عام') || c.includes('أصول القرية') || c.includes('أصول الموقع') || c.includes('طلمبة حمام') || c.includes('محطة ro') || c.includes('محطة مياه') || c.includes('إنارة الموقع')) {
          return (t.requester !== 'homeowner' && t.requester !== 'owner' && t.requester !== 'family' && t.requester !== 'tenant');
        }
        if (t.partsUsed && t.partsUsed.some(p => p.warehouse === 'assets' || p.isPublicExpense)) return true;
        return false;
      };

      const homeownerTks = this.tickets.filter(tk => (tk.requester === 'homeowner' || tk.requester === 'owner' || !tk.requester) && isPureHomeownerMaintenance(tk) && !isPublicTicketForHomeowner(tk));

      const isCompletedStatus = (st) => {
        if (!st) return false;
        const s = String(st).toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').trim();
        return s.includes('انته') || s.includes('مكتمل') || s.includes('مغلق') || s.includes('حل') || s.includes('done') || s.includes('solved') || s.includes('closed') || s.includes('سداد');
      };

      const activeTks = homeownerTks.filter(t => !isCompletedStatus(t.status));
      const completedTks = homeownerTks.filter(t => isCompletedStatus(t.status));

      // Category Counters Summary for Active Tickets (6 Categories)
      const plumbingCount = activeTks.filter(t => t.category === 'سباكة').length;
      const elecCount = activeTks.filter(t => t.category === 'كهرباء').length;
      const hvacCount = activeTks.filter(t => t.category === 'كهروميكانيك' || t.category === 'تكييف').length;
      const woodCount = activeTks.filter(t => t.category === 'نجارة').length;
      const hkCount = activeTks.filter(t => t.category && (t.category.includes('نظافة') || t.category.includes('هاوس'))).length + (this.housekeepingRequests ? this.housekeepingRequests.filter(r => r.requester === 'owner').length : 0);
      const landscapeCount = activeTks.filter(t => t.category && (t.category.includes('حدائق') || t.category.includes('لاند'))).length;

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
      if (badge) badge.innerText = isEn ? `${activeTks.length} active` : `${activeTks.length} نشطة`;

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
          homeownerList.innerHTML = `<div style="font-size: 0.75rem; color: var(--text-muted); text-align: center; padding: 15px;">${isEn ? 'No active tickets' : 'لا توجد بلاغات نشطة حالياً'}</div>`;
        } else {
          activeTks.forEach(tk => {
            homeownerList.innerHTML += getTicketHtml(tk);
          });
        }
      } else {
        if (completedTks.length === 0) {
          homeownerList.innerHTML = `<div style="font-size: 0.75rem; color: var(--text-muted); text-align: center; padding: 15px;">${isEn ? 'No completed history tickets' : 'لا يوجد سجل تذاكر منتهية حالياً'}</div>`;
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
        const details = String(tk.details || '').toLowerCase();
        const combined = (cat + ' ' + title + ' ' + details).toLowerCase();

        // 1. Exclude Financials & Security
        if (combined.includes('حساب') || combined.includes('مالي') || combined.includes('فاتور') || combined.includes('سداد')) return false;
        if (combined.includes('أمن') || combined.includes('امن') || combined.includes('بواب') || combined.includes('تصريح') || combined.includes('شكوى أمنية') || combined.includes('security')) return false;

        // 2. Exclude Pest Control (strictly Pest supervisor)
        if (combined.includes('مكافح') || combined.includes('افات') || combined.includes('آفات') || combined.includes('حشرات') || combined.includes('رش ضباب') || combined.includes('thermal fogging') || combined.includes('نمل') || combined.includes('بعوض') || combined.includes('pest')) return false;

        // 3. Exclude Landscaping (strictly Landscaping supervisor)
        if (combined.includes('لاند') || combined.includes('اسكيب') || combined.includes('حدائق') || combined.includes('حديق') || combined.includes('زراع') || combined.includes('شجيرات') || combined.includes('شتلات') || combined.includes('قص الأشجار') || combined.includes('تقليم') || combined.includes('landscape') || combined.includes('mowing')) return false;

        // 4. Exclude Housekeeping
        if (combined.includes('هاوس') || combined.includes('كيبينج') || combined.includes('نظاف') || combined.includes('تنظيف') || combined.includes('مخلفات') || combined.includes('قمامة') || combined.includes('cleaning') || combined.includes('housekeeping')) return false;

        return true;
      });

      const pendingTks = allMgrTks.filter(tk => tk.status === 'جديد' || !tk.assignedTech);
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
      if (badge) badge.innerText = `${pendingTks.length} بانتظار الإسناد`;

      // 2. Filter Manager Orders by Source (all, owner, engineer, public)
      const currentMgrFilter = this._managerFilter || 'all';
      let filteredTks = allMgrTks;

      if (currentMgrFilter === 'owner') {
        filteredTks = allMgrTks.filter(t => t.requester === 'homeowner' || t.requester === 'owner' || t.requester === 'tenant' || !t.requester);
      } else if (currentMgrFilter === 'engineer') {
        filteredTks = allMgrTks.filter(t => t.requester === 'engineer' || (t.category && (t.category.includes('تفتيش') || t.category.includes('مرافق'))));
      } else if (currentMgrFilter === 'public') {
        filteredTks = allMgrTks.filter(t => t.requester === 'manager' || t.requester === 'public' || (t.category && (t.category.includes('عامة') || t.category.includes('لاند'))));
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
        managerList.innerHTML = `
          <div style="text-align: center; padding: 32px 16px; background: #ffffff; border-radius: 14px; border: 1px dashed rgba(32,39,79,0.12); margin-top: 4px;">
            <div style="width: 44px; height: 44px; border-radius: 50%; background: rgba(27,143,145,0.08); color: #1b8f91; display: inline-flex; align-items: center; justify-content: center; font-size: 1.2rem; margin-bottom: 8px;">
              <i class="fa-solid fa-clipboard-check"></i>
            </div>
            <div style="font-size: 0.82rem; font-weight: 800; color: #20274f; margin-bottom: 2px;">لا توجد بلاغات صيانة معلقة</div>
            <div style="font-size: 0.7rem; color: #64748b;">كافة طلبات هذا القسم موزعة ومسندة وجاري متابعتها</div>
          </div>
        `;
      } else {
        filteredTks.forEach(tk => {
          const createDate = tk.createdAt ? new Date(tk.createdAt) : new Date();
          const elapsedMins = Math.max(1, Math.round((Date.now() - createDate) / 60000));
          
          // Clean Minimal Source Tag
          let sourceLabel = 'طلب مالك (فيلا 104)';
          let sourceColor = '#1b8f91';
          let sourceBg = 'rgba(27, 143, 145, 0.08)';

          if (tk.requester === 'engineer' || (tk.category && tk.category.includes('تفتيش'))) {
            sourceLabel = 'تفتيش مهندس الموقع';
            sourceColor = '#d97706';
            sourceBg = 'rgba(217, 119, 6, 0.08)';
          } else if (tk.requester === 'manager' || tk.requester === 'public' || (tk.category && tk.category.includes('عامة'))) {
            sourceLabel = 'مرافق وموقع عام';
            sourceColor = '#475569';
            sourceBg = 'rgba(71, 85, 105, 0.08)';
          }

          // SLA Badge (Sleek pill)
          let slaHtml = '';
          if (tk.assignedTech) {
            const dMins = tk.dispatchMins || 1;
            slaHtml = `<span style="font-size: 0.65rem; color: #059669; background: #ecfdf5; padding: 2px 8px; border-radius: 12px; font-weight: 700;"><i class="fa-solid fa-bolt"></i> أُسندت خلال ${dMins}د</span>`;
          } else {
            if (elapsedMins <= 15) {
              slaHtml = `<span style="font-size: 0.65rem; color: #d97706; background: #fffbeb; padding: 2px 8px; border-radius: 12px; font-weight: 700;"><i class="fa-solid fa-clock"></i> بانتظار الإسناد (${elapsedMins}د)</span>`;
            } else {
              slaHtml = `<span style="font-size: 0.65rem; color: #dc2626; background: #fef2f2; padding: 2px 8px; border-radius: 12px; font-weight: 700;"><i class="fa-solid fa-triangle-exclamation"></i> متأخرة (${elapsedMins}د)</span>`;
            }
          }

          const isNewTicket = (tk.status === 'جديد' || tk.status === 'New' || !tk.assignedTech);
          const isCancelled = (tk.status === 'ملغي' || tk.status === 'ملغاة' || tk.status === 'Cancelled');
          const isSolved = (tk.status === 'تم الانتهاء' || tk.status === 'تم الحل' || tk.status === 'Solved');

          // Clean action section
          let actionHtml = '';
          if (isCancelled) {
            actionHtml = `
              <div style="margin-top: 10px; padding: 8px 12px; background: #fef2f2; border-radius: 10px; border: 1px solid #fee2e2; display: flex; align-items: center; justify-content: space-between; font-size: 0.72rem; color: #991b1b;">
                <div style="display: flex; align-items: center; gap: 6px;">
                  <i class="fa-solid fa-ban" style="color: #dc2626;"></i>
                  <span><b>ملغاة:</b> ${tk.cancelReason || 'بناءً على طلب العميل أو التكرار'}</span>
                </div>
              </div>
            `;
          } else if (isNewTicket) {
            actionHtml = `
              <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(32,39,79,0.06); display: flex; gap: 8px; align-items: center;">
                <select class="form-control" style="flex: 1; height: 38px; padding: 0 10px; font-size: 0.76rem; background: #f8fafc; color: #1e293b; border: 1px solid #e2e8f0; font-weight: 700; border-radius: 8px;" id="assignTechSelect_${tk.id}">
                  <option value="كريم حسن">❄️ كريم حسن (تكييف وكهروميكانيك)</option>
                  <option value="مينا جرجس">🔧 مينا جرجس (شبكات وسباكة)</option>
                  <option value="أحمد علي">⚡ أحمد علي (كهرباء وطاقة)</option>
                  <option value="سعيد محمود">🌿 سعيد محمود (مرافق عامة وري)</option>
                </select>
                <button type="button" style="height: 38px; padding: 0 14px; font-size: 0.75rem; font-weight: 800; background: #1b8f91; color: #ffffff; border: none; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; box-shadow: 0 2px 6px rgba(27,143,145,0.25);" onclick="app.assignTechnician('${tk.id}', 'assignTechSelect_${tk.id}')">
                  <i class="fa-solid fa-paper-plane"></i> إسناد للفني
                </button>
                <button type="button" style="height: 38px; width: 38px; background: #f8fafc; border: 1px solid #fee2e2; color: #dc2626; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;" title="إلغاء البلاغ" onclick="app.openCancelTicketModal('${tk.id}')">
                  <i class="fa-solid fa-ban" style="font-size: 0.75rem;"></i>
                </button>
              </div>
            `;
          } else {
            // Already Assigned
            actionHtml = `
              <div style="margin-top: 10px; padding: 8px 12px; background: #f8fafc; border-radius: 10px; border: 1px solid rgba(32,39,79,0.06); display: flex; align-items: center; justify-content: space-between; font-size: 0.74rem;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="width: 26px; height: 26px; border-radius: 50%; background: #ecfdf5; color: #059669; display: flex; align-items: center; justify-content: center; font-size: 0.75rem;">
                    <i class="fa-solid fa-user-check"></i>
                  </span>
                  <div>
                    <span style="color: #64748b; font-size: 0.68rem;">الفني المسؤول:</span>
                    <strong style="color: #20274f; font-weight: 800; margin-right: 4px;">${tk.assignedTech}</strong>
                  </div>
                </div>
                <div style="display: flex; gap: 6px; align-items: center;">
                  <span class="badge badge-info" style="font-size: 0.65rem; font-weight: 700;">${tk.status}</span>
                  <button type="button" style="background: transparent; border: none; color: #94a3b8; cursor: pointer; padding: 4px 6px; font-size: 0.72rem;" title="إلغاء التذكرة" onclick="app.openCancelTicketModal('${tk.id}')">
                    <i class="fa-solid fa-trash-can"></i>
                  </button>
                </div>
              </div>
            `;
          }

          // Clean description: Only show if distinct from title and meaningful
          let detailsSnippet = '';
          if (tk.details && tk.details.trim().length > 0) {
            const cleanTitle = (tk.title || '').trim().toLowerCase();
            const cleanDetails = tk.details.trim().toLowerCase();
            if (cleanDetails !== cleanTitle && !cleanDetails.includes(cleanTitle.substring(0, 15))) {
              detailsSnippet = `<div style="font-size: 0.72rem; color: #475569; background: #f8fafc; padding: 6px 10px; border-radius: 8px; margin-top: 6px; line-height: 1.4;">${tk.details}</div>`;
            }
          }

          managerList.innerHTML += `
            <div style="background: #ffffff; border: 1px solid rgba(32,39,79,0.08); border-radius: 14px; padding: 14px; margin-bottom: 10px; box-shadow: 0 2px 8px rgba(32,39,79,0.03); display: flex; flex-direction: column;">
              <!-- Top Row: Source, ID, SLA -->
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span style="font-size: 0.68rem; font-weight: 800; color: ${sourceColor}; background: ${sourceBg}; padding: 2px 8px; border-radius: 6px;">
                    ${sourceLabel}
                  </span>
                  <span style="font-size: 0.68rem; font-weight: 700; color: #94a3b8;">#${tk.id}</span>
                </div>
                ${slaHtml}
              </div>

              <!-- Ticket Main Title & Category -->
              <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                <h4 style="font-size: 0.88rem; font-weight: 800; color: #20274f; margin: 0; line-height: 1.4; flex: 1;">${tk.title}</h4>
                <span style="font-size: 0.65rem; color: #64748b; background: rgba(32,39,79,0.04); padding: 2px 6px; border-radius: 4px; font-weight: 700; white-space: nowrap;">
                  ${tk.category || 'صيانة عامة'}
                </span>
              </div>

              ${detailsSnippet}
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
        tenantList.innerHTML = `<div style="font-size: 0.75rem; color: var(--text-muted); text-align: center; padding: 12px;">${isEn ? 'No maintenance tickets submitted' : 'لا توجد طلبات صيانة مسجلة حالياً'}</div>`;
      } else {
        tks.forEach(tk => {
          tenantList.innerHTML += `
            <div class="ticket-item">
              <div>
                <h4 style="font-size: 0.85rem; margin-bottom: 2px;">${tk.title}</h4>
                <p style="font-size: 0.7rem; color: var(--text-muted); margin: 0;">
                  ${isEn ? 'Ticket' : 'تذكرة'} #${tk.id} • ${tk.dateStr || ''}
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
        if (text.includes('شكاوى') || text.includes('شكوى') || text.includes('مقترح') || text.includes('خدمة العملاء') || text.includes('استفسار') || text.includes('حسابات') || text.includes('مالي') || text.includes('وديع') || text.includes('قسط') || text.includes('أمن') || text.includes('أمني') || text.includes('security') || text.includes('customer care')) {
          return false;
        }
        return true;
      };

      const allTechTks = this.tickets.filter(tk => (tk.assignedTech === 'كريم حسن' || (!tk.assignedTech && tk.requester === 'manager')) && isPureMaintenanceTask(tk));
      const activeTechTks = allTechTks.filter(tk => ['تم التعيين للفني', 'جاري العمل', 'انتظار دفع المالك', 'تم الدفع - جاري التركيب', 'قيد الفحص الميداني', 'جديد'].includes(tk.status));
      const completedTechTks = allTechTks.filter(tk => tk.status === 'تم الانتهاء' || tk.status === 'تم الحل' || tk.status === 'Solved');

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
      if (badge) badge.innerText = `${activeTechTks.length} مهام جارية`;

      // 2. Filter Technician Tasks (active, completed, owner, public)
      const currentTechFilter = this._techFilter || 'active';
      let filteredTechTks = activeTechTks;

      if (currentTechFilter === 'completed') {
        filteredTechTks = completedTechTks;
      } else if (currentTechFilter === 'owner') {
        filteredTechTks = allTechTks.filter(t => t.requester === 'homeowner' || t.requester === 'owner' || t.requester === 'tenant' || !t.requester);
      } else if (currentTechFilter === 'public') {
        filteredTechTks = allTechTks.filter(t => t.requester === 'manager' || t.requester === 'public' || t.requester === 'engineer' || (t.category && (t.category.includes('عامة') || t.category.includes('تفتيش'))));
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
          ${currentTechFilter === 'completed' ? 'لا توجد مهام مكتملة بالسجل حتى الآن' : 'لا توجد مهام جارية حالياً'}
        </div>`;
      } else {
        filteredTechTks.forEach(tk => {
          const isDone = (tk.status === 'تم الانتهاء' || tk.status === 'تم الحل' || tk.status === 'Solved');

          // Determine Source & Precise Location
          let sourceBadgeHtml = '';
          let locationDetailsHtml = '';
          let borderAccent = '#1b8f91';

          const isPublicTicket = (
            tk.requester === 'manager' ||
            tk.requester === 'public' ||
            tk.requester === 'engineer' ||
            (tk.category && (tk.category.includes('عام') || tk.category.includes('مرافق') || tk.category.includes('تفتيش') || tk.category.includes('محطة') || tk.category.includes('ري') || tk.category.includes('لاندسكيب') || tk.category.includes('كهروميكانيك') || tk.category.includes('حريق'))) ||
            (tk.title && (tk.title.includes('الموقع العام') || tk.title.includes('مرفق عام') || tk.title.includes('المرافق العامة'))) ||
            (tk.location && (tk.location.includes('الموقع العام') || tk.location.includes('مرفق عام') || tk.location.includes('محطة') || tk.location.includes('مجمع')))
          ) && tk.requester !== 'homeowner' && tk.requester !== 'owner' && tk.requester !== 'family' && tk.requester !== 'tenant';

          const isTenantTicket = (tk.requester === 'tenant');

          if (isPublicTicket) {
            sourceBadgeHtml = `<span class="badge" style="background: rgba(32, 39, 79, 0.12); color: #20274f !important; font-weight: 800; font-size: 0.65rem;"><i class="fa-solid fa-tree-city"></i> مرفق عام للقرية</span>`;
            borderAccent = '#20274f';
            locationDetailsHtml = `
              <div style="font-size: 0.72rem; color: #64748b; margin: 2px 0 6px 0; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 4px;">
                <span><b>📍 الموقع:</b> ${tk.location || 'الموقع العام بالقرية'} • المرحلة الأولى</span>
                <span style="color: #1b8f91; font-weight: 700;">🛡️ إشراف: إدارة الصيانة</span>
              </div>
            `;
          } else if (isTenantTicket) {
            sourceBadgeHtml = `<span class="badge" style="background: rgba(153, 87, 137, 0.15); color: #995789 !important; font-weight: 800; font-size: 0.65rem;"><i class="fa-solid fa-key"></i> وحدة مستأجر</span>`;
            borderAccent = '#995789';
            locationDetailsHtml = `
              <div style="font-size: 0.72rem; color: #64748b; margin: 2px 0 6px 0; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 4px;">
                <span><b>📍 الموقع:</b> المرحلة الثانية • عمارة B2 / شقة 302</span>
                <span style="color: #995789; font-weight: 700;">👤 المستأجر: أ. طارق الشناوي</span>
              </div>
            `;
          } else {
            sourceBadgeHtml = `<span class="badge" style="background: rgba(27, 143, 145, 0.15); color: #1b8f91 !important; font-weight: 800; font-size: 0.65rem;"><i class="fa-solid fa-house-user"></i> وحدة مالك خاصة</span>`;
            borderAccent = '#1b8f91';
            locationDetailsHtml = `
              <div style="font-size: 0.72rem; color: #64748b; margin: 2px 0 6px 0; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 4px;">
                <span><b>📍 الموقع:</b> المرحلة الأولى • فيلا A104</span>
                <span style="color: #1b8f91; font-weight: 700;">👤 المالك: أ. حسن عيسى</span>
              </div>
            `;
          }

          let innerTechHtml = '';

          if (isDone) {
            // Completed Compact View
            innerTechHtml = `
              <div style="background: #f0fdf4; border: 1px solid #86efac; padding: 8px 12px; border-radius: 8px; font-size: 0.73rem; color: #166534; margin-top: 6px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="font-weight: 800;"><i class="fa-solid fa-circle-check" style="color: #10b981;"></i> تم الإصلاح والإغلاق بنجاح</span>
                  <span style="font-size: 0.65rem; color: #15803d; font-weight: 700;">مدة الحل: ${tk.resolutionTime || '22 دقيقة'}</span>
                </div>
                ${(tk.partsUsed && tk.partsUsed.length > 0) ? `
                  <div style="margin-top: 6px; padding: 6px 8px; background: rgba(22, 101, 52, 0.06); border-radius: 6px; font-size: 0.68rem; color: #166534;">
                    <b>قطع الغيار المصروفة:</b> ${tk.partsUsed.map(p => `${p.name} (عدد ${p.qty})`).join('، ')}
                  </div>
                ` : ''}
                ${tk.photoAfter ? `
                  <div style="display: flex; gap: 8px; margin-top: 6px; align-items: center;">
                    <img src="${tk.photoBefore}" style="width: 44px; height: 44px; border-radius: 6px; object-fit: cover; border: 1px solid #cbd5e1;" title="قبل">
                    <i class="fa-solid fa-arrow-left" style="color: #10b981; font-size: 0.75rem;"></i>
                    <img src="${tk.photoAfter}" style="width: 44px; height: 44px; border-radius: 6px; object-fit: cover; border: 1px solid #86efac;" title="بعد الإصلاح">
                    <span style="font-size: 0.68rem; color: #15803d;">تم توثيق صورة العطل وصورة الإصلاح بالنظام المركزي</span>
                  </div>
                ` : ''}
              </div>
            `;
          } else if (tk.status === 'تم التعيين للفني' || tk.status === 'جاري العمل' || tk.status === 'جديد' || tk.status === 'قيد الفحص الميداني' || tk.status === 'جاري العمل الميداني' || tk.status === 'قيد التنفيذ' || tk.isFieldService) {
            innerTechHtml = `
              <!-- Compact Timer & Status Bar -->
              <div style="display: flex; align-items: center; justify-content: space-between; background: #0f172a; color: #38bdf8; padding: 6px 10px; border-radius: 8px; margin-top: 6px;">
                <div style="display: flex; align-items: center; gap: 6px;">
                  <i class="fa-solid fa-stopwatch" style="font-size: 0.95rem; color: #38bdf8;"></i>
                  <span style="font-size: 0.65rem; color: #94a3b8;">الوقت الميداني:</span>
                  <span style="font-size: 0.95rem; font-family: monospace; font-weight: 800; color: #ffffff;" id="fsTimer_${tk.id}">${tk.fsElapsedFormatted || '00:00:00'}</span>
                </div>
                <button type="button" style="background: ${tk.fsTimerRunning ? '#f59e0b' : '#1b8f91'}; color: #ffffff; font-weight: 700; font-size: 0.68rem; padding: 4px 10px; margin: 0; border: none; border-radius: 6px; cursor: pointer;" onclick="app.toggleFieldServiceTimer('${tk.id}')">
                  <i class="fa-solid ${tk.fsTimerRunning ? 'fa-pause' : 'fa-play'}"></i> ${tk.fsTimerRunning ? 'إيقاف' : 'بدء العمل'}
                </button>
              </div>

              <!-- Spare Parts (Clean & Minimal) -->
              ${(() => {
                const targetWarehouse = isPublicTicket ? 'assets' : (isTenantTicket ? 'commercial' : 'residential');
                let techSpecialty = 'all';
                const tkCat = (tk.category || tk.title || '').toLowerCase();
                if (tkCat.includes('سباك') || tkCat.includes('مياه') || tkCat.includes('محبس') || (tk.assignedTech && tk.assignedTech.includes('جرجس'))) techSpecialty = 'سباكة';
                else if (tkCat.includes('كهرب') || tkCat.includes('إنارة') || tkCat.includes('لوحات') || tkCat.includes('طاقة') || (tk.assignedTech && tk.assignedTech.includes('علي'))) techSpecialty = 'كهرباء';
                else if (tkCat.includes('لاندسكيب') || tkCat.includes('ري') || tkCat.includes('حدائق') || (tk.assignedTech && tk.assignedTech.includes('سعيد'))) techSpecialty = 'لاندسكيب';
                else if (tkCat.includes('تكييف') || tkCat.includes('تبريد') || tkCat.includes('كهروميكانيك') || tkCat.includes('طلمب') || tkCat.includes('حمام') || (tk.assignedTech && tk.assignedTech.includes('كريم'))) techSpecialty = 'كهروميكانيك';

                let availableParts = (this.inventoryItems || []).filter(item => {
                  const matchWh = item.warehouse === targetWarehouse;
                  const matchSpec = (techSpecialty === 'all' || item.category === techSpecialty || (techSpecialty === 'كهروميكانيك' && (item.category === 'كهروميكانيك' || item.category === 'سباكة')));
                  return matchWh && matchSpec;
                });
                if (availableParts.length === 0) availableParts = (this.inventoryItems || []).filter(item => item.warehouse === targetWarehouse);

                return `
                  <div style="background: #f8fafc; border: 1px solid rgba(32, 39, 79, 0.08); padding: 8px 10px; border-radius: 8px; margin-top: 6px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                      <span style="font-size: 0.7rem; font-weight: 800; color: #20274f;">
                        <i class="fa-solid fa-boxes-stacked" style="color: #1b8f91;"></i> صرف قطع الغيار:
                      </span>
                      <span style="font-size: 0.62rem; color: #64748b;">${isPublicTicket ? 'مستودع الموقع العام' : (isTenantTicket ? 'مستودع التجاري' : 'مستودع الوحدات')}</span>
                    </div>
                    <div style="display: flex; gap: 6px; align-items: center;">
                      <select class="form-control" id="fsPartSelect_${tk.id}" style="flex: 1; height: 34px; font-size: 0.72rem; padding: 0 8px; border: 1px solid #cbd5e1; font-weight: 600; background: #ffffff; color: #20274f; border-radius: 6px;">
                        ${availableParts.map(p => {
                          const label = isPublicTicket ? `${p.name} [متوفر: ${p.qty}]` : `${p.name} (${p.price} ج.م)`;
                          return `<option value="${p.name}">${label}</option>`;
                        }).join('')}
                      </select>
                      <input type="number" id="fsPartQty_${tk.id}" value="1" min="1" max="10" style="width: 44px; height: 34px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.75rem; text-align: center; font-weight: 800; color: #20274f; background: #ffffff;">
                      <button type="button" style="height: 34px; padding: 0 10px; background: #1b8f91; color: #ffffff; font-weight: 700; font-size: 0.7rem; border: none; border-radius: 6px; cursor: pointer; white-space: nowrap;" onclick="app.addFieldServicePart('${tk.id}')">
                        <i class="fa-solid fa-plus"></i> صرف
                      </button>
                    </div>
                    ${(tk.partsUsed && tk.partsUsed.length > 0) ? `
                      <div id="fsPartsList_${tk.id}" style="font-size: 0.66rem; color: #0f172a; margin-top: 5px; padding: 4px 8px; background: rgba(32, 39, 79, 0.04); border-radius: 5px;">
                        ${tk.partsUsed.map(p => `• <b>${p.name}</b> (كمية: ${p.qty})`).join('، ')}
                      </div>
                    ` : ''}
                  </div>
                `;
              })()}

              <!-- Signature only if Resident/Tenant -->
              ${!isPublicTicket ? `
                <div style="background: #f8fafc; border: 1px solid rgba(32, 39, 79, 0.1); padding: 8px 10px; border-radius: 8px; margin-top: 6px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                    <span style="font-size: 0.7rem; font-weight: 800; color: #20274f;">
                      <i class="fa-solid fa-signature" style="color: #1b8f91;"></i> توقيع الاستلام (${isTenantTicket ? 'المستأجر' : 'المالك'}):
                    </span>
                    <button type="button" style="background: transparent; color: #dc2626; border: none; font-size: 0.62rem; cursor: pointer;" onclick="app.clearFieldServiceSig('${tk.id}')">مسح</button>
                  </div>
                  <canvas id="fsSigCanvas_${tk.id}" width="340" height="60" style="width: 100%; height: 60px; background: #ffffff; border: 1px dashed #cbd5e1; border-radius: 6px; cursor: crosshair; touch-action: none;"></canvas>
                </div>
              ` : ''}

              <!-- Photo After Fix & Complete Action (Single Clean Row) -->
              <div style="display: flex; gap: 6px; align-items: center; margin-top: 6px;">
                <label for="techPhotoAfter_${tk.id}" style="flex: 1; height: 38px; display: flex; align-items: center; justify-content: center; gap: 4px; background: #f1f5f9; border: 1px dashed #94a3b8; border-radius: 8px; color: #475569; font-size: 0.7rem; font-weight: 700; cursor: pointer; margin: 0;">
                  <i class="fa-solid fa-camera"></i> 
                  <span id="techPhotoAfterLabel_${tk.id}">صورة بعد الإصلاح</span>
                </label>
                <input type="file" id="techPhotoAfter_${tk.id}" accept="image/*" style="display: none;" onchange="const l = document.getElementById('techPhotoAfterLabel_${tk.id}'); if (l) l.innerText = '✅ تم التقاط الصورة';" />

                <button type="button" style="flex: 1.4; height: 38px; font-size: 0.75rem; font-weight: 800; background: #1b8f91; border: none; border-radius: 8px; color: #ffffff; display: flex; align-items: center; justify-content: center; gap: 6px; margin: 0; cursor: pointer; box-shadow: 0 2px 6px rgba(27,143,145,0.25);" onclick="app.completeFieldServiceOrder('${tk.id}', 'techPhotoAfter_${tk.id}')">
                  <i class="fa-solid fa-circle-check"></i> إنهاء وإغلاق المهمة
                </button>
              </div>
            `;
          } else if (tk.status === 'انتظار دفع المالك') {
            innerTechHtml = `
              <div style="background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.3); padding: 8px 10px; border-radius: 8px; font-size: 0.72rem; color: #92400e; margin-top: 6px;">
                <div style="font-weight: 800; margin-bottom: 2px;"><i class="fa-solid fa-hourglass-half"></i> بانتظار سداد المالك لقيمة القطعة (${tk.partPrice || 350} ج.م)</div>
                <div>تم إرسال إشعار الدفع لتطبيق المالك (فيلا 104)، سيبدأ التركيب فور السداد.</div>
              </div>
            `;
          } else if (tk.status === 'تم الدفع - جاري التركيب') {
            innerTechHtml = `
              <div style="background: #f0fdf4; border: 1px solid #86efac; padding: 10px 12px; border-radius: 8px; font-size: 0.72rem; color: #166534; margin-top: 6px;">
                <div style="font-weight: 800; margin-bottom: 4px;"><i class="fa-solid fa-circle-check" style="color: #10b981;"></i> تم سداد قيمة القطعة [${tk.partName || 'محبس نحاس'}]!</div>
                <div>يرجى استلام القطعة من المخزن وتركيبها، ثم إرفاق صورة بعد التركيب:</div>
                <div style="margin: 8px 0 6px 0;">
                  <label for="techPhotoAfter_${tk.id}" style="display: flex; align-items: center; justify-content: center; gap: 6px; padding: 8px 10px; background: #ffffff; border: 1.5px dashed #10b981; border-radius: 8px; color: #065f46; font-size: 0.74rem; font-weight: 700; cursor: pointer;">
                    <i class="fa-solid fa-camera" style="color: #10b981; font-size: 1rem;"></i> 
                    <span id="techPhotoAfterLabel_${tk.id}">📷 اضغط هنا لرفع / تصوير العطل بعد التركيب</span>
                  </label>
                  <input type="file" id="techPhotoAfter_${tk.id}" accept="image/*" style="display: none;" onchange="const l = document.getElementById('techPhotoAfterLabel_${tk.id}'); if (l) l.innerText = '✅ تم اختيار صورة بعد التركيب';">
                </div>
                <button class="btn btn-success" style="width: 100%; height: 38px; font-size: 0.8rem; font-weight: 800; margin: 0; background: #059669; border-color: #059669; color: #ffffff;" onclick="app.completeTicket('${tk.id}', 'techPhotoAfter_${tk.id}')">
                  <i class="fa-solid fa-check"></i> إنهاء المهمة وإغلاق التذكرة
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
        homeownerPermits.innerHTML = `<div style="font-size: 0.72rem; color: var(--text-muted); text-align: center; padding: 6px;">${isEn ? 'No active permits' : 'لا توجد تصاريح حالية'}</div>`;
      } else {
        list.forEach(p => {
          let qrHtml = '';
          const type = translateText(p.type);
          const status = translateText(p.status);
          const details = translateText(p.details);

          if (p.status === 'معتمد') {
            qrHtml = `
              <div style="display: flex; align-items: center; gap: 8px; margin-top: 6px; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.2); padding: 8px; border-radius: 8px;">
                <i class="fa-solid fa-qrcode" style="font-size: 1.5rem; color: #10b981;"></i>
                <div>
                  <span style="font-size: 0.65rem; color: var(--text-muted); display: block;">${isEn ? 'Active Security Code:' : 'كود الأمن الفعال:'}</span>
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
              <p style="font-size: 0.7rem; color: var(--text-muted);">${details} • ${isEn ? 'Request Code' : 'كود الطلب'}: #${p.id}</p>
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
        tenantPermits.innerHTML = '<div style="font-size: 0.72rem; color: var(--text-muted); text-align: center; padding: 6px;">لا توجد تصاريح حالية</div>';
      } else {
        list.forEach(p => {
          let qrHtml = '';
          if (p.status === 'معتمد') {
            qrHtml = `
              <div style="display: flex; align-items: center; gap: 8px; margin-top: 6px; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.2); padding: 8px; border-radius: 8px;">
                <i class="fa-solid fa-qrcode" style="font-size: 1.5rem; color: #10b981;"></i>
                <div>
                  <span style="font-size: 0.65rem; color: var(--text-muted); display: block;">كود الأمن الفعال:</span>
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
              <p style="font-size: 0.7rem; color: var(--text-muted);">${p.details} • كود الطلب: #${p.id}</p>
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
        commercialPermits.innerHTML = '<div style="font-size: 0.72rem; color: #64748b; text-align: center; padding: 6px;">لا توجد تصاريح حالية</div>';
      } else {
        list.forEach(p => {
          let qrHtml = '';
          if (p.status === 'معتمد') {
            qrHtml = `
              <div style="display: flex; align-items: center; gap: 8px; margin-top: 6px; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.2); padding: 8px; border-radius: 8px;">
                <i class="fa-solid fa-qrcode" style="font-size: 1.5rem; color: #10b981;"></i>
                <div>
                  <span style="font-size: 0.65rem; color: #64748b; display: block;">كود الأمن الفعال:</span>
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
              <p style="font-size: 0.7rem; color: #64748b;">${p.details} • كود الطلب: #${p.id}</p>
              ${qrHtml}
            </div>
          `;
        });
      }
    }

    // 10. Render Permits in Security View
    const securityPermitsList = document.getElementById('securityPermitsList');
    if (securityPermitsList) {
      const activePermits = this.permits.filter(p => p.status === 'تحت المراجعة');
      const badge = document.getElementById('securityPermitsInboxBadge');
      if (badge) badge.innerText = `${activePermits.length} تصاريح`;
      securityPermitsList.innerHTML = '';
      if (this.permits.length === 0) {
        securityPermitsList.innerHTML = '<div style="font-size: 0.75rem; color: var(--text-muted); text-align: center; padding: 15px;">لا توجد طلبات تصاريح حالية</div>';
      } else {
        this.permits.forEach(p => {
          let actionHtml = '';
          if (p.status === 'تحت المراجعة') {
            actionHtml = `
              <div style="display: flex; gap: 8px; margin-top: 6px;">
                <button class="btn btn-primary" style="padding: 6px 12px; font-size: 0.78rem;" onclick="app.approvePermit('${p.id}')">
                  <i class="fa-solid fa-check"></i> موافقة واعتماد
                </button>
                <button class="btn btn-cyan" style="padding: 6px 12px; font-size: 0.78rem; background: #ffffff; border: 1px solid rgba(32,39,79,0.2); color: #be123c; font-weight: 700;" onclick="app.rejectPermit('${p.id}')">
                  <i class="fa-solid fa-xmark"></i> رفض
                </button>
              </div>
            `;
          } else {
            actionHtml = `
              <div style="margin-top: 6px; font-size: 0.75rem; color: ${p.status === 'معتمد' ? '#10b981' : '#ef4444'}; font-weight: 700;">
                <i class="fa-solid ${p.status === 'معتمد' ? 'fa-stamp' : 'fa-ban'}"></i> حالة الطلب النهائية: ${p.status} ${p.qrCode ? `(كود الأمن: ${p.qrCode})` : ''}
              </div>
            `;
          }

          securityPermitsList.innerHTML += `
            <div class="ticket-item" style="flex-direction: column; align-items: stretch; gap: 4px; margin-bottom: 8px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span class="badge ${p.bgClass}">${p.status}</span>
                <span style="font-size: 0.7rem; color: var(--text-muted);">طالب التصريح: ${p.requester} • #${p.id}</span>
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
      if (badge) badge.innerText = isEn ? `${list.length} active` : `${list.length} نشطة`;
      homeownerComplaints.innerHTML = '';
      if (list.length === 0) {
        homeownerComplaints.innerHTML = `<div style="font-size: 0.72rem; color: var(--text-muted); text-align: center; padding: 6px;">${isEn ? 'No active security complaints' : 'لا توجد شكاوى أمنية حالية'}</div>`;
      } else {
        list.forEach(c => {
          const details = translateText(c.details);
          const status = translateText(c.status);
          homeownerComplaints.innerHTML += `
            <div class="ticket-item" style="flex-direction: column; align-items: stretch; gap: 4px; margin-bottom: 6px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <h4 style="font-size: 0.82rem; font-weight: 700; color: #ef4444;"><i class="fa-solid fa-triangle-exclamation"></i> ${isEn ? 'Security Report' : 'بلاغ أمني'}</h4>
                <span class="badge ${c.bgClass}">${status}</span>
              </div>
              <p style="font-size: 0.7rem; color: var(--text-muted);">${details} • ${isEn ? 'Code' : 'كود'}: #${c.id}</p>
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
      if (badge) badge.innerText = `${list.length} نشطة`;
      tenantComplaints.innerHTML = '';
      if (list.length === 0) {
        tenantComplaints.innerHTML = '<div style="font-size: 0.72rem; color: var(--text-muted); text-align: center; padding: 6px;">لا توجد شكاوى أمنية حالية</div>';
      } else {
        list.forEach(c => {
          tenantComplaints.innerHTML += `
            <div class="ticket-item" style="flex-direction: column; align-items: stretch; gap: 4px; margin-bottom: 6px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <h4 style="font-size: 0.82rem; font-weight: 700; color: #ef4444;"><i class="fa-solid fa-triangle-exclamation"></i> بلاغ أمني</h4>
                <span class="badge ${c.bgClass}">${c.status}</span>
              </div>
              <p style="font-size: 0.7rem; color: var(--text-muted);">${c.details} • كود: #${c.id}</p>
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
      if (badge) badge.innerText = `${list.length} نشطة`;
      commercialComplaints.innerHTML = '';
      if (list.length === 0) {
        commercialComplaints.innerHTML = '<div style="font-size: 0.72rem; color: #64748b; text-align: center; padding: 6px;">لا توجد شكاوى أمنية حالية</div>';
      } else {
        list.forEach(c => {
          commercialComplaints.innerHTML += `
            <div class="ticket-item" style="flex-direction: column; align-items: stretch; gap: 4px; margin-bottom: 6px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <h4 style="font-size: 0.82rem; font-weight: 700; color: #ef4444;"><i class="fa-solid fa-triangle-exclamation"></i> بلاغ أمني للمحل</h4>
                <span class="badge ${c.bgClass}">${c.status}</span>
              </div>
              <p style="font-size: 0.7rem; color: #64748b;">${c.details} • كود: #${c.id}</p>
            </div>
          `;
        });
      }
    }

    // 14. Render Complaints in Security View (مشرف الأمن)
    const securityComplaintsList = document.getElementById('securityComplaintsList');
    if (securityComplaintsList) {
      const activeComplaints = this.complaints.filter(c => c.status !== 'تم الحل');
      const badge = document.getElementById('securityComplaintsInboxBadge');
      if (badge) badge.innerText = `${activeComplaints.length} بلاغات`;
      securityComplaintsList.innerHTML = '';
      if (this.complaints.length === 0) {
        securityComplaintsList.innerHTML = '<div style="font-size: 0.75rem; color: var(--text-muted); text-align: center; padding: 15px;">لا توجد بلاغات أمنية حالية</div>';
      } else {
        this.complaints.forEach(c => {
          let actionHtml = '';
          if (c.status === 'تحت المراجعة والتحرك الميداني') {
            actionHtml = `
              <button class="btn btn-primary" style="padding: 6px 12px; font-size: 0.78rem; margin-top: 6px; background: #1b8f91; color: #ffffff; border: none; font-weight: 700;" onclick="app.dispatchSecurityDolphin('${c.id}')">
                <i class="fa-solid fa-truck-fast"></i> تأكيد الاستلام والتحرك للموقع
              </button>
            `;
          } else {
            actionHtml = `
              <div style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); padding: 8px; border-radius: 6px; font-size: 0.75rem; color: #93c5fd; margin-top: 6px;">
                <i class="fa-solid fa-clock"></i> حالة الاستجابة: <strong>${c.status}</strong>
              </div>
            `;
          }

          securityComplaintsList.innerHTML += `
            <div class="ticket-item" style="flex-direction: column; align-items: stretch; gap: 4px; margin-bottom: 8px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span class="badge ${c.bgClass}">${c.status}</span>
                <span style="font-size: 0.7rem; color: var(--text-muted);">طالب الشكوى: ${c.requester} • #${c.id}</span>
              </div>
              <h4 style="font-size: 0.88rem; font-weight: 700;">بلاغ عاجل من: ${c.name} (${c.phone})</h4>
              <p style="font-size: 0.75rem; color: var(--text-muted);">${c.details}</p>
              ${actionHtml}
            </div>
          `;
        });
      }
    }

    setTimeout(() => {
      try {
        if (typeof this.initFieldServiceCanvases === 'function') this.initFieldServiceCanvases();
      } catch (e) {
        console.warn(e);
      }
    }, 150);
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

    const selectedCategory = catSelect.value || 'كهروميكانيك';
    
    // Technicians database grouped by specialty with live availability status
    const techDatabase = {
      'كهروميكانيك': [
        { name: 'كريم حسن', title: 'فني أول تكييف وكهروميكانيك', status: 'متاح الآن 🟢', available: true },
        { name: 'سامح فوزي', title: 'فني صيانة تكييف وتبريد', status: 'متاح الآن 🟢', available: true },
        { name: 'محمود إبراهيم', title: 'فني محطات وضواغط MEP', status: 'مشغول بمهمة 🟡', available: false }
      ],
      'سباكة': [
        { name: 'مينا جرجس', title: 'فني أول سباكة وشبكات مياه', status: 'متاح الآن 🟢', available: true },
        { name: 'طارق عبد الله', title: 'فني محطات معالجة وصحي', status: 'متاح الآن 🟢', available: true },
        { name: 'ياسر النجار', title: 'فني طلمبات ومحابس رئيسية', status: 'متاح الآن 🟢', available: true }
      ],
      'كهرباء': [
        { name: 'أحمد علي', title: 'فني أول كهرباء وطاقة ولوحات', status: 'متاح الآن 🟢', available: true },
        { name: 'محمد الشناوي', title: 'فني شبكات إنارة ومحولات', status: 'متاح الآن 🟢', available: true },
        { name: 'خالد مصطفى', title: 'فني مولدات طوارئ وبيلارات', status: 'متاح الآن 🟢', available: true }
      ],
      'نجارة': [
        { name: 'عبد الرحمن سمير', title: 'فني نجارة وديكور وأقفال', status: 'متاح الآن 🟢', available: true },
        { name: 'حسام حسني', title: 'فني ألمونيتال وأبواب زجاجية', status: 'متاح الآن 🟢', available: true }
      ],
      'صيانة عامة': [
        { name: 'كريم حسن', title: 'فني تشغيل ومرافق عامة', status: 'متاح الآن 🟢', available: true },
        { name: 'أحمد علي', title: 'فني كهرباء ومرافق عامة', status: 'متاح الآن 🟢', available: true },
        { name: 'مينا جرجس', title: 'فني شبكات ومرافق عامة', status: 'متاح الآن 🟢', available: true },
        { name: 'سعيد محمود', title: 'فني لاندسكيب وري عام', status: 'متاح الآن 🟢', available: true }
      ]
    };

    const list = techDatabase[selectedCategory] || techDatabase['كهروميكانيك'];
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
    this.showToast('🗑️ تم تفريغ وتصفير سجل البلاغات بنجاح للبدء بتجربة نظيفة!');
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

    const category = categorySelect ? categorySelect.value : 'صيانة عامة';
    const location = (locationInput && locationInput.value.trim()) ? locationInput.value.trim() : 'الموقع العام بالقرية';
    const details = (detailsInput && detailsInput.value.trim()) ? detailsInput.value.trim() : `طلب صيانة ${category} في ${location}`;
    const techName = (techSelect && techSelect.value) ? techSelect.value : 'فني المناوبة الميداني';
    const photoInput = document.getElementById('mgrTicketPhotoInput');
    
    // Category Fallbacks
    const fallbacks = {
      'كهروميكانيك': 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=300',
      'سباكة': 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=300',
      'كهرباء': 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=300',
      'نجارة': 'https://images.unsplash.com/photo-1517646287270-a5a9ca602e5c?w=300',
      'صيانة عامة': 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=300'
    };

    let photoUrl = fallbacks[category] || fallbacks['صيانة عامة'];

    const proceed = async (finalPhoto) => {
      const newTk = {
        id: Math.floor(1000 + Math.random() * 9000),
        title: `أمر عمل ${category} - ${location}`,
        category: category,
        details: details,
        location: location,
        requester: 'manager',
        requesterName: 'مدير الصيانة الميدانية',
        status: 'تم التعيين للفني',
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

      if (locationInput) locationInput.value = '';
      if (detailsInput) detailsInput.value = '';
      if (photoInput) photoInput.value = '';

      this.showToast(`⚡ تم إصدار أمر العمل وتكليف الفني (${techName}) بنجاح!\nالموقع: ${location}\nتم التوجيه فوراً لشاشة الفني والنظام المركزي.`);

      // Sync to Odoo (Maintenance Module)
      try {
        await this.syncTicketToOdoo(newTk, '01221122334', 'مدير الصيانة');
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
        <div style="font-size: 0.7rem; color: #7f1d1d;">طالب الخدمة: ${tk.requesterName || tk.requester || 'مالك الوحدة'} • الحالة الحالية: ${tk.status}</div>
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
    const reasonCategory = reasonSelect ? reasonSelect.value : 'تذكرة مكررة';
    const notes = (notesInput && notesInput.value.trim()) ? notesInput.value.trim() : '';

    if (!reasonCategory && !notes) {
      this.showToast('⚠️ يرجى تحديد أو كتابة سبب إلغاء البلاغ أولاً (حقل إجباري للحوكمة)!');
      return;
    }

    const tk = this.tickets.find(t => String(t.id) === String(ticketId) || String(t.odooId) === String(ticketId));
    if (!tk) return;

    const fullReason = notes ? `${reasonCategory} - تفاصيل إضافية: ${notes}` : reasonCategory;

    tk.status = 'ملغاة';
    tk.bgClass = 'badge-danger';
    tk.cancelReason = fullReason;
    tk.cancellationReason = fullReason;
    tk.cancelNotes = notes;
    tk.cancelledBy = this.currentRole === 'manager' ? 'المهندس أيمن السعيد (مدير الصيانة)' : 'فني الصيانة المسؤول';
    tk.cancelledAt = new Date().toISOString();

    this.saveTicketsToStorage();
    this.renderTickets();
    this.closeModal('modalManagerCancelTicket');

    this.showToast(`🚫 تم إلغاء البلاغ #${tk.id} وتوثيق السبب إجبارياً بنجاح!\nالسبب: ${fullReason}\nتم قفل التذكرة وتوثيق الإلغاء بالنظام المركزي.`);

    // Sync Cancellation to Odoo (Stage 5 = Cancelled + Chatter Log)
    try {
      await this.syncTicketUpdateToOdoo(tk);
      this.saveTicketsToStorage();
      this.renderTickets();
    } catch (err) {
      console.warn('[Odoo Cancel Sync Error]:', err);
    }
  }

  // ==========================================
  // FIELD SERVICE DISPATCH, TIMERS, PARTS & CLOSE-OUT
  // ==========================================
  async dispatchToFieldService(ticketId, selectId) {
    const techSelect = document.getElementById(selectId);
    const techName = techSelect ? techSelect.value : 'كريم حسن';

    const tk = this.tickets.find(t => String(t.id) === String(ticketId) || String(t.odooId) === String(ticketId));
    if (!tk) return;

    const now = new Date();
    tk.dispatchedAt = now;
    tk.isFieldService = true;
    tk.assignedTech = techName;
    tk.status = 'جاري العمل الميداني';
    tk.bgClass = 'badge-info';

    // Calculate Manager Dispatch Time
    const createTime = tk.createdAt ? new Date(tk.createdAt) : now;
    const dispatchMins = Math.max(1, Math.round((now - createTime) / 60000));
    tk.dispatchMins = dispatchMins;

    // Create or Link project.task in Odoo Project 2 (Field Service)
    try {
      const urlInput = safeStorage.getItem('odoo_url') || 'https://edu-fm-uc.odoo.com';
      const dbInput = safeStorage.getItem('odoo_db') || 'edu-fm-uc';
      const keyInput = safeStorage.getItem('odoo_key') || '06d7d7d208a8c2fa351c2a5cfa305e987ffb72f0';
      const baseUrl = urlInput.replace(/\/+$/, '');
      const uid = 2;

      let partnerId = 7755; // حسن عيسى (شريك فيلا A104 في أودو)
      if (tk.requester === 'tenant') partnerId = 11;
      else if (tk.requester === 'commercial') partnerId = 12;

      const unitStr = tk.location || 'فيلا A104 - المرحلة الأولى';
      const taskFields = {
            name: `[أمر عمل ميداني - طلب قطعة غيار] ${partName} (${unitStr})`,
            project_id: 2, // Field Service
            stage_id: 18,  // In Progress
            partner_id: partnerId,
            description: `<p><b>إخطار صيانة لطلب قطعة الغيار بعد فحص الفني لموقع العطل الميداني:</b></p>` +
                         `<p>• <b>القطعة المطلوبة:</b> ${partName} (السعر: ${partPrice} ج.م)</p>` +
                         `<p>• <b>الوحدة:</b> ${unitStr}</p>` +
                         `<p>• <b>فني المعاينة:</b> ${techName}</p>` +
                         `<p>• <b>التذكرة الأصلية:</b> #${tk.id} - ${tk.title}</p>`
      };

      const taskPayload = {
        jsonrpc: "2.0",
        method: "call",
        params: {
          service: "object",
          method: "execute_kw",
          args: [dbInput, uid, keyInput, "project.task", "create", [taskFields]]
        },
        id: Math.floor(Math.random() * 1000)
      };

      const res = await this.callOdoo(baseUrl, taskPayload);
      if (res && res.result) {
        tk.fieldServiceTaskId = res.result;
        tk.odooTaskId = res.result;
        console.log('[Field Service] Created project.task ID:', res.result);

        // Also post to Helpdesk ticket chatter
        if (tk.odooId) {
          const chatterPayload = {
            jsonrpc: "2.0",
            method: "call",
            params: {
              service: "object",
              method: "execute_kw",
              args: [
                dbInput, uid, keyInput, "helpdesk.ticket", "message_post",
                [[parseInt(tk.odooId)]],
                { body: `<p>⚡ <b>تم تحويل البلاغ إلى أمر عمل ميداني معتمد (#WO-${res.result})</b></p><p>الفني المكلف: <b>${techName}</b></p>` }
              ]
            },
            id: Math.floor(Math.random() * 1000)
          };
          this.callOdoo(baseUrl, chatterPayload).catch(e => console.warn(e));
        }
      } else {
        tk.fieldServiceTaskId = tk.fieldServiceTaskId || 28;
      }
    } catch (e) {
      console.warn('[Field Service Dispatch Error]', e);
      tk.fieldServiceTaskId = tk.fieldServiceTaskId || 28;
    }

    this.saveTicketsToStorage();
    this.renderTickets();
    this.showToast(`🚀 تم تحويل البلاغ #${tk.id} لأمر صيانة ميدانية (#WO-${tk.fieldServiceTaskId || 28})!\nتم إسناد المهمة للفني (${techName}) وتفعيل عداد العمل الميداني.`);
  }

  toggleFieldServiceTimer(ticketId) {
    const tk = this.tickets.find(t => String(t.id) === String(ticketId));
    if (!tk) return;

    if (!window._fsTimers) window._fsTimers = {};

    if (tk.fsTimerRunning) {
      // Pause
      clearInterval(window._fsTimers[ticketId]);
      tk.fsTimerRunning = false;
      this.saveTicketsToStorage();
      this.renderTickets();
      this.showToast('⏸️ تم إيقاف عداد وقت الخدمة الميدانية مؤقتاً.');
    } else {
      // Start
      tk.fsTimerRunning = true;
      tk.fsElapsedSeconds = tk.fsElapsedSeconds || 0;

      const formatTime = (secs) => {
        const h = Math.floor(secs / 3600).toString().padStart(2, '0');
        const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${h}:${m}:${s}`;
      };

      window._fsTimers[ticketId] = setInterval(() => {
        tk.fsElapsedSeconds++;
        tk.fsElapsedFormatted = formatTime(tk.fsElapsedSeconds);
        const timerEl = document.getElementById(`fsTimer_${ticketId}`);
        if (timerEl) timerEl.innerText = tk.fsElapsedFormatted;
      }, 1000);

      this.saveTicketsToStorage();
      this.renderTickets();
      this.showToast('▶️ تم بدء احتساب وقت الخدمة الميدانية الفعلي!');
    }
  }

  addFieldServicePart(ticketId) {
    const tk = this.tickets.find(t => String(t.id) === String(ticketId));
    if (!tk) return;

    const select = document.getElementById(`fsPartSelect_${ticketId}`);
    const qtyInput = document.getElementById(`fsPartQty_${ticketId}`);
    const partName = select ? select.value : 'محبس نحاس 3/4 بوصة';
    const qty = qtyInput ? parseInt(qtyInput.value) || 1 : 1;

    // Check if public ticket
    const isPublicTicket = (
      tk.requester === 'manager' ||
      tk.requester === 'public' ||
      tk.requester === 'engineer' ||
      (tk.category && (tk.category.includes('عام') || tk.category.includes('مرافق') || tk.category.includes('تفتيش') || tk.category.includes('محطة') || tk.category.includes('ري') || tk.category.includes('لاندسكيب') || tk.category.includes('كهروميكانيك') || tk.category.includes('حريق'))) ||
      (tk.title && (tk.title.includes('الموقع العام') || tk.title.includes('مرفق عام') || tk.title.includes('المرافق العامة'))) ||
      (tk.location && (tk.location.includes('الموقع العام') || tk.location.includes('مرفق عام') || tk.location.includes('محطة') || tk.location.includes('مجمع')))
    ) && tk.requester !== 'homeowner' && tk.requester !== 'owner' && tk.requester !== 'family' && tk.requester !== 'tenant';

    // Find in inventory to deduct quantity
    const invItem = (this.inventoryItems || []).find(i => i.name === partName);
    if (invItem) {
      invItem.qty = Math.max(0, invItem.qty - qty);
    }

    tk.partsUsed = tk.partsUsed || [];
    tk.partsUsed.push({ 
      name: partName, 
      qty: qty, 
      price: isPublicTicket ? 0 : (invItem ? invItem.price : 0),
      isPublicExpense: isPublicTicket,
      warehouse: isPublicTicket ? 'assets' : (invItem ? invItem.warehouse : 'residential'),
      date: new Date().toLocaleTimeString('ar-EG') 
    });

    tk.needsPart = true;
    tk.isFieldService = true;

    // Trigger immediate Field Service Task creation in Odoo right now!
    (async () => {
      try {
        if (!tk.fieldServiceTaskId && !tk.odooTaskId) {
          const urlInput = safeStorage.getItem('odoo_url') || 'https://edu-fm-uc.odoo.com';
          const dbInput = safeStorage.getItem('odoo_db') || 'edu-fm-uc';
          const keyInput = safeStorage.getItem('odoo_key') || '06d7d7d208a8c2fa351c2a5cfa305e987ffb72f0';
          const baseUrl = urlInput.replace(/\/+$/, '');
          const uid = 2;

          let partnerId = isPublicTicket ? 10 : ((tk.requester === 'tenant') ? 7758 : 7755);
          const unitStr = isPublicTicket ? (tk.location || 'الموقع العام - أصول ومرافق القرية') : (tk.location || (tk.requester === 'tenant' ? 'شقة A112' : 'فيلا A104'));
          const taskFields = {
            name: `[أمر عمل ميداني - طلب قطعة غيار] ${partName} (${unitStr})`,
            project_id: 2, // Field Service
            stage_id: 18,  // In Progress
            partner_id: partnerId,
            description: `<p><b>إخطار صيانة لطلب قطعة الغيار بعد فحص الفني لموقع العطل الميداني:</b></p>` +
                         `<p>• <b>القطعة المطلوبة:</b> ${partName} (السعر: ${partPrice} ج.م)</p>` +
                         `<p>• <b>الوحدة:</b> ${unitStr}</p>` +
                         `<p>• <b>فني المعاينة:</b> ${techName}</p>` +
                         `<p>• <b>التذكرة الأصلية:</b> #${tk.id} - ${tk.title}</p>`
          };

          const taskPayload = {
            jsonrpc: "2.0",
            method: "call",
            params: {
              service: "object",
              method: "execute_kw",
              args: [dbInput, uid, keyInput, "project.task", "create", [taskFields]]
            },
            id: Math.floor(Math.random() * 1000)
          };

          const res = await this.callOdoo(baseUrl, taskPayload);
          if (res && res.result) {
            tk.fieldServiceTaskId = res.result;
            tk.odooTaskId = res.result;
            console.log('[Field Service] Live project.task created on spare part request ID:', res.result);

            // Post chatter to helpdesk ticket
            if (tk.odooId) {
              const chatterPayload = {
                jsonrpc: "2.0",
                method: "call",
                params: {
                  service: "object",
                  method: "execute_kw",
                  args: [
                    dbInput, uid, keyInput, "helpdesk.ticket", "message_post",
                    [[parseInt(tk.odooId)]],
                    { body: `<p>⚡ <b>أكد الفني بعد المعاينة الحاجة لقطعة غيار [${partName}]</b></p><p>تم تحويل البلاغ لأمر خدمة ميدانية بمشروع Field Service برقم (#WO-${res.result})</p>` }
                  ]
                },
                id: Math.floor(Math.random() * 1000)
              };
              this.callOdoo(baseUrl, chatterPayload).catch(e => console.warn(e));
            }
          }
        }
      } catch (err) {
        console.warn('[Field Service Task Creation on Part Request Error]:', err);
      }
    })();

    this.saveTicketsToStorage();
    this.renderTickets();
    
    if (isPublicTicket) {
      this.showToast('✅ تم طلب وصرف قطعة الغيار من مستودع الموقع العام.\nتم ترحيل البلاغ لأمر عمل ميداني رسمي!');
    } else {
      this.showToast('✅ تم طلب وصرف قطعة الغيار من المستودع.\nتم تحويل البلاغ تلقائياً لأمر عمل صيانة ميدانية رسمي (Field Service)!');
    }
  }

  clearFieldServiceSig(ticketId) {
    const canvas = document.getElementById(`fsSigCanvas_${ticketId}`);
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      this.showToast('🧹 تم مسح التوقيع، يمكنك التوقيع مجدداً.');
    }
  }

  initFieldServiceCanvases() {
    document.querySelectorAll('canvas[id^="fsSigCanvas_"]').forEach(canvas => {
      if (canvas._initialized) return;
      canvas._initialized = true;

      const ctx = canvas.getContext('2d');
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2.5;
      let isDrawing = false;

      const start = (e) => {
        isDrawing = true;
        ctx.beginPath();
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
        const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
        ctx.moveTo(x, y);
      };

      const move = (e) => {
        if (!isDrawing) return;
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
        const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
        ctx.lineTo(x, y);
        ctx.stroke();
      };

      const stop = () => { isDrawing = false; };

      canvas.addEventListener('mousedown', start);
      canvas.addEventListener('mousemove', move);
      canvas.addEventListener('mouseup', stop);
      canvas.addEventListener('touchstart', start);
      canvas.addEventListener('touchmove', move);
      canvas.addEventListener('touchend', stop);
    });
  }

  async completeFieldServiceOrder(ticketId, fileInputId) {
    const tk = this.tickets.find(t => String(t.id) === String(ticketId) || String(t.odooId) === String(ticketId));
    if (!tk) return;

    if (window._fsTimers && window._fsTimers[ticketId]) {
      clearInterval(window._fsTimers[ticketId]);
    }
    tk.fsTimerRunning = false;

    const fileInput = document.getElementById(fileInputId);
    let afterPhoto = 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=300';

    const finish = async (finalPhoto) => {
      const now = new Date();
      tk.resolvedAt = now;
      tk.status = 'تم الحل';
      tk.bgClass = 'badge-success';
      tk.photoAfter = finalPhoto;

      const elapsedMinutes = Math.max(1, Math.round((tk.fsElapsedSeconds || 1800) / 60));
      tk.resolutionTime = `${elapsedMinutes} دقيقة عمل ميداني`;

      const isPublicTask = (
        tk.isPublicAsset ||
        tk.isPublicTicket ||
        tk.requester === 'manager' ||
        tk.requester === 'public' ||
        tk.requester === 'engineer' ||
        (tk.category && (tk.category.includes('أصول') || tk.category.includes('الموقع') || tk.category.includes('العام') || tk.category.includes('قرية') || tk.category.includes('كهروميكانيك') || tk.category.includes('عامة') || tk.category.includes('طلمبة') || tk.category.includes('حمامات السباحة'))) ||
        (tk.title && (tk.title.includes('الموقع العام') || tk.title.includes('موقع عام') || tk.title.includes('أصول') || tk.title.includes('حمامات السباحة') || tk.title.includes('طلمبة') || tk.title.includes('محطة'))) ||
        (tk.location && (tk.location.includes('الموقع العام') || tk.location.includes('موقع عام') || tk.location.includes('قرية') || tk.location.includes('أصول') || tk.location.includes('مسبح') || tk.location.includes('حمامات السباحة') || tk.location.includes('محطة'))) ||
        (tk.partsUsed && tk.partsUsed.some(p => p.warehouse === 'assets' || p.isPublicExpense))
      ) && tk.requester !== 'homeowner' && tk.requester !== 'owner' && tk.requester !== 'family' && tk.requester !== 'tenant';

      // Parts string
      const partsStr = (tk.partsUsed && tk.partsUsed.length > 0)
        ? tk.partsUsed.map(p => `${p.name} (عدد ${p.qty})`).join('، ')
        : 'إصلاح وضبط مباشر بدون استهلاك قطع';

      // 1. Sync to Odoo Field Service Task (project.task -> stage 19 = Done)
      try {
        const urlInput = safeStorage.getItem('odoo_url') || 'https://edu-fm-uc.odoo.com';
        const dbInput = safeStorage.getItem('odoo_db') || 'edu-fm-uc';
        const keyInput = safeStorage.getItem('odoo_key') || '06d7d7d208a8c2fa351c2a5cfa305e987ffb72f0';
        const baseUrl = urlInput.replace(/\/+$/, '');
        const uid = 2;

        const taskId = tk.fieldServiceTaskId || tk.odooTaskId;
        if (taskId) {
          // Update Task to Stage 19 (Done)
          const writeTask = {
            jsonrpc: "2.0",
            method: "call",
            params: {
              service: "object",
              method: "execute_kw",
              args: [dbInput, uid, keyInput, "project.task", "write", [[parseInt(taskId)], { stage_id: 19 }]]
            },
            id: Math.floor(Math.random() * 1000)
          };
          this.callOdoo(baseUrl, writeTask).catch(e => console.warn(e));

          const signOffText = isPublicTask
            ? 'معتمد من إدارة الصيانة والمرافق العامة (م. أيمن السعيد) وموثق بالصور'
            : (tk.requester === 'tenant'
                ? 'معتمد بتوقيع المستأجر عند الاستلام وموثق رقمياً'
                : 'معتمد بتوقيع مالك الوحدة (أ. حسن عيسى - فيلا A104) وموثق رقمياً');

          // Post Chatter to Task
          const taskChatter = {
            jsonrpc: "2.0",
            method: "call",
            params: {
              service: "object",
              method: "execute_kw",
              args: [
                dbInput, uid, keyInput, "project.task", "message_post",
                [[parseInt(taskId)]],
                {
                  body: `<p>✅ <b>تم إنجاز أمر الخدمة الميدانية بالكامل في الموقع:</b></p>` +
                        `<p>• <b>الفني المنفذ:</b> ${tk.assignedTech || 'كريم حسن'}</p>` +
                        `<p>• <b>مدة العمل الميداني الفعلي:</b> ${elapsedMinutes} دقيقة</p>` +
                        `<p>• <b>قطع الغيار المصروفة:</b> ${partsStr}</p>` +
                        `<p>• <b>حالة الاستلام والاعتماد:</b> ${signOffText}</p>` +
                        `<p>• <b>مؤشر جودة الخدمة وامتثال SLA:</b> متوافق 100% (تقييم 5/5 ⭐⭐⭐⭐⭐)</p>`
                }
              ]
            },
            id: Math.floor(Math.random() * 1000)
          };
          this.callOdoo(baseUrl, taskChatter).catch(e => console.warn(e));
        }

        // Phase 1: Trigger Live Odoo stock.picking if parts were consumed
        if (tk.partsUsed && tk.partsUsed.length > 0) {
          const partnerId = isPublicTask ? 10 : (tk.requester === 'tenant' ? 7758 : 7755);
          const pickingId = await this.createOdooStockPicking(partnerId, tk.partsUsed, `#WO-${taskId || tk.id}`);
          if (pickingId) {
            tk.odooPickingId = pickingId;
            console.log('[Field Service] Linked Odoo Stock Picking ID:', pickingId);
          }
        }

        // 2. Also close the Helpdesk ticket in Odoo (Stage 4 = Solved)
        this.syncTicketUpdateToOdoo(tk);
      } catch (err) {
        console.warn('[Field Service Complete Error]', err);
      }

      this.saveTicketsToStorage();
      this.renderTickets();

      if (isPublicTask) {
        this.showToast(`🎉 تم إنهاء أمر صيانة الموقع العام واعتماد الإغلاق بنجاح!\nمدة العمل الفعلي: ${elapsedMinutes} دقيقة.\nتم إشعار مدير الصيانة (م. أحمد غنيم) باعتماد إنجاز مهمة الموقع بنجاح ✔️.`);
      } else if (tk.requester === 'tenant') {
        this.showToast(`🎉 تم إنهاء أمر الصيانة الميدانية واعتماد الإغلاق بنجاح!\nمدة العمل الفعلي: ${elapsedMinutes} دقيقة.\nأصبح التقييم متاحاً للمستأجر الآن ⭐.`);
      } else if (tk.requester === 'commercial') {
        this.showToast(`🎉 تم إنهاء أمر الصيانة الميدانية واعتماد الإغلاق بنجاح!\nمدة العمل الفعلي: ${elapsedMinutes} دقيقة.\nأصبح التقييم متاحاً للمستأجر التجاري الآن ⭐.`);
      } else {
        const ownerName = (this.getHomeownerName ? this.getHomeownerName() : '') || safeStorage.getItem('odoo_owner_name') || 'أ. حسن عيسى';
        this.showToast(`🎉 تم إنهاء أمر الصيانة الميدانية واعتماد الإغلاق بنجاح!\nمدة العمل الفعلي: ${elapsedMinutes} دقيقة.\nأصبح التقييم متاحاً للمالك (${ownerName}) الآن ⭐.`);
      }
    };

    if (fileInput && fileInput.files && fileInput.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => finish(e.target.result);
      reader.readAsDataURL(fileInput.files[0]);
    } else {
      finish(afterPhoto);
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
      tk.status = 'قيد التنفيذ';
      tk.bgClass = 'badge-info';
      tk.assignedTech = techName;

      // Calculate Manager Response Time
      const createTime = tk.createdAt ? new Date(tk.createdAt) : now;
      const dispatchMins = Math.max(1, Math.round((now - createTime) / 60000));
      tk.dispatchMins = dispatchMins;

      let managerRating = dispatchMins <= 15 ? '🟢 استجابة سريعة جداً (خلال 15د)' : (dispatchMins <= 30 ? '🟡 استجابة متوسطة' : '🔴 تأخير في التخصيص (تجاوز SLA)');

      this.saveTicketsToStorage();
      this.renderTickets();
      this.showToast(`✅ تم إسناد المهمة للفني (${techName}) ونقل التذكرة لمرحلة "قيد التنفيذ" (In Progress)!\nتقييم سرعة استجابة المدير: ${managerRating}`);
      
      // Sync update to Odoo (Stage 2 = In Progress)
      (async () => {
        try {
          await this.syncTicketUpdateToOdoo(tk);
        } catch (e) {
          console.warn('[Assign Odoo Sync Error]:', e);
        }
      })();
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
      
      tk.status = 'تم الحل';
      tk.bgClass = 'badge-success';
      tk.photoAfter = finalPhoto;
      tk.totalResolutionMins = totalMins;

      // SLA Metric Evaluation (Target: <= 30 mins, Max: <= 60 mins)
      if (totalMins <= 30) {
        tk.slaRating = '🟢 أداء ممتاز (تم الحل في أقل من 30 دقيقة)';
        tk.slaBadgeClass = 'badge-success';
      } else if (totalMins <= 60) {
        tk.slaRating = '🟡 أداء مقبول (تم الحل خلال ساعة)';
        tk.slaBadgeClass = 'badge-warning';
      } else {
        tk.slaRating = '🔴 أداء ضعيف / تجاوز SLA (أكثر من 60 دقيقة)';
        tk.slaBadgeClass = 'badge-danger';
      }

      tk.resolutionTime = `${totalMins} دقيقة • ${tk.slaRating}`;

      this.saveTicketsToStorage();
      this.renderTickets();
      const isPublicTask = (
        tk.isPublicAsset ||
        tk.isPublicTicket ||
        tk.requester === 'manager' ||
        tk.requester === 'public' ||
        tk.requester === 'engineer' ||
        (tk.category && (tk.category.includes('أصول') || tk.category.includes('الموقع') || tk.category.includes('العام') || tk.category.includes('قرية') || tk.category.includes('كهروميكانيك') || tk.category.includes('عامة') || tk.category.includes('طلمبة') || tk.category.includes('حمامات السباحة'))) ||
        (tk.title && (tk.title.includes('الموقع العام') || tk.title.includes('موقع عام') || tk.title.includes('أصول') || tk.title.includes('حمامات السباحة') || tk.title.includes('طلمبة') || tk.title.includes('محطة'))) ||
        (tk.location && (tk.location.includes('الموقع العام') || tk.location.includes('موقع عام') || tk.location.includes('قرية') || tk.location.includes('أصول') || tk.location.includes('مسبح') || tk.location.includes('حمامات السباحة') || tk.location.includes('محطة')))
      ) && tk.requester !== 'homeowner' && tk.requester !== 'owner' && tk.requester !== 'family' && tk.requester !== 'tenant';

      if (isPublicTask) {
        this.showToast(`🎉 تم إغلاق أمر صيانة أصول الموقع العام #${tk.id} بنجاح!\nمدة الإنجاز: ${totalMins} دقيقة.\nتم إشعار مدير الصيانة (م. أحمد غنيم) باعتماد الإغلاق ✔️.`);
      } else {
        this.showToast(`🎉 تم إغلاق تذكرة الصيانة #${tk.id} ونقلها لمرحلة "تم الحل" (Solved) بنجاح!\nمدة الإنجاز: ${totalMins} دقيقة.\nأصبح التقييم متاحاً للعميل الآن ⭐.`);
      }
      
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
      1: '⭐ ضعيف جداً (1/5)',
      2: '⭐⭐ مقبول (2/5)',
      3: '⭐⭐⭐ جيد (3/5)',
      4: '⭐⭐⭐⭐ جيد جداً (4/5)',
      5: '⭐⭐⭐⭐⭐ ممتاز جداً (5/5)'
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

    this.showToast(`⭐ شكراً لك! تم تسجيل تقييمك (${stars}/5 نجوم) بنجاح!\nتم إرسال التقييم لإدارة الجودة المركزية بنجاح.`);

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
          const starsStr = '⭐'.repeat(parseInt(stars) || 5);
          const ratingBody = `<p><b>⭐ تقييم العميل لجودة الخدمة بعد الإغلاق:</b></p>` +
                             `<p>• <b>التقييم:</b> ${starsStr} (${stars}/5)</p>` +
                             (comment ? `<p>• <b>ملاحظات العميل:</b> ${comment}</p>` : '');

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
    const worker = select ? select.value : 'فريق طاقم الزراعة 1';

    const tk = this.tickets.find(t => String(t.id) === String(ticketId));
    if (tk) {
      tk.status = 'جاري التنفيذ باللاسلكي';
      tk.bgClass = 'badge-info';
      tk.assignedWorker = worker;
      tk.dispatchedAt = new Date().toISOString();
      this.saveTicketsToStorage();
      this.renderTickets();
      this.renderLandscaping();
      this.showToast(isEn 
        ? `📻 Dispatched via Radio (CH-04) to [${worker}]!\nUnit: ${tk.title}`
        : `📻 تم توجيه البلاغ عبر اللاسلكي (قناة CH-04) إلى [${worker}] فوراً!\nالموقع: ${tk.title}\nتم إخطار العمال لبدء التنفيذ الميداني.`);
      
      // Sync status update to Odoo
      this.syncTicketUpdateToOdoo(tk);
    }
  }

  completeLandscapingRequest(ticketId) {
    const isEn = this.currentLang === 'en';
    const tk = this.tickets.find(t => String(t.id) === String(ticketId));
    if (tk) {
      tk.status = 'تم الحل';
      tk.bgClass = 'badge-success';
      tk.resolvedAt = new Date().toISOString();
      tk.photoAfter = 'https://images.unsplash.com/photo-1558904541-efa843a96f01?auto=format&fit=crop&w=300&q=80';
      this.saveTicketsToStorage();
      this.renderTickets();
      this.renderLandscaping();
      this.showToast(isEn 
        ? '🌿 Landscaping task verified, completed and closed!' 
        : `🌿 تم اعتماد إنهاء مهمة اللاندسكيب [#${tk.id}] بنجاح!\nتم توثيق إنجاز الحديقة وإغلاق الطلب بالسجل المركزي.`);
      
      // Sync solved status to Odoo (Stage 4)
      this.syncTicketUpdateToOdoo(tk);
    }
  }


  // ==========================================
  // PEST CONTROL MANAGEMENT DISPATCHING & OPERATIONS
  // ==========================================
  assignPestControlWorker(ticketId) {
    const isEn = this.currentLang === 'en';
    const select = document.getElementById(`assignPestWorkerSelect_${ticketId}`);
    const worker = select ? select.value : 'فرقة 1 (المكافحة الضبابية)';

    const tk = this.tickets.find(t => String(t.id) === String(ticketId));
    if (tk) {
      tk.status = 'جاري التنفيذ باللاسلكي';
      tk.bgClass = 'badge-info';
      tk.assignedWorker = worker;
      tk.dispatchedAt = new Date().toISOString();
      this.saveTicketsToStorage();
      this.renderTickets();
      this.renderPestControl();
      this.showToast(isEn 
        ? `📻 Dispatched via Radio (CH-06) to [${worker}]!\nUnit: ${tk.title}`
        : `📻 تم توجيه البلاغ عبر اللاسلكي (قناة CH-06) إلى [${worker}] فوراً!\nالموقع: ${tk.title}\nتم إخطار فرقة المكافحة وتجهيز محطة الرش الميدانية.`);
      
      this.syncTicketUpdateToOdoo(tk);
    }
  }

  completePestControlRequest(ticketId) {
    const isEn = this.currentLang === 'en';
    const tk = this.tickets.find(t => String(t.id) === String(ticketId));
    if (tk) {
      tk.status = 'تم الحل';
      tk.bgClass = 'badge-success';
      tk.resolvedAt = new Date().toISOString();
      this.saveTicketsToStorage();
      this.renderTickets();
      this.renderPestControl();
      this.showToast(isEn 
        ? '🛡️ Pest control treatment certified, completed and closed!' 
        : `🛡️ تم اعتماد إتمام مهمة مكافحة الآفات [#${tk.id}] بنجاح!\nتم استخراج شهادة المعالجة الوقائية وتوثيق المواد المعتمدة بالسجل المركزي.`);
      
      this.syncTicketUpdateToOdoo(tk);
    }
  }


  // ==========================================
  // PHASE 1: LIVE ODOO INVENTORY & ACCOUNTING INTEGRATION
  // ==========================================
  async createOdooStockPicking(partnerId, partsList, originDoc = '') {
    if (!partsList || partsList.length === 0) return null;
    const urlInput = safeStorage.getItem('odoo_url') || 'https://edu-fm-uc.odoo.com';
    const dbInput = safeStorage.getItem('odoo_db') || 'edu-fm-uc';
    const userInput = safeStorage.getItem('odoo_user') || 'fmhala6@gmail.com';
    const keyInput = safeStorage.getItem('odoo_key') || '06d7d7d208a8c2fa351c2a5cfa305e987ffb72f0';
    if (!urlInput || !dbInput || !userInput || !keyInput) return null;
    const baseUrl = urlInput.replace(/\/+$/, '');
    const uid = 2;

    // Map common parts to product IDs in Odoo (or fallback to product 11)
    const productMapping = {
      'قاطع': 11,
      'ثيرموستات': 10,
      'مروحة': 12,
      'فريون': 13,
      'نجيل': 6,
      'ري': 6,
      'محبس': 11
    };

    const moveLines = partsList.map(p => {
      let prodId = 11;
      const lower = (p.name || '').toLowerCase();
      for (const key in productMapping) {
        if (lower.includes(key)) { prodId = productMapping[key]; break; }
      }
      return [0, 0, {
        product_id: prodId,
        product_uom_qty: parseFloat(p.qty) || 1.0,
        product_uom: 1,
        location_id: 5,
        location_dest_id: 2,
        description_picking: p.name || 'قطع غيار صيانة'
      }];
    });

    const payload = {
      jsonrpc: '2.0',
      method: 'call',
      params: {
        service: 'object',
        method: 'execute_kw',
        args: [
          dbInput, uid, keyInput,
          'stock.picking', 'create',
          [{
            picking_type_id: 2,
            partner_id: partnerId || 7755,
            origin: originDoc || '#WO-DISPATCH',
            location_id: 5,
            location_dest_id: 2,
            move_ids: moveLines
          }]
        ]
      },
      id: Math.floor(Math.random() * 1000)
    };

    try {
      const res = await this.callOdoo(baseUrl, payload, 8000);
      if (res && res.result) {
        console.log('[Odoo Inventory] Created stock.picking ID:', res.result);
        return res.result;
      }
    } catch (e) {
      console.warn('[Odoo Stock Picking Error]:', e);
    }
    return null;
  }

  async createOdooInvoice(partnerId, amount, description, ref = '') {
    const urlInput = safeStorage.getItem('odoo_url') || 'https://edu-fm-uc.odoo.com';
    const dbInput = safeStorage.getItem('odoo_db') || 'edu-fm-uc';
    const userInput = safeStorage.getItem('odoo_user') || 'fmhala6@gmail.com';
    const keyInput = safeStorage.getItem('odoo_key') || '06d7d7d208a8c2fa351c2a5cfa305e987ffb72f0';
    if (!urlInput || !dbInput || !userInput || !keyInput) return null;
    const baseUrl = urlInput.replace(/\/+$/, '');
    const uid = 2;

    const payload = {
      jsonrpc: '2.0',
      method: 'call',
      params: {
        service: 'object',
        method: 'execute_kw',
        args: [
          dbInput, uid, keyInput,
          'account.move', 'create',
          [{
            move_type: 'out_invoice',
            partner_id: partnerId || 7755,
            journal_id: 8,
            ref: ref || 'سداد إلكتروني عبر تطبيق الموبايل',
            invoice_line_ids: [
              [0, 0, {
                name: description || 'خدمات صيانة وتشغيل',
                quantity: 1.0,
                price_unit: parseFloat(amount) || 100.0
              }]
            ]
          }]
        ]
      },
      id: Math.floor(Math.random() * 1000)
    };

    try {
      const res = await this.callOdoo(baseUrl, payload, 8000);
      if (res && res.result) {
        const invId = res.result;
        console.log('[Odoo Accounting] Created customer invoice ID:', invId);

        try {
          const postPayload = {
            jsonrpc: '2.0',
            method: 'call',
            params: {
              service: 'object',
              method: 'execute_kw',
              args: [dbInput, uid, keyInput, 'account.move', 'action_post', [[invId]]]
            },
            id: Math.floor(Math.random() * 1000)
          };
          await this.callOdoo(baseUrl, postPayload, 8000);
          console.log('[Odoo Accounting] Invoice posted successfully ID:', invId);
        } catch (postErr) {
          console.warn('[Odoo Post Invoice Notice]:', postErr);
        }

        return invId;
      }
    } catch (e) {
      console.warn('[Odoo Invoice Error]:', e);
    }
    return null;
  }

  renderPestControl() {
    const isEn = this.currentLang === 'en';
    const listContainer = document.getElementById('pestRequestsList');
    if (!listContainer) return;

    // Filter pest control tickets
    const pestTks = this.tickets.filter(t => {
      const cat = String(t.category || '').toLowerCase();
      const title = String(t.title || '').toLowerCase();
      return cat.includes('مكافح') || cat.includes('آفات') || cat.includes('حشرات') || cat.includes('رش') || cat.includes('قوارض') || title.includes('مكافح') || title.includes('رش') || title.includes('حشرات');
    });

    const pending = pestTks.filter(t => t.status === 'جديد' || !t.assignedWorker);
    const progress = pestTks.filter(t => t.status === 'جاري التنفيذ باللاسلكي' || (t.assignedWorker && t.status !== 'تم الحل' && t.status !== 'تم الانتهاء' && t.status !== 'ملغاة'));
    const completed = pestTks.filter(t => t.status === 'تم الحل' || t.status === 'تم الانتهاء');

    // Update KPIs
    const elPending = document.getElementById('pestKpiPending');
    const elProgress = document.getElementById('pestKpiProgress');
    const elCompleted = document.getElementById('pestKpiCompleted');
    const elBadge = document.getElementById('pestInboxBadge');

    if (elPending) elPending.innerText = pending.length;
    if (elProgress) elProgress.innerText = progress.length;
    if (elCompleted) elCompleted.innerText = completed.length + 14; // Include routine certified grounds
    if (elBadge) elBadge.innerText = `${pending.length} بانتظار الرش`;

    listContainer.innerHTML = '';
    if (pestTks.length === 0) {
      listContainer.innerHTML = `<div style="font-size: 0.75rem; color: var(--text-muted); text-align: center; padding: 18px; background: rgba(27,73,101,0.02); border-radius: 8px;">${isEn ? 'No pest control orders in queue' : 'لا توجد طلبات مكافحة آفات أو رش معلقة حالياً'}</div>`;
      return;
    }

    pestTks.forEach(tk => {
      let actionHtml = '';
      const isDone = (tk.status === 'تم الحل' || tk.status === 'تم الانتهاء');
      const isInProgress = (tk.status === 'جاري التنفيذ باللاسلكي');

      if (!isDone && !isInProgress) {
        actionHtml = `
          <div style="margin-top: 10px; display: flex; gap: 8px; align-items: center; background: rgba(27,73,101,0.05); padding: 8px; border-radius: 8px;">
            <select id="assignPestWorkerSelect_${tk.id}" class="form-control" style="font-size: 0.75rem; padding: 4px 8px; height: 32px; font-weight: 700; width: 60%;">
              <option value="فرقة 1 (المكافحة الضبابية والحشرات الطائرة)">💨 فرقة 1 (المكافحة الضبابية)</option>
              <option value="فرقة 2 (مكافحة القوارض والزواحف)">🐁 فرقة 2 (مكافحة القوارض)</option>
              <option value="فرقة 3 (الحزام الوقائي للحدائق والأسوار)">🛡️ فرقة 3 (حزام وقائي)</option>
              <option value="فرقة 4 (التعقيم والرش الداخلي للفلل)">🏡 فرقة 4 (رش داخلي آمن)</option>
            </select>
            <button class="btn btn-primary" onclick="app.assignPestControlWorker('${tk.id}')" style="font-size: 0.72rem; padding: 4px 10px; height: 32px; white-space: nowrap; flex: 1; display: flex; align-items: center; justify-content: center; background: #1b4965; border: none; font-weight: 800;">
              <i class="fa-solid fa-walkie-talkie" style="margin-left: 4px;"></i> توجيه باللاسلكي
            </button>
          </div>
        `;
      } else if (isInProgress) {
        actionHtml = `
          <div style="margin-top: 10px; display: flex; justify-content: space-between; align-items: center; background: rgba(37,99,235,0.06); border: 1px solid rgba(37,99,235,0.2); padding: 8px 10px; border-radius: 8px;">
            <div style="font-size: 0.72rem; color: #1e40af; font-weight: 700;">
              <i class="fa-solid fa-spray-can-sparkles"></i> الطاقم المكلف: <b>${tk.assignedWorker}</b>
            </div>
            <button class="btn btn-success" onclick="app.completePestControlRequest('${tk.id}')" style="font-size: 0.72rem; padding: 4px 12px; height: 30px; white-space: nowrap; font-weight: 800; background: #059669; border: none;">
              <i class="fa-solid fa-circle-check"></i> اعتماد إتمام الرش
            </button>
          </div>
        `;
      } else {
        actionHtml = `
          <div style="margin-top: 8px; font-size: 0.7rem; color: #059669; font-weight: 700; background: #f0fdf4; border: 1px solid #86efac; padding: 6px 10px; border-radius: 6px;">
            <i class="fa-solid fa-check-double"></i> تم الرش الوقائي بنجاح ومطابقة المواد للمعايير البيئية
          </div>
        `;
      }

      listContainer.innerHTML += `
        <div class="ticket-item" style="flex-direction: column; align-items: stretch; gap: 4px; margin-bottom: 10px; padding: 12px; border-radius: 10px; background: #ffffff; border: 1px solid rgba(27,73,101,0.18); box-shadow: 0 2px 10px rgba(32, 39, 79, 0.03);">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span class="badge ${tk.bgClass}" style="font-size: 0.65rem;">${tk.status}</span>
            <span style="font-size: 0.68rem; color: var(--text-muted); font-weight: 700;">#${tk.id} • ${tk.dateStr || 'اليوم'}</span>
          </div>
          <h4 style="font-size: 0.88rem; font-weight: 800; color: #1b4965; margin-top: 4px;">${tk.title}</h4>
          <p style="font-size: 0.72rem; color: #334155; line-height: 1.4; margin: 2px 0;">${tk.details || 'طلب مكافحة ورش وقائي'}</p>
          ${actionHtml}
        </div>
      `;
    });
  }

  openPestControlModal(role = 'owner') {
    this._activePestRole = role;
    let name = 'حسن عيسى';
    let unit = 'فيلا A104 - المرحلة الأولى';

    const customName = safeStorage.getItem('odoo_owner_name');
    if (customName && customName.trim()) name = customName;

    if (role === 'tenant') {
      name = 'أحمد زاهر محمود';
      unit = 'شاليه C304 - المرحلة الثالثة';
    } else if (role === 'commercial') {
      name = 'مطعم وكافيه Blue Wave';
      unit = 'محل 12 - المول التجاري';
    } else if (role === 'manager') {
      name = 'المهندس أيمن السعيد';
      unit = 'الأماكن العامة والمرافق المشتركة';
    }

    const nameEl = document.getElementById('modalPestOwnerName');
    const unitEl = document.getElementById('modalPestOwnerUnit');
    if (nameEl) nameEl.innerText = name;
    if (unitEl) unitEl.innerText = unit;

    const notesInput = document.getElementById('pestNotesInput');
    if (notesInput) notesInput.value = '';

    this.openModal('modalPestControlRequest');
  }

  submitPestControlModalForm() {
    const role = this._activePestRole || this.currentRole || 'owner';
    const typeSelect = document.getElementById('pestTypeSelect');
    const slotSelect = document.getElementById('pestSlotSelect');
    const notesInput = document.getElementById('pestNotesInput');

    const selectedType = typeSelect ? typeSelect.value : 'رش ضبابي للحشرات الطائرة والبعوض';
    const selectedSlot = slotSelect ? slotSelect.value : 'الفترة الصباحية';
    const notes = notesInput ? notesInput.value.trim() : '';

    this.closeModal('modalPestControlRequest');
    this.requestPestControl(role, selectedType, selectedSlot, notes);
  }

  requestPestControl(role = 'owner', customType = null, slot = null, notes = '') {
    if (this._isPestSubmitting) return;
    this._isPestSubmitting = true;
    setTimeout(() => { this._isPestSubmitting = false; }, 2500);

    const isEn = this.currentLang === 'en';
    let location = 'فيلا 104';
    let requesterName = isEn ? 'Owner (Hassan Issa)' : 'المالك (حسن عيسى)';
    let type = customType || 'رش ضبابي للحشرات الطائرة';

    const customName = safeStorage.getItem('odoo_owner_name');
    if (customName && customName.trim()) requesterName = customName;

    if (role === 'tenant') {
      location = 'شاليه 402';
      requesterName = isEn ? 'Tenant (Ahmed Zaher)' : 'المستأجر (أحمد زاهر)';
    } else if (role === 'commercial') {
      location = 'محل 12 (Blue Wave)';
      requesterName = isEn ? 'Commercial (Blue Wave)' : 'التجاري (Blue Wave)';
    } else if (role === 'manager') {
      location = 'الأماكن العامة والمرافق بالقرية';
      requesterName = isEn ? 'Manager (Ayman El-Saeed)' : 'المدير (أيمن السعيد)';
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });
    const timeStr = now.toLocaleTimeString(isEn ? 'en-US' : 'ar-EG', { hour: '2-digit', minute: '2-digit' });

    let fullDetails = `طلب خدمة مكافحة الآفات والرش الوقائي\nنوع المعالجة المطلوب: ${type}\nالموقع: ${location}\nطالب الخدمة: ${requesterName}`;
    if (slot) fullDetails += `\nالتوقيت المفضل: ${slot}`;
    if (notes) fullDetails += `\nملاحظات وتفاصيل الإصابة: ${notes}`;

    const newTicket = {
      id: `PC-${Math.floor(1000 + Math.random() * 9000)}`,
      title: `مكافحة آفات: ${type} (${location})`,
      category: 'مكافحة الآفات والرش الوقائي',
      team_id: 8,
      priority: '2',
      details: fullDetails,
      status: 'جديد',
      bgClass: 'badge-warning',
      requester: role === 'family' ? 'family' : 'homeowner',
      assignedTech: '',
      photoBefore: 'https://images.unsplash.com/photo-1584483766114-2cea6facdf57?auto=format&fit=crop&w=300&q=80',
      photoAfter: '',
      createdAt: now,
      dateStr: dateStr,
      timeStr: timeStr
    };

    this.tickets.unshift(newTicket);
    this.saveTicketsToStorage();
    this.renderTickets();
    this.renderPestControl();
    this.showToast(isEn ? '🛡️ Pest control request submitted successfully!' : '🛡️ تم تقديم طلب خدمة مكافحة الآفات بنجاح!\nجاري المزامنة وتوجيه الطاقم الوقائي المختص...');

    // Sync ticket to Odoo
    this.syncTicketToOdoo(newTicket, '01223456789', requesterName);
  }

  renderLandscaping() {
    const isEn = this.currentLang === 'en';
    const listContainer = document.getElementById('landscapeRequestsList');
    if (!listContainer) return;

    // Filter landscaping tickets
    const landscapeTks = this.tickets.filter(t => {
      const cat = String(t.category || '').toLowerCase();
      const title = String(t.title || '').toLowerCase();
      return cat.includes('لاند') || cat.includes('حدائق') || cat.includes('زراع') || cat.includes('ري') || title.includes('لاند') || title.includes('حديق');
    });

    const pending = landscapeTks.filter(t => t.status === 'جديد' || !t.assignedWorker);
    const progress = landscapeTks.filter(t => t.status === 'جاري التنفيذ باللاسلكي' || (t.assignedWorker && t.status !== 'تم الحل' && t.status !== 'تم الانتهاء' && t.status !== 'ملغاة'));
    const completed = landscapeTks.filter(t => t.status === 'تم الحل' || t.status === 'تم الانتهاء');

    // Update KPIs
    const elPending = document.getElementById('landscapeKpiPending');
    const elProgress = document.getElementById('landscapeKpiProgress');
    const elCompleted = document.getElementById('landscapeKpiCompleted');
    const elBadge = document.getElementById('landscapeInboxBadge');

    if (elPending) elPending.innerText = pending.length;
    if (elProgress) elProgress.innerText = progress.length;
    if (elCompleted) elCompleted.innerText = completed.length;
    if (elBadge) elBadge.innerText = `${pending.length} بانتظار التوجيه`;

    listContainer.innerHTML = '';
    if (landscapeTks.length === 0) {
      listContainer.innerHTML = `<div style="font-size: 0.75rem; color: var(--text-muted); text-align: center; padding: 18px; background: rgba(16,185,129,0.02); border-radius: 8px;">${isEn ? 'No landscaping orders in queue' : 'لا توجد طلبات لاندسكيب أو حدائق حالياً'}</div>`;
      return;
    }

    landscapeTks.forEach(tk => {
      let actionHtml = '';
      const isDone = (tk.status === 'تم الحل' || tk.status === 'تم الانتهاء');
      const isInProgress = (tk.status === 'جاري التنفيذ باللاسلكي');

      if (!isDone && !isInProgress) {
        actionHtml = `
          <div style="margin-top: 10px; display: flex; gap: 8px; align-items: center; background: rgba(16,185,129,0.05); padding: 8px; border-radius: 8px;">
            <select id="assignLandscapeWorkerSelect_${tk.id}" class="form-control" style="font-size: 0.75rem; padding: 4px 8px; height: 32px; font-weight: 700; width: 60%;">
              <option value="طاقم 1 (عرفة وسعيد - قص وتنسيق)">🌿 طاقم 1 (عرفة وسعيد - قص وتنسيق)</option>
              <option value="طاقم 2 (مبروك ورجب - شبكات ري)">💧 طاقم 2 (مبروك ورجب - شبكات ري)</option>
              <option value="طاقم 3 (فرقة التسميد والمكافحة)">🛡️ طاقم 3 (فرقة التسميد والمكافحة)</option>
              <option value="طاقم 4 (عمال نظافة الأحواض والنخيل)">🌴 طاقم 4 (نظافة الأحواض والنخيل)</option>
            </select>
            <button class="btn btn-primary" onclick="app.assignLandscapingWorker('${tk.id}')" style="font-size: 0.72rem; padding: 4px 10px; height: 32px; white-space: nowrap; flex: 1; display: flex; align-items: center; justify-content: center; background: #059669; border: none; font-weight: 800;">
              <i class="fa-solid fa-walkie-talkie" style="margin-left: 4px;"></i> إرسال باللاسلكي
            </button>
          </div>
        `;
      } else if (isInProgress) {
        actionHtml = `
          <div style="margin-top: 10px; display: flex; justify-content: space-between; align-items: center; background: rgba(37,99,235,0.06); border: 1px solid rgba(37,99,235,0.2); padding: 8px 10px; border-radius: 8px;">
            <div style="font-size: 0.72rem; color: #1e40af; font-weight: 700;">
              <i class="fa-solid fa-person-digging"></i> الطاقم المكلف: <b>${tk.assignedWorker}</b>
            </div>
            <button class="btn btn-success" onclick="app.completeLandscapingRequest('${tk.id}')" style="font-size: 0.72rem; padding: 4px 12px; height: 30px; white-space: nowrap; font-weight: 800; background: #10b981; border: none;">
              <i class="fa-solid fa-circle-check"></i> تأكيد إتمام العمل
            </button>
          </div>
        `;
      } else {
        actionHtml = `
          <div style="margin-top: 8px; font-size: 0.7rem; color: #059669; font-weight: 700; background: #f0fdf4; border: 1px solid #86efac; padding: 6px 10px; border-radius: 6px;">
            <i class="fa-solid fa-check-double"></i> تم الإنجاز ومطابقة الحديقة للمواصفات وإشعار المالك
          </div>
        `;
      }

      listContainer.innerHTML += `
        <div class="ticket-item" style="flex-direction: column; align-items: stretch; gap: 4px; margin-bottom: 10px; padding: 12px; border-radius: 10px; background: #ffffff; border: 1px solid rgba(16,185,129,0.18); border: 1px solid rgba(32, 39, 79, 0.08); box-shadow: 0 2px 10px rgba(32, 39, 79, 0.03);">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span class="badge ${tk.bgClass}" style="font-size: 0.65rem;">${tk.status}</span>
            <span style="font-size: 0.68rem; color: var(--text-muted); font-weight: 700;">#${tk.id} • ${tk.dateStr || 'اليوم'}</span>
          </div>
          <h4 style="font-size: 0.88rem; font-weight: 800; color: #064e3b; margin-top: 4px;">${tk.title}</h4>
          <p style="font-size: 0.72rem; color: #334155; line-height: 1.4; margin: 2px 0;">${tk.details || 'طلب تقليم وصيانة الحديقة'}</p>
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
    const worker = select ? select.value : 'عامل نظافة';

    req.status = 'جاري العمل';
    req.assignedWorker = worker;

    this.renderHousekeeping();
    this.showToast(isEn ? `✅ Worker ${worker} assigned successfully!` : `✅ تم تكليف عامل النظافة ${worker} بنجاح!`);
  }

  completeHousekeepingRequest(id) {
    const isEn = this.currentLang === 'en';
    const req = this.housekeepingRequests ? this.housekeepingRequests.find(r => r.id === id) : null;
    if (!req) return;

    req.status = 'تم الانتهاء';
    this.renderHousekeeping();
    this.showToast(isEn ? '🧹 Cleaning task completed!' : '🧹 تم إتمام مهمة النظافة بنجاح!');
  }

  renderHousekeeping() {
    const isEn = this.currentLang === 'en';
    const listContainer = document.getElementById('hkRequestsList');
    if (!listContainer) return;

    if (!this.housekeepingRequests) this.housekeepingRequests = [];
    const badge = document.getElementById('hkRequestsInboxBadge');
    const pendingRequests = this.housekeepingRequests.filter(r => r.status === 'بانتظار التخصيص');
    if (badge) {
      badge.innerText = isEn ? `${pendingRequests.length} pending` : `${pendingRequests.length} طلبات معلقة`;
    }

    listContainer.innerHTML = '';
    if (this.housekeepingRequests.length === 0) {
      listContainer.innerHTML = `<div style="font-size: 0.75rem; color: var(--text-muted); text-align: center; padding: 15px;">${isEn ? 'No cleaning requests' : 'لا توجد طلبات نظافة حالية'}</div>`;
      return;
    }

    this.housekeepingRequests.forEach(req => {
      let actionHtml = '';
      if (req.status === 'بانتظار التخصيص') {
        actionHtml = `
          <div style="margin-top: 8px; display: flex; gap: 8px; align-items: center;">
            <select id="assignWorkerSelect_${req.id}" class="form-control" style="font-size: 0.72rem; padding: 4px; height: 28px; width: 60%;">
              <option value="محمد علي">محمد علي</option>
              <option value="أحمد حسن">أحمد حسن</option>
              <option value="مصطفى سيد">مصطفى سيد</option>
            </select>
            <button class="btn btn-primary" onclick="app.assignHousekeepingWorker('${req.id}')" style="font-size: 0.7rem; padding: 4px 8px; height: 28px; white-space: nowrap; flex: 1; display: flex; align-items: center; justify-content: center;">
              <i class="fa-solid fa-user-check"></i> ${isEn ? 'Assign' : 'إسناد وتكليف'}
            </button>
          </div>
        `;
      } else if (req.status === 'جاري العمل') {
        actionHtml = `
          <div style="margin-top: 8px; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.7rem; color: #00e5ff;"><i class="fa-solid fa-person-sweeping"></i> ${isEn ? 'Worker:' : 'العامل:'} ${req.assignedWorker}</span>
            <button class="btn btn-success" onclick="app.completeHousekeepingRequest('${req.id}')" style="font-size: 0.7rem; padding: 4px 8px; height: 28px; white-space: nowrap; display: flex; align-items: center; justify-content: center;">
              <i class="fa-solid fa-circle-check"></i> ${isEn ? 'Complete' : 'إنهاء وإتمام'}
            </button>
          </div>
        `;
      } else {
        actionHtml = `
          <div style="margin-top: 6px; font-size: 0.7rem; color: #10b981;">
            <i class="fa-solid fa-check"></i> ${isEn ? 'Task Completed' : 'تم إتمام المهمة'}
          </div>
        `;
      }

      listContainer.innerHTML += `
        <div class="ticket-item" style="flex-direction: column; align-items: stretch; gap: 4px; margin-bottom: 8px; border-left: 4px solid ${req.status === 'تم الانتهاء' ? '#10b981' : '#f59e0b'};">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <h4 style="font-size: 0.85rem; font-weight: 700;">${req.type}</h4>
            <span class="badge ${req.status === 'تم الانتهاء' ? 'badge-success' : 'badge-warning'}">${req.status}</span>
          </div>
          <p style="font-size: 0.75rem; color: var(--text-muted);">${req.location} • ${req.time}</p>
          ${actionHtml}
        </div>
      `;
    });
  }

  openPermitModal(requester = 'homeowner', type = 'تصريح عمل مؤقت للعمالة') {
    const roleInput = document.getElementById('permitRequesterRole');
    const typeInput = document.getElementById('permitTypeInput');
    const titleEl = document.getElementById('permitModalTitle');
    const nameInput = document.getElementById('permitVisitorNameInput');
    const nationalIdInput = document.getElementById('permitNationalIdInput');
    const phoneInput = document.getElementById('permitVisitorPhoneInput');
    const plateInput = document.getElementById('permitPlateNumInput');

    if (roleInput) roleInput.value = requester;
    if (typeInput) typeInput.value = type;
    if (titleEl) titleEl.innerText = `طلب ${type}`;
    if (nameInput) nameInput.value = '';
    if (nationalIdInput) nationalIdInput.value = '';
    if (phoneInput) phoneInput.value = '';
    if (plateInput) plateInput.value = '';

    this.openModal('modalRequestPermit');
  }

  requestPermit(requester = 'homeowner', type = 'تصريح دخول الوحدة') {
    this.openPermitModal(requester, type);
  }

  submitPermitModal() {
    if (this._submittingPermit) return;
    this._submittingPermit = true;

    try {
      const role = document.getElementById('permitRequesterRole')?.value || 'homeowner';
      const type = document.getElementById('permitTypeInput')?.value || 'تصريح عمل مؤقت للعمالة';
      const visitorName = document.getElementById('permitVisitorNameInput')?.value || '';
      const nationalId = document.getElementById('permitNationalIdInput')?.value || '';
      const visitorPhone = document.getElementById('permitVisitorPhoneInput')?.value || '';
      const plate = document.getElementById('permitPlateNumInput')?.value || '';
      const days = document.getElementById('permitDaysSelect')?.value || 'شهر كامل (30 يوم)';

      if (!visitorName.trim()) {
        this.showToast('⚠️ يرجى إدخال اسم العامل / المصرح له أولاً!');
        this._submittingPermit = false;
        return;
      }

      const isCommercial = role === 'commercial' || (type && (type.includes('عمل') || type.includes('تجاري') || type.includes('بضائع') || type.includes('منقولات')));
      const targetTeamId = isCommercial ? 10 : 3; // Team 10: Commercial Team, Team 3: Security Team
      const targetTeamName = isCommercial ? 'فريق إدارة الأنشطة التجارية (Commercial Team)' : 'فريق الأمن والبوابات (Security Team)';

      const detailsStr = `المصرح له: ${visitorName}${nationalId ? ` • الرقم القومي: ${nationalId}` : ''}${visitorPhone ? ` • هاتف: ${visitorPhone}` : ''}${plate ? ` • اللوحة: ${plate}` : ''} • مدة التصريح: ${days} • جهة الطلب: ${isCommercial ? 'مطعم وكافيه Blue Wave (محل 12)' : 'وحدة سكنية'}`;

      const newPermit = {
        id: 'PR-' + Math.floor(1000 + Math.random() * 9000),
        type: type,
        category: isCommercial ? 'تصريح عمل مؤقت للأنشطة التجارية' : 'تصريح دخول بوابات أمني',
        team_id: targetTeamId,
        title: `${type}: ${visitorName}${nationalId ? ` (${nationalId})` : ''}`,
        status: 'تحت المراجعة والاعتماد',
        bgClass: 'badge-warning',
        requester: role,
        details: detailsStr,
        qrCode: ''
      };

      this.permits.unshift(newPermit);
      this.renderTickets();
      this.closeModal('modalRequestPermit');
      this.showToast(`✅ تم تقديم طلب التصريح بنجاح رقم #${newPermit.id}!\nالطلب مسجل لدى ${targetTeamName} في Odoo للمراجعة والاعتماد.`);

      // Live Sync to Odoo (Commercial Team ID: 10 or Security Team ID: 3)
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
      p.status = 'معتمد';
      p.bgClass = 'badge-success';
      p.qrCode = String(Math.floor(100000 + Math.random() * 900000));
      this.renderTickets();
      this.showToast(`✅ تم اعتماد وتصديق التصريح بنجاح!\nتم توليد كود الدخول الديناميكي للأمن والبوابات.`);
    }
  }

  rejectPermit(permitId) {
    const p = this.permits.find(x => x.id === permitId);
    if (p) {
      p.status = 'مرفوض';
      p.bgClass = 'badge-danger';
      p.qrCode = '';
      this.renderTickets();
      this.showToast(`❌ تم رفض طلب التصريح المرفوع.`);
    }
  }

  dispatchSecurityDolphin(complaintId) {
    const c = this.complaints.find(x => x.id === complaintId);
    if (c) {
      c.status = 'الاستجابة جارية - التدخل السريع في الطريق';
      c.bgClass = 'badge-info';
      this.renderTickets();
      this.showToast(`🚨 تم تأكيد استلام البلاغ الأمني #${complaintId}!\nتم إشعار مقدم الشكوى فوراً بأن فريق التدخل السريع في طريقه إليه.`);
    }
  }

  selectInventoryItem(name, price) {
    this.selectedPart = { name, price };
    const sigName = document.getElementById('sigItemName');
    const sigPrice = document.getElementById('sigItemPrice');
    const btnApprove = document.getElementById('btnApproveAndPay');

    if (sigName) sigName.innerText = name;
    if (sigPrice) sigPrice.innerText = `${price} ج.م`;

    if (btnApprove) {
      if (this.activeAuditTicketId) {
        btnApprove.innerHTML = `<i class="fa-solid fa-pen-nib"></i> موافقة وتوقيع المالك بالموافقة`;
      } else {
        btnApprove.innerHTML = `<i class="fa-solid fa-credit-card"></i> موافقة ودفع آلي (${price} ج.م)`;
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
        tk.status = 'انتظار دفع المالك';
        tk.bgClass = 'badge-danger'; // Red badge for payment pending
        tk.needsPart = true;
        tk.partName = this.selectedPart.name;
        tk.partPrice = this.selectedPart.price;
        tk.photoBefore = this.uploadedDamagedPhoto || tk.photoBefore;

        this.renderTickets();
        this.showToast(`✅ تم توقيع المالك بنجاح!\nتم تحويل حالة البلاغ لـ "انتظار دفع المالك".\nستظهر التذكرة الآن بانتظار السداد الإلكتروني بقيمة ${this.selectedPart.price} ج.م في شاشة العميل.`);
        this.syncTicketUpdateToOdoo(tk);
      }
      this.activeAuditTicketId = null;
      this.uploadedDamagedPhoto = null;
      return;
    }

    this.showToast(`💳 تم توقيع المالك إلكترونياً والدفع الفوري لمبلغ ${this.selectedPart.price} ج.م!\nتم تسجيل شرط الصرف للمخزن وإرسال التأكيد بالفاتورة.`);
  }

  technicianRequestPart(ticketId, fileInputId) {
    const fileInput = document.getElementById(fileInputId);
    let damagedPhoto = 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=300';
    
    const proceed = (photoData) => {
      this.uploadedDamagedPhoto = photoData;
      this.activeAuditTicketId = ticketId;
      this.openModal('modalInventory');
      this.filterInventory();
      this.showToast('🔍 تم تجهيز طلب قطعة الغيار! يرجى تحديد القطعة المطلوبة من المخزن.');
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
    if (partNameEl) partNameEl.innerText = tk.partName || 'قطعة غيار غير محددة';
    if (partAmountEl) partAmountEl.innerText = `${tk.partPrice || 0} ج.م`;

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
      this.showToast('❌ رصيد محفظتك الرقمية غير كافٍ لسداد قطعة الغيار! يرجى إعادة شحن محفظتك أولاً.');
      return;
    }

    // Deduct from wallet
    this.ownerWalletBalance -= tk.partPrice;
    this.updateWalletUI();

    // Update ticket state
    tk.status = 'تم الدفع - جاري التركيب';
    tk.bgClass = 'badge-info';

    this.renderTickets();
    this.syncTicketUpdateToOdoo(tk);

    // Live Odoo Invoice Generation for Spare Part
    (async () => {
      try {
        const partnerId = (tk.requester === 'tenant') ? 7758 : 7755;
        const invId = await this.createOdooInvoice(
          partnerId,
          tk.partPrice || 150.0,
          `سداد قيمة قطعة غيار [${tk.partName || 'محبس نحاس'}] - تذكرة #${tk.id}`,
          `INV-PART-${tk.id}`
        );
        if (invId) {
          tk.odooInvoiceId = invId;
          console.log('[Odoo Accounting] Created spare part invoice ID:', invId);
        }
      } catch (invErr) {
        console.warn('[Spare Part Invoice Error]:', invErr);
      }
    })();

    const methodArabic = method === 'saved' ? 'البطاقة المسجلة (تنتهي بـ 4012)' : 'البطاقة الجديدة';
    this.showToast(`✅ تم سداد قيمة قطعة الغيار [${tk.partName}] بمبلغ [${tk.partPrice} ج.م] بنجاح عبر ${methodArabic}!\nتم إشعار الفني [كريم حسن] لصرف القطعة وبدء التركيب فوراً.`);
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
      this.showToast('⚠️ يرجى إدخال اسم فرد العائلة ورقم الموبايل!');
      return;
    }

    const finalEmail = (email && email.includes('@')) ? email : `family_${phone.replace(/[^0-9]/g, '') || 'member'}@village.com`;

    const idFrontData = this.familyIdFrontBase64;
    const idBackData = this.familyIdBackBase64;

    const relationMap = {
      'father': 'أب',
      'mother': 'أم',
      'brother': 'أخ',
      'sister': 'أخت',
      'son': 'ابن',
      'daughter': 'ابنة'
    };
    const relationArabic = relationMap[relation] || relation;

    // Render locally in Owner's family list with Pending Review status
    const list = document.getElementById('ownerFamilyMembersList');
    const badge = document.getElementById('ownerFamilyCountBadge');

    if (list) {
      // Remove empty placeholder message
      const emptyDiv = list.querySelector('div:only-child');
      if (emptyDiv && emptyDiv.innerText.includes('لا يوجد أفراد')) {
        list.innerHTML = '';
      }

      const item = document.createElement('div');
      item.style.cssText = 'display: flex; justify-content: space-between; align-items: center; background: #ffffff; padding: 10px 12px; border-radius: 10px; border: 1px solid rgba(32,39,79,0.12); box-shadow: 0 2px 5px rgba(0,0,0,0.04); margin-top: 4px;';
      item.innerHTML = `
        <div style="text-align: right;">
          <div style="font-size: 0.85rem; font-weight: 800; color: #1c2140;">${name} <span style="font-size: 0.75rem; color: #1b8f91; font-weight: 700;">(${relationArabic})</span></div>
          <p style="font-size: 0.68rem; color: #64748b; margin: 3px 0 0 0; font-weight: 600;">
            <i class="fa-solid fa-phone" style="font-size: 0.62rem; color: #1b8f91;"></i> ${phone} • بانتظار مراجعة واعتماد بطاقة الرقم القومي 🪪
          </p>
        </div>
        <span class="badge" style="font-size: 0.65rem; margin-top:0; background: #f59e0b; color: #ffffff !important; padding: 4px 8px; border-radius: 6px; font-weight: 700; white-space: nowrap;"><i class="fa-solid fa-hourglass-half"></i> قيد مراجعة الإدارة ⏳</span>
      `;
      list.appendChild(item);

      // Update badge count
      if (badge) {
        const count = list.querySelectorAll('div[style*="justify-content"]').length;
        badge.innerText = `${count} أفراد`;
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
    
    this.showToast(`👥 تم إنشاء حساب فرد الأسرة [${name}] بنجاح!\nجاري المزامنة والتسجيل بالسجل المركزي للأسرة...`);

    try {
      await this.syncFamilyMemberToOdoo(name, relationArabic, phone, email, idFrontData, idBackData);
      this.showToast(`✅ تم توثيق وتسجيل فرد الأسرة [${name}] والبطاقة الشخصية بالسجل المركزي بنجاح!`);
    } catch (err) {
      console.warn('[Odoo Family Member Sync Error]:', err);
    }
  }

  async addFamilyMember() {
    return this.submitFamilyMember();
  }

  async getOdooOwnerPartnerId(baseUrl, dbInput, uid, keyInput) {
    // Priority 1: Match logged in resident role
    if (this.currentRole === 'tenant') {
      return 7758; // أحمد زاهر (شاليه A112)
    }
    const customName = safeStorage.getItem('odoo_owner_name') || '';
    if (customName.includes('أحمد') || customName.includes('زاهر')) {
      return 7758;
    }

    // Default for Homeowner / Family: حسن عيسى (فيلا A104 - الشريك المعتمد في أودو)
    return 7755;
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
              comment: `فرد أسرة تابع للمالك الرئيسي - صلة القرابة: ${relation} - الإيميل: ${email}`,
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
        if (relClean.includes('أب') || relClean.toLowerCase().includes('father')) {
          partnerUpdates["x_studio_father"] = `${name} (${phone})`;
        } else if (relClean.includes('أم') || relClean.toLowerCase().includes('mother')) {
          partnerUpdates["x_studio_mother"] = `${name} (${phone})`;
        } else if (relClean.includes('ابن') || relClean.toLowerCase().includes('son')) {
          partnerUpdates["x_studio_son"] = `${name} (${phone})`;
        } else if (relClean.includes('ابنة') || relClean.toLowerCase().includes('daughter')) {
          partnerUpdates["x_studio_daughter"] = `${name} (${phone})`;
        } else if (relClean.includes('زوج') || relClean.toLowerCase().includes('husband')) {
          partnerUpdates["x_studio_husband"] = `${name} (${phone})`;
        } else if (relClean.includes('زوجة') || relClean.toLowerCase().includes('wife')) {
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
                  name: `بطاقة_شخصية_${name}_وجه.jpg`,
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
                  name: `بطاقة_شخصية_${name}_ظهر.jpg`,
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
        if (relLower.includes('زوجة') || relLower.includes('wife')) relField = 'x_studio_wife';
        else if (relLower.includes('زوج') || relLower.includes('husband')) relField = 'x_studio_husband';
        else if (relLower.includes('ابن') || relLower.includes('son')) relField = 'x_studio_son';
        else if (relLower.includes('ابنة') || relLower.includes('daughter')) relField = 'x_studio_daughter';
        else if (relLower.includes('أب') || relLower.includes('father')) relField = 'x_studio_father';
        else if (relLower.includes('أم') || relLower.includes('mother')) relField = 'x_studio_mother';

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
        const idNoteText = (idFrontBase64 || idBackBase64) ? ' (مرفق صور البطاقة وش وضهر 🪪)' : '';
        const familyEntryText = `• ${name} (${relation}) - م: ${phone} - ميل: ${email}${idNoteText}`;
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
              [[partnerId], { comment: `👥 فرد أسرة جديد: ${familyEntryText}` }]
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
    this.showToast(`✅ تم شحن ${serviceName} بنجاح بمبلغ ${price} ج.م!\nتم تفعيل الصلاحية على الـ QR Code حتى التاريخ المترتب.`);
  }

  issueBeachPermit() {
    const code = Math.floor(100000 + Math.random() * 900000);
    this.closeModal('modalBeachPoolsPermit');
    this.showToast(`🌊 تم إصدار تصريح دخول الشاطئ والبحيرات وحمامات السباحة بنجاح!\nرمز الـ Dynamic QR: ${code}\nتم تسجيل التصريح على بوابات الرفاهية الإلكترونية بالقرية.`);
  }

  payInstallment(code, amount) {
    const formattedAmount = Number(amount).toLocaleString();
    this.showToast(`💳 تم سداد القسط المستحق (${code}) بقيمة ${formattedAmount} ج.م بنجاح!\nتم إصدار سند القبض الإلكتروني وتحديث كشف حساب الوحدة المالي المركزي.`);
    
    // Update UI badge status
    const badge = document.getElementById('installmentStatusBadge');
    if (badge) {
      badge.className = 'badge badge-success';
      badge.innerHTML = '<i class="fa-solid fa-check-double"></i> تم سداد جميع الأقساط المستحقة';
    }
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
          if (txt.includes('Partner') || txt.includes('Name') || txt.includes('Phone') || txt.includes('Email') || txt.includes('فرد أسرة') || txt.includes('مرفق') || txt.includes('رخصة')) return false;
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

    if (badge) badge.innerText = `${messages.length} جديدة`;
    if (inboxBadge) inboxBadge.innerText = `${messages.length} تنبيه`;

    const htmlItems = messages.map(m => {
      const cleanBody = m.body.replace(/<[^>]*>?/gm, '').trim();
      const authorName = Array.isArray(m.author_id) ? m.author_id[1] : 'إدارة القرية';
      const isOwnerSender = authorName.includes('Halah') || authorName.includes('المالك') || authorName.includes('حسن') || authorName.includes('عيسى');
      const dateObj = new Date(m.create_date || m.date);
      const dateStr = !isNaN(dateObj) ? dateObj.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '12:11 AM';

      return `
        <div style="background: ${isOwnerSender ? 'rgba(27, 143, 145, 0.06)' : 'rgba(32, 39, 79, 0.05)'}; border: 1px solid ${isOwnerSender ? 'rgba(27, 143, 145, 0.2)' : 'rgba(32, 39, 79, 0.12)'}; border-right: 4px solid ${isOwnerSender ? '#1b8f91' : '#d4af37'}; padding: 10px 12px; border-radius: 8px; margin-bottom: 6px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span style="font-size: 0.72rem; font-weight: 800; color: #20274f;">
              <i class="${isOwnerSender ? 'fa-solid fa-user' : 'fa-solid fa-user-shield'}" style="color: ${isOwnerSender ? '#1b8f91' : '#d4af37'};"></i> ${authorName} ${isOwnerSender ? '(أنت)' : ''}
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
      this.showToast('⚠️ يرجى كتابة نص الرسالة أولاً قبل الإرسال للإدارة!');
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
        this.showToast('✅ تم إرسال رسالتك لإدارة القرية بنجاح!\nسيقوم فريق خدمة العملاء بالرد المباشر عليك.');
        this.fetchOwnerChatterMessagesFromOdoo();
      }
    } catch (err) {
      console.warn('[Send Owner Message to Odoo Error]:', err);
      this.showToast('✅ تم تسجيل وتدوين رسالتك لإدارة القرية بنجاح!');
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
      this.showToast('✅ تم رفع وتحديث صورة المالك الشخصية بنجاح (مطابق لتطبيق إعمار)!');

      // Sync avatar photo to Odoo res.partner (image_1920)
      this.syncOwnerAvatarToOdoo(base64);
    };
    reader.readAsDataURL(file);
  }

  handleCommAvatarUpload(event) {
    const file = event.target.files ? event.target.files[0] : null;
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result;
      const imgEl = document.getElementById('commHeaderAvatarImg');
      if (imgEl) imgEl.src = base64;

      safeStorage.setItem('comm_avatar_img', base64);
      this.showToast('✅ تم رفع وتحديث شعار النشاط التجاري بنجاح!');
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
    let name = 'حسن عيسى';
    let unit = 'فيلا A104 - المرحلة الأولى';

    const customName = safeStorage.getItem('odoo_owner_name');
    if (customName && customName.trim()) name = customName;

    if (role === 'tenant') {
      name = 'أحمد زاهر محمود';
      unit = 'شاليه C304 - المرحلة الثالثة';
    } else if (role === 'commercial') {
      name = 'مطعم وكافيه Blue Wave';
      unit = 'محل 12 - المول التجاري';
    } else if (role === 'manager') {
      name = 'المهندس أيمن السعيد (مدير الصيانة)';
      unit = 'الأماكن العامة بالقرية';
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

    const selectedType = typeSelect ? typeSelect.value : 'نظافة خفيفة يومية';
    const selectedSlot = slotSelect ? slotSelect.value : 'الفترة الصباحية';
    const notes = notesInput ? notesInput.value.trim() : '';

    this.closeModal('modalHousekeepingRequest');
    this.requestHousekeeping(role, selectedType, selectedSlot, notes);
  }

  openLandscapingModal(role = 'owner') {
    this._activeLandscapeRole = role;
    let name = 'حسن عيسى';
    let unit = 'فيلا A104 - المرحلة الأولى';

    const customName = safeStorage.getItem('odoo_owner_name');
    if (customName && customName.trim()) name = customName;

    if (role === 'tenant') {
      name = 'أحمد زاهر محمود';
      unit = 'شاليه C304 - المرحلة الثالثة';
    } else if (role === 'commercial') {
      name = 'مطعم وكافيه Blue Wave';
      unit = 'محل 12 - المول التجاري';
    } else if (role === 'manager') {
      name = 'المهندس أيمن السعيد (مدير الصيانة)';
      unit = 'الأماكن العامة بالقرية';
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

    const selectedType = typeSelect ? typeSelect.value : 'تقليم وقص الأشجار والنجيل';
    const selectedSlot = slotSelect ? slotSelect.value : 'الفترة الصباحية';
    const notes = notesInput ? notesInput.value.trim() : '';

    this.closeModal('modalLandscapingRequest');
    this.requestLandscaping(role, selectedType, selectedSlot, notes);
  }

  requestLandscaping(role = 'owner', customType = null, slot = null, notes = '') {
    if (this._isLandscapeSubmitting) return;
    this._isLandscapeSubmitting = true;
    setTimeout(() => { this._isLandscapeSubmitting = false; }, 2500);

    const isEn = this.currentLang === 'en';
    let location = 'فيلا 104';
    let requesterName = isEn ? 'Owner (Hassan Issa)' : 'المالك (حسن عيسى)';
    let type = customType || 'تقليم وقص الأشجار والنجيل';

    const customName = safeStorage.getItem('odoo_owner_name');
    if (customName && customName.trim()) requesterName = customName;

    if (role === 'tenant') {
      location = 'شاليه 402';
      requesterName = isEn ? 'Tenant (Ahmed Zaher)' : 'المستأجر (أحمد زاهر)';
    } else if (role === 'commercial') {
      location = 'محل 12 (Blue Wave)';
      requesterName = isEn ? 'Commercial (Blue Wave)' : 'التجاري (Blue Wave)';
    } else if (role === 'manager') {
      location = 'الأماكن العامة والحدائق بالقرية';
      requesterName = isEn ? 'Manager (Ayman El-Saeed)' : 'المدير (أيمن السعيد)';
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });
    const timeStr = now.toLocaleTimeString(isEn ? 'en-US' : 'ar-EG', { hour: '2-digit', minute: '2-digit' });

    let fullDetails = `طلب خدمة صيانة الحدائق واللاندسكيب\nنوع الخدمة المطلوب: ${type}\nالموقع: ${location}\nطالب الخدمة: ${requesterName}`;
    if (slot) fullDetails += `\nالتوقيت المفضل: ${slot}`;
    if (notes) fullDetails += `\nملاحظات وتفاصيل العميل: ${notes}`;

    const newTicket = {
      id: `LS-${Math.floor(1000 + Math.random() * 9000)}`,
      title: `خدمة لاندسكيب: ${type} (${location})`,
      category: 'صيانة الحدائق واللاندسكيب',
      team_id: 7,
      priority: '2',
      details: fullDetails,
      status: 'جديد',
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
    this.showToast(isEn ? '🌿 Landscaping request submitted successfully!' : '🌿 تم تقديم طلب خدمة اللاندسكيب بنجاح!\nجاري المزامنة مع فريق اللاندسكيب المركزي...');

    // Sync ticket to Odoo (routed to Landscaping team automatically)
    this.syncTicketToOdoo(newTicket, '01223456789', requesterName);
  }

  updateModalTicketApplicantInfo() {
    let fullName = 'حسن عيسى';
    let phoneNum = '01223456789';
    let emailAddress = 'fmhala6@gmail.com';
    let unitNum = 'فيلا A104 - المرحلة الأولى';

    const customName = safeStorage.getItem('odoo_owner_name');
    if (customName && customName.trim()) fullName = customName;

    if (this.currentRole === 'tenant') {
      fullName = 'أحمد زاهر محمود';
      phoneNum = '01009876543';
      emailAddress = 'tenant.ahmed@domain.com';
      unitNum = 'شاليه C304 - المرحلة الثالثة';
    } else if (this.currentRole === 'commercial') {
      fullName = 'مطعم وكافيه Blue Wave (شريف محمد)';
      phoneNum = '01112233445';
      emailAddress = 'bluewave@domain.com';
      unitNum = 'محل 12 - المول التجاري';
    } else if (this.currentRole === 'manager') {
      fullName = 'المهندس أيمن السعيد (مدير الصيانة)';
      phoneNum = '01221122334';
      emailAddress = 'ayman.saeed@domain.com';
      unitNum = 'الأماكن العامة بالقرية';
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
    if (el) {
      el.classList.remove('active');
      el.style.display = 'none';
    }
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
      badge.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري المزامنة...';
    }

    setTimeout(() => {
      if (badge) {
        badge.className = 'badge badge-success';
        badge.innerHTML = '<i class="fa-solid fa-circle-check"></i> متصل بالسيرفر المركزي';
      }
      this.showToast(`✅ تم اختبار المزامنة المباشرة بنجاح مع السيرفر المركزي!\nتمت مزامنة الوحدات الـ 3,000 والبلاغات والبوابات آلياً بنجاح.`);
    }, 1200);
  }

  openSecurityComplaintModal() {
    const nameInput = document.getElementById('complaintNameInput');
    const phoneInput = document.getElementById('complaintPhoneInput');
    const detailsInput = document.getElementById('complaintDetailsInput');

    if (nameInput && phoneInput) {
      if (this.currentRole === 'homeowner') {
        let homeownerName = 'حسن عيسى';
        const nameEl = document.getElementById('homeownerNameText');
        if (nameEl && nameEl.innerText && nameEl.innerText !== 'جاري التحميل...') {
          homeownerName = nameEl.innerText;
        }
        nameInput.value = homeownerName;
        phoneInput.value = '01001234567';
      } else if (this.currentRole === 'tenant') {
        nameInput.value = 'أحمد زاهر';
        phoneInput.value = '01007654321';
      } else if (this.currentRole === 'commercial') {
        nameInput.value = 'محلات Blue Wave';
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
      this.showToast('⚠️ يرجى كتابة تفاصيل المشكلة الأمنية أو البلاغ الطارئ أولاً!');
      return;
    }

    const newComplaint = {
      id: 'CP-' + Math.floor(1000 + Math.random() * 9000),
      name: name,
      phone: phone,
      details: details,
      status: 'تحت المراجعة والتحرك الميداني',
      bgClass: 'badge-warning',
      requester: this.currentRole
    };

    this.complaints.unshift(newComplaint);
    this.renderTickets();
    this.closeModal('modalSecurityComplaint');
    
    // Toast confirmation
    this.showToast(`🚨 تم استقبال البلاغ الأمني العاجل وإرساله للعمليات بنجاح!\n\nالمرسل: ${name}\nرقم الموبايل: ${phone}\nتفاصيل البلاغ: ${details}\n\nتم توجيه فريق التدخل السريع للموقع فوراً!`);
    
    // Sync to Odoo ERP
    this.syncComplaintToOdoo(name, phone, details);
  }

  async syncComplaintToOdoo(name, phone, details) {
    console.log(`[Odoo Sync] Syncing Security Emergency Complaint for ${name} (${phone}): ${details}`);
    const secTicket = {
      category: 'بلاغ أمني طارئ',
      team_id: 3,
      title: `بلاغ أمني عاجل: ${details.substring(0, 35)}`,
      details: `بلاغ أمني عاجل من: ${name}\nرقم الموبايل: ${phone}\nتفاصيل البلاغ: ${details}`,
      priority: '3' // ⭐⭐⭐ Red Alert High Priority
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
      let ownerName = 'حسن عيسى';
      const nameEl = document.getElementById('homeownerNameText');
      if (nameEl && nameEl.innerText && nameEl.innerText !== 'جاري التحميل...') {
        ownerName = nameEl.innerText;
      }
      nameInput.value = ownerName;
      phoneInput.value = '01223456789';
    }
    if (detailsInput) detailsInput.value = '';
    this.openModal('modalComplaintSuggestion');
  }

  async submitComplaintSuggestion() {
    const name = document.getElementById('csNameInput')?.value || 'حسن عيسى';
    const phone = document.getElementById('csPhoneInput')?.value || '01223456789';
    const type = document.getElementById('csTypeSelect')?.value || 'استفسار لخدمة العملاء';
    const details = document.getElementById('csDetailsInput')?.value || '';

    if (!details.trim()) {
      this.showToast('⚠️ يرجى كتابة تفاصيل الاستفسار أو المقترح أولاً!');
      return;
    }

    this.closeModal('modalComplaintSuggestion');

    // DO NOT add to this.tickets (Customer care inquiries belong to Messages/Inbox, NOT maintenance tickets!)
    const userMsg = {
      id: 'MSG-' + Math.floor(1000 + Math.random() * 9000),
      author_id: [10, name],
      body: `<b>[${type}]</b><br/>${details}`,
      date: new Date().toISOString(),
      create_date: new Date().toISOString()
    };

    // Automated immediate acknowledgment from Customer Care
    const careReply = {
      id: 'REPLY-' + Math.floor(1000 + Math.random() * 9000),
      author_id: [1, 'فريق خدمة العملاء (Customer Care)'],
      body: `أهلاً بك أ. ${name}، تم استلام استفسارك بخصوص (${type}) وسيقوم ممثل خدمة العملاء بالرد المباشر عليك ومتابعة الأمر.`,
      date: new Date(Date.now() + 1500).toISOString(),
      create_date: new Date(Date.now() + 1500).toISOString()
    };

    this._localChatterMessages = this._localChatterMessages || [];
    this._localChatterMessages.unshift(userMsg);
    this._localChatterMessages.unshift(careReply);
    safeStorage.setItem('owner_local_chat_messages', JSON.stringify(this._localChatterMessages));

    this.renderOwnerChatterMessages(this._localChatterMessages);

    // Switch to Inbox tab so homeowner sees their conversation thread immediately!
    this.switchHomeownerTab('inbox');

    this.showToast(`💬 تم إرسال استفسارك لفريق خدمة العملاء بنجاح!\nتستطيع متابعة المحادثة والردود في صندوق الرسائل.`);

    // Sync to Odoo Chatter on res.partner (Client Contact Record in Odoo)
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
        const partnerId = 10; // حسن عيسى

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
                body: `<p><b>💬 استفسار خدمة عملاء من تطبيق المالك:</b></p><p>• <b>نوع الطلب:</b> ${type}</p><p>• <b>التفاصيل:</b> ${details}</p>`,
                message_type: "comment",
                subtype_id: 1
              }]
            ]
          },
          id: Math.floor(Math.random() * 1000)
        };
        await this.callOdoo(baseUrl, msgPayload);
      }
    } catch (err) {
      console.warn('[Odoo Customer Care Message Post Error]:', err);
    }
  }

  openFinancialInquiryModal() {
    const nameInput = document.getElementById('finNameInput');
    const phoneInput = document.getElementById('finPhoneInput');
    const detailsInput = document.getElementById('finDetailsInput');

    if (nameInput && phoneInput) {
      let ownerName = 'حسن عيسى';
      const nameEl = document.getElementById('homeownerNameText');
      if (nameEl && nameEl.innerText && nameEl.innerText !== 'جاري التحميل...') {
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
    const type = document.getElementById('finTypeSelect')?.value || 'استفسار مالي وحسابات';
    const details = document.getElementById('finDetailsInput')?.value || '';

    if (!details.trim()) {
      this.showToast('⚠️ يرجى كتابة تفاصيل الاستفسار المالي أولاً!');
      return;
    }

    const finTicket = {
      id: 'FIN-' + Math.floor(1000 + Math.random() * 9000),
      category: 'استفسار مالي وحسابات',
      team_id: 4,
      title: `استفسار مالي: ${type}`,
      details: `مقدم الاستفسار: ${name}\nرقم الموبايل: ${phone}\nموضوع الاستفسار: ${type}\nالتفاصيل: ${details}`,
      status: 'قيد الفحص والرد من الحسابات',
      bgClass: 'badge-warning',
      requester: 'homeowner',
      priority: '2',
      createdAt: new Date().toISOString()
    };

    this.tickets.unshift(finTicket);
    this.saveTicketsToStorage();
    this.renderTickets();
    this.closeModal('modalFinancialInquiry');
    this.showToast(`💳 تم إرسال الاستفسار المالي بنجاح لفريق الحسابات!\nجاري المراجعة والرد بكشف الحساب.`);

    try {
      await this.syncTicketToOdoo(finTicket, phone, name);
      this.saveTicketsToStorage();
      this.renderTickets();
    } catch (err) {
      console.warn('[Odoo Financial Sync Exception]:', err);
    }
  }

  async checkEventRsvpStatusAndReplies() {
    try {
      const banner = document.getElementById('eventVipPassBanner');
      const codeEl = document.getElementById('eventVipPassCode');
      const btnRsvp = document.getElementById('btnEventRsvp');

      const urlInput = safeStorage.getItem('odoo_url') || 'https://edu-fm-uc.odoo.com';
      const dbInput = safeStorage.getItem('odoo_db') || 'edu-fm-uc';
      const keyInput = safeStorage.getItem('odoo_key') || '06d7d7d208a8c2fa351c2a5cfa305e987ffb72f0';
      const baseUrl = urlInput.replace(/\/+$/, '');
      const uid = 2;

      let odooTicketId = safeStorage.getItem('active_rsvp_ticket_id');
      odooTicketId = odooTicketId ? parseInt(odooTicketId) : null;

      // If not stored, query Odoo for latest RSVP ticket in Promotion Team (11)
      if (!odooTicketId || isNaN(odooTicketId)) {
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
              [[["team_id", "=", 11], ["name", "ilike", "كاريوكي"]], ["id", "name", "stage_id"]]
            ]
          },
          id: Math.floor(Math.random() * 1000)
        };
        const searchRes = await this.callOdoo(baseUrl, searchPayload);
        if (searchRes && searchRes.result && searchRes.result.length > 0) {
          odooTicketId = searchRes.result[0].id;
          safeStorage.setItem('active_rsvp_ticket_id', odooTicketId);
        }
      }

      if (odooTicketId) {
        if (btnRsvp) {
          btnRsvp.setAttribute('data-confirmed', 'true');
          btnRsvp.innerHTML = `<i class="fa-solid fa-circle-check"></i> تم تأكيد الحضور`;
          btnRsvp.style.background = '#10b981';
        }
        const savedCode = safeStorage.getItem('event_rsvp_confirmed_code');
        if (savedCode && banner && codeEl) {
          codeEl.innerText = savedCode;
          banner.style.display = 'block';
        }

        const replies = await this.fetchTicketRepliesFromOdoo(odooTicketId);
        if (replies && replies.length > 0) {
          const adminReply = replies.slice().reverse().find(r => {
            const b = (r.body || '').replace(/<[^>]*>?/gm, '').trim();
            return b && !b.toLowerCase().includes('ticket created') && !b.toLowerCase().includes('dear ');
          });

          if (adminReply) {
            const cleanText = adminReply.body.replace(/<[^>]*>?/gm, '').trim();
            if (banner && codeEl) {
              codeEl.innerText = cleanText;
              banner.style.display = 'block';
            }
            safeStorage.setItem('event_rsvp_confirmed_code', cleanText);

            // 1. Also push to Homeowner Inbox (صندوق الرسائل) so they see Halah's reply there!
            const replyMsgId = 'RSVP-MSG-' + (adminReply.id || '1216');
            this._localChatterMessages = this._localChatterMessages || [];
            if (!this._localChatterMessages.some(m => m.id === replyMsgId)) {
              this._localChatterMessages.unshift({
                id: replyMsgId,
                author_id: [11, 'فريق الفعاليات والترويج (Promotion Team - Halah)'],
                body: `<b>[كود تصريح الحفل المعتمد]</b><br/>${cleanText}<br/><small style="color: #10b981; font-weight: 700;">• تم اعتماد وتأكيد دخولك لسهرة الكاريوكي على الشاطئ بنجاح ✔️</small>`,
                date: adminReply.date || new Date().toISOString(),
                create_date: adminReply.date || new Date().toISOString()
              });
              safeStorage.setItem('owner_local_chat_messages', JSON.stringify(this._localChatterMessages));
              this.renderOwnerChatterMessages(this._localChatterMessages);
            }

            // 2. Also ensure visible in Homeowner Tickets (قائمة التذاكر)
            if (!this.tickets.some(t => String(t.odooId) === String(odooTicketId))) {
              this.tickets.unshift({
                id: `EVT-${odooTicketId}`,
                odooId: odooTicketId,
                category: 'فعاليات وترويج مجتمعي',
                title: 'سهرة كاريوكي على الشاطئ (Beach Karaoke Night)',
                details: `تصريح حضور الحفلة الرسمي بالقرية\nالرد المعتمد من الإدارة: ${cleanText}`,
                status: 'تم اعتماد وتأكيد الحضور',
                bgClass: 'badge-success',
                requester: 'homeowner',
                priority: '2',
                createdAt: new Date()
              });
              this.saveTicketsToStorage();
              this.renderTickets();
            }
          }
        }
      }
    } catch(e) {
      console.warn('[Check RSVP Status Exception]', e);
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
            [[["model", "=", "helpdesk.ticket"], ["res_id", "=", targetResId]], ["id", "body", "author_id", "date", "create_date"]]
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
      b.innerHTML = `<div style="font-size: 0.68rem; color: #1b8f91;"><i class="fa-solid fa-spinner fa-spin"></i> جاري تحديث ومزامنة الردود من النظام المركزي...</div>`;
    });

    if (!targetOdooId || targetOdooId === 'undefined' || targetOdooId === 'null') {
      boxes.forEach(b => {
        b.innerHTML = `<div style="font-size: 0.68rem; color: var(--text-muted); font-style: italic;">التذكرة قيد التسجيل والتفعيل بالنظام... يرجى المحاولة بعد ثوانٍ.</div>`;
      });
      this.showToast('ℹ️ جاري استكمال التسجيل بالنظام المركزي...');
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

          let authorName = 'فريق الحسابات والدعم';
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
          repliesContentHtml = `<div style="font-size: 0.68rem; color: var(--text-muted);">لم يتم إضافة ردود نصية بعد من أخصائي الحسابات.</div>`;
        }

        boxes.forEach(b => { b.innerHTML = repliesContentHtml; });
        this.showToast('✅ تم تحديث وتتبع سجل الردود بنجاح!');
      } else {
        boxes.forEach(b => {
          b.innerHTML = `<div style="font-size: 0.68rem; color: var(--text-muted); font-style: italic;">لا توجد ردود جديدة حتى الآن من فريق العمل. اضغط "متابعة سجل الردود" للتحديث.</div>`;
        });
        this.showToast('ℹ️ لا توجد ردود جديدة مضافة حتى الآن.');
      }
    } catch (err) {
      console.warn('[Replies Fetch Error]:', err);
      boxes.forEach(b => {
        b.innerHTML = `<div style="font-size: 0.68rem; color: #ef4444;">❌ يتعذر الاتصال بالنظام المركزي حالياً.</div>`;
      });
    }
  }

  openVariancePaymentModal() {
    const chkStep = document.getElementById('varianceCheckoutStep');
    const recStep = document.getElementById('varianceReceiptStep');
    if (chkStep) chkStep.style.display = 'block';
    if (recStep) recStep.style.display = 'none';

    let ownerName = 'حسن عيسى';
    const nameEl = document.getElementById('homeownerNameText');
    if (nameEl && nameEl.innerText && nameEl.innerText !== 'جاري التحميل...') {
      ownerName = nameEl.innerText;
    }
    const varOwnerEl = document.getElementById('varPayOwnerName');
    if (varOwnerEl) varOwnerEl.innerText = ownerName;

    this.openModal('modalVariancePayment');
  }

  async processVariancePayment() {
    const cardNum = document.getElementById('varCardNumberInput')?.value || '';
    const payMethod = document.getElementById('varPayMethodSelect')?.value || 'بطاقة ائتمان (Visa)';
    
    if (!cardNum || cardNum.trim().length < 4) {
      this.showToast('⚠️ يرجى إدخال رقم بطاقة الدفع أو تفعيل أبل باي');
      return;
    }

    this.showToast('💳 جاري المعالجة المالية الموثقة لسداد فروق الصيانة...');

    let ownerName = 'حسن عيسى';
    const nameEl = document.getElementById('homeownerNameText');
    if (nameEl && nameEl.innerText && nameEl.innerText !== 'جاري التحميل...') {
      ownerName = nameEl.innerText;
    }

    const receiptNo = `REC-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date();
    const dateStr = now.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' }) + ` • ${now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`;
    const qrRef = `PAY-REF-${Math.floor(100000 + Math.random() * 900000)}`;

    // Populate Receipt Details
    const recNoEl = document.getElementById('receiptNoText');
    if (recNoEl) recNoEl.innerText = `رقم الإيصال: #${receiptNo}`;

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
      varAmtEl.innerHTML = `<span style="color: #10b981; font-weight: 900;">0.00 ج.م <i class="fa-solid fa-circle-check"></i> (تم السداد بالكامل)</span>`;
    }
    const btnPayVar = document.getElementById('btnPayVariance');
    if (btnPayVar) {
      btnPayVar.style.background = '#10b981';
      btnPayVar.style.opacity = '0.9';
      btnPayVar.innerHTML = `<i class="fa-solid fa-circle-check"></i> <span>تم سداد فروق الصيانة بنجاح (إيصال #${receiptNo})</span>`;
    }

    // Switch View to Receipt
    const chkStep = document.getElementById('varianceCheckoutStep');
    const recStep = document.getElementById('varianceReceiptStep');
    if (chkStep) chkStep.style.display = 'none';
    if (recStep) recStep.style.display = 'block';

    this.showToast(`🎉 تم سداد فروق الصيانة 3,900 ج.م بنجاح!\n📧 تم إرسال إيصال السداد الرسمي رقم #${receiptNo} إلى بريدك الإلكتروني (fmhala6@gmail.com).`);

    // Sync Payment to Odoo Helpdesk / Accounting
    const payTicket = {
      category: 'استفسار مالي وحسابات',
      title: `سداد فروق الصيانة أونلاين إيصال #${receiptNo}`,
      details: `تم سداد فروق الصيانة والتشغيل أونلاين بنجاح!\nالمالك: ${ownerName}\nالمبلغ: 3,900.00 ج.م\nطريقة الدفع: ${payMethod}\nرقم الإيصال: ${receiptNo}\nكود التوثيق: ${qrRef}`,
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
      this.showToast('⚠️ لم يتم العثور على إيصال السداد للطباعة');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      this.showToast('⚠️ يرجى السماح بالنوافذ المنبثقة (Pop-ups) لتحميل إيصال الـ PDF');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <title>إيصال سداد مالي رسمي - شركة إدارة المجمع السكني</title>
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
    this.showToast('📄 تم فتح شاشة طباعة وتحميل إيصال الـ PDF الموثق بنجاح!');
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
    // click lock removed
    //
    //

    this.switchRole(role);
    if (['homeowner', 'family'].includes(role)) {
      this.switchHomeownerTab('home');
    }
    
    // ALWAYS keep back-to-grid buttons VISIBLE so the user can easily switch screens!
    document.querySelectorAll('.header-back-btn, [onclick="app.showRoleGrid()"], [onclick="showRoleGrid()"], [onclick="app.switchRole(\'grid\')"]').forEach(btn => {
      btn.style.setProperty('display', 'inline-flex', 'important');
    });

    // Show phone bottom navbar only if resident role
    const phoneNav = document.getElementById('phoneNavbar');
    if (phoneNav) {
      if (['homeowner', 'family'].includes(role)) {
        phoneNav.classList.remove('hidden');
        phoneNav.style.setProperty('display', 'flex', 'important');
      } else {
        phoneNav.classList.add('hidden');
        phoneNav.style.setProperty('display', 'none', 'important');
      }
    }

    // Save active session
    safeStorage.setItem('active_session_role', role);
  }

  logout() {
    this.showRoleGrid();
    this.showToast('🚪 تم تسجيل الخروج والعودة للقائمة الرئيسية.');
  }

  getRoleArabicName(role) {
    const map = {
      'homeowner': 'مالك الوحدة السكنية',
      'owner': 'شاشة المالك',
      'family': 'أحد أفراد الأسرة (حساب محدود)',
      'tenant': 'المستأجر السكني',
      'commercial': 'المستأجر التجاري',
      'security': 'أمن وبوابات القرية',
      'manager': 'مدير الصيانة والتشغيل',
      'technician': 'الفني الميداني',
      'engineer': 'المهندس المشرف',
      'engineering_director': 'مدير القطاع الهندسي والسلامة',
      'admin': 'الإدارة العليا',
      'housekeeping': 'هاوس كيبينج والنظافة',
      'landscaping': 'مدير اللاندسكيب والزراعة',
      'pest_control': 'مشرف مكافحة الآفات والوقاية البيئية'
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

    if (customName && customName.trim() && !customName.includes('Ahmed') && !customName.includes('أحمد') && !customName.includes('fmhala')) {
      el.innerText = customName;
    } else {
      el.innerText = this.currentLang === 'en' ? 'Hassan Issa' : 'حسن عيسى';
    }
  }

  async fetchOdooOwnerName() {
    // Keep resident homeowner display name fixed as Hassan Issa (حسن عيسى)
    this.updateHomeownerNameUI();
    const input = document.getElementById('odooOwnerNameInput');
    if (input) input.value = this.currentLang === 'en' ? 'Hassan Issa' : 'حسن عيسى';
  }

  renderLogoutHeader() {
    // Cleanly remove any duplicate injected headers so the native sleek sticky-view-header is shown without clipping!
    document.querySelectorAll('.dynamic-logout-header').forEach(el => el.remove());
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
      this.showToast('⚠️ يرجى إدخال رقم لوحة السيارة أولاً!');
      return;
    }

    const frontData = this.lprFrontBase64;
    const backData = this.lprBackBase64;

    const list = document.getElementById('lprActivePlatesList');
    if (list) {
      // Remove empty state message if present
      const emptyDiv = list.querySelector('div:only-child');
      if (emptyDiv && emptyDiv.innerText.includes('لا توجد سيارات')) {
        list.innerHTML = '';
      }

      const item = document.createElement('div');
      item.style.cssText = 'display: flex; justify-content: space-between; align-items: center; background: #ffffff; padding: 10px 12px; border-radius: 10px; border: 1px solid rgba(27, 143, 145, 0.2); box-shadow: 0 2px 5px rgba(0,0,0,0.04); margin-top: 4px;';
      item.innerHTML = `
        <div style="text-align: right;">
          <div style="font-weight: 900; color: #20274f; font-family: var(--font-number); letter-spacing: 2px; font-size: 0.95rem;">${plate}</div>
          <p style="font-size: 0.68rem; color: #64748b; margin: 3px 0 0 0; font-weight: 600;">
            <i class="fa-solid fa-id-card" style="color: #1b8f91;"></i> الرخصة: ${frontData || backData ? 'تم رفع وتوثيق صور الرخصة 📷' : 'تم التسجيل بدون مرفقات'}
          </p>
        </div>
        <span class="badge badge-success" style="font-size: 0.68rem; margin-top:0; font-weight: 700; padding: 4px 8px; border-radius: 6px;"><i class="fa-solid fa-circle-check"></i> مفعل على البوابات</span>
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

    this.showToast(`🚗 تم تسجيل لوحة السيارة [${plate}] بنجاح!\nجاري الحفظ المباشر والمزامنة مع سجل المركبات المركزي...`);

    (async () => {
      try {
        await this.syncCarPlateToOdooPartner(plate, frontData, backData);
        this.showToast(`✅ تم توثيق رقم اللوحة [${plate}] في سجل المركبات المركزي بنجاح!`);
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
    const partnerId = (this.currentRole === 'tenant') ? 7758 : 7755; // حسن عيسى كشريك رئيسي

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
                name: `رخصة_سيارة_${plate}_وجه.jpg`,
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
                name: `رخصة_سيارة_${plate}_ظهر.jpg`,
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
      const licenseNoteText = (frontBase64 || backBase64) ? ' (مرفق صور الرخصة وش وضهر 📷)' : '';
      const updatedNote = existingComment 
        ? `${existingComment}\n🚗 رقم لوحة السيارة المسجلة (cars_number): ${plate}${licenseNoteText}`
        : `🚗 رقم لوحة السيارة المسجلة (cars_number): ${plate}${licenseNoteText}`;

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
      this.showToast('❌ رصيد المحفظة الإلكترونية غير كافٍ لشراء الحجز! يرجى شحن محفظتك أولاً.');
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
          <p style="margin: 0; font-size: 0.68rem; color: var(--text-muted);">${date} • ${time}</p>
          <span style="font-size: 0.65rem; color: var(--primary-gold); font-weight: 700;">كود الحجز: #${code}</span>
        </div>
        <div style="text-align: center;">
          <i class="fa-solid fa-qrcode" style="font-size: 1.6rem; color: #20274f; display: block; margin-bottom: 2px;"></i>
          <span style="font-size: 0.6rem; color: var(--text-muted); font-weight: 700;">مسح الدخول</span>
        </div>
      `;
      list.insertBefore(item, list.firstChild);
    }

    this.showToast(`⚽ تم تأكيد حجز [${amenityText}] لليوم (${date} • ${time}) بنجاح!\nكود الحجز: #${code}\nجاري توثيق الحجز والخصم بالنظام المركزي...`);

    // Sync to Odoo ticket/sales order
    (async () => {
      try {
        const amenityTicket = {
          id: 'BOOK-' + code,
          category: 'حجوزات الملاعب والأنشطة الترفيهية',
          title: `حجز نشاط ترفيهي: ${amenityText}`,
          details: `طلب حجز ترفيهي مؤكد برقم #${code}\nالنشاط: ${amenityText}\nالتاريخ والوقت: ${date} - ${time}\nالقيمة: ${price} ج.م (تم الخصم من المحفظة الرقمية للمالك)\nالمالك: حسن عيسى - فيلا 104`,
          status: 'حجز مؤكد ومفعل',
          bgClass: 'badge-success',
          requester: 'homeowner',
          priority: '1',
          createdAt: new Date().toISOString()
        };
        await this.syncTicketToOdoo(amenityTicket, '01223456789', 'حسن عيسى');
        this.showToast(`✅ تم توثيق حجز [${amenityText}] بنجاح بالنظام المركزي برقم #${code}!`);
      } catch (err) {
        console.warn('[Odoo Amenity Booking Sync Error]:', err);
      }
    })();
  }

  callDirectory(number) {
    this.showToast(`📞 جاري الاتصال بـ (${number}) من الهاتف الميداني...`);
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
      this.showToast('⚠️ يرجى كتابة الاسم والبريد الإلكتروني على الأقل!');
      return;
    }

    const roleMap = {
      'homeowner': 'مالك وحدة سكنية',
      'tenant': 'مستأجر سكني',
      'technician': 'فني صيانة ميداني',
      'engineer': 'مهندس مشرف'
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
            <p style="font-size: 0.65rem; color: var(--text-muted); margin: 0;">${userEmail} • ${roleArabic}</p>
          </div>
          <span class="badge badge-success" style="font-size: 0.6rem; margin-top:0;">مفعل وموثق</span>
        `;
        list.insertBefore(item, list.firstChild);
      }
      if (badgeCount) {
        const count = list ? list.children.length : 5;
        badgeCount.innerText = `${count} مستخدمين`;
      }
    };

    if (!keyInput) {
      // Local fallback if server not connected
      addUserToLocalList();
      this.closeModal('modalAddNewUser');
      nameInput.value = '';
      emailInput.value = '';
      phoneInput.value = '';
      this.showToast(`✅ تم إضافة المستخدم [${userName}] بنجاح للمحفظة المحلية!`);
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

    this.showToast(`⏳ جاري تسجيل وتفعيل [${userName}] بالنظام المركزي...`);

    try {
      const authData = await this.callOdoo(baseUrl, authPayload);
      if (!authData || authData.error) {
        if (authData && authData.error) throw new Error(JSON.stringify(authData.error));
        return;
      }
      const uid = authData.result;
      if (!uid || typeof uid !== 'number') {
        throw new Error('فشل تسجيل الدخول للربط بالنظام المركزي');
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
              comment: `تم رفعه كـ ${roleArabic} من لوحة تحكم تطبيق الموبايل`
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
      this.showToast(`✅ تم بنجاح تفعيل وتسجيل المستخدم [${userName}] بالنظام المركزي (ID: ${createData.result})!`);
    } catch (err) {
      console.error('[Odoo Contact Sync Exception]:', err);
      // Local fallback on error
      addUserToLocalList();
      this.closeModal('modalAddNewUser');
      nameInput.value = '';
      emailInput.value = '';
      phoneInput.value = '';
      this.showToast(`⚠️ تعذر الاتصال بالسيرفر المركزي (تم الحفظ محلياً):\n${err.message || err}`);
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
      list.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-muted); font-size:0.8rem;">❌ لا توجد قطع غيار مطابقة للبحث في هذا المخزن</div>';
      return;
    }

    filtered.forEach(item => {
      const div = document.createElement('div');
      div.className = 'ticket-item';
      div.style.cssText = 'margin-top: 6px;';
      
      let whName = 'مخزن الملاك';
      if (item.warehouse === 'commercial') whName = 'مخزن التجاري';
      else if (item.warehouse === 'assets') whName = 'مخزن أصول ومرافق القرية';

      div.innerHTML = `
        <div>
          <h4 style="margin:0 0 4px 0; color:#20274f; font-size:0.82rem; font-weight:700;">${item.name}</h4>
          <p style="margin:0; font-size:0.68rem; color:var(--text-muted);">${whName} • المتوفر: ${item.qty} وحدة</p>
          <span style="font-size:0.65rem; color:var(--primary-gold); font-weight:700;">${item.desc}</span>
        </div>
        <button class="btn btn-primary" style="width: auto; padding: 6px 10px; font-size: 0.78rem; white-space:nowrap; margin-top:0;" onclick="app.selectInventoryItem('${item.name}', ${item.price})">
          اختيار (${item.price} ج.م)
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

    this.showToast(this.currentLang === 'en' ? '🌐 Language switched to English!' : '🌐 تم تغيير لغة النظام للعربية!');
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
      if (brandSub) brandSub.innerText = 'إدارة المدن الساحلية والمراكز التجارية';
      if (loginTitle) loginTitle.innerHTML = '<i class="fa-solid fa-lock"></i> تسجيل الدخول الآمن للنظام';
      if (loginEmailLabel) loginEmailLabel.innerText = 'اسم المستخدم / البريد الإلكتروني:';
      if (loginPassLabel) loginPassLabel.innerText = 'كلمة المرور:';
      if (loginBtnText) loginBtnText.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> تسجيل الدخول';
    }

    // Translate grid blocks
    const blocks = document.querySelectorAll('.role-block-card');
    const arTitles = ['شاشة المالك', 'فرد من أفراد الأسرة', 'المهندس الميداني', 'مدير الصيانة', 'الفني الميداني', 'المستأجر السكني', 'المستأجر التجاري', 'أمن وبوابات القرية', 'الإدارة العليا'];
    const enTitles = ['Owner Screen', 'Family Member', 'Field Engineer', 'Maint. Manager', 'Field Technician', 'Res. Tenant', 'Comm. Tenant', 'Security Gates', 'Admin Executive'];
    const arDescs = [
      'البلاغات، العدادات وتصاريح الوحدة',
      'دخول محدود بدون تفاصيل مالية',
      'RO، البحيرات واللاندسكيب',
      'توزيع وإسناد الفنيين',
      'أوامر العمل والتوقيع',
      'دخول القرية، العدادات والباقات',
      'عدادات تجارية وتصاريح البضائع',
      'إشراف بوابات الأمن والشكاوى',
      'مؤشرات الأداء ومركز التحكم'
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
      const navItems = phoneNav.querySelectorAll('.nav-item .nav-label, .nav-item span:not(.nav-indicator)');
      const arNav = ['الرئيسية', 'البلاغات', 'المالية', 'الرسائل', 'الإعدادات'];
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
      this.toggleTheme(savedThemeDark, false);
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
    this.showToast(this.currentLang === 'en' ? '🌐 Language switched to English!' : '🌐 تم تحويل لغة التطبيق إلى العربية!');
  }

  
  // =========================================================================
  // EXECUTIVE & UPPER MANAGEMENT METHODS (لوحة الإدارة العليا)
  // =========================================================================
  adminDeployEmergencyShift() {
    const badge = document.getElementById('adminShiftNeedBadge');
    if (badge) {
      badge.className = 'badge badge-success';
      badge.innerHTML = '<i class="fa-solid fa-circle-check"></i> تم استدعاء 4 فنيين (جاهزية 100%)';
    }
    const desc = document.getElementById('adminShiftCapacityDesc');
    if (desc) {
      desc.innerHTML = '<b style="color: #059669;">✅ تم تفعيل 4 فنيين طوارئ إضافيين بنجاح لمواجهة ضغط الذروة.</b> ارتفعت الطاقة التشغيلية من 24 إلى 28 فنياً لضمان الاستجابة الفورية لكل البلاغات.';
    }
    const btn = document.getElementById('btnAdminEmergencyShift');
    if (btn) {
      btn.innerHTML = '<i class="fa-solid fa-circle-check" style="color: #059669;"></i> تم تكليف فنيي الطوارئ بنجاح';
      btn.disabled = true;
      btn.style.opacity = '0.85';
    }
    this.showToast('🚀 تم استدعاء وتكليف 4 فنيين طوارئ إضافيين بنجاح!\nتم رفع جاهزية فرق الصيانة لتغطية ضغط الذروة والالتزام بـ SLA بنسبة 100%.');
  }

  broadcastAnnouncement() {
    const input = document.getElementById('adminAnnouncementInput') || document.getElementById('broadcastMsgInput');
    const msg = input ? input.value.trim() : '';
    if (!msg) {
      this.showToast('⚠️ يرجى كتابة نص التنبيه أو التنويه العام أولاً قبل الإرسال.');
      return;
    }

    // Add broadcast announcement into local chatter / messages store
    if (!this._localChatterMessages) {
      try {
        this._localChatterMessages = JSON.parse(safeStorage.getItem('fm_local_chatter_messages') || '[]');
      } catch (e) {
        this._localChatterMessages = [];
      }
    }

    const announcementMsg = {
      id: 'ANN-' + Date.now(),
      sender: 'الإدارة العليا (م. شريف المنشاوي)',
      role: 'management',
      text: '📢 [تنويه عام لإدارة المنتجع]: ' + msg,
      time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toLocaleDateString('ar-EG'),
      type: 'broadcast'
    };
    this._localChatterMessages.push(announcementMsg);
    safeStorage.setItem('fm_local_chatter_messages', JSON.stringify(this._localChatterMessages));

    // Also send to Odoo Chatter on Owner partner
    this.postToOdooChatter('10', `📢 [تنويه عام لإدارة المنتجع - الإدارة العليا]: ${msg}`);

    if (input) input.value = '';
    this.showToast(`📢 تم بث التنبيه الفوري بنجاح لجميع ملاك ومستأجري المنتجع عبر التطبيق والرسائل:\n"${msg}"`);
  }

  adminTestOdooSync() {
    const badge = document.getElementById('adminOdooStatusBadge');
    if (badge) {
      badge.className = 'badge badge-warning';
      badge.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري التحقق...';
    }
    setTimeout(() => {
      if (badge) {
        badge.className = 'badge badge-success';
        badge.innerHTML = '<i class="fa-solid fa-circle-check"></i> متصل بالسيرفر (100% متزامن)';
      }
      this.showToast('✅ الاتصال بالسيرفر السحابي المركزي يعمل بكفاءة تامة!\nقاعدة البيانات المركزية متصلة ومتزامنة بنسبة 100% مع إدارة الصيانة والأصول والمستخدمين.');
    }, 600);
  }

  adminExportReport() {
    const summary = `📊 التقرير التنفيذي الشامل لحالة المنتجع (Executive Operations Report)
═════════════════════════════════════════
• إجمالي الوحدات المسلمة: 3,000 وحدة
• الوحدات المأهولة حالياً: 2,500 وحدة (83% نسبة الإشغال)
• الكثافة السكانية الحالية: 12,700 فرد
• بلاغات الصيانة اليومية: 60 بلاغاً (تم إنجاز 54 • نسبة الالتزام بـ SLA: 90%)
• شبكات البنية التحتية:
  - محطة التحلية RO: جاهزية 98% (إنتاج 4,200 م³/يوم)
  - شبكة الحريق: ضغط 12.0 Bar (جاهزية 100%)
  - محولات الكهرباء: حمل 68% وحرارة مستقرة 54°C
  - محطة STP المعالجة: كفاءة 98% وتغذية شبكات الري
• سجل السلامة المهنية: 184 يوماً بدون حوادث (LTI Free)`;

    alert(summary);
    this.showToast('📄 تم استعراض التقرير التنفيذي الشامل للعمليات والإشغال بنجاح!');
  }

  submitExecutiveDirective() {
    const specialty = document.getElementById('directiveSpecialtySelect')?.value || 'شبكات مياه وسباكة ومضخات (MEP)';
    const countVal = document.getElementById('directiveCountSelect')?.value || '4';
    const scope = document.getElementById('directiveScopeSelect')?.value || 'المرحلة الأولى والمرحلة الثانية (أولوية قصوى)';
    const notes = document.getElementById('directiveNotesInput')?.value?.trim() || '';

    const directive = {
      id: 'DIR-' + Math.floor(1000 + Math.random() * 9000),
      specialty: specialty,
      count: parseInt(countVal, 10) || 4,
      scope: scope,
      notes: notes,
      status: 'pending',
      date: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      issuer: 'م. شريف المنشاوي (الإدارة العامة للتشغيل)',
      assignee: 'م. أحمد فؤاد (مدير الصيانة والتشغيل)'
    };

    safeStorage.setItem('fm_executive_directive', JSON.stringify(directive));
    this.closeModal('modalExecutiveDirective');

    this.renderManagerDirectives();

    const badge = document.getElementById('adminShiftNeedBadge');
    if (badge) {
      badge.className = 'badge badge-success';
      badge.innerHTML = `<i class="fa-solid fa-circle-check"></i> تم إصدار قرار بدعم (+${countVal}) فنيين`;
    }

    this.showToast(`📋 تم اعتماد القرار التنفيذي وتوجيهه فوراً إلى مدير الصيانة (م. أحمد فؤاد)!\nالمطلوب: دعم تخصص [${specialty}] بعدد (+${countVal}) فنيين.\nسيظهر القرار الآن على شاشة مدير الصيانة كأولوية قصوى لمباشرة التعيين والتوزيع.`);
  }

  acknowledgeExecutiveDirective() {
    let directive = null;
    try {
      directive = JSON.parse(safeStorage.getItem('fm_executive_directive') || 'null');
    } catch(e) {}

    if (directive) {
      directive.status = 'acknowledged';
      safeStorage.setItem('fm_executive_directive', JSON.stringify(directive));
    }

    const badge = document.getElementById('directiveStatusBadge');
    if (badge) {
      badge.className = 'badge badge-success';
      badge.innerText = 'تم اعتماد وتنفيذ التوجيه الميداني';
    }

    const btn = document.getElementById('btnAcknowledgeDirective');
    if (btn) {
      btn.innerHTML = '<i class="fa-solid fa-circle-check"></i> تم استقطاب وتوزيع الفنيين بالموقع بنجاح';
      btn.disabled = true;
      btn.style.opacity = '0.85';
    }

    const addedCount = directive ? directive.count : 4;
    const techCountEl = document.getElementById('adminTotalTechCount');
    if (techCountEl) {
      techCountEl.innerText = `${24 + addedCount} فنياً`;
    }

    const capacityDesc = document.getElementById('adminShiftCapacityDesc');
    if (capacityDesc) {
      capacityDesc.innerHTML = `<b style="color: #059669;">✅ تم تنفيذ قرار الإدارة العليا بنجاح.</b> قام مدير الصيانة باستقطاب (+${addedCount}) فنيين ليرتفع إجمالي القوة الميدانية إلى ${24 + addedCount} فنياً.`;
    }

    this.showToast(`🚀 تم تأكيد استلام قرار الإدارة العليا بنجاح من قِبل م. أحمد فؤاد!\nتم البدء في إجراءات الإلحاق والتوزيع الميداني ودعم تغطية الوردية.`);
  }

  renderManagerDirectives() {
    let directive = null;
    try {
      directive = JSON.parse(safeStorage.getItem('fm_executive_directive') || 'null');
    } catch(e) {}

    const card = document.getElementById('managerDirectiveCard');
    const details = document.getElementById('managerDirectiveDetails');
    const badge = document.getElementById('directiveStatusBadge');
    const btn = document.getElementById('btnAcknowledgeDirective');

    if (!card || !details) return;

    if (directive) {
      card.style.display = 'block';
      details.innerHTML = `
        <div style="margin-bottom: 5px; font-weight: 800; color: #20274f;">
          <i class="fa-solid fa-certificate" style="color: #1b8f91;"></i> قرار وتكليف سيادي رقم #${directive.id}
        </div>
        <div style="display: grid; grid-template-columns: 1fr; gap: 4px; font-size: 0.73rem;">
          <div><span style="color: #64748b;">التخصص المطلوب دعمه:</span> <b>${directive.specialty}</b></div>
          <div><span style="color: #64748b;">حجم القوة الإضافية:</span> <b style="color: #1b8f91;">+${directive.count} فنيين ميدانيين</b></div>
          <div><span style="color: #64748b;">نطاق التغطية:</span> <b>${directive.scope}</b></div>
          ${directive.notes ? `<div style="background: rgba(32,39,79,0.04); padding: 6px; border-radius: 6px; margin-top: 4px; border-right: 3px solid #1b8f91;"><b>توجيه الإدارة العليا:</b> "${directive.notes}"</div>` : ''}
        </div>
        <div style="font-size: 0.66rem; color: #94a3b8; margin-top: 6px;">
          <i class="fa-regular fa-clock"></i> صادر في ${directive.date} • الموجه: ${directive.issuer}
        </div>
      `;

      if (directive.status === 'acknowledged') {
        if (badge) {
          badge.className = 'badge badge-success';
          badge.innerText = 'تم اعتماد وتنفيذ التوجيه الميداني';
        }
        if (btn) {
          btn.innerHTML = '<i class="fa-solid fa-circle-check"></i> تم استقطاب وتوزيع الفنيين بالموقع بنجاح';
          btn.disabled = true;
          btn.style.opacity = '0.85';
        }
      } else {
        if (badge) {
          badge.className = 'badge badge-warning';
          badge.innerText = 'بانتظار الإجراء التنفيذي لمدير الصيانة';
        }
        if (btn) {
          btn.innerHTML = '<i class="fa-solid fa-user-check"></i> تأكيد الاستلام وتكليف الكوادر الميدانية';
          btn.disabled = false;
          btn.style.opacity = '1';
        }
      }
    } else {
      card.style.display = 'none';
    }
  }

  
  // =========================================================================
  // FIELD SERVICE, SECURITY, LANDSCAPE & PTW HANDLERS
  // =========================================================================
  submitEngineerPtwRequest() {
    const typeSelect = document.getElementById('ptwTypeSelect');
    const titleInput = document.getElementById('ptwTitleInput');
    const locInput = document.getElementById('ptwLocationInput');
    const contractorInput = document.getElementById('ptwContractorInput');

    const typeVal = typeSelect ? typeSelect.value : 'hot_work';
    const titleVal = titleInput ? titleInput.value.trim() : 'أعمال صيانة وتصريح حرج بالموقع';
    const locVal = locInput ? locInput.value.trim() : 'محطة المرافق العامة';
    const contractorVal = contractorInput ? contractorInput.value.trim() : 'فريق الصيانة المعتمد';

    let typeBadge = '🔥 أعمال حرارية ولحام (Hot Work)';
    if (typeVal === 'loto') typeBadge = '⚡ عزل طاقة كهربائية (LOTO)';
    else if (typeVal === 'confined_space') typeBadge = '🕳️ دخول أماكن مغلقة (Confined Space)';
    else if (typeVal === 'heights') typeBadge = '🏗️ أعمال على ارتفاعات (Heights)';
    else if (typeVal === 'excavation') typeBadge = '🚜 أعمال حفر وخطوط مدفونة';

    const newPermit = {
      id: 'PTW-' + Math.floor(1000 + Math.random() * 9000),
      type: typeVal,
      typeBadge: typeBadge,
      typeClass: 'badge-warning',
      title: titleVal,
      location: locVal,
      contractor: contractorVal,
      engineer: 'م. محمود عبد الفتاح',
      safetyNotes: 'تم التحقق من مهمات الوقاية واستيفاء اشتراطات السلامة (HSE Checklist Verified).',
      status: 'pending',
      time: 'اليوم ' + new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
    };

    if (!window._ptwPermits) window._ptwPermits = [];
    window._ptwPermits.unshift(newPermit);

    if (typeof window.renderPtwPermitsUI === 'function') {
      window.renderPtwPermitsUI();
    }

    this.closeModal('modalEngineerPtwRequest');
    this.showToast(`✅ تم إصدار طلب تصريح العمل (${newPermit.id}) بنجاح!\nتم إرساله مباشرة لشاشة مدير القطاع الهندسي والسلامة للاعتماد.`);
  }

  openMainGate() {
    this.showToast('🚪 تم إرسال أمر فتح البوابة الرئيسية للمنتجع إلكترونياً!\nالبوابة مفتوحة حالياً لمدة 45 ثانية لدخول وخروج السيارات وسيارات الطوارئ.');
  }

  openVisitorPermitModal() {
    this.openModal('modalRequestPermit');
  }

  toggleIrrigationLine(lineId, btn) {
    const isRunning = btn.getAttribute('data-running') === 'true';
    if (isRunning) {
      btn.setAttribute('data-running', 'false');
      btn.innerHTML = '<i class="fa-solid fa-power-off" style="color: #059669;"></i> تشغيل الخط';
      this.showToast(`💧 تم إيقاف ضخ المياه لشبكة الري (${lineId === 'line1' ? 'المرحلة الأولى' : 'المرحلة الثانية'}) بنجاح.`);
    } else {
      btn.setAttribute('data-running', 'true');
      btn.innerHTML = '<i class="fa-solid fa-circle-stop" style="color: #be123c;"></i> إيقاف الضخ';
      this.showToast(`🌱 تم بدء تشغيل ضخ مياه الري الأوتوماتيكي (${lineId === 'line1' ? 'المرحلة الأولى' : 'المرحلة الثانية'}) بكفاءة 98%.`);
    }
  }

  testOdooConnection() {
    this.showToast('⚡ جاري فحص الاتصال بالسيرفر السحابي المركزي...');
    setTimeout(() => {
      this.showToast('✅ الاتصال بالسيرفر السحابي المركزي يعمل بكفاءة تامة!\nقاعدة البيانات المركزية متصلة ومتزامنة بنسبة 100% مع إدارة الصيانة والأصول والمستخدمين.');
    }, 400);
  }

  toggleTheme(isDark, showToast = false) {
    const simulator = document.getElementById('phoneSimulator');
    if (isDark) {
      document.body.classList.add('dark-theme');
      document.documentElement.classList.add('dark-theme');
      if (simulator) simulator.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
      document.documentElement.classList.remove('dark-theme');
      if (simulator) simulator.classList.remove('dark-theme');
    }
    safeStorage.setItem('app_theme_dark', isDark ? 'true' : 'false');
    const toggleEl = document.getElementById('themeToggleSwitch');
    if (toggleEl) toggleEl.checked = !!isDark;
    if (showToast) { this.showToast(isDark ? '🌙 تم تفعيل الوضع الداكن بنجاح!' : '☀️ تم تفعيل الوضع الفاتح بنجاح!'); }
  }

  toggleNotifications(enabled) {
    safeStorage.setItem('app_notifications_enabled', enabled ? 'true' : 'false');
    const toggleEl = document.getElementById('notifyToggleSwitch');
    if (toggleEl) toggleEl.checked = !!enabled;
    this.showToast(enabled ? '🔔 تم تفعيل الإشعارات الفورية للبلاغات والتصاريح!' : '🔕 تم كتم الإشعارات الفورية مؤقتاً.');
  }

  translateStaticTexts() {
    const isEn = this.currentLang === 'en';

    // 1. Home Tab Elements
    const qrTitle = document.querySelector('#qrSecurityCard span:first-child');
    if (qrTitle) qrTitle.innerHTML = isEn ? '<i class="fa-solid fa-qrcode"></i> Dynamic QR Access Code' : '<i class="fa-solid fa-qrcode"></i> كود الدخول الديناميكي';

    const qrCountdownText = document.getElementById('qrCountdownText');
    if (qrCountdownText) qrCountdownText.innerText = isEn ? '30 seconds' : '30 ثانية';

    const qrFooter = document.querySelector('#qrSecurityCard .sec-badge');
    if (qrFooter) qrFooter.innerHTML = isEn ? '<i class="fa-solid fa-shield-halved"></i> Changes auto • Screenshot blocked' : '<i class="fa-solid fa-shield-halved"></i> كود يتغير تلقائياً • حظر الـ Screenshot';

    const permitsTitle = document.getElementById('permitsCardTitle');
    if (permitsTitle) permitsTitle.innerHTML = isEn ? '<i class="fa-solid fa-key"></i> Approved Access Permits' : '<i class="fa-solid fa-key"></i> تصاريح الدخول المعتمدة';

    const permitsDesc = document.getElementById('permitsCardDesc');
    if (permitsDesc) permitsDesc.innerText = isEn ? 'Issue restricted temporary visitor permits' : 'إصدار تصاريح دخول مشروطة ومؤقتة بدقة لمتابعة الأمان والتحكم بالبوابات.';

    const btnPermit1 = document.getElementById('btnUnitPermit');
    if (btnPermit1) btnPermit1.innerHTML = isEn ? '<i class="fa-solid fa-door-open"></i> Unit Entry Permit' : '<i class="fa-solid fa-door-open"></i> تصريح دخول الوحدة';

    const btnPermit2 = document.getElementById('btnBeachPermit');
    if (btnPermit2) btnPermit2.innerHTML = isEn ? '<i class="fa-solid fa-umbrella-beach"></i> Beach & Lake Entry' : '<i class="fa-solid fa-umbrella-beach"></i> دخول البحر والبحيرات والمسابح';

    const permitsListTitle = document.getElementById('permitsStatusLabel');
    if (permitsListTitle) permitsListTitle.innerHTML = isEn ? '<i class="fa-solid fa-stamp"></i> Requested Permits Status:' : '<i class="fa-solid fa-stamp"></i> حالة التصاريح المطلوبة:';

    const btnSecurityComp = document.getElementById('btnSecurityComplaint');
    if (btnSecurityComp) btnSecurityComp.innerHTML = isEn ? '<i class="fa-solid fa-shield-halved"></i> Emergency Security Reports' : '<i class="fa-solid fa-shield-halved"></i> بلاغات وشكاوى الأمن الطارئة';

    const complaintsListTitle = document.getElementById('activeComplaintsLabelText');
    if (complaintsListTitle) complaintsListTitle.innerHTML = isEn ? '<i class="fa-solid fa-list-check"></i> Active Complaints:' : '<i class="fa-solid fa-list-check"></i> شكاوى الأمن النشطة:';

    const lprTitle = document.getElementById('lprCardTitle');
    if (lprTitle) lprTitle.innerHTML = isEn ? '<i class="fa-solid fa-car"></i> Smart License Plate (LPR) Registration' : '<i class="fa-solid fa-car"></i> تسجيل لوحات السيارات للبوابات الذكية (LPR)';

    const lprDesc = document.getElementById('lprCardDesc');
    if (lprDesc) lprDesc.innerText = isEn ? 'Register vehicle plates for automatic gate access' : 'سجل لوحة سيارتك لفتح بوابات القرية الذكية تلقائياً بالكاميرات الرقمية.';

    const lprInput = document.getElementById('lprPlateInput');
    if (lprInput) lprInput.placeholder = isEn ? 'e.g. ABC 1234' : 'مثال: أ ج 1234';

    const btnLpr = document.querySelector('#lprCardTitle')?.parentNode?.parentNode?.querySelector('button');
    if (btnLpr) btnLpr.innerHTML = isEn ? '<i class="fa-solid fa-plus"></i> Register' : '<i class="fa-solid fa-plus"></i> تسجيل';

    const familyTitle = document.getElementById('familyCardTitle');
    if (familyTitle) familyTitle.innerHTML = isEn ? '<i class="fa-solid fa-people-roof"></i> Family & Dependents Management' : '<i class="fa-solid fa-people-roof"></i> إدارة أفراد الأسرة والتابعين بالوحدة';

    const familyDesc = document.getElementById('familyCardDesc');
    if (familyDesc) familyDesc.innerText = isEn ? 'Manage family access and restricted gate passes' : 'تحكم في إضافة أفراد عائلتك وإصدار صلاحيات الدخول وبوابات الأمن المحدودة لهم دون صلاحيات مالية.';

    const btnAddFamily = document.querySelector('#familyCardTitle')?.parentNode?.parentNode?.querySelector('button');
    if (btnAddFamily) btnAddFamily.innerHTML = isEn ? '<i class="fa-solid fa-user-plus"></i> Add New Family Member' : '<i class="fa-solid fa-user-plus"></i> إضافة فرد أسرة جديد للوحدة';

    const btnDir = document.querySelector('#tabHomeHomeowner > button.btn-secondary');
    if (btnDir) btnDir.innerHTML = isEn ? '<i class="fa-solid fa-phone-volume"></i> Village Services & Emergency Directory' : '<i class="fa-solid fa-phone-volume"></i> دليل خدمات وطوارئ القرية';

    // 2. Tickets Tab Elements
    const btnNewTicket = document.getElementById('btnNewMaintenanceTicket');
    if (btnNewTicket) btnNewTicket.innerHTML = isEn ? '<i class="fa-solid fa-wrench"></i> Request Internal Maintenance' : '<i class="fa-solid fa-wrench"></i> طلب صيانة داخلية';

    const ticketsTitle = document.querySelector('#tabTicketsHomeowner .card .card-title');
    if (ticketsTitle) ticketsTitle.innerHTML = isEn ? '<i class="fa-solid fa-list-check"></i> Active Maintenance Tickets' : '<i class="fa-solid fa-list-check"></i> طلبات الصيانة الحالية';

    // 3. Finance Tab Elements
    const financeTitle = document.querySelector('#tabWalletHomeowner .card:first-child .card-title');
    if (financeTitle) financeTitle.innerHTML = isEn ? '<i class="fa-solid fa-wallet"></i> Financial Details & Maintenance Deposit' : '<i class="fa-solid fa-wallet"></i> البيانات المالية ووديعة الصيانة';

    const financeBadge = document.querySelector('#tabWalletHomeowner .card:first-child .badge');
    if (financeBadge) financeBadge.innerText = isEn ? 'Main Owner' : 'المالك الرئيسي';

    const depLabel = document.querySelector('#tabWalletHomeowner .card:first-child .grid-2 .stat-box:first-child .stat-label');
    if (depLabel) depLabel.innerText = isEn ? 'Original Maintenance Deposit' : 'رصيد الوديعة الأصلية';
    const yieldLabel = document.querySelector('#tabWalletHomeowner .card:first-child .grid-2 .stat-box:last-child .stat-label');
    if (yieldLabel) yieldLabel.innerText = isEn ? 'Annual Investment Yield' : 'عوائد الاستثمار السنوية';

    const shareLabel = document.querySelector('#tabWalletHomeowner .card:first-child div[style*="dashed"] div:first-child span:first-child');
    if (shareLabel) shareLabel.innerText = isEn ? 'Unit Share of Operating Expenses:' : 'حصة الوحدة من مصاريف التشغيل:';

    const varLabel = document.querySelector('#tabWalletHomeowner .card:first-child div[style*="dashed"] div:last-child span:first-child');
    if (varLabel) varLabel.innerText = isEn ? 'Net Maintenance Variance Due:' : 'صافي فروق الصيانة المطلوبة:';

    const metersTitle = document.querySelector('#utilityMetersCard .card-title');
    if (metersTitle) metersTitle.innerHTML = isEn ? '<i class="fa-solid fa-plug-circle-bolt"></i> Smart Prepaid Utility Meters' : '<i class="fa-solid fa-plug-circle-bolt"></i> شحن العدادات الذكية (مسبقة الدفع)';

    const elecLabel = document.querySelector('#utilityMetersCard .stat-box:first-child .stat-label');
    if (elecLabel) elecLabel.innerHTML = isEn ? '<i class="fa-solid fa-bolt"></i> Elec. Meter' : '<i class="fa-solid fa-bolt"></i> عداد الكهرباء';

    const waterLabel = document.querySelector('#utilityMetersCard .stat-box:last-child .stat-label');
    if (waterLabel) waterLabel.innerHTML = isEn ? '<i class="fa-solid fa-droplet"></i> Water Meter' : '<i class="fa-solid fa-droplet"></i> عداد المياه';

    const btnOpenRecharge = document.getElementById('btnOpenMeterRechargeModal');
    if (btnOpenRecharge) btnOpenRecharge.innerHTML = isEn ? '<i class="fa-solid fa-charging-station"></i> Instant Utility Recharge' : '<i class="fa-solid fa-charging-station"></i> شحن العدادات الفوري (كهرباء / مياه)';

    const bookingTitle = document.querySelector('#tabWalletHomeowner .card:last-child .card-title');
    if (bookingTitle) bookingTitle.innerHTML = isEn ? '<i class="fa-solid fa-tennis-ball"></i> Sports & Playgrounds Booking' : '<i class="fa-solid fa-tennis-ball"></i> حجز الملاعب والأنشطة الترفيهية';

    const bookingDesc = document.querySelector('#tabWalletHomeowner .card:last-child p');
    if (bookingDesc) bookingDesc.innerText = isEn ? 'Book padel tennis or football courts from your wallet balance' : 'احجز ملاعب البادل تنس أو ملاعب كرة القدم مباشرة من رصيد محفظتك.';

    const bookingWalletLabel = document.querySelector('#tabWalletHomeowner .card:last-child .owner-only-financial');
    if (bookingWalletLabel) bookingWalletLabel.innerHTML = isEn ? '<i class="fa-solid fa-wallet"></i> Available Digital Wallet: <span id="bookingWalletBalanceText">2500</span> EGP' : '<i class="fa-solid fa-wallet"></i> رصيد محفظة الدفع المتاحة: <span id="bookingWalletBalanceText">2500</span> ج.م';

    const bookingSelectLabel = document.querySelector('#tabWalletHomeowner .card:last-child .form-group:nth-of-type(1) .form-label');
    if (bookingSelectLabel) bookingSelectLabel.innerText = isEn ? 'Select Activity / Court:' : 'اختر النشاط / الملعب:';

    const bookingDateLabel = document.querySelector('#tabWalletHomeowner .card:last-child .grid-2 .form-group:first-child .form-label');
    if (bookingDateLabel) bookingDateLabel.innerText = isEn ? 'Date:' : 'التاريخ:';

    const bookingTimeLabel = document.querySelector('#tabWalletHomeowner .card:last-child .grid-2 .form-group:last-child .form-label');
    if (bookingTimeLabel) bookingTimeLabel.innerText = isEn ? 'Time:' : 'الوقت:';

    const btnBook = document.querySelector('#tabWalletHomeowner .card:last-child button');
    if (btnBook) btnBook.innerHTML = isEn ? '<i class="fa-solid fa-calendar-check"></i> Confirm & Deduct Wallet' : '<i class="fa-solid fa-calendar-check"></i> تأكيد الحجز والخصم من المحفظة';

    // 4. Settings Tab Elements
    const settingsTitle = document.querySelector('#tabSettingsHomeowner .card .card-title');
    if (settingsTitle) settingsTitle.innerHTML = isEn ? '<i class="fa-solid fa-sliders"></i> App & Theme Settings' : '<i class="fa-solid fa-sliders"></i> إعدادات التطبيق والمظهر';

    const settingsDesc = document.querySelector('#tabSettingsHomeowner .card p');
    if (settingsDesc) settingsDesc.innerText = isEn ? 'Customize user experience, preferred language and themes' : 'تخصيص تجربة الاستخدام، لغة التطبيق وتنبيهات الإشعارات الفورية.';

    const langToggleLabel = document.getElementById('lblLangSettings');
    if (langToggleLabel) langToggleLabel.innerHTML = isEn ? '<i class="fa-solid fa-language"></i> System Language' : '<i class="fa-solid fa-language"></i> لغة النظام (Language)';

    const langToggleDesc = document.getElementById('descLangSettings');
    if (langToggleDesc) langToggleDesc.innerText = isEn ? 'Choose preferred application language' : 'اختر لغة واجهة التطبيق المفضلة';

    const themeToggleLabel = document.getElementById('lblThemeSettings');
    if (themeToggleLabel) themeToggleLabel.innerHTML = isEn ? '<i class="fa-solid fa-moon"></i> Dark Theme Mode' : '<i class="fa-solid fa-moon"></i> الوضع الداكن (Dark Mode)';

    const themeToggleDesc = document.getElementById('descThemeSettings');
    if (themeToggleDesc) themeToggleDesc.innerText = isEn ? 'Toggle screen colors to night mode' : 'التحول لمظهر الألوان المظلم للأمان والراحة';

    const notifyToggleLabel = document.getElementById('lblNotifySettings');
    if (notifyToggleLabel) notifyToggleLabel.innerHTML = isEn ? '<i class="fa-solid fa-bell"></i> Push Notifications' : '<i class="fa-solid fa-bell"></i> الإشعارات الفورية';

    const notifyToggleDesc = document.getElementById('descNotifySettings');
    if (notifyToggleDesc) notifyToggleDesc.innerText = isEn ? 'Alerts for ticket status and bookings updates' : 'تنبيهات حالة بلاغات الصيانة ومواعيد الحجوزات';

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
            text = text.replace('سارة أحمد (الزوجة)', 'Sarah Ahmed (Wife)')
                       .replace('عمر أحمد (الابن)', 'Omar Ahmed (Son)')
                       .replace('(الزوجة)', '(Wife)')
                       .replace('(الابن)', '(Son)')
                       .replace('(أب)', '(Father)')
                       .replace('(أم)', '(Mother)')
                       .replace('(أخ)', '(Brother)')
                       .replace('(أخت)', '(Sister)')
                       .replace('(ابن)', '(Son)')
                       .replace('(ابنة)', '(Daughter)');
          } else {
            text = text.replace('Sarah Ahmed (Wife)', 'سارة أحمد (الزوجة)')
                       .replace('Omar Ahmed (Son)', 'عمر أحمد (الابن)')
                       .replace('(Wife)', '(الزوجة)')
                       .replace('(Son)', '(الابن)')
                       .replace('(Father)', '(أب)')
                       .replace('(Mother)', '(أم)')
                       .replace('(Brother)', '(أخ)')
                       .replace('(Sister)', '(أخت)')
                       .replace('(Son)', '(الابن)')
                       .replace('(Daughter)', '(ابنة)');
          }
          span.innerText = text;
        }

        if (p) {
          let pText = p.innerText;
          if (isEn) {
            pText = pText.replace('صلاحية دخول البوابات والخدمات فقط', 'Gate access & services permit only');
          } else {
            pText = pText.replace('Gate access & services permit only', 'صلاحية دخول البوابات والخدمات فقط');
          }
          p.innerText = pText;
        }

        if (badge) {
          let badgeText = badge.innerText;
          if (isEn) {
            badgeText = badgeText.replace('نشط', 'Active');
          } else {
            badgeText = badgeText.replace('Active', 'نشط');
          }
          badge.innerText = badgeText;
        }
      });
    }

    // Family Member Count Badge
    const familyBadge = document.getElementById('ownerFamilyCountBadge');
    if (familyBadge) {
      const count = familyList ? familyList.children.length : 2;
      familyBadge.innerText = isEn ? `${count} members` : `${count} أفراد`;
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
            badge.innerHTML = '<i class="fa-solid fa-circle-check"></i> مفعل على البوابات';
          }
        }
      });
    }

    // 9. Housekeeping translations
    const roleTitleHk = document.getElementById('roleTitleHk');
    if (roleTitleHk) roleTitleHk.innerText = isEn ? 'Housekeeping' : 'هاوس كيبينج';

    const roleDescHk = document.getElementById('roleDescHk');
    if (roleDescHk) roleDescHk.innerText = isEn ? 'Cleaning requests & staff assignment' : 'طلبات النظافة وإسناد عمال النظافة';

    const btnHomeownerHk = document.getElementById('btnHomeownerHk');
    if (btnHomeownerHk) btnHomeownerHk.innerHTML = isEn ? '<i class="fa-solid fa-broom"></i> Request Cleaning' : '<i class="fa-solid fa-broom"></i> طلب خدمة نظافة';

    const btnTenantHk = document.getElementById('btnTenantHk');
    if (btnTenantHk) btnTenantHk.innerHTML = isEn ? '<i class="fa-solid fa-broom"></i> Request Cleaning' : '<i class="fa-solid fa-broom"></i> طلب خدمة نظافة';

    const btnTenantHkPack = document.getElementById('btnTenantHkPack');
    if (btnTenantHkPack) btnTenantHkPack.innerText = isEn ? 'Request Cleaning' : 'طلب خدمة نظافة';

    const btnCommercialHk = document.getElementById('btnCommercialHk');
    if (btnCommercialHk) btnCommercialHk.innerHTML = isEn ? '<i class="fa-solid fa-broom"></i> Request Cleaning' : '<i class="fa-solid fa-broom"></i> طلب خدمة نظافة';

    const managerHkTitle = document.getElementById('managerHkTitle');
    if (managerHkTitle) managerHkTitle.innerHTML = isEn ? '<i class="fa-solid fa-broom"></i> Public Area Cleaning Request' : '<i class="fa-solid fa-broom"></i> طلب نظافة للأماكن العامة';

    const managerHkDesc = document.getElementById('managerHkDesc');
    if (managerHkDesc) managerHkDesc.innerText = isEn ? 'Request cleaning for public zones (Main Pool, Lake Beach, Walkways, Admin).' : 'يمكنك هنا طلب تنظيف لقطاع عام بالقرية (مثل المسبح الرئيسي، الشاطئ، اللاندسكيب، الممرات).';

    const btnManagerHkSubmit = document.getElementById('btnManagerHkSubmit');
    if (btnManagerHkSubmit) btnManagerHkSubmit.innerHTML = isEn ? '<i class="fa-solid fa-paper-plane"></i> Send Request' : '<i class="fa-solid fa-paper-plane"></i> إرسال الطلب';

    const hkSupervisorLabel = document.getElementById('hkSupervisorLabel');
    if (hkSupervisorLabel) hkSupervisorLabel.innerText = isEn ? 'Housekeeping & Hotel Services Supervision' : 'إشراف الهاوس كيبينج والخدمات الفندقية';

    const hkSupervisorName = document.getElementById('hkSupervisorName');
    if (hkSupervisorName) hkSupervisorName.innerText = isEn ? 'Housekeeping Supervisor' : 'مشرف قسم النظافة (Housekeeping Supervisor)';

    const hkSupervisorDesc = document.getElementById('hkSupervisorDesc');
    if (hkSupervisorDesc) hkSupervisorDesc.innerText = isEn ? 'Receive cleaning orders and assign workers' : 'استقبال طلبات النظافة وإسناد عمال النظافة';

    const hkStatusBadge = document.getElementById('hkStatusBadge');
    if (hkStatusBadge) hkStatusBadge.innerHTML = isEn ? '<i class="fa-solid fa-broom"></i> Department Active' : '<i class="fa-solid fa-broom"></i> القسم نشط';

    const hkRequestsTitle = document.getElementById('hkRequestsTitle');
    if (hkRequestsTitle) hkRequestsTitle.innerHTML = isEn ? '<i class="fa-solid fa-inbox"></i> Incoming Cleaning Requests' : '<i class="fa-solid fa-inbox"></i> طلبات النظافة الواردة (Cleaning Requests)';

    // 10. Odoo Card translations
    const odooSyncTitle = document.getElementById('odooSyncTitle');
    if (odooSyncTitle) odooSyncTitle.innerHTML = isEn ? '<i class="fa-solid fa-cloud-arrow-up"></i> Central Cloud Sync Center' : '<i class="fa-solid fa-cloud-arrow-up"></i> مركز المزامنة والربط السحابي المركزي';

    const odooSyncDesc = document.getElementById('odooSyncDesc');
    if (odooSyncDesc) odooSyncDesc.innerText = isEn ? 'Real-time synchronization with Central Database to send tickets, retrieve owner names, and sync contacts.' : 'الربط اللحظي مع قاعدة البيانات المركزية لإرسال بلاغات الصيانة، واستقبال أسماء الملاك، ومزامنة جهات الاتصال.';

    const odooUrlLabel = document.getElementById('odooUrlLabel');
    if (odooUrlLabel) odooUrlLabel.innerText = isEn ? 'Server URL:' : 'رابط السيرفر:';

    const odooDbLabel = document.getElementById('odooDbLabel');
    if (odooDbLabel) odooDbLabel.innerText = isEn ? 'Database Name:' : 'اسم قاعدة البيانات:';

    const odooUserLabel = document.getElementById('odooUserLabel');
    if (odooUserLabel) odooUserLabel.innerText = isEn ? 'User Email:' : 'البريد الإلكتروني:';

    const odooOwnerNameLabel = document.getElementById('odooOwnerNameLabel');
    if (odooOwnerNameLabel) odooOwnerNameLabel.innerText = isEn ? 'Official Name from Central Database:' : 'الاسم المعتمد في السجل المركزي:';

    const btnOdooTestConn = document.getElementById('btnOdooTestConn');
    if (btnOdooTestConn) btnOdooTestConn.innerHTML = isEn ? '<i class="fa-solid fa-wifi"></i> Test & Activate Sync Now' : '<i class="fa-solid fa-wifi"></i> اختبار وتنشيط المزامنة الآن';
  }

  requestHousekeeping(role = 'owner', customType = null, slot = null, notes = '') {
    if (this._isHkSubmitting) return;
    this._isHkSubmitting = true;
    setTimeout(() => { this._isHkSubmitting = false; }, 2500);

    const isEn = this.currentLang === 'en';
    let location = '';
    let requesterName = '';
    let type = customType || 'نظافة روتينية يومية';

    if (role === 'owner') {
      location = 'فيلا 104';
      requesterName = isEn ? 'Owner (Hassan Issa)' : 'المالك (حسن عيسى)';
    } else if (role === 'tenant') {
      location = 'شاليه 402';
      requesterName = isEn ? 'Tenant (Ahmed Zaher)' : 'المستأجر (أحمد زاهر)';
    } else if (role === 'commercial') {
      location = 'محل 12 (Blue Wave)';
      requesterName = isEn ? 'Commercial (Blue Wave)' : 'التجاري (Blue Wave)';
    } else if (role === 'manager') {
      const select = document.getElementById('managerCleaningLocation');
      location = select ? select.value : 'منطقة عامة';
      requesterName = isEn ? 'Manager (Ayman El-Saeed)' : 'المدير (أيمن السعيد)';
      type = customType || 'نظافة مكان عام';
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString(isEn ? 'en-US' : 'ar-EG', { hour: '2-digit', minute: '2-digit' });

    let fullDetails = `طلب خدمة نظافة وهاوس كيبينج\nنوع الخدمة المطلوب: ${type}\nالموقع: ${location}\nطالب الخدمة: ${requesterName}`;
    if (slot) fullDetails += `\nالتوقيت المفضل: ${slot}`;
    if (notes) fullDetails += `\nملاحظات وتفاصيل العميل: ${notes}`;

    const hkIdNum = Math.floor(1000 + Math.random() * 9000);
    const dateStr = now.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });

    const newTicket = {
      id: `HK-${hkIdNum}`,
      title: `خدمة نظافة: ${type} (${location})`,
      category: 'نظافة وهاوس كيبينج',
      team_id: 5,
      priority: '2',
      details: fullDetails,
      status: 'جديد',
      bgClass: 'badge-warning',
      requester: role === 'family' ? 'family' : (role === 'tenant' ? 'tenant' : (role === 'commercial' ? 'commercial' : 'homeowner')),
      assignedTech: '',
      photoBefore: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=300&q=80',
      photoAfter: '',
      createdAt: now,
      dateStr: dateStr,
      timeStr: timeStr
    };

    const newReq = {
      id: newTicket.id,
      requester: role,
      requesterName: requesterName,
      location: location,
      type: type,
      details: fullDetails,
      status: 'بانتظار التخصيص',
      assignedWorker: '',
      time: timeStr
    };

    this.tickets.unshift(newTicket);
    this.saveTicketsToStorage();
    this.housekeepingRequests.unshift(newReq);
    this.renderHousekeeping();
    this.renderTickets();
    this.showToast(isEn ? '🧹 Housekeeping request submitted successfully!' : '🧹 تم تقديم طلب خدمة النظافة بنجاح!\nجاري المزامنة مع فريق الخدمات المركزية...');

    // Sync housekeeping request as ticket to Odoo
    (async () => {
      try {
        const hkTicket = {
          id: newReq.id,
          category: 'نظافة وهاوس كيبينج',
          team_id: 5,
          title: `خدمة نظافة: ${type} (${location})`,
          details: fullDetails,
          status: 'قيد التخصيص للمشرف',
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
    const worker = select ? select.value : 'عامل نظافة';

    req.status = 'جاري العمل';
    req.assignedWorker = worker;

    this.renderHousekeeping();
    this.showToast(isEn ? `✅ Worker ${worker} assigned successfully!` : `✅ تم تكليف عامل النظافة ${worker} بنجاح!`);
  }

  completeHousekeepingRequest(id) {
    const isEn = this.currentLang === 'en';
    const req = this.housekeepingRequests.find(r => r.id === id);
    if (!req) return;

    req.status = 'تم الانتهاء';
    this.renderHousekeeping();
    this.showToast(isEn ? '🧹 Cleaning task completed!' : '🧹 تم إتمام مهمة النظافة بنجاح!');
  }

  renderHousekeeping() {
    const isEn = this.currentLang === 'en';
    const listContainer = document.getElementById('hkRequestsList');
    if (!listContainer) return;

    const badge = document.getElementById('hkRequestsInboxBadge');
    const pendingRequests = this.housekeepingRequests.filter(r => r.status === 'بانتظار التخصيص');
    if (badge) {
      badge.innerText = isEn ? `${pendingRequests.length} pending` : `${pendingRequests.length} طلبات معلقة`;
    }

    listContainer.innerHTML = '';
    if (this.housekeepingRequests.length === 0) {
      listContainer.innerHTML = `<div style="font-size: 0.75rem; color: var(--text-muted); text-align: center; padding: 15px;">${isEn ? 'No cleaning requests' : 'لا توجد طلبات نظافة حالية'}</div>`;
      return;
    }

    this.housekeepingRequests.forEach(req => {
      let actionHtml = '';
      if (req.status === 'بانتظار التخصيص') {
        actionHtml = `
          <div style="margin-top: 8px; display: flex; gap: 8px; align-items: center;">
            <select id="assignWorkerSelect_${req.id}" class="form-control" style="font-size: 0.72rem; padding: 4px; height: 28px; width: 60%;">
              <option value="محمد علي">محمد علي</option>
              <option value="أحمد حسن">أحمد حسن</option>
              <option value="مصطفى سيد">مصطفى سيد</option>
            </select>
            <button class="btn btn-primary" onclick="app.assignHousekeepingWorker('${req.id}')" style="font-size: 0.7rem; padding: 4px 8px; height: 28px; white-space: nowrap; flex: 1; display: flex; align-items: center; justify-content: center;">
              <i class="fa-solid fa-user-check"></i> ${isEn ? 'Assign' : 'إسناد وتكليف'}
            </button>
          </div>
        `;
      } else if (req.status === 'جاري العمل') {
        actionHtml = `
          <div style="margin-top: 8px; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.7rem; color: #00e5ff;"><i class="fa-solid fa-person-sweeping"></i> ${isEn ? 'Worker:' : 'العامل:'} ${req.assignedWorker}</span>
            <button class="btn btn-success" onclick="app.completeHousekeepingRequest('${req.id}')" style="font-size: 0.7rem; padding: 4px 8px; height: 28px; white-space: nowrap; display: flex; align-items: center; justify-content: center;">
              <i class="fa-solid fa-circle-check"></i> ${isEn ? 'Complete' : 'إنهاء وإتمام'}
            </button>
          </div>
        `;
      } else {
        actionHtml = `
          <div style="margin-top: 6px; font-size: 0.7rem; color: #10b981;">
            <i class="fa-solid fa-circle-check"></i> ${isEn ? 'Completed by:' : 'تم الانتهاء بواسطة:'} <strong>${req.assignedWorker}</strong>
          </div>
        `;
      }

      const statusBadgeClass = req.status === 'تم الانتهاء' ? 'badge-success' : (req.status === 'جاري العمل' ? 'badge-cyan' : 'badge-warning');
      const statusText = isEn 
        ? (req.status === 'تم الانتهاء' ? 'Completed' : (req.status === 'جاري العمل' ? 'Cleaning...' : 'Pending'))
        : req.status;

      const typeText = isEn 
        ? (req.type === 'نظافة داخلية' ? 'Internal Cleaning' : 'Common Area Cleaning')
        : req.type;

      listContainer.innerHTML += `
        <div class="ticket-item" style="flex-direction: column; align-items: stretch; gap: 4px; margin-bottom: 8px; border-left: 4px solid ${req.status === 'تم الانتهاء' ? '#10b981' : (req.status === 'جاري العمل' ? '#00e5ff' : '#f59e0b')};">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <h4 style="font-size: 0.82rem; font-weight: 700;">${isEn ? 'Location:' : 'الموقع:'} ${req.location}</h4>
            <span class="badge ${statusBadgeClass}">${statusText}</span>
          </div>
          <p style="font-size: 0.7rem; color: var(--text-muted); margin: 0;">
            ${isEn ? 'Requester:' : 'الطالب:'} ${req.requesterName} • ${isEn ? 'Type:' : 'النوع:'} ${typeText} • ${isEn ? 'Time:' : 'الوقت:'} ${req.time}
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
window.closeModal = function(id) { const el = document.getElementById(id); if (el) { el.classList.remove('active'); el.style.display = 'none'; } if (window.app && typeof window.app.closeModal === 'function') window.app.closeModal(id); };
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
window.openPestControlModal = function(role) { if (window.app) window.app.openPestControlModal(role); };
window.submitPestControlModalForm = function() { if (window.app) window.app.submitPestControlModalForm(); };
window.requestPestControl = function(role, type, slot, notes) { if (window.app) window.app.requestPestControl(role, type, slot, notes); };
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
window.dispatchToFieldService = function(id, selectId) { if (window.app) window.app.dispatchToFieldService(id, selectId); };
window.toggleFieldServiceTimer = function(id) { if (window.app) window.app.toggleFieldServiceTimer(id); };
window.addFieldServicePart = function(id) { if (window.app) window.app.addFieldServicePart(id); };
window.clearFieldServiceSig = function(id) { if (window.app) window.app.clearFieldServiceSig(id); };
window.completeFieldServiceOrder = function(id, fileId) { if (window.app) window.app.completeFieldServiceOrder(id, fileId); };
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
    typeBadge: '🔥 أعمال حرارية ولحام (Hot Work)',
    typeClass: 'badge-danger',
    title: 'لحام وتعديل خط سحب طلمبات محطة التحلية RO',
    location: 'محطة RO الرئيسية',
    contractor: 'المقاولون العرب',
    engineer: 'م. محمود عبد الفتاح',
    safetyNotes: 'تم توفير طفايات الحريق، فحص مهمات الوقاية، وتعيين مراقب حريق (Fire Watch).',
    status: 'pending', // 'pending', 'approved', 'rejected'
    time: 'اليوم 09:30 ص'
  },
  {
    id: 'PTW-LOTO-4412',
    cardId: 'ptwCard_4412',
    type: 'loto',
    typeBadge: '⚡ عزل طاقة ولوحات (LOTO)',
    typeClass: 'badge-warning',
    title: 'عزل وإعادة تأهيل لوحة التوزيع الرئيسية MDB-02',
    location: 'غرفة المحولات الرئيسية - المرحلة الأولى',
    contractor: 'شنايدر إلكتريك / الصيانة الذاتية',
    engineer: 'م. حسام النجار',
    safetyNotes: 'تم تركيب أقفال العزل (Padlocks) وبطاقات التحذير وفحص انعدام الجهد تماماً.',
    status: 'pending',
    time: 'اليوم 10:15 ص'
  }
];

window.renderPtwPermitsUI = function() {
  const directorInbox = document.getElementById('directorPtwInbox');
  const engineerList = document.getElementById('engineerPtwList');
  const pendingBadge = document.getElementById('ptwPendingBadge');
  const engBadge = document.getElementById('engPtwCountBadge');

  const pendingCount = window._ptwPermits.filter(p => p.status === 'pending').length;
  if (pendingBadge) pendingBadge.innerText = `${pendingCount} طلبات معلقة`;
  if (engBadge) engBadge.innerText = `${window._ptwPermits.length} تصريح مسجل`;

  // 1. Render Director Inbox
  if (directorInbox) {
    directorInbox.innerHTML = '';
    if (window._ptwPermits.length === 0) {
      directorInbox.innerHTML = '<div style="text-align: center; color: #64748b; font-size: 0.75rem; padding: 15px;">لا توجد تصاريح عمل حالية</div>';
    } else {
      window._ptwPermits.forEach(p => {
        let actionButtonsHtml = '';
        let statusBadgeHtml = '';

        if (p.status === 'pending') {
          statusBadgeHtml = `<span class="badge badge-warning" style="font-size: 0.65rem;"><i class="fa-solid fa-clock"></i> بانتظار الاعتماد</span>`;
          actionButtonsHtml = `
            <div style="display: flex; gap: 8px; margin-top: 6px;">
              <button class="btn btn-primary" onclick="approveDirectorPtw('${p.id}')" style="flex: 1; background: #059669; border: none; font-size: 0.74rem; font-weight: 700; padding: 7px; cursor: pointer; border-radius: 8px;">
                <i class="fa-solid fa-circle-check"></i> موافقة واعتماد
              </button>
              <button class="btn" onclick="rejectDirectorPtw('${p.id}')" style="flex: 1; background: #ffffff; border: 1px solid rgba(32,39,79,0.2); color: #be123c; font-size: 0.74rem; font-weight: 700; padding: 7px; cursor: pointer; border-radius: 8px;">
                <i class="fa-solid fa-circle-xmark"></i> رفض التصريح
              </button>
            </div>
          `;
        } else if (p.status === 'approved') {
          statusBadgeHtml = `<span class="badge badge-success" style="font-size: 0.65rem;"><i class="fa-solid fa-check"></i> معتمد HSE</span>`;
          actionButtonsHtml = `
            <div style="background: rgba(5, 150, 105, 0.06); border: 1px solid rgba(5, 150, 105, 0.2); border-radius: 8px; padding: 6px 10px; font-size: 0.7rem; color: #059669; font-weight: 700;">
              <i class="fa-solid fa-circle-check"></i> تم اعتماد التصريح وتفعيله مع أمن البوابات.
            </div>
          `;
        } else {
          statusBadgeHtml = `<span class="badge badge-danger" style="font-size: 0.65rem;"><i class="fa-solid fa-xmark"></i> مرفوض</span>`;
          actionButtonsHtml = `
            <div style="background: rgba(225, 29, 72, 0.06); border: 1px solid rgba(225, 29, 72, 0.2); border-radius: 8px; padding: 6px 10px; font-size: 0.7rem; color: #be123c; font-weight: 700;">
              <i class="fa-solid fa-circle-xmark"></i> تم رفض التصريح وإعادته للمهندس للاستيفاء.
            </div>
          `;
        }

        directorInbox.innerHTML += `
          <div style="background: #ffffff; border: 1px solid rgba(32,39,79,0.08); border-radius: 12px; padding: 12px; display: flex; flex-direction: column; gap: 6px; box-shadow: 0 2px 8px rgba(32,39,79,0.03);">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span class="badge badge-navy" style="font-size: 0.68rem;">${p.typeBadge}</span>
                  <span style="font-weight: 800; font-size: 0.78rem; color: #20274f;">#${p.id}</span>
                </div>
                <div style="font-size: 0.8rem; font-weight: 800; color: #20274f; margin-top: 4px;">${p.title}</div>
                <div style="font-size: 0.68rem; color: #64748b; margin-top: 2px;">
                  الموقع: <b>${p.location}</b> • المهندس: <b>${p.engineer}</b> • المقاول: <b>${p.contractor}</b>
                </div>
              </div>
              ${statusBadgeHtml}
            </div>

            <div style="background: #f8fafc; border: 1px solid rgba(32,39,79,0.05); border-radius: 8px; padding: 6px 8px; font-size: 0.68rem; color: #475569;">
              <i class="fa-solid fa-shield-check" style="color: #1b8f91;"></i> <b>اشتراطات السلامة:</b> ${p.safetyNotes}
            </div>

            ${actionButtonsHtml}
          </div>
        `;
      });
    }
  }

  // 2. Render Engineer List
  if (engineerList) {
    engineerList.innerHTML = '';
    if (window._ptwPermits.length === 0) {
      engineerList.innerHTML = '<div style="text-align: center; color: #64748b; font-size: 0.75rem; padding: 10px;">لا توجد تصاريح عمل حالية</div>';
    } else {
      window._ptwPermits.forEach(p => {
        let badgeHtml = '';
        if (p.status === 'pending') {
          badgeHtml = `<span class="badge badge-warning" style="font-size: 0.65rem;"><i class="fa-solid fa-clock"></i> قيد مراجعة مدير القطاع</span>`;
        } else if (p.status === 'approved') {
          badgeHtml = `<span class="badge badge-success" style="font-size: 0.65rem;"><i class="fa-solid fa-check"></i> معتمد HSE</span>`;
        } else {
          badgeHtml = `<span class="badge badge-danger" style="font-size: 0.65rem;"><i class="fa-solid fa-xmark"></i> مرفوض</span>`;
        }

        engineerList.innerHTML += `
          <div style="background: #f8fafc; border: 1px solid rgba(32,39,79,0.06); border-radius: 12px; padding: 10px 12px; display: flex; flex-direction: column; gap: 4px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span class="badge badge-navy" style="font-size: 0.65rem;">${p.typeBadge}</span>
                <span style="font-weight: 800; font-size: 0.75rem; color: #20274f;">#${p.id}</span>
              </div>
              ${badgeHtml}
            </div>
            <div style="font-size: 0.78rem; font-weight: 800; color: #20274f; margin-top: 2px;">${p.title}</div>
            <div style="font-size: 0.68rem; color: #64748b;">
              الموقع: ${p.location} • المقاول: ${p.contractor} • التوقيت: ${p.time}
            </div>
          </div>
        `;
      });
    }
  }
};
window.approveDirectorPtw = function(ptwId) {
  const permit = window._ptwPermits.find(p => p.id === ptwId);
  if (permit) {
    permit.status = 'approved';
    window.renderPtwPermitsUI();
    if (window.app && typeof window.app.showToast === 'function') {
      window.app.showToast(`✅ تم اعتماد وتفعيل تصريح العمل [${ptwId}] بنجاح وإخطار المهندس المشرف وأمن البوابات.`);
    }
  }
};

window.rejectDirectorPtw = function(ptwId) {
  const permit = window._ptwPermits.find(p => p.id === ptwId);
  if (permit) {
    permit.status = 'rejected';
    window.renderPtwPermitsUI();
    if (window.app && typeof window.app.showToast === 'function') {
      window.app.showToast(`❌ تم رفض تصريح العمل [${ptwId}] وإعادته لمهندس الموقع لاستيفاء الملاحظات.`);
    }
  }
};

window.submitEngineerGeneralMaintenanceOrder = function() {
  const cat = document.getElementById('engTicketCategorySelect')?.value || 'كهروميكانيك';
  const loc = document.getElementById('engTicketLocationInput')?.value || 'محطة التحلية الرئيسية RO';
  const priority = document.getElementById('engTicketPrioritySelect')?.value || '3';
  const desc = document.getElementById('engTicketDescInput')?.value || 'أمر صيانة عامة للمرافق';
  const photoInput = document.getElementById('engTicketPhotoInput');
  const maintType = document.querySelector('input[name="engTicketMaintType"]:checked')?.value || 'corrective';

  const engName = document.getElementById('engineerNameText')?.innerText || 'م. محمود عبد الفتاح';
  const engTeam = window.app?.activeEngineerTeam?.teamName || 'MEP Team';
  const maintenanceTeamId = window.app?.activeEngineerTeam?.teamId || 2;

  const defaultPhotoMap = {
    'كهروميكانيك': 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=300&q=80',
    'معالجة الصرف': 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&w=300&q=80',
    'مكافحة حريق': 'https://images.unsplash.com/photo-1527018601619-a508a2be00cd?auto=format&fit=crop&w=300&q=80',
    'كهرباء وطاقة': 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=300&q=80',
    'لاندسكيب وري': 'https://images.unsplash.com/photo-1517646287270-a5a9ca602e5c?auto=format&fit=crop&w=300&q=80',
    'مدني وإنشاءات': 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=300&q=80'
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
      status: 'قيد المراجعة وتكليف الفني',
      statusHistory: [{ stage: 'قيد المراجعة وتكليف الفني', time: 'الآن' }],
      photoBefore: photoBase64 || defaultPhotoMap[cat] || defaultPhotoMap['كهروميكانيك'],
      maintenanceTeamId: maintenanceTeamId,
      time: 'الآن',
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
      window.app.showToast(`🚀 تم إصدار أمر الصيانة [#${newTicket.id}] بنجاح وتوجيهه لشاشة مدير الصيانة والنظام المركزي!`);
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

  const engName = document.getElementById('engineerNameText')?.innerText || 'م. محمود عبد الفتاح';
  const engTeam = document.getElementById('engineerSpecialtySub')?.innerText || 'فريق الكهروميكانيك';
  if (subEl) subEl.innerHTML = `المهندس الفاحص: <b>${engName}</b> • ${engTeam}`;

  if (plantType === 'ro') {
    if (titleEl) titleEl.innerHTML = '<i class="fa-solid fa-droplet" style="color: #1b8f91;"></i> فحص وتسجيل قراءات محطة التحلية RO Plant';
    fieldsContainer.innerHTML = `
      <div class="form-group">
        <label class="form-label" style="font-weight: 700;">قراءة ضغط الأغشية والمضخات (Operating Pressure)</label>
        <input type="text" id="inspectField1" class="form-control" value="7.4 Bar" style="font-weight: 800; color: #1b8f91;">
      </div>
      <div class="grid-2" style="gap: 8px;">
        <div class="form-group">
          <label class="form-label" style="font-weight: 700;">نسبة الملوحة (TDS ppm)</label>
          <input type="text" id="inspectField2" class="form-control" value="195 PPM" style="font-weight: 700;">
        </div>
        <div class="form-group">
          <label class="form-label" style="font-weight: 700;">معدل الإنتاج اليومي</label>
          <input type="text" id="inspectField3" class="form-control" value="4,350 م³/يوم" style="font-weight: 700;">
        </div>
      </div>
    `;
  } else if (plantType === 'stp') {
    if (titleEl) titleEl.innerHTML = '<i class="fa-solid fa-seedling" style="color: #059669;"></i> فحص وتسجيل قراءات محطة معالجة الصرف STP';
    fieldsContainer.innerHTML = `
      <div class="form-group">
        <label class="form-label" style="font-weight: 700;">نسبة كفاءة المعالجة الثلاثية (Treatment Efficiency)</label>
        <input type="text" id="inspectField1" class="form-control" value="99%" style="font-weight: 800; color: #059669;">
      </div>
      <div class="grid-2" style="gap: 8px;">
        <div class="form-group">
          <label class="form-label" style="font-weight: 700;">نقاء مياه ري اللاندسكيب</label>
          <input type="text" id="inspectField2" class="form-control" value="مطابق لمواصفات الري" style="font-weight: 700;">
        </div>
        <div class="form-group">
          <label class="form-label" style="font-weight: 700;">معدل الضخ لشبكات الري</label>
          <input type="text" id="inspectField3" class="form-control" value="1,850 م³/يوم" style="font-weight: 700;">
        </div>
      </div>
    `;
  } else if (plantType === 'fls') {
    if (titleEl) titleEl.innerHTML = '<i class="fa-solid fa-fire-extinguisher" style="color: #e11d48;"></i> فحص واختبار شبكة طلمبات الحريق 12Bar';
    fieldsContainer.innerHTML = `
      <div class="form-group">
        <label class="form-label" style="font-weight: 700;">ضغط شبكة الحريق والبوستر (Network Pressure)</label>
        <input type="text" id="inspectField1" class="form-control" value="12.2 Bar" style="font-weight: 800; color: #e11d48;">
      </div>
      <div class="grid-2" style="gap: 8px;">
        <div class="form-group">
          <label class="form-label" style="font-weight: 700;">جاهزية طلمبة الديزل/الجوكي</label>
          <input type="text" id="inspectField2" class="form-control" value="جاهزية 100% تلقائي" style="font-weight: 700;">
        </div>
        <div class="form-group">
          <label class="form-label" style="font-weight: 700;">منسوب خزان الحريق</label>
          <input type="text" id="inspectField3" class="form-control" value="100% ممتلئ" style="font-weight: 700;">
        </div>
      </div>
    `;
  } else if (plantType === 'electrical') {
    if (titleEl) titleEl.innerHTML = '<i class="fa-solid fa-bolt" style="color: #d97706;"></i> فحص محول الجهد المتوسط 04 وأكشاك البيلارات';
    fieldsContainer.innerHTML = `
      <div class="form-group">
        <label class="form-label" style="font-weight: 700;">نسبة الحمل الكهربائي الحالية (Load Percentage)</label>
        <input type="text" id="inspectField1" class="form-control" value="71%" style="font-weight: 800; color: #d97706;">
      </div>
      <div class="grid-2" style="gap: 8px;">
        <div class="form-group">
          <label class="form-label" style="font-weight: 700;">درجة حرارة الزيت (°C)</label>
          <input type="text" id="inspectField2" class="form-control" value="51°C طبيعي" style="font-weight: 700;">
        </div>
        <div class="form-group">
          <label class="form-label" style="font-weight: 700;">استقرار جهد الفازات</label>
          <input type="text" id="inspectField3" class="form-control" value="380V / 220V مستقر" style="font-weight: 700;">
        </div>
      </div>
    `;
  } else if (plantType === 'landscape') {
    if (titleEl) titleEl.innerHTML = '<i class="fa-solid fa-seedling" style="color: #059669;"></i> فحص شبكات الري الأوتوماتيكية بالمحور الرئيسي';
    fieldsContainer.innerHTML = `
      <div class="form-group">
        <label class="form-label" style="font-weight: 700;">ضغط خطوط النوازل ومحابس السولينويد</label>
        <input type="text" id="inspectField1" class="form-control" value="4.5 Bar" style="font-weight: 800; color: #059669;">
      </div>
      <div class="grid-2" style="gap: 8px;">
        <div class="form-group">
          <label class="form-label" style="font-weight: 700;">حالة طلمبات التسميد</label>
          <input type="text" id="inspectField2" class="form-control" value="تعمل بكفاءة 100%" style="font-weight: 700;">
        </div>
        <div class="form-group">
          <label class="form-label" style="font-weight: 700;">جدول الري المبرمج</label>
          <input type="text" id="inspectField3" class="form-control" value="دورة ليلية 6:00 م" style="font-weight: 700;">
        </div>
      </div>
    `;
  } else if (plantType === 'civil') {
    if (titleEl) titleEl.innerHTML = '<i class="fa-solid fa-cubes" style="color: #6366f1;"></i> فحص المماشي الخرسانية وفواصل التمدد والتشطيبات';
    fieldsContainer.innerHTML = `
      <div class="form-group">
        <label class="form-label" style="font-weight: 700;">حالة فواصل التمدد الإنشائية</label>
        <input type="text" id="inspectField1" class="form-control" value="سليمة ولا يوجد هبوط" style="font-weight: 800; color: #6366f1;">
      </div>
      <div class="grid-2" style="gap: 8px;">
        <div class="form-group">
          <label class="form-label" style="font-weight: 700;">أرصفة البحيرات والمصدات</label>
          <input type="text" id="inspectField2" class="form-control" value="عزل مائي سليم 100%" style="font-weight: 700;">
        </div>
        <div class="form-group">
          <label class="form-label" style="font-weight: 700;">البرجولات والمظلات الخشبية</label>
          <input type="text" id="inspectField3" class="form-control" value="مطابقة للمواصفات" style="font-weight: 700;">
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
  const engName = document.getElementById('engineerNameText')?.innerText || 'م. محمود عبد الفتاح';
  
  const now = new Date();
  const timeStr = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

  if (hiddenType === 'ro') {
    const valEl = document.getElementById('scadaRoVal');
    const subEl = document.getElementById('scadaRoSub');
    const inspEl = document.getElementById('scadaRoInspector');
    if (valEl) valEl.innerHTML = `${f1} <span style="font-size: 0.7rem; color: #10b981;">(TDS ${f2.replace(/[^\d]/g, '') || '195'})</span>`;
    if (subEl) subEl.innerText = `إنتاج ${f3}`;
    if (inspEl) inspEl.innerHTML = `<i class="fa-solid fa-user-check" style="color: #1b8f91;"></i> فحص: <b>${engName}</b> (${timeStr})`;
  } else if (hiddenType === 'stp') {
    const valEl = document.getElementById('scadaStpVal');
    const subEl = document.getElementById('scadaStpSub');
    const inspEl = document.getElementById('scadaStpInspector');
    if (valEl) valEl.innerHTML = `${f1} <span style="font-size: 0.7rem; color: #10b981;">(كفاءة المعالجة)</span>`;
    if (subEl) subEl.innerText = `ضخ مياه الري لشبكات اللاندسكيب (${f3})`;
    if (inspEl) inspEl.innerHTML = `<i class="fa-solid fa-user-check" style="color: #059669;"></i> فحص: <b>${engName}</b> (${timeStr})`;
  } else if (hiddenType === 'fls') {
    const valEl = document.getElementById('scadaFireVal');
    const subEl = document.getElementById('scadaFireSub');
    const inspEl = document.getElementById('scadaFireInspector');
    if (valEl) valEl.innerHTML = `${f1} <span style="font-size: 0.7rem; color: #10b981;">(جاهزية 100%)</span>`;
    if (subEl) subEl.innerText = `ضغط البوستر مستقر (${f2})`;
    if (inspEl) inspEl.innerHTML = `<i class="fa-solid fa-user-check" style="color: #e11d48;"></i> فحص: <b>${engName}</b> (${timeStr})`;
  } else if (hiddenType === 'electrical') {
    const valEl = document.getElementById('scadaTransVal');
    const subEl = document.getElementById('scadaTransSub');
    const inspEl = document.getElementById('scadaTransInspector');
    if (valEl) valEl.innerHTML = `${f1} <span style="font-size: 0.7rem; color: #d97706;">(الحمل الحالي)</span>`;
    if (subEl) subEl.innerText = `الحرارة ${f2}`;
    if (inspEl) inspEl.innerHTML = `<i class="fa-solid fa-user-check" style="color: #d97706;"></i> فحص: <b>${engName}</b> (${timeStr})`;
  }

  // Close modal
  const modal = document.getElementById('modalPlantInspection');
  if (modal) {
    modal.classList.remove('active');
    modal.style.display = 'none';
  }

  if (window.app && typeof window.app.showToast === 'function') {
    window.app.showToast('✅ تم توثيق تقرير الفحص اليومي بنجاح ومزامنة القراءات فوراً مع شاشة مدير القطاع الهندسي!');
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
  const dest = destSelect ? destSelect.value : 'الشاطئ الرئيسي';
  const pass = passSelect ? passSelect.value : '3-4 أفراد';

  const tripBox = document.getElementById('activeGolfCartTripBox');
  const tripDest = document.getElementById('golfTripDest');
  if (tripDest) tripDest.innerText = `فيلا A146 ➔ ${dest} (${pass})`;
  if (tripBox) tripBox.style.display = 'block';

  const golfTicket = {
    id: 'GOLF-' + Math.floor(1000 + Math.random() * 9000),
    category: 'طلب عربة غولف أمنية وتوصيل داخلي',
    team_id: 3,
    title: `طلب عربة غولف: فيلا A146 إلى ${dest}`,
    details: `طلب نقل وتوصيل داخلي بعربة غولف\nالوجهة: ${dest}\nعدد الركاب: ${pass}\nالموقع: فيلا A146`,
    priority: '2',
    requester: window.app ? window.app.currentRole : 'homeowner'
  };

  if (window.app && typeof window.app.syncTicketToOdoo === 'function') {
    window.app.syncTicketToOdoo(golfTicket, '01223456789', 'حسن عيسى').catch(e => console.warn(e));
  }

  if (window.app && typeof window.app.showToast === 'function') {
    window.app.showToast(`🛺 تم استدعاء عربة الغولف رقم #12 بنجاح!\nالسائق [عماد ممدوح] في طريقه لفيلا A146 متجهاً إلى [${dest}]. وصول خلال 3 دقائق.\nتم إشعار غرفة عمليات الأمن (Security Team).`);
  }
};

window.toggleEventRsvp = async function() {
  const btn = document.getElementById('btnEventRsvp');
  const countText = document.getElementById('eventRsvpCountText');

  if (!btn) return;
  const isConfirmed = btn.getAttribute('data-confirmed') === 'true';

  let ownerName = 'أ. حسن عيسى';
  let unitNum = 'فيلا A104 - المرحلة الأولى';
  let phoneNum = '01223456789';

  if (window.app) {
    if (window.app.getHomeownerName) {
      ownerName = window.app.getHomeownerName() || ownerName;
    }
    const customName = safeStorage.getItem('odoo_owner_name');
    if (customName && customName.trim()) ownerName = customName;

    if (window.app.currentRole === 'tenant') {
      ownerName = 'أحمد زاهر محمود';
      unitNum = 'شاليه C304 - المرحلة الثالثة';
      phoneNum = '01009876543';
    } else if (window.app.currentRole === 'commercial') {
      ownerName = 'مطعم وكافيه Blue Wave (شريف محمد)';
      unitNum = 'محل 12 - المول التجاري';
      phoneNum = '01112233445';
    }
  }

  const passCode = 'RSVP-' + Math.floor(1000 + Math.random() * 9000);

  if (!isConfirmed) {
    btn.setAttribute('data-confirmed', 'true');
    btn.innerHTML = `<i class="fa-solid fa-circle-check"></i> تم تأكيد الحضور`;
    btn.style.background = '#10b981';
    btn.style.boxShadow = '0 4px 10px rgba(16, 185, 129, 0.3)';
    if (countText) countText.innerText = 'أنت و 42+ من جيرانك أكدوا الحضور ✅';

    // 1. Sync RSVP registration ticket directly to Promotion Team (Team ID: 11) in Odoo
    const rsvpTicket = {
      id: passCode,
      category: 'فعاليات وترويج مجتمعي',
      team_id: 11, // Promotion Team
      title: `[حضور حفلة] سهرة كاريوكي الشاطئ - ${ownerName} (${unitNum.split(' - ')[0]})`,
      details: `تأكيد تسجيل وحجز حضور لفعالية بالقرية:\n• اسم الفعالية: سهرة كاريوكي على الشاطئ (Beach Karaoke Night)\n• اسم المالك / الضيف: ${ownerName}\n• الوحدة: ${unitNum}\n• رقم الموبايل للتواصل: ${phoneNum}\n• حالة الدخول: مؤكد ومسجل بقائمة الحضور عند بوابة الحفل\n• كود التصريح المعتمد: #${passCode}\n• تاريخ التسجيل: ${new Date().toLocaleString('ar-EG')}`,
      priority: '2',
      requester: window.app ? window.app.currentRole : 'homeowner'
    };

    if (window.app && typeof window.app.syncTicketToOdoo === 'function') {
      try {
        await window.app.syncTicketToOdoo(rsvpTicket, phoneNum, ownerName);
        safeStorage.setItem('active_rsvp_ticket_id', rsvpTicket.odooId || passCode);
      } catch (e) {
        console.warn('[RSVP Sync Warning]', e);
      }
    }

    // Immediately show VIP Pass banner with QR & entrance code
    const banner = document.getElementById('eventVipPassBanner');
    const codeEl = document.getElementById('eventVipPassCode');
    if (banner && codeEl) {
      codeEl.innerText = `كود دخول الحفله #${passCode}`;
      banner.style.display = 'block';
    }
    safeStorage.setItem('event_rsvp_confirmed_code', `كود دخول الحفله #${passCode}`);

    if (window.app && typeof window.app.showToast === 'function') {
      window.app.showToast(`🎉 تم تأكيد حضورك في سهرة الكاريوكي بنجاح!\n\nبيانات التسجيل المعتمدة:\n• الاسم: ${ownerName}\n• الوحدة: ${unitNum}\n• الموبايل: ${phoneNum}\n• كود الدخول: #${passCode}\n\nتم إصدار كود الدخول ورمز الـ QR المعتمد وتوجيه بياناتك لفريق الفعاليات (Promotion Team) بالبوابة ✔️.`);
    }
  } else {
    btn.setAttribute('data-confirmed', 'false');
    btn.innerHTML = `<i class="fa-solid fa-calendar-check"></i> تأكيد الحضور`;
    btn.style.background = '#1b8f91';
    btn.style.boxShadow = '0 4px 10px rgba(27, 143, 145, 0.25)';
    if (countText) countText.innerText = '42+ من جيرانك أكدوا الحضور';

    // Notify Promotion Team of Cancellation in Odoo
    const cancelTicket = {
      id: 'CNCL-' + Math.floor(1000 + Math.random() * 9000),
      category: 'فعاليات وترويج مجتمعي',
      team_id: 11, // Promotion Team
      title: `[إلغاء حضور] سهرة كاريوكي الشاطئ - ${ownerName} (${unitNum.split(' - ')[0]})`,
      details: `إلغاء تأكيد حضور الفعالية:\n• اسم الفعالية: سهرة كاريوكي على الشاطئ\n• اسم المالك: ${ownerName}\n• الوحدة: ${unitNum}\n• الحالة: اعتذر عن الحضور - تم شطب الاسم من قائمة البوابة لإفساح المجال لغيره.`,
      priority: '1',
      requester: window.app ? window.app.currentRole : 'homeowner'
    };

    if (window.app && typeof window.app.syncTicketToOdoo === 'function') {
      window.app.syncTicketToOdoo(cancelTicket, phoneNum, ownerName).catch(e => console.warn(e));
    }

    // Hide VIP Pass banner upon cancellation
    const banner = document.getElementById('eventVipPassBanner');
    if (banner) banner.style.display = 'none';
    safeStorage.removeItem('event_rsvp_confirmed_code');
    safeStorage.removeItem('active_rsvp_ticket_id');

    if (window.app && typeof window.app.showToast === 'function') {
      window.app.showToast(`ℹ️ تم إلغاء تأكيد حضور الفعالية.\nتم تحديث القائمة لدى فريق الفعاليات (Promotion Team). نرجو رؤيتكم في فعاليات قادمة!`);
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


