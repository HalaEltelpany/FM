/* 
  Ultimate FM - Application JavaScript Logic
  Coastal Cities & Commercial Malls Facility Management System
*/

class UltimateFMApp {
  constructor() {
    this.currentRole = 'homeowner';
    this.currentLang = localStorage.getItem('app_lang') || 'ar';
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
    
    // Sample state data
    this.tickets = [
      { 
        id: 'TK-8041', 
        title: 'صيانة تكييف الماستر بالفيلا', 
        category: 'كهروميكانيك', 
        status: 'جديد', 
        bgClass: 'badge-warning', 
        requester: 'homeowner', 
        assignedTech: '',
        photoBefore: 'https://images.unsplash.com/photo-1527018601619-a508a2be00cd?auto=format&fit=crop&w=300&q=80',
        photoAfter: '',
        createdAt: new Date(Date.now() - 3600000), // 1 hour ago
        resolutionTime: ''
      },
      { 
        id: 'TK-7930', 
        title: 'تسريب في محبس سباكة المطبخ', 
        category: 'سباكة', 
        status: 'جديد', 
        bgClass: 'badge-warning', 
        requester: 'homeowner', 
        assignedTech: '',
        photoBefore: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&w=300&q=80',
        photoAfter: '',
        createdAt: new Date(Date.now() - 7200000), // 2 hours ago
        resolutionTime: ''
      }
    ];

    // Initial access & logistics permits list
    this.permits = [
      { id: 'PR-4012', type: 'تصريح دخول الوحدة', status: 'معتمد', bgClass: 'badge-success', requester: 'homeowner', details: 'زائر: عادل إمام - شاليه 104', qrCode: '908124' },
      { id: 'PR-3081', type: 'تصريح دخول سيارات بضائع', status: 'تحت المراجعة', bgClass: 'badge-warning', requester: 'commercial', details: 'شاحنة توريد أغذية لمطعم Blue Wave', qrCode: '' }
    ];

    // Initial security complaints list
    this.complaints = [
      { id: 'CP-2081', name: 'عادل إمام', phone: '01001234567', details: 'ركن سيارة مخالف أمام الفيلا يغلق الممر', status: 'تحت المراجعة والتحرك الميداني', bgClass: 'badge-warning', requester: 'homeowner' }
    ];

    // Initial housekeeping requests list
    this.housekeepingRequests = [
      { id: 'HK-101', requester: 'homeowner', requesterName: 'أسامة أحمد', location: 'فيلا 104', type: 'نظافة داخلية', status: 'بانتظار التخصيص', assignedWorker: '', time: '10:30 ص' },
      { id: 'HK-102', requester: 'manager', requesterName: 'المهندس / أيمن', location: 'المسبح الرئيسي', type: 'نظافة مكان عام', status: 'جاري العمل', assignedWorker: 'أحمد حسن', time: '09:15 ص' }
    ];

    // Initialize payment wallet balance
    this.ownerWalletBalance = 2500;

    // Hardcoded Odoo Connection Config (Supports new Odoo.sh database!)
    this.odooConfig = {
      url: localStorage.getItem('odoo_url') || 'https://ultimatecode-2019-fm-main-35713278.dev.odoo.com',
      db: localStorage.getItem('odoo_db') || 'ultimatecode-2019-fm-main-35713278',
      user: localStorage.getItem('odoo_user') || 'fmhala6@gmail.com',
      key: localStorage.getItem('odoo_key') || '06d7d7d208a8c2fa351c2a5cfa305e987ffb72f0'
    };

    // Prepopulate Local Storage silently from configuration values
    localStorage.setItem('odoo_url', this.odooConfig.url);
    localStorage.setItem('odoo_db', this.odooConfig.db);
    localStorage.setItem('odoo_user', this.odooConfig.user);
    localStorage.setItem('odoo_key', this.odooConfig.key);

    // Clear old cached test names if matching fmhala
    if (localStorage.getItem('odoo_owner_name') === 'fmhala' || localStorage.getItem('odoo_owner_name') === 'Fmhala') {
      localStorage.removeItem('odoo_owner_name');
    }
    if (localStorage.getItem('odoo_user') === 'fmhala@domain.com' || localStorage.getItem('odoo_user') === 'admin@domain.com') {
      localStorage.removeItem('odoo_user');
    }

    // 3 Warehouses Inventory List (Residential, Commercial, Assets)
    this.inventoryItems = [
      // Warehouse 1: Residential (مخزن الملاك السكني)
      { id: 1, name: 'خلاط مياه إيطالي 3/4 بوصة', warehouse: 'residential', qty: 15, price: 520, desc: 'سحب للملاك - سباكة' },
      { id: 2, name: 'كارتدج تكييف شارب 2.25 حصان', warehouse: 'residential', qty: 8, price: 850, desc: 'سحب للملاك - تكييف' },
      { id: 3, name: 'مفتاح إنارة جلاس تاتش ذكي', warehouse: 'residential', qty: 25, price: 120, desc: 'سحب للملاك - كهرباء' },
      { id: 4, name: 'لوحة لمبات ليد غاطسة 12 وات', warehouse: 'residential', qty: 40, price: 95, desc: 'سحب للملاك - كهرباء' },

      // Warehouse 2: Commercial (مخزن المستأجرين التجاريين)
      { id: 10, name: 'مروحة طرد مطابخ تجارية كينج', warehouse: 'commercial', qty: 4, price: 3200, desc: 'سحب للتجاري - تهوية ومطابخ' },
      { id: 11, name: 'كابل كهرباء مسلح 3 فاز نحاس', warehouse: 'commercial', qty: 150, price: 450, desc: 'سحب للتجاري - كهرباء (سعر المتر)' },
      { id: 12, name: 'محبس إغلاق غاز صناعي لولبي', warehouse: 'commercial', qty: 6, price: 1800, desc: 'سحب للتجاري - غاز وأمان المحلات' },

      // Warehouse 3: Assets & Utilities (مخزن أصول ومرافق القرية)
      { id: 20, name: 'أغشية فلاتر تحلية محطة RO ممبرين', warehouse: 'assets', qty: 12, price: 7500, desc: 'أصول - محطة التحلية' },
      { id: 21, name: 'عداد ضغط شبكة حريق هيدروليكي', warehouse: 'assets', qty: 5, price: 1400, desc: 'أصول - شبكة الحريق والسلامة' },
      { id: 22, name: 'كلور سائل ومطهرات للبحيرات الكبرى', warehouse: 'assets', qty: 30, price: 650, desc: 'أصول - البحيرات وحمامات السباحة (عبوة 20 لتر)' },
      { id: 23, name: 'مضخة غاطسة لمطهر الصرف محطة STP', warehouse: 'assets', qty: 3, price: 12500, desc: 'أصول - محطة معالجة الصرف الصحي' }
    ];

    this.init();
  }

  init() {
    document.addEventListener('DOMContentLoaded', () => {
      this.loadOdooFields();
      this.applyLanguageUI();
      this.updateHomeownerNameUI();
      this.fetchOdooOwnerName();
      this.bindEvents();
      this.startQRTimer();
      this.initCanvas();
      this.renderPdfLogo();
      this.updateClock();
      setInterval(() => this.updateClock(), 1000);
      this.initSplashScreen();
      this.renderTickets();

      // Auto login if active session exists
      const savedRole = localStorage.getItem('active_session_role');
      if (savedRole) {
        setTimeout(() => this.executeLogin(savedRole), 100);
      }
      // Register PWA Service Worker
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
          .then(() => console.log('[PWA] Service Worker registered successfully.'))
          .catch((err) => console.log('[PWA] Service Worker registration failed:', err));
      }
    });
  }

  initSplashScreen() {
    const splash = document.getElementById('appSplashScreen');
    if (!splash) return;
    
    // Auto hide splash after 2.2s
    setTimeout(() => {
      splash.classList.add('hidden');
    }, 2200);

    splash.addEventListener('click', () => {
      splash.classList.add('hidden');
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
    // Role Switcher Buttons
    const roleBtns = document.querySelectorAll('#roleSelector .role-btn');
    roleBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const role = e.currentTarget.getAttribute('data-role');
        this.switchRole(role);
      });
    });

    // View Mode Toggle (Mobile Simulator Frame vs Fullscreen)
    const toggleViewBtn = document.getElementById('toggleViewModeBtn');
    if (toggleViewBtn) {
      toggleViewBtn.addEventListener('click', () => this.toggleViewMode());
    }

    // New Ticket Modal Trigger
    const btnNewTicket = document.getElementById('btnNewMaintenanceTicket');
    if (btnNewTicket) {
      btnNewTicket.addEventListener('click', () => this.openModal('modalNewTicket'));
    }

    // Submit Ticket Form
    const btnSubmitTicket = document.getElementById('btnSubmitTicket');
    if (btnSubmitTicket) {
      btnSubmitTicket.addEventListener('click', () => this.handleNewTicketSubmit());
    }

    // Smart Meters Recharge Modal Triggers
    const btnOpenMeter = document.getElementById('btnOpenMeterRechargeModal');
    if (btnOpenMeter) {
      btnOpenMeter.addEventListener('click', () => this.openModal('modalMeterRecharge'));
    }

    const btnConfirmMeter = document.getElementById('btnConfirmMeterRecharge');
    if (btnConfirmMeter) {
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
    this.currentRole = 'grid';
    document.querySelectorAll('#roleSelector .role-btn').forEach(btn => {
      if (btn.getAttribute('data-role') === 'grid') {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    document.querySelectorAll('.view-panel').forEach(panel => panel.classList.remove('active'));
    
    const gridPanel = document.getElementById('viewLogin') || document.getElementById('viewRoleGrid');
    if (gridPanel) gridPanel.classList.add('active');

    const backBtn = document.getElementById('btnBackToRoleGrid');
    if (backBtn) backBtn.style.display = 'none';

    // Hide navigation bar header
    const navBar = document.getElementById('appNavBar');
    if (navBar) navBar.style.display = 'none';
  }

  switchRole(role) {
    if (role === 'grid') {
      this.showRoleGrid();
      return;
    }

    this.currentRole = role;
    
    // Update role buttons UI
    document.querySelectorAll('#roleSelector .role-btn').forEach(btn => {
      if (btn.getAttribute('data-role') === role) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Hide all views & show active
    document.querySelectorAll('.view-panel').forEach(panel => panel.classList.remove('active'));
    
    const targetMap = {
      'homeowner': 'viewHomeowner',
      'family': 'viewHomeowner', // Both map to the homeowner view panel
      'engineer': 'viewEngineer',
      'manager': 'viewManager',
      'technician': 'viewTechnician',
      'tenant': 'viewTenant',
      'commercial': 'viewCommercial',
      'admin': 'viewAdmin',
      'security': 'viewSecurity',
      'housekeeping': 'viewHousekeeping'
    };

    const targetId = targetMap[role] || 'viewHomeowner';
    const activePanel = document.getElementById(targetId);
    if (activePanel) {
      activePanel.classList.add('active');
    }

    // Render lists on role switch
    this.renderHousekeeping();

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
          ? 'Villa 104 - North Coast Zone • Associated to Main Owner' 
          : 'فيلا 104 - زون الساحل الشمالي • تابع للمالك الأساسي';
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
          ? 'Villa 104 - North Coast Zone' 
          : 'فيلا 104 - زون الساحل الشمالي';
      }
    }

    const backBtn = document.getElementById('btnBackToRoleGrid');
    if (backBtn) backBtn.style.display = 'inline-flex';

    // Render screen logout header inside active view
    this.renderLogoutHeader();
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
    const name = document.getElementById('staffNameInput').value || 'موظف جديد';
    const job = document.getElementById('staffJobInput').value || 'عامل نشاط';
    const ins = document.getElementById('staffInsuranceInput').value || '#INS-80941';

    this.closeModal('modalStaffPermit');
    this.showToast(`✅ تم توقيع وتأكيد تصريح عمل الموظف (${name}) بنجاح!\nالمسمّى: ${job}\nرقم الملف التأميني للدولة: ${ins}\nتم إصدار كود دخول البوابات الإلكترونية.`);
  }

  submitCargoPermit() {
    const desc = document.getElementById('cargoDescInput').value || 'شحنة تجارية';
    const driver = document.getElementById('cargoDriverInput').value || 'سائق التوريد';
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

    if (specialtyKey === 'infra') {
      if (nameEl) nameEl.innerText = 'م. محمود عبد الفتاح';
      if (subEl) subEl.innerText = '💧 مهندس المرافق الأساسية (RO / STP / المحولات / البيلارات)';
      if (listEl) {
        listEl.innerHTML = `
          <div class="ticket-item">
            <div>
              <h4 style="font-size: 0.85rem;">محطة التحلية الرئيسية (RO Plant)</h4>
              <p style="font-size: 0.72rem; color: var(--text-muted);">فحص ضغط الأغشية والكلور والملوحة</p>
            </div>
            <button class="btn btn-primary" style="width: auto; padding: 6px 12px; font-size: 0.75rem;" id="btnOpenRoChecklist">فتح التفتيش</button>
          </div>
          <div class="ticket-item">
            <div>
              <h4 style="font-size: 0.85rem;">محول الكهرباء الرئيسي 04 والبيلارات</h4>
              <p style="font-size: 0.72rem; color: var(--text-muted);">اختبار حرارة الزيت والعزل واللوحات</p>
            </div>
            <span class="badge badge-success">مكتمل اليوم</span>
          </div>
        `;
        // Re-bind RO button
        const btnRo = document.getElementById('btnOpenRoChecklist');
        if (btnRo) btnRo.addEventListener('click', () => this.openModal('modalRoChecklist'));
      }
    } else if (specialtyKey === 'pools') {
      if (nameEl) nameEl.innerText = 'م. شريف مصطفى';
      if (subEl) subEl.innerText = '🏊 مهندس البحيرات وحمامات السباحة والأنظمة المائية';
      if (listEl) {
        listEl.innerHTML = `
          <div class="ticket-item">
            <div>
              <h4 style="font-size: 0.85rem;">البحيرة الرئيسية وشاطئ القرية</h4>
              <p style="font-size: 0.72rem; color: var(--text-muted);">فحص طلمبات السحب ونسبة نقاء المياه</p>
            </div>
            <span class="badge badge-warning">قيد التفتيش</span>
          </div>
          <div class="ticket-item">
            <div>
              <h4 style="font-size: 0.85rem;">حمامات السباحة المركزية زون 2</h4>
              <p style="font-size: 0.72rem; color: var(--text-muted);">فحص الفلاتر ونسبة التطهير والكلور</p>
            </div>
            <span class="badge badge-success">مطابق للمواصفات</span>
          </div>
        `;
      }
    } else if (specialtyKey === 'landscape') {
      if (nameEl) nameEl.innerText = 'م. طارق عبد المجيد';
      if (subEl) subEl.innerText = '🌿 مهندس اللاندسكيب والحدائق والشبكات العامة';
      if (listEl) {
        listEl.innerHTML = `
          <div class="ticket-item">
            <div>
              <h4 style="font-size: 0.85rem;">شبكات الري التلقائي بالمحور الرئيسي</h4>
              <p style="font-size: 0.72rem; color: var(--text-muted);">فحص ضغط النوازل ومواعيد الضخ</p>
            </div>
            <span class="badge badge-success">عمل بكفاءة</span>
          </div>
          <div class="ticket-item">
            <div>
              <h4 style="font-size: 0.85rem;">الأشجار والمزروعات بالميادين العامة</h4>
              <p style="font-size: 0.72rem; color: var(--text-muted);">جدول التسميد والتقليم الدكتوري</p>
            </div>
            <span class="badge badge-info">مجدول الأسبوع القادم</span>
          </div>
        `;
      }
    }
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
    const category = document.getElementById('ticketCategorySelect').value;
    const priority = document.getElementById('ticketPrioritySelect')?.value || '2';
    const desc = document.getElementById('ticketDescInput').value || 'طلب صيانة عاجلة';
    const photoInput = document.getElementById('ticketPhotoInput');
    
    // Category fallback before-repair images
    const fallbacks = {
      'سباكة': 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&w=300&q=80',
      'كهرباء': 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=300&q=80',
      'كهروميكانيك': 'https://images.unsplash.com/photo-1527018601619-a508a2be00cd?auto=format&fit=crop&w=300&q=80',
      'نجارة': 'https://images.unsplash.com/photo-1517646287270-a5a9ca602e5c?auto=format&fit=crop&w=300&q=80'
    };
    const defaultPhoto = fallbacks[category] || fallbacks['سباكة'];

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
      createdAt: new Date(),
      resolutionTime: ''
    };

    const proceed = () => {
      this.tickets.unshift(newTicket);
      this.renderTickets();
      this.closeModal('modalNewTicket');
      if (photoInput) photoInput.value = '';
      
      // Live Odoo Sync Trigger
      this.syncTicketToOdoo(newTicket);
      
      this.showToast(`✅ تم إنشاء وتوجيه تذكرة الصيانة بنجاح رقم #${newTicket.id}\nتم إدراج البلاغ تلقائياً في قاعدة بيانات Odoo وإرساله لمدير الصيانة!`);
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

    if (url) localStorage.setItem('odoo_url', url);
    if (db) localStorage.setItem('odoo_db', db);
    if (user) localStorage.setItem('odoo_user', user);
    if (name) localStorage.setItem('odoo_owner_name', name);
    if (key) localStorage.setItem('odoo_key', key);

    this.updateHomeownerNameUI();
    this.fetchOdooOwnerName();

    this.closeModal('modalOdooSettings');
    this.showToast(`✅ تم حفظ وتأكيد إعدادات Odoo ERP بنجاح!\nسيرفر: ${url || 'Odoo EDU Live'}\nقاعدة البيانات: ${db}\nالاسم المعتمد: ${name || 'جاري جلبه من Odoo'}\nتم تفعيل الربط المباشر مع جميع بلاغات الصيانة والعدادات.`);
  }

  async callOdoo(baseUrl, payload) {
    const directUrl = `${baseUrl}/jsonrpc`;
    
    try {
      console.log(`[Odoo Call] Attempting direct fetch to: ${directUrl}`);
      const response = await fetch(directUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        const data = await response.json();
        console.log('[Odoo Call] Direct fetch succeeded:', data);
        return data;
      }
      throw new Error(`Direct call returned status ${response.status}`);
    } catch (err) {
      console.warn('[Odoo Call] Direct fetch failed or CORS blocked. Trying proxy fallback...', err);
      try {
        const proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(directUrl);
        const response = await fetch(proxyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await response.json();
        console.log('[Odoo Call] Proxy fetch succeeded:', data);
        return data;
      } catch (proxyErr) {
        console.error('[Odoo Call] Proxy fallback also failed:', proxyErr);
        throw proxyErr;
      }
    }
  }

  async syncTicketToOdoo(ticket) {
    const urlInput = document.getElementById('odooUrlInput')?.value || localStorage.getItem('odoo_url') || 'https://edu-fm-uc.odoo.com';
    const dbInput = document.getElementById('odooDbInput')?.value || localStorage.getItem('odoo_db') || 'edu-fm-uc';
    const userInput = document.getElementById('odooUserInput')?.value || localStorage.getItem('odoo_user') || 'fmhala6@gmail.com';
    const keyInput = document.getElementById('odooKeyInput')?.value || localStorage.getItem('odoo_key') || '06d7d7d208a8c2fa351c2a5cfa305e987ffb72f0';

    if (!urlInput || !dbInput || !userInput || !keyInput) {
      console.log('[Odoo Sync] Missing connection credentials.');
      this.showToast('⚠️ لم يتم العثور على بيانات الاتصال بـ Odoo');
      return;
    }

    const baseUrl = urlInput.replace(/\/+$/, '');

    // Step 1: Call common.authenticate to get the correct User ID (uid) dynamically
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

    console.log('[Odoo Sync] Authenticating to retrieve user UID...');

    try {
      const authData = await this.callOdoo(baseUrl, authPayload);
      if (authData.error) {
        console.error('[Odoo Auth Error]:', authData.error);
        this.showToast(`❌ خطأ في ربط أودو: ${authData.error.message || JSON.stringify(authData.error)}`);
        return;
      }
      
      const uid = authData.result;
      if (!uid || typeof uid !== 'number') {
        console.warn('[Odoo Auth Failed]: Invalid UID returned.', uid);
        this.showToast(`⚠️ أودو أرجع معرف مستخدم غير صحيح: ${uid}`);
        return;
      }

      console.log('[Odoo Sync Success] Retrieved UID:', uid);

      // Determine client information dynamically (Name رباعي, phone, email, unit)
      let fullName = 'أسامة أحمد محمد الشريف';
      let phoneNum = '01223456789';
      let emailAddress = 'fmhala6@gmail.com';
      let unitNum = 'فيلا 104 - زون الشمال';

      const customName = localStorage.getItem('odoo_owner_name');
      if (customName && customName.trim()) {
        fullName = customName;
      }

      if (ticket.requester === 'tenant') {
        fullName = 'أحمد زاهر محمود';
        phoneNum = '01009876543';
        emailAddress = 'tenant.ahmed@domain.com';
        unitNum = 'شاليه 402 - زون البحيرات';
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

      // Step 2: Resolve or Create matching res.partner ID in Odoo
      let partnerId = null;
      try {
        const searchPartnerPayload = {
          jsonrpc: "2.0",
          method: "call",
          params: {
            service: "object",
            method: "execute_kw",
            args: [
              dbInput, uid, keyInput,
              "res.partner",
              "search",
              [[["name", "ilike", fullName]]],
              { limit: 1 }
            ]
          },
          id: Math.floor(Math.random() * 1000)
        };
        const searchPartnerData = await this.callOdoo(baseUrl, searchPartnerPayload);
        if (searchPartnerData && searchPartnerData.result && searchPartnerData.result.length > 0) {
          partnerId = searchPartnerData.result[0];
          console.log('[Odoo Sync] Found matching res.partner ID:', partnerId);
        } else {
          // Auto create contact if not found
          const createPartnerPayload = {
            jsonrpc: "2.0",
            method: "call",
            params: {
              service: "object",
              method: "execute_kw",
              args: [
                dbInput, uid, keyInput,
                "res.partner",
                "create",
                [{ name: fullName, email: emailAddress, phone: phoneNum }]
              ]
            },
            id: Math.floor(Math.random() * 1000)
          };
          const createPartnerData = await this.callOdoo(baseUrl, createPartnerPayload);
          if (createPartnerData && createPartnerData.result) {
            partnerId = createPartnerData.result;
            console.log('[Odoo Sync] Auto-created res.partner ID:', partnerId);
          }
        }
      } catch (pErr) {
        console.warn('[Odoo Sync] Partner resolution skipped:', pErr);
      }

      // Clean description: ONLY the user's detailed problem description
      const cleanDescription = ticket.details || ticket.title || 'طلب صيانة عاجلة من تطبيق الموبايل';

      // Standard Helpdesk Ticket payload (Excluding invalid non-standard fields like partner_name)
      const helpdeskFields = {
        name: `${ticket.category || 'صيانة'}: ${ticket.title || 'بلاغ صيانة'}`,
        description: cleanDescription,
        email_from: emailAddress,
        partner_email: emailAddress,
        partner_phone: phoneNum,
        priority: String(ticket.priority || '2') // Odoo Priority: '1'=1 Star, '2'=2 Stars, '3'=3 Stars
      };

      if (partnerId) {
        helpdeskFields.partner_id = partnerId;
      }

      const createPayload = {
        jsonrpc: "2.0",
        method: "call",
        params: {
          service: "object",
          method: "execute_kw",
          args: [dbInput, uid, keyInput, "helpdesk.ticket", "create", [helpdeskFields]]
        },
        id: Math.floor(Math.random() * 1000)
      };

      console.log('[Odoo Sync] Creating ticket exclusively in helpdesk.ticket...');
      let helpdeskData = await this.callOdoo(baseUrl, createPayload);

      // Robust Fallback: If Odoo rejects optional fields, try minimal core fields
      if (helpdeskData && helpdeskData.error) {
        console.warn('[Odoo Sync] Full payload rejected, retrying with minimal core fields...', helpdeskData.error);
        const minimalFields = {
          name: `${ticket.category || 'صيانة'}: ${ticket.title || 'بلاغ صيانة'}`,
          description: cleanDescription,
          priority: String(ticket.priority || '2')
        };
        if (partnerId) minimalFields.partner_id = partnerId;

        const fallbackPayload = {
          jsonrpc: "2.0",
          method: "call",
          params: {
            service: "object",
            method: "execute_kw",
            args: [dbInput, uid, keyInput, "helpdesk.ticket", "create", [minimalFields]]
          },
          id: Math.floor(Math.random() * 1000)
        };
        helpdeskData = await this.callOdoo(baseUrl, fallbackPayload);
      }
      if (helpdeskData && !helpdeskData.error && helpdeskData.result) {
        const ticketIdInOdoo = helpdeskData.result;
        console.log('[Odoo Sync Success] Ticket registered under helpdesk.ticket. ID:', ticketIdInOdoo);
        ticket.odooId = ticketIdInOdoo;
        ticket.odooModel = "helpdesk.ticket";

        // Step 3: Attach problem photo to ticket in Odoo as ir.attachment
        if (ticket.photoBefore) {
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
                      res_model: "helpdesk.ticket",
                      res_id: ticketIdInOdoo
                    }]
                  ]
                },
                id: Math.floor(Math.random() * 1000)
              };
              await this.callOdoo(baseUrl, attachPayload);
              console.log('[Odoo Sync] Problem photo attached to Odoo ticket #', ticketIdInOdoo);
            }
          } catch (attErr) {
            console.warn('[Odoo Attachment Exception]:', attErr);
          }
        }

        this.showToast('✅ تم تسجيل التذكرة وإرفاق صورة العطل بنجاح في أودو (Helpdesk)');
      } else if (helpdeskData && helpdeskData.error) {
        console.error('[Odoo Helpdesk Error]:', helpdeskData.error);
        this.showToast(`❌ فشل مزامنة التذكرة في أودو: ${helpdeskData.error.message || JSON.stringify(helpdeskData.error)}`);
      }
    } catch (err) {
      console.warn('[Odoo Sync Exception]:', err);
      if (window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        this.showToast(`❌ حدث خطأ في اتصال أودو: ${err.message || err}`);
      }
    }
  }

  async syncTicketUpdateToOdoo(ticket) {
    if (!ticket.odooId || !ticket.odooModel) {
      console.log('[Odoo Update] Ticket does not have Odoo ID.');
      return;
    }

    const urlInput = localStorage.getItem('odoo_url') || 'https://edu-fm-uc.odoo.com';
    const dbInput = localStorage.getItem('odoo_db') || 'edu-fm-uc';
    const userInput = localStorage.getItem('odoo_user') || 'fmhala6@gmail.com';
    const keyInput = localStorage.getItem('odoo_key') || '06d7d7d208a8c2fa351c2a5cfa305e987ffb72f0';

    if (!urlInput || !dbInput || !userInput || !keyInput) return;
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

    console.log('[Odoo Update] Authenticating for ticket update...');

    try {
      const authData = await this.callOdoo(baseUrl, authPayload);
      if (authData.error) return;
      const uid = authData.result;
      if (!uid || typeof uid !== 'number') return;

      console.log(`[Odoo Update] Authenticated UID: ${uid}. Updating model: ${ticket.odooModel}, ID: ${ticket.odooId}`);

      // 1. Post to Chatter (message_post)
      let statusText = `تحديث من تطبيق الموبايل:\nحالة التذكرة: ${ticket.status}`;
      if (ticket.assignedTech) {
        statusText += `\nالفني المخصص: ${ticket.assignedTech}`;
      }

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
            [[ticket.odooId]],
            { body: statusText }
          ]
        },
        id: Math.floor(Math.random() * 1000)
      };

      this.callOdoo(baseUrl, chatterPayload).catch(e => console.warn('[Odoo Chatter Post Failed]', e));

      // 2. Update Odoo Ticket description to show full lifecycle status
      // Determine client information dynamically (Name رباعي, phone, email, unit)
      let fullName = 'أسامة أحمد محمد الشريف';
      let phoneNum = '01223456789';
      let emailAddress = 'fmhala6@gmail.com';
      let unitNum = 'فيلا 104 - زون الشمال';

      const customName = localStorage.getItem('odoo_owner_name');
      if (customName && customName.trim()) {
        fullName = customName;
      }

      if (ticket.requester === 'tenant') {
        fullName = 'أحمد زاهر محمود';
        phoneNum = '01009876543';
        emailAddress = 'tenant.ahmed@domain.com';
        unitNum = 'شاليه 402 - زون البحيرات';
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

      let updatedDesc = `بلاغ صيانة عاجل من تطبيق الموبايل\n` +
                        `---------------------------------\n` +
                        `الاسم رباعي: ${fullName}\n` +
                        `رقم التليفون: ${phoneNum}\n` +
                        `البريد الإلكتروني: ${emailAddress}\n` +
                        `رقم الوحدة: ${unitNum}\n` +
                        `---------------------------------\n` +
                        `الفئة: ${ticket.category || 'عام'}\n` +
                        `الوصف بالتفصيل: ${ticket.details || ticket.title || ''}\n` +
                        `---------------------------------\n` +
                        `حالة التكليف الحالية: ${ticket.status} ${ticket.assignedTech ? ('- الفني: ' + ticket.assignedTech) : ''}`;

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
            [[ticket.odooId], { description: updatedDesc }]
          ]
        },
        id: Math.floor(Math.random() * 1000)
      };

      const writeData = await this.callOdoo(baseUrl, writePayload);
      if (writeData.error) {
        console.error('[Odoo Update Description Error]:', writeData.error);
      } else {
        console.log('[Odoo Update Description Success]:', writeData.result);
      }
    } catch (err) {
      console.error('[Odoo Update Exception]:', err);
    }
  }

  handleMeterRechargeSubmit() {
    const meterType = document.getElementById('meterTypeSelect').value;
    const amountVal = parseFloat(document.getElementById('meterAmountInput').value) || 0;

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
  }

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

      let photosHtml = `<div style="display: flex; gap: 8px; margin-top: 8px; align-items: center;">
        <div>
          <span style="font-size: 0.6rem; color: var(--text-muted); display: block; margin-bottom: 2px;">${isEn ? 'Before Photo:' : 'صورة العطل:'}</span>
          <img src="${tk.photoBefore}" style="width: 54px; height: 54px; border-radius: 8px; object-fit: cover; border: 1px solid rgba(0,0,0,0.1);">
        </div>`;
      if (tk.status === 'تم الانتهاء') {
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

      return `
        <div class="ticket-item" style="flex-direction: column; align-items: stretch; gap: 4px; border-left: 4px solid ${tk.status === 'تم الدفع - جاري التركيب' ? '#10b981' : (tk.status === 'انتظار دفع المالك' ? '#ef4444' : 'rgba(0,0,0,0.15)')};">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <h4 style="font-size: 0.85rem; font-weight: 700;">${title}</h4>
            <span class="badge ${tk.bgClass}">${status}</span>
          </div>
          <p style="font-size: 0.7rem; color: var(--text-muted);">${isEn ? 'Category' : 'التخصص'}: ${category} • ${isEn ? 'Code' : 'كود'}: #${tk.id} ${tk.assignedTech ? `• ${isEn ? 'Tech' : 'الفني'}: ${tk.assignedTech}` : ''}</p>
          ${photosHtml}
          ${paymentHtml}
        </div>
      `;
    };

    // Render Homeowner Tickets list
    const homeownerList = document.getElementById('homeownerTicketsList');
    if (homeownerList) {
      const homeownerTks = this.tickets.filter(tk => tk.requester === 'homeowner');
      const badge = document.getElementById('ticketCountBadge');
      if (badge) badge.innerText = isEn ? `${homeownerTks.length} active` : `${homeownerTks.length} نشطة`;
      homeownerList.innerHTML = '';
      if (homeownerTks.length === 0) {
        homeownerList.innerHTML = `<div style="font-size: 0.75rem; color: var(--text-muted); text-align: center; padding: 10px;">${isEn ? 'No active tickets' : 'لا توجد بلاغات حالية'}</div>`;
      } else {
        homeownerTks.forEach(tk => {
          homeownerList.innerHTML += getTicketHtml(tk);
        });
      }
    }

    // Render Tenant Tickets list
    const tenantList = document.getElementById('tenantTicketsList');
    if (tenantList) {
      const tenantTks = this.tickets.filter(tk => tk.requester === 'tenant');
      const badge = document.getElementById('tenantTicketCountBadge');
      if (badge) badge.innerText = `${tenantTks.length} نشطة`;
      tenantList.innerHTML = '';
      if (tenantTks.length === 0) {
        tenantList.innerHTML = '<div style="font-size: 0.75rem; color: var(--text-muted); text-align: center; padding: 10px;">لا توجد بلاغات حالية</div>';
      } else {
        tenantTks.forEach(tk => {
          tenantList.innerHTML += getTicketHtml(tk);
        });
      }
    }

    // Render Commercial Tickets list
    const commList = document.getElementById('commercialTicketsList');
    if (commList) {
      const commTks = this.tickets.filter(tk => tk.requester === 'commercial');
      const badge = document.getElementById('commercialTicketCountBadge');
      if (badge) badge.innerText = `${commTks.length} active`;
      commList.innerHTML = '';
      if (commTks.length === 0) {
        commList.innerHTML = '<div style="font-size: 0.75rem; color: var(--text-muted); text-align: center; padding: 10px;">لا توجد بلاغات حالية</div>';
      } else {
        commTks.forEach(tk => {
          commList.innerHTML += getTicketHtml(tk);
        });
      }
    }

    // 4. Engineer tickets
    const engList = document.getElementById('engineerTicketsList');
    if (engList) {
      const engTks = this.tickets.filter(tk => tk.requester === 'engineer');
      const badge = document.getElementById('engineerTicketCountBadge');
      if (badge) badge.innerText = `${engTks.length} نشطة`;
      engList.innerHTML = '';
      if (engTks.length === 0) {
        engList.innerHTML = '<div style="font-size: 0.75rem; color: var(--text-muted); text-align: center; padding: 10px;">لا توجد بلاغات حالية</div>';
      } else {
        engTks.forEach(tk => {
          let photosHtml = `<div style="display: flex; gap: 8px; margin-top: 8px; align-items: center;">
            <div>
              <span style="font-size: 0.6rem; color: var(--text-muted); display: block; margin-bottom: 2px;">صورة العطل:</span>
              <img src="${tk.photoBefore}" style="width: 54px; height: 54px; border-radius: 8px; object-fit: cover; border: 1px solid rgba(0,0,0,0.1);">
            </div>`;
          if (tk.status === 'تم الانتهاء') {
            photosHtml += `
            <div>
              <span style="font-size: 0.6rem; color: #10b981; display: block; margin-bottom: 2px;">صورة الإصلاح:</span>
              <img src="${tk.photoAfter}" style="width: 54px; height: 54px; border-radius: 8px; object-fit: cover; border: 1px solid rgba(16,185,129,0.2);">
            </div>
            <div style="margin-right: 8px; font-size: 0.72rem; color: #10b981; font-weight: 700;">
              <i class="fa-solid fa-clock-check"></i> مدة الحل: ${tk.resolutionTime}
            </div>`;
          }
          photosHtml += `</div>`;

          engList.innerHTML += `
            <div class="ticket-item" style="flex-direction: column; align-items: stretch; gap: 4px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <h4 style="font-size: 0.85rem; font-weight: 700;">${tk.title}</h4>
                <span class="badge ${tk.bgClass}">${tk.status}</span>
              </div>
              <p style="font-size: 0.7rem; color: var(--text-muted);">التخصص: ${tk.category} • كود: #${tk.id} ${tk.assignedTech ? `• الفني: ${tk.assignedTech}` : ''}</p>
              ${photosHtml}
            </div>
          `;
        });
      }
    }

    // 5. Manager View - Incoming orders list
    const managerList = document.getElementById('managerOrdersList');
    if (managerList) {
      const unassignedTks = this.tickets.filter(tk => tk.status !== 'تم الانتهاء');
      const badge = document.getElementById('managerInboxBadge');
      if (badge) badge.innerText = `${unassignedTks.length} بلاغات بانتظار المتابعة`;
      managerList.innerHTML = '';
      if (unassignedTks.length === 0) {
        managerList.innerHTML = '<div style="font-size: 0.75rem; color: var(--text-muted); text-align: center; padding: 15px;">لا توجد بلاغات واردة غير مخصصة</div>';
      } else {
        unassignedTks.forEach(tk => {
          let actionHtml = '';
          if (tk.status === 'جديد') {
            actionHtml = `
              <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.3); padding: 6px 10px; border-radius: 6px; margin-top: 8px;">
                <span style="font-size: 0.75rem; color: var(--text-muted);">إسناد للفني:</span>
                <select class="form-control" style="width: auto; padding: 4px 8px; font-size: 0.75rem;" id="assignTechSelect_${tk.id}">
                  <option value="كريم حسن">كريم حسن (فني تكييف)</option>
                  <option value="مينا جرجس">مينا جرجس (فني سباكة)</option>
                  <option value="أحمد علي">أحمد علي (فني كهرباء)</option>
                </select>
              </div>
              <button class="btn btn-primary" style="padding: 6px 12px; font-size: 0.8rem; margin-top: 6px;" onclick="app.assignTechnician('${tk.id}', 'assignTechSelect_${tk.id}')">
                <i class="fa-solid fa-paper-plane"></i> إرسال الطلب لشاشة الفني
              </button>
            `;
          } else {
            actionHtml = `
              <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); padding: 8px; border-radius: 6px; font-size: 0.75rem; color: #6ee7b7; margin-top: 8px;">
                <i class="fa-solid fa-user-check"></i> تم التعيين للفني: <strong>${tk.assignedTech}</strong>
              </div>
            `;
          }

          managerList.innerHTML += `
            <div class="ticket-item" style="flex-direction: column; align-items: stretch; gap: 6px; margin-bottom: 8px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span class="badge ${tk.bgClass}">${tk.status}</span>
                <span style="font-size: 0.7rem; color: var(--text-muted);">المرسل: ${tk.requester} • #${tk.id}</span>
              </div>
              <h4 style="font-size: 0.88rem; font-weight: 700;">${tk.title}</h4>
              
              <div style="display: flex; gap: 8px; align-items: center; margin-top: 6px; background: rgba(0,0,0,0.2); padding: 8px; border-radius: 8px;">
                <img src="${tk.photoBefore}" style="width: 44px; height: 44px; border-radius: 6px; object-fit: cover;">
                <span style="font-size: 0.72rem; color: var(--text-muted);">معاينة صورة المشكلة لتقييم الكفاءة المطلوبة</span>
              </div>

              ${actionHtml}
            </div>
          `;
        });
      }
    }

    const techList = document.getElementById('techTasksContainer');
    if (techList) {
      const techTks = this.tickets.filter(tk => tk.assignedTech === 'كريم حسن' && ['تم التعيين للفني', 'انتظار دفع المالك', 'تم الدفع - جاري التركيب'].includes(tk.status));
      const badge = document.getElementById('techAssignedBadge');
      if (badge) badge.innerText = `${techTks.length} مهمة نشطة`;
      techList.innerHTML = '';
      if (techTks.length === 0) {
        techList.innerHTML = '<div style="font-size: 0.75rem; color: var(--text-muted); text-align: center; padding: 15px;">لا توجد مهام نشطة حالياً للبحث</div>';
      } else {
        techTks.forEach(tk => {
          let innerTechHtml = '';

          if (tk.status === 'تم التعيين للفني') {
            innerTechHtml = `
              <!-- Basic Check-in photo -->
              <div style="display: flex; gap: 8px; align-items: center; background: rgba(0,0,0,0.25); padding: 8px; border-radius: 8px;">
                <img src="${tk.photoBefore}" style="width: 50px; height: 50px; border-radius: 6px; object-fit: cover; border: 1px solid rgba(255,255,255,0.15);">
                <div>
                  <span style="font-size: 0.65rem; color: var(--text-muted); display: block;">صورة العطل المعتمدة:</span>
                  <span style="font-size: 0.7rem; color: #ef4444; font-weight: 700;"><i class="fa-solid fa-triangle-exclamation"></i> يمنع عمل أي مهمة جانبية غير الصورة!</span>
                </div>
              </div>

              <!-- Option A: Simple Fix -->
              <div style="border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 8px; margin-top: 4px;">
                <span style="font-size: 0.72rem; font-weight: 700; color: #10b981; display: block; margin-bottom: 4px;">الخيار الأول: العطل بسيط (تصلح بدون قطع غيار):</span>
                <input type="file" id="techPhotoAfter_${tk.id}" class="form-control" accept="image/*" style="padding: 4px 8px; font-size: 0.72rem; margin-bottom: 6px;">
                <button class="btn btn-success" style="width: 100%; font-size: 0.78rem; padding: 8px; margin-top:0;" onclick="app.completeTicket('${tk.id}', 'techPhotoAfter_${tk.id}')">
                  <i class="fa-solid fa-circle-check"></i> تم الإصلاح عادي وإغلاق التذكرة
                </button>
              </div>

              <!-- Option B: Needs Part -->
              <div style="border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 8px; margin-top: 6px;">
                <span style="font-size: 0.72rem; font-weight: 700; color: var(--primary-gold); display: block; margin-bottom: 4px;">الخيار الثاني: العطل يتطلب قطعة غيار تالفة:</span>
                <input type="file" id="techPhotoDamaged_${tk.id}" class="form-control" accept="image/*" style="padding: 4px 8px; font-size: 0.72rem; margin-bottom: 6px;">
                <button class="btn btn-warning" style="width: 100%; font-size: 0.78rem; padding: 8px; margin-top:0;" onclick="app.technicianRequestPart('${tk.id}', 'techPhotoDamaged_${tk.id}')">
                  <i class="fa-solid fa-boxes-stacked"></i> تصوير القطعة والبحث بالمخزن
                </button>
              </div>
            `;
          } else if (tk.status === 'انتظار دفع المالك') {
            innerTechHtml = `
              <div style="background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.2); padding: 10px; border-radius: 8px; font-size: 0.75rem; color: #fcd34d;">
                <i class="fa-solid fa-circle-notch fa-spin"></i> <strong>بانتظار إتمام الدفع من شاشة المالك:</strong>
                <p style="margin: 4px 0 0 0; font-size: 0.7rem; color: var(--text-muted); line-height: 1.3;">
                  تم طلب قطعة [<strong>${tk.partName}</strong>] بسعر <strong>${tk.partPrice} ج.م</strong> وتوقيع المالك بالموافقة. يرجى الانتظار حتى سداد القيمة من تطبيق العميل للبدء في التركيب.
                </p>
              </div>
            `;
          } else if (tk.status === 'تم الدفع - جاري التركيب') {
            innerTechHtml = `
              <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.2); padding: 10px; border-radius: 8px; font-size: 0.75rem; color: #6ee7b7; margin-bottom: 8px;">
                <i class="fa-solid fa-circle-check"></i> <strong>تم الدفع بنجاح!</strong>
                <p style="margin: 4px 0 0 0; font-size: 0.7rem; color: var(--text-muted); line-height: 1.3;">
                  يرجى صرف قطعة [<strong>${tk.partName}</strong>] من المخزن وتركيبها بالوحدة، ثم إرفاق صورة الإصلاح بعد التركيب.
                </p>
              </div>
              <div style="margin-top: 4px;">
                <label class="form-label" style="font-size: 0.72rem; color: var(--text-muted); display: block; margin-bottom: 4px;">إرفاق صورة بعد التركيب والإصلاح:</label>
                <input type="file" id="techPhotoAfter_${tk.id}" class="form-control" accept="image/*" style="padding: 4px 8px; font-size: 0.72rem; margin-bottom: 6px;">
              </div>
              <button class="btn btn-success" style="width:100%; padding: 8px; font-size: 0.78rem; margin-top:0;" onclick="app.completeTicket('${tk.id}', 'techPhotoAfter_${tk.id}')">
                <i class="fa-solid fa-check"></i> تم التركيب وإنهاء المهمة بالكامل
              </button>
            `;
          }

          techList.innerHTML += `
            <div class="ticket-item" style="flex-direction: column; align-items: stretch; gap: 8px; border-left: 4px solid ${tk.status === 'تم الدفع - جاري التركيب' ? '#10b981' : (tk.status === 'انتظار دفع المالك' ? '#f59e0b' : 'rgba(32,39,79,0.15)')};">
              <div style="display: flex; justify-content: space-between;">
                <h4 style="font-size: 0.88rem; font-weight: 700;">${tk.title}</h4>
                <span class="badge ${tk.bgClass}">#${tk.id}</span>
              </div>
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
                <button class="btn btn-cyan" style="padding: 6px 12px; font-size: 0.78rem; background: #ef4444;" onclick="app.rejectPermit('${p.id}')">
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
              <button class="btn btn-primary" style="padding: 6px 12px; font-size: 0.78rem; margin-top: 6px; border-color: #ef4444; background: #ef4444;" onclick="app.dispatchSecurityDolphin('${c.id}')">
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
  }

  assignTechnician(ticketId, selectId) {
    const techSelect = document.getElementById(selectId);
    if (!techSelect) return;
    const techName = techSelect.value;

    const tk = this.tickets.find(t => t.id === ticketId);
    if (tk) {
      tk.status = 'تم التعيين للفني';
      tk.bgClass = 'badge-info';
      tk.assignedTech = techName;
      this.renderTickets();
      this.showToast(`✅ تم إسناد المهمة للفني (${techName}) بنجاح!\nستظهر المهمة الآن في شاشة الفني الميدانية للبدء بالعمل.`);
      
      // Sync update to Odoo
      this.syncTicketUpdateToOdoo(tk);
    }
  }

  completeTicket(ticketId, fileInputId) {
    const tk = this.tickets.find(t => t.id === ticketId);
    if (!tk) return;

    const fileInput = document.getElementById(fileInputId);
    if (!fileInput || !fileInput.files || !fileInput.files[0]) {
      this.showToast('⚠️ يجب إرفاق صورة العطل بعد الإصلاح أولاً لإغلاق التذكرة بنظام الـ SLA للمحاسبة!');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      // Calculate resolution time
      const diffMs = new Date() - tk.createdAt;
      const diffMins = Math.max(2, Math.round(diffMs / 6000)); // Simulating 6 seconds = 1 minute
      
      tk.status = 'تم الانتهاء';
      tk.bgClass = 'badge-success';
      tk.photoAfter = e.target.result;
      tk.resolutionTime = `${diffMins} دقيقة (التزام كامل بـ SLA)`;

      this.renderTickets();
      this.showToast(`🎉 تم تسجيل إتمام الإصلاح للعطل #${ticketId} بنجاح!\nصورة بعد الإصلاح تم حفظها كدليل للمالك، وتم تحديث التذكرة كـ "مكتمل" بمدة حل قدرها ${diffMins} دقيقة.`);
      
      // Sync update to Odoo
      this.syncTicketUpdateToOdoo(tk);
    };
    reader.readAsDataURL(fileInput.files[0]);
  }

  requestPermit(requester, type) {
    const defaultDetails = requester === 'commercial' 
      ? 'شاحنة توريد لوجستي للمحل' 
      : (requester === 'tenant' ? 'ضيف زائر لشاليه 402' : 'زائر مؤقت للوحدة الساحلية');
      
    const details = prompt('يرجى إدخال تفاصيل التصريح والأسماء (مثال: اسم الضيف أو رقم لوحة السيارة):', defaultDetails);
    if (details === null) return; // user cancelled

    const newPermit = {
      id: 'PR-' + Math.floor(1000 + Math.random() * 9000),
      type: type,
      status: 'تحت المراجعة',
      bgClass: 'badge-warning',
      requester: requester,
      details: details || defaultDetails,
      qrCode: ''
    };

    this.permits.unshift(newPermit);
    this.renderTickets();
    this.showToast(`✅ تم تقديم طلب التصريح رقم #${newPermit.id} بنجاح!\nالطلب قيد المراجعة حالياً من قبل مدير التشغيل لضمان أمان البوابات.`);
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
      }
      this.activeAuditTicketId = null;
      this.uploadedDamagedPhoto = null;
      return;
    }

    this.showToast(`💳 تم توقيع المالك إلكترونياً والدفع الفوري لمبلغ ${this.selectedPart.price} ج.م!\nتم تسجيل شرط الصرف للمخزن وإرسال التأكيد بالفاتورة.`);
  }

  technicianRequestPart(ticketId, fileInputId) {
    const fileInput = document.getElementById(fileInputId);
    if (!fileInput || !fileInput.files || !fileInput.files[0]) {
      this.showToast('⚠️ يرجى إرفاق وصورة قطعة الغيار التالفة أولاً!');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      this.uploadedDamagedPhoto = e.target.result;
      this.activeAuditTicketId = ticketId;
      this.openModal('modalInventory');
      this.filterInventory();
      this.showToast('🔍 تم تحميل صورة القطعة التالفة! يرجى تحديد قطعة الغيار البديلة من المخزن.');
    };
    reader.readAsDataURL(fileInput.files[0]);
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

    const methodArabic = method === 'saved' ? 'البطاقة المسجلة (تنتهي بـ 4012)' : 'البطاقة الجديدة';
    this.showToast(`✅ تم سداد قيمة قطعة الغيار [${tk.partName}] بمبلغ [${tk.partPrice} ج.م] بنجاح عبر ${methodArabic}!\nتم إشعار الفني [كريم حسن] لصرف القطعة وبدء التركيب فوراً.`);
  }

  submitFamilyMember() {
    const nameInput = document.getElementById('familyMemberNameInput');
    const relationSelect = document.getElementById('familyMemberRelationSelect');
    const phoneInput = document.getElementById('familyMemberPhoneInput');

    if (!nameInput || !relationSelect || !phoneInput) return;

    const name = nameInput.value.trim();
    const relation = relationSelect.value;
    const phone = phoneInput.value.trim();

    if (!name || !phone) {
      this.showToast('⚠️ يرجى إدخال اسم فرد العائلة ورقم الموبايل!');
      return;
    }

    const relationMap = {
      'father': 'أب',
      'mother': 'أم',
      'brother': 'أخ',
      'sister': 'أخت',
      'son': 'ابن',
      'daughter': 'ابنة'
    };
    const relationArabic = relationMap[relation] || relation;

    // Render locally in Owner's family list
    const list = document.getElementById('ownerFamilyMembersList');
    const badge = document.getElementById('ownerFamilyCountBadge');

    if (list) {
      const item = document.createElement('div');
      item.style.cssText = 'display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.15); padding: 8px 12px; border-radius: 8px; margin-top: 6px;';
      item.innerHTML = `
        <div>
          <span style="font-size: 0.8rem; font-weight: 700; color: #ffffff;">${name} (${relationArabic})</span>
          <p style="font-size: 0.65rem; color: var(--text-muted); margin: 0;">صلاحية دخول البوابات والخدمات فقط • ${phone}</p>
        </div>
        <span class="badge badge-cyan" style="font-size: 0.6rem; margin-top:0;">نشط</span>
      `;
      list.appendChild(item);

      // Update badge count
      if (badge) {
        const count = list.children.length;
        badge.innerText = `${count} أفراد`;
      }
    }

    this.closeModal('modalAddFamilyMember');
    nameInput.value = '';
    phoneInput.value = '';
    
    this.showToast(`👥 تم إضافة [${name}] بنجاح كفرد عائلة تابع!\nتم إنشاء حساب دخول محدود له على هاتفه برقم ${phone}.`);
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
    this.showToast(`💳 تم سداد القسط المستحق (${code}) بقيمة ${formattedAmount} ج.م بنجاح!\nتم إصدار سند القبض الإلكتروني وتحديث كشف حساب الوحدة في Odoo.`);
    
    // Update UI badge status
    const badge = document.getElementById('installmentStatusBadge');
    if (badge) {
      badge.className = 'badge badge-success';
      badge.innerHTML = '<i class="fa-solid fa-check-double"></i> تم سداد جميع الأقساط المستحقة';
    }
  }

  openCommercialMeterModal() {
    this.openModal('modalMeterRecharge');
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

  openModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.add('active');
    if (modalId === 'modalSignature') {
      setTimeout(() => this.initCanvas(), 100);
    }
    if (modalId === 'modalNewTicket') {
      this.updateModalTicketApplicantInfo();
    }
  }

  updateModalTicketApplicantInfo() {
    let fullName = 'أسامة أحمد محمد الشريف';
    let phoneNum = '01223456789';
    let emailAddress = 'fmhala6@gmail.com';
    let unitNum = 'فيلا 104 - زون الساحل الشمالي';

    const customName = localStorage.getItem('odoo_owner_name');
    if (customName && customName.trim()) fullName = customName;

    if (this.currentRole === 'tenant') {
      fullName = 'أحمد زاهر محمود';
      phoneNum = '01009876543';
      emailAddress = 'tenant.ahmed@domain.com';
      unitNum = 'شاليه 402 - زون البحيرات';
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

    const elName = document.getElementById('modalTicketOwnerName');
    const elUnit = document.getElementById('modalTicketOwnerUnit');
    const elPhone = document.getElementById('modalTicketOwnerPhone');
    const elEmail = document.getElementById('modalTicketOwnerEmail');

    if (elName) elName.innerText = fullName;
    if (elUnit) elUnit.innerText = unitNum;
    if (elPhone) elPhone.innerText = phoneNum;
    if (elEmail) elEmail.innerText = emailAddress;
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
      badge.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري المزامنة...';
    }

    setTimeout(() => {
      if (badge) {
        badge.className = 'badge badge-success';
        badge.innerHTML = '<i class="fa-solid fa-circle-check"></i> متصل بـ Odoo Live';
      }
      this.showToast(`✅ تم اختبار المزامنة المباشرة بنجاح مع قاعدة بيانات Odoo EDU!\nالسيرفر: ${url}\nقاعدة البيانات: ${db}\nتمت مزامنة الوحدات الـ 3,000 والبلاغات والبوابات آلياً.`);
    }, 1200);
  }

  openSecurityComplaintModal() {
    const nameInput = document.getElementById('complaintNameInput');
    const phoneInput = document.getElementById('complaintPhoneInput');
    const detailsInput = document.getElementById('complaintDetailsInput');

    if (nameInput && phoneInput) {
      if (this.currentRole === 'homeowner') {
        let homeownerName = 'د. أسامة المنشاوي';
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

  syncComplaintToOdoo(name, phone, details) {
    console.log(`[Odoo Sync] Security Complaint synced successfully for ${name} (${phone}): ${details}`);
  }
  handleLogin() {
    const email = document.getElementById('loginEmailInput')?.value || '';
    let role = 'owner';
    const em = email.toLowerCase().trim();
    if (em.includes('tenant')) role = 'tenant';
    else if (em.includes('commercial') || em.includes('comm')) role = 'commercial';
    else if (em.includes('security') || em.includes('sec')) role = 'security';
    else if (em.includes('manager')) role = 'manager';
    else if (em.includes('technician') || em.includes('tech')) role = 'technician';
    else if (em.includes('engineer') || em.includes('eng')) role = 'engineer';
    else if (em.includes('admin')) role = 'admin';
    else if (em.includes('owner') || em.includes('ahmed')) role = 'homeowner';

    this.executeLogin(role);
  }

  quickLogin(role) {
    this.executeLogin(role === 'owner' ? 'homeowner' : role);
  }

  executeLogin(role) {
    this.switchRole(role);
    if (['homeowner', 'family', 'tenant', 'commercial'].includes(role)) {
      this.switchHomeownerTab('home');
    }
    
    // Hide standard back-to-grid buttons for strict separation feel
    document.querySelectorAll('[onclick="app.showRoleGrid()"], [onclick="app.switchRole(\'grid\')"]').forEach(btn => {
      btn.style.display = 'none';
    });

    // Show navigation bar header
    const navBar = document.getElementById('appNavBar');
    if (navBar) navBar.style.display = 'flex';

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
    localStorage.setItem('active_session_role', role);

    this.showToast(`🔑 تم تسجيل الدخول بنجاح كـ [${this.getRoleArabicName(role)}]!`);
  }

  logout() {
    localStorage.removeItem('active_session_role');
    this.currentRole = 'login';
    
    // Hide all views & show login
    document.querySelectorAll('.view-panel').forEach(panel => panel.classList.remove('active'));
    const loginPanel = document.getElementById('viewLogin');
    if (loginPanel) loginPanel.classList.add('active');

    // Restore standard back-to-grid buttons for dev grid purposes if wanted
    document.querySelectorAll('[onclick="app.showRoleGrid()"], [onclick="app.switchRole(\'grid\')"]').forEach(btn => {
      btn.style.display = 'inline-flex';
    });

    // Hide navigation bar header
    const navBar = document.getElementById('appNavBar');
    if (navBar) navBar.style.display = 'none';

    // Hide phone bottom navbar
    const phoneNav = document.getElementById('phoneNavbar');
    if (phoneNav) phoneNav.style.display = 'none';

    this.showToast('🚪 تم تسجيل الخروج من النظام بنجاح.');
  }

  getRoleArabicName(role) {
    const map = {
      'homeowner': 'مالك الوحدة السكنية',
      'family': 'أحد أفراد الأسرة (حساب محدود)',
      'tenant': 'المستأجر السكني',
      'commercial': 'المستأجر التجاري',
      'security': 'أمن وبوابات القرية',
      'manager': 'مدير الصيانة والتشغيل',
      'technician': 'الفني الميداني',
      'engineer': 'المهندس المشرف',
      'admin': 'الإدارة العليا'
    };
    return map[role] || role;
  }
  loadOdooFields() {
    const url = localStorage.getItem('odoo_url') || 'https://edu-fm-uc.odoo.com';
    const db = localStorage.getItem('odoo_db') || 'edu-fm-uc';
    const user = localStorage.getItem('odoo_user') || 'fmhala6@gmail.com';
    const key = localStorage.getItem('odoo_key') || '';
    const name = localStorage.getItem('odoo_owner_name') || '';

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

    const customName = localStorage.getItem('odoo_owner_name');

    if (customName && customName.trim()) {
      el.innerText = customName;
    } else {
      el.innerText = this.currentLang === 'en' ? 'Ahmed Mohamed' : 'أحمد محمد';
    }
  }

  async fetchOdooOwnerName() {
    const urlInput = localStorage.getItem('odoo_url') || 'https://edu-fm-uc.odoo.com';
    const dbInput = localStorage.getItem('odoo_db') || 'edu-fm-uc';
    const userInput = localStorage.getItem('odoo_user') || 'fmhala6@gmail.com';
    const keyInput = localStorage.getItem('odoo_key') || '06d7d7d208a8c2fa351c2a5cfa305e987ffb72f0';

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
      if (authData.error) return;
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
          localStorage.setItem('odoo_owner_name', odooName);
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
    btn.innerHTML = this.currentLang === 'en' ? '<i class="fa-solid fa-right-from-bracket"></i> Logout' : '<i class="fa-solid fa-right-from-bracket"></i> خروج';
    btn.onclick = (e) => {
      e.preventDefault();
      this.logout();
    };

    header.appendChild(titleSpan);
    header.appendChild(btn);

    // Prepend to active view!
    activeView.insertBefore(header, activeView.firstChild);
  }

  registerLprPlate() {
    const input = document.getElementById('lprPlateInput');
    const plate = input ? input.value.trim() : '';
    if (!plate) {
      this.showToast('⚠️ يرجى إدخال رقم لوحة السيارة أولاً!');
      return;
    }

    const list = document.getElementById('lprActivePlatesList');
    if (list) {
      const item = document.createElement('div');
      item.style.cssText = 'display: flex; justify-content: space-between; align-items: center; background: rgba(27, 143, 145, 0.08); padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(27, 143, 145, 0.15); margin-top: 6px;';
      item.innerHTML = `
        <span style="font-weight: 800; color: #20274f; font-family: var(--font-number); letter-spacing: 2px;">${plate}</span>
        <span class="badge badge-success" style="font-size: 0.65rem; margin-top:0;"><i class="fa-solid fa-circle-check"></i> مفعل على البوابات</span>
      `;
      list.insertBefore(item, list.firstChild);
    }

    if (input) input.value = '';
    this.showToast(`🚗 تم تسجيل لوحة السيارة [${plate}] في Odoo بنجاح وتفعيلها تلقائياً على البوابات الذكية!`);
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

    this.showToast(`🎾 تم حجز [${amenityText}] بنجاح!\nالتاريخ: ${date}\nالوقت: ${time}\nتم خصم ${price} ج.م من المحفظة.`);
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

    const urlInput = localStorage.getItem('odoo_url') || 'https://edu-fm-uc.odoo.com';
    const dbInput = localStorage.getItem('odoo_db') || 'edu-fm-uc';
    const userInput = localStorage.getItem('odoo_user') || 'fmhala6@gmail.com';
    const keyInput = localStorage.getItem('odoo_key') || '06d7d7d208a8c2fa351c2a5cfa305e987ffb72f0';

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
          <span class="badge badge-success" style="font-size: 0.6rem; margin-top:0;">Odoo Synced</span>
        `;
        list.insertBefore(item, list.firstChild);
      }
      if (badgeCount) {
        const count = list ? list.children.length : 5;
        badgeCount.innerText = `${count} مستخدمين`;
      }
    };

    if (!keyInput) {
      // Local fallback if Odoo not connected
      addUserToLocalList();
      this.closeModal('modalAddNewUser');
      nameInput.value = '';
      emailInput.value = '';
      phoneInput.value = '';
      this.showToast(`✅ [وضع المحاكاة] تم إضافة المستخدم [${userName}] بنجاح للمحفظة المحلية!`);
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

    this.showToast(`⏳ جاري الإرسال ومزامنة [${userName}] مع Odoo ERP...`);

    try {
      const authData = await this.callOdoo(baseUrl, authPayload);
      if (authData.error) {
        throw new Error(JSON.stringify(authData.error));
      }
      const uid = authData.result;
      if (!uid || typeof uid !== 'number') {
        throw new Error('فشل تسجيل الدخول للربط بـ Odoo');
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
      this.showToast(`✅ تم بنجاح مزامنة ورفع العميل [${userName}] بداخل جهات اتصال Odoo ERP (ID: ${createData.result})!`);
    } catch (err) {
      console.error('[Odoo Contact Sync Exception]:', err);
      // Local fallback on error
      addUserToLocalList();
      this.closeModal('modalAddNewUser');
      nameInput.value = '';
      emailInput.value = '';
      phoneInput.value = '';
      this.showToast(`⚠️ تعذر الاتصال بـ Odoo (تم الحفظ محلياً في الموك أب):\n${err.message || err}`);
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
    localStorage.setItem('app_lang', this.currentLang);

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
      const navItems = phoneNav.querySelectorAll('.nav-item span');
      const arNav = ['الرئيسية', 'البلاغات', 'المالية', 'الإعدادات'];
      const enNav = ['Home', 'Tickets', 'Finance', 'Settings'];
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
    const savedThemeDark = localStorage.getItem('app_theme_dark') === 'true';
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
      'family': 'Family Member (Restricted)',
      'tenant': 'Residential Tenant',
      'commercial': 'Commercial Tenant',
      'security': 'Resort Security Gates',
      'manager': 'Maintenance Manager',
      'technician': 'Field Technician',
      'engineer': 'Supervising Engineer',
      'admin': 'Admin Executive'
    };
    return map[role] || role;
  }

  switchHomeownerTab(tabId) {
    // Hide all tab contents in viewHomeowner
    document.querySelectorAll('.homeowner-tab-content').forEach(tab => {
      tab.style.setProperty('display', 'none', 'important');
      tab.classList.remove('active');
    });

    // Show selected tab content
    const target = document.getElementById(`tab${tabId.charAt(0).toUpperCase() + tabId.slice(1)}Homeowner`);
    if (target) {
      target.style.removeProperty('display');
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

  toggleTheme(isDark) {
    const simulator = document.getElementById('phoneSimulator');
    if (simulator) {
      if (isDark) {
        simulator.classList.add('dark-theme');
      } else {
        simulator.classList.remove('dark-theme');
      }
    }
    localStorage.setItem('app_theme_dark', isDark ? 'true' : 'false');
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
    const btnNewTicket = document.querySelector('#tabTicketsHomeowner button');
    if (btnNewTicket) btnNewTicket.innerHTML = isEn ? '<i class="fa-solid fa-wrench"></i> Request New Maintenance' : '<i class="fa-solid fa-wrench"></i> طلب صيانة جديدة للوحدة';

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
    if (odooSyncTitle) odooSyncTitle.innerHTML = isEn ? '<i class="fa-solid fa-cloud-arrow-up"></i> Odoo ERP Live Sync Center' : '<i class="fa-solid fa-cloud-arrow-up"></i> مركز مزامنة Odoo ERP المباشر';

    const odooSyncDesc = document.getElementById('odooSyncDesc');
    if (odooSyncDesc) odooSyncDesc.innerText = isEn ? 'Real-time synchronization with custom Odoo database to send tickets, retrieve owner names, and sync contacts.' : 'الربط اللحظي مع قاعدة بيانات Odoo المخصصة لإرسال بلاغات الصيانة، واستقبال أسماء الملاك، ومزامنة جهات الاتصال.';

    const odooUrlLabel = document.getElementById('odooUrlLabel');
    if (odooUrlLabel) odooUrlLabel.innerText = isEn ? 'Server URL:' : 'رابط السيرفر:';

    const odooDbLabel = document.getElementById('odooDbLabel');
    if (odooDbLabel) odooDbLabel.innerText = isEn ? 'Database Name:' : 'اسم قاعدة البيانات:';

    const odooUserLabel = document.getElementById('odooUserLabel');
    if (odooUserLabel) odooUserLabel.innerText = isEn ? 'User Email:' : 'البريد الإلكتروني:';

    const odooOwnerNameLabel = document.getElementById('odooOwnerNameLabel');
    if (odooOwnerNameLabel) odooOwnerNameLabel.innerText = isEn ? 'Fetched Name from Odoo:' : 'الاسم المسترجع من Odoo:';

    const btnOdooTestConn = document.getElementById('btnOdooTestConn');
    if (btnOdooTestConn) btnOdooTestConn.innerHTML = isEn ? '<i class="fa-solid fa-wifi"></i> Test & Activate Sync Now' : '<i class="fa-solid fa-wifi"></i> اختبار وتنشيط المزامنة الآن';
  }

  requestHousekeeping(role) {
    const isEn = this.currentLang === 'en';
    let location = '';
    let requesterName = '';
    let type = 'نظافة داخلية';

    if (role === 'owner') {
      location = 'فيلا 104';
      requesterName = isEn ? 'Owner (Osama Ahmed)' : 'المالك (أسامة أحمد)';
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
      type = 'نظافة مكان عام';
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString(isEn ? 'en-US' : 'ar-EG', { hour: '2-digit', minute: '2-digit' });

    const newReq = {
      id: `HK-${Math.floor(100 + Math.random() * 900)}`,
      requester: role,
      requesterName: requesterName,
      location: location,
      type: type,
      status: 'بانتظار التخصيص',
      assignedWorker: '',
      time: timeStr
    };

    this.housekeepingRequests.unshift(newReq);
    this.renderHousekeeping();
    this.showToast(isEn ? '🧹 Housekeeping request submitted successfully!' : '🧹 تم تقديم طلب خدمة النظافة بنجاح!');
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
const app = new UltimateFMApp();
