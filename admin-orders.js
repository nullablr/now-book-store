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

function loadOrders() {
  try { return JSON.parse(localStorage.getItem('booknookorders') || '[]'); } catch { return []; }
}
function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
}
function fmtMoney(n) { return '$' + n.toFixed(2); }

let expandedRows = new Set();

function render() {
  const allOrders = loadOrders();
  const q         = document.getElementById('orderSearch').value.toLowerCase();
  const filter    = document.getElementById('orderFilter').value;

  const orders = allOrders.filter(o => {
    if (filter === 'account' && !o.userId) return false;
    if (filter === 'guest'   &&  o.userId) return false;
    if (q) {
      const match = o.id.toLowerCase().includes(q) ||
        (o.userName || '').toLowerCase().includes(q) ||
        (o.userEmail || '').toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const revenue = allOrders.reduce((s, o) => s + o.total, 0);
  const customers = new Set(allOrders.filter(o => o.userId).map(o => o.userId)).size;
  document.getElementById('adminStats').innerHTML = `
    <div class="stat-card"><div class="stat-value">${allOrders.length}</div><div class="stat-label">Total Orders</div></div>
    <div class="stat-card stat-green"><div class="stat-value">${fmtMoney(revenue)}</div><div class="stat-label">Total Revenue</div></div>
    <div class="stat-card stat-blue"><div class="stat-value">${customers}</div><div class="stat-label">Registered Customers</div></div>
    <div class="stat-card stat-muted"><div class="stat-value">${allOrders.length - customers > 0 ? allOrders.filter(o=>!o.userId).length : 0}</div><div class="stat-label">Guest Orders</div></div>
  `;

  const empty = document.getElementById('adminEmpty');
  const body  = document.getElementById('ordersTableBody');
  empty.hidden = orders.length > 0;
  body.innerHTML = '';

  orders.forEach(order => {
    const isExpanded = expandedRows.has(order.id);
    const customer   = order.userName
      ? `<div class="ao-customer-name">${order.userName}</div><div class="ao-customer-email">${order.userEmail}</div>`
      : `<span class="status-badge status-inactive">Guest</span>`;

    const row = document.createElement('tr');
    row.className = 'ao-row' + (isExpanded ? ' ao-expanded' : '');
    row.dataset.id = order.id;
    row.innerHTML = `
      <td><button class="ao-expand-btn" data-id="${order.id}">${isExpanded ? '▾' : '▸'}</button></td>
      <td><code class="promo-code-cell">${order.id}</code></td>
      <td style="white-space:nowrap;font-size:.85rem">${fmtDate(order.date)}</td>
      <td>${customer}</td>
      <td>${order.items.reduce((s,i) => s+i.qty, 0)} item(s)</td>
      <td>${order.promoCode ? `<code class="promo-code-cell">${order.promoCode}</code>` : '—'}</td>
      <td><strong>${fmtMoney(order.total)}</strong></td>
      <td><span class="status-badge status-active">Delivered</span></td>
    `;
    body.appendChild(row);

    if (isExpanded) {
      const detail = document.createElement('tr');
      detail.className = 'ao-detail-row';
      detail.innerHTML = `
        <td colspan="8">
          <div class="ao-detail">
            <div class="ao-items">
              ${order.items.map(item => `
                <div class="ao-item">
                  <div class="order-item-cover" style="background:${item.bg}">
                    <span class="cover-emoji">${item.emoji}</span>
                    ${item.cover ? `<img src="${item.cover}" alt="${item.title}" class="cover-img" loading="lazy" onerror="this.style.display='none'"/>` : ''}
                  </div>
                  <div>
                    <div class="order-item-title">${item.title}</div>
                    <div class="order-item-meta">${item.author} &middot; Qty: ${item.qty} &middot; ${fmtMoney(item.price)} each</div>
                  </div>
                  <div class="order-item-price">${fmtMoney(item.price * item.qty)}</div>
                </div>
              `).join('')}
            </div>
            <div class="ao-summary">
              <div class="ao-summary-line"><span>Subtotal</span><span>${fmtMoney(order.subtotal)}</span></div>
              ${order.discount > 0 ? `<div class="ao-summary-line"><span>Discount (${order.promoCode})</span><span class="discount-value">−${fmtMoney(order.discount)}</span></div>` : ''}
              <div class="ao-summary-line"><span>Shipping</span><span>${order.shipping === 0 ? 'Free' : fmtMoney(order.shipping)}</span></div>
              <div class="ao-summary-line"><span>Tax</span><span>${fmtMoney(order.tax)}</span></div>
              <div class="ao-summary-line ao-summary-total"><span>Total</span><span>${fmtMoney(order.total)}</span></div>
            </div>
          </div>
        </td>
      `;
      body.appendChild(detail);
    }
  });
}

document.getElementById('ordersTableBody').addEventListener('click', e => {
  const btn = e.target.closest('.ao-expand-btn');
  if (!btn) return;
  const id = btn.dataset.id;
  if (expandedRows.has(id)) expandedRows.delete(id); else expandedRows.add(id);
  render();
});

document.getElementById('orderSearch').addEventListener('input', render);
document.getElementById('orderFilter').addEventListener('change', render);

if (Auth.getSession()?.role === 'admin') { showDashboard(); } else { showLogin(); }
