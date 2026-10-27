'use strict';

var allowpay = require('../../lib/allowpay.js');
var allowedStatuses = new Set([
  'waiting_payment', 'approved', 'expired', 'declined', 'canceled',
  'refunded', 'chargeback'
]);

module.exports = async function paymentStatus(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return allowpay.sendJson(res, 405, { error: 'Método não permitido.' });
  }

  var txid = req.query && req.query.hash;
  var route = req.query && req.query.route;
  if (typeof txid !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(txid)) {
    return allowpay.sendJson(res, 400, { error: 'Identificador da transação inválido.' });
  }
  if (typeof route !== 'string' || !/^[A-Za-z0-9_-]{1,80}$/.test(route)) {
    return allowpay.sendJson(res, 400, { error: 'Informe uma adquirente válida.' });
  }

  try {
    var key = allowpay.apiKey();
    var url = '/api/v2/allowpay-seller/payment-status/' +
      encodeURIComponent(txid) + '?route=' + encodeURIComponent(route);
    var response = await allowpay.upstream(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: key })
    });
    var result;
    try {
      result = await response.json();
    } catch (error) {
      return allowpay.sendJson(res, 502, { error: 'A AllowPay retornou uma resposta inválida.' });
    }

    if (!response.ok) {
      var retryAfter = response.headers.get('Retry-After');
      if (retryAfter) res.setHeader('Retry-After', retryAfter);
      return allowpay.sendJson(res, response.status === 401 ? 502 : response.status, {
        error: typeof result.error === 'string' ? result.error : 'Não foi possível consultar o pagamento.'
      });
    }

    if (!allowedStatuses.has(result.status)) {
      return allowpay.sendJson(res, 502, { error: 'A AllowPay retornou um status de pagamento desconhecido.' });
    }
    return allowpay.sendJson(res, 200, { status: result.status });
  } catch (error) {
    var message = error && error.message ? error.message : 'Não foi possível consultar o pagamento.';
    return allowpay.sendJson(res, /ALLOWPAY_API_KEY/.test(message) ? 503 : 502, { error: message });
  }
};
