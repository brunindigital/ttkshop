(function () {
  'use strict';
  if (window.Track) return;
  var sid = null;
  try { sid = localStorage.getItem('loja_sid'); } catch (e) {}
  if (!sid) {
    sid = (window.crypto && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2));
    sid = sid.replace(/[^A-Za-z0-9_-]/g, '');
    try { localStorage.setItem('loja_sid', sid); } catch (e) {}
  }

  var source = '';
  try {
    var q = new URLSearchParams(location.search);
    var utm = q.get('utm_source') || '';
    if (q.get('fbclid') || /^(fb|facebook|ig|instagram|meta)/i.test(utm)) source = 'FB';
    else if (q.get('gclid') || /^google/i.test(utm)) source = 'Google';
    else if (q.get('ttclid') || /^(tt|tiktok)/i.test(utm)) source = 'TikTok';
    else if (utm) source = utm.slice(0, 40);
    if (source) localStorage.setItem('loja_src', source);
    else source = localStorage.getItem('loja_src') || '';
  } catch (e) {}

  var T = { sid: sid, path: location.pathname, source: source };

  function post(type, path) {
    try {
      fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sid: sid, type: type, path: path, source: source }),
        keepalive: true
      }).catch(function () {});
    } catch (e) {}
  }

  T.view = function (path) { T.path = path || location.pathname; post('view', T.path); };

  window.Track = T;
  T.view();
  setInterval(function () { if (!document.hidden) post('ping', T.path); }, 20000);
})();
