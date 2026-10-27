# Integração AllowPay

O checkout usa as funções Node.js da Vercel em `api/checkout.js` e
`api/checkout/[hash].js`. A chave nunca é enviada ao navegador. Antes de gerar
um PIX, a função recalcula o total usando o catálogo do servidor, valida o CPF
e encaminha o domínio da loja em `X-AllowPay-Origin`.

## Configuração

1. Como a chave foi compartilhada em uma conversa, revogue-a e gere outra no
   painel AllowPay.
2. No projeto da Vercel, adicione a nova chave como variável de ambiente
   secreta chamada `ALLOWPAY_API_KEY` nos ambientes que serão usados e faça um
   novo deploy. Nunca use um prefixo público como `NEXT_PUBLIC_` nem grave a
   chave em arquivos versionados.
3. Sirva a loja pela Vercel com o domínio público configurado. A função envia
   `https://<domínio-da-requisição>` em `X-AllowPay-Origin`.

`vercel dev` pode ser usado para testar localmente; defina a variável secreta
no ambiente local sem adicionar o valor ao repositório.

## Fluxo

- `POST /api/checkout` valida o pedido e chama
  `POST /api/v2/allowpay-seller/create-pix`. O campo `route` não é enviado: a
  AllowPay escolhe a adquirente. O `txid` e a `route` da resposta são guardados
  na sessão do navegador.
- `GET /api/checkout/:txid?route=:route` consulta
  `POST /api/v2/allowpay-seller/payment-status/:txid?route=:route` no servidor.
  O checkout verifica o status a cada 8 segundos, respeitando `Retry-After`
  quando a consulta responde `429`.
- Somente `approved` confirma o pedido. Os estados `expired`, `declined`,
  `canceled`, `refunded` e `chargeback` encerram o polling.

O webhook ainda não está habilitado: este projeto não possui armazenamento
durável para associar eventos AllowPay a pedidos. O checkout atual mantém o
PIX pendente apenas em `sessionStorage`; configure armazenamento persistente
de pedidos antes de depender da confirmação após o fechamento da sessão ou de
processos de expedição/atendimento.
