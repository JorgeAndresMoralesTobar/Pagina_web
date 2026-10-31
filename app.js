// AURA LUXE COMMERCE - Main Application Controller

class StoreApp {
  constructor() {
    this.products = [...PRODUCTS];
    this.filteredProducts = [...PRODUCTS];
    this.cart = this.loadFromStorage('aura_cart', []);
    this.wishlist = this.loadFromStorage('aura_wishlist', []);
    this.currentCategory = 'todas';
    this.searchQuery = '';
    this.sortBy = 'featured';
    this.maxPrice = 999999999;
    this.appliedCoupon = null;
    this.currentCurrency = this.loadFromStorage('aura_currency', 'COP');
    this.currentCountry = this.loadFromStorage('aura_country', 'CO');
    this.editingProductId = null;
    this.quickViewProduct = null;
    this.quickViewSelectedImage = 0;
    this.quickViewSelectedSize = null;
    this.quickViewSelectedColor = null;
    this.quickViewQty = 1;
    this.currentLayout = 'grid-4'; // grid-4, grid-3

    this.init();
  }

  // --- CONTROL DE VISIBILIDAD Y SESIÓN ADMIN ---
  isAdmin() {
    return localStorage.getItem('aura_admin_session') === 'true';
  }

  updateAdminUI() {
    // Busca todos los elementos con la clase 'admin-only' y los muestra u oculta
    const adminElements = document.querySelectorAll('.admin-only');
    adminElements.forEach(el => {
      if (this.isAdmin()) {
        el.classList.remove('hidden');
      } else {
        el.classList.add('hidden');
      }
    });
  }

  loginAdmin() {
    const user = prompt("Acceso Administrador\nIngrese Usuario:");
    const pass = prompt("Acceso Administrador\nIngrese Contraseña:");

    if (user === "admin" && pass === "admin123") {
      localStorage.setItem('aura_admin_session', 'true');
      this.updateAdminUI();
      this.renderProducts(); // Re-renderiza para mostrar las cámaras de edición
      this.showToast("Modo Administrador", "Herramientas de edición activadas.", "success");
    } else {
      alert("Usuario o contraseña incorrectos.");
    }
  }

  logoutAdmin() {
    localStorage.removeItem('aura_admin_session');
    this.updateAdminUI();
    this.renderProducts(); // Re-renderiza para ocultar las cámaras de edición
    this.showToast("Sesión Cerrada", "Modo cliente activo. Herramientas ocultas.", "info");
  }

  loadFromStorage(key, fallback) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  saveToStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error("Storage error:", e);
    }
  }

  init() {
    this.renderCategoryPills();
    this.renderProducts();
    this.updateCartBadge();
    this.updateWishlistBadge();
    this.updateRegionDisplay();
    this.setupEventListeners();
    this.startFlashCountdown();
    this.updateAdminUI(); // <--- AÑADIR ESTA LÍNEA AQUÍ
    this.refreshIcons();
  }

  // --- MULTI-CURRENCY & GLOBAL REGION ENGINE ---
  formatPrice(euroAmount) {
    if (euroAmount === undefined || euroAmount === null) return '';
    const curr = CURRENCIES[this.currentCurrency] || CURRENCIES.EUR;
    const converted = euroAmount * curr.rate;
    
    const formattedNumber = converted.toLocaleString(undefined, {
      minimumFractionDigits: curr.decimals,
      maximumFractionDigits: curr.decimals
    });

    return curr.position === 'before' 
      ? `${curr.symbol}${formattedNumber}` 
      : `${formattedNumber} ${curr.symbol}`;
  }

  updateRegionDisplay() {
    const country = COUNTRIES.find(c => c.code === this.currentCountry) || COUNTRIES[0];
    const curr = CURRENCIES[this.currentCurrency] || CURRENCIES.EUR;

    const labelEls = document.querySelectorAll('.global-region-label');
    labelEls.forEach(el => {
      el.innerHTML = `${country.flag} ${country.code} • ${curr.code} (${curr.symbol})`;
    });

    // Also update hero card preview price
    const heroPriceEl = document.getElementById('hero-product-price');
    const heroOldPriceEl = document.getElementById('hero-product-oldprice');
    if (heroPriceEl) heroPriceEl.textContent = this.formatPrice(87707.16);
    if (heroOldPriceEl) heroOldPriceEl.textContent = this.formatPrice(105248.0);
  }

  openRegionModal() {
    const modal = document.getElementById('region-modal');
    const container = document.getElementById('region-list-container');
    if (!modal || !container) return;

    container.innerHTML = COUNTRIES.map(c => {
      const isSelected = this.currentCountry === c.code;
      const curr = CURRENCIES[c.currency];
      return `
        <button 
          onclick="app.setCountryAndCurrency('${c.code}', '${c.currency}')"
          class="flex items-center justify-between p-3.5 rounded-2xl border transition-all text-left ${
            isSelected 
              ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20' 
              : 'border-slate-200 hover:border-slate-400 bg-white'
          }"
        >
          <div class="flex items-center gap-3">
            <span class="text-2xl">${c.flag}</span>
            <div>
              <div class="font-bold text-slate-900 text-sm">${c.name}</div>
              <div class="text-xs text-slate-500">${curr.name}</div>
            </div>
          </div>
          ${isSelected ? '<span class="text-blue-600 font-bold text-xs bg-blue-100 px-2 py-0.5 rounded-full">Activo</span>' : ''}
        </button>
      `;
    }).join('');

    modal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
    this.refreshIcons();
  }

  closeRegionModal() {
    const modal = document.getElementById('region-modal');
    if (modal) {
      modal.classList.add('hidden');
      document.body.classList.remove('overflow-hidden');
    }
  }

  setCountryAndCurrency(countryCode, currencyCode) {
    this.currentCountry = countryCode;
    this.currentCurrency = currencyCode;
    this.saveToStorage('aura_country', this.currentCountry);
    this.saveToStorage('aura_currency', this.currentCurrency);

    this.updateRegionDisplay();
    this.renderProducts();
    this.renderCartItems();
    if (this.quickViewProduct) {
      this.renderQuickViewContent();
    }
    this.closeRegionModal();

    const country = COUNTRIES.find(c => c.code === countryCode);
    this.showToast('Región y Moneda actualizadas', `Ahora estás comprando desde ${country.name} con moneda ${currencyCode}.`, 'success');
  }

  refreshIcons() {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  // --- FLASH DEALS COUNTDOWN (Amazon / El Corte Inglés Style) ---
  startFlashCountdown() {
    const hoursEl = document.getElementById('cd-hours');
    const minsEl = document.getElementById('cd-mins');
    const secsEl = document.getElementById('cd-secs');

    if (!hoursEl || !minsEl || !secsEl) return;

    // Countdown to midnight or rolling 14 hours
    let totalSeconds = 14 * 3600 + 42 * 60 + 15;

    setInterval(() => {
      if (totalSeconds <= 0) totalSeconds = 24 * 3600;
      totalSeconds--;

      const h = Math.floor(totalSeconds / 3600);
      const m = Math.floor((totalSeconds % 3600) / 60);
      const s = totalSeconds % 60;

      hoursEl.textContent = String(h).padStart(2, '0');
      minsEl.textContent = String(m).padStart(2, '0');
      secsEl.textContent = String(s).padStart(2, '0');
    }, 1000);
  }

  // --- CATEGORIES ---
  renderCategoryPills() {
    const container = document.getElementById('category-pills-container');
    if (!container) return;

    const counts = { todas: this.products.length };
    this.products.forEach(p => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });

    container.innerHTML = CATEGORIES.map(cat => {
      const isActive = this.currentCategory === cat.id;
      const count = counts[cat.id] || 0;
      return `
        <button 
          onclick="app.setCategory('${cat.id}')"
          class="category-pill flex items-center gap-2 px-5 py-2.5 rounded-full text-xs md:text-sm font-semibold tracking-wide transition-all duration-200 border whitespace-nowrap ${
            isActive 
              ? 'active' 
              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400 hover:bg-slate-50'
          }"
        >
          <span>${cat.name}</span>
          <span class="text-[10px] px-2 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}">
            ${count}
          </span>
        </button>
      `;
    }).join('');
  }

  setCategory(catId) {
    this.currentCategory = catId;
    this.renderCategoryPills();
    this.applyFilters();
  }

  // --- FILTERS & SORTING ---
  applyFilters() {
    let result = [...this.products];

    // Filter by Category
    if (this.currentCategory !== 'todas') {
      result = result.filter(p => p.category === this.currentCategory);
    }

    // Filter by Search Query
    if (this.searchQuery.trim() !== '') {
      const query = this.searchQuery.toLowerCase().trim();
      result = result.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.subtitle.toLowerCase().includes(query) ||
        p.categoryName.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query)
      );
    }

    // Filter by Price
    result = result.filter(p => p.price <= this.maxPrice);

    // Sorting
    switch (this.sortBy) {
      case 'price-asc':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        result.sort((a, b) => b.rating - a.rating || b.reviewsCount - a.reviewsCount);
        break;
      case 'deals':
        result.sort((a, b) => (b.isFlashDeal ? 1 : 0) - (a.isFlashDeal ? 1 : 0));
        break;
      case 'bestseller':
        result.sort((a, b) => (b.isBestSeller ? 1 : 0) - (a.isBestSeller ? 1 : 0));
        break;
      case 'featured':
      default:
        // Default ordering
        break;
    }

    this.filteredProducts = result;
    this.renderProducts();

    const countEl = document.getElementById('products-count');
    if (countEl) {
      countEl.textContent = `${this.filteredProducts.length} producto${this.filteredProducts.length === 1 ? '' : 's'} disponible${this.filteredProducts.length === 1 ? '' : 's'}`;
    }
  }

  setSort(sortValue) {
    this.sortBy = sortValue;
    this.applyFilters();
  }

  setSearch(query) {
    this.searchQuery = query;
    this.applyFilters();
  }

  // --- RENDER PRODUCTS GRID ---
  renderProducts() {
    const grid = document.getElementById('products-grid');
    if (!grid) return;

    if (this.filteredProducts.length === 0) {
      grid.innerHTML = `
        <div class="col-span-full py-16 text-center">
          <div class="w-20 h-20 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
            <i data-lucide="search-x" class="w-10 h-10"></i>
          </div>
          <h3 class="text-xl font-bold text-slate-800 mb-2">No hemos encontrado ningún producto</h3>
          <p class="text-slate-500 max-w-md mx-auto text-sm mb-6">
            Intenta cambiar los términos de búsqueda o restablecer los filtros para descubrir nuestra colección.
          </p>
          <button 
            onclick="app.resetFilters()" 
            class="px-6 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-full hover:bg-slate-800 transition-all shadow-md hover:shadow-lg"
          >
            Ver todos los productos
          </button>
        </div>
      `;
      this.refreshIcons();
      return;
    }

    grid.innerHTML = this.filteredProducts.map(product => {
      const isFav = this.wishlist.includes(product.id);
      
      // Badges
      let badgeHtml = '';
      if (product.isFlashDeal) {
        badgeHtml = `<span class="badge-flash px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1 shadow-sm"><i data-lucide="zap" class="w-3 h-3"></i> ${product.discount} FLASH</span>`;
      } else if (product.isBestSeller) {
        badgeHtml = `<span class="badge-gold px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1 shadow-sm"><i data-lucide="award" class="w-3 h-3"></i> TOP VENTAS</span>`;
      } else if (product.isNew) {
        badgeHtml = `<span class="badge-new px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1 shadow-sm"><i data-lucide="sparkles" class="w-3 h-3"></i> NOVEDAD</span>`;
      }

      // Swatches preview
      const swatchesHtml = product.colors.map(c => `
        <span 
          class="w-3.5 h-3.5 rounded-full border border-slate-300 inline-block shadow-sm" 
          style="background-color: ${c.hex};" 
          title="${c.name}"
        ></span>
      `).join('');

      return `
        <div class="product-card group relative bg-white rounded-3xl overflow-hidden border border-slate-100 flex flex-col justify-between" id="prod-${product.id}">
          <!-- Top Badges & Actions -->
          <div class="relative w-full aspect-square bg-[#F8FAFC] overflow-hidden flex items-center justify-center p-6">
            <div class="absolute top-4 left-4 z-10 flex flex-col gap-1.5 items-start">
              ${badgeHtml}
            </div>

            <!-- Heart Wishlist Button -->
            <button 
              onclick="event.stopPropagation(); app.toggleWishlist('${product.id}')"
              class="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-slate-700 hover:text-red-500 shadow-sm transition-all duration-200 hover:scale-110"
              title="Añadir a favoritos"
            >
              <i data-lucide="heart" class="w-4 h-4 ${isFav ? 'fill-red-500 text-red-500' : ''}"></i>
            </button>

            <!-- Product Main Image -->
            <img 
              src="${product.images[0]}" 
              alt="${product.name}" 
              loading="lazy"
              class="card-img w-full h-full object-contain mix-blend-multiply drop-shadow-md cursor-pointer"
              onclick="app.openQuickView('${product.id}')"
            />

            <!-- Quick Action Floating Bar (Desktop) -->
            <div class="quick-actions absolute bottom-4 inset-x-4 z-10 flex gap-2">
              <button 
                onclick="event.stopPropagation(); app.openQuickView('${product.id}')"
                class="flex-1 py-2.5 px-3 bg-white/95 backdrop-blur-md hover:bg-slate-900 hover:text-white text-slate-800 text-xs font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5"
              >
                <i data-lucide="eye" class="w-3.5 h-3.5"></i>
                Vista Rápida
              </button>
              <button 
                onclick="event.stopPropagation(); app.openChangeImageModal('${product.id}')"
                class="py-2.5 px-3 bg-blue-50/95 hover:bg-blue-600 hover:text-white text-blue-700 text-xs font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-1 ${this.isAdmin() ? '' : 'hidden'}"
                title="Cambiar foto de este producto"
              >
                <i data-lucide="camera" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </div>

          <!-- Product Details Body -->
          <div class="p-5 flex flex-col flex-1 justify-between">
            <div>
              <div class="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                <span class="uppercase tracking-widest font-semibold">${product.categoryName}</span>
                <div class="flex items-center gap-1">
                  ${swatchesHtml}
                </div>
              </div>

              <!-- Title -->
              <h3 
                onclick="app.openQuickView('${product.id}')" 
                class="font-bold text-slate-900 text-base leading-snug hover:text-blue-600 cursor-pointer transition-colors line-clamp-1 mb-1"
                title="${product.name}"
              >
                ${product.name}
              </h3>

              <p class="text-xs text-slate-500 line-clamp-2 mb-3">
                ${product.subtitle}
              </p>

              <!-- Reviews & Stock -->
              <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-1 text-xs">
                  <div class="flex text-amber-400">
                    <i data-lucide="star" class="w-3.5 h-3.5 fill-amber-400"></i>
                  </div>
                  <span class="font-bold text-slate-700">${product.rating}</span>
                  <span class="text-slate-400">(${product.reviewsCount})</span>
                </div>

                ${product.stock <= 5 ? `
                  <span class="text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span class="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                    ¡Quedan ${product.stock}!
                  </span>
                ` : `
                  <span class="text-[11px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    En Stock
                  </span>
                `}
              </div>
            </div>

            <!-- Price & Buy Button -->
            <div class="pt-3 border-t border-slate-100 flex items-center justify-between mt-auto">
              <div>
                <div class="flex items-baseline gap-2">
                  <span class="text-xl font-extrabold text-slate-900 font-display">${this.formatPrice(product.price)}</span>
                  ${product.oldPrice ? `
                    <span class="text-xs font-semibold text-slate-400 line-through">${this.formatPrice(product.oldPrice)}</span>
                  ` : ''}
                </div>
                <span class="text-[10px] text-slate-400 block">IVA incl. | Envío Global</span>
              </div>

              <button 
                onclick="event.stopPropagation(); app.quickAddToCart('${product.id}')"
                class="w-11 h-11 bg-slate-900 hover:bg-blue-600 text-white rounded-2xl flex items-center justify-center transition-all duration-200 shadow-md hover:shadow-blue-500/30 hover:scale-105 active:scale-95"
                title="Añadir a la cesta"
              >
                <i data-lucide="shopping-bag" class="w-5 h-5"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    this.refreshIcons();
  }

  resetFilters() {
    this.currentCategory = 'todas';
    this.searchQuery = '';
    this.sortBy = 'featured';
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) sortSelect.value = 'featured';
    this.renderCategoryPills();
    this.applyFilters();
  }

  // --- QUICK VIEW MODAL (Nike / Amazon Detail Experience) ---
  openQuickView(productId) {
    const product = this.products.find(p => p.id === productId);
    if (!product) return;

    this.quickViewProduct = product;
    this.quickViewSelectedImage = 0;
    this.quickViewSelectedSize = product.sizes ? product.sizes[0] : null;
    this.quickViewSelectedColor = product.colors ? product.colors[0].name : null;
    this.quickViewQty = 1;

    this.renderQuickViewContent();

    const modal = document.getElementById('quickview-modal');
    if (modal) {
      modal.classList.remove('hidden');
      document.body.classList.add('overflow-hidden');
    }
  }

  closeQuickView() {
    const modal = document.getElementById('quickview-modal');
    if (modal) {
      modal.classList.add('hidden');
      document.body.classList.remove('overflow-hidden');
    }
  }

  setQuickViewImage(index) {
    this.quickViewSelectedImage = index;
    const mainImg = document.getElementById('qv-main-img');
    if (mainImg && this.quickViewProduct) {
      mainImg.src = this.quickViewProduct.images[index];
    }

    // Update active thumbnail border
    document.querySelectorAll('.qv-thumb-btn').forEach((btn, i) => {
      if (i === index) {
        btn.classList.add('ring-2', 'ring-blue-600', 'border-transparent');
      } else {
        btn.classList.remove('ring-2', 'ring-blue-600', 'border-transparent');
      }
    });
  }

  renderQuickViewContent() {
    const p = this.quickViewProduct;
    if (!p) return;

    // Thumbnails
    const thumbsHtml = p.images.map((img, idx) => `
      <button 
        onclick="app.setQuickViewImage(${idx})"
        class="qv-thumb-btn w-16 h-16 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden transition-all duration-200 p-1 flex items-center justify-center ${
          idx === 0 ? 'ring-2 ring-blue-600 border-transparent' : 'hover:border-slate-400'
        }"
      >
        <img src="${img}" class="w-full h-full object-contain mix-blend-multiply" />
      </button>
    `).join('');

    // Colors
    const colorsHtml = p.colors.map(c => `
      <label class="cursor-pointer group flex items-center gap-2">
        <input 
          type="radio" 
          name="qv-color" 
          value="${c.name}" 
          ${c.name === this.quickViewSelectedColor ? 'checked' : ''}
          onchange="app.quickViewSelectedColor = '${c.name}'"
          class="sr-only peer"
        />
        <div class="w-7 h-7 rounded-full border-2 border-white shadow-md flex items-center justify-center transition-all peer-checked:ring-2 peer-checked:ring-slate-900 peer-checked:scale-110" style="background-color: ${c.hex}">
        </div>
        <span class="text-xs font-medium text-slate-700 peer-checked:font-bold">${c.name}</span>
      </label>
    `).join('');

    // Sizes
    const sizesHtml = p.sizes.map(s => `
      <label class="cursor-pointer">
        <input 
          type="radio" 
          name="qv-size" 
          value="${s}" 
          ${s === this.quickViewSelectedSize ? 'checked' : ''}
          onchange="app.quickViewSelectedSize = '${s}'"
          class="sr-only peer"
        />
        <span class="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 inline-block peer-checked:bg-slate-900 peer-checked:text-white peer-checked:border-slate-900 transition-all hover:border-slate-400">
          ${s}
        </span>
      </label>
    `).join('');

    // Specs
    const specsHtml = p.specs.map(spec => `
      <li class="flex items-start gap-2 text-xs text-slate-600">
        <i data-lucide="check-circle-2" class="w-4 h-4 text-emerald-600 shrink-0 mt-0.5"></i>
        <span>${spec}</span>
      </li>
    `).join('');

    const modalBody = document.getElementById('quickview-body');
    if (!modalBody) return;

    modalBody.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        <!-- Gallery Column -->
        <div class="flex flex-col gap-4">
          <div class="relative aspect-square bg-[#F8FAFC] rounded-3xl overflow-hidden border border-slate-100 flex items-center justify-center p-8 group">
            <img 
              id="qv-main-img" 
              src="${p.images[0]}" 
              alt="${p.name}" 
              class="w-full h-full object-contain mix-blend-multiply drop-shadow-xl transition-transform duration-500 group-hover:scale-105"
            />
            ${p.discount ? `
              <span class="absolute top-4 left-4 badge-flash px-3 py-1 rounded-full text-xs font-black">
                ${p.discount} DESCUENTO
              </span>
            ` : ''}
          </div>

          <!-- Thumbnails & Change Photo Button -->
          <div class="flex items-center justify-between gap-3 overflow-x-auto pb-1">
            <div class="flex gap-2">
              ${thumbsHtml}
            </div>
            <button 
              onclick="app.openChangeImageModal('${p.id}')"
              class="shrink-0 px-3 py-2 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 border border-blue-200"
              title="Cambiar foto de este producto"
            >
              <i data-lucide="camera" class="w-3.5 h-3.5"></i>
              <span>Cambiar Foto</span>
            </button>
          </div>
        </div>

        <!-- Info Column -->
        <div class="flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span class="uppercase font-bold tracking-wider">${p.categoryName}</span>
              <span class="text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full font-bold">
                ✓ Envío Gratis Disponible
              </span>
            </div>

            <h2 class="text-2xl md:text-3xl font-extrabold text-slate-900 font-display mb-2">
              ${p.name}
            </h2>

            <div class="flex items-center gap-3 mb-4">
              <div class="flex items-center gap-1">
                <i data-lucide="star" class="w-4 h-4 fill-amber-400 text-amber-400"></i>
                <span class="font-extrabold text-slate-800 text-sm">${p.rating}</span>
                <span class="text-xs text-slate-400">(${p.reviewsCount} opiniones verificadas)</span>
              </div>
              <span class="text-slate-300">|</span>
              <span class="text-xs font-medium text-slate-500">Ref: ${p.id.toUpperCase()}</span>
            </div>

            <!-- Price -->
            <div class="flex items-baseline gap-3 mb-6 p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <span class="text-3xl font-black text-slate-900 font-display">${this.formatPrice(p.price)}</span>
              ${p.oldPrice ? `
                <span class="text-base font-bold text-slate-400 line-through">${this.formatPrice(p.oldPrice)}</span>
                <span class="text-xs font-black text-rose-600 bg-rose-100 px-2 py-0.5 rounded-md">Ahorras ${this.formatPrice(p.oldPrice - p.price)}</span>
              ` : ''}
            </div>

            <!-- Description -->
            <p class="text-sm text-slate-600 leading-relaxed mb-6">
              ${p.description}
            </p>

            <!-- Color Selection -->
            <div class="mb-5">
              <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
                Selecciona Color: <span class="text-slate-900 font-extrabold" id="qv-color-label">${this.quickViewSelectedColor}</span>
              </label>
              <div class="flex flex-wrap gap-4">
                ${colorsHtml}
              </div>
            </div>

            <!-- Size Selection -->
            <div class="mb-6">
              <div class="flex items-center justify-between mb-2.5">
                <label class="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Selecciona Talla / Versión:
                </label>
                <a href="javascript:void(0)" onclick="app.showToast('Guía de Tallas', 'Todas las tallas siguen el estándar europeo oficial. Si dudas entre dos tallas, te sugerimos pedir la mayor.', 'info')" class="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1">
                  <i data-lucide="ruler" class="w-3.5 h-3.5"></i> Guía de medidas
                </a>
              </div>
              <div class="flex flex-wrap gap-2">
                ${sizesHtml}
              </div>
            </div>

            <!-- Specifications -->
            <div class="mb-6 pt-4 border-t border-slate-100">
              <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Características Destacadas</h4>
              <ul class="space-y-2">
                ${specsHtml}
              </ul>
            </div>
          </div>

          <!-- Purchase Controls -->
          <div class="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center gap-4">
            <!-- Quantity Stepper -->
            <div class="flex items-center border border-slate-200 rounded-2xl p-1 bg-white shadow-sm w-full sm:w-auto justify-between">
              <button 
                onclick="app.updateQuickViewQty(-1)"
                class="w-10 h-10 rounded-xl hover:bg-slate-100 flex items-center justify-center font-bold text-slate-700 transition-colors"
              >
                -
              </button>
              <span id="qv-qty" class="w-12 text-center font-extrabold text-slate-900 text-sm">1</span>
              <button 
                onclick="app.updateQuickViewQty(1)"
                class="w-10 h-10 rounded-xl hover:bg-slate-100 flex items-center justify-center font-bold text-slate-700 transition-colors"
              >
                +
              </button>
            </div>

            <!-- Add to Cart CTA -->
            <button 
              onclick="app.addQuickViewToCart()"
              class="flex-1 w-full py-4 px-6 bg-slate-900 hover:bg-blue-600 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-xl hover:shadow-blue-500/30 transition-all duration-200 active:scale-98"
            >
              <i data-lucide="shopping-bag" class="w-5 h-5"></i>
              <span>Añadir a la Cesta</span>
              <span class="opacity-60">•</span>
              <span id="qv-cta-price">${this.formatPrice(p.price)}</span>
            </button>
          </div>
        </div>
      </div>
    `;

    this.refreshIcons();
  }

  updateQuickViewQty(delta) {
    let nextQty = this.quickViewQty + delta;
    if (nextQty < 1) nextQty = 1;
    if (this.quickViewProduct && nextQty > this.quickViewProduct.stock) {
      this.showToast('Límite de stock', `Solo disponemos de ${this.quickViewProduct.stock} unidades en almacén.`, 'warning');
      return;
    }
    this.quickViewQty = nextQty;
    const qtyEl = document.getElementById('qv-qty');
    const ctaPriceEl = document.getElementById('qv-cta-price');
    if (qtyEl) qtyEl.textContent = this.quickViewQty;
    if (ctaPriceEl && this.quickViewProduct) {
      ctaPriceEl.textContent = this.formatPrice(this.quickViewProduct.price * this.quickViewQty);
    }
  }

  addQuickViewToCart() {
    if (!this.quickViewProduct) return;
    this.addToCart(
      this.quickViewProduct.id, 
      this.quickViewSelectedSize, 
      this.quickViewSelectedColor, 
      this.quickViewQty
    );
    this.closeQuickView();
    this.openCart();
  }

  // --- CART FUNCTIONALITY ---
  quickAddToCart(productId) {
    const product = this.products.find(p => p.id === productId);
    if (!product) return;

    const defaultSize = product.sizes ? product.sizes[0] : 'Estándar';
    const defaultColor = product.colors ? product.colors[0].name : 'Estándar';

    this.addToCart(productId, defaultSize, defaultColor, 1);
  }

  addToCart(productId, size, color, quantity = 1) {
    const product = this.products.find(p => p.id === productId);
    if (!product) return;

    // Check if matching item exists
    const existingIndex = this.cart.findIndex(item => 
      item.productId === productId && 
      item.size === size && 
      item.color === color
    );

    if (existingIndex > -1) {
      this.cart[existingIndex].quantity += quantity;
    } else {
      this.cart.push({
        productId,
        product,
        size: size || 'Estándar',
        color: color || (product.colors[0] ? product.colors[0].name : 'Estándar'),
        quantity
      });
    }

    this.saveToStorage('aura_cart', this.cart);
    this.updateCartBadge();
    this.renderCartItems();

    this.showToast(
      '¡Producto añadido!',
      `Se ha añadido "${product.name}" (${quantity} ud.) a tu cesta de compra.`,
      'success'
    );
  }

  updateCartQty(index, delta) {
    if (!this.cart[index]) return;
    this.cart[index].quantity += delta;
    if (this.cart[index].quantity <= 0) {
      this.removeFromCart(index);
      return;
    }
    this.saveToStorage('aura_cart', this.cart);
    this.updateCartBadge();
    this.renderCartItems();
  }

  removeFromCart(index) {
    if (!this.cart[index]) return;
    const removedName = this.cart[index].product.name;
    this.cart.splice(index, 1);
    this.saveToStorage('aura_cart', this.cart);
    this.updateCartBadge();
    this.renderCartItems();
    this.showToast('Producto eliminado', `Has retirado "${removedName}" de tu cesta.`, 'info');
  }

  updateCartBadge() {
    const totalItems = this.cart.reduce((sum, item) => sum + item.quantity, 0);
    const badges = document.querySelectorAll('.cart-count-badge');
    badges.forEach(b => {
      b.textContent = totalItems;
      if (totalItems > 0) {
        b.classList.remove('hidden');
      } else {
        b.classList.add('hidden');
      }
    });
  }

  openCart() {
    const drawer = document.getElementById('cart-drawer');
    const backdrop = document.getElementById('cart-backdrop');
    const panel = document.getElementById('cart-panel');

    if (!drawer || !backdrop || !panel) return;

    this.renderCartItems();

    drawer.classList.remove('hidden');
    setTimeout(() => {
      backdrop.classList.remove('opacity-0');
      backdrop.classList.add('opacity-100');
      panel.classList.remove('translate-x-full');
      panel.classList.add('translate-x-0');
    }, 10);
    document.body.classList.add('overflow-hidden');
  }

  closeCart() {
    const drawer = document.getElementById('cart-drawer');
    const backdrop = document.getElementById('cart-backdrop');
    const panel = document.getElementById('cart-panel');

    if (!drawer || !backdrop || !panel) return;

    backdrop.classList.remove('opacity-100');
    backdrop.classList.add('opacity-0');
    panel.classList.remove('translate-x-0');
    panel.classList.add('translate-x-full');

    setTimeout(() => {
      drawer.classList.add('hidden');
      document.body.classList.remove('overflow-hidden');
    }, 300);
  }

  renderCartItems() {
    const container = document.getElementById('cart-items-container');
    const subtotalEl = document.getElementById('cart-subtotal');
    const shippingEl = document.getElementById('cart-shipping');
    const discountRow = document.getElementById('cart-discount-row');
    const discountVal = document.getElementById('cart-discount-val');
    const totalEl = document.getElementById('cart-total');
    const freeShippingProgress = document.getElementById('free-shipping-progress');
    const freeShippingText = document.getElementById('free-shipping-text');
    const emptyState = document.getElementById('cart-empty-state');
    const footerControls = document.getElementById('cart-footer-controls');

    if (!container) return;

    if (this.cart.length === 0) {
      if (emptyState) emptyState.classList.remove('hidden');
      if (footerControls) footerControls.classList.add('hidden');
      container.innerHTML = '';
      return;
    }

    if (emptyState) emptyState.classList.add('hidden');
    if (footerControls) footerControls.classList.remove('hidden');

    // Subtotal calculation
    let subtotal = 0;
    container.innerHTML = this.cart.map((item, idx) => {
      const lineTotal = item.product.price * item.quantity;
      subtotal += lineTotal;

      return `
        <div class="flex items-center gap-4 py-4 border-b border-slate-100 last:border-0 group">
          <div class="w-20 h-20 bg-slate-50 rounded-2xl p-2 shrink-0 border border-slate-100 flex items-center justify-center">
            <img src="${item.product.images[0]}" alt="${item.product.name}" class="w-full h-full object-contain mix-blend-multiply" />
          </div>

          <div class="flex-1 min-w-0">
            <h4 class="text-sm font-bold text-slate-900 truncate">${item.product.name}</h4>
            <div class="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <span>Talla: <strong class="text-slate-700">${item.size}</strong></span>
              <span>•</span>
              <span>Color: <strong class="text-slate-700">${item.color}</strong></span>
            </div>
            
            <div class="flex items-center justify-between mt-3">
              <!-- Stepper -->
              <div class="flex items-center border border-slate-200 rounded-lg bg-white">
                <button 
                  onclick="app.updateCartQty(${idx}, -1)" 
                  class="w-7 h-7 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-l-lg transition-colors flex items-center justify-center"
                >-</button>
                <span class="w-8 text-center text-xs font-extrabold text-slate-800">${item.quantity}</span>
                <button 
                  onclick="app.updateCartQty(${idx}, 1)" 
                  class="w-7 h-7 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-r-lg transition-colors flex items-center justify-center"
                >+</button>
              </div>

              <!-- Line price -->
              <div class="text-right">
                <div class="text-sm font-black text-slate-900">${this.formatPrice(lineTotal)}</div>
                <div class="text-[10px] text-slate-400">(${this.formatPrice(item.product.price)}/ud)</div>
              </div>
            </div>
          </div>

          <!-- Trash icon -->
          <button 
            onclick="app.removeFromCart(${idx})" 
            class="text-slate-300 hover:text-rose-500 p-1.5 transition-colors"
            title="Quitar producto"
          >
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>
      `;
    }).join('');

    // Shipping threshold (Free over 150.000 COP)
    const threshold = 150000;
    const diff = threshold - subtotal;
    const shipping = subtotal >= threshold ? 0 : 12000;

    if (freeShippingProgress && freeShippingText) {
      if (diff <= 0) {
        freeShippingProgress.style.width = '100%';
        freeShippingProgress.className = 'h-full bg-emerald-500 rounded-full transition-all duration-500';
        freeShippingText.innerHTML = `🎉 <strong>¡Enhorabuena!</strong> Tienes <strong>ENVÍO GRATIS</strong> en este pedido.`;
      } else {
        const percentage = Math.min(100, Math.max(10, (subtotal / threshold) * 100));
        freeShippingProgress.style.width = `${percentage}%`;
        freeShippingProgress.className = 'h-full bg-blue-600 rounded-full transition-all duration-500';
        freeShippingText.innerHTML = `Añade <strong>${this.formatPrice(diff)}</strong> más para conseguir <strong>ENVÍO GRATIS</strong>`;
      }
    }

    // Discount
    let discountAmount = 0;
    if (this.appliedCoupon) {
      discountAmount = (subtotal * this.appliedCoupon.discountPercent) / 100;
      if (discountRow) discountRow.classList.remove('hidden');
      if (discountVal) discountVal.textContent = `-${this.formatPrice(discountAmount)} (${this.appliedCoupon.discountPercent}%)`;
    } else {
      if (discountRow) discountRow.classList.add('hidden');
    }

    const finalTotal = subtotal - discountAmount + shipping;

    if (subtotalEl) subtotalEl.textContent = this.formatPrice(subtotal);
    if (shippingEl) shippingEl.textContent = shipping === 0 ? 'GRATIS' : this.formatPrice(shipping);
    if (totalEl) totalEl.textContent = this.formatPrice(finalTotal);

    this.refreshIcons();
  }

  applyPromoCode() {
    const input = document.getElementById('coupon-input');
    if (!input) return;
    const code = input.value.trim().toUpperCase();

    if (!code) {
      this.showToast('Código vacío', 'Por favor ingresa un código promocional.', 'warning');
      return;
    }

    if (ACTIVE_COUPONS[code]) {
      this.appliedCoupon = { code, ...ACTIVE_COUPONS[code] };
      this.showToast('¡Cupón aplicado!', `Has obtenido un ${this.appliedCoupon.discountPercent}% de descuento con el código ${code}.`, 'success');
      input.value = '';
      this.renderCartItems();
    } else {
      this.showToast('Cupón no válido', 'El código introducido no existe o ha expirado. Prueba con: ALUMAXJT o MAYORISTA', 'error');
    }
  }

  // --- WISHLIST ---
  toggleWishlist(productId) {
    const index = this.wishlist.indexOf(productId);
    const product = this.products.find(p => p.id === productId);

    if (index > -1) {
      this.wishlist.splice(index, 1);
      this.showToast('Eliminado de favoritos', `Has quitado "${product.name}" de tus favoritos.`, 'info');
    } else {
      this.wishlist.push(productId);
      this.showToast('¡Guardado en favoritos!', `"${product.name}" se ha añadido a tu lista de deseos.`, 'success');
    }

    this.saveToStorage('aura_wishlist', this.wishlist);
    this.updateWishlistBadge();
    this.renderProducts();
  }

  updateWishlistBadge() {
    const count = this.wishlist.length;
    const badges = document.querySelectorAll('.wishlist-count-badge');
    badges.forEach(b => {
      b.textContent = count;
      if (count > 0) {
        b.classList.remove('hidden');
      } else {
        b.classList.add('hidden');
      }
    });
  }

  openWishlistModal() {
    const modal = document.getElementById('wishlist-modal');
    const container = document.getElementById('wishlist-items-container');
    if (!modal || !container) return;

    if (this.wishlist.length === 0) {
      container.innerHTML = `
        <div class="py-12 text-center">
          <div class="w-16 h-16 mx-auto mb-3 bg-rose-50 text-rose-400 rounded-full flex items-center justify-center">
            <i data-lucide="heart" class="w-8 h-8"></i>
          </div>
          <h4 class="font-bold text-slate-800 text-lg mb-1">Tu lista de deseos está vacía</h4>
          <p class="text-xs text-slate-500 max-w-sm mx-auto">Explora nuestro catálogo y presiona el corazón en los productos que más te gusten para guardarlos aquí.</p>
        </div>
      `;
    } else {
      const favProducts = this.products.filter(p => this.wishlist.includes(p.id));
      container.innerHTML = favProducts.map(p => `
        <div class="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-300 transition-all">
          <div class="flex items-center gap-3.5">
            <img src="${p.images[0]}" class="w-14 h-14 object-contain bg-white rounded-xl p-1.5 border border-slate-100" />
            <div>
              <h5 class="text-sm font-bold text-slate-900">${p.name}</h5>
              <span class="text-xs font-black text-slate-700">${this.formatPrice(p.price)}</span>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button 
              onclick="app.quickAddToCart('${p.id}'); app.closeWishlistModal(); app.openCart();"
              class="px-3.5 py-2 bg-slate-900 hover:bg-blue-600 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1 shadow-sm"
            >
              <i data-lucide="shopping-bag" class="w-3.5 h-3.5"></i> Añadir a cesta
            </button>
            <button 
              onclick="app.toggleWishlist('${p.id}'); app.openWishlistModal();"
              class="p-2 text-slate-400 hover:text-rose-500 rounded-xl transition-colors"
            >
              <i data-lucide="x" class="w-4 h-4"></i>
            </button>
          </div>
        </div>
      `).join('');
    }

    modal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
    this.refreshIcons();
  }

  closeWishlistModal() {
    const modal = document.getElementById('wishlist-modal');
    if (modal) {
      modal.classList.add('hidden');
      document.body.classList.remove('overflow-hidden');
    }
  }

  // --- CHECKOUT SIMULATION (Amazon / Nike 1-Click Level) ---
  openCheckoutModal() {
    if (this.cart.length === 0) {
      this.showToast('Cesta vacía', 'Añade productos antes de tramitar el pedido.', 'warning');
      return;
    }

    this.closeCart();
    const modal = document.getElementById('checkout-modal');
    if (!modal) return;

    // Reset steps
    this.setCheckoutStep(1);

    // Populate order summary
    const totalAmount = document.getElementById('cart-total') ? document.getElementById('cart-total').textContent : '0.00 €';
    const checkoutTotal = document.getElementById('checkout-summary-total');
    if (checkoutTotal) checkoutTotal.textContent = totalAmount;

    modal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
    this.refreshIcons();
  }

  closeCheckoutModal() {
    const modal = document.getElementById('checkout-modal');
    if (modal) {
      modal.classList.add('hidden');
      document.body.classList.remove('overflow-hidden');
    }
  }

  setCheckoutStep(stepNumber) {
    for (let i = 1; i <= 3; i++) {
      const stepContent = document.getElementById(`checkout-step-${i}`);
      const stepIndicator = document.getElementById(`step-indicator-${i}`);
      if (stepContent) {
        if (i === stepNumber) {
          stepContent.classList.remove('hidden');
        } else {
          stepContent.classList.add('hidden');
        }
      }
      if (stepIndicator) {
        if (i <= stepNumber) {
          stepIndicator.classList.add('bg-blue-600', 'text-white', 'border-blue-600');
          stepIndicator.classList.remove('bg-white', 'text-slate-400', 'border-slate-300');
        } else {
          stepIndicator.classList.remove('bg-blue-600', 'text-white', 'border-blue-600');
          stepIndicator.classList.add('bg-white', 'text-slate-400', 'border-slate-300');
        }
      }
    }
  }

  processPaymentOrder() {
    const payBtn = document.getElementById('pay-submit-btn');
    if (payBtn) {
      payBtn.disabled = true;
      payBtn.innerHTML = `
        <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
        </svg>
        Procesando pago seguro 3D-Secure...
      `;
    }

    setTimeout(() => {
      // Step 3: Success
      this.setCheckoutStep(3);

      // Generate random order ID
      const randomOrder = 'ALX-' + Math.floor(100000 + Math.random() * 900000);
      const orderIdEl = document.getElementById('confirmed-order-id');
      if (orderIdEl) orderIdEl.textContent = randomOrder;

      // Confetti celebration
      this.launchConfetti();

      // Clear cart
      this.cart = [];
      this.appliedCoupon = null;
      this.saveToStorage('aura_cart', this.cart);
      this.updateCartBadge();
      this.renderCartItems();

      this.showToast('¡Pago Autorizado!', `Tu pedido ${randomOrder} ha sido procesado con éxito.`, 'success');
      this.refreshIcons();
    }, 1500);
  }

  launchConfetti() {
    if (window.confetti) {
      window.confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });
      setTimeout(() => {
        window.confetti({
          particleCount: 80,
          angle: 60,
          spread: 55,
          origin: { x: 0 }
        });
        window.confetti({
          particleCount: 80,
          angle: 120,
          spread: 55,
          origin: { x: 1 }
        });
      }, 300);
    }
  }

  // --- TOAST NOTIFICATIONS ---
  showToast(title, message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    let iconName = 'info';
    let iconColor = 'text-blue-500';
    let borderColor = 'border-blue-200';

    if (type === 'success') {
      iconName = 'check-circle';
      iconColor = 'text-emerald-500';
      borderColor = 'border-emerald-200';
    } else if (type === 'warning') {
      iconName = 'alert-triangle';
      iconColor = 'text-amber-500';
      borderColor = 'border-amber-200';
    } else if (type === 'error') {
      iconName = 'alert-octagon';
      iconColor = 'text-rose-500';
      borderColor = 'border-rose-200';
    }

    const toast = document.createElement('div');
    toast.className = `toast-item flex items-start gap-3 p-4 bg-white/95 backdrop-blur-xl border ${borderColor} rounded-2xl shadow-2xl max-w-sm pointer-events-auto transition-all`;
    toast.innerHTML = `
      <div class="${iconColor} shrink-0 mt-0.5">
        <i data-lucide="${iconName}" class="w-5 h-5"></i>
      </div>
      <div class="flex-1 min-w-0">
        <h5 class="text-xs font-bold text-slate-900">${title}</h5>
        <p class="text-xs text-slate-500 leading-snug mt-0.5">${message}</p>
      </div>
      <button onclick="this.parentElement.remove()" class="text-slate-400 hover:text-slate-600">
        <i data-lucide="x" class="w-3.5 h-3.5"></i>
      </button>
    `;

    container.appendChild(toast);
    this.refreshIcons();

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px) scale(0.95)';
      setTimeout(() => toast.remove(), 400);
    }, 4500);
  }

  // --- GESTIÓN DE PRODUCTOS, FOTOS & EDICIÓN (ADMIN) ---
// --- APERTURA DE MODALES (SOLO SI ES ADMIN) ---
  openChangeImageModal(productId) {
    if (!this.isAdmin()) return; // Si no es admin, no hace nada

    const product = this.products.find(p => p.id === productId);
    if (!product) return;

    this.editingProductId = productId;
    const modal = document.getElementById('change-image-modal');
    const nameEl = document.getElementById('change-img-prod-name');
    const inputEl = document.getElementById('change-img-url-input');
    const previewEl = document.getElementById('change-img-preview');

    const currentImg = (product.images && product.images[0]) || product.image || '';

    if (nameEl) nameEl.textContent = product.name;
    if (inputEl) inputEl.value = currentImg;
    if (previewEl) previewEl.src = currentImg;

    if (modal) {
      modal.classList.remove('hidden');
      document.body.classList.add('overflow-hidden');
    }
  }

  closeChangeImageModal() {
    const modal = document.getElementById('change-image-modal');
    if (modal) {
      modal.classList.add('hidden');
      document.body.classList.remove('overflow-hidden');
    }
    this.editingProductId = null;
  }

  previewImageChange(url) {
    const previewEl = document.getElementById('change-img-preview');
    if (previewEl && url.trim()) {
      previewEl.src = url.trim();
    }
  }

  saveProductImage() {
    if (!this.editingProductId) return;
    const inputEl = document.getElementById('change-img-url-input');
    const newUrl = inputEl ? inputEl.value.trim() : '';

    if (!newUrl) {
      this.showToast('Enlace requerido', 'Por favor ingresa una URL válida de imagen.', 'warning');
      return;
    }

    const product = this.products.find(p => p.id === this.editingProductId);
    if (product) {
      product.images[0] = newUrl;
      // Also update quick view if open
      if (this.quickViewProduct && this.quickViewProduct.id === this.editingProductId) {
        this.quickViewProduct.images[0] = newUrl;
        const mainImg = document.getElementById('qv-main-img');
        if (mainImg) mainImg.src = newUrl;
      }

      this.saveCustomProducts();
      this.applyFilters();
      this.closeChangeImageModal();
      this.showToast('Foto actualizada', `Se ha actualizado la imagen de "${product.name}".`, 'success');
    }
  }

  openAddProductModal() {
    if (!this.isAdmin()) return; // Si no es admin, no hace nada

    const modal = document.getElementById('add-product-modal');
    if (modal) {
      modal.classList.remove('hidden');
      document.body.classList.add('overflow-hidden');
    }
  }

  closeAddProductModal() {
    const modal = document.getElementById('add-product-modal');
    if (modal) {
      modal.classList.add('hidden');
      document.body.classList.remove('overflow-hidden');
    }
  }

  saveNewProduct(event) {
    if (event) event.preventDefault();

    const name = document.getElementById('new-prod-name').value.trim();
    const category = document.getElementById('new-prod-category').value;
    const price = parseFloat(document.getElementById('new-prod-price').value) || 0;
    const stock = parseInt(document.getElementById('new-prod-stock').value) || 10;
    const provider = document.getElementById('new-prod-provider').value.trim() || 'Proveedor Local';
    const image = document.getElementById('new-prod-image').value.trim() || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80';
    const description = document.getElementById('new-prod-desc').value.trim() || 'Producto de alta calidad para ferretería y uso industrial.';

    if (!name || price <= 0) {
      this.showToast('Datos incompletos', 'Ingresa al menos el nombre y un precio válido.', 'warning');
      return;
    }

    const catObj = CATEGORIES.find(c => c.id === category) || CATEGORIES[1];
    const newId = `art-custom-${Date.now()}`;

    const newProduct = {
      id: newId,
      name: name,
      subtitle: `Artículo incorporado al catálogo (${catObj.name})`,
      category: category,
      categoryName: catObj.name,
      price: price,
      oldPrice: Math.round(price * 1.20),
      discount: "-15%",
      rating: 5.0,
      reviewsCount: 1,
      isFlashDeal: false,
      isBestSeller: false,
      isNew: true,
      stock: stock,
      provider: provider,
      colors: [
        { name: "Estándar Fabril", hex: "#475569" }
      ],
      sizes: ["Medida Única / Estándar"],
      images: [image],
      description: description,
      specs: [
        `Referencia: ${newId.toUpperCase()}`,
        `Disponibilidad en bodega: ${stock} unidades`,
        `Línea: ${catObj.name}`,
        `Proveedor: ${provider}`,
        "Garantía oficial de fábrica"
      ]
    };

    this.products.unshift(newProduct);
    PRODUCTS = this.products;
    this.saveCustomProducts();
    this.renderCategoryPills();
    this.applyFilters();
    this.closeAddProductModal();

    this.showToast('¡Producto Creado!', `"${name}" se ha añadido correctamente a la tienda.`, 'success');
  }

  saveCustomProducts() {
    this.saveToStorage('aura_custom_products', this.products);
  }

  openAdminModal() {
    if (!this.isAdmin()) return; // Si no es admin, no hace nada

    const modal = document.getElementById('admin-modal');
    const totalCountEl = document.getElementById('admin-total-count');
    if (totalCountEl) totalCountEl.textContent = this.products.length;
    if (modal) {
      modal.classList.remove('hidden');
      document.body.classList.add('overflow-hidden');
    }
  }

  closeAdminModal() {
    const modal = document.getElementById('admin-modal');
    if (modal) {
      modal.classList.add('hidden');
      document.body.classList.remove('overflow-hidden');
    }
  }

  exportCatalogFile() {
    const fileContent = `// Catálogo Oficial Generado desde la Plataforma
const BASE_PRODUCTS = ${JSON.stringify(this.products, null, 2)};

const CURRENCIES = ${JSON.stringify(CURRENCIES, null, 2)};
const COUNTRIES = ${JSON.stringify(COUNTRIES, null, 2)};
const CATEGORIES = ${JSON.stringify(CATEGORIES, null, 2)};
const ACTIVE_COUPONS = ${JSON.stringify(ACTIVE_COUPONS, null, 2)};

function getStoreProducts() {
  try {
    const customData = localStorage.getItem('aura_custom_products');
    if (customData) {
      const customProducts = JSON.parse(customData);
      if (Array.isArray(customProducts) && customProducts.length > 0) {
        return customProducts;
      }
    }
  } catch (e) {
    console.warn("Error cargando productos personalizados:", e);
  }
  return [...BASE_PRODUCTS];
}

let PRODUCTS = getStoreProducts();
`;

    const blob = new Blob([fileContent], { type: 'application/javascript;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'products.js';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    this.showToast('Archivo Exportado', 'Se ha descargado el archivo "products.js" con todas tus fotos y productos guardados.', 'success');
  }

  resetToDefaultCatalog() {
    if (confirm('¿Estás seguro de que deseas restablecer el catálogo a la base de datos original? Se revertirán las fotos y productos personalizados no exportados.')) {
      localStorage.removeItem('aura_custom_products');
      this.products = [...BASE_PRODUCTS];
      PRODUCTS = this.products;
      this.renderCategoryPills();
      this.applyFilters();
      this.closeAdminModal();
      this.showToast('Catálogo Restablecido', 'Se ha recargado el catálogo original.', 'info');
    }
  }

  // --- EVENT LISTENERS ---
  setupEventListeners() {
    // Search input
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.setSearch(e.target.value);
      });
    }

    // Sort select
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.setSort(e.target.value);
      });
    }

    // Escape key closes modals, Cmd+K / Ctrl+K focuses search
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeQuickView();
        this.closeCart();
        this.closeWishlistModal();
        this.closeCheckoutModal();
        this.closeRegionModal();
        this.closeChangeImageModal();
        this.closeAddProductModal();
        this.closeAdminModal();
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }
    });
  }
}

// Global instance initialization
let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new StoreApp();
});
