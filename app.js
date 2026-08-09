/**
 * MI VISUAL LIMA - Frontend Login V1
 *
 * IMPORTANTE:
 * Reemplazar API_URL con la URL del Web App desplegado en Apps Script.
 */
const API_URL = 'https://script.google.com/macros/s/AKfycbxR1ODVpuhl9pa5uiQ_mTR8kQug2Jj5ehDSIg_C-u6hXNPo0E26uW1ed0nnAEwWlo8/exec';
const TOKEN_KEY = 'mvl_session_token';

const $ = (id) => document.getElementById(id);

const views = {
  login: $('loginView'),
  change: $('changePasswordView'),
  home: $('homeView')
};

let sessionData = null;
let temporaryPasswordCache = '';

function showView(name) {
  Object.values(views).forEach(v => v.classList.add('hidden'));
  views[name].classList.remove('hidden');
}

async function api(action, params = {}) {
  if (!API_URL || API_URL.includes('PEGAR_AQUI')) {
    throw new Error('Falta configurar API_URL en app.js');
  }

  const body = new URLSearchParams({ action, ...params });

  const response = await fetch(API_URL, {
    method: 'POST',
    body
  });

  if (!response.ok) {
    throw new Error('No se pudo conectar con el servidor.');
  }

  return response.json();
}

$('togglePassword').addEventListener('click', () => {
  const input = $('clave');
  const visible = input.type === 'text';
  input.type = visible ? 'password' : 'text';
  $('togglePassword').textContent = visible ? 'Ver' : 'Ocultar';
});

$('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('loginMessage').textContent = '';
  $('loginButton').disabled = true;

  try {
    const usuario = $('usuario').value.trim();
    const clave = $('clave').value;
    temporaryPasswordCache = clave;

    const data = await api('login', { usuario, clave });

    if (!data.ok) {
      $('loginMessage').textContent = data.error || 'No se pudo ingresar.';
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
    $('loginMessage').textContent = err.message || 'Error de conexión.';
  } finally {
    $('loginButton').disabled = false;
  }
});

$('changePasswordForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('changeMessage').textContent = '';

  const actual = $('actual').value;
  const nueva = $('nueva').value;
  const repetir = $('repetir').value;

  if (nueva !== repetir) {
    $('changeMessage').textContent = 'Las contraseñas nuevas no coinciden.';
    return;
  }

  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const data = await api('changePassword', {
      token,
      claveActual: actual,
      claveNueva: nueva
    });

    if (!data.ok) {
      $('changeMessage').textContent = data.error || 'No se pudo cambiar la contraseña.';
      return;
    }

    const fresh = await api('session', { token });
    if (!fresh.ok) {
      clearSession();
      return;
    }

    renderHome(fresh);
  } catch (err) {
    $('changeMessage').textContent = err.message || 'Error de conexión.';
  }
});

$('logoutButton').addEventListener('click', async () => {
  const token = localStorage.getItem(TOKEN_KEY);
  try {
    if (token) await api('logout', { token });
  } catch (_) {}
  clearSession();
});

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  sessionData = null;
  temporaryPasswordCache = '';
  $('clave').value = '';
  showView('login');
}

function renderHome(data) {
  sessionData = data;

  $('userName').textContent = data.user?.name || data.user?.id || 'Usuario';
  $('userProfile').textContent = data.user?.profile || '';
  $('scopeType').textContent = readableScope(data.scope?.type);
  $('crewCount').textContent = data.scope?.totalCrews ?? 0;

  const crews = data.scope?.crews || [];
  const includesGG = crews.some(c => c.directManagement);
  $('ggInfo').classList.toggle('hidden', !includesGG);

  $('crewList').innerHTML = crews.length
    ? crews.map(crewCard).join('')
    : '<p class="empty">No hay cuadrillas asignadas a este usuario.</p>';

  const modules = data.modules || [];
  $('moduleList').innerHTML = modules.length
    ? modules.map(moduleCard).join('')
    : '<p class="empty">No hay módulos habilitados.</p>';

  showView('home');
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

function crewCard(c) {
  const gg = c.directManagement ? '<span class="badge warning">GG</span>' : '';
  return `
    <article class="crew">
      <div>
        <div class="crew-head">
          <strong>${escapeHtml(c.code || c.id)}</strong>
          ${gg}
        </div>
        <p>${escapeHtml(c.name)}</p>
        <small>${escapeHtml(c.platform || 'Sin plataforma')} · ${escapeHtml(c.zone || 'Sin zona')}</small>
      </div>
    </article>
  `;
}

function moduleCard(m) {
  return `
    <button class="module" type="button" disabled>
      <strong>${escapeHtml(m.module)}</strong>
      <small>Próxima etapa</small>
    </button>
  `;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function restoreSession() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    showView('login');
    return;
  }

  try {
    const data = await api('session', { token });
    if (!data.ok) {
      clearSession();
      return;
    }
    renderHome(data);
  } catch (_) {
    clearSession();
  }
}

restoreSession();
