/* =========================================================
   MI VISUAL LIMA - V2.14.3
   VTR/GAR · TICKET UNICO + SINCRONIZACION CON LOCK

   APLICAR AL FINAL DEL Code.gs V2.14 ACTUAL.

   OBJETIVO
   - 1 fila por PERIODO + TICKET canonico en VTR_GAR_GESTION.
   - Limpia duplicados ya existentes conservando primero una decision de Jefatura.
   - Evita duplicados por sincronizaciones concurrentes usando LockService.
   - La sincronizacion WIN no pisa decisiones ya tomadas.
   - Listado, indicador y detalle trabajan sobre la hoja ya depurada.

   NO MODIFICA
   - MAPA_ORDENES.
   - Produccion.
   - Efectividad.
   - Recableado.
   - SLA.
   - VALIDACION_TECNICA.
========================================================= */

const MVL_VTR_GAR_UNIQUE_VERSION_V2143_ = 'V2.14.3_VTR_GAR_TICKET_UNICO';

function vtrGarPeriodRowV2143_(r) {
  const direct = normalizePeriodV18_(r && r.PERIODO);
  if (direct) return direct;
  const key = clean_(r && r.CLAVE);
  const m = key.match(/^(\d{4}-\d{2})\|/);
  return m ? m[1] : '';
}

function vtrGarUniqueKeyV2143_(r) {
  if (!r) return '';
  const ticket = vtrGarTicketCanonV214_(r.TICKET, r.TIPO);
  if (!ticket) return '';
  return (vtrGarPeriodRowV2143_(r) || 'SIN_PERIODO') + '|' + ticket;
}

function vtrGarDecisionRankV2143_(r) {
  const s = normalize_(r && r.ESTADO_RESPONSABILIDAD) || 'PENDIENTE';
  if (s === 'CONFIRMADO' || s === 'REASIGNADO') return 40;
  if (s === 'NO_ES_GAR_VTR' || s === 'ANULADO') return 30;
  if (s === 'PENDIENTE') return 10;
  return 0;
}

function vtrGarRowTsV2143_(r) {
  const values = [
    r && r.FECHA_CALIFICACION,
    r && r.FECHA_ACTUALIZACION,
    r && r.FECHA_ULTIMA_SINCRONIZACION,
    r && r.FECHA_INCIDENCIA
  ];
  let best = 0;
  values.forEach(function(v) {
    const d = vtrGarDateV214_(v);
    if (d && d.getTime() > best) best = d.getTime();
  });
  return best;
}

function vtrGarBetterRowV2143_(a, b) {
  if (!a) return b;
  if (!b) return a;
  const ra = vtrGarDecisionRankV2143_(a);
  const rb = vtrGarDecisionRankV2143_(b);
  if (ra !== rb) return rb > ra ? b : a;
  const ta = vtrGarRowTsV2143_(a);
  const tb = vtrGarRowTsV2143_(b);
  if (ta !== tb) return tb > ta ? b : a;
  return Number(b.__row || 0) > Number(a.__row || 0) ? b : a;
}

function vtrGarDedupSheetV2143_(db, requestedPeriod) {
  const periodFilter = normalizePeriodV18_(requestedPeriod);
  const sh = ensureVtrGarSheetV214_(db);
  const table = sheetObjects_(sh);
  const groups = {};

  table.rows.forEach(function(r) {
    const period = vtrGarPeriodRowV2143_(r);
    if (periodFilter && period !== periodFilter) return;
    const key = vtrGarUniqueKeyV2143_(r);
    if (!key) return;
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });

  const deleteRows = [];
  let duplicatedKeys = 0;

  Object.keys(groups).forEach(function(key) {
    const rows = groups[key];
    if (rows.length <= 1) return;
    duplicatedKeys++;

    let winner = null;
    rows.forEach(function(r) { winner = vtrGarBetterRowV2143_(winner, r); });

    // Normaliza la clave del ganador. No se alteran sus decisiones.
    try {
      updateRowFields_(sh, table, winner.__row, {
        CLAVE:key,
        PERIODO:vtrGarPeriodRowV2143_(winner) || key.split('|')[0]
      });
    } catch (_) {}

    rows.forEach(function(r) {
      if (Number(r.__row) !== Number(winner.__row)) deleteRows.push(Number(r.__row));
    });
  });

  deleteRows.sort(function(a,b){ return b-a; });
  deleteRows.forEach(function(rowNum) {
    if (rowNum > 1 && rowNum <= sh.getLastRow()) sh.deleteRow(rowNum);
  });

  const remaining = Math.max(0, sh.getLastRow() - 1);
  return {
    ok:true,
    period:periodFilter,
    duplicatedKeys:duplicatedKeys,
    removed:deleteRows.length,
    remaining:remaining,
    version:MVL_VTR_GAR_UNIQUE_VERSION_V2143_
  };
}

function vtrGarDedupTryLockV2143_(db, period, waitMs) {
  const lock = LockService.getScriptLock();
  const wait = Number(waitMs || 5000);
  let locked = false;
  try {
    locked = lock.tryLock(wait);
    if (!locked) return {ok:true,skipped:true,reason:'LOCK_BUSY',removed:0};
    return vtrGarDedupSheetV2143_(db, period);
  } finally {
    if (locked) lock.releaseLock();
  }
}

/*
 * Reemplazo seguro del sync V2.14.
 * Se usa la misma logica de deteccion de MAPA_ORDENES, pero serializada.
 */
vtrGarSyncV214_ = function(db, requestedPeriod) {
  const periodFilter = normalizePeriodV18_(requestedPeriod);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const cleanupBefore = vtrGarDedupSheetV2143_(db, periodFilter);
    const sh = ensureVtrGarSheetV214_(db);
    activateVtrGarConfigV214_(db);
    let table = sheetObjects_(sh);
    const groups = vtrGarMapGroupsV214_(db);
    const validations = vtrGarLatestValidationMapV214_(db);
    const existingByKey = {};

    table.rows.forEach(function(r) {
      const key = vtrGarUniqueKeyV2143_(r);
      if (!key) return;
      const prev = existingByKey[key];
      existingByKey[key] = vtrGarBetterRowV2143_(prev, r);
    });

    const now = new Date();
    let inserted = 0;
    let updated = 0;
    let detected = 0;

    Object.keys(groups).sort().forEach(function(ticket) {
      const g = groups[ticket];
      if (periodFilter && g.period !== periodFilter) return;
      detected++;

      const exec = g.executionItem ? g.executionItem.row : {};
      const validation = validations[ticket] || null;
      const key = (g.period || 'SIN_PERIODO') + '|' + ticket;
      const existing = existingByKey[key] || null;
      const execId = clean_(exec.ID_CUADRILLA);
      const execFallback = clean_(exec.CUADRILLA_NORMALIZADA) || clean_(exec.CUADRILLA_ORIGEN) || clean_(exec.CODIGO_CUADRILLA);
      const execLabel = vtrGarCrewLabelV214_(db, execId, g.period, execFallback);
      const incidentIso = g.incidentDate
        ? Utilities.formatDate(g.incidentDate, 'America/Lima', 'yyyy-MM-dd')
        : '';

      const fields = {
        CLAVE:key,
        PERIODO:g.period,
        FECHA_INCIDENCIA:incidentIso,
        TIPO:g.type,
        TICKET:ticket,
        DNI:clean_(exec.NUMERO_DOCUMENTO),
        CODIGO_CLIENTE:clean_(exec.CODIGO_CLIENTE),
        ORDENES:g.orders.join(' | '),
        ID_CUADRILLA_EJECUTORA:execId,
        CUADRILLA_EJECUTORA:execLabel,
        ESTADO_WIN:g.state,
        REGISTRO_TECNICO:validation ? 'REGISTRADA' : 'NO_REGISTRADA',
        VALIDACION_ID:validation ? validation.id : '',
        ESTADO_REGISTRO_TECNICO:validation ? validation.state : 'SIN_REGISTRO',
        BONO_TECNICO:validation ? validation.result : 'SIN_REGISTRO',
        FECHA_ULTIMA_SINCRONIZACION:now,
        FECHA_ACTUALIZACION:now
      };

      if (existing) {
        // Nunca se pisan los campos de responsabilidad/calificacion.
        updateRowFields_(sh, table, existing.__row, fields);
        updated++;
      } else {
        fields.ESTADO_RESPONSABILIDAD = 'PENDIENTE';
        fields.ID_CUADRILLA_RESPONSABLE = '';
        fields.CUADRILLA_RESPONSABLE = '';
        fields.CALIFICADO_POR = '';
        fields.PERFIL_CALIFICADOR = '';
        fields.FECHA_CALIFICACION = '';
        fields.OBSERVACION = '';
        appendObjectRow_(sh, table.headers, fields);
        inserted++;
      }
    });

    const cleanupAfter = vtrGarDedupSheetV2143_(db, periodFilter);

    return {
      ok:true,
      period:periodFilter,
      detected:detected,
      inserted:inserted,
      updated:updated,
      duplicatesRemoved:Number(cleanupBefore.removed || 0) + Number(cleanupAfter.removed || 0),
      uniqueRows:cleanupAfter.remaining,
      syncedAt:formatDateTimeLimaV200_(now),
      version:MVL_VTR_GAR_UNIQUE_VERSION_V2143_
    };
  } finally {
    lock.releaseLock();
  }
};

/* Listado: si se pide solo lectura, igual depura de forma defensiva. */
const vtrGarManagementListV2143Prev_ = vtrGarManagementListV214_;
vtrGarManagementListV214_ = function(p) {
  if (String(p && p.sync || '') === '0') {
    try {
      const auth0 = requireVtrGarV214_(p.token, false);
      if (auth0 && auth0.ok) vtrGarDedupTryLockV2143_(auth0.db, p.period, 5000);
    } catch (_) {}
  }

  const res = vtrGarManagementListV2143Prev_(p);
  if (!res || !res.ok) return res;

  // Defensa adicional en memoria: nunca devolver dos veces el mismo periodo+ticket.
  const seen = {};
  res.rows = (res.rows || []).filter(function(r) {
    const ticket = vtrGarTicketCanonV214_(r.ticket, r.type);
    const key = (normalizePeriodV18_(r.period) || res.period || 'SIN_PERIODO') + '|' + ticket;
    if (!ticket || seen[key]) return false;
    seen[key] = true;
    return true;
  });

  const summary = {total:0,finalized:0,pending:0,counting:0,registered:0,gar:0,vtr:0};
  res.rows.forEach(function(r) {
    summary.total++;
    if (normalize_(r.winState) === 'FINALIZADA') summary.finalized++;
    if ((normalize_(r.responsibilityState) || 'PENDIENTE') === 'PENDIENTE') summary.pending++;
    if (r.counts) summary.counting++;
    if (normalize_(r.registration) === 'REGISTRADA') summary.registered++;
    if (normalize_(r.type) === 'GAR') summary.gar++;
    if (normalize_(r.type) === 'VTR') summary.vtr++;
  });
  res.summary = summary;
  res.uniqueVersion = MVL_VTR_GAR_UNIQUE_VERSION_V2143_;
  return res;
};

/* Antes de decidir, se asegura que haya una sola fila del ticket. */
const vtrGarDecisionV2143Prev_ = vtrGarDecisionV214_;
vtrGarDecisionV214_ = function(p) {
  try {
    const auth = requireVtrGarV214_(p.token, true);
    if (auth && auth.ok) vtrGarDedupTryLockV2143_(auth.db, p.period, 5000);
  } catch (_) {}
  return vtrGarDecisionV2143Prev_(p);
};

/* Indicadores: depuracion defensiva antes de leer VTR_GAR_GESTION. */
const vtrGarStatsByCrewV2143Prev_ = vtrGarStatsByCrewV214_;
vtrGarStatsByCrewV214_ = function(db, period) {
  try { vtrGarDedupTryLockV2143_(db, period, 3000); } catch (_) {}
  return vtrGarStatsByCrewV2143Prev_(db, period);
};

const performanceIndicatorDetailV2143Prev_ = performanceIndicatorDetailV204_;
performanceIndicatorDetailV204_ = function(token, period, requestedCrewId, indicatorValue) {
  const indicator = normalize_(indicatorValue || '').replace(/\s+/g,'_');
  if (indicator === 'VTR_GAR') {
    try {
      const auth = requirePerformance_(token);
      if (auth && auth.ok) vtrGarDedupTryLockV2143_(auth.db, period, 3000);
    } catch (_) {}
  }
  return performanceIndicatorDetailV2143Prev_(token, period, requestedCrewId, indicatorValue);
};

/* Endpoint opcional de mantenimiento manual. */
const doPostV2143Prev_ = doPost;
doPost = function(e) {
  try {
    const p = e && e.parameter ? e.parameter : {};
    const action = String(p.action || '').trim();
    if (action === 'vtrGarRepair') {
      const auth = requireVtrGarV214_(p.token, true);
      if (!auth.ok) return json_(auth);
      const cleanup = vtrGarDedupTryLockV2143_(auth.db, p.period, 10000);
      const sync = vtrGarSyncV214_(auth.db, p.period);
      return json_({ok:true,cleanup:cleanup,sync:sync,version:MVL_VTR_GAR_UNIQUE_VERSION_V2143_});
    }
    return doPostV2143Prev_(e);
  } catch (err) {
    console.error('[V2.14.3] VTR/GAR unico:', err);
    return json_({ok:false,error:'Error al depurar VTR/GAR.',detail:String(err && err.message ? err.message : err)});
  }
};

console.info('[MI VISUAL LIMA] V2.14.3: VTR/GAR ticket unico + LockService activo.');
