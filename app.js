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
            <option value="PRODUCCION">Producción</option>
            <option value="EFECTIVIDAD">Efectividad</option>
            <option value="RECABLEADO">% Recableado</option>
            <option value="VTR_GAR">VTR / GAR · En construcción</option>
            <option value="SLA">Tiempo de gestión / SLA · En construcción</option>
            <option value="OBSERVACIONES">Observaciones · En construcción</option>`;
          if (!['PRODUCCION','EFECTIVIDAD','RECABLEADO','VTR_GAR','SLA','OBSERVACIONES'].includes(indicator.value)) {
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
          <h4>Siguientes indicadores</h4>
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
    const close = () => modal.classList.add('hidden');
    document.getElementById('closeIndicatorConfigV113')?.addEventListener('click', close);
    document.getElementById('cancelIndicatorConfigV113')?.addEventListener('click', close);
    modal.addEventListener('click', event => { if (event.target === modal) close(); });
    document.getElementById('saveIndicatorConfigV113')?.addEventListener('click', () => saveConfig113(false));
    document.getElementById('inheritIndicatorConfigV114')?.addEventListener('click', () => saveConfig113(true));
    document.getElementById('cfgVisualTypeV114')?.addEventListener('change', async event => {
      modalMessage113('Cargando metas…');
      try {
        const config = await getConfig113(true, event.target.value);
        fillConfig113(config);
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

  async function getConfig113(force = false, visualType = 'TODOS') {
    const type = visualType || 'TODOS';
    if (STATE.config && !force && STATE.configVisualType === type) return STATE.config;
    if (typeof api !== 'function') throw new Error('La conexión con el sistema todavía no está disponible.');

    const res = await api('performanceIndicatorConfigGet', {
      token: tokenSafe113(),
      visualType: type
    });
    if (!res?.ok) throw new Error(res?.error || 'No se pudieron cargar los indicadores.');
    STATE.config = res.config || null;
    STATE.configVisualType = res.config?.visualType || type;
    return STATE.config;
  }

  async function openConfig113() {
    if (!canEditIndicators113()) return;
    createModal113();
    const modal = document.getElementById('indicatorConfigModalV113');
    const selector = document.getElementById('cfgVisualTypeV114');
    if (selector) selector.value = 'TODOS';
    modal?.classList.remove('hidden');
    modalMessage113('Cargando configuración…');

    try {
      const config = await getConfig113(true, 'TODOS');
      fillConfig113(config);
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

      STATE.config = res.config || STATE.config;
      STATE.configVisualType = res.config?.visualType || visualType;
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

          if (result.indicatorConfig && !document.getElementById('indicatorConfigModalV113')?.classList.contains('hidden')) {
            // El modal controla su propio alcance; no sobrescribirlo desde el Dashboard.
          } else if (result.indicatorConfig) {
            STATE.config = result.indicatorConfig;
            STATE.configVisualType = result.indicatorConfig.visualType || 'TODOS';
          }
          window.setTimeout(refreshSemaphores113, 0);
        }

        if (
          (action === 'performanceIndicatorConfigGet' ||
           action === 'performanceIndicatorConfigSave') &&
          result?.ok &&
          result.config
        ) {
          STATE.config = result.config;
          STATE.configVisualType = result.config.visualType || STATE.configVisualType || 'TODOS';
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

    const run = () => {
      ensureIndicatorButton113();
      refreshSemaphores113();
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

    const bodyObserver = new MutationObserver(() => {
      watchModuleCards113();
      watchDashboard113();
      ensureIndicatorButton113();
    });

    bodyObserver.observe(document.body, {
      childList: true,
      subtree: true
    });

    console.info('[MI VISUAL LIMA] Frontend V1.15: metas por Tipo Visual + semáforos Crítico/Moderado/Óptimo.');
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
    const dataRows = rows.filter(r => r.hasData);
    const points = dataRows.reduce((a,r)=>a + Number(r.points || 0), 0);
    const finalized = dataRows.reduce((a,r)=>a + Number(r.finalized || 0), 0);
    const totalGeneral = dataRows.reduce((a,r)=>a + Number(r.totalGeneral || 0), 0);
    const losRojo = dataRows.reduce((a,r)=>a + Number(r.losRojo || 0), 0);
    const recables = dataRows.reduce((a,r)=>a + Number(r.recables || 0), 0);
    const target = dataRows.reduce(
      (a,r)=>a + Number(r.productionDailyTarget || 0) * Number(r.productionDays || 0),
      0
    );

    return {
      crews: dataRows.length,
      points,
      finalized,
      effectiveness: ratio116(finalized, totalGeneral),
      losRojo,
      recables,
      recablePercent: ratio116(recables, losRojo),
      productionTarget: target,
      productionRatio: ratio116(points, target)
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
    const rows = filteredRows116(false).filter(r => r.hasData);
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
      g.productionTarget += Number(row.productionDailyTarget || 0) * Number(row.productionDays || 0);
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
    if (!['PRODUCCION','EFECTIVIDAD','RECABLEADO'].includes(indicator)) return;

    const list = document.getElementById('dashboardRankingList');
    const title = document.getElementById('dashboardRankingTitle');
    const help = document.getElementById('dashboardRankingHelp');
    if (!list) return;

    const groups = aggregateSupervisors116();
    const cfg = config116();

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
