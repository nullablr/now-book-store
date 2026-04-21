'use strict';

function loadOrders() {
  try { return JSON.parse(localStorage.getItem('booknookorders') || '[]'); } catch { return []; }
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function render() {
  const orders = loadOrders();
  const cart   = JSON.parse(localStorage.getItem('bookshopcart') || '[]');
  const count  = cart.reduce((s, c) => s + c.qty, 0);
  document.getElementById('cartCount').textContent = count;

  const empty = document.getElementById('ordersEmpty');
  const list  = document.getElementById('ordersList');

  if (orders.length === 0) {
    empty.hidden = false;
    list.innerHTML = '';
    return;
  }
  empty.hidden = true;

  list.innerHTML = orders.map(order => `
    <div class="order-card">
      <div class="order-card-header">
        <div>
          <div class="order-id">${order.id}</div>
          <div class="order-date">${formatDate(order.date)}</div>
        </div>
        <span class="order-status">Delivered</span>
      </div>

      <div class="order-items-list">
        ${order.items.map(item => `
          <div class="order-item">
            <div class="order-item-cover" style="background:${item.bg}">
              <span class="cover-emoji">${item.emoji}</span>
              ${item.cover ? `<img src="${item.cover}" alt="${item.title}" class="cover-img" loading="lazy" onerror="this.style.display='none'"/>` : ''}
            </div>
            <div>
              <div class="order-item-title">${item.title}</div>
              <div class="order-item-meta">${item.author} &middot; Qty: ${item.qty}</div>
            </div>
            <div class="order-item-price">$${(item.price * item.qty).toFixed(2)}</div>
          </div>
        `).join('')}
      </div>

      <div class="order-card-footer">
        ${order.promoCode ? `<span>Promo: <strong>${order.promoCode}</strong></span>` : ''}
        ${order.shipping === 0 ? '<span>Free shipping</span>' : `<span>Shipping: $${order.shipping.toFixed(2)}</span>`}
        <span>Tax: $${order.tax.toFixed(2)}</span>
        <span class="order-total">Total: $${order.total.toFixed(2)}</span>
      </div>
    </div>
  `).join('');
}

document.getElementById('clearOrdersBtn').addEventListener('click', () => {
  if (confirm('Clear all order history?')) {
    localStorage.removeItem('booknookorders');
    render();
  }
});

render();
