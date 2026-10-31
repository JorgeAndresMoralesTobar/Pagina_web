// Sincronización en vivo: inventario-bodega (Supabase) -> tienda.
// - Actualiza PRECIO y STOCK de los productos existentes (se enlazan por nombre).
// - Añade a la tienda los productos nuevos creados en la bodega (con precio > 0).
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
    const url = SUPABASE_URL + "/rest/v1/products?select=id,name,stock,sale_price_vat";
    const res = await fetch(url, {
      headers: { apikey: SUPABASE_KEY, Authorization: "Bearer " + SUPABASE_KEY },
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Supabase respondió " + res.status);
    return res.json();
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
      images: [DEFAULT_IMAGE],
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

  async function sync() {
    try {
      const rows = await fetchInventory();
      const changed = applyToProducts(rows);
      whenAppReady(() => {
        wrapRegionUpdate();
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
