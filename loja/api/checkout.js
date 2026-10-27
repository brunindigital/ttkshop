'use strict';

var allowpay = require('../lib/allowpay.js');

module.exports = async function createPix(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return allowpay.sendJson(res, 405, { error: 'Método não permitido.' });
  }

  try {
    var body = allowpay.jsonBody(req);
    var order = allowpay.calculateAmount(body);
    var customer = allowpay.getCustomer(body.customer);
    var key = allowpay.apiKey();
    var origin = allowpay.getOrigin(req);
    var response = await allowpay.upstream('/api/v2/allowpay-seller/create-pix', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AllowPay-Origin': origin
      },
      body: JSON.stringify({
        api_key: key,
        amount: order.amount,
        description: order.description,
        customer: customer
      })
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
      var status = response.status === 401 ? 502 : response.status;
      return allowpay.sendJson(res, status, {
        error: typeof result.error === 'string' ? result.error : 'Não foi possível gerar o Pix.'
      });
    }

    if (typeof result.txid !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(result.txid) ||
        typeof result.route !== 'string' || !/^[A-Za-z0-9_-]{1,80}$/.test(result.route) ||
        typeof result.pix_code !== 'string' || !result.pix_code ||
        typeof result.pix_qr_code !== 'string') {
      return allowpay.sendJson(res, 502, { error: 'A AllowPay retornou dados de pagamento incompletos.' });
    }

    var qrUrl;
    try {
      qrUrl = new URL(result.pix_qr_code);
    } catch (error) {
      return allowpay.sendJson(res, 502, { error: 'A AllowPay retornou uma URL de QR Code inválida.' });
    }
    if (qrUrl.protocol !== 'https:') {
      return allowpay.sendJson(res, 502, { error: 'A AllowPay retornou uma URL de QR Code insegura.' });
    }

    return allowpay.sendJson(res, 200, {
      txid: result.txid,
      route: result.route,
      code: result.pix_code,
      qr: qrUrl.href,
      amount: order.amount
    });
  } catch (error) {
    var message = error && error.message ? error.message : 'Não foi possível gerar o Pix.';
    var status = /ALLOWPAY_API_KEY/.test(message) ? 503 :
      /JSON inválido|Carrinho|Itens do carrinho|produto do carrinho|Quantidade máxima|Valor do pedido|Opção de envio|Dados do cliente|nome completo|E-mail inválido|Celular inválido|CPF inválido|Domínio da loja/.test(message) ? 400 : 502;
    return allowpay.sendJson(res, status, { error: message });
  }
};
