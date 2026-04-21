'use strict';

let cart = loadCart();
let activeCategory = 'all';
let searchQuery    = '';
let viewMode       = 'grid';
let carouselIndex  = 0;
let carouselBooks  = [];
let autoplayTimer  = null;

// ── Persistence ──
function loadCart() {
  try { return JSON.parse(localStorage.getItem('bookshopcart') || '[]'); } catch { return []; }
}
function saveCart() {
  localStorage.setItem('bookshopcart', JSON.stringify(cart));
}

// ── Render Books ──
function renderBooks() {
  const grid = document.getElementById('bookGrid');
  const noResults = document.getElementById('noResults');
  const q = searchQuery.toLowerCase();

  const filtered = BOOKS.filter(b => {
    const matchCat = activeCategory === 'all' || b.category === activeCategory;
    const matchSearch = !q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  grid.innerHTML = '';
  noResults.hidden = filtered.length > 0;

  filtered.forEach(book => {
    const inCart = cart.find(c => c.id === book.id);
    const card = document.createElement('div');
    card.className = 'book-card';
    card.innerHTML = `
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
        <button class="add-btn${inCart ? ' in-cart' : ''}" data-id="${book.id}">
          ${inCart ? `In cart (${inCart.qty})` : 'Add'}
        </button>
      </div>
    `;
    grid.appendChild(card);
  });
}

// ── Cart Logic ──
function addToCart(id) {
  const book = BOOKS.find(b => b.id === id);
  const existing = cart.find(c => c.id === id);
  if (existing) { existing.qty++; } else { cart.push({ ...book, qty: 1 }); }
  saveCart();
  updateCartUI();
  renderBooks();
  showToast(`"${book.title}" added to cart`);
}

function changeQty(id, delta) {
  const item = cart.find(c => c.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) cart = cart.filter(c => c.id !== id);
  saveCart();
  updateCartUI();
  renderBooks();
}

function updateCartUI() {
  const count = cart.reduce((s, c) => s + c.qty, 0);
  const total = cart.reduce((s, c) => s + c.price * c.qty, 0);

  document.getElementById('cartCount').textContent = count;
  document.getElementById('cartTotal').textContent = `$${total.toFixed(2)}`;

  const itemsEl = document.getElementById('cartItems');

  if (cart.length === 0) {
    itemsEl.innerHTML = `<div class="cart-empty">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
      <p>Your cart is empty</p>
    </div>`;
    return;
  }

  itemsEl.innerHTML = cart.map(item => `
    <div class="cart-item">
      <div class="cart-item-cover" style="background:${item.bg}">
        <span class="cover-emoji">${item.emoji}</span>
        <img src="${item.cover || ''}" alt="${item.title}" class="cover-img" loading="lazy" onerror="this.style.display='none'"/>
      </div>
      <div class="cart-item-details">
        <div class="cart-item-title">${item.title}</div>
        <div class="cart-item-author">${item.author}</div>
        <div class="cart-item-controls">
          <button class="qty-btn" data-id="${item.id}" data-delta="-1">−</button>
          <span class="qty-value">${item.qty}</span>
          <button class="qty-btn" data-id="${item.id}" data-delta="1">+</button>
        </div>
      </div>
      <div class="cart-item-price">$${(item.price * item.qty).toFixed(2)}</div>
    </div>
  `).join('');
}

// ── Cart Drawer Toggle ──
function openCart() {
  document.getElementById('cartDrawer').classList.add('open');
  document.getElementById('cartOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeCart() {
  document.getElementById('cartDrawer').classList.remove('open');
  document.getElementById('cartOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

// ── Toast ──
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

// ── Carousel ──────────────────────────────────────────
function getFilteredBooks() {
  const q = searchQuery.toLowerCase();
  return BOOKS.filter(b => {
    const matchCat    = activeCategory === 'all' || b.category === activeCategory;
    const matchSearch = !q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });
}

function renderCarousel(direction) {
  carouselBooks = getFilteredBooks();
  const wrap  = document.getElementById('carouselWrap');
  const stage = document.getElementById('csStage');
  const dots  = document.getElementById('csDots');
  const counter = document.getElementById('csCounter');

  if (carouselBooks.length === 0) {
    stage.innerHTML = '<p class="cs-empty">No books match your search.</p>';
    dots.innerHTML = '';
    counter.textContent = '';
    return;
  }

  carouselIndex = Math.max(0, Math.min(carouselIndex, carouselBooks.length - 1));
  const book    = carouselBooks[carouselIndex];
  const inCart  = cart.find(c => c.id === book.id);
  const animClass = direction === 'next' ? 'cs-anim-next' : direction === 'prev' ? 'cs-anim-prev' : '';

  stage.innerHTML = `
    <div class="cs-slide ${animClass}">
      <div class="cs-cover-wrap" style="background:${book.bg}">
        <span class="cover-emoji" style="font-size:4rem">${book.emoji}</span>
        <img src="${book.cover}" alt="${book.title}" class="cover-img cs-cover-img" loading="eager"
             onerror="this.style.display='none'" />
      </div>
      <div class="cs-info">
        <span class="cs-category">${book.category}</span>
        <h2 class="cs-title"><a href="book.html?id=${book.id}" class="cs-title-link">${book.title}</a></h2>
        <p class="cs-author">${book.author}</p>
        <p class="cs-price">$${book.price.toFixed(2)}</p>
        <button class="cs-add-btn${inCart ? ' cs-in-cart' : ''}" data-id="${book.id}">
          ${inCart ? `In cart&nbsp;(${inCart.qty})` : 'Add to Cart'}
        </button>
      </div>
    </div>
  `;

  // Dots
  dots.innerHTML = carouselBooks.map((_, i) =>
    `<button class="cs-dot${i === carouselIndex ? ' active' : ''}" data-i="${i}" aria-label="Book ${i+1}"></button>`
  ).join('');
  counter.textContent = `${carouselIndex + 1} / ${carouselBooks.length}`;
}

function carouselGo(direction) {
  if (!carouselBooks.length) return;
  resetAutoplay();
  if (direction === 'next') carouselIndex = (carouselIndex + 1) % carouselBooks.length;
  else                       carouselIndex = (carouselIndex - 1 + carouselBooks.length) % carouselBooks.length;
  renderCarousel(direction);
}

function startAutoplay() {
  autoplayTimer = setInterval(() => carouselGo('next'), 5000);
}
function resetAutoplay() {
  clearInterval(autoplayTimer);
  startAutoplay();
}

function setView(mode) {
  viewMode = mode;
  const gridWrap     = document.getElementById('bookGrid');
  const carouselWrap = document.getElementById('carouselWrap');
  const noResults    = document.getElementById('noResults');

  document.getElementById('gridViewBtn').classList.toggle('active', mode === 'grid');
  document.getElementById('carouselViewBtn').classList.toggle('active', mode === 'carousel');

  if (mode === 'grid') {
    gridWrap.hidden     = false;
    carouselWrap.hidden = true;
    noResults.hidden    = false;
    clearInterval(autoplayTimer);
    renderBooks();
  } else {
    gridWrap.hidden     = true;
    carouselWrap.hidden = false;
    noResults.hidden    = true;
    carouselIndex = 0;
    renderCarousel();
    startAutoplay();
  }
}

// ── Event Listeners ──
document.getElementById('bookGrid').addEventListener('click', e => {
  const btn = e.target.closest('.add-btn');
  if (btn) addToCart(Number(btn.dataset.id));
});

document.getElementById('cartItems').addEventListener('click', e => {
  const btn = e.target.closest('.qty-btn');
  if (btn) changeQty(Number(btn.dataset.id), Number(btn.dataset.delta));
});

document.getElementById('csStage').addEventListener('click', e => {
  const btn = e.target.closest('.cs-add-btn');
  if (btn) { addToCart(Number(btn.dataset.id)); renderCarousel(); }
});

document.getElementById('csDots').addEventListener('click', e => {
  const dot = e.target.closest('.cs-dot');
  if (!dot) return;
  const newIdx = Number(dot.dataset.i);
  const dir    = newIdx > carouselIndex ? 'next' : 'prev';
  carouselIndex = newIdx;
  resetAutoplay();
  renderCarousel(dir);
});

document.getElementById('csPrev').addEventListener('click', () => carouselGo('prev'));
document.getElementById('csNext').addEventListener('click', () => carouselGo('next'));

// Pause autoplay on hover
document.getElementById('carouselWrap').addEventListener('mouseenter', () => clearInterval(autoplayTimer));
document.getElementById('carouselWrap').addEventListener('mouseleave', () => { if (viewMode === 'carousel') startAutoplay(); });

// Keyboard navigation
document.addEventListener('keydown', e => {
  if (viewMode !== 'carousel') return;
  if (e.key === 'ArrowRight') carouselGo('next');
  if (e.key === 'ArrowLeft')  carouselGo('prev');
});

// Touch / swipe
let touchStartX = 0;
document.getElementById('csStage').addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
document.getElementById('csStage').addEventListener('touchend',   e => {
  const dx = e.changedTouches[0].clientX - touchStartX;
  if (Math.abs(dx) > 40) carouselGo(dx < 0 ? 'next' : 'prev');
});

document.getElementById('cartBtn').addEventListener('click', openCart);
document.getElementById('closeCart').addEventListener('click', closeCart);
document.getElementById('cartOverlay').addEventListener('click', closeCart);

document.getElementById('gridViewBtn').addEventListener('click', () => setView('grid'));
document.getElementById('carouselViewBtn').addEventListener('click', () => setView('carousel'));

document.getElementById('categorySelect').addEventListener('change', e => {
  activeCategory = e.target.value;
  if (viewMode === 'grid') renderBooks();
  else { carouselIndex = 0; renderCarousel(); }
});

let searchTimer;
document.getElementById('search').addEventListener('input', e => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    searchQuery = e.target.value;
    if (viewMode === 'grid') renderBooks();
    else { carouselIndex = 0; renderCarousel(); }
  }, 200);
});

// ── Init ──
renderBooks();
updateCartUI();
