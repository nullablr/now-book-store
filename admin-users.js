'use strict';

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
  render();
}

document.getElementById('loginForm').addEventListener('submit', e => {
  e.preventDefault();
  const res = Auth.login(document.getElementById('adminEmail').value, document.getElementById('adminPassword').value);
  if (res.ok && res.user.role === 'admin') { showDashboard(); }
  else {
    document.getElementById('loginError').textContent = res.ok ? 'Admin accounts only.' : res.error;
    document.getElementById('adminPassword').value = '';
  }
});
document.getElementById('logoutBtn').addEventListener('click', () => { Auth.logout(); showLogin(); });

function orderCountFor(userId) {
  try {
    const orders = JSON.parse(localStorage.getItem('booknookorders') || '[]');
    return orders.filter(o => o.userId === userId).length;
  } catch { return 0; }
}
function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' });
}

function render() {
  const q      = document.getElementById('userSearch').value.toLowerCase();
  const filter = document.getElementById('userFilter').value;
  const me     = Auth.getSession();

  const allUsers = Auth.getUsers();
  const users = allUsers.filter(u => {
    if (filter !== 'all' && u.role !== filter) return false;
    if (q) {
      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    }
    return true;
  });

  const adminCount = allUsers.filter(u => u.role === 'admin').length;
  document.getElementById('adminStats').innerHTML = `
    <div class="stat-card"><div class="stat-value">${allUsers.length}</div><div class="stat-label">Total Users</div></div>
    <div class="stat-card stat-green"><div class="stat-value">${adminCount}</div><div class="stat-label">Admins</div></div>
    <div class="stat-card stat-blue"><div class="stat-value">${allUsers.length - adminCount}</div><div class="stat-label">Customers</div></div>
    <div class="stat-card stat-muted"><div class="stat-value">${allUsers.filter(u => { const d=new Date(u.createdAt); const n=new Date(); return d.getMonth()===n.getMonth()&&d.getFullYear()===n.getFullYear(); }).length}</div><div class="stat-label">New This Month</div></div>
  `;

  const body  = document.getElementById('usersTableBody');
  const empty = document.getElementById('adminEmpty');
  empty.hidden = users.length > 0;
  body.innerHTML = '';

  users.forEach(u => {
    const isMe = u.id === me.id;
    const orders = orderCountFor(u.id);
    const roleBadge = u.role === 'admin'
      ? `<span class="status-badge status-active">Admin</span>`
      : `<span class="status-badge status-inactive">User</span>`;

    const row = document.createElement('tr');
    row.innerHTML = `
      <td><strong>${u.name}</strong>${isMe ? ' <span class="you-badge">You</span>' : ''}</td>
      <td>${u.email}</td>
      <td>${roleBadge}</td>
      <td>${orders}</td>
      <td style="font-size:.85rem">${fmtDate(u.createdAt)}</td>
      <td class="action-cell">
        <button class="action-btn edit-btn role-btn" data-id="${u.id}">Change Role</button>
        <button class="action-btn delete-btn del-btn" data-id="${u.id}" ${isMe ? 'disabled title="Cannot delete yourself"' : ''}>Delete</button>
      </td>
    `;
    body.appendChild(row);
  });
}

// ── Event delegation ──
document.getElementById('usersTableBody').addEventListener('click', e => {
  const roleBtn = e.target.closest('.role-btn');
  const delBtn  = e.target.closest('.del-btn');
  if (roleBtn) openRoleModal(roleBtn.dataset.id);
  if (delBtn && !delBtn.disabled) openDeleteModal(delBtn.dataset.id);
});

// ── Edit Role Modal ──
function openRoleModal(id) {
  const user = Auth.getUsers().find(u => u.id === id);
  if (!user) return;
  document.getElementById('editUserId').value     = id;
  document.getElementById('editUserName').textContent = `${user.name} (${user.email})`;
  document.getElementById('editRoleAdmin').checked    = user.role === 'admin';
  document.getElementById('roleError').textContent    = '';
  document.getElementById('editRoleModal').hidden     = false;
}
function closeRoleModal() { document.getElementById('editRoleModal').hidden = true; }

document.getElementById('closeRoleModal').addEventListener('click', closeRoleModal);
document.getElementById('cancelRoleModal').addEventListener('click', closeRoleModal);
document.getElementById('editRoleModal').addEventListener('click', e => { if (e.target === document.getElementById('editRoleModal')) closeRoleModal(); });

document.getElementById('editRoleForm').addEventListener('submit', e => {
  e.preventDefault();
  const id      = document.getElementById('editUserId').value;
  const isAdmin = document.getElementById('editRoleAdmin').checked;
  const me      = Auth.getSession();

  if (id === me.id && !isAdmin) {
    document.getElementById('roleError').textContent = 'You cannot remove your own admin role.';
    return;
  }
  Auth.updateUser(id, { role: isAdmin ? 'admin' : 'user' });
  closeRoleModal();
  render();
});

// ── Delete User Modal ──
let pendingDeleteId = null;

function openDeleteModal(id) {
  pendingDeleteId = id;
  const user = Auth.getUsers().find(u => u.id === id);
  document.getElementById('deleteUserName').textContent = user ? user.name : id;
  document.getElementById('deleteUserModal').hidden = false;
}
document.getElementById('cancelDeleteUser').addEventListener('click',  () => { document.getElementById('deleteUserModal').hidden = true; });
document.getElementById('deleteUserModal').addEventListener('click', e => { if (e.target === document.getElementById('deleteUserModal')) document.getElementById('deleteUserModal').hidden = true; });
document.getElementById('confirmDeleteUser').addEventListener('click', () => {
  if (!pendingDeleteId) return;
  Auth.deleteUser(pendingDeleteId);
  document.getElementById('deleteUserModal').hidden = true;
  pendingDeleteId = null;
  render();
});

document.getElementById('userSearch').addEventListener('input', render);
document.getElementById('userFilter').addEventListener('change', render);

if (Auth.getSession()?.role === 'admin') { showDashboard(); } else { showLogin(); }
