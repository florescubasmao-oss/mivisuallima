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

  const MVL_CORE_V18 =
    'https://cdn.jsdelivr.net/gh/florescubasmao-oss/mivisuallima@8f08004a72c45a7eda063aca6e64eb2ce1d3fe92/app.js';

  const core = document.createElement('script');
  core.src = MVL_CORE_V18;
  core.async = false;
  core.onload = () => window.setTimeout(iniciarDashboardV19, 0);
  core.onerror = () => {
    const loaderText = document.getElementById('loaderText');
    if (loaderText) {
      loaderText.textContent = 'No se pudo cargar el núcleo V1.8. Verifica la conexión e inténtalo nuevamente.';
    }
    console.error('[MI VISUAL LIMA V1.12] No se pudo cargar el núcleo V1.8.');
  };
  document.head.appendChild(core);

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
              <article class="dashboard-v19-total-card under-construction"><span>Observaciones</span><strong>En construcción</strong><small>Pendiente de integrar fuente y regla de cálculo</small></article>
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
            <option value="SLA">Tiempo de gestión / SLA · En construcción</option>
            <option value="OBSERVACIONES">Observaciones · En construcción</option>`;
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
            if (indicator === 'PRODUCCION' || indicator === 'EFECTIVIDAD') return bv - av;
            // % Recableado es indicador negativo: menor porcentaje primero.
            if (indicator === 'RECABLEADO') return av - bv;
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
          SLA: { label: 'Tiempo de gestión / SLA', help: 'Indicador considerado para una siguiente etapa.', construction: true },
          OBSERVACIONES: { label: 'Observaciones', help: 'Indicador considerado para una siguiente etapa.', construction: true }
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
                  <div class="kpi-building"><span>Observaciones</span><b>En construcción</b></div>
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
            : valorPorcentaje(value == null || value === '' ? null : Number(value));
          let detail = '';
          if (indicator === 'PRODUCCION') detail = `${Number(r.finalized || 0)} finalizadas`;
          if (indicator === 'EFECTIVIDAD') {
            const total = Number(pick(r,'totalGeneral','total','ordersTotal')) || 0;
            detail = total ? `${Number(r.finalized || 0)} finalizadas de ${total}` : '';
          }
          if (indicator === 'RECABLEADO') detail = `${Number(r.losRojo || 0)} LOS ROJO · ${Number(r.recables || 0)} recableados`;
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
      return;
    }

    if (existing) return;

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
          action === 'adminImportFinish' ||
          action === 'adminCreateCrew' ||
          action === 'adminUpdateCrew' ||
          action === 'adminReplaceCrewTechnician' ||
          action === 'adminCatalogCreateBatch'
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
