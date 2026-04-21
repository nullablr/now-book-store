'use strict';

// ── Toast ──
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

// ── Cart helpers ──
function loadCart() {
  try { return JSON.parse(localStorage.getItem('bookshopcart') || '[]'); } catch { return []; }
}
function saveCart(cart) {
  localStorage.setItem('bookshopcart', JSON.stringify(cart));
}
function updateCartCount(cart) {
  const count = cart.reduce((s, c) => s + c.qty, 0);
  const el = document.getElementById('cartCount');
  if (el) el.textContent = count;
}

function addToCart(book) {
  const cart = loadCart();
  const existing = cart.find(c => c.id === book.id);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ id: book.id, title: book.title, author: book.author, price: book.price,
                emoji: book.emoji, bg: book.bg, cover: book.cover, qty: 1 });
  }
  saveCart(cart);
  updateCartCount(cart);
  showToast(`"${book.title}" added to cart`);
  // Refresh button states
  document.querySelectorAll('[data-add-id="' + book.id + '"]').forEach(btn => {
    const inCart = cart.find(c => c.id === book.id);
    btn.classList.add('in-cart');
    btn.textContent = `In cart (${inCart.qty})`;
  });
}

// ── Author initials helper ──
function getInitials(name) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ── Mini book card for related sections ──
function buildMiniCard(book, cart) {
  const inCart = cart.find(c => c.id === book.id);
  return `
    <div class="book-card">
      <a href="book.html?id=${book.id}" class="book-cover" style="background:${book.bg}">
        <span class="cover-emoji">${book.emoji}</span>
        <img src="${book.cover}" alt="${book.title}" class="cover-img" loading="lazy" onerror="this.style.display='none'"/>
      </a>
      <div class="book-info">
        <div class="book-title"><a href="book.html?id=${book.id}" class="book-title-link">${book.title}</a></div>
        <div class="book-author">${book.author}</div>
        <span class="book-category">${book.category}</span>
      </div>
      <div class="book-footer">
        <span class="book-price">$${book.price.toFixed(2)}</span>
        <button class="add-btn${inCart ? ' in-cart' : ''}" data-add-id="${book.id}">
          ${inCart ? `In cart (${inCart.qty})` : 'Add'}
        </button>
      </div>
    </div>
  `;
}

// ── Main ──
document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const id = Number(params.get('id'));
  const main = document.getElementById('bookMain');

  if (!id || isNaN(id)) {
    main.innerHTML = `
      <div class="bd-not-found">
        <p>Book not found.</p>
        <a href="index.html" class="btn-outline">Back to Shop</a>
      </div>`;
    return;
  }

  const book = BOOKS.find(b => b.id === id);
  if (!book) {
    main.innerHTML = `
      <div class="bd-not-found">
        <p>Book not found.</p>
        <a href="index.html" class="btn-outline">Back to Shop</a>
      </div>`;
    return;
  }

  // Update page title
  document.title = `${book.title} — Now Book Store`;

  // Load cart
  const cart = loadCart();
  updateCartCount(cart);

  // Other books by same author
  const moreByAuthor = BOOKS.filter(b => b.author === book.author && b.id !== book.id);

  // Recommendations
  const recs = (book.recommendations || [])
    .map(rid => BOOKS.find(b => b.id === rid))
    .filter(Boolean)
    .slice(0, 4);

  // Author initials
  const initials = getInitials(book.author);
  const inCart = cart.find(c => c.id === book.id);

  // Other works list
  const otherWorksHtml = book.otherWorks && book.otherWorks.length
    ? `<ul class="bd-other-works">${book.otherWorks.map(w => `<li>${w}</li>`).join('')}</ul>`
    : '<p class="bd-other-works-none">No other works listed.</p>';

  // More by author section (hidden if empty)
  const moreByAuthorHtml = moreByAuthor.length
    ? `<section class="bd-related-section">
        <h2 class="bd-section-title">More by ${book.author}</h2>
        <div class="book-grid bd-mini-grid">
          ${moreByAuthor.map(b => buildMiniCard(b, cart)).join('')}
        </div>
      </section>`
    : '';

  // Recommendations section
  const recsHtml = recs.length
    ? `<section class="bd-related-section">
        <h2 class="bd-section-title">You Might Also Like</h2>
        <div class="book-grid bd-mini-grid">
          ${recs.map(b => buildMiniCard(b, cart)).join('')}
        </div>
      </section>`
    : '';

  main.innerHTML = `
    <nav class="breadcrumb">
      <a href="index.html">Shop</a>
      <span>/</span>
      <span>${book.title}</span>
    </nav>

    <!-- Hero -->
    <section class="bd-hero">
      <div class="bd-cover-wrap" style="background:${book.bg}">
        <span class="cover-emoji" style="font-size:4rem">${book.emoji}</span>
        <img src="${book.cover}" alt="${book.title}" class="cover-img bd-cover-img" loading="eager"
             onerror="this.style.display='none'" />
      </div>
      <div class="bd-info">
        <span class="book-category">${book.category}</span>
        <h1 class="bd-title">${book.title}</h1>
        <p class="bd-author-name">by ${book.author}</p>
        <p class="bd-description">${book.description}</p>
        <div class="bd-buy">
          <span class="bd-price">$${book.price.toFixed(2)}</span>
          <button class="add-btn bd-add-btn${inCart ? ' in-cart' : ''}" data-add-id="${book.id}">
            ${inCart ? `In cart (${inCart.qty})` : 'Add to Cart'}
          </button>
        </div>
      </div>
    </section>

    <!-- About the Author -->
    <section class="bd-author-section">
      <h2 class="bd-section-title">About the Author</h2>
      <div class="bd-author-card">
        <div class="bd-author-photo" aria-label="${book.author}">
          <span class="author-initials">${initials}</span>
          <img src="${book.authorPhoto}" alt="${book.author}"
               onerror="this.style.display='none'" />
        </div>
        <div class="bd-author-text">
          <h3 class="bd-author-heading">${book.author}</h3>
          <p class="bd-author-bio">${book.authorBio}</p>
          <div class="bd-other-works-wrap">
            <strong class="bd-other-works-label">Other works:</strong>
            ${otherWorksHtml}
          </div>
        </div>
      </div>
    </section>

    ${moreByAuthorHtml}
    ${recsHtml}
  `;

  // ── Event delegation for all add-to-cart buttons ──
  main.addEventListener('click', e => {
    const btn = e.target.closest('[data-add-id]');
    if (!btn) return;
    const bookId = Number(btn.dataset.addId);
    const target = BOOKS.find(b => b.id === bookId);
    if (target) addToCart(target);
  });
});
