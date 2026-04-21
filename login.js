'use strict';

// If already logged in, redirect away
const _s = Auth.getSession();
if (_s) { location.href = _s.role === 'admin' ? 'admin.html' : (new URLSearchParams(location.search).get('redirect') || 'index.html'); }

function redirect() {
  const dest = new URLSearchParams(location.search).get('redirect') || 'index.html';
  location.href = dest;
}

// ── Tabs ──
const tabs  = document.querySelectorAll('.login-tab');
const forms = { signin: document.getElementById('signinForm'), register: document.getElementById('registerForm') };

function switchTab(name) {
  tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  forms.signin.hidden   = name !== 'signin';
  forms.register.hidden = name !== 'register';
}

tabs.forEach(t => t.addEventListener('click', () => switchTab(t.dataset.tab)));
document.querySelectorAll('[data-switch]').forEach(a => {
  a.addEventListener('click', e => { e.preventDefault(); switchTab(a.dataset.switch); });
});

// ── Sign In ──
forms.signin.addEventListener('submit', e => {
  e.preventDefault();
  const email = document.getElementById('siEmail').value;
  const pw    = document.getElementById('siPassword').value;
  const err   = document.getElementById('siError');
  const res   = Auth.login(email, pw);
  if (res.ok) { redirect(); }
  else        { err.textContent = res.error; }
});

// ── Register ──
forms.register.addEventListener('submit', e => {
  e.preventDefault();
  const name    = document.getElementById('regName').value;
  const email   = document.getElementById('regEmail').value;
  const pw      = document.getElementById('regPassword').value;
  const confirm = document.getElementById('regConfirm').value;
  const err     = document.getElementById('regError');

  if (pw !== confirm) { err.textContent = 'Passwords do not match.'; return; }
  const res = Auth.register(name, email, pw);
  if (res.ok) { redirect(); }
  else        { err.textContent = res.error; }
});
