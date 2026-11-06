// Capa legal de la tienda: datos del responsable, banner de cookies con consentimiento,
// casillas de aceptación y registro trazable de cada aceptación (ver LEEME_LEGAL.txt).
(function () {
  "use strict";
  var C = window.LEGAL_CONFIG || {};
  var KEY_CK = "ajt_cookie_consent", KEY_LOG = "ajt_consent_log";
  var DOCS = { terminos: "/terminos.html", privacidad: "/privacidad.html", cookies: "/cookies.html", reembolso: "/reembolso.html" };
  var NAMES = { terminos: "Términos y Condiciones", privacidad: "Política de Privacidad", cookies: "Política de Cookies", reembolso: "Política de Retracto, Devoluciones y Garantía" };

  function ls(op, k, v) { try { if (op === "get") return JSON.parse(localStorage.getItem(k)); if (op === "set") localStorage.setItem(k, JSON.stringify(v)); if (op === "del") localStorage.removeItem(k); } catch (e) { /* sin almacenamiento */ } return null; }
  function uid() { try { return crypto.randomUUID(); } catch (e) { return "id-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10); } }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  var LEGAL = {
    cfg: function (k) { return C[k]; },
    versions: function () { var v = C.versiones || {}; return { terminos: v.terminos, privacidad: v.privacidad, cookies: v.cookies, reembolso: v.reembolso, vigencia: C.fechaVigencia }; },
    link: function (k) { return DOCS[k]; },

    // ----- cookies -----
    consent: function () { return ls("get", KEY_CK); },
    allowed: function (cat) {
      if (cat === "necesarias") return true;
      var c = LEGAL.consent(); return !!(c && c.prefs && c.prefs[cat]);
    },

    // ----- registro de aceptaciones -----
    // Guarda en el navegador y envía al servidor (/api/consent), que añade fecha/hora oficial, IP y navegador.
    record: function (kind, data, localOnly) {
      var rec = {
        id: uid(), kind: kind, clientTs: new Date().toISOString(),
        tz: (function () { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) { return ""; } })(),
        page: location.pathname, docs: LEGAL.versions(), data: data || {}
      };
      var log = ls("get", KEY_LOG) || []; log.push(rec); ls("set", KEY_LOG, log.slice(-30));
      if (localOnly) return rec;
      try {
        var body = JSON.stringify(rec);
        if (navigator.sendBeacon) navigator.sendBeacon("/api/consent", new Blob([body], { type: "application/json" }));
        else fetch("/api/consent", { method: "POST", headers: { "Content-Type": "application/json" }, body: body, keepalive: true }).catch(function () {});
      } catch (e) { /* el registro local ya quedó guardado */ }
      return rec;
    },

    // ----- casillas separadas (Términos / Privacidad) -----
    consentHTML: function (state, errors, idPrefix) {
      state = state || {}; errors = errors || {}; var p = idPrefix || "lg";
      function row(key, html) {
        return '<div class="lg-row' + (errors[key] ? " bad" : "") + '"><label><input type="checkbox" id="' + p + "-" + key + '" data-lg="' + key + '"' + (state[key] ? " checked" : "") + (errors[key] ? ' aria-invalid="true"' : "") + "> <span>" + html + "</span></label>" +
          (errors[key] ? '<p class="lg-bad" role="alert">Marca esta casilla para continuar.</p>' : "") + "</div>";
      }
      return '<div class="lg-consent">' +
        row("terms", 'He leído y acepto los <a href="' + DOCS.terminos + '" target="_blank" rel="noopener">Términos y Condiciones</a>.') +
        row("privacy", 'Autorizo el tratamiento de mis datos personales según la <a href="' + DOCS.privacidad + '" target="_blank" rel="noopener">Política de Privacidad</a>.') +
        '<small>Antes de pagar, consulta la <a href="' + DOCS.reembolso + '" target="_blank" rel="noopener">política de retracto, devoluciones y garantía</a>. Puedes ejercer tus derechos escribiendo a ' + esc(C.correo || "nuestro correo de atención") + ".</small></div>";
    },

    // ----- borrar datos guardados en este dispositivo -----
    clearLocalData: function () {
      ["ajt_cliente", "ajt_pending_ref", "aura_cart", "aura_wishlist"].forEach(function (k) { ls("del", k); });
    },
    openCookies: function () { openBanner(true); }
  };
  window.LEGAL = LEGAL;

  // ----- datos del responsable en páginas legales y pie de la tienda -----
  function fillConfig() {
    var nodes = document.querySelectorAll("[data-cfg]");
    for (var i = 0; i < nodes.length; i++) {
      var k = nodes[i].getAttribute("data-cfg"), v = C[k];
      if (v) nodes[i].textContent = v;
      else { nodes[i].textContent = "[COMPLETAR: " + (nodes[i].getAttribute("data-label") || k) + "]"; nodes[i].className += " lg-todo"; }
    }
    var legalLine = document.querySelector(".ax-foot__legal");
    if (legalLine) legalLine.textContent = "© " + new Date().getFullYear() + " " + (C.razonSocial || C.nombreComercial || "") + (C.nit ? " · NIT " + C.nit : "") + (C.ciudad ? " · " + C.ciudad : "") + ". Todos los derechos reservados.";
    var ds = document.querySelectorAll("[data-ver]");
    for (var j = 0; j < ds.length; j++) ds[j].textContent = "Versión " + ((C.versiones || {})[ds[j].getAttribute("data-ver")] || "1.0") + " · vigente desde " + (C.fechaVigencia || "");
  }

  // ----- banner de cookies -----
  var banner;
  function save(prefs) {
    var c = { v: (C.versiones || {}).cookies, ts: new Date().toISOString(), prefs: prefs };
    ls("set", KEY_CK, c); LEGAL.record("cookies", { prefs: prefs });
    if (!prefs.preferencias) ls("del", "ajt_cliente"); // sin permiso no se recuerdan datos de contacto
    close();
  }
  function close() { if (banner && banner.parentNode) banner.parentNode.removeChild(banner); banner = null; }
  function openBanner(config) {
    close();
    var cur = (LEGAL.consent() || {}).prefs || {};
    banner = document.createElement("div"); banner.id = "lg-ck"; banner.setAttribute("role", "dialog"); banner.setAttribute("aria-label", "Preferencias de cookies");
    banner.innerHTML =
      "<h4>Tu privacidad</h4>" +
      "<p>Usamos almacenamiento en tu navegador para que la cesta funcione (necesario). Opcionalmente podemos recordar tus datos de contacto y entrega para tu próxima compra. No usamos cookies de publicidad ni de seguimiento. <a href=\"" + DOCS.cookies + "\" target=\"_blank\" rel=\"noopener\">Más información</a></p>" +
      '<div class="lg-opts"' + (config ? "" : " hidden") + ">" +
      '<label><input type="checkbox" checked disabled> <span><b>Necesarias</b> (cesta, sesión, tus preferencias)<small>Siempre activas; sin ellas la tienda no funciona.</small></span></label>' +
      '<label><input type="checkbox" id="lg-ck-pref"' + (cur.preferencias ? " checked" : "") + "> <span><b>Preferencias</b> (recordar mis datos de entrega)<small>Se guardan solo en este dispositivo.</small></span></label>" +
      '<label><input type="checkbox" disabled> <span><b>Analítica y publicidad</b><small>No las usamos. Si algún día las activamos, te lo pediremos antes.</small></span></label></div>' +
      '<div class="lg-row"><button type="button" class="pri" data-a="all">Aceptar todas</button><button type="button" data-a="none">Solo las necesarias</button>' +
      (config ? '<button type="button" data-a="save">Guardar mi elección</button>' : '<button type="button" data-a="cfg">Configurar</button>') + "</div>";
    banner.addEventListener("click", function (e) {
      var a = e.target && e.target.getAttribute && e.target.getAttribute("data-a"); if (!a) return;
      if (a === "all") save({ necesarias: true, preferencias: true, analitica: false, publicidad: false });
      else if (a === "none") save({ necesarias: true, preferencias: false, analitica: false, publicidad: false });
      else if (a === "save") save({ necesarias: true, preferencias: !!document.getElementById("lg-ck-pref").checked, analitica: false, publicidad: false });
      else if (a === "cfg") openBanner(true);
    });
    document.body.appendChild(banner);
  }
  function init() {
    fillConfig();
    if (!document.body.classList.contains("lg-body")) {
      var c = LEGAL.consent();
      if (!c || c.v !== (C.versiones || {}).cookies) openBanner(false);
      var btns = document.querySelectorAll("[data-lg-cookies]");
      for (var i = 0; i < btns.length; i++) btns[i].addEventListener("click", function (e) { e.preventDefault(); openBanner(true); });
    }
    var clr = document.getElementById("lg-clear");
    if (clr) clr.addEventListener("click", function () { LEGAL.clearLocalData(); clr.textContent = "Listo: borramos tus datos de este dispositivo"; });
    var op = document.getElementById("lg-open");
    if (op) op.addEventListener("click", function () { openBanner(true); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
