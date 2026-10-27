(function () {
  'use strict';
  var KEY = 'loja_cart_v1';
  var MAX_QTY = 5;
  var catalog = window.CATALOG || [];

  var hidden = [
    { id: 'teste', name: 'Produto Teste de Pagamento', price: 5, old: 5, sold: 0, cat: 'teste', images: ['produtos/teste/teste.png'], description: '' }
  ];

  function byId(id) {
    for (var i = 0; i < catalog.length; i++) if (catalog[i].id === id) return catalog[i];
    for (var j = 0; j < hidden.length; j++) if (hidden[j].id === id) return hidden[j];
    return null;
  }

  function read() {
    try {
      var raw = JSON.parse(localStorage.getItem(KEY) || '[]');
      return raw.filter(function (l) { return byId(l.id) && l.qty > 0; });
    } catch (e) { return []; }
  }

  function write(lines) {
    try { localStorage.setItem(KEY, JSON.stringify(lines)); } catch (e) {}
    updateBadges();
  }

  function add(id, qty) {
    var lines = read();
    var line = lines.find(function (l) { return l.id === id; });
    if (line) line.qty = Math.min(MAX_QTY, line.qty + qty);
    else lines.push({ id: id, qty: Math.min(MAX_QTY, qty) });
    write(lines);
  }

  function setQty(id, qty) {
    var lines = read().map(function (l) { return l.id === id ? { id: id, qty: Math.max(1, Math.min(MAX_QTY, qty)) } : l; });
    write(lines);
  }

  function remove(id) { write(read().filter(function (l) { return l.id !== id; })); }
  function clear() { write([]); }
  function count() { return read().reduce(function (s, l) { return s + l.qty; }, 0); }

  function detailed() {
    return read().map(function (l) {
      var p = byId(l.id);
      return { id: l.id, qty: l.qty, product: p, subtotal: p.price * l.qty };
    });
  }

  function brl(n) {
    return 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function url(path) { return path + window.location.search; }

  function updateBadges() {
    var n = count();
    document.querySelectorAll('[data-cart-count]').forEach(function (el) {
      el.textContent = n > 99 ? '99+' : String(n);
      el.classList.toggle('show', n > 0);
    });
  }

  var toastTimer;
  function toast(msg) {
    var el = document.getElementById('toast');
    if (!el) return;
    el.innerHTML = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 1800);
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  window.addEventListener('storage', function (e) { if (e.key === KEY) updateBadges(); });
  window.addEventListener('pageshow', updateBadges);
  document.addEventListener('DOMContentLoaded', updateBadges);

  window.Store = {
    catalog: catalog, byId: byId, read: read, add: add, setQty: setQty, remove: remove, clear: clear,
    count: count, detailed: detailed, brl: brl, url: url, toast: toast, esc: esc, MAX_QTY: MAX_QTY,
    updateBadges: updateBadges
  };
})();
