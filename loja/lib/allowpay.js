'use strict';

global.window = global.window || {};
var catalog = require('../js/catalog.js');

var API_BASE = 'https://allow-gi0i.onrender.com';
var productById = new Map(catalog.map(function (product) {
  return [product.id, product];
}));

function jsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch (error) {
      throw new Error('Corpo JSON inválido.');
    }
  }
  throw new Error('Corpo JSON inválido.');
}

function validCpf(value) {
  var cpf = String(value || '').replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;

  for (var length = 9; length <= 10; length++) {
    var sum = 0;
    for (var i = 0; i < length; i++) sum += Number(cpf[i]) * (length + 1 - i);
    if ((sum * 10 % 11) % 10 !== Number(cpf[length])) return false;
  }
  return true;
}

function getOrigin(req) {
  var host = req.headers['x-forwarded-host'] || req.headers.host;
  if (typeof host !== 'string' || !host || host.includes(',')) {
    throw new Error('Não foi possível identificar o domínio da loja.');
  }
  var origin = new URL('https://' + host).origin;
  if (origin === 'null') throw new Error('Domínio da loja inválido.');
  return origin;
}

function calculateAmount(body) {
  if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 28) {
    throw new Error('Carrinho inválido. Atualize a página e tente novamente.');
  }

  var quantities = new Map();
  body.items.forEach(function (item) {
    if (!item || typeof item.id !== 'string' || !Number.isInteger(item.qty) || item.qty < 1 || item.qty > 5) {
      throw new Error('Itens do carrinho inválidos.');
    }
    var product = productById.get(item.id);
    if (!product) throw new Error('Um produto do carrinho não está disponível.');
    var quantity = (quantities.get(item.id) || 0) + item.qty;
    if (quantity > 5) throw new Error('Quantidade máxima excedida para um produto.');
    quantities.set(item.id, quantity);
  });

  var amount = 0;
  var names = [];
  quantities.forEach(function (quantity, id) {
    var product = productById.get(id);
    amount += Math.round(product.price * 100) * quantity;
    names.push(product.name);
  });

  if (body.shipping === 'full') amount += 789;
  else if (body.shipping !== 'std') throw new Error('Opção de envio inválida.');
  if (!Number.isSafeInteger(amount) || amount < 100) throw new Error('Valor do pedido inválido.');

  return {
    amount: amount,
    description: ('Pedido - ' + names.join(', ')).slice(0, 250)
  };
}

function getCustomer(value) {
  if (!value || typeof value !== 'object') throw new Error('Dados do cliente inválidos.');
  var name = String(value.name || '').trim();
  var email = String(value.email || '').trim();
  var cellphone = String(value.phone || '').replace(/\D/g, '');
  var taxId = String(value.document || '').replace(/\D/g, '');

  if (name.length < 3 || name.length > 120) throw new Error('Informe o nome completo.');
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('E-mail inválido.');
  if (!/^\d{10,11}$/.test(cellphone)) throw new Error('Celular inválido. Informe DDD e número.');
  if (!validCpf(taxId)) throw new Error('CPF inválido.');

  return { name: name, email: email, cellphone: cellphone, taxId: taxId };
}

function sendJson(res, status, body) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).json(body);
}

async function upstream(path, options) {
  var controller = new AbortController();
  var timeout = setTimeout(function () { controller.abort(); }, 20000);
  try {
    return await fetch(API_BASE + path, Object.assign({}, options, { signal: controller.signal }));
  } finally {
    clearTimeout(timeout);
  }
}

function apiKey() {
  var key = process.env.ALLOWPAY_API_KEY;
  if (!key) throw new Error('ALLOWPAY_API_KEY não está configurada como variável secreta no ambiente da Vercel.');
  return key;
}

module.exports = {
  API_BASE: API_BASE,
  apiKey: apiKey,
  calculateAmount: calculateAmount,
  getCustomer: getCustomer,
  getOrigin: getOrigin,
  jsonBody: jsonBody,
  productById: productById,
  sendJson: sendJson,
  upstream: upstream
};
