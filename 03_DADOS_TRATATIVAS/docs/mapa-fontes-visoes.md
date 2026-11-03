# BDB - mapa de fontes por visão

## Fontes SSOT candidatas

| Visão BDB | Fonte candidata | Localização | Status |
| --- | --- | --- | --- |
| Status da Black | Pedidos válidos | `reise-ssot.mart_shared.orders_all_valid` | validar live |
| Evolução e ritmo | Pedidos válidos + meta | `orders_all_valid` + `dashboard_targets_*` | validar live |
| Heatmap comercial | Pedidos válidos por hora + calendário manual | `orders_all_valid` + template `black_commercial_calendar.csv` | criar |
| Produto e mix | Itens de pedido | `reise-ssot.mart_shared.ssot_order_items` | validar substituição |
| Qualidade da venda | Itens + pedidos + lista de brindes | `ssot_order_items`, `orders_all_valid`, template de brindes | criar |
| Canais | Canais e marketing | `mart_growth_us.shopify_channels_daily_complete_v` e marts growth | pendente |
| Estoque | Estoque atual | `reise-ssot.mart_shared.inventory_sku_current` | validar live |
| Decisões | Registro manual | template `black_decisions_log.csv` | criar |
| Slack | Saída consolidada | payload BDB | derivado |

## Regras de denominador

- Pedido pago: pedido em `orders_all_valid`.
- Item pago: item com receita líquida positiva e pedido válido.
- Brinde oficial: item separado por lista oficial, nunca misturado com item pago.
- Receita paga: receita de pedidos válidos.
- Receita atribuída: só usar quando a fonte de atribuição estiver validada.
- Missing: manter pendente, nunca zero.

## Pendências antes de execução

- Confirmar se `Vendas_pedidos_Linha` ainda é a fonte obrigatória ou se `ssot_order_items` será aceita.
- Confirmar janela oficial da Black.
- Confirmar meta total e curva de meta diária.
- Confirmar lista oficial de brindes.
- Confirmar formato do calendário comercial.
- Confirmar se canais/mídia podem ser usados como dado observado ou apenas como hipótese.
