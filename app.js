/**
 * MI VISUAL LIMA - Frontend V1.1
 * Login + Home dinámico + Administración de Usuarios
 */

const API_URL = 'https://script.google.com/macros/s/AKfycbxD95mFsCWIdOjkDqA-iEVBlj3JQp-y29O6NI6sfc5YcU4LzJi2IW8E1DUkAjRmsPuG/exec';
const TOKEN_KEY = 'mvl_session_token';

const $ = (id) => document.getElementById(id);

const views = {
  login: $('loginView'),
  change: $('changePasswordView'),
  home: $('homeView'),
  admin: $('adminView')
};

let sessionData = null;
let adminCatalogs = null;
let adminUsers = [];
let adminSearchTimer = null;

function showView(name) {
  Object.values(views).forEach(v => v.classList.add('hidden'));
  views[name].classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'instant' });
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
  const enabled = isAdmin && m.permissions?.administrar;

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
        <small>${enabled ? 'Gestionar usuarios' : 'Próxima etapa'}</small>
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
});

$('backHomeButton').addEventListener('click', () => {
  if (sessionData) renderHome(sessionData);
  else restoreSession();
});

/* =========================
   ADMIN USUARIOS
   ========================= */

async function openAdmin() {
  showView('admin');
  setMessage('adminMessage');
  $('usersList').innerHTML = '<p class="empty">Cargando usuarios…</p>';

  try {
    if (!adminCatalogs) {
      const cat = await api('adminCatalogs', { token: token() });
      if (!cat.ok) throw new Error(cat.error || 'No se pudieron cargar los catálogos.');
      adminCatalogs = cat;
      fillProfileSelectors(cat.profiles || []);
    }
    await loadUsers();
  } catch (err) {
    setMessage('adminMessage', err.message || 'No se pudo abrir Administración.');
    $('usersList').innerHTML = '';
  }
}

function fillProfileSelectors(profiles) {
  const options = profiles
    .map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`)
    .join('');

  $('profileFilter').innerHTML =
    '<option value="">Todos los perfiles</option>' + options;

  $('fPerfil').innerHTML =
    '<option value="">Seleccionar perfil</option>' + options;
}

async function loadUsers() {
  setMessage('adminMessage');

  const data = await api('adminUsersList', {
    token: token(),
    search: $('userSearch').value.trim(),
    profile: $('profileFilter').value,
    status: $('statusFilter').value
  });

  if (!data.ok) {
    if (data.expired) return clearSession();
    throw new Error(data.error || 'No se pudieron cargar los usuarios.');
  }

  adminUsers = data.users || [];
  renderUsers(adminUsers, data.summary || {});
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
  const crewText = u.crewSummary || 'Sin asignación registrada';

  return `
    <article class="user-card">
      <div class="user-main">
        <div class="user-title-row">
          <div>
            <strong>${escapeHtml(u.name || 'Sin nombre')}</strong>
            <div class="user-meta">
              <span>${escapeHtml(u.id)}</span>
              ${u.dni ? `<span>DNI ${escapeHtml(u.dni)}</span>` : ''}
              ${u.username ? `<span>@${escapeHtml(u.username)}</span>` : ''}
            </div>
          </div>
          <span class="status-pill ${u.status === 'ACTIVO' ? 'active' : 'inactive'}">
            ${escapeHtml(u.status)}
          </span>
        </div>

        <div class="user-tags">
          <span class="tag">${escapeHtml(u.profile || 'Sin perfil')}</span>
          <span class="tag ${accessClass}">${accessText}</span>
        </div>

        <p class="assignment-line">${escapeHtml(crewText)}</p>
      </div>

      <div class="user-actions">
        <button type="button" class="ghost compact" data-user-action="edit" data-user-id="${escapeHtml(u.id)}">Editar</button>
        <button type="button" class="ghost compact" data-user-action="password" data-user-id="${escapeHtml(u.id)}">Clave</button>
        <button
          type="button"
          class="${u.status === 'ACTIVO' ? 'danger-soft' : 'success-soft'} compact"
          data-user-action="status"
          data-user-id="${escapeHtml(u.id)}"
        >
          ${u.status === 'ACTIVO' ? 'Desactivar' : 'Activar'}
        </button>
      </div>
    </article>
  `;
}

$('usersList').addEventListener('click', async (e) => {
  const button = e.target.closest('[data-user-action]');
  if (!button) return;

  const id = button.dataset.userId;
  const user = adminUsers.find(u => u.id === id);
  if (!user) return;

  const action = button.dataset.userAction;

  if (action === 'edit') openUserModal(user);
  if (action === 'password') openPasswordModal(user);

  if (action === 'status') {
    const newStatus = user.status === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    const verb = newStatus === 'ACTIVO' ? 'activar' : 'desactivar';

    if (!confirm(`¿Confirmas ${verb} a ${user.name}?`)) return;

    try {
      const result = await api('adminSetUserStatus', {
        token: token(),
        userId: user.id,
        status: newStatus
      });
      if (!result.ok) throw new Error(result.error || 'No se pudo actualizar el estado.');

      setMessage('adminMessage', `Usuario ${newStatus === 'ACTIVO' ? 'activado' : 'desactivado'} correctamente.`, 'success');
      await loadUsers();
    } catch (err) {
      setMessage('adminMessage', err.message);
    }
  }
});

$('refreshUsersButton').addEventListener('click', () => loadUsers().catch(err => setMessage('adminMessage', err.message)));
$('profileFilter').addEventListener('change', () => loadUsers().catch(err => setMessage('adminMessage', err.message)));
$('statusFilter').addEventListener('change', () => loadUsers().catch(err => setMessage('adminMessage', err.message)));
$('userSearch').addEventListener('input', () => {
  clearTimeout(adminSearchTimer);
  adminSearchTimer = setTimeout(() => loadUsers().catch(err => setMessage('adminMessage', err.message)), 350);
});

/* =========================
   MODAL CREAR / EDITAR
   ========================= */

$('newUserButton').addEventListener('click', () => openUserModal(null));
$('closeUserModal').addEventListener('click', closeUserModal);
$('cancelUserButton').addEventListener('click', closeUserModal);

function openUserModal(user) {
  setMessage('userFormMessage');
  $('userForm').reset();

  $('editUserId').value = user?.id || '';
  $('userModalTitle').textContent = user ? `Editar ${user.id}` : 'Nuevo usuario';

  $('fNombreCompleto').value = user?.name || '';
  $('fDni').value = user?.dni || '';
  $('fPerfil').value = user?.profile || '';
  $('fCelular').value = user?.phone || '';
  $('fCorreo').value = user?.email || '';
  $('fUsuario').value = user?.username || '';
  $('fCodigoOperativo').value = user?.operationalCode || '';
  $('fEstado').value = user?.status || 'ACTIVO';
  $('fObservacion').value = user?.observation || '';

  $('userModal').classList.remove('hidden');
}

function closeUserModal() {
  $('userModal').classList.add('hidden');
}

$('userForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  setMessage('userFormMessage');

  const userId = $('editUserId').value;
  const payload = {
    token: token(),
    userId,
    name: $('fNombreCompleto').value.trim(),
    dni: $('fDni').value.trim(),
    profile: $('fPerfil').value,
    phone: $('fCelular').value.trim(),
    email: $('fCorreo').value.trim(),
    username: $('fUsuario').value.trim(),
    operationalCode: $('fCodigoOperativo').value.trim(),
    status: $('fEstado').value,
    observation: $('fObservacion').value.trim()
  };

  if (!payload.name || !payload.profile) {
    setMessage('userFormMessage', 'Nombre completo y perfil son obligatorios.');
    return;
  }

  $('saveUserButton').disabled = true;

  try {
    const action = userId ? 'adminUpdateUser' : 'adminCreateUser';
    const result = await api(action, payload);

    if (!result.ok) throw new Error(result.error || 'No se pudo guardar el usuario.');

    closeUserModal();
    setMessage('adminMessage', result.message || 'Usuario guardado correctamente.', 'success');
    await loadUsers();
  } catch (err) {
    setMessage('userFormMessage', err.message);
  } finally {
    $('saveUserButton').disabled = false;
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

async function restoreSession() {
  if (!token()) {
    showView('login');
    return;
  }

  try {
    const data = await api('session', { token: token() });
    if (!data.ok) return clearSession();
    renderHome(data);
  } catch (_) {
    clearSession();
  }
}

restoreSession();
