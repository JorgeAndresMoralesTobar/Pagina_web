// Sincronización en vivo: inventario-bodega (Supabase) -> tienda.
// - Actualiza PRECIO y STOCK de los productos existentes (se enlazan por nombre).
// - Añade a la tienda los productos nuevos creados en la bodega (con precio > 0).
// - Al revés: un producto nuevo creado desde el panel admin de la tienda (y el cambio de foto)
//   se guarda también en la bodega.
// - La tienda NUNCA muestra cuántas unidades hay en la bodega: todos los productos
//   aparecen como "En Stock / Disponible" (aunque la bodega tenga 0) para que el cliente los pida.
// No borra productos y no toca el diseño.
(function () {
  const SUPABASE_URL = "https://apjxqtxxyctytybkkduc.supabase.co";
  const SUPABASE_KEY = "sb_publishable_zHSPfLOo02j4C3SIpxN7oA_m3YdnHcx"; // clave pública (la misma que usa la bodega)
  const REFRESH_MS = 60 * 1000; // vuelve a consultar cada minuto

  const BAJO_PEDIDO_STOCK = 999; // la tienda siempre ve un stock alto => nunca muestra "Quedan N" ni limita la cantidad
  const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80";

  const norm = (s) => String(s || "").trim().replace(/\s+/g, " ").toLowerCase();

  async function fetchInventory() {
    const url = SUPABASE_URL + "/rest/v1/products?select=*";
    const res = await fetch(url, {
      headers: { apikey: SUPABASE_KEY, Authorization: "Bearer " + SUPABASE_KEY },
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Supabase respondió " + res.status);
    return res.json();
  }

  const isUrl = (u) => /^https?:\/\//i.test(String(u || ""));
  const HEADERS = { apikey: SUPABASE_KEY, Authorization: "Bearer " + SUPABASE_KEY, "Content-Type": "application/json" };

  async function rest(method, path, body, extra) {
    const res = await fetch(SUPABASE_URL + "/rest/v1/" + path, {
      method: method,
      headers: Object.assign({}, HEADERS, extra || {}),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      const err = new Error("Supabase " + res.status + " " + t);
      err.status = res.status;
      err.detail = t;
      throw err;
    }
    return res;
  }

  const storeStock = () => BAJO_PEDIDO_STOCK;
  const stockSpec = () => "Disponibilidad: Disponible";

  function newProductFrom(r) {
    const cat = (typeof CATEGORIES !== "undefined" && (CATEGORIES.find((c) => c.id === "ferreteria-industrial") || CATEGORIES[1])) || {};
    const price = Math.round(Number(r.sale_price_vat) * 100) / 100;
    const id = "bod-" + r.id;
    return {
      id: id,
      name: String(r.name).trim(),
      subtitle: "Pieza técnica de alta calidad para ferretería & construcción",
      category: cat.id || "ferreteria-industrial",
      categoryName: cat.name || "Ferretería & Construcción",
      price: price,
      oldPrice: price,
      discount: "",
      rating: 5.0,
      reviewsCount: 1,
      isFlashDeal: false,
      isBestSeller: false,
      isNew: true,
      stock: storeStock(r.stock),
      provider: "",
      colors: [{ name: "Estándar Fabril", hex: "#475569" }],
      sizes: ["Medida Única / Estándar"],
      images: [isUrl(r.image_url) ? r.image_url : DEFAULT_IMAGE],
      description: "Producto de alta calidad para ferretería y uso industrial.",
      specs: ["Referencia: " + id.toUpperCase(), stockSpec(), "Línea: " + (cat.name || "Ferretería & Construcción")],
    };
  }

  function applyToProducts(rows) {
    if (typeof PRODUCTS === "undefined" || !Array.isArray(rows)) return false;
    const byName = new Map();
    rows.forEach((r) => {
      const k = norm(r.name);
      if (!byName.has(k)) byName.set(k, r); // si hay nombres repetidos, gana el primero
    });

    let changed = false;
    const seen = new Set();
    PRODUCTS.forEach((p) => {
      const r = byName.get(norm(p.name));
      if (!r) return;
      seen.add(norm(p.name));

      const shown = storeStock(r.stock);
      if (Number.isFinite(shown) && p.stock !== shown) {
        p.stock = shown;
        if (Array.isArray(p.specs)) {
          p.specs = p.specs.map((s) => (/^Disponibilidad/.test(s) ? stockSpec() : s));
        }
        changed = true;
      }

      if (isUrl(r.image_url) && Array.isArray(p.images) && p.images[0] !== r.image_url) {
        p.images[0] = r.image_url;
        changed = true;
      }

      const price = Number(r.sale_price_vat);
      if (Number.isFinite(price) && price > 0 && Math.abs(p.price - price) > 0.005) {
        // se conserva el mismo % de descuento que ya tenía el producto
        const ratio = p.price > 0 && p.oldPrice > 0 ? p.oldPrice / p.price : 1;
        p.price = Math.round(price * 100) / 100;
        p.oldPrice = Math.round(p.price * ratio * 100) / 100;
        changed = true;
      }
    });
    // productos nuevos de la bodega que aún no están en la tienda
    rows.forEach((r) => {
      const k = norm(r.name);
      if (!k || seen.has(k) || byName.get(k) !== r) return;
      if (!(Number(r.sale_price_vat) > 0)) return; // sin precio no se puede vender
      PRODUCTS.push(newProductFrom(r));
      seen.add(k);
      changed = true;
    });
    return changed;
  }

  function updateHero() {
    if (typeof app === "undefined" || !app || typeof PRODUCTS === "undefined") return;
    const hero = PRODUCTS.find((p) => norm(p.name) === "rin trailer");
    if (!hero) return;
    const priceEl = document.getElementById("hero-product-price");
    const oldEl = document.getElementById("hero-product-oldprice");
    if (priceEl) priceEl.textContent = app.formatPrice(hero.price);
    if (oldEl) oldEl.textContent = app.formatPrice(hero.oldPrice);
  }

  function whenAppReady(cb) {
    if (typeof app !== "undefined" && app) return cb();
    setTimeout(() => whenAppReady(cb), 100);
  }

  function wrapRegionUpdate() {
    if (!app || app.__syncWrapped) return;
    const original = app.updateRegionDisplay.bind(app);
    app.updateRegionDisplay = function () {
      original();
      updateHero(); // la tienda tiene el precio del hero fijo; aquí se corrige
    };
    app.__syncWrapped = true;
  }

  // ---- Tienda -> Bodega ----
  async function pushNewProduct(prod, realStock) {
    const name = String(prod.name).trim();
    // si ya existe en la bodega (mismo nombre) no se duplica
    const exist = await (await rest("GET", "products?select=id,name")).json();
    if (exist.some((r) => norm(r.name) === norm(name))) return "existe";

    const maxId = exist.reduce((m, r) => Math.max(m, Number(r.id) || 0), 0);
    const id = maxId + 1;
    const priceVat = Math.round(Number(prod.price) * 100) / 100;
    const row = {
      id: id,
      code: "WEB-" + id,
      name: name,
      category: "General",
      stock: realStock,
      min_stock: 5,
      purchase_price: 0, // la tienda no conoce el costo: se completa en la bodega
      sale_price: Math.round((priceVat / 1.19) * 100) / 100,
      sale_price_vat: priceVat,
    };
    const img = prod.images && prod.images[0];
    try {
      await rest("POST", "products", isUrl(img) ? Object.assign({ image_url: img }, row) : row, { Prefer: "return=minimal" });
    } catch (e) {
      if (isUrl(img) && /image_url/.test(e.detail || "")) {
        await rest("POST", "products", row, { Prefer: "return=minimal" }); // la columna image_url aún no existe
      } else {
        throw e;
      }
    }
    if (realStock > 0) {
      await rest("POST", "movements", { type: "IN", product_name: name, qty: realStock, comment: "Alta desde la tienda web", user_role: "TIENDA WEB" }, { Prefer: "return=minimal" }).catch(() => {});
    }
    return "creado";
  }

  async function pushImage(name, url) {
    if (!isUrl(url)) return;
    try {
      await rest("PATCH", "products?name=eq." + encodeURIComponent(name), { image_url: url }, { Prefer: "return=minimal" });
    } catch (e) {
      console.warn("[sync] La foto no se guardó en la bodega (falta la columna image_url):", e.message);
    }
  }

  function wrapAdminActions() {
    if (!app || app.__adminWrapped) return;
    app.__adminWrapped = true;

    const origNew = app.saveNewProduct.bind(app);
    app.saveNewProduct = function (ev) {
      const before = this.products.length;
      const realStock = parseInt((document.getElementById("new-prod-stock") || {}).value) || 10;
      const res = origNew(ev);
      if (this.products.length > before) {
        const prod = this.products[0];
        prod.stock = BAJO_PEDIDO_STOCK; // la tienda nunca muestra la cantidad
        prod.specs = (prod.specs || []).map((s) => (/^Disponibilidad/.test(s) ? stockSpec() : s));
        pushNewProduct(prod, realStock)
          .then((r) => this.showToast("Bodega actualizada", r === "creado" ? "El producto también se creó en la bodega." : "Ese producto ya existía en la bodega.", "success"))
          .catch((e) => this.showToast("No se guardó en la bodega", e.message.slice(0, 120), "warning"));
      }
      return res;
    };

    const origImg = app.saveProductImage.bind(app);
    app.saveProductImage = function () {
      const id = this.editingProductId;
      const newUrl = ((document.getElementById("change-img-url-input") || {}).value || "").trim();
      const res = origImg();
      const prod = this.products.find((p) => p.id === id);
      if (prod && newUrl) pushImage(prod.name, newUrl);
      return res;
    };
  }

  async function sync() {
    try {
      const rows = await fetchInventory();
      const changed = applyToProducts(rows);
      whenAppReady(() => {
        wrapRegionUpdate();
        wrapAdminActions();
        if (changed) {
          app.products = [...PRODUCTS];
          app.applyFilters();
        }
        updateHero();
      });
    } catch (e) {
      console.warn("[sync] No se pudo actualizar desde la bodega, se usa el catálogo guardado:", e.message);
    }
  }

  // Antes de que cargue la bodega (o si falla), no se muestra la cantidad de la bodega al cliente.
  if (typeof PRODUCTS !== "undefined" && Array.isArray(PRODUCTS)) {
    PRODUCTS.forEach((p) => {
      p.stock = BAJO_PEDIDO_STOCK;
      if (Array.isArray(p.specs)) {
        p.specs = p.specs.map((s) => (/^Disponibilidad/.test(s) ? stockSpec() : s));
      }
    });
  }

  sync();
  setInterval(sync, REFRESH_MS);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) sync(); });
})();
