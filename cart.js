'use strict';

const SHIPPING_THRESHOLD = 35;
const SHIPPING_COST = 4.99;
const TAX_RATE = 0.08;

const DEFAULT_PROMOS = [
  { code: 'BOOKS10',      discount: 10, active: true, maxUses: null, expiresAt: null, usages: 0, createdAt: new Date().toISOString() },
  { code: 'READ20',       discount: 20, active: true, maxUses: null, expiresAt: null, usages: 0, createdAt: new Date().toISOString() },
  { code: 'FIRSTBOOK',    discount: 15, active: true, maxUses: 100,  expiresAt: null, usages: 0, createdAt: new Date().toISOString() },
  { code: 'NEWSLETTER10', discount: 10, active: true, maxUses: null, expiresAt: null, usages: 0, createdAt: new Date().toISOString() },
];

let cart = loadCart();
let discount = 0;
let promoCode = '';
let appliedPromo = null;

function loadCart() {
  try { return JSON.parse(localStorage.getItem('bookshopcart') || '[]'); } catch { return []; }
}
function saveCart() {
  localStorage.setItem('bookshopcart', JSON.stringify(cart));
}

function loadPromos() {
  try {
    const stored = JSON.parse(localStorage.getItem('booknookpromos'));
    if (Array.isArray(stored) && stored.length) {
      // Merge: add any newly introduced default promos
      let changed = false;
      for (const def of DEFAULT_PROMOS) {
        if (!stored.find(p => p.code === def.code)) {
          stored.push(def);
          changed = true;
        }
      }
      if (changed) localStorage.setItem('booknookpromos', JSON.stringify(stored));
      return stored;
    }
  } catch { /* fall through */ }
  localStorage.setItem('booknookpromos', JSON.stringify(DEFAULT_PROMOS));
  return DEFAULT_PROMOS;
}

function findPromo(code) {
  const promos = loadPromos();
  const p = promos.find(p => p.code === code.toUpperCase());
  if (!p) return { valid: false, reason: 'Invalid promo code.' };
  if (!p.active) return { valid: false, reason: 'This promo code is inactive.' };
  if (p.expiresAt && new Date(p.expiresAt) < new Date()) return { valid: false, reason: 'This promo code has expired.' };
  if (p.maxUses !== null && p.usages >= p.maxUses) return { valid: false, reason: 'This promo code has reached its usage limit.' };
  return { valid: true, promo: p };
}

function recordPromoUsage(code) {
  const promos = loadPromos();
  const p = promos.find(p => p.code === code);
  if (p) { p.usages = (p.usages || 0) + 1; }
  localStorage.setItem('booknookpromos', JSON.stringify(promos));
}

function changeQty(id, delta) {
  const item = cart.find(c => c.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) cart = cart.filter(c => c.id !== id);
  saveCart();
  render();
}

function removeItem(id) {
  cart = cart.filter(c => c.id !== id);
  saveCart();
  render();
}

function calcTotals() {
  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const qty      = cart.reduce((s, c) => s + c.qty, 0);
  const shipping = subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
  const discountAmt = subtotal * discount;
  const taxable  = subtotal - discountAmt;
  const tax      = taxable * TAX_RATE;
  const total    = taxable + shipping + tax;
  return { subtotal, qty, shipping, discountAmt, tax, total };
}

function render() {
  const empty    = document.getElementById('cartPageEmpty');
  const layout   = document.getElementById('cartLayout');
  const itemsEl  = document.getElementById('cartPageItems');
  const count    = document.getElementById('cartCount');

  const totals = calcTotals();
  count.textContent = totals.qty;

  if (cart.length === 0) {
    empty.hidden = false;
    layout.hidden = true;
    return;
  }
  empty.hidden = true;
  layout.hidden = false;

  itemsEl.innerHTML = cart.map(item => `
    <div class="cp-item">
      <div class="cp-item-cover" style="background:${item.bg}">
        <span class="cover-emoji">${item.emoji}</span>
        <img src="${item.cover || ''}" alt="${item.title}" class="cover-img" loading="lazy" onerror="this.style.display='none'"/>
      </div>
      <div class="cp-item-info">
        <div class="cp-item-title">${item.title}</div>
        <div class="cp-item-author">${item.author}</div>
        <div class="cp-item-unit">$${item.price.toFixed(2)} each</div>
      </div>
      <div class="cp-item-qty">
        <button class="qty-btn" data-id="${item.id}" data-delta="-1">−</button>
        <span class="qty-value">${item.qty}</span>
        <button class="qty-btn" data-id="${item.id}" data-delta="1">+</button>
      </div>
      <div class="cp-item-line">$${(item.price * item.qty).toFixed(2)}</div>
      <button class="cp-remove" data-id="${item.id}" title="Remove">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  `).join('');

  // Summary
  document.getElementById('summaryQty').textContent = totals.qty;
  document.getElementById('summarySubtotal').textContent = `$${totals.subtotal.toFixed(2)}`;
  document.getElementById('summaryShipping').textContent = totals.shipping === 0 ? 'Free' : `$${totals.shipping.toFixed(2)}`;
  document.getElementById('summaryTax').textContent = `$${totals.tax.toFixed(2)}`;
  document.getElementById('summaryTotal').textContent = `$${totals.total.toFixed(2)}`;

  const discountLine = document.getElementById('discountLine');
  if (discount > 0) {
    discountLine.hidden = false;
    document.getElementById('discountLabel').textContent = promoCode;
    document.getElementById('discountAmount').textContent = `-$${totals.discountAmt.toFixed(2)}`;
  } else {
    discountLine.hidden = true;
  }
}

// ── Event delegation ──
document.getElementById('cartPageItems').addEventListener('click', e => {
  const qBtn = e.target.closest('.qty-btn');
  if (qBtn) { changeQty(Number(qBtn.dataset.id), Number(qBtn.dataset.delta)); return; }
  const rmBtn = e.target.closest('.cp-remove');
  if (rmBtn) removeItem(Number(rmBtn.dataset.id));
});

document.getElementById('promoApply').addEventListener('click', () => {
  const code   = document.getElementById('promoInput').value.trim().toUpperCase();
  const msg    = document.getElementById('promoMsg');
  const result = findPromo(code);
  if (result.valid) {
    appliedPromo = result.promo;
    discount     = result.promo.discount / 100;
    promoCode    = code;
    msg.textContent = `Code "${code}" applied — ${result.promo.discount}% off!`;
    msg.className = 'promo-msg promo-ok';
    document.getElementById('promoInput').disabled = true;
    document.getElementById('promoApply').disabled = true;
  } else {
    msg.textContent = result.reason;
    msg.className = 'promo-msg promo-err';
  }
  render();
});

document.getElementById('promoInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('promoApply').click();
});

document.getElementById('checkoutBtn').addEventListener('click', () => {
  if (cart.length === 0) return;
  openPaymentModal();
});

// ── Payment (Stripe) ──
let stripeInstance = null;
let stripeElements = null;

async function loadStripe() {
  if (stripeInstance) return stripeInstance;
  try {
    const res = await fetch('/config');
    const { publishableKey } = await res.json();
    if (!publishableKey) throw new Error('Publishable key missing — check your .env file.');
    stripeInstance = Stripe(publishableKey); // eslint-disable-line no-undef
  } catch (err) {
    throw new Error('Could not load Stripe config. Make sure the Node.js server is running. (' + err.message + ')');
  }
  return stripeInstance;
}

function showPayError(msg) {
  const el = document.getElementById('payError');
  el.textContent = msg;
  el.hidden = false;
}

async function openPaymentModal() {
  const totals = calcTotals();
  const fmt = `$${totals.total.toFixed(2)}`;

  document.getElementById('payTotal').textContent     = fmt;
  document.getElementById('payBtnAmount').textContent = fmt;
  document.getElementById('payError').hidden          = true;
  document.getElementById('pay-loading').hidden       = false;
  document.getElementById('payment-element').innerHTML = '';
  document.getElementById('paySubmit').disabled       = true;
  document.getElementById('paymentOverlay').hidden    = false;

  try {
    const stripe = await loadStripe();

    const res = await fetch('/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: Math.round(totals.total * 100) }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    stripeElements = stripe.elements({
      clientSecret: data.clientSecret,
      appearance: {
        theme: 'stripe',
        variables: {
          colorPrimary:     '#62d84e',
          colorBackground:  '#ffffff',
          colorText:        '#1a1a1a',
          colorDanger:      '#e53e3e',
          fontFamily:       '"Source Sans 3", system-ui, sans-serif',
          borderRadius:     '8px',
          spacingUnit:      '4px',
        },
        rules: {
          '.Label': {
            color: '#6b7280', fontWeight: '700',
            textTransform: 'uppercase', fontSize: '0.78rem', letterSpacing: '0.05em',
          },
          '.Input': { border: '1.5px solid #dde1e7', boxShadow: 'none' },
          '.Input:focus': { border: '1.5px solid #62d84e', boxShadow: '0 0 0 3px rgba(98,216,78,.15)' },
        }
      }
    });

    const payEl = stripeElements.create('payment');
    payEl.mount('#payment-element');
    payEl.on('ready', () => {
      document.getElementById('pay-loading').hidden = true;
      document.getElementById('paySubmit').disabled = false;
    });

  } catch (err) {
    document.getElementById('pay-loading').hidden = true;
    const msg = (err.message === 'Failed to fetch' || err.message === 'NetworkError when attempting to fetch resource.')
      ? 'Could not reach the server. Start it with: npm run dev'
      : (err.message || 'Could not load payment form.');
    showPayError(msg);
  }
}

function closePaymentModal() {
  document.getElementById('paymentOverlay').hidden = true;
  document.getElementById('payError').hidden = true;
  if (stripeElements) {
    try { stripeElements.getElement('payment')?.unmount(); } catch { /* ignore */ }
    stripeElements = null;
  }
}

function placeOrder() {
  const totals = calcTotals();
  const orders = JSON.parse(localStorage.getItem('booknookorders') || '[]');
  const _session = typeof Auth !== 'undefined' ? Auth.getSession() : null;
  orders.unshift({
    id: 'ORD-' + Date.now(),
    date: new Date().toISOString(),
    userId:    _session?.id    || null,
    userName:  _session?.name  || null,
    userEmail: _session?.email || null,
    items: cart.map(c => ({ id: c.id, title: c.title, author: c.author, emoji: c.emoji, bg: c.bg, cover: c.cover, qty: c.qty, price: c.price })),
    subtotal: totals.subtotal,
    shipping: totals.shipping,
    discount: totals.discountAmt,
    tax:      totals.tax,
    total:    totals.total,
    promoCode: promoCode || null,
  });
  localStorage.setItem('booknookorders', JSON.stringify(orders));
  if (promoCode) recordPromoUsage(promoCode);
  cart = []; discount = 0; promoCode = ''; appliedPromo = null;
  saveCart();
}

document.getElementById('paymentForm').addEventListener('submit', async e => {
  e.preventDefault();
  if (!stripeInstance || !stripeElements) return;

  const btn = document.getElementById('paySubmit');
  btn.disabled    = true;
  btn.textContent = 'Processing…';
  document.getElementById('payError').hidden = true;

  const { error } = await stripeInstance.confirmPayment({
    elements: stripeElements,
    redirect: 'if_required',
    confirmParams: { return_url: window.location.href },
  });

  if (error) {
    showPayError(error.message);
    btn.disabled = false;
    btn.innerHTML = `Pay <span id="payBtnAmount">${document.getElementById('payTotal').textContent}</span>`;
    return;
  }

  placeOrder();
  closePaymentModal();
  document.getElementById('modalOverlay').hidden = false;
  render();
});

document.getElementById('paymentClose').addEventListener('click', closePaymentModal);
document.getElementById('paymentOverlay').addEventListener('click', e => {
  if (e.target === document.getElementById('paymentOverlay')) closePaymentModal();
});

document.getElementById('modalOverlay').addEventListener('click', e => {
  if (e.target === document.getElementById('modalOverlay')) {
    document.getElementById('modalOverlay').hidden = true;
  }
});

render();
