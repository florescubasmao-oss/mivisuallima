/* =========================================================
   MI VISUAL LIMA - V2.16.0
   VALIDACIÓN TÉCNICA AMIGABLE

   Objetivo:
   - Una sola pantalla operativa.
   - Pestañas: Pendientes / Recableado / VTR-GAR / Historial.
   - Periodo siempre visible.
   - Buscar en casos visibles.
   - Tipo / Estado / Cuadrilla dentro de "Filtros".
   - Reutiliza la lista y las acciones del núcleo: no cambia la lógica.
   - VTR/GAR reutiliza el modal ya existente de Gestión WIN.
========================================================= */
(() => {
  'use strict';

  if (window.__MVL_VALIDATION_FRIENDLY_V216__) return;
  window.__MVL_VALIDATION_FRIENDLY_V216__ = true;

  const VERSION = 'V2.16.0_VALIDATION_FRIENDLY';
  const TOKEN_KEY = 'mvl_session_token';

  const S = {
    installed: false,
    active: 'PENDIENTES',
    applyingTab: false,
    countsTimer: 0,
    listTimer: 0,
    observer: null
  };

  const $ = (id) => document.getElementById(id);
  const norm = (v) => String(v == null ? '' : v)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

  const token = () => localStorage.getItem(TOKEN_KEY) || '';

  async function callApi(action, payload = {}) {
    const fn = typeof window.api === 'function'
      ? window.api
      : (typeof api === 'function' ? api : null);
    if (!fn) throw new Error('API no disponible.');
    return await fn(action, { token: token(), ...payload });
  }

  function installStyles() {
    if ($('mvlV216ValidationStyles')) return;
    const st = document.createElement('style');
    st.id = 'mvlV216ValidationStyles';
    st.textContent = `
      #validationViewV205 .mvl205-summary{display:none!important}
      #validationViewV205 #mvlVtrGar2141Btn{display:none!important}

      #validationViewV205 .mvl-v216-shell{
        margin:12px 0 10px;
        display:grid;
        gap:10px;
      }
      #validationViewV205 .mvl-v216-tabs{
        display:grid;
        grid-template-columns:repeat(4,minmax(0,1fr));
        gap:7px;
      }
      #validationViewV205 .mvl-v216-tab{
        min-height:46px;
        border:1px solid #cbdced;
        border-radius:12px;
        background:#f7fbff;
        color:#36536f;
        padding:8px 9px;
        font:inherit;
        font-size:.76rem;
        font-weight:850;
        cursor:pointer;
        display:flex;
        align-items:center;
        justify-content:center;
        gap:7px;
        transition:.15s ease;
      }
      #validationViewV205 .mvl-v216-tab:hover{background:#edf6ff;border-color:#9cc8f4}
      #validationViewV205 .mvl-v216-tab.active{
        background:#0b68c7;
        border-color:#0b68c7;
        color:#fff;
        box-shadow:0 6px 16px rgba(11,104,199,.16);
      }
      #validationViewV205 .mvl-v216-count{
        min-width:22px;
        height:22px;
        padding:0 6px;
        border-radius:999px;
        display:inline-grid;
        place-items:center;
        background:rgba(255,255,255,.9);
        color:#0b5eae;
        font-size:.68rem;
        font-weight:900;
      }
      #validationViewV205 .mvl-v216-tab:not(.active) .mvl-v216-count{
        background:#e5f0fb;
        color:#315b82;
      }
      #validationViewV205 .mvl-v216-tools{
        display:grid;
        grid-template-columns:minmax(0,1fr) auto;
        gap:8px;
        align-items:center;
      }
      #validationViewV205 .mvl-v216-search{
        min-height:43px;
        width:100%;
        border:1px solid #cbdced;
        border-radius:11px;
        background:#fff;
        padding:9px 12px;
        color:#163452;
        font:inherit;
        font-size:.80rem;
        outline:none;
      }
      #validationViewV205 .mvl-v216-search:focus{
        border-color:#5aa2e8;
        box-shadow:0 0 0 3px rgba(53,139,224,.10);
      }
      #validationViewV205 .mvl-v216-filter-btn,
      #validationViewV205 .mvl-v216-win-btn{
        min-height:43px;
        border:1px solid #bfd5eb;
        border-radius:11px;
        background:#f3f8fd;
        color:#194f82;
        padding:9px 12px;
        font:inherit;
        font-size:.76rem;
        font-weight:850;
        cursor:pointer;
        white-space:nowrap;
      }
      #validationViewV205 .mvl-v216-win-btn{
        width:100%;
        border-color:#0f766e;
        background:#ecfdf8;
        color:#0f675f;
      }
      #validationViewV205 .mvl-v216-win-box.hidden,
      #validationViewV205 .mvl-v216-advanced.hidden{display:none!important}

      #validationViewV205 .mvl-v216-advanced{
        display:grid;
        grid-template-columns:repeat(3,minmax(0,1fr));
        gap:8px;
        padding:10px;
        border:1px solid #d7e4f1;
        border-radius:12px;
        background:#f8fbfe;
      }
      #validationViewV205 .mvl-v216-advanced label{
        margin:0!important;
        font-size:.70rem!important;
        font-weight:800;
        color:#4b647c;
      }
      #validationViewV205 .mvl-v216-advanced select{
        width:100%;
        min-height:39px;
        margin-top:5px;
      }

      #validationViewV205 .mvl205-filters{
        grid-template-columns:minmax(180px,290px)!important;
        margin-bottom:6px!important;
      }

      #validationViewV205 #valListV205{
        margin-top:8px;
        display:grid;
        gap:9px;
      }
      #validationViewV205 .mvl205-card{
        border-radius:14px!important;
        border:1px solid #d6e2ef!important;
        background:#fff!important;
        padding:13px!important;
        box-shadow:0 5px 14px rgba(25,70,112,.045)!important;
      }
      #validationViewV205 .mvl205-card-head strong{
        color:#123d67;
        font-size:.86rem;
      }
      #validationViewV205 .mvl205-card-head small{
        margin-top:3px;
        color:#6c7f91;
      }
      #validationViewV205 .mvl205-meta{margin-top:9px!important}
      #validationViewV205 .mvl205-desc{
        margin:8px 0 0!important;
        color:#526679!important;
        font-size:.75rem!important;
        line-height:1.38!important;
      }
      #validationViewV205 .mvl205-card-actions{
        margin-top:10px!important;
      }
      #validationViewV205 .mvl205-card-actions button{
        min-height:38px;
        border-radius:10px!important;
        font-weight:850!important;
      }
      #validationViewV205 .mvl-v216-hidden{display:none!important}

      #validationViewV205 .mvl-v216-local-empty,
      #validationViewV205 .mvl-v216-session{
        border:1px dashed #bfd2e5;
        border-radius:13px;
        background:#f8fbfe;
        padding:18px 14px;
        text-align:center;
        color:#60758a;
        font-size:.78rem;
      }
      #validationViewV205 .mvl-v216-session strong{
        display:block;
        color:#183f67;
        font-size:.90rem;
        margin-bottom:5px;
      }
      #validationViewV205 .mvl-v216-session button{
        margin-top:10px;
        border:0;
        border-radius:10px;
        background:#0b68c7;
        color:#fff;
        min-height:39px;
        padding:8px 13px;
        font:inherit;
        font-weight:850;
        cursor:pointer;
      }

      @media(max-width:720px){
        #validationViewV205 .mvl-v216-tabs{
          grid-template-columns:repeat(2,minmax(0,1fr));
        }
        #validationViewV205 .mvl-v216-advanced{
          grid-template-columns:1fr;
        }
      }
      @media(max-width:460px){
        #validationViewV205 .mvl-v216-tools{
          grid-template-columns:1fr auto;
        }
        #validationViewV205 .mvl-v216-tab{
          min-height:44px;
          font-size:.72rem;
        }
      }
    `;
    document.head.appendChild(st);
  }

  function tabButton(key, label) {
    return `<button type="button" class="mvl-v216-tab" data-v216-tab="${key}">
      <span>${label}</span><b class="mvl-v216-count" id="mvlV216Count${key}">—</b>
    </button>`;
  }

  function moveAdvancedFilters(advanced) {
    ['valTypeV205','valStateV205','valCrewV205'].forEach(id => {
      const select = $(id);
      const label = select?.closest('label');
      if (label && label.parentElement !== advanced) advanced.appendChild(label);
    });
  }

  function buildUi() {
    const view = $('validationViewV205');
    const periodSelect = $('valPeriodV205');
    if (!view || !periodSelect || $('mvlV216ValidationShell')) return false;

    installStyles();

    const filters = periodSelect.closest('.mvl205-filters') || periodSelect.parentElement?.parentElement;
    const summary = $('valSummaryV205');
    const anchor = summary || $('valListV205');
    if (!anchor) return false;

    const shell = document.createElement('section');
    shell.id = 'mvlV216ValidationShell';
    shell.className = 'mvl-v216-shell';
    shell.innerHTML = `
      <div class="mvl-v216-tabs">
        ${tabButton('PENDIENTES','Pendientes')}
        ${tabButton('RECABLEADO','Recableado')}
        ${tabButton('VTRGAR','VTR / GAR')}
        ${tabButton('HISTORIAL','Historial')}
      </div>
      <div class="mvl-v216-tools">
        <input id="mvlV216Search" class="mvl-v216-search" type="search"
          placeholder="Buscar ticket, DNI, orden, código o cuadrilla" autocomplete="off">
        <button id="mvlV216FilterBtn" class="mvl-v216-filter-btn" type="button">Filtros</button>
      </div>
      <div id="mvlV216Advanced" class="mvl-v216-advanced hidden"></div>
      <div id="mvlV216WinBox" class="mvl-v216-win-box hidden">
        <button id="mvlV216WinBtn" class="mvl-v216-win-btn" type="button">
          Revisar responsabilidad VTR / GAR en WIN
        </button>
      </div>
    `;
    anchor.parentNode.insertBefore(shell, anchor);
    moveAdvancedFilters($('mvlV216Advanced'));

    if (filters) {
      filters.classList.add('mvl-v216-period-only');
    }

    shell.querySelectorAll('[data-v216-tab]').forEach(btn => {
      btn.addEventListener('click', () => applyTab(btn.dataset.v216Tab));
    });

    $('mvlV216Search')?.addEventListener('input', scheduleProcessList);

    $('mvlV216FilterBtn')?.addEventListener('click', () => {
      $('mvlV216Advanced')?.classList.toggle('hidden');
    });

    $('mvlV216WinBtn')?.addEventListener('click', () => {
      const original = $('mvlVtrGar2141Btn');
      if (original) {
        original.click();
        return;
      }
      alert('La gestión VTR/GAR no está disponible en esta sesión. Actualiza la página e inténtalo nuevamente.');
    });

    ['valTypeV205','valStateV205'].forEach(id => {
      $(id)?.addEventListener('change', () => {
        if (S.applyingTab) return;
        S.active = 'CUSTOM';
        paintActiveTab();
        scheduleProcessList();
      });
    });

    $('valCrewV205')?.addEventListener('change', () => {
      scheduleCounts(350);
      scheduleProcessList();
    });

    periodSelect.addEventListener('change', () => {
      scheduleCounts(350);
      scheduleProcessList();
    });

    const actions = view.querySelector('.mvl205-actions');
    actions?.addEventListener('click', () => {
      scheduleCounts(900);
    }, true);

    observeList();

    S.installed = true;
    return true;
  }

  function paintActiveTab() {
    document.querySelectorAll('#validationViewV205 [data-v216-tab]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.v216Tab === S.active);
    });
    $('mvlV216WinBox')?.classList.toggle('hidden', S.active !== 'VTRGAR');
  }

  function applyTab(key) {
    const type = $('valTypeV205');
    const state = $('valStateV205');
    if (!type || !state) return;

    S.active = key;
    S.applyingTab = true;

    if (key === 'PENDIENTES') {
      type.value = '';
      state.value = 'PENDIENTE';
    } else if (key === 'RECABLEADO') {
      type.value = 'RECABLEADO';
      state.value = 'PENDIENTE';
    } else if (key === 'VTRGAR') {
      type.value = '';
      state.value = 'PENDIENTE';
    } else if (key === 'HISTORIAL') {
      type.value = '';
      state.value = '';
    }

    paintActiveTab();

    // Un solo evento: la función ya existente lee Tipo + Estado + Cuadrilla juntos.
    state.dispatchEvent(new Event('change', { bubbles:true }));
    S.applyingTab = false;

    scheduleProcessList(80);
    scheduleCounts(500);
  }

  function isVtrGarCard(card) {
    const text = ` ${norm(card?.textContent)} `;
    return /(?:^|[\s·])(GAR|VTR)(?:[\s·]|$)/.test(text);
  }

  function isPendingCard(card) {
    return norm(card?.textContent).includes('PENDIENTE');
  }

  function scheduleProcessList(delay = 0) {
    window.clearTimeout(S.listTimer);
    S.listTimer = window.setTimeout(processList, delay);
  }

  function friendlySessionInvalid(list) {
    const text = norm(list?.textContent);
    if (!text.includes('SESION NO VALIDA') && !text.includes('SESION EXPIRADA')) return false;
    if (list.querySelector('.mvl-v216-session')) return true;

    list.innerHTML = `
      <div class="mvl-v216-session">
        <strong>Tu sesión venció.</strong>
        <span>La información guardada no se ha borrado. Vuelve a ingresar para continuar.</span>
        <br><button type="button" id="mvlV216Relogin">Volver a ingresar</button>
      </div>`;
    $('mvlV216Relogin')?.addEventListener('click', () => {
      try {
        if (typeof clearSession === 'function') {
          clearSession();
          return;
        }
      } catch (_) {}
      try { localStorage.removeItem(TOKEN_KEY); } catch (_) {}
      location.reload();
    });
    return true;
  }

  function processList() {
    const list = $('valListV205');
    if (!list) return;

    if (friendlySessionInvalid(list)) return;

    const cards = [...list.querySelectorAll('.mvl205-card')];
    const q = norm($('mvlV216Search')?.value || '');
    let visible = 0;

    cards.forEach(card => {
      let show = true;

      if (S.active === 'VTRGAR') show = isVtrGarCard(card);
      else if (S.active === 'HISTORIAL') show = !isPendingCard(card);

      if (show && q) show = norm(card.textContent).includes(q);

      card.classList.toggle('mvl-v216-hidden', !show);
      if (show) visible++;
    });

    let empty = list.querySelector('.mvl-v216-local-empty');
    if (cards.length && visible === 0) {
      if (!empty) {
        empty = document.createElement('div');
        empty.className = 'mvl-v216-local-empty';
        list.appendChild(empty);
      }
      empty.textContent = q
        ? 'No hay casos que coincidan con la búsqueda.'
        : (S.active === 'VTRGAR'
            ? 'No hay VTR/GAR pendientes para este periodo.'
            : S.active === 'HISTORIAL'
              ? 'Todavía no hay casos cerrados en este periodo.'
              : 'No hay casos para esta selección.');
    } else {
      empty?.remove();
    }
  }

  function observeList() {
    const list = $('valListV205');
    if (!list || S.observer) return;
    S.observer = new MutationObserver(() => {
      scheduleProcessList(20);
      scheduleCounts(550);
    });
    S.observer.observe(list, { childList:true, subtree:false });
  }

  function rowType(r) {
    return norm(r?.tipoValidacion ?? r?.type ?? r?.tipo ?? '');
  }

  function rowState(r) {
    return norm(r?.estado ?? r?.status ?? '');
  }

  function setCount(key, value) {
    const el = $(`mvlV216Count${key}`);
    if (el) el.textContent = String(Number(value) || 0);
  }

  async function refreshCounts() {
    const period = $('valPeriodV205')?.value || '';
    if (!period || !token()) return;

    try {
      const res = await callApi('technicalValidationList', {
        period,
        type:'',
        state:'',
        crewId:$('valCrewV205')?.value || ''
      });

      if (!res?.ok) return;
      const rows = Array.isArray(res.rows) ? res.rows : [];

      const pendingRows = rows.filter(r => rowState(r) === 'PENDIENTE');
      const recPending = pendingRows.filter(r => rowType(r) === 'RECABLEADO').length;
      const vgPending = pendingRows.filter(r => ['GAR','VTR'].includes(rowType(r))).length;
      const history = rows.filter(r => rowState(r) !== 'PENDIENTE').length;

      setCount('PENDIENTES', pendingRows.length);
      setCount('RECABLEADO', recPending);
      setCount('VTRGAR', vgPending);
      setCount('HISTORIAL', history);
    } catch (err) {
      console.warn('[MI VISUAL LIMA V2.16] No se pudieron actualizar contadores:', err);
    }
  }

  function scheduleCounts(delay = 250) {
    window.clearTimeout(S.countsTimer);
    S.countsTimer = window.setTimeout(refreshCounts, delay);
  }

  function waitForValidation(attempt = 0) {
    if (buildUi()) {
      paintActiveTab();
      applyTab('PENDIENTES');
      scheduleCounts(450);
      console.info(`[MI VISUAL LIMA] ${VERSION}: Validación Técnica simplificada activa.`);
      return;
    }

    if (attempt > 360) {
      console.warn('[MI VISUAL LIMA V2.16] Validación Técnica aún no fue creada por el núcleo.');
      return;
    }

    window.setTimeout(() => waitForValidation(attempt + 1), 100);
  }

  document.addEventListener('mvl:core-ready', () => waitForValidation(0), { once:true });
  window.setTimeout(() => waitForValidation(0), 0);
})();
