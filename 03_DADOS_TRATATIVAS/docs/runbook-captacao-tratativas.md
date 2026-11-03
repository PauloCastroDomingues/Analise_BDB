# BDB - runbook de captacao e tratativas

## Objetivo

Transformar o SSOT BigQuery em bases semanticas para o BDB, sem misturar fonte validada com hipotese.

## Fluxo

1. Validar fontes com `sql/00_source_validation.sql`.
2. Carregar templates manuais no BigQuery:
   - `black_commercial_calendar.csv`
   - `black_targets_daily.csv`
   - `official_gifts.csv`
   - `black_decisions_log.csv`
3. Rodar as consultas por visao.
4. Conferir totais contra uma referencia conhecida da Black.
5. Materializar tabelas ou views finais somente depois da conciliacao.
6. Conectar o front nas bases tratadas.
7. Criar automacao Slack apenas depois do payload diario estar validado.

## Checks obrigatorios

- Receita diaria bate com pedido valido.
- Pedido cancelado ou sem pagamento nao entra.
- Brinde oficial nao entra como venda paga.
- Missing fica pendente.
- Canal/midia aparece como leitura separada enquanto atribuicao nao estiver validada.
- Heatmap deve usar horario BRT.

## Decisao pendente

A fonte historica `Vendas_pedidos_Linha` nao veio no pacote recebido.

Antes de implementar produto/mix no back, decidir uma das opcoes:

1. Usar `mart_shared.ssot_order_items` como substituta oficial, apos reconciliar schema e totais.
2. Solicitar/exportar a fonte `Vendas_pedidos_Linha`.
3. Criar uma mart BDB propria a partir de `fct_order_item` e `orders_all_valid`.

## Entrega minima para iniciar o back

- SQL de status validado.
- SQL de heatmap validado.
- Calendario comercial carregado.
- Metas diarias carregadas.
- Payload JSON definido para o front.
