'use strict';

const DEFAULT_PROMOS = [
  { code: 'BOOKS10',   discount: 10, active: true, maxUses: null, expiresAt: null, usages: 0, createdAt: new Date().toISOString() },
  { code: 'READ20',    discount: 20, active: true, maxUses: null, expiresAt: null, usages: 0, createdAt: new Date().toISOString() },
  { code: 'FIRSTBOOK', discount: 15, active: true, maxUses: 100,  expiresAt: null, usages: 0, createdAt: new Date().toISOString() },
];

// ── Auth (uses Auth from auth.js) ──
function isLoggedIn() { return Auth.getSession()?.role === 'admin'; }

function showLogin() {
  document.getElementById('loginScreen').hidden    = false;
  document.getElementById('adminDashboard').hidden = true;
  document.getElementById('adminTabs').hidden      = true;
  document.getElementById('logoutBtn').hidden      = true;
  document.getElementById('adminName').hidden      = true;
}
function showDashboard() {
  const s = Auth.getSession();
  document.getElementById('loginScreen').hidden    = true;
  document.getElementById('adminDashboard').hidden = false;
  document.getElementById('adminTabs').hidden      = false;
  document.getElementById('logoutBtn').hidden      = false;
  document.getElementById('adminName').hidden      = false;
  document.getElementById('adminName').textContent = 'Hi, ' + s.name.split(' ')[0];
  renderTable();
}

document.getElementById('loginForm').addEventListener('submit', e => {
  e.preventDefault();
  const email = document.getElementById('adminEmail').value;
  const pw    = document.getElementById('adminPassword').value;
  const res   = Auth.login(email, pw);
  if (res.ok && res.user.role === 'admin') {
    showDashboard();
  } else {
    document.getElementById('loginError').textContent =
      res.ok ? 'Access denied. Admin accounts only.' : res.error;
    document.getElementById('adminPassword').value = '';
  }
});

document.getElementById('logoutBtn').addEventListener('click', () => { Auth.logout(); showLogin(); });

// ── Promo Storage ──
function loadPromos() {
  try {
    const stored = JSON.parse(localStorage.getItem('booknookpromos'));
    if (Array.isArray(stored) && stored.length) return stored;
  } catch { /* fall through */ }
  localStorage.setItem('booknookpromos', JSON.stringify(DEFAULT_PROMOS));
  return [...DEFAULT_PROMOS];
}
function savePromos(promos) {
  localStorage.setItem('booknookpromos', JSON.stringify(promos));
}

// ── Helpers ──
function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
function isExpired(expiresAt) {
  return expiresAt && new Date(expiresAt) < new Date();
}
function promoStatus(p) {
  if (!p.active)                           return { label: 'Inactive', cls: 'status-inactive' };
  if (isExpired(p.expiresAt))              return { label: 'Expired',  cls: 'status-expired'  };
  if (p.maxUses !== null && p.usages >= p.maxUses) return { label: 'Exhausted', cls: 'status-expired' };
  return { label: 'Active', cls: 'status-active' };
}

// ── Render Table ──
function renderTable() {
  const promos = loadPromos();
  const body   = document.getElementById('promoTableBody');
  const empty  = document.getElementById('adminEmpty');
  const stats  = document.getElementById('adminStats');

  const active   = promos.filter(p => p.active && !isExpired(p.expiresAt) && (p.maxUses === null || p.usages < p.maxUses)).length;
  const inactive = promos.length - active;
  const totalUses = promos.reduce((s, p) => s + (p.usages || 0), 0);

  stats.innerHTML = `
    <div class="stat-card"><div class="stat-value">${promos.length}</div><div class="stat-label">Total codes</div></div>
    <div class="stat-card stat-green"><div class="stat-value">${active}</div><div class="stat-label">Active</div></div>
    <div class="stat-card stat-muted"><div class="stat-value">${inactive}</div><div class="stat-label">Inactive / expired</div></div>
    <div class="stat-card stat-blue"><div class="stat-value">${totalUses}</div><div class="stat-label">Total uses</div></div>
  `;

  empty.hidden = promos.length > 0;
  body.innerHTML = '';

  promos.forEach((p, i) => {
    const st  = promoStatus(p);
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><code class="promo-code-cell">${p.code}</code></td>
      <td><strong>${p.discount}%</strong></td>
      <td><span class="status-badge ${st.cls}">${st.label}</span></td>
      <td>${p.usages || 0}</td>
      <td>${p.maxUses !== null ? p.maxUses : '—'}</td>
      <td class="${isExpired(p.expiresAt) ? 'text-danger' : ''}">${formatDate(p.expiresAt)}</td>
      <td>${formatDate(p.createdAt)}</td>
      <td class="action-cell">
        <button class="action-btn edit-btn"   data-i="${i}" title="Edit">Edit</button>
        <button class="action-btn toggle-btn ${p.active ? 'deactivate' : 'activate'}" data-i="${i}">
          ${p.active ? 'Deactivate' : 'Activate'}
        </button>
        <button class="action-btn delete-btn" data-i="${i}" title="Delete">Delete</button>
      </td>
    `;
    body.appendChild(row);
  });
}

// ── Table Actions (delegation) ──
document.getElementById('promoTableBody').addEventListener('click', e => {
  const editBtn   = e.target.closest('.edit-btn');
  const toggleBtn = e.target.closest('.toggle-btn');
  const deleteBtn = e.target.closest('.delete-btn');

  if (editBtn)   { openEditModal(Number(editBtn.dataset.i)); return; }
  if (toggleBtn) { toggleActive(Number(toggleBtn.dataset.i)); return; }
  if (deleteBtn) { openDeleteModal(Number(deleteBtn.dataset.i)); return; }
});

function toggleActive(i) {
  const promos = loadPromos();
  promos[i].active = !promos[i].active;
  savePromos(promos);
  renderTable();
}

// ── Add / Edit Modal ──
function openAddModal() {
  document.getElementById('modalTitle').textContent   = 'New Promo Code';
  document.getElementById('editIndex').value          = '';
  document.getElementById('fCode').value              = '';
  document.getElementById('fCode').disabled           = false;
  document.getElementById('fDiscount').value          = '';
  document.getElementById('fMaxUses').value           = '';
  document.getElementById('fExpires').value           = '';
  document.getElementById('fActive').checked          = true;
  document.getElementById('formError').textContent    = '';
  document.getElementById('promoModal').hidden        = false;
  document.getElementById('fCode').focus();
}

function openEditModal(i) {
  const p = loadPromos()[i];
  document.getElementById('modalTitle').textContent   = 'Edit Promo Code';
  document.getElementById('editIndex').value          = i;
  document.getElementById('fCode').value              = p.code;
  document.getElementById('fCode').disabled           = true; // code is immutable after creation
  document.getElementById('fDiscount').value          = p.discount;
  document.getElementById('fMaxUses').value           = p.maxUses !== null ? p.maxUses : '';
  document.getElementById('fExpires').value           = p.expiresAt ? p.expiresAt.slice(0, 10) : '';
  document.getElementById('fActive').checked          = p.active;
  document.getElementById('formError').textContent    = '';
  document.getElementById('promoModal').hidden        = false;
}

function closePromoModal() { document.getElementById('promoModal').hidden = true; }

document.getElementById('addPromoBtn').addEventListener('click', openAddModal);
document.getElementById('closeModal').addEventListener('click', closePromoModal);
document.getElementById('cancelModal').addEventListener('click', closePromoModal);

document.getElementById('promoForm').addEventListener('submit', e => {
  e.preventDefault();
  const errEl    = document.getElementById('formError');
  const idx      = document.getElementById('editIndex').value;
  const code     = document.getElementById('fCode').value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const discount = parseInt(document.getElementById('fDiscount').value, 10);
  const maxUses  = document.getElementById('fMaxUses').value ? parseInt(document.getElementById('fMaxUses').value, 10) : null;
  const expires  = document.getElementById('fExpires').value || null;
  const active   = document.getElementById('fActive').checked;

  if (!code)                        { errEl.textContent = 'Code is required.';            return; }
  if (isNaN(discount) || discount < 1 || discount > 99) { errEl.textContent = 'Discount must be between 1 and 99.'; return; }

  const promos = loadPromos();

  if (idx === '') {
    // New promo — check for duplicate
    if (promos.find(p => p.code === code)) { errEl.textContent = `Code "${code}" already exists.`; return; }
    promos.push({ code, discount, active, maxUses, expiresAt: expires ? new Date(expires).toISOString() : null, usages: 0, createdAt: new Date().toISOString() });
  } else {
    const p       = promos[Number(idx)];
    p.discount    = discount;
    p.active      = active;
    p.maxUses     = maxUses;
    p.expiresAt   = expires ? new Date(expires).toISOString() : null;
  }

  savePromos(promos);
  closePromoModal();
  renderTable();
});

// ── Delete Modal ──
let pendingDeleteIndex = null;

function openDeleteModal(i) {
  pendingDeleteIndex = i;
  document.getElementById('deleteCodeName').textContent = loadPromos()[i].code;
  document.getElementById('deleteModal').hidden = false;
}
document.getElementById('cancelDelete').addEventListener('click',  () => { document.getElementById('deleteModal').hidden = true; });
document.getElementById('confirmDelete').addEventListener('click', () => {
  if (pendingDeleteIndex === null) return;
  const promos = loadPromos();
  promos.splice(pendingDeleteIndex, 1);
  savePromos(promos);
  document.getElementById('deleteModal').hidden = true;
  pendingDeleteIndex = null;
  renderTable();
});

// Close modals on backdrop click
[document.getElementById('promoModal'), document.getElementById('deleteModal')].forEach(el => {
  el.addEventListener('click', e => { if (e.target === el) el.hidden = true; });
});

// ── Init ──
if (isLoggedIn()) { showDashboard(); } else { showLogin(); }
