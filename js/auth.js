/** Gate de acesso no cliente. Só o hash vai no código — nunca a senha em texto. */
const AUTH_SESSION_KEY = 'controle-financeiro-auth';
// SHA-256 hex de "usuario:senha" — a senha NÃO está neste repositório
const AUTH_HASH = '40d1b5c68d41eff9bd175dd68f660551ed60ad05a0f01511732c3a50cd2cd5b7';

async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function isAuthed() {
  return sessionStorage.getItem(AUTH_SESSION_KEY) === AUTH_HASH;
}

function unlockApp() {
  document.body.classList.add('authed');
  const gate = document.getElementById('login-gate');
  if (gate) gate.hidden = true;
  window.dispatchEvent(new Event('finance-authed'));
}

function lockApp() {
  sessionStorage.removeItem(AUTH_SESSION_KEY);
  document.body.classList.remove('authed');
  location.reload();
}

async function tryLogin(user, pass) {
  const hash = await sha256Hex(`${user.trim()}:${pass}`);
  if (hash !== AUTH_HASH) return false;
  sessionStorage.setItem(AUTH_SESSION_KEY, AUTH_HASH);
  return true;
}

function initAuth() {
  const form = document.getElementById('form-login');
  const err = document.getElementById('login-error');
  const logoutBtn = document.getElementById('btn-logout');

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (confirm('Sair desta sessão?')) lockApp();
    });
  }

  if (isAuthed()) {
    unlockApp();
    return;
  }

  document.body.classList.remove('authed');
  const gate = document.getElementById('login-gate');
  if (gate) gate.hidden = false;

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.hidden = true;
    const user = document.getElementById('login-user').value;
    const pass = document.getElementById('login-pass').value;
    const ok = await tryLogin(user, pass);
    if (!ok) {
      err.textContent = 'Usuário ou senha incorretos.';
      err.hidden = false;
      return;
    }
    unlockApp();
  });
}

initAuth();
