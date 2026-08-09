/**
 * MI VISUAL LIMA - Frontend V1.4
 * Login + Administración + Mi Desempeño
 */

const API_URL = 'https://script.google.com/macros/s/AKfycbxD95mFsCWIdOjkDqA-iEVBlj3JQp-y29O6NI6sfc5YcU4LzJi2IW8E1DUkAjRmsPuG/exec';
const TOKEN_KEY = 'mvl_session_token';

const $ = (id) => document.getElementById(id);

const views = {
  login: $('loginView'),
  change: $('changePasswordView'),
  home: $('homeView'),
  admin: $('adminView'),
  performance: $('performanceView')
};

let sessionData = null;
let adminCatalogs = null;
let adminUsers = [];
let adminSearchTimer = null;

function showView(name) {
  Object.values(views).filter(Boolean).forEach(v => v.classList.add('hidden'));
  if (views[name]) views[name].classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function showLoader(text = 'Cargando aplicación…') {
  const loader = $('appLoader');
  const label = $('loaderText');
  if (label) label.textContent = text;
  if (loader) loader.classList.remove('loader-hidden');
}

function hideLoader() {
  const loader = $('appLoader');
  if (loader) loader.classList.add('loader-hidden');
}

function token() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

async function api(action, params = {}) {
  if (!API_URL) throw new Error('Falta configurar API_URL.');

  const body = new URLSearchParams({ action, ...params });
  const response = await fetch(API_URL, {
    method: 'POST',
    body
  });

  if (!response.ok) throw new Error('No se pudo conectar con el servidor.');
  return response.json();
}

function setMessage(id, text = '', type = 'error') {
  const el = $(id);
  if (!el) return;
  el.textContent = text;
  el.classList.toggle('success-message', type === 'success');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function readableScope(scope) {
  const map = {
    CUADRILLA: 'Mi cuadrilla',
    CUADRILLAS_ASIGNADAS: 'Cuadrillas a cargo',
    TOTAL: 'Todas las cuadrillas',
    SIN_ALCANCE: 'Sin alcance'
  };
  return map[scope] || scope || '—';
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  sessionData = null;
  adminCatalogs = null;
  adminUsers = [];
  $('clave').value = '';
  showView('login');
}

/* =========================
   LOGIN
   ========================= */

$('togglePassword').addEventListener('click', () => {
  const input = $('clave');
  const visible = input.type === 'text';
  input.type = visible ? 'password' : 'text';
  $('togglePassword').textContent = visible ? 'Ver' : 'Ocultar';
});

$('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  setMessage('loginMessage');
  $('loginButton').disabled = true;

  try {
    const usuario = $('usuario').value.trim();
    const clave = $('clave').value;

    const data = await api('login', { usuario, clave });

    if (!data.ok) {
      setMessage('loginMessage', data.error || 'No se pudo ingresar.');
      return;
    }

    localStorage.setItem(TOKEN_KEY, data.token);
    sessionData = data;

    if (data.mustChangePassword) {
      $('actual').value = clave;
      showView('change');
    } else {
      renderHome(data);
    }
  } catch (err) {
    setMessage('loginMessage', err.message || 'Error de conexión.');
  } finally {
    $('loginButton').disabled = false;
  }
});

$('changePasswordForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  setMessage('changeMessage');

  const actual = $('actual').value;
  const nueva = $('nueva').value;
  const repetir = $('repetir').value;

  if (nueva !== repetir) {
    setMessage('changeMessage', 'Las contraseñas nuevas no coinciden.');
    return;
  }

  try {
    const data = await api('changePassword', {
      token: token(),
      claveActual: actual,
      claveNueva: nueva
    });

    if (!data.ok) {
      setMessage('changeMessage', data.error || 'No se pudo cambiar la contraseña.');
      return;
    }

    const fresh = await api('session', { token: token() });
    if (!fresh.ok) return clearSession();

    renderHome(fresh);
  } catch (err) {
    setMessage('changeMessage', err.message || 'Error de conexión.');
  }
});

$('logoutButton').addEventListener('click', async () => {
  try {
    if (token()) await api('logout', { token: token() });
  } catch (_) {}
  clearSession();
});

/* =========================
   HOME
   ========================= */

function renderHome(data) {
  sessionData = data;

  $('userName').textContent = data.user?.name || data.user?.id || 'Usuario';
  $('userProfile').textContent = data.user?.profile || '';
  $('scopeType').textContent = readableScope(data.scope?.type);
  $('crewCount').textContent = data.scope?.totalCrews ?? 0;

  const includesGG = (data.scope?.crews || []).some(c => c.directManagement);
  $('ggNotice').classList.toggle('hidden', !includesGG);

  const modules = data.modules || [];
  $('moduleList').innerHTML = modules.length
    ? modules.map(moduleCard).join('')
    : '<p class="empty">No hay módulos habilitados.</p>';

  showView('home');
}

function moduleCard(m) {
  const isAdmin = m.module === 'Administración';
  const isPerformance = m.module === 'Mi Desempeño';

  const enabled =
    (isAdmin && m.permissions?.administrar) ||
    (isPerformance && m.permissions?.ver);

  let subtitle = 'Próxima etapa';
  if (isAdmin && enabled) subtitle = 'Gestionar personal y datos';
  if (isPerformance && enabled) subtitle = 'Ver indicadores';

  return `
    <button
      class="module-card ${enabled ? 'module-active' : ''}"
      type="button"
      data-module="${escapeHtml(m.module)}"
      ${enabled ? '' : 'disabled'}
    >
      <span class="module-icon">${moduleIcon(m.module)}</span>
      <span class="module-copy">
        <strong>${escapeHtml(m.module)}</strong>
        <small>${subtitle}</small>
      </span>
      <span class="module-arrow">${enabled ? '›' : ''}</span>
    </button>
  `;
}

function moduleIcon(name) {
  const icons = {
    'Mapa Operativo': '⌖',
    'Mi Desempeño': '↗',
    'Observaciones': '!',
    'Validación Técnica': '✓',
    'Gestión de Actas': '▤',
    'Actividad en Campo': '◎',
    'Descansos Programados': '◷',
    'Checklist': '☑',
    'Administración': '⚙'
  };
  return icons[name] || '•';
}

$('moduleList').addEventListener('click', (e) => {
  const button = e.target.closest('[data-module]');
  if (!button || button.disabled) return;

  if (button.dataset.module === 'Administración') {
    openAdmin();
  }

  if (button.dataset.module === 'Mi Desempeño') {
    openPerformance();
  }
});

$('backHomeButton').addEventListener('click', () => {
  if (sessionData) renderHome(sessionData);
  else restoreSession();
});

$('backHomePerformanceButton').addEventListener('click', () => {
  if (sessionData) renderHome(sessionData);
  else restoreSession();
});

/* =========================
   ADMINISTRACIÓN
   ========================= */

let adminActiveTab = 'users';

async function openAdmin() {
  showView('admin');
  showLoader('Cargando administración…');
  setMessage('adminMessage');

  try {
    await refreshAdminCatalogs();
    fillAdminSelectors();
    setAdminTab('users');
    await loadUsers();
  } catch (err) {
    setMessage('adminMessage', err.message || 'No se pudo abrir Administración.');
  } finally {
    hideLoader();
  }
}

async function refreshAdminCatalogs() {
  const cat = await api('adminCatalogs', { token: token() });
  if (!cat.ok) {
    if (cat.expired) return clearSession();
    throw new Error(cat.error || 'No se pudieron cargar los catálogos.');
  }
  adminCatalogs = cat;
  return cat;
}

function fillAdminSelectors() {
  const profiles = adminCatalogs?.profiles || [];
  const supervisors = adminCatalogs?.supervisors || [];

  const profileOptions = profiles
    .map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`)
    .join('');

  $('profileFilter').innerHTML = '<option value="">Todos los perfiles</option>' + profileOptions;
  $('fPerfil').innerHTML = '<option value="">Seleccionar perfil</option>' + profileOptions;

  const staffProfiles = profiles.filter(p => {
    const n = normalizeText(p);
    return n !== 'TECNICO' && n !== 'SUPERVISOR';
  });
  $('npPerfil').innerHTML = '<option value="">Seleccionar perfil</option>' +
    staffProfiles.map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('');

  const supervisorOptions =
    '<option value="">Seleccionar supervisor</option>' +
    supervisors.map(s => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.name)}${s.code ? ` · ${escapeHtml(s.code)}` : ''}</option>`).join('') +
    '<option value="__GG__">GG / Supervisión directa de Gerencia</option>';

  $('ncSupervisor').innerHTML = supervisorOptions;
  $('ecSupervisor').innerHTML = supervisorOptions;
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
}

function setAdminTab(tab) {
  adminActiveTab = tab;
  const users = tab === 'users';
  const crews = tab === 'crews';
  const data = tab === 'data';

  $('usersPanel').classList.toggle('hidden', !users);
  $('crewsPanel').classList.toggle('hidden', !crews);
  $('dataPanel').classList.toggle('hidden', !data);

  $('usersTabButton').classList.toggle('active', users);
  $('crewsTabButton').classList.toggle('active', crews);
  $('dataTabButton').classList.toggle('active', data);

  if (crews) renderCrews();
  if (data) loadDataStatus();
}

$('usersTabButton').addEventListener('click', () => setAdminTab('users'));
$('crewsTabButton').addEventListener('click', () => setAdminTab('crews'));
$('dataTabButton').addEventListener('click', () => setAdminTab('data'));
$('dataUpdateButton').addEventListener('click', () => setAdminTab('data'));

function setUsersBusy(busy) {
  const button = $('searchUsersButton');
  const loading = $('usersLoading');
  if (button) {
    button.disabled = busy;
    button.textContent = busy ? 'Buscando…' : 'Buscar';
  }
  if (loading) loading.classList.toggle('hidden', !busy);
}

async function loadUsers() {
  setMessage('adminMessage');
  setUsersBusy(true);

  try {
    const data = await api('adminUsersList', {
      token: token(),
      search: $('userSearch').value.trim(),
      dni: $('dniFilter').value.trim(),
      profile: $('profileFilter').value,
      status: $('statusFilter').value
    });

    if (!data.ok) {
      if (data.expired) return clearSession();
      throw new Error(data.error || 'No se pudieron cargar los usuarios.');
    }

    adminUsers = data.users || [];
    renderUsers(adminUsers, data.summary || {});
  } finally {
    setUsersBusy(false);
  }
}

function renderUsers(users, summary) {
  $('statTotal').textContent = summary.total ?? users.length;
  $('statActive').textContent = summary.active ?? users.filter(u => u.status === 'ACTIVO').length;
  $('statNoAccess').textContent = summary.withoutAccess ?? users.filter(u => !u.hasAccess).length;
  $('userResultCount').textContent = `${users.length} usuario${users.length === 1 ? '' : 's'}`;

  if (!users.length) {
    $('usersList').innerHTML = '<p class="empty">No se encontraron usuarios con esos filtros.</p>';
    return;
  }

  $('usersList').innerHTML = users.map(userCard).join('');
}

function userCard(u) {
  const accessClass = u.hasAccess ? 'ok' : 'neutral';
  const accessText = u.hasAccess ? 'Con acceso' : 'Sin acceso';
  const tech = normalizeText(u.profile) === 'TECNICO';

  const assignment = tech && u.assignedCrewCode
    ? `<div class="assignment-strong">${escapeHtml(u.assignedCrewCode)} · ${escapeHtml(u.assignedCrewPlatform || 'SIN PLATAFORMA')}</div>`
    : `<div class="assignment-strong">${escapeHtml(u.crewSummary || 'Alcance según perfil')}</div>`;

  const supervisionBadge = tech
    ? `<span class="supervision-pill ${u.directManagement ? 'gg' : ''}">${escapeHtml(u.directManagement ? 'GG' : (u.assignedSupervisorName || 'Sin supervisor'))}</span>`
    : '';

  return `
    <article class="user-card">
      <div class="user-main">
        <div class="user-title-row">
          <div>
            <strong class="person-name">${escapeHtml(u.name || 'Sin nombre')}</strong>
            <div class="user-meta">
              ${u.dni ? `<span>DNI ${escapeHtml(u.dni)}</span>` : ''}
              ${u.username ? `<span>@${escapeHtml(u.username)}</span>` : ''}
              <span>${escapeHtml(u.id)}</span>
            </div>
          </div>
          <span class="status-pill ${u.status === 'ACTIVO' ? 'active' : 'inactive'}">${escapeHtml(u.status)}</span>
        </div>

        <div class="assignment-row">
          ${assignment}
          ${supervisionBadge}
        </div>

        <div class="user-tags">
          <span class="tag">${escapeHtml(u.profile || 'Sin perfil')}</span>
          <span class="tag ${accessClass}">${accessText}</span>
        </div>
      </div>

      <div class="user-actions">
        <button type="button" class="ghost compact" data-user-action="edit" data-user-id="${escapeHtml(u.id)}">Editar</button>
        <button type="button" class="ghost compact" data-user-action="password" data-user-id="${escapeHtml(u.id)}">Clave</button>
        <button
          type="button"
          class="${u.status === 'ACTIVO' ? 'danger-soft' : 'success-soft'} compact"
          data-user-action="status"
          data-user-id="${escapeHtml(u.id)}"
        >${u.status === 'ACTIVO' ? 'Desactivar' : 'Activar'}</button>
      </div>
    </article>
  `;
}

$('usersList').addEventListener('click', async (e) => {
  const button = e.target.closest('[data-user-action]');
  if (!button) return;

  const user = adminUsers.find(u => u.id === button.dataset.userId);
  if (!user) return;

  const action = button.dataset.userAction;

  if (action === 'edit') openUserModal(user);
  if (action === 'password') openPasswordModal(user);

  if (action === 'status') {
    const newStatus = user.status === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    const verb = newStatus === 'ACTIVO' ? 'activar' : 'desactivar';
    if (!confirm(`¿Confirmas ${verb} a ${user.name}?`)) return;

    showLoader('Actualizando usuario…');
    try {
      const result = await api('adminSetUserStatus', {
        token: token(),
        userId: user.id,
        status: newStatus
      });
      if (!result.ok) throw new Error(result.error || 'No se pudo actualizar el estado.');
      setMessage('adminMessage', result.message || 'Estado actualizado.', 'success');
      await loadUsers();
    } catch (err) {
      setMessage('adminMessage', err.message);
    } finally {
      hideLoader();
    }
  }
});

$('refreshUsersButton').addEventListener('click', () => loadUsers().catch(err => setMessage('adminMessage', err.message)));
$('searchUsersButton').addEventListener('click', () => loadUsers().catch(err => setMessage('adminMessage', err.message)));

$('clearUsersButton').addEventListener('click', () => {
  $('userSearch').value = '';
  $('dniFilter').value = '';
  $('profileFilter').value = '';
  $('statusFilter').value = '';
  loadUsers().catch(err => setMessage('adminMessage', err.message));
});

['userSearch', 'dniFilter'].forEach(id => {
  $(id).addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      loadUsers().catch(err => setMessage('adminMessage', err.message));
    }
  });
});

/* =========================
   CUADRILLAS
   ========================= */

function renderCrews() {
  const q = normalizeText($('crewSearch').value);
  const platform = normalizeText($('crewPlatformFilter').value);
  const supervision = $('crewSupervisorFilter').value;

  let crews = [...(adminCatalogs?.crews || [])];

  if (q) {
    crews = crews.filter(c => normalizeText([
      c.code, c.name, c.platform, c.supervisor,
      c.technician1, c.technician2
    ].join(' ')).includes(q));
  }

  if (platform) crews = crews.filter(c => normalizeText(c.platform) === platform);
  if (supervision === 'GG') crews = crews.filter(c => c.directManagement);

  $('crewResultCount').textContent = `${crews.length} cuadrilla${crews.length === 1 ? '' : 's'}`;

  $('crewsList').innerHTML = crews.length
    ? crews.map(crewCard).join('')
    : '<p class="empty">No se encontraron cuadrillas.</p>';
}

function crewCard(c) {
  const supervisor = c.directManagement ? 'GG' : (c.supervisor || 'Sin supervisor');
  const tech1 = c.technician1 || 'Sin técnico';
  const tech2 = c.technician2 || 'Sin segundo técnico';

  return `
    <article class="crew-admin-card">
      <div class="crew-admin-head">
        <div>
          <strong>${escapeHtml(c.code || c.id)} · ${escapeHtml(c.platform || 'SIN PLATAFORMA')}</strong>
          <p>${escapeHtml(c.name || '')}</p>
        </div>
        <span class="supervision-pill ${c.directManagement ? 'gg' : ''}">${escapeHtml(supervisor)}</span>
      </div>
      <div class="crew-tech-lines">
        <span><b>T1:</b> ${escapeHtml(tech1)}</span>
        <span><b>T2:</b> ${escapeHtml(tech2)}</span>
      </div>
      <div class="user-actions">
        <button type="button" class="ghost compact" data-crew-action="edit" data-crew-id="${escapeHtml(c.id)}">Editar cuadrilla</button>
      </div>
    </article>
  `;
}

['crewSearch', 'crewPlatformFilter', 'crewSupervisorFilter'].forEach(id => {
  $(id).addEventListener(id === 'crewSearch' ? 'input' : 'change', renderCrews);
});

$('refreshCrewsButton').addEventListener('click', async () => {
  showLoader('Actualizando cuadrillas…');
  try {
    await refreshAdminCatalogs();
    fillAdminSelectors();
    renderCrews();
  } catch (err) {
    alert(err.message || 'No se pudieron actualizar las cuadrillas.');
  } finally {
    hideLoader();
  }
});

$('crewsList').addEventListener('click', (e) => {
  const button = e.target.closest('[data-crew-action="edit"]');
  if (!button) return;
  const crew = (adminCatalogs?.crews || []).find(c => c.id === button.dataset.crewId);
  if (crew) openCrewEditModal(crew);
});


/* =========================
   ADMIN - ACTUALIZACIÓN DE DATOS
   ========================= */

async function loadDataStatus() {
  try {
    const data = await api('adminDataStatus', { token: token() });
    if (!data.ok) throw new Error(data.error || 'No se pudo consultar el estado de datos.');

    $('dataCatalogCount').textContent = data.catalogCount ?? 0;
    $('dataRecableCount').textContent = data.recableRulesCount ?? 0;
    $('dataOrdersCount').textContent = data.ordersCount ?? 0;

    const hasOrders = Number(data.ordersCount || 0) > 0;
    $('dataOrdersStatus').textContent = hasOrders ? 'Datos disponibles' : 'Pendiente de carga';
    $('dataOrdersStatus').classList.toggle('active', hasOrders);

    if (data.lastLoad) {
      $('dataLastLoad').textContent = `${data.lastLoad.period || ''} · ${data.lastLoad.status || ''}`.trim();
      $('dataLastLoadDetail').textContent =
        `${data.lastLoad.file || 'Carga registrada'} · ${data.lastLoad.validRows || 0} filas válidas`;
    } else {
      $('dataLastLoad').textContent = 'Sin cargas registradas';
      $('dataLastLoadDetail').textContent =
        'La carga Excel se conectará al confirmar el archivo fuente de órdenes de Lima.';
    }
  } catch (err) {
    $('dataLastLoad').textContent = 'No se pudo consultar';
    $('dataLastLoadDetail').textContent = err.message || 'Error de conexión.';
  }
}

$('refreshDataStatusButton').addEventListener('click', loadDataStatus);

/* =========================
   EDITAR USUARIO
   ========================= */

$('closeUserModal').addEventListener('click', closeUserModal);
$('cancelUserButton').addEventListener('click', closeUserModal);

function openUserModal(user) {
  setMessage('userFormMessage');
  $('userForm').reset();

  $('editUserId').value = user.id;
  $('userModalTitle').textContent = `Editar ${user.id}`;
  $('fNombreCompleto').value = user.name || '';
  $('fDni').value = user.dni || '';
  $('fPerfil').value = user.profile || '';
  $('fCelular').value = user.phone || '';
  $('fCorreo').value = user.email || '';
  $('fUsuario').value = user.username || '';
  $('fEstado').value = user.status || 'ACTIVO';
  $('fObservacion').value = user.observation || '';

  $('userModal').classList.remove('hidden');
}

function closeUserModal() {
  $('userModal').classList.add('hidden');
}

$('userForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  setMessage('userFormMessage');

  const payload = {
    token: token(),
    userId: $('editUserId').value,
    name: $('fNombreCompleto').value.trim(),
    dni: $('fDni').value.trim(),
    profile: $('fPerfil').value,
    phone: $('fCelular').value.trim(),
    email: $('fCorreo').value.trim(),
    username: $('fUsuario').value.trim(),
    status: $('fEstado').value,
    observation: $('fObservacion').value.trim()
  };

  $('saveUserButton').disabled = true;

  try {
    const result = await api('adminUpdateUser', payload);
    if (!result.ok) throw new Error(result.error || 'No se pudo guardar el usuario.');
    closeUserModal();
    setMessage('adminMessage', result.message || 'Usuario actualizado.', 'success');
    await refreshAdminCatalogs();
    fillAdminSelectors();
    await loadUsers();
    if (adminActiveTab === 'crews') renderCrews();
  } catch (err) {
    setMessage('userFormMessage', err.message);
  } finally {
    $('saveUserButton').disabled = false;
  }
});

/* =========================
   NUEVA CUADRILLA
   ========================= */

$('newCrewButton').addEventListener('click', () => {
  $('crewCreateForm').reset();
  setMessage('crewCreateMessage');
  $('ncComposicion').value = 'SOLO';
  toggleCrewTech2();
  fillAdminSelectors();
  $('crewCreateModal').classList.remove('hidden');
});

$('closeCrewCreateModal').addEventListener('click', closeCrewCreateModal);
$('cancelCrewCreateButton').addEventListener('click', closeCrewCreateModal);
$('ncComposicion').addEventListener('change', toggleCrewTech2);

function toggleCrewTech2() {
  const double = $('ncComposicion').value === 'DOBLE';
  $('crewTech2Block').classList.toggle('hidden', !double);
  $('ncT2Nombre').required = double;
}

function closeCrewCreateModal() {
  $('crewCreateModal').classList.add('hidden');
}

function technicianPayload(prefix) {
  return {
    name: $(`${prefix}Nombre`).value.trim(),
    dni: $(`${prefix}Dni`).value.trim(),
    phone: $(`${prefix}Celular`).value.trim(),
    email: $(`${prefix}Correo`).value.trim(),
    username: $(`${prefix}Usuario`).value.trim(),
    temporaryPassword: $(`${prefix}Clave`).value,
    observation: $(`${prefix}Observacion`).value.trim()
  };
}

$('crewCreateForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  setMessage('crewCreateMessage');

  const double = $('ncComposicion').value === 'DOBLE';
  const payload = {
    token: token(),
    code: $('ncCodigo').value.trim(),
    platform: $('ncPlataforma').value,
    name: $('ncNombre').value.trim(),
    supervisorId: $('ncSupervisor').value,
    composition: $('ncComposicion').value,
    priorityWorkType: $('ncTipoTrabajo').value.trim(),
    tech1: JSON.stringify(technicianPayload('ncT1')),
    tech2: double ? JSON.stringify(technicianPayload('ncT2')) : ''
  };

  $('saveCrewCreateButton').disabled = true;
  showLoader('Creando cuadrilla…');

  try {
    const result = await api('adminCreateCrew', payload);
    if (!result.ok) throw new Error(result.error || 'No se pudo crear la cuadrilla.');
    closeCrewCreateModal();
    await refreshAdminCatalogs();
    fillAdminSelectors();
    await loadUsers();
    setAdminTab('crews');
    setMessage('adminMessage', result.message || 'Cuadrilla creada.', 'success');
  } catch (err) {
    setMessage('crewCreateMessage', err.message);
  } finally {
    $('saveCrewCreateButton').disabled = false;
    hideLoader();
  }
});

/* =========================
   NUEVO SUPERVISOR
   ========================= */

$('newSupervisorButton').addEventListener('click', () => {
  $('supervisorCreateForm').reset();
  setMessage('supervisorCreateMessage');
  $('supervisorCreateModal').classList.remove('hidden');
});
$('closeSupervisorCreateModal').addEventListener('click', closeSupervisorCreateModal);
$('cancelSupervisorCreateButton').addEventListener('click', closeSupervisorCreateModal);

function closeSupervisorCreateModal() {
  $('supervisorCreateModal').classList.add('hidden');
}

$('supervisorCreateForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  setMessage('supervisorCreateMessage');
  $('saveSupervisorCreateButton').disabled = true;
  showLoader('Creando supervisor…');

  try {
    const result = await api('adminCreateSupervisor', {
      token: token(),
      name: $('nsNombre').value.trim(),
      dni: $('nsDni').value.trim(),
      supervisorCode: $('nsCodigo').value.trim(),
      phone: $('nsCelular').value.trim(),
      email: $('nsCorreo').value.trim(),
      username: $('nsUsuario').value.trim(),
      temporaryPassword: $('nsClave').value,
      observation: $('nsObservacion').value.trim()
    });

    if (!result.ok) throw new Error(result.error || 'No se pudo crear el supervisor.');
    closeSupervisorCreateModal();
    await refreshAdminCatalogs();
    fillAdminSelectors();
    await loadUsers();
    setMessage('adminMessage', result.message || 'Supervisor creado.', 'success');
  } catch (err) {
    setMessage('supervisorCreateMessage', err.message);
  } finally {
    $('saveSupervisorCreateButton').disabled = false;
    hideLoader();
  }
});

/* =========================
   NUEVO PERSONAL
   ========================= */

$('newStaffButton').addEventListener('click', () => {
  $('staffCreateForm').reset();
  setMessage('staffCreateMessage');
  fillAdminSelectors();
  $('staffCreateModal').classList.remove('hidden');
});
$('closeStaffCreateModal').addEventListener('click', closeStaffCreateModal);
$('cancelStaffCreateButton').addEventListener('click', closeStaffCreateModal);

function closeStaffCreateModal() {
  $('staffCreateModal').classList.add('hidden');
}

$('staffCreateForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  setMessage('staffCreateMessage');
  $('saveStaffCreateButton').disabled = true;
  showLoader('Creando usuario…');

  try {
    const result = await api('adminCreateStaff', {
      token: token(),
      name: $('npNombre').value.trim(),
      dni: $('npDni').value.trim(),
      profile: $('npPerfil').value,
      phone: $('npCelular').value.trim(),
      email: $('npCorreo').value.trim(),
      username: $('npUsuario').value.trim(),
      temporaryPassword: $('npClave').value,
      observation: $('npObservacion').value.trim()
    });

    if (!result.ok) throw new Error(result.error || 'No se pudo crear el usuario.');
    closeStaffCreateModal();
    await refreshAdminCatalogs();
    fillAdminSelectors();
    await loadUsers();
    setMessage('adminMessage', result.message || 'Usuario creado.', 'success');
  } catch (err) {
    setMessage('staffCreateMessage', err.message);
  } finally {
    $('saveStaffCreateButton').disabled = false;
    hideLoader();
  }
});

/* =========================
   EDITAR CUADRILLA
   ========================= */

let editingCrew = null;

function openCrewEditModal(crew) {
  editingCrew = crew;
  setMessage('crewEditMessage');

  $('ecId').value = crew.id;
  $('crewEditTitle').textContent = `${crew.code || crew.id} · ${crew.platform || ''}`;
  $('ecCodigo').value = crew.code || '';
  $('ecPlataforma').value = crew.platform || 'SGA';
  $('ecNombre').value = crew.name || '';
  $('ecSupervisor').value = crew.directManagement ? '__GG__' : (crew.supervisorId || '');
  $('ecEstado').value = crew.status || 'ACTIVO';
  $('ecTipoTrabajo').value = crew.priorityWorkType || '';

  $('ecTech1').textContent = crew.technician1 || 'Sin técnico';
  $('ecTech2').textContent = crew.technician2 || 'Sin segundo técnico';

  $('crewEditModal').classList.remove('hidden');
}

$('closeCrewEditModal').addEventListener('click', closeCrewEditModal);
$('cancelCrewEditButton').addEventListener('click', closeCrewEditModal);

function closeCrewEditModal() {
  $('crewEditModal').classList.add('hidden');
}

$('crewEditForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  setMessage('crewEditMessage');
  $('saveCrewEditButton').disabled = true;
  showLoader('Guardando cuadrilla…');

  try {
    const result = await api('adminUpdateCrew', {
      token: token(),
      crewId: $('ecId').value,
      code: $('ecCodigo').value.trim(),
      platform: $('ecPlataforma').value,
      name: $('ecNombre').value.trim(),
      supervisorId: $('ecSupervisor').value,
      status: $('ecEstado').value,
      priorityWorkType: $('ecTipoTrabajo').value.trim()
    });

    if (!result.ok) throw new Error(result.error || 'No se pudo actualizar la cuadrilla.');
    closeCrewEditModal();
    await refreshAdminCatalogs();
    fillAdminSelectors();
    renderCrews();
    await loadUsers();
    setMessage('adminMessage', result.message || 'Cuadrilla actualizada.', 'success');
  } catch (err) {
    setMessage('crewEditMessage', err.message);
  } finally {
    $('saveCrewEditButton').disabled = false;
    hideLoader();
  }
});

/* =========================
   AGREGAR / REEMPLAZAR TÉCNICO
   ========================= */

$('replaceTech1Button').addEventListener('click', () => openReplaceTechModal(1));
$('replaceTech2Button').addEventListener('click', () => openReplaceTechModal(2));
$('closeReplaceTechModal').addEventListener('click', closeReplaceTechModal);
$('cancelReplaceTechButton').addEventListener('click', closeReplaceTechModal);

function openReplaceTechModal(slot) {
  if (!editingCrew) return;

  $('replaceTechForm').reset();
  setMessage('replaceTechMessage');
  $('rtCrewId').value = editingCrew.id;
  $('rtSlot').value = String(slot);

  const currentName = slot === 1 ? editingCrew.technician1 : editingCrew.technician2;
  const currentId = slot === 1 ? editingCrew.technician1Id : editingCrew.technician2Id;

  $('replaceTechTitle').textContent = currentId ? `Reemplazar Técnico ${slot}` : `Agregar Técnico ${slot}`;
  $('replaceTechCurrent').textContent = currentId ? `Técnico actual: ${currentName}` : 'La posición está libre.';
  $('deactivateOutgoingWrap').classList.toggle('hidden', !currentId);
  $('rtDeactivateOutgoing').checked = Boolean(currentId);

  $('replaceTechModal').classList.remove('hidden');
}

function closeReplaceTechModal() {
  $('replaceTechModal').classList.add('hidden');
}

$('replaceTechForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  setMessage('replaceTechMessage');
  $('saveReplaceTechButton').disabled = true;
  showLoader('Actualizando técnico…');

  try {
    const result = await api('adminReplaceCrewTechnician', {
      token: token(),
      crewId: $('rtCrewId').value,
      slot: $('rtSlot').value,
      deactivateOutgoing: $('rtDeactivateOutgoing').checked ? 'SI' : 'NO',
      technician: JSON.stringify({
        name: $('rtNombre').value.trim(),
        dni: $('rtDni').value.trim(),
        phone: $('rtCelular').value.trim(),
        email: $('rtCorreo').value.trim(),
        username: $('rtUsuario').value.trim(),
        temporaryPassword: $('rtClave').value,
        observation: $('rtObservacion').value.trim()
      })
    });

    if (!result.ok) throw new Error(result.error || 'No se pudo actualizar el técnico.');
    closeReplaceTechModal();
    closeCrewEditModal();
    await refreshAdminCatalogs();
    fillAdminSelectors();
    renderCrews();
    await loadUsers();
    setMessage('adminMessage', result.message || 'Técnico actualizado.', 'success');
  } catch (err) {
    setMessage('replaceTechMessage', err.message);
  } finally {
    $('saveReplaceTechButton').disabled = false;
    hideLoader();
  }
});

/* =========================
   MODAL CLAVE TEMPORAL
   ========================= */

$('closePasswordModal').addEventListener('click', closePasswordModal);
$('cancelPasswordButton').addEventListener('click', closePasswordModal);

function openPasswordModal(user) {
  setMessage('passwordResetMessage');
  $('passwordResetForm').reset();
  $('passwordUserId').value = user.id;
  $('passwordUserName').textContent = `${user.name} · ${user.id}`;
  $('passwordModal').classList.remove('hidden');
}

function closePasswordModal() {
  $('passwordModal').classList.add('hidden');
}

$('passwordResetForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  setMessage('passwordResetMessage');

  const clave = $('temporaryPassword').value;
  const repetir = $('temporaryPasswordRepeat').value;

  if (clave !== repetir) {
    setMessage('passwordResetMessage', 'Las claves no coinciden.');
    return;
  }

  try {
    const result = await api('adminResetPassword', {
      token: token(),
      userId: $('passwordUserId').value,
      temporaryPassword: clave
    });

    if (!result.ok) throw new Error(result.error || 'No se pudo restablecer la clave.');

    closePasswordModal();
    setMessage('adminMessage', result.message || 'Clave temporal actualizada.', 'success');
    await loadUsers();
  } catch (err) {
    setMessage('passwordResetMessage', err.message);
  }
});

/* =========================
   RESTAURAR SESIÓN
   ========================= */


/* =========================
   MI DESEMPEÑO
   ========================= */

let performanceCrewId = '';

async function openPerformance() {
  const scopeCrews = sessionData?.scope?.crews || [];

  $('performancePeriod').value = '2026-08';

  if (scopeCrews.length === 1) {
    performanceCrewId = scopeCrews[0].id;
    $('performanceCrewSelectWrap').classList.add('hidden');
  } else {
    performanceCrewId = scopeCrews[0]?.id || '';
    $('performanceCrewSelectWrap').classList.remove('hidden');
    $('performanceCrewSelect').innerHTML = scopeCrews
      .map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.code)} · ${escapeHtml(c.platform || 'SIN PLATAFORMA')}</option>`)
      .join('');
    $('performanceCrewSelect').value = performanceCrewId;
  }

  showView('performance');
  await loadPerformance();
}

async function loadPerformance() {
  const period = $('performancePeriod').value || '2026-08';
  const crewId = performanceCrewId || $('performanceCrewSelect').value || '';

  if (!crewId) {
    $('performanceNoData').classList.remove('hidden');
    $('performanceNoData').textContent = 'No hay una cuadrilla disponible en tu alcance.';
    return;
  }

  showLoader('Cargando desempeño…');

  try {
    const data = await api('performanceSummary', {
      token: token(),
      period,
      crewId
    });

    if (!data.ok) {
      if (data.expired) return clearSession();
      throw new Error(data.error || 'No se pudo cargar Mi Desempeño.');
    }

    renderPerformance(data);
  } catch (err) {
    $('performanceNoData').classList.remove('hidden');
    $('performanceNoData').textContent = err.message || 'No se pudo cargar el desempeño.';
  } finally {
    hideLoader();
  }
}

function renderPerformance(data) {
  const crew = data.crew || {};
  const summary = data.summary || {};
  const daily = data.daily || [];

  $('performanceCrewTitle').textContent =
    `${crew.code || ''}${crew.platform ? ' · ' + crew.platform : ''}`.trim() || 'Cuadrilla';

  $('perfPoints').textContent = `${Number(summary.points || 0).toFixed(2)} pts`;
  $('perfFinalized').textContent = summary.finalized ?? 0;

  const eff = summary.effectiveness;
  $('perfEffectiveness').textContent =
    eff == null ? '—' : `${(Number(eff) * 100).toFixed(1)}%`;

  const effCard = $('effectivenessCard');
  effCard.classList.remove('signal-green', 'signal-red', 'signal-neutral');
  if (eff == null) effCard.classList.add('signal-neutral');
  else if (Number(eff) >= 0.70) effCard.classList.add('signal-green');
  else effCard.classList.add('signal-red');

  const rec = summary.recablePercent;
  $('perfRecable').textContent =
    rec == null ? '—' : `${(Number(rec) * 100).toFixed(1)}%`;
  $('perfLosRojo').textContent = summary.losRojo ?? 0;
  $('perfRecables').textContent = summary.recables ?? 0;

  $('performanceNoData').classList.toggle('hidden', Boolean(data.hasData));

  if (!daily.length) {
    $('performanceDailyList').innerHTML =
      '<p class="empty">No hay detalle diario para este periodo.</p>';
    return;
  }

  $('performanceDailyList').innerHTML = daily.map(d => {
    const effText = d.effectiveness == null ? '—' : `${(Number(d.effectiveness) * 100).toFixed(1)}%`;
    const signal = d.effectiveness == null ? 'neutral' : (Number(d.effectiveness) >= 0.70 ? 'green' : 'red');
    return `
      <button type="button" class="daily-performance-row" data-performance-date="${escapeHtml(d.date)}">
        <div>
          <strong>${escapeHtml(d.dateLabel)}</strong>
          <small>${d.finalized || 0} finalizadas · ${Number(d.points || 0).toFixed(2)} pts</small>
        </div>
        <span class="daily-eff ${signal}">${effText}</span>
        <span class="module-arrow">›</span>
      </button>
    `;
  }).join('');
}

$('performanceCrewSelect').addEventListener('change', () => {
  performanceCrewId = $('performanceCrewSelect').value;
  loadPerformance();
});

$('performancePeriod').addEventListener('change', loadPerformance);
$('refreshPerformanceButton').addEventListener('click', loadPerformance);

$('performanceDailyList').addEventListener('click', async (e) => {
  const button = e.target.closest('[data-performance-date]');
  if (!button) return;

  const date = button.dataset.performanceDate;
  showLoader('Cargando detalle…');

  try {
    const data = await api('performanceDayDetail', {
      token: token(),
      crewId: performanceCrewId || $('performanceCrewSelect').value || '',
      date
    });

    if (!data.ok) throw new Error(data.error || 'No se pudo cargar el detalle del día.');

    $('performanceDayTitle').textContent = data.dateLabel || date;
    $('performanceDaySummary').textContent =
      `${data.orders?.length || 0} órdenes finalizadas · ${Number(data.totalPoints || 0).toFixed(2)} puntos`;

    $('performanceDayOrders').innerHTML = (data.orders || []).length
      ? data.orders.map(o => `
          <article class="day-order-row">
            <strong>${escapeHtml(o.clientCode || 'Sin código')}</strong>
            <span>${escapeHtml(o.typePartida || 'Sin tipo de partida')}</span>
            <b>${Number(o.points || 0).toFixed(2)} pts</b>
          </article>
        `).join('')
      : '<p class="empty">No hay órdenes finalizadas para este día.</p>';

    $('performanceDayModal').classList.remove('hidden');
  } catch (err) {
    alert(err.message || 'No se pudo cargar el detalle.');
  } finally {
    hideLoader();
  }
});

$('closePerformanceDayModal').addEventListener('click', () => {
  $('performanceDayModal').classList.add('hidden');
});

async function restoreSession() {
  showLoader('Cargando aplicación…');

  if (!token()) {
    showView('login');
    hideLoader();
    return;
  }

  try {
    const data = await api('session', { token: token() });
    if (!data.ok) return clearSession();
    renderHome(data);
  } catch (_) {
    clearSession();
  } finally {
    hideLoader();
  }
}

restoreSession();
