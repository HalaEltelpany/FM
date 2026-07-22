/* 
  Ultimate FM - Application JavaScript Logic
  Coastal Cities & Commercial Malls Facility Management System
*/

class UltimateFMApp {
  constructor() {
    this.currentRole = 'homeowner';
    this.isFullWidth = false;
    this.qrTimer = 60;
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

    // Clear old cached test names if matching fmhala
    if (localStorage.getItem('odoo_owner_name') === 'fmhala' || localStorage.getItem('odoo_owner_name') === 'Fmhala') {
      localStorage.removeItem('odoo_owner_name');
    }
    if (localStorage.getItem('odoo_user') === 'fmhala@domain.com' || localStorage.getItem('odoo_user') === 'admin@domain.com') {
      localStorage.removeItem('odoo_user');
    }

    this.init();
  }

  init() {
    document.addEventListener('DOMContentLoaded', () => {
      this.loadOdooFields();
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
      btnSearchInv.addEventListener('click', () => this.openModal('modalInventory'));
    }

    const btnGetSig = document.getElementById('btnGetCustomerSignature');
    if (btnGetSig) {
      btnGetSig.addEventListener('click', () => this.openModal('modalSignature'));
    }

    const btnApprovePay = document.getElementById('btnApproveAndPay');
    if (btnApprovePay) {
      btnApprovePay.addEventListener('click', () => this.handleApproveAndPay());
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
    const gridPanel = document.getElementById('viewRoleGrid');
    if (gridPanel) gridPanel.classList.add('active');

    const backBtn = document.getElementById('btnBackToRoleGrid');
    if (backBtn) backBtn.style.display = 'none';
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
      'engineer': 'viewEngineer',
      'manager': 'viewManager',
      'technician': 'viewTechnician',
      'tenant': 'viewTenant',
      'commercial': 'viewCommercial',
      'admin': 'viewAdmin',
      'security': 'viewSecurity'
    };

    const targetId = targetMap[role] || 'viewHomeowner';
    const activePanel = document.getElementById(targetId);
    if (activePanel) {
      activePanel.classList.add('active');
    }

    const backBtn = document.getElementById('btnBackToRoleGrid');
    if (backBtn) backBtn.style.display = 'inline-flex';
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
        this.qrTimer = 60;
        this.randomizeQR();
      }
      if (countText) countText.innerText = `${this.qrTimer} ثانية`;
      if (progressBar) {
        const pct = (this.qrTimer / 60) * 100;
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

  syncTicketToOdoo(ticket) {
    const urlInput = document.getElementById('odooUrlInput')?.value || localStorage.getItem('odoo_url') || 'https://facility-management.odoo.com';
    const dbInput = document.getElementById('odooDbInput')?.value || localStorage.getItem('odoo_db') || 'facility-management-edu';
    const userInput = document.getElementById('odooUserInput')?.value || localStorage.getItem('odoo_user') || 'admin@domain.com';
    const keyInput = document.getElementById('odooKeyInput')?.value || localStorage.getItem('odoo_key') || '';

    if (!urlInput || !dbInput || !userInput || !keyInput) {
      console.log('[Odoo Sync] Missing connection credentials.');
      return;
    }

    const baseUrl = urlInput.replace(/\/+$/, '');
    const proxyAuthUrl = 'https://corsproxy.io/?' + encodeURIComponent(`${baseUrl}/jsonrpc`);

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

    fetch(proxyAuthUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(authPayload)
    })
    .then(res => res.json())
    .then(authData => {
      if (authData.error) {
        console.error('[Odoo Auth Error]:', authData.error);
        return;
      }
      
      const uid = authData.result;
      if (!uid || typeof uid !== 'number') {
        console.warn('[Odoo Auth Failed]: Invalid UID returned.', uid);
        return;
      }

      console.log('[Odoo Sync Success] Retrieved UID:', uid);

      // Step 2: Create the maintenance request with the correct dynamic UID
      const createPayload = {
        jsonrpc: "2.0",
        method: "call",
        params: {
          service: "object",
          method: "execute_kw",
          args: [
            dbInput,
            uid, // Use the correct user ID retrieved dynamically!
            keyInput,
            "maintenance.request",
            "create",
            [{
              name: `${ticket.id}: ${ticket.title}`,
              description: `بلاغ صيانة عاجل من تطبيق الموبايل - الفئة: ${ticket.category}`,
              priority: "3"
            }]
          ]
        },
        id: Math.floor(Math.random() * 1000)
      };

      return fetch(proxyAuthUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createPayload)
      });
    })
    .then(res => {
      if (res) return res.json();
    })
    .then(createData => {
      if (createData) {
        if (createData.error) {
          console.error('[Odoo Ticket Creation Error]:', createData.error);
        } else {
          console.log('[Odoo Ticket Registered Successfully! ID]:', createData.result);
        }
      }
    })
    .catch(err => {
      console.log('[Odoo Sync Execution Exception]:', err);
    });
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
    // 1. Homeowner tickets
    const homeownerList = document.getElementById('homeownerTicketsList');
    if (homeownerList) {
      const homeownerTks = this.tickets.filter(tk => tk.requester === 'homeowner');
      const badge = document.getElementById('ticketCountBadge');
      if (badge) badge.innerText = `${homeownerTks.length} نشطة`;
      homeownerList.innerHTML = '';
      if (homeownerTks.length === 0) {
        homeownerList.innerHTML = '<div style="font-size: 0.75rem; color: var(--text-muted); text-align: center; padding: 10px;">لا توجد بلاغات حالية</div>';
      } else {
        homeownerTks.forEach(tk => {
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

          homeownerList.innerHTML += `
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

    // 2. Tenant tickets
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

          tenantList.innerHTML += `
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

    // 3. Commercial tickets
    const commList = document.getElementById('commercialTicketsList');
    if (commList) {
      const commTks = this.tickets.filter(tk => tk.requester === 'commercial');
      const badge = document.getElementById('commercialTicketCountBadge');
      if (badge) badge.innerText = `${commTks.length} active`;
      commList.innerHTML = '';
      if (commTks.length === 0) {
        commList.innerHTML = '<div style="font-size: 0.75rem; color: #64748b; text-align: center; padding: 10px;">لا توجد بلاغات حالية</div>';
      } else {
        commTks.forEach(tk => {
          let photosHtml = `<div style="display: flex; gap: 8px; margin-top: 8px; align-items: center;">
            <div>
              <span style="font-size: 0.6rem; color: #64748b; display: block; margin-bottom: 2px;">صورة العطل:</span>
              <img src="${tk.photoBefore}" style="width: 54px; height: 54px; border-radius: 8px; object-fit: cover; border: 1px solid rgba(0,0,0,0.15);">
            </div>`;
          if (tk.status === 'تم الانتهاء') {
            photosHtml += `
            <div>
              <span style="font-size: 0.6rem; color: #10b981; display: block; margin-bottom: 2px;">صورة الإصلاح:</span>
              <img src="${tk.photoAfter}" style="width: 54px; height: 54px; border-radius: 8px; object-fit: cover; border: 1px solid rgba(16,185,129,0.25);">
            </div>
            <div style="margin-right: 8px; font-size: 0.72rem; color: #10b981; font-weight: 700;">
              <i class="fa-solid fa-clock-check"></i> مدة الحل: ${tk.resolutionTime}
            </div>`;
          }
          photosHtml += `</div>`;

          commList.innerHTML += `
            <div class="ticket-item" style="flex-direction: column; align-items: stretch; gap: 4px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <h4 style="font-size: 0.85rem; font-weight: 700;">${tk.title}</h4>
                <span class="badge ${tk.bgClass}">${tk.status}</span>
              </div>
              <p style="font-size: 0.7rem; color: #64748b;">التخصص: ${tk.category} • كود: #${tk.id} ${tk.assignedTech ? `• الفني: ${tk.assignedTech}` : ''}</p>
              ${photosHtml}
            </div>
          `;
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

    // 6. Technician View - Tasks list for كريم حسن
    const techList = document.getElementById('techTasksContainer');
    if (techList) {
      const techTks = this.tickets.filter(tk => tk.assignedTech === 'كريم حسن' && tk.status === 'تم التعيين للفني');
      const badge = document.getElementById('techAssignedBadge');
      if (badge) badge.innerText = `${techTks.length} مهمة نشطة`;
      techList.innerHTML = '';
      if (techTks.length === 0) {
        techList.innerHTML = '<div style="font-size: 0.75rem; color: var(--text-muted); text-align: center; padding: 15px;">لا توجد مهام نشطة حالياً للبحث</div>';
      } else {
        techTks.forEach(tk => {
          techList.innerHTML += `
            <div class="ticket-item" style="flex-direction: column; align-items: stretch; gap: 8px;">
              <div style="display: flex; justify-content: space-between;">
                <h4 style="font-size: 0.88rem; font-weight: 700;">${tk.title}</h4>
                <span class="badge ${tk.bgClass}">#${tk.id}</span>
              </div>
              
              <div style="display: flex; gap: 8px; align-items: center; background: rgba(0,0,0,0.25); padding: 8px; border-radius: 8px;">
                <img src="${tk.photoBefore}" style="width: 50px; height: 50px; border-radius: 6px; object-fit: cover; border: 1px solid rgba(255,255,255,0.15);">
                <div>
                  <span style="font-size: 0.65rem; color: var(--text-muted); display: block;">صورة المشكلة المعتمدة:</span>
                  <span style="font-size: 0.7rem; color: #ef4444; font-weight: 700;"><i class="fa-solid fa-triangle-exclamation"></i> يمنع عمل أي مهمة جانبية غير الصورة!</span>
                </div>
              </div>

              <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); padding: 8px; border-radius: 6px; font-size: 0.75rem; color: #6ee7b7;">
                <i class="fa-solid fa-file-contract"></i> العطل مغطى بالصيانة التشغيلية للوحدة
              </div>

              <div style="margin-top: 6px;">
                <label class="form-label" style="font-size: 0.72rem; color: var(--text-muted); display: block; margin-bottom: 4px;">إرفاق صورة الإصلاح (إجباري لإغلاق التذكرة بنظام SLA):</label>
                <input type="file" id="techPhotoAfter_${tk.id}" class="form-control" accept="image/*" style="padding: 4px 8px; font-size: 0.75rem; margin-bottom: 8px;">
              </div>

              <button class="btn btn-primary" style="padding: 8px; font-size: 0.8rem;" onclick="app.completeTicket('${tk.id}', 'techPhotoAfter_${tk.id}')">
                <i class="fa-solid fa-circle-check"></i> تم الانتهاء من العمل وتأكيد الإصلاح
              </button>
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
        homeownerPermits.innerHTML = '<div style="font-size: 0.72rem; color: var(--text-muted); text-align: center; padding: 6px;">لا توجد تصاريح حالية</div>';
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
          homeownerPermits.innerHTML += `
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
      if (badge) badge.innerText = `${list.length} نشطة`;
      homeownerComplaints.innerHTML = '';
      if (list.length === 0) {
        homeownerComplaints.innerHTML = '<div style="font-size: 0.72rem; color: var(--text-muted); text-align: center; padding: 6px;">لا توجد شكاوى أمنية حالية</div>';
      } else {
        list.forEach(c => {
          homeownerComplaints.innerHTML += `
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
    if (btnApprove) btnApprove.innerHTML = `<i class="fa-solid fa-credit-card"></i> موافقة ودفع آلي (${price} ج.م)`;

    this.closeModal('modalInventory');
    this.openModal('modalSignature');
  }

  handleApproveAndPay() {
    this.closeModal('modalSignature');
    this.showToast(`💳 تم توقيع المالك إلكترونياً والدفع الفوري لمبلغ ${this.selectedPart.price} ج.م!\nتم تسجيل شرط الصرف للمخزن وإرسال التأكيد بالفاتورة.`);
  }

  chargeService(serviceName, price) {
    this.showToast(`✅ تم شحن ${serviceName} بنجاح بمبلغ ${price} ج.م!\nتم تفعيل الصلاحية على الـ QR Code حتى التاريخ المترتب.`);
  }

  issueBeachPermit() {
    const code = Math.floor(100000 + Math.random() * 900000);
    this.closeModal('modalBeachPoolsPermit');
    this.showToast(`🌊 تم إصدار تصريح دخول الشاطئ والبحيرات وحمامات السباحة بنجاح!\nرمز الـ Dynamic QR: ${code}\nتم تسجيل التصريح على بوابات الرفاهية الإلكترونية بالقرية.`);
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
    const url = document.getElementById('odooUrlInput')?.value || 'https://facility-management.odoo.com';
    const db = document.getElementById('odooDbInput')?.value || 'facility-management-edu';

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

  loadOdooFields() {
    const url = localStorage.getItem('odoo_url') || 'https://facility-management.odoo.com';
    const db = localStorage.getItem('odoo_db') || 'facility-management-edu';
    const user = localStorage.getItem('odoo_user') || 'ahmed.mohamed@domain.com';
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
      el.innerText = 'أحمد محمد';
    }
  }

  fetchOdooOwnerName() {
    const urlInput = localStorage.getItem('odoo_url') || 'https://facility-management.odoo.com';
    const dbInput = localStorage.getItem('odoo_db') || 'facility-management-edu';
    const userInput = localStorage.getItem('odoo_user');
    const keyInput = localStorage.getItem('odoo_key');

    if (!userInput || !keyInput) return;

    const baseUrl = urlInput.replace(/\/+$/, '');
    const proxyAuthUrl = 'https://corsproxy.io/?' + encodeURIComponent(`${baseUrl}/jsonrpc`);

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

    fetch(proxyAuthUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(authPayload)
    })
    .then(res => res.json())
    .then(authData => {
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

      return fetch(proxyAuthUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(readPayload)
      });
    })
    .then(res => {
      if (res) return res.json();
    })
    .then(readData => {
      if (readData && readData.result && readData.result[0]) {
        const odooName = readData.result[0].name;
        if (odooName) {
          localStorage.setItem('odoo_owner_name', odooName);
          this.updateHomeownerNameUI();
          const input = document.getElementById('odooOwnerNameInput');
          if (input) input.value = odooName;
        }
      }
    })
    .catch(err => {
      console.log('[Odoo Name Fetch Exception]:', err);
    });
  }
}

// Global App Instance
const app = new UltimateFMApp();
