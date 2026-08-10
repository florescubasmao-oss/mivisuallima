/**
 * MI VISUAL LIMA - Frontend V1.11 (actualización incremental)
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
    console.error('[MI VISUAL LIMA V1.11] No se pudo cargar el núcleo V1.8.');
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
          console.warn('[V1.11] No se pudo cargar data/cuadrillas-v19.json.', err);
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
            </div>
            <div class="dashboard-v19-summary-grid">
              <article class="dashboard-v19-total-card"><span>Cuadrillas con datos</span><strong id="dashboardTotalCrewsV19">0</strong><small>alcance del usuario</small></article>
              <article class="dashboard-v19-total-card"><span>Producción total</span><strong id="dashboardTotalPointsV19">0.00 pts</strong><small id="dashboardTotalFinalizedV19">—</small></article>
              <article class="dashboard-v19-total-card"><span>Efectividad total</span><strong id="dashboardTotalEffectivenessV19">—</strong><small id="dashboardTotalEffectivenessHelpV19">Periodo seleccionado</small></article>
              <article class="dashboard-v19-total-card"><span>% Recableado total</span><strong id="dashboardTotalRecableV19">—</strong><small id="dashboardTotalRecableHelpV19">Periodo seleccionado</small></article>
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

      console.info('[MI VISUAL LIMA] Dashboard V1.11 cargado: FILTRAR + ranking al aplicar + indicadores en construcción.');
    } catch (err) {
      console.error('[MI VISUAL LIMA V1.10] Error al iniciar la mejora del Dashboard:', err);
    }
  }
})();
