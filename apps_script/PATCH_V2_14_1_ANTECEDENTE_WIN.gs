/* =========================================================
   MI VISUAL LIMA - V2.14.1
   VTR/GAR · ANTECEDENTE WIN SEGURO (SOLO APOYO A JEFATURA)

   APLICAR DESPUES DE V2.14.0.

   REGLA
   - Fuente exclusiva del antecedente: MAPA_ORDENES (base WIN cargada por Mapa Operativo).
   - DNI exacto.
   - Trabajo anterior FINALIZADO.
   - Entre 1 y 30 dias antes de la incidencia.
   - GAR: antecedente de INSTALACION.
   - VTR: antecedente de servicio reconocido.
   - Se usa el antecedente compatible mas reciente.
   - Si el antecedente mas reciente tiene mas de una cuadrilla posible, queda REVISION MANUAL.
   - El antecedente NO cambia automaticamente ESTADO_RESPONSABILIDAD.
   - Jefatura conserva la decision final: CORRESPONDE / REASIGNAR / NO_ES_GAR_VTR / ANULAR.

   SEGURIDAD
   - No modifica Produccion, Efectividad, Recableado ni SLA.
   - No crea una segunda base WIN.
   - No altera decisiones ya guardadas en VTR_GAR_GESTION.
========================================================= */

const MVL_VTR_GAR_ANT_VERSION_V2141_ = 'V2.14.1_ANTECEDENTE_WIN_30D';
const MVL_VTR_GAR_ANT_DIAS_MAX_V2141_ = 30;

function vtrGarDocumentoV2141_(value) {
  return String(value == null ? '' : value)
    .replace(/[^0-9A-Za-z]/g, '')
    .toUpperCase()
    .trim();
}

function vtrGarDiaIsoV2141_(value) {
  const d = vtrGarDateV214_(value);
  return d ? Utilities.formatDate(d, 'America/Lima', 'yyyy-MM-dd') : '';
}

function vtrGarDiasV2141_(before, after) {
  const a = vtrGarDateV214_(before);
  const b = vtrGarDateV214_(after);
  if (!a || !b) return null;
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.round((b.getTime() - a.getTime()) / dayMs);
}

// Fecha operativa del antecedente. FECHA_IMPORTACION no se usa para medir los 30 dias.
function vtrGarFechaTrabajoV2141_(row) {
  return vtrGarDateV214_(row.FECHA_FIN_VISITA) ||
    vtrGarDateV214_(row.FECHA_ULTIMO_ESTADO) ||
    vtrGarDateV214_(row.FECHA_INICIO_VISITA) ||
    vtrGarDateV214_(row.FECHA_SOLICITUD);
}

function vtrGarEsIncidenciaWinV2141_(row) {
  if (!row) return false;
  const ticket = vtrGarTicketCanonV214_(row.CODIGO_SEGUIMIENTO, row.TIPO_TRABAJO);
  const type = vtrGarTypeV214_(ticket, row.TIPO_TRABAJO);
  return type === 'GAR' || type === 'VTR';
}

function vtrGarTextoTrabajoV2141_(row) {
  return normalize_([
    row.TIPO_TRABAJO || '',
    row.PRODUCTO_ORIGEN || '',
    row.PRODUCTO_SERVICIO || '',
    row.MOTIVO_FINALIZACION || '',
    row.DETALLE || ''
  ].join(' '));
}

function vtrGarClaseAntecedenteV2141_(row) {
  if (!row) return '';
  if (vtrGarEffectiveStateV214_(row) !== 'FINALIZADA') return '';
  if (vtrGarEsIncidenciaWinV2141_(row)) return '';

  const text = vtrGarTextoTrabajoV2141_(row);
  if (!text) return '';

  if (text.indexOf('INSTALACION') >= 0) return 'INSTALACION';

  // Regla conservadora equivalente a MI VISUAL Zona Norte V477B.
  const service = /(VISITA TECNICA|AVERIA|RECABLEADO|TRASLADO|POSTVENTA|POST VENTA|POSVENTA|ULTIMA MILLA|REUBICACION|DESCARTE|MEJORA TECNOLOGICA|PATCHCORD|ASISTENCIA|CAMBIO DE ONT|MESH|WINBOX|WIN BOX|UTP|CONECTOR)/;
  return service.test(text) ? 'SERVICIO' : '';
}

function vtrGarAntecedenteManualV2141_(reason, extra) {
  return Object.assign({
    safe:false,
    status:'REVISION_MANUAL',
    proposal:'REVISION MANUAL',
    suggestedDecision:'',
    suggestedState:'',
    responsibleCrewId:'',
    responsibleCrew:'',
    orderId:'',
    date:'',
    days:null,
    workClass:'',
    workType:'',
    reason:reason || 'No se encontro un antecedente WIN suficientemente seguro.',
    criterion:'DNI exacto + FINALIZADA + 1-30 dias + tipo compatible',
    source:'MAPA_ORDENES'
  }, extra || {});
}

function vtrGarIndiceAntecedentesV2141_(db) {
  const byDni = {};

  optionalSheetRows_(db, MVL.SHEETS.MAP_ORDERS).forEach(function(row) {
    if (vtrGarEffectiveStateV214_(row) !== 'FINALIZADA') return;
    if (vtrGarEsIncidenciaWinV2141_(row)) return;

    const dni = vtrGarDocumentoV2141_(row.NUMERO_DOCUMENTO);
    if (!dni) return;

    const date = vtrGarFechaTrabajoV2141_(row);
    if (!date) return;

    const workClass = vtrGarClaseAntecedenteV2141_(row);
    if (!workClass) return;

    if (!byDni[dni]) byDni[dni] = [];
    byDni[dni].push({ row:row, date:date, ts:date.getTime(), workClass:workClass });
  });

  Object.keys(byDni).forEach(function(dni) {
    byDni[dni].sort(function(a,b){ return a.ts - b.ts; });
  });

  return byDni;
}

function vtrGarDetectarAntecedenteV2141_(incident, index, db) {
  const type = normalize_(incident && incident.type);
  if (type !== 'GAR' && type !== 'VTR') {
    return vtrGarAntecedenteManualV2141_('Tipo de incidencia no reconocido.');
  }

  const dni = vtrGarDocumentoV2141_(incident && incident.dni);
  if (!dni) return vtrGarAntecedenteManualV2141_('La incidencia WIN no tiene DNI para realizar el cruce.');

  const incidentDate = vtrGarDateV214_(incident && incident.date);
  if (!incidentDate) return vtrGarAntecedenteManualV2141_('La incidencia no tiene una fecha valida.');

  const list = (index && index[dni]) || [];
  if (!list.length) {
    return vtrGarAntecedenteManualV2141_('No existe historial FINALIZADO del mismo DNI en MAPA_ORDENES.');
  }

  const candidates = [];
  list.forEach(function(item) {
    const days = vtrGarDiasV2141_(item.date, incidentDate);
    if (days == null || days < 1 || days > MVL_VTR_GAR_ANT_DIAS_MAX_V2141_) return;
    if (type === 'GAR' && item.workClass !== 'INSTALACION') return;
    if (type === 'VTR' && item.workClass !== 'SERVICIO') return;
    candidates.push({ item:item, days:days });
  });

  if (!candidates.length) {
    return vtrGarAntecedenteManualV2141_(
      type === 'GAR'
        ? 'Sin INSTALACION WIN FINALIZADA compatible del mismo DNI entre 1 y 30 dias.'
        : 'Sin servicio WIN FINALIZADO compatible del mismo DNI entre 1 y 30 dias.'
    );
  }

  candidates.sort(function(a,b){ return b.item.ts - a.item.ts; });
  const latestDay = vtrGarDiaIsoV2141_(candidates[0].item.date);
  const latest = candidates.filter(function(c){ return vtrGarDiaIsoV2141_(c.item.date) === latestDay; });

  const crews = {};
  latest.forEach(function(c) {
    const id = clean_(c.item.row.ID_CUADRILLA);
    const label = vtrGarCrewLabelV214_(
      db,
      id,
      normalizePeriodV18_(c.item.row.PERIODO),
      clean_(c.item.row.CUADRILLA_NORMALIZADA) || clean_(c.item.row.CUADRILLA_ORIGEN) || clean_(c.item.row.CODIGO_CUADRILLA)
    );
    const key = id || normalize_(label);
    if (key) crews[key] = { id:id, label:label };
  });

  const crewKeys = Object.keys(crews);
  if (crewKeys.length !== 1) {
    return vtrGarAntecedenteManualV2141_(
      'El antecedente compatible mas reciente tiene mas de una cuadrilla posible.',
      { date:latestDay, days:candidates[0].days }
    );
  }

  const chosenCrew = crews[crewKeys[0]];
  if (!chosenCrew || !chosenCrew.label) {
    return vtrGarAntecedenteManualV2141_('No se pudo identificar de forma segura la cuadrilla del antecedente.');
  }

  const chosen = latest.find(function(c) {
    const id = clean_(c.item.row.ID_CUADRILLA);
    const label = vtrGarCrewLabelV214_(
      db,
      id,
      normalizePeriodV18_(c.item.row.PERIODO),
      clean_(c.item.row.CUADRILLA_NORMALIZADA) || clean_(c.item.row.CUADRILLA_ORIGEN) || clean_(c.item.row.CODIGO_CUADRILLA)
    );
    return (id && id === chosenCrew.id) || (!chosenCrew.id && normalize_(label) === normalize_(chosenCrew.label));
  }) || candidates[0];

  const executingId = clean_(incident.executingCrewId);
  const sameCrew = !!chosenCrew.id && !!executingId && chosenCrew.id === executingId;

  return {
    safe:true,
    status:'CANDIDATO_SEGURO',
    proposal:sameCrew ? 'PROPIA' : 'ASIGNADA',
    suggestedDecision:sameCrew ? 'CORRESPONDE' : 'REASIGNAR',
    suggestedState:sameCrew ? 'CONFIRMADO' : 'REASIGNADO',
    responsibleCrewId:chosenCrew.id,
    responsibleCrew:chosenCrew.label,
    orderId:clean_(chosen.item.row.ORDEN_ID),
    clientCode:clean_(chosen.item.row.CODIGO_CLIENTE),
    date:vtrGarDiaIsoV2141_(chosen.item.date),
    days:chosen.days,
    workClass:chosen.item.workClass,
    workType:clean_(chosen.item.row.TIPO_TRABAJO) || clean_(chosen.item.row.PRODUCTO_SERVICIO) || clean_(chosen.item.row.MOTIVO_FINALIZACION),
    reason:sameCrew
      ? 'Mismo DNI y misma cuadrilla en antecedente WIN FINALIZADO dentro de 30 dias.'
      : 'Mismo DNI con antecedente WIN FINALIZADO de otra cuadrilla dentro de 30 dias.',
    criterion:'DNI exacto + FINALIZADA + 1-30 dias + tipo compatible',
    source:'MAPA_ORDENES'
  };
}

// Enriquecimiento SOLO de lectura: no escribe la propuesta en VTR_GAR_GESTION.
const vtrGarManagementListV2141Prev_ = vtrGarManagementListV214_;
vtrGarManagementListV214_ = function(p) {
  const res = vtrGarManagementListV2141Prev_(p);
  if (!res || !res.ok) return res;

  const db = getDb_();
  const index = vtrGarIndiceAntecedentesV2141_(db);
  res.rows = (res.rows || []).map(function(row) {
    const out = Object.assign({}, row);
    out.antecedent = vtrGarDetectarAntecedenteV2141_(row, index, db);
    return out;
  });

  res.antecedentVersion = MVL_VTR_GAR_ANT_VERSION_V2141_;
  res.antecedentSource = 'MAPA_ORDENES';
  res.antecedentRule = 'DNI exacto + FINALIZADA + 1-30 dias + tipo compatible; solo sugerencia para Jefatura.';
  return res;
};

console.info('[MI VISUAL LIMA] V2.14.1: antecedente WIN 30 dias activo en modo apoyo a Jefatura.');
