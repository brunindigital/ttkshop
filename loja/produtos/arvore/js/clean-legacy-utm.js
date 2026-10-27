(function () {
  // Remove the "OG-..." ids left behind by the old Xtracky script so UTMify only sees real UTMs.
  var legacy = /^OG-/;
  try {
    var url = new URL(location.href);
    var changed = false;
    ['utm_source', 'sck', 'src'].forEach(function (k) {
      if (legacy.test(url.searchParams.get(k) || '')) { url.searchParams.delete(k); changed = true; }
    });
    if (changed) history.replaceState(history.state, '', url.pathname + url.search + url.hash);
  } catch (e) {}
  try {
    for (var i = localStorage.length - 1; i >= 0; i--) {
      var key = localStorage.key(i);
      var val = key && localStorage.getItem(key);
      if (/xtracky|xtk/i.test(key) || (val && legacy.test(val))) localStorage.removeItem(key);
    }
  } catch (e) {}
})();
