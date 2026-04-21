'use strict';

/* ─────────────────────────────────────────
   Auth  –  shared across all pages
   Exposes a global `Auth` namespace so it
   can't conflict with page-level variables.
───────────────────────────────────────── */
const Auth = (() => {
  const USERS_KEY   = 'booknookusers';
  const SESSION_KEY = 'booknooksession';

  // ── Storage ──────────────────────────
  function getUsers() {
    try { return JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); } catch { return []; }
  }
  function saveUsers(users) { localStorage.setItem(USERS_KEY, JSON.stringify(users)); }

  // ── Session ──────────────────────────
  function getSession() {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); } catch { return null; }
  }
  function setSession(u) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id: u.id, name: u.name, email: u.email, role: u.role }));
  }
  function clearSession() { sessionStorage.removeItem(SESSION_KEY); }

  // ── Register ─────────────────────────
  function register(name, email, password) {
    const users = getUsers();
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      return { ok: false, error: 'An account with this email already exists.' };
    }
    const user = {
      id: 'USR-' + Date.now(), name: name.trim(),
      email: email.toLowerCase().trim(), password,
      role: 'user', avatar: null, createdAt: new Date().toISOString(),
    };
    users.push(user);
    saveUsers(users);
    setSession(user);
    return { ok: true, user };
  }

  // ── Login ────────────────────────────
  function login(email, password) {
    const users = getUsers();
    const user  = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (!user) return { ok: false, error: 'Incorrect email or password.' };
    setSession(user);
    return { ok: true, user };
  }

  // ── Logout ───────────────────────────
  function logout() { clearSession(); }

  // ── Update a user ────────────────────
  function updateUser(id, changes) {
    const users = getUsers();
    const idx   = users.findIndex(u => u.id === id);
    if (idx < 0) return false;
    users[idx] = { ...users[idx], ...changes };
    saveUsers(users);
    const s = getSession();
    if (s && s.id === id) setSession(users[idx]);
    return true;
  }

  function deleteUser(id) {
    const users = getUsers().filter(u => u.id !== id);
    saveUsers(users);
    const s = getSession();
    if (s && s.id === id) clearSession();
  }

  // ── Seed default admin on first run ──
  (function seedAdmin() {
    const users = getUsers();
    if (!users.find(u => u.role === 'admin')) {
      users.unshift({
        id: 'USR-ADMIN-SEED', name: 'Store Admin',
        email: 'admin@nowbookstore.com', password: 'admin123',
        role: 'admin', avatar: null, createdAt: new Date().toISOString(),
      });
      saveUsers(users);
    }
  })();

  // ── Avatar helpers ────────────────────────────
  function getInitials(name) {
    return name.trim().split(/\s+/).map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }

  // Admin default: purple shield icon. User default: green initials circle.
  function avatarHTML(user, extraClass) {
    const cls = 'user-avatar' + (extraClass ? ' ' + extraClass : '');
    if (user.avatar) {
      return `<span class="${cls}"><img src="${user.avatar}" alt="${user.name}"></span>`;
    }
    if (user.role === 'admin') {
      return `<span class="${cls} avatar-admin" title="${user.name}">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 1 9.5 8H3l5.5 4-2 7L12 15l5.5 4-2-7L21 8h-6.5L12 1z"/>
        </svg>
      </span>`;
    }
    return `<span class="${cls} avatar-user" title="${user.name}">${getInitials(user.name)}</span>`;
  }

  // ── Profile-picture modal ─────────────────────
  function injectAvatarModal() {
    if (document.getElementById('avatarModal')) return;
    const el = document.createElement('div');
    el.className = 'modal-overlay';
    el.id = 'avatarModal';
    el.hidden = true;
    el.innerHTML = `
      <div class="modal avatar-modal">
        <div class="avatar-modal-preview" id="avatarPreview"></div>
        <h2>Profile Picture</h2>
        <p class="avatar-modal-hint">Upload a photo from your device</p>
        <input type="file" id="avatarFileInput" accept="image/*" style="display:none">
        <div class="avatar-modal-actions">
          <button class="checkout-btn" id="avatarUploadBtn">Upload Photo</button>
          <button class="avatar-remove-btn" id="avatarRemoveBtn">Remove Photo</button>
          <button class="btn-outline avatar-cancel-btn" id="avatarCloseBtn">Cancel</button>
        </div>
      </div>`;
    document.body.appendChild(el);

    el.addEventListener('click', e => { if (e.target === el) closeAvatarModal(); });
    document.getElementById('avatarCloseBtn').addEventListener('click', closeAvatarModal);
    document.getElementById('avatarUploadBtn').addEventListener('click', () => {
      document.getElementById('avatarFileInput').click();
    });
    document.getElementById('avatarFileInput').addEventListener('change', e => {
      const file = e.target.files[0];
      if (file) resizeAndSave(file);
    });
    document.getElementById('avatarRemoveBtn').addEventListener('click', () => {
      const s = getSession();
      if (!s) return;
      updateUser(s.id, { avatar: null });
      closeAvatarModal();
      initHeader();
    });
  }

  function openAvatarModal() {
    injectAvatarModal();
    const s = getSession();
    if (!s) return;
    const users = getUsers();
    const user  = users.find(u => u.id === s.id) || s;
    document.getElementById('avatarPreview').innerHTML = avatarHTML(user, 'avatar-lg');
    document.getElementById('avatarRemoveBtn').hidden  = !user.avatar;
    document.getElementById('avatarModal').hidden = false;
  }

  function closeAvatarModal() {
    const m = document.getElementById('avatarModal');
    if (m) m.hidden = true;
    const fi = document.getElementById('avatarFileInput');
    if (fi) fi.value = '';
  }

  function resizeAndSave(file) {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const MAX = 240;
        let w = img.width, h = img.height;
        if (w > h) { if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; } }
        else        { if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; } }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        const dataURL = canvas.toDataURL('image/jpeg', 0.82);
        const s = getSession();
        if (!s) return;
        updateUser(s.id, { avatar: dataURL });
        // Refresh modal preview
        const users2 = getUsers();
        const user2  = users2.find(u => u.id === s.id);
        const preview = document.getElementById('avatarPreview');
        if (preview && user2) preview.innerHTML = avatarHTML(user2, 'avatar-lg');
        const removeBtn = document.getElementById('avatarRemoveBtn');
        if (removeBtn) removeBtn.hidden = false;
        initHeader();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // ── Inject user section into customer header ──
  function initHeader() {
    const nav = document.getElementById('userNav');
    if (!nav) return;
    const s = getSession();
    if (s) {
      const users = getUsers();
      const user  = users.find(u => u.id === s.id) || s;
      const adminLink = s.role === 'admin'
        ? `<a href="admin.html" class="nav-link nav-admin-link">Admin Panel</a>`
        : '';
      nav.innerHTML = `
        ${adminLink}
        <span class="user-greeting">Hi, ${s.name.split(' ')[0]}</span>
        ${avatarHTML(user, 'header-avatar')}
        <button class="btn-bare" id="logoutCustomerBtn">Log out</button>
      `;
      nav.querySelector('.header-avatar').addEventListener('click', openAvatarModal);
      document.getElementById('logoutCustomerBtn').addEventListener('click', () => { logout(); location.reload(); });
    } else {
      nav.innerHTML = `<a href="login.html" class="nav-link">Sign In</a>`;
    }
  }

  document.addEventListener('DOMContentLoaded', initHeader);

  return { getSession, getUsers, saveUsers, register, login, logout, updateUser, deleteUser, avatarHTML };
})();
