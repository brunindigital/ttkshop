(function () {
  'use strict';
  var KEY = 'loja_cart_v1';
  var MAX_QTY = 5;
  var baseUrl = new URL('../', document.currentScript.src);
  var catalog = (window.CATALOG || []).map(function (product) {
    return Object.assign({}, product, {
      images: product.images.map(function (image) { return new URL(image, baseUrl).href; })
    });
  });

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

  function url(path) {
    if (path === './') path = 'index.html';
    else if (path === 'carrinho') path = 'produtos/checkout/index.html';
    else if (path === 'checkout') path = 'produtos/checkout/index.html';
    else if (/^produtos\/[^/]+\/?$/.test(path)) path = path.replace(/\/$/, '') + '/index.html';
    return new URL(path, baseUrl).href + window.location.search;
  }

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

  function descriptionHtml(product) {
    return product.descriptionSections.map(function (section) {
      var html = '<section class="description-section"><h4>' + esc(section.title) + '</h4>';
      if (section.details) {
        html += '<dl class="description-details">' + section.details.map(function (detail) {
          return '<div><dt>' + esc(detail.label) + '</dt><dd>' + esc(detail.value) + '</dd></div>';
        }).join('') + '</dl>';
      }
      if (section.items) {
        html += '<ul>' + section.items.map(function (item) { return '<li>' + esc(item) + '</li>'; }).join('') + '</ul>';
      }
      if (section.paragraphs) {
        html += section.paragraphs.map(function (paragraph) { return '<p>' + esc(paragraph) + '</p>'; }).join('');
      }
      return html + '</section>';
    }).join('');
  }

  function rebrand(root) {
    if (!root) return;
    if (root === document) {
      document.title = document.title.replace(/Shopee/gi, 'Loja Independente');
      var description = document.querySelector('meta[name="description"]');
      if (description) description.content = description.content.replace(/Shopee/gi, 'Loja Independente');
    }

    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    textNodes.forEach(function (node) {
      if (/shopee/i.test(node.nodeValue)) {
        node.nodeValue = node.nodeValue
          .replace(/Garantia Shopee/gi, 'Atendimento da loja')
          .replace(/Cupom Shopee/gi, 'Cupom')
          .replace(/Shopee\s+Oficial/gi, 'Loja Independente')
          .replace(/Shopee/gi, 'Loja Independente');
      }
    });

    if (root.querySelectorAll) {
      root.querySelectorAll('img[src*="shopee-logo"], img[alt*="Shopee" i]').forEach(function (img) {
        if (/cupom-95/i.test(img.src)) return;
        if (img.closest('.banner')) {
          img.src = new URL('images/cupom-95.png', baseUrl).href;
          img.alt = 'Cupom de desconto da loja';
          return;
        }
        var mark = document.createElement('span');
        mark.className = 'brand-mark';
        mark.textContent = 'LI';
        mark.style.cssText = 'font-size:16px;font-weight:800;letter-spacing:.04em;color:' +
          (img.closest('.topbar, .seller-avatar, .appbar.brand') ? '#fff' : 'var(--brand)');
        mark.setAttribute('aria-label', 'Loja Independente');
        img.replaceWith(mark);
      });

      root.querySelectorAll('.tag-oficial, .mall, .seller-meta, .btn-follow').forEach(function (el) {
        el.remove();
      });
      root.querySelectorAll('.shop .s').forEach(function (el) {
        if (/online agora|avaliações positivas|seguidores/i.test(el.textContent)) el.remove();
      });

      root.querySelectorAll('[alt*="Shopee" i], [aria-label*="Shopee" i], [title*="Shopee" i]').forEach(function (el) {
        ['alt', 'aria-label', 'title'].forEach(function (name) {
          var value = el.getAttribute(name);
          if (value) el.setAttribute(name, value.replace(/Shopee/gi, 'Loja Independente'));
        });
      });
    }
  }

  rebrand(document);
  document.addEventListener('DOMContentLoaded', function () { rebrand(document); });
  if (window.MutationObserver && document.body) {
    new MutationObserver(function (records) {
      records.forEach(function (record) {
        record.addedNodes.forEach(function (node) {
          if (node.nodeType === 1) rebrand(node);
          else if (node.nodeType === 3 && /shopee/i.test(node.nodeValue)) {
            node.nodeValue = node.nodeValue
              .replace(/Garantia Shopee/gi, 'Atendimento da loja')
              .replace(/Cupom Shopee/gi, 'Cupom')
              .replace(/Shopee\s+Oficial/gi, 'Loja Independente')
              .replace(/Shopee/gi, 'Loja Independente');
          }
        });
      });
    }).observe(document.body, { childList: true, subtree: true });
  }

  window.addEventListener('storage', function (e) { if (e.key === KEY) updateBadges(); });
  window.addEventListener('pageshow', updateBadges);
  document.addEventListener('DOMContentLoaded', updateBadges);

  window.Store = {
    catalog: catalog, byId: byId, read: read, add: add, setQty: setQty, remove: remove, clear: clear,
    count: count, detailed: detailed, brl: brl, url: url, toast: toast, esc: esc, MAX_QTY: MAX_QTY,
    updateBadges: updateBadges, descriptionHtml: descriptionHtml
  };
})();
