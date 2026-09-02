/* =========================================================
   MI VISUAL LIMA - V2.14.4
   VTR/GAR · DEDUPLICACION RAPIDA EN BLOQUE

   CORRIGE V2.14.3:
   - Evita deleteRow() repetitivo.
   - Deduplica VTR_GAR_GESTION con una sola escritura masiva.
   - Mantiene 1 fila por PERIODO + TICKET.
   - Conserva primero decisiones de Jefatura.
   - Mantiene LockService y toda la logica V2.14.3.
   - No modifica MAPA_ORDENES ni VALIDACION_TECNICA.
========================================================= */

const MVL_VTR_GAR_FAST_VERSION_V2144_ = 'V2.14.4_VTR_GAR_DEDUP_BLOQUE';

vtrGarDedupSheetV2143_ = function(db, requestedPeriod) {
  const periodFilter = normalizePeriodV18_(requestedPeriod);
  const sh = ensureVtrGarSheetV214_(db);
  const table = sheetObjects_(sh);
  const headers = table.headers || [];
  const groups = {};
  const untouched = [];
  let duplicatedKeys = 0;
  let removed = 0;

  table.rows.forEach(function(r) {
    const period = vtrGarPeriodRowV2143_(r);
    const key = vtrGarUniqueKeyV2143_(r);
    if (periodFilter && period !== periodFilter) { untouched.push(r); return; }
    if (!key) { untouched.push(r); return; }
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });

  const deduped = [];
  Object.keys(groups).sort().forEach(function(key) {
    const rows = groups[key] || [];
    if (!rows.length) return;
    if (rows.length > 1) { duplicatedKeys++; removed += rows.length - 1; }

    let decisionWinner = null;
    let latest = null;
    rows.forEach(function(r) {
      decisionWinner = vtrGarBetterRowV2143_(decisionWinner, r);
      if (!latest || vtrGarRowTsV2143_(r) >= vtrGarRowTsV2143_(latest)) latest = r;
    });

    const merged = {};
    Object.keys(latest || {}).forEach(function(k) { if (k !== '__row') merged[k] = latest[k]; });

    const decisionFields = [
      'ESTADO_RESPONSABILIDAD','ID_CUADRILLA_RESPONSABLE','CUADRILLA_RESPONSABLE',
      'CALIFICADO_POR','PERFIL_CALIFICADOR','FECHA_CALIFICACION','OBSERVACION'
    ];
    decisionFields.forEach(function(field) {
      if (decisionWinner && decisionWinner[field] !== undefined && decisionWinner[field] !== null && String(decisionWinner[field]) !== '') {
        merged[field] = decisionWinner[field];
      }
    });

    merged.CLAVE = key;
    merged.PERIODO = vtrGarPeriodRowV2143_(latest) || key.split('|')[0];
    if (!clean_(merged.ESTADO_RESPONSABILIDAD)) merged.ESTADO_RESPONSABILIDAD = 'PENDIENTE';
    deduped.push(merged);
  });

  if (!removed) {
    return {ok:true,period:periodFilter,duplicatedKeys:0,removed:0,remaining:Math.max(0,sh.getLastRow()-1),version:MVL_VTR_GAR_FAST_VERSION_V2144_};
  }

  const finalRows = untouched.concat(deduped);
  if (sh.getLastRow() > 1) {
    sh.getRange(2,1,sh.getLastRow()-1,Math.max(sh.getLastColumn(),headers.length)).clearContent();
  }
  if (finalRows.length) {
    const matrix = finalRows.map(function(obj) {
      return headers.map(function(h) { return obj && Object.prototype.hasOwnProperty.call(obj,h) ? obj[h] : ''; });
    });
    sh.getRange(2,1,matrix.length,headers.length).setValues(matrix);
  }

  return {ok:true,period:periodFilter,duplicatedKeys:duplicatedKeys,removed:removed,remaining:finalRows.length,version:MVL_VTR_GAR_FAST_VERSION_V2144_};
};

console.info('[MI VISUAL LIMA] V2.14.4: deduplicacion VTR/GAR rapida en bloque activa.');
