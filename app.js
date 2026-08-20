/**
 * MI VISUAL LIMA - Frontend V1.15 OPTIMIZADO
 *
 * Optimización:
 * - V1.12 y V1.15 viajan en un solo app.js local.
 * - Solo queda la carga del núcleo histórico V1.8.
 * - Cachea Dashboard por periodo durante 2 minutos.
 * - Evita la segunda llamada ALL y la llamada adminCatalogs dentro del Dashboard.
 * - Mantiene metas y semáforos por Tipo de Cuadrilla Visual.
 */

/**
 * MI VISUAL LIMA - Frontend V1.12 integrado dentro de V1.15
 *
 * OBJETIVO
 * - Mantener intacto el núcleo V1.8 ya probado.
 * - Mantener Dashboard: resumen total + filtros + ranking.
 * - Eliminar Sede del filtro (la aplicación corresponde solo a Lima).
 * - Mostrar cuadrillas únicamente al presionar Aplicar.
 * - Mantener visibles los indicadores pendientes como "En construcción".
 *
 * IMPORTANTE
 * Este archivo carga el núcleo V1.8 fijado al commit que estaba publicado al
 * momento de preparar esta actualización, y luego aplica únicamente la capa V1.9.
 */

(() => {
  // V1.12: cargador compacto. Mantiene visible la pantalla actual y evita
  // cambiar a una portada/splash de pantalla completa mientras carga.
  function instalarLoaderCompactoV112() {
    if (document.getElementById('mvlLoaderCompactoV112')) return;
    const style = document.createElement('style');
    style.id = 'mvlLoaderCompactoV112';
    style.textContent = `
      .app-loader {
        place-items: center !important;
        background: rgba(238,245,255,.58) !important;
        color: #10213d !important;
        backdrop-filter: blur(2px) !important;
        -webkit-backdrop-filter: blur(2px) !important;
      }
      .app-loader .loader-brand {
        margin: 0 !important;
        padding: 13px 17px !important;
        border-radius: 16px !important;
        background: rgba(255,255,255,.97) !important;
        border: 1px solid #d7e3f1 !important;
        box-shadow: 0 14px 38px rgba(15,42,77,.18) !important;
        display: flex !important;
        flex-direction: row !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 10px !important;
        min-width: 205px;
      }
      .app-loader .loader-logo,
      .app-loader .loader-brand strong {
        display: none !important;
      }
      .app-loader .loader-brand span {
        color: #18385e !important;
        font-size: .80rem !important;
        font-weight: 800 !important;
        letter-spacing: 0 !important;
      }
      .app-loader .spinner {
        width: 18px !important;
        height: 18px !important;
        margin: 0 !important;
        border: 2px solid #d5e4f5 !important;
        border-top-color: #0758b7 !important;
      }
    `;
    document.head.appendChild(style);
  }

  instalarLoaderCompactoV112();

  /* ==========================================================
     V2.01 - ARRANQUE ESTABLE
     - No bloquea el Login mientras valida una sesión anterior.
     - Cachea el núcleo V1.8 en localStorage después de la primera carga.
     - Intenta GitHub Raw + jsDelivr en paralelo y usa el primero disponible.
     - Si una sesión guardada tarda, la validación ocurre en segundo plano.
     ========================================================== */

  const MVL_CORE_COMMIT_V201 = '8f08004a72c45a7eda063aca6e64eb2ce1d3fe92';
  const MVL_CORE_CACHE_KEY_V201 = 'mvl_core_v18_' + MVL_CORE_COMMIT_V201;
  const MVL_TOKEN_KEY_V201 = 'mvl_session_token';
  const MVL_CORE_URLS_V201 = [
    'https://raw.githubusercontent.com/florescubasmao-oss/mivisuallima/' +
      MVL_CORE_COMMIT_V201 + '/app.js',
    'https://cdn.jsdelivr.net/gh/florescubasmao-oss/mivisuallima@' +
      MVL_CORE_COMMIT_V201 + '/app.js'
  ];

  let mvlLoginInteractedV201 = false;
  document.getElementById('loginForm')?.addEventListener(
    'submit',
    () => { mvlLoginInteractedV201 = true; },
    true
  );

  // Mostrar Login de inmediato: nunca dejar una pantalla borrosa esperando red.
  document.getElementById('loginView')?.classList.remove('hidden');
  document.body.classList.add('login-mode');
  document.getElementById('appLoader')?.classList.add('loader-hidden');

  function setBootMessageV201(text, type = 'error') {
    const el = document.getElementById('loginMessage');
    if (!el) return;
    el.textContent = text || '';
    el.classList.toggle('success-message', type === 'success');
  }

  async function fetchTextTimeoutV201(url, timeoutMs = 8000) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await window.fetch(url, {
        method: 'GET',
        cache: 'force-cache',
        signal: controller.signal
      });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return await response.text();
    } finally {
      window.clearTimeout(timer);
    }
  }

  async function getCoreTextV201() {
    try {
      const cached = localStorage.getItem(MVL_CORE_CACHE_KEY_V201);
      if (cached && cached.includes('MI VISUAL LIMA - Frontend V1.8')) {
        return cached;
      }
    } catch (_) {}

    const attempts = MVL_CORE_URLS_V201.map(url =>
      fetchTextTimeoutV201(url, 8000).then(text => {
        if (!text || !text.includes('MI VISUAL LIMA - Frontend V1.8')) {
          throw new Error('Núcleo inválido');
        }
        return text;
      })
    );

    let text = '';
    if (typeof Promise.any === 'function') {
      text = await Promise.any(attempts);
    } else {
      // Compatibilidad: prueba secuencial si Promise.any no existe.
      let lastError = null;
      for (const attempt of attempts) {
        try { text = await attempt; break; }
        catch (err) { lastError = err; }
      }
      if (!text) throw lastError || new Error('No se pudo descargar el núcleo.');
    }

    try { localStorage.setItem(MVL_CORE_CACHE_KEY_V201, text); } catch (_) {}
    return text;
  }

  function installApiTimeoutV201() {
    if (window.__mvlApiTimeoutV201) return;
    window.__mvlApiTimeoutV201 = true;
    const nativeFetch = window.fetch.bind(window);

    window.fetch = function(input, init = {}) {
      const url = typeof input === 'string' ? input : String(input?.url || input || '');
      if (!/script\.google\.com\/macros\/s\//i.test(url)) {
        return nativeFetch(input, init);
      }

      // Una llamada API nunca debe dejar la APP bloqueada indefinidamente.
      // V2.10.1: las cargas masivas necesitan más tiempo que una consulta normal.
      // Se amplía SOLO el cierre de importación para no relajar el resto de la APP.
      let actionName = '';
      try {
        if (init?.body instanceof URLSearchParams) {
          actionName = String(init.body.get('action') || '');
        } else if (typeof init?.body === 'string') {
          actionName = String(new URLSearchParams(init.body).get('action') || '');
        }
      } catch (_) {}

      const timeoutMs =
        actionName === 'adminImportFinish' ? 300000 :
        actionName === 'adminImportChunk' ? 120000 :
        60000;

      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), timeoutMs);
      const originalSignal = init?.signal;

      if (originalSignal) {
        if (originalSignal.aborted) controller.abort();
        else originalSignal.addEventListener('abort', () => controller.abort(), { once:true });
      }

      return nativeFetch(input, { ...init, signal: controller.signal })
        .finally(() => window.clearTimeout(timer));
    };
  }

  function executeCoreV201(source) {
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.text = source + '\n//# sourceURL=mvl-core-v18-cached.js';
    document.head.appendChild(script);
    script.remove();

    if (typeof api !== 'function' || typeof renderHome !== 'function') {
      throw new Error('El núcleo no terminó de inicializarse.');
    }
  }

  async function restoreSavedSessionBackgroundV201(savedToken) {
    if (!savedToken || typeof api !== 'function') return;

    // Restaurar el token después de que el núcleo haya mostrado el Login sin bloquear.
    localStorage.setItem(MVL_TOKEN_KEY_V201, savedToken);

    try {
      const data = await api('session', { token: savedToken });

      // Si el usuario ya intentó ingresar manualmente, no pisar esa acción.
      if (mvlLoginInteractedV201) return;

      if (data?.ok) {
        renderHome(data);
      } else if (localStorage.getItem(MVL_TOKEN_KEY_V201) === savedToken) {
        localStorage.removeItem(MVL_TOKEN_KEY_V201);
      }
    } catch (_) {
      // La APP queda utilizable en Login aunque el backend esté frío o temporalmente lento.
    }
  }

  async function bootCoreV201() {
    let savedToken = '';
    try {
      savedToken = localStorage.getItem(MVL_TOKEN_KEY_V201) || '';
      // Evita que restoreSession() del núcleo bloquee el primer render.
      if (savedToken) localStorage.removeItem(MVL_TOKEN_KEY_V201);
    } catch (_) {}

    installApiTimeoutV201();

    const loginButton = document.getElementById('loginButton');
    if (loginButton) {
      loginButton.disabled = true;
      loginButton.textContent = 'Preparando…';
    }

    try {
      const source = await getCoreTextV201();
      executeCoreV201(source);

      // V2.09: precalienta Apps Script en segundo plano. No bloquea el Login.
      // Reduce la espera del primer ingreso cuando Google Apps Script está frío.
      try {
        if (typeof API_URL !== 'undefined' && API_URL) {
          window.fetch(API_URL, { method:'GET', cache:'no-store' }).catch(() => {});
        }
      } catch (_) {}

      if (loginButton) {
        loginButton.disabled = false;
        loginButton.textContent = 'Ingresar';
      }
      setBootMessageV201('');

      // Avisar a las capas nuevas que api()/renderHome ya existen.
      document.dispatchEvent(new CustomEvent('mvl:core-ready'));
      window.setTimeout(iniciarDashboardV19, 0);
      window.setTimeout(() => restoreSavedSessionBackgroundV201(savedToken), 0);
    } catch (err) {
      if (savedToken) {
        try { localStorage.setItem(MVL_TOKEN_KEY_V201, savedToken); } catch (_) {}
      }

      document.getElementById('appLoader')?.classList.add('loader-hidden');
      if (loginButton) {
        loginButton.disabled = false;
        loginButton.textContent = 'Reintentar';
        loginButton.onclick = (event) => {
          event.preventDefault();
          location.reload();
        };
      }

      setBootMessageV201(
        'No se pudo preparar la aplicación. Revisa la conexión y pulsa Reintentar.'
      );
      console.error('[MI VISUAL LIMA V2.01] Error de arranque:', err);
    }
  }

  bootCoreV201();

  async function iniciarDashboardV19() {
    try {
      const $v19 = (id) => document.getElementById(id);
      if (!$v19('performanceDashboardPanel')) return;

      const ESTADO = {
        metadata: new Map(),
        seedLoaded: false,
        catalogTried: false,
        totalCache: new Map(),
        lastData: null,
        applyRequested: false
      };

      const pick = (obj, ...keys) => {
        if (!obj) return '';
        for (const key of keys) {
          if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') return obj[key];
        }
        return '';
      };

      const norm = (value) => String(value ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toUpperCase();

      const html = (value) => String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');

      function normalizarTipoVisual(value) {
        const n = norm(value);
        if (!n) return '';
        if (n === 'PLAME' || n === 'PLANILLA') return 'PLANILLA';
        if (n === 'PRODUCCION' || n.includes('COMISIONISTA')) return 'PRODUCCION';
        if (n.includes('DISPONIBILIDAD')) return 'DISPONIBILIDAD';
        if (n === 'PDG') return 'PDG';
        return n;
      }

      function normalizarPlataforma(value, display = '') {
        const n = norm(`${value || ''} ${display || ''}`);
        if (n.includes('POSTMOTOWIN') || (n.includes('MOTOWIN') && n.includes('POST'))) return 'POSTMOTOWIN';
        if (/\bSGI\b/.test(n)) return 'SGI';
        if (/\bSGA\b/.test(n)) return 'SGA';
        if (n.includes('TRASLADO')) return 'TRASLADO';
        return norm(value);
      }

      function normalizarComposicion(value, tech2 = '') {
        const n = norm(value);
        if (n === 'DOBLE' || n === '2' || n.includes('DOS')) return 'DOBLE';
        if (n === 'SOLO' || n === 'INDIVIDUAL' || n === '1') return 'SOLO';
        return norm(tech2) ? 'DOBLE' : 'SOLO';
      }

      function normalizarEstado(value) {
        const n = norm(value);
        if (n === 'ACTIVE' || n === 'ACTIVA' || n === 'ACTIVO') return 'ACTIVO';
        if (n.includes('SUSPEND')) return 'SUSPENDIDA';
        if (n === 'BAJA' || n === 'INACTIVO' || n === 'INACTIVA') return 'BAJA';
        return n || 'ACTIVO';
      }

      function crewIdOf(c) {
        return String(pick(c, 'id', 'crewId', 'ID_CUADRILLA') || '').trim();
      }

      function normalizarCrew(c) {
        const id = crewIdOf(c);
        const display = String(pick(c, 'display', 'name', 'crewDisplay', 'NOMBRE_CUADRILLA') || '');
        const directRaw = pick(c, 'directManagement', 'supervisionDirectaGerencia', 'SUPERVISION_DIRECTA_GERENCIA');
        const direct = directRaw === true || ['SI', 'SÍ', 'TRUE', '1', 'GG'].includes(norm(directRaw));
        const tech2 = pick(c, 'technician2', 'tech2', 'TECNICO_2');
        const compositionRaw = pick(c, 'composition', 'composicion', 'COMPOSICION_CUADRILLA');
        const stateRaw = pick(c, 'state', 'status', 'estado', 'ESTADO');
        const hasDirectValue = directRaw !== '';
        const supervisorName = direct
          ? 'GG'
          : String(pick(c, 'supervisor', 'supervisorName', 'SUPERVISOR') || '');

        return {
          id,
          code: String(pick(c, 'code', 'crewCode', 'CODIGO_CUADRILLA') || ''),
          name: display,
          platform: normalizarPlataforma(
            pick(c, 'platform', 'winPlatform', 'plataforma', 'plataformaCuadrilla', 'PLATAFORMA_CUADRILLA'),
            display
          ),
          visualType: normalizarTipoVisual(
            pick(c, 'visualType', 'tipoVisual', 'modality', 'modalidad', 'modalidadOperativa', 'MODALIDAD_OPERATIVA')
          ),
          composition: (compositionRaw !== '' || tech2 !== '')
            ? normalizarComposicion(compositionRaw, tech2)
            : '',
          supervisorId: direct ? '__GG__' : String(pick(c, 'supervisorId', 'ID_SUPERVISOR') || ''),
          supervisor: supervisorName,
          directManagement: hasDirectValue ? direct : undefined,
          state: stateRaw !== '' ? normalizarEstado(stateRaw) : '',
          technician1: String(pick(c, 'technician1', 'tech1', 'TECNICO_1') || ''),
          technician2: String(tech2 || '')
        };
      }

      function mergeCrew(c) {
        const incoming = normalizarCrew(c);
        if (!incoming.id) return;
        const prev = ESTADO.metadata.get(incoming.id) || {};
        const merged = { ...prev };
        Object.entries(incoming).forEach(([key, value]) => {
          if (value !== '' && value !== null && value !== undefined) merged[key] = value;
        });
        ESTADO.metadata.set(incoming.id, merged);
      }

      async function cargarSeed() {
        if (ESTADO.seedLoaded) return;
        ESTADO.seedLoaded = true;
        try {
          const response = await fetch('./data/cuadrillas-v19.json', { cache: 'no-store' });
          if (!response.ok) throw new Error('No disponible');
          const data = await response.json();
          Object.values(data.crews || {}).forEach(mergeCrew);
        } catch (err) {
          console.warn('[V1.12] No se pudo cargar data/cuadrillas-v19.json.', err);
        }
      }

      async function enriquecerMetadata(data) {
        await cargarSeed();

        try {
          (sessionData?.scope?.crews || []).forEach(mergeCrew);
        } catch (_) {}

        (data?.filters?.crews || []).forEach(mergeCrew);
        (data?.rows || []).forEach(r => mergeCrew({
          id: r.crewId,
          display: r.crewDisplay,
          supervisor: r.supervisor,
          supervisorId: r.supervisorId,
          platform: r.platform,
          visualType: r.visualType,
          composition: r.composition,
          state: r.state
        }));

        if (!ESTADO.catalogTried) {
          ESTADO.catalogTried = true;
          try {
            const cat = await api('adminCatalogs', { token: token() });
            if (cat?.ok) (cat.crews || []).forEach(mergeCrew);
          } catch (_) {
            // Perfiles sin Administración continúan con scope + seed.
          }
        }
      }

      function metadataForRow(row) {
        const id = String(row?.crewId || '');
        const base = ESTADO.metadata.get(id) || {};
        const rowMeta = normalizarCrew({
          id,
          display: row?.crewDisplay,
          supervisor: row?.supervisor,
          supervisorId: row?.supervisorId,
          platform: row?.platform,
          visualType: row?.visualType,
          composition: row?.composition,
          state: row?.state
        });
        return { ...base, ...Object.fromEntries(Object.entries(rowMeta).filter(([,v]) => v !== '')) };
      }

      function insertarEstilos() {
        if ($v19('mvlDashboardV19Styles')) return;
        const style = document.createElement('style');
        style.id = 'mvlDashboardV19Styles';
        style.textContent = `
          .dashboard-v19-summary{margin:4px 0 22px}
          .dashboard-v19-summary-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-end;margin-bottom:10px}
          .dashboard-v19-summary-head h3{margin:0}
          .dashboard-v112-summary-loading{display:inline-flex;align-items:center;gap:6px;padding:6px 9px;border-radius:999px;background:#eef5ff;color:#0758b7;border:1px solid #cfe1fb;font-size:.72rem;font-weight:800;white-space:nowrap}
          .dashboard-v19-summary-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
          .dashboard-v19-total-card{border:1px solid var(--border,#dce3eb);border-radius:14px;padding:14px;background:var(--card,#fff);min-width:0}
          .dashboard-v19-total-card span{display:block;font-size:.78rem;color:var(--muted,#687386);margin-bottom:6px}
          .dashboard-v19-total-card strong{display:block;font-size:1.15rem;line-height:1.2;word-break:break-word}
          .dashboard-v19-total-card small{display:block;margin-top:5px;color:var(--muted,#687386)}
          .dashboard-v19-filter-title{grid-column:1/-1;margin:2px 0 -2px}
          .dashboard-v19-filter-title strong{display:block}
          .dashboard-v19-filter-title small{color:var(--muted,#687386)}
          .dashboard-v19-active-filters{display:flex;flex-wrap:wrap;gap:7px;margin:10px 0 18px;min-height:6px}
          .dashboard-v19-chip{border-radius:999px;padding:6px 9px;font-size:.74rem;font-weight:700;background:#eef5ff;color:#0758b7;border:1px solid #cfe1fb}
          .dashboard-v19-rank-meta{display:flex;flex-wrap:wrap;gap:5px;margin-top:5px}
          .dashboard-v19-meta-pill{font-size:.67rem;line-height:1;border:1px solid #dce3eb;border-radius:999px;padding:4px 6px;color:#536174;background:#f8fafc}
          .dashboard-v19-meta-pill.gg{background:#fff7e6;color:#8a5a00;border-color:#f4d79c}
          .dashboard-v19-ranking-note{margin:0 0 10px;color:var(--muted,#687386);font-size:.82rem}
          @media (max-width:760px){.dashboard-v19-summary-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
          @media (max-width:420px){.dashboard-v19-summary-grid{grid-template-columns:1fr 1fr}.dashboard-v19-total-card{padding:11px}.dashboard-v19-total-card strong{font-size:1rem}}
        `;
        document.head.appendChild(style);
      }

      function asegurarEstructura() {
        insertarEstilos();
        const panel = $v19('performanceDashboardPanel');
        const grid = panel?.querySelector('.dashboard-filter-grid');
        if (!panel || !grid) return;

        // Lima trabaja con una sola sede: este filtro no se muestra.
        const siteWrap = $v19('dashboardSiteWrap');
        if (siteWrap) {
          siteWrap.classList.add('hidden');
          siteWrap.style.display = 'none';
        }

        if (!$v19('dashboardTotalSummaryV19')) {
          const section = document.createElement('section');
          section.id = 'dashboardTotalSummaryV19';
          section.className = 'dashboard-v19-summary';
          section.innerHTML = `
            <div class="dashboard-v19-summary-head">
              <div>
                <h3>Resumen total</h3>
                <p class="section-subtitle">Resultado general del periodo antes de aplicar filtros.</p>
              </div>
              <span id="dashboardSummaryLoadingV112" class="dashboard-v112-summary-loading"><span class="tiny-spinner"></span>Cargando indicadores…</span>
            </div>
            <div class="dashboard-v19-summary-grid">
              <article class="dashboard-v19-total-card"><span>Cuadrillas con datos</span><strong id="dashboardTotalCrewsV19">—</strong><small>alcance del usuario</small></article>
              <article class="dashboard-v19-total-card"><span>Producción total</span><strong id="dashboardTotalPointsV19">—</strong><small id="dashboardTotalFinalizedV19">Cargando datos…</small></article>
              <article class="dashboard-v19-total-card"><span>Efectividad total</span><strong id="dashboardTotalEffectivenessV19">—</strong><small id="dashboardTotalEffectivenessHelpV19">Cargando datos…</small></article>
              <article class="dashboard-v19-total-card"><span>% Recableado total</span><strong id="dashboardTotalRecableV19">—</strong><small id="dashboardTotalRecableHelpV19">Cargando datos…</small></article>
              <article class="dashboard-v19-total-card under-construction"><span>VTR / GAR</span><strong>En construcción</strong><small>Pendiente de integrar fuente y regla de cálculo</small></article>
              <article class="dashboard-v19-total-card under-construction"><span>Tiempo de gestión / SLA</span><strong>En construcción</strong><small>Pendiente de integrar fuente y regla de cálculo</small></article>
              <article class="dashboard-v19-total-card" id="dashboardObsCardV205"><span>Observaciones</span><strong id="dashboardTotalObsV205">—</strong><small id="dashboardTotalObsHelpV205">Cargando datos…</small></article>
            </div>`;
          grid.parentNode.insertBefore(section, grid);
        }

        if (!$v19('dashboardFilterTitleV19')) {
          const title = document.createElement('div');
          title.id = 'dashboardFilterTitleV19';
          title.className = 'dashboard-v19-filter-title';
          title.innerHTML = '<strong>FILTRAR</strong>';
          grid.insertBefore(title, grid.firstChild);
        }

        const insertSelect = (id, label, options, beforeId = 'dashboardCrew') => {
          if ($v19(id)) return;
          const labelEl = document.createElement('label');
          labelEl.className = 'filter-field';
          labelEl.innerHTML = `${html(label)}<select id="${id}">${options}</select>`;
          const before = $v19(beforeId)?.closest('label');
          grid.insertBefore(labelEl, before || grid.querySelector('button') || null);
        };

        insertSelect('dashboardVisualTypeV19', 'Tipo de cuadrilla Visual', `
          <option value="">Todos</option>
          <option value="PDG">PDG</option>
          <option value="PRODUCCION">PRODUCCIÓN</option>
          <option value="PLANILLA">PLANILLA</option>
          <option value="DISPONIBILIDAD">DISPONIBILIDAD</option>`);

        insertSelect('dashboardPlatformV19', 'Plataforma WIN', `
          <option value="">Todas</option>
          <option value="SGI">SGI</option>
          <option value="SGA">SGA</option>
          <option value="TRASLADO">TRASLADO</option>
          <option value="POSTMOTOWIN">POSTMOTOWIN</option>`);

        insertSelect('dashboardCompositionV19', 'Composición', `
          <option value="">Todas</option>
          <option value="DOBLE">DOBLE · 2 técnicos</option>
          <option value="SOLO">INDIVIDUAL · 1 técnico</option>`);

        insertSelect('dashboardStateV19', 'Estado', `
          <option value="">Todos</option>
          <option value="ACTIVO">ACTIVA</option>
          <option value="SUSPENDIDA">SUSPENDIDA</option>
          <option value="BAJA">BAJA</option>`);

        const indicator = $v19('dashboardIndicator');
        if (indicator) {
          indicator.innerHTML = `
            <option value="ALL">Todos los indicadores</option>
            <option value="PRODUCCION">Producción</option>
            <option value="EFECTIVIDAD">Efectividad</option>
            <option value="RECABLEADO">% Recableado</option>
            <option value="VTR_GAR">VTR / GAR · En construcción</option>
            <option value="SLA">Tiempo de gestión / SLA</option>
            <option value="OBSERVACIONES">Observaciones</option>`;
          if (!['ALL','PRODUCCION','EFECTIVIDAD','RECABLEADO','VTR_GAR','SLA','OBSERVACIONES'].includes(indicator.value)) {
            indicator.value = 'PRODUCCION';
          }
        }

        if (!$v19('dashboardActiveFiltersV19')) {
          const chips = document.createElement('div');
          chips.id = 'dashboardActiveFiltersV19';
          chips.className = 'dashboard-v19-active-filters';
          grid.insertAdjacentElement('afterend', chips);
        }
      }

      function filtrosSeleccionados() {
        return {
          visualType: $v19('dashboardVisualTypeV19')?.value || '',
          platform: $v19('dashboardPlatformV19')?.value || '',
          composition: $v19('dashboardCompositionV19')?.value || '',
          state: $v19('dashboardStateV19')?.value || '',
          supervisor: $v19('dashboardSupervisor')?.value || '',
          crew: $v19('dashboardCrew')?.value || ''
        };
      }

      function coincide(row, filtros, ignoreCrew = false) {
        const m = metadataForRow(row);
        if (filtros.visualType && normalizarTipoVisual(m.visualType) !== filtros.visualType) return false;
        if (filtros.platform && normalizarPlataforma(m.platform, m.name) !== filtros.platform) return false;
        if (filtros.composition && normalizarComposicion(m.composition, m.technician2) !== filtros.composition) return false;
        if (filtros.state && normalizarEstado(m.state) !== filtros.state) return false;

        if (filtros.supervisor) {
          if (filtros.supervisor === '__GG__') {
            if (!m.directManagement && norm(m.supervisor) !== 'GG') return false;
          } else if (String(m.supervisorId || '') !== String(filtros.supervisor)) {
            return false;
          }
        }
        if (!ignoreCrew && filtros.crew && String(row.crewId) !== String(filtros.crew)) return false;
        return true;
      }

      function llenarSupervisores(data, reset) {
        const select = $v19('dashboardSupervisor');
        if (!select || (typeof isSupervisorSession === 'function' && isSupervisorSession())) return;
        const previous = reset ? '' : select.value;
        const map = new Map();

        (data?.filters?.supervisors || []).forEach(s => {
          if (!s?.id) return;
          const id = String(s.id);
          const name = String(s.name || s.id);
          const nameNorm = norm(name);
          const idNorm = norm(id);
          // GG es una sola opción funcional. Evita duplicar "GG" y
          // "GG · Supervisión directa de Gerencia" si ambos llegan del backend.
          if (id === '__GG__' || idNorm === 'GG' || nameNorm === 'GG' || nameNorm.includes('SUPERVISION DIRECTA')) return;
          map.set(id, name);
        });
        ESTADO.metadata.forEach(m => {
          if (m.directManagement || norm(m.supervisor) === 'GG') return;
          if (m.supervisorId) map.set(String(m.supervisorId), String(m.supervisor || m.supervisorId));
        });

        const hasGG = [...ESTADO.metadata.values()].some(m => m.directManagement || norm(m.supervisor) === 'GG');
        select.innerHTML = '<option value="">Todos los supervisores</option>' +
          [...map.entries()]
            .sort((a,b) => a[1].localeCompare(b[1], 'es'))
            .map(([id,name]) => `<option value="${html(id)}">${html(name.toUpperCase())}</option>`)
            .join('') +
          (hasGG ? '<option value="__GG__">GG · Supervisión directa de Gerencia</option>' : '');
        if ([...select.options].some(o => o.value === previous)) select.value = previous;
      }

      function llenarCuadrillas(data, reset) {
        const select = $v19('dashboardCrew');
        if (!select) return;
        const previous = reset ? '' : select.value;
        const baseFilters = { ...filtrosSeleccionados(), crew: '' };
        const unique = new Map();

        (data?.rows || []).forEach(r => {
          if (!coincide(r, baseFilters, true)) return;
          const m = metadataForRow(r);
          unique.set(String(r.crewId), String(r.crewDisplay || m.name || m.code || r.crewId));
        });

        select.innerHTML = '<option value="">Todas las cuadrillas</option>' +
          [...unique.entries()]
            .sort((a,b) => a[1].localeCompare(b[1], 'es', { numeric: true }))
            .map(([id,name]) => `<option value="${html(id)}">${html(name)}</option>`)
            .join('');

        if ([...select.options].some(o => o.value === previous)) select.value = previous;
        else select.value = '';
      }

      function pintarChips() {
        const box = $v19('dashboardActiveFiltersV19');
        if (!box) return;
        const f = filtrosSeleccionados();
        const supervisorText = f.supervisor
          ? ($v19('dashboardSupervisor')?.selectedOptions?.[0]?.textContent || '')
          : '';
        const crewText = f.crew
          ? ($v19('dashboardCrew')?.selectedOptions?.[0]?.textContent || '')
          : '';
        const chips = [
          f.visualType && `Visual: ${f.visualType}`,
          f.platform && `WIN: ${f.platform}`,
          supervisorText && `Supervisor: ${supervisorText}`,
          f.composition && `Composición: ${f.composition}`,
          f.state && `Estado: ${f.state}`,
          crewText && `Cuadrilla: ${crewText}`
        ].filter(Boolean);
        box.innerHTML = chips.length
          ? chips.map(x => `<span class="dashboard-v19-chip">${html(x)}</span>`).join('')
          : '<span class="dashboard-v19-chip">Sin filtros · total del alcance</span>';
      }

      function setResumenCargandoV112(cargando) {
        const badge = $v19('dashboardSummaryLoadingV112');
        if (badge) badge.classList.toggle('hidden', !cargando);

        if (!cargando) return;
        const crews = $v19('dashboardTotalCrewsV19');
        const points = $v19('dashboardTotalPointsV19');
        const eff = $v19('dashboardTotalEffectivenessV19');
        const rec = $v19('dashboardTotalRecableV19');
        if (crews) crews.textContent = '—';
        if (points) points.textContent = '—';
        if (eff) eff.textContent = '—';
        if (rec) rec.textContent = '—';
        if ($v19('dashboardTotalFinalizedV19')) $v19('dashboardTotalFinalizedV19').textContent = 'Cargando datos…';
        if ($v19('dashboardTotalEffectivenessHelpV19')) $v19('dashboardTotalEffectivenessHelpV19').textContent = 'Cargando datos…';
        if ($v19('dashboardTotalRecableHelpV19')) $v19('dashboardTotalRecableHelpV19').textContent = 'Cargando datos…';
      }

      function ratioOrNull(num, den) {
        num = Number(num); den = Number(den);
        if (!Number.isFinite(num) || !Number.isFinite(den) || den <= 0) return null;
        return num / den;
      }

      function promedio(values) {
        const valid = values.map(Number).filter(Number.isFinite);
        return valid.length ? valid.reduce((a,b)=>a+b,0) / valid.length : null;
      }

      function valorPorcentaje(v) {
        return v === null || v === undefined || !Number.isFinite(Number(v))
          ? '—'
          : `${(Number(v) * 100).toFixed(1)}%`;
      }

      function resumenDeAll(data) {
        const rows = data?.rows || [];
        const s = data?.summary || data?.resumen || {};
        const points = Number(pick(s, 'points', 'totalPoints', 'productionPoints')) ||
          rows.reduce((acc,r) => acc + (Number(r.points) || 0), 0);
        const finalized = Number(pick(s, 'finalized', 'totalFinalized')) ||
          rows.reduce((acc,r) => acc + (Number(r.finalized) || 0), 0);

        const finalizadasRows = rows.reduce((a,r)=>a+(Number(r.finalized)||0),0);
        const totalGeneralRows = rows.reduce((a,r)=>a+(Number(pick(r,'totalGeneral','total','ordersTotal'))||0),0);
        const weightedEff = ratioOrNull(finalizadasRows, totalGeneralRows);
        const effectivenessRaw = pick(s, 'effectiveness', 'efectividad');
        const effectiveness = effectivenessRaw !== ''
          ? Number(effectivenessRaw)
          : (weightedEff ?? promedio(rows.map(r => r.effectiveness)));

        const recablesRows = rows.reduce((a,r)=>a+(Number(r.recables)||0),0);
        const losRows = rows.reduce((a,r)=>a+(Number(r.losRojo)||0),0);
        const weightedRec = ratioOrNull(recablesRows, losRows);
        const recRaw = pick(s, 'recablePercent', 'recableado');
        const recablePercent = recRaw !== ''
          ? Number(recRaw)
          : (weightedRec ?? promedio(rows.map(r => r.recablePercent)));

        return {
          crews: Number(pick(s, 'crews', 'totalCrews')) || rows.length,
          points,
          finalized,
          effectiveness,
          recablePercent,
          effectivenessWeighted: effectivenessRaw !== '' || weightedEff !== null,
          recableWeighted: recRaw !== '' || weightedRec !== null,
          recables: recablesRows,
          losRojo: losRows
        };
      }

      async function cargarResumenTotal(period) {
        const key = `${period}|${typeof isSupervisorSession === 'function' && isSupervisorSession() ? 'SUP' : 'ALL'}`;
        let data = ESTADO.totalCache.get(key);
        if (!data) {
          data = await api('performanceDashboard', {
            token: token(),
            period,
            indicator: 'ALL',
            site: (typeof isSupervisorSession === 'function' && isSupervisorSession()) ? '' : ($v19('dashboardSite')?.value || 'LIMA'),
            supervisorId: '',
            crewId: ''
          });
          if (data?.ok) ESTADO.totalCache.set(key, data);
        }
        if (!data?.ok) return;
        await enriquecerMetadata(data);
        const r = resumenDeAll(data);
        $v19('dashboardTotalCrewsV19').textContent = String(r.crews || 0);
        $v19('dashboardTotalPointsV19').textContent = `${Number(r.points || 0).toFixed(2)} pts`;
        $v19('dashboardTotalFinalizedV19').textContent = r.finalized ? `${r.finalized} órdenes finalizadas` : 'Producción del periodo';
        $v19('dashboardTotalEffectivenessV19').textContent = valorPorcentaje(r.effectiveness);
        $v19('dashboardTotalRecableV19').textContent = valorPorcentaje(r.recablePercent);
        $v19('dashboardTotalEffectivenessHelpV19').textContent = r.effectivenessWeighted ? 'Resultado total del periodo' : 'Promedio de cuadrillas con datos';
        $v19('dashboardTotalRecableHelpV19').textContent = r.recableWeighted
          ? (r.losRojo ? `${r.losRojo} LOS ROJO · ${r.recables} recableados` : 'Resultado total del periodo')
          : 'Promedio de cuadrillas con datos';
      }

      function valueFor(row, indicator) {
        if (indicator === 'PRODUCCION') return Number(row.points ?? row.value ?? 0);
        if (indicator === 'EFECTIVIDAD') return row.effectiveness ?? row.value;
        if (indicator === 'RECABLEADO') return row.recablePercent ?? row.value;
        if (indicator === 'SLA') return row.slaPercent ?? row.value;
        if (indicator === 'OBSERVACIONES') return row.observationsCount ?? row.value ?? 0;
        return row.value;
      }

      function indicadorTieneDato(row, indicator) {
        if (indicator === 'PRODUCCION') {
          const points = Number(row.points ?? row.value);
          return Number.isFinite(points);
        }
        if (indicator === 'EFECTIVIDAD') {
          const total = Number(pick(row, 'totalGeneral', 'total', 'ordersTotal'));
          const value = Number(row.effectiveness ?? row.value);
          return Number.isFinite(value) && total > 0;
        }
        if (indicator === 'RECABLEADO') {
          const los = Number(row.losRojo);
          const value = Number(row.recablePercent ?? row.value);
          return Number.isFinite(value) && los > 0;
        }
        if (indicator === 'SLA') {
          const evaluables = Number(row.slaEvaluables || 0);
          const value = Number(row.slaPercent ?? row.value);
          return Number.isFinite(value) && evaluables > 0;
        }
        if (indicator === 'OBSERVACIONES') {
          return Number.isFinite(Number(row.observationsCount ?? row.value ?? 0));
        }
        return Number.isFinite(Number(valueFor(row, indicator)));
      }

      function ordenarRows(rows, indicator) {
        return [...rows].sort((a,b) => {
          const aHas = indicadorTieneDato(a, indicator);
          const bHas = indicadorTieneDato(b, indicator);

          // Una cuadrilla sin dato válido siempre va después de las que sí tienen dato.
          if (aHas !== bHas) return aHas ? -1 : 1;

          const av = Number(valueFor(a, indicator));
          const bv = Number(valueFor(b, indicator));

          if (aHas && bHas && av !== bv) {
            // Producción y Efectividad: mayor resultado primero.
            if (indicator === 'PRODUCCION' || indicator === 'EFECTIVIDAD' || indicator === 'SLA') return bv - av;
            // Recableado y Observaciones son indicadores negativos: menor resultado primero.
            if (indicator === 'RECABLEADO' || indicator === 'OBSERVACIONES') return av - bv;
          }

          // Desempate por producción finalizada y luego por nombre de cuadrilla.
          const af = Number(a.finalized || 0);
          const bf = Number(b.finalized || 0);
          if (af !== bf) return bf - af;
          return String(a.crewDisplay || '').localeCompare(String(b.crewDisplay || ''), 'es', { numeric: true });
        });
      }

      function mostrarRankingPendiente() {
        const title = $v19('dashboardRankingTitle');
        const help = $v19('dashboardRankingHelp');
        const construction = $v19('dashboardConstruction');
        const list = $v19('dashboardRankingList');

        if (title) title.textContent = 'Ranking';
        if (help) help.textContent = 'Selecciona los filtros y presiona Aplicar para mostrar las cuadrillas.';
        construction?.classList.add('hidden');
        if (list) {
          list.innerHTML = '<p class="empty">Los resultados aparecerán cuando presiones Aplicar.</p>';
        }
        $v19('dashboardCrewDetail')?.classList.add('hidden');
      }

      function renderRanking(data) {
        const indicator = $v19('dashboardIndicator')?.value || 'PRODUCCION';
        const labels = {
          ALL: { label: 'Todos los indicadores', help: 'Resumen de indicadores por cuadrilla.', construction: false },
          PRODUCCION: { label: 'Producción', help: 'Mayor puntaje primero.', construction: false },
          EFECTIVIDAD: { label: 'Efectividad', help: 'Mejor efectividad primero.', construction: false },
          RECABLEADO: { label: '% Recableado', help: 'Menor porcentaje primero.', construction: false },
          VTR_GAR: { label: 'VTR / GAR', help: 'Indicador considerado para una siguiente etapa.', construction: true },
          SLA: { label: 'Tiempo de gestión / SLA', help: 'Mayor cumplimiento SLA primero.', construction: false },
          OBSERVACIONES: { label: 'Observaciones', help: 'Menor cantidad de observaciones primero.', construction: false }
        };
        const meta = labels[indicator] || labels.PRODUCCION;
        const list = $v19('dashboardRankingList');
        const construction = $v19('dashboardConstruction');

        if (meta.construction) {
          $v19('dashboardRankingTitle').textContent = `${meta.label} · En construcción`;
          $v19('dashboardRankingHelp').textContent = 'Este indicador ya está contemplado, pero todavía no participa en el ranking.';
          if (construction) {
            construction.textContent = `${meta.label}: En construcción. Se habilitará cuando integremos su fuente y regla de cálculo.`;
            construction.classList.remove('hidden');
          }
          if (list) list.innerHTML = '';
          $v19('dashboardCrewDetail')?.classList.add('hidden');
          return;
        }

        const f = filtrosSeleccionados();
        let rows = (data?.rows || []).filter(r => coincide(r, f));

        if (indicator === 'ALL') {
          $v19('dashboardRankingTitle').textContent = 'Resumen por cuadrilla';
          $v19('dashboardRankingHelp').textContent =
            `${rows.length} cuadrilla${rows.length === 1 ? '' : 's'} en el filtro seleccionado.`;
          construction?.classList.add('hidden');

          if (!rows.length) {
            list.innerHTML = '<p class="empty">No hay cuadrillas con esta combinación de filtros.</p>';
            return;
          }

          list.innerHTML = rows.map(r => {
            const m = metadataForRow(r);
            const eff = r.effectiveness == null || r.effectiveness === ''
              ? '—'
              : `${(Number(r.effectiveness) * 100).toFixed(1)}%`;
            const rec = r.recablePercent == null || r.recablePercent === ''
              ? '—'
              : `${(Number(r.recablePercent) * 100).toFixed(1)}%`;
            const sup = m.directManagement || norm(m.supervisor) === 'GG'
              ? 'GG'
              : (m.supervisor || r.supervisor || '');
            const pills = [m.visualType, m.platform, sup, m.composition, m.state].filter(Boolean);

            return `
              <button type="button" class="dashboard-all-card" data-dashboard-crew="${html(r.crewId)}">
                <div class="dashboard-all-head">
                  <div>
                    <strong>${html(r.crewDisplay || m.name || m.code || '')}</strong>
                    <small>${html(sup)}</small>
                  </div>
                  <span class="module-arrow">›</span>
                </div>
                <div class="dashboard-kpi-mini-grid">
                  <div><span>Producción</span><b>${Number(r.points || 0).toFixed(2)} pts</b></div>
                  <div><span>Efectividad</span><b>${html(eff)}</b></div>
                  <div><span>% Recableado</span><b>${html(rec)}</b></div>
                  <div class="kpi-building"><span>VTR / GAR</span><b>En construcción</b></div>
                  <div class="kpi-building"><span>SLA</span><b>En construcción</b></div>
                  <div><span>Observaciones</span><b>${Number(r.observationsCount || 0)} obs.</b></div>
                </div>
                <div class="dashboard-v19-rank-meta">
                  ${pills.map(p => `<span class="dashboard-v19-meta-pill ${norm(p)==='GG'?'gg':''}">${html(p)}</span>`).join('')}
                </div>
              </button>`;
          }).join('');
          return;
        }

        rows = ordenarRows(rows, indicator);

        $v19('dashboardRankingTitle').textContent = `Ranking de ${meta.label}`;
        $v19('dashboardRankingHelp').textContent = `${meta.help} ${rows.length} cuadrilla${rows.length === 1 ? '' : 's'} en el filtro.`;
        construction?.classList.add('hidden');
        if (!rows.length) {
          list.innerHTML = '<p class="empty">No hay cuadrillas con esta combinación de filtros.</p>';
          return;
        }

        list.innerHTML = rows.map((r, idx) => {
          const m = metadataForRow(r);
          const value = valueFor(r, indicator);
          const valueText = indicator === 'PRODUCCION'
            ? `${Number(value || 0).toFixed(2)} pts`
            : (indicator === 'OBSERVACIONES'
                ? `${Number(value || 0)} obs.`
                : valorPorcentaje(value == null || value === '' ? null : Number(value)));
          let detail = '';
          if (indicator === 'PRODUCCION') detail = `${Number(r.finalized || 0)} finalizadas`;
          if (indicator === 'EFECTIVIDAD') {
            const total = Number(pick(r,'totalGeneral','total','ordersTotal')) || 0;
            detail = total ? `${Number(r.finalized || 0)} finalizadas de ${total}` : '';
          }
          if (indicator === 'RECABLEADO') detail = `${Number(r.losRojo || 0)} LOS ROJO · ${Number(r.recables || 0)} recableados`;
          if (indicator === 'OBSERVACIONES') detail = `${Number(r.observationsActive || 0)} activas · S/ ${Number(r.observationsImpact || 0).toFixed(2)} impacto`;
          const sup = m.directManagement || norm(m.supervisor) === 'GG' ? 'GG' : (m.supervisor || r.supervisor || '');
          const pills = [m.visualType, m.platform, sup, m.composition, m.state].filter(Boolean);

          return `
            <button type="button" class="dashboard-rank-row dashboard-rank-button" data-dashboard-crew="${html(r.crewId)}">
              <div class="dashboard-rank-position">#${idx + 1}</div>
              <div class="dashboard-rank-copy">
                <strong>${html(r.crewDisplay || m.name || m.code || '')}</strong>
                ${detail ? `<small>${html(detail)}</small>` : ''}
                <div class="dashboard-v19-rank-meta">
                  ${pills.map(p => `<span class="dashboard-v19-meta-pill ${norm(p)==='GG'?'gg':''}">${html(p)}</span>`).join('')}
                </div>
              </div>
              <div class="dashboard-rank-value">${html(valueText)}</div>
            </button>`;
        }).join('');
      }

      async function loadDashboardV19(resetFilters = false) {
        asegurarEstructura();
        const loading = $v19('dashboardLoading');
        loading?.classList.remove('hidden');
        setResumenCargandoV112(true);
        const shouldRenderRanking = !resetFilters && ESTADO.applyRequested;

        if (resetFilters) {
          if ($v19('dashboardSite')) $v19('dashboardSite').value = 'LIMA';
          if ($v19('dashboardSupervisor')) $v19('dashboardSupervisor').value = '';
          if ($v19('dashboardCrew')) $v19('dashboardCrew').value = '';
          if ($v19('dashboardIndicator')) $v19('dashboardIndicator').value = 'PRODUCCION';
          ['dashboardVisualTypeV19','dashboardPlatformV19','dashboardCompositionV19','dashboardStateV19'].forEach(id => {
            if ($v19(id)) $v19(id).value = '';
          });
        }

        const period = $v19('dashboardPeriod')?.value || '2026-08';
        try {
          const indicator = $v19('dashboardIndicator')?.value || 'PRODUCCION';
          const data = await api('performanceDashboard', {
            token: token(),
            period,
            indicator,
            site: (typeof isSupervisorSession === 'function' && isSupervisorSession()) ? '' : ($v19('dashboardSite')?.value || 'LIMA'),
            // V1.9 trae todo el alcance autorizado y mezcla filtros en el navegador.
            supervisorId: '',
            crewId: ''
          });

          if (!data?.ok) {
            if (data?.expired && typeof clearSession === 'function') return clearSession();
            throw new Error(data?.error || 'No se pudo cargar el Dashboard.');
          }

          ESTADO.lastData = data;
          await enriquecerMetadata(data);
          llenarSupervisores(data, resetFilters);
          llenarCuadrillas(data, resetFilters);
          pintarChips();
          await cargarResumenTotal(period);
          setResumenCargandoV112(false);

          if (shouldRenderRanking) {
            renderRanking(data);
            const selectedCrew = $v19('dashboardCrew')?.value || '';
            const selectedIndicator = $v19('dashboardIndicator')?.value || 'PRODUCCION';
            const constructionIndicator = ['VTR_GAR','SLA','OBSERVACIONES'].includes(selectedIndicator);
            if (selectedCrew && !constructionIndicator && typeof loadDashboardCrewDetail === 'function') {
              await loadDashboardCrewDetail(selectedCrew);
            } else {
              $v19('dashboardCrewDetail')?.classList.add('hidden');
            }
          } else {
            mostrarRankingPendiente();
          }

          ESTADO.applyRequested = false;
        } catch (err) {
          setResumenCargandoV112(false);
          const list = $v19('dashboardRankingList');
          if (list) list.innerHTML = `<p class="empty">${html(err.message || 'No se pudo cargar el Dashboard.')}</p>`;
          $v19('dashboardCrewDetail')?.classList.add('hidden');
        } finally {
          loading?.classList.add('hidden');
        }
      }

      async function openDashboardV19() {
        asegurarEstructura();
        if ($v19('dashboardPeriod') && !$v19('dashboardPeriod').value) $v19('dashboardPeriod').value = '2026-08';
        if ($v19('dashboardSiteWrap')) {
          $v19('dashboardSiteWrap').classList.add('hidden');
          $v19('dashboardSiteWrap').style.display = 'none';
        }
        if ($v19('dashboardSupervisorWrap') && typeof isSupervisorSession === 'function') {
          $v19('dashboardSupervisorWrap').classList.toggle('hidden', isSupervisorSession());
        }
        await loadDashboardV19(true);
      }

      // Sustituye solo las dos funciones del Dashboard. El resto de V1.8 queda intacto.
      try { window.loadPerformanceDashboard = loadDashboardV19; } catch (_) {}
      try { window.openPerformanceDashboard = openDashboardV19; } catch (_) {}
      try { loadPerformanceDashboard = loadDashboardV19; } catch (_) {}
      try { openPerformanceDashboard = openDashboardV19; } catch (_) {}

      asegurarEstructura();

      const onFilterChanged = () => {
        if (ESTADO.lastData) llenarCuadrillas(ESTADO.lastData, false);
        pintarChips();
        mostrarRankingPendiente();
      };

      // Los filtros solo preparan la selección. Las cuadrillas se muestran al presionar Aplicar.
      ['dashboardVisualTypeV19','dashboardPlatformV19','dashboardCompositionV19','dashboardStateV19',
       'dashboardSupervisor','dashboardCrew','dashboardIndicator']
        .forEach(id => {
          const el = $v19(id);
          if (!el) return;
          el.addEventListener('change', (event) => {
            event.stopImmediatePropagation();
            onFilterChanged();
          }, { capture: true });
        });

      $v19('dashboardPeriod')?.addEventListener('change', (event) => {
        event.stopImmediatePropagation();
        ESTADO.totalCache.clear();
        mostrarRankingPendiente();
      }, { capture: true });

      // Aplicar habilita una sola actualización y recién entonces pinta el ranking.
      $v19('refreshDashboardButton')?.addEventListener('click', () => {
        ESTADO.applyRequested = true;
      }, { capture: true });

      console.info('[MI VISUAL LIMA] Dashboard V1.12 cargado: loader compacto + estado de carga de indicadores.');
    } catch (err) {
      console.error('[MI VISUAL LIMA V1.12] Error al iniciar la mejora del Dashboard:', err);
    }
  }
})();


/* =========================
   V1.15 - CAPA INDICADORES + OPTIMIZACION
   ========================= */

/**
 * MI VISUAL LIMA - Frontend V1.15 (actualización incremental)
 *
 * Mantiene intacta la V1.12 publicada y agrega:
 * - Inicio más limpio y módulos más visibles.
 * - Botón PONER INDICADORES solo para Gerencia y Administrador.
 * - Metas y semáforos por Tipo de Cuadrilla Visual.
 * - Semáforos Crítico / Moderado / Óptimo para Producción, Efectividad y Recableado.
 */

(() => {
  const STATE = {
    config: null,
    configVisualType: 'TODOS',
    configByVisualType: new Map(),
    dashboards: new Map(),
    dashboardFastCache: new Map(),
    dashboardCacheTtlMs: 120000,
    apiWrapped: false,
    initialized: false
  };

  const norm113 = (value) => String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();

  const esc113 = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  function sessionSafe113() {
    try {
      return typeof sessionData !== 'undefined' ? sessionData : null;
    } catch (_) {
      return null;
    }
  }

  function tokenSafe113() {
    try {
      return typeof token === 'function' ? token() : '';
    } catch (_) {
      return '';
    }
  }

  function profile113() {
    return norm113(sessionSafe113()?.user?.profile || '');
  }

  function canEditIndicators113() {
    const p = profile113();
    return p === 'GERENCIA' || p === 'ADMINISTRADOR';
  }

  function installStyles113() {
    if (document.getElementById('mvlV113Styles')) return;

    const style = document.createElement('style');
    style.id = 'mvlV113Styles';
    style.textContent = `
      /* INICIO SIMPLIFICADO */
      #homeView .summary,
      #homeView #ggNotice {
        display: none !important;
      }

      #homeView .section-title {
        margin-top: 22px !important;
        margin-bottom: 12px !important;
      }

      #homeView .section-title .section-subtitle {
        display: none !important;
      }

      #homeView #moduleList.module-grid {
        gap: 14px !important;
      }

      #homeView .module-card {
        min-height: 104px !important;
        padding: 18px !important;
        border-radius: 18px !important;
        border: 1px solid #d7e4f4 !important;
        box-shadow: 0 8px 22px rgba(16,55,98,.07) !important;
        background: #ffffff !important;
        transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease !important;
      }

      #homeView .module-card.module-active {
        border-color: #b9d7fb !important;
        box-shadow: 0 10px 28px rgba(7,88,183,.11) !important;
      }

      #homeView .module-card.module-active:hover {
        transform: translateY(-1px);
        border-color: #75afea !important;
      }

      #homeView .module-card:disabled {
        opacity: .72 !important;
        background: #f8fafc !important;
        box-shadow: none !important;
      }

      #homeView .module-icon {
        width: 58px !important;
        height: 58px !important;
        min-width: 58px !important;
        border-radius: 16px !important;
        font-size: 1.35rem !important;
      }

      #homeView .module-copy strong {
        font-size: 1.02rem !important;
        line-height: 1.2 !important;
      }

      #homeView .module-copy small {
        margin-top: 5px !important;
        font-size: .78rem !important;
      }

      #homeView .module-arrow {
        font-size: 1.45rem !important;
      }

      /* PONER INDICADORES */
      .mvl-v113-config-button {
        border: 1px solid #b8d6fb;
        background: #eef6ff;
        color: #0758b7;
        border-radius: 11px;
        padding: 9px 12px;
        font-weight: 800;
        font-size: .76rem;
        cursor: pointer;
        white-space: nowrap;
      }

      .mvl-v113-config-button:hover {
        background: #e3f0ff;
      }

      .mvl-v113-summary-actions {
        display: inline-flex;
        align-items: center;
        justify-content: flex-end;
        gap: 8px;
        flex-wrap: wrap;
      }

      .mvl-v113-status {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        margin-top: 8px;
        border-radius: 999px;
        padding: 5px 8px;
        font-size: .68rem;
        font-weight: 900;
        line-height: 1;
        border: 1px solid transparent;
        width: fit-content;
      }

      .mvl-v113-status::before {
        content: '';
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: currentColor;
      }

      .mvl-v113-status.cumple {
        color: #147a3b;
        background: #edf9f1;
        border-color: #bfe8cc;
      }

      .mvl-v113-status.atencion {
        color: #a45a00;
        background: #fff7e8;
        border-color: #f1d5a2;
      }

      .mvl-v113-status.critico {
        color: #b42318;
        background: #fff1f0;
        border-color: #f4c7c3;
      }

      .mvl-v113-status.sin-dato {
        color: #667085;
        background: #f5f7fa;
        border-color: #e2e8f0;
      }

      .mvl-v113-rank-extra {
        display: block;
        margin-top: 5px;
        color: #687386;
        font-size: .70rem;
        font-weight: 600;
      }

      #dashboardRankingList .dashboard-rank-value {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 2px;
      }

      #dashboardRankingList .dashboard-rank-value .mvl-v113-status {
        margin-left: auto;
      }

      /* MODAL */
      .mvl-v113-modal {
        position: fixed;
        inset: 0;
        z-index: 10050;
        background: rgba(15,36,66,.46);
        display: grid;
        place-items: center;
        padding: 18px;
      }

      .mvl-v113-modal.hidden {
        display: none !important;
      }

      .mvl-v113-modal-card {
        width: min(680px, 100%);
        max-height: min(86vh, 760px);
        overflow: auto;
        background: #ffffff;
        border-radius: 20px;
        border: 1px solid #d9e4f1;
        box-shadow: 0 24px 70px rgba(12,36,70,.25);
        padding: 20px;
      }

      .mvl-v113-modal-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 14px;
        margin-bottom: 16px;
      }

      .mvl-v113-modal-head h3 {
        margin: 0 0 4px;
        font-size: 1.18rem;
      }

      .mvl-v113-modal-head p {
        margin: 0;
        color: #687386;
        font-size: .80rem;
      }

      .mvl-v113-close {
        border: 0;
        background: #eef3f8;
        color: #18385e;
        width: 34px;
        height: 34px;
        border-radius: 10px;
        font-size: 1.2rem;
        cursor: pointer;
      }

      .mvl-v113-config-section {
        border: 1px solid #dce6f2;
        border-radius: 16px;
        padding: 15px;
        margin-top: 12px;
      }

      .mvl-v113-config-section h4 {
        margin: 0 0 10px;
        color: #0b3f79;
      }

      .mvl-v113-config-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0,1fr));
        gap: 11px;
      }

      .mvl-v113-field {
        display: flex;
        flex-direction: column;
        gap: 5px;
        font-size: .75rem;
        color: #48576a;
        font-weight: 700;
      }

      .mvl-v113-field input {
        width: 100%;
        min-height: 42px;
        border: 1px solid #cfdbe9;
        border-radius: 10px;
        padding: 9px 10px;
        font: inherit;
        color: #10213d;
        background: #fff;
      }

      .mvl-v113-construction-list {
        display: grid;
        gap: 7px;
      }

      .mvl-v113-construction-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        border-radius: 10px;
        background: #f7f9fc;
        padding: 9px 10px;
        color: #526174;
        font-size: .76rem;
      }

      .mvl-v113-construction-item strong {
        color: #7a8595;
        font-size: .69rem;
      }

      .mvl-v113-modal-message {
        min-height: 18px;
        margin-top: 10px;
        font-size: .76rem;
        font-weight: 700;
      }

      .mvl-v113-modal-message.error { color: #b42318; }
      .mvl-v113-modal-message.ok { color: #147a3b; }

      .mvl-v113-modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 9px;
        margin-top: 14px;
      }

      .mvl-v113-secondary,
      .mvl-v113-primary {
        min-height: 42px;
        border-radius: 11px;
        padding: 9px 14px;
        font-weight: 800;
        cursor: pointer;
      }

      .mvl-v113-secondary {
        background: #fff;
        color: #30445f;
        border: 1px solid #ced9e7;
      }

      .mvl-v113-primary {
        background: #0758b7;
        color: #fff;
        border: 1px solid #0758b7;
      }

      .mvl-v113-primary:disabled {
        opacity: .55;
        cursor: wait;
      }

      .mvl-v114-scope {
        border: 1px solid #b9d4f5;
        background: #f5f9ff;
        border-radius: 14px;
        padding: 12px;
        margin-bottom: 12px;
      }
      .mvl-v114-scope label { display:flex; flex-direction:column; gap:6px; font-size:.75rem; font-weight:800; color:#294563; }
      .mvl-v114-scope select { min-height:42px; border:1px solid #c7d7e9; border-radius:10px; padding:8px 10px; background:#fff; font:inherit; color:#10213d; }
      .mvl-v114-source { margin-top:7px; font-size:.70rem; color:#607086; font-weight:700; }
      .mvl-v114-levels { display:grid; gap:7px; margin-top:10px; }
      .mvl-v114-level { display:grid; grid-template-columns:118px minmax(0,1fr) auto; gap:8px; align-items:center; border-radius:10px; padding:8px 10px; font-size:.73rem; }
      .mvl-v117-range { white-space:nowrap; font-size:.72rem; font-weight:900; padding:4px 7px; border-radius:999px; background:rgba(255,255,255,.68); border:1px solid currentColor; }
      .mvl-v114-level strong { font-size:.72rem; }
      .mvl-v114-level.red { background:#fff1f0; color:#a32118; }
      .mvl-v114-level.yellow { background:#fff8e8; color:#925400; }
      .mvl-v114-level.green { background:#eef9f1; color:#14723a; }
      .mvl-v114-pending { color:#758297; font-size:.72rem; margin-top:8px; }
      .mvl-v114-inherit { margin-right:auto; }
      .mvl-v114-field-note { font-size:.67rem; font-weight:600; color:#7a8799; }

      @media (max-width: 680px) {
        #homeView #moduleList.module-grid {
          grid-template-columns: 1fr !important;
        }

        .dashboard-v19-summary-head {
          align-items: flex-start !important;
          flex-direction: column !important;
        }

        .mvl-v113-summary-actions {
          width: 100%;
          justify-content: space-between;
        }

        .mvl-v113-config-grid {
          grid-template-columns: 1fr;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function improveModuleCards113() {
    const list = document.getElementById('moduleList');
    if (!list) return;

    list.querySelectorAll('.module-card').forEach(card => {
      const small = card.querySelector('.module-copy small');
      if (card.disabled && small && norm113(small.textContent) === 'PROXIMA ETAPA') {
        small.textContent = 'En construcción';
      }
    });
  }

  function watchModuleCards113() {
    const list = document.getElementById('moduleList');
    if (!list || list.dataset.v113Observed === '1') return;

    list.dataset.v113Observed = '1';
    improveModuleCards113();

    new MutationObserver(() => improveModuleCards113())
      .observe(list, { childList: true, subtree: true });
  }

  function statusInfo113(status) {
    const s = norm113(status);
    if (s === 'CUMPLE' || s === 'OPTIMO') return { cls: 'cumple', label: 'Óptimo' };
    if (s === 'ATENCION' || s === 'MODERADO') return { cls: 'atencion', label: 'Moderado' };
    if (s === 'CRITICO') return { cls: 'critico', label: 'Crítico' };
    return { cls: 'sin-dato', label: 'Sin dato' };
  }

  function setStatusBadge113(container, status, detail = '') {
    if (!container) return;

    const info = statusInfo113(status);
    let badge = container.querySelector(':scope > .mvl-v113-status');

    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'mvl-v113-status';
      container.appendChild(badge);
    }

    const nextClass = `mvl-v113-status ${info.cls}`;
    if (badge.className !== nextClass) badge.className = nextClass;

    const text = detail ? `${info.label} · ${detail}` : info.label;
    if (badge.textContent !== text) badge.textContent = text;
  }

  function selectedIndicator113() {
    return document.getElementById('dashboardIndicator')?.value || 'PRODUCCION';
  }

  function bestDashboard113() {
    return STATE.dashboards.get('ALL') ||
      STATE.dashboards.get(selectedIndicator113()) ||
      [...STATE.dashboards.values()].at(-1) ||
      null;
  }

  function enhanceSummary113() {
    const data = bestDashboard113();
    if (!data?.ok) return;

    const summary = data.summary || {};
    const productionValue = document.getElementById('dashboardTotalPointsV19');
    const effectivenessValue = document.getElementById('dashboardTotalEffectivenessV19');
    const recableValue = document.getElementById('dashboardTotalRecableV19');

    if (productionValue?.closest('article')) {
      const ratio = Number(summary.productionRatio);
      const ratioText = Number.isFinite(ratio)
        ? `${(ratio * 100).toFixed(0)}% de meta`
        : '';
      setStatusBadge113(
        productionValue.closest('article'),
        summary.productionStatus,
        ratioText
      );
    }

    if (effectivenessValue?.closest('article')) {
      setStatusBadge113(effectivenessValue.closest('article'), summary.effectivenessStatus);
    }

    if (recableValue?.closest('article')) {
      const status = summary.recableadoStatus || '';
      if (status) setStatusBadge113(recableValue.closest('article'), status);
      else recableValue.closest('article')?.querySelector(':scope > .mvl-v113-status')?.remove();
    }
  }

  function enhanceRanking113() {
    const data = bestDashboard113();
    if (!data?.ok) return;

    const indicator = selectedIndicator113();
    if (!['PRODUCCION','EFECTIVIDAD','RECABLEADO'].includes(indicator)) return;

    const byCrew = new Map((data.rows || []).map(row => [String(row.crewId || ''), row]));

    document.querySelectorAll('#dashboardRankingList [data-dashboard-crew]').forEach(button => {
      const row = byCrew.get(String(button.dataset.dashboardCrew || ''));
      if (!row) return;

      const copy = button.querySelector('.dashboard-rank-copy');
      const value = button.querySelector('.dashboard-rank-value');
      if (!copy || !value) return;

      let extra = copy.querySelector('.mvl-v113-rank-extra');
      if (!extra) {
        extra = document.createElement('span');
        extra.className = 'mvl-v113-rank-extra';
        const meta = copy.querySelector('.dashboard-v19-rank-meta');
        if (meta) copy.insertBefore(extra, meta);
        else copy.appendChild(extra);
      }

      if (indicator === 'PRODUCCION') {
        const avg = Number(row.productionDailyAverage);
        const target = Number(row.productionDailyTarget);
        const days = Number(row.productionDays || 0);
        const text = Number.isFinite(avg) && days > 0
          ? `${avg.toFixed(2)} pts/día · Meta ${target.toFixed(target % 1 ? 1 : 0)} pts/día · ${row.visualType || 'GENERAL'}`
          : 'Sin promedio diario disponible';
        if (extra.textContent !== text) extra.textContent = text;
        setStatusBadge113(value, row.productionStatus);
      } else if (indicator === 'EFECTIVIDAD') {
        const eff = Number(row.effectiveness);
        const text = Number.isFinite(eff)
          ? `Efectividad ${(eff * 100).toFixed(1)}% · ${row.visualType || 'GENERAL'}`
          : 'Sin efectividad disponible';
        if (extra.textContent !== text) extra.textContent = text;
        setStatusBadge113(value, row.effectivenessStatus);
      } else {
        const rec = Number(row.recablePercent);
        const text = Number.isFinite(rec)
          ? `% Recableado ${(rec * 100).toFixed(1)}% · ${row.visualType || 'GENERAL'}`
          : 'Sin recableado disponible';
        if (extra.textContent !== text) extra.textContent = text;
        if (row.recableadoStatus) setStatusBadge113(value, row.recableadoStatus);
        else value.querySelector(':scope > .mvl-v113-status')?.remove();
      }
    });
  }

  function refreshSemaphores113() {
    window.setTimeout(() => {
      enhanceSummary113();
      enhanceRanking113();
    }, 0);
  }

  function installConfigTabsStyles123() {
    if (document.getElementById('mvlV123ConfigTabsStyles')) return;

    const style = document.createElement('style');
    style.id = 'mvlV123ConfigTabsStyles';
    style.textContent = `
      #indicatorConfigModalV113 .mvl-v123-tabs{
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:7px;
        margin:10px 0 13px;
        padding:4px;
        border-radius:12px;
        background:#f1f5f9;
      }
      #indicatorConfigModalV113 .mvl-v123-tab{
        min-height:38px;
        padding:8px 10px;
        border-radius:9px;
        background:transparent;
        color:#53657b;
        font-size:.72rem;
        font-weight:850;
      }
      #indicatorConfigModalV113 .mvl-v123-tab.active{
        background:#fff;
        color:#0758b7;
        box-shadow:0 2px 8px rgba(15,52,95,.09);
      }
      #indicatorConfigModalV113 .mvl-v123-panel.hidden{
        display:none !important;
      }
      #indicatorConfigModalV113 .mvl-v123-goals-help{
        margin:8px 0 0;
        padding:8px 10px;
        border:1px solid #d9e8f8;
        border-radius:10px;
        background:#f7fbff;
        color:#526b85;
        font-size:.67rem;
        line-height:1.35;
      }
      #indicatorConfigModalV113 .mvl-v123-panel .mvl-v113-config-section{
        margin-top:10px !important;
      }
      @media(max-width:480px){
        #indicatorConfigModalV113 .mvl-v123-tabs{
          grid-template-columns:1fr;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function showConfigTab123(tab = 'metas') {
    const modal = document.getElementById('indicatorConfigModalV113');
    if (!modal) return;

    const selected = tab === 'indicadores' ? 'indicadores' : 'metas';
    modal.querySelectorAll('[data-v123-tab]').forEach(button => {
      button.classList.toggle('active', button.dataset.v123Tab === selected);
    });

    modal.querySelector('#cfgGoalsPanelV123')?.classList.toggle('hidden', selected !== 'metas');
    modal.querySelector('#cfgIndicatorsPanelV123')?.classList.toggle('hidden', selected !== 'indicadores');
  }

  function setupConfigTabs123(modal) {
    if (!modal || modal.dataset.v123Tabs === '1') return;
    installConfigTabsStyles123();

    const scope = modal.querySelector('.mvl-v114-scope');
    const sections = [...modal.querySelectorAll('.mvl-v113-config-section')];
    const actions = modal.querySelector('.mvl-v113-modal-actions');
    const message = modal.querySelector('#indicatorConfigMessageV113');
    if (!scope || !sections.length || !actions) return;

    const tabs = document.createElement('div');
    tabs.className = 'mvl-v123-tabs';
    tabs.innerHTML = `
      <button type="button" class="mvl-v123-tab active" data-v123-tab="metas">METAS</button>
      <button type="button" class="mvl-v123-tab" data-v123-tab="indicadores">SEMÁFOROS / INDICADORES</button>
    `;

    const goals = document.createElement('div');
    goals.id = 'cfgGoalsPanelV123';
    goals.className = 'mvl-v123-panel';

    const indicators = document.createElement('div');
    indicators.id = 'cfgIndicatorsPanelV123';
    indicators.className = 'mvl-v123-panel hidden';

    scope.insertAdjacentElement('afterend', tabs);
    tabs.insertAdjacentElement('afterend', goals);
    goals.insertAdjacentElement('afterend', indicators);

    // Separar las metas de Producción de los límites del semáforo
    // sin cambiar los IDs existentes.
    const productionSection = sections.find(section =>
      String(section.querySelector('h4')?.textContent || '').trim().toUpperCase() === 'PRODUCCIÓN'
    );

    if (productionSection) {
      const grid = productionSection.querySelector('.mvl-v113-config-grid');
      const labels = [...(grid?.querySelectorAll(':scope > label') || [])];

      const goalSection = document.createElement('section');
      goalSection.className = 'mvl-v113-config-section';
      goalSection.innerHTML = `
        <h4>Metas de Producción</h4>
        <div class="mvl-v113-config-grid mvl-v123-goal-grid"></div>
        <div class="mvl-v123-goals-help">
          Estas metas se usan para calcular Meta diaria general, Meta al corte y Meta mensual.
          Puedes definirlas para TODOS o crear valores específicos para PDG, PLANILLA,
          PRODUCCIÓN y DISPONIBILIDAD.
        </div>
      `;

      const goalGrid = goalSection.querySelector('.mvl-v123-goal-grid');
      if (labels[0]) goalGrid.appendChild(labels[0]);
      if (labels[1]) goalGrid.appendChild(labels[1]);
      goals.appendChild(goalSection);

      const title = productionSection.querySelector('h4');
      if (title) title.textContent = 'Semáforo de Producción';
    }

    sections.forEach(section => indicators.appendChild(section));

    tabs.querySelectorAll('[data-v123-tab]').forEach(button => {
      button.addEventListener('click', () => showConfigTab123(button.dataset.v123Tab));
    });

    modal.dataset.v123Tabs = '1';
    showConfigTab123('metas');
  }

  function createModal113() {
    if (document.getElementById('indicatorConfigModalV113')) return;

    const modal = document.createElement('div');
    modal.id = 'indicatorConfigModalV113';
    modal.className = 'mvl-v113-modal hidden';
    modal.innerHTML = `
      <div class="mvl-v113-modal-card" role="dialog" aria-modal="true" aria-labelledby="indicatorConfigTitleV113">
        <div class="mvl-v113-modal-head">
          <div>
            <h3 id="indicatorConfigTitleV113">PONER INDICADORES</h3>
            <p>Metas y semáforos por Tipo de Cuadrilla Visual.</p>
          </div>
          <button type="button" class="mvl-v113-close" id="closeIndicatorConfigV113" aria-label="Cerrar">×</button>
        </div>

        <div class="mvl-v114-scope">
          <label>
            Aplicar metas a
            <select id="cfgVisualTypeV114">
              <option value="TODOS">Todos los tipos de cuadrilla</option>
              <option value="PDG">PDG</option>
              <option value="PLANILLA">PLANILLA</option>
              <option value="PRODUCCION">PRODUCCIÓN</option>
              <option value="DISPONIBILIDAD">DISPONIBILIDAD</option>
            </select>
          </label>
          <div id="cfgSourceV114" class="mvl-v114-source"></div>
        </div>

        <section class="mvl-v113-config-section">
          <h4>Producción</h4>
          <div class="mvl-v113-config-grid">
            <label class="mvl-v113-field">Meta DOBLE · puntos por día<input id="cfgProdDoubleV113" type="number" min="0.1" step="0.1"></label>
            <label class="mvl-v113-field">Meta INDIVIDUAL · puntos por día<input id="cfgProdSoloV113" type="number" min="0.1" step="0.1"></label>
            <label class="mvl-v113-field">Inicio MODERADO · % de la meta<input id="cfgProdAttentionV113" type="number" min="0" max="200" step="1"></label>
            <label class="mvl-v113-field">Inicio ÓPTIMO · % de la meta<input id="cfgProdGreenV113" type="number" min="0" max="200" step="1"></label>
          </div>
          <div class="mvl-v114-levels">
            <div class="mvl-v114-level red"><strong>🔴 CRÍTICO</strong><span>Por debajo del inicio Moderado.</span><b class="mvl-v117-range" id="cfgProdRangeCriticalV117">—</b></div>
            <div class="mvl-v114-level yellow"><strong>🟡 MODERADO</strong><span>Entre Moderado y antes de Óptimo.</span><b class="mvl-v117-range" id="cfgProdRangeModerateV117">—</b></div>
            <div class="mvl-v114-level green"><strong>🟢 ÓPTIMO</strong><span>Desde el porcentaje Óptimo.</span><b class="mvl-v117-range" id="cfgProdRangeOptimalV117">—</b></div>
          </div>
        </section>

        <section class="mvl-v113-config-section">
          <h4>Efectividad</h4>
          <div class="mvl-v113-config-grid">
            <label class="mvl-v113-field">Inicio MODERADO · %<input id="cfgEffCriticalV113" type="number" min="0" max="100" step="1"></label>
            <label class="mvl-v113-field">Inicio ÓPTIMO · %<input id="cfgEffGreenV113" type="number" min="0" max="100" step="1"></label>
          </div>
          <div class="mvl-v114-levels">
            <div class="mvl-v114-level red"><strong>🔴 CRÍTICO</strong><span>Menor al inicio Moderado.</span><b class="mvl-v117-range" id="cfgEffRangeCriticalV117">—</b></div>
            <div class="mvl-v114-level yellow"><strong>🟡 MODERADO</strong><span>Desde Moderado hasta antes del inicio Óptimo.</span><b class="mvl-v117-range" id="cfgEffRangeModerateV117">—</b></div>
            <div class="mvl-v114-level green"><strong>🟢 ÓPTIMO</strong><span>Desde el inicio Óptimo.</span><b class="mvl-v117-range" id="cfgEffRangeOptimalV117">—</b></div>
          </div>
        </section>

        <section class="mvl-v113-config-section">
          <h4>% Recableado</h4>
          <div class="mvl-v113-config-grid">
            <label class="mvl-v113-field">Máximo ÓPTIMO · %<input id="cfgRecOptimalV114" type="number" min="0" max="100" step="0.1"><span class="mvl-v114-field-note">Menor porcentaje es mejor.</span></label>
            <label class="mvl-v113-field">Máximo MODERADO · %<input id="cfgRecModerateV114" type="number" min="0" max="100" step="0.1"><span class="mvl-v114-field-note">Por encima será crítico.</span></label>
          </div>
          <div class="mvl-v114-levels">
            <div class="mvl-v114-level green"><strong>🟢 ÓPTIMO</strong><span>Hasta el máximo Óptimo.</span><b class="mvl-v117-range" id="cfgRecRangeOptimalV117">—</b></div>
            <div class="mvl-v114-level yellow"><strong>🟡 MODERADO</strong><span>Sobre Óptimo y hasta el máximo Moderado.</span><b class="mvl-v117-range" id="cfgRecRangeModerateV117">—</b></div>
            <div class="mvl-v114-level red"><strong>🔴 CRÍTICO</strong><span>Mayor al máximo Moderado.</span><b class="mvl-v117-range" id="cfgRecRangeCriticalV117">—</b></div>
          </div>
          <div class="mvl-v114-pending">Puedes dejar ambos campos vacíos mientras aún no se defina la meta.</div>
        </section>

        <section class="mvl-v113-config-section">
          <h4>VTR / GAR</h4>
          <div class="mvl-v113-config-grid">
            <label class="mvl-v113-field">Máximo ÓPTIMO · %<input id="cfgVtrOptimalV114" type="number" min="0" max="100" step="0.1"><span class="mvl-v114-field-note">Menor porcentaje es mejor.</span></label>
            <label class="mvl-v113-field">Máximo MODERADO · %<input id="cfgVtrModerateV114" type="number" min="0" max="100" step="0.1"><span class="mvl-v114-field-note">Por encima será crítico.</span></label>
          </div>
          <div class="mvl-v114-levels">
            <div class="mvl-v114-level green"><strong>🟢 ÓPTIMO</strong><span>Hasta el máximo Óptimo.</span><b class="mvl-v117-range" id="cfgVtrRangeOptimalV117">—</b></div>
            <div class="mvl-v114-level yellow"><strong>🟡 MODERADO</strong><span>Sobre Óptimo y hasta el máximo Moderado.</span><b class="mvl-v117-range" id="cfgVtrRangeModerateV117">—</b></div>
            <div class="mvl-v114-level red"><strong>🔴 CRÍTICO</strong><span>Mayor al máximo Moderado.</span><b class="mvl-v117-range" id="cfgVtrRangeCriticalV117">—</b></div>
          </div>
          <div class="mvl-v114-pending">La meta puede configurarse ahora; el cálculo seguirá en construcción hasta integrar la fuente VTR/GAR.</div>
        </section>

        <section class="mvl-v113-config-section">
          <h4>Indicadores pendientes</h4>
          <div class="mvl-v113-construction-list">
            <div class="mvl-v113-construction-item"><span>Tiempo de gestión / SLA</span><strong>EN CONSTRUCCIÓN</strong></div>
            <div class="mvl-v113-construction-item"><span>Observaciones</span><strong>EN CONSTRUCCIÓN</strong></div>
          </div>
        </section>

        <div id="indicatorConfigMessageV113" class="mvl-v113-modal-message"></div>
        <div class="mvl-v113-modal-actions">
          <button type="button" class="mvl-v113-secondary mvl-v114-inherit hidden" id="inheritIndicatorConfigV114">Usar metas generales</button>
          <button type="button" class="mvl-v113-secondary" id="cancelIndicatorConfigV113">Cancelar</button>
          <button type="button" class="mvl-v113-primary" id="saveIndicatorConfigV113">Guardar indicadores</button>
        </div>
      </div>`;

    document.body.appendChild(modal);
    setupConfigTabs123(modal);
    const close = () => modal.classList.add('hidden');
    document.getElementById('closeIndicatorConfigV113')?.addEventListener('click', close);
    document.getElementById('cancelIndicatorConfigV113')?.addEventListener('click', close);
    modal.addEventListener('click', event => { if (event.target === modal) close(); });
    document.getElementById('saveIndicatorConfigV113')?.addEventListener('click', () => saveConfig113(false));
    document.getElementById('inheritIndicatorConfigV114')?.addEventListener('click', () => saveConfig113(true));
    document.getElementById('cfgVisualTypeV114')?.addEventListener('change', async event => {
      const type = event.target.value || 'TODOS';
      const cached = peekConfig113(type);

      if (cached) {
        fillConfig113(cached);
        window.__mvlOrganizeGoals124?.();
        modalMessage113('');
        return;
      }

      modalMessage113('Cargando metas…');
      try {
        const config = await getConfig113(false, type);
        fillConfig113(config);
        window.__mvlOrganizeGoals124?.();
        modalMessage113('');
      } catch (err) {
        modalMessage113(err.message || 'No se pudo cargar la configuración.', 'error');
      }
    });

    [
      'cfgProdAttentionV113','cfgProdGreenV113',
      'cfgEffCriticalV113','cfgEffGreenV113',
      'cfgRecOptimalV114','cfgRecModerateV114',
      'cfgVtrOptimalV114','cfgVtrModerateV114'
    ].forEach(id => {
      document.getElementById(id)?.addEventListener('input', updateRangeLabels117);
    });
  }

  function updateRangeLabels117() {
    const raw = id => {
      const el = document.getElementById(id);
      const n = Number(el?.value);
      return el && String(el.value).trim() !== '' && Number.isFinite(n) ? n : null;
    };
    const put = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };
    const fmt = n => Number.isInteger(Number(n)) ? String(Number(n)) : Number(n).toFixed(1);

    const prodModerate = raw('cfgProdAttentionV113');
    const prodOptimal = raw('cfgProdGreenV113');
    put('cfgProdRangeCriticalV117', prodModerate == null ? 'Pendiente' : `0% a <${fmt(prodModerate)}%`);
    put('cfgProdRangeModerateV117',
      prodModerate == null || prodOptimal == null ? 'Pendiente' : `${fmt(prodModerate)}% a <${fmt(prodOptimal)}%`);
    put('cfgProdRangeOptimalV117', prodOptimal == null ? 'Pendiente' : `≥${fmt(prodOptimal)}%`);

    const effModerate = raw('cfgEffCriticalV113');
    const effOptimal = raw('cfgEffGreenV113');
    put('cfgEffRangeCriticalV117', effModerate == null ? 'Pendiente' : `0% a <${fmt(effModerate)}%`);
    put('cfgEffRangeModerateV117',
      effModerate == null || effOptimal == null ? 'Pendiente' : `${fmt(effModerate)}% a <${fmt(effOptimal)}%`);
    put('cfgEffRangeOptimalV117', effOptimal == null ? 'Pendiente' : `≥${fmt(effOptimal)}% a 100%`);

    const negative = (prefix, optimalId, moderateId) => {
      const optimal = raw(optimalId);
      const moderate = raw(moderateId);
      put(`${prefix}RangeOptimalV117`, optimal == null ? 'Pendiente' : `0% a ${fmt(optimal)}%`);
      put(`${prefix}RangeModerateV117`,
        optimal == null || moderate == null ? 'Pendiente' : `>${fmt(optimal)}% a ${fmt(moderate)}%`);
      put(`${prefix}RangeCriticalV117`, moderate == null ? 'Pendiente' : `>${fmt(moderate)}% a 100%`);
    };
    negative('cfgRec', 'cfgRecOptimalV114', 'cfgRecModerateV114');
    negative('cfgVtr', 'cfgVtrOptimalV114', 'cfgVtrModerateV114');
  }

  function validateConfigRanges117() {
    const number = id => {
      const raw = document.getElementById(id)?.value ?? '';
      if (String(raw).trim() === '') return null;
      const n = Number(raw);
      return Number.isFinite(n) ? n : null;
    };
    const pairs = [
      ['Producción', number('cfgProdAttentionV113'), number('cfgProdGreenV113')],
      ['Efectividad', number('cfgEffCriticalV113'), number('cfgEffGreenV113')]
    ];
    for (const [label, moderate, optimal] of pairs) {
      if (moderate == null || optimal == null) return `${label}: completa los dos límites.`;
      if (moderate < 0 || optimal > 200 || moderate >= optimal) {
        return `${label}: el inicio MODERADO debe ser menor que el inicio ÓPTIMO.`;
      }
    }
    const negatives = [
      ['% Recableado', number('cfgRecOptimalV114'), number('cfgRecModerateV114')],
      ['VTR / GAR', number('cfgVtrOptimalV114'), number('cfgVtrModerateV114')]
    ];
    for (const [label, optimal, moderate] of negatives) {
      if (optimal == null && moderate == null) continue;
      if (optimal == null || moderate == null) return `${label}: completa ambos límites o deja ambos vacíos.`;
      if (optimal < 0 || moderate > 100 || optimal >= moderate) {
        return `${label}: el máximo ÓPTIMO debe ser menor que el máximo MODERADO.`;
      }
    }
    return '';
  }

  async function waitDashboardRefresh117(timeoutMs = 15000) {
    const start = Date.now();
    await new Promise(resolve => setTimeout(resolve, 120));
    while (Date.now() - start < timeoutMs) {
      const inline = document.getElementById('dashboardLoading');
      const summary = document.getElementById('dashboardSummaryLoadingV112');
      const inlineIdle = !inline || inline.classList.contains('hidden');
      const summaryIdle = !summary || summary.classList.contains('hidden');
      if (inlineIdle && summaryIdle) {
        await new Promise(resolve => setTimeout(resolve, 120));
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return false;
  }

  function fillConfig113(config) {
    const c = config || {};
    const p = c.production || {};
    const e = c.effectiveness || {};
    const r = c.recableado || {};
    const v = c.vtrGar || {};
    const s = c.sla || {};

    const set = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.value = value ?? '';
    };

    const selector = document.getElementById('cfgVisualTypeV114');
    if (selector && c.visualType) selector.value = c.visualType;
    set('cfgProdDoubleV113', Number(p.doubleDailyTarget ?? 5));
    set('cfgProdSoloV113', Number(p.soloDailyTarget ?? 1));
    set('cfgProdAttentionV113', Number(p.moderateFromRatio ?? p.attentionRatio ?? .7) * 100);
    set('cfgProdGreenV113', Number(p.optimalFromRatio ?? p.greenRatio ?? 1) * 100);
    set('cfgEffCriticalV113', Number(e.moderateFrom ?? e.criticalBelow ?? .5) * 100);
    set('cfgEffGreenV113', Number(e.optimalFrom ?? e.greenAbove ?? .7) * 100);
    set('cfgRecOptimalV114', r.optimalMax == null ? '' : Number(r.optimalMax) * 100);
    set('cfgRecModerateV114', r.moderateMax == null ? '' : Number(r.moderateMax) * 100);
    set('cfgVtrOptimalV114', v.optimalMax == null ? '' : Number(v.optimalMax) * 100);
    set('cfgVtrModerateV114', v.moderateMax == null ? '' : Number(v.moderateMax) * 100);
    set('cfgSlaModerateV200', Number(s.moderateFrom ?? .8) * 100);
    set('cfgSlaOptimalV200', Number(s.optimalFrom ?? .9) * 100);

    const source = document.getElementById('cfgSourceV114');
    if (source) {
      source.textContent = c.visualType === 'TODOS'
        ? 'Configuración general para todos los tipos de cuadrilla.'
        : (c.source === 'GENERAL'
            ? `${c.visualType}: actualmente hereda las metas generales. Al guardar crearás una configuración propia.`
            : `${c.visualType}: tiene una configuración propia.`);
    }

    const inherit = document.getElementById('inheritIndicatorConfigV114');
    inherit?.classList.toggle('hidden', !c.visualType || c.visualType === 'TODOS' || c.source === 'GENERAL');
    updateRangeLabels117();
  }

  function modalMessage113(text = '', type = '') {
    const el = document.getElementById('indicatorConfigMessageV113');
    if (!el) return;
    el.textContent = text;
    el.className = `mvl-v113-modal-message ${type}`.trim();
  }

  function cacheConfig113(config, visualType = 'TODOS') {
    if (!config) return null;
    const type = String(config.visualType || visualType || 'TODOS').toUpperCase();
    STATE.configByVisualType.set(type, config);
    STATE.config = config;
    STATE.configVisualType = type;
    return config;
  }

  function configFromDashboard113(visualType = 'TODOS') {
    const type = String(visualType || 'TODOS').toUpperCase();
    const data = bestDashboard113();
    if (!data?.ok) return null;

    const all = data.indicatorConfigs || {};
    if (all[type]) return all[type];

    const single = data.indicatorConfig;
    if (single) {
      const singleType = String(single.visualType || 'TODOS').toUpperCase();
      if (singleType === type) return single;
    }
    return null;
  }

  function peekConfig113(visualType = 'TODOS') {
    const type = String(visualType || 'TODOS').toUpperCase();

    if (STATE.configByVisualType.has(type)) {
      return STATE.configByVisualType.get(type);
    }

    if (STATE.config && String(STATE.configVisualType || 'TODOS').toUpperCase() === type) {
      STATE.configByVisualType.set(type, STATE.config);
      return STATE.config;
    }

    const dashboardConfig = configFromDashboard113(type);
    if (dashboardConfig) return cacheConfig113(dashboardConfig, type);

    return null;
  }

  async function getConfig113(force = false, visualType = 'TODOS') {
    const type = String(visualType || 'TODOS').toUpperCase();

    if (!force) {
      const cached = peekConfig113(type);
      if (cached) return cached;
    }

    if (typeof api !== 'function') {
      throw new Error('La conexión con el sistema todavía no está disponible.');
    }

    const res = await api('performanceIndicatorConfigGet', {
      token: tokenSafe113(),
      visualType: type
    });
    if (!res?.ok) throw new Error(res?.error || 'No se pudieron cargar los indicadores.');

    return cacheConfig113(res.config || null, type);
  }

  async function openConfig113() {
    if (!canEditIndicators113()) return;

    createModal113();
    const modal = document.getElementById('indicatorConfigModalV113');
    const selector = document.getElementById('cfgVisualTypeV114');
    if (selector) selector.value = 'TODOS';

    modal?.classList.remove('hidden');
    showConfigTab123('metas');

    // V1.25: preparar la vista una sola vez al abrir, sin observar todo el body.
    window.__mvlPolishIndicatorModal122?.();
    window.__mvlOrganizeGoals124?.();

    // V1.23: si el Dashboard ya trajo las metas, abre de inmediato.
    const cached = peekConfig113('TODOS');
    if (cached) {
      fillConfig113(cached);
      window.__mvlOrganizeGoals124?.();
      modalMessage113('');
      return;
    }

    modalMessage113('Cargando configuración…');

    try {
      const config = await getConfig113(false, 'TODOS');
      fillConfig113(config);
      window.__mvlOrganizeGoals124?.();
      modalMessage113('');
    } catch (err) {
      modalMessage113(err.message || 'No se pudo cargar la configuración.', 'error');
    }
  }

  async function saveConfig113(inheritGeneral = false) {
    if (!canEditIndicators113()) return;

    const visualType = document.getElementById('cfgVisualTypeV114')?.value || 'TODOS';
    const num = id => Number(document.getElementById(id)?.value);
    const nullablePct = id => {
      const raw = document.getElementById(id)?.value ?? '';
      if (String(raw).trim() === '') return null;
      const n = Number(raw);
      return Number.isFinite(n) ? n / 100 : null;
    };

    if (!inheritGeneral) {
      const rangeError = validateConfigRanges117();
      if (rangeError) {
        modalMessage113(rangeError, 'error');
        return;
      }
    }

    const payload = {
      visualType,
      inheritGeneral,
      production: {
        doubleDailyTarget: num('cfgProdDoubleV113'),
        soloDailyTarget: num('cfgProdSoloV113'),
        moderateFromRatio: num('cfgProdAttentionV113') / 100,
        optimalFromRatio: num('cfgProdGreenV113') / 100
      },
      effectiveness: {
        moderateFrom: num('cfgEffCriticalV113') / 100,
        optimalFrom: num('cfgEffGreenV113') / 100
      },
      recableado: {
        optimalMax: nullablePct('cfgRecOptimalV114'),
        moderateMax: nullablePct('cfgRecModerateV114')
      },
      vtrGar: {
        optimalMax: nullablePct('cfgVtrOptimalV114'),
        moderateMax: nullablePct('cfgVtrModerateV114')
      },
      sla: {
        moderateFrom: num('cfgSlaModerateV200') / 100,
        optimalFrom: num('cfgSlaOptimalV200') / 100
      },
      observations: {
        optimalMax: num('cfgObsOptimalV205'),
        moderateMax: num('cfgObsModerateV205')
      }
    };

    const button = inheritGeneral
      ? document.getElementById('inheritIndicatorConfigV114')
      : document.getElementById('saveIndicatorConfigV113');
    if (button) button.disabled = true;
    modalMessage113(inheritGeneral ? 'Restableciendo metas generales…' : 'Guardando indicadores…');
    try {
      if (typeof showLoader === 'function') {
        showLoader(inheritGeneral ? 'Restableciendo indicadores…' : 'Guardando indicadores…');
      }
    } catch (_) {}

    try {
      const res = await api('performanceIndicatorConfigSave', {
        token: tokenSafe113(),
        visualType,
        config: JSON.stringify(payload)
      });
      if (!res?.ok) throw new Error(res?.error || 'No se pudieron guardar los indicadores.');

      cacheConfig113(res.config || STATE.config, visualType);
      STATE.dashboards.clear();
      try { if (typeof invalidateFastCache115 === 'function') invalidateFastCache115(); } catch (_) {}
      fillConfig113(STATE.config);
      modalMessage113(res.message || 'Indicadores actualizados correctamente.', 'ok');

      const apply = document.getElementById('refreshDashboardButton');
      const panelVisible = !document.getElementById('performanceDashboardPanel')?.classList.contains('hidden');
      if (apply && panelVisible) {
        try {
          const label = document.getElementById('loaderText');
          if (label) label.textContent = 'Actualizando Dashboard…';
        } catch (_) {}
        apply.click();
        await waitDashboardRefresh117();
      }

      document.getElementById('indicatorConfigModalV113')?.classList.add('hidden');
      try { if (typeof hideLoader === 'function') hideLoader(); } catch (_) {}
    } catch (err) {
      modalMessage113(err.message || 'No se pudieron guardar los indicadores.', 'error');
      try { if (typeof hideLoader === 'function') hideLoader(); } catch (_) {}
    } finally {
      if (button) button.disabled = false;
    }
  }

  function ensureIndicatorButton113() {
    const summary = document.getElementById('dashboardTotalSummaryV19');
    const head = summary?.querySelector('.dashboard-v19-summary-head');
    if (!head) return;

    const existing = document.getElementById('putIndicatorsButtonV113');

    if (!canEditIndicators113()) {
      existing?.remove();
      window.ensureSlaParamsButtonV203?.(false);
      return;
    }

    if (existing) {
      window.ensureSlaParamsButtonV203?.(true);
      return;
    }

    const loading = document.getElementById('dashboardSummaryLoadingV112');
    let actions = head.querySelector('.mvl-v113-summary-actions');

    if (!actions) {
      actions = document.createElement('div');
      actions.className = 'mvl-v113-summary-actions';
      head.appendChild(actions);

      if (loading) actions.appendChild(loading);
    }

    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'putIndicatorsButtonV113';
    button.className = 'mvl-v113-config-button';
    button.textContent = 'PONER INDICADORES';
    button.addEventListener('click', openConfig113);

    actions.insertBefore(button, loading || null);
    window.ensureSlaParamsButtonV203?.(true);
  }

  function dashboardCacheKey115(params = {}) {
    return [
      String(params.period || '2026-08'),
      String(params.site || 'LIMA'),
      String(params.supervisorId || ''),
      String(params.crewId || '')
    ].join('|');
  }

  function dashboardFromCache115(entry, indicator) {
    const result = entry?.data;
    if (!result) return null;
    const clone = {
      ...result,
      indicator: {
        ...(result.indicator || {}),
        key: String(indicator || result.indicator?.key || 'PRODUCCION').toUpperCase()
      }
    };
    return clone;
  }

  function invalidateFastCache115() {
    STATE.dashboardFastCache.clear();
    STATE.dashboards.clear();
  }

  function wrapApi113() {
    if (STATE.apiWrapped || typeof api !== 'function') return;

    STATE.apiWrapped = true;
    const originalApi = api;

    api = async function(action, params = {}) {
      // V1.15: un solo viaje al Apps Script por periodo.
      // V1.12 pedía PRODUCCION y luego ALL para el mismo conjunto de filas.
      // Como la respuesta ya contiene puntos, efectividad y recableado, reutilizamos
      // la primera respuesta y evitamos la segunda llamada.
      if (action === 'performanceDashboard') {
        const key = dashboardCacheKey115(params);
        const cached = STATE.dashboardFastCache.get(key);
        if (
          cached &&
          (Date.now() - Number(cached.at || 0)) < STATE.dashboardCacheTtlMs
        ) {
          const fast = dashboardFromCache115(cached, params.indicator);
          if (fast) {
            STATE.dashboards.set(
              String(params.indicator || 'PRODUCCION').toUpperCase(),
              fast
            );
            return fast;
          }
        }
      }

      // V1.12 intentaba abrir adminCatalogs dentro del Dashboard para enriquecer
      // metadata. En Lima ya tenemos scope + data/cuadrillas-v19.json, por lo que
      // esa tercera llamada no es necesaria durante el Dashboard.
      if (action === 'adminCatalogs') {
        const dashboardPanel = document.getElementById('performanceDashboardPanel');
        const dashboardVisible = dashboardPanel && !dashboardPanel.classList.contains('hidden');
        const scopeCrews = sessionSafe113()?.scope?.crews || [];
        if (dashboardVisible && scopeCrews.length) {
          return { ok: false, skipped: true, error: 'METADATA_LOCAL' };
        }
      }

      const result = await originalApi(action, params);

      try {
        if (action === 'performanceDashboard' && result?.ok) {
          const indicator = String(params?.indicator || result?.indicator?.key || 'ALL').toUpperCase();
          STATE.dashboards.set(indicator, result);

          const key = dashboardCacheKey115(params);
          STATE.dashboardFastCache.set(key, {
            at: Date.now(),
            data: result
          });

          // V1.23: guardar todas las configuraciones que ya viajan con el Dashboard.
          Object.entries(result.indicatorConfigs || {}).forEach(([type, cfg]) => {
            if (cfg) STATE.configByVisualType.set(String(type || 'TODOS').toUpperCase(), cfg);
          });

          if (result.indicatorConfig && !document.getElementById('indicatorConfigModalV113')?.classList.contains('hidden')) {
            // El modal controla su propio alcance; no sobrescribirlo desde el Dashboard.
          } else if (result.indicatorConfig) {
            cacheConfig113(result.indicatorConfig, result.indicatorConfig.visualType || 'TODOS');
          }
          window.setTimeout(refreshSemaphores113, 0);
        }

        if (
          (action === 'performanceIndicatorConfigGet' ||
           action === 'performanceIndicatorConfigSave') &&
          result?.ok &&
          result.config
        ) {
          cacheConfig113(
            result.config,
            result.config.visualType || params?.visualType || STATE.configVisualType || 'TODOS'
          );
        }

        if (
          action === 'performanceIndicatorConfigSave' ||
          action === 'mapImport' ||
          action === 'mapRebuildSla' ||
          action === 'adminImportFinish' ||
          action === 'adminCreateCrew' ||
          action === 'adminUpdateCrew' ||
          action === 'adminReplaceCrewTechnician' ||
          action === 'adminCatalogCreateBatch' ||
          action === 'observationsCreate' ||
          action === 'observationsDescargo' ||
          action === 'observationsUpdate' ||
          action === 'technicalValidationCreate' ||
          action === 'technicalValidationResolve'
        ) {
          invalidateFastCache115();
        }
      } catch (err) {
        console.warn('[MI VISUAL LIMA V1.15] No se pudo procesar la optimización de indicadores.', err);
      }

      return result;
    };
  }

  function watchDashboard113() {
    const panel = document.getElementById('performanceDashboardPanel');
    if (!panel || panel.dataset.v113Observed === '1') return;

    panel.dataset.v113Observed = '1';

    let scheduled113 = false;
    const run = () => {
      if (scheduled113) return;
      scheduled113 = true;
      window.requestAnimationFrame(() => {
        scheduled113 = false;
        ensureIndicatorButton113();
        refreshSemaphores113();
      });
    };

    run();

    new MutationObserver(run).observe(panel, {
      childList: true,
      subtree: true
    });
  }

  function init113() {
    if (STATE.initialized) return;
    STATE.initialized = true;

    installStyles113();
    watchModuleCards113();
    wrapApi113();
    watchDashboard113();

    // V1.25: se elimina el observer global de document.body.
    // Los componentes principales son estáticos y ya tienen watchers específicos.
    ensureIndicatorButton113();

    console.info('[MI VISUAL LIMA] Frontend V1.15/V1.25: metas + semáforos con observación optimizada.');
  }

  function waitForCore113(attempt = 0) {
    if (typeof api === 'function' && document.getElementById('homeView')) {
      init113();
      return;
    }

    if (attempt > 240) {
      console.error('[MI VISUAL LIMA V1.15] El núcleo no terminó de cargar.');
      return;
    }

    window.setTimeout(() => waitForCore113(attempt + 1), 50);
  }

  // V1.15: V1.12 ya viene incluida arriba en este mismo app.js.
  // Se elimina una descarga JS adicional desde jsDelivr.
  waitForCore113(0);

})();



/* =========================
   V1.17 - SEMÁFOROS CORREGIDOS + RANGOS + GUARDADO VISUAL + FILTROS RESPONSIVOS
   ========================= */
(() => {
  const STATE116 = {
    data: null,
    wrappedApi: false,
    initialized: false,
    renderingSupervisor: false,
    lastSupervisorSignature: ''
  };

  const norm116 = (value) => String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();

  const esc116 = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  function visual116(value) {
    const n = norm116(value);
    if (!n || n === 'TODOS' || n === 'TODAS' || n === 'GENERAL') return 'TODOS';
    if (n === 'PLAME' || n === 'PLANILLA') return 'PLANILLA';
    if (n === 'PRODUCCION' || n.includes('COMISIONISTA')) return 'PRODUCCION';
    if (n.includes('DISPONIBILIDAD')) return 'DISPONIBILIDAD';
    if (n === 'PDG') return 'PDG';
    return n;
  }

  function state116(value) {
    const n = norm116(value);
    if (['ACTIVO','ACTIVA','ACTIVE'].includes(n)) return 'ACTIVO';
    if (n.includes('SUSPEND')) return 'SUSPENDIDA';
    if (['BAJA','INACTIVO','INACTIVA'].includes(n)) return 'BAJA';
    return n;
  }

  function filters116() {
    return {
      visualType: document.getElementById('dashboardVisualTypeV19')?.value || '',
      platform: document.getElementById('dashboardPlatformV19')?.value || '',
      composition: document.getElementById('dashboardCompositionV19')?.value || '',
      status: document.getElementById('dashboardStateV19')?.value || '',
      supervisor: document.getElementById('dashboardSupervisor')?.value || '',
      crew: document.getElementById('dashboardCrew')?.value || ''
    };
  }

  function rowMatches116(row, f, ignoreCrew = false) {
    if (f.visualType && visual116(row.visualType) !== visual116(f.visualType)) return false;
    if (f.platform && norm116(row.platform) !== norm116(f.platform)) return false;
    if (f.composition && norm116(row.composition) !== norm116(f.composition)) return false;
    if (f.status && state116(row.state) !== state116(f.status)) return false;

    if (f.supervisor) {
      if (f.supervisor === '__GG__') {
        if (String(row.supervisorId || '') !== '__GG__' && norm116(row.supervisor) !== 'GG') return false;
      } else if (String(row.supervisorId || '') !== String(f.supervisor)) {
        return false;
      }
    }

    if (!ignoreCrew && f.crew && String(row.crewId || '') !== String(f.crew)) return false;
    return true;
  }

  function filteredRows116(ignoreCrew = false) {
    const rows = STATE116.data?.rows || [];
    const f = filters116();
    return rows.filter(row => rowMatches116(row, f, ignoreCrew));
  }

  function ratio116(num, den) {
    num = Number(num);
    den = Number(den);
    return Number.isFinite(num) && Number.isFinite(den) && den > 0 ? num / den : null;
  }

  function pct116(value) {
    return value == null || !Number.isFinite(Number(value))
      ? '—'
      : `${(Number(value) * 100).toFixed(1)}%`;
  }

  function config116() {
    const data = STATE116.data || {};
    const selected = visual116(document.getElementById('dashboardVisualTypeV19')?.value || 'TODOS');
    return data.indicatorConfigs?.[selected] ||
      data.indicatorConfigs?.TODOS ||
      data.indicatorConfig ||
      {};
  }

  function productionStatus116(ratio, cfg) {
    if (ratio == null || !Number.isFinite(Number(ratio))) return '';
    const moderate = Number(cfg?.production?.moderateFromRatio ?? cfg?.production?.attentionRatio ?? 0.7);
    const optimal = Number(cfg?.production?.optimalFromRatio ?? cfg?.production?.greenRatio ?? 1);
    if (Number(ratio) < moderate) return 'CRITICO';
    if (Number(ratio) < optimal) return 'ATENCION';
    return 'CUMPLE';
  }

  function effectivenessStatus116(value, cfg) {
    if (value == null || !Number.isFinite(Number(value))) return '';
    const moderate = Number(cfg?.effectiveness?.moderateFrom ?? cfg?.effectiveness?.criticalBelow ?? 0.5);
    const optimal = Number(cfg?.effectiveness?.optimalFrom ?? cfg?.effectiveness?.greenAbove ?? 0.7);
    if (Number(value) < moderate) return 'CRITICO';
    if (Number(value) >= optimal) return 'CUMPLE';
    return 'ATENCION';
  }

  function negativeStatus116(value, rule) {
    if (value == null || !Number.isFinite(Number(value)) || !rule?.configured) return '';
    if (Number(value) <= Number(rule.optimalMax)) return 'CUMPLE';
    if (Number(value) <= Number(rule.moderateMax)) return 'ATENCION';
    return 'CRITICO';
  }

  function info116(status) {
    const n = norm116(status);
    if (n === 'CUMPLE' || n === 'OPTIMO') return { cls:'cumple', label:'Óptimo' };
    if (n === 'ATENCION' || n === 'MODERADO') return { cls:'atencion', label:'Moderado' };
    if (n === 'CRITICO') return { cls:'critico', label:'Crítico' };
    return null;
  }

  function setBadge116(container, status, detail = '') {
    if (!container) return;
    let badge = container.querySelector(':scope > .mvl-v113-status');
    const meta = info116(status);
    if (!meta) {
      badge?.remove();
      return;
    }
    if (!badge) {
      badge = document.createElement('span');
      container.appendChild(badge);
    }
    badge.className = `mvl-v113-status ${meta.cls}`;
    badge.textContent = detail ? `${meta.label} · ${detail}` : meta.label;
  }

  function summary116(rows) {
    const allRows = Array.isArray(rows) ? rows : [];
    const dataRows = allRows.filter(r => r.hasData);
    const points = allRows.reduce((a,r)=>a + Number(r.points || 0), 0);
    const finalized = dataRows.reduce((a,r)=>a + Number(r.finalized || 0), 0);
    const totalGeneral = dataRows.reduce((a,r)=>a + Number(r.totalGeneral || 0), 0);
    const losRojo = dataRows.reduce((a,r)=>a + Number(r.losRojo || 0), 0);
    const recables = dataRows.reduce((a,r)=>a + Number(r.recables || 0), 0);
    const target = allRows.reduce(
      (a,r)=>a + Number(
        r.productionTargetToDate != null
          ? r.productionTargetToDate
          : Number(r.productionDailyTarget || 0) * Number(r.productionDays || 0)
      ),
      0
    );
    const monthlyTarget = allRows.reduce(
      (a,r)=>a + Number(r.productionMonthlyTarget || 0),
      0
    );
    const dailyTarget = allRows.reduce(
      (a,r)=>a + Number(r.productionDailyTarget || 0),
      0
    );
    const elapsedWorkDays = allRows.reduce(
      (max,r)=>Math.max(max, Number(r.productionElapsedWorkDays || r.productionDays || 0)),
      0
    );
    const monthWorkDays = allRows.reduce(
      (max,r)=>Math.max(max, Number(r.productionMonthWorkDays || 0)),
      0
    );

    return {
      crews: allRows.length,
      crewsWithData: dataRows.length,
      points,
      finalized,
      effectiveness: ratio116(finalized, totalGeneral),
      losRojo,
      recables,
      recablePercent: ratio116(recables, losRojo),
      productionTarget: target,
      productionMonthlyTarget: monthlyTarget,
      productionDailyTarget: dailyTarget,
      productionElapsedWorkDays: elapsedWorkDays,
      productionMonthWorkDays: monthWorkDays,
      productionRatio: ratio116(points, target),
      productionMonthlyProgress: ratio116(points, monthlyTarget)
    };
  }

  function summaryLabel116() {
    const f = filters116();
    const parts = [];

    if (f.visualType) parts.push(`Visual ${f.visualType}`);
    if (f.platform) parts.push(`WIN ${f.platform}`);
    if (f.supervisor) {
      const t = document.getElementById('dashboardSupervisor')?.selectedOptions?.[0]?.textContent || f.supervisor;
      parts.push(`Supervisor ${t}`);
    }
    if (f.composition) parts.push(f.composition === 'SOLO' ? 'Individual' : 'Doble');
    if (f.status) parts.push(f.status);
    if (f.crew) {
      const t = document.getElementById('dashboardCrew')?.selectedOptions?.[0]?.textContent || f.crew;
      parts.push(t);
    }

    return parts;
  }

  function renderSummary116() {
    if (!STATE116.data?.ok) return;

    const rows = filteredRows116(false);
    const s = summary116(rows);
    const cfg = config116();

    const set = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };

    set('dashboardTotalCrewsV19', String(s.crews));
    set('dashboardTotalPointsV19', `${Number(s.points || 0).toFixed(2)} pts`);
    set(
      'dashboardTotalFinalizedV19',
      s.finalized ? `${s.finalized} órdenes finalizadas` : 'Sin órdenes finalizadas en el filtro'
    );
    set('dashboardTotalEffectivenessV19', pct116(s.effectiveness));
    set(
      'dashboardTotalEffectivenessHelpV19',
      s.effectiveness == null ? 'Sin base de efectividad en el filtro' : 'Resultado del filtro seleccionado'
    );
    set('dashboardTotalRecableV19', pct116(s.recablePercent));
    set(
      'dashboardTotalRecableHelpV19',
      s.losRojo ? `${s.losRojo} LOS ROJO · ${s.recables} recableados` : 'Sin LOS ROJO en el filtro'
    );

    const prodCard = document.getElementById('dashboardTotalPointsV19')?.closest('article');
    const effCard = document.getElementById('dashboardTotalEffectivenessV19')?.closest('article');
    const recCard = document.getElementById('dashboardTotalRecableV19')?.closest('article');

    setBadge116(
      prodCard,
      productionStatus116(s.productionRatio, cfg),
      s.productionRatio == null ? '' : `${(s.productionRatio * 100).toFixed(0)}% de meta`
    );
    setBadge116(effCard, effectivenessStatus116(s.effectiveness, cfg));
    setBadge116(recCard, negativeStatus116(s.recablePercent, cfg?.recableado));

    const subtitle = document.querySelector('#dashboardTotalSummaryV19 .dashboard-v19-summary-head .section-subtitle');
    if (subtitle) {
      const parts = summaryLabel116();
      subtitle.textContent = parts.length
        ? `Resumen filtrado: ${parts.join(' · ')}`
        : 'Resultado general del periodo.';
    }

    const loading = document.getElementById('dashboardSummaryLoadingV112');
    loading?.classList.add('hidden');
  }

  function ensureStyles116() {
    if (document.getElementById('mvlV116Styles')) return;
    const style = document.createElement('style');
    style.id = 'mvlV116Styles';
    style.textContent = `
      .mvl-v116-compare-row {
        display: grid;
        grid-template-columns: 54px minmax(0,1fr) auto;
        align-items: center;
        gap: 12px;
        width: 100%;
        padding: 13px 14px;
        border: 1px solid #dce6f2;
        border-radius: 14px;
        background: #fff;
        margin-bottom: 8px;
      }
      .mvl-v116-compare-copy strong { display:block; color:#073b78; }
      .mvl-v116-compare-copy small { display:block; margin-top:3px; color:#65758a; }
      .mvl-v116-compare-value { text-align:right; font-weight:900; color:#10213d; }
      .mvl-v116-compare-value .mvl-v113-status { display:block; margin-top:5px; margin-left:auto; }
      .mvl-v116-summary-note { font-weight:700; color:#0758b7; }
      #performanceDashboardPanel .dashboard-filter-grid {
        display:grid !important;
        grid-template-columns:repeat(3,minmax(0,1fr)) !important;
        gap:12px 14px !important;
        align-items:end !important;
      }
      #performanceDashboardPanel .dashboard-filter-grid .filter-field {
        min-width:0 !important;
        width:100% !important;
        line-height:1.25 !important;
      }
      #performanceDashboardPanel .dashboard-filter-grid .filter-field select,
      #performanceDashboardPanel .dashboard-filter-grid .filter-field input {
        min-width:0 !important;
        width:100% !important;
      }
      #performanceDashboardPanel #refreshDashboardButton {
        width:100% !important;
        min-width:0 !important;
        min-height:42px !important;
      }
      @media(max-width:720px){
        #performanceDashboardPanel .dashboard-filter-grid{grid-template-columns:repeat(2,minmax(0,1fr)) !important}
      }
      @media(max-width:480px){
        #performanceDashboardPanel .dashboard-filter-grid{grid-template-columns:1fr !important}
      }
      @media(max-width:620px){
        .mvl-v116-compare-row{grid-template-columns:42px minmax(0,1fr);align-items:start}
        .mvl-v116-compare-value{grid-column:2;text-align:left}
        .mvl-v116-compare-value .mvl-v113-status{margin-left:0}
      }
      @media(max-width:520px){
        .mvl-v114-level{grid-template-columns:1fr !important}
        .mvl-v117-range{justify-self:start}
      }
    `;
    document.head.appendChild(style);
  }

  function ensureCompareSelect116() {
    const grid = document.querySelector('#performanceDashboardPanel .dashboard-filter-grid');
    if (!grid || document.getElementById('dashboardCompareByV116')) return;

    const label = document.createElement('label');
    label.className = 'filter-field';
    label.innerHTML = `
      Comparar por
      <select id="dashboardCompareByV116">
        <option value="CUADRILLA">Cuadrillas</option>
        <option value="SUPERVISOR">Supervisores</option>
      </select>`;

    const apply = document.getElementById('refreshDashboardButton');
    const applyParent = apply?.closest('label') || apply;
    if (applyParent && applyParent.parentNode === grid) grid.insertBefore(label, applyParent);
    else grid.appendChild(label);

    const select = label.querySelector('select');
    select.addEventListener('change', () => {
      const crew = document.getElementById('dashboardCrew');
      const compareSupervisor = select.value === 'SUPERVISOR';
      if (crew) {
        if (compareSupervisor) crew.value = '';
        crew.disabled = compareSupervisor;
        crew.title = compareSupervisor ? 'No se usa al comparar Supervisores.' : '';
      }
      renderSummary116();

      // Si ya existen resultados visibles, cambiar la comparación sin pedir datos de nuevo.
      const list = document.getElementById('dashboardRankingList');
      if (compareSupervisor && list && !/presiona Aplicar/i.test(list.textContent || '')) {
        window.setTimeout(renderSupervisorRanking116, 0);
      }
    });
  }

  function aggregateSupervisors116() {
    const rows = filteredRows116(false);
    const map = new Map();

    rows.forEach(row => {
      const isGG = String(row.supervisorId || '') === '__GG__' || norm116(row.supervisor) === 'GG';
      const key = isGG ? '__GG__' : String(row.supervisorId || row.supervisor || 'SIN_SUPERVISOR');
      const name = isGG ? 'GG · Supervisión directa de Gerencia' : String(row.supervisor || 'Sin supervisor');

      if (!map.has(key)) {
        map.set(key, {
          key, name, crews: 0, points: 0, finalized: 0, totalGeneral: 0,
          losRojo: 0, recables: 0, productionTarget: 0
        });
      }

      const g = map.get(key);
      g.crews++;
      g.points += Number(row.points || 0);
      g.finalized += Number(row.finalized || 0);
      g.totalGeneral += Number(row.totalGeneral || 0);
      g.losRojo += Number(row.losRojo || 0);
      g.recables += Number(row.recables || 0);
      g.productionTarget += Number(
        row.productionTargetToDate != null
          ? row.productionTargetToDate
          : Number(row.productionDailyTarget || 0) * Number(row.productionDays || 0)
      );
    });

    return [...map.values()].map(g => ({
      ...g,
      effectiveness: ratio116(g.finalized, g.totalGeneral),
      recablePercent: ratio116(g.recables, g.losRojo),
      productionRatio: ratio116(g.points, g.productionTarget)
    }));
  }

  function renderSupervisorRanking116() {
    if (STATE116.renderingSupervisor) return;
    const compare = document.getElementById('dashboardCompareByV116')?.value || 'CUADRILLA';
    if (compare !== 'SUPERVISOR' || !STATE116.data?.ok) return;

    const indicator = document.getElementById('dashboardIndicator')?.value || 'PRODUCCION';
    if (!['ALL','PRODUCCION','EFECTIVIDAD','RECABLEADO'].includes(indicator)) return;

    const list = document.getElementById('dashboardRankingList');
    const title = document.getElementById('dashboardRankingTitle');
    const help = document.getElementById('dashboardRankingHelp');
    if (!list) return;

    const groups = aggregateSupervisors116();
    const cfg = config116();

    if (indicator === 'ALL') {
      groups.sort((a,b) => a.name.localeCompare(b.name, 'es'));

      if (title) title.textContent = 'Resumen por Supervisores';
      if (help) {
        help.textContent =
          `Producción, Efectividad y % Recableado consolidados. ${groups.length} supervisor${groups.length === 1 ? '' : 'es'} dentro del filtro seleccionado.`;
      }

      STATE116.renderingSupervisor = true;
      try {
        list.innerHTML = groups.length ? groups.map(g => {
          const prod = g.productionRatio == null ? '—' : `${(g.productionRatio * 100).toFixed(0)}% meta`;
          const eff = pct116(g.effectiveness);
          const rec = pct116(g.recablePercent);

          const prodStatus = info116(productionStatus116(g.productionRatio, cfg));
          const effStatus = info116(effectivenessStatus116(g.effectiveness, cfg));
          const recStatus = info116(negativeStatus116(g.recablePercent, cfg?.recableado));

          const badge = meta => meta
            ? `<span class="mvl-v113-status ${meta.cls}">${meta.label}</span>`
            : '';

          return `
            <div class="mvl-v126-supervisor-all">
              <div class="mvl-v126-supervisor-head">
                <strong>${esc116(g.name)}</strong>
                <small>${g.crews} cuadrilla${g.crews === 1 ? '' : 's'} · ${g.finalized} finalizadas</small>
              </div>
              <div class="mvl-v126-kpi-grid">
                <div><span>Producción</span><b>${esc116(prod)}</b>${badge(prodStatus)}</div>
                <div><span>Efectividad</span><b>${esc116(eff)}</b>${badge(effStatus)}</div>
                <div><span>% Recableado</span><b>${esc116(rec)}</b>${badge(recStatus)}</div>
              </div>
            </div>`;
        }).join('') : '<p class="empty">No hay Supervisores con datos para esta combinación de filtros.</p>';

        list.dataset.v116Supervisor = '1';
      } finally {
        STATE116.renderingSupervisor = false;
      }
      return;
    }

    groups.sort((a,b) => {
      if (indicator === 'PRODUCCION') {
        const av = a.productionRatio == null ? -Infinity : a.productionRatio;
        const bv = b.productionRatio == null ? -Infinity : b.productionRatio;
        return bv - av || b.points - a.points || a.name.localeCompare(b.name, 'es');
      }
      if (indicator === 'EFECTIVIDAD') {
        const av = a.effectiveness == null ? -Infinity : a.effectiveness;
        const bv = b.effectiveness == null ? -Infinity : b.effectiveness;
        return bv - av || a.name.localeCompare(b.name, 'es');
      }
      const av = a.recablePercent == null ? Infinity : a.recablePercent;
      const bv = b.recablePercent == null ? Infinity : b.recablePercent;
      return av - bv || a.name.localeCompare(b.name, 'es');
    });

    if (title) {
      const label = indicator === 'PRODUCCION' ? 'Producción' : indicator === 'EFECTIVIDAD' ? 'Efectividad' : '% Recableado';
      title.textContent = `Ranking de Supervisores · ${label}`;
    }
    if (help) {
      help.textContent = indicator === 'PRODUCCION'
        ? `Comparación por cumplimiento de meta para evitar favorecer a quien tenga más cuadrillas. ${groups.length} supervisor${groups.length === 1 ? '' : 'es'}.`
        : `${groups.length} supervisor${groups.length === 1 ? '' : 'es'} dentro del filtro seleccionado.`;
    }

    STATE116.renderingSupervisor = true;
    try {
      list.innerHTML = groups.length ? groups.map((g, idx) => {
        let valueText = '';
        let detail = '';
        let status = '';

        if (indicator === 'PRODUCCION') {
          valueText = g.productionRatio == null ? '—' : `${(g.productionRatio * 100).toFixed(0)}% meta`;
          detail = `${g.points.toFixed(2)} pts · ${g.crews} cuadrilla${g.crews === 1 ? '' : 's'} · ${g.finalized} finalizadas`;
          status = productionStatus116(g.productionRatio, cfg);
        } else if (indicator === 'EFECTIVIDAD') {
          valueText = pct116(g.effectiveness);
          detail = `${g.finalized} finalizadas de ${g.totalGeneral} órdenes`;
          status = effectivenessStatus116(g.effectiveness, cfg);
        } else {
          valueText = pct116(g.recablePercent);
          detail = `${g.losRojo} LOS ROJO · ${g.recables} recableados · ${g.crews} cuadrilla${g.crews === 1 ? '' : 's'}`;
          status = negativeStatus116(g.recablePercent, cfg?.recableado);
        }

        const meta = info116(status);
        const badge = meta
          ? `<span class="mvl-v113-status ${meta.cls}">${meta.label}</span>`
          : '';

        return `
          <div class="mvl-v116-compare-row">
            <div class="dashboard-rank-position">#${idx + 1}</div>
            <div class="mvl-v116-compare-copy">
              <strong>${esc116(g.name)}</strong>
              <small>${esc116(detail)}</small>
            </div>
            <div class="mvl-v116-compare-value">
              ${esc116(valueText)}
              ${badge}
            </div>
          </div>`;
      }).join('') : '<p class="empty">No hay Supervisores con datos para esta combinación de filtros.</p>';

      list.dataset.v116Supervisor = '1';
    } finally {
      STATE116.renderingSupervisor = false;
    }
  }

  function refresh116() {
    renderSummary116();
    const compare = document.getElementById('dashboardCompareByV116')?.value || 'CUADRILLA';
    if (compare === 'SUPERVISOR') {
      window.setTimeout(renderSupervisorRanking116, 0);
    }
  }

  function wrapApi116() {
    if (STATE116.wrappedApi || typeof api !== 'function') return;
    STATE116.wrappedApi = true;

    const previous = api;
    api = async function(action, params = {}) {
      const result = await previous(action, params);
      if (action === 'performanceDashboard' && result?.ok) {
        STATE116.data = result;
        window.setTimeout(refresh116, 0);
      }
      return result;
    };
  }

  function attachFilterEvents116() {
    // V1.12 intercepta los change del filtro con stopImmediatePropagation().
    // Escuchamos en document durante la fase CAPTURE para ejecutar antes de ese bloqueo.
    if (document.documentElement.dataset.v116Events === '1') return;
    document.documentElement.dataset.v116Events = '1';

    const filterIds = new Set([
      'dashboardVisualTypeV19','dashboardPlatformV19','dashboardCompositionV19',
      'dashboardStateV19','dashboardSupervisor','dashboardCrew'
    ]);

    document.addEventListener('change', (event) => {
      const id = event.target?.id || '';

      if (filterIds.has(id)) {
        window.setTimeout(renderSummary116, 0);
      }

      if (id === 'dashboardIndicator') {
        window.setTimeout(() => {
          const compare = document.getElementById('dashboardCompareByV116')?.value || 'CUADRILLA';
          if (compare === 'SUPERVISOR') renderSupervisorRanking116();
        }, 0);
      }
    }, true);

    document.addEventListener('click', (event) => {
      if (event.target?.id !== 'refreshDashboardButton') return;
      window.setTimeout(() => {
        renderSummary116();
        renderSupervisorRanking116();
      }, 60);
    }, true);
  }

  function observeRanking116() {
    const list = document.getElementById('dashboardRankingList');
    if (!list || list.dataset.v116Observed === '1') return;
    list.dataset.v116Observed = '1';

    new MutationObserver(() => {
      if (STATE116.renderingSupervisor) return;
      if ((document.getElementById('dashboardCompareByV116')?.value || '') !== 'SUPERVISOR') return;
      if (list.dataset.v116Supervisor === '1' && list.querySelector('.mvl-v116-compare-row')) return;
      window.setTimeout(renderSupervisorRanking116, 0);
    }).observe(list, { childList: true, subtree: false });
  }

  function init116() {
    ensureStyles116();
    wrapApi116();
    ensureCompareSelect116();
    attachFilterEvents116();
    observeRanking116();

    // Si V1.15 ya recibió datos antes de instalar esta capa,
    // la próxima interacción o llamada actualizará STATE116.
  }

  const timer = window.setInterval(() => {
    init116();
    if (
      STATE116.wrappedApi &&
      document.getElementById('dashboardCompareByV116') &&
      document.getElementById('dashboardRankingList')
    ) {
      window.clearInterval(timer);
    }
  }, 120);

  window.setTimeout(init116, 0);
})();

console.info('[MI VISUAL LIMA] V1.17: efectividad óptima inclusiva, rangos visibles, guardado con carga y filtros responsivos.');


/* =========================================================
   V1.18 - PRODUCCIÓN POR CALENDARIO 6x1 + VISUAL PROFESIONAL
   ========================================================= */
(() => {
  const V118 = {
    wrappedApi: false,
    dashboard: null,
    technician: null,
    installed: false
  };

  const norm118 = (v) => String(v ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();

  const esc118 = (v) => String(v ?? '')
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('"','&quot;').replaceAll("'",'&#039;');

  const number118 = (v, fallback = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };

  const pct118 = (v, digits = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? `${(n * 100).toFixed(digits)}%` : '—';
  };

  function statusInfo118(status) {
    const s = norm118(status);
    if (s === 'CUMPLE' || s === 'OPTIMO') return { cls:'optimal', label:'Óptimo', dot:'●' };
    if (s === 'ATENCION' || s === 'MODERADO') return { cls:'moderate', label:'Moderado', dot:'●' };
    if (s === 'CRITICO') return { cls:'critical', label:'Crítico', dot:'●' };
    return { cls:'neutral', label:'Sin dato', dot:'●' };
  }

  function dateLabel118(iso) {
    const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return '';
    const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
    return `${Number(m[3])} ${months[Number(m[2])-1]} ${m[1]}`;
  }

  function installStyles118() {
    if (document.getElementById('mvlV118Styles')) return;
    const style = document.createElement('style');
    style.id = 'mvlV118Styles';
    style.textContent = `
      /* Corte operativo */
      .mvl-v118-cutoff {
        display:flex; align-items:center; justify-content:space-between; gap:14px;
        margin:0 0 14px; padding:11px 13px; border:1px solid #cfe1f7;
        border-radius:14px; background:linear-gradient(180deg,#f8fbff,#f2f7fd);
        color:#294766;
      }
      .mvl-v118-cutoff-main { display:flex; align-items:center; gap:9px; min-width:0; }
      .mvl-v118-cutoff-icon {
        width:34px; height:34px; border-radius:10px; display:grid; place-items:center;
        flex:0 0 auto; background:#e6f1ff; color:#0758b7; font-weight:900;
      }
      .mvl-v118-cutoff strong { display:block; color:#12375f; font-size:.82rem; }
      .mvl-v118-cutoff small { display:block; margin-top:2px; color:#61758d; font-size:.72rem; }
      .mvl-v118-cutoff-cycle {
        flex:0 0 auto; padding:5px 8px; border-radius:999px; background:#fff;
        border:1px solid #d9e6f4; color:#46627f; font-size:.69rem; font-weight:800;
      }

      /* Resumen profesional */
      #dashboardTotalSummaryV19 .dashboard-v19-summary-grid { gap:12px !important; }
      #dashboardTotalSummaryV19 .dashboard-v19-total-card {
        position:relative; overflow:hidden; padding:15px !important;
        border-color:#d7e3f1 !important; box-shadow:0 7px 20px rgba(31,68,111,.055);
      }
      #dashboardTotalSummaryV19 .dashboard-v19-total-card::before,
      #performanceTechPanel .performance-card::before {
        content:''; position:absolute; left:0; top:0; bottom:0; width:3px;
        background:#d9e4ef;
      }
      .mvl-v118-card-optimal::before { background:#16a34a !important; }
      .mvl-v118-card-moderate::before { background:#e5a000 !important; }
      .mvl-v118-card-critical::before { background:#dc2626 !important; }
      .mvl-v118-card-neutral::before { background:#94a3b8 !important; }

      .mvl-v118-production-meta { display:grid; gap:7px; margin-top:9px; }
      .mvl-v118-production-line {
        display:flex; align-items:center; justify-content:space-between; gap:8px;
        font-size:.70rem; color:#60738a;
      }
      .mvl-v118-production-line b { color:#183d66; font-size:.72rem; text-align:right; }
      .mvl-v118-progress {
        height:7px; overflow:hidden; border-radius:999px; background:#e9eff6; margin-top:2px;
      }
      .mvl-v118-progress > i {
        display:block; height:100%; border-radius:inherit; background:#0758b7;
        transition:width .25s ease;
      }
      .mvl-v118-progress.optimal > i { background:#16a34a; }
      .mvl-v118-progress.moderate > i { background:#e5a000; }
      .mvl-v118-progress.critical > i { background:#dc2626; }
      .mvl-v118-progress-label {
        display:flex; justify-content:space-between; gap:8px; margin-top:4px;
        font-size:.66rem; color:#6b7d92;
      }
      .mvl-v118-progress-label strong { color:#334f6f; font-size:.68rem !important; }
      .mvl-v118-status-chip {
        display:inline-flex; align-items:center; gap:5px; width:max-content; max-width:100%;
        margin-top:8px; padding:5px 8px; border-radius:999px; font-size:.68rem; font-weight:900;
      }
      .mvl-v118-status-chip.optimal { background:#eaf8ef; color:#087d34; border:1px solid #b9e4c8; }
      .mvl-v118-status-chip.moderate { background:#fff6df; color:#9b5b00; border:1px solid #f1d393; }
      .mvl-v118-status-chip.critical { background:#fff0f0; color:#b42318; border:1px solid #f1bbbb; }
      .mvl-v118-status-chip.neutral { background:#f1f5f9; color:#64748b; border:1px solid #dbe3eb; }

      /* Técnico */
      #performanceTechPanel .performance-grid { gap:12px !important; }
      #performanceTechPanel .performance-card {
        position:relative; overflow:hidden; border-color:#d7e3f1 !important;
        box-shadow:0 7px 20px rgba(31,68,111,.055);
      }
      .mvl-v118-tech-production { grid-column:span 2; }
      .mvl-v118-tech-kpi-note { margin-top:6px; font-size:.70rem; color:#63758b; }
      .mvl-v118-daily-badges { display:flex; flex-wrap:wrap; gap:5px; margin-top:5px; }
      .mvl-v118-mini-status {
        display:inline-flex; align-items:center; gap:4px; padding:3px 6px; border-radius:999px;
        font-size:.62rem; font-weight:850; border:1px solid transparent;
      }
      .mvl-v118-mini-status.optimal { background:#eef9f1; color:#087d34; border-color:#c7e9d1; }
      .mvl-v118-mini-status.moderate { background:#fff7e5; color:#946000; border-color:#f1d9a0; }
      .mvl-v118-mini-status.critical { background:#fff1f1; color:#b42318; border-color:#f1c1c1; }
      .mvl-v118-mini-status.neutral { background:#f1f5f9; color:#64748b; border-color:#e1e7ee; }

      /* Encabezado y cards más ejecutivos */
      #performanceView > .topbar { padding-bottom:3px; }
      #performanceCrewTitle { letter-spacing:-.02em; }
      #dashboardTotalSummaryV19 .dashboard-v19-summary-head h3 { font-size:1.03rem; }
      .mvl-v118-summary-kicker { color:#0758b7 !important; font-weight:800; }

      @media (max-width:640px) {
        .mvl-v118-cutoff { align-items:flex-start; }
        .mvl-v118-cutoff-cycle { display:none; }
        .mvl-v118-tech-production { grid-column:1/-1; }
      }
      @media (max-width:430px) {
        #dashboardTotalSummaryV19 .dashboard-v19-summary-grid { grid-template-columns:1fr !important; }
        #performanceTechPanel .performance-grid { grid-template-columns:1fr !important; }
      }
    `;
    document.head.appendChild(style);
  }

  function rowMatches118(row) {
    const visual = norm118(document.getElementById('dashboardVisualTypeV19')?.value || '');
    const platform = norm118(document.getElementById('dashboardPlatformV19')?.value || '');
    const composition = norm118(document.getElementById('dashboardCompositionV19')?.value || '');
    const state = norm118(document.getElementById('dashboardStateV19')?.value || '');
    const supervisor = String(document.getElementById('dashboardSupervisor')?.value || '');
    const crew = String(document.getElementById('dashboardCrew')?.value || '');

    if (visual && norm118(row.visualType) !== visual) return false;
    if (platform && norm118(row.platform) !== platform) return false;
    if (composition) {
      const rc = norm118(row.composition) === 'INDIVIDUAL' ? 'SOLO' : norm118(row.composition);
      if (rc !== composition) return false;
    }
    if (state) {
      const rs = norm118(row.state);
      if (rs !== state && !(state === 'ACTIVO' && rs === 'ACTIVA')) return false;
    }
    if (supervisor) {
      if (supervisor === '__GG__') {
        if (!(String(row.supervisorId || '') === '__GG__' || norm118(row.supervisor) === 'GG')) return false;
      } else if (String(row.supervisorId || '') !== supervisor) return false;
    }
    if (crew && String(row.crewId || '') !== crew) return false;
    return true;
  }

  function dashboardSummary118() {
    const rows = (V118.dashboard?.rows || []).filter(rowMatches118);
    const withData = rows.filter(r => r.hasData);
    const points = rows.reduce((a,r)=>a + number118(r.points), 0);
    const finalized = withData.reduce((a,r)=>a + number118(r.finalized), 0);
    const totalGeneral = withData.reduce((a,r)=>a + number118(r.totalGeneral), 0);
    const los = withData.reduce((a,r)=>a + number118(r.losRojo), 0);
    const recables = withData.reduce((a,r)=>a + number118(r.recables), 0);
    const targetToDate = rows.reduce((a,r)=>a + number118(r.productionTargetToDate), 0);
    const monthlyTarget = rows.reduce((a,r)=>a + number118(r.productionMonthlyTarget), 0);
    const dailyTarget = rows.reduce((a,r)=>a + number118(r.productionDailyTarget), 0);
    const elapsedWorkDays = rows.reduce((m,r)=>Math.max(m, number118(r.productionElapsedWorkDays ?? r.productionDays)), 0);
    const monthWorkDays = rows.reduce((m,r)=>Math.max(m, number118(r.productionMonthWorkDays)), 0);
    const ratio = targetToDate > 0 ? points / targetToDate : null;
    const monthlyProgress = monthlyTarget > 0 ? points / monthlyTarget : null;
    const eff = totalGeneral > 0 ? finalized / totalGeneral : null;
    const rec = los > 0 ? recables / los : null;
    return {
      rows, withData, points, finalized, totalGeneral, los, recables,
      targetToDate, monthlyTarget, dailyTarget, elapsedWorkDays, monthWorkDays,
      productionRatio: ratio, monthlyProgress,
      dailyAverage: elapsedWorkDays > 0 ? points / elapsedWorkDays : null,
      effectiveness: eff, recablePercent: rec
    };
  }

  function currentConfig118() {
    const data = V118.dashboard || {};
    const selected = norm118(document.getElementById('dashboardVisualTypeV19')?.value || 'TODOS') || 'TODOS';
    return data.indicatorConfigs?.[selected] || data.indicatorConfigs?.TODOS || data.indicatorConfig || {};
  }

  function statusProduction118(ratio, cfg) {
    if (ratio == null || !Number.isFinite(Number(ratio))) return '';
    const moderate = number118(cfg?.production?.moderateFromRatio ?? cfg?.production?.attentionRatio, .7);
    const optimal = number118(cfg?.production?.optimalFromRatio ?? cfg?.production?.greenRatio, 1);
    return Number(ratio) >= optimal ? 'CUMPLE' : Number(ratio) >= moderate ? 'ATENCION' : 'CRITICO';
  }

  function statusEffectiveness118(value, cfg) {
    if (value == null || !Number.isFinite(Number(value))) return '';
    const moderate = number118(cfg?.effectiveness?.moderateFrom ?? cfg?.effectiveness?.criticalBelow, .5);
    const optimal = number118(cfg?.effectiveness?.optimalFrom ?? cfg?.effectiveness?.greenAbove, .7);
    return Number(value) >= optimal ? 'CUMPLE' : Number(value) >= moderate ? 'ATENCION' : 'CRITICO';
  }

  function statusNegative118(value, rule) {
    if (value == null || !Number.isFinite(Number(value)) || !rule?.configured) return '';
    return Number(value) <= Number(rule.optimalMax)
      ? 'CUMPLE'
      : Number(value) <= Number(rule.moderateMax)
        ? 'ATENCION'
        : 'CRITICO';
  }

  function setCardStatus118(card, status) {
    if (!card) return;
    card.classList.remove('mvl-v118-card-optimal','mvl-v118-card-moderate','mvl-v118-card-critical','mvl-v118-card-neutral');
    const info = statusInfo118(status);
    card.classList.add(`mvl-v118-card-${info.cls}`);
  }

  function chip118(status, detail = '') {
    const info = statusInfo118(status);
    return `<span class="mvl-v118-status-chip ${info.cls}">${info.dot} ${esc118(info.label)}${detail ? ` · ${esc118(detail)}` : ''}</span>`;
  }

  function ensureCutoff118(container, calendar, technician = false) {
    if (!container || !calendar) return;
    const id = technician ? 'mvlV118TechCutoff' : 'mvlV118DashboardCutoff';
    let box = document.getElementById(id);
    if (!box) {
      box = document.createElement('div');
      box.id = id;
      box.className = 'mvl-v118-cutoff';
      if (technician) {
        const controls = container.querySelector('.performance-controls');
        controls?.insertAdjacentElement('afterend', box);
      } else {
        const grid = container.querySelector('.dashboard-v19-summary-grid');
        grid?.insertAdjacentElement('beforebegin', box);
      }
    }
    if (!box) return;
    const dateLabel = dateLabel118(calendar.asOfDate) || 'periodo seleccionado';
    box.innerHTML = `
      <div class="mvl-v118-cutoff-main">
        <span class="mvl-v118-cutoff-icon">↗</span>
        <div>
          <strong>Corte de desempeño: ${esc118(dateLabel)}</strong>
          <small>${number118(calendar.elapsedWorkDays)} de ${number118(calendar.monthWorkDays)} días efectivos del mes · ${number118(calendar.remainingWorkDays)} días efectivos restantes</small>
        </div>
      </div>
      <span class="mvl-v118-cutoff-cycle">Ciclo ${esc118(calendar.cycleLabel || '6x1')}</span>`;
  }

  function renderDashboardProfessional118() {
    const data = V118.dashboard;
    if (!data?.ok) return;
    installStyles118();

    const s = dashboardSummary118();
    const cfg = currentConfig118();
    const calendar = data.productionCalendar || {};

    const summaryBox = document.getElementById('dashboardTotalSummaryV19');
    ensureCutoff118(summaryBox, calendar, false);

    const title = summaryBox?.querySelector('.dashboard-v19-summary-head h3');
    const subtitle = summaryBox?.querySelector('.dashboard-v19-summary-head .section-subtitle');
    const anyFilter = [
      'dashboardVisualTypeV19','dashboardPlatformV19','dashboardCompositionV19','dashboardStateV19',
      'dashboardSupervisor','dashboardCrew'
    ].some(id => Boolean(document.getElementById(id)?.value));
    if (title) title.textContent = anyFilter ? 'Resumen filtrado' : 'Resumen general';
    if (subtitle && !anyFilter) subtitle.textContent = `Avance de indicadores al corte del ${dateLabel118(calendar.asOfDate) || 'periodo'}.`;

    const crewValue = document.getElementById('dashboardTotalCrewsV19');
    if (crewValue) crewValue.textContent = String(s.rows.length);
    const crewCard = crewValue?.closest('article');
    if (crewCard) {
      const label = crewCard.querySelector('span');
      const small = crewCard.querySelector('small');
      if (label) label.textContent = 'Cuadrillas evaluadas';
      if (small) small.textContent = `${s.withData.length} con movimiento en el periodo`;
      setCardStatus118(crewCard, '');
    }

    const prodValue = document.getElementById('dashboardTotalPointsV19');
    const prodCard = prodValue?.closest('article');
    if (prodValue) prodValue.textContent = `${s.points.toFixed(2)} pts`;
    if (prodCard) {
      const label = prodCard.querySelector(':scope > span');
      if (label) label.textContent = 'Producción acumulada';
      const oldSmall = document.getElementById('dashboardTotalFinalizedV19');
      if (oldSmall) oldSmall.textContent = `${s.finalized} órdenes finalizadas`;
      let meta = prodCard.querySelector('.mvl-v118-production-meta');
      if (!meta) {
        meta = document.createElement('div');
        meta.className = 'mvl-v118-production-meta';
        prodCard.appendChild(meta);
      }
      const ratio = s.productionRatio;
      const monthly = s.monthlyProgress;
      const status = statusProduction118(ratio, cfg);
      const info = statusInfo118(status);
      const width = ratio == null ? 0 : Math.max(0, Math.min(100, ratio * 100));
      meta.innerHTML = `
        <div class="mvl-v118-production-line"><span>Meta al corte</span><b>${s.targetToDate.toFixed(2)} pts</b></div>
        <div class="mvl-v118-production-line"><span>Meta mensual</span><b>${s.monthlyTarget.toFixed(2)} pts</b></div>
        <div class="mvl-v118-production-line"><span>Promedio / meta diaria</span><b>${s.dailyAverage == null ? '—' : s.dailyAverage.toFixed(2)} / ${s.dailyTarget.toFixed(2)} pts</b></div>
        <div class="mvl-v118-progress ${info.cls}"><i style="width:${width.toFixed(1)}%"></i></div>
        <div class="mvl-v118-progress-label"><span>Cumplimiento al corte</span><strong>${pct118(ratio,0)}</strong></div>
        <div class="mvl-v118-progress-label"><span>Avance sobre meta mensual</span><strong>${pct118(monthly,0)}</strong></div>
        ${chip118(status, ratio == null ? '' : `${pct118(ratio,0)} de meta al corte`)}`;
      setCardStatus118(prodCard, status);
      // Evita duplicar el badge antiguo de V1.13/V1.16.
      prodCard.querySelector(':scope > .mvl-v113-status')?.remove();
    }

    const effValue = document.getElementById('dashboardTotalEffectivenessV19');
    const effCard = effValue?.closest('article');
    const effStatus = statusEffectiveness118(s.effectiveness, cfg);
    setCardStatus118(effCard, effStatus);
    if (effCard) {
      effCard.querySelector(':scope > .mvl-v113-status')?.remove();
      let chip = effCard.querySelector('.mvl-v118-status-chip');
      if (chip) chip.remove();
      effCard.insertAdjacentHTML('beforeend', chip118(effStatus));
    }

    const recValue = document.getElementById('dashboardTotalRecableV19');
    const recCard = recValue?.closest('article');
    const recStatus = statusNegative118(s.recablePercent, cfg?.recableado);
    setCardStatus118(recCard, recStatus);
    if (recCard) {
      recCard.querySelector(':scope > .mvl-v113-status')?.remove();
      recCard.querySelector('.mvl-v118-status-chip')?.remove();
      if (recStatus) recCard.insertAdjacentHTML('beforeend', chip118(recStatus));
    }
  }

  function renderTechnicianProfessional118(data) {
    if (!data?.ok) return;
    installStyles118();
    const summary = data.summary || {};
    const cfg = data.indicatorConfig || {};
    const calendar = data.productionCalendar || {};
    const panel = document.getElementById('performanceTechPanel');
    ensureCutoff118(panel, calendar, true);

    const prodValue = document.getElementById('perfPoints');
    const prodCard = prodValue?.closest('.performance-card');
    if (prodCard) {
      prodCard.classList.add('mvl-v118-tech-production');
      let meta = prodCard.querySelector('.mvl-v118-production-meta');
      if (!meta) {
        meta = document.createElement('div');
        meta.className = 'mvl-v118-production-meta';
        prodCard.appendChild(meta);
      }
      const ratio = Number.isFinite(Number(summary.productionRatio)) ? Number(summary.productionRatio) : null;
      const monthProgress = Number.isFinite(Number(summary.productionMonthlyProgress)) ? Number(summary.productionMonthlyProgress) : null;
      const status = summary.productionStatus || statusProduction118(ratio, cfg);
      const info = statusInfo118(status);
      const width = ratio == null ? 0 : Math.max(0, Math.min(100, ratio * 100));
      meta.innerHTML = `
        <div class="mvl-v118-production-line"><span>Meta diaria</span><b>${number118(summary.productionDailyTarget).toFixed(2)} pts</b></div>
        <div class="mvl-v118-production-line"><span>Meta acumulada al corte</span><b>${number118(summary.productionTargetToDate).toFixed(2)} pts</b></div>
        <div class="mvl-v118-production-line"><span>Meta mensual (${number118(summary.productionMonthWorkDays)} días efectivos)</span><b>${number118(summary.productionMonthlyTarget).toFixed(2)} pts</b></div>
        <div class="mvl-v118-production-line"><span>Promedio diario actual</span><b>${summary.productionDailyAverage == null ? '—' : number118(summary.productionDailyAverage).toFixed(2)} pts/día</b></div>
        <div class="mvl-v118-progress ${info.cls}"><i style="width:${width.toFixed(1)}%"></i></div>
        <div class="mvl-v118-progress-label"><span>Cumplimiento al corte</span><strong>${pct118(ratio,0)}</strong></div>
        <div class="mvl-v118-progress-label"><span>Avance mensual</span><strong>${pct118(monthProgress,0)}</strong></div>
        ${chip118(status)}`;
      setCardStatus118(prodCard, status);
    }

    const effCard = document.getElementById('effectivenessCard');
    const effStatus = summary.effectivenessStatus || statusEffectiveness118(summary.effectiveness, cfg);
    setCardStatus118(effCard, effStatus);
    if (effCard) {
      effCard.querySelector('.mvl-v118-status-chip')?.remove();
      effCard.insertAdjacentHTML('beforeend', chip118(effStatus));
      const small = effCard.querySelector('small');
      const opt = number118(cfg?.effectiveness?.optimalFrom ?? cfg?.effectiveness?.greenAbove, .7);
      if (small) small.textContent = `Óptimo desde ${(opt*100).toFixed(0)}%`;
    }

    const recValue = document.getElementById('perfRecable');
    const recCard = recValue?.closest('.performance-card');
    const recStatus = summary.recableadoStatus || statusNegative118(summary.recablePercent, cfg?.recableado);
    setCardStatus118(recCard, recStatus);
    if (recCard) {
      recCard.querySelector('.mvl-v118-status-chip')?.remove();
      if (recStatus) recCard.insertAdjacentHTML('beforeend', chip118(recStatus));
    }

    // Detalle diario con semáforos de producción y efectividad.
    const byDate = new Map((data.daily || []).map(d => [String(d.date || ''), d]));
    document.querySelectorAll('#performanceDailyList [data-performance-date]').forEach(row => {
      const d = byDate.get(String(row.dataset.performanceDate || ''));
      if (!d) return;
      let badges = row.querySelector('.mvl-v118-daily-badges');
      if (!badges) {
        badges = document.createElement('div');
        badges.className = 'mvl-v118-daily-badges';
        const copy = row.querySelector('div');
        copy?.appendChild(badges);
      }
      const ps = statusInfo118(d.productionStatus);
      const es = statusInfo118(d.effectivenessStatus);
      badges.innerHTML = `
        <span class="mvl-v118-mini-status ${ps.cls}">Producción ${esc118(ps.label)}</span>
        <span class="mvl-v118-mini-status ${es.cls}">Efectividad ${esc118(es.label)}</span>`;
    });
  }

  function wrapApi118() {
    if (V118.wrappedApi || typeof api !== 'function') return false;
    // Espera a que las capas V1.15/V1.16 ya hayan terminado de envolver la API.
    if (document.documentElement.dataset.v116Events !== '1') return false;
    V118.wrappedApi = true;
    const previous = api;
    api = async function(action, params = {}) {
      const result = await previous(action, params);
      if (action === 'performanceDashboard' && result?.ok) {
        V118.dashboard = result;
        window.setTimeout(renderDashboardProfessional118, 0);
      }
      if (action === 'performanceSummary' && result?.ok) {
        V118.technician = result;
        // Si estamos en Técnico, el render del núcleo ocurre después de resolver api().
        // Se da un pequeño turno al DOM y luego se aplica la capa visual.
        window.setTimeout(() => renderTechnicianProfessional118(result), 40);
      }
      return result;
    };
    return true;
  }

  function attachEvents118() {
    if (document.documentElement.dataset.v118Events === '1') return;
    document.documentElement.dataset.v118Events = '1';
    const ids = new Set([
      'dashboardVisualTypeV19','dashboardPlatformV19','dashboardCompositionV19','dashboardStateV19',
      'dashboardSupervisor','dashboardCrew','dashboardCompareByV116','dashboardIndicator'
    ]);
    document.addEventListener('change', (e) => {
      if (ids.has(e.target?.id || '')) window.setTimeout(renderDashboardProfessional118, 20);
    }, true);
    document.addEventListener('click', (e) => {
      if (e.target?.id === 'refreshDashboardButton') window.setTimeout(renderDashboardProfessional118, 80);
    }, true);
  }

  function observePerformance118() {
    // V1.18 evita observar mutaciones internas para no generar ciclos de render.
    // Las actualizaciones se disparan desde API + eventos de filtros.
    return;
  }

  function init118() {
    installStyles118();
    attachEvents118();
    observePerformance118();
    return wrapApi118();
  }

  const timer118 = window.setInterval(() => {
    if (init118()) window.clearInterval(timer118);
  }, 150);
  window.setTimeout(init118, 0);
})();

console.info('[MI VISUAL LIMA] V1.18: producción por calendario 6x1, meta al corte/meta mensual y vista profesional para Dashboard, Supervisor y Técnico.');


/**
 * MI VISUAL LIMA - Frontend V1.19
 * - Fecha de corte = última orden FINALIZADA registrada en el periodo.
 * - Resumen de indicadores compacto (aprox. 50% menos altura visual).
 */
(() => {
  const esc119 = (v) => String(v ?? '')
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('"','&quot;').replaceAll("'",'&#039;');

  function installStyles119() {
    if (document.getElementById('mvlV119Styles')) return;
    const style = document.createElement('style');
    style.id = 'mvlV119Styles';
    style.textContent = `
      /* Fecha de corte: una sola línea, sin icono ni texto de ciclo */
      .mvl-v118-cutoff {
        min-height:0 !important; margin:0 0 8px !important; padding:7px 10px !important;
        border-radius:11px !important; background:#f7fbff !important;
      }
      .mvl-v118-cutoff-main { display:block !important; }
      .mvl-v118-cutoff-icon, .mvl-v118-cutoff-cycle { display:none !important; }
      .mvl-v118-cutoff strong { font-size:.74rem !important; line-height:1.2 !important; }
      .mvl-v118-cutoff small { display:none !important; }

      /* Resumen compacto */
      #dashboardTotalSummaryV19 { margin-bottom:14px !important; }
      #dashboardTotalSummaryV19 .dashboard-v19-summary-head { margin-bottom:7px !important; }
      #dashboardTotalSummaryV19 .dashboard-v19-summary-grid {
        gap:7px !important; align-items:start !important;
      }
      #dashboardTotalSummaryV19 .dashboard-v19-total-card {
        align-self:start !important; min-height:0 !important; padding:9px 10px !important;
        border-radius:12px !important; box-shadow:0 4px 12px rgba(31,68,111,.04) !important;
      }
      #dashboardTotalSummaryV19 .dashboard-v19-total-card > span {
        font-size:.68rem !important; margin-bottom:3px !important;
      }
      #dashboardTotalSummaryV19 .dashboard-v19-total-card > strong {
        font-size:1.02rem !important; line-height:1.12 !important;
      }
      #dashboardTotalSummaryV19 .dashboard-v19-total-card > small {
        font-size:.66rem !important; line-height:1.18 !important; margin-top:3px !important;
      }
      #dashboardTotalSummaryV19 .dashboard-v19-total-card.under-construction > strong {
        font-size:.88rem !important;
      }
      #dashboardTotalSummaryV19 .dashboard-v19-total-card.under-construction > small {
        display:none !important;
      }

      /* Producción: datos en 2 columnas para evitar una tarjeta larga */
      #dashboardTotalSummaryV19 .mvl-v118-production-meta,
      #performanceTechPanel .mvl-v118-production-meta {
        display:grid !important; grid-template-columns:1fr 1fr !important;
        gap:4px 7px !important; margin-top:6px !important;
      }
      #dashboardTotalSummaryV19 .mvl-v118-production-line,
      #performanceTechPanel .mvl-v118-production-line {
        display:grid !important; gap:1px !important; align-content:start !important;
        padding:3px 0 !important; border-top:1px solid #edf2f7;
        font-size:.62rem !important; line-height:1.15 !important;
      }
      #dashboardTotalSummaryV19 .mvl-v118-production-line b,
      #performanceTechPanel .mvl-v118-production-line b {
        font-size:.68rem !important; text-align:left !important;
      }
      #dashboardTotalSummaryV19 .mvl-v118-progress,
      #performanceTechPanel .mvl-v118-progress,
      #dashboardTotalSummaryV19 .mvl-v118-status-chip,
      #performanceTechPanel .mvl-v118-status-chip {
        grid-column:1/-1 !important;
      }
      #dashboardTotalSummaryV19 .mvl-v118-progress,
      #performanceTechPanel .mvl-v118-progress { height:5px !important; margin-top:1px !important; }
      #dashboardTotalSummaryV19 .mvl-v118-progress-label,
      #performanceTechPanel .mvl-v118-progress-label {
        margin-top:0 !important; font-size:.60rem !important; line-height:1.12 !important;
      }
      #dashboardTotalSummaryV19 .mvl-v118-progress-label strong,
      #performanceTechPanel .mvl-v118-progress-label strong { font-size:.63rem !important; }
      #dashboardTotalSummaryV19 .mvl-v118-status-chip,
      #performanceTechPanel .mvl-v118-status-chip {
        margin-top:2px !important; padding:3px 6px !important; font-size:.62rem !important;
      }

      /* Quita badges heredados para dejar un solo semáforo por indicador */
      #dashboardTotalSummaryV19 .mvl-v113-status,
      #performanceTechPanel .mvl-v113-status { display:none !important; }

      /* Técnico: misma presentación compacta */
      #performanceTechPanel .performance-grid { gap:7px !important; align-items:start !important; }
      #performanceTechPanel .performance-card {
        min-height:0 !important; padding:10px !important; border-radius:12px !important;
      }
      #performanceTechPanel .performance-card .performance-label { font-size:.68rem !important; }
      #performanceTechPanel .performance-card > strong { font-size:1.02rem !important; }
      #performanceTechPanel .performance-card > small { font-size:.65rem !important; line-height:1.15 !important; }

      @media (max-width:640px) {
        #dashboardTotalSummaryV19 .dashboard-v19-summary-grid { grid-template-columns:1fr 1fr !important; }
      }
      @media (max-width:430px) {
        #dashboardTotalSummaryV19 .dashboard-v19-summary-grid { grid-template-columns:1fr 1fr !important; }
      }
    `;
    document.head.appendChild(style);
  }

  function dateLabel119(iso) {
    const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return 'Sin órdenes finalizadas';
    const months=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
    return `${Number(m[3])} ${months[Number(m[2])-1]} ${m[1]}`;
  }

  function rewriteCutoff119(calendar, technician=false) {
    const id = technician ? 'mvlV118TechCutoff' : 'mvlV118DashboardCutoff';
    const box = document.getElementById(id);
    if (!box) return;
    box.innerHTML = `<div class="mvl-v118-cutoff-main"><strong>Fecha de corte: ${esc119(dateLabel119(calendar?.asOfDate))}</strong></div>`;
  }

  function compactProduction119(root, calendar, technician=false) {
    if (!root) return;
    const meta = root.querySelector('.mvl-v118-production-meta');
    if (!meta) return;
    const lines = [...meta.querySelectorAll('.mvl-v118-production-line')];
    const elapsed = Number(calendar?.elapsedWorkDays || 0);
    const month = Number(calendar?.monthWorkDays || 0);

    if (technician) {
      // Técnico mantiene Meta diaria y compacta las metas acumuladas.
      if (lines[1]) {
        const span=lines[1].querySelector('span');
        if (span) span.textContent = elapsed ? `Meta al corte · ${elapsed} días` : 'Meta al corte';
      }
      if (lines[2]) {
        const span=lines[2].querySelector('span');
        if (span) span.textContent = month ? `Meta mensual · ${month} días` : 'Meta mensual';
      }
      return;
    }

    if (lines[0]) {
      const span=lines[0].querySelector('span');
      if (span) span.textContent = elapsed ? `Meta al corte · ${elapsed} días` : 'Meta al corte';
    }
    if (lines[1]) {
      const span=lines[1].querySelector('span');
      if (span) span.textContent = month ? `Meta mensual · ${month} días` : 'Meta mensual';
    }
  }

  function refresh119(result, action) {
    window.setTimeout(() => {
      installStyles119();
      if (action === 'performanceDashboard') {
        rewriteCutoff119(result?.productionCalendar, false);
        compactProduction119(document.querySelector('#dashboardTotalSummaryV19'), result?.productionCalendar, false);
      }
      if (action === 'performanceSummary') {
        rewriteCutoff119(result?.productionCalendar, true);
        compactProduction119(document.querySelector('#performanceTechPanel'), result?.productionCalendar, true);
      }
    }, 70);
  }

  function wrap119() {
    if (document.documentElement.dataset.v119Api === '1' || typeof api !== 'function') return false;
    // Espera la capa V1.18 para no alterar su orden de render.
    if (document.documentElement.dataset.v118Events !== '1') return false;
    document.documentElement.dataset.v119Api='1';
    const previous=api;
    api=async function(action, params={}) {
      const result=await previous(action, params);
      if ((action === 'performanceDashboard' || action === 'performanceSummary') && result?.ok) {
        refresh119(result, action);
      }
      return result;
    };
    return true;
  }

  installStyles119();
  const timer=window.setInterval(() => { if (wrap119()) window.clearInterval(timer); }, 120);
  window.setTimeout(wrap119, 0);
})();

console.info('[MI VISUAL LIMA] V1.19: fecha de corte por última FINALIZADA + resumen compacto.');


/* ==========================================================
   MI VISUAL LIMA - V1.20
   Compactación tipográfica del Resumen general.
   Solo visual: no cambia cálculos ni API.
   ========================================================== */
(() => {
  function installStyles120() {
    if (document.getElementById('mvlV120Styles')) return;

    const style = document.createElement('style');
    style.id = 'mvlV120Styles';
    style.textContent = `
      /* Resumen: tipografía más pequeña y mejor aprovechamiento horizontal */
      #dashboardTotalSummaryV19 .dashboard-v19-summary-grid {
        grid-template-columns: .92fr 1.35fr .98fr 1.02fr !important;
        gap:6px !important;
      }

      #dashboardTotalSummaryV19 .dashboard-v19-total-card {
        padding:7px 8px !important;
        border-radius:11px !important;
        overflow:hidden !important;
      }

      #dashboardTotalSummaryV19 .dashboard-v19-total-card > span {
        font-size:.58rem !important;
        line-height:1.08 !important;
        margin-bottom:2px !important;
      }

      #dashboardTotalSummaryV19 .dashboard-v19-total-card > strong {
        font-size:.88rem !important;
        line-height:1.05 !important;
      }

      #dashboardTotalSummaryV19 .dashboard-v19-total-card > small {
        font-size:.56rem !important;
        line-height:1.12 !important;
        margin-top:2px !important;
      }

      /* Producción */
      #dashboardTotalSummaryV19 .mvl-v118-production-meta {
        gap:2px 6px !important;
        margin-top:4px !important;
      }

      #dashboardTotalSummaryV19 .mvl-v118-production-line {
        display:flex !important;
        align-items:center !important;
        justify-content:space-between !important;
        gap:4px !important;
        padding:2px 0 !important;
        min-width:0 !important;
        font-size:.53rem !important;
        line-height:1.05 !important;
      }

      #dashboardTotalSummaryV19 .mvl-v118-production-line span {
        min-width:0 !important;
        overflow-wrap:normal !important;
        word-break:normal !important;
        hyphens:none !important;
      }

      #dashboardTotalSummaryV19 .mvl-v118-production-line b {
        flex:0 0 auto !important;
        font-size:.57rem !important;
        line-height:1 !important;
        white-space:nowrap !important;
      }

      #dashboardTotalSummaryV19 .mvl-v118-progress-label {
        font-size:.51rem !important;
        line-height:1.05 !important;
        gap:4px !important;
      }

      #dashboardTotalSummaryV19 .mvl-v118-progress-label span {
        white-space:normal !important;
        overflow-wrap:normal !important;
        word-break:normal !important;
      }

      #dashboardTotalSummaryV19 .mvl-v118-progress-label strong {
        font-size:.54rem !important;
        white-space:nowrap !important;
      }

      #dashboardTotalSummaryV19 .mvl-v118-status-chip,
      #dashboardTotalSummaryV19 .mvl-v117-status-chip {
        max-width:100% !important;
        width:max-content !important;
        padding:2px 5px !important;
        font-size:.52rem !important;
        line-height:1.05 !important;
        white-space:normal !important;
        overflow-wrap:normal !important;
        word-break:normal !important;
      }

      /* Efectividad / Recableado */
      #dashboardTotalSummaryV19 .mvl-v118-compact-chip,
      #dashboardTotalSummaryV19 .mvl-v117-compact-chip,
      #dashboardTotalSummaryV19 .mvl-v113-status {
        font-size:.54rem !important;
        padding:2px 6px !important;
        line-height:1.05 !important;
      }

      /* En construcción */
      #dashboardTotalSummaryV19 .dashboard-v19-total-card.under-construction {
        padding:7px 8px !important;
      }
      #dashboardTotalSummaryV19 .dashboard-v19-total-card.under-construction > strong {
        font-size:.70rem !important;
        line-height:1.05 !important;
      }

      /* Fecha de corte */
      .mvl-v118-cutoff {
        padding:5px 8px !important;
        margin-bottom:6px !important;
      }
      .mvl-v118-cutoff strong {
        font-size:.64rem !important;
      }

      @media (max-width:760px) {
        #dashboardTotalSummaryV19 .dashboard-v19-summary-grid {
          grid-template-columns:1fr 1.18fr !important;
        }
      }

      @media (max-width:430px) {
        #dashboardTotalSummaryV19 .dashboard-v19-summary-grid {
          grid-template-columns:1fr 1fr !important;
          gap:5px !important;
        }
        #dashboardTotalSummaryV19 .dashboard-v19-total-card {
          padding:6px 7px !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function compactLabels120(root) {
    if (!root) return;
    const lines = [...root.querySelectorAll('.mvl-v118-production-line')];

    // Dashboard: Meta corte / Meta mes / Promedio-meta.
    if (lines[0]) {
      const s = lines[0].querySelector('span');
      if (s) s.textContent = s.textContent
        .replace('Meta al corte', 'Meta corte')
        .replace(' días', ' d');
    }
    if (lines[1]) {
      const s = lines[1].querySelector('span');
      if (s) s.textContent = s.textContent
        .replace('Meta mensual', 'Meta mes')
        .replace(' días', ' d');
    }
    if (lines[2]) {
      const s = lines[2].querySelector('span');
      if (s) s.textContent = 'Promedio / meta diaria';
    }

    const labels = [...root.querySelectorAll('.mvl-v118-progress-label')];
    labels.forEach(el => {
      const span = el.querySelector('span');
      if (!span) return;
      const t = String(span.textContent || '').trim();
      if (/Cumplimiento/i.test(t)) span.textContent = 'Cumpl. al corte';
      if (/Avance/i.test(t)) span.textContent = 'Avance mensual';
    });
  }

  function refresh120() {
    installStyles120();
    compactLabels120(document.querySelector('#dashboardTotalSummaryV19'));
  }

  // V1.25: V1.20 queda solo como compatibilidad visual inicial.
  // No mantiene un MutationObserver propio.
  installStyles120();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', refresh120, { once:true });
  } else {
    refresh120();
  }
})();

console.info('[MI VISUAL LIMA] V1.20: resumen más compacto y sin palabras entrecortadas.');


/* ==========================================================
   MI VISUAL LIMA - V1.21
   Tarjeta de Producción definitiva: bloques cortos y estables.
   Solo visual. No cambia API, metas ni cálculos.
   ========================================================== */
(() => {
  const esc121 = (v) => String(v ?? '')
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('"','&quot;').replaceAll("'",'&#039;');

  function installStyles121(){
    document.getElementById('mvlV120Styles')?.remove();
    if(document.getElementById('mvlV121Styles')) return;
    const style=document.createElement('style');
    style.id='mvlV121Styles';
    style.textContent=`
      #dashboardTotalSummaryV19 .dashboard-v19-summary-grid{
        grid-template-columns:.92fr 1.48fr 1fr 1fr !important;
        gap:8px !important;
        align-items:start !important;
      }
      #dashboardTotalSummaryV19 .dashboard-v19-total-card{
        padding:9px 10px !important;
        min-height:0 !important;
        border-radius:12px !important;
        overflow:hidden !important;
      }
      #dashboardTotalSummaryV19 .dashboard-v19-total-card > span{
        font-size:.66rem !important;
        line-height:1.1 !important;
        margin-bottom:3px !important;
      }
      #dashboardTotalSummaryV19 .dashboard-v19-total-card > strong{
        font-size:1.02rem !important;
        line-height:1.08 !important;
      }
      #dashboardTotalSummaryV19 .dashboard-v19-total-card > small{
        font-size:.64rem !important;
        line-height:1.18 !important;
        margin-top:3px !important;
      }

      #dashboardTotalSummaryV19 .mvl-v121-prod-grid{
        display:grid !important;
        grid-template-columns:1fr 1fr !important;
        gap:5px 7px !important;
        margin-top:7px !important;
      }
      #dashboardTotalSummaryV19 .mvl-v121-prod-cell{
        min-width:0 !important;
        padding:5px 6px !important;
        border:1px solid #e5edf6 !important;
        border-radius:8px !important;
        background:#fbfdff !important;
      }
      #dashboardTotalSummaryV19 .mvl-v121-prod-cell span{
        display:block !important;
        margin:0 0 2px !important;
        font-size:.55rem !important;
        line-height:1.05 !important;
        color:#64748b !important;
        white-space:nowrap !important;
        overflow:hidden !important;
        text-overflow:ellipsis !important;
      }
      #dashboardTotalSummaryV19 .mvl-v121-prod-cell b{
        display:block !important;
        font-size:.67rem !important;
        line-height:1.08 !important;
        color:#0f365f !important;
        white-space:nowrap !important;
      }
      #dashboardTotalSummaryV19 .mvl-v121-prod-cell small{
        display:block !important;
        margin:1px 0 0 !important;
        font-size:.48rem !important;
        line-height:1 !important;
        color:#8a99aa !important;
        white-space:nowrap !important;
      }
      #dashboardTotalSummaryV19 .mvl-v121-prod-full{
        grid-column:1/-1 !important;
      }
      #dashboardTotalSummaryV19 .mvl-v121-prod-bar{
        height:5px !important;
        border-radius:999px !important;
        overflow:hidden !important;
        background:#e8eef5 !important;
        margin-top:1px !important;
      }
      #dashboardTotalSummaryV19 .mvl-v121-prod-bar i{
        display:block !important;
        height:100% !important;
        border-radius:inherit !important;
      }
      #dashboardTotalSummaryV19 .mvl-v121-prod-chip{
        grid-column:1/-1 !important;
        margin-top:1px !important;
      }
      #dashboardTotalSummaryV19 .mvl-v121-prod-chip .mvl-v118-status-chip,
      #dashboardTotalSummaryV19 .mvl-v121-prod-chip .mvl-v117-status-chip{
        max-width:100% !important;
        width:max-content !important;
        padding:3px 6px !important;
        font-size:.57rem !important;
        line-height:1.05 !important;
        white-space:nowrap !important;
      }

      #dashboardTotalSummaryV19 .dashboard-v19-total-card.under-construction{
        padding:8px 9px !important;
      }
      #dashboardTotalSummaryV19 .dashboard-v19-total-card.under-construction > strong{
        font-size:.78rem !important;
        line-height:1.08 !important;
      }
      #dashboardTotalSummaryV19 .dashboard-v19-total-card.under-construction > small{
        display:none !important;
      }

      .mvl-v118-cutoff{padding:6px 9px !important;margin-bottom:8px !important}
      .mvl-v118-cutoff strong{font-size:.68rem !important}

      @media(max-width:760px){
        #dashboardTotalSummaryV19 .dashboard-v19-summary-grid{
          grid-template-columns:1fr 1fr !important;
        }
      }
      @media(max-width:430px){
        #dashboardTotalSummaryV19 .dashboard-v19-summary-grid{
          grid-template-columns:1fr !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function parseDays121(text){
    const m=String(text||'').match(/(?:·|\s)(\d+)\s*d(?:\b|$)/i) || String(text||'').match(/(\d+)\s*d[ií]as/i);
    return m ? m[1] : '';
  }
  function parseTwoValues121(text){
    const clean=String(text||'').replace(/pts?\/?d[ií]a/gi,'').replace(/pts?/gi,'').trim();
    const parts=clean.split('/').map(s=>s.trim()).filter(Boolean);
    return {left:parts[0]||'—', right:parts[1]||'—'};
  }

  function rebuildProduction121(){
    const root=document.getElementById('dashboardTotalSummaryV19');
    if(!root) return;
    const points=document.getElementById('dashboardTotalPointsV19');
    const card=points?.closest('article');
    if(!card) return;
    const old=card.querySelector('.mvl-v118-production-meta');
    if(!old || old.dataset.v121Done==='1') return;

    const lines=[...old.querySelectorAll('.mvl-v118-production-line')];
    if(lines.length<3) return;

    const metaCutLabel=lines[0].querySelector('span')?.textContent||'Meta corte';
    const metaMonthLabel=lines[1].querySelector('span')?.textContent||'Meta mes';
    const avgText=lines[2].querySelector('b')?.textContent||'— / —';
    const two=parseTwoValues121(avgText);
    const cutDays=parseDays121(metaCutLabel);
    const monthDays=parseDays121(metaMonthLabel);

    const metaCut=lines[0].querySelector('b')?.textContent||'—';
    const metaMonth=lines[1].querySelector('b')?.textContent||'—';

    const labels=[...old.querySelectorAll('.mvl-v118-progress-label')];
    const compliance=labels[0]?.querySelector('strong')?.textContent||'—';
    const monthly=labels[1]?.querySelector('strong')?.textContent||'—';
    const progress=old.querySelector('.mvl-v118-progress');
    const chip=old.querySelector('.mvl-v118-status-chip, .mvl-v117-status-chip');

    let barHtml='';
    if(progress){
      const i=progress.querySelector('i');
      const style=i?.getAttribute('style')||'';
      const cls=[...progress.classList].find(x=>x!=='mvl-v118-progress')||'';
      barHtml=`<div class="mvl-v121-prod-bar ${esc121(cls)}"><i style="${esc121(style)}"></i></div>`;
    }

    old.innerHTML=`
      <div class="mvl-v121-prod-grid">
        <div class="mvl-v121-prod-cell"><span>Meta corte</span><b>${esc121(metaCut)}</b>${cutDays?`<small>${esc121(cutDays)} días efectivos</small>`:''}</div>
        <div class="mvl-v121-prod-cell"><span>Meta mes</span><b>${esc121(metaMonth)}</b>${monthDays?`<small>${esc121(monthDays)} días efectivos</small>`:''}</div>
        <div class="mvl-v121-prod-cell"><span>Prom. diario</span><b>${esc121(two.left)} pts</b></div>
        <div class="mvl-v121-prod-cell"><span>Meta diaria</span><b>${esc121(two.right)} pts</b></div>
        <div class="mvl-v121-prod-cell"><span>Cumplimiento</span><b>${esc121(compliance)}</b><small>al corte</small></div>
        <div class="mvl-v121-prod-cell"><span>Avance mes</span><b>${esc121(monthly)}</b></div>
        <div class="mvl-v121-prod-full">${barHtml}</div>
        ${chip?`<div class="mvl-v121-prod-chip">${chip.outerHTML}</div>`:''}
      </div>`;
    old.dataset.v121Done='1';
  }

  function refresh121(){
    installStyles121();
    rebuildProduction121();
  }

  // V1.25: V1.21 ya no observa el DOM por su cuenta.
  // V1.22 llama esta función solo cuando el Dashboard realmente cambia.
  window.__mvlRefresh121 = refresh121;
  function start(){
    installStyles121();
    refresh121();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();

console.info('[MI VISUAL LIMA] V1.21: tarjeta Producción definitiva en bloques.');


/* ==========================================================
   MI VISUAL LIMA - V1.22
   Producción clara + Metas generales explícitas.
   Solo frontend. No cambia API ni cálculos.
   ========================================================== */
(() => {
  const esc122 = (value) => String(value ?? '')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');

  function installStyles122() {
    if (document.getElementById('mvlV122Styles')) return;

    const style = document.createElement('style');
    style.id = 'mvlV122Styles';
    style.textContent = `
      /* Tarjeta Producción: estructura estable, sin elipsis */
      #dashboardTotalSummaryV19 .mvl-v122-prod-grid{
        display:grid !important;
        grid-template-columns:1fr 1fr !important;
        gap:7px !important;
        margin-top:8px !important;
      }

      #dashboardTotalSummaryV19 .mvl-v122-prod-cell{
        min-width:0 !important;
        padding:7px 8px !important;
        border:1px solid #e3edf7 !important;
        border-radius:9px !important;
        background:#fbfdff !important;
      }

      #dashboardTotalSummaryV19 .mvl-v122-prod-cell span{
        display:block !important;
        margin:0 0 4px !important;
        color:#5f7188 !important;
        font-size:.61rem !important;
        line-height:1.12 !important;
        font-weight:650 !important;
        white-space:normal !important;
        overflow:visible !important;
        text-overflow:clip !important;
        word-break:normal !important;
        overflow-wrap:normal !important;
        hyphens:none !important;
      }

      #dashboardTotalSummaryV19 .mvl-v122-prod-cell b{
        display:block !important;
        color:#082f5b !important;
        font-size:.76rem !important;
        line-height:1.08 !important;
        font-weight:850 !important;
        white-space:nowrap !important;
      }

      #dashboardTotalSummaryV19 .mvl-v122-prod-cell small{
        display:block !important;
        margin-top:3px !important;
        color:#8291a3 !important;
        font-size:.52rem !important;
        line-height:1.08 !important;
        white-space:normal !important;
      }

      #dashboardTotalSummaryV19 .mvl-v122-prod-full{
        grid-column:1/-1 !important;
      }

      #dashboardTotalSummaryV19 .mvl-v122-prod-bar{
        height:6px !important;
        border-radius:999px !important;
        overflow:hidden !important;
        background:#e7eef6 !important;
        margin-top:1px !important;
      }

      #dashboardTotalSummaryV19 .mvl-v122-prod-bar i{
        display:block !important;
        height:100% !important;
        border-radius:inherit !important;
      }

      #dashboardTotalSummaryV19 .mvl-v122-prod-chip{
        grid-column:1/-1 !important;
        margin-top:1px !important;
      }

      #dashboardTotalSummaryV19 .mvl-v122-prod-chip .mvl-v118-status-chip,
      #dashboardTotalSummaryV19 .mvl-v122-prod-chip .mvl-v117-status-chip{
        max-width:100% !important;
        padding:3px 7px !important;
        font-size:.58rem !important;
        line-height:1.1 !important;
        white-space:normal !important;
      }

      /* PONER INDICADORES: metas generales visibles */
      #indicatorConfigModalV113 .mvl-v122-general-help{
        margin:7px 0 0 !important;
        padding:8px 10px !important;
        border-radius:10px !important;
        background:#eef6ff !important;
        border:1px solid #cfe2fa !important;
        color:#34536f !important;
        font-size:.68rem !important;
        line-height:1.35 !important;
      }

      #indicatorConfigModalV113 .mvl-v122-config-mode{
        margin:0 0 8px !important;
        color:#073b78 !important;
        font-size:.72rem !important;
        font-weight:850 !important;
      }

      @media(max-width:430px){
        #dashboardTotalSummaryV19 .mvl-v122-prod-grid{
          grid-template-columns:1fr !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function numberOnly122(text){
    const m=String(text||'').match(/-?\d+(?:[.,]\d+)?/);
    return m ? m[0].replace(',','.') : '';
  }

  function rebuildProduction122(){
    const root=document.getElementById('dashboardTotalSummaryV19');
    if(!root) return;

    const oldGrid=root.querySelector('.mvl-v121-prod-grid');
    if(!oldGrid || oldGrid.dataset.v122Done==='1') return;

    const cells=[...oldGrid.querySelectorAll('.mvl-v121-prod-cell')];
    if(cells.length < 6) return;

    const getB = index => cells[index]?.querySelector('b')?.textContent?.trim() || '—';
    const getSmall = index => cells[index]?.querySelector('small')?.textContent?.trim() || '';

    const metaCut = getB(0);
    const metaCutDays = getSmall(0);
    const metaMonth = getB(1);
    const metaMonthDays = getSmall(1);
    const avgReal = getB(2);
    const metaDaily = getB(3);
    const compliance = getB(4);
    const monthlyAdvance = getB(5);

    const bar = oldGrid.querySelector('.mvl-v121-prod-bar');
    const chip = oldGrid.querySelector('.mvl-v121-prod-chip');

    let barHtml='';
    if(bar){
      const i=bar.querySelector('i');
      const cls=[...bar.classList].filter(x=>x!=='mvl-v121-prod-bar').join(' ');
      barHtml=`<div class="mvl-v122-prod-bar ${esc122(cls)}"><i style="${esc122(i?.getAttribute('style')||'')}"></i></div>`;
    }

    oldGrid.outerHTML = `
      <div class="mvl-v122-prod-grid" data-v122-done="1">
        <div class="mvl-v122-prod-cell">
          <span>Meta diaria general</span>
          <b>${esc122(metaDaily)}</b>
          <small>Suma de la meta diaria de las cuadrillas evaluadas</small>
        </div>

        <div class="mvl-v122-prod-cell">
          <span>Promedio real por día</span>
          <b>${esc122(avgReal)}</b>
        </div>

        <div class="mvl-v122-prod-cell">
          <span>Meta al corte</span>
          <b>${esc122(metaCut)}</b>
          ${metaCutDays ? `<small>${esc122(metaCutDays)}</small>` : ''}
        </div>

        <div class="mvl-v122-prod-cell">
          <span>Cumplimiento al corte</span>
          <b>${esc122(compliance)}</b>
        </div>

        <div class="mvl-v122-prod-cell">
          <span>Meta mensual</span>
          <b>${esc122(metaMonth)}</b>
          ${metaMonthDays ? `<small>${esc122(metaMonthDays)}</small>` : ''}
        </div>

        <div class="mvl-v122-prod-cell">
          <span>Avance mensual</span>
          <b>${esc122(monthlyAdvance)}</b>
        </div>

        <div class="mvl-v122-prod-full">${barHtml}</div>
        ${chip ? `<div class="mvl-v122-prod-chip">${chip.innerHTML}</div>` : ''}
      </div>`;
  }

  function polishIndicatorModal122(){
    const modal=document.getElementById('indicatorConfigModalV113');
    if(!modal) return;

    const headP=modal.querySelector('.mvl-v113-modal-head p');
    if(headP){
      headP.textContent='Define metas generales y, si necesitas, metas específicas por tipo de cuadrilla.';
    }

    const selector=document.getElementById('cfgVisualTypeV114');
    if(!selector) return;

    const generalOption=[...selector.options].find(o=>o.value==='TODOS');
    if(generalOption) generalOption.textContent='METAS GENERALES · TODOS';

    const scope=selector.closest('.mvl-v114-scope');
    if(scope && !scope.querySelector('.mvl-v122-general-help')){
      const help=document.createElement('div');
      help.className='mvl-v122-general-help';
      help.textContent='Las METAS GENERALES son la referencia base del Dashboard. PDG, PLANILLA, PRODUCCIÓN y DISPONIBILIDAD pueden tener metas propias; si no tienen una configuración específica, usan automáticamente las metas generales.';
      scope.appendChild(help);
    }

    let mode=modal.querySelector('.mvl-v122-config-mode');
    if(!mode){
      mode=document.createElement('div');
      mode.className='mvl-v122-config-mode';
      const firstSection=modal.querySelector('.mvl-v113-config-section');
      firstSection?.parentNode?.insertBefore(mode, firstSection);
    }

    const refreshMode=()=>{
      const value=selector.value || 'TODOS';
      if(mode){
        mode.textContent=value==='TODOS'
          ? 'Configurando: METAS GENERALES'
          : `Configurando metas específicas: ${value}`;
      }

      const source=document.getElementById('cfgSourceV114');
      if(source && value==='TODOS'){
        source.textContent='Configuración general usada para comparar el resultado global y como base para los tipos de cuadrilla sin meta propia.';
      }
    };

    if(!selector.dataset.v122Bound){
      selector.addEventListener('change',()=>setTimeout(refreshMode,80));
      selector.dataset.v122Bound='1';
    }
    setTimeout(refreshMode,0);
  }

  function refresh122(){
    installStyles122();
    window.__mvlRefresh121?.();
    rebuildProduction122();
    polishIndicatorModal122();
  }

  window.__mvlRefresh122 = refresh122;
  window.__mvlPolishIndicatorModal122 = polishIndicatorModal122;

  installStyles122();

  let scheduled122=false;
  const schedule122=()=>{
    if(scheduled122) return;
    scheduled122=true;
    window.requestAnimationFrame(()=>{
      scheduled122=false;
      refresh122();
    });
  };

  const start=()=>{
    const target=document.getElementById('performanceDashboardPanel');
    if(target && target.dataset.v125VisualObserved!=='1'){
      target.dataset.v125VisualObserved='1';
      new MutationObserver(schedule122).observe(target,{childList:true,subtree:true});
    }
    refresh122();
  };

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',start,{once:true});
  }else{
    start();
  }
})();

console.info('[MI VISUAL LIMA] V1.22: Producción clara + metas generales explícitas.');


/* ==========================================================
   MI VISUAL LIMA - V1.24
   METAS para todos los indicadores.
   Solo reorganización visual: conserva IDs, valores y backend.
   ========================================================== */
(() => {
  function installStyles124() {
    if (document.getElementById('mvlV124GoalsStyles')) return;

    const style = document.createElement('style');
    style.id = 'mvlV124GoalsStyles';
    style.textContent = `
      #indicatorConfigModalV113 .mvl-v124-goal-card{
        margin-top:10px;
        padding:12px;
        border:1px solid #dbe7f4;
        border-radius:13px;
        background:#fff;
      }
      #indicatorConfigModalV113 .mvl-v124-goal-card h4{
        margin:0 0 9px;
        color:#073b78;
        font-size:.82rem;
      }
      #indicatorConfigModalV113 .mvl-v124-goal-card .mvl-v113-config-grid{
        margin:0 !important;
      }
      #indicatorConfigModalV113 .mvl-v124-goal-note{
        margin-top:7px;
        color:#687b91;
        font-size:.65rem;
        line-height:1.3;
      }
      #indicatorConfigModalV113 .mvl-v124-pending-goal{
        display:flex;
        justify-content:space-between;
        gap:10px;
        align-items:center;
        padding:9px 10px;
        border-radius:10px;
        background:#f6f8fb;
        color:#4f6176;
        font-size:.69rem;
      }
      #indicatorConfigModalV113 .mvl-v124-pending-goal + .mvl-v124-pending-goal{
        margin-top:6px;
      }
      #indicatorConfigModalV113 .mvl-v124-pending-goal strong{
        color:#718096;
        font-size:.62rem;
      }
      #indicatorConfigModalV113 .mvl-v124-semaforo-note{
        margin:7px 0 0;
        color:#6b7e93;
        font-size:.64rem;
        line-height:1.3;
      }
    `;
    document.head.appendChild(style);
  }

  function findSection124(title) {
    const modal = document.getElementById('indicatorConfigModalV113');
    if (!modal) return null;
    const wanted = String(title || '').trim().toUpperCase();
    return [...modal.querySelectorAll('#cfgIndicatorsPanelV123 > .mvl-v113-config-section')]
      .find(section =>
        String(section.querySelector('h4')?.textContent || '').trim().toUpperCase() === wanted
      ) || null;
  }

  function relabelField124(label, text, note = '') {
    if (!label) return;
    const input = label.querySelector('input');
    if (!input) return;

    // Conservar el mismo input/ID; solo cambia el texto visible.
    [...label.childNodes].forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) node.remove();
    });

    label.insertBefore(document.createTextNode(text), input);

    const oldNotes = [...label.querySelectorAll('.mvl-v114-field-note')];
    oldNotes.forEach(n => n.remove());

    if (note) {
      const span = document.createElement('span');
      span.className = 'mvl-v114-field-note';
      span.textContent = note;
      label.appendChild(span);
    }
  }

  function createGoalSection124(goals, title, label, note = '') {
    if (!goals || !label) return;

    const section = document.createElement('section');
    section.className = 'mvl-v124-goal-card';
    section.innerHTML = `
      <h4>${title}</h4>
      <div class="mvl-v113-config-grid"></div>
      ${note ? `<div class="mvl-v124-goal-note">${note}</div>` : ''}
    `;
    section.querySelector('.mvl-v113-config-grid').appendChild(label);
    goals.appendChild(section);
  }

  function organizeGoals124() {
    const modal = document.getElementById('indicatorConfigModalV113');
    const goals = modal?.querySelector('#cfgGoalsPanelV123');
    const indicators = modal?.querySelector('#cfgIndicatorsPanelV123');
    if (!modal || !goals || !indicators || modal.dataset.v124Goals === '1') return;

    installStyles124();

    // Producción ya fue separada por V1.23.
    const prodGoal = goals.querySelector('.mvl-v113-config-section');
    if (prodGoal) {
      prodGoal.classList.add('mvl-v124-goal-card');
      const title = prodGoal.querySelector('h4');
      if (title) title.textContent = 'Producción';
    }

    // EFECTIVIDAD: el inicio ÓPTIMO es la meta objetivo.
    const effSection = findSection124('EFECTIVIDAD');
    const effOptimalInput = document.getElementById('cfgEffGreenV113');
    const effOptimalLabel = effOptimalInput?.closest('label');
    if (effOptimalLabel) {
      relabelField124(
        effOptimalLabel,
        'Meta objetivo · %',
        'Resultado mínimo considerado ÓPTIMO.'
      );
      createGoalSection124(
        goals,
        'Efectividad',
        effOptimalLabel,
        'La meta se compara contra la efectividad total del periodo o del filtro seleccionado.'
      );
    }
    if (effSection) {
      const h = effSection.querySelector('h4');
      if (h) h.textContent = 'Semáforo de Efectividad';
      const note = document.createElement('div');
      note.className = 'mvl-v124-semaforo-note';
      note.textContent = 'El nivel ÓPTIMO comienza en la meta definida en la pestaña METAS.';
      effSection.appendChild(note);
    }

    // RECABLEADO: máximo ÓPTIMO es la meta.
    const recSection = findSection124('% RECABLEADO');
    const recOptimalInput = document.getElementById('cfgRecOptimalV114');
    const recOptimalLabel = recOptimalInput?.closest('label');
    if (recOptimalLabel) {
      relabelField124(
        recOptimalLabel,
        'Meta máxima · %',
        'Menor porcentaje es mejor.'
      );
      createGoalSection124(
        goals,
        '% Recableado',
        recOptimalLabel,
        'El resultado será ÓPTIMO cuando esté en la meta máxima definida o por debajo de ella.'
      );
    }
    if (recSection) {
      const h = recSection.querySelector('h4');
      if (h) h.textContent = 'Semáforo de % Recableado';
      const note = document.createElement('div');
      note.className = 'mvl-v124-semaforo-note';
      note.textContent = 'El límite ÓPTIMO proviene de la meta definida en la pestaña METAS.';
      recSection.appendChild(note);
    }

    // VTR/GAR: máximo ÓPTIMO es la meta.
    const vtrSection = findSection124('VTR / GAR');
    const vtrOptimalInput = document.getElementById('cfgVtrOptimalV114');
    const vtrOptimalLabel = vtrOptimalInput?.closest('label');
    if (vtrOptimalLabel) {
      relabelField124(
        vtrOptimalLabel,
        'Meta máxima · %',
        'Menor porcentaje es mejor.'
      );
      createGoalSection124(
        goals,
        'VTR / GAR',
        vtrOptimalLabel,
        'La meta puede dejarse definida desde ahora; el cálculo seguirá en construcción hasta integrar su fuente.'
      );
    }
    if (vtrSection) {
      const h = vtrSection.querySelector('h4');
      if (h) h.textContent = 'Semáforo de VTR / GAR';
      const note = document.createElement('div');
      note.className = 'mvl-v124-semaforo-note';
      note.textContent = 'El límite ÓPTIMO proviene de la meta definida en la pestaña METAS.';
      vtrSection.appendChild(note);
    }

    // Indicadores todavía en construcción también aparecen en METAS.
    const pending = document.createElement('section');
    pending.className = 'mvl-v124-goal-card';
    pending.innerHTML = `
      <h4>Próximas metas</h4>
      <div class="mvl-v124-pending-goal">
        <span>Tiempo de gestión / SLA</span><strong>EN CONSTRUCCIÓN</strong>
      </div>
      <div class="mvl-v124-pending-goal">
        <span>Observaciones</span><strong>EN CONSTRUCCIÓN</strong>
      </div>
    `;
    goals.appendChild(pending);

    // Cambiar algunos textos del semáforo ahora que la meta está aparte.
    const effModerateLabel = document.getElementById('cfgEffCriticalV113')?.closest('label');
    relabelField124(effModerateLabel, 'Inicio MODERADO · %');

    const recModerateLabel = document.getElementById('cfgRecModerateV114')?.closest('label');
    relabelField124(
      recModerateLabel,
      'Máximo MODERADO · %',
      'Por encima será CRÍTICO.'
    );

    const vtrModerateLabel = document.getElementById('cfgVtrModerateV114')?.closest('label');
    relabelField124(
      vtrModerateLabel,
      'Máximo MODERADO · %',
      'Por encima será CRÍTICO.'
    );

    modal.dataset.v124Goals = '1';
  }

  // V1.25: sin observer global. La organización se ejecuta al abrir el modal.
  window.__mvlOrganizeGoals124 = organizeGoals124;

  function start124() {
    organizeGoals124();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start124, { once:true });
  } else {
    start124();
  }
})();

console.info('[MI VISUAL LIMA] V1.24: METAS de Producción, Efectividad, Recableado y VTR/GAR.');


/* ==========================================================
   MI VISUAL LIMA - V1.25
   Guardia de rendimiento.
   ========================================================== */
(() => {
  // Evita que un click repetido en PONER INDICADORES dispare varias acciones
  // mientras la primera todavía está resolviendo.
  document.addEventListener('click', (event) => {
    const button = event.target?.closest?.('#putIndicatorsButtonV113');
    if (!button) return;

    if (button.dataset.v125Busy === '1') {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }

    button.dataset.v125Busy = '1';
    window.setTimeout(() => {
      button.dataset.v125Busy = '0';
    }, 700);
  }, true);
})();

console.info('[MI VISUAL LIMA] V1.25: observers globales eliminados y modal de indicadores optimizado.');


/* ==========================================================
   MI VISUAL LIMA - V1.26
   "Todos los indicadores" restaurado.
   ========================================================== */
(() => {
  if (document.getElementById('mvlV126Styles')) return;
  const style = document.createElement('style');
  style.id = 'mvlV126Styles';
  style.textContent = `
    .mvl-v126-supervisor-all{
      border:1px solid #dce6f1;
      border-radius:14px;
      background:#fff;
      padding:12px;
      margin-bottom:9px;
    }
    .mvl-v126-supervisor-head{
      display:flex;
      justify-content:space-between;
      gap:10px;
      margin-bottom:9px;
    }
    .mvl-v126-supervisor-head strong{color:#073b78;font-size:.80rem}
    .mvl-v126-supervisor-head small{color:#718096;font-size:.65rem;text-align:right}
    .mvl-v126-kpi-grid{
      display:grid;
      grid-template-columns:repeat(3,minmax(0,1fr));
      gap:7px;
    }
    .mvl-v126-kpi-grid>div{
      padding:8px;
      border-radius:10px;
      background:#f8fbff;
      border:1px solid #e3edf7;
      min-width:0;
    }
    .mvl-v126-kpi-grid span{
      display:block;
      color:#66788d;
      font-size:.61rem;
      margin-bottom:3px;
    }
    .mvl-v126-kpi-grid b{
      display:block;
      color:#102f55;
      font-size:.76rem;
      margin-bottom:4px;
    }
    .mvl-v126-kpi-grid .mvl-v113-status{
      margin:0;
      font-size:.56rem;
      padding:2px 6px;
    }
    @media(max-width:540px){
      .mvl-v126-kpi-grid{grid-template-columns:1fr}
      .mvl-v126-supervisor-head{display:block}
      .mvl-v126-supervisor-head small{display:block;text-align:left;margin-top:3px}
    }
  `;
  document.head.appendChild(style);
})();

console.info('[MI VISUAL LIMA] V1.26: Todos los indicadores restaurado.');


/* ==========================================================
   MI VISUAL LIMA - V1.27
   FILTROS debajo de Fecha de corte + panel desplegable.
   Solo frontend. No cambia cálculos ni API.
   ========================================================== */
(() => {
  const ID_PANEL = 'mvlV127FilterPanel';
  const ID_TOGGLE = 'mvlV127FilterToggle';
  const ID_STYLE = 'mvlV127Styles';

  function installStyles127() {
    if (document.getElementById(ID_STYLE)) return;

    const style = document.createElement('style');
    style.id = ID_STYLE;
    style.textContent = `
      #${ID_PANEL}{
        margin:7px 0 12px;
        border:1px solid #d6e3f2;
        border-radius:13px;
        background:#fff;
        overflow:hidden;
      }

      .mvl-v127-filter-head{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
        padding:9px 11px;
        background:linear-gradient(180deg,#f9fcff,#f4f8fd);
        cursor:pointer;
        user-select:none;
      }

      .mvl-v127-filter-title{
        display:flex;
        align-items:center;
        gap:8px;
        min-width:0;
      }

      .mvl-v127-filter-title strong{
        color:#092f5d;
        font-size:.75rem;
        letter-spacing:.01em;
      }

      .mvl-v127-filter-summary{
        color:#6a7d93;
        font-size:.62rem;
        white-space:nowrap;
        overflow:hidden;
        text-overflow:ellipsis;
        max-width:420px;
      }

      #${ID_TOGGLE}{
        flex:0 0 auto;
        min-height:30px;
        padding:5px 10px;
        border-radius:9px;
        border:1px solid #cbdcf0;
        background:#fff;
        color:#0758b7;
        font-size:.65rem;
        font-weight:850;
      }

      .mvl-v127-filter-body{
        padding:10px 11px 11px;
        border-top:1px solid #e3edf7;
      }

      .mvl-v127-filter-body.hidden{
        display:none !important;
      }

      /* Reusar los filtros existentes, pero sin el título viejo duplicado */
      #${ID_PANEL} .dashboard-filter-grid{
        margin:0 !important;
      }

      #${ID_PANEL} .dashboard-v19-active-filters{
        margin:8px 0 0 !important;
      }

      #${ID_PANEL} #dashboardApply{
        width:100%;
      }

      /* Compactar la grilla de filtros */
      #${ID_PANEL} .dashboard-filter-grid{
        display:grid !important;
        grid-template-columns:repeat(3,minmax(0,1fr)) !important;
        gap:8px !important;
      }

      #${ID_PANEL} .dashboard-filter-grid label,
      #${ID_PANEL} .dashboard-filter-grid .field{
        min-width:0 !important;
      }

      #${ID_PANEL} .dashboard-filter-grid select,
      #${ID_PANEL} .dashboard-filter-grid input{
        width:100% !important;
      }

      /* El Resumen queda inmediatamente después del filtro */
      #dashboardTotalSummaryV19{
        margin-top:0 !important;
      }

      @media(max-width:760px){
        #${ID_PANEL} .dashboard-filter-grid{
          grid-template-columns:repeat(2,minmax(0,1fr)) !important;
        }
        .mvl-v127-filter-summary{
          max-width:260px;
        }
      }

      @media(max-width:480px){
        #${ID_PANEL} .dashboard-filter-grid{
          grid-template-columns:1fr !important;
        }
        .mvl-v127-filter-summary{
          display:none;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function getFilterText127() {
    const labels = [];

    const supervisor = document.getElementById('dashboardSupervisor');
    const visual = document.getElementById('dashboardVisualTypeV19');
    const platform = document.getElementById('dashboardPlatformV19');
    const composition = document.getElementById('dashboardCompositionV19');
    const state = document.getElementById('dashboardStateV19');
    const crew = document.getElementById('dashboardCrew');
    const indicator = document.getElementById('dashboardIndicator');
    const compare = document.getElementById('dashboardCompareByV116');

    const selectedText = el => {
      if (!el || !el.value) return '';
      return el.options?.[el.selectedIndex]?.text || '';
    };

    const push = (prefix, el, allValues = []) => {
      if (!el) return;
      const value = String(el.value || '');
      if (!value || allValues.includes(value)) return;
      const text = selectedText(el);
      if (text) labels.push(`${prefix}: ${text}`);
    };

    push('Supervisor', supervisor, ['']);
    push('Visual', visual, ['']);
    push('Plataforma', platform, ['']);
    push('Composición', composition, ['']);
    push('Estado', state, ['']);
    push('Cuadrilla', crew, ['']);

    if (indicator) {
      const text = selectedText(indicator);
      if (text && indicator.value !== 'ALL') labels.push(`Indicador: ${text}`);
    }

    if (compare) {
      const text = selectedText(compare);
      if (text && !/CUADRILLAS/i.test(text)) labels.push(`Comparar: ${text}`);
    }

    return labels.length ? labels.join(' · ') : 'Sin filtros · total del alcance';
  }

  function updateFilterHeader127() {
    const summary = document.querySelector(`#${ID_PANEL} .mvl-v127-filter-summary`);
    if (summary) summary.textContent = getFilterText127();
  }

  function setOpen127(open) {
    const body = document.querySelector(`#${ID_PANEL} .mvl-v127-filter-body`);
    const toggle = document.getElementById(ID_TOGGLE);
    if (!body || !toggle) return;

    body.classList.toggle('hidden', !open);
    toggle.textContent = open ? 'Ocultar' : 'Desplegar';
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');

    try {
      sessionStorage.setItem('mvl_v127_filters_open', open ? '1' : '0');
    } catch (_) {}
  }

  function buildFilterPanel127() {
    installStyles127();

    const dashboard = document.getElementById('performanceDashboardPanel');
    const summary = document.getElementById('dashboardTotalSummaryV19');
    const cutoff = document.getElementById('mvlV118DashboardCutoff');
    const grid = dashboard?.querySelector('.dashboard-filter-grid');

    if (!dashboard || !summary || !grid || !cutoff) return false;
    if (document.getElementById(ID_PANEL)) {
      updateFilterHeader127();
      return true;
    }

    // Buscar el bloque completo donde hoy viven filtros + chips.
    const activeChips = document.getElementById('dashboardActiveFiltersV19');

    const panel = document.createElement('section');
    panel.id = ID_PANEL;

    const head = document.createElement('div');
    head.className = 'mvl-v127-filter-head';
    head.innerHTML = `
      <div class="mvl-v127-filter-title">
        <strong>FILTRAR</strong>
        <span class="mvl-v127-filter-summary">Sin filtros · total del alcance</span>
      </div>
      <button type="button" id="${ID_TOGGLE}" aria-expanded="false">Desplegar</button>
    `;

    const body = document.createElement('div');
    body.className = 'mvl-v127-filter-body hidden';

    panel.appendChild(head);
    panel.appendChild(body);

    // Mover los controles reales, no duplicarlos.
    body.appendChild(grid);
    if (activeChips) body.appendChild(activeChips);

    // Insertar debajo de Fecha de corte y antes del Resumen.
    cutoff.insertAdjacentElement('afterend', panel);

    // Eliminar el título FILTRAR anterior si quedó suelto.
    const oldTitles = [...dashboard.querySelectorAll('h3,h4,strong')].filter(el =>
      el !== head.querySelector('strong') &&
      String(el.textContent || '').trim().toUpperCase() === 'FILTRAR' &&
      !panel.contains(el)
    );
    oldTitles.forEach(el => {
      const parent = el.parentElement;
      if (parent && parent.children.length === 1) parent.remove();
      else el.remove();
    });

    const toggle = document.getElementById(ID_TOGGLE);
    const toggleAction = (event) => {
      event?.preventDefault?.();
      const isOpen = !body.classList.contains('hidden');
      setOpen127(!isOpen);
    };

    toggle?.addEventListener('click', toggleAction);
    head.addEventListener('click', event => {
      if (event.target?.closest?.(`#${ID_TOGGLE}`)) return;
      toggleAction(event);
    });

    // Si el usuario ya lo desplegó en esta sesión, mantenerlo.
    let remembered = false;
    try {
      remembered = sessionStorage.getItem('mvl_v127_filters_open') === '1';
    } catch (_) {}
    setOpen127(remembered);

    // Actualizar el resumen del encabezado cuando cambien filtros.
    body.addEventListener('change', () => {
      updateFilterHeader127();
    });

    const apply = document.getElementById('dashboardApply');
    apply?.addEventListener('click', () => {
      updateFilterHeader127();
      // Al aplicar NO se oculta: queda abierto hasta que el usuario pulse Ocultar.
      setOpen127(true);
    });

    updateFilterHeader127();
    return true;
  }

  let scheduled127 = false;
  function schedule127() {
    if (scheduled127) return;
    scheduled127 = true;
    requestAnimationFrame(() => {
      scheduled127 = false;
      buildFilterPanel127();
      updateFilterHeader127();
    });
  }

  function start127() {
    if (buildFilterPanel127()) return;

    // Solo observar el panel del Dashboard hasta que existan Fecha de corte + filtros.
    const dashboard = document.getElementById('performanceDashboardPanel');
    if (!dashboard) return;

    const observer = new MutationObserver(() => {
      if (buildFilterPanel127()) observer.disconnect();
    });
    observer.observe(dashboard, { childList:true, subtree:true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start127, { once:true });
  } else {
    start127();
  }

  // Cuando se actualiza el Dashboard, refrescar el texto del encabezado.
  document.addEventListener('change', event => {
    if (event.target?.closest?.(`#${ID_PANEL}`)) schedule127();
  });
})();

console.info('[MI VISUAL LIMA] V1.27: filtros debajo de Fecha de corte con Desplegar/Ocultar.');


/* ==========================================================
   MI VISUAL LIMA - V2.00
   MAPA OPERATIVO + SLA / TIEMPO DE GESTIÓN
   ========================================================== */
(() => {
  const V200 = {
    dashboard: null,
    tech: null,
    map: {
      view: null,
      leaflet: null,
      layer: null,
      ctoLayer: null,
      markers: new Map(),
      data: null,
      loadType: '',
      opened: false
    },
    configByType: new Map(),
    apiWrapped: false
  };

  const $200 = id => document.getElementById(id);
  const norm200 = value => String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
  const key200 = value => norm200(value).replace(/[^A-Z0-9]/g, '');
  const esc200 = value => String(value ?? '')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');

  function pct200(value, digits = 1) {
    return value == null || !Number.isFinite(Number(value))
      ? '—'
      : `${(Number(value) * 100).toFixed(digits)}%`;
  }

  function statusInfo200(status) {
    const n = norm200(status);
    if (n === 'CUMPLE' || n === 'OPTIMO') return { cls:'cumple', label:'Óptimo' };
    if (n === 'ATENCION' || n === 'MODERADO') return { cls:'atencion', label:'Moderado' };
    if (n === 'CRITICO') return { cls:'critico', label:'Crítico' };
    return { cls:'sin-dato', label:'Sin dato' };
  }

  function positiveStatus200(value, rule) {
    if (value == null || !Number.isFinite(Number(value))) return '';
    const moderate = Number(rule?.moderateFrom ?? .8);
    const optimal = Number(rule?.optimalFrom ?? .9);
    if (Number(value) >= optimal) return 'CUMPLE';
    if (Number(value) >= moderate) return 'ATENCION';
    return 'CRITICO';
  }

  function modulePermission200(name) {
    return (sessionData?.modules || []).find(m => norm200(m.module) === norm200(name)) || null;
  }

  /* -------------------------
     ACTIVAR MÓDULO MAPA
     ------------------------- */

  function activateMapCard200() {
    const card = document.querySelector('#moduleList [data-module="Mapa Operativo"]');
    const permission = modulePermission200('Mapa Operativo');
    if (!card || !permission?.permissions?.ver) return;

    card.disabled = false;
    card.classList.add('module-active');
    const small = card.querySelector('.module-copy small');
    if (small) small.textContent = 'Órdenes georreferenciadas y SLA';
    const arrow = card.querySelector('.module-arrow');
    if (arrow) arrow.textContent = '›';
  }

  function watchMapCard200() {
    const list = $200('moduleList');
    if (!list || list.dataset.v200MapObserved === '1') return;
    list.dataset.v200MapObserved = '1';
    activateMapCard200();
    new MutationObserver(activateMapCard200).observe(list, { childList:true });
  }

  document.addEventListener('click', event => {
    const card = event.target?.closest?.('#moduleList [data-module="Mapa Operativo"]');
    if (!card || card.disabled) return;
    openMap200();
  });

  /* -------------------------
     VISTA MAPA
     ------------------------- */

  function installStyles200() {
    if ($200('mvlV200Styles')) return;
    const style = document.createElement('style');
    style.id = 'mvlV200Styles';
    style.textContent = `
      #mapViewV200{padding-bottom:18px}
      .mvl200-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px}
      .mvl200-head h2{margin:4px 0 2px}
      .mvl200-head-actions{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end}
      .mvl200-last{font-size:.69rem;color:#62758b;margin-top:3px}
      .mvl200-load-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin:10px 0 12px}
      .mvl200-load-btn{border:1px solid #c8ddf5;border-radius:12px;background:#f5faff;padding:11px;text-align:left;color:#073b78;cursor:pointer}
      .mvl200-load-btn strong{display:block;font-size:.78rem}
      .mvl200-load-btn small{display:block;margin-top:3px;color:#687b91;font-size:.64rem}
      .mvl200-load-btn:hover{background:#edf6ff}
      .mvl200-msg{margin:7px 0 11px;padding:8px 10px;border-radius:10px;background:#f7f9fc;color:#5e7085;font-size:.67rem;line-height:1.3}
      .mvl200-msg.ok{background:#edf9f1;color:#16743c;border:1px solid #c7e8d2}
      .mvl200-msg.error{background:#fff1f1;color:#ad2b23;border:1px solid #f0c8c6}
      .mvl200-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-bottom:10px}
      .mvl200-kpi{border:1px solid #dce6f1;border-radius:12px;background:#fff;padding:9px 10px}
      .mvl200-kpi span{display:block;color:#6d7d91;font-size:.61rem}
      .mvl200-kpi strong{display:block;margin-top:2px;color:#0a315f;font-size:.94rem}
      .mvl200-kpi small{display:block;margin-top:2px;color:#7b899a;font-size:.57rem}
      .mvl200-filter-panel{border:1px solid #dbe6f2;border-radius:13px;background:#fff;margin-bottom:10px;overflow:hidden}
      .mvl200-filter-head{display:flex;justify-content:space-between;align-items:center;padding:8px 10px;background:#f7faff}
      .mvl200-filter-head strong{font-size:.72rem;color:#0a315f}
      .mvl200-filter-body{padding:9px 10px;border-top:1px solid #e4edf6}
      .mvl200-filter-body.hidden{display:none}
      .mvl200-filter-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
      .mvl200-field{font-size:.62rem;font-weight:750;color:#425a75;min-width:0}
      .mvl200-field select,.mvl200-field input{display:block;width:100%;margin-top:4px;min-height:38px;border:1px solid #cddbeb;border-radius:9px;padding:7px 8px;background:#fff;color:#102f55}
      .mvl200-filter-actions{display:flex;gap:7px;margin-top:9px}
      .mvl200-map-toolbar{display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin:8px 0}
      .mvl200-map-toolbar label{display:inline-flex;gap:6px;align-items:center;font-size:.67rem;color:#53677f}
      #mvl200Map{height:470px;border:1px solid #d5e1ee;border-radius:14px;overflow:hidden;background:#eef3f8}
      .mvl200-list{margin-top:11px}
      .mvl200-order{border:1px solid #e0e8f1;border-radius:11px;background:#fff;padding:9px 10px;margin-bottom:6px;cursor:pointer}
      .mvl200-order:hover{border-color:#aac9ed;background:#fbfdff}
      .mvl200-order-head{display:flex;justify-content:space-between;gap:10px}
      .mvl200-order strong{font-size:.72rem;color:#073b78}
      .mvl200-order small{font-size:.60rem;color:#6f8094}
      .mvl200-pills{display:flex;flex-wrap:wrap;gap:4px;margin-top:5px}
      .mvl200-pill{border:1px solid #dde7f1;border-radius:999px;padding:3px 6px;font-size:.55rem;color:#53687f;background:#f8fafc}
      .mvl200-pill.ok{background:#edf9f1;color:#13733a;border-color:#c8e7d2}
      .mvl200-pill.bad{background:#fff1f1;color:#b22822;border-color:#efc9c7}
      .mvl200-popup{min-width:230px;max-width:330px;font-family:inherit}
      .mvl200-popup h4{margin:0 0 5px;color:#073b78}
      .mvl200-popup-grid{display:grid;grid-template-columns:auto 1fr;gap:3px 7px;font-size:.70rem}
      .mvl200-popup-grid b{color:#405a75}
      .mvl200-popup-grid span{color:#1e3550;word-break:break-word}
      .mvl200-route{display:inline-block;margin-top:8px;font-weight:800;color:#0758b7}
      .mvl200-sla-badge{display:inline-flex;margin-top:7px;border-radius:999px;padding:4px 7px;font-size:.62rem;font-weight:850}
      .mvl200-sla-badge.ok{background:#eaf8ef;color:#14723a}
      .mvl200-sla-badge.bad{background:#fff0f0;color:#b42318}
      .mvl200-sla-badge.neutral{background:#f1f5f9;color:#64748b}
      .leaflet-tooltip.mvl200-crew-label{
        background:rgba(255,255,255,.95);
        border:1px solid #b9cce2;
        border-radius:6px;
        box-shadow:0 1px 4px rgba(28,55,86,.12);
        color:#073b78;
        font-size:9px;
        font-weight:850;
        line-height:1;
        padding:3px 5px;
        pointer-events:none;
        white-space:nowrap;
      }
      .leaflet-tooltip-right.mvl200-crew-label:before{
        border-right-color:#b9cce2;
      }
      .mvl200-modal-file{position:fixed;inset:0;z-index:9999;background:rgba(18,39,64,.44);display:grid;place-items:center;padding:20px}
      .mvl200-modal-file.hidden{display:none}
      .mvl200-modal-card{width:min(480px,100%);background:#fff;border-radius:16px;padding:16px;box-shadow:0 20px 60px rgba(0,0,0,.22)}
      .mvl200-modal-card h3{margin:0 0 6px;color:#0a315f}
      .mvl200-modal-card p{font-size:.70rem;color:#65778c;line-height:1.4}
      .mvl200-modal-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:12px}
      .mvl200-mini-loader{display:inline-flex;gap:7px;align-items:center;color:#0758b7;font-weight:800;font-size:.67rem}
      .mvl200-dot{width:12px;height:12px;border:2px solid #cfe0f5;border-top-color:#0758b7;border-radius:50%;animation:mvl200spin .8s linear infinite}
      @keyframes mvl200spin{to{transform:rotate(360deg)}}
      .mvl200-sla-active::before{background:#16a34a !important}
      @media(max-width:760px){
        .mvl200-kpis{grid-template-columns:1fr 1fr}
        .mvl200-filter-grid{grid-template-columns:1fr 1fr}
        #mvl200Map{height:420px}
      }
      @media(max-width:480px){
        .mvl200-head{display:block}
        .mvl200-head-actions{justify-content:flex-start;margin-top:8px}
        .mvl200-load-grid{grid-template-columns:1fr}
        .mvl200-filter-grid{grid-template-columns:1fr}
        #mvl200Map{height:360px}
      }
    `;
    document.head.appendChild(style);
  }

  function createMapView200() {
    if ($200('mapViewV200')) return $200('mapViewV200');
    installStyles200();

    const main = document.querySelector('main.shell') || document.querySelector('main') || document.body;
    const view = document.createElement('section');
    view.className = 'card app-card hidden';
    view.id = 'mapViewV200';
    view.innerHTML = `
      <div class="mvl200-head">
        <div>
          <button type="button" class="back-link" id="mvl200Back">← Inicio</button>
          <p class="eyebrow">MAPA OPERATIVO</p>
          <h2>Mapa Operativo Lima</h2>
          <p class="muted">Órdenes de Instalación y Visita Técnica · georreferencia y Tiempo de gestión / SLA</p>
          <div class="mvl200-last" id="mvl200LastUpdate">Sin carga registrada</div>
        </div>
        <div class="mvl200-head-actions">
          <button type="button" class="ghost small" id="mvl200Refresh">Actualizar</button>
        </div>
      </div>

      <div class="mvl200-load-grid" id="mvl200LoadGrid">
        <button type="button" class="mvl200-load-btn" id="mvl200LoadInst">
          <strong>CARGA INSTALACIONES</strong>
          <small>Excel de instalaciones · valida TipoTraba antes de registrar</small>
        </button>
        <button type="button" class="mvl200-load-btn" id="mvl200LoadVt">
          <strong>CARGA VISITA TÉCNICA</strong>
          <small>VT, Traslado, SGA y Post/MotoWIN</small>
        </button>
        <input type="file" id="mvl200FileInst" accept=".xlsx,.xls" hidden>
        <input type="file" id="mvl200FileVt" accept=".xlsx,.xls" hidden>
      </div>
      <div class="mvl200-msg" id="mvl200Message">Las cargas actualizan órdenes existentes por OrdenId; no duplican el historial.</div>

      <div class="mvl200-kpis">
        <div class="mvl200-kpi"><span>Órdenes visibles</span><strong id="mvl200KpiTotal">0</strong><small>según filtros y alcance</small></div>
        <div class="mvl200-kpi"><span>Georreferenciadas</span><strong id="mvl200KpiGeo">0</strong><small>con coordenadas válidas</small></div>
        <div class="mvl200-kpi"><span>Finalizadas</span><strong id="mvl200KpiFinal">0</strong><small>órdenes cerradas</small></div>
        <div class="mvl200-kpi"><span>Tiempo gestión / SLA</span><strong id="mvl200KpiSla">—</strong><small id="mvl200KpiSlaHelp">Sin órdenes evaluables</small></div>
      </div>

      <section class="mvl200-filter-panel">
        <div class="mvl200-filter-head" id="mvl200FilterHead">
          <strong>FILTRAR MAPA</strong>
          <button type="button" class="ghost small" id="mvl200FilterToggle">Ocultar</button>
        </div>
        <div class="mvl200-filter-body" id="mvl200FilterBody">
          <div class="mvl200-filter-grid">
            <label class="mvl200-field">Periodo<input type="month" id="mvl200Period" min="2026-08"></label>
            <label class="mvl200-field">Fecha<input type="date" id="mvl200Date"></label>
            <label class="mvl200-field">Supervisor<select id="mvl200Supervisor"><option value="">Todos</option></select></label>
            <label class="mvl200-field">Plataforma WIN<select id="mvl200Platform"><option value="">Todas</option></select></label>
            <label class="mvl200-field">Tipo cuadrilla Visual<select id="mvl200Visual"><option value="">Todos</option></select></label>
            <label class="mvl200-field">Tipo de trabajo<select id="mvl200Work"><option value="">Todos</option></select></label>
            <label class="mvl200-field">Estado<select id="mvl200State"><option value="">Todos</option></select></label>
            <label class="mvl200-field">Cuadrilla<select id="mvl200Crew"><option value="">Todas</option></select></label>
            <label class="mvl200-field">Código orden<input type="search" id="mvl200Code" placeholder="Ej. 3349062"></label>
          </div>
          <div class="mvl200-filter-actions">
            <button type="button" class="primary compact" id="mvl200Apply">Aplicar</button>
            <button type="button" class="ghost compact" id="mvl200Clear">Limpiar</button>
          </div>
        </div>
      </section>

      <div class="mvl200-map-toolbar">
        <div id="mvl200Loading" class="mvl200-mini-loader hidden"><span class="mvl200-dot"></span> Actualizando mapa…</div>
        <label><input type="checkbox" id="mvl200ShowCto"> Mostrar CTO con coordenadas</label>
      </div>

      <div id="mvl200Map"></div>
      <div class="mvl200-list" id="mvl200List"></div>
    `;
    main.appendChild(view);

    $200('mvl200Back')?.addEventListener('click', () => {
      view.classList.add('hidden');
      if (sessionData) renderHome(sessionData);
      else if (typeof restoreSession === 'function') restoreSession();
    });
    $200('mvl200Refresh')?.addEventListener('click', loadMapData200);
    $200('mvl200Apply')?.addEventListener('click', loadMapData200);
    $200('mvl200Clear')?.addEventListener('click', () => {
      ['mvl200Date','mvl200Supervisor','mvl200Platform','mvl200Visual','mvl200Work','mvl200State','mvl200Crew','mvl200Code']
        .forEach(id => { if ($200(id)) $200(id).value = ''; });
      loadMapData200();
    });

    $200('mvl200FilterToggle')?.addEventListener('click', () => {
      const body = $200('mvl200FilterBody');
      const hidden = body?.classList.toggle('hidden');
      if ($200('mvl200FilterToggle')) $200('mvl200FilterToggle').textContent = hidden ? 'Desplegar' : 'Ocultar';
    });

    $200('mvl200LoadInst')?.addEventListener('click', () => $200('mvl200FileInst')?.click());
    $200('mvl200LoadVt')?.addEventListener('click', () => $200('mvl200FileVt')?.click());
    $200('mvl200FileInst')?.addEventListener('change', e => importMapFile200(e.target.files?.[0], 'INSTALACIONES'));
    $200('mvl200FileVt')?.addEventListener('change', e => importMapFile200(e.target.files?.[0], 'VISITA_TECNICA'));
    $200('mvl200ShowCto')?.addEventListener('change', renderCtoLayer200);

    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2,'0');
    $200('mvl200Period').value = `${y}-${m}`;

    return view;
  }

  async function openMap200() {
    const permission = modulePermission200('Mapa Operativo');
    if (!permission?.permissions?.ver) return;

    const view = createMapView200();
    ['loginView','changePasswordView','homeView','adminView','performanceView']
      .forEach(id => $200(id)?.classList.add('hidden'));
    view.classList.remove('hidden');
    document.body.classList.remove('login-mode');
    window.scrollTo({ top:0, behavior:'instant' });

    const canImport = Boolean(permission.permissions.registrar);
    $200('mvl200LoadGrid')?.classList.toggle('hidden', !canImport);

    // V2.01: XLSX solo se carga cuando realmente se selecciona un Excel.
    await Promise.allSettled([ensureLeaflet200()]);
    await loadMapData200();
  }

  function loadScript200(src, marker) {
    return new Promise((resolve, reject) => {
      if (window[marker]) return resolve();
      const existing = document.querySelector(`script[data-mvl="${marker}"]`);
      if (existing) {
        existing.addEventListener('load', resolve, { once:true });
        existing.addEventListener('error', reject, { once:true });
        return;
      }
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.dataset.mvl = marker;
      s.onload = resolve;
      s.onerror = () => reject(new Error(`No se pudo cargar ${marker}.`));
      document.head.appendChild(s);
    });
  }

  async function ensureLeaflet200() {
    if (window.L) return;
    if (!$200('mvlLeafletCss200')) {
      const link = document.createElement('link');
      link.id = 'mvlLeafletCss200';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    await loadScript200('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', 'L');
  }

  async function ensureXlsx200() {
    if (window.XLSX) return;
    await loadScript200('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js', 'XLSX');
  }

  function initLeaflet200() {
    if (!window.L || V200.map.leaflet) return;
    const el = $200('mvl200Map');
    if (!el) return;

    V200.map.leaflet = L.map(el, { preferCanvas:true }).setView([-12.0464, -77.0428], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom:19,
      attribution:'&copy; OpenStreetMap'
    }).addTo(V200.map.leaflet);

    V200.map.layer = L.layerGroup().addTo(V200.map.leaflet);
    V200.map.ctoLayer = L.layerGroup();
  }

  function mapFilters200() {
    return {
      token: typeof token === 'function' ? token() : '',
      period: $200('mvl200Period')?.value || '',
      date: $200('mvl200Date')?.value || '',
      supervisorId: $200('mvl200Supervisor')?.value || '',
      platform: $200('mvl200Platform')?.value || '',
      visualType: $200('mvl200Visual')?.value || '',
      workType: $200('mvl200Work')?.value || '',
      state: $200('mvl200State')?.value || '',
      crewId: $200('mvl200Crew')?.value || '',
      code: $200('mvl200Code')?.value.trim() || ''
    };
  }

  async function loadMapData200() {
    const loading = $200('mvl200Loading');
    loading?.classList.remove('hidden');
    try {
      const data = await api('mapData', mapFilters200());
      if (!data?.ok) {
        if (data?.expired && typeof clearSession === 'function') return clearSession();
        throw new Error(data?.error || 'No se pudo cargar Mapa Operativo.');
      }

      V200.map.data = data;
      if ($200('mvl200LastUpdate')) {
        $200('mvl200LastUpdate').textContent = data.lastUpdate
          ? `Última actualización: ${data.lastUpdate}`
          : 'Sin carga registrada';
      }

      $200('mvl200LoadGrid')?.classList.toggle('hidden', !data.canImport);
      fillMapCatalogs200(data.catalogs || {});
      renderMapKpis200(data);
      renderMapOrders200(data.orders || []);
      setMapMessage200(
        data.records
          ? `${data.records} órdenes dentro del alcance y filtros seleccionados.`
          : 'No hay órdenes para los filtros seleccionados.',
        data.records ? 'ok' : ''
      );
    } catch (err) {
      setMapMessage200(err.message || 'No se pudo cargar Mapa Operativo.', 'error');
    } finally {
      loading?.classList.add('hidden');
    }
  }

  function setMapMessage200(text, type = '') {
    const el = $200('mvl200Message');
    if (!el) return;
    el.textContent = text || '';
    el.className = `mvl200-msg ${type}`.trim();
  }

  function keepSelect200(id, baseLabel, items, valueKey = null, labelKey = null) {
    const el = $200(id);
    if (!el) return;
    const current = el.value;
    const opts = [`<option value="">${esc200(baseLabel)}</option>`];

    (items || []).forEach(item => {
      const value = valueKey ? item?.[valueKey] : item;
      const label = labelKey ? item?.[labelKey] : item;
      if (value == null || value === '') return;
      opts.push(`<option value="${esc200(value)}">${esc200(label)}</option>`);
    });

    el.innerHTML = opts.join('');
    if ([...el.options].some(o => o.value === current)) el.value = current;
  }

  function fillMapCatalogs200(c) {
    keepSelect200('mvl200Supervisor', 'Todos', c.supervisors, 'id', 'name');
    keepSelect200('mvl200Platform', 'Todas', c.platforms);
    keepSelect200('mvl200Visual', 'Todos', c.visualTypes);
    keepSelect200('mvl200Work', 'Todos', c.workTypes);
    keepSelect200('mvl200State', 'Todos', c.states);
    keepSelect200('mvl200Crew', 'Todas', c.crews, 'id', 'name');
  }

  function renderMapKpis200(data) {
    const orders = data.orders || [];
    const geo = orders.filter(o => Number.isFinite(Number(o.latitud)) && Number.isFinite(Number(o.longitud))).length;
    const finalized = orders.filter(o => norm200(o.estado) === 'FINALIZADA').length;
    const sla = data.sla || {};

    if ($200('mvl200KpiTotal')) $200('mvl200KpiTotal').textContent = String(orders.length);
    if ($200('mvl200KpiGeo')) $200('mvl200KpiGeo').textContent = String(geo);
    if ($200('mvl200KpiFinal')) $200('mvl200KpiFinal').textContent = String(finalized);
    if ($200('mvl200KpiSla')) $200('mvl200KpiSla').textContent = pct200(sla.percent);
    if ($200('mvl200KpiSlaHelp')) {
      $200('mvl200KpiSlaHelp').textContent = sla.evaluables
        ? `${sla.cumplen} de ${sla.evaluables} dentro de SLA`
        : 'Sin órdenes evaluables';
    }
  }

  function markerColor200(state) {
    const s = norm200(state);
    if (s === 'FINALIZADA') return '#16a34a';
    if (s.includes('CANCEL') || s.includes('ANUL')) return '#dc2626';
    if (s.includes('REPROGRAM')) return '#f59e0b';
    if (s.includes('EN CAMINO') || s === 'EN_CAMINO') return '#0891b2';
    if (s.includes('INICIAD')) return '#7c3aed';
    if (s.includes('AGENDAD')) return '#2563eb';
    return '#64748b';
  }

  function slaBadgeHtml200(sla) {
    if (!sla) return '<span class="mvl200-sla-badge neutral">SLA: sin cruce</span>';
    if (!sla.evaluable) {
      return `<span class="mvl200-sla-badge neutral">SLA: ${esc200(sla.motivoNoEvaluable || 'No evaluable')}</span>`;
    }
    const cls = sla.cumple ? 'ok' : 'bad';
    return `<span class="mvl200-sla-badge ${cls}">${sla.cumple ? 'Dentro de SLA' : 'Fuera de SLA'} · ${Number(sla.minutosGestion || 0).toFixed(0)} / ${Number(sla.slaMinutos || 0).toFixed(0)} min</span>`;
  }

  function mapPopup200(o) {
    const fields = [
      ['Cuadrilla', o.cuadrilla || o.codigoCuadrilla],
      ['Estado', o.estado],
      ['Tipo', o.tipoTrabajo],
      ['Grupo', o.grupoTrabajo],
      ['Cliente', o.cliente],
      ['Código cliente', o.codigoCliente],
      ['Dirección', [o.direccion,o.direccionAdicional].filter(Boolean).join(' · ')],
      ['Inicio visita', o.fechaInicioVisita],
      ['Fin visita', o.fechaFinVisita],
      ['Partida', o.sla?.tipoPartida],
      ['CTO', o.cto],
      ['Puerto', o.puerto]
    ].filter(x => String(x[1] ?? '').trim());

    const lat = Number(o.latitud), lng = Number(o.longitud);
    const route = Number.isFinite(lat) && Number.isFinite(lng)
      ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${lat},${lng}`)}`
      : '';

    return `
      <div class="mvl200-popup">
        <h4>Orden ${esc200(o.ordenId)}</h4>
        <div class="mvl200-popup-grid">
          ${fields.map(f => `<b>${esc200(f[0])}</b><span>${esc200(f[1])}</span>`).join('')}
        </div>
        ${slaBadgeHtml200(o.sla)}
        ${route ? `<a class="mvl200-route" href="${route}" target="_blank" rel="noopener noreferrer">📍 Cómo llegar</a>` : ''}
      </div>`;
  }


  function platformShort200(value) {
    const p = norm200(value);
    if (p === 'SGI') return 'SGI';
    if (p === 'SGA') return 'SGA';
    if (p === 'TRASLADO' || p === 'TRAS') return 'TRAS';
    if (
      p === 'POSTMOTOWIN' ||
      p === 'POST MOTOWIN' ||
      p === 'MOTOWIN' ||
      p === 'MOTOWIN POSTVENTA' ||
      p === 'POSTVENTA'
    ) return 'PVTWIN';
    return String(value || '').trim().toUpperCase();
  }

  function crewMarkerLabel200(o) {
    const code = String(o?.codigoCuadrilla || '').trim().toUpperCase();
    const platform = platformShort200(o?.plataforma);
    return [code, platform].filter(Boolean).join(' ');
  }

  function renderMapOrders200(orders) {
    initLeaflet200();
    const map = V200.map.leaflet;
    const layer = V200.map.layer;
    if (layer) layer.clearLayers();
    V200.map.markers.clear();

    const bounds = [];
    (orders || []).forEach(o => {
      const lat = Number(o.latitud), lng = Number(o.longitud);
      if (!map || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
      const marker = L.circleMarker([lat,lng], {
        radius:7,
        color:'#fff',
        weight:1.5,
        fillColor:markerColor200(o.estado),
        fillOpacity:.92
      }).bindPopup(mapPopup200(o), { maxWidth:360 });

      const crewLabel = crewMarkerLabel200(o);
      if (crewLabel) {
        marker.bindTooltip(crewLabel, {
          permanent:true,
          direction:'right',
          offset:[8,0],
          className:'mvl200-crew-label',
          opacity:.96
        });
      }

      marker.addTo(layer);
      V200.map.markers.set(String(o.ordenId), marker);
      bounds.push([lat,lng]);
    });

    if (map) {
      setTimeout(() => map.invalidateSize(), 50);
      if (bounds.length === 1) map.setView(bounds[0], 15);
      else if (bounds.length > 1) map.fitBounds(bounds, { padding:[25,25], maxZoom:15 });
      else map.setView([-12.0464,-77.0428], 11);
    }

    renderCtoLayer200();

    const list = $200('mvl200List');
    if (!list) return;
    const sample = (orders || []).slice(0, 150);
    list.innerHTML = sample.length
      ? sample.map(o => `
        <div class="mvl200-order" data-map-order="${esc200(o.ordenId)}">
          <div class="mvl200-order-head">
            <strong>${esc200(o.ordenId)} · ${esc200(o.tipoTrabajo || 'Sin tipo')}</strong>
            <small>${esc200(o.estado || '')}</small>
          </div>
          <small>${esc200(o.cuadrilla || o.codigoCuadrilla || 'Sin cuadrilla')}</small>
          <div class="mvl200-pills">
            ${o.plataforma ? `<span class="mvl200-pill">${esc200(platformShort200(o.plataforma))}</span>` : ''}
            ${o.tipoVisual ? `<span class="mvl200-pill">${esc200(o.tipoVisual)}</span>` : ''}
            ${o.grupoTrabajo ? `<span class="mvl200-pill">${esc200(o.grupoTrabajo)}</span>` : ''}
            ${o.sla?.evaluable ? `<span class="mvl200-pill ${o.sla.cumple ? 'ok' : 'bad'}">${o.sla.cumple ? 'Dentro SLA' : 'Fuera SLA'}</span>` : ''}
          </div>
        </div>`).join('')
      : '<p class="empty">No hay órdenes para mostrar.</p>';

    list.querySelectorAll('[data-map-order]').forEach(el => {
      el.addEventListener('click', () => {
        const marker = V200.map.markers.get(String(el.dataset.mapOrder));
        if (marker && map) {
          map.setView(marker.getLatLng(), Math.max(map.getZoom(), 15));
          marker.openPopup();
          $200('mvl200Map')?.scrollIntoView({ behavior:'smooth', block:'center' });
        }
      });
    });

    if ((orders || []).length > sample.length) {
      list.insertAdjacentHTML('beforeend', `<p class="muted">Se muestran las primeras ${sample.length} órdenes en la lista; el mapa contiene todas las georreferenciadas.</p>`);
    }
  }

  function renderCtoLayer200() {
    const map = V200.map.leaflet;
    const layer = V200.map.ctoLayer;
    if (!map || !layer) return;
    layer.clearLayers();

    const show = Boolean($200('mvl200ShowCto')?.checked);
    if (!show) {
      if (map.hasLayer(layer)) map.removeLayer(layer);
      return;
    }

    const seen = new Set();
    (V200.map.data?.orders || []).forEach(o => {
      [[o.cto1,o.coordenadaCto1],[o.cto2,o.coordenadaCto2],[o.cto3,o.coordenadaCto3]]
        .forEach(([code, coord]) => {
          const nums = String(coord || '').match(/-?\d+(?:[.,]\d+)?/g) || [];
          if (nums.length < 2) return;
          const lat = Number(nums[0].replace(',','.'));
          const lng = Number(nums[1].replace(',','.'));
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
          const k = `${key200(code)}|${lat}|${lng}`;
          if (seen.has(k)) return;
          seen.add(k);

          L.circleMarker([lat,lng], {
            radius:5, color:'#6d28d9', weight:2, fillColor:'#c4b5fd', fillOpacity:.9
          })
            .bindTooltip(`CTO ${code || ''}`, { permanent:false })
            .addTo(layer);
        });
    });

    layer.addTo(map);
  }

  /* -------------------------
     LECTOR EXCEL
     ------------------------- */

  function headerKey200(value) {
    return norm200(value).replace(/[^A-Z0-9]/g, '');
  }

  function excelDateParts200(value) {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return {
        y:value.getFullYear(), m:value.getMonth()+1, d:value.getDate(),
        hh:value.getHours(), mm:value.getMinutes(), ss:value.getSeconds()
      };
    }
    if (typeof value === 'number' && window.XLSX?.SSF?.parse_date_code) {
      const p = XLSX.SSF.parse_date_code(value);
      if (p) return { y:p.y,m:p.m,d:p.d,hh:p.H||0,mm:p.M||0,ss:Math.floor(p.S||0) };
    }
    return null;
  }

  function pad200(n) { return String(n).padStart(2,'0'); }

  function excelDateTime200(value) {
    const p = excelDateParts200(value);
    if (p) return `${p.y}-${pad200(p.m)}-${pad200(p.d)} ${pad200(p.hh)}:${pad200(p.mm)}:${pad200(p.ss)}`;
    const text = String(value ?? '').trim();
    return text;
  }

  function excelDateOnly200(value) {
    const p = excelDateParts200(value);
    if (p) return `${p.y}-${pad200(p.m)}-${pad200(p.d)}`;
    return String(value ?? '').trim();
  }

  function excelTimeOnly200(value) {
    const p = excelDateParts200(value);
    if (p) return `${pad200(p.hh)}:${pad200(p.mm)}:${pad200(p.ss)}`;
    return '';
  }

  function coord200(value) {
    const nums = String(value ?? '').match(/-?\d+(?:[.,]\d+)?/g) || [];
    if (nums.length < 2) return [null,null];
    const lat = Number(nums[0].replace(',','.'));
    const lng = Number(nums[1].replace(',','.'));
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat)>90 || Math.abs(lng)>180) return [null,null];
    return [lat,lng];
  }

  function parseTechnicalCto200(text) {
    const fields = {};
    String(text ?? '').split(';').forEach(segment => {
      const parts = String(segment).split('/');
      if (parts.length < 3) return;
      const k = headerKey200(parts.shift());
      parts.shift();
      const value = parts.join('/').trim();
      if (k && value && !fields[k]) fields[k] = value;
    });
    return {
      cto1:fields.CTO1 || '',
      coordenadaCto1:fields.COORDENADACTO1 || '',
      cto2:fields.CTO2 || '',
      coordenadaCto2:fields.COORDENADACTO2 || '',
      cto3:fields.CTO3 || '',
      coordenadaCto3:fields.COORDENADACTO3 || '',
      cto:fields.CTO || '',
      puerto:fields.PUERTO || ''
    };
  }

  function cell200(row, map, ...names) {
    for (const name of names) {
      const idx = map[headerKey200(name)];
      if (idx !== undefined) return row[idx];
    }
    return '';
  }

  async function parseMapWorkbook200(file) {
    await ensureXlsx200();
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type:'array', cellDates:true });

    // V2.12: el nombre del archivo y la posición de las columnas no importan.
    // Se busca, en cualquier hoja, una estructura SLA/Mapa compatible por encabezados.
    let selected = null;
    let bestMissing = [];
    for (const sheetName of wb.SheetNames) {
      const candidateRows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header:1, defval:'', raw:true });
      if (candidateRows.length < 2) continue;
      for (let i=0; i<Math.min(40, candidateRows.length); i++) {
        const keys = (candidateRows[i] || []).map(headerKey200);
        const hasOrder = keys.includes('ORDENID') || keys.includes('ORDEN') || keys.includes('IDORDEN');
        const hasType = keys.includes('TIPOTRABA') || keys.includes('TIPOTRABAJO') || keys.includes('TIPODETRABAJO');
        const hasCrew = keys.includes('CUADRILLA') || keys.includes('NOMBREDECUADRILLA') || keys.includes('CUADRILLAEJECUTORA');
        const hasState = keys.includes('ESTADO') || keys.includes('ESTADOORDEN');
        const hasDate = keys.some(k => ['FSOLI','FECHASOLICITUD','FECHAINIVISI','FECHAINICIOVISITA','FECHAFINVISI','FECHAFINVISITA','FECHAULTIMOESTADO','FECHAULTIESTA'].includes(k));
        const missing = [];
        if (!hasOrder) missing.push('OrdenId');
        if (!hasType) missing.push('TipoTraba');
        if (!hasCrew) missing.push('Cuadrilla');
        if (!hasState) missing.push('Estado');
        if (!hasDate) missing.push('Fecha');
        if (!missing.length) {
          selected = { sheetName, rows:candidateRows, headerIndex:i };
          break;
        }
        if (!bestMissing.length || missing.length < bestMissing.length) bestMissing = missing;
      }
      if (selected) break;
    }
    if (!selected) {
      throw new Error(`ESTRUCTURA NO RECONOCIDA. Faltan campos requeridos: ${(bestMissing.length ? bestMissing : ['OrdenId','TipoTraba','Cuadrilla','Estado','Fecha']).join(' · ')}.`);
    }

    const rows = selected.rows;
    const headerIndex = selected.headerIndex;
    const map = {};
    (rows[headerIndex] || []).forEach((h,i) => {
      const k = headerKey200(h);
      if (k) map[k] = i;
    });

    const geoIndex = map.GEOREFERENCIA;
    const result = [];

    rows.slice(headerIndex + 1).forEach(row => {
      const orden = cell200(row,map,'OrdenId','ORDEN_ID','Orden','ID Orden');
      if (!String(orden ?? '').trim()) return;

      const solicitud = cell200(row,map,'F.Soli','FSOLI','FECHA SOLICITUD','FechaSolicitud');
      const georef = cell200(row,map,'Georeferencia','GEOREFERENCIA');
      const [lat,lng] = coord200(georef);

      let dir = String(cell200(row,map,'Direccion') ?? '').trim();
      let dir2 = String(cell200(row,map,'Direccion1') ?? '').trim();
      if (key200(dir) && key200(dir) === key200(dir2)) dir2 = '';
      if (!dir && dir2) { dir = dir2; dir2 = ''; }

      let technical = cell200(row,map,'Datos Técnicos','Datos Tecnicos','Información CTO','Informacion CTO','Detalle CTO');
      if (!technical && geoIndex !== undefined && row[geoIndex + 1] !== undefined) {
        technical = row[geoIndex + 1];
      }
      const cto = parseTechnicalCto200(technical);

      result.push({
        ordenId:String(orden).replace(/\.0+$/,'').trim(),
        tipoTrabajo:String(cell200(row,map,'TipoTraba','TIPO_TRABAJO','Tipo Trabajo','Tipo de Trabajo') ?? '').trim(),
        fechaSolicitud:excelDateOnly200(solicitud),
        horaSolicitud:excelTimeOnly200(solicitud),
        cliente:String(cell200(row,map,'Cliente') ?? '').trim(),
        tipo:String(cell200(row,map,'Tipo') ?? '').trim(),
        productoOrigen:String(cell200(row,map,'Producto') ?? '').trim(),
        cuadrilla:String(cell200(row,map,'Cuadrilla','Nombre de Cuadrilla','Cuadrilla Ejecutora') ?? '').trim(),
        estado:String(cell200(row,map,'Estado','Estado Orden') ?? '').trim(),
        direccion:dir,
        direccionAdicional:dir2,
        fechaUltimoEstado:excelDateTime200(cell200(row,map,'FechaUltimoEstado','FechaUltiEsta','Fecha Ultimo Estado')),
        productoServicio:String(cell200(row,map,'IdenServi') ?? '').trim(),
        region:String(cell200(row,map,'Region') ?? '').trim(),
        codigoCliente:String(cell200(row,map,'CodiSeguiClien') ?? '').trim(),
        codigoSeguimiento:String(cell200(row,map,'CodiSegui') ?? '').trim(),
        numeroDocumento:String(cell200(row,map,'Número Documento','Numero Documento') ?? '').trim(),
        telefonoMovil:String(cell200(row,map,'TeleMovilNume') ?? '').trim(),
        telefonoFijo:String(cell200(row,map,'TeleFijoNume') ?? '').trim(),
        prioridad:String(cell200(row,map,'Prioridad') ?? '').trim(),
        fechaInicioVisita:excelDateTime200(cell200(row,map,'FechaIniVisi','Fecha Inicio Visita','FechaInicioVisita')),
        fechaFinVisita:excelDateTime200(cell200(row,map,'FechaFinVisi','Fecha Fin Visita','FechaFinVisita')),
        motivoCancelacion:String(cell200(row,map,'Motivo Cancelación','Motivo Cancelacion') ?? '').trim(),
        motivoFinalizacion:String(cell200(row,map,'Motivo Finalización','Motivo Finalizacion') ?? '').trim(),
        motivoAnulacion:String(cell200(row,map,'Motivo Anulación','Motivo Anulacion') ?? '').trim(),
        latitud:lat,
        longitud:lng,
        detalle:String(cell200(row,map,'Detalle','Motivo Regestión','Motivo Regestion') ?? '').trim(),
        ...cto
      });
    });

    if (!result.length) throw new Error('No se encontraron filas con OrdenId.');
    return result;
  }

  function validateClientLoad200(type, rows) {
    const typed = rows.filter(r => String(r.tipoTrabajo || '').trim());
    const inst = typed.filter(r => ['INSTALACION','INSTALACION POSIBLE FRAUDE'].includes(norm200(r.tipoTrabajo)));
    if (!typed.length) throw new Error('No se encontró TipoTraba en el archivo.');

    const ratio = inst.length / typed.length;
    if (type === 'INSTALACIONES' && ratio < .8) {
      throw new Error(`El archivo no corresponde a Instalaciones (${inst.length} de ${typed.length}).`);
    }
    if (type === 'VISITA_TECNICA' && ratio >= .8) {
      throw new Error('El archivo parece de Instalaciones. Use CARGA INSTALACIONES.');
    }
  }

  async function importMapFile200(file, type) {
    if (!file) return;
    const inputId = type === 'INSTALACIONES' ? 'mvl200FileInst' : 'mvl200FileVt';

    try {
      if (typeof showLoader === 'function') showLoader('Leyendo Excel…');
      setMapMessage200('Leyendo archivo…');
      const rows = await parseMapWorkbook200(file);
      validateClientLoad200(type, rows);

      const geo = rows.filter(r => Number.isFinite(r.latitud) && Number.isFinite(r.longitud)).length;
      const periods = [...new Set(rows.map(r => String(r.fechaSolicitud || r.fechaFinVisita || r.fechaUltimoEstado || r.fechaInicioVisita || '').slice(0,7)).filter(p => /^\d{4}-\d{2}$/.test(p)))].sort();
      if (!periods.length) throw new Error('No se pudo detectar el período del archivo.');
      const periodLabel = periods.join(', ');
      setMapMessage200(`${rows.length} órdenes leídas · ${geo} con georreferencia · Periodos ${periodLabel}. La APP separará y actualizará cada mes de forma independiente…`);

      if (typeof showLoader === 'function') {
        showLoader(type === 'INSTALACIONES' ? 'Cargando Instalaciones…' : 'Cargando Visita Técnica…');
      }

      const res = await api('mapImport', {
        token: typeof token === 'function' ? token() : '',
        loadType:type,
        fileName:file.name,
        items:JSON.stringify(rows)
      });

      if (!res?.ok) throw new Error(res?.error || 'No se pudo registrar la carga.');

      const slaItems = Array.isArray(res.sla) ? res.sla : [];
      const slaText = slaItems.length
        ? slaItems.map(s => `SLA ${s.period || ''}: ${s.cumplen || 0}/${s.evaluables || 0}`).join(' · ')
        : 'SLA sin cambios por recalcular';
      setMapMessage200(
        `✓ REGISTRADO · ${res.message} · ${res.sinCruceCuadrilla || 0} sin cruce · ${res.historicosCruzados || 0} cruces históricos · ${slaText}.`,
        'ok'
      );

      // La carga del Mapa modifica SLA: no reutilizar Dashboard anterior.
      V200.dashboard = null;
      V200.tech = null;

      await loadMapData200();
    } catch (err) {
      setMapMessage200(`× NO REGISTRADO · ${err.message || 'No se pudo procesar el Excel.'}`, 'error');
    } finally {
      if ($200(inputId)) $200(inputId).value = '';
      try { if (typeof hideLoader === 'function') hideLoader(); } catch (_) {}
    }
  }

  /* -------------------------
     SLA EN DASHBOARD / TÉCNICO
     ------------------------- */

  function dashboardConfig200() {
    const data = V200.dashboard || {};
    const visual = norm200($200('dashboardVisualTypeV19')?.value || 'TODOS') || 'TODOS';
    return data.indicatorConfigs?.[visual] || data.indicatorConfigs?.TODOS || data.indicatorConfig || {};
  }

  function dashboardRowsFiltered200() {
    const rows = V200.dashboard?.rows || [];
    const visual = norm200($200('dashboardVisualTypeV19')?.value || '');
    const platform = norm200($200('dashboardPlatformV19')?.value || '');
    const composition = norm200($200('dashboardCompositionV19')?.value || '');
    const state = norm200($200('dashboardStateV19')?.value || '');
    const supervisor = String($200('dashboardSupervisor')?.value || '');
    const crew = String($200('dashboardCrew')?.value || '');

    return rows.filter(row => {
      if (visual && norm200(row.visualType) !== visual) return false;
      if (platform && norm200(row.platform) !== platform) return false;
      if (composition && norm200(row.composition) !== composition) return false;
      if (state && norm200(row.state) !== state) return false;
      if (supervisor) {
        if (supervisor === '__GG__') {
          if (String(row.supervisorId || '') !== '__GG__' && norm200(row.supervisor) !== 'GG') return false;
        } else if (String(row.supervisorId || '') !== supervisor) return false;
      }
      if (crew && String(row.crewId || '') !== crew) return false;
      return true;
    });
  }

  function slaSummary200(rows) {
    let evaluables=0, cumplen=0, fuera=0;
    (rows || []).forEach(r => {
      evaluables += Number(r.slaEvaluables || 0);
      cumplen += Number(r.slaCumplen || 0);
      fuera += Number(r.slaFuera || 0);
    });
    return {
      evaluables, cumplen, fuera,
      percent:evaluables ? cumplen / evaluables : null
    };
  }

  function findSummarySlaCard200() {
    const root = $200('dashboardTotalSummaryV19');
    if (!root) return null;
    return [...root.querySelectorAll('.dashboard-v19-total-card')].find(card => {
      const label = card.querySelector(':scope > span')?.textContent || '';
      return norm200(label).includes('SLA') || norm200(label).includes('TIEMPO DE GESTION');
    }) || null;
  }

  function renderDashboardSlaSummary200() {
    if (!V200.dashboard?.ok) return;
    const card = findSummarySlaCard200();
    if (!card) return;

    const summary = slaSummary200(dashboardRowsFiltered200());
    const cfg = dashboardConfig200();
    const status = positiveStatus200(summary.percent, cfg?.sla);
    const info = statusInfo200(status);

    card.classList.remove('under-construction','mvl-v118-card-neutral','mvl-v118-card-optimal','mvl-v118-card-moderate','mvl-v118-card-critical');
    card.classList.add(
      info.cls === 'cumple' ? 'mvl-v118-card-optimal' :
      info.cls === 'atencion' ? 'mvl-v118-card-moderate' :
      info.cls === 'critico' ? 'mvl-v118-card-critical' : 'mvl-v118-card-neutral'
    );

    const label = card.querySelector(':scope > span');
    const strong = card.querySelector(':scope > strong');
    let small = card.querySelector(':scope > small');
    if (!small) {
      small = document.createElement('small');
      card.appendChild(small);
    }

    if (label) label.textContent = 'Tiempo de gestión / SLA';
    if (strong) strong.textContent = pct200(summary.percent);
    small.textContent = summary.evaluables
      ? `${summary.cumplen} de ${summary.evaluables} órdenes dentro de SLA`
      : 'Sin órdenes evaluables';

    let badge = card.querySelector(':scope > .mvl-v113-status');
    if (!summary.evaluables) {
      badge?.remove();
      return;
    }
    if (!badge) {
      badge = document.createElement('span');
      card.appendChild(badge);
    }
    badge.className = `mvl-v113-status ${info.cls}`;
    badge.textContent = info.label;
  }

  function renderAllCardsSla200() {
    if (($200('dashboardIndicator')?.value || '') !== 'ALL') return;
    const byCrew = new Map((V200.dashboard?.rows || []).map(r => [String(r.crewId || ''), r]));
    document.querySelectorAll('#dashboardRankingList [data-dashboard-crew]').forEach(card => {
      const row = byCrew.get(String(card.dataset.dashboardCrew || ''));
      if (!row) return;
      const cells = [...card.querySelectorAll('.dashboard-kpi-mini-grid > div')];
      const slaCell = cells.find(c => norm200(c.querySelector('span')?.textContent || '') === 'SLA');
      if (!slaCell) return;
      slaCell.classList.remove('kpi-building');
      const b = slaCell.querySelector('b');
      if (b) b.textContent = row.slaEvaluables ? pct200(row.slaPercent) : '—';
      slaCell.title = row.slaEvaluables
        ? `${row.slaCumplen} de ${row.slaEvaluables} dentro de SLA`
        : 'Sin órdenes evaluables';
    });
  }

  function renderSlaRanking200() {
    if (($200('dashboardIndicator')?.value || '') !== 'SLA' || !V200.dashboard?.ok) return;

    const construction = $200('dashboardConstruction');
    construction?.classList.add('hidden');

    const rows = dashboardRowsFiltered200();
    const compare = $200('dashboardCompareByV116')?.value || 'CUADRILLA';
    const cfg = dashboardConfig200();
    const list = $200('dashboardRankingList');
    const title = $200('dashboardRankingTitle');
    const help = $200('dashboardRankingHelp');
    if (!list) return;

    if (compare === 'SUPERVISOR') {
      const groups = new Map();
      rows.forEach(r => {
        const isGG = String(r.supervisorId || '') === '__GG__' || norm200(r.supervisor) === 'GG';
        const key = isGG ? '__GG__' : String(r.supervisorId || r.supervisor || 'SIN_SUPERVISOR');
        const name = isGG ? 'GG · Supervisión directa de Gerencia' : String(r.supervisor || 'Sin supervisor');
        if (!groups.has(key)) groups.set(key,{name,evaluables:0,cumplen:0,fuera:0,crews:0});
        const g=groups.get(key);
        g.evaluables += Number(r.slaEvaluables || 0);
        g.cumplen += Number(r.slaCumplen || 0);
        g.fuera += Number(r.slaFuera || 0);
        g.crews++;
      });

      const data=[...groups.values()].map(g=>({...g,percent:g.evaluables?g.cumplen/g.evaluables:null}))
        .sort((a,b)=>(b.percent??-1)-(a.percent??-1)||a.name.localeCompare(b.name,'es'));

      if(title) title.textContent='Ranking de Supervisores · Tiempo de gestión / SLA';
      if(help) help.textContent='Mayor porcentaje de órdenes dentro del SLA primero.';
      list.innerHTML=data.length?data.map((g,i)=>{
        const info=statusInfo200(positiveStatus200(g.percent,cfg?.sla));
        return `<div class="mvl-v116-compare-row">
          <div class="dashboard-rank-position">${g.percent==null?'—':'#'+(i+1)}</div>
          <div class="mvl-v116-compare-copy">
            <strong>${esc200(g.name)}</strong>
            <small>${g.cumplen} dentro · ${g.fuera} fuera · ${g.evaluables} evaluables · ${g.crews} cuadrillas</small>
          </div>
          <div class="mvl-v116-compare-value">
            ${esc200(pct200(g.percent))}
            ${g.percent==null?'':`<span class="mvl-v113-status ${info.cls}">${info.label}</span>`}
          </div>
        </div>`;
      }).join(''):'<p class="empty">No hay órdenes SLA evaluables para estos filtros.</p>';
      return;
    }

    const sorted=[...rows].sort((a,b)=>(b.slaPercent??-1)-(a.slaPercent??-1)||String(a.crewDisplay||'').localeCompare(String(b.crewDisplay||''),'es'));
    if(title) title.textContent='Ranking de Tiempo de gestión / SLA';
    if(help) help.textContent='Mayor porcentaje de órdenes dentro del SLA primero.';
    list.innerHTML=sorted.length?sorted.map((r,i)=>{
      const info=statusInfo200(positiveStatus200(r.slaPercent,cfg?.sla));
      const has=Number(r.slaEvaluables||0)>0;
      return `<button type="button" class="dashboard-rank-row dashboard-rank-button" data-dashboard-crew="${esc200(r.crewId)}">
        <div class="dashboard-rank-position">${has?'#'+(i+1):'—'}</div>
        <div class="dashboard-rank-copy">
          <strong>${esc200(r.crewDisplay||r.crewName||r.crewCode||'')}</strong>
          <small>${Number(r.slaCumplen||0)} dentro · ${Number(r.slaFuera||0)} fuera · ${Number(r.slaEvaluables||0)} evaluables</small>
        </div>
        <div class="dashboard-rank-value">
          ${esc200(has?pct200(r.slaPercent):'Sin datos')}
          ${has?`<span class="mvl-v113-status ${info.cls}">${info.label}</span>`:''}
        </div>
      </button>`;
    }).join(''):'<p class="empty">No hay cuadrillas dentro del filtro.</p>';
  }

  function renderSupervisorAllSla200() {
    if (($200('dashboardIndicator')?.value || '') !== 'ALL') return;
    if (($200('dashboardCompareByV116')?.value || '') !== 'SUPERVISOR') return;

    const rows=dashboardRowsFiltered200();
    const groups=new Map();
    rows.forEach(r=>{
      const name=(String(r.supervisorId||'')==='__GG__'||norm200(r.supervisor)==='GG')
        ? 'GG · Supervisión directa de Gerencia'
        : String(r.supervisor||'Sin supervisor');
      if(!groups.has(name)) groups.set(name,{e:0,c:0});
      const g=groups.get(name);
      g.e+=Number(r.slaEvaluables||0);
      g.c+=Number(r.slaCumplen||0);
    });

    document.querySelectorAll('#dashboardRankingList .mvl-v126-supervisor-all').forEach(card=>{
      const name=card.querySelector('.mvl-v126-supervisor-head strong')?.textContent?.trim();
      const g=groups.get(name);
      const grid=card.querySelector('.mvl-v126-kpi-grid');
      if(!g||!grid) return;
      let cell=grid.querySelector('[data-v200-sla]');
      if(!cell){
        cell=document.createElement('div');
        cell.dataset.v200Sla='1';
        grid.appendChild(cell);
      }
      const p=g.e?g.c/g.e:null;
      const info=statusInfo200(positiveStatus200(p,dashboardConfig200()?.sla));
      cell.innerHTML=`<span>Tiempo gestión / SLA</span><b>${esc200(pct200(p))}</b>${p==null?'':`<span class="mvl-v113-status ${info.cls}">${info.label}</span>`}`;
      grid.style.gridTemplateColumns='repeat(4,minmax(0,1fr))';
    });
  }

  function renderTechSla200() {
    const data=V200.tech;
    if(!data?.ok) return;
    const summary=data.summary||{};
    const card=[...document.querySelectorAll('#performanceTechPanel .performance-card')].find(c=>{
      const label=c.querySelector('.performance-label')?.textContent||'';
      return norm200(label).includes('SLA')||norm200(label).includes('TIEMPO DE GESTION');
    });
    if(!card) return;

    card.classList.remove('under-construction');
    const label=card.querySelector('.performance-label');
    const strong=card.querySelector('strong');
    let small=card.querySelector('small');
    if(label) label.textContent='Tiempo de gestión / SLA';
    if(strong) strong.textContent=pct200(summary.slaPercent);
    if(!small){small=document.createElement('small');card.appendChild(small);}
    small.textContent=summary.slaEvaluables
      ? `${summary.slaCumplen} de ${summary.slaEvaluables} dentro de SLA`
      : 'Sin órdenes evaluables';

    let badge=card.querySelector(':scope > .mvl-v113-status');
    const status=summary.slaStatus||positiveStatus200(summary.slaPercent,data.indicatorConfig?.sla);
    if(!summary.slaEvaluables){badge?.remove();return;}
    const info=statusInfo200(status);
    if(!badge){badge=document.createElement('span');card.appendChild(badge);}
    badge.className=`mvl-v113-status ${info.cls}`;
    badge.textContent=info.label;
  }

  function refreshSlaUi200() {
    setTimeout(()=>{
      renderDashboardSlaSummary200();
      renderAllCardsSla200();
      renderSlaRanking200();
      renderSupervisorAllSla200();
      renderTechSla200();
    },30);
  }

  ['dashboardVisualTypeV19','dashboardPlatformV19','dashboardCompositionV19','dashboardStateV19',
   'dashboardSupervisor','dashboardCrew','dashboardIndicator','dashboardCompareByV116']
    .forEach(id=>{
      document.addEventListener('change',e=>{
        if(e.target?.id===id) setTimeout(refreshSlaUi200,30);
      });
    });

  $200('refreshDashboardButton')?.addEventListener('click',()=>setTimeout(refreshSlaUi200,80));

  /* -------------------------
     SLA EN PONER INDICADORES
     ------------------------- */

  function updateSlaRanges200() {
    const moderate=Number($200('cfgSlaModerateV200')?.value);
    const optimal=Number($200('cfgSlaOptimalV200')?.value);
    const c=$200('cfgSlaRangeCriticalV200');
    const m=$200('cfgSlaRangeModerateV200');
    const o=$200('cfgSlaRangeOptimalV200');

    if(c) c.textContent=Number.isFinite(moderate)?`0% a <${moderate}%`:'—';
    if(m) m.textContent=Number.isFinite(moderate)&&Number.isFinite(optimal)?`${moderate}% a <${optimal}%`:'—';
    if(o) o.textContent=Number.isFinite(optimal)?`${optimal}% a 100%`:'—';
  }

  function currentConfigForModal200() {
    const type=norm200($200('cfgVisualTypeV114')?.value||'TODOS')||'TODOS';
    return V200.configByType.get(type)
      || V200.dashboard?.indicatorConfigs?.[type]
      || V200.dashboard?.indicatorConfigs?.TODOS
      || V200.dashboard?.indicatorConfig
      || null;
  }

  function fillSlaInputs200(config) {
    const s=config?.sla||{};
    if($200('cfgSlaModerateV200')) $200('cfgSlaModerateV200').value=Number(s.moderateFrom??.8)*100;
    if($200('cfgSlaOptimalV200')) $200('cfgSlaOptimalV200').value=Number(s.optimalFrom??.9)*100;
    updateSlaRanges200();
  }

  function ensureSlaConfig200() {
    const modal=$200('indicatorConfigModalV113');
    if(!modal||modal.dataset.v200Sla==='1') return;

    const goals=$200('cfgGoalsPanelV123');
    const indicators=$200('cfgIndicatorsPanelV123');
    if(!goals||!indicators) return;

    // Quitar "SLA En construcción" de las metas pendientes.
    [...goals.querySelectorAll('.mvl-v124-pending-goal')].forEach(row=>{
      if(norm200(row.textContent).includes('SLA')) row.remove();
    });
    [...indicators.querySelectorAll('.mvl-v113-construction-item')].forEach(row=>{
      if(norm200(row.textContent).includes('SLA')) row.remove();
    });

    const goal=document.createElement('section');
    goal.className='mvl-v124-goal-card';
    goal.innerHTML=`
      <h4>Tiempo de gestión / SLA</h4>
      <div class="mvl-v113-config-grid">
        <label class="mvl-v113-field">Meta objetivo · %
          <input id="cfgSlaOptimalV200" type="number" min="0" max="100" step="0.1">
          <span class="mvl-v114-field-note">Porcentaje mínimo considerado ÓPTIMO.</span>
        </label>
      </div>
      <div class="mvl-v124-goal-note">La meta se calcula con órdenes FINALIZADAS que tengan Inicio, Fin y una partida con parámetro SLA.</div>`;
    goals.appendChild(goal);

    const sem=document.createElement('section');
    sem.className='mvl-v113-config-section';
    sem.innerHTML=`
      <h4>Semáforo de Tiempo de gestión / SLA</h4>
      <div class="mvl-v113-config-grid">
        <label class="mvl-v113-field">Inicio MODERADO · %
          <input id="cfgSlaModerateV200" type="number" min="0" max="100" step="0.1">
        </label>
      </div>
      <div class="mvl-v114-levels">
        <div class="mvl-v114-level red"><strong>🔴 CRÍTICO</strong><span>Por debajo del inicio Moderado.</span><b class="mvl-v117-range" id="cfgSlaRangeCriticalV200">—</b></div>
        <div class="mvl-v114-level yellow"><strong>🟡 MODERADO</strong><span>Desde Moderado hasta antes de la Meta.</span><b class="mvl-v117-range" id="cfgSlaRangeModerateV200">—</b></div>
        <div class="mvl-v114-level green"><strong>🟢 ÓPTIMO</strong><span>Desde la Meta objetivo.</span><b class="mvl-v117-range" id="cfgSlaRangeOptimalV200">—</b></div>
      </div>`;

    const pending=[...indicators.querySelectorAll('.mvl-v113-config-section')].find(s=>norm200(s.querySelector('h4')?.textContent).includes('PENDIENT'));
    if(pending) indicators.insertBefore(sem,pending);
    else indicators.appendChild(sem);

    ['cfgSlaModerateV200','cfgSlaOptimalV200'].forEach(id=>{
      $200(id)?.addEventListener('input',updateSlaRanges200);
    });

    modal.dataset.v200Sla='1';
    fillSlaInputs200(currentConfigForModal200());
  }

  document.addEventListener('click',e=>{
    if(e.target?.closest?.('#putIndicatorsButtonV113')){
      setTimeout(()=>{
        ensureSlaConfig200();
        fillSlaInputs200(currentConfigForModal200());
      },0);
    }
  },true);

  document.addEventListener('change',e=>{
    if(e.target?.id==='cfgVisualTypeV114'){
      setTimeout(()=>fillSlaInputs200(currentConfigForModal200()),80);
    }
  });

  /* -------------------------
     API WRAPPER V2
     ------------------------- */

  function wrapApi200() {
    if(V200.apiWrapped||typeof api!=='function') return;
    V200.apiWrapped=true;
    const previous=api;
    api=async function(action,params={}){
      const result=await previous(action,params);

      if(action==='performanceDashboard'&&result?.ok){
        V200.dashboard=result;
        Object.entries(result.indicatorConfigs||{}).forEach(([k,v])=>{
          if(v) V200.configByType.set(norm200(k),v);
        });
        if(result.indicatorConfig){
          V200.configByType.set(norm200(result.indicatorConfig.visualType||'TODOS'),result.indicatorConfig);
        }
        refreshSlaUi200();
      }

      if(action==='performanceSummary'&&result?.ok){
        V200.tech=result;
        refreshSlaUi200();
      }

      if((action==='performanceIndicatorConfigGet'||action==='performanceIndicatorConfigSave')&&result?.ok&&result.config){
        V200.configByType.set(norm200(result.config.visualType||params.visualType||'TODOS'),result.config);
        setTimeout(()=>{
          ensureSlaConfig200();
          fillSlaInputs200(result.config);
        },0);
      }

      if(action==='mapImport'&&result?.ok){
        V200.dashboard=null;
        V200.tech=null;
      }

      return result;
    };
  }

  /* -------------------------
     INIT
     ------------------------- */
  let init200DoneV201 = false;

  function init200() {
    if (init200DoneV201) return;
    if (typeof api !== 'function' || typeof renderHome !== 'function') return;

    init200DoneV201 = true;
    installStyles200();
    wrapApi200();
    watchMapCard200();
    activateMapCard200();

    // SLA/configuración secundaria se prepara sin bloquear el arranque.
    const backgroundV201 = () => {
      try {
        ensureSlaConfig200();
        refreshSlaUi200();
      } catch (_) {}
    };

    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(backgroundV201, { timeout: 1800 });
    } else {
      window.setTimeout(backgroundV201, 500);
    }
  }

  document.addEventListener('mvl:core-ready', () => window.setTimeout(init200, 0));

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>setTimeout(init200,0),{once:true});
  }else{
    setTimeout(init200,0);
  }
})();

console.info('[MI VISUAL LIMA] V2.00: Mapa Operativo + Tiempo de gestión / SLA habilitados.');

console.info('[MI VISUAL LIMA] V2.01 DEFINITIVA: arranque no bloqueante + núcleo cacheado + mapa diferido.');

console.info('[MI VISUAL LIMA] V2.02: SLA homologado + etiquetas de cuadrilla en mapa.');


/* ==========================================================
   MI VISUAL LIMA - V2.03
   EDITAR TIEMPOS SLA DESDE DASHBOARD
   ========================================================== */
(() => {
  const $203 = id => document.getElementById(id);
  const esc203 = value => String(value ?? '')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');

  const SLA203 = {
    parameters: [],
    catalog: [],
    originalMinutes: new Map(),
    loading: false
  };

  function installSlaParamStyles203() {
    if ($203('mvlV203SlaParamStyles')) return;
    const style = document.createElement('style');
    style.id = 'mvlV203SlaParamStyles';
    style.textContent = `
      .mvl-v203-sla-button{
        border:1px solid #9cc8f7;
        background:#eef6ff;
        color:#0758b7;
        border-radius:10px;
        min-height:36px;
        padding:7px 12px;
        font-size:.68rem;
        font-weight:900;
        white-space:nowrap;
      }
      .mvl-v203-sla-button:hover{background:#e3f0ff}

      .mvl-v203-overlay{
        position:fixed;
        inset:0;
        z-index:99999;
        background:rgba(15,35,58,.42);
        display:flex;
        justify-content:center;
        align-items:center;
        padding:18px;
      }
      .mvl-v203-overlay.hidden{display:none!important}

      .mvl-v203-modal{
        width:min(920px,96vw);
        max-height:92vh;
        display:flex;
        flex-direction:column;
        background:#fff;
        border-radius:18px;
        box-shadow:0 24px 70px rgba(15,35,58,.24);
        overflow:hidden;
      }

      .mvl-v203-head{
        display:flex;
        align-items:flex-start;
        justify-content:space-between;
        gap:14px;
        padding:16px 18px 13px;
        border-bottom:1px solid #e2ebf5;
      }
      .mvl-v203-head h3{
        margin:0;
        color:#082f5b;
        font-size:1rem;
      }
      .mvl-v203-head p{
        margin:4px 0 0;
        color:#667b92;
        font-size:.70rem;
      }
      .mvl-v203-close{
        width:34px;
        height:34px;
        border:0;
        border-radius:10px;
        background:#eef3f8;
        color:#24496f;
        font-weight:900;
        font-size:1rem;
      }

      .mvl-v203-body{
        overflow:auto;
        padding:14px 18px 16px;
      }

      .mvl-v203-toolbar{
        display:grid;
        grid-template-columns:minmax(0,1fr) auto;
        gap:9px;
        align-items:end;
        margin-bottom:11px;
      }
      .mvl-v203-toolbar label{
        color:#536a84;
        font-size:.66rem;
        font-weight:800;
      }
      .mvl-v203-toolbar input{
        width:100%;
        margin-top:4px;
        min-height:38px;
        padding:8px 10px;
        border:1px solid #c9d9ea;
        border-radius:10px;
        font:inherit;
      }
      .mvl-v203-count{
        padding:8px 10px;
        border-radius:999px;
        background:#eef6ff;
        color:#0758b7;
        font-size:.65rem;
        font-weight:850;
      }

      .mvl-v203-add{
        padding:11px;
        border:1px solid #d9e6f3;
        border-radius:13px;
        background:#f8fbff;
        margin-bottom:12px;
      }
      .mvl-v203-add-title{
        display:flex;
        justify-content:space-between;
        gap:10px;
        align-items:center;
        margin-bottom:8px;
      }
      .mvl-v203-add-title strong{
        color:#123b68;
        font-size:.75rem;
      }
      .mvl-v203-add-grid{
        display:grid;
        grid-template-columns:minmax(0,1fr) 150px auto;
        gap:8px;
      }
      .mvl-v203-add select,
      .mvl-v203-add input{
        min-height:38px;
        width:100%;
        border:1px solid #c9d9ea;
        border-radius:10px;
        padding:7px 9px;
        background:#fff;
      }
      .mvl-v203-add button{
        border:0;
        border-radius:10px;
        padding:7px 14px;
        background:#1264c5;
        color:#fff;
        font-weight:850;
      }

      .mvl-v203-message{
        min-height:18px;
        margin:7px 0;
        color:#667b92;
        font-size:.68rem;
        font-weight:750;
      }
      .mvl-v203-message.error{color:#b42318}
      .mvl-v203-message.ok{color:#157347}

      .mvl-v203-list{
        display:grid;
        gap:7px;
      }
      .mvl-v203-row{
        display:grid;
        grid-template-columns:74px minmax(0,1fr) 120px;
        gap:10px;
        align-items:center;
        padding:10px 11px;
        border:1px solid #e0e9f3;
        border-radius:12px;
        background:#fff;
      }
      .mvl-v203-code{
        color:#0758b7;
        font-size:.70rem;
        font-weight:900;
      }
      .mvl-v203-part strong{
        display:block;
        color:#12395f;
        font-size:.72rem;
        line-height:1.25;
      }
      .mvl-v203-part small{
        display:block;
        margin-top:3px;
        color:#8190a2;
        font-size:.60rem;
      }
      .mvl-v203-minutes{
        display:grid;
        grid-template-columns:minmax(0,1fr) auto;
        gap:5px;
        align-items:center;
      }
      .mvl-v203-minutes input{
        width:100%;
        min-width:0;
        height:36px;
        padding:7px 8px;
        border:1px solid #bfd1e4;
        border-radius:9px;
        text-align:right;
        font-weight:900;
        color:#0d3561;
      }
      .mvl-v203-minutes span{
        color:#667b92;
        font-size:.62rem;
        font-weight:800;
      }

      .mvl-v203-footer{
        display:flex;
        justify-content:flex-end;
        gap:9px;
        padding:12px 18px;
        border-top:1px solid #e2ebf5;
        background:#fbfdff;
      }
      .mvl-v203-footer button{
        min-height:38px;
        border-radius:10px;
        padding:8px 14px;
        font-weight:900;
      }
      .mvl-v203-cancel{
        border:1px solid #cbd9e7;
        background:#fff;
        color:#395875;
      }
      .mvl-v203-save{
        border:0;
        background:#1264c5;
        color:#fff;
      }

      @media(max-width:620px){
        .mvl-v203-toolbar{grid-template-columns:1fr}
        .mvl-v203-add-grid{grid-template-columns:1fr}
        .mvl-v203-row{
          grid-template-columns:60px minmax(0,1fr);
        }
        .mvl-v203-minutes{
          grid-column:1/-1;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function token203() {
    try { return typeof token === 'function' ? token() : ''; }
    catch (_) { return ''; }
  }

  function currentPeriod203() {
    return $203('dashboardPeriod')?.value || '2026-08';
  }

  function setMsg203(text='', type='') {
    const el=$203('slaParamMessageV203');
    if(!el) return;
    el.textContent=text;
    el.className='mvl-v203-message' + (type ? ' ' + type : '');
  }

  function createModal203() {
    if ($203('slaParamsModalV203')) return;
    installSlaParamStyles203();

    const overlay=document.createElement('div');
    overlay.id='slaParamsModalV203';
    overlay.className='mvl-v203-overlay hidden';
    overlay.innerHTML=`
      <section class="mvl-v203-modal" role="dialog" aria-modal="true">
        <header class="mvl-v203-head">
          <div>
            <h3>PARÁMETROS SLA / TIEMPOS DE GESTIÓN</h3>
            <p>Edita los minutos permitidos por tipo de partida. Los cambios recalculan el periodo seleccionado.</p>
          </div>
          <button type="button" class="mvl-v203-close" id="slaParamCloseV203">×</button>
        </header>

        <div class="mvl-v203-body">
          <div class="mvl-v203-toolbar">
            <label>
              Buscar partida
              <input id="slaParamSearchV203" type="search" placeholder="Ej. traslado, recableado, T0023...">
            </label>
            <span class="mvl-v203-count" id="slaParamCountV203">0 partidas</span>
          </div>

          <section class="mvl-v203-add" id="slaParamAddWrapV203">
            <div class="mvl-v203-add-title">
              <strong>Agregar parámetro para una partida nueva</strong>
            </div>
            <div class="mvl-v203-add-grid">
              <select id="slaParamNewTariffV203">
                <option value="">Seleccionar partida sin SLA</option>
              </select>
              <input id="slaParamNewMinutesV203" type="number" min="1" max="1440" step="1" placeholder="Minutos">
              <button type="button" id="slaParamAddButtonV203">Agregar</button>
            </div>
          </section>

          <div class="mvl-v203-message" id="slaParamMessageV203"></div>
          <div class="mvl-v203-list" id="slaParamListV203"></div>
        </div>

        <footer class="mvl-v203-footer">
          <button type="button" class="mvl-v203-cancel" id="slaParamCancelV203">Cancelar</button>
          <button type="button" class="mvl-v203-save" id="slaParamSaveV203">Guardar tiempos SLA</button>
        </footer>
      </section>`;

    document.body.appendChild(overlay);

    const close=()=>overlay.classList.add('hidden');
    $203('slaParamCloseV203')?.addEventListener('click',close);
    $203('slaParamCancelV203')?.addEventListener('click',close);
    overlay.addEventListener('click',e=>{
      if(e.target===overlay) close();
    });

    $203('slaParamSearchV203')?.addEventListener('input',renderRows203);
    $203('slaParamAddButtonV203')?.addEventListener('click',addLocalParam203);
    $203('slaParamSaveV203')?.addEventListener('click',saveParams203);
  }

  function renderAddOptions203() {
    const select=$203('slaParamNewTariffV203');
    const wrap=$203('slaParamAddWrapV203');
    if(!select||!wrap) return;

    const current=new Set(SLA203.parameters.map(p=>String(p.idTarifa||'')));
    const missing=(SLA203.catalog||[]).filter(c=>c.idTarifa&&!current.has(String(c.idTarifa)));

    select.innerHTML='<option value="">Seleccionar partida sin SLA</option>' +
      missing.map(c=>`<option value="${esc203(c.idTarifa)}">${esc203(c.idTarifa)} · ${esc203(c.tipoPartida)}</option>`).join('');

    wrap.style.display=missing.length?'block':'none';
  }

  function renderRows203() {
    const list=$203('slaParamListV203');
    if(!list) return;

    const q=String($203('slaParamSearchV203')?.value||'').trim().toUpperCase();

    const rows=SLA203.parameters
      .filter(p=>{
        if(!q) return true;
        return [p.idTarifa,p.tipoPartida,p.clasificacion]
          .join(' ')
          .toUpperCase()
          .includes(q);
      })
      .sort((a,b)=>String(a.idTarifa).localeCompare(String(b.idTarifa),'es',{numeric:true}));

    const count=$203('slaParamCountV203');
    if(count) count.textContent=`${rows.length} partida${rows.length===1?'':'s'}`;

    if(!rows.length){
      list.innerHTML='<p class="empty">No hay partidas que coincidan con la búsqueda.</p>';
      return;
    }

    list.innerHTML=rows.map(p=>`
      <article class="mvl-v203-row">
        <div class="mvl-v203-code">${esc203(p.idTarifa)}</div>
        <div class="mvl-v203-part">
          <strong>${esc203(p.tipoPartida)}</strong>
          <small>${esc203(p.clasificacion||'')} ${p.fuente ? '· '+esc203(p.fuente) : ''}</small>
        </div>
        <label class="mvl-v203-minutes">
          <input
            type="number"
            min="1"
            max="1440"
            step="1"
            data-sla-tariff="${esc203(p.idTarifa)}"
            value="${esc203(p.slaMinutes)}"
          >
          <span>min</span>
        </label>
      </article>
    `).join('');
  }

  async function loadParams203() {
    setMsg203('Cargando tiempos SLA…');
    const res=await api('slaParametersGet',{token:token203()});
    if(!res?.ok) throw new Error(res?.error||'No se pudieron cargar los parámetros SLA.');

    SLA203.parameters=(res.parameters||[]).map(p=>({...p}));
    SLA203.catalog=(res.catalog||[]).map(c=>({...c}));
    SLA203.originalMinutes=new Map(
      SLA203.parameters.map(p=>[String(p.idTarifa),Number(p.slaMinutes)])
    );

    renderAddOptions203();
    renderRows203();
    setMsg203('');
  }

  async function openParams203() {
    createModal203();
    const modal=$203('slaParamsModalV203');
    modal?.classList.remove('hidden');

    if(SLA203.loading) return;
    SLA203.loading=true;

    try {
      await loadParams203();
    } catch(err) {
      setMsg203(err.message||'No se pudieron cargar los tiempos SLA.','error');
    } finally {
      SLA203.loading=false;
    }
  }

  function addLocalParam203() {
    const tariff=$203('slaParamNewTariffV203')?.value||'';
    const minutes=Number($203('slaParamNewMinutesV203')?.value);

    if(!tariff){
      setMsg203('Selecciona una partida para agregar.','error');
      return;
    }
    if(!Number.isFinite(minutes)||minutes<=0||minutes>1440){
      setMsg203('Ingresa un tiempo SLA válido en minutos.','error');
      return;
    }

    const catalog=SLA203.catalog.find(c=>String(c.idTarifa)===String(tariff));
    if(!catalog){
      setMsg203('No se encontró esa partida en el catálogo.','error');
      return;
    }

    if(SLA203.parameters.some(p=>String(p.idTarifa)===String(tariff))){
      setMsg203('Esa partida ya tiene parámetro SLA.','error');
      return;
    }

    SLA203.parameters.push({
      idTarifa:tariff,
      tipoPartida:catalog.tipoPartida,
      clasificacion:catalog.grupo||catalog.plataforma||'',
      slaMinutes:minutes,
      estado:'ACTIVO',
      fuente:'APP_MI_VISUAL_LIMA',
      isNew:true
    });

    $203('slaParamNewTariffV203').value='';
    $203('slaParamNewMinutesV203').value='';
    renderAddOptions203();
    renderRows203();
    setMsg203('Partida agregada. Pulsa Guardar tiempos SLA para confirmar.','ok');
  }

  function collectChanges203() {
    const inputMap=new Map();
    document.querySelectorAll('[data-sla-tariff]').forEach(input=>{
      inputMap.set(String(input.dataset.slaTariff),Number(input.value));
    });

    const changes=[];

    SLA203.parameters.forEach(p=>{
      const id=String(p.idTarifa||'');
      const value=inputMap.has(id) ? inputMap.get(id) : Number(p.slaMinutes);

      if(!Number.isFinite(value)||value<=0||value>1440){
        throw new Error(`Tiempo inválido para ${id}.`);
      }

      const original=SLA203.originalMinutes.get(id);
      if(p.isNew || original===undefined || Number(original)!==Number(value)){
        changes.push({idTarifa:id,slaMinutes:value});
      }
    });

    return changes;
  }

  async function refreshDashboardAfterSla203() {
    try {
      const btn=$203('refreshDashboardButton');
      if(btn){
        btn.click();
        await new Promise(resolve=>setTimeout(resolve,650));
      }
    } catch(_) {}
  }

  async function saveParams203() {
    let changes;
    try {
      changes=collectChanges203();
    } catch(err) {
      setMsg203(err.message,'error');
      return;
    }

    if(!changes.length){
      setMsg203('No hay cambios pendientes.','ok');
      return;
    }

    const button=$203('slaParamSaveV203');
    if(button){
      button.disabled=true;
      button.textContent='Guardando…';
    }
    setMsg203('Guardando parámetros y recalculando SLA…');

    try {
      const res=await api('slaParametersSave',{
        token:token203(),
        period:currentPeriod203(),
        items:JSON.stringify(changes)
      });

      if(!res?.ok) throw new Error(res?.error||'No se pudieron guardar los tiempos SLA.');

      SLA203.parameters=(res.parameters||[]).map(p=>({...p}));
      SLA203.catalog=(res.catalog||[]).map(c=>({...c}));
      SLA203.originalMinutes=new Map(
        SLA203.parameters.map(p=>[String(p.idTarifa),Number(p.slaMinutes)])
      );

      renderAddOptions203();
      renderRows203();

      const summary=res.slaSummary;
      const suffix=summary && summary.evaluables!=null
        ? ` · ${summary.cumplen||0}/${summary.evaluables||0} dentro de SLA`
        : '';

      setMsg203(`Tiempos SLA actualizados${suffix}.`,'ok');

      await refreshDashboardAfterSla203();

      setTimeout(()=>{
        $203('slaParamsModalV203')?.classList.add('hidden');
      },450);
    } catch(err) {
      setMsg203(err.message||'No se pudieron guardar los tiempos SLA.','error');
    } finally {
      if(button){
        button.disabled=false;
        button.textContent='Guardar tiempos SLA';
      }
    }
  }

  window.ensureSlaParamsButtonV203 = function(allowed=true) {
    const old=$203('slaParamsButtonV203');

    if(!allowed){
      old?.remove();
      return;
    }

    const actions=$203('putIndicatorsButtonV113')?.parentElement;
    if(!actions||old) return;

    installSlaParamStyles203();

    const button=document.createElement('button');
    button.type='button';
    button.id='slaParamsButtonV203';
    button.className='mvl-v203-sla-button';
    button.textContent='TIEMPOS SLA';
    button.addEventListener('click',openParams203);

    const indicatorButton=$203('putIndicatorsButtonV113');
    actions.insertBefore(button,indicatorButton||null);
  };

  // Respaldo: al entrar al Dashboard, intentar insertar el botón sin observer global.
  document.addEventListener('click',e=>{
    if(e.target?.closest?.('[data-module="Mi Desempeño"]')){
      setTimeout(()=>{
        const p=String(session205()?.user?.profile||'').toUpperCase();
        window.ensureSlaParamsButtonV203?.(p==='GERENCIA'||p==='ADMINISTRADOR');
      },900);
    }
  },true);

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>{
      setTimeout(()=>{
        const p=String(session205()?.user?.profile||'').toUpperCase();
        window.ensureSlaParamsButtonV203?.(p==='GERENCIA'||p==='ADMINISTRADOR');
      },1000);
    },{once:true});
  }

  console.info('[MI VISUAL LIMA] V2.03: botón TIEMPOS SLA + edición por partida.');
})();



/* ==========================================================
   MI VISUAL LIMA - V2.04
   BOTÓN DETALLE POR INDICADOR
   ========================================================== */
(() => {
  const $204 = id => document.getElementById(id);

  const esc204 = value => String(value ?? '')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');

  const norm204 = value => String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .trim()
    .toUpperCase();

  const IND204 = {
    PRODUCCION:'Producción',
    EFECTIVIDAD:'Efectividad',
    RECABLEADO:'% Recableado',
    VTR_GAR:'VTR / GAR',
    SLA:'Tiempo de gestión / SLA',
    OBSERVACIONES:'Observaciones'
  };

  function installStyles204() {
    if ($204('mvlV204Styles')) return;

    const style=document.createElement('style');
    style.id='mvlV204Styles';
    style.textContent=`
      .mvl-v204-detail-btn{
        display:block;
        width:100%;
        margin-top:10px;
        min-height:31px;
        border:1px solid #c8d9eb;
        border-radius:9px;
        background:#f8fbff;
        color:#0758b7;
        font-size:.63rem;
        font-weight:900;
        letter-spacing:.01em;
      }
      .mvl-v204-detail-btn:hover{
        background:#eaf4ff;
      }

      .mvl-v204-overlay{
        position:fixed;
        inset:0;
        z-index:100020;
        display:flex;
        align-items:center;
        justify-content:center;
        padding:16px;
        background:rgba(13,35,60,.44);
      }
      .mvl-v204-overlay.hidden{display:none!important}

      .mvl-v204-modal{
        width:min(900px,96vw);
        max-height:92vh;
        display:flex;
        flex-direction:column;
        background:#fff;
        border-radius:18px;
        box-shadow:0 24px 70px rgba(13,35,60,.24);
        overflow:hidden;
      }

      .mvl-v204-head{
        display:flex;
        justify-content:space-between;
        align-items:flex-start;
        gap:14px;
        padding:15px 17px 12px;
        border-bottom:1px solid #e2ebf4;
      }
      .mvl-v204-head .eyebrow{
        margin:0 0 3px;
      }
      .mvl-v204-head h3{
        margin:0;
        color:#082f5b;
        font-size:1rem;
      }
      .mvl-v204-head p{
        margin:4px 0 0;
        color:#667b92;
        font-size:.68rem;
      }
      .mvl-v204-close{
        width:34px;
        height:34px;
        border:0;
        border-radius:10px;
        background:#edf3f8;
        color:#24496f;
        font-size:1rem;
        font-weight:900;
      }

      .mvl-v204-body{
        overflow:auto;
        padding:13px 16px 16px;
      }

      .mvl-v204-loading{
        padding:22px 10px;
        text-align:center;
        color:#5e748c;
        font-size:.72rem;
        font-weight:750;
      }

      .mvl-v204-day{
        border:1px solid #dbe6f2;
        border-radius:13px;
        overflow:hidden;
        background:#fff;
        margin-bottom:9px;
      }
      .mvl-v204-day summary{
        list-style:none;
        display:grid;
        grid-template-columns:minmax(0,1fr) auto;
        gap:10px;
        align-items:center;
        padding:10px 12px;
        cursor:pointer;
        background:#f8fbff;
      }
      .mvl-v204-day summary::-webkit-details-marker{display:none}
      .mvl-v204-day-title strong{
        display:block;
        color:#0a3c70;
        font-size:.75rem;
      }
      .mvl-v204-day-title small{
        display:block;
        margin-top:2px;
        color:#73849a;
        font-size:.60rem;
      }
      .mvl-v204-day-value{
        text-align:right;
      }
      .mvl-v204-day-value b{
        display:block;
        color:#082f5b;
        font-size:.78rem;
      }
      .mvl-v204-day-value span{
        display:block;
        color:#72839a;
        font-size:.58rem;
      }

      .mvl-v204-client-list{
        padding:4px 10px 10px;
      }
      .mvl-v204-client{
        display:grid;
        grid-template-columns:minmax(0,1fr) auto;
        gap:10px;
        padding:9px 3px;
        border-bottom:1px solid #edf2f7;
      }
      .mvl-v204-client:last-child{border-bottom:0}
      .mvl-v204-client strong{
        display:block;
        color:#163b63;
        font-size:.69rem;
        line-height:1.22;
      }
      .mvl-v204-client small{
        display:block;
        margin-top:3px;
        color:#748499;
        font-size:.58rem;
        line-height:1.28;
      }
      .mvl-v204-client-meta{
        text-align:right;
        min-width:105px;
      }
      .mvl-v204-client-meta b{
        display:block;
        color:#0c3d71;
        font-size:.67rem;
      }
      .mvl-v204-client-meta span{
        display:inline-block;
        margin-top:4px;
        padding:2px 5px;
        border-radius:999px;
        background:#eef3f8;
        color:#5e7288;
        font-size:.54rem;
        font-weight:850;
      }
      .mvl-v204-client-meta span.good{
        background:#eef9f1;
        color:#087d34;
      }
      .mvl-v204-client-meta span.bad{
        background:#fff1f1;
        color:#b42318;
      }
      .mvl-v204-client-meta span.warn{
        background:#fff7e5;
        color:#946000;
      }

      .mvl-v204-empty{
        padding:20px 12px;
        text-align:center;
        color:#6c7f94;
        font-size:.72rem;
      }

      @media(max-width:520px){
        .mvl-v204-client{
          grid-template-columns:1fr;
        }
        .mvl-v204-client-meta{
          text-align:left;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function indicatorFromCard204(card) {
    const label=norm204(card?.querySelector('.performance-label')?.textContent || '');

    if(label.includes('PRODUC')) return 'PRODUCCION';
    if(label.includes('EFECT')) return 'EFECTIVIDAD';
    if(label.includes('RECABLE')) return 'RECABLEADO';
    if(label.includes('VTR') || label.includes('GAR')) return 'VTR_GAR';
    if(label.includes('SLA') || label.includes('TIEMPO DE GESTION')) return 'SLA';
    if(label.includes('OBSERV')) return 'OBSERVACIONES';

    return '';
  }

  function buttonContext204(button) {
    const dashboardDetail=button.closest('#dashboardCrewDetail');
    const tech=button.closest('#performanceTechPanel');

    if(dashboardDetail){
      return {
        crewId:$204('dashboardCrew')?.value || '',
        period:$204('dashboardPeriod')?.value || '2026-08'
      };
    }

    if(tech){
      return {
        crewId:$204('performanceCrewSelect')?.value || '',
        period:$204('performancePeriod')?.value || '2026-08'
      };
    }

    return {crewId:'',period:'2026-08'};
  }

  function createModal204() {
    if($204('indicatorDetailModalV204')) return;
    installStyles204();

    const modal=document.createElement('div');
    modal.id='indicatorDetailModalV204';
    modal.className='mvl-v204-overlay hidden';
    modal.innerHTML=`
      <section class="mvl-v204-modal" role="dialog" aria-modal="true">
        <header class="mvl-v204-head">
          <div>
            <p class="eyebrow" id="indicatorDetailEyebrowV204">DETALLE</p>
            <h3 id="indicatorDetailTitleV204">Indicador</h3>
            <p id="indicatorDetailSubtitleV204"></p>
          </div>
          <button type="button" class="mvl-v204-close" id="indicatorDetailCloseV204">×</button>
        </header>
        <div class="mvl-v204-body" id="indicatorDetailBodyV204"></div>
      </section>`;

    document.body.appendChild(modal);

    const close=()=>modal.classList.add('hidden');
    $204('indicatorDetailCloseV204')?.addEventListener('click',close);
    modal.addEventListener('click',e=>{
      if(e.target===modal) close();
    });
  }

  function statusClass204(item, indicator) {
    const s=norm204(item.status);

    if(indicator==='SLA'){
      return s==='DENTRO_SLA' ? 'good' : 'bad';
    }

    if(indicator==='EFECTIVIDAD'){
      return s==='FINALIZADA' ? 'good' : 'warn';
    }

    if(indicator==='RECABLEADO'){
      return item.isRecable ? 'good' : 'warn';
    }

    return '';
  }

  function statusText204(item, indicator) {
    if(indicator==='SLA'){
      return norm204(item.status)==='DENTRO_SLA' ? 'Dentro SLA' : 'Fuera SLA';
    }

    if(indicator==='RECABLEADO'){
      return item.isRecable ? 'Recableado' : 'No recableado';
    }

    return String(item.status || '').replaceAll('_',' ');
  }

  function clientTitle204(item) {
    if(item.clientName) return item.clientName;
    if(item.clientCode) return `Cliente ${item.clientCode}`;
    if(item.orderId) return `Orden ${item.orderId}`;
    return 'Cliente';
  }

  function renderDetail204(data) {
    const body=$204('indicatorDetailBodyV204');
    if(!body) return;

    const indicator=data.indicator || '';
    $204('indicatorDetailEyebrowV204').textContent=IND204[indicator] || 'DETALLE';
    $204('indicatorDetailTitleV204').textContent=data.crew?.display || data.crew?.code || 'Cuadrilla';
    $204('indicatorDetailSubtitleV204').textContent=`Periodo ${data.period || ''} · clientes/órdenes agrupados por día`;

    if(data.construction){
      body.innerHTML=`
        <div class="mvl-v204-empty">
          <strong>${esc204(IND204[indicator] || 'Indicador')}</strong><br>
          El detalle se habilitará cuando integremos su fuente de datos.
        </div>`;
      return;
    }

    const days=data.days || [];
    if(!days.length){
      body.innerHTML='<div class="mvl-v204-empty">No hay registros para este indicador en el periodo seleccionado.</div>';
      return;
    }

    body.innerHTML=days.map((day,index)=>`
      <details class="mvl-v204-day" ${index===0?'open':''}>
        <summary>
          <div class="mvl-v204-day-title">
            <strong>${esc204(day.dateLabel || day.date)}</strong>
            <small>${esc204(day.secondary || '')}</small>
          </div>
          <div class="mvl-v204-day-value">
            <b>${esc204(day.primary || '—')}</b>
            <span>${Number(day.count||0)} registro${Number(day.count||0)===1?'':'s'}</span>
          </div>
        </summary>

        <div class="mvl-v204-client-list">
          ${(day.items||[]).map(item=>`
            <article class="mvl-v204-client">
              <div>
                <strong>${esc204(clientTitle204(item))}</strong>
                <small>
                  ${item.clientCode ? `Código cliente: ${esc204(item.clientCode)}` : ''}
                  ${item.orderId ? `${item.clientCode?' · ':''}Orden: ${esc204(item.orderId)}` : ''}
                </small>
                <small>
                  ${item.typePartida ? esc204(item.typePartida) : esc204(item.typeAtencion || '')}
                </small>
                ${item.address ? `<small>${esc204(item.address)}</small>` : ''}
                ${item.description ? `<small><b>Observación:</b> ${esc204(item.description)}</small>` : ''}
                ${item.descargo ? `<small><b>Descargo:</b> ${esc204(item.descargo)}</small>` : ''}
              </div>
              <div class="mvl-v204-client-meta">
                <b>${esc204(item.metric || '')}</b>
                <span class="${statusClass204(item,indicator)}">${esc204(statusText204(item,indicator))}</span>
              </div>
            </article>
          `).join('')}
        </div>
      </details>
    `).join('');
  }

  async function openDetail204(button) {
    createModal204();

    const indicator=button.dataset.indicatorDetail || '';
    const context=buttonContext204(button);
    const modal=$204('indicatorDetailModalV204');

    modal?.classList.remove('hidden');
    $204('indicatorDetailEyebrowV204').textContent=IND204[indicator] || 'DETALLE';
    $204('indicatorDetailTitleV204').textContent='Cargando detalle…';
    $204('indicatorDetailSubtitleV204').textContent='';
    $204('indicatorDetailBodyV204').innerHTML='<div class="mvl-v204-loading">Cargando clientes y órdenes…</div>';

    try{
      const res=await api('performanceIndicatorDetail',{
        token:typeof token==='function' ? token() : '',
        period:context.period,
        crewId:context.crewId,
        indicator
      });

      if(!res?.ok){
        if(res?.expired && typeof clearSession==='function') clearSession();
        throw new Error(res?.error || 'No se pudo cargar el detalle.');
      }

      renderDetail204(res);
    }catch(err){
      $204('indicatorDetailBodyV204').innerHTML=
        `<div class="mvl-v204-empty">${esc204(err.message || 'No se pudo cargar el detalle.')}</div>`;
    }
  }

  function ensureDetailButtonsIn204(root) {
    if(!root) return;

    root.querySelectorAll('.performance-card').forEach(card=>{
      const indicator=indicatorFromCard204(card);
      if(!indicator) return;

      let btn=card.querySelector(':scope > .mvl-v204-detail-btn');
      if(btn){
        btn.dataset.indicatorDetail=indicator;
        return;
      }

      btn=document.createElement('button');
      btn.type='button';
      btn.className='mvl-v204-detail-btn';
      btn.dataset.indicatorDetail=indicator;
      btn.textContent='DETALLE';
      btn.addEventListener('click',()=>openDetail204(btn));
      card.appendChild(btn);
    });
  }

  function refreshButtons204() {
    ensureDetailButtonsIn204($204('performanceTechPanel'));
    ensureDetailButtonsIn204($204('dashboardCrewDetail'));
  }

  // Exponer para las capas visuales existentes.
  window.refreshIndicatorDetailButtonsV204=refreshButtons204;

  document.addEventListener('click',e=>{
    if(
      e.target?.id==='refreshPerformanceButton' ||
      e.target?.id==='refreshDashboardButton' ||
      e.target?.closest?.('[data-dashboard-crew]')
    ){
      setTimeout(refreshButtons204,180);
      setTimeout(refreshButtons204,700);
    }
  },true);

  document.addEventListener('change',e=>{
    if(
      e.target?.id==='performancePeriod' ||
      e.target?.id==='performanceCrewSelect' ||
      e.target?.id==='dashboardCrew' ||
      e.target?.id==='dashboardPeriod'
    ){
      setTimeout(refreshButtons204,200);
    }
  },true);

  // El panel Técnico y el detalle Dashboard se renderizan asíncronamente.
  const target=$204('performanceView');
  if(target){
    let scheduled=false;
    new MutationObserver(()=>{
      if(scheduled) return;
      scheduled=true;
      requestAnimationFrame(()=>{
        scheduled=false;
        refreshButtons204();
      });
    }).observe(target,{childList:true,subtree:true});
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>{
      setTimeout(refreshButtons204,800);
    },{once:true});
  }else{
    setTimeout(refreshButtons204,800);
  }

  console.info('[MI VISUAL LIMA] V2.04: detalle por indicador y clientes por día.');
})();



/* ==========================================================
   MI VISUAL LIMA - V2.05
   VALIDACIÓN TÉCNICA + OBSERVACIONES + DASHBOARD
   ========================================================== */
(() => {
  const $205 = id => document.getElementById(id);
  const esc205 = value => String(value ?? '')
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const norm205 = value => String(value ?? '').normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();

  const V205 = {
    dashboard:null,
    tech:null,
    configByType:new Map(),
    apiWrapped:false
  };

  function token205(){
    try { return typeof token === 'function' ? token() : ''; }
    catch(_) { return ''; }
  }

  function session205(){
    try {
      if (typeof sessionData !== 'undefined' && sessionData) return sessionData;
    } catch (_) {}
    return window.sessionData || null;
  }

  function currentUser205(){
    return session205()?.user || {};
  }

  function modulePermission205(name){
    const target=norm205(name);
    return (session205()?.modules || []).find(m=>norm205(m.module)===target)?.permissions || null;
  }

  function period205(){
    return $205('dashboardPeriod')?.value || $205('performancePeriod')?.value || '2026-08';
  }

  function installStyles205(){
    if($205('mvlV205Styles')) return;
    const style=document.createElement('style');
    style.id='mvlV205Styles';
    style.textContent=`
      .mvl205-view{padding-bottom:22px}
      .mvl205-topbar{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:15px}
      .mvl205-back{border:0;background:transparent;color:#365a7c;font-weight:850;padding:4px 0;font-size:.74rem}
      .mvl205-title h2{margin:3px 0 3px;color:#072f5b;font-size:1.16rem}
      .mvl205-title p{margin:0;color:#6e7f92;font-size:.70rem}
      .mvl205-actions{display:flex;gap:7px;flex-wrap:wrap}
      .mvl205-primary,.mvl205-secondary{min-height:36px;border-radius:10px;padding:7px 12px;font-size:.67rem;font-weight:900}
      .mvl205-primary{border:0;background:#1264c5;color:#fff}
      .mvl205-secondary{border:1px solid #cbdced;background:#fff;color:#0b5bb5}
      .mvl205-filters{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-bottom:12px}
      .mvl205-filters label,.mvl205-form label{display:block;color:#536a82;font-size:.64rem;font-weight:800}
      .mvl205-filters input,.mvl205-filters select,.mvl205-form input,.mvl205-form select,.mvl205-form textarea{
        width:100%;margin-top:4px;border:1px solid #c8d8e8;border-radius:10px;padding:8px 9px;background:#fff;color:#13395f;font:inherit
      }
      .mvl205-form textarea{min-height:88px;resize:vertical}
      .mvl205-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:10px 0 13px}
      .mvl205-summary div{border:1px solid #dce7f2;border-radius:11px;padding:9px 10px;background:#fbfdff}
      .mvl205-summary span{display:block;color:#718196;font-size:.59rem}
      .mvl205-summary b{display:block;color:#082f5b;font-size:.92rem;margin-top:2px}
      .mvl205-list{display:grid;gap:8px}
      .mvl205-card{border:1px solid #dce6f1;border-radius:13px;padding:11px 12px;background:#fff}
      .mvl205-card-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}
      .mvl205-card-head strong{display:block;color:#0a3b70;font-size:.76rem;line-height:1.22}
      .mvl205-card-head small{display:block;color:#73849a;font-size:.59rem;margin-top:3px}
      .mvl205-chip{display:inline-flex;align-items:center;border-radius:999px;padding:3px 7px;font-size:.56rem;font-weight:900;background:#eef3f8;color:#526b85;white-space:nowrap}
      .mvl205-chip.green{background:#edf9f0;color:#087d34}.mvl205-chip.red{background:#fff0f0;color:#b42318}
      .mvl205-chip.yellow{background:#fff7e5;color:#946000}.mvl205-chip.blue{background:#edf5ff;color:#0758b7}
      .mvl205-meta{display:flex;gap:5px;flex-wrap:wrap;margin-top:7px}
      .mvl205-desc{margin:8px 0 0;color:#415a74;font-size:.67rem;line-height:1.38;white-space:pre-wrap}
      .mvl205-card-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px}
      .mvl205-card-actions button{border:1px solid #cbdced;background:#fff;color:#0758b7;border-radius:8px;padding:5px 8px;font-size:.60rem;font-weight:850}
      .mvl205-empty{padding:24px 10px;text-align:center;color:#6d8197;font-size:.72rem}
      .mvl205-overlay{position:fixed;inset:0;z-index:100050;background:rgba(15,35,58,.44);display:flex;align-items:center;justify-content:center;padding:16px}
      .mvl205-overlay.hidden{display:none!important}
      .mvl205-modal{width:min(720px,96vw);max-height:92vh;display:flex;flex-direction:column;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 24px 70px rgba(15,35,58,.25)}
      .mvl205-modal-head{display:flex;justify-content:space-between;gap:12px;padding:14px 16px 11px;border-bottom:1px solid #e3ebf4}
      .mvl205-modal-head h3{margin:0;color:#082f5b;font-size:.95rem}.mvl205-modal-head p{margin:3px 0 0;color:#74859a;font-size:.64rem}
      .mvl205-close{width:32px;height:32px;border:0;border-radius:9px;background:#eef3f8;color:#24496f;font-weight:900}
      .mvl205-modal-body{overflow:auto;padding:13px 16px}.mvl205-form{display:grid;grid-template-columns:1fr 1fr;gap:9px}
      .mvl205-form .full{grid-column:1/-1}
      .mvl205-modal-footer{display:flex;justify-content:flex-end;gap:8px;padding:11px 16px;border-top:1px solid #e3ebf4;background:#fbfdff}
      .mvl205-message{min-height:18px;color:#667b92;font-size:.64rem;font-weight:750;margin-top:7px}.mvl205-message.error{color:#b42318}.mvl205-message.ok{color:#087d34}
      .mvl205-file-note{font-size:.58rem;color:#7d8c9c;margin-top:4px}
      .mvl205-evidence-links{display:flex;gap:5px;flex-wrap:wrap;margin-top:6px}.mvl205-evidence-links a{font-size:.58rem}
      #dashboardObsCardV205 .mvl-v205-obs-badge,.mvl-v205-obs-badge{display:inline-block;margin-top:5px;padding:3px 7px;border-radius:999px;font-size:.56rem;font-weight:900}
      .mvl-v205-obs-badge.green{background:#edf9f0;color:#087d34}.mvl-v205-obs-badge.yellow{background:#fff7e5;color:#946000}.mvl-v205-obs-badge.red{background:#fff0f0;color:#b42318}
      .mvl-v205-obs-config{margin-top:10px}
      @media(max-width:720px){.mvl205-filters{grid-template-columns:1fr 1fr}.mvl205-summary{grid-template-columns:1fr 1fr}}
      @media(max-width:500px){.mvl205-topbar{display:block}.mvl205-actions{margin-top:9px}.mvl205-filters,.mvl205-form{grid-template-columns:1fr}.mvl205-summary{grid-template-columns:1fr 1fr}}
    `;
    document.head.appendChild(style);
  }

  function statusClass205(status){
    const s=norm205(status);
    if(['APROBADO','BONO','SUBSANADO','CUMPLE'].includes(s)) return 'green';
    if(['RECHAZADO','NO BONO','PENALIZADO','CRITICO'].includes(s)) return 'red';
    if(['PENDIENTE','OBSERVADO','EN PROCESO','APELADO','ATENCION'].includes(s)) return 'yellow';
    return 'blue';
  }

  function hideAppViews205(){
    ['loginView','homeView','adminView','performanceView','mapViewV200','validationViewV205','observationsViewV205']
      .forEach(id=>$205(id)?.classList.add('hidden'));
  }

  function returnHome205(){
    hideAppViews205();
    $205('homeView')?.classList.remove('hidden');
    try { if(typeof renderHome==='function') renderHome(session205()); } catch(_){}
  }

  function createBaseView205(id,title,subtitle){
    let view=$205(id);
    if(view) return view;
    view=document.createElement('section');
    view.id=id;
    view.className='card app-card mvl205-view hidden';
    view.innerHTML=`
      <div class="mvl205-topbar">
        <div>
          <button type="button" class="mvl205-back">← Inicio</button>
          <div class="mvl205-title"><h2>${esc205(title)}</h2><p>${esc205(subtitle)}</p></div>
        </div>
        <div class="mvl205-actions"></div>
      </div>
      <div class="mvl205-content"></div>`;
    document.querySelector('main.shell')?.appendChild(view);
    view.querySelector('.mvl205-back')?.addEventListener('click',returnHome205);
    return view;
  }

  function activateCards205(){
    [
      ['Validación Técnica','Solicitudes RECABLEADO, GAR y VTR'],
      ['Observaciones','Registro, descargos y seguimiento']
    ].forEach(([name,subtitle])=>{
      const card=document.querySelector(`#moduleList [data-module="${name}"]`);
      const perm=modulePermission205(name);
      if(!card||!perm?.ver) return;
      card.disabled = false;
      card.classList.remove('disabled','module-disabled');
      card.classList.add('module-active');
      card.removeAttribute('disabled');
      card.setAttribute('aria-disabled','false');
      const small=card.querySelector('small');
      if(small) small.textContent=subtitle;
      const arrow=card.querySelector('.module-arrow');
      if(arrow) arrow.textContent='›';
    });
  }

  function moduleCardWatcher205(){
    const list=$205('moduleList');
    if(!list||list.dataset.v205Observed==='1') return;
    list.dataset.v205Observed='1';
    new MutationObserver(()=>activateCards205()).observe(list,{childList:true});
    activateCards205();
  }

  // -------------------------
  // VALIDACIÓN TÉCNICA
  // -------------------------
  const VAL205={data:null};

  function validationView205(){
    const view=createBaseView205('validationViewV205','VALIDACIÓN TÉCNICA','RECABLEADO, GAR y VTR · Lima');
    const actions=view.querySelector('.mvl205-actions');
    const content=view.querySelector('.mvl205-content');
    if(!content.dataset.ready){
      content.dataset.ready='1';
      content.innerHTML=`
        <div class="mvl205-filters">
          <label>Periodo<input type="month" id="valPeriodV205" value="${esc205(period205())}"></label>
          <label>Tipo<select id="valTypeV205"><option value="">Todos</option><option>RECABLEADO</option><option>GAR</option><option>VTR</option><option>OTRO</option></select></label>
          <label>Estado<select id="valStateV205"><option value="">Todos</option><option>PENDIENTE</option><option>APROBADO</option><option>RECHAZADO</option><option>OBSERVADO</option><option>BONO</option><option>NO BONO</option><option value="SIN RESPUESTA">AUTOMÁTICA</option></select></label>
          <label>Cuadrilla<select id="valCrewV205"><option value="">Todas</option></select></label>
        </div>
        <div class="mvl205-summary" id="valSummaryV205"></div>
        <div class="mvl205-list" id="valListV205"><div class="mvl205-empty">Cargando…</div></div>`;
      ['valPeriodV205','valTypeV205','valStateV205','valCrewV205'].forEach(id=>$205(id)?.addEventListener('change',loadValidation205));
    }
    if(!actions.dataset.ready){
      actions.dataset.ready='1';
      const refresh=document.createElement('button');refresh.className='mvl205-secondary';refresh.textContent='Actualizar';refresh.onclick=loadValidation205;actions.appendChild(refresh);
      const add=document.createElement('button');add.id='newValidationV205';add.className='mvl205-primary';add.textContent='NUEVA VALIDACIÓN';add.onclick=openValidationCreate205;actions.appendChild(add);
    }
    return view;
  }

  function fillCrewSelect205(select,crews,allLabel='Todas'){
    if(!select) return;
    const prev=select.value;
    select.innerHTML=`<option value="">${esc205(allLabel)}</option>`+(crews||[]).map(c=>`<option value="${esc205(c.id)}">${esc205(c.display)}</option>`).join('');
    if([...select.options].some(o=>o.value===prev)) select.value=prev;
  }

  async function loadValidation205(){
    const list=$205('valListV205');if(list) list.innerHTML='<div class="mvl205-empty">Cargando validaciones…</div>';
    try{
      const res=await api('technicalValidationList',{
        token:token205(),period:$205('valPeriodV205')?.value||period205(),
        type:$205('valTypeV205')?.value||'',state:$205('valStateV205')?.value||'',
        crewId:$205('valCrewV205')?.value||''
      });
      if(!res?.ok) throw new Error(res?.error||'No se pudo cargar.');
      VAL205.data=res;
      fillCrewSelect205($205('valCrewV205'),res.crews,'Todas');
      $205('newValidationV205')?.classList.toggle('hidden',!res.canRegister);
      renderValidation205(res);
    }catch(err){if(list) list.innerHTML=`<div class="mvl205-empty">${esc205(err.message)}</div>`;}
  }

  function renderValidation205(res){
    const rows=res.rows||[];
    const pending=rows.filter(r=>norm205(r.estado)==='PENDIENTE').length;
    const auto=rows.filter(r=>norm205(r.resultadoFinal)==='APROBADO AUTOMATICAMENTE').length;
    const sum=$205('valSummaryV205');
    if(sum) sum.innerHTML=`<div><span>Registros</span><b>${rows.length}</b></div><div><span>Pendientes</span><b>${pending}</b></div><div><span>Automáticas</span><b>${auto}</b></div><div><span>Plazo RECABLEADO</span><b>${Number(res.autoMinutes||15)} min</b></div>`;
    const list=$205('valListV205');
    if(!rows.length){list.innerHTML='<div class="mvl205-empty">No hay validaciones para los filtros seleccionados.</div>';return;}
    list.innerHTML=rows.map(r=>{
      const canResolve=res.canValidate&&norm205(r.estado)==='PENDIENTE';
      return `<article class="mvl205-card">
        <div class="mvl205-card-head"><div><strong>${esc205(r.crewCode||r.cuadrilla)} · ${esc205(r.tipoValidacion)}</strong><small>${esc205(r.fechaRegistro)} ${esc205(r.horaRegistro)} · Código ${esc205(r.codigo)}</small></div><span class="mvl205-chip ${statusClass205(r.estadoVisible||r.estado)}">${esc205(r.resultadoVisible||r.estadoVisible||r.estado)}</span></div>
        <div class="mvl205-meta"><span class="mvl205-chip blue">${esc205(r.ticketFinal||'NO APLICA')}</span>${r.origenOrden?`<span class="mvl205-chip">${esc205(r.origenOrden)}</span>`:''}<span class="mvl205-chip">${esc205(r.platform||'')}</span></div>
        <p class="mvl205-desc">${esc205(r.motivoTecnico||'')}</p>
        ${r.motivoValidacion?`<p class="mvl205-desc"><b>Respuesta:</b> ${esc205(r.motivoValidacion)}</p>`:''}
        <div class="mvl205-card-actions">${canResolve?`<button type="button" data-val-resolve="${esc205(r.id)}">VALIDAR</button>`:''}</div>
      </article>`;
    }).join('');
    list.querySelectorAll('[data-val-resolve]').forEach(b=>b.onclick=()=>openValidationResolve205(b.dataset.valResolve));
  }

  function simpleModal205(id,title,subtitle,body,saveLabel,onSave){
    let modal=$205(id);
    if(modal) modal.remove();
    modal=document.createElement('div');modal.id=id;modal.className='mvl205-overlay';
    modal.innerHTML=`<section class="mvl205-modal"><header class="mvl205-modal-head"><div><h3>${esc205(title)}</h3><p>${esc205(subtitle||'')}</p></div><button class="mvl205-close" type="button">×</button></header><div class="mvl205-modal-body">${body}<div class="mvl205-message"></div></div><footer class="mvl205-modal-footer"><button class="mvl205-secondary mvl205-cancel" type="button">Cancelar</button><button class="mvl205-primary mvl205-save" type="button">${esc205(saveLabel)}</button></footer></section>`;
    document.body.appendChild(modal);
    const close=()=>modal.remove();modal.querySelector('.mvl205-close').onclick=close;modal.querySelector('.mvl205-cancel').onclick=close;
    modal.addEventListener('click',e=>{if(e.target===modal)close();});
    modal.querySelector('.mvl205-save').onclick=async()=>{const msg=modal.querySelector('.mvl205-message');const btn=modal.querySelector('.mvl205-save');btn.disabled=true;try{await onSave(modal,msg);close();}catch(err){msg.textContent=err.message||String(err);msg.className='mvl205-message error';}finally{btn.disabled=false;}};
    return modal;
  }

  function crewOptionsHtml205(crews,selected=''){return (crews||[]).map(c=>`<option value="${esc205(c.id)}" ${c.id===selected?'selected':''}>${esc205(c.display)}</option>`).join('');}

  function openValidationCreate205(){
    const crews=VAL205.data?.crews||[];
    const body=`<div class="mvl205-form">
      <label class="full">Cuadrilla<select id="valNewCrewV205">${crewOptionsHtml205(crews,crews.length===1?crews[0].id:'')}</select></label>
      <label>Tipo de ticket<select id="valNewTicketTypeV205"><option value="AT-">AT- · RECABLEADO</option><option value="VTEXT-">VTEXT- · RECABLEADO</option><option value="GAR-">GAR-</option><option value="VTR-">VTR-</option><option value="NO APLICA">NO APLICA · OTRO</option></select></label>
      <label>Número ticket<input id="valNewTicketNumberV205"></label>
      <label>Código orden/cliente<input id="valNewCodeV205"></label>
      <label>DNI cliente<input id="valNewDniV205"></label>
      <label id="valOriginWrapV205" class="hidden">Origen orden<select id="valNewOriginV205"><option value="">Seleccionar</option><option>PROPIA</option><option>ASIGNADA</option></select></label>
      <label class="full">Motivo técnico<textarea id="valNewMotiveV205"></textarea></label>
    </div>`;
    const modal=simpleModal205('validationCreateModalV205','NUEVA VALIDACIÓN TÉCNICA','RECABLEADO se aprueba automáticamente al vencer el plazo.',''+body,'Registrar',async(modal,msg)=>{
      const res=await api('technicalValidationCreate',{
        token:token205(),period:$205('valPeriodV205')?.value||period205(),
        crewId:modal.querySelector('#valNewCrewV205')?.value||'',
        ticketType:modal.querySelector('#valNewTicketTypeV205')?.value||'',
        ticketNumber:modal.querySelector('#valNewTicketNumberV205')?.value||'',
        code:modal.querySelector('#valNewCodeV205')?.value||'',
        dni:modal.querySelector('#valNewDniV205')?.value||'',
        originOrder:modal.querySelector('#valNewOriginV205')?.value||'',
        motive:modal.querySelector('#valNewMotiveV205')?.value||''
      });if(!res?.ok) throw new Error(res?.error||'No se pudo registrar.');await loadValidation205();
    });
    const ticket=modal.querySelector('#valNewTicketTypeV205'),wrap=modal.querySelector('#valOriginWrapV205'),num=modal.querySelector('#valNewTicketNumberV205');
    const sync=()=>{const t=norm205(ticket.value);wrap.classList.toggle('hidden',!(t.includes('GAR')||t.includes('VTR')));num.disabled=t.includes('NO APLICA');if(num.disabled)num.value='';};ticket.onchange=sync;sync();
  }

  function openValidationResolve205(id){
    const row=(VAL205.data?.rows||[]).find(r=>r.id===id);if(!row)return;
    const profile=norm205(VAL205.data?.profile);
    const garVtr=['GAR','VTR'].includes(norm205(row.tipoValidacion));
    const options=garVtr&&profile!=='SUPERVISOR'?'<option>BONO</option><option>NO BONO</option>':'<option>APROBADO</option><option>RECHAZADO</option><option>OBSERVADO</option>';
    const body=`<div class="mvl205-form"><label class="full">Resultado<select id="valResolveResultV205">${options}</select></label><label class="full">Motivo<textarea id="valResolveMotiveV205"></textarea></label></div>`;
    simpleModal205('validationResolveModalV205','VALIDAR SOLICITUD',`${row.crewCode} · ${row.tipoValidacion} · ${row.codigo}`,body,'Guardar',async(modal)=>{
      const res=await api('technicalValidationResolve',{token:token205(),id,result:modal.querySelector('#valResolveResultV205').value,motive:modal.querySelector('#valResolveMotiveV205').value});
      if(!res?.ok) throw new Error(res?.error||'No se pudo validar.');await loadValidation205();
    });
  }

  async function openValidation205(){
    installStyles205();hideAppViews205();validationView205().classList.remove('hidden');await loadValidation205();
  }

  // -------------------------
  // OBSERVACIONES
  // -------------------------
  const OBS205={data:null};

  function observationsView205(){
    const view=createBaseView205('observationsViewV205','OBSERVACIONES','Registro, descargos, estados e impacto por cuadrilla');
    const actions=view.querySelector('.mvl205-actions'),content=view.querySelector('.mvl205-content');
    if(!content.dataset.ready){
      content.dataset.ready='1';
      content.innerHTML=`<div class="mvl205-filters">
        <label>Periodo<input type="month" id="obsPeriodV205" value="${esc205(period205())}"></label>
        <label>Estado<select id="obsStateV205"><option value="">Todos</option><option>DERIVADO</option><option>EN PROCESO</option><option>PENALIZADO</option><option>SUBSANADO</option><option>APELADO</option><option>ANULADO</option></select></label>
        <label>Cuadrilla<select id="obsCrewV205"><option value="">Todas</option></select></label>
        <label>Buscar<input type="search" id="obsSearchV205" placeholder="Código, ticket, descripción..."></label>
      </div><div class="mvl205-summary" id="obsSummaryV205"></div><div class="mvl205-list" id="obsListV205"><div class="mvl205-empty">Cargando…</div></div>`;
      ['obsPeriodV205','obsStateV205','obsCrewV205'].forEach(id=>$205(id)?.addEventListener('change',loadObservations205));
      $205('obsSearchV205')?.addEventListener('input',renderObservations205);
    }
    if(!actions.dataset.ready){
      actions.dataset.ready='1';
      const refresh=document.createElement('button');refresh.className='mvl205-secondary';refresh.textContent='Actualizar';refresh.onclick=loadObservations205;actions.appendChild(refresh);
      const add=document.createElement('button');add.id='newObservationV205';add.className='mvl205-primary';add.textContent='NUEVA OBSERVACIÓN';add.onclick=openObservationCreate205;actions.appendChild(add);
    }
    return view;
  }

  async function loadObservations205(){
    const list=$205('obsListV205');if(list)list.innerHTML='<div class="mvl205-empty">Cargando observaciones…</div>';
    try{
      const res=await api('observationsList',{token:token205(),period:$205('obsPeriodV205')?.value||period205(),state:$205('obsStateV205')?.value||'',crewId:$205('obsCrewV205')?.value||''});
      if(!res?.ok)throw new Error(res?.error||'No se pudo cargar.');
      OBS205.data=res;fillCrewSelect205($205('obsCrewV205'),res.crews,'Todas');
      $205('newObservationV205')?.classList.toggle('hidden',!res.canRegister);renderObservations205();
    }catch(err){if(list)list.innerHTML=`<div class="mvl205-empty">${esc205(err.message)}</div>`;}
  }

  function evidenceLinks205(text){
    const links=String(text||'').split('|').filter(Boolean);if(!links.length)return '';
    return `<div class="mvl205-evidence-links">${links.map((x,i)=>`<a href="${esc205(x)}" target="_blank" rel="noopener">Evidencia ${i+1}</a>`).join('')}</div>`;
  }

  function renderObservations205(){
    const res=OBS205.data;if(!res)return;const q=norm205($205('obsSearchV205')?.value||'');
    const rows=(res.rows||[]).filter(r=>!q||norm205([r.code,r.ticket,r.description,r.crewCode,r.crewName].join(' ')).includes(q));
    const total=rows.length,active=rows.filter(r=>!['SUBSANADO','ANULADO'].includes(norm205(r.state))).length,impact=rows.reduce((a,r)=>a+Number(r.impactAmount||0),0),pen=rows.filter(r=>norm205(r.state)==='PENALIZADO').length;
    $205('obsSummaryV205').innerHTML=`<div><span>Observaciones</span><b>${total}</b></div><div><span>Activas</span><b>${active}</b></div><div><span>Penalizadas</span><b>${pen}</b></div><div><span>Impacto</span><b>S/ ${impact.toFixed(2)}</b></div>`;
    const list=$205('obsListV205');if(!rows.length){list.innerHTML='<div class="mvl205-empty">No hay observaciones para los filtros seleccionados.</div>';return;}
    list.innerHTML=rows.map(r=>`<article class="mvl205-card">
      <div class="mvl205-card-head"><div><strong>${esc205(r.crewCode||r.crew)} · ${esc205(r.type)}</strong><small>${esc205(r.date)} · ${esc205(r.source)} · Código ${esc205(r.code)}</small></div><span class="mvl205-chip ${statusClass205(r.state)}">${esc205(r.state)}</span></div>
      <div class="mvl205-meta"><span class="mvl205-chip">${esc205(r.platform)}</span>${r.ticket?`<span class="mvl205-chip blue">${esc205(r.ticket)}</span>`:''}${Number(r.amount||0)?`<span class="mvl205-chip">S/ ${Number(r.amount).toFixed(2)}</span>`:''}</div>
      <p class="mvl205-desc">${esc205(r.description)}</p>
      ${r.descargo?`<p class="mvl205-desc"><b>Descargo:</b> ${esc205(r.descargo)}</p>${evidenceLinks205(r.evidence)}`:''}
      ${r.stateReason?`<p class="mvl205-desc"><b>Última revisión:</b> ${esc205(r.stateReason)}</p>`:''}
      <div class="mvl205-card-actions">${res.canDescargo?`<button type="button" data-obs-descargo="${esc205(r.id)}">DESCARGO</button>`:''}${res.canEdit?`<button type="button" data-obs-state="${esc205(r.id)}">CAMBIAR ESTADO</button>`:''}</div>
    </article>`).join('');
    list.querySelectorAll('[data-obs-descargo]').forEach(b=>b.onclick=()=>openObservationDescargo205(b.dataset.obsDescargo));
    list.querySelectorAll('[data-obs-state]').forEach(b=>b.onclick=()=>openObservationState205(b.dataset.obsState));
  }

  function openObservationCreate205(){
    const crews=OBS205.data?.crews||[];
    const body=`<div class="mvl205-form">
      <label class="full">Cuadrilla<select id="obsNewCrewV205">${crewOptionsHtml205(crews,crews.length===1?crews[0].id:'')}</select></label>
      <label>Fuente<select id="obsNewSourceV205"><option>WIN</option><option>VISUAL</option></select></label>
      <label>Tipo<select id="obsNewTypeV205"><option>SEGURIDAD</option><option>IMPLEMENTACIÓN</option><option>GESTIÓN TÉCNICA</option><option>OTRO</option></select></label>
      <label>Código<input id="obsNewCodeV205"></label><label>Monto S/<input id="obsNewAmountV205" type="number" min="0" step="0.01" value="0"></label>
      <label>Código orden<input id="obsNewOrderV205"></label><label>Código cliente<input id="obsNewClientV205"></label>
      <label class="full">Ticket atención<input id="obsNewTicketV205"></label>
      <label class="full">Descripción<textarea id="obsNewDescriptionV205"></textarea></label>
    </div>`;
    simpleModal205('observationCreateModalV205','NUEVA OBSERVACIÓN','Registro operativo de la cuadrilla.',body,'Registrar',async(modal)=>{
      const res=await api('observationsCreate',{token:token205(),period:$205('obsPeriodV205')?.value||period205(),crewId:modal.querySelector('#obsNewCrewV205').value,source:modal.querySelector('#obsNewSourceV205').value,type:modal.querySelector('#obsNewTypeV205').value,code:modal.querySelector('#obsNewCodeV205').value,amount:modal.querySelector('#obsNewAmountV205').value,orderCode:modal.querySelector('#obsNewOrderV205').value,clientCode:modal.querySelector('#obsNewClientV205').value,ticket:modal.querySelector('#obsNewTicketV205').value,description:modal.querySelector('#obsNewDescriptionV205').value,state:'DERIVADO'});
      if(!res?.ok)throw new Error(res?.error||'No se pudo registrar.');await loadObservations205();
    });
  }

  async function filesBase64205(fileList){
    const files=[...(fileList||[])];if(files.length>5)throw new Error('Máximo 5 evidencias.');
    return Promise.all(files.map(file=>new Promise((resolve,reject)=>{
      if(file.size>3*1024*1024)return reject(new Error(`${file.name}: máximo 3 MB.`));
      const reader=new FileReader();reader.onload=()=>resolve({nombre:file.name,mime:file.type||'image/jpeg',base64:String(reader.result||'').split(',')[1]||''});reader.onerror=()=>reject(new Error('No se pudo leer '+file.name));reader.readAsDataURL(file);
    })));
  }

  function openObservationDescargo205(id){
    const row=(OBS205.data?.rows||[]).find(r=>r.id===id);if(!row)return;
    const body=`<div class="mvl205-form"><label class="full">Descargo<textarea id="obsDescargoTextV205">${esc205(row.descargo||'')}</textarea></label><label class="full">Evidencias (máx. 5 imágenes, 3 MB c/u)<input id="obsDescargoFilesV205" type="file" accept="image/jpeg,image/png,image/webp" multiple><div class="mvl205-file-note">JPG, PNG o WEBP.</div></label></div>`;
    simpleModal205('observationDescargoModalV205','REGISTRAR DESCARGO',`${row.crewCode} · ${row.code}`,body,'Guardar descargo',async(modal,msg)=>{
      msg.textContent='Preparando evidencias…';const evidences=await filesBase64205(modal.querySelector('#obsDescargoFilesV205').files);
      const res=await api('observationsDescargo',{token:token205(),id,descargo:modal.querySelector('#obsDescargoTextV205').value,evidences:JSON.stringify(evidences)});
      if(!res?.ok)throw new Error(res?.error||'No se pudo guardar.');await loadObservations205();
    });
  }

  function openObservationState205(id){
    const row=(OBS205.data?.rows||[]).find(r=>r.id===id);if(!row)return;
    const body=`<div class="mvl205-form"><label class="full">Nuevo estado<select id="obsStateNewV205">${['DERIVADO','EN PROCESO','PENALIZADO','SUBSANADO','APELADO','ANULADO'].map(s=>`<option ${s===row.state?'selected':''}>${s}</option>`).join('')}</select></label><label class="full">Motivo del cambio<textarea id="obsStateReasonV205"></textarea></label></div>`;
    simpleModal205('observationStateModalV205','CAMBIAR ESTADO',`${row.crewCode} · ${row.code}`,body,'Actualizar',async(modal)=>{
      const res=await api('observationsUpdate',{token:token205(),id,state:modal.querySelector('#obsStateNewV205').value,reason:modal.querySelector('#obsStateReasonV205').value});
      if(!res?.ok)throw new Error(res?.error||'No se pudo actualizar.');await loadObservations205();
    });
  }

  async function openObservations205(){
    installStyles205();hideAppViews205();observationsView205().classList.remove('hidden');await loadObservations205();
  }

  // -------------------------
  // OBSERVACIONES EN DASHBOARD / TÉCNICO
  // -------------------------
  function obsStatusInfo205(s){
    const n=norm205(s);if(n==='CUMPLE')return{cls:'green',label:'Óptimo'};if(n==='ATENCION')return{cls:'yellow',label:'Moderado'};return{cls:'red',label:'Crítico'};
  }

  function filtersRows205(rows){
    const f={visual:$205('dashboardVisualTypeV19')?.value||'',platform:$205('dashboardPlatformV19')?.value||'',composition:$205('dashboardCompositionV19')?.value||'',state:$205('dashboardStateV19')?.value||'',supervisor:$205('dashboardSupervisor')?.value||'',crew:$205('dashboardCrew')?.value||''};
    return (rows||[]).filter(r=>{
      if(f.visual&&norm205(r.visualType)!==norm205(f.visual))return false;if(f.platform&&norm205(r.platform)!==norm205(f.platform))return false;if(f.composition&&norm205(r.composition)!==norm205(f.composition))return false;if(f.state&&norm205(r.state)!==norm205(f.state))return false;
      if(f.supervisor){if(f.supervisor==='__GG__'){if(norm205(r.supervisor)!=='GG'&&r.supervisorId!=='__GG__')return false;}else if(String(r.supervisorId||'')!==String(f.supervisor))return false;}
      if(f.crew&&String(r.crewId)!==String(f.crew))return false;return true;
    });
  }

  function renderDashboardObs205(){
    if(!V205.dashboard?.ok)return;const rows=filtersRows205(V205.dashboard.rows);const count=rows.reduce((a,r)=>a+Number(r.observationsCount||0),0),active=rows.reduce((a,r)=>a+Number(r.observationsActive||0),0),impact=rows.reduce((a,r)=>a+Number(r.observationsImpact||0),0),avg=rows.length?count/rows.length:0;
    const card=$205('dashboardObsCardV205');if(!card)return;const strong=$205('dashboardTotalObsV205'),small=$205('dashboardTotalObsHelpV205');if(strong)strong.textContent=`${count} obs.`;if(small)small.textContent=`${active} activas · S/ ${impact.toFixed(2)} impacto · ${avg.toFixed(1)}/cuadrilla`;
    card.querySelector('.mvl-v205-obs-badge')?.remove();const cfg=V205.dashboard.indicatorConfigs?.[$205('dashboardVisualTypeV19')?.value||'TODOS']||V205.dashboard.indicatorConfig||{};const o=cfg.observations||{optimalMax:0,moderateMax:1};const st=avg<=Number(o.optimalMax??0)?'CUMPLE':avg<=Number(o.moderateMax??1)?'ATENCION':'CRITICO';const info=obsStatusInfo205(st);card.insertAdjacentHTML('beforeend',`<span class="mvl-v205-obs-badge ${info.cls}">${info.label}</span>`);
  }

  function ensureTechObsCard205(rootId='performanceTechPanel'){
    const root=$205(rootId);if(!root)return null;let card=[...root.querySelectorAll('.performance-card')].find(c=>norm205(c.querySelector('.performance-label')?.textContent).includes('OBSERV'));
    if(card)return card;const grid=root.querySelector('.performance-grid');if(!grid)return null;card=document.createElement('article');card.className='performance-card';card.innerHTML='<span class="performance-label">Observaciones</span><strong>—</strong><small>Sin datos</small>';grid.appendChild(card);window.refreshIndicatorDetailButtonsV204?.();return card;
  }

  function renderTechObs205(){
    if(!V205.tech?.ok)return;const s=V205.tech.summary||{},card=ensureTechObsCard205('performanceTechPanel');if(!card)return;card.classList.remove('under-construction');card.querySelector('strong').textContent=`${Number(s.observationsCount||0)} obs.`;let small=card.querySelector('small');small.textContent=`${Number(s.observationsActive||0)} activas · S/ ${Number(s.observationsImpact||0).toFixed(2)} impacto`;card.querySelector('.mvl-v205-obs-badge')?.remove();const info=obsStatusInfo205(s.observationsStatus||'CUMPLE');card.insertAdjacentHTML('beforeend',`<span class="mvl-v205-obs-badge ${info.cls}">${info.label}</span>`);window.refreshIndicatorDetailButtonsV204?.();
  }

  // Dashboard detalle de cuadrilla: se actualiza cuando performanceSummary se pide para una cuadrilla.
  function renderDashboardCrewObs205(){
    const s=V205.tech?.summary;if(!s)return;const root=$205('dashboardCrewDetail');if(!root||root.classList.contains('hidden'))return;const card=[...root.querySelectorAll('.performance-card')].find(c=>norm205(c.querySelector('.performance-label')?.textContent).includes('OBSERV'));if(!card)return;card.classList.remove('under-construction');card.querySelector('strong').textContent=`${Number(s.observationsCount||0)} obs.`;let small=card.querySelector('small');if(!small){small=document.createElement('small');card.appendChild(small);}small.textContent=`${Number(s.observationsActive||0)} activas · S/ ${Number(s.observationsImpact||0).toFixed(2)} impacto`;window.refreshIndicatorDetailButtonsV204?.();
  }

  // -------------------------
  // OBSERVACIONES EN PONER INDICADORES
  // -------------------------
  function ensureObsConfig205(){
    const modal=$205('indicatorConfigModalV113');if(!modal||modal.dataset.v205Obs==='1')return;
    const goals=$205('cfgGoalsPanelV123'),ind=$205('cfgIndicatorsPanelV123');if(!goals||!ind)return;
    [...goals.querySelectorAll('.mvl-v124-pending-goal')].forEach(r=>{if(norm205(r.textContent).includes('OBSERV'))r.remove();});
    [...ind.querySelectorAll('.mvl-v113-construction-item')].forEach(r=>{if(norm205(r.textContent).includes('OBSERV'))r.remove();});
    const goal=document.createElement('section');goal.className='mvl-v124-goal-card mvl-v205-obs-config';goal.innerHTML=`<h4>Observaciones</h4><div class="mvl-v113-config-grid"><label class="mvl-v113-field">Meta máxima ÓPTIMA · cantidad<input id="cfgObsOptimalV205" type="number" min="0" max="1000" step="1"></label></div><div class="mvl-v124-goal-note">Cantidad máxima de observaciones por cuadrilla para mantener nivel ÓPTIMO.</div>`;goals.appendChild(goal);
    const sem=document.createElement('section');sem.className='mvl-v113-config-section';sem.innerHTML=`<h4>Semáforo de Observaciones</h4><div class="mvl-v113-config-grid"><label class="mvl-v113-field">Máximo MODERADO · cantidad<input id="cfgObsModerateV205" type="number" min="0" max="1000" step="1"></label></div><div class="mvl-v114-levels"><div class="mvl-v114-level green"><strong>🟢 ÓPTIMO</strong><span id="cfgObsRangeGreenV205">—</span></div><div class="mvl-v114-level yellow"><strong>🟡 MODERADO</strong><span id="cfgObsRangeYellowV205">—</span></div><div class="mvl-v114-level red"><strong>🔴 CRÍTICO</strong><span id="cfgObsRangeRedV205">—</span></div></div>`;ind.appendChild(sem);
    ['cfgObsOptimalV205','cfgObsModerateV205'].forEach(id=>$205(id)?.addEventListener('input',updateObsRanges205));modal.dataset.v205Obs='1';
  }

  function updateObsRanges205(){
    const o=Number($205('cfgObsOptimalV205')?.value),m=Number($205('cfgObsModerateV205')?.value);if($205('cfgObsRangeGreenV205'))$205('cfgObsRangeGreenV205').textContent=Number.isFinite(o)?`0 a ${o}`:'—';if($205('cfgObsRangeYellowV205'))$205('cfgObsRangeYellowV205').textContent=Number.isFinite(o)&&Number.isFinite(m)?`>${o} a ${m}`:'—';if($205('cfgObsRangeRedV205'))$205('cfgObsRangeRedV205').textContent=Number.isFinite(m)?`>${m}`:'—';
  }

  function fillObsConfig205(cfg){
    ensureObsConfig205();const o=cfg?.observations||{};if($205('cfgObsOptimalV205'))$205('cfgObsOptimalV205').value=Number(o.optimalMax??0);if($205('cfgObsModerateV205'))$205('cfgObsModerateV205').value=Number(o.moderateMax??1);updateObsRanges205();
  }


  function observationConfig205(){
    const type=norm205($205('dashboardVisualTypeV19')?.value||'TODOS')||'TODOS';
    return V205.dashboard?.indicatorConfigs?.[type]?.observations
      || V205.dashboard?.indicatorConfigs?.TODOS?.observations
      || V205.dashboard?.indicatorConfig?.observations
      || {optimalMax:0,moderateMax:1};
  }

  function renderSupervisorObservations205(){
    if(!V205.dashboard?.ok) return;
    const compare=$205('dashboardCompareByV116')?.value||'CUADRILLAS';
    const indicator=$205('dashboardIndicator')?.value||'PRODUCCION';
    if(compare!=='SUPERVISORES') return;

    const rows=filtersRows205(V205.dashboard.rows);
    const list=$205('dashboardRankingList');
    const title=$205('dashboardRankingTitle');
    const help=$205('dashboardRankingHelp');
    if(!list) return;

    const groups=new Map();
    rows.forEach(r=>{
      const name=norm205(r.supervisor)==='GG'||r.supervisorId==='__GG__'?'GG':(r.supervisor||'Sin supervisor');
      if(!groups.has(name)) groups.set(name,{name,crews:0,count:0,active:0,impact:0});
      const g=groups.get(name);g.crews++;g.count+=Number(r.observationsCount||0);g.active+=Number(r.observationsActive||0);g.impact+=Number(r.observationsImpact||0);
    });

    if(indicator==='OBSERVACIONES'){
      const cfg=observationConfig205();
      const arr=[...groups.values()].sort((a,b)=>(a.count-b.count)||a.name.localeCompare(b.name,'es'));
      if(title)title.textContent='Ranking de Supervisores · Observaciones';
      if(help)help.textContent='Menor cantidad de observaciones primero. El semáforo usa el promedio por cuadrilla.';
      list.innerHTML=arr.length?arr.map((g,i)=>{
        const avg=g.crews?g.count/g.crews:0;
        const st=avg<=Number(cfg.optimalMax??0)?'CUMPLE':avg<=Number(cfg.moderateMax??1)?'ATENCION':'CRITICO';
        const info=obsStatusInfo205(st);
        return `<div class="mvl-v126-supervisor-all">
          <div class="mvl-v126-supervisor-head"><strong>#${i+1} · ${esc205(g.name)}</strong><small>${g.crews} cuadrilla${g.crews===1?'':'s'}</small></div>
          <div class="mvl-v126-kpi-grid" style="grid-template-columns:repeat(3,minmax(0,1fr))">
            <div><span>Observaciones</span><b>${g.count} obs.</b><span class="mvl-v113-status ${info.cls}">${info.label}</span></div>
            <div><span>Activas</span><b>${g.active}</b></div>
            <div><span>Impacto</span><b>S/ ${g.impact.toFixed(2)}</b></div>
          </div>
        </div>`;
      }).join(''):'<p class="empty">No hay Supervisores para los filtros seleccionados.</p>';
      return;
    }

    if(indicator==='ALL'){
      document.querySelectorAll('#dashboardRankingList .mvl-v126-supervisor-all').forEach(card=>{
        const name=card.querySelector('.mvl-v126-supervisor-head strong')?.textContent?.replace(/^#\d+\s*·\s*/,'').trim();
        const g=groups.get(name);const grid=card.querySelector('.mvl-v126-kpi-grid');if(!g||!grid)return;
        let cell=grid.querySelector('[data-v205-obs-supervisor]');
        if(!cell){cell=document.createElement('div');cell.dataset.v205ObsSupervisor='1';grid.appendChild(cell);}
        cell.innerHTML=`<span>Observaciones</span><b>${g.count} obs.</b><small>${g.active} activas</small>`;
        grid.style.gridTemplateColumns='repeat(5,minmax(0,1fr))';
      });
    }
  }


  function wrapRenderHome205(){
    if(window.__mvlRenderHome205Wrapped || typeof renderHome !== 'function') return false;
    window.__mvlRenderHome205Wrapped=true;
    const prev=renderHome;
    renderHome=function(data){
      const result=prev(data);
      window.setTimeout(()=>{activateCards205();moduleCardWatcher205();},0);
      return result;
    };
    return true;
  }

  // -------------------------
  // API WRAPPER / EVENTOS
  // -------------------------
  function wrapApi205(){
    if(V205.apiWrapped||typeof api!=='function')return false;V205.apiWrapped=true;const prev=api;
    api=async function(action,params={}){
      const result=await prev(action,params);
      if(action==='performanceDashboard'&&result?.ok){V205.dashboard=result;Object.entries(result.indicatorConfigs||{}).forEach(([k,v])=>V205.configByType.set(norm205(k),v));setTimeout(()=>{renderDashboardObs205();renderSupervisorObservations205();},55);}
      if(action==='performanceSummary'&&result?.ok){V205.tech=result;setTimeout(()=>{renderTechObs205();renderDashboardCrewObs205();},45);}
      if((action==='performanceIndicatorConfigGet'||action==='performanceIndicatorConfigSave')&&result?.ok&&result.config){V205.configByType.set(norm205(result.config.visualType||params.visualType||'TODOS'),result.config);setTimeout(()=>fillObsConfig205(result.config),0);}
      return result;
    };return true;
  }

  document.addEventListener('click',e=>{
    const card=e.target?.closest?.('#moduleList [data-module]');
    if(card){
      const name=card.dataset.module;if(name==='Validación Técnica'){e.preventDefault();e.stopImmediatePropagation();openValidation205();return;}
      if(name==='Observaciones'){e.preventDefault();e.stopImmediatePropagation();openObservations205();return;}
    }
    if(e.target?.closest?.('#putIndicatorsButtonV113'))setTimeout(()=>{ensureObsConfig205();const type=norm205($205('cfgVisualTypeV114')?.value||'TODOS');fillObsConfig205(V205.configByType.get(type)||V205.dashboard?.indicatorConfigs?.[type]||V205.dashboard?.indicatorConfig);},10);
  },true);

  document.addEventListener('change',e=>{
    const id=e.target?.id||'';if(['dashboardVisualTypeV19','dashboardPlatformV19','dashboardCompositionV19','dashboardStateV19','dashboardSupervisor','dashboardCrew','dashboardIndicator','dashboardCompareByV116'].includes(id))setTimeout(()=>{renderDashboardObs205();renderSupervisorObservations205();},70);
    if(id==='cfgVisualTypeV114')setTimeout(()=>{const type=norm205(e.target.value||'TODOS');fillObsConfig205(V205.configByType.get(type)||V205.dashboard?.indicatorConfigs?.[type]||V205.dashboard?.indicatorConfig);},100);
  },true);

  function init205(){
    installStyles205();wrapRenderHome205();moduleCardWatcher205();activateCards205();wrapApi205();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init205,200),{once:true});else setTimeout(init205,200);
  const timer=setInterval(()=>{wrapRenderHome205();activateCards205();if(wrapApi205()&&$205('moduleList')&&session205())clearInterval(timer);},300);
  setTimeout(()=>clearInterval(timer),10000);

  console.info('[MI VISUAL LIMA] V2.05: Validación Técnica + Observaciones activos.');
})();

console.info('[MI VISUAL LIMA] V2.05.1: activación corregida de Observaciones y Validación Técnica.');


/* ==========================================================
   MI VISUAL LIMA - V2.06
   GESTIÓN DE ACTAS + ACTIVIDAD EN CAMPO + CHECKLIST + DESCANSOS
   ========================================================== */
(() => {
  const $206=id=>document.getElementById(id);
  const esc206=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const norm206=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
  const STATE206={activity:null,checklist:null,acts:null,rests:null};

  function token206(){try{return typeof token==='function'?token():'';}catch(_){return'';}}
  function session206(){try{if(typeof sessionData!=='undefined'&&sessionData)return sessionData;}catch(_){}return window.sessionData||null;}
  function perm206(name){const n=norm206(name);return(session206()?.modules||[]).find(m=>norm206(m.module)===n)?.permissions||{};}
  function period206(){return $206('dashboardPeriod')?.value||$206('performancePeriod')?.value||new Date().toISOString().slice(0,7);}

  function installStyles206(){if($206('mvlV206Styles'))return;const s=document.createElement('style');s.id='mvlV206Styles';s.textContent=`
    .mvl206-grid2{display:grid;grid-template-columns:1fr 1fr;gap:9px}.mvl206-grid3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}
    .mvl206-section{border:1px solid #dce7f2;border-radius:12px;padding:10px;margin-top:10px;background:#fbfdff}.mvl206-section h4{margin:0 0 8px;color:#0a3b70;font-size:.75rem}
    .mvl206-kv{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin-top:8px}.mvl206-kv div{background:#f6f9fc;border-radius:8px;padding:6px}.mvl206-kv span{display:block;color:#74859a;font-size:.55rem}.mvl206-kv b{display:block;color:#163b63;font-size:.65rem;margin-top:2px}
    .mvl206-audit-row{display:grid;grid-template-columns:1.25fr .8fr 1.4fr;gap:7px;align-items:end;padding:7px 0;border-bottom:1px solid #edf2f7}.mvl206-audit-row:last-child{border-bottom:0}.mvl206-audit-row strong{font-size:.63rem;color:#244c75}.mvl206-audit-row small{display:block;font-size:.52rem;color:#7e8d9e}
    .mvl206-tool-row{display:grid;grid-template-columns:1.5fr .5fr .8fr 1fr 1.3fr;gap:6px;align-items:end;padding:7px 0;border-bottom:1px solid #edf2f7}.mvl206-tool-row input,.mvl206-tool-row select{width:100%;border:1px solid #c8d8e8;border-radius:8px;padding:7px;font-size:.63rem}
    .mvl206-link{display:inline-flex;margin-top:6px;color:#0758b7;font-size:.59rem;font-weight:800}.mvl206-score{font-size:1.1rem!important}.mvl206-calendar{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:5px}.mvl206-day{min-height:62px;border:1px solid #dce7f2;border-radius:8px;padding:5px;background:#fff}.mvl206-day b{font-size:.63rem}.mvl206-day span{display:block;margin-top:5px;font-size:.52rem}.mvl206-day.rest{background:#fff7e5;border-color:#f1ca77}.mvl206-day.vac{background:#edf5ff;border-color:#8fc1f6}
    .mvl206-check{display:flex;align-items:center;gap:6px;font-size:.62rem;color:#4d647d}.mvl206-check input{width:auto!important;margin:0!important}
    .mvl206-cargo{display:flex;align-items:center;gap:6px}.mvl206-cargo input{width:auto}.mvl206-loading{padding:24px;text-align:center;color:#6f8297;font-size:.72rem}
    @media(max-width:650px){.mvl206-grid2,.mvl206-grid3{grid-template-columns:1fr}.mvl206-audit-row{grid-template-columns:1fr}.mvl206-tool-row{grid-template-columns:1fr 1fr}.mvl206-calendar{grid-template-columns:repeat(4,minmax(0,1fr))}}
  `;document.head.appendChild(s);}

  function allViews206(){return['loginView','homeView','adminView','performanceView','mapViewV200','validationViewV205','observationsViewV205','fieldActivityViewV206','checklistViewV206','actsViewV206','restsViewV206'];}
  function hideViews206(){allViews206().forEach(id=>$206(id)?.classList.add('hidden'));}
  function goHome206(){hideViews206();try{if(typeof renderHome==='function'&&session206())renderHome(session206());else $206('homeView')?.classList.remove('hidden');}catch(_){$206('homeView')?.classList.remove('hidden');}}

  function baseView206(id,title,subtitle){let v=$206(id);if(v)return v;v=document.createElement('section');v.id=id;v.className='card app-card mvl205-view hidden';v.innerHTML=`<div class="mvl205-topbar"><div><button class="mvl205-back" type="button">← Inicio</button><div class="mvl205-title"><h2>${esc206(title)}</h2><p>${esc206(subtitle)}</p></div></div><div class="mvl205-actions"></div></div><div class="mvl205-content"></div>`;document.querySelector('main.shell')?.appendChild(v);v.querySelector('.mvl205-back').onclick=goHome206;return v;}

  function activateOperationalCards206(){[
    ['Gestión de Actas','PDF, revisión, entrega física y cargos'],['Actividad en Campo','Auditorías, seguimiento y capacitación'],['Descansos Programados','Calendario, cobertura y cambios'],['Checklist','Materiales, herramientas, unidad, documentos y EPP']
  ].forEach(([name,sub])=>{const card=document.querySelector(`#moduleList [data-module="${name}"]`),p=perm206(name);if(!card||!p?.ver)return;card.disabled=false;card.removeAttribute('disabled');card.classList.remove('disabled','module-disabled');card.classList.add('module-active');card.setAttribute('aria-disabled','false');const sm=card.querySelector('small');if(sm)sm.textContent=sub;const ar=card.querySelector('.module-arrow');if(ar)ar.textContent='›';});}
  function watchCards206(){const list=$206('moduleList');if(!list||list.dataset.v206Watch)return;list.dataset.v206Watch='1';new MutationObserver(()=>setTimeout(activateOperationalCards206,0)).observe(list,{childList:true});activateOperationalCards206();}

  function fillCrew206(sel,crews,label='Todas las cuadrillas'){if(!sel)return;const prev=sel.value;sel.innerHTML=`<option value="">${esc206(label)}</option>`+(crews||[]).map(c=>`<option value="${esc206(c.id)}">${esc206(c.display)}</option>`).join('');if([...sel.options].some(o=>o.value===prev))sel.value=prev;}
  function crewOptions206(crews,selected=''){return(crews||[]).map(c=>`<option value="${esc206(c.id)}" ${c.id===selected?'selected':''}>${esc206(c.display)}</option>`).join('');}
  function chipClass206(v){const s=norm206(v);if(['CONFORME','FINALIZADA','APROBADO','VISTO BUENO','EXCELENTE','VERDE','CERRADO'].includes(s))return'green';if(['CRITICO','OBSERVADA','RECHAZADO','ROJO','MALO','FALTANTE'].includes(s))return'red';if(['PENDIENTE','EN SEGUIMIENTO','REGULAR','AMARILLO','PENDIENTE VALIDACION','PENDIENTE SUPERVISOR','PENDIENTE JEFATURA'].includes(s))return'yellow';return'blue';}
  function modal206(id,title,subtitle,html,saveLabel,onSave){$206(id)?.remove();const o=document.createElement('div');o.id=id;o.className='mvl205-overlay';o.innerHTML=`<section class="mvl205-modal"><header class="mvl205-modal-head"><div><h3>${esc206(title)}</h3><p>${esc206(subtitle||'')}</p></div><button class="mvl205-close" type="button">×</button></header><div class="mvl205-modal-body">${html}<div class="mvl205-message"></div></div><footer class="mvl205-modal-footer"><button class="mvl205-secondary cancel" type="button">Cancelar</button><button class="mvl205-primary save" type="button">${esc206(saveLabel||'Guardar')}</button></footer></section>`;document.body.appendChild(o);const close=()=>o.remove();o.querySelector('.mvl205-close').onclick=close;o.querySelector('.cancel').onclick=close;o.addEventListener('click',e=>{if(e.target===o)close();});o.querySelector('.save').onclick=async()=>{const btn=o.querySelector('.save'),msg=o.querySelector('.mvl205-message');btn.disabled=true;msg.textContent='Guardando…';try{await onSave(o,msg);close();}catch(err){msg.className='mvl205-message error';msg.textContent=err.message||String(err);}finally{btn.disabled=false;}};return o;}
  function filePayload206(file,maxMb=5,types=[]){return new Promise((resolve,reject)=>{if(!file)return resolve(null);if(file.size>maxMb*1024*1024)return reject(new Error(`${file.name}: máximo ${maxMb} MB.`));if(types.length&&!types.includes(file.type))return reject(new Error(`${file.name}: tipo no permitido.`));const r=new FileReader();r.onload=()=>resolve({nombre:file.name,mime:file.type||'application/octet-stream',base64:String(r.result||'').split(',')[1]||''});r.onerror=()=>reject(new Error('No se pudo leer '+file.name));r.readAsDataURL(file);});}
  async function filesObject206(modal,map,maxMb=5){const out={};for(const [id,header] of Object.entries(map)){const f=modal.querySelector('#'+id)?.files?.[0];if(f)out[header]=await filePayload206(f,maxMb,['image/jpeg','image/png','image/webp','application/pdf']);}return out;}
  function links206(list){return(list||[]).filter(Boolean).map((u,i)=>`<a class="mvl206-link" href="${esc206(u)}" target="_blank" rel="noopener">Evidencia ${i+1}</a>`).join(' ');}

  // ========================= ACTIVIDAD EN CAMPO =========================
  const AUDIT_CRITERIA206=[
    ['calidad_conexion','CALIDAD TECNICA','Conectores, instalación y acabado'],['potencia_servicio','CALIDAD TECNICA','Potencia y servicio conforme'],
    ['uso_epp','SEGURIDAD','Uso completo de EPP'],['trabajo_seguro','SEGURIDAD','Trabajo seguro y delimitación'],
    ['trato_cliente','ATENCION AL CLIENTE','Trato y comunicación con cliente'],['explicacion_cliente','ATENCION AL CLIENTE','Explicación y conformidad del servicio'],
    ['orden_cableado','ORDEN Y LIMPIEZA','Orden de cableado/equipos'],['limpieza_final','ORDEN Y LIMPIEZA','Limpieza final de zona de trabajo']
  ];
  function activityView206(){const v=baseView206('fieldActivityViewV206','ACTIVIDAD EN CAMPO','Auditorías, seguimiento, validaciones y capacitación');const a=v.querySelector('.mvl205-actions'),c=v.querySelector('.mvl205-content');if(!c.dataset.ready){c.dataset.ready='1';c.innerHTML=`<div class="mvl205-filters"><label>Periodo<input type="month" id="faPeriod206" value="${period206()}"></label><label>Tipo<select id="faType206"><option value="">Todos</option><option>AUDITORIA EN FRIO</option><option>AUDITORIA EN CALIENTE</option><option>SEGUIMIENTO</option><option>VALIDACION DE OBSERVACION</option><option>CAPACITACION</option><option>CHECKLIST</option></select></label><label>Clasificación<select id="faClass206"><option value="">Todas</option><option>EXCELENTE</option><option>CONFORME</option><option>OBSERVADO</option><option>CRITICO</option></select></label><label>Cuadrilla<select id="faCrew206"><option value="">Todas</option></select></label></div><div class="mvl205-summary" id="faSummary206"></div><div class="mvl205-list" id="faList206"><div class="mvl206-loading">Cargando…</div></div>`;['faPeriod206','faType206','faClass206','faCrew206'].forEach(id=>$206(id).addEventListener('change',loadActivity206));}if(!a.dataset.ready){a.dataset.ready='1';const r=document.createElement('button');r.className='mvl205-secondary';r.textContent='Actualizar';r.onclick=loadActivity206;a.appendChild(r);const n=document.createElement('button');n.id='faNew206';n.className='mvl205-primary';n.textContent='NUEVA ACTIVIDAD';n.onclick=openActivityNew206;a.appendChild(n);}return v;}
  async function loadActivity206(){const list=$206('faList206');if(list)list.innerHTML='<div class="mvl206-loading">Cargando actividad…</div>';try{const res=await api('fieldActivityList',{token:token206(),period:$206('faPeriod206')?.value||period206(),type:$206('faType206')?.value||'',classification:$206('faClass206')?.value||'',crewId:$206('faCrew206')?.value||''});if(!res?.ok)throw new Error(res?.error||'No se pudo cargar.');STATE206.activity=res;fillCrew206($206('faCrew206'),res.crews);$206('faNew206')?.classList.toggle('hidden',!res.canRegister);renderActivity206();}catch(e){list.innerHTML=`<div class="mvl205-empty">${esc206(e.message)}</div>`;}}
  function renderActivity206(){const res=STATE206.activity,s=res.summary||{};$206('faSummary206').innerHTML=`<div><span>Actividades</span><b>${s.total||0}</b></div><div><span>Auditorías</span><b>${s.audits||0}</b></div><div><span>Promedio auditoría</span><b>${s.average==null?'—':s.average+' pts'}</b></div><div><span>Críticas / seguimiento</span><b>${s.critical||0} / ${s.pending||0}</b></div>`;const list=$206('faList206'),rows=res.rows||[];if(!rows.length){list.innerHTML='<div class="mvl205-empty">No hay actividades en el filtro.</div>';return;}list.innerHTML=rows.map(r=>`<article class="mvl205-card"><div class="mvl205-card-head"><div><strong>${esc206(r.crewCode||r.crew)} · ${esc206(r.type)}</strong><small>${esc206(r.date)} ${esc206(r.time||'')} ${r.client?'· '+esc206(r.client):''}</small></div>${r.classification?`<span class="mvl205-chip ${chipClass206(r.classification)}">${esc206(r.classification)}</span>`:''}</div><div class="mvl205-meta">${r.typeOrder?`<span class="mvl205-chip">${esc206(r.typeOrder)}</span>`:''}${r.orderCode?`<span class="mvl205-chip blue">Orden ${esc206(r.orderCode)}</span>`:''}${r.totalScore!=null?`<span class="mvl205-chip ${chipClass206(r.classification)}">${Number(r.totalScore).toFixed(1)} pts</span>`:''}</div>${r.observations?`<p class="mvl205-desc">${esc206(r.observations)}</p>`:''}${r.correctiveActions?`<p class="mvl205-desc"><b>Acciones:</b> ${esc206(r.correctiveActions)}</p>`:''}${links206([r.photo1,r.photo2,r.photo3,r.photo4])}<div class="mvl205-card-actions">${res.canEdit&&r.requiresFollowup==='SI'?`<button data-fa-follow="${esc206(r.id)}">SEGUIMIENTO</button>`:''}</div></article>`).join('');list.querySelectorAll('[data-fa-follow]').forEach(b=>b.onclick=()=>openActivityFollow206(b.dataset.faFollow));}
  function auditRowsHtml206(){return AUDIT_CRITERIA206.map(([id,cat,label])=>`<div class="mvl206-audit-row" data-audit-row data-id="${id}" data-cat="${cat}"><div><strong>${esc206(label)}</strong><small>${esc206(cat)}</small></div><label>Resultado<select class="audit-response"><option>CUMPLE</option><option>NO CUMPLE</option><option>N/A</option></select></label><label>Observación<input class="audit-observation" placeholder="Obligatoria si No cumple"></label></div>`).join('');}
  function openActivityNew206(){const res=STATE206.activity||{},crews=res.crews||[];const html=`<div class="mvl205-form"><label class="full">Cuadrilla<select id="faNCrew206">${crewOptions206(crews,crews.length===1?crews[0].id:'')}</select></label><label>Tipo actividad<select id="faNType206"><option>AUDITORIA EN FRIO</option><option>AUDITORIA EN CALIENTE</option><option>SEGUIMIENTO</option><option>VALIDACION DE OBSERVACION</option><option>CAPACITACION</option><option>CHECKLIST</option></select></label><label>Código orden / cliente<div style="display:flex;gap:5px"><input id="faNOrder206"><button type="button" class="mvl205-secondary" id="faLookup206">Buscar</button></div></label><label>Tipo orden<select id="faNOrderType206"><option>ALTA</option><option>VT</option><option>GARANTÍA</option><option>PEXT</option><option>VTR</option><option>TRASLADO</option></select></label><label>Ticket<input id="faNTicket206"></label><label>Cliente<input id="faNClient206"></label><label>DNI<input id="faNDni206"></label><label class="full">Dirección<input id="faNAddress206"></label><label class="full">Observaciones<textarea id="faNObs206"></textarea></label></div><section class="mvl206-section" id="faAuditSection206"><h4>Criterios de auditoría · 100 puntos</h4>${auditRowsHtml206()}<div class="mvl206-grid3" style="margin-top:8px"><label class="mvl206-check"><input type="checkbox" id="faNFollow206"> Requiere seguimiento</label><label>Fecha compromiso<input type="date" id="faNCommit206"></label><label>Responsable<input id="faNResponsible206"></label></div><label>Acciones correctivas<textarea id="faNActions206"></textarea></label></section><section class="mvl206-section"><h4>Evidencias · máximo 4</h4><div class="mvl206-grid2">${[1,2,3,4].map(i=>`<label>Foto ${i}<input type="file" accept="image/jpeg,image/png,image/webp" id="faPhoto${i}206"></label>`).join('')}</div></section>`;const m=modal206('faModal206','NUEVA ACTIVIDAD EN CAMPO','Los datos del cliente pueden completarse desde Mapa Operativo.',html,'Registrar',async(modal,msg)=>{const type=modal.querySelector('#faNType206').value;let audit=null;if(norm206(type).startsWith('AUDITORIA')){audit={criterios:[...modal.querySelectorAll('[data-audit-row]')].map(row=>({id:row.dataset.id,categoria:row.dataset.cat,respuesta:row.querySelector('.audit-response').value,observacion:row.querySelector('.audit-observation').value}))};}const evid=[];for(let i=1;i<=4;i++){const f=modal.querySelector(`#faPhoto${i}206`).files[0];if(f)evid.push(await filePayload206(f,3,['image/jpeg','image/png','image/webp']));}const r=await api('fieldActivityCreate',{token:token206(),period:$206('faPeriod206')?.value||period206(),crewId:modal.querySelector('#faNCrew206').value,type,orderCode:modal.querySelector('#faNOrder206').value,typeOrder:modal.querySelector('#faNOrderType206').value,ticket:modal.querySelector('#faNTicket206').value,client:modal.querySelector('#faNClient206').value,dni:modal.querySelector('#faNDni206').value,address:modal.querySelector('#faNAddress206').value,observations:modal.querySelector('#faNObs206').value,audit:JSON.stringify(audit||{}),requiresFollowup:modal.querySelector('#faNFollow206')?.checked?'SI':'NO',commitmentDate:modal.querySelector('#faNCommit206')?.value||'',responsible:modal.querySelector('#faNResponsible206')?.value||'',correctiveActions:modal.querySelector('#faNActions206')?.value||'',evidences:JSON.stringify(evid)});if(!r?.ok)throw new Error(r?.error||'No se pudo registrar.');await loadActivity206();});const typeSel=m.querySelector('#faNType206'),auditSec=m.querySelector('#faAuditSection206');const sync=()=>auditSec.classList.toggle('hidden',!norm206(typeSel.value).startsWith('AUDITORIA'));typeSel.onchange=sync;sync();m.querySelector('#faLookup206').onclick=async()=>{const code=m.querySelector('#faNOrder206').value;if(!code)return;const r=await api('fieldActivityLookup',{token:token206(),code});if(r?.ok&&r.found){const x=r.item;m.querySelector('#faNClient206').value=x.client||'';m.querySelector('#faNDni206').value=x.dni||'';m.querySelector('#faNAddress206').value=x.address||'';m.querySelector('#faNOrderType206').value=[...m.querySelector('#faNOrderType206').options].some(o=>o.value===x.typeOrder)?x.typeOrder:m.querySelector('#faNOrderType206').value;}};}
  function openActivityFollow206(id){const r=STATE206.activity?.rows?.find(x=>x.id===id);if(!r)return;modal206('faFollowModal206','SEGUIMIENTO DE ACTIVIDAD',`${r.crewCode} · ${r.type}`,`<div class="mvl205-form"><label>Estado<select id="faFState206"><option>EN SEGUIMIENTO</option><option>CERRADO</option></select></label><label>Fecha compromiso<input type="date" id="faFDate206" value="${esc206(r.commitmentDate||'')}"></label><label class="full">Responsable<input id="faFResp206" value="${esc206(r.responsible||'')}"></label><label class="full">Acciones correctivas<textarea id="faFActions206">${esc206(r.correctiveActions||'')}</textarea></label></div>`,'Actualizar',async modal=>{const x=await api('fieldActivityUpdate',{token:token206(),id,auditState:modal.querySelector('#faFState206').value,commitmentDate:modal.querySelector('#faFDate206').value,responsible:modal.querySelector('#faFResp206').value,correctiveActions:modal.querySelector('#faFActions206').value});if(!x?.ok)throw new Error(x?.error||'No se pudo actualizar.');await loadActivity206();});}
  async function openActivity206(){installStyles206();hideViews206();activityView206().classList.remove('hidden');await loadActivity206();}

  // ========================= CHECKLIST =========================
  const MATERIALS206=['ONT ZTE','ONT HUAWEI','MESH/REPETIDOR ZTE','MESH/REPETIDOR HUAWEI','WINBOX','FONOWIN','CABLE DROP/BOBINA','PRECONECTORIZADO 50m','PRECONECTORIZADO 100m','PRECONECTORIZADO 150m','PRECONECTORIZADO 200m','ANCLAJE P','CINTA BAND-IT','HEBILLA 3/4','ACOPLADOR','ROSETA','CONECTORES OPTICOS','TEMPLADORES','SPLITTER','CLEVIS','CABLE UTP CAT5','CABLE UTP CAT6','PATCHCORD APC-APC','PATCHCORD UPC-APC','CONECTOR RJ45'];
  function checklistView206(){const v=baseView206('checklistViewV206','CHECKLIST','Materiales, herramientas, unidad vehicular, documentación y EPP');const a=v.querySelector('.mvl205-actions'),c=v.querySelector('.mvl205-content');if(!c.dataset.ready){c.dataset.ready='1';c.innerHTML=`<div class="mvl205-filters"><label>Periodo<input type="month" id="chPeriod206" value="${period206()}"></label><label>Tipo<select id="chType206"><option value="">Todos</option><option>MATERIALES</option><option>HERRAMIENTAS</option><option>UNIDAD VEHICULAR</option><option>DOCUMENTACION</option><option>EPP</option></select></label><label>Estado<select id="chState206"><option value="">Todos</option><option>PENDIENTE</option><option>VISTO BUENO</option><option>OBSERVADO</option><option>CONFORME</option></select></label><label>Cuadrilla<select id="chCrew206"><option value="">Todas</option></select></label></div><div class="mvl205-summary" id="chSummary206"></div><div class="mvl205-list" id="chList206"></div>`;['chPeriod206','chType206','chState206','chCrew206'].forEach(id=>$206(id).onchange=loadChecklist206);}if(!a.dataset.ready){a.dataset.ready='1';const r=document.createElement('button');r.className='mvl205-secondary';r.textContent='Actualizar';r.onclick=loadChecklist206;a.appendChild(r);const n=document.createElement('button');n.id='chNew206';n.className='mvl205-primary';n.textContent='NUEVO CHECKLIST';n.onclick=openChecklistNew206;a.appendChild(n);}return v;}
  async function loadChecklist206(){const list=$206('chList206');list.innerHTML='<div class="mvl206-loading">Cargando checklist…</div>';try{const r=await api('checklistList',{token:token206(),period:$206('chPeriod206')?.value||period206(),type:$206('chType206')?.value||'',state:$206('chState206')?.value||'',crewId:$206('chCrew206')?.value||''});if(!r?.ok)throw new Error(r?.error||'No se pudo cargar.');STATE206.checklist=r;fillCrew206($206('chCrew206'),r.crews);$206('chNew206').classList.toggle('hidden',!r.canRegister);renderChecklist206();}catch(e){list.innerHTML=`<div class="mvl205-empty">${esc206(e.message)}</div>`;}}
  function renderChecklist206(){const r=STATE206.checklist,s=r.summary||{};$206('chSummary206').innerHTML=`<div><span>Total</span><b>${s.total||0}</b></div><div><span>Pendientes</span><b>${s.pending||0}</b></div><div><span>Observados</span><b>${s.observed||0}</b></div><div><span>Conformes</span><b>${s.conform||0}</b></div>`;const list=$206('chList206');if(!r.rows?.length){list.innerHTML='<div class="mvl205-empty">No hay checklist para el filtro.</div>';return;}list.innerHTML=r.rows.map(x=>`<article class="mvl205-card"><div class="mvl205-card-head"><div><strong>${esc206(x.crewCode||x.crew)} · ${esc206(x.type)}</strong><small>${esc206(x.date)} · ${esc206(x.user)}</small></div><span class="mvl205-chip ${chipClass206(x.state)}">${esc206(x.state||'PENDIENTE')}</span></div><div class="mvl205-meta">${x.toolsResult?`<span class="mvl205-chip">Herr.: ${esc206(x.toolsResult)}</span>`:''}${x.unitResult?`<span class="mvl205-chip">Unidad: ${esc206(x.unitResult)}</span>`:''}${x.docResult?`<span class="mvl205-chip">Docs: ${esc206(x.docResult)}</span>`:''}${x.eppResult?`<span class="mvl205-chip">EPP: ${esc206(x.eppResult)}</span>`:''}</div>${x.comment?`<p class="mvl205-desc">${esc206(x.comment)}</p>`:''}<div class="mvl205-card-actions">${(r.canEdit||r.canValidate)?`<button data-ch-val="${esc206(x.id)}">VALIDAR</button>`:''}</div></article>`).join('');list.querySelectorAll('[data-ch-val]').forEach(b=>b.onclick=()=>openChecklistValidate206(b.dataset.chVal));}
  function checklistDynamic206(type){const t=norm206(type);if(t==='MATERIALES')return`<section class="mvl206-section"><h4>Cantidades de materiales</h4><div class="mvl206-grid3">${MATERIALS206.map((h,i)=>`<label>${esc206(h)}<input type="number" min="0" step="1" data-material="${esc206(h)}" value="0"></label>`).join('')}</div></section><section class="mvl206-section"><h4>Fotos de series / equipos</h4><div class="mvl206-grid2"><label>ONT ZTE<input type="file" id="chFZte206" accept="image/*"></label><label>ONT HUAWEI<input type="file" id="chFHuawei206" accept="image/*"></label><label>MESH ZTE<input type="file" id="chFMeshZte206" accept="image/*"></label><label>MESH HUAWEI<input type="file" id="chFMeshHuawei206" accept="image/*"></label><label>WINBOX<input type="file" id="chFWinbox206" accept="image/*"></label><label>FONOWIN<input type="file" id="chFFonowin206" accept="image/*"></label></div></section>`;if(t==='HERRAMIENTAS')return`<section class="mvl206-section"><h4>Herramientas</h4><div id="chTools206"></div><button type="button" class="mvl205-secondary" id="chAddTool206">+ Agregar herramienta</button><p class="mvl206-file-note">BUENO: cantidad. REGULAR: cantidad + motivo. MALO: cantidad + motivo + foto.</p></section>`;if(t==='UNIDAD VEHICULAR')return`<section class="mvl206-section"><h4>Unidad vehicular</h4><label>Resultado<select id="chResult206"><option>CONFORME</option><option>OBSERVADO</option></select></label><div class="mvl206-grid3">${[['chUFront206','Frente'],['chUBack206','Posterior'],['chULeft206','Lado izquierdo'],['chURight206','Lado derecho'],['chUExt206','Extintor'],['chUBot206','Botiquín'],['chUReja206','Reja separadora'],['chUPar1_206','Parrilla 1'],['chUPar2_206','Parrilla 2']].map(x=>`<label>${x[1]}<input type="file" id="${x[0]}" accept="image/*"></label>`).join('')}</div></section>`;if(t==='DOCUMENTACION')return`<section class="mvl206-section"><h4>Documentación</h4><label>Resultado<select id="chResult206"><option>CONFORME</option><option>OBSERVADO</option></select></label><div class="mvl206-grid3"><label>Venc. Licencia<input type="date" id="chLicExp206"></label><label>Venc. SOAT<input type="date" id="chSoatExp206"></label><label>Venc. Revisión técnica<input type="date" id="chRevExp206"></label></div><div class="mvl206-grid2"><label>Licencia frente<input type="file" id="chLicF206" accept="image/*"></label><label>Licencia reverso<input type="file" id="chLicB206" accept="image/*"></label><label>SOAT<input type="file" id="chSoatF206" accept="image/*,application/pdf"></label><label>Revisión técnica<input type="file" id="chRevF206" accept="image/*,application/pdf"></label></div></section>`;return`<section class="mvl206-section"><h4>EPP</h4><label>Resultado<select id="chResult206"><option>CONFORME</option><option>OBSERVADO</option></select></label><div class="mvl206-grid3"><label>Personal completo<input type="file" id="chEppFull206" accept="image/*"></label><label>Botas<input type="file" id="chEppBoots206" accept="image/*"></label><label>Fotocheck<input type="file" id="chEppId206" accept="image/*"></label></div></section>`;}
  function addToolRow206(container,catalog=[]){const d=document.createElement('div');d.className='mvl206-tool-row';d.innerHTML=`<label>Herramienta<input class="tool-name" list="chToolCatalog206"></label><label>Cant.<input class="tool-qty" type="number" min="1" value="1"></label><label>Estado<select class="tool-state"><option>BUENO</option><option>REGULAR</option><option>MALO</option></select></label><label>Serie<input class="tool-serial"></label><label>Motivo<input class="tool-reason"></label><label>Foto si MALO<input class="tool-photo" type="file" accept="image/*"></label>`;container.appendChild(d);}
  function openChecklistNew206(){const r=STATE206.checklist||{},crews=r.crews||[];const html=`<div class="mvl205-form"><label class="full">Cuadrilla<select id="chNCrew206">${crewOptions206(crews,crews.length===1?crews[0].id:'')}</select></label><label>Fecha<input type="date" id="chNDate206" value="${new Date().toISOString().slice(0,10)}"></label><label>Tipo<select id="chNType206"><option>MATERIALES</option><option>HERRAMIENTAS</option><option>UNIDAD VEHICULAR</option><option>DOCUMENTACION</option><option>EPP</option></select></label><label class="full">Comentario<textarea id="chNComment206"></textarea></label></div><datalist id="chToolCatalog206">${(r.toolsCatalog||[]).map(x=>`<option value="${esc206(x.name)}"></option>`).join('')}</datalist><div id="chDynamic206"></div>`;const m=modal206('chModal206','NUEVO CHECKLIST','No se permite duplicar el mismo tipo, cuadrilla y fecha.',html,'Registrar',async modal=>{const type=modal.querySelector('#chNType206').value;const payload={token:token206(),period:$206('chPeriod206')?.value||period206(),crewId:modal.querySelector('#chNCrew206').value,date:modal.querySelector('#chNDate206').value,type,comment:modal.querySelector('#chNComment206').value};if(norm206(type)==='MATERIALES'){const materials={};modal.querySelectorAll('[data-material]').forEach(i=>materials[i.dataset.material]=Number(i.value||0));payload.materials=JSON.stringify(materials);payload.files=JSON.stringify(await filesObject206(modal,{chFZte206:'FOTOS SERIES ONT ZTE',chFHuawei206:'FOTOS SERIES ONT HUAWEI',chFMeshZte206:'FOTO MESH/REPETIDOR ZTE',chFMeshHuawei206:'FOTO MESH/REPETIDOR HUAWEI',chFWinbox206:'FOTO WINBOX',chFFonowin206:'FOTO FONOWIN'},5));}else if(norm206(type)==='HERRAMIENTAS'){const tools=[];for(const row of modal.querySelectorAll('.mvl206-tool-row')){const photo=await filePayload206(row.querySelector('.tool-photo').files[0],3,['image/jpeg','image/png','image/webp']);tools.push({name:row.querySelector('.tool-name').value,quantity:row.querySelector('.tool-qty').value,state:row.querySelector('.tool-state').value,serial:row.querySelector('.tool-serial').value,reason:row.querySelector('.tool-reason').value,photo});}payload.tools=JSON.stringify(tools);}else if(norm206(type)==='UNIDAD VEHICULAR'){payload.result=modal.querySelector('#chResult206').value;payload.files=JSON.stringify(await filesObject206(modal,{chUFront206:'FOTO_UNIDAD_FRENTE',chUBack206:'FOTO_UNIDAD_POSTERIOR',chULeft206:'FOTO_UNIDAD_LADO_IZQUIERDO',chURight206:'FOTO_UNIDAD_LADO_DERECHO',chUExt206:'FOTO_EXTINTOR',chUBot206:'FOTO_BOTIQUIN',chUReja206:'FOTO_REJA_SEPARADORA',chUPar1_206:'FOTO_PARRILLA_1',chUPar2_206:'FOTO_PARRILLA_2'},5));}else if(norm206(type)==='DOCUMENTACION'){payload.result=modal.querySelector('#chResult206').value;payload.licenseExpiry=modal.querySelector('#chLicExp206').value;payload.soatExpiry=modal.querySelector('#chSoatExp206').value;payload.reviewExpiry=modal.querySelector('#chRevExp206').value;payload.files=JSON.stringify(await filesObject206(modal,{chLicF206:'LICENCIA_FOTO_FRENTE',chLicB206:'LICENCIA_FOTO_REVERSO',chSoatF206:'SOAT_ARCHIVO',chRevF206:'REVISION_TECNICA_ARCHIVO'},5));}else{payload.result=modal.querySelector('#chResult206').value;payload.files=JSON.stringify(await filesObject206(modal,{chEppFull206:'FOTO_PERSONAL_COMPLETO',chEppBoots206:'FOTO_BOTAS',chEppId206:'FOTO_FOTOCHECK'},5));}const x=await api('checklistCreate',payload);if(!x?.ok)throw new Error(x?.error||'No se pudo registrar.');await loadChecklist206();});const type=m.querySelector('#chNType206'),dyn=m.querySelector('#chDynamic206');const redraw=()=>{dyn.innerHTML=checklistDynamic206(type.value);if(norm206(type.value)==='HERRAMIENTAS'){const cont=m.querySelector('#chTools206');addToolRow206(cont);m.querySelector('#chAddTool206').onclick=()=>addToolRow206(cont);}};type.onchange=redraw;redraw();}
  function openChecklistValidate206(id){const row=STATE206.checklist?.rows?.find(x=>x.id===id);if(!row)return;modal206('chValModal206','VALIDAR CHECKLIST',`${row.crewCode} · ${row.type}`,`<div class="mvl205-form"><label>Resultado<select id="chVResult206"><option>CONFORME</option><option>OBSERVADO</option><option>VISTO BUENO</option></select></label><label class="full">Motivo / comentario<textarea id="chVReason206"></textarea></label></div>`,'Guardar',async m=>{const x=await api('checklistValidate',{token:token206(),id,result:m.querySelector('#chVResult206').value,reason:m.querySelector('#chVReason206').value});if(!x?.ok)throw new Error(x?.error||'No se pudo validar.');await loadChecklist206();});}
  async function openChecklist206(){installStyles206();hideViews206();checklistView206().classList.remove('hidden');await loadChecklist206();}

  // ========================= ACTAS =========================
  function actsView206(){const v=baseView206('actsViewV206','GESTIÓN DE ACTAS','PDF, revisión, corrección, entrega física y cargos');const a=v.querySelector('.mvl205-actions'),c=v.querySelector('.mvl205-content');if(!c.dataset.ready){c.dataset.ready='1';c.innerHTML=`<div class="mvl205-filters"><label>Periodo<input type="month" id="acPeriod206" value="${period206()}"></label><label>Estado<select id="acState206"><option value="">Todos</option><option>PENDIENTE</option><option>PENDIENTE VALIDACION</option><option>OBSERVADA</option><option>FINALIZADA</option><option>FALTANTE</option></select></label><label>Cuadrilla<select id="acCrew206"><option value="">Todas</option></select></label><label>Buscar<input id="acSearch206" placeholder="Orden, pedido, acta, cliente"></label></div><div class="mvl205-summary" id="acSummary206"></div><div class="mvl205-list" id="acList206"></div>`;['acPeriod206','acState206','acCrew206'].forEach(id=>$206(id).onchange=loadActs206);$206('acSearch206').oninput=renderActs206;}if(!a.dataset.ready){a.dataset.ready='1';const r=document.createElement('button');r.className='mvl205-secondary';r.textContent='Actualizar';r.onclick=loadActs206;a.appendChild(r);const cargo=document.createElement('button');cargo.id='acCargo206';cargo.className='mvl205-secondary hidden';cargo.textContent='GENERAR CARGO';cargo.onclick=createCargo206;a.appendChild(cargo);const n=document.createElement('button');n.id='acNew206';n.className='mvl205-primary';n.textContent='NUEVA ACTA';n.onclick=openActNew206;a.appendChild(n);}return v;}
  async function loadActs206(){const list=$206('acList206');list.innerHTML='<div class="mvl206-loading">Cargando actas…</div>';try{const r=await api('actsList',{token:token206(),period:$206('acPeriod206')?.value||period206(),state:$206('acState206')?.value||'',crewId:$206('acCrew206')?.value||''});if(!r?.ok)throw new Error(r?.error||'No se pudo cargar.');STATE206.acts=r;fillCrew206($206('acCrew206'),r.crews);$206('acNew206').classList.toggle('hidden',!r.canRegister);$206('acCargo206').classList.toggle('hidden',!(r.canEdit||r.canValidate));renderActs206();}catch(e){list.innerHTML=`<div class="mvl205-empty">${esc206(e.message)}</div>`;}}
  function renderActs206(){const r=STATE206.acts,s=r.summary||{};$206('acSummary206').innerHTML=`<div><span>Total</span><b>${s.total||0}</b></div><div><span>Pendientes</span><b>${s.pending||0}</b></div><div><span>Observadas</span><b>${s.observed||0}</b></div><div><span>Finalizadas / Faltantes</span><b>${s.finalized||0} / ${s.missing||0}</b></div>`;const q=norm206($206('acSearch206')?.value||''),rows=(r.rows||[]).filter(x=>!q||norm206([x.orderCode,x.requestCode,x.actNumber,x.client,x.crewCode].join(' ')).includes(q)),list=$206('acList206');if(!rows.length){list.innerHTML='<div class="mvl205-empty">No hay actas para el filtro.</div>';return;}const profile=norm206(r.profile),high=['JEFATURA DE CALIDAD','JEFATURA DE OPERACIONES','ADMINISTRADOR'].includes(profile);list.innerHTML=rows.map(x=>`<article class="mvl205-card"><div class="mvl205-card-head"><div class="mvl206-cargo">${(r.canEdit||r.canValidate)&&norm206(x.state)==='FINALIZADA'?`<input type="checkbox" data-cargo-id="${esc206(x.id)}">`:''}<div><strong>${esc206(x.crewCode||x.crew)} · Acta ${esc206(x.actNumber||'—')}</strong><small>${esc206(x.date)} · Pedido ${esc206(x.requestCode||'—')} · Orden ${esc206(x.orderCode||'—')}</small></div></div><span class="mvl205-chip ${chipClass206(x.state)}">${esc206(x.state)}</span></div><div class="mvl206-kv"><div><span>Cliente</span><b>${esc206(x.client||'—')}</b></div><div><span>Partida</span><b>${esc206(x.partida||x.executionType||'—')}</b></div><div><span>Versión</span><b>${x.version}</b></div><div><span>Entrega física</span><b>${esc206(x.physicalState||'PENDIENTE')}</b></div></div>${x.link?`<a class="mvl206-link" href="${esc206(x.link)}" target="_blank">Ver PDF</a>`:''}${x.managementReason||x.firstReason?`<p class="mvl205-desc"><b>Observación:</b> ${esc206(x.managementReason||x.firstReason)}</p>`:''}<div class="mvl205-card-actions">${norm206(x.state)==='OBSERVADA'?`<button data-ac-replace="${esc206(x.id)}">REEMPLAZAR PDF</button>`:''}${(r.canEdit||r.canValidate)&&!['FINALIZADA','FALTANTE'].includes(norm206(x.state))?`<button data-ac-review="${esc206(x.id)}">REVISAR</button>`:''}${(r.canEdit||r.canValidate)&&norm206(x.state)==='FINALIZADA'?`<button data-ac-physical="${esc206(x.id)}">ENTREGA FÍSICA</button>`:''}</div></article>`).join('');list.querySelectorAll('[data-ac-replace]').forEach(b=>b.onclick=()=>openActReplace206(b.dataset.acReplace));list.querySelectorAll('[data-ac-review]').forEach(b=>b.onclick=()=>openActReview206(b.dataset.acReview,high));list.querySelectorAll('[data-ac-physical]').forEach(b=>b.onclick=()=>openActPhysical206(b.dataset.acPhysical));}
  function openActNew206(){const r=STATE206.acts||{},crews=r.crews||[];const canMissing=r.canEdit||r.canValidate;const html=`<div class="mvl205-form"><label class="full">Cuadrilla<select id="acNCrew206">${crewOptions206(crews,crews.length===1?crews[0].id:'')}</select></label><label>Código de orden<div style="display:flex;gap:5px"><input id="acNOrder206"><button type="button" class="mvl205-secondary" id="acLookup206">Buscar</button></div></label><label>Código de pedido<input id="acNRequest206"></label><label>Número de acta<input id="acNNumber206"></label><label>Fecha gestión<input type="date" id="acNDate206" value="${new Date().toISOString().slice(0,10)}"></label><label>Tipo ejecución<input id="acNExecution206"></label><label>Partida<input id="acNPartida206"></label><label>Cliente<input id="acNClient206"></label><label>DNI<input id="acNDni206"></label><label class="full">PDF del acta<input type="file" id="acNPdf206" accept="application/pdf"></label>${canMissing?`<label class="full mvl206-check"><input type="checkbox" id="acNMissing206"> Registrar como ACTA FALTANTE (sin PDF)</label><label class="full">Motivo faltante<textarea id="acNMissingReason206"></textarea></label>`:''}</div>`;const m=modal206('acModal206','NUEVA ACTA','El cliente y partida se consultan desde Mapa Operativo / Producción.',html,'Guardar',async modal=>{const missing=modal.querySelector('#acNMissing206')?.checked;const f=modal.querySelector('#acNPdf206').files[0];const file=missing?null:await filePayload206(f,10,['application/pdf']);const x=await api('actsCreate',{token:token206(),period:$206('acPeriod206')?.value||period206(),crewId:modal.querySelector('#acNCrew206').value,orderCode:modal.querySelector('#acNOrder206').value,requestCode:modal.querySelector('#acNRequest206').value,actNumber:modal.querySelector('#acNNumber206').value,date:modal.querySelector('#acNDate206').value,executionType:modal.querySelector('#acNExecution206').value,partida:modal.querySelector('#acNPartida206').value,client:modal.querySelector('#acNClient206').value,dni:modal.querySelector('#acNDni206').value,file:JSON.stringify(file),missing:missing?'SI':'NO',missingReason:modal.querySelector('#acNMissingReason206')?.value||''});if(!x?.ok)throw new Error(x?.error||'No se pudo guardar.');await loadActs206();});m.querySelector('#acLookup206').onclick=async()=>{const code=m.querySelector('#acNOrder206').value;if(!code)return;const x=await api('actsLookup',{token:token206(),code});if(x?.ok&&x.found){const z=x.item;m.querySelector('#acNClient206').value=z.client||'';m.querySelector('#acNDni206').value=z.dni||'';m.querySelector('#acNExecution206').value=z.typeAtencion||z.typeOrder||'';m.querySelector('#acNPartida206').value=z.typePartida||'';}};}
  function openActReplace206(id){modal206('acReplaceModal206','REEMPLAZAR PDF','El acta observada volverá a estado Pendiente.',`<div class="mvl205-form"><label class="full">Nuevo PDF<input type="file" id="acRPdf206" accept="application/pdf"></label></div>`,'Reemplazar',async m=>{const file=await filePayload206(m.querySelector('#acRPdf206').files[0],10,['application/pdf']);const x=await api('actsReplacePdf',{token:token206(),id,file:JSON.stringify(file)});if(!x?.ok)throw new Error(x?.error||'No se pudo reemplazar.');await loadActs206();});}
  function openActReview206(id,high){modal206('acReviewModal206','REVISAR ACTA',high?'Validación final de Jefatura/Admin.':'Revisión operativa.',`<div class="mvl205-form"><label>Resultado<select id="acRResult206">${high?'<option>APROBAR</option>':'<option>VISTO BUENO</option>'}<option>OBSERVAR</option></select></label><label class="full">Motivo / comentario<textarea id="acRReason206"></textarea></label></div>`,'Guardar',async m=>{const x=await api('actsReview',{token:token206(),id,result:m.querySelector('#acRResult206').value,reason:m.querySelector('#acRReason206').value});if(!x?.ok)throw new Error(x?.error||'No se pudo revisar.');await loadActs206();});}
  function openActPhysical206(id){const row=STATE206.acts?.rows?.find(x=>x.id===id);modal206('acPhysicalModal206','ENTREGA FÍSICA','Confirmación del acta física.',`<div class="mvl205-form"><label>Estado<select id="acPState206"><option ${row?.physicalState==='ENTREGADA'?'selected':''}>ENTREGADA</option><option ${row?.physicalState!=='ENTREGADA'?'selected':''}>PENDIENTE</option></select></label><label class="full">Motivo si se revierte<textarea id="acPReason206"></textarea></label></div>`,'Guardar',async m=>{const x=await api('actsPhysicalDelivery',{token:token206(),id,state:m.querySelector('#acPState206').value,reason:m.querySelector('#acPReason206').value});if(!x?.ok)throw new Error(x?.error||'No se pudo actualizar.');await loadActs206();});}
  async function createCargo206(){const ids=[...document.querySelectorAll('[data-cargo-id]:checked')].map(x=>x.dataset.cargoId);if(!ids.length){alert('Seleccione al menos un acta FINALIZADA.');return;}try{showLoader?.('Generando cargo…');const x=await api('actsCargoCreate',{token:token206(),ids:JSON.stringify(ids)});if(!x?.ok)throw new Error(x?.error||'No se pudo generar.');if(x.link)window.open(x.link,'_blank');await loadActs206();}catch(e){alert(e.message);}finally{hideLoader?.();}}
  async function openActs206(){installStyles206();hideViews206();actsView206().classList.remove('hidden');await loadActs206();}

  // ========================= DESCANSOS =========================
  function restsView206(){const v=baseView206('restsViewV206','DESCANSOS PROGRAMADOS','Calendario mensual, cobertura y solicitudes de cambio');const a=v.querySelector('.mvl205-actions'),c=v.querySelector('.mvl205-content');if(!c.dataset.ready){c.dataset.ready='1';c.innerHTML=`<div class="mvl205-filters"><label>Periodo<input type="month" id="rePeriod206" value="${period206()}"></label><label>Cuadrilla<select id="reCrew206"><option value="">Todas</option></select></label></div><div class="mvl205-summary" id="reSummary206"></div><div id="reCalendar206" class="mvl206-calendar"></div><h3 style="font-size:.85rem;color:#0a3b70;margin-top:16px">Programación y solicitudes</h3><div class="mvl205-list" id="reList206"></div>`;['rePeriod206','reCrew206'].forEach(id=>$206(id).onchange=loadRests206);}if(!a.dataset.ready){a.dataset.ready='1';const r=document.createElement('button');r.className='mvl205-secondary';r.textContent='Actualizar';r.onclick=loadRests206;a.appendChild(r);const n=document.createElement('button');n.id='reNew206';n.className='mvl205-primary';n.textContent='PROGRAMAR DESCANSO';n.onclick=openRestSchedule206;a.appendChild(n);}return v;}
  async function loadRests206(){const list=$206('reList206');list.innerHTML='<div class="mvl206-loading">Cargando descansos…</div>';try{const r=await api('restsList',{token:token206(),period:$206('rePeriod206')?.value||period206(),crewId:$206('reCrew206')?.value||''});if(!r?.ok)throw new Error(r?.error||'No se pudo cargar.');STATE206.rests=r;fillCrew206($206('reCrew206'),r.crews);$206('reNew206').classList.toggle('hidden',!r.canSchedule);renderRests206();}catch(e){list.innerHTML=`<div class="mvl205-empty">${esc206(e.message)}</div>`;}}
  function renderRestCalendar206(rows,period){const [y,m]=period.split('-').map(Number),days=new Date(y,m,0).getDate(),by={};rows.forEach(r=>{if(norm206(r.programState)==='APROBADO')by[r.date]=r;});$206('reCalendar206').innerHTML=Array.from({length:days},(_,i)=>{const d=String(i+1).padStart(2,'0'),iso=`${period}-${d}`,r=by[iso],cls=r?(norm206(r.dayState)==='VACACIONES'?'vac':'rest'):'';return`<div class="mvl206-day ${cls}"><b>${i+1}</b>${r?`<span>${esc206(r.crewCode)}<br>${esc206(r.dayState)}</span>`:'<span>En campo</span>'}</div>`;}).join('');}
  function renderRests206(){const r=STATE206.rests,s=r.summary||{};$206('reSummary206').innerHTML=`<div><span>Descansos</span><b>${s.total||0}</b></div><div><span>Vacaciones</span><b>${s.vacations||0}</b></div><div><span>Cambios pendientes</span><b>${s.pendingChanges||0}</b></div><div><span>Cobertura mínima</span><b>${r.coverageMin||80}%</b></div>`;renderRestCalendar206(r.rows||[],$206('rePeriod206')?.value||period206());const list=$206('reList206');if(!r.rows?.length){list.innerHTML='<div class="mvl205-empty">No hay programación en este periodo.</div>';return;}list.innerHTML=r.rows.map(x=>`<article class="mvl205-card"><div class="mvl205-card-head"><div><strong>${esc206(x.date)} · ${esc206(x.crewCode||x.crew)}</strong><small>${esc206(x.platform)} · ${esc206(x.dayState)} · ${esc206(x.recordType)}</small></div><span class="mvl205-chip ${chipClass206(x.validationState||x.programState)}">${esc206(x.validationState||x.programState)}</span></div><div class="mvl205-meta"><span class="mvl205-chip ${chipClass206(x.coverageState)}">Cobertura ${Math.round(Number(x.coverage||0)*100)}%</span>${x.changeDate?`<span class="mvl205-chip blue">Cambio → ${esc206(x.changeDate)}</span>`:''}</div>${x.changeReason?`<p class="mvl205-desc"><b>Solicitud:</b> ${esc206(x.changeReason)}</p>`:''}<div class="mvl205-card-actions">${r.canRequest&&norm206(x.programState)==='APROBADO'&&norm206(x.dayState)==='DESCANSO'&&!x.changeDate?`<button data-re-request="${esc206(x.id)}">SOLICITAR CAMBIO</button>`:''}${r.canEdit&&norm206(x.validationState)==='PENDIENTE SUPERVISOR'?`<button data-re-sup="${esc206(x.id)}">REVISAR SUPERVISOR</button>`:''}${r.canManage&&x.changeDate&&!['APROBADO','RECHAZADO'].includes(norm206(x.validationState))?`<button data-re-mgmt="${esc206(x.id)}">VALIDAR JEFATURA</button>`:''}</div></article>`).join('');list.querySelectorAll('[data-re-request]').forEach(b=>b.onclick=()=>openRestRequest206(b.dataset.reRequest));list.querySelectorAll('[data-re-sup]').forEach(b=>b.onclick=()=>openRestSupervisor206(b.dataset.reSup));list.querySelectorAll('[data-re-mgmt]').forEach(b=>b.onclick=()=>openRestManagement206(b.dataset.reMgmt));}
  function openRestSchedule206(){const r=STATE206.rests||{},crews=r.crews||[];modal206('reScheduleModal206','PROGRAMAR DESCANSO','La APP valida automáticamente la cobertura de la plataforma.',`<div class="mvl205-form"><label class="full">Cuadrilla<select id="reSCrew206">${crewOptions206(crews)}</select></label><label>Fecha<input type="date" id="reSDate206"></label><label>Estado día<select id="reSState206"><option>DESCANSO</option><option>VACACIONES</option></select></label><label class="full">Comentario<textarea id="reSComment206"></textarea></label></div>`,'Programar',async m=>{const x=await api('restsSchedule',{token:token206(),crewId:m.querySelector('#reSCrew206').value,date:m.querySelector('#reSDate206').value,dayState:m.querySelector('#reSState206').value,comment:m.querySelector('#reSComment206').value});if(!x?.ok)throw new Error(x?.error||'No se pudo programar.');await loadRests206();});}
  function openRestRequest206(id){modal206('reReqModal206','SOLICITAR CAMBIO DE DESCANSO','La nueva fecha será validada por Supervisor y Jefatura.',`<div class="mvl205-form"><label>Nueva fecha<input type="date" id="reRDate206"></label><label class="full">Motivo<textarea id="reRReason206"></textarea></label></div>`,'Enviar solicitud',async m=>{const x=await api('restsRequestChange',{token:token206(),id,newDate:m.querySelector('#reRDate206').value,reason:m.querySelector('#reRReason206').value});if(!x?.ok)throw new Error(x?.error||'No se pudo solicitar.');await loadRests206();});}
  function openRestSupervisor206(id){modal206('reSupModal206','REVISIÓN DE SUPERVISOR','Cambio de descanso solicitado.',`<div class="mvl205-form"><label>Resultado<select id="reSupResult206"><option>APROBAR</option><option>RECHAZAR</option></select></label><label class="full">Comentario<textarea id="reSupReason206"></textarea></label></div>`,'Guardar',async m=>{const x=await api('restsReviewSupervisor',{token:token206(),id,result:m.querySelector('#reSupResult206').value,reason:m.querySelector('#reSupReason206').value});if(!x?.ok)throw new Error(x?.error||'No se pudo revisar.');await loadRests206();});}
  function openRestManagement206(id){modal206('reMgmtModal206','VALIDACIÓN DE JEFATURA','La aprobación mueve el descanso conservando el historial.',`<div class="mvl205-form"><label>Resultado<select id="reMResult206"><option>APROBAR</option><option>RECHAZAR</option></select></label><label class="full">Comentario<textarea id="reMReason206"></textarea></label></div>`,'Guardar',async m=>{const x=await api('restsReviewManagement',{token:token206(),id,result:m.querySelector('#reMResult206').value,reason:m.querySelector('#reMReason206').value});if(!x?.ok)throw new Error(x?.error||'No se pudo validar.');await loadRests206();});}
  async function openRests206(){installStyles206();hideViews206();restsView206().classList.remove('hidden');await loadRests206();}

  // ========================= INTEGRACIÓN HOME =========================
  document.addEventListener('click',e=>{const card=e.target?.closest?.('#moduleList [data-module]');if(!card)return;const name=card.dataset.module;if(name==='Actividad en Campo'){e.preventDefault();e.stopImmediatePropagation();openActivity206();}else if(name==='Checklist'){e.preventDefault();e.stopImmediatePropagation();openChecklist206();}else if(name==='Gestión de Actas'){e.preventDefault();e.stopImmediatePropagation();openActs206();}else if(name==='Descansos Programados'){e.preventDefault();e.stopImmediatePropagation();openRests206();}},true);

  function wrapHome206(){if(window.__mvlHome206||typeof renderHome!=='function')return false;window.__mvlHome206=true;const prev=renderHome;renderHome=function(data){const x=prev(data);setTimeout(()=>{activateOperationalCards206();watchCards206();},0);return x;};return true;}
  function init206(){installStyles206();wrapHome206();watchCards206();activateOperationalCards206();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init206,250),{once:true});else setTimeout(init206,250);
  const timer=setInterval(()=>{wrapHome206();activateOperationalCards206();if($206('moduleList')&&session206())clearInterval(timer);},350);setTimeout(()=>clearInterval(timer),10000);
  console.info('[MI VISUAL LIMA] V2.06: módulos operativos implementados.');
})();

/* ==========================================================
   MI VISUAL LIMA - V2.07
   RESUMEN GENERAL LINEAL + 4 NIVELES DE COLOR
   ========================================================== */
(() => {
  const V207 = { wrapped:false, dashboardAll:null, dashboardLatest:null, rendering:false };
  const $207 = id => document.getElementById(id);
  const norm207 = v => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
  const esc207 = v => String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const num207 = (v,f=0) => Number.isFinite(Number(v)) ? Number(v) : f;
  const pct207 = (v,d=1) => Number.isFinite(Number(v)) ? `${(Number(v)*100).toFixed(d)}%` : '—';

  function rowMatches207(row){
    const visual=norm207($207('dashboardVisualTypeV19')?.value||'');
    const platform=norm207($207('dashboardPlatformV19')?.value||'');
    const composition=norm207($207('dashboardCompositionV19')?.value||'');
    const state=norm207($207('dashboardStateV19')?.value||'');
    const supervisor=String($207('dashboardSupervisor')?.value||'');
    const crew=String($207('dashboardCrew')?.value||'');
    if(visual && norm207(row.visualType)!==visual) return false;
    if(platform && norm207(row.platform)!==platform) return false;
    if(composition){
      const c=norm207(row.composition)==='INDIVIDUAL'?'SOLO':norm207(row.composition);
      if(c!==composition) return false;
    }
    if(state){
      const rs=norm207(row.state);
      if(rs!==state && !(state==='ACTIVO'&&rs==='ACTIVA')) return false;
    }
    if(supervisor){
      if(supervisor==='__GG__'){
        if(!(String(row.supervisorId||'')==='__GG__'||norm207(row.supervisor)==='GG')) return false;
      } else if(String(row.supervisorId||'')!==supervisor) return false;
    }
    if(crew && String(row.crewId||'')!==crew) return false;
    return true;
  }

  function summary207(data){
    const rows=(data?.rows||[]).filter(rowMatches207);
    const withData=rows.filter(r=>r.hasData || num207(r.finalized)>0 || num207(r.points)>0);
    const points=rows.reduce((a,r)=>a+num207(r.points),0);
    const finalized=rows.reduce((a,r)=>a+num207(r.finalized),0);
    const total=rows.reduce((a,r)=>a+num207(r.totalGeneral ?? r.total ?? r.ordersTotal),0);
    const los=rows.reduce((a,r)=>a+num207(r.losRojo),0);
    const rec=rows.reduce((a,r)=>a+num207(r.recables),0);
    const target=rows.reduce((a,r)=>a+num207(r.productionTargetToDate),0);
    const monthTarget=rows.reduce((a,r)=>a+num207(r.productionMonthlyTarget),0);
    const slaEval=rows.reduce((a,r)=>a+num207(r.slaEvaluables),0);
    const slaOk=rows.reduce((a,r)=>a+num207(r.slaCumplen),0);
    const obs=rows.reduce((a,r)=>a+num207(r.observationsCount),0);
    const obsActive=rows.reduce((a,r)=>a+num207(r.observationsActive),0);
    const obsImpact=rows.reduce((a,r)=>a+num207(r.observationsImpact),0);
    return {
      rows, withData, points, finalized,
      effectiveness: total>0?finalized/total:null,
      los, recables:rec, recable:los>0?rec/los:null,
      target, monthTarget,
      productionRatio:target>0?points/target:null,
      monthProgress:monthTarget>0?points/monthTarget:null,
      slaEval, slaOk, sla:slaEval>0?slaOk/slaEval:null,
      obs, obsActive, obsImpact, obsAvg:rows.length?obs/rows.length:0
    };
  }

  function cfg207(data){
    const visual=norm207($207('dashboardVisualTypeV19')?.value||'TODOS')||'TODOS';
    return data?.indicatorConfigs?.[visual] || data?.indicatorConfigs?.TODOS || data?.indicatorConfig || {};
  }

  function positive4(value, rule, kind){
    if(value==null || !Number.isFinite(Number(value))) return 'neutral';
    const v=Number(value);
    let moderate, optimal;
    if(kind==='production'){
      moderate=num207(rule?.moderateFromRatio ?? rule?.attentionRatio,.70);
      optimal=num207(rule?.optimalFromRatio ?? rule?.greenRatio,1);
      const redCut=moderate>.5?.5:moderate*.70;
      if(v>=optimal) return 'green';
      if(v>=moderate) return 'yellow';
      if(v>=redCut) return 'orange';
      return 'red';
    }
    moderate=num207(rule?.moderateFrom ?? rule?.criticalBelow, kind==='sla'?.80:.50);
    optimal=num207(rule?.optimalFrom ?? rule?.greenAbove, kind==='sla'?.90:.70);
    const mid=moderate + Math.max(0,optimal-moderate)/2;
    if(v>=optimal) return 'green';
    if(v>=mid) return 'yellow';
    if(v>=moderate) return 'orange';
    return 'red';
  }

  function negative4(value, rule){
    if(value==null || !Number.isFinite(Number(value)) || !rule?.configured) return 'neutral';
    const v=Number(value), opt=num207(rule.optimalMax,0), mod=num207(rule.moderateMax,opt);
    const mid=opt + Math.max(0,mod-opt)/2;
    if(v<=opt) return 'green';
    if(v<=mid) return 'yellow';
    if(v<=mod) return 'orange';
    return 'red';
  }

  function observation4(value,rule){
    if(value==null || !Number.isFinite(Number(value))) return 'neutral';
    const v=Number(value), opt=num207(rule?.optimalMax,0), mod=num207(rule?.moderateMax,1);
    const mid=opt + Math.max(0,mod-opt)/2;
    if(v<=opt) return 'green';
    if(v<=mid) return 'yellow';
    if(v<=mod) return 'orange';
    return 'red';
  }

  function stateLabel207(status){
    return ({green:'EN META',yellow:'CERCA',orange:'ALEJADO',red:'CRÍTICO',neutral:'SIN DATO'})[status]||'SIN DATO';
  }

  function clamp207(v){ return Math.max(0,Math.min(100,Number(v)||0)); }

  function row207({id,name,value,status,detail,target,meter,meterText,extraClass=''}){
    const meterHtml = meter==null ? '' : `
      <div class="mvl-v207-meter">
        <div class="mvl-v207-track"><i style="width:${clamp207(meter).toFixed(1)}%"></i></div>
        <b>${esc207(meterText||`${clamp207(meter).toFixed(0)}%`)}</b>
      </div>`;
    return `<article class="dashboard-v19-total-card mvl-v207-linear status-${status} ${extraClass}">
      <span class="mvl-v207-name">${esc207(name)}</span>
      <div class="mvl-v207-detail">${esc207(detail||'')}</div>
      <div class="mvl-v207-value"><strong id="${esc207(id)}">${esc207(value)}</strong><small>${esc207(target||'')} <span class="mvl-v207-state">${stateLabel207(status)}</span></small></div>
      ${meterHtml}
    </article>`;
  }

  function render207(){
    if(V207.rendering) return;
    const data=V207.dashboardAll?.ok?V207.dashboardAll:V207.dashboardLatest;
    const section=$207('dashboardTotalSummaryV19');
    const grid=section?.querySelector('.dashboard-v19-summary-grid');
    if(!data?.ok || !grid) return;
    V207.rendering=true;
    try{
      const s=summary207(data), cfg=cfg207(data);
      const pStatus=positive4(s.productionRatio,cfg.production,'production');
      const eStatus=positive4(s.effectiveness,cfg.effectiveness,'effectiveness');
      const rStatus=negative4(s.recable,cfg.recableado);
      const slaStatus=positive4(s.sla,cfg.sla,'sla');
      const obsStatus=observation4(s.obsAvg,cfg.observations);
      const pOptimal=num207(cfg?.production?.optimalFromRatio ?? cfg?.production?.greenRatio,1);
      const eOptimal=num207(cfg?.effectiveness?.optimalFrom ?? cfg?.effectiveness?.greenAbove,.70);
      const recOptimal=cfg?.recableado?.configured?num207(cfg.recableado.optimalMax,0):null;
      const slaOptimal=num207(cfg?.sla?.optimalFrom ?? cfg?.sla?.greenAbove,.90);
      const obsOptimal=num207(cfg?.observations?.optimalMax,0);

      const fp=JSON.stringify([
        s.rows.length,s.withData.length,s.points,s.finalized,s.effectiveness,s.recable,s.productionRatio,s.monthProgress,
        s.sla,s.obs,s.obsAvg,$207('dashboardVisualTypeV19')?.value,$207('dashboardPlatformV19')?.value,
        $207('dashboardSupervisor')?.value,$207('dashboardCompositionV19')?.value,$207('dashboardStateV19')?.value,$207('dashboardCrew')?.value
      ]);
      const hasForeign=!!grid.querySelector('.mvl-v118-production-meta,.mvl-v118-status-chip,.mvl-v113-status');
      if(grid.dataset.v207Fp===fp && grid.classList.contains('mvl-v207-linear-grid') && !hasForeign) return;

      const head=section.querySelector('.dashboard-v19-summary-head h3');
      const sub=section.querySelector('.dashboard-v19-summary-head .section-subtitle');
      if(head) head.textContent='Resumen de indicadores';
      if(sub) sub.textContent='Estado al corte según las metas configuradas.';
      $207('dashboardSummaryLoadingV112')?.classList.add('hidden');

      grid.classList.add('mvl-v207-linear-grid');
      grid.innerHTML=`
        <div class="mvl-v207-crew-strip"><span>Cuadrillas evaluadas</span><strong id="dashboardTotalCrewsV19">${s.rows.length} · ${s.withData.length} con movimiento</strong></div>
        ${row207({
          id:'dashboardTotalPointsV19',name:'Producción',value:`${s.points.toFixed(2)} pts`,status:pStatus,
          detail:`${s.finalized} órdenes finalizadas · Meta al corte ${s.target.toFixed(2)} pts · Meta mensual ${s.monthTarget.toFixed(2)} pts`,
          target:`Cumplimiento ${pct207(s.productionRatio,0)}`,
          meter:s.monthProgress==null?0:s.monthProgress*100,meterText:`Avance mes ${pct207(s.monthProgress,0)}`
        })}
        ${row207({
          id:'dashboardTotalEffectivenessV19',name:'Efectividad',value:pct207(s.effectiveness,1),status:eStatus,
          detail:`${s.finalized} finalizadas`,target:`Meta ≥ ${(eOptimal*100).toFixed(0)}%`,meter:s.effectiveness==null?0:s.effectiveness*100,meterText:pct207(s.effectiveness,0)
        })}
        ${row207({
          id:'dashboardTotalRecableV19',name:'% Recableado',value:pct207(s.recable,1),status:rStatus,
          detail:`${s.los} LOS ROJO · ${s.recables} recableados`,target:recOptimal==null?'Meta pendiente':`Meta ≤ ${(recOptimal*100).toFixed(0)}%`,meter:s.recable==null?0:s.recable*100,meterText:pct207(s.recable,0)
        })}
        ${row207({
          id:'dashboardTotalSlaV207',name:'Tiempo de gestión / SLA',value:pct207(s.sla,1),status:slaStatus,
          detail:s.slaEval?`${s.slaOk} de ${s.slaEval} órdenes dentro de SLA`:'Sin órdenes evaluables',target:`Meta ≥ ${(slaOptimal*100).toFixed(0)}%`,meter:s.sla==null?0:s.sla*100,meterText:pct207(s.sla,0)
        })}
        ${row207({
          id:'dashboardTotalObsV205',name:'Observaciones',value:`${s.obs} obs.`,status:obsStatus,
          detail:`${s.obsActive} activas · S/ ${s.obsImpact.toFixed(2)} impacto · ${s.obsAvg.toFixed(1)} por cuadrilla`,target:`Meta ≤ ${obsOptimal} por cuadrilla`,meter:null,extraClass:'',
        }).replace('dashboard-v19-total-card mvl-v207-linear','dashboard-v19-total-card mvl-v207-linear').replace('<article ','<article id="dashboardObsCardV205" ')}
        ${row207({
          id:'dashboardTotalVtrGarV207',name:'VTR / GAR',value:'En construcción',status:'neutral',detail:'La fuente aún no está integrada.',target:'Pendiente',meter:null
        })}
        <span id="dashboardTotalFinalizedV19" class="hidden">${s.finalized} órdenes finalizadas</span>
        <span id="dashboardTotalEffectivenessHelpV19" class="hidden">Resultado del filtro seleccionado</span>
        <span id="dashboardTotalRecableHelpV19" class="hidden">${s.los} LOS ROJO · ${s.recables} recableados</span>
        <span id="dashboardTotalObsHelpV205" class="hidden">${s.obsActive} activas</span>`;
      grid.dataset.v207Fp=fp;
    } finally {
      V207.rendering=false;
    }
  }

  function wrapApi207(){
    if(V207.wrapped || typeof api!=='function') return false;
    V207.wrapped=true;
    const prev=api;
    api=async function(action,params={}){
      const result=await prev(action,params);
      if(action==='performanceDashboard' && result?.ok){
        V207.dashboardLatest=result;
        if(norm207(params?.indicator)==='ALL') V207.dashboardAll=result;
        setTimeout(render207,80);
        setTimeout(render207,320);
      }
      return result;
    };
    return true;
  }

  function installObserver207(){
    const section=$207('dashboardTotalSummaryV19');
    const grid=section?.querySelector('.dashboard-v19-summary-grid');
    if(!grid || grid.dataset.v207Observed==='1') return;
    grid.dataset.v207Observed='1';
    let timer=null;
    new MutationObserver(()=>{
      if(V207.rendering) return;
      clearTimeout(timer);
      timer=setTimeout(render207,40);
    }).observe(grid,{childList:true,subtree:true});
  }

  document.addEventListener('change',e=>{
    if(['dashboardVisualTypeV19','dashboardPlatformV19','dashboardCompositionV19','dashboardStateV19','dashboardSupervisor','dashboardCrew','dashboardPeriod'].includes(e.target?.id||'')){
      setTimeout(render207,40);
    }
  },true);
  document.addEventListener('click',e=>{
    if(e.target?.id==='refreshDashboardButton' || norm207(e.target?.textContent)==='APLICAR'){
      setTimeout(render207,100);setTimeout(render207,350);
    }
  },true);

  function init207(){
    wrapApi207();installObserver207();render207();
  }
  const timer=setInterval(()=>{ if(wrapApi207()) { installObserver207(); } },250);
  setTimeout(()=>clearInterval(timer),12000);
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(init207,250),{once:true});
  else setTimeout(init207,250);

  console.info('[MI VISUAL LIMA] V2.07: paleta compacta global + Dashboard lineal de 4 estados.');
})();


/* ==========================================================
   MI VISUAL LIMA - V2.08
   CENTRO DE CONTROL BENTO + CONTADORES + NAVEGACIÓN MÓVIL
   Respeta estrictamente los módulos que ya entrega PERMISOS.
   ========================================================== */
(() => {
  const V208 = {
    lastCounts: null,
    lastCountsAt: 0,
    loadingCounts: false,
    apiWrapped: false,
    homeWrapped: false,
    observerInstalled: false,
    activeModule: '',
    loginPending: false
  };

  const $208 = id => document.getElementById(id);
  const norm208 = v => String(v ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .trim()
    .toUpperCase();

  // V2.09: usar SIEMPRE el nombre real del módulo guardado en PERMISOS/MODULOS.
  // "Mi Desempeño" se muestra como "Dashboard Desempeño" en perfiles de gestión,
  // pero su data-module sigue siendo Mi Desempeño.
  const GROUPS208 = [
    {
      label:'Control Operativo',
      items:['Mi Desempeño','Mapa Operativo','Bono Supervisores'],
      featured:true
    },
    {
      label:'Gestión Técnica',
      items:['Validación Técnica','Observaciones']
    },
    {
      label:'Campo',
      items:['Actividad en Campo','Checklist']
    },
    {
      label:'Administrativo',
      items:['Gestión de Actas','Descansos Programados']
    }
  ];

  const ICONS208 = {
    'Mi Desempeño':'↗',
    'Mapa Operativo':'⌖',
    'Bono Supervisores':'★',
    'Validación Técnica':'✓',
    'Observaciones':'!',
    'Actividad en Campo':'◎',
    'Checklist':'☑',
    'Gestión de Actas':'▤',
    'Descansos Programados':'◷',
    'Administración':'⚙'
  };

  const NAV_LABELS208 = {
    'Mi Desempeño':'Dashboard',
    'Mapa Operativo':'Mapa',
    'Bono Supervisores':'Bono',
    'Validación Técnica':'Validación',
    'Observaciones':'Observ.'
  };

  function isAdminProfile208() {
    const s = session208();
    const profile = norm208(s?.user?.profile || s?.profile || s?.perfil || '');
    return profile === 'ADMINISTRADOR';
  }

  function hasAdminPermission208() {
    const s = session208();
    if (!isAdminProfile208()) return false;
    const module = (s?.modules || []).find(m => normalizeName208(m?.module) === normalizeName208('Administración'));
    return Boolean(module?.permissions?.administrar);
  }

  function displayName208(name) {
    if (normalizeName208(name) === normalizeName208('Mi Desempeño')) {
      const profile = norm208(session208()?.user?.profile || '');
      return profile === 'TECNICO' ? 'Mi Desempeño' : 'Dashboard Desempeño';
    }
    return name;
  }

  function visibleAvailableModuleNames208() {
    return GROUPS208.flatMap(g => g.items).filter(name => cardIsAvailable208(visibleCard208(name)));
  }

  const WRITE_ACTIONS208 = new Set([
    'mapImport',
    'technicalValidationCreate','technicalValidationResolve',
    'observationsCreate','observationsDescargo','observationsUpdate',
    'fieldActivityCreate','fieldActivityUpdate',
    'checklistCreate','checklistValidate',
    'actsCreate','actsReplacePdf','actsReview','actsPhysicalDelivery','actsCargoCreate',
    'restsSchedule','restsRequestChange','restsReviewSupervisor','restsReviewManagement',
    'adminCreateUser','adminUpdateUser','adminSetUserStatus',
    'adminCreateCrew','adminUpdateCrew','adminReplaceCrewTechnician',
    'adminCreateSupervisor','adminCreateStaff',
    'adminImportFinish',
    'supervisorBonusConfigSave','supervisorBonusSatisfactionSave'
  ]);

  function session208() {
    try {
      if (typeof sessionData !== 'undefined' && sessionData) return sessionData;
    } catch (_) {}
    return window.sessionData || null;
  }

  function token208() {
    try { return typeof token === 'function' ? token() : ''; }
    catch (_) { return ''; }
  }

  function normalizeName208(v) {
    return norm208(String(v || '')).replace(/\s+/g,' ').trim();
  }

  function visibleCard208(name) {
    const target = normalizeName208(name);
    const cards = [...document.querySelectorAll('#moduleList [data-module]')];
    return cards.find(card => normalizeName208(card.dataset.module || '') === target) || null;
  }

  function cardIsAvailable208(card) {
    if (!card) return false;
    if (card.disabled) return false;
    if (card.getAttribute('aria-disabled') === 'true') return false;
    return card.classList.contains('module-active') || !card.classList.contains('module-disabled');
  }

  function ensureCounter208(card) {
    const copy = card?.querySelector('.module-copy');
    if (!copy) return null;

    let counter = copy.querySelector('.mvl-v208-counter');
    if (!counter) {
      counter = document.createElement('span');
      counter.className = 'mvl-v208-counter tone-muted';
      counter.textContent = 'Actualizando…';
      copy.appendChild(counter);
    }
    return counter;
  }

  function applyCount208(name, data) {
    const card = visibleCard208(name);
    if (!card || !data) return;

    const counter = ensureCounter208(card);
    if (!counter) return;

    counter.textContent = data.label || '';
    counter.className = `mvl-v208-counter tone-${data.tone || 'blue'}`;
  }

  function applyAllCounts208() {
    const counts = V208.lastCounts?.counts || {};
    Object.entries(counts).forEach(([name,data]) => {
      const canonical = normalizeName208(name) === normalizeName208('Dashboard Desempeño')
        ? 'Mi Desempeño'
        : name;
      applyCount208(canonical,data);
    });

    // Para módulos visibles que todavía no tienen respuesta.
    document.querySelectorAll('#moduleList [data-module]').forEach(card => {
      const name = card.dataset.module || '';
      if (counts[name]) return;
      const counter = ensureCounter208(card);
      if (counter && counter.textContent === 'Actualizando…') {
        counter.textContent = 'Disponible';
        counter.className = 'mvl-v208-counter tone-muted';
      }
    });

    updateMoreSheet208();
  }

  async function loadCounts208(force=false) {
    if (V208.loadingCounts || typeof api !== 'function' || !token208()) return;

    const fresh = Date.now() - V208.lastCountsAt < 30000;
    if (!force && fresh && V208.lastCounts) {
      applyAllCounts208();
      return;
    }

    V208.loadingCounts = true;
    try {
      const result = await api('homeModuleCounts',{token:token208()});
      if (result?.ok) {
        V208.lastCounts = result;
        V208.lastCountsAt = Date.now();
        applyAllCounts208();
      }
    } catch (_) {
      // Los contadores son complementarios; nunca bloquean el Inicio.
    } finally {
      V208.loadingCounts = false;
    }
  }

  function clearBentoLabels208(list) {
    list.querySelectorAll(':scope > .mvl-v208-section-label').forEach(el => el.remove());
  }

  function enhanceHome208() {
    const list = $208('moduleList');
    if (!list) return;

    list.classList.add('mvl-v208-bento');
    clearBentoLabels208(list);

    const cards = [...list.querySelectorAll(':scope > .module-card, :scope > [data-module]')];
    const byName = new Map(cards.map(card => [normalizeName208(card.dataset.module || ''), card]));
    const used = new Set();
    let order = 10;

    GROUPS208.forEach(group => {
      const groupCards = group.items
        .map(name => byName.get(normalizeName208(name)))
        .filter(Boolean);

      if (!groupCards.length) return;

      const label = document.createElement('div');
      label.className = 'mvl-v208-section-label';
      label.textContent = group.label;
      label.style.order = String(order++);
      list.appendChild(label);

      groupCards.forEach(card => {
        used.add(card);
        card.style.order = String(order++);
        card.classList.toggle('mvl-v208-featured', !!group.featured);
        card.classList.toggle('mvl-v208-system', !!group.system);
        ensureCounter208(card);
      });
    });

    // Administración nunca participa del menú Bento: solo se accede por tuerca del Administrador.
    const adminCardForMenu = visibleCard208('Administración');
    if (adminCardForMenu) adminCardForMenu.style.display = 'none';

    const leftovers = cards.filter(card =>
      !used.has(card) &&
      normalizeName208(card.dataset.module || '') !== normalizeName208('Administración')
    );
    if (leftovers.length) {
      const label = document.createElement('div');
      label.className = 'mvl-v208-section-label';
      label.textContent = 'Otros';
      label.style.order = String(order++);
      list.appendChild(label);

      leftovers.forEach(card => {
        card.style.order = String(order++);
        card.classList.remove('mvl-v208-featured','mvl-v208-system');
        ensureCounter208(card);
      });
    }

    relocateAdmin208();
    buildMobileNav208();
    applyAllCounts208();

    // Contadores se cargan después de pintar el Inicio.
    setTimeout(() => loadCounts208(false), 180);
  }

  function goHome208() {
    try {
      const s = session208();
      if (typeof renderHome === 'function' && s) {
        renderHome(s);
        V208.activeModule = '';
        setTimeout(() => {
          enhanceHome208();
          setActiveNav208('HOME');
        }, 20);
        return;
      }
    } catch (_) {}

    $208('homeView')?.classList.remove('hidden');
    setActiveNav208('HOME');
  }

  function openModule208(name) {
    const card = visibleCard208(name);
    if (!card || !cardIsAvailable208(card)) return false;

    V208.activeModule = name;
    closeMore208();
    setActiveNav208(name);
    card.click();
    return true;
  }

  function navItems208() {
    const priority = [
      'Mi Desempeño',
      'Mapa Operativo',
      'Validación Técnica',
      'Observaciones'
    ];

    return priority
      .filter(name => cardIsAvailable208(visibleCard208(name)))
      .slice(0,3);
  }

  function relocateAdmin208() {
    const logout = document.getElementById('logoutButton');
    if (!logout) return;

    // Ocultar siempre la tarjeta Administración del menú, para todos los perfiles.
    const adminCard = visibleCard208('Administración');
    if (adminCard) {
      adminCard.style.display = 'none';
      adminCard.setAttribute('aria-hidden','true');
      adminCard.dataset.v209HiddenAdmin = '1';
    }

    let wrap = document.getElementById('mvlV208HeaderTools');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'mvlV208HeaderTools';
      wrap.className = 'mvl-v208-header-tools';
      logout.parentElement?.insertBefore(wrap, logout);
      wrap.appendChild(logout);
    } else if (logout.parentElement !== wrap) {
      wrap.appendChild(logout);
    }

    let btn = document.getElementById('mvlV208AdminQuick');
    const showQuick = hasAdminPermission208();

    if (!showQuick) {
      if (btn) btn.remove();
      return;
    }

    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'mvlV208AdminQuick';
      btn.className = 'ghost mvl-v208-admin-quick';
      btn.setAttribute('aria-label', 'Administración');
      btn.title = 'Administración';
      btn.innerHTML = '<span class="mvl-v208-admin-icon" aria-hidden="true">⚙</span>';
      wrap.prepend(btn);
    }

    // Reasignar SIEMPRE el click porque renderHome reconstruye las tarjetas.
    btn.onclick = () => {
      const currentAdminCard = visibleCard208('Administración');
      if (currentAdminCard) {
        currentAdminCard.style.display = '';
        currentAdminCard.click();
        currentAdminCard.style.display = 'none';
      } else if (typeof openAdmin === 'function') {
        openAdmin();
      }
    };
  }

  function buildMobileNav208() {
    let nav = $208('mvlV208MobileNav');
    if (!nav) {
      nav = document.createElement('nav');
      nav.id = 'mvlV208MobileNav';
      nav.className = 'mvl-v208-mobile-nav';
      document.body.appendChild(nav);
    }

    const items = navItems208();
    nav.innerHTML = `
      <button type="button" data-v208-nav="HOME">
        <span class="mvl-v208-nav-icon">⌂</span>
        <span class="mvl-v208-nav-label">Inicio</span>
      </button>
      ${items.map(name => `
        <button type="button" data-v208-nav="${name}">
          <span class="mvl-v208-nav-icon">${ICONS208[name] || '•'}</span>
          <span class="mvl-v208-nav-label">${displayName208(name) === 'Dashboard Desempeño' ? 'Dashboard' : (NAV_LABELS208[name] || displayName208(name))}</span>
        </button>`).join('')}
      <button type="button" data-v208-nav="MORE">
        <span class="mvl-v208-nav-icon">•••</span>
        <span class="mvl-v208-nav-label">Más</span>
      </button>
    `;

    // Siempre 5 columnas visuales: si faltan módulos, rellena con los siguientes disponibles.
    const currentButtons = [...nav.querySelectorAll('button[data-v208-nav]')];
    if (currentButtons.length < 5) {
      const used = new Set(['HOME','MORE',...items]);
      const extras = GROUPS208.flatMap(g => g.items)
        .filter(name => !used.has(name) && cardIsAvailable208(visibleCard208(name)) && normalizeName208(name) !== normalizeName208('Administración'));

      const moreButton = nav.querySelector('[data-v208-nav="MORE"]');
      extras.slice(0, 5 - currentButtons.length).forEach(name => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.dataset.v208Nav = name;
        btn.innerHTML = `
          <span class="mvl-v208-nav-icon">${ICONS208[name] || '•'}</span>
          <span class="mvl-v208-nav-label">${displayName208(name) === 'Dashboard Desempeño' ? 'Dashboard' : (NAV_LABELS208[name] || displayName208(name))}</span>`;
        nav.insertBefore(btn, moreButton);
      });
    }

    // Adaptar columnas al número real, sin inventar permisos.
    const count = nav.querySelectorAll('button[data-v208-nav]').length;
    nav.style.gridTemplateColumns = `repeat(${Math.max(2,count)},minmax(0,1fr))`;

    nav.querySelectorAll('button[data-v208-nav]').forEach(btn => {
      btn.onclick = () => {
        const target = btn.dataset.v208Nav;
        if (target === 'HOME') goHome208();
        else if (target === 'MORE') openMore208();
        else openModule208(target);
      };
    });

    setActiveNav208(V208.activeModule || 'HOME');
    updateMoreSheet208();
  }

  function setActiveNav208(target) {
    const nav = $208('mvlV208MobileNav');
    if (!nav) return;
    nav.querySelectorAll('button').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.v208Nav === target);
    });
  }

  function ensureMoreSheet208() {
    let sheet = $208('mvlV208MoreSheet');
    if (sheet) return sheet;

    sheet = document.createElement('div');
    sheet.id = 'mvlV208MoreSheet';
    sheet.className = 'mvl-v208-more-sheet hidden';
    sheet.innerHTML = `
      <section class="mvl-v208-more-card">
        <div class="mvl-v208-more-head">
          <strong>Todos mis módulos</strong>
          <button type="button" data-v208-close>×</button>
        </div>
        <div class="mvl-v208-more-grid"></div>
      </section>`;
    document.body.appendChild(sheet);

    sheet.querySelector('[data-v208-close]').onclick = closeMore208;
    sheet.addEventListener('click',e => {
      if (e.target === sheet) closeMore208();
    });
    return sheet;
  }

  function updateMoreSheet208() {
    const sheet = ensureMoreSheet208();
    const grid = sheet.querySelector('.mvl-v208-more-grid');
    if (!grid) return;

    const names = GROUPS208.flatMap(g => g.items)
      .filter(name => cardIsAvailable208(visibleCard208(name)) && normalizeName208(name) !== normalizeName208('Administración'));

    grid.innerHTML = names.map(name => {
      const data = V208.lastCounts?.counts?.[name];
      return `
        <button type="button" data-v208-more-module="${name}">
          <span class="more-icon">${ICONS208[name] || '•'}</span>
          <span>
            <strong>${displayName208(name)}</strong>
            <small>${data?.label || 'Abrir módulo'}</small>
          </span>
        </button>`;
    }).join('');

    grid.querySelectorAll('[data-v208-more-module]').forEach(btn => {
      btn.onclick = () => openModule208(btn.dataset.v208MoreModule);
    });
  }

  function openMore208() {
    const sheet = ensureMoreSheet208();
    updateMoreSheet208();
    sheet.classList.remove('hidden');
    setActiveNav208('MORE');
  }

  function closeMore208() {
    $208('mvlV208MoreSheet')?.classList.add('hidden');
    setActiveNav208(V208.activeModule || 'HOME');
  }

  function wrapApi208() {
    if (V208.apiWrapped || typeof api !== 'function') return false;
    V208.apiWrapped = true;

    const prev = api;
    api = async function(action,params={}) {
      const isLogin = action === 'login';
      const loginButton = document.getElementById('loginButton');
      const loginMessage = document.getElementById('loginMessage');

      if (isLogin) {
        V208.loginPending = true;
        if (loginButton) loginButton.textContent = 'Ingresando…';
        if (loginMessage) {
          loginMessage.textContent = 'Validando acceso…';
          loginMessage.classList.remove('success-message');
        }
      }

      try {
        const result = await prev(action,params);
        if (WRITE_ACTIONS208.has(action) && result?.ok) V208.lastCountsAt = 0;
        return result;
      } catch (err) {
        if (isLogin && (err?.name === 'AbortError' || /aborted|signal/i.test(String(err?.message || '')))) {
          throw new Error('El servidor está tardando en responder. Intente ingresar nuevamente.');
        }
        throw err;
      } finally {
        if (isLogin) {
          V208.loginPending = false;
          if (loginButton) loginButton.textContent = 'Ingresar';
          // "Validando acceso…" solo existe mientras la solicitud de Login está realmente en curso.
          if (loginMessage && loginMessage.textContent.trim() === 'Validando acceso…') {
            loginMessage.textContent = '';
          }
        }
      }
    };
    return true;
  }

  function wrapHome208() {
    if (V208.homeWrapped || typeof renderHome !== 'function') return false;
    V208.homeWrapped = true;

    const prev = renderHome;
    renderHome = function(data) {
      const result = prev(data);
      V208.activeModule = '';
      setTimeout(() => {
        enhanceHome208();
        setActiveNav208('HOME');
      }, 20);
      return result;
    };
    return true;
  }

  function installObserver208() {
    const list = $208('moduleList');
    if (!list || list.dataset.v208Observed === '1') return;
    list.dataset.v208Observed = '1';

    let timer = null;
    new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => enhanceHome208(), 35);
    }).observe(list,{childList:true});

    V208.observerInstalled = true;
  }

  // Cualquier clic real sobre tarjeta conserva toda la lógica previa.
  document.addEventListener('click',e => {
    const card = e.target?.closest?.('#moduleList [data-module]');
    if (card && cardIsAvailable208(card)) {
      V208.activeModule = card.dataset.module || '';
      setActiveNav208(V208.activeModule);
    }
  },true);

  function clearIdleLoginMessage2091() {
    const message = document.getElementById('loginMessage');
    if (!message || V208.loginPending) return;
    if (message.textContent.trim() === 'Validando acceso…') message.textContent = '';
  }

  function installLoginMessageGuard2091() {
    ['usuario','clave'].forEach(id => {
      const input = document.getElementById(id);
      if (!input || input.dataset.mvl2091Guard === '1') return;
      input.dataset.mvl2091Guard = '1';
      input.addEventListener('input', clearIdleLoginMessage2091);
      input.addEventListener('focus', clearIdleLoginMessage2091);
    });
    window.addEventListener('pageshow', () => setTimeout(clearIdleLoginMessage2091, 0));
    clearIdleLoginMessage2091();
  }

  function init208() {
    wrapApi208();
    wrapHome208();
    installObserver208();
    installLoginMessageGuard2091();
    enhanceHome208();
  }

  const timer = setInterval(() => {
    wrapApi208();
    wrapHome208();
    installObserver208();
    installLoginMessageGuard2091();
    if ($208('moduleList') && session208()) {
      enhanceHome208();
      clearInterval(timer);
    }
  },250);
  setTimeout(() => clearInterval(timer),12000);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded',() => setTimeout(init208,250),{once:true});
  } else {
    setTimeout(init208,250);
  }

  console.info('[MI VISUAL LIMA] V2.09 DEFINITIVA: Control Operativo + Administración por tuerca + login estable.');
})();



/* ==========================================================
   MI VISUAL LIMA - V2.10
   HISTÓRICO MENSUAL + BONO SUPERVISORES
   ========================================================== */
(() => {
  const S210={bonus:null,periods:null,homeWrapped:false};
  const $210=id=>document.getElementById(id);
  const norm210=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
  const esc210=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const pct210=v=>v==null||!Number.isFinite(Number(v))?'—':`${Number(v).toFixed(1)}%`;
  const money210=v=>`S/ ${Number(v||0).toFixed(2)}`;
  function token210(){try{return typeof token==='function'?token():'';}catch(_){return '';}}
  function session210(){try{if(typeof sessionData!=='undefined'&&sessionData)return sessionData;}catch(_){}return window.sessionData||null;}
  function monthLabel210(p){if(!/^\d{4}-\d{2}$/.test(String(p||'')))return p;const [y,m]=p.split('-').map(Number);return new Intl.DateTimeFormat('es-PE',{month:'short',year:'numeric'}).format(new Date(y,m-1,1)).replace('.','');}

  function modulePermission210(name){
    return (session210()?.modules||[]).find(m=>norm210(m?.module)===norm210(name))?.permissions||null;
  }
  function activateBonusCard210(){
    const card=document.querySelector('#moduleList [data-module="Bono Supervisores"]');
    const perm=modulePermission210('Bono Supervisores');
    if(!card||!perm?.ver)return;
    card.disabled=false;card.removeAttribute('disabled');card.classList.remove('disabled','module-disabled');card.classList.add('module-active');card.setAttribute('aria-disabled','false');
    const sm=card.querySelector('small');if(sm)sm.textContent='Cumplimiento y bono mensual de supervisión';
    const ar=card.querySelector('.module-arrow');if(ar)ar.textContent='›';
  }

  function historyContainer210(input){
    if(!input)return null;
    const label=input.closest('label');if(!label)return null;
    let box=label.parentElement?.querySelector(`.mvl210-period-history[data-for="${input.id}"]`);
    if(!box){box=document.createElement('div');box.className='mvl210-period-history';box.dataset.for=input.id;label.insertAdjacentElement('afterend',box);}
    return box;
  }
  function renderHistory210(){
    const periods=S210.periods?.periods||[];
    ['performancePeriod','dashboardPeriod'].forEach(id=>{
      const input=$210(id);if(!input)return;input.min=(periods.length?periods[periods.length-1]:'');
      const box=historyContainer210(input);if(!box)return;
      box.innerHTML=periods.length?`<span>Histórico</span>${periods.map(p=>`<button type="button" data-p="${p}" class="${input.value===p?'active':''}">${esc210(monthLabel210(p))}</button>`).join('')}`:'<span>Histórico disponible al cargar meses anteriores</span>';
      box.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>{input.value=b.dataset.p;input.dispatchEvent(new Event('change',{bubbles:true}));renderHistory210();});
    });
  }
  async function loadPeriods210(force=false){
    if(S210.periods&&!force){renderHistory210();return S210.periods;}
    try{const r=await api('performancePeriods',{token:token210()});if(r?.ok){S210.periods=r;renderHistory210();return r;}}catch(_){}
    return null;
  }

  function hideAll210(){
    document.querySelectorAll('main.shell > section.card.app-card').forEach(v=>v.classList.add('hidden'));
  }
  function home210(){
    const view=$210('bonusSupervisorsViewV210');view?.classList.add('hidden');
    try{if(typeof renderHome==='function'&&session210())renderHome(session210());}catch(_){$210('homeView')?.classList.remove('hidden');}
  }
  function ensureBonusView210(){
    let v=$210('bonusSupervisorsViewV210');if(v)return v;
    v=document.createElement('section');v.id='bonusSupervisorsViewV210';v.className='card app-card mvl210-bonus-view hidden';
    v.innerHTML=`
      <div class="mvl210-topbar">
        <div><button type="button" class="back-link" id="bonusBack210">← Inicio</button><p class="eyebrow">CONTROL OPERATIVO</p><h2>Bono Supervisores</h2><p class="muted">Seguimiento mensual basado en indicadores de MI VISUAL LIMA.</p></div>
        <div class="mvl210-actions"><button type="button" class="ghost hidden" id="bonusSatisfaction210">SATISFACCIÓN</button><button type="button" class="ghost hidden" id="bonusConfig210">CONFIGURAR BONO</button></div>
      </div>
      <div class="mvl210-bonus-controls"><label>Periodo<input type="month" id="bonusPeriod210" min="2026-07" value="${new Date().toISOString().slice(0,7)}"></label><button type="button" class="primary compact" id="bonusRefresh210">Actualizar</button></div>
      <div class="mvl210-period-history" id="bonusHistory210"></div>
      <div class="mvl210-model-note" id="bonusModelNote210">Cargando modelo…</div>
      <div class="mvl210-bonus-summary" id="bonusSummary210"></div>
      <div class="mvl210-bonus-list" id="bonusList210"><div class="mvl210-empty">Cargando…</div></div>`;
    document.querySelector('main.shell')?.appendChild(v);
    $210('bonusBack210').onclick=home210;$210('bonusRefresh210').onclick=()=>loadBonus210(true);$210('bonusPeriod210').onchange=()=>loadBonus210(true);$210('bonusConfig210').onclick=openBonusConfig210;$210('bonusSatisfaction210').onclick=openSatisfaction210;
    return v;
  }
  function renderBonusHistory210(periods,current){
    const box=$210('bonusHistory210');if(!box)return;
    const bonusPeriods=(periods||[]).filter(p=>String(p)>='2026-07');
    box.innerHTML=`<span>Histórico</span>${bonusPeriods.map(p=>`<button type="button" data-p="${p}" class="${p===current?'active':''}">${esc210(monthLabel210(p))}</button>`).join('')}`;
    box.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>{$210('bonusPeriod210').value=b.dataset.p;loadBonus210(true);});
  }
  function compClass210(c){if(!c?.evaluable)return'muted';if(c.state==='BONO ACTIVO')return'green';return Number(c.compliance||0)>=70?'yellow':'red';}
  function componentDetail210(c){
    const m=c.metrics||{};
    if(c.key==='PRODUCTIVIDAD')return `${m.points??0} pts / meta al corte ${m.targetToDate??0} · Efect. ${pct210(m.effectivenessPct)}`;
    if(c.key==='CALIDAD')return `${m.observationsWin??0} obs. WIN · S/ ${Number(m.penalizedAmount||0).toFixed(2)} penalizado · Recableado ${pct210(m.recablePct)}`;
    if(c.key==='SLA')return `${m.cumplen??0}/${m.evaluables??0} dentro de SLA`;
    if(c.key==='SATISFACCION')return `${m.conform??0} conformes · ${m.nonConform??0} no conformes`;
    if(c.key==='SEGURIDAD')return `${m.audits??0} auditoría(s) evaluables`;
    return '';
  }
  function renderBonus210(r){
    const bonuses=r.bonuses||[],cfg=r.config||{};
    $210('bonusConfig210')?.classList.toggle('hidden',!r.canConfigure);$210('bonusSatisfaction210')?.classList.toggle('hidden',!r.canRegisterSatisfaction);
    renderBonusHistory210(r.periods||[],r.period);$210('bonusPeriod210').value=r.period;
    $210('bonusModelNote210').innerHTML=`<strong>Modelo Lima</strong> · Productividad 25% · Calidad 25% · SLA 20% · Satisfacción 15% · Seguridad 15%. <span>VTR/GAR permanece pendiente y no penaliza Calidad.</span>${Number(cfg.totalAmount||0)<=0?' <b>Falta configurar el monto máximo mensual.</b>':''}`;
    const totalProjected=bonuses.reduce((s,b)=>s+Number(b.amount||0),0);
    $210('bonusSummary210').innerHTML=`<div><span>Periodo</span><b>${esc210(monthLabel210(r.period))}</b></div><div><span>Supervisores</span><b>${bonuses.length}</b></div><div><span>Monto máximo / supervisor</span><b>${money210(cfg.totalAmount||0)}</b></div><div><span>Proyección total</span><b>${money210(totalProjected)}</b></div>`;
    const list=$210('bonusList210');
    if(!bonuses.length){list.innerHTML='<div class="mvl210-empty">No hay supervisores evaluables para este periodo.</div>';return;}
    list.innerHTML=bonuses.map((b,i)=>`<article class="mvl210-supervisor-card">
      <div class="mvl210-supervisor-head"><div><span class="mvl210-rank">${i+1}</span><strong>${esc210(b.supervisor)}</strong><small>${b.crewCount} cuadrilla${b.crewCount===1?'':'s'} · cobertura evaluable ${Number(b.coverageWeight||0)}%</small></div><div class="mvl210-amount"><b>${money210(b.amount)}</b><small>de ${money210(b.maxAmount)}</small><span class="mvl210-state ${Number(b.amount||0)>0?'green':'muted'}">${esc210(b.state)}</span></div></div>
      <div class="mvl210-components">${(b.components||[]).map(c=>`<div class="mvl210-component ${compClass210(c)}"><div><strong>${esc210(c.name)}</strong><span>Peso ${c.weight}% · activa &gt; ${c.activator}%</span></div><b>${c.evaluable?pct210(c.compliance):'SIN DATOS'}</b><small>${esc210(componentDetail210(c))}</small><em>${money210(c.amount)} / ${money210(c.max)}</em></div>`).join('')}</div>
    </article>`).join('');
  }
  async function loadBonus210(force=false){
    const list=$210('bonusList210');if(list)list.innerHTML='<div class="mvl210-empty">Calculando bono del periodo…</div>';
    try{const p=$210('bonusPeriod210')?.value||new Date().toISOString().slice(0,7);const r=await api('supervisorBonusGet',{token:token210(),period:p});if(!r?.ok)throw new Error(r?.error||'No se pudo calcular el bono.');S210.bonus=r;S210.periods={periods:r.periods||[]};renderBonus210(r);renderHistory210();}catch(e){if(list)list.innerHTML=`<div class="mvl210-empty error">${esc210(e.message)}</div>`;}
  }
  async function openBonus210(){hideAll210();const v=ensureBonusView210();v.classList.remove('hidden');await loadPeriods210();const latest=S210.periods?.latest;if(latest&&!$210('bonusPeriod210').value)$210('bonusPeriod210').value=latest;await loadBonus210(true);}

  function modal210(id,title,body,save,onSave){$210(id)?.remove();const o=document.createElement('div');o.id=id;o.className='mvl210-overlay';o.innerHTML=`<section class="mvl210-modal"><header><h3>${esc210(title)}</h3><button type="button" data-close>×</button></header><div class="mvl210-modal-body">${body}<div class="mvl210-msg"></div></div><footer><button type="button" class="ghost" data-cancel>Cancelar</button><button type="button" class="primary" data-save>${esc210(save)}</button></footer></section>`;document.body.appendChild(o);const close=()=>o.remove();o.querySelector('[data-close]').onclick=close;o.querySelector('[data-cancel]').onclick=close;o.onclick=e=>{if(e.target===o)close();};o.querySelector('[data-save]').onclick=async()=>{const b=o.querySelector('[data-save]'),msg=o.querySelector('.mvl210-msg');b.disabled=true;try{await onSave(o);close();}catch(e){msg.textContent=e.message||String(e);msg.className='mvl210-msg error';}finally{b.disabled=false;}};return o;}
  function openBonusConfig210(){const r=S210.bonus;if(!r?.canConfigure)return;const c=r.config||{},a=c.activators||{};modal210('bonusConfigModal210','Configurar Bono Supervisores',`<div class="mvl210-form"><label class="full">Periodo<input id="bcPeriod210" type="month" min="2026-07" value="${esc210(r.period)}"></label><label class="full">Monto máximo mensual por supervisor · S/<input id="bcAmount210" type="number" min="0" step="10" value="${Number(c.totalAmount||0)}"></label><label>Activa Productividad &gt; %<input id="bcProd210" type="number" min="0" max="100" value="${Number(a.PRODUCTIVIDAD??85)}"></label><label>Activa Calidad &gt; %<input id="bcQuality210" type="number" min="0" max="100" value="${Number(a.CALIDAD??85)}"></label><label>Activa SLA &gt; %<input id="bcSla210" type="number" min="0" max="100" value="${Number(a.SLA??95)}"></label><label>Activa Satisfacción &gt; %<input id="bcSat210" type="number" min="0" max="100" value="${Number(a.SATISFACCION??85)}"></label><label>Activa Seguridad &gt; %<input id="bcSec210" type="number" min="0" max="100" value="${Number(a.SEGURIDAD??85)}"></label></div><p class="mvl210-help">Los pesos se mantienen como en la estructura base: 25% / 25% / 20% / 15% / 15%.</p>`,'Guardar',async m=>{const x=await api('supervisorBonusConfigSave',{token:token210(),period:m.querySelector('#bcPeriod210').value,totalAmount:m.querySelector('#bcAmount210').value,activatorProductivity:m.querySelector('#bcProd210').value,activatorQuality:m.querySelector('#bcQuality210').value,activatorSla:m.querySelector('#bcSla210').value,activatorSatisfaction:m.querySelector('#bcSat210').value,activatorSafety:m.querySelector('#bcSec210').value});if(!x?.ok)throw new Error(x?.error||'No se pudo guardar.');$210('bonusPeriod210').value=m.querySelector('#bcPeriod210').value;await loadBonus210(true);});}
  function openSatisfaction210(){const r=S210.bonus;if(!r?.canRegisterSatisfaction)return;const options=(r.bonuses||[]).map(b=>`<option value="${esc210(b.supervisorId)}">${esc210(b.supervisor)}</option>`).join('');modal210('bonusSatModal210','Registrar satisfacción',`<div class="mvl210-form"><label class="full">Periodo<input id="bsPeriod210" type="month" min="2026-07" value="${esc210(r.period)}"></label><label class="full">Supervisor<select id="bsSup210">${options}</select></label><label>Clientes llamados<input id="bsCalled210" type="number" min="0" value="0"></label><label>Conformes<input id="bsConform210" type="number" min="0" value="0"></label><label>No conformes<input id="bsNon210" type="number" min="0" value="0"></label><label class="full">Observación<textarea id="bsObs210"></textarea></label></div>`,'Guardar',async m=>{const x=await api('supervisorBonusSatisfactionSave',{token:token210(),period:m.querySelector('#bsPeriod210').value,supervisorId:m.querySelector('#bsSup210').value,called:m.querySelector('#bsCalled210').value,conform:m.querySelector('#bsConform210').value,nonConform:m.querySelector('#bsNon210').value,observation:m.querySelector('#bsObs210').value});if(!x?.ok)throw new Error(x?.error||'No se pudo registrar.');$210('bonusPeriod210').value=m.querySelector('#bsPeriod210').value;await loadBonus210(true);});}

  document.addEventListener('click',e=>{
    const card=e.target?.closest?.('#moduleList [data-module]');if(!card)return;
    if(card.dataset.module==='Bono Supervisores'){e.preventDefault();e.stopImmediatePropagation();openBonus210();return;}
    $210('bonusSupervisorsViewV210')?.classList.add('hidden');
    if(card.dataset.module==='Mi Desempeño')setTimeout(()=>loadPeriods210(false),250);
  },true);

  function wrapHome210(){if(S210.homeWrapped||typeof renderHome!=='function')return false;S210.homeWrapped=true;const prev=renderHome;renderHome=function(data){const x=prev(data);setTimeout(()=>{activateBonusCard210();loadPeriods210(false);},35);return x;};return true;}
  function init210(){wrapHome210();activateBonusCard210();loadPeriods210(false);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init210,300),{once:true});else setTimeout(init210,300);
  const t=setInterval(()=>{wrapHome210();activateBonusCard210();if(session210()&&$210('moduleList'))clearInterval(t);},350);setTimeout(()=>clearInterval(t),12000);
  console.info('[MI VISUAL LIMA] V2.10: histórico mensual + Bono Supervisores Lima.');
})();


/* ==========================================================
   V2.11 - MOTOR UNIVERSAL DE CARGAS HISTÓRICAS
   Frontend: Mapa/SLA acepta uno o varios periodos en el mismo Excel.
   El backend realiza UPSERT por periodo + orden + versión más reciente.
   ========================================================== */
console.info('[MI VISUAL LIMA] V2.11: motor universal de cargas históricas activo.');

/* ==========================================================
   MI VISUAL LIMA - V2.11.1
   ESTADO EXPLÍCITO DE CARGA DE PRODUCCIÓN
   - REGISTRADO / NO REGISTRADO / PENDIENTE
   - muestra periodos involucrados en la respuesta del backend
   - no modifica la lógica de importación ni indicadores
   ========================================================== */
(() => {
  const S2111 = { wrapped:false, last:null };
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function periodsFromResult(r){
    const arr = Array.isArray(r?.periods) ? r.periods.filter(Boolean) : [];
    if (!arr.length && r?.period) arr.push(r.period);
    return [...new Set(arr)];
  }

  function ensureBox(){
    let box = $('productionImportResult2111');
    const msg = $('performanceImportMessage');
    if (!box && msg) {
      box = document.createElement('div');
      box.id = 'productionImportResult2111';
      box.className = 'mvl2111-import-result hidden';
      msg.insertAdjacentElement('afterend', box);
    }
    const oldTitle = document.querySelector('#dataPanel .data-last-load-card .eyebrow') ||
      $('dataLastLoad')?.closest('article')?.querySelector('.eyebrow');
    if (oldTitle && oldTitle.textContent.trim().toUpperCase() === 'ÚLTIMA ACTUALIZACIÓN') {
      oldTitle.textContent = 'ÚLTIMO INTENTO ANTERIOR';
    }
    return box;
  }

  function setPill(text, tone){
    const pill = $('dataOrdersStatus');
    if (!pill) return;
    pill.textContent = text;
    pill.classList.remove('success','warning','error','danger','ok');
    if (tone === 'ok') pill.classList.add('success');
    else if (tone === 'warn') pill.classList.add('warning');
    else if (tone === 'error') pill.classList.add('error');
  }

  function renderResult(result, fileName){
    const box = ensureBox();
    if (!box) return;
    const periods = periodsFromResult(result);
    const periodText = periods.length ? periods.join(' · ') : 'No confirmado';

    let state = 'NO REGISTRADO';
    let tone = 'error';
    let title = 'NO REGISTRADO';
    let detail = 'La base y los indicadores no fueron modificados.';

    if (result?.ok && !result?.needsCatalog && !result?.needsCrewResolution) {
      state = 'REGISTRADO'; tone = 'ok'; title = 'REGISTRADO CORRECTAMENTE';
      const nuevos = Number(result?.nuevos || 0);
      const actualizados = Number(result?.actualizados || 0);
      const sinCambios = Number(result?.sinCambios || 0);
      const antiguos = Number(result?.antiguosIgnorados || 0);
      detail = `La carga terminó y quedó aplicada. Nuevos ${nuevos} · Actualizados ${actualizados} · Sin cambios ${sinCambios} · Versiones antiguas ignoradas ${antiguos}.`;
    } else if (result?.needsCatalog || result?.needsCrewResolution) {
      state = 'PENDIENTE'; tone = 'warn'; title = 'PENDIENTE · NO REGISTRADO';
      detail = result?.needsCrewResolution
        ? 'Falta resolver cuadrillas históricas o ambiguas. Puedes registrarlas como Histórica/Baja o vincularlas a una cuadrilla existente. Hasta resolverlas no se modifica la base ni los indicadores.'
        : 'Falta completar el catálogo. Puedes usar una coincidencia existente o agregar una nueva partida. Hasta terminar esa validación no se modifica la base ni los indicadores.';
    } else if (result?.error) {
      detail = 'No se guardaron cambios de esta carga. ' + String(result.error);
    }

    box.className = `mvl2111-import-result ${tone}`;
    box.innerHTML = `
      <div class="mvl2111-result-head">
        <span class="mvl2111-result-icon">${tone==='ok'?'✓':tone==='warn'?'!':'×'}</span>
        <div><small>RESULTADO DE ESTA CARGA</small><strong>${esc(title)}</strong></div>
      </div>
      <div class="mvl2111-result-grid">
        <div><span>Archivo</span><b>${esc(fileName || '—')}</b></div>
        <div><span>Periodo(s)</span><b>${esc(periodText)}</b></div>
      </div>
      <p>${esc(detail)}</p>`;
    setPill(state, tone);
  }

  function renderNetworkFailure(fileName, err){
    const box = ensureBox();
    if (!box) return;
    box.className = 'mvl2111-import-result warn';
    box.innerHTML = `
      <div class="mvl2111-result-head"><span class="mvl2111-result-icon">?</span><div><small>RESULTADO DE ESTA CARGA</small><strong>ESTADO NO CONFIRMADO</strong></div></div>
      <div class="mvl2111-result-grid"><div><span>Archivo</span><b>${esc(fileName || '—')}</b></div><div><span>Periodo(s)</span><b>—</b></div></div>
      <p>No se recibió confirmación final del servidor. No vuelvas a cargar el archivo hasta verificar el estado. ${esc(err?.message || '')}</p>`;
    setPill('NO CONFIRMADO','warn');
  }

  function resetCurrent(){
    const box = ensureBox();
    if (box) { box.className='mvl2111-import-result hidden'; box.innerHTML=''; }
    setPill('Pendiente de carga','');
  }

  function wrapApi(){
    if (S2111.wrapped || typeof api !== 'function') return false;
    S2111.wrapped = true;
    const prev = api;
    api = async function(action, params={}){
      if (action !== 'adminImportFinish') return prev(action, params);
      const fileName = String(params?.fileName || $('performanceImportFile')?.files?.[0]?.name || '');
      try {
        const result = await prev(action, params);
        S2111.last = result;
        setTimeout(() => renderResult(result, fileName), 0);
        return result;
      } catch (err) {
        setTimeout(() => renderNetworkFailure(fileName, err), 0);
        throw err;
      }
    };
    return true;
  }

  function install(){
    ensureBox();
    const input = $('performanceImportFile');
    if (input && input.dataset.v2111 !== '1') {
      input.dataset.v2111='1';
      input.addEventListener('change', resetCurrent);
    }
    const periodLabel = $('importPeriod')?.parentElement?.querySelector('span');
    if (periodLabel) periodLabel.textContent = 'Periodo(s) detectado(s)';
  }

  function init(){ wrapApi(); install(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(init,300), {once:true});
  else setTimeout(init,300);
  const timer = setInterval(() => { wrapApi(); install(); }, 400);
  setTimeout(() => clearInterval(timer), 15000);
  console.info('[MI VISUAL LIMA] V2.11.1: resultado explícito de carga activo.');
})();


/* ==========================================================
   MI VISUAL LIMA - V2.12
   CARGA UNIVERSAL POR ESTRUCTURA
   - El nombre del Excel no interviene.
   - Las columnas pueden cambiar de posición.
   - Producción exige una estructura mínima por encabezados.
   - Una base puede contener uno o varios periodos.
   - No exige FINALIZADAS para aceptar actualizaciones parciales.
   ========================================================== */
(() => {
  const S212 = { installed:false };
  const $212 = id => document.getElementById(id);
  const norm212 = value => String(value ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^A-Za-z0-9]+/g,' ').trim().toUpperCase();

  const PROD_ALIASES_212 = {
    sourceOrderCode: ['CODIGO DE ORDEN','CODIGO ORDEN','ORDEN ID','ORDENID','ID ORDEN','ORDEN'],
    crew: ['NOMBRE DE CUADRILLA','NOMBRE CUADRILLA','CUADRILLA','CUADRILLA EJECUTORA'],
    date: ['FECHA DE ATENCION','FECHA ATENCION','FECHA','F ATENCION','F. ATENCION'],
    state: ['ESTADO','ESTADO ORDEN'],
    typePartida: ['TIPO DE PARTIDA','TIPO PARTIDA','TIPO_PARTIDA','PARTIDA'],
    typeAtencion: [
      'TIPO DE ATENCION / PAQUETE DE SERVICIO','TIPO DE ATENCION/PAQUETE DE SERVICIO',
      'TIPO DE ATENCION','TIPO ATENCION','TIPO_ATENCION','PAQUETE DE SERVICIO'
    ],
    clientCode: ['COD. PEDIDO','COD PEDIDO','CODIGO DE PEDIDO','CODIGO PEDIDO','CODIGO CLIENTE','CODIGO DE CLIENTE','CODIGO DEL CLIENTE'],
    site: ['SEDE','PROVINCIA']
  };

  function matrix212(ws){
    if (!ws || !window.XLSX?.utils) return [];
    return XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:true});
  }
  function dateIso212(value){
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return `${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,'0')}-${String(value.getDate()).padStart(2,'0')}`;
    }
    if (typeof value === 'number' && window.XLSX?.SSF?.parse_date_code) {
      const p=XLSX.SSF.parse_date_code(value);
      if (p) return `${p.y}-${String(p.m).padStart(2,'0')}-${String(p.d).padStart(2,'0')}`;
    }
    const t=String(value??'').trim();
    let m=t.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
    if(m)return `${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`;
    m=t.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/);
    if(m)return `${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;
    return '';
  }
  function find212(headers, aliases){
    const wanted=(aliases||[]).map(norm212);
    for(let i=0;i<headers.length;i++) if(wanted.includes(headers[i])) return i;
    return -1;
  }
  function indexes212(headers){
    const out={};
    Object.keys(PROD_ALIASES_212).forEach(k=>out[k]=find212(headers,PROD_ALIASES_212[k]));
    return out;
  }
  function missingRequired212(indexes){
    const labels={sourceOrderCode:'Código de Orden',crew:'Cuadrilla',date:'Fecha',state:'Estado',typePartida:'Tipo de Partida'};
    return Object.keys(labels).filter(k=>indexes[k]<0).map(k=>labels[k]);
  }

  function detectImportSheet212(workbook){
    let best=null;
    let bestMissing=['Código de Orden','Cuadrilla','Fecha','Estado','Tipo de Partida'];
    for(const name of workbook.SheetNames||[]){
      const rows=matrix212(workbook.Sheets[name]);
      for(let r=0;r<Math.min(40,rows.length);r++){
        const headers=(rows[r]||[]).map(norm212);
        const indexes=indexes212(headers);
        const missing=missingRequired212(indexes);
        const optional=['typeAtencion','clientCode','site'].filter(k=>indexes[k]>=0).length;
        const score=(5-missing.length)*10+optional;
        if(!best || score>best.score || (score===best.score && rows.length>best.rows.length)){
          best={name,rows,headerRow:r,headers,indexes,score,missing};
          bestMissing=missing;
        }
        if(!missing.length && optional>=1) break;
      }
    }
    if(!best || best.missing.length){
      throw new Error(`ESTRUCTURA NO RECONOCIDA. Faltan: ${(bestMissing.length?bestMissing:['Código de Orden','Cuadrilla','Fecha','Estado','Tipo de Partida']).join(' · ')}. No se registró ningún dato.`);
    }
    return best;
  }

  function extractImportRecords212(selection){
    const {rows,headerRow,indexes}=selection;
    const records=[];
    let omitted=0;
    for(let i=headerRow+1;i<rows.length;i++){
      const row=rows[i]||[];
      if(!row.some(v=>String(v??'').trim()!=='')) continue;
      const sourceOrderCode=String(row[indexes.sourceOrderCode]??'').replace(/\.0+$/,'').trim();
      const date=dateIso212(row[indexes.date]);
      const crew=String(row[indexes.crew]??'').trim();
      const state=String(row[indexes.state]??'').trim();
      const typePartida=String(row[indexes.typePartida]??'').trim();
      if(!sourceOrderCode || !date || !crew || !state || !typePartida){ omitted++; continue; }
      records.push({
        rowNumber:i+1, sourceOrderCode, date, crew, state, typePartida,
        typeAtencion:indexes.typeAtencion>=0?String(row[indexes.typeAtencion]??'').trim():'',
        clientCode:indexes.clientCode>=0?String(row[indexes.clientCode]??'').replace(/\.0+$/,'').trim():'',
        site:indexes.site>=0?String(row[indexes.site]??'').trim():''
      });
    }
    if(!records.length) throw new Error('ESTRUCTURA CORRECTA, pero no se encontraron filas válidas con Código de Orden, Cuadrilla, Fecha, Estado y Tipo de Partida.');
    const periods=[...new Set(records.map(r=>r.date.slice(0,7)))].filter(p=>/^\d{4}-\d{2}$/.test(p)).sort();
    if(!periods.length) throw new Error('No se pudo detectar ningún periodo a partir de la columna Fecha.');
    const finalized=records.filter(r=>norm212(r.state)==='FINALIZADA').length;
    const dates=records.map(r=>r.date).sort();
    return {
      records, omitted, finalized,
      cutoff:dates[dates.length-1],
      periods,
      latestPeriod:periods[periods.length-1],
      // Compatibilidad con el núcleo V1.8: este valor solo se usa para pantalla/confirmación.
      period:periods.join(' · '),
      structure:'PRODUCCION'
    };
  }

  function importColumnDescription212(indexes){
    const labels=[
      ['Código Orden','sourceOrderCode'],['Cuadrilla','crew'],['Fecha','date'],['Estado','state'],['Tipo de Partida','typePartida'],
      ['Cod. Pedido','clientCode'],['Tipo de Atención','typeAtencion'],['Sede','site']
    ];
    return labels.filter(([,k])=>indexes[k]>=0).map(([l,k])=>`${l}: ${indexes[k]+1}`).join(' · ');
  }

  function renderStructure212(){
    let state=null;
    try { if(typeof performanceImportState!=='undefined') state=performanceImportState; } catch(_){}
    const preview=$212('performanceImportPreview');
    if(!preview || preview.classList.contains('hidden') || !state?.records?.length) return;
    let box=$212('mvlUniversalStructure212');
    if(!box){
      box=document.createElement('div'); box.id='mvlUniversalStructure212'; box.className='mvl212-structure-ok';
      const anchor=$212('importColumnsDetected')?.parentElement || preview.firstElementChild;
      if(anchor) anchor.insertAdjacentElement('afterend',box); else preview.prepend(box);
    }
    const periods=Array.isArray(state.periods)?state.periods:[String(state.period||'')].filter(Boolean);
    box.innerHTML=`<strong>✓ ESTRUCTURA CORRECTA · PRODUCCIÓN</strong><span>Periodo(s): ${periods.join(' · ')} · ${state.records.length} filas válidas · ${state.finalized||0} finalizadas</span><small>El nombre del archivo no interviene. La APP separará los meses y actualizará por Código de Orden + periodo.</small>`;
  }

  function install212(){
    if(typeof detectImportSheet!=='function' || typeof extractImportRecords!=='function') return false;
    if(S212.installed) { renderStructure212(); return true; }
    try {
      detectImportSheet=detectImportSheet212;
      extractImportRecords=extractImportRecords212;
      if(typeof importColumnDescription==='function') importColumnDescription=importColumnDescription212;
      S212.installed=true;
      const preview=$212('performanceImportPreview');
      if(preview) new MutationObserver(()=>setTimeout(renderStructure212,0)).observe(preview,{attributes:true,childList:true,subtree:true});
      const input=$212('performanceImportFile');
      if(input) input.addEventListener('change',()=>{const b=$212('mvlUniversalStructure212'); if(b)b.remove();});
      renderStructure212();
      return true;
    } catch(err){ console.warn('[V2.12] No se pudo instalar lector universal:',err); return false; }
  }

  document.addEventListener('mvl:core-ready',()=>setTimeout(install212,0));
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(install212,500),{once:true});
  else setTimeout(install212,500);
  const timer=setInterval(()=>{if(install212()) renderStructure212();},500);
  setTimeout(()=>clearInterval(timer),20000);
  console.info('[MI VISUAL LIMA] V2.12: lector universal por estructura activo.');
})();


/* ==========================================================
   MI VISUAL LIMA - V2.13
   RESOLUCIÓN GUIADA DE HISTÓRICOS Y CATÁLOGO
   - Cuadrilla sin cruce: Histórica/Baja o Vincular existente.
   - Partida sin catálogo: usar coincidencia o crear nueva.
   - El staging del mismo Excel se conserva hasta terminar.
   ========================================================== */
(() => {
  const S213={installed:false,crews:null,catalogItems:[]};
  const $213=id=>document.getElementById(id);
  const esc213=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm213=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9]+/g,' ').trim().toUpperCase();
  const key213=v=>norm213(v).replace(/\s+/g,'');

  function token213(){try{return typeof token==='function'?token():localStorage.getItem('mvl_session_token')||'';}catch(_){return localStorage.getItem('mvl_session_token')||'';}}
  function msg213(id,text='',type='error'){try{if(typeof setMessage==='function')return setMessage(id,text,type);}catch(_){}const e=$213(id);if(e){e.textContent=text;e.classList.toggle('success-message',type==='success');}}
  function records213(){try{return performanceImportState?.records||[];}catch(_){return[];}}

  function issueInfo213(issue){
    const source=String(issue?.source||'');
    const sourceKey=key213(source);
    let period=String(issue?.period||'');
    const matches=records213().filter(r=>{
      const p=String(r.date||'').slice(0,7);
      if(!period) period=p;
      return key213(r.crew)===sourceKey && (!period || p===period);
    });
    const dates=matches.map(r=>String(r.date||'')).filter(Boolean).sort();
    return {
      ...issue, source, period,
      occurrences:Number(issue?.occurrences||matches.length||1),
      dateFrom:String(issue?.dateFrom||dates[0]||''),
      dateTo:String(issue?.dateTo||dates[dates.length-1]||'')
    };
  }

  function sim213(a,b){
    const A=norm213(a).split(' ').filter(x=>x.length>1), B=norm213(b).split(' ').filter(x=>x.length>1);
    if(!A.length||!B.length)return 0;
    const bs=new Set(B);let hit=0;A.forEach(x=>{if(bs.has(x))hit++;});
    let score=hit/Math.max(A.length,B.length);
    const ka=key213(a),kb=key213(b);if(ka&&kb&&(ka.includes(kb)||kb.includes(ka)))score+=.35;
    return Math.min(1,score);
  }
  function crewLabel213(c){return `${c.code||''} ${c.platform||''} · ${c.name||c.id||''}`.trim();}
  function crewOptions213(source,crews){
    return (crews||[]).map(c=>({...c,_score:sim213(source,`${c.code||''} ${c.platform||''} ${c.name||''}`)}))
      .sort((a,b)=>b._score-a._score||crewLabel213(a).localeCompare(crewLabel213(b),'es',{numeric:true}));
  }

  async function loadCrewOptions213(){
    if(S213.crews)return S213.crews;
    const r=await api('adminCatalogs',{token:token213()});
    if(!r?.ok)throw new Error(r?.error||'No se pudieron consultar las cuadrillas existentes.');
    S213.crews=r.crews||[];return S213.crews;
  }

  async function showCrewResolution213(result){
    const panel=$213('missingCrewPanel'),list=$213('missingCrewList');if(!panel||!list)return;
    $213('missingCatalogPanel')?.classList.add('hidden');
    const issues=(result?.crewIssues||[]).map(issueInfo213);
    const crews=await loadCrewOptions213();
    $213('missingCrewSummary').textContent=`Se detectaron ${issues.length} identidad(es) de cuadrilla que no pueden cruzarse con seguridad. Regístralas como Histórica/Baja para que cuenten en la producción general, o vincúlalas a una cuadrilla existente.`;
    list.innerHTML=issues.map((it,i)=>{
      const opts=crewOptions213(it.source,crews);
      return `<article class="missing-catalog-item mvl213-crew-item" data-crew-index="${i}" data-source="${esc213(it.source)}" data-period="${esc213(it.period)}">
        <div class="missing-catalog-title"><div><strong>${esc213(it.source)}</strong><small>${esc213(it.period||'Periodo no confirmado')} · ${it.occurrences} registro(s) · ${esc213(it.dateFrom||'—')} a ${esc213(it.dateTo||'—')}</small></div><span class="catalog-item-number">${i+1}</span></div>
        <div class="mvl213-resolution-grid">
          <label>Qué hacer<select data-field="crewAction"><option value="HISTORICO">Registrar como Histórica / Baja</option><option value="VINCULAR">Vincular con cuadrilla existente</option></select></label>
          <label class="mvl213-target-wrap hidden">Cuadrilla existente<select data-field="targetCrewId"><option value="">Seleccionar coincidencia</option>${opts.map(c=>`<option value="${esc213(c.id)}">${esc213(crewLabel213(c))}</option>`).join('')}</select></label>
        </div>
        <p class="mvl213-hint">Histórica/Baja: contará en Producción, Efectividad y Recableado del periodo, pero no se atribuirá a un bono de supervisor hasta que exista una vinculación.</p>
      </article>`;
    }).join('');
    list.querySelectorAll('[data-field="crewAction"]').forEach(sel=>sel.onchange=()=>{
      const card=sel.closest('[data-crew-index]');const wrap=card.querySelector('.mvl213-target-wrap');const target=card.querySelector('[data-field="targetCrewId"]');
      const link=sel.value==='VINCULAR';wrap.classList.toggle('hidden',!link);target.required=link;
    });
    panel.classList.remove('hidden');panel.scrollIntoView({behavior:'smooth',block:'start'});
    msg213('performanceImportMessage','Carga pendiente: resuelve las cuadrillas encontradas. Todavía no se registró ningún cambio.');
  }

  function collectCrewResolutions213(){
    return [...document.querySelectorAll('#missingCrewList [data-crew-index]')].map((card,i)=>{
      const action=card.querySelector('[data-field="crewAction"]').value;
      const targetCrewId=card.querySelector('[data-field="targetCrewId"]').value;
      if(action==='VINCULAR'&&!targetCrewId)throw new Error(`Cuadrilla ${i+1}: selecciona la cuadrilla existente.`);
      return {source:card.dataset.source,period:card.dataset.period,action,targetCrewId};
    });
  }

  async function saveCrewAndContinue213(){
    let state=null;try{state=performanceImportState;}catch(_){}
    if(!state?.importId){msg213('crewSaveMessage','La carga temporal ya no está disponible. Vuelve a leer el Excel.');return;}
    let items;try{items=collectCrewResolutions213();}catch(e){msg213('crewSaveMessage',e.message);return;}
    const b=$213('saveCrewAndContinueButton'),loading=$213('crewSaveLoading'),progress=$213('crewSaveProgressText');
    b.disabled=true;loading.classList.remove('hidden');progress.textContent='Guardando resoluciones…';msg213('crewSaveMessage');
    try{
      const r=await api('adminImportCrewResolve',{token:token213(),importId:state.importId,items:JSON.stringify(items),fileName:state.file?.name||''});
      if(!r?.ok)throw new Error(r?.error||'No se pudieron resolver las cuadrillas.');
      msg213('crewSaveMessage',r.message||'Cuadrillas resueltas.','success');
      progress.textContent='Reprocesando el mismo Excel…';
      const finish=await api('adminImportFinish',{token:token213(),importId:state.importId,fileName:state.file?.name||''});
      await handleFinish213(finish);
    }catch(e){msg213('crewSaveMessage',e.message||'No se pudo continuar.');}
    finally{b.disabled=false;loading.classList.add('hidden');progress.textContent='Guardando cuadrillas…';}
  }

  async function catalogMeta213(){
    const r=await api('adminCatalogMeta',{token:token213()});
    if(!r?.ok)throw new Error(r?.error||'No se pudo consultar el catálogo.');
    S213.catalogItems=r.catalogItems||[];return r;
  }
  function catalogOptions213(type,items){return (items||[]).map(x=>({...x,_score:sim213(type,x.type)})).sort((a,b)=>b._score-a._score||String(a.type).localeCompare(String(b.type),'es'));}
  function fillCatalogFromMatch213(card,item){
    const set=(f,v)=>{const el=card.querySelector(`[data-field="${f}"]`);if(!el)return;if(el.type==='checkbox')el.checked=!!v;else el.value=v??'';};
    if(!item)return;
    set('code',item.code);set('platform',item.platform);set('points',item.points);set('group',item.group);set('amount',item.amount);set('isRecable',item.isRecable);
    set('observation',`Configuración tomada por coincidencia de: ${item.type}`);
  }
  function clearCatalogNew213(card){['code','platform','points','group','amount','observation'].forEach(f=>{const e=card.querySelector(`[data-field="${f}"]`);if(e)e.value='';});const c=card.querySelector('[data-field="isRecable"]');if(c)c.checked=false;}

  async function showMissingCatalog213(result){
    const missing=result?.missingCatalog||[];if(!missing.length)return;
    const meta=await catalogMeta213();
    const platforms=(meta.platforms||[]).length?meta.platforms:['POSVENTA','VISITA TECNICA','INSTALACION'];
    $213('catalogGroupOptions').innerHTML=(meta.groups||[]).map(g=>`<option value="${esc213(g)}"></option>`).join('');
    $213('missingCatalogSummary').textContent=`Se detectaron ${missing.length} partida(s) FINALIZADA(s) sin coincidencia exacta. Puedes reutilizar una configuración existente o crear una nueva.`;
    $213('missingCatalogList').innerHTML=missing.map((item,index)=>{
      const opts=catalogOptions213(item.typePartida,S213.catalogItems);const best=opts[0];const useMatch=best&&best._score>=.42;
      return `<article class="missing-catalog-item" data-catalog-index="${index}">
        <div class="missing-catalog-title"><div><strong>${esc213(item.typePartida||'')}</strong><small>${Number(item.occurrences||0)} orden(es) FINALIZADA(s)${item.periods?.length?` · ${esc213(item.periods.join(' · '))}`:''}</small></div><span class="catalog-item-number">${index+1}</span></div>
        <input type="hidden" data-field="typePartida" value="${esc213(item.typePartida||'')}">
        <div class="mvl213-catalog-choice">
          <label>Resolución<select data-field="catalogMode"><option value="MATCH" ${useMatch?'selected':''}>Usar coincidencia existente</option><option value="NEW" ${useMatch?'':'selected'}>Agregar como nueva partida</option></select></label>
          <label data-match-wrap>Buscar / elegir coincidencia<select data-field="matchId"><option value="">Seleccionar</option>${opts.slice(0,40).map((x,j)=>`<option value="${esc213(x.id)}" ${useMatch&&j===0?'selected':''}>${esc213(x.type)} · ${Number(x.points||0)} pts · ${esc213(x.platform||'')}</option>`).join('')}</select></label>
        </div>
        <div class="catalog-form-grid">
          <label>Código referencial<input data-field="code" placeholder="Ej. TRMESH3"></label>
          <label>Plataforma de la orden<select data-field="platform"><option value="">Seleccionar</option>${platforms.map(p=>`<option value="${esc213(p)}">${esc213(p)}</option>`).join('')}</select></label>
          <label>Puntaje<input data-field="points" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0.00"></label>
          <label>Grupo<input data-field="group" list="catalogGroupOptions" placeholder="Ej. TRASLADO"></label>
          <label>Monto interno (S/)<input data-field="amount" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0.00"></label>
          <label class="catalog-check"><input data-field="isRecable" type="checkbox"><span>Cuenta como recableado para LOS ROJO</span></label>
        </div>
        <label class="catalog-observation">Observación<input data-field="observation" placeholder="Opcional"></label>
      </article>`;
    }).join('');
    $213('missingCatalogList').querySelectorAll('[data-catalog-index]').forEach((card,index)=>{
      const source=missing[index]?.typePartida||'';const opts=catalogOptions213(source,S213.catalogItems);
      const mode=card.querySelector('[data-field="catalogMode"]'), match=card.querySelector('[data-field="matchId"]'), wrap=card.querySelector('[data-match-wrap]');
      const apply=()=>{const isMatch=mode.value==='MATCH';wrap.classList.toggle('hidden',!isMatch);if(isMatch){const it=S213.catalogItems.find(x=>String(x.id)===String(match.value))||opts[0];if(it){match.value=it.id;fillCatalogFromMatch213(card,it);}}else clearCatalogNew213(card);};
      mode.onchange=apply;match.onchange=()=>{const it=S213.catalogItems.find(x=>String(x.id)===String(match.value));if(it)fillCatalogFromMatch213(card,it);};apply();
    });
    $213('missingCrewPanel')?.classList.add('hidden');$213('missingCatalogPanel')?.classList.remove('hidden');$213('missingCatalogPanel')?.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function collectMissingCatalogItems213(){
    return [...document.querySelectorAll('.missing-catalog-item[data-catalog-index]')].map((card,index)=>{
      const get=f=>card.querySelector(`[data-field="${f}"]`);
      const typePartida=get('typePartida')?.value.trim()||'';const code=get('code')?.value.trim()||'';const platform=get('platform')?.value.trim()||'';
      const points=Number(get('points')?.value);const group=get('group')?.value.trim()||'';const amountRaw=get('amount')?.value.trim()??'';const amount=Number(amountRaw);const isRecable=!!get('isRecable')?.checked;const observation=get('observation')?.value.trim()||'';
      if(!code)throw new Error(`Partida ${index+1}: ingresa o selecciona un Código referencial.`);if(!platform)throw new Error(`Partida ${index+1}: selecciona Plataforma.`);if(!Number.isFinite(points)||points<0)throw new Error(`Partida ${index+1}: el Puntaje debe ser 0 o mayor.`);if(!group)throw new Error(`Partida ${index+1}: ingresa Grupo.`);if(amountRaw===''||!Number.isFinite(amount)||amount<0)throw new Error(`Partida ${index+1}: ingresa Monto interno.`);
      return {typePartida,code,platform,points,group,amount,isRecable,observation};
    });
  }

  async function handleFinish213(finish){
    if(!finish?.ok)throw new Error(finish?.error||'No se pudo actualizar la base.');
    if(finish.needsCrewResolution){await showCrewResolution213(finish);return;}
    if(finish.needsCatalog){await showMissingCatalog213(finish);msg213('performanceImportMessage',`${finish.message||'Faltan partidas.'} Resuélvelas y continúa.`,'success');return;}
    $213('missingCrewPanel')?.classList.add('hidden');$213('missingCatalogPanel')?.classList.add('hidden');
    if(typeof completePerformanceImportSuccess==='function')completePerformanceImportSuccess(finish);
  }

  async function sendPerformanceImport213(){
    let state=null;try{state=performanceImportState;}catch(_){}
    if(!state?.records?.length){msg213('performanceImportMessage','Primero usa “Leer y validar”.');return;}
    const button=$213('processPerformanceFileButton'),loading=$213('importLoading'),progress=$213('importProgressText');
    button.disabled=true;loading.classList.remove('hidden');$213('missingCrewPanel')?.classList.add('hidden');$213('missingCatalogPanel')?.classList.add('hidden');msg213('performanceImportMessage');msg213('catalogSaveMessage');msg213('crewSaveMessage');
    try{
      if(!state.importId){
        const start=await api('adminImportStart',{token:token213(),fileName:state.file.name,totalRows:state.records.length});if(!start?.ok)throw new Error(start?.error||'No se pudo iniciar la actualización.');state.importId=start.importId;
        const chunkSize=150,total=state.records.length;
        for(let i=0;i<total;i+=chunkSize){const chunk=state.records.slice(i,i+chunkSize);progress.textContent=`Enviando ${Math.min(i+chunk.length,total)} de ${total}…`;const r=await api('adminImportChunk',{token:token213(),importId:state.importId,chunk:JSON.stringify(chunk)});if(!r?.ok)throw new Error(r?.error||'Falló un bloque de datos.');}
      }
      progress.textContent='Validando cuadrillas y catálogo…';
      const finish=await api('adminImportFinish',{token:token213(),importId:state.importId,fileName:state.file.name});
      await handleFinish213(finish);
    }catch(e){if(state)state.importId='';msg213('performanceImportMessage',e.message||'No se pudo actualizar. No se modificaron los indicadores.');}
    finally{button.disabled=false;loading.classList.add('hidden');progress.textContent='Procesando…';}
  }

  function install213(){
    let ok=false;
    try{if(typeof sendPerformanceImport==='function'){sendPerformanceImport=sendPerformanceImport213;ok=true;}if(typeof showMissingCatalog==='function'){showMissingCatalog=showMissingCatalog213;}if(typeof collectMissingCatalogItems==='function'){collectMissingCatalogItems=collectMissingCatalogItems213;}}catch(e){console.warn('[V2.13] bindings pendientes',e);}
    const b=$213('saveCrewAndContinueButton');if(b&&!b.dataset.v213){b.dataset.v213='1';b.addEventListener('click',saveCrewAndContinue213);}
    S213.installed=ok;return ok;
  }
  document.addEventListener('mvl:core-ready',()=>setTimeout(install213,20));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install213,700),{once:true});else setTimeout(install213,700);
  const timer=setInterval(install213,450);setTimeout(()=>clearInterval(timer),20000);
  console.info('[MI VISUAL LIMA] V2.13: resolución guiada de históricos y catálogo activa.');
})();
